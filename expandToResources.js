const fromPairs = require('lodash/fromPairs')
const compact = require('lodash/compact')
const toPairs = require('lodash/toPairs')
const pickFp = require('lodash/fp/pick')
const upperFirst = require('lodash/upperFirst')
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

const stripReadOnlyProperties = model => ({
  ...model,
  properties: fromPairs(toPairs(model.properties)
    .filter(([name, value]) => !value.readOnly))
})

const expandModels = (models, resources) => {
  const modelsByName = keyBy(models, 'name')
  let expandedModels = mapValues(modelsByName, model => ({
    request: stripReadOnlyProperties(model.model),
    response: model.model
  }))

  models.forEach(model => {
    if (model.treeOf) {
      expandedModels = {
        ...expandedModels,
        [singularize(model.treeOf)]: {
          request: stripReadOnlyProperties(model.model),
          response: model.model
        }
      }
    }
  })

  resources.forEach(resource => {
    forEach(resource.hasMany, relatedResource => {
      const relatedName = relatedResource.as || singularize(relatedResource.name)
      const relationName = `${resource.name}${upperFirst(relatedName)}`
      const idName = `${singularize(relatedName)}Id`
      const model = (
        modelsByName[singularize(relatedResource.name)].model.properties.id ||
        { type: 'string' }
      )
      expandedModels = {
        ...expandedModels,
        [singularize(relationName)]: {
          request: { properties: { [idName]: model } },
          response: { properties: { [idName]: model } }
        }
      }
    })

    forEach(resource.fns, fn => {
      if (!fn.model) return
      const model = fn.model.request || fn.model.response
        ? {
          request: fn.model.request || fn.resourceName,
          response: fn.model.response || fn.resourceName
        }
        : {
          request: fn.model,
          response: fn.model
        }
      expandedModels = { ...expandedModels, [fn.name]: model }
    })
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
          resourceName: resource.name,
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
      pathParts: [pluralize(resource.name)],
      resourceName: resource.resourceName || resource.name
    })
    resources.push({
      modelName: resource.name,
      ...resource,
      type: 'entity',
      methods: resource.immutable
        ? immutableEntityVerbs
        : allEntityVerbs,
      pathParts: [pluralize(resource.name), `{${resource.name}Id}`],
      resourceName: resource.resourceName || resource.name
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
        isCustomFunctionResource: true,
        resourceName: resource.name,
        modelName: fn.model ? fn.name : resource.name,
        mountPath: [],
        pathParts: compact([
          ...resource.mountPath,
          pluralize(resource.name),
          allEntityVerbs.includes(fn.method) && `{${resource.name}Id}`,
          `invoke.${fn.name}`
        ])
      })
    })

    if (resource.belongsTo === 'user') {
      paths.push({
        ...resource,
        mountPath: [],
        isUserCentricResource: true,
        methods: allCollectionVerbs,
        pathParts: ['users', pluralize(resource.name)],
        modelName: resource.name
      })

      paths.push({
        ...resource,
        mountPath: [],
        isUserCentricResource: true,
        methods: resource.immutable
          ? immutableEntityVerbs
          : allEntityVerbs,
        pathParts: [
          'users',
          pluralize(resource.name),
          `{${resource.name}Id}`
        ],
        modelName: resource.name
      })
    }

    forEach(resource.hasMany, relation => {
      const relatedResource =
        mountedEntityResourcesByName[singularize(relation.name)]
      const resourceMountPath = [
        ...resource.mountPath,
        ...resource.pathParts
      ]
      const resourceName = singularize(
        relation.as ? relation.as : relatedResource.name
      )

      paths.push({
        ...relatedResource,
        methods: allCollectionVerbs,
        pathParts: [...resourceMountPath, pluralize(resourceName)],
        modelName: `${resource.name}${upperFirst(resourceName)}`
      })

      paths.push({
        ...relatedResource,
        methods: allEntityVerbs,
        pathParts: [
          ...resourceMountPath,
          pluralize(resourceName),
          `{${resourceName}Id}`
        ],
        modelName: `${resource.name}${upperFirst(resourceName)}`
      })

      if (resource.name === 'user') {
        paths.push({
          ...relatedResource,
          isUserCentricResource: true,
          methods: allCollectionVerbs,
          pathParts: ['users', pluralize(resourceName)],
          modelName: relatedResource.name
        })

        paths.push({
          ...relatedResource,
          isUserCentricResource: true,
          methods: allEntityVerbs,
          pathParts: [
            'users',
            pluralize(resourceName),
            `{${resourceName}Id}`
          ],
          modelName: relatedResource.name
        })
      }

      if (relatedResource.name === 'user') {
        paths.push({
          ...resource,
          isUserCentricResource: true,
          methods: allCollectionVerbs,
          pathParts: compact([
            'users',
            relation.as && (relation.label || pluralize(resourceName)),
            pluralize(resource.name)
          ])
        })
        paths.push({
          ...resource,
          isUserCentricResource: true,
          methods: allEntityVerbs,
          pathParts: compact([
            'users',
            relation.as && (relation.label || pluralize(resourceName)),
            pluralize(resource.name),
            `{${resource.name}Id}`
          ])
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
    'name',
    'model',
    'pathParts',
    'operations',
    'resourceName',
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
  // Expand each resource into spec paths and models
  const paths = expandPaths(mountedResources)
  const models = expandModels(spec, mountedResources)
  return { models, paths }
}

module.exports = expandToResources
