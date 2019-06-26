const expandToOperations = require('./expandToOperations')
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
            },
            identity: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                firstName: { type: 'string' },
                lastName: { type: 'string' }
              },
              required: ['id', 'firstName', 'lastName']
            }
          },
          required: ['body', 'query', 'params', 'identity']
        }
      }
    }
  })
  return { validations }
}

module.exports = (spec, config = {}) => {
  const { operations, models } = expandToOperations(spec, config)
  const { validations } = expandToValidations({ operations, models }, config)
  return validations
}

module.exports.expandToValidations = expandToValidations
