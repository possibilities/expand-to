const getNamespace = require('./getNamespace')
const initial = require('lodash/initial')
const last = require('lodash/last')
const upperFirst = require('lodash/upperFirst')
const inflection = require('inflection')

// Make map safe
const singularize = str => inflection.singularize(str)

const labelToVerb = {
  post: 'create',
  head: 'check',
  put: 'replace',
  patch: 'update'
}

const getOperationId = (verb, resource) => {
  const namespace = getNamespace(resource).map(upperFirst)
  if (resource.isCustomFunction) {
    return `${resource.path[1]}For${upperFirst(resource.path[0])}`
  }
  const noun = last(namespace)
  const space = initial(namespace)
  return [
    labelToVerb[verb] || verb,
    ...space.map(singularize),
    verb === 'list' ? noun : singularize(noun)
  ].join('')
}

module.exports = getOperationId
