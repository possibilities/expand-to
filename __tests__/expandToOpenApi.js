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
  models: {
    pet: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true }
      }
    },
    store: { properties: { name: { type: 'string' } } }
  },
  paths: [
    {
      ids: {},
      mountPath: [],
      path: ['pets'],
      modelName: 'pet',
      methods: allCollectionVerbs
    },
    {
      ids: { pets: 'petId' },
      mountPath: [],
      path: ['pets', '{petId}'],
      modelName: 'pet',
      methods: allEntityVerbs
    },
    {
      ids: { stores: 'storeId', pets: 'petId' },
      mountPath: ['stores', '{storeId}'],
      path: ['pets', '{petId}'],
      modelName: 'pet',
      methods: allEntityVerbs
    },
    {
      ids: { stores: 'storeId' },
      mountPath: ['stores', '{storeId}'],
      path: ['pets'],
      modelName: 'store',
      methods: allCollectionVerbs
    },
    {
      ids: {},
      mountPath: [],
      isCustomFunction: true,
      modelName: 'pet',
      path: ['pets', 'requestMedicalRecords'],
      methods: ['get']
    }
  ]
}

describe('expandToOpenApi#paths', () => {
  test('tags', () => {
    const expanded = expandToOpenApi(spec)
    expect(pathMethodTagsView(expanded)).toEqual({
      '/pets': {
        get: ['pets'],
        post: ['pets']
      },
      '/pets/{petId}': {
        delete: ['pets'],
        get: ['pets'],
        head: ['pets'],
        patch: ['pets'],
        put: ['pets']
      },
      '/pets/request_medical_records': {
        get: ['pets']
      },
      '/stores/{storeId}/pets': {
        get: ['stores', 'pets'],
        post: ['stores', 'pets']
      },
      '/stores/{storeId}/pets/{petId}': {
        delete: ['stores', 'pets'],
        get: ['stores', 'pets'],
        head: ['stores', 'pets'],
        patch: ['stores', 'pets'],
        put: ['stores', 'pets']
      }
    })
  })

  test('operationIds', () => {
    const expanded = expandToOpenApi(spec)
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
      '/pets/request_medical_records': {
        get: 'requestMedicalRecordsForPets'
      },
      '/stores/{storeId}/pets': {
        get: 'listStorePets',
        post: 'createStorePet'
      },
      '/stores/{storeId}/pets/{petId}': {
        delete: 'deleteStorePet',
        get: 'getStorePet',
        head: 'checkStorePet',
        patch: 'updateStorePet',
        put: 'replaceStorePet'
      }
    })
  })

  test('summaries', () => {
    const expanded = expandToOpenApi(spec)
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
      '/pets/request_medical_records': {
        get: 'Invoke `requestMedicalRecords` for pets'
      },
      '/stores/{storeId}/pets': {
        get: 'List store pets',
        post: 'Create store pet'
      },
      '/stores/{storeId}/pets/{petId}': {
        delete: 'Delete store pet',
        get: 'Get store pet',
        head: 'Check store pet',
        patch: 'Update store pet',
        put: 'Replace store pet'
      }
    })
  })

  test('parameters', () => {
    const petsParams = [
      {
        in: 'path',
        name: 'petId',
        required: true,
        description: 'Pets id',
        schema: {
          format: 'uuid',
          type: 'string'
        }
      }
    ]
    const storesParams = [
      {
        in: 'path',
        name: 'storeId',
        required: true,
        description: 'Stores id',
        schema: {
          format: 'uuid',
          type: 'string'
        }
      }
    ]

    const storesPetsParams = [...storesParams, ...petsParams]

    const expanded = expandToOpenApi(spec)
    expect(pathMethodParametersView(expanded)).toEqual({
      '/pets': { get: paginationParameters, post: [] },
      '/pets/{petId}': {
        delete: petsParams,
        get: petsParams,
        head: petsParams,
        patch: petsParams,
        put: petsParams
      },
      '/pets/request_medical_records': { get: [] },
      '/stores/{storeId}/pets': {
        get: [...storesParams, ...paginationParameters],
        post: storesParams
      },
      '/stores/{storeId}/pets/{petId}': {
        delete: storesPetsParams,
        get: storesPetsParams,
        head: storesPetsParams,
        patch: storesPetsParams,
        put: storesPetsParams
      }
    })
  })

  test('requestBodies', () => {
    const expanded = expandToOpenApi(spec)
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
      '/pets/request_medical_records': {
        get: undefined
      },
      '/stores/{storeId}/pets': {
        get: undefined,
        post: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/CreateStorePetInput` }
            }
          },
          required: true
        }
      },
      '/stores/{storeId}/pets/{petId}': {
        delete: undefined,
        get: undefined,
        head: undefined,
        patch: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/UpdateStorePetInput` }
            }
          },
          required: true
        },
        put: {
          content: {
            'application/json': {
              schema: { '$ref': `#/components/schemas/ReplaceStorePetInput` }
            }
          },
          required: true
        }
      }
    })
  })

  test('responses', () => {
    const expanded = expandToOpenApi(spec)
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
      '/pets/request_medical_records': {
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    petRequestMedicalRecord: {
                      '$ref': `#/components/schemas/RequestMedicalRecordsForPetsOutput`
                    }
                  }
                }
              }
            },
            description: 'Get succeeded'
          },
          ...collectionErrors
        }
      },
      '/stores/{storeId}/pets': {
        get: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    storePets: {
                      '$ref': `#/components/schemas/ListStorePetsOutput`
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
                    storePet: {
                      '$ref': `#/components/schemas/CreateStorePetOutput`
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
      '/stores/{storeId}/pets/{petId}': {
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
                    storePet: {
                      '$ref': `#/components/schemas/GetStorePetOutput`
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
                    storePet: {
                      '$ref': `#/components/schemas/UpdateStorePetOutput`
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
                    storePet: {
                      '$ref': `#/components/schemas/ReplaceStorePetOutput`
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
  const expanded = expandToOpenApi(spec)
  expect(expanded.components.schemas).toEqual({
    ErrorOutput: errorOutput,
    EmptyOutput: emptyOutput,
    UpdatePetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true },
      }
    },
    UpdatePetInput: { properties: { name: { type: 'string' } } },
    CreatePetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true },
      }
    },
    CreatePetInput: { properties: { name: { type: 'string' } } },
    ReplacePetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true },
      }
    },
    ReplacePetInput: { properties: { name: { type: 'string' } } },
    GetPetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true },
      }
    },
    ListPetsOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true },
      }
    },
    UpdateStorePetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true },
      }
    },
    UpdateStorePetInput: { properties: { name: { type: 'string' } } },
    CreateStorePetOutput: { properties: { name: { type: 'string' } } },
    CreateStorePetInput: { properties: { name: { type: 'string' } } },
    ReplaceStorePetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true },
      }
    },
    ReplaceStorePetInput: { properties: { name: { type: 'string' } } },
    GetStorePetOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true },
      }
    },
    ListStorePetsOutput: { properties: { name: { type: 'string' } } },
    RequestMedicalRecordsForPetsOutput: {
      properties: {
        name: { type: 'string' },
        id: { type: 'string', readOnly: true },
      }
    }
  })
})

describe('expandToOpenApi#info', () => {
  test('defaults', () => {
    const expanded = expandToOpenApi(spec)
    expect(expanded.info).toEqual({
      title: 'API spec',
      version: '0.0.0'
    })
  })
  test('with title', () => {
    const expanded = expandToOpenApi(spec, { title: 'Pet API' })
    expect(expanded.info).toEqual({
      title: 'Pet API',
      version: '0.0.0'
    })
  })
  test('with version', () => {
    const expanded = expandToOpenApi(spec, { version: '3.3.3' })
    expect(expanded.info).toEqual({
      title: 'API spec',
      version: '3.3.3'
    })
  })
})
