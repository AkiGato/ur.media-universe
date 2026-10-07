# docs/

Everything about the project that is not the project. The root
[README](../README.md) carries the same map in full; this file is the short
index for anyone who lands here first.

| Path | What it is |
| :-- | :-- |
| [design/](design/00-index.md) | The 68 binding design rules, split into ten files by subject, each rule with a stable ID. Start at `00-index.md`; read the file covering what you are about to touch before touching it. |
| [OPEN.md](OPEN.md) | Known divergences between the manuscript, the figures, the rules and the code. Closed entries are struck through and kept. Add here rather than leaving a `TODO` in code or in a rule. |
| [presentation.html](presentation.html) | A ten-sheet presentation of the dossier, its figures and the reader, drawn in the project's own grammar. Self-contained — typeface embedded, no build, no network. Open directly in a browser. |
| [dataviz.md](dataviz.md) | Universal data-visualisation principles — visual channels, identity without colour, ordering, small multiples, interaction — and what each costs in a monochrome drawing. Principles, not audited rules; where one disagrees with `design/`, the design rule wins. |
| [presentationdesign.md](presentationdesign.md) | The aesthetic and design decisions behind the presentation, and the measurements that settled them. Where the deck departs from `design/`, this says where and why. |

## The rules files

| File | Prefix | Covers |
| :-- | :-- | :-- |
| [01-drawing-grammar](design/01-drawing-grammar.md) | `DG` | what a mark may be — stroke, taper, wander, grain, fields |
| [02-organism-and-graph](design/02-organism-and-graph.md) | `OG` | what connects to what, and how a connection is drawn |
| [03-light-and-clocks](design/03-light-and-clocks.md) | `LC` | how light moves, and what may keep time |
| [04-ground-and-colour](design/04-ground-and-colour.md) | `GR` | what lies behind the drawing, and what colour anything may be |
| [05-figures-and-worlds](design/05-figures-and-worlds.md) | `FW` | the data visualisations and the surfaces they open onto |
| [06-typography-and-copy](design/06-typography-and-copy.md) | `TY` | type, labels, and the hard limit on what text may exist |
| [07-motion-and-input](design/07-motion-and-input.md) | `MO` | idle motion, response, transitions, touch |
| [08-layout-and-chrome](design/08-layout-and-chrome.md) | `LY` | entry, page bounds, gestures, interface geometry |
| [09-performance](design/09-performance.md) | `PF` | four measured regressions, three of them catastrophic |
| [10-method](design/10-method.md) | `ME` | how a rule is established, checked and overturned |

## Where the rest lives

- Contributor and agent invariants: [`../CLAUDE.md`](../CLAUDE.md) and [`../AGENTS.md`](../AGENTS.md)
- Build step and audits: [`../scripts/README.md`](../scripts/README.md)
- Audio provenance and licences: [`../public/audio/CREDITS.md`](../public/audio/CREDITS.md)
