const { expandToOperations } = require('../expandToOperations')
const {
  errors,
  allEntityVerbs,
  allCollectionVerbs,
  emptyResponse,
  errorResponse,
  paginationResponse
} = require('../common')

const spec = {
  models: {
    manager: {
      response: {
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          }
        }
      }
    }
  },
  paths: [
    {
      model: 'pet',
      pathParts: ['pets'],
      resourceName: 'pet',
      operations: allCollectionVerbs
    },
    {
      model: 'pet',
      pathParts: ['pets', 'invoke.requestMedicalRecords'],
      resourceName: 'pet',
      isCustomFunctionResource: true,
      operations: ['get']
    },
    {
      model: 'pet',
      pathParts: ['pets', '{petId}', 'invoke.requestMedicalRecordHistory'],
      resourceName: 'pet',
      isCustomFunctionResource: true,
      operations: ['list']
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
    },
    {
      model: 'pet',
      resourceName: 'pet',
      pathParts: ['user', 'pets'],
      operations: allCollectionVerbs,
      isUserCentricResource: true
    },
    {
      model: 'user',
      resourceName: 'user',
      pathParts: ['user'],
      operations: ['get'],
      isUserCentricResource: true
    }
  ]
}

describe('expandToOperations', () => {
  describe('operations', () => {
    test('model', () => {
      expect(expandToOperations(spec).operations.map(path => path.model)).toEqual([
        'pet',
        'pet',
        'pet',
        'pet',
        'pet',
        'pet',
        'pet',
        'pet',
        'pet',
        'store',
        'store',
        'store',
        'store',
        'store',
        'store',
        'store',
        'manager',
        'manager',
        'manager',
        'manager',
        'manager',
        'manager',
        'manager',
        // User centric
        'pet',
        'pet',
        'user'
      ])
    })

    test('id', () => {
      expect(expandToOperations(spec).operations.map(path => path.id)).toEqual([
        'listPets',
        'createPet',
        'invokeRequestMedicalRecordsForPet',
        'invokeRequestMedicalRecordHistoryForPets',
        'checkPet',
        'getPet',
        'replacePet',
        'updatePet',
        'deletePet',
        'listStores',
        'createStore',
        'checkStore',
        'getStore',
        'replaceStore',
        'updateStore',
        'deleteStore',
        'listStoreManagers',
        'createStoreManager',
        'checkStoreManager',
        'getStoreManager',
        'replaceStoreManager',
        'updateStoreManager',
        'deleteStoreManager',
        // User centric
        'listPetsAsUser',
        'createPetAsUser',
        'getUserAsUser'
      ])
    })

    test('summary', () => {
      expect(expandToOperations(spec).operations.map(path => path.summary)).toEqual([
        'List pets',
        'Create pet',
        'Invoke `requestMedicalRecords` for pet',
        'Invoke `requestMedicalRecordHistory` for pets',
        'Check pet',
        'Get pet',
        'Replace pet',
        'Update pet',
        'Delete pet',
        'List stores',
        'Create store',
        'Check store',
        'Get store',
        'Replace store',
        'Update store',
        'Delete store',
        'List store managers',
        'Create store manager',
        'Check store manager',
        'Get store manager',
        'Replace store manager',
        'Update store manager',
        'Delete store manager',
        // User centric routes
        'List pets for user',
        'Create pet for user',
        'Get user for user'
      ])
    })

    test('path', () => {
      expect(expandToOperations(spec).operations.map(path => path.path)).toEqual([
        '/pets',
        '/pets',
        '/pets/invoke.request_medical_records',
        '/pets/{petId}/invoke.request_medical_record_history',
        '/pets/{petId}',
        '/pets/{petId}',
        '/pets/{petId}',
        '/pets/{petId}',
        '/pets/{petId}',
        '/stores',
        '/stores',
        '/stores/{storeId}',
        '/stores/{storeId}',
        '/stores/{storeId}',
        '/stores/{storeId}',
        '/stores/{storeId}',
        '/stores/{storeId}/managers',
        '/stores/{storeId}/managers',
        '/stores/{storeId}/managers/{managerId}',
        '/stores/{storeId}/managers/{managerId}',
        '/stores/{storeId}/managers/{managerId}',
        '/stores/{storeId}/managers/{managerId}',
        '/stores/{storeId}/managers/{managerId}',
        // User centric routes
        '/user/pets',
        '/user/pets',
        '/user'
      ])
    })

    test('verb', () => {
      expect(expandToOperations(spec).operations.map(path => path.verb)).toEqual([
        'get',
        'post',
        'get',
        'get',
        'head',
        'get',
        'put',
        'patch',
        'delete',

        'get',
        'post',
        'head',
        'get',
        'put',
        'patch',
        'delete',

        'get',
        'post',
        'head',
        'get',
        'put',
        'patch',
        'delete',

        // User centric routes
        'get',
        'post',
        'get'
      ])
    })

    test('action', () => {
      expect(expandToOperations(spec).operations.map(path => path.action)).toEqual([
        'list',
        'post',
        'get',
        'list',
        'head',
        'get',
        'put',
        'patch',
        'delete',

        'list',
        'post',
        'head',
        'get',
        'put',
        'patch',
        'delete',

        'list',
        'post',
        'head',
        'get',
        'put',
        'patch',
        'delete',

        // User centric routes
        'list',
        'post',
        'get'
      ])
    })

    test('namespace', () => {
      expect(expandToOperations(spec).operations.map(path => path.namespace)).toEqual([
        ['pets'],
        ['pets'],
        ['pets'],
        ['pets'],
        ['pets'],
        ['pets'],
        ['pets'],
        ['pets'],
        ['pets'],
        ['stores'],
        ['stores'],
        ['stores'],
        ['stores'],
        ['stores'],
        ['stores'],
        ['stores'],
        ['stores', 'managers'],
        ['stores', 'managers'],
        ['stores', 'managers'],
        ['stores', 'managers'],
        ['stores', 'managers'],
        ['stores', 'managers'],
        ['stores', 'managers'],
        // User centric routes
        ['user', 'pets'],
        ['user', 'pets'],
        ['user']
      ])
    })

    test('parameters', () => {
      expect(
        expandToOperations(spec).operations.map(path => path.parameters)
      ).toEqual([
        [],
        [],
        [],
        [{
          name: 'petId',
          description: 'Pet id',
          schema: { type: 'string' }
        }],
        [{
          name: 'petId',
          description: 'Pet id',
          schema: { type: 'string' }
        }],
        [{
          name: 'petId',
          description: 'Pet id',
          schema: { type: 'string' }
        }],
        [{
          name: 'petId',
          description: 'Pet id',
          schema: { type: 'string' }
        }],
        [{
          name: 'petId',
          description: 'Pet id',
          schema: { type: 'string' }
        }],
        [{
          name: 'petId',
          description: 'Pet id',
          schema: { type: 'string' }
        }],
        [],
        [],
        [{
          name: 'storeId',
          description: 'Store id',
          schema: { type: 'string' }
        }],
        [{
          name: 'storeId',
          description: 'Store id',
          schema: { type: 'string' }
        }],
        [{
          name: 'storeId',
          description: 'Store id',
          schema: { type: 'string' }
        }],
        [{
          name: 'storeId',
          description: 'Store id',
          schema: { type: 'string' }
        }],
        [{
          name: 'storeId',
          description: 'Store id',
          schema: { type: 'string' }
        }],
        [{
          name: 'storeId',
          description: 'Store id',
          schema: { type: 'string' }
        }],
        [{
          name: 'storeId',
          description: 'Store id',
          schema: { type: 'string' }
        }],
        [
          {
            name: 'storeId',
            description: 'Store id',
            schema: { type: 'string' }
          },
          {
            name: 'managerId',
            description: 'Manager id',
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        [
          {
            name: 'storeId',
            description: 'Store id',
            schema: { type: 'string' }
          },
          {
            name: 'managerId',
            description: 'Manager id',
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        [
          {
            name: 'storeId',
            description: 'Store id',
            schema: { type: 'string' }
          },
          {
            name: 'managerId',
            description: 'Manager id',
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        [
          {
            name: 'storeId',
            description: 'Store id',
            schema: { type: 'string' }
          },
          {
            name: 'managerId',
            description: 'Manager id',
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        [
          {
            name: 'storeId',
            description: 'Store id',
            schema: { type: 'string' }
          },
          {
            name: 'managerId',
            description: 'Manager id',
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        // User centric routes
        [],
        [],
        []
      ])
    })

    test('query', () => {
      expect(expandToOperations(spec).operations.map(path => path.query)).toEqual([
        [
          { name: 'perPage', description: 'Per page', schema: { type: 'string' } },
          { name: 'page', description: 'Page number', schema: { type: 'string' } },
          { name: 'orderBy', description: 'Order by', schema: { type: 'string' } }
        ],
        [],
        [],
        [
          { name: 'perPage', description: 'Per page', schema: { type: 'string' } },
          { name: 'page', description: 'Page number', schema: { type: 'string' } },
          { name: 'orderBy', description: 'Order by', schema: { type: 'string' } }
        ],
        [],
        [],
        [],
        [],
        [],
        [
          { name: 'perPage', description: 'Per page', schema: { type: 'string' } },
          { name: 'page', description: 'Page number', schema: { type: 'string' } },
          { name: 'orderBy', description: 'Order by', schema: { type: 'string' } }
        ],
        [],
        [],
        [],
        [],
        [],
        [],
        [
          { name: 'perPage', description: 'Per page', schema: { type: 'string' } },
          { name: 'page', description: 'Page number', schema: { type: 'string' } },
          { name: 'orderBy', description: 'Order by', schema: { type: 'string' } }
        ],
        [],
        [],
        [],
        [],
        [],
        [],
        // User centric routes
        [
          { name: 'perPage', description: 'Per page', schema: { type: 'string' } },
          { name: 'page', description: 'Page number', schema: { type: 'string' } },
          { name: 'orderBy', description: 'Order by', schema: { type: 'string' } }
        ],
        [],
        []
      ])
    })

    test('successResponse', () => {
      expect(
        expandToOperations(spec).operations.map(path => path.successResponse)
      ).toEqual([
        { description: `List succeeded`, code: 200 },
        { description: `Create succeeded`, code: 201 },
        { description: `Get succeeded`, code: 200 },
        { description: `List succeeded`, code: 200 },
        { description: `Check succeeded`, code: 200 },
        { description: `Get succeeded`, code: 200 },
        { description: `Replace succeeded`, code: 200 },
        { description: `Update succeeded`, code: 200 },
        { description: `Delete succeeded`, code: 204 },
        { description: `List succeeded`, code: 200 },
        { description: `Create succeeded`, code: 201 },
        { description: `Check succeeded`, code: 200 },
        { description: `Get succeeded`, code: 200 },
        { description: `Replace succeeded`, code: 200 },
        { description: `Update succeeded`, code: 200 },
        { description: `Delete succeeded`, code: 204 },
        { description: `List succeeded`, code: 200 },
        { description: `Create succeeded`, code: 201 },
        { description: `Check succeeded`, code: 200 },
        { description: `Get succeeded`, code: 200 },
        { description: `Replace succeeded`, code: 200 },
        { description: `Update succeeded`, code: 200 },
        { description: `Delete succeeded`, code: 204 },
        // User centric routes
        { description: `List succeeded`, code: 200 },
        { description: `Create succeeded`, code: 201 },
        { description: `Get succeeded`, code: 200 }
      ])
    })

    test('errorResponses', () => {
      expect(
        expandToOperations(spec).operations.map(path => path.errorResponses)
      ).toEqual([
        [errors.badRequest, errors.unauthorized, errors.forbidden],
        [errors.badRequest, errors.unauthorized, errors.forbidden],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden],
        [errors.badRequest, errors.unauthorized, errors.forbidden],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden],
        [errors.badRequest, errors.unauthorized, errors.forbidden],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        [errors.badRequest, errors.unauthorized, errors.forbidden, errors.notFound],
        // User centric routes
        [errors.badRequest, errors.unauthorized, errors.forbidden],
        [errors.badRequest, errors.unauthorized, errors.forbidden],
        [errors.badRequest, errors.unauthorized, errors.forbidden]
      ])
    })
  })

  test('models', () => {
    expect(expandToOperations(spec).models).toEqual({
      empty: { response: emptyResponse },
      error: { response: errorResponse },
      pagination: { response: paginationResponse },
      manager: { response: { properties: { id: { format: 'uuid', type: 'string' } } } }
    })
  })
})
