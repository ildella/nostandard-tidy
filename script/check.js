// Loads every shipped config with the real tools; fails on any load error.
const {execFileSync} = require('node:child_process')
const bin = name => `node_modules/.bin/${name}`
for (const level of ['basic', 'recommended', 'strict']) {
  execFileSync(bin('fallow'), ['config', '-c', `fallow/${level}.jsonc`], {stdio: 'ignore'})
  console.log(`fallow/${level}.jsonc ok`)
}
const depcruise = require('./../depcruise/basic.cjs')
if (!Array.isArray(depcruise.forbidden)) throw new Error('depcruise/basic.cjs: forbidden missing')
execFileSync(bin('depcruise'), ['--config', 'depcruise/basic.cjs', '--output-type', 'err', 'script'], {stdio: 'inherit'})
console.log('depcruise/basic.cjs ok')
