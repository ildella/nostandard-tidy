// Generic cruise options.
export const baseOptions = {
  doNotFollow: {path: ['node_modules']},
  moduleSystems: ['es6'],
  detectProcessBuiltinModuleCalls: true,
  skipAnalysisNotInRules: true,
  reporterOptions: {
    dot: {
      collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)',
    },
    archi: {
      collapsePattern:
        '^(?:packages|src|lib(s?)|app(s?)|bin|test(s?)|spec(s?))/' +
        '[^/]+|node_modules/(?:@[^/]+/[^/]+|[^/]+)',
    },
    text: {highlightFocused: true},
  },
}

// Svelte resolution preset.
export const svelteResolve = {
  exportsFields: ['exports'],
  conditionNames: ['svelte', 'import', 'require', 'node', 'default'],
  extensions: ['.js', '.svelte'],
  mainFields: ['module', 'main'],
}
