const range = require('lodash/range')
const isString = require('lodash/isString')
const fromPairs = require('lodash/fromPairs')
const mapValues = require('lodash/mapValues')
const first = require('lodash/first')
const groupBy = require('lodash/groupBy')
const expandToOperations = require('./expandToOperations')
const upperFirst = require('lodash/upperFirst')
const forEach = require('lodash/forEach')
const { emptyRequestActions, emptyResponseActions } = require('./common')

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

const getExamples = (type, operation) => {
  return fromPairs(range(5).map(n => {
    return [
      `${operation.model}${n + 1}`,
      {
        value: type === 'request'
          ? operation.getTestData().request.body
          : operation.getTestData().response
      }
    ]
  }))
}

const getRequestBody = (operation, models) => {
  if (!operation.request) return
  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          '$ref': `#/components/schemas/${upperFirst(operation.request)}Request`
        },
        examples: getExamples('request', operation)
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
      allOf: [
        { '$ref': '#/components/schemas/PaginationResponse' },
        {
          type: 'object',
          properties: {
            [operation.response.key]: {
              type: 'array',
              items: {
                '$ref': `#/components/schemas/${upperFirst(operation.response.schema)}Response`
              }
            }
          }
        }
      ]
    }
    : {
      type: 'object',
      properties: {
        [operation.response.key]: {
          '$ref': `#/components/schemas/${upperFirst(operation.response.schema)}Response`
        }
      }
    }

  let examples

  if (!emptyResponseActions[operation.action]) {
    examples = getExamples('response', operation)
  }

  return {
    ...errorResponses,
    [operation.response.code]: {
      description: operation.response.description,
      content: { 'application/json': { schema, examples } }
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

const expandProperties = (type, operation, models) => {
  const model = models[operation.model][type]
  return ({
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
  })
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
        [`${name}Request`]: expandProperties('request', operation, models)
      }
    }
    if (
      !emptyResponseActions[operation.action] &&
      !isString(models[operation.model].response)
    ) {
      schemas = {
        ...schemas,
        [`${name}Response`]: expandProperties('response', operation, models)
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
