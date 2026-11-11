const {ruleNames, severityRank, deadKeys, archKeys} = require('./catalogs')

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

const countErrors = (doc, keys) =>
  rowsFromKeys(doc, keys).filter((row) => row.severity === 'error').length

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

const outcomeFailures = (doc) => Object.entries(doc.gate_outcomes)
  .filter(([, outcome]) => outcome.enforced === true && outcome.status === 'fail')
  .map(([key]) => key)

const unattributedRuns = (runs) => runs
  .filter((run) => run.status !== 0 && outcomeFailures(run.doc).length === 0)
  .map((run) => run.name)

const knownOutcomes = [
  'error-severity-findings',
  'stale-baseline',
  'duplication-threshold',
  'health-findings',
]

const outcomeSummary = (failedOutcomes, unattributed) => {
  const unknown = failedOutcomes.filter((key) => !knownOutcomes.includes(key))
  if (unknown.length === 0 && unattributed.length === 0) return undefined
  if (unknown.length === 0) return 'unattributed — fail'
  return `${[...unknown, ...unattributed].join(' · ')} — fail`
}

const rowsFor = (category, doc) =>
  category === 'dead-code'
    ? rowsFromKeys(doc, deadKeys)
    : category === 'architecture'
      ? rowsFromKeys(doc, archKeys)
      : category === 'styling'
        ? stylingRows(doc)
        : complexityRows(doc)

const round1 = (value) => Math.round(value * 10) / 10

const line = (label, value) => `  ${label.padEnd(14)}${value}`

const categoryLine = (label, value) => `  ${label.padEnd(18)}${value}`

const docsOf = (runs) => Object.fromEntries(runs.map(({name, doc}) => [name, doc]))

const blockingCounts = ({deadCode, health, architecture, styling}) => ({
  deadError: countErrors(deadCode, deadKeys),
  archError: countErrors(architecture, archKeys),
  stylingError: stylingRows(styling).filter((row) => row.severity === 'error').length,
  healthError: (health.findings ?? []).filter((finding) => finding.effective_severity === 'error').length,
})

module.exports = {
  sum,
  rowsFromKeys,
  complexityRows,
  stylingRows,
  countErrors,
  groupsOf,
  groupLines,
  outcomeFailures,
  unattributedRuns,
  outcomeSummary,
  rowsFor,
  round1,
  line,
  categoryLine,
  docsOf,
  blockingCounts,
}
