const {spawnSync} = require('node:child_process')
const {TidyError} = require('./discover')

const FALLOW = 'fallow'
const JSON_FLAGS = ['-f', 'json', '--quiet']

const valueAt = (doc, key) => key.split('.').reduce((value, part) => value?.[part], doc)

const runJson = (config, args, required = []) => {
  const result = spawnSync(FALLOW, [...args, '-c', config, ...JSON_FLAGS], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })

  if (result.error) throw new TidyError(`cannot run fallow: ${result.error.message}`)
  if (result.status !== 0 && result.status !== 1) {
    throw new TidyError(result.stderr.trim() || `fallow exited with status ${result.status}`)
  }

  const stdout = result.stdout.trim()
  if (stdout === '') throw new TidyError(result.stderr.trim() || 'fallow produced no output')

  let doc
  try {
    doc = JSON.parse(stdout)
  } catch {
    throw new TidyError(result.stderr.trim() || 'fallow produced invalid JSON')
  }

  const missing = required.find((key) => valueAt(doc, key) === undefined)
  if (missing !== undefined) {
    throw new TidyError(`fallow ${args.join(' ')}: missing ${missing} in JSON output`)
  }

  return {status: result.status, doc}
}

const runInherit = (args) => {
  const result = spawnSync(FALLOW, args, {stdio: 'inherit'})
  if (result.error) throw new TidyError(`cannot run fallow: ${result.error.message}`)
  if (result.status === null) throw new TidyError('fallow terminated without an exit status')
  return result.status
}

module.exports = {runJson, runInherit}
