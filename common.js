module.exports.allEntityVerbs = ['head', 'get', 'put', 'patch', 'delete']

module.exports.allCollectionVerbs = ['list', 'post']

const collectionErrors = module.exports.collectionErrors = {
  400: {
    description: 'Bad request',
    content: {
      'application/json': {
        schema: {
          '$ref': '#/components/schemas/ErrorOutput'
        }
      }
    }
  },
  401: {
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: {
          '$ref': '#/components/schemas/ErrorOutput'
        }
      }
    }
  },
  403: {
    description: 'Forbidden',
    content: {
      'application/json': {
        schema: {
          '$ref': '#/components/schemas/ErrorOutput'
        }
      }
    }
  }
}

module.exports.entityErrors = {
  ...collectionErrors,
  404: {
    description: 'Not found',
    content: {
      'application/json': {
        schema: {
          '$ref': '#/components/schemas/ErrorOutput'
        }
      }
    }
  }
}

module.exports.paginationParameters = [
  {
    in: 'query',
    name: 'perPage',
    description: 'Per page',
    schema: { type: 'string' }
  },
  {
    in: 'query',
    name: 'page',
    description: 'Page number',
    schema: { type: 'string' }
  },
  {
    in: 'query',
    name: 'orderBy',
    description: 'Order by',
    schema: { type: 'string' }
  }
]

module.exports.emptyOutput = { type: 'object' }

module.exports.errorOutput = {
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
