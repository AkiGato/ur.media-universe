# Media as Universe — U.R. Strategic Dossier

An offline-capable black-and-white reader for a dossier about the attention
economy. It practises what the manuscript argues: no engagement mechanics, no
arousal design, no telemetry.

React 19 + Vite + Tailwind 4. `npm run dev` (port 3000), `npm run lint`
(typecheck, the straight-line audit **and** the relations audit), `npm run build` (never bare
`vite build` — the postbuild step stamps the service worker).

## The design rules are binding, and they are not in this file

**70 rules live in [`docs/design/`](docs/design/00-index.md).** They are the
record of what has already been tried on this drawing and what it cost; most
were written after a regression and several carry the measured frame rate that
produced them. Start at the index, then **read the file covering what you are
about to touch, before you touch it** — the index summaries are pointers, not
rules, and none is sufficient to work from.

| File | Covers |
| :-- | :-- |
| [`01-drawing-grammar`](docs/design/01-drawing-grammar.md) `DG` | what a mark may be — stroke, taper, wander, grain, fields |
| [`02-organism-and-graph`](docs/design/02-organism-and-graph.md) `OG` | what connects to what, and how a connection is drawn |
| [`03-light-and-clocks`](docs/design/03-light-and-clocks.md) `LC` | how light moves, and what may keep time |
| [`04-ground-and-colour`](docs/design/04-ground-and-colour.md) `GR` | what lies behind the drawing, and what colour anything may be |
| [`05-figures-and-worlds`](docs/design/05-figures-and-worlds.md) `FW` | the five visualisations and the surfaces they open onto |
| [`06-typography-and-copy`](docs/design/06-typography-and-copy.md) `TY` | type, labels, and the hard limit on what text may exist |
| [`07-motion-and-input`](docs/design/07-motion-and-input.md) `MO` | idle motion, response, transitions, touch |
| [`08-layout-and-chrome`](docs/design/08-layout-and-chrome.md) `LY` | entry, page bounds, gestures, interface geometry |
| [`09-performance`](docs/design/09-performance.md) `PF` | four measured regressions, three of them catastrophic |
| [`10-method`](docs/design/10-method.md) `ME` | how a rule here is established, checked and overturned |

Cite rules by ID in code comments (`// PF-02`), by name in prose. The index is
the only place the two are bound together.

## What must hold in every session, without looking anything up

These are the ones that get broken by accident. Each is the summary of a rule —
open the file before working against one.

- **Content is data.** Pages derive from `src/data/bookData.ts` via
  `pageModel.ts`, never hand-authored. Never hard-code a page count; it follows
  from `BOOK_PAGES.length`. Removing a case study is a data edit. (LY-01)
- **No copy is written for this app unless it was asked for.** Not a subtitle,
  strapline, caption, empty state, or sentence introducing a control. When in
  doubt ship nothing and ask. (TY-04)
- **Nothing is drawn as a straight segment** — no `<line>`, no `L`-only path,
  no zero-bow filament, no exception. `npm run lint` fails on it. (DG-01)
- **Nothing is ever a filled area.** Flat tone over an area is a blob at any
  opacity. The only fills in the system are the light sources. (DG-02)
- **Three type sizes — 9, 12, 18 — two families, one weight (300).** Newsreader
  sets titles, IBM Plex Sans sets everything else, and nothing else is loaded.
  Named Tailwind size steps are banned. Contrast never comes from weight, ever.
  (TY-01, TY-02)
- **Uppercase is tracked 0.2em. Nothing else is tracked at all.** (TY-03)
- **One easing, `--ease-organic`**, mirrored by `EASE` in JS. (MO-02)
- **The viewport never scrolls vertically.** Content scrolls inside its own
  column via `.soft-scroll`. (LY-02)
- **Zero rounded corners, no hard outlines.** (LY-05, LY-06)
- **A name is said once per frame.** If a surface already says what a thing is,
  nothing on it may say it again. (TY-05)
- **Every drawing surface is black in both themes.** `isDark` must never reach
  a surface whose job is to hold tissue. (GR-01)
- **Verify by measurement, not by eye**, and record the value. When the
  measurement and the eye disagree, the measurement wins. (ME-01)

## Known divergences

[`docs/OPEN.md`](docs/OPEN.md) carries the places where the manuscript, the
figures, the rules and the code currently disagree. Check it before concluding
that something is a bug, and add to it rather than leaving a TODO in a rule.
