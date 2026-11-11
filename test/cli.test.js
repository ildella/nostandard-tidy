const test = require('node:test')
const assert = require('node:assert/strict')
const {spawnSync} = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const BIN = path.join(__dirname, '..', 'bin', 'tidy.js')
const FIXTURES = path.join(__dirname, 'fixtures')

const project = (t, script) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tidy-cli-'))
  t.after(() => fs.rmSync(root, {recursive: true, force: true}))

  fs.mkdirSync(path.join(root, 'quality', 'fallow'), {recursive: true})
  fs.writeFileSync(path.join(root, 'quality', 'fallow', 'gate.jsonc'), '{}')
  fs.writeFileSync(path.join(root, 'quality', 'fallow', 'debt.dead-code.json'), '{"kind":"dead-code"}')

  fs.mkdirSync(path.join(root, 'bin'))
  fs.writeFileSync(path.join(root, 'bin', 'fallow'), script, {mode: 0o755})
  return root
}

const runner = (deadCode) => `#!/bin/sh
case "$1" in
  dead-code) cat "${FIXTURES}/${deadCode}" ;;
  health)
    case " $* " in
      *" --css "*) cat "${FIXTURES}/styling.json" ;;
      *) cat "${FIXTURES}/health.json" ;;
    esac ;;
  dupes) cat "${FIXTURES}/dupes.json" ;;
  architecture) cat "${FIXTURES}/architecture.json" ;;
  *) exit 2 ;;
esac
`

const run = (root, args) => spawnSync(process.execPath, [BIN, ...args], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH}`,
  },
})

test('gate prints PASS and exits 0', (t) => {
  const root = project(t, runner('dead-code.json'))
  const result = run(root, ['gate'])

  assert.equal(result.status, 0)
  assert.ok(result.stdout.includes('PASS — 0 blocking · debt respected · score 98.1 ≥ 85'))
})

test('gate exits 1 and prints FAIL when fallow reports a finding', (t) => {
  const root = project(t, runner('dead-code-findings.json'))
  const result = run(root, ['gate'])

  assert.equal(result.status, 1)
  assert.ok(result.stdout.includes('FAIL — 1 blocking · 0 stale · duplication pass · score 98.1'))
})

test('gate exits 2 without a verdict when fallow fails', (t) => {
  const root = project(t, '#!/bin/sh\necho boom >&2\nexit 3\n')
  const result = run(root, ['gate'])

  assert.equal(result.status, 2)
  assert.equal(result.stdout, '')
  assert.ok(result.stderr.includes('boom'))
})
