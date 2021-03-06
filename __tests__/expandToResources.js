const { join } = require('path')
const traverse = require('traverse')
const uniq = require('lodash/uniq')
const sortBy = require('lodash/sortBy')
const expandToResources = require('../expandToResources')
const expandToOpenApi = require('../expandToOpenApi')
const { existsSync, removeSync, writeFileSync, mkdirsSync } = require('fs-extra')
const OpenAPISchemaValidator = require('openapi-schema-validator').default
const { safeDump: dumpYaml } = require('js-yaml')

const validator = new OpenAPISchemaValidator({ version: 3 })

const expandedView = schema => sortBy(
  schema.paths,
  schema => schema.pathParts.join('/')
)

const { allEntityVerbs, allCollectionVerbs } = require('../common')

const assertNoOrphanedModels = (spec, title) => {
  let foundModels = []
  traverse(spec).forEach(node => {
    if (
      node &&
      node.startsWith &&
      node.startsWith('#/components/schemas/')
    ) {
      foundModels.push(node.split('/').pop())
    }
  })

  if (
    JSON.stringify(uniq(foundModels).sort()) !==
    JSON.stringify(Object.keys(spec.components.schemas).sort())
  ) {
    throw new Error(`OpenAPI has orphaned models: ${title}`)
  }
}

const assertUniqueOperationIds = (spec, title) => {
  let ids = []
  traverse(spec.paths).forEach(function (s) {
    if (this.key === 'operationId') {
      return ids.push(s)
    }
  })
  if (ids.length !== uniq(ids).length) {
    throw new Error(`OpenAPI has duplicate operation ids: ${title}`)
  }
}

const exampleDir = join(__dirname, '..', 'examples')
removeSync(exampleDir)
mkdirsSync(exampleDir)

// Examples here are emblamatic so we validate and dump io of each test run
// for usage outside of tests
const validateAndDumpFixture = (spec, title) => {
  const openApiSpec = expandToOpenApi(
    spec,
    { info: { title: `Example: ${title}` } }
  )

  const fixtureInputPathJson =
    `${exampleDir}/${title.toLowerCase().replace(/ /g, '-')}.input.json`
  const fixtureInputPathYaml =
    `${exampleDir}/${title.toLowerCase().replace(/ /g, '-')}.input.yml`
  const fixtureOutputPathJson =
    `${exampleDir}/${title.toLowerCase().replace(/ /g, '-')}.output.json`
  const fixtureOutputPathYaml =
    `${exampleDir}/${title.toLowerCase().replace(/ /g, '-')}.output.yml`

  if (existsSync(fixtureOutputPathJson)) {
    throw new Error(`Fixture already exists: ${title}`)
  }

  writeFileSync(fixtureInputPathJson, JSON.stringify(spec, null, 2))
  writeFileSync(fixtureOutputPathJson, JSON.stringify(openApiSpec, null, 2))
  const yamlOptions = { skipInvalid: true, noRefs: true }
  writeFileSync(fixtureInputPathYaml, dumpYaml(spec, yamlOptions))
  writeFileSync(fixtureOutputPathYaml, dumpYaml(openApiSpec, yamlOptions))

  // Trap and show validation errors
  const { errors } = validator.validate(openApiSpec)
  if (errors.length) {
    console.error(errors)
    console.error(`${errors.length} validation errors`)
    throw new Error(`OpenAPI validation failed: ${title}`)
  }

  assertNoOrphanedModels(openApiSpec, title)
  assertUniqueOperationIds(openApiSpec, title)

  return spec
}

afterAll(() => {
  console.info(`All results dumped to ${exampleDir}`)
})

describe('expandToResources', () => {
  test('basic', () => {
    const schema = [
      {
        name: 'pet',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'store',
        model: { properties: { name: { type: 'string' } } }
      }
    ]

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

    validateAndDumpFixture(schema, 'basic')
  })

  test('with inflections', () => {
    const schema = [{
      name: 'person',
      model: { properties: { name: { type: 'string' } } }
    }]

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

    validateAndDumpFixture(schema, 'basic with inflections')
  })

  test('with immutability', () => {
    const schema = [{
      name: 'pet',
      immutable: true,
      model: { properties: { name: { type: 'string' } } }
    }]

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

    validateAndDumpFixture(schema, 'basic with immutability')
  })

  test('with `readOnly` properties', () => {
    const schema = [
      {
        name: 'pet',
        model: {
          properties: {
            name: { type: 'string' },
            fieldThatIsReadOnly: { type: 'string', readOnly: true }
          }
        }
      }
    ]

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

    validateAndDumpFixture(schema, 'basic with readOnly properties')
  })
})

describe('expandToResources#fns', () => {
  test('basic', () => {
    const schema = [{
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
    }]

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
        pathParts: ['pets'],
        isCustomFunctionResource: true,
        operations: ['list']
      },
      {
        name: 'customFnWithSeparateModels',
        model: 'customFnWithSeparateModels',
        resourceName: 'pet',
        pathParts: ['pets'],
        isCustomFunctionResource: true,
        operations: ['post']
      },
      {
        name: 'customFnWithStringyModel',
        model: 'customFnWithStringyModel',
        pathParts: ['pets'],
        resourceName: 'pet',
        isCustomFunctionResource: true,
        operations: ['post']
      },
      {
        name: 'customFnWithStringyResponseModel',
        model: 'customFnWithStringyResponseModel',
        resourceName: 'pet',
        pathParts: ['pets'],
        isCustomFunctionResource: true,
        operations: ['post']
      },
      {
        name: 'customFnWithStringySeparateModels',
        model: 'customFnWithStringySeparateModels',
        resourceName: 'pet',
        pathParts: ['pets'],
        isCustomFunctionResource: true,
        operations: ['post']
      },
      {
        name: 'customFnWithRequestAndStringyResponse',
        model: 'customFnWithRequestAndStringyResponse',
        resourceName: 'pet',
        pathParts: ['pets'],
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
        pathParts: ['pets', '{petId}'],
        isCustomFunctionResource: true,
        operations: ['get']
      },
      {
        name: 'customFnWithModel',
        model: 'customFnWithModel',
        resourceName: 'pet',
        pathParts: ['pets', '{petId}'],
        isCustomFunctionResource: true,
        operations: ['get']
      }
    ])

    validateAndDumpFixture(schema, 'custom function')
  })
})

describe('expandToResources#belongsTo', () => {
  test('basic', () => {
    const schema = [
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
    ]

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

    validateAndDumpFixture(schema, 'belongsTo')
  })

  test('with `hasMany`', () => {
    const schema = [
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
    ]

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

    validateAndDumpFixture(schema, 'belongsTo with hasMany')
  })
})

describe('expandToResources#hasMany', () => {
  test('basic', () => {
    const schema = [
      {
        name: 'pet',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'person',
        hasMany: [{ name: 'pets' }],
        model: { properties: { name: { type: 'string' } } }
      }
    ]

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

    validateAndDumpFixture(schema, 'hasMany')
  })

  test('polymorphism', () => {
    const schema = [
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
    ]

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

    validateAndDumpFixture(schema, 'hasMany polymorphism')
  })

  test('with `users`', () => {
    const schema = [
      {
        name: 'user',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'pet',
        hasMany: [{ name: 'users' }],
        model: { properties: { name: { type: 'string' } } }
      }
    ]

    expect(expandToResources(schema).models).toEqual({
      pet: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      user: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      petUser: {
        request: { properties: { userId: { type: 'string' } } },
        response: { properties: { userId: { type: 'string' } } }
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
        pathParts: ['pets', '{petId}', 'users'],
        name: 'user',
        model: 'petUser',
        resourceName: 'user',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'users', '{userId}'],
        name: 'user',
        model: 'petUser',
        resourceName: 'user',
        operations: allEntityVerbs
      },
      {
        pathParts: ['user'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: ['get'],
        isUserCentricResource: true
      },
      {
        pathParts: ['user', 'pets'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['user', 'pets', '{petId}'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        isUserCentricResource: true,
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
        pathParts: ['users', '{userId}'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: allEntityVerbs
      }
    ])

    validateAndDumpFixture(schema, 'with users')
  })

  test('polymorphism with `users`', () => {
    const schema = [
      {
        name: 'user',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'pet',
        hasMany: [
          { name: 'users', as: 'owners' },
          { name: 'users', as: 'doctors', label: 'caring' }
        ],
        model: { properties: { name: { type: 'string' } } }
      }
    ]

    expect(expandToResources(schema).models).toEqual({
      pet: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      user: {
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
        name: 'user',
        model: 'petDoctor',
        resourceName: 'user',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'doctors', '{doctorId}'],
        name: 'user',
        model: 'petDoctor',
        resourceName: 'user',
        operations: allEntityVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'owners'],
        name: 'user',
        model: 'petOwner',
        resourceName: 'user',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'owners', '{ownerId}'],
        name: 'user',
        model: 'petOwner',
        resourceName: 'user',
        operations: allEntityVerbs
      },
      {
        pathParts: ['user'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: ['get'],
        isUserCentricResource: true
      },
      {
        pathParts: ['user', 'pets', 'caring'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['user', 'pets', 'caring', '{petId}'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        isUserCentricResource: true,
        operations: allEntityVerbs
      },
      {
        pathParts: ['user', 'pets', 'owners'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['user', 'pets', 'owners', '{petId}'],
        name: 'pet',
        model: 'pet',
        resourceName: 'pet',
        isUserCentricResource: true,
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
        pathParts: ['users', '{userId}'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: allEntityVerbs
      }
    ])

    validateAndDumpFixture(schema, 'hasMany polymorphism with users')
  })
})

describe('expandToResources#treeOf', () => {
  test('basic', () => {
    const schema = [{
      name: 'group',
      treeOf: 'subgroups',
      model: { properties: { name: { type: 'string' } } }
    }]

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

    validateAndDumpFixture(schema, 'treeOf')
  })

  test('with `belongsTo`', () => {
    const schema = [
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
    ]

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

    validateAndDumpFixture(schema, 'treeOf with belongsTo')
  })

  test('with `hasMany`', () => {
    const schema = [
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
    ]

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

    validateAndDumpFixture(schema, 'treeOf with hasMany')
  })

  test('target of `hasMany`', () => {
    const schema = [
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
    ]

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

    validateAndDumpFixture(schema, 'treeOf target of hasMany')
  })
})

describe('expandToResources#users', () => {
  test('basic', () => {
    const schema = [
      {
        name: 'user',
        model: { properties: { name: { type: 'string' } } }
      }
    ]

    expect(expandToResources(schema).models).toEqual({
      user: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['user'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: ['get'],
        isUserCentricResource: true
      },
      {
        pathParts: ['users'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', '{userId}'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: allEntityVerbs
      }
    ])

    validateAndDumpFixture(schema, 'users')
  })

  test('with `belongsTo`', () => {
    const schema = [
      {
        name: 'user',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'course',
        belongsTo: 'user',
        model: { properties: { name: { type: 'string' } } }
      }
    ]

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
        pathParts: ['user'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: ['get'],
        isUserCentricResource: true
      },
      {
        pathParts: ['user', 'courses'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['user', 'courses', '{courseId}'],
        isUserCentricResource: true,
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

    validateAndDumpFixture(schema, 'users with belongsTo')
  })

  test('with `hasMany`', () => {
    const schema = [
      {
        name: 'course',
        model: { properties: { name: { type: 'string' } } }
      },
      {
        name: 'user',
        hasMany: [{ name: 'courses' }],
        model: { properties: { name: { type: 'string' } } }
      }
    ]

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
        pathParts: ['user'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: ['get'],
        isUserCentricResource: true
      },
      {
        pathParts: ['user', 'courses'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['user', 'courses', '{courseId}'],
        isUserCentricResource: true,
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

    validateAndDumpFixture(schema, 'users with hasMany')
  })

  test('with polymorphic `hasMany`', () => {
    const schema = [
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
    ]

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
        pathParts: ['user'],
        name: 'user',
        model: 'user',
        resourceName: 'user',
        operations: ['get'],
        isUserCentricResource: true
      },
      {
        pathParts: ['user', 'contributors'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['user', 'contributors', '{contributorId}'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allEntityVerbs
      },
      {
        pathParts: ['user', 'learners'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['user', 'learners', '{learnerId}'],
        name: 'course',
        model: 'course',
        resourceName: 'course',
        isUserCentricResource: true,
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

    validateAndDumpFixture(schema, 'users with polymorphic hasMany')
  })
})
