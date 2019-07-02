const lowerFirst = require('lodash/lowerFirst')
const isObject = require('lodash/isObject')
const compact = require('lodash/compact')
const omit = require('lodash/omit')
const get = require('lodash/get')
const initial = require('lodash/initial')
const pick = require('lodash/pick')
const last = require('lodash/last')
const snakeCase = require('lodash/snakeCase')
const upperFirst = require('lodash/upperFirst')
const inflection = require('inflection')
const {
  errors,
  emptyResponse,
  errorResponse,
  paginationResponse,
  emptyRequestActions,
  emptyResponseActions
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
  const namespace = getNamespace(path)
  const noun = last(namespace)
  const space = initial(namespace)
  if (path.isUserCentricResource) {
    return [
      upperFirst(actionToLabel[action] || action),
      ...space.slice(1).map(singularize),
      action === 'list' ? noun : singularize(noun),
      'for user'
    ].filter(Boolean).join(' ')
  }
  if (path.isCustomFunctionResource) {
    const fnName = last(path.pathParts).split('.').slice(1).join('.')
    const resourceName = action === 'list'
      ? pluralize(path.resourceName)
      : path.resourceName
    return `Invoke \`${fnName}\` for ${resourceName}`
  }
  return [
    upperFirst(actionToLabel[action] || action),
    ...space.map(singularize),
    action === 'list' ? noun : singularize(noun)
  ].filter(Boolean).join(' ')
}

const getParameters = (path, models) => {
  let parameters = []
  path.pathParts.filter(p => p.startsWith('{')).forEach(pathPart => {
    const type = pathPart.slice(1, -3)
    const schema = get(models[type], 'response.properties.id')
      ? omit(models[type].response.properties.id, 'readOnly')
      : { type: 'string' }
    parameters.push({
      schema,
      name: pathPart.slice(1, -1),
      description: upperFirst(type) + ' id'
    })
  })
  return parameters
}

const getQuery = (action, path) => {
  if (action === 'list') {
    return [

      { name: 'perPage', description: 'Per page', schema: { type: 'integer', format: 'int32', default: 20 } },
      { name: 'page', description: 'Page number', schema: { type: 'integer', format: 'int32', default: 1 } },
      { name: 'orderBy', description: 'Order by', schema: { type: 'string' } }
    ]
  }
  return []
}

const collectionActions = { list: true, post: true }

const successResponses = {
  list: { code: 200, description: 'List succeeded' },
  post: { code: 201, description: 'Create succeeded' },
  delete: { code: 204, description: 'Delete succeeded' },
  get: { code: 200, description: 'Get succeeded' },
  head: { code: 200, description: 'Check succeeded' },
  put: { code: 200, description: 'Replace succeeded' },
  patch: { code: 200, description: 'Update succeeded' }
}

const expandModels = models => ({
  ...models,
  empty: { response: emptyResponse },
  error: { response: errorResponse },
  pagination: { response: paginationResponse }
})

const createModelResponse = (action, code, description, schema) => {
  const key = lowerFirst(schema)
  return { key, code, schema, description }
}

const getResponse = (action, path, models) => {
  const { code, description } = successResponses[action]
  const modelName = isObject(get(models[path.name], 'response'))
    ? get(models[path.name], 'response')
    : path.resourceName

  return emptyResponseActions[action]
    ? { schema: 'empty', code, description }
    : get(models[modelName], 'request')
      ? createModelResponse(action, code, description, modelName)
      : isObject(modelName)
        ? createModelResponse(action, code, description, path.model)
        : createModelResponse(action, code, description, path.resourceName)
}

const getRequest = (action, path, models) => {
  if (emptyRequestActions[action]) return

  const modelName = isObject(get(models[path.name], 'request'))
    ? get(models[path.name], 'request')
    : path.resourceName

  const schema = models[modelName] && models[modelName].request
    ? modelName
    : isObject(modelName)
      ? path.model
      : path.resourceName

  return schema
}

const expandToOperations = ({ paths, models }, options = {}) => {
  const expandedModels = expandModels(models)
  let operations = []
  paths.forEach(path => {
    path.operations.forEach(action => {
      if (get(options, 'ignoreActions', []).includes(action)) return
      operations.push({
        action,
        id: getId(action, path),
        ...pick(path, ['name', 'model', 'resourceName']),
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
        parameters: getParameters(path, models),
        query: getQuery(action, path),
        response: getResponse(action, path, models),
        request: getRequest(action, path, models),
        successResponse: successResponses[action],
        errorResponses: collectionActions[action]
          ? [
            errors.badRequest,
            errors.unauthorized,
            errors.forbidden
          ]
          : compact([
            errors.badRequest,
            errors.unauthorized,
            errors.forbidden,
            // Handle the special case of user-as-user route
            (!path.isUserCentricResource || path.pathParts.length !== 1) && errors.notFound
          ])
      })
    })
  })

  // Amend each operation with a function that creates test data and a validator
  const { expandToTestData } = require('./expandToTestData')
  const { expandToValidations } = require('./expandToValidations')
  const { testData } = expandToTestData({ operations, paths, models }, options)
  const { validations } = expandToValidations({ operations, models: expandedModels }, options)
  operations = operations.map(operation => ({
    ...operation,
    getTestData: testData[operation.id],
    validation: validations[operation.id]
  }))

  return { paths, operations, models: expandedModels }
}

module.exports = (spec, options = {}) => {
  const expandToResources = require('./expandToResources')
  const { paths, models } = expandToResources(spec, options)
  return expandToOperations({ paths, models }, options)
}

module.exports.expandToOperations = expandToOperations
