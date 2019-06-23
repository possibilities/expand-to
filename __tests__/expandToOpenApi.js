const { expandToOperations } = require('../expandToOperations')
const { expandToOpenApi } = require('../expandToOpenApi')
const mapValues = require('lodash/mapValues')

const {
  entityErrors,
  collectionErrors,
  emptyOutput,
  errorOutput,
  allEntityVerbs,
  allCollectionVerbs,
  paginationParameters
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
      operations: allCollectionVerbs
    },
    {
      model: 'pet',
      pathParts: ['pets', 'invoke.requestMedicalRecords'],
      operations: ['get'],
      isCustomFunctionResource: true,
      fns: [{
        method: 'get',
        name: 'requestMedicalRecords'
      }]
    },
    {
      model: 'pet',
      pathParts: ['pets', '{petId}'],
      operations: allEntityVerbs
    },
    {
      model: 'store',
      pathParts: ['stores'],
      operations: allCollectionVerbs
    },
    {
      model: 'store',
      pathParts: ['stores', '{storeId}'],
      operations: allEntityVerbs
    },
    {
      model: 'manager',
      pathParts: ['stores', '{storeId}', 'managers'],
      operations: allCollectionVerbs
    },
    {
      model: 'manager',
      pathParts: ['stores', '{storeId}', 'managers', '{managerId}'],
      operations: allEntityVerbs
    }
  ],
  models: {
    pet: {
      in: { properties: { name: { type: 'string' } } },
      out: {
        properties: {
          name: { type: 'string' },
          id: { type: 'string', readOnly: true }
        }
      }
    },
    store: {
      in: { properties: { name: { type: 'string' } } },
      out: {
        properties: {
          name: { type: 'string' },
          id: { type: 'string', readOnly: true }
        }
      }
    },
    manager: {
      in: { properties: { name: { type: 'string' } } },
      out: {
        properties: {
          name: { type: 'string' },
          id: { type: 'string', readOnly: true }
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
        get: ['pets'],
        post: ['pets']
      },
      '/pets/invoke.requestMedicalRecords': {
        get: ['pets']
      },
      '/pets/{petId}': {
        delete: ['pets'],
        get: ['pets'],
        head: ['pets'],
        patch: ['pets'],
        put: ['pets']
      },
      '/stores': {
        get: ['stores'],
        post: ['stores']
      },
      '/stores/{storeId}': {
        delete: ['stores'],
        get: ['stores'],
        head: ['stores'],
        patch: ['stores'],
        put: ['stores']
      },
      '/stores/{storeId}/managers': {
        get: ['stores', 'managers'],
        post: ['stores', 'managers']
      },
      '/stores/{storeId}/managers/{managerId}': {
        delete: ['stores', 'managers'],
        get: ['stores', 'managers'],
        head: ['stores', 'managers'],
        patch: ['stores', 'managers'],
        put: ['stores', 'managers']
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
      '/pets/invoke.requestMedicalRecords': {
        get: 'invokeRequestMedicalRecordsForPet'
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
      '/pets/invoke.requestMedicalRecords': {
        get: 'Invoke `requestMedicalRecords` for pet'
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
        schema: { format: 'uuid', type: 'string' }
      }
    ]
    const storeParams = [
      {
        in: 'path',
        name: 'storeId',
        required: true,
        description: 'Store id',
        schema: { format: 'uuid', type: 'string' }
      }
    ]
    const managerParams = [
      {
        in: 'path',
        name: 'managerId',
        required: true,
        description: 'Manager id',
        schema: { format: 'uuid', type: 'string' }
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
      '/pets/invoke.requestMedicalRecords': { get: [] },
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
              schema: { '$ref': `#/components/schemas/CreatePetInput` }
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
              schema: { '$ref': `#/components/schemas/UpdatePetInput` }
            }
          },
          required: true
        },
        put: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/ReplacePetInput` }
            }
          },
          required: true
        }
      },
      '/pets/invoke.requestMedicalRecords': {
        get: undefined
      },
      '/stores': {
        get: undefined,
        post: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/CreateStoreInput` }
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
              schema: { '$ref': `#/components/schemas/UpdateStoreInput` }
            }
          },
          required: true
        },
        put: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/ReplaceStoreInput` }
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
              schema: { '$ref': `#/components/schemas/CreateStoreManagerInput` }
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
              schema: { '$ref': `#/components/schemas/UpdateStoreManagerInput` }
            }
          },
          required: true
        },
        put: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/ReplaceStoreManagerInput` }
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
                  properties: {
                    pets: {
                      '$ref': `#/components/schemas/ListPetsOutput`
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
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/CreatePetOutput`
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
                  '$ref': `#/components/schemas/EmptyOutput`
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
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/GetPetOutput`
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
                  '$ref': `#/components/schemas/EmptyOutput`
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
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/UpdatePetOutput`
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
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/ReplacePetOutput`
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
      '/pets/invoke.requestMedicalRecords': {
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    pet: {
                      '$ref': `#/components/schemas/InvokeRequestMedicalRecordsForPetOutput`
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
      '/stores': {
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    stores: {
                      '$ref': `#/components/schemas/ListStoresOutput`
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
                  properties: {
                    store: {
                      '$ref': `#/components/schemas/CreateStoreOutput`
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
                  '$ref': `#/components/schemas/EmptyOutput`
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
                  properties: {
                    store: {
                      '$ref': `#/components/schemas/GetStoreOutput`
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
                  '$ref': `#/components/schemas/EmptyOutput`
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
                  properties: {
                    store: {
                      '$ref': `#/components/schemas/UpdateStoreOutput`
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
                  properties: {
                    store: {
                      '$ref': `#/components/schemas/ReplaceStoreOutput`
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
                  properties: {
                    storeManagers: {
                      '$ref': `#/components/schemas/ListStoreManagersOutput`
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
                  properties: {
                    storeManager: {
                      '$ref': `#/components/schemas/CreateStoreManagerOutput`
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
                  '$ref': `#/components/schemas/EmptyOutput`
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
                  properties: {
                    storeManager: {
                      '$ref': `#/components/schemas/GetStoreManagerOutput`
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
                  '$ref': `#/components/schemas/EmptyOutput`
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
                  properties: {
                    storeManager: {
                      '$ref': `#/components/schemas/UpdateStoreManagerOutput`
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
                  properties: {
                    storeManager: {
                      '$ref': `#/components/schemas/ReplaceStoreManagerOutput`
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
    ErrorOutput: errorOutput,
    EmptyOutput: emptyOutput,
    UpdatePetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    UpdatePetInput: { properties: { name: { type: 'string' } } },
    CreatePetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    CreatePetInput: { properties: { name: { type: 'string' } } },
    ReplacePetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    ReplacePetInput: { properties: { name: { type: 'string' } } },
    GetPetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    ListPetsOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    InvokeRequestMedicalRecordsForPetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },

    UpdateStoreOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    UpdateStoreInput: { properties: { name: { type: 'string' } } },
    CreateStoreOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    CreateStoreInput: { properties: { name: { type: 'string' } } },
    ReplaceStoreOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    ReplaceStoreInput: { properties: { name: { type: 'string' } } },
    GetStoreOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    ListStoresOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },

    UpdateStoreManagerOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    UpdateStoreManagerInput: { properties: { name: { type: 'string' } } },
    CreateStoreManagerOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    CreateStoreManagerInput: { properties: { name: { type: 'string' } } },
    ReplaceStoreManagerOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    ReplaceStoreManagerInput: { properties: { name: { type: 'string' } } },
    GetStoreManagerOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    ListStoreManagersOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
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
