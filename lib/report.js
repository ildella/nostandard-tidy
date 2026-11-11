const {deadKeys, penaltyNames} = require('./catalogs')
const {
  groupLines, outcomeFailures, unattributedRuns, outcomeSummary,
  rowsFor, round1, line, categoryLine, docsOf, blockingCounts,
} = require('./rows')
const {identityRule, identityFile, identityDetail, identityRuleName, groupByFile} = require('./identity')

const gateReport = ({runs, debtPath, minScore = 85}) => {
  const {'dead-code': deadCode, health, duplication: dupes, architecture, styling} = docsOf(runs)

  const {deadError, archError, stylingError, healthError} = blockingCounts({deadCode, health, architecture, styling})

  const failedOutcomes = runs.flatMap((run) => outcomeFailures(run.doc))
  const unattributed = unattributedRuns(runs)

  const accepted = deadCode.baseline.matched
  const stale = deadCode.baseline_staleness.stale_entries

  const dupGate = dupes.gate_outcomes['duplication-threshold']
  const duplicationFailed = failedOutcomes.includes('duplication-threshold')
  const dupStatus = duplicationFailed ? 'fail' : 'pass'
  const score = health.health_score.score
  const grade = health.health_score.grade
  const scoreBelowFloor = score < minScore

  const blocking = deadError + healthError + archError + stylingError
    + (duplicationFailed ? 1 : 0)
    + (scoreBelowFloor ? 1 : 0)
  const failed = failedOutcomes.length > 0 || unattributed.length > 0 || scoreBelowFloor || stale > 0
  const summary = outcomeSummary(failedOutcomes, unattributed)

  const lines = [
    'fallow basic — gate',
    `debt: ${debtPath}`,
    '',
    line('dead code', `${deadError} blocking · ${accepted} accepted debt${stale > 0 ? ` · ${stale} stale` : ''}`),
    line('duplication', `${dupStatus} · ${round1(dupes.stats.duplication_percentage)}% · limit ${round1(dupGate.threshold)}%`),
    line('score', `${grade} ${score} · floor ${minScore}`),
    summary ? line('outcomes', summary) : undefined,
    failed
      ? `FAIL — ${blocking} blocking · ${stale} stale · duplication ${dupStatus} · score ${score}`
      : `PASS — 0 blocking · debt respected · score ${score} ≥ ${minScore}`,
  ].filter((entry) => entry !== undefined)

  return {lines, blocking, stale, failed}
}

const categoryReport = ({category, doc}) => {
  if (category === 'score') return scoreReport(doc)
  if (category === 'duplication') return duplicationReport(doc)

  const rows = rowsFor(category, doc)
  const label = category === 'dead-code' ? 'dead code' : category

  const lines = [
    `${label} — ${rows.length} findings`,
    ...groupLines(rows),
  ]

  if (category === 'complexity') {
    lines.push(categoryLine('thresholds', `cyclomatic ${doc.summary.max_cyclomatic_threshold} · cognitive ${doc.summary.max_cognitive_threshold}`))
  }
  if (category === 'styling' && doc.styling_health) {
    lines.push(categoryLine('score', `${doc.styling_health.grade} ${doc.styling_health.score}`))
  }

  return {lines}
}

const scoreReport = (doc) => {
  const {score, grade} = doc.health_score
  const penalties = Object.entries(doc.health_score.penalties ?? {})
    .filter(([, value]) => value > 0)
    .sort(([, left], [, right]) => right - left)
    .map(([name, value]) => `${penaltyNames[name] ?? name.replace(/_/g, ' ')} ${value}`)

  return {
    lines: [
      `score — ${grade} ${score}`,
      categoryLine('floor', `85 · ${score >= 85 ? 'ok' : 'below'}`),
      categoryLine('functions', `${doc.summary.functions_analyzed}`),
      categoryLine('maintainability', `${doc.summary.average_maintainability}`),
      categoryLine('penalties', penalties.length > 0 ? penalties.join(' · ') : 'none'),
    ],
  }
}

const duplicationReport = (doc) => {
  const {stats} = doc
  const gate = doc.gate_outcomes['duplication-threshold']

  return {
    lines: [
      `duplication — ${round1(stats.duplication_percentage)}% · ${stats.clone_groups} groups`,
      categoryLine('status', `${gate.status} · limit ${round1(gate.threshold)}%`),
      categoryLine('families', `${stats.clone_families}`),
      categoryLine('instances', `${stats.clone_instances}`),
      categoryLine('lines', `${stats.duplicated_lines} duplicated / ${stats.total_lines}`),
    ],
  }
}

const debtReport = ({doc, path}) => {
  const entries = deadKeys.flatMap((key) => doc[key] ?? [])
  const files = new Set(entries.map(identityFile))

  const sorted = groupByFile(entries).flatMap(([file, group]) => [
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
  line,
  categoryLine,
  round1,
  gateReport,
  categoryReport,
  scoreReport,
  duplicationReport,
  debtReport,
}
