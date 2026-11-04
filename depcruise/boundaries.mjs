// Generic boundary helpers.

const rule = (name, from, to) => ({
  name, severity: 'error', from, to,
})

export const noCircular = () => rule('no-circular', {}, {circular: true})

// Ordered layers, lowest first: a lower layer never imports a higher one.
// layers: [{name, path}]
export const layers = list => list.flatMap((low, index) =>
  list.slice(index + 1).map(high => rule(
    `${low.name}-not-to-${high.name}`,
    {path: low.path},
    {path: high.path},
  )))

// `from` must not import `to` (e.g. skipping a layer).
export const notTo = (from, to, {pathNot} = {}) => rule(
  `${from.name}-not-to-${to.name}`,
  {path: from.path},
  pathNot ? {path: to.path, pathNot} : {path: to.path},
)

// Only `gateway` (under `scope`) may import the given npm packages.
export const onlyFrom = (name, {scope, gateway, to}) =>
  rule(name, {path: scope, pathNot: gateway}, to)
