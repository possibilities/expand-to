const expandToOperations = require('./expandToOperations')
const mapValues = require('lodash/mapValues')
const get = require('lodash/get')
const keyBy = require('lodash/keyBy')
const inflection = require('inflection')
const {
  paginationResponse,
  emptyRequestActions,
  emptyResponseActions
} = require('./common')

// Make map safe
const pluralize = str => inflection.pluralize(str)

const expandToValidations = ({ operations, models }, options = {}) => {
  let validations = {}
  operations.forEach(operation => {
    validations = {
      ...validations,
      [operation.id]: {
        response: operation.action === 'list'
          ? {
            type: 'object',
            properties: {
              pagination: paginationResponse,
              [pluralize(operation.response.key)]: {
                type: 'array',
                items: get(models[operation.model], 'response', {})
              }
            },
            required: [pluralize(operation.response.key)]
          }
          : emptyResponseActions[operation.action]
            ? { type: 'object', properties: {} }
            : {
              type: 'object',
              properties: {
                [operation.response.key]: get(models[operation.model], 'response', {})
              },
              required: [operation.response.key]
            },
        request: {
          type: 'object',
          properties: {
            input: {
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
                    : get(models[operation.model], 'request', {}),
                  properties: emptyRequestActions[operation.action]
                    ? {}
                    : get(models[operation.model], 'request.properties', {})
                }
              },
              required: ['query', 'params', 'body']
            },
            identity: {
              type: 'object',
              properties: { id: { type: 'string', format: 'uuid' } },
              required: ['id']
            }
          },
          required: ['input', 'identity']
        }
      }
    }
  })

  return { validations, operations, models }
}

module.exports = (spec, config = {}) => {
  const { operations, models } = expandToOperations(spec, config)
  const { validations } = expandToValidations({ operations, models }, config)
  return validations
}

module.exports.expandToValidations = expandToValidations
