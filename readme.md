# Expand-to [![CircleCI](https://circleci.com/gh/possibilities/expand-to.svg?style=svg)](https://circleci.com/gh/possibilities/expand-to)

Tools for transforming JSON-schema models into dev/build/test/run-time application tools

### Features

* `belongsTo` → nests one resource inside another
* `hasMany` → adds routes for one-to-many relationships
* `hasMany` + `as` → adds routes for polymorphic one-to-many relationships
* `name: user` + `hasMany` → a nested a copy of `hasMany` routes are added to the user resource for accessing via the users' implicit identity
* `treeOf` → adds routes for accessing and mutating a hierarchical resource
* `immutable: true` → omits methods that would mutate the resource
* `versioned: true` → adds routes for listing, accessing, and restoring versioned entities (TODO)
* `undeletable: true` → adds routes for listing, accessing, and undeleting soft deleted entities (TODO)

### Examples

Test suite examples are dumped in OpenAPI format:

* Basic: [input](examples/basic.input.yml)/[output](examples/basic.output.yml)
* Belong to: [input](examples/hasmany.input.yml)/[output](examples/hasmany.output.yml)
* Has many: [input](examples/belongsto.input.yml)/[output](examples/belongsto.output.yml)
* Tree of: [input](examples/treeof.input.yml)/[output](examples/treeof.output.yml)

See [examples dir](examples/) for more examples

### API

A single low level function is provided to tranform a spec into a raw description of the resources and models. Usually this will not be called directly.

* `expandToResources(spec, config = {})` → `{ paths, models }`

The most common use case is to use the following functions that take a spec and an optional config and return an object that is useful to your application.

* `expandToOperations(spec, config = {})` → `{ paths, models, operations }`
* `expandToOpenApi(spec, config = {})` → `openApiSpec`

Alternatively each core API function exposes a lower level function that can be used to compose your own custom tranformations.

* `expandToOperations({ paths, models }, config = {})` → `{ paths, models, operations }`
* `expandToOpenApi({ operations, models }, config = {})` → `{ operations, models, spec }`
