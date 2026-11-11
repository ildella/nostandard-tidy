const {spawnSync} = require('node:child_process')
const {TidyError} = require('./discover')

const FALLOW = 'fallow'
const JSON_FLAGS = ['-f', 'json', '--quiet']

const runJson = (config, args) => {
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

  try {
    return {status: result.status, doc: JSON.parse(stdout)}
  } catch {
    throw new TidyError(result.stderr.trim() || 'fallow produced invalid JSON')
  }
}

const runInherit = (args) => {
  const result = spawnSync(FALLOW, args, {stdio: 'inherit'})
  if (result.error) throw new TidyError(`cannot run fallow: ${result.error.message}`)
  if (result.status === null) throw new TidyError('fallow terminated without an exit status')
  return result.status
}

module.exports = {runJson, runInherit}
