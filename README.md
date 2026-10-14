# nostandard-tidy

Shared base configs for [fallow](https://fallow.tools) and [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) that keep codebase structure tidy.

## Levels

- `basic`: rules that are always green. Applied to `src/` and `tests/`. Shipped here.
- `next1`, `next2`, ...: defined by each project. They extend `basic` and only tighten rules (stricter severity or thresholds). They never remove a rule. They list the refactoring targets of the project.

## Install

```sh
npm install --save-dev nostandard-tidy fallow dependency-cruiser
```

## fallow

```json
{
  "extends": ["npm:nostandard-tidy/fallow/basic.json"]
}
```

Arrays replace the parent's in fallow, so the base sets no arrays (`entry`, `ignorePatterns`, `overrides`, ...). Define them in the project.

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
