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
      name: 'requestMedicalRecords',
      pathParts: ['pets'],
      resourceName: 'pet',
      isCustomFunctionResource: true,
      operations: ['get']
    },
    {
      model: 'pet',
      name: 'requestMedicalRecordHistory',
      pathParts: ['pets', '{petId}'],
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
      name: 'manager',
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
  describe('with `ignoreActions`', () => {
    test('verb', () => {
      expect(expandToOperations(
        spec,
        { ignoreActions: ['put', 'list'] }
      ).operations.map(op => op.action)).toEqual([
        'post',
        'get',
        'head',
        'get',
        'patch',
        'delete',

        'post',
        'head',
        'get',
        'patch',
        'delete',

        'post',
        'head',
        'get',
        'patch',
        'delete',

        // User centric routes
        'post',
        'get'
      ])
    })

    test('action', () => {
      expect(expandToOperations(
        spec,
        { ignoreActions: ['put', 'list'] }
      ).operations.map(op => op.action)).toEqual([
        'post',
        'get',
        'head',
        'get',
        'patch',
        'delete',

        'post',
        'head',
        'get',
        'patch',
        'delete',

        'post',
        'head',
        'get',
        'patch',
        'delete',

        // User centric routes
        'post',
        'get'
      ])
    })
  })

  describe('basic', () => {
    describe('operations', () => {
      test('model', () => {
        expect(expandToOperations(spec).operations.map(op => op.model)).toEqual([
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
        expect(expandToOperations(spec).operations.map(op => op.id)).toEqual([
          'listPets',
          'createPet',
          'invokeRequestMedicalRecordsForPet',
          'invokeRequestMedicalRecordHistoryForPets',
          'checkPet',
          'getPet',
          'replacePet',
          'modifyPet',
          'deletePet',
          'listStores',
          'createStore',
          'checkStore',
          'getStore',
          'replaceStore',
          'modifyStore',
          'deleteStore',
          'listStoreManagers',
          'createStoreManager',
          'checkStoreManager',
          'getStoreManager',
          'replaceStoreManager',
          'modifyStoreManager',
          'deleteStoreManager',
          // User centric
          'listPetsAsUser',
          'createPetAsUser',
          'getUserAsUser'
        ])
      })

      test('summary', () => {
        expect(expandToOperations(spec).operations.map(op => op.summary)).toEqual([
          'List pets',
          'Create pet',
          'Invoke `requestMedicalRecords` for pet',
          'Invoke `requestMedicalRecordHistory` for pets',
          'Check pet',
          'Get pet',
          'Replace pet',
          'Modify pet',
          'Delete pet',
          'List stores',
          'Create store',
          'Check store',
          'Get store',
          'Replace store',
          'Modify store',
          'Delete store',
          'List store managers',
          'Create store manager',
          'Check store manager',
          'Get store manager',
          'Replace store manager',
          'Modify store manager',
          'Delete store manager',
          // User centric routes
          'List pets for user',
          'Create pet for user',
          'Get user for user'
        ])
      })

      test('path', () => {
        expect(expandToOperations(spec).operations.map(op => op.path)).toEqual([
          '/pets',
          '/pets',
          '/pets.request_medical_records',
          '/pets/{petId}.request_medical_record_history',
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
        expect(expandToOperations(spec).operations.map(op => op.verb)).toEqual([
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
        expect(expandToOperations(spec).operations.map(op => op.action)).toEqual([
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
        expect(expandToOperations(spec).operations.map(op => op.namespace)).toEqual([
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
          expandToOperations(spec).operations.map(op => op.parameters)
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
        const paginationParams = [
          {
            name: 'pageSize',
            description: 'Page size',
            schema: { type: 'integer', format: 'int32', default: 20 }
          },
          {
            name: 'pageToken',
            description: 'Page token',
            schema: { type: 'string' }
          },
          {
            name: 'orderBy',
            description: 'Order by',
            schema: { type: 'string' }
          }
        ]
        expect(expandToOperations(spec).operations.map(op => op.query)).toEqual([
          paginationParams,
          [],
          [],
          paginationParams,
          [],
          [],
          [],
          [],
          [],
          paginationParams,
          [],
          [],
          [],
          [],
          [],
          [],
          paginationParams,
          [],
          [],
          [],
          [],
          [],
          [],
          // User centric routes
          paginationParams,
          [],
          []
        ])
      })

      test('successResponse', () => {
        expect(
          expandToOperations(spec).operations.map(op => op.successResponse)
        ).toEqual([
          { description: `List succeeded`, code: 200 },
          { description: `Create succeeded`, code: 201 },
          { description: `Get succeeded`, code: 200 },
          { description: `List succeeded`, code: 200 },
          { description: `Check succeeded`, code: 200 },
          { description: `Get succeeded`, code: 200 },
          { description: `Replace succeeded`, code: 200 },
          { description: `Modify succeeded`, code: 200 },
          { description: `Delete succeeded`, code: 204 },
          { description: `List succeeded`, code: 200 },
          { description: `Create succeeded`, code: 201 },
          { description: `Check succeeded`, code: 200 },
          { description: `Get succeeded`, code: 200 },
          { description: `Replace succeeded`, code: 200 },
          { description: `Modify succeeded`, code: 200 },
          { description: `Delete succeeded`, code: 204 },
          { description: `List succeeded`, code: 200 },
          { description: `Create succeeded`, code: 201 },
          { description: `Check succeeded`, code: 200 },
          { description: `Get succeeded`, code: 200 },
          { description: `Replace succeeded`, code: 200 },
          { description: `Modify succeeded`, code: 200 },
          { description: `Delete succeeded`, code: 204 },
          // User centric routes
          { description: `List succeeded`, code: 200 },
          { description: `Create succeeded`, code: 201 },
          { description: `Get succeeded`, code: 200 }
        ])
      })

      test('errorResponses', () => {
        expect(
          expandToOperations(spec).operations.map(op => op.errorResponses)
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

    test('request', () => {
      expect(
        expandToOperations(spec).operations.map(op => op.request)
      ).toEqual([
        undefined,
        'pet',
        undefined,
        undefined,
        undefined,
        undefined,
        'pet',
        'pet',
        undefined,
        undefined,
        'store',
        undefined,
        undefined,
        'store',
        'store',
        undefined,
        undefined,
        'manager',
        undefined,
        undefined,
        'manager',
        'manager',
        undefined,
        undefined,
        'pet',
        undefined
      ])
    })

    test('response', () => {
      expect(
        expandToOperations(spec).operations.map(op => op.response)
      ).toEqual([
        { code: 200, description: 'List succeeded', key: 'pet', schema: 'pet' },
        { code: 201, description: 'Create succeeded', key: 'pet', schema: 'pet' },
        { code: 200, description: 'Get succeeded', key: 'pet', schema: 'pet' },
        { code: 200, description: 'List succeeded', key: 'pet', schema: 'pet' },
        { code: 200, description: 'Check succeeded', schema: 'empty' },
        { code: 200, description: 'Get succeeded', key: 'pet', schema: 'pet' },
        { code: 200, description: 'Replace succeeded', key: 'pet', schema: 'pet' },
        { code: 200, description: 'Modify succeeded', key: 'pet', schema: 'pet' },
        { code: 204, description: 'Delete succeeded', schema: 'empty' },
        { code: 200, description: 'List succeeded', key: 'store', schema: 'store' },
        { code: 201, description: 'Create succeeded', key: 'store', schema: 'store' },
        { code: 200, description: 'Check succeeded', schema: 'empty' },
        { code: 200, description: 'Get succeeded', key: 'store', schema: 'store' },
        { code: 200, description: 'Replace succeeded', key: 'store', schema: 'store' },
        { code: 200, description: 'Modify succeeded', key: 'store', schema: 'store' },
        { code: 204, description: 'Delete succeeded', schema: 'empty' },
        { code: 200, description: 'List succeeded', key: 'manager', schema: 'manager' },
        { code: 201, description: 'Create succeeded', key: 'manager', schema: 'manager' },
        { code: 200, description: 'Check succeeded', schema: 'empty' },
        { code: 200, description: 'Get succeeded', key: 'manager', schema: 'manager' },
        { code: 200, description: 'Replace succeeded', key: 'manager', schema: 'manager' },
        { code: 200, description: 'Modify succeeded', key: 'manager', schema: 'manager' },
        { code: 204, description: 'Delete succeeded', schema: 'empty' },
        { code: 200, description: 'List succeeded', key: 'pet', schema: 'pet' },
        { code: 201, description: 'Create succeeded', key: 'pet', schema: 'pet' },
        { code: 200, description: 'Get succeeded', key: 'user', schema: 'user' }
      ])
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
})
