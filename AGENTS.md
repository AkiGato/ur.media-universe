# AGENTS.md

Instructions for any agent or contributor working on this repository. The
session invariants are in [`CLAUDE.md`](CLAUDE.md); the rules themselves are
below, one link each.

## The project

An offline-capable black-and-white reader for a dossier about the attention
economy. React 19 + Vite + Tailwind 4.

```bash
npm install
npm run dev     # port 3000
npm run lint    # typecheck + the three static audits
npm run build   # never bare `vite build` — postbuild stamps the service worker
```

## The design rules are binding

**69 rules, split across ten files by subject.** They are the record of what has
already been tried on this drawing and what it cost; most were written after a
regression and several carry the measured frame rate that produced them.

**Read the file covering what you are about to touch, before you touch it.** The
summaries below are pointers, not rules, and none is sufficient to work from.

| File | Prefix | Covers |
| :-- | :-- | :-- |
| [01-drawing-grammar](docs/design/01-drawing-grammar.md) | `DG` | what a mark may be — stroke, taper, wander, grain, fields |
| [02-organism-and-graph](docs/design/02-organism-and-graph.md) | `OG` | what connects to what, and how a connection is drawn |
| [03-light-and-clocks](docs/design/03-light-and-clocks.md) | `LC` | how light moves, and what may keep time |
| [04-ground-and-colour](docs/design/04-ground-and-colour.md) | `GR` | what lies behind the drawing, and what colour anything may be |
| [05-figures-and-worlds](docs/design/05-figures-and-worlds.md) | `FW` | the visualisations and the surfaces they open onto |
| [06-typography-and-copy](docs/design/06-typography-and-copy.md) | `TY` | type, labels, and the hard limit on what text may exist |
| [07-motion-and-input](docs/design/07-motion-and-input.md) | `MO` | idle motion, response, transitions, touch |
| [08-layout-and-chrome](docs/design/08-layout-and-chrome.md) | `LY` | entry, page bounds, gestures, interface geometry |
| [09-performance](docs/design/09-performance.md) | `PF` | four measured regressions, three of them catastrophic |
| [10-method](docs/design/10-method.md) | `ME` | how a rule is established, checked and overturned |

[`docs/design/00-index.md`](docs/design/00-index.md) lists all 69 with their IDs
and one-line summaries, and is the only place a rule's ID and its name are bound
together. Cite the **ID** in code comments (`// PF-02`), the **name** in prose.

## Before concluding something is a bug

[`docs/OPEN.md`](docs/OPEN.md) carries the places where the manuscript, the
figures, the rules and the code currently disagree. Add there rather than
leaving a `TODO` in a rule.
