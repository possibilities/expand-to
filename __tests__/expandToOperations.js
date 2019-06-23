const { expandToOperations } = require('../expandToOperations')
const { allEntityVerbs, allCollectionVerbs } = require('../common')

const spec = {
  models: {},
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
  ]
}

describe('expandToOperations', () => {
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
      'manager'
    ])
  })

  test('id', () => {
    expect(expandToOperations(spec).operations.map(path => path.id)).toEqual([
      'listPets',
      'createPet',
      'invokeRequestMedicalRecordsForPet',
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
      'deleteStoreManager'
    ])
  })

  test('summary', () => {
    expect(expandToOperations(spec).operations.map(path => path.summary)).toEqual([
      'List pets',
      'Create pet',
      'Invoke `requestMedicalRecords` for pet',
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
      'Delete store manager'
    ])
  })

  test('path', () => {
    expect(expandToOperations(spec).operations.map(path => path.path)).toEqual([
      '/pets',
      '/pets',
      '/pets/invoke.requestMedicalRecords',
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
      '/stores/{storeId}/managers/{managerId}'
    ])
  })

  test('verb', () => {
    expect(expandToOperations(spec).operations.map(path => path.verb)).toEqual([
      'get',
      'post',
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
      'delete'
    ])
  })

  test('action', () => {
    expect(expandToOperations(spec).operations.map(path => path.action)).toEqual([
      'list',
      'post',
      'get',
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
      'delete'
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
      ['stores', 'managers']
    ])
  })

  test('parameters', () => {
    expect(expandToOperations(spec).operations.map(path => path.parameters)).toEqual([
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
          schema: { type: 'string' }
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
          schema: { type: 'string' }
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
          schema: { type: 'string' }
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
          schema: { type: 'string' }
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
          schema: { type: 'string' }
        }
      ]
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
      []
    ])
  })

  test('successStatus', () => {
    expect(expandToOperations(spec).operations.map(path => path.successStatus)).toEqual([
      200,
      201,
      200,
      200,
      200,
      200,
      200,
      204,
      200,
      201,
      200,
      200,
      200,
      200,
      204,
      200,
      201,
      200,
      200,
      200,
      200,
      204
    ])
  })

  test('errorStatuses', () => {
    expect(expandToOperations(spec).operations.map(path => path.errorStatuses)).toEqual([
      [400, 401, 403, 500],
      [400, 401, 403, 500],
      [400, 401, 403, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 500],
      [400, 401, 403, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 500],
      [400, 401, 403, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500],
      [400, 401, 403, 404, 500]
    ])
  })
})