const isString = require('lodash/isString')
const mapValues = require('lodash/mapValues')
const first = require('lodash/first')
const groupBy = require('lodash/groupBy')
const expandToOperations = require('./expandToOperations')
const upperFirst = require('lodash/upperFirst')
const forEach = require('lodash/forEach')
const inflection = require('inflection')
const { emptyRequestActions, emptyResponseActions } = require('./common')

// Make map safe
const pluralize = str => inflection.pluralize(str)
const singularize = str => inflection.singularize(str)

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
  if (!operation.request) return
  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          '$ref': `#/components/schemas/${upperFirst(operation.request)}Request`
        }
      }
    }
  }
}

const getResponses = (operation, models) => {
  const errorResponses = getErrorResponses(...operation.errorResponses)
  if (operation.response.schema === 'empty') {
    return {
      ...errorResponses,
      [operation.response.code]: {
        description: operation.response.description,
        content: {
          'application/json': {
            schema: {
              '$ref': `#/components/schemas/EmptyResponse`
            }
          }
        }
      }
    }
  }

  const schema = operation.action === 'list'
    ? {
      type: 'object',
      properties: {
        [pluralize(operation.response.key)]: {
          type: 'array',
          items: {
            '$ref': `#/components/schemas/${upperFirst(operation.response.schema)}Response`
          }
        },
        pages: { '$ref': '#/components/schemas/PaginationResponse' }
      }
    }
    : {
      type: 'object',
      properties: {
        [singularize(operation.response.key)]: {
          '$ref': `#/components/schemas/${upperFirst(operation.response.schema)}Response`
        }
      }
    }

  return {
    ...errorResponses,
    [operation.response.code]: {
      description: operation.response.description,
      content: { 'application/json': { schema } }
    }
  }
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
  const { info: infoOverride, ...otherOptions } = options
  const { version = '0.0.0', title = 'API spec' } = (infoOverride || {})
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
  return {
    openapi: '3.0.0',
    info,
    paths,
    components,
    ...otherOptions
  }
}

module.exports = (spec, options = {}) => {
  const { operations, models } = expandToOperations(spec, options)
  return expandToOpenApi({ operations, models }, options)
}

module.exports.expandToOpenApi = expandToOpenApi
