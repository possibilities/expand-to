const initial = require('lodash/initial')
const last = require('lodash/last')
const upperFirst = require('lodash/upperFirst')
const getNamespace = require('./getNamespace')
const inflection = require('inflection')

// Make map safe
const singularize = str => inflection.singularize(str)

const labelToVerb = {
  post: 'create',
  head: 'check',
  put: 'replace',
  patch: 'update'
}

const getSummary = (verb, resource) => {
  if (resource.isCustomFunction) {
    return `Invoke \`${last(resource.path)}\` for ${resource.path[0]}`
  }
  const namespace = getNamespace(resource)
  const noun = last(namespace)
  const space = initial(namespace)
  return [
    upperFirst(labelToVerb[verb] || verb),
    ...space.map(singularize),
    verb === 'list' ? noun : singularize(noun)
  ].filter(Boolean).join(' ')
}

module.exports = getSummary
