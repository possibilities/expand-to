const fromPairs = require('lodash/fromPairs')
const toPairs = require('lodash/toPairs')
const pickFp = require('lodash/fp/pick')
const mapValues = require('lodash/mapValues')
const keyBy = require('lodash/keyBy')
const without = require('lodash/without')
const forEach = require('lodash/forEach')
const inflection = require('inflection')
const { allCollectionVerbs, allEntityVerbs } = require('./common')

const immutableEntityVerbs = without(allEntityVerbs, 'put', 'patch')

// Make map safe
const singularize = str => inflection.singularize(str)
const pluralize = str => inflection.pluralize(str)

const stripReadOnly = model => {
  const properties =
    fromPairs(toPairs(model.properties).filter(([name, value]) => !value.readOnly))
  return { ...model, properties }
}

const expandModels = models => {
  let expandedModels = mapValues(keyBy(models, 'name'), model => ({
    request: stripReadOnly(model.model),
    response: model.model
  }))

  models.forEach(model => {
    if (model.treeOf) {
      expandedModels = {
        ...expandedModels,
        [singularize(model.treeOf)]: {
          request: stripReadOnly(model.model),
          response: model.model
        }
      }
    }
  })

  return expandedModels
}

const expandTreeResources = resources => {
  let treeResources = [...resources]
  resources.forEach(resource => {
    if (resource.treeOf) {
      treeResources = [
        ...treeResources,
        {
          ...resource,
          modelName: resource.name,
          belongsTo: resource.name,
          name: singularize(resource.treeOf)
        }
      ]
    }
  })
  return treeResources
}

const expandToUnmountedResources = schema => {
  let resources = []
  schema.forEach(resource => {
    resources.push({
      modelName: resource.name,
      ...resource,
      type: 'collection',
      methods: allCollectionVerbs,
      pathParts: [pluralize(resource.name)]
    })
    resources.push({
      modelName: resource.name,
      ...resource,
      type: 'entity',
      methods: resource.immutable
        ? immutableEntityVerbs
        : allEntityVerbs,
      pathParts: [pluralize(resource.name), `{${resource.name}Id}`]
    })
  })
  return resources
}

const recursiveMountPathsFor = (resource, allResources) => {
  let mountPaths = []
  if (resource.belongsTo) {
    const belongsToResource =
      allResources.find(r => r.name === resource.belongsTo)
    if (belongsToResource) {
      mountPaths.push(pluralize(belongsToResource.name))
      mountPaths.push(`{${belongsToResource.name}Id}`)
      return [
        ...recursiveMountPathsFor(belongsToResource, allResources),
        ...mountPaths
      ]
    }
  }
  return mountPaths
}

const expandToMountedResources = unmountedResources =>
  unmountedResources.map(resource => ({
    ...resource,
    mountPath: recursiveMountPathsFor(resource, unmountedResources)
  }))

const expandPaths = mountedResources => {
  let paths = [...mountedResources]

  const mountedEntityResources =
    mountedResources.filter(r => r.type === 'entity')

  const mountedEntityResourcesByName =
    keyBy(mountedResources, 'name')

  mountedEntityResources.forEach(resource => {
    forEach(resource.fns, fn => {
      paths.push({
        name: fn.name,
        methods: [fn.method],
        pathParts: [pluralize(resource.name), `invoke.${fn.name}`],
        mountPath: resource.mountPath,
        modelName: resource.name,
        isCustomFunctionResource: true
      })
    })

    if (resource.belongsTo === 'user') {
      paths.push({
        ...resource,
        isUserCentricResource: true,
        methods: allCollectionVerbs,
        pathParts: [pluralize(resource.name)],
        modelName: resource.name,
        mountPath: ['users']
      })

      paths.push({
        ...resource,
        isUserCentricResource: true,
        methods: resource.immutable
          ? immutableEntityVerbs
          : allEntityVerbs,
        pathParts: [pluralize(resource.name), `{${resource.name}Id}`],
        modelName: resource.name,
        mountPath: ['users']
      })
    }

    forEach(resource.hasMany, relation => {
      const relatedResource =
        mountedEntityResourcesByName[singularize(relation.name)]
      const resourceMountPath = [...resource.mountPath, ...resource.pathParts]
      const resourceName = relation.as ? relation.as : relatedResource.name

      paths.push({
        ...relatedResource,
        methods: allCollectionVerbs,
        pathParts: [pluralize(resourceName)],
        modelName: relatedResource.name,
        mountPath: resourceMountPath
      })

      paths.push({
        ...relatedResource,
        methods: allEntityVerbs,
        pathParts: [pluralize(resourceName), `{${resourceName}Id}`],
        modelName: relatedResource.name,
        mountPath: resourceMountPath
      })

      if (resource.name === 'user') {
        paths.push({
          ...relatedResource,
          isUserCentricResource: true,
          methods: allCollectionVerbs,
          pathParts: [pluralize(resourceName)],
          modelName: relatedResource.name,
          mountPath: ['users']
        })

        paths.push({
          ...relatedResource,
          isUserCentricResource: true,
          methods: allEntityVerbs,
          pathParts: [pluralize(resourceName), `{${resourceName}Id}`],
          modelName: relatedResource.name,
          mountPath: ['users']
        })
      }
    })
  })

  return paths.map(resource => ({
    ...resource,
    model: resource.modelName,
    operations: resource.methods,
    pathParts: [
      ...resource.mountPath,
      ...resource.pathParts
    ]
  })).map(pickFp([
    'model',
    'pathParts',
    'operations',
    'isUserCentricResource',
    'isCustomFunctionResource'
  ]))
}

const expandToResources = spec => {
  // Create necessary virtual resources for tree-resources
  const treeResources = expandTreeResources(spec)
  // Figure out as much as possible prior to calculation mount points
  const unmountedResources = expandToUnmountedResources(treeResources)
  // Calculate the mount point and add to every resource
  const mountedResources = expandToMountedResources(unmountedResources)
  // Expand each resource into spec paths and pass through models
  return {
    models: expandModels(spec),
    paths: expandPaths(mountedResources)
  }
}

module.exports = expandToResources