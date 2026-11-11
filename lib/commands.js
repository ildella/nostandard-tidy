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

const RAW_ARGS = {
  'dead-code': ['dead-code'],
  complexity: ['health'],
  score: ['health'],
  duplication: ['dupes'],
  architecture: ['architecture'],
  styling: ['health', '--css'],
}

const gateRuns = (debt) => [
  ['dead-code', '--lean', '--baseline', debt, '--fail-on-stale-baseline'],
  ['health', '--lean'],
  ['dupes'],
  ['architecture'],
  ['health', '--css', '--lean'],
]

const gate = ({configDir = DEFAULT_CONFIG_DIR, debt, minScore = 85}) => {
  const config = configFor(configDir, 'gate')
  const debtPath = debtFor(debt, configDir)
  const [deadCode, health, dupes, architecture, styling] =
    gateRuns(debtPath).map((args) => runJson(config, args).doc)

  return gateReport({deadCode, health, dupes, architecture, styling, debtPath, minScore})
}

const category = ({category: name, configDir = DEFAULT_CONFIG_DIR}) => {
  const config = configFor(configDir, layerFor(name))
  const {status, doc} = runJson(config, CATEGORY_ARGS[name])
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
