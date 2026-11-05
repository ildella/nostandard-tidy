# nostandard-tidy

Shared base configs for [fallow](https://fallow.tools) and [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) that keep codebase structure tidy.

## Levels

Each level extends the previous one and only tightens it.

- `basic`: every unused-code, dependency, circular and duplicate-export rule at error; health at fallow defaults (cyclomatic 20, cognitive 15, unit size 60); duplicates threshold 5%, minLines 4; `policy-violation` at error (ownership via project `rulePacks`); `boundary-violation` off (layers live in depcruise).
- `recommended`: cyclomatic 10, cognitive 10, unit size 40, duplicates minLines 3.
- `strict`: cyclomatic 8; `prop-drilling`, `thin-wrapper`, `private-type-leaks`, `require-suppression-reason` at error; duplicates mode `strict`.

Projects can add their own `next1`, `next2`, ... on top. A level never removes a rule.

## Install

```sh
npm install --save-dev nostandard-tidy fallow dependency-cruiser
```

## fallow

```json
{
  "extends": ["npm:nostandard-tidy/fallow/basic.jsonc"]
}
```

Arrays replace the parent's in fallow, so the base sets no arrays (`entry`, `ignorePatterns`, `overrides`, ...). Define them in the project. Set `rulePacks` too, or turn `policy-violation` off.

The npm package must be really installed in `node_modules` (not `npm link` or `file:`) for depcruise to resolve it.

## dependency-cruiser

```js
// .dependency-cruiser.cjs
module.exports = {
  extends: 'nostandard-tidy/depcruise/basic.cjs',
  forbidden: [
    // project layer rules
  ],
}
```

A rule with the same name overrides the base rule.

### Helpers (ESM)

Build the rules instead of extending a config. Project exceptions are options.

```js
import {hygiene} from 'nostandard-tidy/depcruise/hygiene.mjs'
import {layers, noCircular, notTo, onlyFrom} from 'nostandard-tidy/depcruise/boundaries.mjs'
import {baseOptions, svelteResolve} from 'nostandard-tidy/depcruise/options.mjs'

const lib = {name: 'lib', path: '^src/lib/'}
const service = {name: 'service', path: '^src/service/'}

export default {
  forbidden: [
    ...hygiene({orphansPathNot: ['^tests/'], unresolvablePathNot: [], devDepPathNot: []}),
    noCircular(),
    ...layers([lib, service]), // lower never imports higher
    notTo(service, lib, {pathNot: '^src/lib/i18n'}), // skip a layer
    onlyFrom('tauri-only-from-platform', {scope: '^src/', gateway: '^src/platform/', to: {path: '@tauri-apps'}}),
  ],
  options: {...baseOptions, enhancedResolveOptions: svelteResolve},
}
```

- `hygiene(options)`: the recommended-strict rules, all at error except `optional-deps-used` (info). Options: `srcPath`, `testsPath`, `orphansPathNot`, `unresolvablePathNot`, `devDepPathNot`.
- `layers(list)`: ordered layers, lowest first.
- `notTo(from, to, {pathNot})`, `onlyFrom(name, {scope, gateway, to})`, `noCircular()`.
- `baseOptions`: cruise and reporter options; `svelteResolve`: resolution for Svelte projects.

## Agent skill

`skills/quality-gates/SKILL.md` is a short operational manual for an agent working in a repo that uses this gate. Copy it into the project's skills directory, for example `.agents/skills/quality-gates/`.

## License

MIT
