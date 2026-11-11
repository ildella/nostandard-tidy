const test = require('node:test')
const assert = require('node:assert/strict')
const {spawnSync} = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const BIN = path.join(__dirname, '..', 'bin', 'tidy.js')
const FALLOW_BIN = path.join(__dirname, '..', 'node_modules', '.bin')

const BASELINE = {
  kind: 'dead-code',
  unused_files: [],
  unused_exports: [],
  unused_types: [],
  unused_dependencies: [],
  unused_dev_dependencies: [],
}

const project = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tidy-minimum-'))
  t.after(() => fs.rmSync(root, {recursive: true, force: true}))

  fs.mkdirSync(path.join(root, 'quality', 'fallow'), {recursive: true})
  fs.writeFileSync(path.join(root, 'index.js'), 'export const a = 1\n')
  fs.writeFileSync(
    path.join(root, 'quality', 'fallow', 'gate.jsonc'),
    '{"entry": ["index.js"], "duplicates": {"threshold": 5, "minLines": 4}}',
  )
  fs.writeFileSync(
    path.join(root, 'quality', 'fallow', 'debt.dead-code.json'),
    JSON.stringify(BASELINE),
  )
  return root
}

const run = (root) => spawnSync(process.execPath, [BIN, 'gate'], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    PATH: `${FALLOW_BIN}${path.delimiter}${process.env.PATH}`,
  },
})

test('the real fallow at the peer minimum passes, then fails on new dead code', (t) => {
  const root = project(t)

  const clean = run(root)
  assert.equal(clean.status, 0, clean.stderr)
  assert.ok(clean.stdout.includes('PASS'))

  fs.writeFileSync(path.join(root, 'orphan.js'), 'export const orphan = 2\n')

  const dirty = run(root)
  assert.equal(dirty.status, 1, dirty.stderr)
  assert.ok(dirty.stdout.includes('FAIL'))
})
