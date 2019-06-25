const isObject = require('lodash/isObject')
const isString = require('lodash/isString')
const mapValues = require('lodash/mapValues')
const first = require('lodash/first')
const get = require('lodash/get')
const groupBy = require('lodash/groupBy')
const expandToOperations = require('./expandToOperations')
const lowerFirst = require('lodash/lowerFirst')
const upperFirst = require('lodash/upperFirst')
const forEach = require('lodash/forEach')
const inflection = require('inflection')

// Make map safe
const pluralize = str => inflection.pluralize(str)
const singularize = str => inflection.singularize(str)

const emptyResponseActions = { head: true, delete: true }

const emptyRequestActions = {
  list: true,
  delete: true,
  head: true,
  get: true
}

const createEmptyResponse = operation => ({
  [operation.successResponse.code]: {
    description: operation.successResponse.description,
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
        [singularize(responseName)]: { '$ref': `#/components/schemas/${schemaName}` }
      }
    }

  return {
    [operation.successResponse.code]: {
      description: operation.successResponse.description,
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

const getParameters = (operation, models) => ([
  ...operation.parameters.map(param => {
    return {
      in: 'path',
      required: true,
      name: param.name,
      schema: param.schema,
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
])

const getRequestBody = (operation, models) => {
  if (emptyRequestActions[operation.action]) return

  const modelName = isObject(get(models[operation.name], 'request'))
    ? get(models[operation.name], 'request')
    : operation.resourceName

  const model = models[modelName] && models[modelName].request
    ? modelName
    : isObject(modelName)
      ? operation.model
      : operation.resourceName

  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          '$ref': `#/components/schemas/${upperFirst(model)}Request`
        }
      }
    }
  }
}

const getResponses = (operation, models) => {
  const errorResponses = getErrorResponses(...operation.errorResponses)

  const modelName = isObject(get(models[operation.name], 'response'))
    ? get(models[operation.name], 'response')
    : operation.resourceName

  const response = models[modelName] && models[modelName].request
    ? emptyResponseActions[operation.action]
      ? createEmptyResponse(operation, modelName)
      : createModelResponse(operation, modelName)
    : isObject(modelName)
      ? createModelResponse(operation, operation.model)
      : createModelResponse(operation, operation.resourceName)

  return { ...response, ...errorResponses }
}

const getMethod = (operation, models) => {
  return {
    operationId: operation.id,
    tags: [upperFirst(first(operation.namespace))],
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
  // console.log(expandToOpenApi({ operations, models }, config).components.schemas)
  // console.log(expandToOpenApi({ operations, models }, config).paths['/people/{personId}/pets'].post.responses[201].content['application/json'].schema)
  return expandToOpenApi({ operations, models }, config)
}

module.exports.expandToOpenApi = expandToOpenApi
