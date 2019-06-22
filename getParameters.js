const forEach = require('lodash/forEach')
const upperFirst = require('lodash/upperFirst')
const { paginationParameters } = require('./common')

const getParameters = (type, resource) => {
  let params = []

  forEach(resource.ids, (idName, resourceName) => {
    params.push({
      in: 'path',
      name: idName,
      description: upperFirst(resourceName) + ' id',
      schema: { type: 'string', format: 'uuid' },
      required: true
    })
  })

  if (type === 'list') {
    params = [...params, ...paginationParameters]
  }

  return params
}

module.exports = getParameters
