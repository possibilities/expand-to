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
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      },
      response: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          id: { type: 'string', readOnly: true }
        },
        required: ['name']
      }
    }
  }
}

const identitySchema = {
  type: 'object',
  properties: { id: { type: 'string', format: 'uuid' } },
  required: ['id']
}

const petSchemaRequest = {
  type: 'object',
  properties: {
    name: { type: 'string' }
  },
  required: ['name']
}

const petSchemaResponse = {
  type: 'object',
  properties: {
    id: { type: 'string', readOnly: true },
    name: { type: 'string' }
  },
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
          pets: { type: 'array', items: petSchemaResponse },
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
                  page: { type: 'integer', format: 'int32', default: 1 },
                  perPage: { type: 'integer', format: 'int32', default: 20 }
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
        properties: { pet: petSchemaResponse },
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
        properties: { pet: petSchemaResponse },
        required: ['pet']
      },
      request: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              body: petSchemaRequest,
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
        properties: { pet: petSchemaResponse },
        required: ['pet']
      },
      request: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              body: petSchemaRequest,
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
    modifyPet: {
      response: {
        type: 'object',
        properties: { pet: petSchemaResponse },
        required: ['pet']
      },
      request: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              body: petSchemaRequest,
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
