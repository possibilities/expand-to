const mapValues = require('lodash/mapValues')
const groupBy = require('lodash/groupBy')
const expandToOperations = require('./expandToOperations')
const lowerFirst = require('lodash/lowerFirst')
const upperFirst = require('lodash/upperFirst')
const inflection = require('inflection')
const forEach = require('lodash/forEach')
const { emptyOutput, errorOutput } = require('./common')

// Make map safe
const singularize = str => inflection.singularize(str)
const pluralize = str => inflection.pluralize(str)

const actionToLabel = {
  post: 'create',
  head: 'check',
  put: 'replace',
  patch: 'update'
}

const responselessActions = ['head', 'delete']
const bodylessActions = ['list', 'delete', 'head', 'get']

const createResponse = (status, action, resourceName) => ({
  [status]: {
    description: `${upperFirst(actionToLabel[action] || action)} succeeded`,
    content: {
      'application/json': {
        schema: {
          '$ref': `#/components/schemas/${resourceName}Output`
        }
      }
    }
  }
})

const createModelResponse = (status, action, resourceName, operationId) => ({
  [status]: {
    description: `${upperFirst(actionToLabel[action] || action)} succeeded`,
    content: {
      'application/json': {
        schema: {
          properties: {
            [resourceName]: {
              '$ref': `#/components/schemas/${upperFirst(operationId)}Output`
            }
          }
        }
      }
    }
  }
})

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
            schema: { '$ref': '#/components/schemas/ErrorOutput' }
          }
        }
      }
    }
  })
  return errors
}

const getParameters = operation => {
  return [
    ...operation.parameters.map(param => {
      return {
        in: 'path',
        required: true,
        name: param.name,
        description: param.description,
        schema: {
          type: 'string',
          format: 'uuid'
        }
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
          '$ref': `#/components/schemas/${upperFirst(operation.id)}Input`
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
      lowerFirst(operation.namespace.map(upperFirst).map(singularize).join('')),
      operation.id
    )
  } else {
    switch (operation.action) {
      case 'post':
        response = createModelResponse(
          201,
          'create',
          lowerFirst(operation.namespace.map(upperFirst).map(singularize).join('')),
          operation.id
        )
        break
      case 'list':
        response = createModelResponse(
          200,
          'list',
          lowerFirst(pluralize(operation.namespace.map(upperFirst).map(singularize).join(''))),
          operation.id
        )
        break
      case 'delete':
        response = createResponse(204, 'delete', 'Empty', operation.id)
        break
      case 'head':
        response = createResponse(200, 'check', 'Empty', operation.id)
        break
    }
  }

  const errorResponses =
    operation.isCustomFunctionResource || ['list', 'post'].includes(operation.action)
      ? getErrorResponses(400, 401, 403)
      : getErrorResponses(400, 401, 403, 404)

  return { ...response, ...errorResponses }
}

const getMethod = operation => {
  return {
    operationId: operation.id,
    tags: operation.namespace,
    summary: operation.summary,
    parameters: getParameters(operation),
    requestBody: getRequestBody(operation),
    responses: getResponses(operation)
  }
}

const getSchemas = (operations, models = {}) => {
  let schemas = { EmptyOutput: emptyOutput, ErrorOutput: errorOutput }

  operations.forEach(operation => {
    const name = upperFirst(operation.id)
    if (!bodylessActions.includes(operation.action)) {
      schemas = { ...schemas, [`${name}Input`]: models[operation.model].in }
    }
    if (!responselessActions.includes(operation.action)) {
      schemas = { ...schemas, [`${name}Output`]: models[operation.model].out }
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
        operation => getMethod(operation.pop())
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
