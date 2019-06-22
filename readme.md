### Expand-to

Tools for expanding JSON-schema models into dev/build/test/run-time application tools

### Features

* `belongsTo`: nests one resource inside another
* `hasMany`: adds routes for one-to-many relationships
* `hasMany` + `as`: adds routes for polymorphic one-to-many relationships
* `name: user` + `hasMany`: a nested a copy of `hasMany` routes are added to the user resource for accessing via the users' implicit identity
* `treeOf`: adds routes for accessing and mutating a hierarchical resource
* `immutable: true`: omits methods that would mutate the resource
* `versioned: true`: adds routes for listing, accessing, and restoring versioned entities (TODO)
* `undeletable: true`: adds routes for listing, accessing, and undeleting soft deleted entities (TODO)

### API

###### `expand(resources)`
###### `expandToOpenApi(resources, info)`

#### Resource helpers

###### `getOperationId(verb, resource)`
###### `getTags(verb, resource)`
###### `getNamespace(verb, resource)`
###### `getParameters(verb, resource)`
