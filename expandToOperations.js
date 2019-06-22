const expandToResources = require('./expandToResources')
const compact = require('lodash/compact')
const initial = require('lodash/initial')
const last = require('lodash/last')
const upperFirst = require('lodash/upperFirst')
const inflection = require('inflection')

// Make map safe
const singularize = str => inflection.singularize(str)

const  actionToLabel = {
  post: 'create',
  head: 'check',
  put: 'replace',
  patch: 'update'
}

const getNamespace = path =>
  path.pathParts
    .filter(p => !p.startsWith('{'))
    .filter(p => !p.startsWith('invoke.'))

const getOperationId = (action, path) => {
  const namespace = getNamespace(path).map(upperFirst)
  const pathSubject = last(namespace)
  const pathContext = initial(namespace).map(singularize)

  if (path.isCustomFunctionResource) {
    return [
      'invoke',
      upperFirst(last(path.pathParts).split('.').pop()),
      'For',
      upperFirst(path.model)
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
    return `Invoke \`${last(path.pathParts).split('.').slice(1).join('.')}\` for ${path.model}`
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
      description: upperFirst(pathPart.slice(1, -3)) + ' id',
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

const expandToOperations = ({ paths, models }) => {
  let operations = []
  paths.forEach(path => {
    path.operations.forEach(action => {
      operations.push({
        model: path.model,
        id: getOperationId(action, path),
        summary: getSummary(action, path),
        path: `/${path.pathParts.join('/')}`,
        action,
        verb: action === 'list' ? 'get' : action,
        namespace: getNamespace(path),
        parameters: getParameters(path),
        query: getQuery(action, path),
        successStatus: successStatuses[action] || 200,
        errorStatuses: collectionActions[action]
          ? [400, 401, 403, 500]
          : compact([
            400,
            401,
            403,
            path.isCustomFunctionResource ? null : 404,
            500
          ])
      })
    })
  })
  return { paths, models, operations }
}

module.exports = spec => {
  const { paths, models } = expandToResources(spec)
  return expandToOperations({ paths, models })
}

module.exports.expandToOperations = expandToOperations
