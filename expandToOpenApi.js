const isObject = require('lodash/isObject')
const isString = require('lodash/isString')
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

const getRequestBody = (operation, models) => {
  if (bodylessActions.includes(operation.action)) return

  let modelName = operation.resourceName
  if (isObject(get(models[operation.name], 'request'))) {
    modelName = get(models[operation.name], 'request')
  }

  if (models[modelName] && models[modelName].request) {
    return {
      required: true,
      content: {
        'application/json': {
          schema: {
            '$ref': `#/components/schemas/${upperFirst(modelName)}Request`
          }
        }
      }
    }
  }

  if (isObject(modelName)) {
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

  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          '$ref': `#/components/schemas/${upperFirst(operation.resourceName)}Request`
        }
      }
    }
  }
}

const getResponses = (operation, models) => {
  let response
  const modelName = isObject(get(models[operation.name], 'response'))
    ? operation.resourceName
    : get(models[operation.name], 'response', operation.model)
  if (['put', 'patch', 'get'].includes(operation.action)) {
    response = createModelResponse(200, operation.action, modelName)
  } else {
    switch (operation.action) {
      case 'post':
        response = createModelResponse(201, 'create', modelName)
        break
      case 'list':
        response = createModelResponse(200, 'list', modelName)
        break
      case 'delete':
        response = createResponse(204, 'delete', 'Empty', modelName)
        break
      case 'head':
        response = createResponse(200, 'check', 'Empty', modelName)
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
    requestBody: getRequestBody(operation, models),
    responses: getResponses(operation, models)
  }
}

const expandProperties = model => {
  return {
    ...model,
    properties: mapValues(model.properties, prop => {
      if (isString(prop)) {
        return {
          '$ref': `#/components/schemas/${upperFirst(prop)}Response`
        }
      } else if (Array.isArray(prop)) {
        return {
          type: 'array',
          items: {
            '$ref': `#/components/schemas/${upperFirst(prop)}Response`
          }
        }
      }
      return prop
    })
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
    if (
      !bodylessActions.includes(operation.action) &&
      !isString(models[operation.model].request) &&
      models[operation.model].request
    ) {
      schemas = {
        ...schemas,
        [`${name}Request`]: expandProperties(models[operation.model].request)
      }
    }
    if (
      !responselessActions.includes(operation.action) &&
      !isString(models[operation.model].response)
    ) {
      schemas = {
        ...schemas,
        [`${name}Response`]: expandProperties(models[operation.model].response)
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
