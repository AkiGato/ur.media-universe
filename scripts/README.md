# scripts/

## Build

- `stamp-sw.mjs` — post-build step. Rewrites `dist/sw.js` with a cache version
  derived from the emitted asset hashes and precaches those assets. Runs
  automatically via the `postbuild` npm script; without it every deploy would
  keep serving the previous shell.

## Audits

The design rules in [`docs/design/`](../docs/design/00-index.md) are mostly
perceptual, which is exactly why they regress silently. These seven make some of
them checkable — the rest are held by [ME-01, Verify by Measurement, Not by
Eye](../docs/design/10-method.md).

- `audits/static/audit-lines.mjs` — **static**, runs in `npm run lint` and in CI.
  Fails on any `<line>` element or literal `L`-only path outside the
  allow-listed data grid (DG-01, "Never a Straight Line").

- `audits/static/audit-relations.mjs` — **static**, runs in `npm run lint` and in
  CI. Bundles the data layer with esbuild, walks every edge of the relations
  graph, requires every inline citation to resolve to a bibliography entry, and
  round-trips every page through an anchor. Fails on a dangling one.

- `audits/static/audit-figures.mjs` — **static**, runs in `npm run lint` and in
  CI. Evaluates the app's diagram components and checks that the hand-kept
  copies of them inside [`docs/presentation.html`](../docs/presentation.html)
  still agree about which cells exist, what each is called, and what connects to
  what. Semantics only — coordinates are excluded, because FW-01 and FW-06
  require a figure to be re-laid-out for the rectangle it is drawn in.

- `audits/static/audit-definitions.mjs` — **static**, runs in `npm run lint` and
  in CI. Checks every entry in `src/data/definitions.ts` against the manuscript:
  each quote must be an exact substring of a paragraph in `bookData.ts`, each
  term must be a word the cited section actually uses, and each section id must
  resolve. A glossary is the easiest surface in the app to start writing on, and
  TY-04 is the rule it would break first — this makes that prohibition
  mechanical. It reports the character at which a quote diverges, because a
  glossary drifts by one word and "not found" on a 300-character quote is not a
  diagnosis.

- `audits/runtime/graph-audit.js` — **runtime**. Reconstructs the map's graph from
  rendered geometry and BFS-checks that every node is reachable from the core
  (OG-02, "Nothing Floats"). Paste into the browser console with the Orrery on
  screen; returns `{ ok, nodes, edges, unreachable }`.

- `audits/runtime/text-audit.js` — **runtime**. The computed-style sweep TY-02
  and TY-03 both ask for by name, plus the fit checks LY-02 implies: every
  rendered size must be 9, 12 or 18; tracking must be 0.2em and only on
  uppercase; no text may be cut off by an ancestor that cannot scroll; no two
  pieces of text on the same layer may overlap. Call `settle()` first — the
  reader arrives under a one-shot scale animation, and a preview pane that is
  not compositing holds it at its first frame forever, which measures exactly
  like a layout bug. Returns `{ ok, sizes, badSizes, badTracking, overflow,
  clipped, collisions, offscreen }`.

- `audits/runtime/label-audit.js` — **runtime**. Compares every `<text>` rect against
  every other and against the SVG frame (TY-08, "Labels Have a Collision
  Budget"). Paste into the console with a figure on screen; returns
  `{ ok, checked, collisions, overruns }`.

The two runtime audits need a rendered DOM, so they are deliberately dependency
free — no headless browser is installed for them. Run them in the preview before
shipping a change to the map or to any figure.
