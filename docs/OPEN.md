# Open divergences

Where the manuscript, the figures, the rules and the code currently disagree.
This file exists so a known problem is never parked inside a rule — a rules file
states what is true, and a backlog states what is not yet.

Add to it rather than leaving a `TODO` in a component or in `docs/design/`.
Remove an entry when it is closed, not when it is explained.

---

## 1 · The prose still calls the three roots "a triangulated reading"

**Rule:** [FW-09 — A List Is Not a Cause](design/05-figures-and-worlds.md)
**Code:** [`src/data/bookData.ts:453`](../src/data/bookData.ts)

FIG 3.1 was rebuilt as a causal order: two external roots converge, the
convergence passes through the reader as a relay, the response comes out the
other side. Chapter 4.2–4.5 still describes three peers — "These three roots,
economic, historical, neuro-psychological, function as a triangulated reading."
The figure and the text now say different things about the same object.

This is a manuscript edit, not a code edit, and TY-04 (**Literal Document Text**)
means it is not ours to write: the source dossier has to change, or the figure
has to justify departing from it in its own caption. Flagged in the rule itself
since the rebuild; recorded here so it is actionable rather than buried.

## 2 · ~~`.ambient-breathe` is an 18s clock in a 19.7s app~~ — CLOSED IN CODE

**Rules:** [LC-03 — One Clock For The Whole App](design/03-light-and-clocks.md),
[LC-05 — A Two-Stop Keyframe Is a Metronome](design/03-light-and-clocks.md)
**Code:** [`src/index.css:445`](../src/index.css) — used by `App.tsx`,
`PageRenderer.tsx`, `LivingFigure.tsx`

Every other cycle in the app is 19.7s: `.strand-breathe`, `.membrane-tide`,
`.vein-breathe`, and `TIDE` in `Orrery.tsx`. `.ambient-breathe` runs at 18s and
reaches the reader and the figures, which is precisely the second cycle LC-03
was written to remove ("Never give the reader its own cycle again"). LC-05 also
fixes the period as a number that may not be changed.

MO-03 quotes "breathing ~18s" in its list of ambient cycles, so the rules
disagree with each other here as well as with the code.

~~Not fixed on sight because 18s and 19.7s beat against each other visibly, and
whether the figures should ride the tide at all is a design call, not a typo.~~

**Closed in code.** The design call was made: the ambience rides the tide.
`.ambient-breathe` is 19.7s, so every breathing cycle in the app —
`.strand-breathe`, `.membrane-tide`, `.vein-breathe`, `.ambient-breathe` and
`TIDE` — now reads the same number, and the 1.7s-per-breath drift between the
reader and the map is gone.

Its **contour** was fixed in the same pass, because LC-05 governs both and this
keyframe broke it twice. It was two stops — `0%, 100%` against `50%` — which is
the symmetric rise and fall that rule names as the thing to avoid ("the eye
finds the beat within a cycle and the motion stops holding attention"). It now
matches the tide it shares a period with: crest early at 43%, a counter-swell
on the way up, a held trough. LC-05 permits precisely this — reshape the
contour freely, never the number.

The `transform: scale()` was left alone. PF-03 bans transforms on big groups,
and all three users of this class are small and bounded — a 132px loading
splash, one pinned cell, the cover flower — which is the case that rule
explicitly leaves open.

**Still open, in prose only:** MO-03 lists ambient cycles as "breathing ~18s".
Breathing is now the tide at 19.7s, so that number is stale and the rules still
disagree with themselves. Rule text is not edited in passing (ME-01), so it is
recorded here rather than changed.

## 3 · ~~"No third-party requests" is stated without its qualification~~ — CLOSED

**Files:** `README.md`, `metadata.json`
**Code:** [`causalAnalysis.ts:287,304`](../src/data/causalAnalysis.ts),
[`causalResearch.ts:68`](../src/data/causalResearch.ts)

Both files claim no third-party requests, unconditionally. The causal-research
instrument fetches `youtube.com/oembed`, `r.jina.ai`, and Google's Gemini API
with a key the reader supplies. Every one is opt-in and user-triggered, and
`causalResearch.ts` documents its own privacy reasoning carefully — but the
top-level claim carries no qualification, and it is the app's central promise.

The honest version is checkable and therefore stronger: *no telemetry, and no
third-party request unless you invoke the causal-research instrument with your
own key.*

**Closed.** `README.md` carries the qualification in its opening paragraph.
`metadata.json` was an AI Studio manifest nothing in the app read; it is retired
to `docs/archive/ai-studio/` as a record and no longer makes the claim anywhere
the app is described.

## 4 · ~~`.env.example` documents a variable the code cannot read~~ — CLOSED

**Files:** `.env.example`, [`causalResearch.ts:52`](../src/data/causalResearch.ts)

`.env.example` documents `GEMINI_API_KEY`; `ambientKey()` reads
`import.meta.env.VITE_GEMINI_API_KEY`. Vite does not expose unprefixed
variables to client code, so the build-time key path can never fire as
documented. The reader-supplied key in `localStorage` works and is the path
actually used.

The rest of `.env.example` describes AI Studio injection, which is not how this
is deployed.

**Closed.** The old file is retired to `docs/archive/ai-studio/env.example`.
The new `.env.example` documents `VITE_GEMINI_API_KEY` — the one name the code
reads — and says that the reader-supplied key in `localStorage` takes precedence.
The `DISABLE_HMR` branch in `vite.config.ts`, the last AI Studio dependency,
went with it.

## 5 · A citation in 3.3 carries one work's name over another work's text

**Code:** [`src/data/bookData.ts`](../src/data/bookData.ts) — section 3.3's citations

`{ authorOrSource: "Edelman Trust Barometer (2024)", text: "Williams (2018), Stand Out of Our Light." }`

The name and the text are two different works. Section 3.3 draws on both — the
three-quarters figure is Edelman's, the attention argument is Williams's — so
this reads as two citations that were collapsed into one line.

Found by [`scripts/audits/static/audit-relations.mjs`](../scripts/audits/static/audit-relations.mjs), which
now requires every inline citation to resolve to a bibliography entry. It
resolves by its **name**, to `edelman-2024`, through the one entry in
`SOURCE_ALIASES` — so the link a reader follows lands on Edelman while the line
they read quotes Williams.

Not fixed on sight because TY-04 (**Literal Document Text**) puts the
manuscript's text outside our hands: the source dossier has to split the line.

## 6 · ~~`npm run lint` type-checks no component~~ — CLOSED

**Files:** `package.json`, `tsconfig.json`

`@types/react` is not installed, so `import React from 'react'` resolves to
`any` and — with `strict` off — every `.tsx` in the app passes the type-check
without being checked. `tsc --noEmit` reports 41 files and zero errors while a
component reads a property its props interface does not have.

Measured: with `Bookmark.pageIndex` deleted from the interface, `bm.pageIndex`
in `TableOfContentsDrawer` compiled clean; the same expression written against
an explicitly-typed `Bookmark` failed as expected. A hooks-order bug introduced
in the same file was likewise caught only by opening the app.

~~Not fixed on sight because adding the types will surface a backlog of
pre-existing errors across every component at once, which is its own piece of
work and should not ride along inside an unrelated change.~~

**Closed.** The feared backlog turned out not to exist. `@types/react@^19` and
`@types/react-dom@^19` are now devDependencies, and the type-check reports
**zero errors** across all 25 components with them installed — whatever the
backlog was when this entry was written, it has since been paid down.

Verified by reintroducing the exact failure described above rather than by
trusting the clean run: reading a property no props interface declares now
fails with `TS2339: Property ... does not exist on type PromptRuleData`, where
before it compiled silently. `strict` is still off, so this is a floor and not
a ceiling — turning it on is a separate piece of work with its own backlog.

## 7 · ~~Two counts in the index drawer are written by hand, and both are wrong~~ — CLOSED

**Code:** [`src/components/TableOfContentsDrawer.tsx`](../src/components/TableOfContentsDrawer.tsx)

`readingTimeMin = 42` and `note="4 Figures"` are literals. There are **five**
figures (`FIGURES.length`), and the manuscript is 8,460 words — about 38 minutes
at 220wpm, not 42. Both are derivable from data that is already imported into
that file.

This is LY-01 (**Content Is Data**) in miniature: a count written by hand cannot
track a list it does not own.

**Closed.** Both are derived now. The figure count reads `diagramPages.length`
off the one filtered list the rows are also drawn from, so the note and the
group can no longer disagree; it had drifted further by then, saying four
against six. The estimate is counted at 220wpm over the prose a reader can
actually reach — the sheets, the evidence that opens over 2.3, and the
bibliography annotations.

It lands at **18 minutes, not 42**, which is worth reading next to entry 8:
3,910 words reach a reader against the 8,460 the manuscript holds. The old
number was wrong twice over — struck against text that is not rendered, and
never revisited when the sheets changed underneath it. **If entry 8 is ever
acted on the estimate needs no edit; it will simply rise.**

## 8 · ~~41% of the manuscript reaches a reader~~ — CLOSED

**Code:** [`src/data/pageModel.ts`](../src/data/pageModel.ts)

Measured: `bookData` holds 221 paragraphs across 22 sections; 90 of them are
rendered. The page builder cuts each section with `.slice(0, 4)` or
`.slice(0, 5)` when composing a sheet, so most sections lose everything after
their fourth paragraph. Two sections are affected more severely:

- **1.3** (16 paragraphs, 812 words) renders none of its manuscript text — the
  four paragraphs on that sheet are written into `pageModel.ts` itself, which is
  authored copy living in the layout engine.
- **5.5 The Anti-Engagement Metric** (10 paragraphs) is referenced by no sheet at
  all. Its figure and its rule both exist; only the prose has no page.

~~The paginator that would place the rest already exists and is measured in
characters (`SHEET_BUDGET`), and marks no longer depend on the page count, so
removing the slices is now safe for anybody's saved notes. Left as a data and
composition decision rather than done in passing.~~

**Closed. All of it reaches a reader now: 221 of 221 paragraphs, 8,460 of 8,460
words.** The book went from 27 sheets to 44.

The entry was right that the paginator already existed and needed nothing: it
balances by character budget and stamps a `paragraphOffset` on every part, so
the only work was to stop cutting the text before handing it over. All
**seventeen** `.slice(0, 4)` / `.slice(0, 5)` truncations are gone.

The two severe cases were fixed at their root rather than patched:

- **1.3** now reads `ch1.sections[2].content`. The four paragraphs standing here
  before were a *summary* of the section, written into the page builder, which
  nothing in `bookData` could correct and no editor would think to look for. It
  is the longest section in the book (16 paragraphs, 812 words) and none of it
  had ever been read.
- **5.5 The Anti-Engagement Metric** has a sheet, placed before its own
  schematic the way every other section precedes the figure that argues it. The
  graph had always known the section existed — the Metric Lotus argues it and
  BRANCH 6 applies it — so a reader could reach everything about it except the
  passage that defines it.

One paragraph needed somewhere new to live: the manuscript's own lead-in to the
bibliography. It is carried as `sourcesIntro` rather than as `sectionData`,
because `anchorForPage` reads `sectionData` before `references` and giving that
sheet a section would have changed what it anchors as, taking every bookmark on
it along.

**Verified after the change:** all 44 sheets walked with no console errors; no
sheet overflows the viewport (LY-02 holds — the character budget did its job on
the fuller pages); anchors still round-trip on every sheet.

A closing note worth keeping, because it is the whole argument for LY-01 in one
number. The reading estimate, now derived, reads **41 minutes**. The literal it
replaced said **42**. The original author measured the manuscript correctly; the
figure only became wrong when the slices went in, and nothing in the code was
able to notice.

## 9 · The rules say five figures; there are six

**Rules:** [`05-figures-and-worlds.md`](design/05-figures-and-worlds.md) ·
**Code:** [`src/data/pageModel.ts`](../src/data/pageModel.ts)

`FIGURES` now carries six entries. FIG 2.3 — *The Fragility Index — Four
Fractures in One Tenancy* — was added for §2.3, which names four structural
fractures the book previously drew nowhere.

Three places still say five and now disagree with the code:

- **FW-01** opens "All five data visualisations are `LivingFigure`". The count is
  wrong; the claim it is making is not — the new figure is a `LivingFigure`
  declaring cells and edges, with nothing bespoke in it.
- **FW-03** and the `FIGURE_ORDER` comment in `FigureStage.tsx` both speak of
  "the five worlds". The cycle is derived from `FIGURES`, so the behaviour is
  already right and only the prose is stale.
- The table in `CLAUDE.md` is unaffected, but any prose elsewhere counting
  figures should be checked before it is quoted.

The figure deliberately does **not** draw §2.3's four fractures as the four-item
list the section numbers them as. FW-09 (**A List Is Not a Cause**) retired that
shape on FIG 3.1 for the same reason it would be wrong here: the section argues
one dependency — "conducting your entire distribution strategy on someone else's
property" — and closes by saying so outright. The platform sits above, the brand
below, and the four fractures are four load paths through a tenancy, each drawn
`faint` into the brand because a rented process is one already being stripped.

Left open rather than fixed in passing: **the count in a rule is prose, and
editing a rule is the one edit this project does not make casually** (ME-01).

## 10 · Inline drawings follow the page to white; the stages do not

**Rules:** [GR-01 — The Ground Is Black](design/04-ground-and-colour.md) ·
**Code:** `PageRenderer.tsx` (chapter openers, figure previews), `FigureStage.tsx`,
`InstrumentStage.tsx`, `Orrery.tsx`

GR-01 opens "Every drawing surface is black — the map, the figure stage, the
instrument stage, a chapter's cell — in **both** themes", and gives the reason:
"emitted light on white is just ink... on a white ground every one of them
inverts into a smudge."

Measured in the light theme, all three full-bleed stages obey it. Each forces
its own ground rather than inheriting the theme:

| surface | ground | ink |
| :-- | :-- | :-- |
| the map | `rgb(0,0,0)` | white |
| the figure stage | `rgb(0,0,0)` | white |
| the instrument stage | `rgb(0,0,0)` | white |

Drawings rendered **inline on a prose sheet** do not, because they inherit the
sheet. Every one measured at `rgb(255,255,255)` with black ink: the cover
flower, all five inline figure previews, and the chapter opener — which is the
"chapter's cell" GR-01 names by that word, grown to the head of the page.

Whether this is a violation depends on what "a chapter's cell" means. If it is
the cell **on the map**, the rule already holds everywhere. If it is the opener,
the rule and the code disagree on every chapter opening in the light theme.

Not fixed on sight, for two reasons. It is not a regression — it predates the
vignette work and is uniform across every inline drawing, which reads as a
decision rather than a slip. And the drawings genuinely survive the inversion:
dark tissue on white is legible, not the smudge the rule predicts, because the
inline previews carry no glow, tide or beacon fills — the marks that actually
depend on a void behind them stayed on the stages.

The vignette added in this session takes the ground from the surface it sits on
(`--fig-ground-rgb`, keyed off `.theme-dark`/`.theme-light`) rather than assuming
black, so it is correct under either reading and needs no edit if this is ever
resolved.
