const {readFileSync} = require('node:fs')
const {DEFAULT_CONFIG_DIR, TidyError, layerFor, configFor, debtFor} = require('./discover')
const {runJson, runInherit} = require('./run')
const {gateReport, categoryReport, debtReport} = require('./report')

const CATEGORY_ARGS = {
  'dead-code': ['dead-code', '--lean'],
  complexity: ['health', '--lean'],
  score: ['health', '--lean'],
  duplication: ['dupes'],
  architecture: ['architecture'],
  styling: ['health', '--css', '--lean'],
}

const CATEGORY_REQUIRED = {
  'dead-code': ['gate_outcomes'],
  complexity: ['summary', 'gate_outcomes'],
  score: ['health_score', 'summary'],
  duplication: ['stats', 'gate_outcomes'],
  architecture: ['gate_outcomes'],
  styling: ['gate_outcomes'],
}

const RAW_ARGS = {
  'dead-code': ['dead-code'],
  complexity: ['health'],
  score: ['health'],
  duplication: ['dupes'],
  architecture: ['architecture'],
  styling: ['health', '--css'],
}

const GATE_RUNS = [
  {
    name: 'dead-code',
    args: (debtPath) => ['dead-code', '--lean', '--baseline', debtPath, '--fail-on-stale-baseline'],
    required: ['gate_outcomes', 'baseline', 'baseline_staleness'],
  },
  {name: 'health', args: () => ['health', '--lean'], required: ['health_score', 'gate_outcomes']},
  {name: 'duplication', args: () => ['dupes'], required: ['stats', 'gate_outcomes']},
  {name: 'architecture', args: () => ['architecture'], required: ['gate_outcomes']},
  {name: 'styling', args: () => ['health', '--css', '--lean'], required: ['gate_outcomes']},
]

const gate = ({configDir = DEFAULT_CONFIG_DIR, debt, minScore = 85}) => {
  const config = configFor(configDir, 'gate')
  const debtPath = debtFor(debt, configDir)
  const runs = GATE_RUNS.map(({name, args, required}) => ({
    name,
    ...runJson(config, args(debtPath), required),
  }))

  return gateReport({runs, debtPath, minScore})
}

const category = ({category: name, configDir = DEFAULT_CONFIG_DIR}) => {
  const config = configFor(configDir, layerFor(name))
  const {status, doc} = runJson(config, CATEGORY_ARGS[name], CATEGORY_REQUIRED[name])
  return {status, report: categoryReport({category: name, doc})}
}

const readDebt = (target) => {
  try {
    return JSON.parse(readFileSync(target, 'utf8'))
  } catch (error) {
    throw new TidyError(`invalid debt file ${target}: ${error.message}`)
  }
}

const debt = ({debt: debtFlag}) => {
  const target = debtFor(debtFlag, DEFAULT_CONFIG_DIR)
  return debtReport({doc: readDebt(target), path: target})
}

const prune = ({configDir = DEFAULT_CONFIG_DIR, debt: debtFlag}) => {
  const config = configFor(configDir, 'gate')
  const debtPath = debtFor(debtFlag, configDir)
  return runInherit(['baselines', 'prune', '--dead-code-baseline', debtPath, '-c', config])
}

const raw = ({category: name, args, configDir = DEFAULT_CONFIG_DIR}) => {
  const config = configFor(configDir, layerFor(name))
  return runInherit([...RAW_ARGS[name], '-c', config, ...args])
}

module.exports = {gate, category, debt, prune, raw}
