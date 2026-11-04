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

// ESM helpers: load and build rules.
import('./../depcruise/hygiene.mjs').then(async ({hygiene}) => {
  const {layers, noCircular, notTo, onlyFrom} = await import('./../depcruise/boundaries.mjs')
  const {baseOptions, svelteResolve} = await import('./../depcruise/options.mjs')
  const a = {name: 'a', path: '^a'}
  const b = {name: 'b', path: '^b'}
  const rules = [
    ...hygiene(), noCircular(), ...layers([a, b]), notTo(a, b),
    onlyFrom('x', {scope: '^a', gateway: '^a/g', to: {path: 'x'}}),
  ]
  if (rules.length !== 15 || !baseOptions || !svelteResolve) throw new Error('depcruise helpers broken')
  console.log('depcruise helpers ok')
})
