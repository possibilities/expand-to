const snakeCase = require('lodash/snakeCase')
const toPairs = require('lodash/toPairs')
const fromPairs = require('lodash/fromPairs')
const mapValues = require('lodash/mapValues')
const forEach = require('lodash/forEach')
const initial = require('lodash/initial')
const last = require('lodash/last')
const keyBy = require('lodash/keyBy')
const upperFirst = require('lodash/upperFirst')
const lowerFirst = require('lodash/lowerFirst')
const expand = require('./expand')
const inflection = require('inflection')
const { emptyOutput, errorOutput } = require('./common')
const getOperationId = require('./getOperationId')
const getNamespace = require('./getNamespace')
const getParameters = require('./getParameters')
const getSummary = require('./getSummary')
const getTags = require('./getTags')

// Make map safe
const singularize = str => inflection.singularize(str)
const pluralize = str => inflection.pluralize(str)

const labelToVerb = {
  post: 'create',
  head: 'check',
  put: 'replace',
  patch: 'update'
}

const bodylessActions = ['list', 'delete', 'head', 'get']
const getRequestBody = (verb, resource) => {
  if (bodylessActions.includes(verb)) return
  const operationId = getOperationId(verb, resource)
  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          '$ref': `#/components/schemas/${upperFirst(operationId)}Input`
        }
      }
    }
  }
}

const createResponse = (status, verb, resourceName) => ({
  [status]: {
    description: `${upperFirst(labelToVerb[verb] || verb)} succeeded`,
    content: {
      'application/json': {
        schema: {
          '$ref': `#/components/schemas/${resourceName}Output`
        }
      }
    }
  }
})

const createModelResponse = (status, verb, resourceName, operationId) => ({
  [status]: {
    description: `${upperFirst(labelToVerb[verb] || verb)} succeeded`,
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

const getResponses = (verb, resource) => {
  const operationId = getOperationId(verb, resource)
  const namespace = getNamespace(resource).map(upperFirst)

  let response
  if (['put', 'patch', 'get'].includes(verb)) {
    response = createModelResponse(
      200,
      verb,
      lowerFirst(namespace.map(singularize).join('')),
      operationId
    )
  } else {
    switch (verb) {
      case 'post':
        response = createModelResponse(
          201,
          'create',
          lowerFirst(namespace.map(singularize).join('')),
          operationId
        )
        break
      case 'list':
        response = createModelResponse(
          200,
          'list',
          lowerFirst(pluralize(namespace.map(singularize).join(''))),
          operationId
        )
        break
      case 'delete':
        response = createResponse(204, 'delete', 'Empty', operationId)
        break
      case 'head':
        response = createResponse(200, 'check', 'Empty', operationId)
        break
    }
  }

  const errorResponses =
    resource.isCustomFunction || ['list', 'post'].includes(verb)
      ? getErrorResponses(400, 401, 403)
      : getErrorResponses(400, 401, 403, 404)

  return { ...response, ...errorResponses }
}

const methodForResource = (verb, resource) => ({
  operationId: getOperationId(verb, resource),
  parameters: getParameters(verb, resource),
  requestBody: getRequestBody(verb, resource),
  responses: getResponses(verb, resource),
  tags: getTags(verb, resource),
  summary: getSummary(verb, resource)
})

const methodsForResource = resource => {
  let methods = {}
  forEach(resource.methods, verb => {
    methods = {
      ...methods,
      [verb === 'list' ? 'get' : verb]: methodForResource(verb, resource)
    }
  })
  return methods
}

const bodylessVerbs = ['get', 'delete', 'head']
const responselessVerbs = ['head', 'delete']

const stripReadOnly = model => {
  const properties =
    fromPairs(toPairs(model.properties).filter(([name, value]) => !value.readOnly))
  return { ...model, properties }
}

const schemasFromSpec = (spec, models) => {
  let schemas = { EmptyOutput: emptyOutput, ErrorOutput: errorOutput }
  forEach(spec, path => {
    const { resource, methods } = path
    forEach(methods, (path, method) => {
      const name = upperFirst(path.operationId)
      const model = models[resource.modelName]
      if (path.requestBody && !bodylessVerbs.includes(method)) {
        schemas = { ...schemas, [`${name}Input`]: stripReadOnly(model) }
      }
      if (!responselessVerbs.includes(method)) {
        schemas = { ...schemas, [`${name}Output`]: model }
      }
    })
  })

  return schemas
}

const expandToOpenApi = (spec, options = {}) => {
  const { version = '0.0.0', title = 'API spec' } = options
  const info = { version, title }

  const resourcesByPath = keyBy(
    spec.paths,
    resource => '/' + [
      ...resource.mountPath,
      ...initial(resource.path),
      resource.isCustomFunction
        ? snakeCase(last(resource.path))
        : last(resource.path)
    ].join('/')
  )

  const pathsWithMethods = mapValues(
    resourcesByPath,
    resource => ({
      resource,
      methods: methodsForResource(resource)
    })
  )

  const components = { schemas: schemasFromSpec(pathsWithMethods, spec.models) }
  const paths = mapValues(pathsWithMethods, 'methods')

  return { openapi: '3.0.0', info, paths, components }
}

module.exports = (spec, info) =>
  expandToOpenApi(expand(spec), info)

module.exports.expandToOpenApi = expandToOpenApi
