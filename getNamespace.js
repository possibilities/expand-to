const memoize = require('lodash/memoize')

const getNamespace = memoize(resource => {
  return [...resource.mountPath, ...resource.path]
    .filter(p => !p.startsWith('{'))
})

module.exports = getNamespace
