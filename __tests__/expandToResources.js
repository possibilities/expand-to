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
  const openApiSpec = expandToOpenApi(spec, { title: `Example: ${title}` })
  writeFileSync(
    `${tempDir}/${title.toLowerCase().replace(/ /g, '-')}.json`,
    JSON.stringify(openApiSpec, null, 2)
  )

  // Trap and show validation errors
  const { errors } = validator.validate(openApiSpec)
  if (errors.length) {
    console.error(errors)
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
        model: 'pet',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}'],
        model: 'pet',
        operations: allEntityVerbs
      },
      {
        pathParts: ['stores'],
        model: 'store',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['stores', '{storeId}'],
        model: 'store',
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
        model: 'person',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['people', '{personId}'],
        model: 'person',
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
        model: 'pet',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}'],
        model: 'pet',
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

describe('expand#fns', () => {
  test('basic', () => {
    const schema = dump(
      [{
        name: 'pet',
        fns: [
          {
            method: 'get',
            name: 'requestMedicalRecords'
          },
          {
            method: 'list',
            name: 'requestMedicalRecordHistory'
          },
          {
            method: 'get',
            name: 'checkInsurance',
            // With response body
            model: { properties: { insuranceName: { type: 'string' } } }
          },
          {
            method: 'post',
            name: 'checkAdoptionHistory',
            // With request and response bodied
            model: {
              request: { properties: { state: { type: 'string' } } },
              response: { properties: { adoptionDate: { type: 'string' } } }
            }
          },
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
      checkInsurance: {
        response: { properties: { insuranceName: { type: 'string' } } }
      },
      checkAdoptionHistory: {
        request: { properties: { state: { type: 'string' } } },
        response: { properties: { adoptionDate: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['pets'],
        model: 'pet',
        operations: allCollectionVerbs
      },
      {
        model: 'checkAdoptionHistory',
        pathParts: ['pets', 'invoke.checkAdoptionHistory'],
        operations: ['post']
      },
      {
        model: 'pet',
        pathParts: ['pets', 'invoke.requestMedicalRecordHistory'],
        operations: ['list']
      },
      {
        pathParts: ['pets', '{petId}'],
        model: 'pet',
        operations: allEntityVerbs
      },
      {
        model: 'checkInsurance',
        pathParts: ['pets', '{petId}', 'invoke.checkInsurance'],
        operations: ['get']
      },
      {
        model: 'pet',
        pathParts: ['pets', '{petId}', 'invoke.requestMedicalRecords'],
        operations: ['get']
      },
    ])
  })

  test('with `belongsTo`', () => {
    const schema = dump(
      [{
        name: 'org',
        model: { properties: { name: { type: 'string' } } }
      }, {
        name: 'repo',
        fns: [{
          method: 'get',
          name: 'getTopContributors'
        }],
        model: { properties: { name: { type: 'string' } } },
        belongsTo: 'org'
      }],
      'custom function with belongsTo'
    )

    expect(expandToResources(schema).models).toEqual({
      org: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      },
      repo: {
        request: { properties: { name: { type: 'string' } } },
        response: { properties: { name: { type: 'string' } } }
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['orgs'],
        model: 'org',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['orgs', '{orgId}'],
        model: 'org',
        operations: allEntityVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos'],
        model: 'repo',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos', '{repoId}'],
        model: 'repo',
        operations: allEntityVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos', '{repoId}', 'invoke.getTopContributors'],
        model: 'repo',
        operations: ['get']
      }
    ])
  })
})

describe('expand#belongsTo', () => {
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
        model: 'org',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['orgs', '{orgId}'],
        model: 'org',
        operations: allEntityVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos'],
        model: 'repo',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos', '{repoId}'],
        model: 'repo',
        operations: allEntityVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos', '{repoId}', 'commits'],
        model: 'commit',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['orgs', '{orgId}', 'repos', '{repoId}', 'commits', '{commitId}'],
        model: 'commit',
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
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['committers'],
        model: 'committer',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['committers', '{committerId}'],
        model: 'committer',
        operations: allEntityVerbs
      },
      {
        pathParts: ['owners'],
        model: 'owner',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['owners', '{ownerId}'],
        model: 'owner',
        operations: allEntityVerbs
      },
      {
        pathParts: ['repos'],
        model: 'repo',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['repos', '{repoId}'],
        model: 'repo',
        operations: allEntityVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'commits'],
        model: 'commit',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'commits', '{commitId}'],
        model: 'commit',
        operations: allEntityVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'commits', '{commitId}', 'committers'],
        model: 'committer',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'commits', '{commitId}', 'committers', '{committerId}'],
        model: 'committer',
        operations: allEntityVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'owners'],
        model: 'owner',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['repos', '{repoId}', 'owners', '{ownerId}'],
        model: 'owner',
        operations: allEntityVerbs
      }
    ])
  })
})

describe('expand#hasMany', () => {
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
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['people'],
        model: 'person',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['people', '{personId}'],
        model: 'person',
        operations: allEntityVerbs
      },
      {
        pathParts: ['people', '{personId}', 'pets'],
        model: 'pet',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['people', '{personId}', 'pets', '{petId}'],
        model: 'pet',
        operations: allEntityVerbs
      },
      {
        pathParts: ['pets'],
        model: 'pet',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}'],
        model: 'pet',
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
          { name: 'people', as: 'owner' },
          { name: 'people', as: 'doctor' }
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
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['people'],
        model: 'person',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['people', '{personId}'],
        model: 'person',
        operations: allEntityVerbs
      },
      {
        pathParts: ['pets'],
        model: 'pet',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}'],
        model: 'pet',
        operations: allEntityVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'doctors'],
        model: 'person',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'doctors', '{doctorId}'],
        model: 'person',
        operations: allEntityVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'owners'],
        model: 'person',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['pets', '{petId}', 'owners', '{ownerId}'],
        model: 'person',
        operations: allEntityVerbs
      }
    ])
  })
})

describe('expand#treeOf', () => {
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
        model: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}'],
        model: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups'],
        model: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        model: 'group',
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
        model: 'region',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['regions', '{regionId}'],
        model: 'region',
        operations: allEntityVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups'],
        model: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups', '{groupId}'],
        model: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups', '{groupId}', 'subgroups'],
        model: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups', '{groupId}', 'subgroups', '{subgroupId}'],
        model: 'group',
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
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['groups'],
        model: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}'],
        model: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups'],
        model: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        model: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups', '{subgroupId}', 'widgets'],
        model: 'widget',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups', '{subgroupId}', 'widgets', '{widgetId}'],
        model: 'widget',
        operations: allEntityVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'widgets'],
        model: 'widget',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'widgets', '{widgetId}'],
        model: 'widget',
        operations: allEntityVerbs
      },
      {
        pathParts: ['widgets'],
        model: 'widget',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['widgets', '{widgetId}'],
        model: 'widget',
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
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['groups'],
        model: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}'],
        model: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups'],
        model: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        model: 'group',
        operations: allEntityVerbs
      },
      {
        pathParts: ['regions'],
        model: 'region',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['regions', '{regionId}'],
        model: 'region',
        operations: allEntityVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups'],
        model: 'group',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['regions', '{regionId}', 'groups', '{groupId}'],
        model: 'group',
        operations: allEntityVerbs
      }
    ])
  })
})

describe('expand#users', () => {
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
        model: 'user',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'courses'],
        model: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'courses', '{courseId}'],
        isUserCentricResource: true,
        model: 'course',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}'],
        model: 'user',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}', 'courses'],
        model: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', '{userId}', 'courses', '{courseId}'],
        model: 'course',
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
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['courses'],
        model: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['courses', '{courseId}'],
        model: 'course',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users'],
        model: 'user',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'courses'],
        model: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'courses', '{courseId}'],
        isUserCentricResource: true,
        model: 'course',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}'],
        model: 'user',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}', 'courses'],
        model: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', '{userId}', 'courses', '{courseId}'],
        model: 'course',
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
          { name: 'courses', as: 'contributor' },
          { name: 'courses', as: 'learner' }
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
      }
    })

    expect(expandedView(expandToResources(schema))).toEqual([
      {
        pathParts: ['courses'],
        model: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['courses', '{courseId}'],
        model: 'course',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users'],
        model: 'user',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'contributors'],
        model: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'contributors', '{contributorId}'],
        model: 'course',
        isUserCentricResource: true,
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', 'learners'],
        model: 'course',
        isUserCentricResource: true,
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', 'learners', '{learnerId}'],
        model: 'course',
        isUserCentricResource: true,
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}'],
        model: 'user',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}', 'contributors'],
        model: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', '{userId}', 'contributors', '{contributorId}'],
        model: 'course',
        operations: allEntityVerbs
      },
      {
        pathParts: ['users', '{userId}', 'learners'],
        model: 'course',
        operations: allCollectionVerbs
      },
      {
        pathParts: ['users', '{userId}', 'learners', '{learnerId}'],
        model: 'course',
        operations: allEntityVerbs
      }
    ])
  })
})
