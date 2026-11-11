const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {gateReport, categoryReport, debtReport} = require('../lib/report')

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'))

const documents = () => ({
  'dead-code': fixture('dead-code.json'),
  health: fixture('health.json'),
  duplication: fixture('dupes.json'),
  architecture: fixture('architecture.json'),
  styling: fixture('styling.json'),
})

const runs = (overrides = {}) => {
  const docs = {...documents(), ...overrides}
  return Object.entries(docs).map(([name, doc]) => ({name, status: 0, doc}))
}

const report = (overrides = {}) => gateReport({
  runs: runs(overrides),
  debtPath: 'quality/fallow/debt.dead-code.json',
  minScore: 85,
})

const outcomes = (status) => ({'error-severity-findings': {enforced: true, status}})

test('gate passes with no findings', () => {
  const result = report()

  assert.equal(result.blocking, 0)
  assert.equal(result.stale, 0)
  assert.equal(result.failed, false)
  assert.equal(result.lines.at(-1), 'PASS — 0 blocking · debt respected · score 98.1 ≥ 85')
})

test('gate counts an unused export as blocking', () => {
  const result = report({'dead-code': fixture('dead-code-findings.json')})

  assert.equal(result.blocking, 1)
  assert.equal(result.failed, true)
  assert.equal(result.lines.at(-1), 'FAIL — 1 blocking · 0 stale · duplication pass · score 98.1')
  assert.equal(result.lines[3], '  dead code     1 blocking · 0 accepted debt')
})

test('gate reports accepted debt', () => {
  const result = report({'dead-code': fixture('dead-code-debt.json')})

  assert.equal(result.blocking, 0)
  assert.equal(result.failed, false)
  assert.equal(result.lines[3], '  dead code     0 blocking · 2 accepted debt')
})

test('gate fails on a stale baseline entry', () => {
  const result = report({'dead-code': fixture('dead-code-stale.json')})

  assert.equal(result.stale, 1)
  assert.equal(result.failed, true)
  assert.ok(result.lines[3].includes('1 stale'))
  assert.equal(result.lines.at(-1), 'FAIL — 0 blocking · 1 stale · duplication pass · score 98.1')
})

test('gate fails when duplication exceeds the threshold', () => {
  const result = report({duplication: fixture('dupes-fail.json')})

  assert.equal(result.blocking, 1)
  assert.equal(result.failed, true)
  assert.equal(result.lines[4], '  duplication   fail · 7.2% · limit 5%')
  assert.equal(result.lines.at(-1), 'FAIL — 1 blocking · 0 stale · duplication fail · score 98.1')
})

test('gate fails when the score is below the floor', () => {
  const result = report({health: fixture('health-low.json')})

  assert.equal(result.blocking, 1)
  assert.equal(result.failed, true)
  assert.equal(result.lines[5], '  score         C 71.4 · floor 85')
  assert.equal(result.lines.at(-1), 'FAIL — 1 blocking · 0 stale · duplication pass · score 71.4')
})

test('gate fails on an enforced outcome outside the known rules and names it', () => {
  const doc = {...fixture('dead-code.json'), gate_outcomes: {'some-unknown-rule': {enforced: true, status: 'fail'}}}
  const result = report({'dead-code': doc})

  assert.equal(result.failed, true)
  assert.equal(result.lines.at(-1), 'FAIL — 0 blocking · 0 stale · duplication pass · score 98.1')
  assert.equal(result.lines.at(-2), '  outcomes      some-unknown-rule — fail')
})

test('gate fails on an architecture outcome with no findings in the lists', () => {
  const doc = {...fixture('architecture.json'), gate_outcomes: outcomes('fail')}
  const result = report({architecture: doc})

  assert.equal(result.failed, true)
  assert.equal(result.lines.at(-1), 'FAIL — 0 blocking · 0 stale · duplication pass · score 98.1')
})

test('gate fails on a health outcome with no findings', () => {
  const doc = {...fixture('health.json'), gate_outcomes: {'health-findings': {enforced: true, status: 'fail'}}}
  const result = report({health: doc})

  assert.equal(result.failed, true)
  assert.equal(result.lines.at(-1), 'FAIL — 0 blocking · 0 stale · duplication pass · score 98.1')
})

test('gate fails on a styling outcome', () => {
  const doc = {...fixture('styling.json'), gate_outcomes: {'health-findings': {enforced: true, status: 'fail'}}}
  const result = report({styling: doc})

  assert.equal(result.failed, true)
  assert.equal(result.lines.at(-1), 'FAIL — 0 blocking · 0 stale · duplication pass · score 98.1')
})

test('gate fails on a run that exits non-zero with every outcome passing', () => {
  const failing = runs().map((run) => (run.name === 'health' ? {...run, status: 1} : run))
  const result = gateReport({runs: failing, debtPath: 'quality/fallow/debt.dead-code.json'})

  assert.equal(result.failed, true)
  assert.equal(result.lines.at(-2), '  outcomes      unattributed — fail')
})

test('gate ignores an unenforced failing outcome', () => {
  const doc = {...fixture('dead-code.json'), gate_outcomes: {'some-rule': {enforced: false, status: 'fail'}}}
  const result = report({'dead-code': doc})

  assert.equal(result.failed, false)
  assert.equal(result.lines.at(-1), 'PASS — 0 blocking · debt respected · score 98.1 ≥ 85')
})

test('dead-code category groups findings by severity and rule', () => {
  const {lines} = categoryReport({category: 'dead-code', doc: fixture('dead-code-findings.json')})

  assert.deepEqual(lines, [
    'dead code — 1 findings',
    '  error (1)',
    '    1 unused exports',
  ])
})

test('complexity category prints thresholds', () => {
  const {lines} = categoryReport({category: 'complexity', doc: fixture('health.json')})

  assert.deepEqual(lines, [
    'complexity — 0 findings',
    '  thresholds        cyclomatic 20 · cognitive 15',
  ])
})

test('styling category omits the score when no CSS was analysed', () => {
  const {lines} = categoryReport({category: 'styling', doc: fixture('styling.json')})

  assert.deepEqual(lines, ['styling — 0 findings'])
  assert.ok(!lines.some((line) => line.includes('score')))
})

test('styling category groups CSS findings', () => {
  const {lines} = categoryReport({category: 'styling', doc: fixture('styling-css.json')})

  assert.deepEqual(lines, [
    'styling — 2 findings',
    '  warn (2)',
    '    1 duplicate blocks',
    '    1 selector complexity',
    '  score             B 70',
  ])
})

test('score category prints the penalty summary', () => {
  const {lines} = categoryReport({category: 'score', doc: fixture('health.json')})

  assert.deepEqual(lines, [
    'score — A 98.1',
    '  floor             85 · ok',
    '  functions         6192',
    '  maintainability   90.2',
    '  penalties         coupling 1.6 · maintainability 0.3',
  ])
})

test('duplication category prints clone stats', () => {
  const {lines} = categoryReport({category: 'duplication', doc: fixture('dupes.json')})

  assert.deepEqual(lines, [
    'duplication — 0% · 0 groups',
    '  status            pass · limit 5%',
    '  families          0',
    '  instances         0',
    '  lines             0 duplicated / 30329',
  ])
})

test('duplication thresholds keep one decimal', () => {
  const doc = {
    ...fixture('dupes.json'),
    gate_outcomes: {'duplication-threshold': {status: 'pass', enforced: true, threshold: 0.5}},
  }

  assert.equal(categoryReport({category: 'duplication', doc}).lines[1], '  status            pass · limit 0.5%')
  assert.equal(report({duplication: doc}).lines[4], '  duplication   pass · 0% · limit 0.5%')
})

test('debt report groups baseline entries by file', () => {
  const {lines} = debtReport({doc: fixture('debt.json'), path: 'quality/fallow/debt.dead-code.json'})

  assert.equal(lines[0], 'debt — quality/fallow/debt.dead-code.json')
  assert.equal(lines[1], '3 findings · 3 files')
  assert.ok(lines.includes('  unused export: helper'))
})
