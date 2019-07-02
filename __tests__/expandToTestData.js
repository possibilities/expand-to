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
        properties: {
          hackerPhrase: { type: 'string' },
          anything: { type: 'string' },
          email: { type: 'string', format: 'email' },
          datetime: { type: 'string', format: 'datetime' },
          patterned: { type: 'string', pattern: '^[a-z0-9]{6}$' }
        }
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

  const fakePetRequest = {
    email: 'random-email',
    datetime: 'random-datetime',
    anything: 'random-word',
    patterned: 'reversed-pattern',
    hackerPhrase: 'random-phrase'
  }

  const fakePetResponse = {
    id: 'random-uuid',
    email: 'random-email',
    datetime: 'random-datetime',
    anything: 'random-word',
    patterned: 'reversed-pattern',
    hackerPhrase: 'random-phrase'
  }

  test('basic', () => {
    expect(mapValues(helpers, helper => helper())).toEqual({
      listPets: {
        request: {
          query: { perPage: 20, page: 1 },
          params: {}
        },
        response: {
          pets: range(20).map(() => fakePetResponse),
          pagination: {
            firstPage: 1,
            lastPage: 10,
            nextPage: 2,
            prevPage: 1
          }
        }
      },
      getPet: {
        request: {
          query: {},
          params: { petId: 'random-uuid' }
        },
        response: { pet: fakePetResponse }
      },
      createPet: {
        request: {
          body: fakePetRequest,
          query: {},
          params: {}
        },
        response: { pet: fakePetResponse }
      },
      updatePet: {
        request: {
          body: fakePetRequest,
          query: {},
          params: { petId: 'random-uuid' }
        },
        response: { pet: fakePetResponse }
      },
      replacePet: {
        request: {
          body: fakePetRequest,
          query: {},
          params: { petId: 'random-uuid' }
        },
        response: { pet: fakePetResponse }
      },
      checkPet: {
        request: {
          query: {},
          params: { petId: 'random-uuid' }
        },
        response: {}
      },
      deletePet: {
        request: {
          query: {},
          params: { petId: 'random-uuid' }
        },
        response: {}
      }
    })
  })

  test('query', () => {
    expect((mapValues(helpers, helper => helper({
      query: { perPage: 2 }
    }).response).listPets.pets)).toEqual([
      fakePetResponse,
      fakePetResponse
    ])
  })
})
