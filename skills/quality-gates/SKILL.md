---
name: quality-gates
description: Operational manual for a fallow structural quality gate built on nostandard-tidy. Use when asked to clean up complexity, coupling, duplication, dead code, architecture, styling, the score or the debt, when finding who uses a function, or before editing a gate config or baseline. Load code-quality-smells only when rewriting a named function. Apply only when the project has a fallow gate config; never invent one.
---

# Quality gates

`code-quality-smells` is the shape list. This skill is the workflow: find the debt, open one problem, keep the gate green. Policy and rationale live in the project's gate notes, usually `quality/fallow/README.md`.

Apply only when a gate config exists, usually `quality/fallow/gate*.jsonc`. Never invent a gate, a baseline or a config.

The examples assume the wrapper scripts a project normally adds: `yarn fallow.basic`, `yarn fallow.<category>`, `yarn fallow.<category>.raw`, `yarn fallow.debt`, `yarn fallow.debt.prune`. The wrappers call `tidy` from `nostandard-tidy`, so the script names are the same in every project. If a project has no wrappers, run the same fallow subcommand with its gate or category config. The score wrapper is usually named `fallow.score` and runs `fallow health`.

## What a gate line means

Four different things can make a gate pass or fail. Do not read them as one:

- blocking findings: rule severity `error`, not matched by a baseline.
- identity baseline: each entry pins one finding. A matched finding is accepted; a new one blocks; a removed one leaves a stale entry that blocks until prune. It is not a count budget.
- numeric threshold: duplication is a percentage limit set in the gate. It tolerates volume below the limit.
- score floor: the score is `100 - penalties`, not a percentage of checks. Grade A starts at 85; 85 is the recommended floor.

A warning is debt, not a gate failure. Promote a rule to `error` only when it reaches zero findings.

## Commands

- `yarn fallow.basic`: the gate. Applies the baseline. Fails on new findings, stale entries, a threshold breach or a score below the floor. Lists no findings.
- `yarn fallow.<category>`: aggregate counts. Does not apply the baseline; its exit code is not a verdict.
- `yarn fallow.<category>.raw`: fallow's report with the same config. Arguments are forwarded: `--file`, `--top`, `--sort`, `--trace`, or a positional path. Exit 1 means findings, not a broken command.
- `yarn fallow.debt`: accepted findings grouped by file. `yarn fallow.debt.prune`: drop entries that no longer match.

Categories: `dead-code`, `complexity`, `score`, `duplication`, `architecture`, `styling`.

Do not call `fallow complexity`; there is no such subcommand.

## The tidy CLI

`tidy gate` runs the five analyses once and prints one verdict.

- `tidy gate`: the only command that applies the baseline and the score floor.
- `tidy category <name>`: one category, at its strict severity.
- `tidy raw <name>`: the same config with its rule severities untouched, for a report.
- `tidy debt`: the accepted findings. `tidy prune`: drops stale entries only.

Configs are discovered at `quality/fallow/<layer>.jsonc`, or the unique `quality/fallow/<layer>.<project>.jsonc`; `--config-dir` overrides the directory.

Exit codes: `0` clean; `1` findings, a threshold breach, a score below the floor or a stale entry; `2` a tool or config error. A `2` is never a verdict: fix the command, not the code.

## Workflow

On a card, start from the files the card touches and filter with `--file` or a positional path. Do not open a problem the card is not already touching. For a repo-wide question, start from the score and follow the mapping.

The penalties line is a hint, not a category selector:

- `complexity`, `p90_complexity` -> `fallow.complexity.raw --top N`
- `unit_size` -> `fallow.score.raw`, function length (`complexity-file-lines` is off by design)
- `coupling` -> `fallow.score.raw`, file fan-in
- `duplication` -> `fallow.duplication.raw --top N`
- `dead_exports`, `dead_files`, `unused_deps` -> `fallow.debt`; remove, do not rewrite
- `circular_deps` -> dependency-cruiser, not `architecture.raw`
- `maintainability` -> `fallow.score.raw`, file scores
- styling is not a penalty; open `styling.raw` only when the question is styling

Pay one finding according to what the raw names:

- a function to rewrite: load `code-quality-smells`, apply it to that function only;
- a dead export: delete it after `fallow dead-code --trace <file:export>`;
- a clone: extract only if the project's second clone detector also reports it;
- a layer: use the project's next dependency-cruiser rule.

Removing a pinned finding makes its entry stale: run `yarn fallow.debt.prune` in the same change, or the gate fails. Keep `yarn fallow.basic` green and finish with the project's full check.

A full raw dump is noise. Narrow it before reading.

## Score

The score is a trend, not a target. 100 is unreachable on a large codebase because coupling and unit size are aggregate penalties; do not spend a card chasing points. Stay above the floor, do not regress, and use the penalties to choose where to work. `--save-snapshot` and `--trend` compare runs. `--min-score` is fallow's own score gate and belongs to a project that wants the score authoritative.

## Debt and config

Never edit a baseline by hand, run `--save-baseline` to silence a finding, or set a rule to `off` to get a green gate. `off` is a structural exception decided in the target config. New debt is an explicit reviewed diff. Prune only removes.

Upstream ships one file per category plus `all.tidy.jsonc`; a project base owns the arrays; a `target.*` file is the only place a rule is lowered to `off` or `warn`; a `<category>.*` file adds what a single command needs. The gate composes base, all and the targets, and never extends a category file.

A level never removes a rule, and nothing upstream is edited in the project. `basic`, `recommended` and `strict` remain shipped for compatibility only.

A library folder is the one place where an unused export is not debt: it ships API it does not consume. Keep that exception scoped to the folder, in a config that lives inside it and is inherited by the project config. Never turn the rule off globally.

## Dependency-cruiser

Dependency-cruiser owns import cycles and layer boundaries. Fallow keeps them `off` for that reason: do not re-enable them there, and do not duplicate a boundary rule in both tools.

- `yarn depcruise.basic` is the structural gate. It runs in the project check and in CI, separately from the fallow gate; keep both green.
- `yarn depcruise.debt` (or if one wants, debt1, debt2...) are ratchets toward stricter layers, not gates. They fail by design while the codebase catches up: never wire them into the check or CI.
- The exit code is the number of violations: `0` is clean, a number such as `42` means 42 violations, not a broken command.

A violation reads `<rule>: <from> -> <to>`. Fix it by routing the import through the gateway layer the rule declares, or by inverting the dependency. A cycle is broken by extracting the shared piece downward, not by adding an exception.

Do not silence a violation with a new exception. Exceptions are project options with a reason, in the project's depcruise config, and they get reviewed. Upstream helpers come from `nostandard-tidy/depcruise/*`; do not edit those in the project. `nodeResolve` is for Node packages, including the ones that expose `exports` without `main`; use `hygiene({srcPath, testsPath})` with the project's real test root.

## Coupling and trace

A coupling penalty is file fan-in, not a function. Do not add a dependency-cruiser instability rule for it: instability flags leaves, not hubs. File fan-in is a hint, not a threshold.

When the question is who uses a symbol:

```bash
fallow trace src/lib/foo.js:bar --callers --depth 1 -f json
fallow trace src/lib/foo.js:bar --callers --depth 3 -f json
fallow trace src/lib/foo.js:bar --callees --depth 5 -f json
```

`--callers --depth 1` is direct consumers; `--depth 3` is the blast radius; `--callees --depth 5` is the helper chain. The default depth 2 is only a glance. Trace is syntactic and best-effort: unresolved callees are reported, so a small caller count is not a fact. Confirm with a code index. Svelte components, callbacks and barrels often land there. A forwarded parameter stays a review smell, not a trace result. `--path` is the shortest import path between two modules; `--dependency` is how a package is used. Neither measures function coupling. Do not put trace in CI or turn a caller count into a threshold.
