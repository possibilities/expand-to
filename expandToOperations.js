const expandToResources = require('./expandToResources')
const initial = require('lodash/initial')
const last = require('lodash/last')
const snakeCase = require('lodash/snakeCase')
const upperFirst = require('lodash/upperFirst')
const inflection = require('inflection')
const {
  errors,
  emptyResponse,
  errorResponse,
  paginationResponse
} = require('./common')

// Make map safe
const singularize = str => inflection.singularize(str)
const pluralize = str => inflection.pluralize(str)

const actionToLabel = {
  post: 'create',
  head: 'check',
  put: 'replace',
  patch: 'update'
}

const getNamespace = path =>
  path.pathParts
    .filter(p => !p.startsWith('{'))
    .filter(p => !p.startsWith('invoke.'))

const getId = (action, path) => {
  const namespace = getNamespace(path).map(upperFirst)
  const pathSubject = last(namespace)
  const pathContext = initial(namespace).map(singularize)

  if (path.isCustomFunctionResource) {
    return [
      'invoke',
      upperFirst(last(path.pathParts).split('.').pop()),
      'For',
      action === 'list'
        ? pluralize(upperFirst(path.resourceName))
        : upperFirst(path.resourceName)
    ].join('')
  }

  if (path.isUserCentricResource) {
    return [
      actionToLabel[action] || action,
      ...pathContext.slice(1),
      action === 'list' ? pathSubject : singularize(pathSubject),
      'AsUser'
    ].join('')
  }

  return [
    actionToLabel[action] || action,
    ...pathContext,
    action === 'list' ? pathSubject : singularize(pathSubject)
  ].join('')
}

const getSummary = (action, path) => {
  if (path.isCustomFunctionResource) {
    const fnName = last(path.pathParts).split('.').slice(1).join('.')
    const resourceName = action === 'list'
      ? pluralize(path.resourceName)
      : path.resourceName
    return `Invoke \`${fnName}\` for ${resourceName}`
  }
  const namespace = getNamespace(path)
  const noun = last(namespace)
  const space = initial(namespace)
  return [
    upperFirst(actionToLabel[action] || action),
    ...space.map(singularize),
    action === 'list' ? noun : singularize(noun)
  ].filter(Boolean).join(' ')
}

const getParameters = path => {
  let parameters = []
  path.pathParts.filter(p => p.startsWith('{')).forEach(pathPart => {
    parameters.push({
      schema: { type: 'string' },
      name: pathPart.slice(1, -1),
      description: upperFirst(pathPart.slice(1, -3)) + ' id'
    })
  })
  return parameters
}

const getQuery = (action, path) => {
  if (action === 'list') {
    return [
      { name: 'perPage', description: 'Per page', schema: { type: 'string' } },
      { name: 'page', description: 'Page number', schema: { type: 'string' } },
      { name: 'orderBy', description: 'Order by', schema: { type: 'string' } }
    ]
  }
  return []
}

const collectionActions = { list: true, post: true }
const successStatuses = { post: 201, delete: 204 }

const expandModels = models => ({
  ...models,
  empty: { response: emptyResponse },
  error: { response: errorResponse },
  pagination: { response: paginationResponse }
})

const expandToOperations = ({ paths, models }) => {
  const expandedModels = expandModels(models)
  let operations = []
  paths.forEach(path => {
    path.operations.forEach(action => {
      operations.push({
        action,
        name: path.name,
        model: path.model,
        resourceName: path.resourceName,
        id: getId(action, path),
        summary: getSummary(action, path),
        path: path.isCustomFunctionResource
          ? [
            '',
            ...initial(path.pathParts),
            snakeCase(last(path.pathParts)).replace('invoke_', 'invoke.')
          ].join('/')
          : `/${path.pathParts.join('/')}`,
        verb: action === 'list' ? 'get' : action,
        namespace: getNamespace(path),
        parameters: getParameters(path),
        query: getQuery(action, path),
        successStatus: successStatuses[action] || 200,
        errorStatuses: collectionActions[action]
          ? [
            errors.badRequest,
            errors.unauthorized,
            errors.forbidden
          ]
          : [
            errors.badRequest,
            errors.unauthorized,
            errors.forbidden,
            errors.notFound
          ]
      })
    })
  })

  return {
    paths,
    operations,
    models: expandedModels
  }
}

module.exports = spec => {
  const { paths, models } = expandToResources(spec)
  return expandToOperations({ paths, models })
}

module.exports.expandToOperations = expandToOperations
