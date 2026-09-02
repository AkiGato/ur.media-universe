# scripts/

## Build

- `stamp-sw.mjs` — post-build step. Rewrites `dist/sw.js` with a cache version
  derived from the emitted asset hashes and precaches those assets. Runs
  automatically via the `postbuild` npm script; without it every deploy would
  keep serving the previous shell.

## Audits

The design rules in [`docs/design/`](../docs/design/00-index.md) are mostly
perceptual, which is exactly why they regress silently. These make three of them
checkable — the rest are held by [ME-01, Verify by Measurement, Not by
Eye](../docs/design/10-method.md).

- `audits/static/audit-lines.mjs` — **static**, runs in `npm run lint` and in CI.
  Fails on any `<line>` element or literal `L`-only path outside the
  allow-listed data grid (DG-01, "Never a Straight Line").

- `audits/static/audit-relations.mjs` — **static**, runs in `npm run lint` and in
  CI. Bundles the data layer with esbuild, walks every edge of the relations
  graph, requires every inline citation to resolve to a bibliography entry, and
  round-trips every page through an anchor. Fails on a dangling one.

- `audits/runtime/graph-audit.js` — **runtime**. Reconstructs the map's graph from
  rendered geometry and BFS-checks that every node is reachable from the core
  (OG-02, "Nothing Floats"). Paste into the browser console with the Orrery on
  screen; returns `{ ok, nodes, edges, unreachable }`.

- `audits/runtime/label-audit.js` — **runtime**. Compares every `<text>` rect against
  every other and against the SVG frame (TY-08, "Labels Have a Collision
  Budget"). Paste into the console with a figure on screen; returns
  `{ ok, checked, collisions, overruns }`.

The two runtime audits need a rendered DOM, so they are deliberately dependency
free — no headless browser is installed for them. Run them in the preview before
shipping a change to the map or to any figure.
