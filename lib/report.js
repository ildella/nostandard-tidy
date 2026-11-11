const deadKeys = [
  'unused_files', 'unused_exports', 'unused_types', 'unused_enum_members',
  'unused_class_members', 'unused_store_members', 'unprovided_injects',
  'unrendered_components', 'unused_component_props', 'absent_component_props',
  'unused_component_emits', 'unused_component_inputs', 'unused_component_outputs',
  'unused_svelte_events', 'unused_effect_layers', 'unused_tagged_errors',
  'unproduced_catch_tags', 'unused_server_actions', 'unused_load_data_keys',
  'duplicate_exports', 'unused_dependencies', 'unused_dev_dependencies',
  'unused_optional_dependencies', 'unresolved_imports', 'unlisted_dependencies',
  'type_only_dependencies', 'test_only_dependencies', 'dev_dependencies_in_production',
  'stale_suppressions', 'unused_catalog_entries', 'empty_catalog_groups',
  'unresolved_catalog_references', 'unused_dependency_overrides',
  'misconfigured_dependency_overrides', 'invalid_client_exports',
  'mixed_client_server_barrels', 'misplaced_directives', 'route_collisions',
  'dynamic_segment_name_conflicts',
]

const archKeys = [
  'circular_dependencies', 're_export_cycles', 'package_cycles',
  'boundary_violations', 'boundary_coverage_violations', 'boundary_call_violations',
  'policy_violations',
]

const ruleNames = {
  unused_files: 'unused files',
  unused_exports: 'unused exports',
  unused_types: 'unused types',
  unused_enum_members: 'unused enum members',
  unused_class_members: 'unused class members',
  unused_store_members: 'unused store members',
  unprovided_injects: 'unprovided injects',
  unrendered_components: 'unrendered components',
  unused_component_props: 'unused component props',
  absent_component_props: 'absent component props',
  unused_component_emits: 'unused component emits',
  unused_component_inputs: 'unused component inputs',
  unused_component_outputs: 'unused component outputs',
  unused_svelte_events: 'unused svelte events',
  unused_effect_layers: 'unused effect layers',
  unused_tagged_errors: 'unused tagged errors',
  unproduced_catch_tags: 'unproduced catch tags',
  unused_server_actions: 'unused server actions',
  unused_load_data_keys: 'unused load data keys',
  duplicate_exports: 'duplicate exports',
  unused_dependencies: 'unused dependencies',
  unused_dev_dependencies: 'unused dev dependencies',
  unused_optional_dependencies: 'unused optional dependencies',
  unresolved_imports: 'unresolved imports',
  unlisted_dependencies: 'unlisted dependencies',
  type_only_dependencies: 'type-only dependencies',
  test_only_dependencies: 'test-only dependencies',
  dev_dependencies_in_production: 'dev dependencies in production',
  stale_suppressions: 'stale suppressions',
  unused_catalog_entries: 'unused catalog entries',
  empty_catalog_groups: 'empty catalog groups',
  unresolved_catalog_references: 'unresolved catalog references',
  unused_dependency_overrides: 'unused dependency overrides',
  misconfigured_dependency_overrides: 'misconfigured dependency overrides',
  invalid_client_exports: 'invalid client exports',
  mixed_client_server_barrels: 'mixed client server barrels',
  misplaced_directives: 'misplaced directives',
  route_collisions: 'route collisions',
  dynamic_segment_name_conflicts: 'dynamic segment name conflicts',
  circular_dependencies: 'circular dependencies',
  re_export_cycles: 're-export cycles',
  package_cycles: 'package cycles',
  boundary_violations: 'boundary violations',
  boundary_coverage_violations: 'boundary coverage violations',
  boundary_call_violations: 'boundary call violations',
  policy_violations: 'policy violations',
  'css-token-drift': 'token drift',
  'css-duplicate-block': 'duplicate blocks',
  'css-selector-complexity': 'selector complexity',
  'css-dead-surface': 'dead surface',
  'css-broken-reference': 'broken references',
}

const penaltyNames = {
  p90_complexity: 'p90 complexity',
  unused_deps: 'unused deps',
  circular_deps: 'circular deps',
  unit_size: 'unit size',
  dead_files: 'dead files',
  dead_exports: 'dead exports',
}

const identityRuleNames = {
  'unused-export': 'unused export',
  'unused-class-member': 'unused class member',
  'unused-dependency': 'unused dependency',
  'unused-dev-dependency': 'unused dev dependency',
  'test-only-dependency': 'test-only dependency',
  'duplicate-export': 'duplicate export',
  'stale-suppression': 'stale suppression',
}

const severityRank = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
  error: 4,
  warn: 5,
}

const round1 = (value) => Math.round(value * 10) / 10

const line = (label, value) => `  ${label.padEnd(14)}${value}`

const categoryLine = (label, value) => `  ${label.padEnd(18)}${value}`

const ruleName = (key) => ruleNames[key] ?? key.replace(/_/g, ' ')

const sum = (values) => values.reduce((total, value) => total + value, 0)

const rowsFromKeys = (doc, keys) =>
  keys.flatMap((key) => (doc[key] ?? []).map((finding) => ({
    key,
    severity: finding.effective_severity ?? 'error',
  })))

const complexityRows = (doc) =>
  (doc.findings ?? []).map((finding) => ({
    key: finding.severity ?? 'unknown',
    severity: finding.effective_severity ?? 'warn',
  }))

const stylingRows = (doc) =>
  (doc.styling_findings ?? []).map((finding) => ({
    key: finding.code ?? 'unknown',
    severity: finding.effective_severity ?? 'warn',
  }))

const groupsOf = (rows) => {
  const groups = new Map()
  for (const row of rows) {
    const rules = groups.get(row.severity) ?? new Map()
    rules.set(row.key, (rules.get(row.key) ?? 0) + 1)
    groups.set(row.severity, rules)
  }
  return [...groups.entries()]
    .sort(([left], [right]) =>
      (severityRank[left] ?? 9) - (severityRank[right] ?? 9) || left.localeCompare(right))
    .map(([severity, rules]) => ({
      severity,
      total: sum([...rules.values()]),
      rules: [...rules.entries()]
        .map(([key, count]) => ({key, count}))
        .sort((left, right) => right.count - left.count || ruleName(left.key).localeCompare(ruleName(right.key))),
    }))
}

const groupLines = (rows) =>
  groupsOf(rows).flatMap((group) => [
    `  ${group.severity} (${group.total})`,
    ...group.rules.map((rule) => `    ${rule.count} ${ruleName(rule.key)}`),
  ])

const countErrors = (doc, keys) =>
  rowsFromKeys(doc, keys).filter((row) => row.severity === 'error').length

const splitIdentity = (entry) => entry.split(':')

const identityRule = (entry) => splitIdentity(entry)[0]

const identityFile = (entry) => {
  const parts = splitIdentity(entry)
  return parts[0] === 'duplicate-export'
    ? (parts[2] ?? '').split('|')[0]
    : (parts[1] ?? '')
}

const identityDetail = (entry) => {
  const parts = splitIdentity(entry)
  if (parts[0] !== 'duplicate-export') return parts.slice(2).join(':')
  const files = (parts[2] ?? '').split('|')
  return `${parts[1]} — ${files.slice(1).join(' | ')}`
}

const identityRuleName = (rule) => identityRuleNames[rule] ?? rule.replace(/-/g, ' ')

const gateReport = ({deadCode, health, dupes, architecture, styling, debtPath, minScore = 85}) => {
  const deadError = countErrors(deadCode, deadKeys)
  const archError = countErrors(architecture, archKeys)
  const stylingError = stylingRows(styling).filter((row) => row.severity === 'error').length
  const healthError = (health.findings ?? []).filter((finding) => finding.effective_severity === 'error').length

  const accepted = deadCode.baseline.matched
  const stale = deadCode.baseline_staleness.stale_entries

  const dupGate = dupes.gate_outcomes?.['duplication-threshold'] ?? {}
  const dupStatus = dupGate.status ?? 'pass'
  const dupLimit = Math.floor(dupGate.threshold ?? 0)
  const dupRate = dupes.stats.duplication_percentage

  const score = health.health_score.score
  const grade = health.health_score.grade

  const blocking = deadError + healthError + archError + stylingError
    + (dupStatus === 'fail' ? 1 : 0)
    + (score < minScore ? 1 : 0)
  const failed = blocking > 0 || stale > 0 || dupStatus === 'fail'

  const lines = [
    'fallow basic — gate',
    `debt: ${debtPath}`,
    '',
    line('dead code', `${deadError} blocking · ${accepted} accepted debt${stale > 0 ? ` · ${stale} stale` : ''}`),
    line('duplication', `${dupStatus} · ${round1(dupRate)}% · limit ${dupLimit}%`),
    line('score', `${grade} ${score} · floor ${minScore}`),
    '',
    failed
      ? `FAIL — ${blocking} blocking · ${stale} stale · duplication ${dupStatus} · score ${score}`
      : `PASS — 0 blocking · debt respected · score ${score} ≥ ${minScore}`,
  ]

  return {lines, blocking, stale, failed}
}

const categoryReport = ({category, doc}) => {
  if (category === 'score') return scoreReport(doc)
  if (category === 'duplication') return duplicationReport(doc)

  const rows = category === 'dead-code'
    ? rowsFromKeys(doc, deadKeys)
    : category === 'architecture'
      ? rowsFromKeys(doc, archKeys)
      : category === 'styling'
        ? stylingRows(doc)
        : complexityRows(doc)
  const label = category === 'dead-code' ? 'dead code' : category

  const lines = [
    `${label} — ${rows.length} findings`,
    ...groupLines(rows),
  ]

  if (category === 'complexity') {
    lines.push(categoryLine('thresholds', `cyclomatic ${doc.summary?.max_cyclomatic_threshold ?? '?'} · cognitive ${doc.summary?.max_cognitive_threshold ?? '?'}`))
  }
  if (category === 'styling' && doc.styling_health) {
    lines.push(categoryLine('score', `${doc.styling_health.grade} ${doc.styling_health.score}`))
  }

  return {lines}
}

const scoreReport = (doc) => {
  const score = doc.health_score.score
  const grade = doc.health_score.grade
  const penalties = Object.entries(doc.health_score.penalties ?? {})
    .filter(([, value]) => value > 0)
    .sort(([, left], [, right]) => right - left)
    .map(([name, value]) => `${penaltyNames[name] ?? name.replace(/_/g, ' ')} ${value}`)

  return {
    lines: [
      `score — ${grade} ${score}`,
      categoryLine('floor', `85 · ${score >= 85 ? 'ok' : 'below'}`),
      categoryLine('functions', `${doc.summary?.functions_analyzed ?? 0}`),
      categoryLine('maintainability', `${doc.summary?.average_maintainability ?? 0}`),
      categoryLine('penalties', penalties.length > 0 ? penalties.join(' · ') : 'none'),
    ],
  }
}

const duplicationReport = (doc) => {
  const rate = doc.stats.duplication_percentage ?? 0
  const gate = doc.gate_outcomes?.['duplication-threshold'] ?? {}
  const status = gate.status ?? 'pass'

  return {
    lines: [
      `duplication — ${round1(rate)}% · ${doc.stats.clone_groups ?? 0} groups`,
      categoryLine('status', `${status} · limit ${Math.floor(gate.threshold ?? 0)}%`),
      categoryLine('families', `${doc.stats.clone_families ?? 0}`),
      categoryLine('instances', `${doc.stats.clone_instances ?? 0}`),
      categoryLine('lines', `${doc.stats.duplicated_lines ?? 0} duplicated / ${doc.stats.total_lines ?? 0}`),
    ],
  }
}

const debtReport = ({doc, path}) => {
  const entries = deadKeys.flatMap((key) => doc[key] ?? [])
  const files = new Set(entries.map(identityFile))
  const groups = new Map()
  for (const entry of entries) {
    const file = identityFile(entry)
    groups.set(file, [...(groups.get(file) ?? []), entry])
  }

  const sorted = [...groups.entries()]
    .sort(([leftFile, leftEntries], [rightFile, rightEntries]) =>
      rightEntries.length - leftEntries.length || leftFile.localeCompare(rightFile))
    .flatMap(([file, group]) => [
      '',
      `${file} (${group.length})`,
      ...group
        .slice()
        .sort((left, right) => identityRule(left).localeCompare(identityRule(right)))
        .map((entry) => `  ${identityRuleName(identityRule(entry))}: ${identityDetail(entry)}`),
    ])

  return {
    lines: [
      `debt — ${path}`,
      `${entries.length} findings · ${files.size} files`,
      ...sorted,
    ],
  }
}

module.exports = {
  gateReport,
  categoryReport,
  scoreReport,
  duplicationReport,
  debtReport,
}
