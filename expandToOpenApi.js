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

const emptyResponseActions = { head: true, delete: true }

const emptyRequestActions = {
  list: true,
  delete: true,
  head: true,
  get: true
}

const createEmptyResponse = operation => ({
  [operation.successStatus.code]: {
    description: operation.successStatus.description,
    content: {
      'application/json': {
        schema: {
          '$ref': `#/components/schemas/EmptyResponse`
        }
      }
    }
  }
})

const createModelResponse = (operation, modelName) => {
  const responseName = lowerFirst(modelName)
  const schemaName = `${upperFirst(modelName)}Response`

  const schema = operation.action === 'list'
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
    [operation.successStatus.code]: {
      description: operation.successStatus.description,
      content: { 'application/json': { schema } }
    }
  }
}

const getErrorResponses = (...errors) => {
  let responses = {}
  forEach(errors, error => {
    responses = {
      ...responses,
      [error.code]: {
        description: error.description,
        content: {
          'application/json': {
            schema: { '$ref': '#/components/schemas/ErrorResponse' }
          }
        }
      }
    }
  })
  return responses
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
  if (emptyRequestActions[operation.action]) return

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
  const modelName = isObject(get(models[operation.name], 'response'))
    ? operation.resourceName
    : get(models[operation.name], 'response', operation.model)

  const response = emptyResponseActions[operation.action]
    ? createEmptyResponse(operation, modelName)
    : createModelResponse(operation, modelName)

  const errorResponses = getErrorResponses(...operation.errorResponses)
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
      !emptyRequestActions[operation.action] &&
      !isString(models[operation.model].request) &&
      models[operation.model].request
    ) {
      schemas = {
        ...schemas,
        [`${name}Request`]: expandProperties(models[operation.model].request)
      }
    }
    if (
      !emptyResponseActions[operation.action] &&
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
