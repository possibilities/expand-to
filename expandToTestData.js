const expandToOperations = require('./expandToOperations')
const get = require('lodash/get')
const mapValues = require('lodash/mapValues')
const range = require('lodash/range')
const inflection = require('inflection')
const fake = require('faker')
const RandExp = require('randexp')

const randomRegexp = pattern => new RandExp(pattern).gen()

// Make map safe
const pluralize = str => inflection.pluralize(str)

const getFakeValue = (operation, name, schema, options) => {
  // For testing purposes only you can pass in a mocked helpers
  const faker = get(options, 'fake.generator', fake)
  const reverseRegexp = get(options, 'fake.reverseRegexp', randomRegexp)

  if (schema.type === 'string') {
    if (schema.pattern) return reverseRegexp(schema.pattern)
    switch (schema.format) {
      case 'email':
        return faker.internet.email()
      case 'datetime':
        return faker.date.recent()
      case 'uuid':
        return faker.random.uuid()
    }
    const fakePathByName = get(options, `fake.names.${name}`)
    if (fakePathByName) return get(faker, fakePathByName)()
  }
  return faker.lorem.word()
}

const emptyResponseActions = { head: true, delete: true }

const expandToTestData = ({ operations, models }, options = {}) => {
  let testData = {}
  operations.forEach(operation => {
    testData = {
      ...testData,
      [operation.id]: (req = {}) => {
        if (operation.action === 'list') {
          const { default: perPage } =
            operation.query.find(q => q.name === 'perPage').schema
          return {
            [pluralize(operation.response.key)]:
              range(parseInt(get(req, 'query.perPage') || perPage, 10))
                .map(n => mapValues(
                  models[operation.response.schema].response.properties,
                  (schema, name) => getFakeValue(operation, name, schema, options)
                ))
          }
        }

        if (emptyResponseActions[operation.action]) return {}

        return {
          [operation.response.key]: mapValues(
            models[operation.response.schema].response.properties,
            (schema, name) => getFakeValue(operation, name, schema, options)
          )
        }
      }
    }
  })
  return { testData }
}

module.exports = (spec, config = {}) => {
  const { operations, models } = expandToOperations(spec, config)
  const { testData } = expandToTestData({ operations, models }, config)
  return testData
}

module.exports.expandToTestData = expandToTestData
