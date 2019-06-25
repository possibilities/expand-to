const sortBy = require('lodash/sortBy')
const expandToResources = require('../expandToResources')
const expandToOpenApi = require('../expandToOpenApi')
const { writeFileSync, mkdirsSync } = require('fs-extra')
const OpenAPISchemaValidator = require('openapi-schema-validator').default

const validator = new OpenAPISchemaValidator({ version: 3 })

const expandedView = schema => sortBy(
  schema.paths,
  schema => schema.pathParts.join('/')
)

const { allEntityVerbs, allCollectionVerbs } = require('../common')

// Examples here are emblamatic so we dump io of each test run
// for usage outside of tests
const tempDir = `/tmp/${Date.now()}`
mkdirsSync(tempDir)
const dump = (spec, title) => {
  const openApiSpec = expandToOpenApi(spec, { info: { title: `Example: ${title}` } })
  writeFileSync(
    `${tempDir}/${title.toLowerCase().replace(/ /g, '-')}.json`,
    JSON.stringify(openApiSpec, null, 2)
  )

  // Trap and show validation errors
  const { errors } = validator.validate(openApiSpec)
  if (errors.length) {
    console.error(errors)
    console.error(errors.length + ' validation errors')
    throw new Error('OpenAPI validation failed: ' + title)
  }

  return spec
}

afterAll(() => {
  console.info(`All results dumped to ${tempDir}`)
})

describe('expandToResources', () => {
  test('basic', () => {
    const schema = dump([
      {
        name: 'pet',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'store',
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'basic')

    expect(expandToResources(schema).models).toEqual({
      pet: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      store: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['pets'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        operations: allEntityVerbs
      },
      {
        pathParts: ['stores'],
        name: 'store',
        model: 'store',
        resourceName: 'store',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['stores', '{storeId}'],
        name: 'store',
        model: 'store',
        resourceName: 'store',
        operations: allEntityVerbs
      }
    ])
  })

  test('with inflections', () => {
    const schema = dump(
      [{
        name: 'person',
        model: { properties: { name: { type: 'string' } } }
      }],
      'basic with inflections'
    )

    expect(expandToResources(schema).models).toEqual({
      person: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['people'],
        name: 'person',
        model: 'person',
        resourceName: 'person',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['people', '{personId}'],
        name: 'person',
        model: 'person',
        resourceName: 'person',
        operations: allEntityVerbs
      }
    ])
  })

  test('with immutability', () => {
    const schema = dump(
      [{
        name: 'pet',
        immutable: true,
        model: { properties: { name: { type: 'string' } } }
      }],
      'basic with immutability'
    )

    expect(expandToResources(schema).models).toEqual({
      pet: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['pets'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        operations: ['head', 'get', 'delete']
      }
    ])
  })

  test('with `readOnly` properties', () => {
    const schema = dump([
      {
        name: 'pet',
        model: {
          properties: {
            name: { type: 'string' },
            fieldThatIsReadOnly: { type: 'string', readOnly: true }
          }
        }
      }
    ], 'basic with readOnly properties ')

    expect(expandToResources(schema).models).toEqual({
      pet: {
        request: { properties: { name: { type: 'string' } } },
        response: {
          properties: {
            name: { type: 'string' },
            fieldThatIsReadOnly: { type: 'string', readOnly: true }
          }
        }
      }
    })
  })
})

describe('expandToResources#fns', () => {
  test('basic', () => {
    const schema = dump(
      [{
        name: 'pet',
        fns: [
          {
            method: 'get',
            name: 'customFnWithGetAction'
          },
          {
            method: 'list',
            name: 'customFnWithListAction'
          },
          {
            method: 'get',
            name: 'customFnWithModel',
            model: {
              properties: {
                customFnField: { type: 'string' }
              }
            }
          },
          {
            method: 'post',
            name: 'customFnWithSeparateModels',
            model: {
              request: {
                properties: {
                  customFnRequestModelField: { type: 'string' }
                }
              },
              response: {
                properties: {
                  customFnResponseModelField: { type: 'string' }
                }
              }
            }
          },
          {
            method: 'post',
            name: 'customFnWithStringyModel',
            model: 'pet'
          },
          {
            method: 'post',
            name: 'customFnWithStringyResponseModel',
            model: { response: 'pet' }
          },
          {
            method: 'post',
            name: 'customFnWithStringySeparateModels',
            model: { request: 'pet', response: 'pet' }
          },
          {
            method: 'post',
            name: 'customFnWithRequestAndStringyResponse',
            model: {
              request: {
                properties: {
                  customFnWithRequestAndStringyResponseField: { type: 'string' }
                }
              },
              response: 'pet'
            }
          }
        ],
        model: { properties: { name: { type: 'string' } } }
      }],
      'custom function'
    )

    expect(expandToResources(schema).models).toEqual({
      pet: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      customFnWithModel: {
        request: {
          properties: {
            customFnField: { type: 'string' }
          }
        },
        response: {
          properties: {
            customFnField: { type: 'string' }
          }
        }
      },
      customFnWithSeparateModels: {
        request: {
          properties: {
            customFnRequestModelField: { type: 'string' }
          }
        },
        response: {
          properties: {
            customFnResponseModelField: { type: 'string' }
          }
        }
      },
      customFnWithStringyModel: { request: 'pet', response: 'pet' },
      customFnWithStringyResponseModel: {
        request: undefined,
        response: 'pet'
      },
      customFnWithStringySeparateModels: {
        request: 'pet',
        response: 'pet'
      },
      customFnWithRequestAndStringyResponse: {
        request: {
          properties: {
            customFnWithRequestAndStringyResponseField: { type: 'string' }
          }
        },
        response: 'pet'
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['pets'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        operations: allCollectionVerbs
      },
      {
        name: 'customFnWithListAction',
        model: 'pet',
        resourceName: 'pet',
        pathParts: ['pets', 'invoke.customFnWithListAction'],
        isCustomFunctionResource: true,
        operations: ['list']
      },
      {
        name: 'customFnWithRequestAndStringyResponse',
        model: 'customFnWithRequestAndStringyResponse',
        resourceName: 'pet',
        pathParts: ['pets', 'invoke.customFnWithRequestAndStringyResponse'],
        isCustomFunctionResource: true,
        operations: ['post']
      },
      {
        name: 'customFnWithSeparateModels',
        model: 'customFnWithSeparateModels',
        resourceName: 'pet',
        pathParts: ['pets', 'invoke.customFnWithSeparateModels'],
        isCustomFunctionResource: true,
        operations: ['post']
      },
      {
        name: 'customFnWithStringyModel',
        model: 'customFnWithStringyModel',
        pathParts: ['pets', 'invoke.customFnWithStringyModel'],
        resourceName: 'pet',
        isCustomFunctionResource: true,
        operations: ['post']
      },
      {
        name: 'customFnWithStringyResponseModel',
        model: 'customFnWithStringyResponseModel',
        resourceName: 'pet',
        pathParts: ['pets', 'invoke.customFnWithStringyResponseModel'],
        isCustomFunctionResource: true,
        operations: ['post']
      },
      {
        name: 'customFnWithStringySeparateModels',
        model: 'customFnWithStringySeparateModels',
        resourceName: 'pet',
        pathParts: ['pets', 'invoke.customFnWithStringySeparateModels'],
        isCustomFunctionResource: true,
        operations: ['post']
      },
      {
        pathParts: ['pets', '{petId}'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        operations: allEntityVerbs
      },
      {
        name: 'customFnWithGetAction',
        model: 'pet',
        resourceName: 'pet',
        pathParts: ['pets', '{petId}', 'invoke.customFnWithGetAction'],
        isCustomFunctionResource: true,
        operations: ['get']
      },
      {
        name: 'customFnWithModel',
        model: 'customFnWithModel',
        resourceName: 'pet',
        pathParts: ['pets', '{petId}', 'invoke.customFnWithModel'],
        isCustomFunctionResource: true,
        operations: ['get']
      }
    ])
  })
})

describe('expandToResources#belongsTo', () => {
  test('basic', () => {
    const schema = dump([
      {
        name: 'org',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'repo',
        belongsTo: 'org',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'commit',
        belongsTo: 'repo',
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'belongsTo')

    expect(expandToResources(schema).models).toEqual({
      org: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      repo: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      commit: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['orgs'],
        name: 'org',
        model: 'org',
        resourceName: 'org',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['orgs', '{orgId}'],
        name: 'org',
        model: 'org',
        resourceName: 'org',
        operations: allEntityVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos'],
        name: 'repo',
        model: 'repo',
        resourceName: 'repo',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos', '{repoId}'],
        name: 'repo',
        model: 'repo',
        resourceName: 'repo',
        operations: allEntityVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos', '{repoId}', 'commits'],
        name: 'commit',
        model: 'commit',
        resourceName: 'commit',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos', '{repoId}', 'commits', '{commitId}'],
        name: 'commit',
        model: 'commit',
        resourceName: 'commit',
        operations: allEntityVerbs
      }
    ])
  })

  test('with `hasMany`', () => {
    const schema = dump([
      {
        name: 'owner',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'committer',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'repo',
        hasMany: [{ name: 'owners' }],
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'commit',
        belongsTo: 'repo',
        hasMany: [{ name: 'committers' }],
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'belongsTo with hasMany')

    expect(expandToResources(schema).models).toEqual({
      owner: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      committer: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      repo: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      commit: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      commitCommitter: {
        request: { properties: { committerId: { type: 'string' } } },
        response: { properties: { committerId: { type: 'string' } } }
      },
      repoOwner: {
        request: { properties: { ownerId: { type: 'string' } } },
        response: { properties: { ownerId: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['committers'],
        name: 'committer',
        model: 'committer',
        resourceName: 'committer',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['committers', '{committerId}'],
        name: 'committer',
        model: 'committer',
        resourceName: 'committer',
        operations: allEntityVerbs
      },
      {
        pathParts: ['owners'],
        name: 'owner',
        model: 'owner',
        resourceName: 'owner',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['owners', '{ownerId}'],
        name: 'owner',
        model: 'owner',
        resourceName: 'owner',
        operations: allEntityVerbs
      },
      {
        pathParts: ['repos'],
        name: 'repo',
        model: 'repo',
        resourceName: 'repo',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['repos', '{repoId}'],
        name: 'repo',
        model: 'repo',
        resourceName: 'repo',
        operations: allEntityVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'commits'],
        name: 'commit',
        model: 'commit',
        resourceName: 'commit',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'commits', '{commitId}'],
        name: 'commit',
        model: 'commit',
        resourceName: 'commit',
        operations: allEntityVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'commits', '{commitId}', 'committers'],
        name: 'committer',
        model: 'commitCommitter',
        resourceName: 'committer',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'commits', '{commitId}', 'committers', '{committerId}'],
        name: 'committer',
        model: 'commitCommitter',
        resourceName: 'committer',
        operations: allEntityVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'owners'],
        name: 'owner',
        model: 'repoOwner',
        resourceName: 'owner',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'owners', '{ownerId}'],
        name: 'owner',
        model: 'repoOwner',
        resourceName: 'owner',
        operations: allEntityVerbs
      }
    ])
  })
})

describe('expandToResources#hasMany', () => {
  test('basic', () => {
    const schema = dump([
      {
        name: 'pet',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'person',
        hasMany: [{ name: 'pets' }],
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'hasMany')

    expect(expandToResources(schema).models).toEqual({
      pet: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      person: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      personPet: {
        request: { properties: { petId: { type: 'string' } } },
        response: { properties: { petId: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['people'],
        name: 'person',
        model: 'person',
        resourceName: 'person',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['people', '{personId}'],
        name: 'person',
        model: 'person',
        resourceName: 'person',
        operations: allEntityVerbs
      },
      {
        pathParts: ['people', '{personId}', 'pets'],
        name: 'pet',
        model: 'personPet',
        resourceName: 'pet',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['people', '{personId}', 'pets', '{petId}'],
        name: 'pet',
        model: 'personPet',
        resourceName: 'pet',
        operations: allEntityVerbs
      },
      {
        pathParts: ['pets'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        operations: allEntityVerbs
      }
    ])
  })

  test('polymorphism', () => {
    const schema = dump([
      {
        name: 'person',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'pet',
        hasMany: [
          { name: 'people', as: 'owners' },
          { name: 'people', as: 'doctors' }
        ],
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'hasMany polymorphism')

    expect(expandToResources(schema).models).toEqual({
      pet: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      person: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      petOwner: {
        request: { properties: { ownerId: { type: 'string' } } },
        response: { properties: { ownerId: { type: 'string' } } }
      },
      petDoctor: {
        request: { properties: { doctorId: { type: 'string' } } },
        response: { properties: { doctorId: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['people'],
        name: 'person',
        model: 'person',
        resourceName: 'person',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['people', '{personId}'],
        name: 'person',
        model: 'person',
        resourceName: 'person',
        operations: allEntityVerbs
      },
      {
        pathParts: ['pets'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        operations: allEntityVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'doctors'],
        name: 'person',
        model: 'petDoctor',
        resourceName: 'person',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'doctors', '{doctorId}'],
        name: 'person',
        model: 'petDoctor',
        resourceName: 'person',
        operations: allEntityVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'owners'],
        name: 'person',
        model: 'petOwner',
        resourceName: 'person',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'owners', '{ownerId}'],
        name: 'person',
        model: 'petOwner',
        resourceName: 'person',
        operations: allEntityVerbs
      }
    ])
  })
})

describe('expandToResources#treeOf', () => {
  test('basic', () => {
    const schema = dump(
      [{
        name: 'group',
        treeOf: 'subgroups',
        model: { properties: { name: { type: 'string' } } }
      }],
      'treeOf'
    )

    expect(expandToResources(schema).models).toEqual({
      group: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      subgroup: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['groups'],
        name: 'group',
        model: 'group',
        resourceName: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}'],
        name: 'group',
        model: 'group',
        resourceName: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups'],
        name: 'subgroup',
        model: 'group',
        resourceName: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        name: 'subgroup',
        model: 'group',
        resourceName: 'group',
        operations: allEntityVerbs
      }
    ])
  })

  test('with `belongsTo`', () => {
    const schema = dump([
      {
        name: 'region',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'group',
        treeOf: 'subgroups',
        belongsTo: 'region',
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'treeOf with belongsTo')

    expect(expandToResources(schema).models).toEqual({
      region: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      group: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      subgroup: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['regions'],
        name: 'region',
        model: 'region',
        resourceName: 'region',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['regions', '{regionId}'],
        name: 'region',
        model: 'region',
        resourceName: 'region',
        operations: allEntityVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups'],
        name: 'group',
        model: 'group',
        resourceName: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups', '{groupId}'],
        name: 'group',
        model: 'group',
        resourceName: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups', '{groupId}', 'subgroups'],
        name: 'subgroup',
        model: 'group',
        resourceName: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups', '{groupId}', 'subgroups', '{subgroupId}'],
        name: 'subgroup',
        model: 'group',
        resourceName: 'group',
        operations: allEntityVerbs
      }
    ])
  })

  test('with `hasMany`', () => {
    const schema = dump([
      {
        name: 'group',
        treeOf: 'subgroups',
        hasMany: [{ name: 'widgets' }],
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'widget',
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'treeOf with hasMany')

    expect(expandToResources(schema).models).toEqual({
      widget: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      group: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      subgroup: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      groupWidget: {
        request: { properties: { widgetId: { type: 'string' } } },
        response: { properties: { widgetId: { type: 'string' } } }
      },
      subgroupWidget: {
        request: { properties: { widgetId: { type: 'string' } } },
        response: { properties: { widgetId: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['groups'],
        name: 'group',
        model: 'group',
        resourceName: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}'],
        name: 'group',
        model: 'group',
        resourceName: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups'],
        name: 'subgroup',
        model: 'group',
        resourceName: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        name: 'subgroup',
        model: 'group',
        resourceName: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups', '{subgroupId}', 'widgets'],
        name: 'widget',
        model: 'subgroupWidget',
        resourceName: 'widget',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups', '{subgroupId}', 'widgets', '{widgetId}'],
        name: 'widget',
        model: 'subgroupWidget',
        resourceName: 'widget',
        operations: allEntityVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'widgets'],
        name: 'widget',
        model: 'groupWidget',
        resourceName: 'widget',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'widgets', '{widgetId}'],
        name: 'widget',
        model: 'groupWidget',
        resourceName: 'widget',
        operations: allEntityVerbs
      },
      {
        pathParts: ['widgets'],
        name: 'widget',
        model: 'widget',
        resourceName: 'widget',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['widgets', '{widgetId}'],
        name: 'widget',
        model: 'widget',
        resourceName: 'widget',
        operations: allEntityVerbs
      }
    ])
  })

  test('target of `hasMany`', () => {
    const schema = dump([
      {
        name: 'group',
        treeOf: 'subgroups',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'region',
        hasMany: [{ name: 'groups' }],
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'treeOf target of hasMany')

    expect(expandToResources(schema).models).toEqual({
      region: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      group: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      subgroup: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      regionGroup: {
        request: { properties: { groupId: { type: 'string' } } },
        response: { properties: { groupId: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['groups'],
        name: 'group',
        model: 'group',
        resourceName: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}'],
        name: 'group',
        model: 'group',
        resourceName: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups'],
        name: 'subgroup',
        model: 'group',
        resourceName: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        name: 'subgroup',
        model: 'group',
        resourceName: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['regions'],
        name: 'region',
        model: 'region',
        resourceName: 'region',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['regions', '{regionId}'],
        name: 'region',
        model: 'region',
        resourceName: 'region',
        operations: allEntityVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups'],
        name: 'group',
        model: 'regionGroup',
        resourceName: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups', '{groupId}'],
        name: 'group',
        model: 'regionGroup',
        resourceName: 'group',
        operations: allEntityVerbs
      }
    ])
  })
})

describe('expandToResources#users', () => {
  test('with `belongsTo`', () => {
    const schema = dump([
      {
        name: 'user',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'course',
        belongsTo: 'user',
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'users with belongsTo')

    expect(expandToResources(schema).models).toEqual({
      user: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      course: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['users'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'courses'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'courses', '{courseId}'],
        isUserCentricResource: true,
        name: 'course',
        model: 'course',
        resourceName: 'course',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}', 'courses'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', '{userId}', 'courses', '{courseId}'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        operations: allEntityVerbs
      }
    ])
  })

  test('with `hasMany`', () => {
    const schema = dump([
      {
        name: 'course',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'user',
        hasMany: [{ name: 'courses' }],
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'users with hasMany')

    expect(expandToResources(schema).models).toEqual({
      user: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      course: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      userCourse: {
        request: { properties: { courseId: { type: 'string' } } },
        response: { properties: { courseId: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['courses'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['courses', '{courseId}'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'courses'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'courses', '{courseId}'],
        isUserCentricResource: true,
        name: 'course',
        model: 'course',
        resourceName: 'course',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}', 'courses'],
        name: 'course',
        model: 'userCourse',
        resourceName: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', '{userId}', 'courses', '{courseId}'],
        name: 'course',
        model: 'userCourse',
        resourceName: 'course',
        operations: allEntityVerbs
      }
    ])
  })

  test('with polymorphic `hasMany`', () => {
    const schema = dump([
      {
        name: 'course',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'user',
        hasMany: [
          { name: 'courses', as: 'contributors' },
          { name: 'courses', as: 'learners' }
        ],
        model: { properties: { name: { type: 'string' } } }
      }
    ], 'users with polymorphic hasMany')

    expect(expandToResources(schema).models).toEqual({
      user: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      course: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      userContributor: {
        request: { properties: { contributorId: { type: 'string' } } },
        response: { properties: { contributorId: { type: 'string' } } }
      },
      userLearner: {
        request: { properties: { learnerId: { type: 'string' } } },
        response: { properties: { learnerId: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['courses'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['courses', '{courseId}'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'contributors'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'contributors', '{contributorId}'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', 'learners'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'learners', '{learnerId}'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}', 'contributors'],
        name: 'course',
        model: 'userContributor',
        resourceName: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', '{userId}', 'contributors', '{contributorId}'],
        name: 'course',
        model: 'userContributor',
        resourceName: 'course',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}', 'learners'],
        name: 'course',
        model: 'userLearner',
        resourceName: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', '{userId}', 'learners', '{learnerId}'],
        name: 'course',
        model: 'userLearner',
        resourceName: 'course',
        operations: allEntityVerbs
      }
    ])
  })
})
