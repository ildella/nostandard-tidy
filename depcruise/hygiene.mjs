// Generic hygiene rules (recommended-strict, all error).
// Project exceptions are passed in as options.

const deprecatedCore = [
  '^v8/tools/codemap$',
  '^v8/tools/consarray$',
  '^v8/tools/csvparser$',
  '^v8/tools/logreader$',
  '^v8/tools/profile_view$',
  '^v8/tools/profile$',
  '^v8/tools/SourceMap$',
  '^v8/tools/splaytree$',
  '^v8/tools/tickprocessor-driver$',
  '^v8/tools/tickprocessor$',
  '^node-inspect/lib/_inspect$',
  '^node-inspect/lib/internal/inspect_client$',
  '^node-inspect/lib/internal/inspect_repl$',
  '^async_hooks$',
  '^punycode$',
  '^domain$',
  '^constants$',
  '^sys$',
  '^_linklist$',
  '^_stream_wrap$',
]

const specPath = '[.](?:spec|test)[.]js$'

const modules = ({orphansPathNot = [], unresolvablePathNot = []}) => [
  {
    name: 'no-orphans',
    severity: 'error',
    from: {orphan: true, pathNot: orphansPathNot},
    to: {},
  },
  {
    name: 'not-to-unresolvable',
    severity: 'error',
    from: {},
    to: {couldNotResolve: true, pathNot: unresolvablePathNot},
  },
]

const packages = () => [
  {
    name: 'no-deprecated-core',
    severity: 'error',
    from: {},
    to: {dependencyTypes: ['core'], path: deprecatedCore},
  },
  {
    name: 'not-to-deprecated',
    severity: 'error',
    from: {},
    to: {dependencyTypes: ['deprecated']},
  },
  {
    name: 'no-non-package-json',
    severity: 'error',
    from: {},
    to: {dependencyTypes: ['npm-no-pkg', 'npm-unknown']},
  },
  {
    name: 'no-duplicate-dep-types',
    severity: 'error',
    from: {},
    to: {moreThanOneDependencyType: true, dependencyTypesNot: ['type-only']},
  },
  {
    name: 'optional-deps-used',
    severity: 'info',
    from: {},
    to: {dependencyTypes: ['npm-optional']},
  },
  {
    name: 'peer-deps-used',
    severity: 'error',
    from: {},
    to: {dependencyTypes: ['npm-peer']},
  },
]

const tests = ({
  srcPath = '^(src)',
  testsPath = '^(tests)',
  devDepPathNot = [],
}) => [
  {
    name: 'not-to-test',
    severity: 'error',
    from: {pathNot: testsPath},
    to: {path: testsPath},
  },
  {
    name: 'not-to-spec',
    severity: 'error',
    from: {},
    to: {path: specPath},
  },
  {
    name: 'not-to-dev-dep',
    severity: 'error',
    from: {path: srcPath, pathNot: specPath},
    to: {
      dependencyTypes: ['npm-dev'],
      dependencyTypesNot: ['type-only'],
      pathNot: ['node_modules/@types/', ...devDepPathNot],
    },
  },
]

export const hygiene = (options = {}) => [
  ...modules(options),
  ...packages(),
  ...tests(options),
]
