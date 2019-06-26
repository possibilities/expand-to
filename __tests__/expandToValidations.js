const { expandToOperations } = require('../expandToOperations')
const { expandToValidations } = require('../expandToValidations')
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
        properties: { name: { type: 'string' } },
        required: ['name']
      },
      response: {
        properties: {
          name: { type: 'string' },
          id: { type: 'string', readOnly: true }
        }
      }
    }
  }
}

test('expandToValidations', () => {
  const { models, operations } = expandToOperations(spec)
  const expanded = expandToValidations({ models, operations })
  expect(expanded).toEqual({
    validations: {
      listPets: {
        request: {
          type: 'object',
          properties: {
            body: { type: 'object', properties: {} },
            query: {
              type: 'object',
              properties: {
                orderBy: { type: 'string' },
                page: { type: 'string' },
                perPage: { type: 'string' }
              }
            },
            params: { type: 'object', properties: {} }
          },
          required: ['body', 'query', 'params']
        }
      },
      getPet: {
        request: {
          type: 'object',
          properties: {
            body: { type: 'object', properties: {} },
            query: { type: 'object', properties: {} },
            params: {
              type: 'object',
              properties: { petId: { type: 'string' } }
            }
          },
          required: ['body', 'query', 'params']
        }
      },
      deletePet: {
        request: {
          type: 'object',
          properties: {
            body: { type: 'object', properties: {} },
            query: { type: 'object', properties: {} },
            params: {
              type: 'object',
              properties: { petId: { type: 'string' } }
            }
          },
          required: ['body', 'query', 'params']
        }
      },
      checkPet: {
        request: {
          type: 'object',
          properties: {
            body: { type: 'object', properties: {} },
            query: { type: 'object', properties: {} },
            params: {
              type: 'object',
              properties: { petId: { type: 'string' } }
            }
          },
          required: ['body', 'query', 'params']
        }
      },
      createPet: {
        request: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              properties: { name: { type: 'string' } },
              required: ['name']
            },
            query: { type: 'object', properties: {} },
            params: { type: 'object', properties: {} }
          },
          required: ['body', 'query', 'params']
        }
      },
      replacePet: {
        request: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              properties: { name: { type: 'string' } },
              required: ['name']
            },
            query: { type: 'object', properties: {} },
            params: {
              type: 'object',
              properties: { petId: { type: 'string' } }
            }
          },
          required: ['body', 'query', 'params']
        }
      },
      updatePet: {
        request: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              properties: { name: { type: 'string' } },
              required: ['name']
            },
            query: { type: 'object', properties: {} },
            params: {
              type: 'object',
              properties: {
                petId: { type: 'string' }
              }
            }
          },
          required: ['body', 'query', 'params']
        }
      }
    }
  })
})
