const mapValues = require('lodash/mapValues')
const keyBy = require('lodash/keyBy')

const emptyRequestActions = {
  list: true,
  delete: true,
  head: true,
  get: true
}

const expandToValidations = ({ operations, models }, options = {}) => {
  let validations = {}
  operations.forEach(operation => {
    validations = {
      ...validations,
      [operation.id]: {
        request: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              properties: mapValues(keyBy(operation.query, 'name'), 'schema')
            },
            params: {
              type: 'object',
              properties: mapValues(keyBy(operation.parameters, 'name'), 'schema')
            },
            body: {
              type: 'object',
              ...emptyRequestActions[operation.action]
                ? {}
                : models[operation.model].request,
              properties: emptyRequestActions[operation.action]
                ? {}
                : models[operation.model].request.properties
            }
          },
          required: ['body', 'query', 'params']
        }
      }
    }
  })
  return { validations }
}

module.exports = (spec, config = {}) => {
  const { validations, operations, models } = expandToValidations(spec, config)
  return expandToValidations({ validations, operations, models }, config)
}

module.exports.expandToValidations = expandToValidations
