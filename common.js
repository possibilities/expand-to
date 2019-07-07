module.exports.allEntityVerbs = ['head', 'get', 'put', 'patch', 'delete']

module.exports.allCollectionVerbs = ['list', 'post']

module.exports.emptyResponse = { type: 'object' }

module.exports.errorResponse = {
  type: 'object',
  properties: {
    code: {
      type: 'number',
      readOnly: true
    },
    message: {
      type: 'string',
      readOnly: true
    },
    status: {
      type: 'string',
      readOnly: true
    },
    details: {
      type: 'array',
      items: { type: 'string' },
      readOnly: true
    }
  },
  required: [
    'statusCode',
    'message'
  ]
}

module.exports.paginationResponse = {
  type: 'object',
  properties: { nextPageToken: { type: 'string', format: 'uuid' }, },
  required: ['nextPageToken']
}

module.exports.errors = {
  badRequest: {
    code: 400,
    description: 'Bad request'
  },
  unauthorized: {
    code: 401,
    description: 'Unauthorized'
  },
  forbidden: {
    code: 403,
    description: 'Forbidden'
  },
  notFound: {
    code: 404,
    description: 'Not found'
  }
}

module.exports.emptyResponseActions = { head: true, delete: true }

module.exports.emptyRequestActions = {
  list: true,
  delete: true,
  head: true,
  get: true
}
