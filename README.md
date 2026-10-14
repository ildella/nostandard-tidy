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

## License

MIT
