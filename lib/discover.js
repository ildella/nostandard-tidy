const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_CONFIG_DIR = 'quality/fallow'

class TidyError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TidyError'
  }
}

const layers = {
  gate: 'gate',
  debt: 'gate',
  prune: 'gate',
  score: 'health',
  'dead-code': 'dead-code',
  complexity: 'complexity',
  duplication: 'duplication',
  architecture: 'architecture',
  styling: 'styling',
}

const layerFor = (command) => layers[command]

const configFor = (dir, layer) => {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new TidyError(`config dir not found: ${dir}`)
  }

  const plain = path.join(dir, `${layer}.jsonc`)
  if (fs.existsSync(plain)) return plain

  const prefix = `${layer}.`
  const suffixed = fs.readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.jsonc') && name !== `${layer}.jsonc`)

  if (suffixed.length === 1) return path.join(dir, suffixed[0])
  if (suffixed.length === 0) {
    throw new TidyError(`no ${layer} config in ${dir} (expected ${layer}.jsonc or ${layer}.*.jsonc)`)
  }
  throw new TidyError(`multiple ${layer} configs in ${dir}: ${suffixed.join(', ')} — pass --config-dir`)
}

const debtFor = (debt, dir) => {
  const target = debt ?? path.join(dir, 'debt.dead-code.json')
  if (!fs.existsSync(target)) throw new TidyError(`debt file not found: ${target}`)
  return target
}

module.exports = {
  DEFAULT_CONFIG_DIR,
  TidyError,
  layerFor,
  configFor,
  debtFor,
}
