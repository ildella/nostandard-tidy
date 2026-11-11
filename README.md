# nostandard-tidy

Shared base configs for [fallow](https://fallow.tools) and [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) that keep codebase structure tidy.

## Levels

Each level extends the previous one and only tightens it.

- `basic`: every unused-code, dependency, circular and duplicate-export rule at error; health at fallow defaults (cyclomatic 20, cognitive 15, unit size 60); duplicates threshold 5%, minLines 4; `policy-violation` at error (ownership via project `rulePacks`); `boundary-violation` off (layers live in depcruise).
- `recommended`: cyclomatic 10, cognitive 10, unit size 40, duplicates minLines 3.
- `strict`: cyclomatic 8; `prop-drilling`, `thin-wrapper`, `private-type-leaks`, `require-suppression-reason` at error; duplicates mode `strict`.

Projects can add their own `next1`, `next2`, ... on top. A level never removes a rule.

`basic`, `recommended` and `strict` stay shipped for compatibility. New projects compose categories instead.

## Categories

The category files are the preferred composition. A project keeps one `base` config of its own for the arrays, extends one file per category, and extends `all.tidy.jsonc` when it wants every category at once.

- `dead-code.tidy.jsonc`: unused files, exports, types, members and dependencies, dependency hygiene.
- `complexity.tidy.jsonc`: cyclomatic and cognitive complexity.
- `health.tidy.jsonc`: CRAP and file length.
- `duplication.tidy.jsonc`: clone detection and threshold.
- `architecture.tidy.jsonc`: import, re-export and package cycles, policy.
- `styling.tidy.jsonc`: CSS and CSS-in-JS drift.
- `all.tidy.jsonc`: the six above, aggregated.

Category files never carry arrays: fallow replaces arrays on `extends`, so `entry`, `ignorePatterns`, `overrides` and the rest belong to the project base.

Two structural `off`s are policy, not local taste: `boundary-violation` stays off because layers live in dependency-cruiser, and `absent-component-props` stays off because it is an opt-in review.

## Install

```sh
npm install --save-dev nostandard-tidy fallow dependency-cruiser
```

## fallow

```json
{
  "extends": ["npm:nostandard-tidy/fallow/all.tidy.jsonc"]
}
```

Swap the entry for `npm:nostandard-tidy/fallow/<category>.tidy.jsonc` to take one category alone.

Arrays replace the parent's in fallow, so the base sets no arrays (`entry`, `ignorePatterns`, `overrides`, ...). Define them in the project. Set `rulePacks` too, or turn `policy-violation` off.

The npm package must be really installed in `node_modules` (not `npm link` or `file:`) for depcruise to resolve it.

### Gate runtime

The `tidy` CLI runs the gate so a project does not need wrapper scripts.

- `tidy gate`: the whole gate. It is the only command that applies the identity baseline.
- `tidy category <name>`: one category, at its strict severity.
- `tidy raw <name>`: the same config with its rule severities untouched, for a report.
- `tidy debt`: prints the current baseline entries.
- `tidy prune`: drops the stale baseline entries and nothing else.

Configs are discovered as `quality/fallow/<layer>.jsonc`, or as the unique `quality/fallow/<layer>.<project>.jsonc` when a project keeps a focused config for that layer: there is at most one per layer.

Exit codes: `0` clean; `1` findings, a threshold breach, a score below the floor, or a stale baseline; `2` a tool or config error. The score floor is 85, the bottom of grade A: the score is `100 - penalties` and does not chase 100.

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
- `baseOptions`: cruise and reporter options; `svelteResolve`: resolution for Svelte projects; `nodeResolve`: resolution for Node packages, including the ones that expose `exports` without `main`.

## Agent skill

`skills/quality-gates` is the operational manual for an agent working in a repo that uses this fallow / dependency-cruiser gate. Install it into the project's skills directory:

```sh
npx skills add https://github.com/ildella/nostandard-tidy/tree/master/skills
```

Installs `quality-gates`. With [skills-npm](https://github.com/antfu/skills-npm/): `yarn add -D skills-npm && yarn skills-npm`.

The skill assumes the project already has a gate config and the usual wrapper scripts (`yarn fallow.basic`, `yarn fallow.<category>`, `yarn depcruise.basic`). It never invents a gate.

## License

MIT
