const range = require('lodash/range')
const mapValues = require('lodash/mapValues')
const { expandToOperations } = require('../expandToOperations')
const { expandToTestData } = require('../expandToTestData')
const { allEntityVerbs, allCollectionVerbs } = require('../common')

const spec = {
  paths: [
    {
      model: 'pet',
      pathParts: ['pets'],
      resourceName: 'pet',
      operations: allCollectionVerbs
    },
    {
      model: 'pet',
      resourceName: 'pet',
      pathParts: ['pets', '{petId}'],
      operations: allEntityVerbs
    }
  ],
  models: {
    pet: {
      request: {
        properties: { anything: { type: 'string' } }
      },
      response: {
        properties: {
          hackerPhrase: { type: 'string' },
          anything: { type: 'string' },
          email: { type: 'string', format: 'email' },
          datetime: { type: 'string', format: 'datetime' },
          patterned: { type: 'string', pattern: '^[a-z0-9]{6}$' },
          id: { type: 'string', format: 'uuid', readOnly: true }
        }
      }
    }
  }
}

describe('expandToTestData', () => {
  const { models, operations } = expandToOperations(spec)

  const faker = {
    internet: {
      email: () => 'random-email'
    },
    date: {
      recent: () => 'random-datetime'
    },
    random: {
      uuid: () => 'random-uuid'
    },
    lorem: {
      word: () => 'random-word'
    },
    hacker: {
      phrase: () => 'random-phrase'
    }
  }

  const reverseRegexp = () => 'reversed-pattern'

  const { testData: helpers } = expandToTestData(
    { models, operations },
    {
      fake: {
        reverseRegexp,
        generator: faker,
        names: { hackerPhrase: 'hacker.phrase' }
      }
    }
  )

  const fakePet = {
    id: 'random-uuid',
    email: 'random-email',
    datetime: 'random-datetime',
    anything: 'random-word',
    patterned: 'reversed-pattern',
    hackerPhrase: 'random-phrase'
  }

  test('basic', () => {
    expect(mapValues(helpers, helper => helper())).toEqual({
      listPets: { pets: range(20).map(() => fakePet) },
      getPet: { pet: fakePet },
      createPet: { pet: fakePet },
      replacePet: { pet: fakePet },
      updatePet: { pet: fakePet },
      checkPet: {},
      deletePet: {}
    })
  })

  test('query', () => {
    expect(mapValues(helpers, helper => helper({ query: { perPage: '2' } }))).toEqual({
      listPets: { pets: range(2).map(() => fakePet) },
      getPet: { pet: fakePet },
      createPet: { pet: fakePet },
      replacePet: { pet: fakePet },
      updatePet: { pet: fakePet },
      checkPet: {},
      deletePet: {}
    })
  })
})
