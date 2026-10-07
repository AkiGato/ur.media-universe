# Media as Universe — U.R. Strategic Dossier

An offline-capable, black-and-white reader for the dossier *Media as Universe: An
Antifragile Framework for Communication Design in the Attention Economy*.

The app opens on an orientation map — a single connected organism whose somas are
the chapters — and reading happens in a paged reader beneath it. It practises what
the manuscript argues: no engagement mechanics, no arousal design, no telemetry,
and no third-party request unless the reader invokes the causal-research
instrument with their own key.

## Run

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

The dev server listens on `http://localhost:3000`. The optional build-time key is
documented in `.env.example`; copy it to `.env.local` if you want one.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build, then `stamp-sw` — never run bare `vite build` |
| `npm run stamp-sw` | Rewrites `dist/sw.js` with a cache version derived from the emitted asset hashes (`scripts/stamp-sw.mjs`) |
| `npm run preview` | Serve the built output |
| `npm run build:web` | The online export — same build, written to `build/` and stamped there. This is what gets uploaded. |
| `npm run preview:web` | Serve `build/` on :4174, to check the export before it goes up |
| `npm run clean` | Delete `dist/` |
| `npm run lint` | `tsc --noEmit`, then the four static design audits below |
| `npm run audit:lines` | DG-01, *Never a Straight Line* — fails on any `<line>` or `L`-only path (`scripts/audits/static/audit-lines.mjs`) |
| `npm run audit:relations` | Walks every edge of the relations graph and round-trips every page through an anchor; fails on a dangling one (`scripts/audits/static/audit-relations.mjs`) |
| `npm run audit:figures` | Checks the figures redrawn in `docs/presentation.html` against the app's own diagram components — same cells, same names, same edges (`scripts/audits/static/audit-figures.mjs`) |
| `npm run audit:definitions` | TY-04, *Literal Document Text* — every glossary entry must be verbatim manuscript text (`scripts/audits/static/audit-definitions.mjs`) |

Three further audits are **runtime** and need a rendered DOM — they are pasted into
the browser console rather than run from npm. See
[scripts/README.md](scripts/README.md).

## Repository layout

```
.
├── index.html                  the app shell; the boot mark is inlined here
├── vite.config.ts              chunking, warmup, es2022 target
├── tsconfig.json
├── package.json
├── .env.example                the one optional build-time variable, VITE_GEMINI_API_KEY
├── .gitattributes · .gitignore
├── .claude/launch.json         dev (3000) / preview (4173) / dev-alt (3011) launch profiles
├── .github/workflows/ci.yml    lint + build on every push
│
├── src/
│   ├── main.tsx                mounts the app, registers the service worker
│   ├── App.tsx                 top-level state, theme, the map/reader handoff
│   ├── index.css               self-hosted typeface, tokens, every keyframe
│   ├── data/                   the manuscript and everything derived from it
│   │   ├── bookData.ts           chapters, case studies, citations, bibliography
│   │   ├── pageModel.ts          derives BOOK_PAGES and FIGURES from bookData
│   │   ├── promptData.ts         the production ruleset
│   │   ├── relations.ts          the graph — what links to what, written once
│   │   ├── anchors.ts            where a mark points (stable across repagination)
│   │   ├── searchIndex.ts        one index serving every lookup surface
│   │   ├── userStore.ts          bookmarks, highlights, notes — localStorage only
│   │   ├── definitions.ts        the dossier's definitions of its own terms, verbatim
│   │   ├── emphasis.ts           the manuscript's *emphasis* markers, parsed once
│   │   ├── causalAnalysis.ts     the Causal Taxonomy applied to a reader's source
│   │   └── causalResearch.ts     the opt-in research instrument (reader-supplied key)
│   ├── components/
│   │   ├── Orrery.tsx            the map (lazy-loaded, its own chunk)
│   │   ├── BookSpread.tsx        the paged reader
│   │   ├── PageRenderer.tsx      renders one sheet from the page model
│   │   ├── IntroScreen.tsx       the way in; three lines and the cell, before the map
│   │   ├── FigureStage.tsx       full-bleed stage a figure opens onto
│   │   ├── InstrumentStage.tsx   full-bleed stage for the research instrument
│   │   ├── ChapterOpener.tsx     a chapter's cell, grown to the head of the page
│   │   ├── DataFlower.tsx        the cover flower
│   │   ├── HeaderNav.tsx · SearchModal.tsx · SettingsDrawer.tsx
│   │   ├── TableOfContentsDrawer.tsx   the index drawer, Export / Restore marks
│   │   ├── PromptComposer.tsx · PromptFolders.tsx · PromptRuleCard.tsx
│   │   ├── figures/              LivingFigure + FigurePrimitives — every figure is built here
│   │   ├── diagrams/             the six figures, each a LivingFigure declaration
│   │   ├── organic/              the map's vocabulary applied to page chrome
│   │   └── widgets/              FiveQuestionsWidget + AntifragilityGraph, ContentBudgetWidget
│   └── utils/                  a11y, ambient music, page-turn audio, device tier,
│                               dismiss stack, fit-to-box, frame-budget probe
│
├── public/
│   ├── sw.js                   service worker template; stamped at postbuild
│   ├── fonts/                  self-hosted woff2 (IBM Plex Sans variable, Newsreader 300),
│   │                           roman and italic, latin and latin-ext
│   └── audio/                  three ambient tracks (~29 MB), named artist--title.mp3;
│       └── CREDITS.md            served verbatim, never precached; provenance and licences here
│
├── scripts/
│   ├── README.md               what each script enforces and how to run it
│   ├── stamp-sw.mjs            postbuild: version + precache list into dist/sw.js
│   └── audits/
│       ├── static/             run by npm and CI
│       │   ├── audit-lines.mjs       DG-01, Never a Straight Line
│       │   ├── audit-relations.mjs   relations graph + anchors round-trip
│       │   ├── audit-figures.mjs     the deck's figures against the app's
│       │   └── audit-definitions.mjs TY-04, the glossary against the manuscript
│       └── runtime/            paste into the browser console
│           ├── graph-audit.js        OG-02, Nothing Floats
│           ├── label-audit.js        TY-08, label collision budget
│           └── text-audit.js         TY-02/TY-03 sizes and tracking, LY-02 fit
│
├── docs/
│   ├── README.md               short index of this folder
│   ├── design/                 the 68 binding rules, split by subject (start at 00-index.md)
│   ├── OPEN.md                 known divergences between manuscript, figures, rules and code
│   ├── dataviz.md              data-visualisation principles, and the monochrome constraint
│   ├── presentation.html       a ten-sheet presentation of the project; self-contained
│   └── presentationdesign.md   the design decisions behind the deck, and their measurements
│
├── dist/                       local build output (git-ignored)
└── build/                      the online export (git-ignored) — `npm run build:web`
```

## Documentation map

Every Markdown file in the repository, and what it is for.

### Entry points

| File | What it holds |
| :-- | :-- |
| [README.md](README.md) | This file — how to run, the layout, and where everything is documented. |
| [CLAUDE.md](CLAUDE.md) | Instructions for agents and contributors: the twelve invariants that hold in every session, the table of which rules file covers what, and how to cite a rule. Read first. |
| [AGENTS.md](AGENTS.md) | The same entry point for agents that do not read `CLAUDE.md`: how to run the project, and a direct link to each of the ten rules files. |
| [docs/README.md](docs/README.md) | Short index of the `docs/` folder — rules, backlog, presentation. |
| [docs/OPEN.md](docs/OPEN.md) | The backlog of known divergences — ten entries, six of them closed and kept for the record. Check it before concluding something is a bug; add to it rather than leaving a `TODO`. |
| [scripts/README.md](scripts/README.md) | The build step and the seven audits: which are static (run in `lint` and CI), which are runtime (pasted into the console), and which rule each one enforces. |
| [docs/dataviz.md](docs/dataviz.md) | Data-visualisation principles: which channel carries magnitude, how identity is encoded when there is no colour, ordering, small multiples, and what interaction may and may not be asked to carry. |
| [docs/presentationdesign.md](docs/presentationdesign.md) | The aesthetic and design decisions behind `docs/presentation.html`, and the measurements that settled them — including where the deck departs from `docs/design/` and why. |
| [public/audio/CREDITS.md](public/audio/CREDITS.md) | Artist, title, source and licence for each ambient track. Two are CC BY-NC-SA; one is unverified and flagged. |

### Design rules — `docs/design/`

69 rules, binding. Each has a stable ID cited in code comments and a name cited in
prose; the index is the only place the two are bound together.

| File | Prefix | Rules | Covers |
| :-- | :-- | --: | :-- |
| [00-index.md](docs/design/00-index.md) | — | — | The index: one line per rule with ID, name and summary, the citation convention, and which rules are enforced by scripts. Start here. |
| [01-drawing-grammar.md](docs/design/01-drawing-grammar.md) | `DG` | 9 | What a mark may be — stroke, taper, wander, grain, fields. Never a straight line; never a filled area. Applies identically to map, figures, openers and seeds. |
| [02-organism-and-graph.md](docs/design/02-organism-and-graph.md) | `OG` | 8 | What connects to what, and how a connection is drawn. Nothing floats; a connection is oriented and taper is the only thing that says so. |
| [03-light-and-clocks.md](docs/design/03-light-and-clocks.md) | `LC` | 5 | How light moves and what may keep time. Light travels by phase; one period (19.7s) is fixed and every other clock derives from it. |
| [04-ground-and-colour.md](docs/design/04-ground-and-colour.md) | `GR` | 8 | What lies behind the drawing and what colour anything may be. Every drawing surface is black in both themes; ink is monochrome, hue exists only in emitted light. |
| [05-figures-and-worlds.md](docs/design/05-figures-and-worlds.md) | `FW` | 10 | The data visualisations, the surfaces they open onto, and the arguments each is required to make. A figure is the map at figure scale, never a bespoke composition. |
| [06-typography-and-copy.md](docs/design/06-typography-and-copy.md) | `TY` | 8 | One family, one weight (300), three sizes (9/12/18), uppercase tracked 0.2em — and the hard limit on what text may exist at all. No copy is written unless it was asked for. |
| [07-motion-and-input.md](docs/design/07-motion-and-input.md) | `MO` | 8 | Idle motion versus response: ambient cycles are slow, input lands immediately, one easing (`--ease-organic`) serves both. Touch propagation. |
| [08-layout-and-chrome.md](docs/design/08-layout-and-chrome.md) | `LY` | 7 | Entry, page bounds, gesture reading, and the absolute prohibitions on interface geometry: the viewport never scrolls, zero rounded corners, no hard outlines. Content is data. |
| [09-performance.md](docs/design/09-performance.md) | `PF` | 4 | Four measured regressions on this drawing, three catastrophic. Each rule carries the frame rate that produced it. |
| [10-method.md](docs/design/10-method.md) | `ME` | 1 | How a rule is established, checked and overturned. Verify by measurement, not by eye, and record the value. |

## Architecture

```
src/data/bookData.ts      the manuscript — chapters, case studies, citations
src/data/pageModel.ts     derives BOOK_PAGES from the manuscript
src/data/relations.ts     the graph between sections, figures, rules and sources
src/data/promptData.ts    the production ruleset
src/components/Orrery.tsx the map (lazy-loaded, its own chunk)
src/components/figures/   LivingFigure + primitives — every diagram is built here
```

**Content is data.** Pages are derived from `bookData.ts`, never hand-authored, and
the page count follows from `BOOK_PAGES.length`. Removing a case study is a data
edit; the book renumbers itself. Never hard-code a page count.

**Design rules live in [docs/design/](docs/design/00-index.md)** and are binding —
69 rules covering the drawing grammar, the graph, light, ground, figures,
typography, motion, layout and the measured performance constraints behind them.
Read the file covering what you are about to touch, before you touch it. Some of
the rules are enforced by `scripts/` — four static audits inside `lint` and CI,
three runtime ones pasted into the console (see
[scripts/README.md](scripts/README.md)); the rest are held by
[ME-01](docs/design/10-method.md).

[CLAUDE.md](CLAUDE.md) carries the invariants that hold in every session and the
map of which rules file covers what. [docs/OPEN.md](docs/OPEN.md) tracks the
places where the manuscript, the figures, the rules and the code currently
disagree.

## Reader state

Preferences, bookmarks, highlights and the last page live in `localStorage` only —
nothing is sent anywhere. Because browser storage is not durable (Safari evicts it
after ~7 days of inactivity), the index drawer offers **Export Marks** / **Restore**,
which round-trip everything through a JSON file the reader keeps.

## Offline

A service worker precaches the built assets and serves them cache-first, with
network-first navigations so a deploy is never shadowed by a stale shell. Both
typefaces are self-hosted in `public/fonts`, so a cold offline load keeps its
typography and no third-party host sees the reader. `index.html` preloads the
body face's latin subset and nothing else, and that href has to name a file that
is actually there — it pointed at a deleted subset for a while, which spent a
request on a 404 every cold load. The ambient audio in
`public/audio` is deliberately left out of the precache; its provenance and
licences are in [public/audio/CREDITS.md](public/audio/CREDITS.md).

## Presentation

[docs/presentation.html](docs/presentation.html) is a ten-sheet presentation
of the dossier, drawn in the project's own grammar: an opening, eight sheets in
two parts — the diagnosis and the response — and a close. It is self-contained — the typeface is embedded — and
depends on nothing in the build. Open it in a browser directly.
