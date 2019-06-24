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
  properties: {
    firstPage: { type: 'number' },
    lastPage: { type: 'number' },
    nextPage: { type: 'number' },
    prevPage: { type: 'number' }
  },
  required: ['firstPage', 'lastPage', 'nextPage', 'prevPage']
}

module.exports.errors = {
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404
}
