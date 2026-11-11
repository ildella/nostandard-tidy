const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {gateReport, categoryReport, debtReport} = require('../lib/report')

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'))

const documents = () => ({
  deadCode: fixture('dead-code.json'),
  health: fixture('health.json'),
  dupes: fixture('dupes.json'),
  architecture: fixture('architecture.json'),
  styling: fixture('styling.json'),
})

const report = (overrides = {}) => gateReport({
  ...documents(),
  debtPath: 'quality/fallow/debt.dead-code.json',
  minScore: 85,
  ...overrides,
})

test('gate passes with no findings', () => {
  const result = report()

  assert.equal(result.blocking, 0)
  assert.equal(result.stale, 0)
  assert.equal(result.failed, false)
  assert.equal(result.lines.at(-1), 'PASS — 0 blocking · debt respected · score 98.1 ≥ 85')
})

test('gate counts an unused export as blocking', () => {
  const result = report({deadCode: fixture('dead-code-findings.json')})

  assert.equal(result.blocking, 1)
  assert.equal(result.failed, true)
  assert.equal(result.lines.at(-1), 'FAIL — 1 blocking · 0 stale · duplication pass · score 98.1')
  assert.equal(result.lines[3], '  dead code     1 blocking · 0 accepted debt')
})

test('gate reports accepted debt', () => {
  const result = report({deadCode: fixture('dead-code-debt.json')})

  assert.equal(result.blocking, 0)
  assert.equal(result.failed, false)
  assert.equal(result.lines[3], '  dead code     0 blocking · 2 accepted debt')
})

test('gate fails on a stale baseline entry', () => {
  const result = report({deadCode: fixture('dead-code-stale.json')})

  assert.equal(result.stale, 1)
  assert.equal(result.failed, true)
  assert.ok(result.lines[3].includes('1 stale'))
  assert.equal(result.lines.at(-1), 'FAIL — 0 blocking · 1 stale · duplication pass · score 98.1')
})

test('gate fails when duplication exceeds the threshold', () => {
  const result = report({dupes: fixture('dupes-fail.json')})

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

test('debt report groups baseline entries by file', () => {
  const {lines} = debtReport({doc: fixture('debt.json'), path: 'quality/fallow/debt.dead-code.json'})

  assert.equal(lines[0], 'debt — quality/fallow/debt.dead-code.json')
  assert.equal(lines[1], '3 findings · 3 files')
  assert.ok(lines.includes('  unused export: helper'))
})
