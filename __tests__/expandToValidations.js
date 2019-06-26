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
                page: { type: 'string', default: '1' },
                perPage: { type: 'string', default: '20' }
              }
            },
            params: { type: 'object', properties: {} },
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
            params: { type: 'object', properties: {} },
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
})
