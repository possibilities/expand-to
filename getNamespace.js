const memoize = require('lodash/memoize')

const getNamespace = memoize(
  resource => resource.path.filter(p => !p.startsWith('{'))
)

module.exports = getNamespace
