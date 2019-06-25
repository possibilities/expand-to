const { expandToOperations } = require('../expandToOperations')
const { expandToOpenApi } = require('../expandToOpenApi')
const mapValues = require('lodash/mapValues')

const {
  emptyResponse,
  errorResponse,
  paginationResponse,
  allEntityVerbs,
  allCollectionVerbs
} = require('../common')

const pathMethodOperationIdsView = spec =>
  mapValues(spec.paths, path => mapValues(path, method => method.operationId))
const pathMethodSummariesView = spec =>
  mapValues(spec.paths, path => mapValues(path, method => method.summary))
const pathMethodTagsView = spec =>
  mapValues(spec.paths, path => mapValues(path, method => method.tags))
const pathMethodParametersView = spec =>
  mapValues(spec.paths, path => mapValues(path, method => method.parameters))
const pathMethodResponsesView = spec =>
  mapValues(spec.paths, path => mapValues(path, method => method.responses))
const pathMethodRequestBodiesView = spec =>
  mapValues(spec.paths, path => mapValues(path, method => method.requestBody))

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
      name: 'customFn',
      resourceName: 'pet',
      isCustomFunctionResource: true,
      pathParts: ['pets', 'invoke.customFn'],
      operations: ['get']
    },
    {
      model: 'customFnWithStringyResponse',
      name: 'customFnWithStringyResponse',
      resourceName: 'pet',
      isCustomFunctionResource: true,
      pathParts: ['pets', 'invoke.customFnWithStringyResponse'],
      operations: ['get']
    },
    {
      model: 'customFnWithStringyRequestAndResponse',
      name: 'customFnWithStringyRequestAndResponse',
      resourceName: 'pet',
      isCustomFunctionResource: true,
      pathParts: ['pets', 'invoke.customFnWithStringyRequestAndResponse'],
      operations: ['post']
    },
    {
      model: 'customFnWithRequestAndStringyResponse',
      name: 'customFnWithRequestAndStringyResponse',
      resourceName: 'pet',
      isCustomFunctionResource: true,
      pathParts: ['pets', 'invoke.customFnWithRequestAndStringyResponse'],
      operations: ['post']
    },
    {
      model: 'pet',
      resourceName: 'pet',
      pathParts: ['pets', '{petId}'],
      operations: allEntityVerbs
    },
    {
      model: 'store',
      resourceName: 'store',
      pathParts: ['stores'],
      operations: allCollectionVerbs
    },
    {
      model: 'store',
      resourceName: 'store',
      pathParts: ['stores', '{storeId}'],
      operations: allEntityVerbs
    },
    {
      model: 'manager',
      resourceName: 'manager',
      pathParts: ['stores', '{storeId}', 'managers'],
      operations: allCollectionVerbs
    },
    {
      model: 'manager',
      resourceName: 'manager',
      pathParts: ['stores', '{storeId}', 'managers', '{managerId}'],
      operations: allEntityVerbs
    }
  ],
  models: {
    pet: {
      request: { properties: { name: { type: 'string' } } },
      response: {
        properties: {
          name: { type: 'string' },
          id: { type: 'string', readOnly: true }
        }
      }
    },
    store: {
      request: { properties: { name: { type: 'string' } } },
      response: {
        properties: {
          name: { type: 'string' },
          id: { type: 'string', readOnly: true }
        }
      }
    },
    manager: {
      request: { properties: { name: { type: 'string' } } },
      response: {
        properties: {
          name: { type: 'string' },
          id: { type: 'string', format: 'uuid', readOnly: true }
        }
      }
    },
    customFnWithStringyResponse: {
      request: undefined,
      response: 'pet'
    },
    customFnWithStringyRequestAndResponse: {
      request: 'pet',
      response: 'pet'
    },
    customFnWithRequestAndStringyResponse: {
      request: {
        properties: {
          customFnWithRequestAndStringyResponseFieldObject: {
            type: 'string'
          },
          // Expands to object ref
          customFnWithRequestAndStringyResponseFieldString: 'pet',
          // Expands to array ref
          customFnWithRequestAndStringyResponseFieldArray: ['pet']
        }
      },
      response: 'pet'
    }
  }
}

// Lots of boilerplate used for assertions. Probably a smell but gets the
// job done ATM and unsure what the better solution looks like TODO

const paginationParameters = [
  {
    in: 'query',
    name: 'perPage',
    required: false,
    description: 'Per page',
    schema: { type: 'string' }
  },
  {
    in: 'query',
    name: 'page',
    required: false,
    description: 'Page number',
    schema: { type: 'string' }
  },
  {
    in: 'query',
    name: 'orderBy',
    required: false,
    description: 'Order by',
    schema: { type: 'string' }
  }
]

const collectionErrors = {
  400: {
    description: 'Bad request',
    content: {
      'application/json': {
        schema: {
          '$ref': '#/components/schemas/ErrorResponse'
        }
      }
    }
  },
  401: {
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: {
          '$ref': '#/components/schemas/ErrorResponse'
        }
      }
    }
  },
  403: {
    description: 'Forbidden',
    content: {
      'application/json': {
        schema: {
          '$ref': '#/components/schemas/ErrorResponse'
        }
      }
    }
  }
}

const entityErrors = {
  ...collectionErrors,
  404: {
    description: 'Not found',
    content: {
      'application/json': {
        schema: {
          '$ref': '#/components/schemas/ErrorResponse'
        }
      }
    }
  }
}

describe('expandToOpenApi#paths', () => {
  test('tags', () => {
    const { models, operations } = expandToOperations(spec)
    const expanded = expandToOpenApi({ models, operations })
    expect(pathMethodTagsView(expanded)).toEqual({
      '/pets': {
        get: ['Pets'],
        post: ['Pets']
      },
      '/pets/invoke.custom_fn': {
        get: ['Pets']
      },
      '/pets/invoke.custom_fn_with_stringy_response': {
        get: ['Pets']
      },
      '/pets/invoke.custom_fn_with_stringy_request_and_response': {
        post: ['Pets']
      },
      '/pets/invoke.custom_fn_with_request_and_stringy_response': {
        post: ['Pets']
      },
      '/pets/{petId}': {
        delete: ['Pets'],
        get: ['Pets'],
        head: ['Pets'],
        patch: ['Pets'],
        put: ['Pets']
      },
      '/stores': {
        get: ['Stores'],
        post: ['Stores']
      },
      '/stores/{storeId}': {
        delete: ['Stores'],
        get: ['Stores'],
        head: ['Stores'],
        patch: ['Stores'],
        put: ['Stores']
      },
      '/stores/{storeId}/managers': {
        get: ['Stores'],
        post: ['Stores']
      },
      '/stores/{storeId}/managers/{managerId}': {
        delete: ['Stores'],
        get: ['Stores'],
        head: ['Stores'],
        patch: ['Stores'],
        put: ['Stores']
      }
    })
  })

  test('operationIds', () => {
    const { models, operations } = expandToOperations(spec)
    const expanded = expandToOpenApi({ models, operations })
    expect(pathMethodOperationIdsView(expanded)).toEqual({
      '/pets': {
        get: 'listPets',
        post: 'createPet'
      },
      '/pets/{petId}': {
        delete: 'deletePet',
        get: 'getPet',
        head: 'checkPet',
        patch: 'updatePet',
        put: 'replacePet'
      },
      '/pets/invoke.custom_fn': {
        get: 'invokeCustomFnForPet'
      },
      '/pets/invoke.custom_fn_with_stringy_response': {
        get: 'invokeCustomFnWithStringyResponseForPet'
      },
      '/pets/invoke.custom_fn_with_stringy_request_and_response': {
        post: 'invokeCustomFnWithStringyRequestAndResponseForPet'
      },
      '/pets/invoke.custom_fn_with_request_and_stringy_response': {
        post: 'invokeCustomFnWithRequestAndStringyResponseForPet'
      },
      '/stores': {
        get: 'listStores',
        post: 'createStore'
      },
      '/stores/{storeId}': {
        delete: 'deleteStore',
        get: 'getStore',
        head: 'checkStore',
        patch: 'updateStore',
        put: 'replaceStore'
      },
      '/stores/{storeId}/managers': {
        get: 'listStoreManagers',
        post: 'createStoreManager'
      },
      '/stores/{storeId}/managers/{managerId}': {
        delete: 'deleteStoreManager',
        get: 'getStoreManager',
        head: 'checkStoreManager',
        patch: 'updateStoreManager',
        put: 'replaceStoreManager'
      }
    })
  })

  test('summaries', () => {
    const { models, operations } = expandToOperations(spec)
    const expanded = expandToOpenApi({ models, operations })
    expect(pathMethodSummariesView(expanded)).toEqual({
      '/pets': {
        get: 'List pets',
        post: 'Create pet'
      },
      '/pets/{petId}': {
        delete: 'Delete pet',
        get: 'Get pet',
        head: 'Check pet',
        patch: 'Update pet',
        put: 'Replace pet'
      },
      '/pets/invoke.custom_fn': {
        get: 'Invoke `customFn` for pet'
      },
      '/pets/invoke.custom_fn_with_stringy_response': {
        get: 'Invoke `customFnWithStringyResponse` for pet'
      },
      '/pets/invoke.custom_fn_with_stringy_request_and_response': {
        post: 'Invoke `customFnWithStringyRequestAndResponse` for pet'
      },
      '/pets/invoke.custom_fn_with_request_and_stringy_response': {
        post: 'Invoke `customFnWithRequestAndStringyResponse` for pet'
      },
      '/stores': {
        get: 'List stores',
        post: 'Create store'
      },
      '/stores/{storeId}': {
        delete: 'Delete store',
        get: 'Get store',
        head: 'Check store',
        patch: 'Update store',
        put: 'Replace store'
      },
      '/stores/{storeId}/managers': {
        get: 'List store managers',
        post: 'Create store manager'
      },
      '/stores/{storeId}/managers/{managerId}': {
        delete: 'Delete store manager',
        get: 'Get store manager',
        head: 'Check store manager',
        patch: 'Update store manager',
        put: 'Replace store manager'
      }
    })
  })

  test('parameters', () => {
    const petsParams = [
      {
        in: 'path',
        name: 'petId',
        required: true,
        description: 'Pet id',
        schema: { type: 'string' }
      }
    ]
    const storeParams = [
      {
        in: 'path',
        name: 'storeId',
        required: true,
        description: 'Store id',
        schema: { type: 'string' }
      }
    ]
    const managerParams = [
      {
        in: 'path',
        name: 'managerId',
        required: true,
        description: 'Manager id',
        schema: { type: 'string', format: 'uuid' }
      }
    ]

    const storeManagersParams = [...storeParams, ...managerParams]
    const { models, operations } = expandToOperations(spec)
    const expanded = expandToOpenApi({ models, operations })

    expect(pathMethodParametersView(expanded)).toEqual({
      '/pets': { get: paginationParameters, post: [] },
      '/pets/{petId}': {
        delete: petsParams,
        get: petsParams,
        head: petsParams,
        patch: petsParams,
        put: petsParams
      },
      '/pets/invoke.custom_fn': { get: [] },
      '/pets/invoke.custom_fn_with_stringy_response': { get: [] },
      '/pets/invoke.custom_fn_with_stringy_request_and_response': { post: [] },
      '/pets/invoke.custom_fn_with_request_and_stringy_response': { post: [] },
      '/stores': { get: paginationParameters, post: [] },
      '/stores/{storeId}': {
        delete: storeParams,
        get: storeParams,
        head: storeParams,
        patch: storeParams,
        put: storeParams
      },
      '/stores/{storeId}/managers': {
        post: storeParams,
        get: [...storeParams, ...paginationParameters]
      },
      '/stores/{storeId}/managers/{managerId}': {
        delete: storeManagersParams,
        get: storeManagersParams,
        head: storeManagersParams,
        patch: storeManagersParams,
        put: storeManagersParams
      }
    })
  })

  test('requestBodies', () => {
    const { models, operations } = expandToOperations(spec)
    const expanded = expandToOpenApi({ models, operations })
    expect(pathMethodRequestBodiesView(expanded)).toEqual({
      '/pets': {
        get: undefined,
        post: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/PetRequest` }
            }
          },
          required: true
        }
      },
      '/pets/{petId}': {
        delete: undefined,
        get: undefined,
        head: undefined,
        patch: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/PetRequest` }
            }
          },
          required: true
        },
        put: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/PetRequest` }
            }
          },
          required: true
        }
      },
      '/pets/invoke.custom_fn': {
        get: undefined
      },
      '/pets/invoke.custom_fn_with_stringy_response': {
        get: undefined
      },
      '/pets/invoke.custom_fn_with_stringy_request_and_response': {
        post: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/PetRequest` }
            }
          },
          required: true
        }
      },
      '/pets/invoke.custom_fn_with_request_and_stringy_response': {
        post: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/CustomFnWithRequestAndStringyResponseRequest` }
            }
          },
          required: true
        }
      },
      '/stores': {
        get: undefined,
        post: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/StoreRequest` }
            }
          },
          required: true
        }
      },
      '/stores/{storeId}': {
        delete: undefined,
        get: undefined,
        head: undefined,
        patch: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/StoreRequest` }
            }
          },
          required: true
        },
        put: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/StoreRequest` }
            }
          },
          required: true
        }
      },
      '/stores/{storeId}/managers': {
        get: undefined,
        post: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/ManagerRequest` }
            }
          },
          required: true
        }
      },
      '/stores/{storeId}/managers/{managerId}': {
        delete: undefined,
        get: undefined,
        head: undefined,
        patch: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/ManagerRequest` }
            }
          },
          required: true
        },
        put: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/ManagerRequest` }
            }
          },
          required: true
        }
      }
    })
  })

  test('responses', () => {
    const { models, operations } = expandToOperations(spec)
    const expanded = expandToOpenApi({ models, operations })
    expect(pathMethodResponsesView(expanded)).toEqual({
      '/pets': {
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pets: {
                      type: 'array',
                      items: {
                        '$ref': `#/components/schemas/PetResponse`
                      }
                    },
                    pages: {
                      '$ref': `#/components/schemas/PaginationResponse`
                    }
                  }
                }
              }
            },
            description: 'List succeeded'
          },
          ...collectionErrors
        },
        post: {
          '201': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/PetResponse`
                    }
                  }
                }
              }
            },
            description: 'Create succeeded'
          },
          ...collectionErrors
        }
      },
      '/pets/{petId}': {
        delete: {
          '204': {
            content: {
              'application/json': {
                schema: {
                  '$ref': `#/components/schemas/EmptyResponse`
                }
              }
            },
            description: 'Delete succeeded'
          },
          ...entityErrors
        },
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/PetResponse`
                    }
                  }
                }
              }
            },
            description: 'Get succeeded'
          },
          ...entityErrors
        },
        head: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  '$ref': `#/components/schemas/EmptyResponse`
                }
              }
            },
            description: 'Check succeeded'
          },
          ...entityErrors
        },
        patch: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/PetResponse`
                    }
                  }
                }
              }
            },
            description: 'Update succeeded'
          },
          ...entityErrors
        },
        put: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/PetResponse`
                    }
                  }
                }
              }
            },
            description: 'Replace succeeded'
          },
          ...entityErrors
        }
      },
      '/pets/invoke.custom_fn': {
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/PetResponse`
                    }
                  }
                }
              }
            },
            description: 'Get succeeded'
          },
          ...entityErrors
        }
      },
      '/pets/invoke.custom_fn_with_stringy_response': {
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/PetResponse`
                    }
                  }
                }
              }
            },
            description: 'Get succeeded'
          },
          ...entityErrors
        }
      },
      '/pets/invoke.custom_fn_with_stringy_request_and_response': {
        post: {
          '201': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/PetResponse`
                    }
                  }
                }
              }
            },
            description: 'Create succeeded'
          },
          ...collectionErrors
        }
      },
      '/pets/invoke.custom_fn_with_request_and_stringy_response': {
        post: {
          '201': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/PetResponse`
                    }
                  }
                }
              }
            },
            description: 'Create succeeded'
          },
          ...collectionErrors
        }
      },
      '/stores': {
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stores: {
                      type: 'array',
                      items: {
                        '$ref': `#/components/schemas/StoreResponse`
                      }
                    },
                    pages: {
                      '$ref': `#/components/schemas/PaginationResponse`
                    }
                  }
                }
              }
            },
            description: 'List succeeded'
          },
          ...collectionErrors
        },
        post: {
          '201': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    store: {
                      '$ref': `#/components/schemas/StoreResponse`
                    }
                  }
                }
              }
            },
            description: 'Create succeeded'
          },
          ...collectionErrors
        }
      },
      '/stores/{storeId}': {
        delete: {
          '204': {
            content: {
              'application/json': {
                schema: {
                  '$ref': `#/components/schemas/EmptyResponse`
                }
              }
            },
            description: 'Delete succeeded'
          },
          ...entityErrors
        },
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    store: {
                      '$ref': `#/components/schemas/StoreResponse`
                    }
                  }
                }
              }
            },
            description: 'Get succeeded'
          },
          ...entityErrors
        },
        head: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  '$ref': `#/components/schemas/EmptyResponse`
                }
              }
            },
            description: 'Check succeeded'
          },
          ...entityErrors
        },
        patch: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    store: {
                      '$ref': `#/components/schemas/StoreResponse`
                    }
                  }
                }
              }
            },
            description: 'Update succeeded'
          },
          ...entityErrors
        },
        put: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    store: {
                      '$ref': `#/components/schemas/StoreResponse`
                    }
                  }
                }
              }
            },
            description: 'Replace succeeded'
          },
          ...entityErrors
        }
      },
      '/stores/{storeId}/managers': {
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    managers: {
                      type: 'array',
                      items: {
                        '$ref': `#/components/schemas/ManagerResponse`
                      }
                    },
                    pages: {
                      '$ref': `#/components/schemas/PaginationResponse`
                    }
                  }
                }
              }
            },
            description: 'List succeeded'
          },
          ...collectionErrors
        },
        post: {
          '201': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    manager: {
                      '$ref': `#/components/schemas/ManagerResponse`
                    }
                  }
                }
              }
            },
            description: 'Create succeeded'
          },
          ...collectionErrors
        }
      },
      '/stores/{storeId}/managers/{managerId}': {
        delete: {
          '204': {
            content: {
              'application/json': {
                schema: {
                  '$ref': `#/components/schemas/EmptyResponse`
                }
              }
            },
            description: 'Delete succeeded'
          },
          ...entityErrors
        },
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    manager: {
                      '$ref': `#/components/schemas/ManagerResponse`
                    }
                  }
                }
              }
            },
            description: 'Get succeeded'
          },
          ...entityErrors
        },
        head: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  '$ref': `#/components/schemas/EmptyResponse`
                }
              }
            },
            description: 'Check succeeded'
          },
          ...entityErrors
        },
        patch: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    manager: {
                      '$ref': `#/components/schemas/ManagerResponse`
                    }
                  }
                }
              }
            },
            description: 'Update succeeded'
          },
          ...entityErrors
        },
        put: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    manager: {
                      '$ref': `#/components/schemas/ManagerResponse`
                    }
                  }
                }
              }
            },
            description: 'Replace succeeded'
          },
          ...entityErrors
        }
      }
    })
  })
})

test('expandToOpenApi#components', () => {
  const { models, operations } = expandToOperations(spec)
  const expanded = expandToOpenApi({ models, operations })
  expect(expanded.components.schemas).toEqual({
    EmptyResponse: emptyResponse,
    ErrorResponse: errorResponse,
    PaginationResponse: paginationResponse,
    PetRequest: { properties: { name: { type: 'string' } } },
    PetResponse: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    StoreResponse: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    StoreRequest: { properties: { name: { type: 'string' } } },
    ManagerResponse: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', format: 'uuid', readOnly: true }
      }
    },
    ManagerRequest: { properties: { name: { type: 'string' } } },
    CustomFnWithRequestAndStringyResponseRequest: {
      properties: {
        customFnWithRequestAndStringyResponseFieldObject: {
          type: 'string'
        },
        customFnWithRequestAndStringyResponseFieldString: {
          '$ref': '#/components/schemas/PetResponse'
        },
        customFnWithRequestAndStringyResponseFieldArray: {
          type: 'array',
          items: {
            '$ref': '#/components/schemas/PetResponse'
          }
        }
      }
    }
  })
})

describe('expandToOpenApi#info', () => {
  test('defaults', () => {
    const { models, operations } = expandToOperations(spec)
    const expanded = expandToOpenApi({ models, operations })
    expect(expanded.info).toEqual({
      title: 'API spec',
      version: '0.0.0'
    })
  })
  test('with title', () => {
    const { models, operations } = expandToOperations(spec)
    const expanded = expandToOpenApi(
      { models, operations },
      { info: { title: 'Pet API' } }
    )
    expect(expanded.info).toEqual({
      title: 'Pet API',
      version: '0.0.0'
    })
  })
  test('with version', () => {
    const { models, operations } = expandToOperations(spec)
    const expanded = expandToOpenApi(
      { models, operations },
      { info: { version: '3.3.3' } }
    )
    expect(expanded.info).toEqual({
      title: 'API spec',
      version: '3.3.3'
    })
  })
})
