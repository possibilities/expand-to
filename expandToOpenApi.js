const mapValues = require('lodash/mapValues')
const omit = require('lodash/omit')
const get = require('lodash/get')
const groupBy = require('lodash/groupBy')
const expandToOperations = require('./expandToOperations')
const lowerFirst = require('lodash/lowerFirst')
const upperFirst = require('lodash/upperFirst')
const forEach = require('lodash/forEach')
const inflection = require('inflection')
const { errors } = require('./common')

// Make map safe
const pluralize = str => inflection.pluralize(str)

const actionToLabel = {
  post: 'create',
  head: 'check',
  put: 'replace',
  patch: 'update'
}

const responselessActions = ['head', 'delete']
const bodylessActions = ['list', 'delete', 'head', 'get']

const createResponse = (status, action, modelName) => ({
  [status]: {
    description: `${upperFirst(actionToLabel[action] || action)} succeeded`,
    content: {
      'application/json': {
        schema: {
          '$ref': `#/components/schemas/${upperFirst(modelName)}Response`
        }
      }
    }
  }
})

const createModelResponse = (status, action, modelName) => {
  const responseName = lowerFirst(modelName)

  const schemaName = `${upperFirst(modelName)}Response`
  const schema = action === 'list'
    ? {
      type: 'object',
      properties: {
        [pluralize(responseName)]: {
          type: 'array',
          items: { '$ref': `#/components/schemas/${schemaName}` }
        },
        pages: { '$ref': '#/components/schemas/PaginationResponse' }
      }
    }
    : {
      type: 'object',
      properties: {
        [responseName]: { '$ref': `#/components/schemas/${schemaName}` }
      }
    }

  return {
    [status]: {
      description: `${upperFirst(actionToLabel[action] || action)} succeeded`,
      content: { 'application/json': { schema }
      }
    }
  }
}

const errorMessage = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found'
}

const getErrorResponses = (...codes) => {
  let errors = {}
  forEach(codes, code => {
    errors = {
      ...errors,
      [code]: {
        description: errorMessage[code],
        content: {
          'application/json': {
            schema: { '$ref': '#/components/schemas/ErrorResponse' }
          }
        }
      }
    }
  })
  return errors
}

const getParameters = (operation, models) => {
  return [
    ...operation.parameters.map(param => {
      const schema = get(models[operation.model].response, 'properties.id')
        ? omit(models[operation.model].response.properties.id, 'readOnly')
        : { type: 'string' }
      return {
        schema,
        in: 'path',
        required: true,
        name: param.name,
        description: param.description
      }
    }),
    ...operation.query.map(query => {
      return {
        ...query,
        in: 'query',
        required: false
      }
    })
  ]
}

const getRequestBody = operation => {
  if (bodylessActions.includes(operation.action)) return
  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          '$ref': `#/components/schemas/${upperFirst(operation.model)}Request`
        }
      }
    }
  }
}

const getResponses = operation => {
  let response
  if (['put', 'patch', 'get'].includes(operation.action)) {
    response = createModelResponse(
      200,
      operation.action,
      upperFirst(operation.model)
    )
  } else {
    switch (operation.action) {
      case 'post':
        response = createModelResponse(201, 'create', operation.model)
        break
      case 'list':
        response = createModelResponse(200, 'list', operation.model)
        break
      case 'delete':
        response = createResponse(204, 'delete', 'Empty', operation.model)
        break
      case 'head':
        response = createResponse(200, 'check', 'Empty', operation.model)
        break
    }
  }

  const errorResponses = ['list', 'post'].includes(operation.action)
    ? getErrorResponses(
      errors.badRequest,
      errors.unauthorized,
      errors.forbidden
    )
    : getErrorResponses(
      errors.badRequest,
      errors.unauthorized,
      errors.forbidden,
      errors.notFound
    )

  return { ...response, ...errorResponses }
}

const getMethod = (operation, models) => {
  return {
    operationId: operation.id,
    tags: operation.namespace,
    summary: operation.summary,
    parameters: getParameters(operation, models),
    requestBody: getRequestBody(operation),
    responses: getResponses(operation)
  }
}

const getSchemas = (operations, models = {}) => {
  let schemas = {
    EmptyResponse: models.empty.response,
    ErrorResponse: models.error.response,
    PaginationResponse: models.pagination.response
  }

  operations.forEach(operation => {
    const name = upperFirst(operation.model)
    if (!bodylessActions.includes(operation.action)) {
      schemas = {
        ...schemas,
        [`${name}Request`]: models[operation.model].request
      }
    }
    if (!responselessActions.includes(operation.action)) {
      schemas = {
        ...schemas,
        [`${name}Response`]: models[operation.model].response
      }
    }
  })

  return schemas
}

const expandToOpenApi = ({ operations, models }, options = {}) => {
  const { version = '0.0.0', title = 'API spec' } = (options.info || {})
  const info = { version, title }
  const paths = mapValues(
    groupBy(operations, 'path'),
    path => (
      mapValues(
        groupBy(path, 'verb'),
        operation => getMethod(operation.pop(), models)
      )
    )
  )

  const components = { schemas: getSchemas(operations, models) }
  return { openapi: '3.0.0', info, paths, components }
}

module.exports = (spec, config = {}) => {
  const { operations, models } = expandToOperations(spec, config)
  return expandToOpenApi({ operations, models }, config)
}

module.exports.expandToOpenApi = expandToOpenApi
