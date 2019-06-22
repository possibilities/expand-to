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
  .map(resource => [...resource.mountPath, ...resource.path].join('/')).sort()

const expandedView = schema => sortBy(
  schema.paths,
  schema => [...schema.mountPath, ...schema.path].join('/')
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
        mountPath: [],
        path: ['pets'],
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'pet',
        ids: { pets: 'petId' },
        path: ['pets', '{petId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        modelName: 'store',
        mountPath: [],
        path: ['stores'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'store',
        mountPath: [],
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
        mountPath: [],
        path: ['people'],
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
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
        mountPath: [],
        path: ['pets'],
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
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
      'pets/requestMedicalRecords',
      'pets/{petId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'pet',
        mountPath: [],
        path: ['pets'],
        methods: allCollectionVerbs
      },
      {
        ids: {},
        mountPath: [],
        isCustomFunction: true,
        path: ['pets', 'requestMedicalRecords'],
        modelName: 'pet',
        methods: ['get']
      },
      {
        modelName: 'pet',
        mountPath: [],
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
      'orgs/{orgId}/repos/getTopContributors',
      'orgs/{orgId}/repos/{repoId}'
    ])

    expect(expandedView(expand(schema))).toEqual([
      {
        ids: {},
        modelName: 'org',
        mountPath: [],
        path: ['orgs'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'org',
        mountPath: [],
        ids: { orgs: 'orgId' },
        path: ['orgs', '{orgId}'],
        methods: allEntityVerbs
      },
      {
        ids: { orgs: 'orgId' },
        modelName: 'repo',
        mountPath: ['orgs', '{orgId}'],
        path: ['repos'],
        methods: allCollectionVerbs
      },
      {
        ids: { orgs: 'orgId' },
        mountPath: ['orgs', '{orgId}'],
        isCustomFunction: true,
        path: ['repos', 'getTopContributors'],
        modelName: 'repo',
        methods: ['get']
      },
      {
        modelName: 'repo',
        mountPath: ['orgs', '{orgId}'],
        ids: { repos: 'repoId', orgs: 'orgId' },
        path: ['repos', '{repoId}'],
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
        mountPath: [],
        path: ['orgs'],
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'org',
        ids: { orgs: 'orgId' },
        path: ['orgs', '{orgId}'],
        methods: allEntityVerbs
      },
      {
        path: ['repos'],
        modelName: 'repo',
        methods: allCollectionVerbs,
        mountPath: ['orgs', '{orgId}'],
        ids: { orgs: 'orgId' }
      },
      {
        modelName: 'repo',
        path: ['repos', '{repoId}'],
        mountPath: ['orgs', '{orgId}'],
        ids: { repos: 'repoId', orgs: 'orgId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'commit',
        path: ['commits'],
        methods: allCollectionVerbs,
        ids: { repos: 'repoId', orgs: 'orgId' },
        mountPath: ['orgs', '{orgId}', 'repos', '{repoId}']
      },
      {
        modelName: 'commit',
        path: ['commits', '{commitId}'],
        methods: allEntityVerbs,
        mountPath: ['orgs', '{orgId}', 'repos', '{repoId}'],
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
        mountPath: [],
        modelName: 'committer',
        path: ['committers'],
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'committer',
        ids: { committers: 'committerId' },
        path: ['committers', '{committerId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        mountPath: [],
        modelName: 'owner',
        path: ['owners'],
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'owner',
        ids: { owners: 'ownerId' },
        path: ['owners', '{ownerId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        modelName: 'repo',
        mountPath: [],
        path: ['repos'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'repo',
        mountPath: [],
        ids: { repos: 'repoId' },
        path: ['repos', '{repoId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'commit',
        path: ['commits'],
        ids: { repos: 'repoId' },
        methods: allCollectionVerbs,
        mountPath: ['repos', '{repoId}']
      },
      {
        modelName: 'commit',
        path: ['commits', '{commitId}'],
        mountPath: ['repos', '{repoId}'],
        ids: { commits: 'commitId', repos: 'repoId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'committer',
        path: ['committers'],
        methods: allCollectionVerbs,
        ids: { commits: 'commitId', repos: 'repoId' },
        mountPath: ['repos', '{repoId}', 'commits', '{commitId}']
      },
      {
        modelName: 'committer',
        mountPath: ['repos', '{repoId}', 'commits', '{commitId}'],
        path: ['committers', '{committerId}'],
        methods: allEntityVerbs,
        ids: { repos: 'repoId', committers: 'committerId', commits: 'commitId' }
      },
      {
        modelName: 'owner',
        path: ['owners'],
        methods: allCollectionVerbs,
        mountPath: ['repos', '{repoId}'],
        ids: { repos: 'repoId' }
      },
      {
        modelName: 'owner',
        path: ['owners', '{ownerId}'],
        mountPath: ['repos', '{repoId}'],
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
        mountPath: [],
        path: ['people'],
        modelName: 'person',
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'person',
        ids: { people: 'personId' },
        path: ['people', '{personId}'],
        methods: allEntityVerbs
      },
      {
        path: ['pets'],
        modelName: 'pet',
        methods: allCollectionVerbs,
        ids: { people: 'personId' },
        mountPath: ['people', '{personId}']
      },
      {
        modelName: 'pet',
        ids: { pets: 'petId', people: 'personId' },
        path: ['pets', '{petId}'],
        mountPath: ['people', '{personId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        mountPath: [],
        path: ['pets'],
        modelName: 'pet',
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
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
        mountPath: [],
        path: ['people'],
        modelName: 'person',
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'person',
        ids: { people: 'personId' },
        path: ['people', '{personId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'pet',
        ids: {},
        mountPath: [],
        path: ['pets'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'pet',
        mountPath: [],
        ids: { pets: 'petId' },
        path: ['pets', '{petId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'person',
        path: ['doctors'],
        methods: allCollectionVerbs,
        ids: { pets: 'petId' },
        mountPath: ['pets', '{petId}']
      },
      {
        modelName: 'person',
        ids: { doctors: 'doctorId', pets: 'petId' },
        path: ['doctors', '{doctorId}'],
        mountPath: ['pets', '{petId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'person',
        path: ['owners'],
        methods: allCollectionVerbs,
        ids: { pets: 'petId' },
        mountPath: ['pets', '{petId}']
      },
      {
        modelName: 'person',
        ids: { owners: 'ownerId', pets: 'petId' },
        path: ['owners', '{ownerId}'],
        mountPath: ['pets', '{petId}'],
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
        mountPath: [],
        path: ['groups'],
        modelName: 'group',
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'group',
        ids: { groups: 'groupId' },
        path: ['groups', '{groupId}'],
        methods: allEntityVerbs
      },
      {
        ids: { groups: 'groupId' },
        modelName: 'group',
        path: ['subgroups'],
        methods: allCollectionVerbs,
        mountPath: ['groups', '{groupId}']
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId', subgroups: 'subgroupId' },
        path: ['subgroups', '{subgroupId}'],
        methods: allEntityVerbs,
        mountPath: ['groups', '{groupId}']
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
        mountPath: [],
        modelName: 'region',
        path: ['regions'],
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'region',
        ids: { regions: 'regionId' },
        path: ['regions', '{regionId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'group',
        ids: { regions: 'regionId' },
        mountPath: ['regions', '{regionId}'],
        path: ['groups'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        mountPath: ['regions', '{regionId}'],
        ids: { groups: 'groupId', regions: 'regionId' },
        path: ['groups', '{groupId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId', regions: 'regionId' },
        path: ['subgroups'],
        methods: allCollectionVerbs,
        mountPath: ['regions', '{regionId}', 'groups', '{groupId}']
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId', subgroups: 'subgroupId', regions: 'regionId' },
        path: ['subgroups', '{subgroupId}'],
        methods: allEntityVerbs,
        mountPath: ['regions', '{regionId}', 'groups', '{groupId}']
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
        mountPath: [],
        ids: {},
        modelName: 'group',
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        path: ['groups', '{groupId}'],
        mountPath: [],
        ids: { groups: 'groupId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'group',
        path: ['subgroups'],
        mountPath: ['groups', '{groupId}'],
        ids: { groups: 'groupId' },
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        path: ['subgroups', '{subgroupId}'],
        mountPath: ['groups', '{groupId}'],
        ids: { groups: 'groupId', subgroups: 'subgroupId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'widget',
        path: ['widgets'],
        mountPath: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        ids: { groups: 'groupId', subgroups: 'subgroupId' },
        methods: allCollectionVerbs
      },
      {
        modelName: 'widget',
        path: ['widgets', '{widgetId}'],
        mountPath: ['groups', '{groupId}', 'subgroups', '{subgroupId}'],
        ids: { groups: 'groupId', subgroups: 'subgroupId', widgets: 'widgetId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'widget',
        path: ['widgets'],
        mountPath: ['groups', '{groupId}'],
        ids: { groups: 'groupId' },
        methods: allCollectionVerbs
      },
      {
        modelName: 'widget',
        path: ['widgets', '{widgetId}'],
        mountPath: ['groups', '{groupId}'],
        ids: { groups: 'groupId', widgets: 'widgetId' },
        methods: allEntityVerbs
      },
      {
        modelName: 'widget',
        path: ['widgets'],
        mountPath: [],
        ids: {},
        methods: allCollectionVerbs
      },
      {
        modelName: 'widget',
        path: ['widgets', '{widgetId}'],
        mountPath: [],
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
        mountPath: [],
        modelName: 'group',
        path: ['groups'],
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'group',
        ids: { groups: 'groupId' },
        path: ['groups', '{groupId}'],
        methods: allEntityVerbs
      },
      {
        ids: { groups: 'groupId' },
        modelName: 'group',
        path: ['subgroups'],
        methods: allCollectionVerbs,
        mountPath: ['groups', '{groupId}']
      },
      {
        modelName: 'group',
        ids: { groups: 'groupId', subgroups: 'subgroupId' },
        path: ['subgroups', '{subgroupId}'],
        methods: allEntityVerbs,
        mountPath: ['groups', '{groupId}']
      },
      {
        ids: {},
        mountPath: [],
        path: ['regions'],
        modelName: 'region',
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'region',
        ids: { regions: 'regionId' },
        path: ['regions', '{regionId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'group',
        ids: { regions: 'regionId' },
        mountPath: ['regions', '{regionId}'],
        path: ['groups'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'group',
        mountPath: ['regions', '{regionId}'],
        ids: { groups: 'groupId', regions: 'regionId' },
        path: ['groups', '{groupId}'],
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
        mountPath: [],
        path: ['users'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'course',
        mountPath: ['users'],
        ids: { courses: 'courseId' },
        path: ['courses'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'course',
        mountPath: ['users'],
        ids: { courses: 'courseId' },
        path: ['courses', '{courseId}'],
        methods: allEntityVerbs
      },
      {
        mountPath: [],
        modelName: 'user',
        ids: { users: 'userId' },
        path: ['users', '{userId}'],
        methods: allEntityVerbs
      },
      {
        modelName: 'course',
        mountPath: ['users', '{userId}'],
        ids: { users: 'userId' },
        path: ['courses'],
        methods: allCollectionVerbs
      },
      {
        modelName: 'course',
        mountPath: ['users', '{userId}'],
        ids: { users: 'userId', courses: 'courseId' },
        path: ['courses', '{courseId}'],
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
        mountPath: [],
        path: ['courses'],
        methods: allCollectionVerbs,
        modelName: 'course'
      },
      {
        mountPath: [],
        ids: { courses: 'courseId' },
        path: ['courses', '{courseId}'],
        methods: allEntityVerbs,
        modelName: 'course'
      },
      {
        ids: {},
        mountPath: [],
        path: ['users'],
        methods: allCollectionVerbs,
        modelName: 'user'
      },
      {
        path: ['courses'],
        methods: allCollectionVerbs,
        ids: {},
        modelName: 'course',
        mountPath: ['users']
      },
      {
        ids: { courses: 'courseId' },
        path: ['courses', '{courseId}'],
        mountPath: ['users'],
        modelName: 'course',
        methods: allEntityVerbs
      },
      {
        mountPath: [],
        ids: { users: 'userId' },
        path: ['users', '{userId}'],
        modelName: 'user',
        methods: allEntityVerbs
      },
      {
        path: ['courses'],
        methods: allCollectionVerbs,
        ids: { users: 'userId' },
        modelName: 'course',
        mountPath: ['users', '{userId}']
      },
      {
        ids: { courses: 'courseId', users: 'userId' },
        path: ['courses', '{courseId}'],
        mountPath: ['users', '{userId}'],
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
        mountPath: [],
        path: ['courses'],
        modelName: 'course',
        methods: allCollectionVerbs
      },
      {
        mountPath: [],
        modelName: 'course',
        ids: { courses: 'courseId' },
        path: ['courses', '{courseId}'],
        methods: allEntityVerbs
      },
      {
        ids: {},
        mountPath: [],
        modelName: 'user',
        path: ['users'],
        methods: allCollectionVerbs
      },
      {
        path: ['contributors'],
        modelName: 'course',
        methods: allCollectionVerbs,
        ids: {},
        mountPath: ['users']
      },
      {
        ids: { contributors: 'contributorId' },
        modelName: 'course',
        path: ['contributors', '{contributorId}'],
        mountPath: ['users'],
        methods: allEntityVerbs
      },
      {
        path: ['learners'],
        modelName: 'course',
        methods: allCollectionVerbs,
        ids: {},
        mountPath: ['users']
      },
      {
        ids: { learners: 'learnerId' },
        modelName: 'course',
        path: ['learners', '{learnerId}'],
        mountPath: ['users'],
        methods: allEntityVerbs
      },
      {
        mountPath: [],
        modelName: 'user',
        ids: { users: 'userId' },
        path: ['users', '{userId}'],
        methods: allEntityVerbs
      },
      {
        path: ['contributors'],
        modelName: 'course',
        methods: allCollectionVerbs,
        ids: { users: 'userId' },
        mountPath: ['users', '{userId}']
      },
      {
        ids: { contributors: 'contributorId', users: 'userId' },
        modelName: 'course',
        path: ['contributors', '{contributorId}'],
        mountPath: ['users', '{userId}'],
        methods: allEntityVerbs
      },
      {
        path: ['learners'],
        modelName: 'course',
        methods: allCollectionVerbs,
        ids: { users: 'userId' },
        mountPath: ['users', '{userId}']
      },
      {
        ids: { learners: 'learnerId', users: 'userId' },
        modelName: 'course',
        path: ['learners', '{learnerId}'],
        mountPath: ['users', '{userId}'],
        methods: allEntityVerbs
      }
    ])
  })
})
