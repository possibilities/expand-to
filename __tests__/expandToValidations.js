const { expandToOperations } = require('../expandToOperations')
const { expandToValidations } = require('../expandToValidations')
const {
  allEntityVerbs,
  allCollectionVerbs,
  paginationResponse
} = require('../common')

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

const identitySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    firstName: { type: 'string' },
    lastName: { type: 'string' }
  },
  required: ['id', 'firstName', 'lastName']
}

const petSchema = {
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name']
}

test('expandToValidations', () => {
  const { models, operations } = expandToOperations(spec)
  const { validations } = expandToValidations({ models, operations })
  expect(validations).toEqual({
    listPets: {
      response: {
        type: 'object',
        properties: {
          pets: { type: 'array', items: petSchema },
          pagination: paginationResponse
        },
        required: ['pets']
      },
      request: {
        type: 'object',
        properties: {
          input: {
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
              params: { type: 'object', properties: {} }
            },
            required: ['query', 'params', 'body']
          },
          identity: identitySchema
        },
        required: ['input', 'identity']
      }
    },
    getPet: {
      response: {
        type: 'object',
        properties: { pet: petSchema },
        required: ['pet']
      },
      request: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              body: { type: 'object', properties: {} },
              query: { type: 'object', properties: {} },
              params: {
                type: 'object',
                properties: { petId: { type: 'string' } }
              }
            },
            required: ['query', 'params', 'body']
          },
          identity: identitySchema
        },
        required: ['input', 'identity']
      }
    },
    deletePet: {
      response: {
        type: 'object',
        properties: {}
      },
      request: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              body: { type: 'object', properties: {} },
              query: { type: 'object', properties: {} },
              params: {
                type: 'object',
                properties: { petId: { type: 'string' } }
              }
            },
            required: ['query', 'params', 'body']
          },
          identity: identitySchema
        },
        required: ['input', 'identity']
      }
    },
    checkPet: {
      response: {
        type: 'object',
        properties: {}
      },
      request: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              body: { type: 'object', properties: {} },
              query: { type: 'object', properties: {} },
              params: {
                type: 'object',
                properties: { petId: { type: 'string' } }
              }
            },
            required: ['query', 'params', 'body']
          },
          identity: identitySchema
        },
        required: ['input', 'identity']
      }
    },
    createPet: {
      response: {
        type: 'object',
        properties: { pet: petSchema },
        required: ['pet']
      },
      request: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              body: petSchema,
              query: { type: 'object', properties: {} },
              params: { type: 'object', properties: {} }
            },
            required: ['query', 'params', 'body']
          },
          identity: identitySchema
        },
        required: ['input', 'identity']
      }
    },
    replacePet: {
      response: {
        type: 'object',
        properties: { pet: petSchema },
        required: ['pet']
      },
      request: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              body: petSchema,
              query: { type: 'object', properties: {} },
              params: {
                type: 'object',
                properties: { petId: { type: 'string' } }
              }
            },
            required: ['query', 'params', 'body']
          },
          identity: identitySchema
        },
        required: ['input', 'identity']
      }
    },
    updatePet: {
      response: {
        type: 'object',
        properties: { pet: petSchema },
        required: ['pet']
      },
      request: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              body: petSchema,
              query: { type: 'object', properties: {} },
              params: {
                type: 'object',
                properties: { petId: { type: 'string' } }
              }
            },
            required: ['query', 'params', 'body']
          },
          identity: identitySchema
        },
        required: ['input', 'identity']
      }
    }
  })
})
