---
name: code-quality-smells
title: Code quality smells
description: "Use when reviewing or cleaning up code: ambiguous outcomes, leaky contracts, duplicated state, hidden decomposition, side effects, coupling, unowned shared state and bscured intent."
---

# Code quality smells

Look for this kind of code "bad" patterns and find a way to improve them:

## Excessive coupling

if a single PR is touching a lot of files just to change one or two small things, it means coupling is too high

*Solution*: Investigate the dependency structure and reduce change amplification by clarifying ownership, narrowing interfaces, consolidating genuinely related responsibilities or separating unrelated ones.

## Ambiguous outcomes

failures, absence and valid results must remain distinguishable. Do not swallow errors (including a `try` inside a service whose caller already handles them), return degenerate fallback values (`undefined`, `''`, `[]`, `0`) or use existence checks (`if (!something)`, `record?.status !== 'available'`) without a spec that defines their meaning. Absence is legitimate, but must be represented explicitly.

*Solution*: Convert raw storage/API states once, in the module that owns the schema, into a closed domain set. Fail fast unless the spec explicitly requires collecting or ignoring errors.

## Leaky contracts

consumers depend on implementation details instead of domain contracts (raw rows, storage shapes, internal status strings like `cover.status === 'available'` in a component), or platform differences leak into the middle layer (`T | Promise<T>`, throwing stubs).

- *Solution*: Keep schema interpretation inside its owning module; expose intent-named queries and domain operations, not raw accessors. Give the platform abstraction one signature for every backend; an unsupported backend fails at startup, not at call time.

## Unowned shared state

a module-level `Map` with no reset and no invalidation. Not isolatable in tests, stale on write.

*Solution*: Create the state in a factory and pass it in, so tests can isolate it; give it an owner that resets and invalidates it, or remove it. Do not add a cache without a measurement and an invalidation owner.

## Duplicate sources of truth

two stored values representing the same fact can contradict each other (`isEmpty: false` next to `items`).

*Solution*: Store canonical facts and derive everything else. If denormalization is necessary, define one explicit owner for consistency, updates and invalidation.

## Hidden decomposition

many private helpers chained in one method (f1 calls f2 calls f3), or a private helper shorter than its own signature. Both mean the decomposition costs more than the code it hides.

*Solution*: Unfold them all and then find some better composition, one that could be verified from the public contract

## Hidden side effects

functions that mutate external state (filesystem, external APIs, services) while presenting themselves as queries or pure computations, or that unnecessarily mix pure decisions with I/O.

*Solution*: Make mutations explicit in the operation's name and contract. Separate pure decisions from I/O where useful, but do not impose artificial separation when a command legitimately returns its result (e.g. an ID or a created record).


## Obscured intent

the code needs help to be understood.

- **Many names for one thing**: more than one word for the same value along a call chain (`covers` / `artwork` / `record`) forces the reader to infer the type from usage. Pick the domain's own word and use it everywhere. Name things for what they are in the domain, not for their storage shape.

- **Comments that explain what**: a comment describing what a function or module does means the code is not saying it. Rename or restructure until the comment is redundant, then delete it. Keep only a comment that records a non-obvious *why* (a constraint, a workaround, a spec reference). TODOs must describe a concrete unresolved task or constraint. Avoid TODOs that merely excuse incomplete code or defer decisions without an explicit reason.