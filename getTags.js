const first = require('lodash/first')
const getNamespace = require('./getNamespace')

const getTags = (verb, resource) => {
  const namespace = getNamespace(resource)
  return resource.isCustomFunction
    ? [first(namespace)]
    : namespace
}

module.exports = getTags
