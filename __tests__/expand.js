const without = require('lodash/without')
const sortBy = require('lodash/sortBy')
const expand = require('../expand')
const expandToOpenApi = require('../expandToOpenApi')
const { writeFileSync, mkdirsSync } = require('fs-extra')
const OpenAPISchemaValidator = require('openapi-schema-validator').default

const {
  allEntityVerbs,
  allCollectionVerbs
} = require('../common')

const validator = new OpenAPISchemaValidator({ version: 3 })

const pathView = schema => schema.paths
  .map(resource => resource.path.join('/')).sort()

const expandedView = schema => sortBy(
  schema.paths,
  schema => schema.path.join('/')
)

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

describe('expand', () => {
  test('basic', () => {
    const schema = dump([
      {
        name: 'pet',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'store',
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'basic')

    expect(expand(schema).models).toEqual({
      pet: { properties: { name: { type: 'string' } } },
      store: { properties: { name: { type: 'string' } } }
    })

    expect(pathView(expand(schema))).toEqual([
      'pets',
      'pets/{petId}',
      'stores',
      'stores/{storeId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'pet',
        path: ['pets'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'pet',
        ids: { pets: 'petId' },
        path: ['pets', '{petId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        modelName: 'store',
        path: ['stores'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'store',
        ids: { stores: 'storeId' },
        path: ['stores', '{storeId}'],
        methods: allEntityVerbs
      }
    ])
  })

  test('with inflections', () => {
    const schema = dump(
      [{
        name: 'person',
        model: {
          properties: { name: { type: 'string' } }
        }
      }],
      'basic with inflections'
    )

    expect(pathView(expand(schema))).toEqual([
      'people',
      'people/{personId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'person',
        path: ['people'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'person',
        ids: { people: 'personId' },
        path: ['people', '{personId}'],
        methods: allEntityVerbs
      }
    ])
  })

  test('with immutability', () => {
    const schema = dump(
      [{
        name: 'pet',
        immutable: true,
        model: {
          properties: { name: { type: 'string' } }
        }
      }],
      'basic with immutability'
    )

    expect(pathView(expand(schema))).toEqual([
      'pets',
      'pets/{petId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'pet',
        path: ['pets'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'pet',
        ids: { pets: 'petId' },
        path: ['pets', '{petId}'],
        methods: without(allEntityVerbs, 'patch', 'put')
      }
    ])
  })
})

describe('expand#fns', () => {
  test('basic', () => {
    const schema = dump(
      [{
        name: 'pet',
        fns: [{
          method: 'get',
          name: 'requestMedicalRecords'
        }],
        model: {
          properties: { name: { type: 'string' } }
        }
      }],
      'custom function'
    )

    expect(expand(schema).models).toEqual({
      pet: { properties: { name: { type: 'string' } } }
    })

    expect(pathView(expand(schema))).toEqual([
      'pets',
      'pets/fns/requestMedicalRecords',
      'pets/{petId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'pet',
        path: ['pets'],
        methods: allCollectionVerbs
      },
      {
        ids: {},
        isCustomFunction: true,
        path: ['pets', 'fns', 'requestMedicalRecords'],
        modelName: 'pet',
        methods: ['get']
      },
      {
        modelName: 'pet',
        ids: { pets: 'petId' },
        path: ['pets', '{petId}'],
        methods: allEntityVerbs
      }
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

    expect(expand(schema).models).toEqual({
      org: { properties: { name: { type: 'string' } } },
      repo: { properties: { name: { type: 'string' } } }
    })

    expect(pathView(expand(schema))).toEqual([
      'orgs',
      'orgs/{orgId}',
      'orgs/{orgId}/repos',
      'orgs/{orgId}/repos/fns/getTopContributors',
      'orgs/{orgId}/repos/{repoId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'org',
        path: ['orgs'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'org',
        ids: { orgs: 'orgId' },
        path: ['orgs', '{orgId}'],
        methods: allEntityVerbs
      },
      {
        ids: { orgs: 'orgId' },
        modelName: 'repo',
        path: ['orgs', '{orgId}', 'repos'],
        methods: allCollectionVerbs
      },
      {
        ids: { orgs: 'orgId' },
        isCustomFunction: true,
        path: ['orgs', '{orgId}', 'repos', 'fns', 'getTopContributors'],
        modelName: 'repo',
        methods: ['get']
      },
      {
        modelName: 'repo',
        ids: { repos: 'repoId', orgs: 'orgId' },
        path: ['orgs', '{orgId}', 'repos', '{repoId}'],
        methods: allEntityVerbs
      }
    ])
  })
})

describe('expand#belongsTo', () => {
  test('basic', () => {
    const schema = dump([
      {
        name: 'org',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'repo',
        belongsTo: 'org',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'commit',
        belongsTo: 'repo',
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'belongsTo')

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'org',
        path: ['orgs'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'org',
        ids: { orgs: 'orgId' },
        path: ['orgs', '{orgId}'],
        methods: allEntityVerbs
      },
      {
        path: ['orgs', '{orgId}', 'repos'],
        modelName: 'repo',
        methods: allCollectionVerbs,
        ids: { orgs: 'orgId' }
      },
      {
        modelName: 'repo',
        path: ['orgs', '{orgId}', 'repos', '{repoId}'],
        ids: { repos: 'repoId', orgs: 'orgId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'commit',
        path: ['orgs', '{orgId}', 'repos', '{repoId}', 'commits'],
        methods: allCollectionVerbs,
        ids: { repos: 'repoId', orgs: 'orgId' }
      },
      {
        modelName: 'commit',
        path: ['orgs', '{orgId}', 'repos', '{repoId}', 'commits', '{commitId}'],
        methods: allEntityVerbs,
        ids: { commits: 'commitId', repos: 'repoId', orgs: 'orgId' }
      }
    ])
  })

  test('with `hasMany`', () => {
    const schema = dump([
      {
        name: 'owner',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'committer',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'repo',
        hasMany: [{ name: 'owners' }],
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'commit',
        belongsTo: 'repo',
        hasMany: [{ name: 'committers' }],
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'belongsTo with hasMany')

    expect(pathView(expand(schema))).toEqual([
      'committers',
      'committers/{committerId}',
      'owners',
      'owners/{ownerId}',
      'repos',
      'repos/{repoId}',
      'repos/{repoId}/commits',
      'repos/{repoId}/commits/{commitId}',
      'repos/{repoId}/commits/{commitId}/committers',
      'repos/{repoId}/commits/{commitId}/committers/{committerId}',
      'repos/{repoId}/owners',
      'repos/{repoId}/owners/{ownerId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'committer',
        path: ['committers'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'committer',
        ids: { committers: 'committerId' },
        path: ['committers', '{committerId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        modelName: 'owner',
        path: ['owners'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'owner',
        ids: { owners: 'ownerId' },
        path: ['owners', '{ownerId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        modelName: 'repo',
        path: ['repos'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'repo',
        ids: { repos: 'repoId' },
        path: ['repos', '{repoId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'commit',
        path: ['repos', '{repoId}', 'commits'],
        ids: { repos: 'repoId' },
        methods: allCollectionVerbs
      },
      {
        modelName: 'commit',
        path: ['repos', '{repoId}', 'commits', '{commitId}'],
        ids: { commits: 'commitId', repos: 'repoId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'committer',
        path: ['repos', '{repoId}', 'commits', '{commitId}', 'committers'],
        methods: allCollectionVerbs,
        ids: { commits: 'commitId', repos: 'repoId' }
      },
      {
        modelName: 'committer',
        path: ['repos', '{repoId}', 'commits', '{commitId}', 'committers', '{committerId}'],
        methods: allEntityVerbs,
        ids: { repos: 'repoId', committers: 'committerId', commits: 'commitId' }
      },
      {
        modelName: 'owner',
        path: ['repos', '{repoId}', 'owners'],
        methods: allCollectionVerbs,
        ids: { repos: 'repoId' }
      },
      {
        modelName: 'owner',
        path: ['repos', '{repoId}', 'owners', '{ownerId}'],
        ids: { owners: 'ownerId', repos: 'repoId' },
        methods: allEntityVerbs
      }
    ])
  })
})

describe('expand#hasMany', () => {
  test('basic', () => {
    const schema = dump([
      {
        name: 'pet',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'person',
        hasMany: [{ name: 'pets' }],
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'hasMany')

    expect(pathView(expand(schema))).toEqual([
      'people',
      'people/{personId}',
      'people/{personId}/pets',
      'people/{personId}/pets/{petId}',
      'pets',
      'pets/{petId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        path: ['people'],
        modelName: 'person',
        methods: allCollectionVerbs
      },
      {
        modelName: 'person',
        ids: { people: 'personId' },
        path: ['people', '{personId}'],
        methods: allEntityVerbs
      },
      {
        path: ['people', '{personId}', 'pets'],
        modelName: 'pet',
        methods: allCollectionVerbs,
        ids: { people: 'personId' }
      },
      {
        modelName: 'pet',
        ids: { pets: 'petId', people: 'personId' },
        path: ['people', '{personId}', 'pets', '{petId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        path: ['pets'],
        modelName: 'pet',
        methods: allCollectionVerbs
      },
      {
        modelName: 'pet',
        ids: { pets: 'petId' },
        path: ['pets', '{petId}'],
        methods: allEntityVerbs
      }
    ])
  })

  test('polymorphism', () => {
    const schema = dump([
      {
        name: 'person',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'pet',
        hasMany: [
          { name: 'people', as: 'owner' },
          { name: 'people', as: 'doctor' }
        ],
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'hasMany polymorphism')

    expect(pathView(expand(schema))).toEqual([
      'people',
      'people/{personId}',
      'pets',
      'pets/{petId}',
      'pets/{petId}/doctors',
      'pets/{petId}/doctors/{doctorId}',
      'pets/{petId}/owners',
      'pets/{petId}/owners/{ownerId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        path: ['people'],
        modelName: 'person',
        methods: allCollectionVerbs
      },
      {
        modelName: 'person',
        ids: { people: 'personId' },
        path: ['people', '{personId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'pet',
        ids: {},
        path: ['pets'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'pet',
        ids: { pets: 'petId' },
        path: ['pets', '{petId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'person',
        path: ['pets', '{petId}', 'doctors'],
        methods: allCollectionVerbs,
        ids: { pets: 'petId' }
      },
      {
        modelName: 'person',
        ids: { doctors: 'doctorId', pets: 'petId' },
        path: ['pets', '{petId}', 'doctors', '{doctorId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'person',
        path: ['pets', '{petId}', 'owners'],
        methods: allCollectionVerbs,
        ids: { pets: 'petId' }
      },
      {
        modelName: 'person',
        ids: { owners: 'ownerId', pets: 'petId' },
        path: ['pets', '{petId}', 'owners', '{ownerId}'],
        methods: allEntityVerbs
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

    expect(expand(schema).models).toEqual({
      group: { properties: { name: { type: 'string' } } },
      subgroup: { properties: { name: { type: 'string' } } }
    })

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        path: ['groups'],
        modelName: 'group',
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId' },
        path: ['groups', '{groupId}'],
        methods: allEntityVerbs
      },
      {
        ids: { groups: 'groupId' },
        modelName: 'group',
        path: ['groups', '{groupId}', 'subgroups'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId', subgroups: 'subgroupId' },
        path: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        methods: allEntityVerbs
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
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'treeOf with belongsTo')

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'region',
        path: ['regions'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'region',
        ids: { regions: 'regionId' },
        path: ['regions', '{regionId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'group',
        ids: { regions: 'regionId' },
        path: ['regions', '{regionId}', 'groups'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId', regions: 'regionId' },
        path: ['regions', '{regionId}', 'groups', '{groupId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId', regions: 'regionId' },
        path: ['regions', '{regionId}', 'groups', '{groupId}', 'subgroups'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId', subgroups: 'subgroupId', regions: 'regionId' },
        path: ['regions', '{regionId}', 'groups', '{groupId}', 'subgroups', '{subgroupId}'],
        methods: allEntityVerbs
      }
    ])
  })

  test('with `hasMany`', () => {
    const schema = dump([
      {
        name: 'group',
        treeOf: 'subgroups',
        hasMany: [{ name: 'widgets' }],
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'widget',
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'treeOf with hasMany')

    expect(pathView(expand(schema))).toEqual([
      'groups',
      'groups/{groupId}',
      'groups/{groupId}/subgroups',
      'groups/{groupId}/subgroups/{subgroupId}',
      'groups/{groupId}/subgroups/{subgroupId}/widgets',
      'groups/{groupId}/subgroups/{subgroupId}/widgets/{widgetId}',
      'groups/{groupId}/widgets',
      'groups/{groupId}/widgets/{widgetId}',
      'widgets',
      'widgets/{widgetId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        path: ['groups'],
        ids: {},
        modelName: 'group',
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        path: ['groups', '{groupId}'],
        ids: { groups: 'groupId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'group',
        path: ['groups', '{groupId}', 'subgroups'],
        ids: { groups: 'groupId' },
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        path: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        ids: { groups: 'groupId', subgroups: 'subgroupId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'widget',
        path: ['groups', '{groupId}', 'subgroups', '{subgroupId}', 'widgets'],
        ids: { groups: 'groupId', subgroups: 'subgroupId' },
        methods: allCollectionVerbs
      },
      {
        modelName: 'widget',
        path: ['groups', '{groupId}', 'subgroups', '{subgroupId}', 'widgets', '{widgetId}'],
        ids: { groups: 'groupId', subgroups: 'subgroupId', widgets: 'widgetId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'widget',
        path: ['groups', '{groupId}', 'widgets'],
        ids: { groups: 'groupId' },
        methods: allCollectionVerbs
      },
      {
        modelName: 'widget',
        path: ['groups', '{groupId}', 'widgets', '{widgetId}'],
        ids: { groups: 'groupId', widgets: 'widgetId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'widget',
        path: ['widgets'],
        ids: {},
        methods: allCollectionVerbs
      },
      {
        modelName: 'widget',
        path: ['widgets', '{widgetId}'],
        ids: { widgets: 'widgetId' },
        methods: allEntityVerbs
      }
    ])
  })

  test('target of `hasMany`', () => {
    const schema = dump([
      {
        name: 'group',
        treeOf: 'subgroups',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'region',
        hasMany: [{ name: 'groups' }],
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'treeOf target of hasMany')

    expect(pathView(expand(schema))).toEqual([
      'groups',
      'groups/{groupId}',
      'groups/{groupId}/subgroups',
      'groups/{groupId}/subgroups/{subgroupId}',
      'regions',
      'regions/{regionId}',
      'regions/{regionId}/groups',
      'regions/{regionId}/groups/{groupId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'group',
        path: ['groups'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId' },
        path: ['groups', '{groupId}'],
        methods: allEntityVerbs
      },
      {
        ids: { groups: 'groupId' },
        modelName: 'group',
        path: ['groups', '{groupId}', 'subgroups'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId', subgroups: 'subgroupId' },
        path: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        path: ['regions'],
        modelName: 'region',
        methods: allCollectionVerbs
      },
      {
        modelName: 'region',
        ids: { regions: 'regionId' },
        path: ['regions', '{regionId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'group',
        ids: { regions: 'regionId' },
        path: ['regions', '{regionId}', 'groups'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId', regions: 'regionId' },
        path: ['regions', '{regionId}', 'groups', '{groupId}'],
        methods: allEntityVerbs
      }
    ])
  })
})

describe('expand#users', () => {
  test('with `belongsTo`', () => {
    const schema = dump([
      {
        name: 'user',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'course',
        belongsTo: 'user',
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'users with belongsTo')

    expect(pathView(expand(schema))).toEqual([
      'users',
      'users/courses',
      'users/courses/{courseId}',
      'users/{userId}',
      'users/{userId}/courses',
      'users/{userId}/courses/{courseId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'user',
        path: ['users'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'course',
        ids: { courses: 'courseId' },
        path: ['users', 'courses'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'course',
        ids: { courses: 'courseId' },
        path: ['users', 'courses', '{courseId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'user',
        ids: { users: 'userId' },
        path: ['users', '{userId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'course',
        ids: { users: 'userId' },
        path: ['users', '{userId}', 'courses'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'course',
        ids: { users: 'userId', courses: 'courseId' },
        path: ['users', '{userId}', 'courses', '{courseId}'],
        methods: allEntityVerbs
      }
    ])
  })

  test('with `hasMany`', () => {
    const schema = dump([
      {
        name: 'course',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'user',
        hasMany: [{ name: 'courses' }],
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'users with hasMany')

    expect(pathView(expand(schema))).toEqual([
      'courses',
      'courses/{courseId}',
      'users',
      'users/courses',
      'users/courses/{courseId}',
      'users/{userId}',
      'users/{userId}/courses',
      'users/{userId}/courses/{courseId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        path: ['courses'],
        methods: allCollectionVerbs,
        modelName: 'course'
      },
      {
        ids: { courses: 'courseId' },
        path: ['courses', '{courseId}'],
        methods: allEntityVerbs,
        modelName: 'course'
      },
      {
        ids: {},
        path: ['users'],
        methods: allCollectionVerbs,
        modelName: 'user'
      },
      {
        path: ['users', 'courses'],
        methods: allCollectionVerbs,
        ids: {},
        modelName: 'course'
      },
      {
        ids: { courses: 'courseId' },
        path: ['users', 'courses', '{courseId}'],
        modelName: 'course',
        methods: allEntityVerbs
      },
      {
        ids: { users: 'userId' },
        path: ['users', '{userId}'],
        modelName: 'user',
        methods: allEntityVerbs
      },
      {
        path: ['users', '{userId}', 'courses'],
        methods: allCollectionVerbs,
        ids: { users: 'userId' },
        modelName: 'course'
      },
      {
        ids: { courses: 'courseId', users: 'userId' },
        path: ['users', '{userId}', 'courses', '{courseId}'],
        modelName: 'course',
        methods: allEntityVerbs
      }
    ])
  })

  test('with polymorphic `hasMany`', () => {
    const schema = dump([
      {
        name: 'course',
        model: {
          properties: { name: { type: 'string' } }
        }
      },
      {
        name: 'user',
        hasMany: [
          { name: 'courses', as: 'contributor' },
          { name: 'courses', as: 'learner' }
        ],
        model: {
          properties: { name: { type: 'string' } }
        }
      }
    ], 'users with polymorphic hasMany')

    expect(pathView(expand(schema))).toEqual([
      'courses',
      'courses/{courseId}',
      'users',
      'users/contributors',
      'users/contributors/{contributorId}',
      'users/learners',
      'users/learners/{learnerId}',
      'users/{userId}',
      'users/{userId}/contributors',
      'users/{userId}/contributors/{contributorId}',
      'users/{userId}/learners',
      'users/{userId}/learners/{learnerId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        path: ['courses'],
        modelName: 'course',
        methods: allCollectionVerbs
      },
      {
        modelName: 'course',
        ids: { courses: 'courseId' },
        path: ['courses', '{courseId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        modelName: 'user',
        path: ['users'],
        methods: allCollectionVerbs
      },
      {
        path: ['users', 'contributors'],
        modelName: 'course',
        methods: allCollectionVerbs,
        ids: {}
      },
      {
        ids: { contributors: 'contributorId' },
        modelName: 'course',
        path: ['users', 'contributors', '{contributorId}'],
        methods: allEntityVerbs
      },
      {
        path: ['users', 'learners'],
        modelName: 'course',
        methods: allCollectionVerbs,
        ids: {}
      },
      {
        ids: { learners: 'learnerId' },
        modelName: 'course',
        path: ['users', 'learners', '{learnerId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'user',
        ids: { users: 'userId' },
        path: ['users', '{userId}'],
        methods: allEntityVerbs
      },
      {
        path: ['users', '{userId}', 'contributors'],
        modelName: 'course',
        methods: allCollectionVerbs,
        ids: { users: 'userId' }
      },
      {
        ids: { contributors: 'contributorId', users: 'userId' },
        modelName: 'course',
        path: ['users', '{userId}', 'contributors', '{contributorId}'],
        methods: allEntityVerbs
      },
      {
        path: ['users', '{userId}', 'learners'],
        modelName: 'course',
        methods: allCollectionVerbs,
        ids: { users: 'userId' }
      },
      {
        ids: { learners: 'learnerId', users: 'userId' },
        modelName: 'course',
        path: ['users', '{userId}', 'learners', '{learnerId}'],
        methods: allEntityVerbs
      }
    ])
  })
})
