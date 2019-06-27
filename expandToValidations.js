const expandToOperations = require('./expandToOperations')
const mapValues = require('lodash/mapValues')
const keyBy = require('lodash/keyBy')
const inflection = require('inflection')
const { paginationResponse } = require('./common')

// Make map safe
const pluralize = str => inflection.pluralize(str)

const emptyResponseActions = { head: true, delete: true }

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
        response: operation.action === 'list'
          ? {
            type: 'object',
            properties: {
              pagination: paginationResponse,
              [pluralize(operation.response.key)]: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { name: { type: 'string' } },
                  required: ['name']
                }
              }
            },
            required: [pluralize(operation.response.key)]
          }
          : emptyResponseActions[operation.action]
            ? { type: 'object', properties: {} }
            : {
              type: 'object',
              properties: {
                [operation.response.key]: {
                  type: 'object',
                  properties: { name: { type: 'string' } },
                  required: ['name']
                }
              },
              required: [operation.response.key]
            },
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
