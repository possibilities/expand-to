const omit = require('lodash/omit')
const omitFp = require('lodash/fp/omit')
const mapValues = require('lodash/mapValues')
const keyBy = require('lodash/keyBy')
const forEach = require('lodash/forEach')
const inflection = require('inflection')
const { allCollectionVerbs, allEntityVerbs } = require('./common')

// Make map safe
const singularize = str => inflection.singularize(str)
const pluralize = str => inflection.pluralize(str)

const expandModels = models => {
  let expandedModels = mapValues(keyBy(models, 'name'), 'model')
  models.forEach(model => {
    if (model.treeOf) {
      expandedModels = {
        ...expandedModels,
        [singularize(model.treeOf)]: model.model
      }
    }
  })
  return expandedModels
}

const expand = models => {
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
        path: [pluralize(resource.name)]
      })
      resources.push({
        modelName: resource.name,
        ...resource,
        type: 'entity',
        methods: allEntityVerbs,
        path: [pluralize(resource.name), `{${resource.name}Id}`]
      })
    })
    return resources
  }

  const recursiveMountPathsFor = (resource, allResources) => {
    let mountPaths = []
    if (resource.belongsTo) {
      const belongsToResource = allResources.find(r => r.name === resource.belongsTo)
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

  const recursiveIdsFor = (resource, allResources) => {
    let ids = {}
    if (resource.belongsTo) {
      const belongsToResource =
        allResources.find(r => r.name === resource.belongsTo)
      if (belongsToResource) {
        ids = {
          ...ids,
          [pluralize(belongsToResource.name)]: `${belongsToResource.name}Id`
        }
        return {
          ...recursiveIdsFor(belongsToResource, allResources), ...ids
        }
      }
    }
    return ids
  }

  const expandToMountedResources = unmountedResources => {
    return unmountedResources.map(resource => ({
      ...resource,
      mountPath: recursiveMountPathsFor(resource, unmountedResources)
    }))
  }

  const expandPaths = mountedResources => {
    let paths = []
    const resourcesByNameAndType =
      keyBy(mountedResources, r => `${r.name}-${r.type}`)

    mountedResources.forEach(resource => {
      if (resource.type === 'entity') {
        paths.push({
          ...resource,
          ids: {
            ...recursiveIdsFor(resource, mountedResources),
            [pluralize(resource.name)]: `${resource.name}Id`
          }
        })
      } else {
        paths.push({
          ...resource,
          ids: recursiveIdsFor(resource, mountedResources)
        })
      }

      forEach(resource.fns, fn => {
        if (resource.type === 'entity') return
        paths.push({
          name: fn.name,
          type: 'custom-function',
          methods: [fn.method],
          ids: {},
          path: [pluralize(resource.name), fn.name],
          mountPath: [],
          modelName: resource.name,
          isCustomFunction: true
        })
      })

      if (resource.belongsTo === 'user' && resource.type === 'collection') {
        paths.push({
          ...resource,
          type: 'collection-for-user',
          methods: allCollectionVerbs,
          ids: omit({
            [pluralize(resource.name)]: `${resource.name}Id`
          }, 'users'),
          path: [pluralize(resource.name)],
          modelName: resource.name,
          mountPath: ['users']
        })

        paths.push({
          ...resource,
          type: 'entity-for-user',
          methods: allEntityVerbs,
          path: [pluralize(resource.name), `{${resource.name}Id}`],
          ids: omit({
            [pluralize(resource.name)]: `${resource.name}Id`
          }, 'users'),
          modelName: resource.name,
          mountPath: ['users']
        })
      }
    })

    const mountedEntityResources = mountedResources.filter(r => r.type === 'entity')

    mountedEntityResources.forEach(resource => {
      forEach(resource.hasMany, relation => {
        const relatedResource = resourcesByNameAndType[`${singularize(relation.name)}-entity`]
        const resourceMountPath = [...resource.mountPath, ...resource.path]
        const resourceName = relation.as ? relation.as : relatedResource.name

        paths.push({
          ...relatedResource,
          type: 'collection',
          methods: allCollectionVerbs,
          ids: {
            ...recursiveIdsFor(resource, mountedResources),
            [pluralize(resource.name)]: `${resource.name}Id`
          },
          path: [pluralize(resourceName)],
          modelName: relatedResource.name,
          mountPath: resourceMountPath
        })

        paths.push({
          ...relatedResource,
          type: 'entity',
          methods: allEntityVerbs,
          path: [pluralize(resourceName), `{${resourceName}Id}`],
          ids: {
            ...recursiveIdsFor(resource, mountedResources),
            [pluralize(resource.name)]: `${resource.name}Id`,
            [pluralize(resourceName)]: `${resourceName}Id`
          },
          modelName: relatedResource.name,
          mountPath: resourceMountPath
        })

        if (resource.name === 'user') {
          paths.push({
            ...relatedResource,
            type: 'collection-for-user',
            methods: allCollectionVerbs,
            ids: omit({
              ...recursiveIdsFor(resource, mountedResources),
              [pluralize(resource.name)]: `${resource.name}Id`
            }, 'users'),
            path: [pluralize(resourceName)],
            modelName: relatedResource.name,
            mountPath: ['users']
          })

          paths.push({
            ...relatedResource,
            type: 'entity-for-user',
            methods: allEntityVerbs,
            path: [pluralize(resourceName), `{${resourceName}Id}`],
            ids: omit({
              ...recursiveIdsFor(resource, mountedResources),
              [pluralize(resource.name)]: `${resource.name}Id`,
              [pluralize(resourceName)]: `${resourceName}Id`
            }, 'users'),
            modelName: relatedResource.name,
            mountPath: ['users']
          })
        }
      })
    })

    return paths.map(omitFp([
      'belongsTo',
      'hasMany',
      'type',
      'name',
      'treeOf',
      'fns',
      'model'
    ]))
  }

  // Create necessary virtual resources for tree-resources
  const treeResources = expandTreeResources(models)
  // Figure out as much as possible prior to calculation mount points
  const unmountedResources = expandToUnmountedResources(treeResources)
  // Calculate the mount point and add to every resource
  const mountedResources = expandToMountedResources(unmountedResources)
  // Expand each resource into spec paths and pass through models
  return {
    models: expandModels(models),
    paths: expandPaths(mountedResources)
  }
}

module.exports = expand
