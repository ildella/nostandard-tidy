const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {TidyError, layerFor, configFor, debtFor} = require('../lib/discover')

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tidy-discover-'))

const withDir = (t) => {
  const dir = tempDir()
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}))
  return dir
}

test('uses <layer>.jsonc when present', (t) => {
  const dir = withDir(t)
  const plain = path.join(dir, 'gate.jsonc')
  fs.writeFileSync(plain, '{}')
  fs.writeFileSync(path.join(dir, 'gate.lace.jsonc'), '{}')

  assert.equal(configFor(dir, 'gate'), plain)
  assert.equal(layerFor('score'), 'health')
  assert.equal(layerFor('prune'), 'gate')
})

test('falls back to a single <layer>.*.jsonc', (t) => {
  const dir = withDir(t)
  const suffixed = path.join(dir, 'gate.lace.jsonc')
  fs.writeFileSync(suffixed, '{}')

  assert.equal(configFor(dir, 'gate'), suffixed)
})

test('rejects two suffixed configs', (t) => {
  const dir = withDir(t)
  fs.writeFileSync(path.join(dir, 'gate.lace.jsonc'), '{}')
  fs.writeFileSync(path.join(dir, 'gate.nucube.jsonc'), '{}')

  assert.throws(() => configFor(dir, 'gate'), TidyError)
})

test('rejects an empty config dir', (t) => {
  const dir = withDir(t)
  fs.writeFileSync(path.join(dir, 'health.jsonc'), '{}')

  assert.throws(() => configFor(dir, 'gate'), (error) => {
    assert.ok(error instanceof TidyError)
    assert.ok(error.message.includes(dir))
    return true
  })
})

test('explicit --debt wins over the default path', (t) => {
  const dir = withDir(t)
  fs.writeFileSync(path.join(dir, 'debt.dead-code.json'), '{}')
  const custom = path.join(dir, 'custom-debt.json')
  fs.writeFileSync(custom, '{}')

  assert.equal(debtFor(custom, dir), custom)
  assert.equal(debtFor(undefined, dir), path.join(dir, 'debt.dead-code.json'))
  assert.throws(() => debtFor(path.join(dir, 'missing.json'), dir), TidyError)
})
