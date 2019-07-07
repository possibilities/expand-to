const get = require('lodash/get')
const fromPairs = require('lodash/fromPairs')
const mapValues = require('lodash/mapValues')
const range = require('lodash/range')
const inflection = require('inflection')
const fake = require('faker')
const RandExp = require('randexp')
const { emptyRequestActions, emptyResponseActions } = require('./common')

const randomRegexp = pattern => new RandExp(pattern).gen()

// Make map safe
const pluralize = str => inflection.pluralize(str)

const getFakeValue = (name, schema, options) => {
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

const expandToTestData = ({ operations, models }, options = {}) => {
  // For testing purposes only you can pass in a mocked helpers
  const faker = get(options, 'fake.generator', fake)

  let testData = {}
  operations.forEach(operation => {
    testData = {
      ...testData,
      [operation.id]: (req = {}) => {
        if (operation.action === 'list') {
          const { default: pageSize } =
            operation.query.find(q => q.name === 'pageSize').schema
          return {
            request: {
              params: {},
              query: { pageSize: 20, pageToken: faker.random.uuid() }
            },
            response: {
              nextPageToken: faker.random.uuid(),
              [pluralize(operation.response.key)]:
                range(parseInt(get(req, 'query.pageSize') || pageSize, 10))
                  .map(n => mapValues(
                    models[operation.response.schema].response.properties,
                    (schema, name) => getFakeValue(name, schema, options)
                  ))
            }
          }
        }

        const params = fromPairs(operation.parameters.map(param => ([
          param.name,
          getFakeValue(param.name, param.schema, options)
        ])))

        if (emptyResponseActions[operation.action]) {
          return { request: { params, query: {} }, response: {} }
        }

        return {
          request: emptyRequestActions[operation.action]
            ? {
              params,
              query: {}
            }
            : {
              body: mapValues(
                models[operation.request].request.properties,
                (schema, name) => getFakeValue(name, schema, options)
              ),
              params,
              query: {}
            },
          response: {
            [operation.response.key]: mapValues(
              models[operation.response.schema].response.properties,
              (schema, name) => getFakeValue(name, schema, options)
            )
          }
        }
      }
    }
  })
  return { testData, operations, models }
}

module.exports = (spec, options = {}) => {
  const expandToOperations = require('./expandToOperations')
  const { operations, models } = expandToOperations(spec, options)
  const { testData } = expandToTestData({ operations, models }, options)
  return testData
}

module.exports.expandToTestData = expandToTestData
