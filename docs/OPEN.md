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
`metadata.json` was an AI Studio manifest nothing in the app read; it was kept
in an archive folder for a while and has since been deleted, so the claim is no
longer made anywhere the app is described. Git history holds it if it is ever
wanted.

## 4 · ~~`.env.example` documents a variable the code cannot read~~ — CLOSED

**Files:** `.env.example`, [`causalResearch.ts:52`](../src/data/causalResearch.ts)

`.env.example` documents `GEMINI_API_KEY`; `ambientKey()` reads
`import.meta.env.VITE_GEMINI_API_KEY`. Vite does not expose unprefixed
variables to client code, so the build-time key path can never fire as
documented. The reader-supplied key in `localStorage` works and is the path
actually used.

The rest of `.env.example` describes AI Studio injection, which is not how this
is deployed.

**Closed.** `.env.example` documents `VITE_GEMINI_API_KEY` — the one name the
code reads — and says that the reader-supplied key in `localStorage` takes
precedence. The `DISABLE_HMR` branch in `vite.config.ts`, the last AI Studio
dependency, went with it. The old AI Studio template was kept in an archive
folder for a while and has since been deleted; git history holds it.

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

## 11 · The presentation is in colour, and the rules say it may not be

**Rules set aside:** [GR-05 — Black, White, and One Temperature of Light](design/04-ground-and-colour.md),
[DG-02 — Only Lines. Nothing Is Ever a Filled Area](design/01-drawing-grammar.md),
[GR-02 — Plain Ground — the Glass Is Retired](design/04-ground-and-colour.md)
**Code:** [`docs/presentation.html`](presentation.html) — the `THE SPECTRUM` block

`docs/presentation.html` now draws its tissue in colour. Hue lands on strokes,
overlapping translucent strokes are screened together to read as glass, and the
lamps bloom in saturated light. GR-05 says ink is monochrome without exception
and hue exists only in emitted light. GR-02 is titled after retiring exactly
this. The deck's own header comment used to list GR-05 among the rules it held
itself to, and no longer can.

**This was an instruction, not a drift.** The author asked for it explicitly,
twice, naming the rule to be ignored and scoping it to the presentation. It is
recorded here rather than argued for in a rules file, because a rules file
states what is true and this is a place where the code and the rules disagree
on purpose.

**The app is untouched.** GR-05, DG-02 and GR-02 hold everywhere in `src/`, and
nothing in this change reaches it. The two surfaces now look different from one
another, which is the cost and was accepted.

**How it is built**, because the first working version was the wrong one and
the difference is the interesting part.

Colour began on the strokes: a hue per radial band, ramped, screened together.
It looked right and it could not move — a stroke's hue is a paint property, so
flowing colour across it repaints ~16,000 paths every frame, which is exactly
the regression [PF-03](design/09-performance.md) records. Static colour was the
only affordable kind on that architecture, and static is not what the
references do.

So the colour came off the tissue. The drawing is painted near-white on black
and a **conic gradient sits above it in `multiply`** — black times any colour
is black, so the ground is untouched, and a near-white filament takes whatever
hue is passing over it. Colour belongs to the sheet rather than to any mark on
it, and moving it means moving one element. Two layers counter-rotate on 71.3s
against 104.7s, which is LC-04's argument applied to colour: the pair repeats
about every twenty minutes, so the wash never lands the same way twice inside a
presentation.

What the departure kept, because the reasons behind those rules did not stop
being true:

- **Nothing animates paint.** PF-03's lesson survives whole. Both flow layers
  and the `morph` on `.art` are transform-and-opacity only, on promoted HTML
  divs — one composited texture each, which is the same trick sheet 01 already
  used for its two bloom layers. The transform that measured 6fps was on a big
  SVG *group*, re-rendered every frame; this is not that.
- **The glass is made of lines.** GR-07's distinction is intact — translucency
  comes from overlapping strokes under a wash, never from a filled surface or a
  blurred mass. A DOM audit across all 21 sheets measures **0 filled paths, 0
  `L`-only paths and 0 `<line>` outside `.geo`** against 16,306 paths, so DG-01
  and the no-fill half of DG-02 both still hold.
- **Points, not areas.** The pixel register is 1–2 units on a 1000-unit sheet
  and every one sits on a mark that already exists, so DG-02's own carve-out
  ("a bouton, a seed tip, a nucleolus is a bright dot and is allowed") covers
  them and OG-02 is not broken — nothing floats.
- **Type is out of the blend.** Labels and axis names move to a `.plate` SVG
  above the flow, mirrored per `.node` with the same `data-id` so TY-06's
  surface-under-touch still drives them. Legibility and saturation were
  fighting over one lever; this separates them. Verified: hovering a cell makes
  both the `.art` node and its plate mirror hot, and the label reaches opacity 1.
- **The instrument stays under the wash, deliberately.** A graticule is meant to
  sit beneath a drawing; letting colour cross it keeps it part of the sheet
  rather than a layer stuck on top of one.
- **The opening still ends white.** `multiply` against the `.wash` would paint a
  solid rainbow, so the flow leaves on exactly the clock the wash arrives on.

### The material registers

A later pass took the departure further, to a brief naming specific materials.
Each is built from marks the grammar already had rather than from new
primitives:

- **Fibre-optic strands.** `vein()` draws a translucent sheath in three
  widening passes and then a near-white core at a third of the nominal width on
  the identical path, so a thick strand has a lit channel running down the
  inside of it. Only above 0.82 width — a fourth-generation hairline has no
  inside, and giving it one just doubles the ink.
- **Resin droplets.** A bead above 0.62 radius gains a hard specular point
  offset up and left, screened, so every droplet on every sheet is lit from the
  same direction.
- **Granular particulate.** Matte bronze through oxidised copper to burnt
  orange, clustered rather than scattered — a few seed points with a dozen
  grains crowded around each. It is the one material on the sheet that neither
  emits nor transmits: no blend mode, its own chroma, and it never brightens.
- **Micro-perforation.** Square points on whole coordinates with `crispEdges`
  and a `steps()` flicker, sitting on marks that already exist so nothing
  floats (OG-02). A pixel that fades is a smudge; it is on or it is not.
- **The instrument's second register.** Ticks and registration squares burn
  signal orange and are hoisted onto the plate above the colour, because
  multiplied by the cyan half of the oil film orange goes brown and by the
  violet half it goes near-black. Axes, brackets and the graticule stay white
  and stay *below* the wash — those are the frame, and letting colour cross
  them is what keeps them part of the sheet rather than an overlay on it.

DG-02's carve-out is what all the filled marks sit inside: "points are not
areas — a bouton, a seed tip, a nucleolus is a bright dot and is allowed."
Measured across all 21 sheets, the largest pixel is 3 units and the largest
grain 0.96 units radius, on a 1000-unit sheet. A DOM audit still returns zero
filled *paths*, zero `L`-only paths and zero `<line>` outside `.geo`.

**Open — and this is a real gap.** No frame-rate reading has been taken. Two
attempts failed because `requestAnimationFrame` is paused while the preview
pane is hidden, so ME-01's "verify by measurement" is unsatisfied on the one
axis that matters most here.

What is known: the heaviest sheet went from 4,238 elements to **5,058**, a 19%
rise, and it now carries four composited layers it did not have (two gradient
washes, a `backdrop-filter` pane, a screen lift). Every one of those is a
transform-only animation on a single promoted element, which is the cheap shape
rather than the expensive one — but `backdrop-filter` over animating content is
exactly the sort of thing PF-04 was written about, and 4,238 was only ever
established as *a count that held*, never as a limit that was tested.

Someone should open this on a visible window and take a reading before the deck
is shown on unfamiliar hardware. If it is short of 47fps, the first things to
cut are the widest halo pass in `vein()` and the `backdrop-filter` radius, in
that order.

## 12 · ~~The reader is set in two families; TY-01 asks for one~~ — CLOSED

**Rules:** [TY-01 — One Voice, and It Is Light](design/06-typography-and-copy.md) ·
**Code:** `src/index.css` (the @font-face block and the house-voice rule) ·
**Reference:** [presentationdesign.md §6](presentationdesign.md)

On explicit instruction, the reader now carries the deck's pairing: Newsreader
Light on `h1`/`h2`, IBM Plex Sans on everything else. TY-01 opens "One font
family, and one weight: light."

The weight half of the rule is untouched and was never in question — everything
is still 300, contrast still comes from size, spacing, opacity and light, and
there is no `font-bold` anywhere. It is the family half that has been set
aside, and only for the title role.

The reasoning offered for the pairing is in the deck's own file: Newsreader is
an editorial face fitted for headlines and Plex was drawn as a system for
technical documentation, which is the register the instruments and the figure
annotations occupy. Measured there at 100px against Georgia (69 cap / 48
x-height): Newsreader 300 is 72/52 and IBM Plex Sans is 70/51, so both carry
more x-height than the reference and neither needs the size inflation or
negative tracking that the previous serif required. The title step stays at 18
and TY-03's spacing is unchanged.

Not resolved here because it is a question about the rule rather than about the
code. Either TY-01 is amended to name a title face and a text face, or the app
returns to one family. Until then the rule and the code disagree, and the code
is what the reader sees.

**The unreferenced typeface is gone.** The four Plus Jakarta Sans files and the
two Zilla Slab files were deleted from `public/fonts/`, so the service worker no
longer precaches about 100kB of typeface the app never uses.

One thread was left behind by that deletion and has since been cut: `index.html`
went on preloading `/fonts/plus-jakarta-sans-latin.woff2`, a file that no longer
existed. In dev the SPA fallback answered 200 with HTML, which is why it stayed
invisible; the built shell would have taken a 404 on every cold load. Worse, the
face the reader is actually set in was not preloaded at all. The preload now
names `/fonts/ibm-plex-sans-var-latin.woff2`.


## 13 · The map keeps a gate in front of it, and two controls that never rest

**Rules bent:** [LY-01 — The Orrery Is the Front Door](design/08-layout-and-chrome.md),
[TY-05 — A Name Is Said Once](design/06-typography-and-copy.md) ·
**Code:** `src/components/IntroScreen.tsx`, `src/components/Orrery.tsx`,
`src/index.css` (`.control-ground`)

Three things were asked for together, and all three reverse reasoning that is
written down in the code they change. They are recorded here rather than argued
into a rules file, because the rules still say what they said.

**An entry screen the reader dismisses.** LY-01 opens "the app opens on
`Orrery.tsx`". It now opens on a surface carrying the work's name, the dossier's
own subtitle and two lines of instruction, and the map is behind it until the
reader leaves. The inlined boot mark in `index.html` is untouched and still
paints in the same frame as the document — the gate stands where that mark used
to hand over to the map, drawing the same cell at the same coordinates, so the
handoff is still a thickening rather than a swap.

The cost is named where it lands: a returning reader meets a surface between
them and the map on *every* visit, which is exactly the friction the map's own
Resume control exists to remove. It was asked for as a gate rather than as a
once-only splash, so it is one. Esc leaves it (LY-04), and nothing behind it is
unloading while it is up.

**Resume and Reset view, permanently and at full presence.** Both were 9px
resting under 0.6 opacity; both are now 12px at full. Resume no longer yields to
zero when a caption is up — that fade was TY-05 keeping the frame from saying two
things at once, and it has been given up deliberately; the two no longer collide
because the caption lives in the opposite corner.

Reset view is the sharper reversal. The comment above it argued that a control
which is permanently present and usually inert is one the eye stops seeing, and
so it appeared only once the view had something to put back. It is now always
there. What was kept from that argument is the *reading*: the control still
reports whether there is anything to undo, through light rather than through
presence, so it is honest about being inert instead of silently doing nothing.
It is not `disabled` — `.bud:disabled` rests at 0.22, which would undo the whole
point.

**A permanent plateau under both corners.** `.control-ground` is the same device
as `.name-ground`, and `.name-ground`'s own comment records why that one is gated
on the caption: a permanent pad buried the corner of the drawing the moment
anyone zoomed in, and "the map lost its labels at exactly the moment a reader was
leaning in to read them". This plateau is permanent, so that risk is live again.
It is bounded rather than avoided — 11rem against the name ground's 24rem, two
corner-anchored ellipses rather than a band, sized to the control row — so the
middle of the field, where the organism actually lives, is untouched.

**Unverified:** nobody has measured what the plateau does to a numeral parked in
a bottom corner at deep zoom. That is the specific failure `.name-ground` was
rebuilt to avoid, and it should be measured rather than eyeballed (ME-01) before
this is called settled.

## 14 · The five-question gate can now go down as well as up

**Rules:** [FW-02 — Figures Are Filaments, Never Boxes](design/05-figures-and-worlds.md),
[DG-01 — Never a Straight Line](design/01-drawing-grammar.md) ·
**Code:** `src/components/widgets/AntifragilityGraph.tsx`

The instrument's questions were checkboxes, so unticked meant both "this fails"
and "I have not got to it yet" and the reading could only ever climb. They now
carry three states, and the score is drawn as a trajectory across the five
questions against the document's own Fragile → Robust → Antifragile spine.

The ceiling is `§5.3`'s own qualification, enforced rather than described: the
antifragile band opens only when every question has cleared, because that is the
only state the dossier is willing to call by that word. Reaching *robust* takes
three clears with nothing dragging back — an earlier midpoint test called a
project robust at two out of five, which is the eighty-per-cent arithmetic the
instrument's own header refuses.

Every segment carries a bow of ~5% of its length with alternating sign (DG-04),
because five answers that agree would otherwise put six points on one line and
draw the zero-bow filament DG-01 forbids. `audit-lines` does not catch that case
— it reads `<line>` elements and `L`-only paths in source, and a collinear
`Q` is neither. **This is a gap in the audit, not a licence:** a figure can still
ship a straight run through a curve command and pass `npm run lint`.


## 15 · "Application" now opens an instrument, and the branches lost a reader

**Rules:** [FW-03 — A Figure Is a World, and a World Has Three Passages](design/05-figures-and-worlds.md) ·
**Code:** `src/data/relations.ts` (`FIGURE_EDGES`, `toolOfFigure`), `FigureStage.tsx`,
`PageRenderer.tsx`, `TableOfContentsDrawer.tsx`

Every figure's Application passage used to resolve to `pageForPromptRule` — the
branch that governs the figure, which is a page of prose. All eight branches
live on one sheet, so five of the six figures sent every reader to the identical
page. A control that says *put this to work* was handing over more reading.

Each figure now names the **instrument** that applies it, on a new `tool` edge
in the relations graph, and the pairings are the document's own — the reasoning
is written out at `FIGURE_EDGES`. The rule edge is kept: it is still true and
other surfaces read it, it is simply no longer what Application points at.

**What this costs.** The branches are now reachable only from the Tools folder
and from the ruleset sheets themselves. That is a real reduction in how many
ways a reader meets Branch 3, and it was accepted because the passage was
promising an instrument either way.

**Still open:** `figureCarriesItsOwnApplication` and the new `tool` edge encode
overlapping facts. The causal taxonomy is the only figure that runs inside
itself, and it is now stated twice — once as a boolean on `FIGURES`, once as a
`tool` that every call site has to special-case with `!== 'causal-taxonomy'`.
One of the two should go; which one is a question about `FIGURES`, so it is
recorded rather than decided here.

## 16 · The reader's Font Size control does not reach the manuscript

**Rules:** [TY-02 — Three Type Sizes: 9, 12, 18](design/06-typography-and-copy.md) ·
**Code:** `SettingsDrawer.tsx` (the slider), `PageRenderer.tsx` (the prose)

Settings offers Font Size from 12 to 20 and it moves almost nothing. The sheet
container takes `fontSize: ${prefs.fontSize}px`, but every manuscript paragraph
carries `text-[12px]` outright, so the inherited value never reaches the prose.
What actually changes the rendered size is `useFitToBox`'s zoom, which is
computed from how much text is on the sheet — not from the preference.

A control that reports a number and changes nothing is the clearest kind of
broken, and it was found while chasing the readability floor below rather than
by using the app.

**Not fixed here, because the fix is a question about TY-02.** Letting the
slider set a real size means the manuscript renders at 14, 17 or 20 — sizes the
scale does not contain, and TY-02's whole argument is that fourteen sizes were
an accident. Three ways out, none of them ours to pick: retire the control;
redefine it as a multiplier on the fit so it scales the existing step rather
than replacing it; or amend TY-02 to admit a reader-controlled body size and
keep the three steps for interface type only.

## 17 · ~~The densest sheet in every chapter set the manuscript at 8.64px~~ — CLOSED

**Rules:** [TY-02 — Three Type Sizes](design/06-typography-and-copy.md),
[LY-02 — No Page Scrolling](design/08-layout-and-chrome.md) ·
**Code:** `PageRenderer.tsx` (`PROSE_PX`, `MIN_PROSE_PX`), `src/utils/fitToBox.ts`

`useFitToBox` shrinks a sheet's column until it fits, with a floor of 0.72.
Measured across all 47 sheets: the densest sheet in every chapter bottomed out
at that floor and rendered the manuscript at **8.64px** — smaller than the 9px
step this app reserves for labels and instrument readings. Five sheets set their
whole argument in type too small to read, and nothing reported it, because the
declared size stayed 12 and only the zoom moved.

**Closed.** The floor is now a size rather than a ratio: `MIN_PROSE_PX / PROSE_PX`,
which holds rendered prose at 11px. Verified after the change — zero sheets
under 11px, zero clipped or overflowing paragraphs, at the smallest type
preference.

The first attempt at this silently did nothing and is worth recording: it
anchored the floor to `prefs.fontSize`, which the prose does not use (entry 16),
so the ratio was computed against a size that was not on screen and every sheet
stayed at 8.64px. The measurement is what caught it.

**What it costs.** Sheets that used to shrink now spill into a second or third
column. Nothing is lost — `.hflow` is a horizontal multicolumn flow, so overflow
becomes another column rather than a clipped paragraph, and every paragraph was
verified reachable. But the horizontal scrollbar is hidden by design, so the
extra column has no visible affordance and is found by gesture (LY-03) or not at
all. **Unverified: whether a reader who has not been told finds column three.**

## 18 · Marks custody was removed, and nothing replaces it

**Code:** `TableOfContentsDrawer.tsx` · `src/data/userStore.ts`
(`exportReaderState`, `importReaderState` — now unreferenced)

The index drawer's Export Marks / Restore row was removed on instruction, along
with the reading-time and Offline Ready readouts beside it.

**What that costs, stated plainly.** Bookmarks, highlights, notes and the saved
position live in `localStorage` and nowhere else. Browser storage is not
durable — Safari evicts it after roughly seven days of inactivity — and the
export/restore pair was the only way a reader could carry their marks across
that eviction, or across a browser. There is now no recovery path: marks that
go are gone.

`exportReaderState` and `importReaderState` are left in `userStore.ts`. They are
dead code today and would normally go with the UI that called them, but they are
the whole of the mechanism and deleting them would make restoring the feature a
rewrite rather than a re-mount. Whoever decides this is settled should either
re-mount them or delete them; leaving working machinery with no caller is the
one state that is not a decision.

## 19 · The branches are no longer called branches

**Code:** `src/data/promptData.ts` (`RULE_NAMES`), `src/data/relations.ts`
(`RULE_TOOLS`), `TableOfContentsDrawer.tsx`

Every surface that used to print "BRANCH 1 — Marketing Strategy & Positioning"
now prints "Strategy & positioning", from one map in `promptData.ts`. The
numbering is how the dossier files the ruleset, not what the rules are called,
and a reader deciding where to start does not think in branch numbers.

**The manuscript still says BRANCH.** `PROMPT_RULESET_DATA` keeps the document's
own titles and the ruleset sheets render them unchanged, which is TY-04 holding:
the interface may choose which of the author's words to put on a control, not
rewrite the text. So the app now names one thing two ways depending on where you
meet it — "Strategy & positioning" in the index, "BRANCH 1 — …" on the sheet it
opens. That is a real seam and it is the cost of the rename.

**Open:** whether the ruleset sheets should follow. That is an edit to how the
document presents itself rather than to how the app indexes it, so it is not
ours.

## 20 · Figures and Tools are one folder

**Rules:** [TY-05 — A Name Is Said Once](design/06-typography-and-copy.md) ·
**Code:** `TableOfContentsDrawer.tsx`

The drawer carried a Figures folder and a Tools folder over the same six
drawings: each rule row already linked to its figure, and each figure row linked
to the rule's instrument. A reader met every figure twice and had nothing to
tell them which list was the real one.

One folder now, one row per rule, carrying the drawing that argues it and the
instrument that runs it. A rule's instrument comes from `RULE_TOOLS` and is
**not** derived from its figure — content planning's figure is the Causal
Taxonomy, but its own question is *how much*, so its instrument is the content
budget.

**Five of the ten rules have no instrument and are given none.** Pairing them
with the nearest one would make the column look complete while sending readers
somewhere the dossier never points.

**Also removed:** the `(6)` / `(10)` / `(11)` counts on the folder tabs, and the
line count on the prompt composer. Neither was actionable, and the tab counts
were what squeezed "Definitions" into "DEFINIT…" when the fourth folder arrived.

## 21 · The instruments are panels now, and they carry both polarities

**Rules:** [GR-01 — The Ground Is Black, and Nothing Is Drawn On It](design/04-ground-and-colour.md),
[LY-02 — No Page Scrolling](design/08-layout-and-chrome.md) ·
**Code:** `InstrumentStage.tsx`, `FiveQuestionsWidget.tsx`, `ContentBudgetWidget.tsx`

Two of the three instruments were columns you scrolled. They are panels sized to
the frame now — the five questions is one question at a time with the
antifragility trajectory permanently under it, the content budget is four
curtains beside a live reading — so LY-02 is satisfied by fitting rather than by
putting a trough inside a sheet. The Restoration Delta keeps its scroll: it asks
for six readings at once and its whole claim is the comparison, so sequencing it
would hide the measurement.

**GR-01 is set aside here, on instruction.** That rule says every drawing
surface is black in both themes, and these surfaces hold tissue. The instruments
were asked for in both polarities, so they follow the reader's theme: white on
black, or black on white. It is scoped to the instruments — the map and the
figure worlds still force their own ground, which is where the rule was earned.

**Unverified:** the light polarity's opacities are the ones tuned for white ink
on black. They pass the type audit, but nothing has measured contrast ratios in
the inverse, and `.bud` at 0.68 is a lighter mark on white than on black.

### "Satisfied by fitting" needed a qualifier: it fits at `lg`, and scrolls below

The claim above — that these panels satisfy LY-02 by fitting rather than by
putting a trough in a sheet — holds at `lg` and up, where the bento is sized to
the frame. Below that every card stacks, and the stack is taller than a short
frame at any padding: four cards plus a reading plus the working does not fit
340px of landscape phone. Two attempts to make it fit by force both failed, and
both are worth recording because each looks like the obvious move.

**Handing the leftover to one panel.** `auto / minmax(0,1fr) / auto` gave the
choices and the working their natural height and the rest to the reading. That
works until the choices alone exceed the frame — then the reading's track
resolves to nothing. The trap is that an `auto` track is *flexible under space
pressure*: in a container with a definite height the tracks shrink rather than
overflow, and `min-h-0` removes the floor that would have stopped them.
Measured at 720×340, `grid-template-rows` resolved to **`0px 33.6px 129.6px`**
with 318px of choices inside the 0px track — so the reading and the working had
no box to sit in and painted over the cards above and below them.

**Stretching the cards to absorb the slack.** The other direction, and it is
what produced the visual state this pass was opened to fix: the contents of a
grown card took a share of its height each, which at 1440×900 put eight 9px goal
chips in cells **183px tall**, every label floating in the middle of its own
empty box.

**What holds.** The rows are `repeat(n, min-content)` below `lg` and the grid
container carries the `.soft-scroll`. A `min-content` track does not give
ground, so the grid exceeds its box and the scroller engages instead of the
tracks collapsing. LY-02 is still satisfied, by its other half rather than by
fitting: the viewport never scrolls, and content scrolls inside its own column.
Cards are their own height, the open curtain takes the column's slack, and its
contents stay at the top at their own size.

Measured after the change, with the goals curtain open and five goals set: no
overlapping cards and nothing clipped at 375×812, 667×375, 716×338, 1024×640 or
1440×900; the viewport scrolls at none of them. At 1440×900 the three columns
resolve to 377px each and all three run the full 765px height. Independently
checked on a **production** build at 667×375 by the session that did the
dead-code pass: tracks `348.95px 150.725px 114.6px` inside a 203px box, the
scroller reporting 203px against 640px of content, no zero-height track
anywhere, `documentElement` scrollHeight 375 against clientHeight 375.

**Two measurements to distrust, recorded so neither is taken for a finding.**
Counting elements whose rect passes the viewport edge returns 85 here, and the
number means nothing: the scroller holds 640px of content in 203px, so ~437px
legitimately sits below its own fold. It counts scrolled content, not clipping.

The obvious replacement — look for an `overflow: hidden` ancestor carrying
overflow — is also wrong written naively, and flagged three containers on this
surface, all three of them false: `.sr-only`, where clipping is the technique;
`.hflow`, which is `overflow-x: auto` with `overflow-y: hidden`, reported for
1295px of *horizontal* overflow purely because its *vertical* axis is the hidden
one (it scrolls — setting `scrollLeft` moves it 50.4px); and the instrument grid
itself, whose vertical overflow is the content its `.soft-scroll` exists to
reach. Two things make the test sound, and a clipping claim needs both:

- **match the axis** — only count overflow on an axis that is itself hidden;
- **prove unreachability** — set the scroll offset to the overflow and check
  whether it moved, rather than inferring it from computed style.

Re-run that way, this surface reports zero truly clipped containers. Which is
the same lesson as the 85, and the standard both failures were caught by: a
measurement that flags something is not a finding until the thing it flagged has
been explained.

**The five questions carries the same row template and scroller**, and was
measured the same way. At 667×375: rows resolve to `169.1px 360.212px` with no
zero-height track, no overlapping cards, nothing clipped, the scroller holding
546px of content in 202px, and the viewport static. Checked on a production
build as well as in dev, and the two readings are identical to the decimal.

**Purge was the one production-only risk and it is checked.** These row
templates are arbitrary Tailwind values, so the thing that could pass in dev and
fail in a build is the class never being emitted. Grepped in `build/assets/*.css`
after `npm run build:web`: `repeat(2,min-content)`, `repeat(3,min-content)`,
`minmax(136px…` and `answer-pulse` are all present.

Both instruments were driven on a production build at 667×375 as well as in dev
(the build runs by the session that did the dead-code pass), so the claim is not
a dev-server-only one. What no reading covers is a real device: every number
here comes from an emulated viewport.

## 22 · FIG 0.1's field is particles, and the traffic is a tide

**Rules:** [DG-02 — Only Lines](design/01-drawing-grammar.md),
[LC-01 — The Luminance Tide](design/03-light-and-clocks.md),
[LC-02 — Never a Travelling Dash](design/03-light-and-clocks.md) ·
**Code:** `MediaUniverseDiagram.tsx`, `src/index.css` (`.field-station`)

The outer field was stroked rays. It is drawn as points now — which DG-02 admits
by name ("points are not areas — a bouton, a seed tip, a nucleolus is a bright
dot and is allowed") — with the stroke dropped to about a third of its weight to
carry the bearing between them.

The figure was asked to show information moving. LC-02 forbids the obvious way,
so the stations take a shared period and a delay from their position: brightening
rolls along each course with nothing moving and nothing having ends. Half the
rays run their delay outward and half inward, which is the figure's own argument
— you absorb and you produce — rather than a decoration on it.

It was built on `.ranvier`, the saltatory spike, and that was the wrong clock:
measured, a station rested at 0.06 opacity and reached 0.40 only at its peak, so
the field vanished between pulses. `.field-station` rests at half its own ceiling
and crests at it.

**Open, and it is the important one: NO FRAME RATE HAS BEEN TAKEN.** The figure
now carries 416 animated stations. Opacity-only CSS animation is the cheap shape
— PF-03 sends organism-wide motion through opacity for exactly this reason, and
nothing here animates a transform or a filter — but PF-04 is a warning about
numerous animated elements and this is numerous. Two attempts to measure failed
because `requestAnimationFrame` does not advance while the preview pane is not
compositing, which is the same trap entry 11 records against the deck. **Somebody
should open FIG 0.1 on a visible window and take a reading before this ships.**
If it is short, the first thing to cut is `STATIONS`, which is one constant.

## 23 · Tools are searchable by words that are not on them

**Code:** `src/data/tags.ts`, `TableOfContentsDrawer.tsx`

Every row in the Tools folder carries an invisible key — its name, its
description, its figure, its instrument, and a list of tags — and the filter
matches words against that rather than against the visible text. A practitioner
with a newsletter problem types "email" and reaches CRM & lifecycle messaging,
which says "email" nowhere. Verified: "clickbait", "how much" and "dark
patterns" each resolve to exactly one row, and none of those phrases appears on
the row they find.

The folder also carries the ruleset's own paragraph at its head, extracted from
`FULL_RULESET_TEXT` rather than retyped, so it cannot drift from the document.

**Not covered by any audit.** A tag that stops being true — a rule renamed, a
figure repurposed — fails silently and invisibly, because nothing renders it.
The honest version of this would be a check that every tag set names something
that still exists; it does not exist yet.

## 24 · The online export

**Code:** `package.json` (`build:web`, `preview:web`), `scripts/stamp-sw.mjs`

`npm run build:web` writes the deployable app to `build/` and stamps the service
worker there; `npm run preview:web` serves it on :4174. `build/` is git-ignored,
like `dist/` — it is an artifact, not source.

**Measured on the built export:** a first visit transfers **247 KB** over 16
requests, with zero failed requests and zero audio. The whole shell — every
chunk, every font, the service worker — is **914 KB** on disk.

**The audio is 29 MB of the 30 MB total, and it is the one decision left.** The
service worker deliberately never precaches `/audio/`, so it costs a reader
nothing unless they turn Sound on — but it is still 29 MB to host, and one track
is 13.5 MB. Re-encoding the three ambient tracks at a lower bitrate would cut it
by roughly three quarters at little perceptual cost for background music. It has
not been done: two of the three are CC BY-NC-SA and re-encoding is a decision
about somebody else's licensed work, not a build setting. `ffmpeg` is not on
this machine either.

## 25 · FIG 0.1 is a particle system, and the waves come from every centre

**Rules:** [DG-02 — Only Lines](design/01-drawing-grammar.md),
[LC-01 — The Luminance Tide](design/03-light-and-clocks.md),
[PF-03](design/09-performance.md), [PF-04](design/09-performance.md) ·
**Code:** `MediaUniverseDiagram.tsx` (`ParticleField`), `src/index.css`
(`.field-station`)

The field was 32 stroked rays. Beading them was tried first and was not enough —
thirteen dots on each of thirty-two courses is a fringe, not a medium, and the
figure still read as filament with speckle behind it. The space is now
**sampled**: a warped rings-by-spokes lattice, **2,708 points**, no stroke
anywhere in it.

**The waves start at every centre, which is the figure's own formula.** Each
point takes its phase from its distance to the nearest of the seven centres —
the core and the six network cells — so brightening rolls outward from all of
them at once and the sets interfere. That is `U(you) = Σ P(everyone) ·
d(angle, distance)` drawn rather than written. A single wave from the middle
would have been a transmitter, and this figure exists to deny there is one.

**How it costs almost nothing.** One CSS animation per point would be ~2,700
animated elements, which is exactly what PF-04 warns about. Points are
**bucketed by phase** instead — every point that fires together shares one `<g>`,
and the group carries the animation. **30 animated elements for 2,708
particles**, all opacity, which is the channel PF-03 sends organism-wide motion
through. No transform, no filter, nothing per-frame per-point.

Measured with the animations scrubbed to a fixed time: group opacity spreads
0.50 → 1.00 in a smooth crest across the buckets, which is the wave.

**Still no frame rate.** Same reason as entry 22: `requestAnimationFrame` does
not advance while the preview pane is not compositing. The element count is far
better than the per-point build would have been, but it is unmeasured.
**Take a reading on a visible window before this ships.** If it is short, cut
`RINGS` or `SPOKES` — two constants at the top of `ParticleField`.

## 26 · The instruments got a hierarchy, and the answer got a pulse

**Rules:** [TY-01](design/06-typography-and-copy.md),
[TY-02](design/06-typography-and-copy.md), [LC-02](design/03-light-and-clocks.md) ·
**Code:** `FiveQuestionsWidget.tsx`, `AntifragilityGraph.tsx`,
`ContentBudgetWidget.tsx`, `src/index.css` (`.answer-pulse`)

**Hierarchy.** Both panels ran entirely at 9 and 12 — the 18px step appeared
nowhere — so nothing told the eye where to land and the question, which is the
subject, read as a caption. The question and the verdict now take the large step
in the title face (`.title-face`, the serif), which is the first time either
panel has had three levels instead of two.

**The pulse.** Pressing CLEARS on the left moved a line on the right and nothing
said the two were one event — the reading changed the way a clock changes. The
station the answer moved, and the run into it, now brighten once and settle
(`.answer-pulse`). It is one-shot, opacity-only, keyed off the answer rather
than a timer, and nothing slides — LC-02 is untouched.

**The stations became the navigation.** A separate row of five dots under the
graph was the same five facts drawn twice (TY-05). The trajectory's own stations
now carry answered-state, position and the way back to any question.

**The reading explains itself.** It reported "3 outstanding" and left the reader
to work out why that mattered. Each band now says what it is and what leaving it
would take, quoting §5.3 for why the antifragile band is narrow.

**Accepted repetition, recorded rather than fixed:** with the GOALS curtain open,
a goal's name appears on its chip and on its row in the reading. The audit flags
it. It is a control and a readout rather than two namings of one fact, and
suppressing either makes the instrument worse.

## 27 · The app's own sentences, audited against the dossier

**Rules:** [TY-04 — Literal Document Text](design/06-typography-and-copy.md),
[LY-01 — Content Is Data](design/08-layout-and-chrome.md) ·
**Code:** `scripts/audits/static/audit-copy.mjs`, `audit-copy.baseline.json`

TY-04 is the rule this project could least enforce by reading a diff, because
invented copy does not look invented — it looks like a helpful sentence.
`npm run audit:copy` now reads every component, pulls out what renders as prose,
and checks it against the manuscript and the ruleset. It passes the author's
words and a short, written-out list of copy that was asked for; everything else
fails. Verified by planting a sentence: caught, and cleared on removal.

**Fixed on the first pass — copy that was the author's, rewritten:**

- The Tools folder carried **nine hand-written descriptions** that were
  paraphrases of the ruleset's own. "Replaces psychographic profiling with the
  three cognitive postures." against his "Reach for this when writing
  positioning or a go-to-market plan. It replaces demographic and psychographic
  segments with the three cognitive postures, and makes you name the source
  under every strategic claim." Every clause true, not one word his. The rows
  are now **derived** from `PROMPT_RULESET_DATA` and the relations graph, so
  there is no second copy left to drift.
- The map **edited a chapter title**: "Media Pollution & the Economy of
  Extraction" for the manuscript's "Media Pollution, Neurological Exploitation
  & the Economy of Extraction". It also rewrote all eight branch titles. Both
  are looked up now, with the literals kept only as a fallback for an id that
  has stopped existing.
- `PromptComposer` explained the Global Rule in its own words; it now quotes the
  ruleset's own sentence, extracted rather than retyped.
- Three invented interface sentences removed outright: a search empty state
  ("Type to search dossier and manifesto" — TY-04 names empty states), a third
  wording for dismissal ("Press ESC or click backdrop to close"), and a settings
  blurb describing an implementation ("Weight 400 + scaled font size and
  enhanced strokes"). "No results found for …" became the label "Nothing found".
- The drawer's search placeholder still offered to search "figures", a folder
  that stopped existing when Figures merged into Tools.

**Open — 39 strings, recorded in the baseline, and NOT ours to decide.**

| Where | Count |
| :-- | --: |
| The six figures' `reading` / `detail` / `gloss` text | 25 |
| The instruments' remedies, verdicts and assumption notes | 14 |

These are the interpretive layer — what each cell of a figure MEANS, and what
the document proposes when a question fails. "A lure is a meal that is actually
a hook" is the Bait Taxonomy's whole argument in one line, and it is not a
sentence the dossier contains. Rewriting them changes what the figures say,
which is an authorial decision and not an audit's.

The baseline holds them so the build stays green and the debt stays countable.
**Anything new fails.** The count may only go down: a string leaves the baseline
when it is made verbatim, asked for, or deleted.

**Also not checked, by design:** 43 `title` / `aria-label` / `placeholder`
strings. A control saying what it does is not the author's voice, and a screen
reader needs them. `npm run audit:copy -- --tooltips` prints the set; read
through once, they are all functional ("Close index", "Previous Page", "Open the
rule") with no invented voice among them.

## 28 · The organism assembles out of particles, and LC-02 forbids moving light

**Rules:** [LC-02 — Never a Travelling Dash](design/03-light-and-clocks.md),
[LC-01 — The Luminance Tide](design/03-light-and-clocks.md),
[DG-02 — Only Lines. Nothing Is Ever a Filled Area](design/01-drawing-grammar.md),
[PF-03 — Filters Are Cheap; Transforms On Big Groups Are Not](design/09-performance.md)
**Code:** [`src/utils/formation.ts`](../src/utils/formation.ts),
[`src/components/organic/Formation.tsx`](../src/components/organic/Formation.tsx),
the `formation` memo in [`src/components/Orrery.tsx`](../src/components/Orrery.tsx)

Asked for: the neurons should appear by particles assembling into them — dots of
light gathering into tissue, slowly. It is built, it plays once on the way past
the entry gate, and it needs recording here because it sits against the letter
of a rule.

**What it does.** Targets are sampled at constant arc length off `ALL_STRANDS` —
the same polylines `tissue()` draws — and written once into a flat
`Float32Array` of origin, control point, target, start and duration. Playback
evaluates that table; it simulates nothing, which is what "recorded" means here
and why it is affordable. Each dot falls inward along a bowed quadratic, takes
its start time from its distance to the core so assembly rolls outward as a wave
(LC-01's phase-by-distance, not a scatter), and extinguishes as it lands while
the tissue underneath comes up to meet it.

**Where it sits against LC-02.** That rule forbids light that *travels*: a lit
dash sliding along a strand, which reads as a bright capsule crawling over the
drawing. The reading taken here is that LC-02 governs light moving through
tissue that already exists, and this is the tissue arriving — a one-time event
with an end, in which nothing slides along a fibre and every mark crosses open
dark to reach one. When the last particle lands the layer is destroyed and the
map obeys LC-02 exactly as before, with no moving light anywhere in it.

That reading is not free, and it is recorded rather than assumed. If it is
rejected, the fix is deletion of two files and one memo, not a tuning pass.

DG-02 is not strained: a particle is a point of roughly one device pixel, which
that rule permits outright ("a bouton, a seed tip, a nucleolus is a bright dot").
Nothing here is ever given an interior.

**Measured, production build, 800×600, this machine** (ME-01 — the numbers are
the point, and the first two were regressions caught by taking them):

| | median frame | p95 | worst |
| :-- | --: | --: | --: |
| During the assembly | 116.7ms | 133.3ms | 183ms |
| Steady state after it | 116.7ms | 117.0ms | 117ms |

**The two medians are the measurement.** They are identical, which is the claim:
on this machine the assembly costs nothing on a typical frame. The absolute
number is the browser's own cadence and not the map's — an earlier run of the
same build read 83.4ms during and 83.4ms after, equal again at a different
baseline. Compare the columns, never the runs; the assembly is a five-second
event and the machine is not the same machine twice.

The whole assembly runs **5.7s**, front to back.

Three regressions were found by measuring rather than by looking. All three were
invisible to the eye as anything but "it looks a bit thin", and all three are
worth keeping written down:

- **Driving the ramp through React state cost 19× the light.** The landed
  fraction was first handed to `setState` every frame, re-rendering the whole
  map to change one number. The canvas fell to a measured **296 lit pixels** on
  a 1280×960 buffer against **~19,000** once the ramp was written straight to
  the node — the render loop was being starved by React reconciling ~8,000 SVG
  elements underneath it. This is PF-03's lesson reached from the other side:
  the expensive thing was never the particles.
- **Allocating the canvas at the moment of entry cost a 1,033ms frame.** Context,
  typed arrays and a ~5MB backing store landed in the same frame as the gate
  unmounting. Mounting the layer early and leaving it idle took the worst frame
  of the sequence to **433ms**.
- **Then the scratch buffers were still being allocated twice** — once by the
  idle pass and again when it went active — and moving them below the early
  return took the worst frame to **183ms**. Every one of those is the same
  mistake: work done in the frame the reader pressed a button to get.

A linear outward sweep was also measured and rejected: it left ~1.5s of near-black
after entry, because the early part of the wave crosses only the small area near
the core. The phase is raised to a power of 1.35, which front-loads the field
without moving its outer edge.

**Not measured here:** the `prefers-reduced-motion`, low-device-tier and
hidden-tab escapes are implemented and read straightforwardly, but the browser
used for the numbers above could not be made to emulate the first two, so they
are argued rather than demonstrated. A machine that can emulate them should
confirm all three land on a finished map with no canvas ever mounted.

## 29 · `audit-lines` reads source text, so it misses one thing and invents another

**Rules:** [DG-01 — Never a Straight Line](design/01-drawing-grammar.md) ·
[ME-01 — Verify by Measurement](design/10-method.md) ·
**Code:** `scripts/audits/static/audit-lines.mjs`

The audit that enforces DG-01 is a text search over source, and both of its
blind spots have now been hit in practice. They point in opposite directions,
which is why they are worth having in one place.

**It misses a straight run written as a curve.** A `Q` whose control point is
collinear with its endpoints draws a flat segment, and the audit reads line
elements and `L`-only paths, so it sees nothing. Recorded at entry 14, where a
figure could ship a straight run through a curve command and pass `npm run
lint`. The working practice is the one that entry and the arrow glyph in
`FiveQuestionsWidget` both use: state the bow as a percentage of the chord and
check it by hand, because the tool will not.

**It flags prose about the rule as a violation of it.** Naming that element's
tag inside a *code comment* fails the build — hit while documenting the gap
above, in a comment explaining that the audit cannot see collinear curves. The
audit cannot distinguish a mark from a sentence about marks, so the rule is
currently undiscussable in the files it governs, except by circumlocution.

**Deliberately not fixed, by two sessions independently.** Teaching the script
to skip comments, or to evaluate control points, is a change to an instrument
that enforces a rule whose own text says "there is **no exception**" — that is a
design call under ME-01, not a cleanup, and neither session's scope covered it.
The cost is small and asymmetric in the safe direction: the false positive is
loud and instant, and the false negative is the one that matters, so anyone
tempted to loosen the first should read entry 14 before touching the second.

### 28a · The formation was ported to the figures, and slowed

**Rule:** [FW-01 — Every Figure Is the Same Organism as the Map](design/05-figures-and-worlds.md)
**Code:** `LivingFigure.tsx` (the `formation` memo and `rampFigure`), `src/utils/formation.ts`

FW-01 is why this is not a choice: the figures are the map's grammar at another
scale, and that rule records what it cost the last time they were allowed to
fall a generation behind it. So a figure opened as a world now assembles out of
particles exactly as the map does, off `built.courses` — already `{ pts }`, the
same shape the recorder takes, which is what "one routine" buys.

**Only in a world.** A figure appears twice: inline on a page as an inert
preview, and opened on its own surface. Only the second is an arrival. A preview
that assembled itself would fire a multi-second animation on every page turn
onto a figure page — an attention mechanism on a page of prose, which is the
thing the manuscript argues against. Verified: with the preview on screen the
layer does not mount (`canvases: 0`); opening the world mounts it.

**Scale is a parameter now, not a constant.** `record` takes `spacing` and
`scale`, because a figure is a few hundred units across against the map's
thousand and the map's numbers there would put a handful of dots on a whole
course. Same apparent density, not the same number.

**Brighter and slower, as asked.** The alpha floor went from 0.46 to 0.72 with a
gentler exponent — the old curve spent most of a particle's life dim and put all
its light in the last moment before landing. The extra luminance is spent on
alpha and **not** on size: a dot given real area stops being a point and becomes
the fill DG-02 forbids, so the mark stays at about a pixel. The recording's
length went from 6,820ms to 8,570ms (×1.26) — arithmetic from the constants,
not a frame measurement.

**Not yet seen running.** Every reading in this entry above the line was taken
on a visible pane. This port was not: the browser pane went to
`visibilityState: "hidden"` with `requestAnimationFrame` stalled at **0 frames
per 1200ms**, and under those conditions the formation's hidden-surface escape
fires by design and lands a finished drawing instantly. Which does close one gap
— that escape was previously argued rather than demonstrated, and it is now
demonstrated: a hidden surface gets the completed figure, no canvas, no stall.
But the figure formation's appearance and timing have not been watched. Somebody
should open a figure world on a visible window before this ships — the same
instruction entry 22 carries, for the same reason.

### 28b · Page transitions do not get one, and that is the finding

Asked for "where possible". It is not possible on a page turn and should not be
forced:

- **Timing.** MO-03 fixes a page turn at 0.2–0.28s and says outright not to slow
  an interaction down to make it feel organic. An assembly is an 8.5s event.
- **Material.** MO-07 makes the turn a luminance tide through the page, and the
  reader's pages are prose — ink, not tissue (GR-05). Particles settling onto
  paragraphs would be light pretending to be type.
- **Repetition.** It would fire on every turn. The map's formation is survivable
  because it happens once; a thing that performs its arrival every time you turn
  a page is the attention mechanism this dossier is about.

The one page that is a drawing is the chapter opener (FW-08). It was examined
and left alone: only its axon exists as a sampled polyline, while the soma, the
vortex and the dendritic field are generated inside the primitives and expose no
points. A formation there would land particles along one fibre and nothing else,
which reads as a defect rather than as an arrival. Doing it properly means
having the primitives report their geometry — a real change to
`FigurePrimitives`, not a port, and worth its own decision.

## 30 · A figure sheet cannot be made narrower than 252px

**Rules:** [LY-02 — No Page Scrolling](design/08-layout-and-chrome.md),
[MO-08 — Thumbs Are Not Cursors](design/07-motion-and-input.md)
**Code:** [`src/components/PageRenderer.tsx`](../src/components/PageRenderer.tsx)
— the `page.diagramType` block

At a 280px viewport the figure sheets — FIG 0.1, the Bait Taxonomy, the
Fragility Index, the Cognitive Postures and the Metric Lotus — lay their inner
column out 252px wide inside a 248px box, so the sheet spends 4px of its own
8px right padding. Nothing is clipped and nothing is unreachable: the overflow
is contained by `.sheet-pad`, and every other sheet in the book, every overlay
and both stages measure clean at 280.

Two floors were found and one was removed. The ways out of the figure — **See
figure** and **See application** — are 44px boxes under MO-08 and sat in a row
that could not wrap, which came to 252px on its own; that row now wraps. What
is left is the figure's own `svg`, and its floor could not be attributed to any
`min-width` in the subtree: forcing the column to 200px lets every descendant
follow it down, so the 252 is reported by a diagram sized from JS rather than
set in CSS, and finding it means reading `useFitToBox` against each figure
rather than the layout.

Left open because 280px is below the width any mainstream phone reports, the
symptom is 4px of padding rather than lost content, and the remaining cause is
in the figure sizing rather than in the sheet. Recorded with the measurement so
the next pass starts from a number.

## 31 · The front door carries a loop, and the map's formation says it should not

**Rules:** [MO-03 — Neurologically Calm Motion, Instant Response](design/07-motion-and-input.md),
[LC-03 — One Clock For The Whole App](design/03-light-and-clocks.md),
[LC-05](design/03-light-and-clocks.md)
**Code:** [`src/components/organic/IntroField.tsx`](../src/components/organic/IntroField.tsx),
[`src/utils/introShapes.ts`](../src/utils/introShapes.ts)

The entry screen's cell is now a particle field that assembles into the splash's
own cell and then reassembles as a pappus, a shell, a wave field and a ring,
forever, for as long as the reader stands at the door. Asked for in those terms.

`Formation` — the map's own particle layer — states the opposite principle in
its header, and states it well: "the formation is an event with an end, not a
background process — anything that kept running would be a second clock on the
drawing forever, for a thing the reader has already watched happen." That is
right about the map and it is the reason this field is not on the map.

Three things were done rather than argued. Its period is `19700 / 3`, so three
forms pass per breath of the organism and the sequence closes on the tide
instead of beating against it (LC-05 fixes 19.7s outright). It runs on a surface
with nothing else moving on it, and it stops dead when the gate unmounts —
verified: after entry, zero `canvas.intro-field` in the document. Reduced motion
and a low device tier both land on the still cell rather than on a frozen frame.
Measured cost at 820 particles on a 290×290 backing store: **0.456ms per frame**,
against PF-01's 85ms budget.

What is open is not the mechanism but the question under it: whether a mark that
performs indefinitely belongs on the door of a dossier whose argument is against
designed-in motion, or whether the honest version performs its assembly once on
arrival and then holds the cell. The second is a one-line change (`stopped` after
the first full cycle) and is deliberately not made, because the brief was the
loop. Recorded so the decision is visible rather than implied by the code.

## 32 · The primitives report their geometry now — stage one of a particle map

**Rules:** [DG-05 — Hierarchy Is Generations, Not a Ratio](design/01-drawing-grammar.md),
[DG-06 — Density Is the Texture](design/01-drawing-grammar.md),
[PF-03](design/09-performance.md)
**Code:** [`src/components/figures/FigurePrimitives.tsx`](../src/components/figures/FigurePrimitives.tsx)

Asked for: the map's neurones, paths and connections drawn as animated particles
rather than as strokes, with the heavy parts baked so the whole thing stays
light online. This is the first of three steps and it is the one that changes no
pixels.

`growDendrite` computed an arbor and emitted React nodes in the same pass, so
the only way to learn where an arbor ran was to render one and read the DOM
back. Entry 31's note above — "doing it properly means having the primitives
report their geometry, a real change to `FigurePrimitives`, not a port" — is
that change, now made. Growth answers in `DendriteMark[]`: the meandering
course, the clamped stroke width, the opacity, the varicosities, the spines and
the terminal, each carrying the numbers the renderer used to compute inline.
`dendriteMarks()` grows a whole arbor; `dendriteStrands()` returns just the
courses, in the shape `formation.ts` already walks for the map's edges.
`renderDendriteMarks()` is the single, dumb SVG pass, shared by `Dendrites` and
by the vortex's own strands — one generator, one renderer, no second opinion.

**Verified as a no-op on the drawing, which was the whole point of doing it
first.** The map's rendered SVG was hashed before and after: 7,021 paths and
7,644 circles either way, `d`-attribute hash `8ce47a81` and circle-geometry hash
`de235017` unchanged, 920,393 characters of path data identical. Emission order
is preserved deliberately — segment, beads, spines, terminal, then children —
because SVG has no z-index and that order is part of the drawing.

**What is still open is the design question, not the plumbing.** DG-05 asks for
at least four visibly distinct generations and gets them from stroke width; a
point cloud has none. The hierarchy would have to be re-expressed as density and
brightness, which DG-06 says is how this drawing works anyway — but it is a
rewrite of rules that were each written after a regression, on the front door,
against a measured ~20fps steady state. Stage two bakes every strand into one
cloud with per-point tide phase; stage three is the canvas layer, behind a flag,
with the drawn map as the default until the comparison has actually been looked
at.

## 33 · The map had two sets of ruleset roots, and only one of them was drawn

**Rules:** [OG-01 — One Organism, One Routine](design/02-organism-and-graph.md),
[OG-04 — Crossings Must Fuse](design/02-organism-and-graph.md)
**Code:** [`src/components/Orrery.tsx`](../src/components/Orrery.tsx) — `branchSystem`, `BRANCH_STRANDS`

Asked for: clean the map of excessive and nonsense lines so the path through it
is clear. The largest single cause was not a design choice but a divergence.

`branchSystem()` had already been cut from three limbs per rule to a trunk and
one fork, at 520 and 400 units, and carries a comment saying why: "twenty-four
wandering fibres sweeping across open space — the biggest single contributor to
the map reading as a thicket". The renderer used it. `BRANCH_STRANDS` — which
feeds junction-finding, `ALL_STRANDS` and the formation — did not: it still grew
its own three roots at 620 / 540 / 470 from different seeds. So the map carried
sixteen roots that were drawn and twenty-four that everything else believed in.
A third of the relay cells were fusing crossings between fibres that do not
exist, sitting in open space with nothing passing through them, and the rest
were placed against courses a hundred units off the ones on screen.

`BRANCH_STRANDS` now calls `branchSystem`. Measured: 7,021 → 6,906 paths and
7,644 → 7,621 circles, which is 115 marks that were drawing relationships
between nothing and nothing.

**Length was the rest of it.** Even correct, a 520-unit trunk from a chapter at
(341,346) on a 1000×840 layout crosses the whole organism and leaves the frame,
and a fibre with no second soma to land on has nothing to justify the journey —
every cell it passes is a cell it is not connected to. Measured at 520: roots
terminating at (−131, 671), (1017, 113), (892, −75). At 215 and 160 they stay in
their own quarter, still fork, and still end in a growth cone rather than fading
(OG-06). The mesh between cells is now the only thing crossing open space, which
is correct, because the mesh is the only thing that means a connection.

## 34 · Where you have not been, said as a spike rather than a moving light

**Rules:** [LC-02 — Never a Travelling Dash](design/03-light-and-clocks.md),
[OG-08](design/02-organism-and-graph.md), [LC-03](design/03-light-and-clocks.md)
**Code:** [`src/index.css`](../src/index.css) — `.beckon`;
[`src/components/Orrery.tsx`](../src/components/Orrery.tsx) — `BECKON`

Asked for: the unexplored parts faded, with particle streams running toward them
so it reads as an invitation to open them.

The second half is the exact thing LC-02 forbids if it is built the obvious way.
A lit dash sliding along a fibre has two ends and the ends are what the eye
tracks, so it reads as a worm crossing the drawing rather than as light living
in it — and that rule is explicit that no amount of softening rescues it. What
it sanctions instead is saltatory conduction, which OG-08 already uses for a
two-way edge: stations that sit still and take a delay from their position, so
the spike appears to leap toward the far end while every mark stays exactly
where it is and only its brightness changes.

So `.beckon` is six boutons on the outer half of any fibre whose postsynaptic
end is a chapter this reader has not opened, firing in sequence toward it.
Fifteen runs, ninety stations, measured live at a 0.22 floor with one station at
0.98 — a dotted approach that is present at rest and swept by a spike, rather
than a string of flashes on a field that disappears between them (the lesson the
figure's own station field already records). On the spike's clock at half its
period, not the tide's, so it neither introduces a third clock nor beats against
the second. Not gated on the frame budget: everything else that drops under
strain is a luxury, and this is the only thing on the map that says where you
have not been.

The fade is opacity, and it was widened rather than invented — an unread section
sat at 0.52 against 0.66 read, which is a fifth of a stop between two dim things
and reads as noise rather than as a state. 0.44 against 0.70 ranks them without
hiding either.

## 35 · The particle map exists behind a flag, and the decision is now a comparison

**Rules:** [DG-05](design/01-drawing-grammar.md), [DG-06](design/01-drawing-grammar.md),
[PF-03](design/09-performance.md), [LC-01](design/03-light-and-clocks.md)
**Code:** [`src/utils/tissueMode.ts`](../src/utils/tissueMode.ts),
[`src/components/organic/TissueField.tsx`](../src/components/organic/TissueField.tsx)

`?tissue=particles` renders the organism's tissue as the baked cloud on one
canvas. The drawn map is and stays the default. Stage three of three; stages one
and two are entries 32 and 33 above.

**What it replaces, and what it leaves alone.** Two classes come off: `fibre-ink`
is every connection and ruleset root — the output of the single `tissue()`
routine OG-01 names — and `arbor-ink` is every dendrite arbor. Everything that
was never tissue stays in SVG: the somas, the chapter beacons, the core emitter,
the relay cells at the crossings, the beckon stations, the labels and every
transparent hit target. Those are light sources and controls, and a point cloud
has nothing to say about either. Verified by clicking a cell through the canvas
in particle mode: `pointer-events: none` throughout, the reader opened.

**Measured, at 980×820 on a 1225×1025 backing store:**

| | drawn | particles |
| :-- | --: | --: |
| SVG paths painted | ~6,871 | 3,801 |
| SVG circles painted | ~7,600 | 3,244 |
| canvas | — | 13,975 points, 6.34ms/frame |

So roughly half the painted SVG, plus a canvas costing well inside PF-01's 85ms
budget. `display: none` rather than `opacity: 0` deliberately — an invisible
subtree at zero opacity is still laid out and composited, which would make the
particle map the sum of both renderers instead of a replacement for one, and
being cheaper is most of the claim being tested.

**The corona is excluded from the bake and that is the one visible gap.** It
reaches 1180 units against a 1000×840 layout and the drawn map shows it only
once the camera has pulled back far enough for the whole organism to read as one
cell; baked in unconditionally it put 34 arms of dotted ray across the home
framing and out of the frame — 74% of the cloud, saying something at a scale
nobody is looking at (53,608 points before, 13,975 after). If the particle map
is kept it needs a second cloud keyed to the same pull-back the SVG uses.

**What is still open is the thing the flag was built for.** DG-05 asks for at
least four visibly distinct generations and gets them from stroke width; the
cloud re-expresses that as spacing and brightness, which is DG-06's own claim
about how this drawing makes texture. Whether that reads as the same organism —
and whether a map of points is still the drawing this dossier argues for — is a
judgement to be made by looking at the two, which is now possible.

## 36 · The mesh was four neighbours deep and carried links nothing had claimed

**Rules:** [OG-05 — A Mesh Closes Its Cells; A Graph Does Not](design/02-organism-and-graph.md),
[OG-02 — Nothing Floats](design/02-organism-and-graph.md)
**Code:** [`src/components/Orrery.tsx`](../src/components/Orrery.tsx) — `EDGES`

Asked for: the map is confusing, there are too many random connection lines and
pathways, and the dendrites and neurones do not read. Two causes, one of them a
rule violation.

**The invented cross-links are gone.** A loop joined section *i* to section
*i+5*, for every third section, as a long diagonal across the whole organism.
The pairing is arbitrary — there is no relation behind it — and OG-05 names this
exact move: "the map's connections mean something, so a loop closed between
chapter cells asserts a relationship that does not exist, and the drawing would
be lying to make itself denser." The longest, least explicable strands on the
map were the ones with no source at all. The document's real cross-references
live in `relations.ts` and are drawn where they are true; if the map ever draws
them, it draws those.

**Proximity degree went from four to two.** The comment on that block already
argued the right principle — spend the count, not the distance, because a
distance cap deletes links wherever the layout is sparse and leaves the dense
parts untouched. It had simply been left at four, and because the relation is
symmetric every node carried its own four plus everyone else's, which is what
made the mesh read as a scribble with cells caught in it rather than as cells
with connections between them.

Measured: 153 → 104 drawn fibres, 6,906 → 6,195 paths. The arbors and somas read
as individual neurones for the first time, which was the other half of the
complaint and needed no change of its own — they were never unclear, they were
buried.

**Nothing floats, and it was verified rather than assumed.** OG-02 requires a
DOM audit that reconstructs the graph from rendered geometry and BFS-checks
reachability from the core, and `scripts/audits/runtime/graph-audit.js` exists
for it. Run against the thinned mesh: **51 nodes, 0 unreachable.** The
component-bridging walk still guarantees one organism; what came off was never
load-bearing.

## 37 · The particle map is the default; the drawn map is now the reference

**Supersedes:** the open question in 32 and 35
**Code:** [`src/utils/tissueMode.ts`](../src/utils/tissueMode.ts)

The comparison the flag existed for was made and the decision is taken: the
map's tissue is the baked point cloud. `?tissue=drawn` brings the stroked SVG
tissue back.

The drawn map is kept rather than deleted, and not out of sentiment. It is the
reference the particle map is measured against — DG-05's separable generations
come from stroke width in one and from spacing and brightness in the other, and
the only way to tell whether that translation still holds after a change to the
arbor generator is to put the two side by side. A renderer with no reference
drifts and nobody can say when.

**Two things had to be settled before it could be the default rather than an
experiment.**

*The corona now has a cloud of its own.* Baked into the organism's it was 39,000
points — three and a half times the rest of the drawing — for an arbor nobody
sees until the camera has left the tissue behind, and it painted 34 arms of
dotted ray across the home framing. Left out, it simply vanished at zoom-out,
because the drawn one is hidden with every other arbor. Drawn in SVG while the
organism was points, it was a stroked cell around a particle one, which is two
drawings in one frame. So: its own lazily-baked cloud at spacing 15 against the
organism's 5.2 — 12,863 points, 12.3ms — on the same `pulledBack` gate the drawn
corona uses, with the pull-back ramp carried through `formed`. One cell at a
hundred times soma scale needs far fewer marks for the same apparent density,
which is the argument `formation.ts` already makes for sampling a figure and the
map differently.

*The bake is no longer on anything's critical path.* 208ms when it was first
measured; 22.2ms now, for 11,179 points and 175KB, because the corona came out
and the mesh was thinned (entry 36). It is paid while the entry gate is still
up, exactly as the formation recording is, and memoised after.

**Measured as the default, at 980×820:** 3,174 SVG paths and 3,117 circles
painted, against 6,195 and 7,443 for the drawn map — a little over half.
Interaction verified through the canvas (`pointer-events: none`, a cell opened
the reader); the mode class is scoped to the map root, so the reader's own
arbors and the figures are untouched (verified: chapter opener still paints its
arbor, no mode class in the reader); 58 sheets swept at 980×820 with no panel
escaping and no page scroll.

## 38 · The type was audited against the rules, and it held everywhere but one glyph

**Rules:** [TY-01](design/06-typography-and-copy.md), [TY-02](design/06-typography-and-copy.md),
[TY-03](design/06-typography-and-copy.md)

Asked for: check every hierarchy and text for visual balance, two families —
one for titles, one sans — one voice of weights and colours, and the same
consistency in the figures and the tools.

**Swept on rendered computed style, surface by surface, not by grep.** Every
element that owns a text node, on the entry screen, the map, a prose sheet, the
index drawer, search, settings, a figure world, the ruleset sheets and two
instruments:

| | found |
| :-- | :-- |
| families | `Newsreader` (titles) + `IBM Plex Sans` (everything else) — no third |
| weights | `300`, and nothing else, on every surface |
| sizes | 9 / 12 / 18 only — **zero** off-scale elements anywhere |
| colour | `rgb(255,255,255)`, one value; rank is carried by opacity |
| tracking | `1.8px` and `2.4px` — both 0.2em, at 9px and at 12px |

Figure and instrument SVG matched the interface: `IBM Plex Sans`, weight 300,
white fill. The static gates the rules prescribe are clean too — one tracking
utility (`tracking-[0.2em]`, 111 uses), no banned weight class, no named
Tailwind size step, and the only literal sizes in the source are
`text-[9px]` (106), `text-[12px]` (90), `text-[18px]` (16).

**One violation, and the rule's own wording is why it survived.** TY-01 said "no
numeric `fontWeight` above 300 on SVG text"; the chapter opener's numeral was
`fontWeight={200}` — below the bound and therefore never caught, while being
exactly the second weight the rule exists to prevent. It was also redundant: the
same `<text>` already carries `opacity={0.82}`, which is the mechanism TY-01
names for making a mark sit back. Now 300, and the rule reads "other than 300"
with a one-line grep beside it.

**Two families is now the rule rather than a divergence.** Confirmed on
instruction; TY-01 names both faces and their roles, and entry 12 above is
closed. A rules file carrying a known disagreement with the code is the thing
it must never do.

## 41 · The icons are drawn here now, and the reference they follow is made of straight lines

**Rules:** [DG-01 — Never a Straight Line](design/01-drawing-grammar.md),
[FW-01 — Every Figure Is the Same Organism as the Map](design/05-figures-and-worlds.md),
[FW-02 — Figures Are Filaments, Never Boxes](design/02-organism-and-graph.md)
**Code:** [`src/components/organic/Icons.tsx`](../src/components/organic/Icons.tsx)

`lucide-react` is gone. Eighteen glyphs — the navigation, instrument and
settings sets — are drawn in the repository, in the language of a reference
sheet of thin white scientific line diagrams: conic sections, orbital rings,
lattices, sine waves with their nodes marked.

**The conflict, and how it was settled.** That reference is built from straight
rules — axes, grid lines, the edges of wireframe solids — and DG-01 forbids
every one of them with the words "there is no exception", enforced by
`audit-lines` failing the build. The resolution is the one the grammar already
supplies for this exact case: `arcSegment()` exists because "a short straight
stroke would otherwise appear", and every stroke in the icon set is a quadratic
or an arc bowed by 2–4% of its span. At the 12–20px these render at, that is
under a third of a pixel of deflection — it reads as the reference's straight
rule and is not one. No allow-list was added and the rule was not weakened.

Arrowheads are three bowed strokes rather than a filled triangle, because FW-02
refuses arrowheads and a solid triangle is also the filled area DG-02 refuses.

**A dependency left with them.** The `vendor-icons` chunk (8.35 kB) is gone and
the precache dropped from 29 entries to 28. A general-purpose icon toolkit was
also the "adjacent to the drawing rather than made of it" failure FW-01 records
against the figures, one layer up in the chrome.

**Worth knowing:** writing this up tripped `audit-lines` from inside a *comment*
— naming the forbidden element in prose fails the build. That is entry 29's
false positive, met in the wild. The comment is phrased around the tag name and
says why.

**Outstanding.** The density increase that came with it (particle spacing 7.5 →
5.2, about 1.44× more marks) has not been measured for frame cost, and DG-06
requires exactly that before a density constant moves. The browser pane
available here had `requestAnimationFrame` stalled at zero frames, so the
during-versus-after comparison that the earlier entries rest on could not be
taken. It needs one run on a machine that composites.

## 39 · Opacity was the hierarchy channel and it had sixteen steps

**Rules:** [TY-01](design/06-typography-and-copy.md), [TY-02](design/06-typography-and-copy.md)

With family, size, weight and colour all fixed by rule, opacity is the only
channel left carrying rank — and it was authored on a continuous 5% ramp:
`opacity-25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100`.
Sixteen steps, each indistinguishable from its neighbour, which is TY-02's own
finding about the fourteen type sizes ("not a scale, it is an accident") on the
channel TY-01 hands the work to.

**Four steps now**, snapped by nearest with ties resolved down — the same tie
rule TY-02 uses, and down means quieter, which is the safe direction here:

| step | role | uses |
| --: | :-- | --: |
| `100` | the one thing a surface is about; the lit state | 12 |
| `70` | the voice — body, active labels, `.bud` at rest | 59 |
| `45` | supporting — secondary labels, captions | 47 |
| `25` | quiet — provenance, disabled | 11 |

94 utilities rewritten across 21 files. Scoped to class lists that also carry a
text size, so it is definitively text: the 57 opacity utilities on drawing
elements were left alone, because tissue opacity is tuned by DG and LC and is
not a typographic step. `.bud` moved 0.68 → 0.70 and `.bud:disabled` 0.22 →
0.25 so the ladder is honest — a scale with a value that is nearly but not
exactly a step is a scale nobody can check.

**What this does not claim.** Rendered distinct opacities are still many,
because nesting multiplies (a 0.70 label inside a 0.88 group renders 0.61) and
because drawing marks carry their own values. The authored *text* vocabulary is
four; the rendered figure is not, and flattening it would mean forbidding nested
opacity, which is a different and much larger rule.

## 40 · The Restoration Delta no longer scrolls

**Rules:** [LY-02](design/08-layout-and-chrome.md)
**Code:** [`src/components/widgets/RestorationDeltaWidget.tsx`](../src/components/widgets/RestorationDeltaWidget.tsx)

Measured at 922×694: the panel body overflowed its box by **38px**, so the one
instrument that is a *comparison* made the reader scroll to see the pair. Six
scales, three blocks, on spacing inherited from a column that was never fitted.

Compacted without changing the structure the instrument's claim rests on: outer
stack `space-y-5` → `space-y-3`, question stack → `space-y-2.5`, blocks `p-3
space-y-3` → `p-2.5 space-y-2`, scale halves `space-y-1.5` → `space-y-1`, the
five buttons `py-1.5` → `py-1`, and the before/after grid to `gap-y-2`.
Measured after: **zero** overflow at 922×694, 1024×700 and 1152×840.

It keeps `overflow-y-auto` rather than joining `FITS_ONE_SCREEN`. Six scales
cannot fit a 390px-tall frame at any spacing, and `overflow-hidden` there would
clip a reading rather than let it be reached — which is the one thing LY-02
does not allow. The scroller is now a floor for short frames instead of the
normal case.

**The other two are closed in [43](#43--the-fitted-instruments-stopped-stretching-and-the-band-is-centred-instead).**
Both the void and the 6px of phantom scroll range came from the same flexible
row track, and both went when it did.

## 42 · The formation grows out of the cells now, and no frame cuts the drawing

**Rules:** [DG-09 — An Unbounded Field Fades; It Never Ends](design/01-drawing-grammar.md),
[GR-01 — The Ground Is Black, and Nothing Is Drawn On It](design/04-ground-and-colour.md),
[GR-04](design/04-ground-and-colour.md), [DG-05](design/01-drawing-grammar.md),
[GR-08 — The Reader Is Made of Light-Wells](design/04-ground-and-colour.md)
**Code:** `src/utils/formation.ts`, `src/components/organic/Formation.tsx`,
`src/components/ChapterOpener.tsx`, `src/index.css`, `src/components/IntroScreen.tsx`

**The formation had the direction wrong.** Every particle began outside the
organism and fell inward onto its target: the right picture, the wrong story —
tissue arriving from elsewhere and settling onto a plan, when the subject is the
one structure everyone has watched grow. Particles now start at the **cell
centre nearest their target** and travel outward, timed by distance along the
process divided by a growth rate. Three consequences, all of them the point: the
somas are the first thing on the sheet, each cell grows its own arbor at its own
staggered rate, and a strand between two cells is grown **from both ends** —
because its points belong to whichever centre is nearer — so the halves travel
toward each other and meet. The interconnection is a consequence of the rule,
not an effect staged on top of it. `SWEEP` and the inward drift are gone.

**Nothing is cut by a frame any more.** Two places were drawing a rectangle by
subtraction. The chapter opener builds its axon to run past the sheet, and a
viewBox clips — so a hairline travelled out and stopped dead against an
invisible vertical. And a particle beginning outside a tight framing crossed the
canvas boundary at full brightness, popping into existence along a straight
edge. Both now dissolve: the opener takes the same radial `-edgemask` the map
uses (stopping short of its type, which must not be dimmed), and particle alpha
falls to nothing over the outermost 46px of the buffer. DG-09's answer, applied
twice: the sheet crops something already gone.

**Hover was flashing.** `.tissue-live` hover forced `stroke-width: 1.15` and
`r: 1.6` onto marks resting at 0.26–0.34 — a four-fold thickening, and a *fixed*
target width means the thinner the strand the harder it jumps. GR-04 says
contrast is bought with opacity and that thickening turns a bundle back into a
stroke; DG-05 needs the generations to stay separable. Touch is opacity alone
now, 0.2s in (MO-03's range; 0.14s sat outside it) and 1.6s out.

**Measured** (production, visible pane, particle map): assembly 8,570ms, frame
median **33.5ms during** against **50.0ms after**. The assembly is not merely
free — frames during it are faster than steady state, because the canvas is
cheaper than the tissue it is standing in for. That closes the density
measurement DG-06 required for spacing 7.5 → 5.2.

**A departure, flagged rather than assumed.** The intro's divider is now a
straight one-pixel rule fading at both ends, asked for directly. GR-08 says a
divider is a `<Vein />`, "never a rule", and DG-01 forbids straight segments. It
is defended as typographic furniture rather than tissue — it is CSS, not a path,
so no drawing in the app asserts a straight fibre and `audit-lines` keeps its
teeth — but **GR-08 as written does not permit it**, and whether that rule should
change is a decision for its owner, not for a component comment.

## 43 · The fitted instruments stopped stretching, and the band is centred instead

**Rules:** [LY-02](design/08-layout-and-chrome.md), [ME-01](design/10-method.md)
**Code:** [`FiveQuestionsWidget.tsx`](../src/components/widgets/FiveQuestionsWidget.tsx),
[`ContentBudgetWidget.tsx`](../src/components/widgets/ContentBudgetWidget.tsx)

Closes the two findings [40](#40--the-restoration-delta-no-longer-scrolls) left
open. Both fitted instruments carried `lg:grid-rows-[minmax(0,1fr)]`, so at
`lg` the cards took the whole column whatever they held, and each handed the
slack to whatever sat at its bottom edge.

**Measured at 1440×900**, before → after:

| panel | card | before | after |
| :-- | :-- | --: | --: |
| five-questions | question card, height / void | 798.5px / **581px** | 336.5px / 118.2px |
| five-questions | reading card, height / void | 798.5px / **464px** | 336.5px / 1.8px |
| content-budget | the working, height / void | 764.7px / **482.8px** | 307.3px / 25.4px |
| both | phantom scroll range | 6px | **0px** |

The row is `lg:grid-rows-[min-content]` now — the tallest card's own height —
and `lg:[align-content:safe_center]` centres the band in the frame. The spare
height becomes ground above and below the pair (231px each side on
five-questions) instead of black inside two lit boxes. Grid's own `stretch`
still gives the shorter cards the tallest one's height, so the band keeps one
top edge and one bottom edge; the residue inside a card is the difference
between it and its neighbour, which is what the chevrons and the open curtain
were always there to take.

**The 6px was the same cause.** A `1fr` track resolved to 771.5px inside a 772px
box and reported 778px of scroll height. Nothing was past the box and nothing
was cut — with a content-sized track the arithmetic is exact and the range is
zero. The earlier reading, that it was a rounding artifact, was right about what
it was and wrong about it being separate.

**Why `safe` and not bare `center`.** Plain `center` overflows past *both* edges
when the content exceeds the box, and the top of the first card can then never
be scrolled back to. Measured at 1024×400: 40px of overflow, the first card
flush to the top of the scroller, all of it reachable. `safe` degrades to
`stretch` where it is unsupported, which is the behaviour this entry replaces —
so an old engine gets the old composition rather than a broken one.

**Supersedes the earlier attempt.** [40](#40--the-restoration-delta-no-longer-scrolls)
records that centring was tried and reverted because it put the question at a
third of the frame rather than a half. That attempt centred the *contents inside
a stretched card*, which only moves a void; this one stops the card stretching,
so there is no void to move.

## 44 · The map has depth now, and there is something behind it — which GR-03 forbids

**Rules:** [GR-03 — The Map's Ground Is Empty](design/04-ground-and-colour.md),
[GR-07 — Blur a Line, Never a Mass](design/04-ground-and-colour.md),
[FW-05 — A Figure Has a Far Plane](design/05-figures-and-worlds.md),
[DG-02](design/01-drawing-grammar.md), [DG-05](design/01-drawing-grammar.md)
**Code:** `src/utils/tissueCloud.ts` (`C_FOCUS`), `src/components/organic/TissueField.tsx`

Asked for: each island of the organism separated into three planes — the core
brightest, the next at about 70% focus, the furthest at 40% and slightly soft —
and a faint field behind the whole system, drifting and glowing, so the map has
something to hang in.

**The three planes are free, and they are the generations.** A point's plane is
decided by the stroke width its course was drawn at, which is already DG-05's
generation — so depth and hierarchy are one fact rather than two that can drift.
Trunks in front at full, the mid arbor at 0.7, the finest reticulation at 0.4.

**It is not a blur, and it must not become one.** GR-07 allows a soft pass only
over line geometry behind a measured gate, and FW-05's far plane is one Gaussian
over an SVG *group* — neither is available to a canvas drawing 52,000 points,
and a real blur would be a per-frame pass over the whole buffer, the exact cost
PF-04 refuses. Recession is carried as a camera carries it: the far planes are
much dimmer and their marks fractionally wider, which at one device pixel reads
as out of focus rather than as larger. They stay points (DG-02).

**The deep field is a departure from GR-03 and is recorded as one.** That rule
says, in as many words, that "what is left behind the organism is nothing at
all", and it was earned — an ambience layer of drifting flowers and arc ticks
was removed because it was made of the same mark as the tissue, so the eye could
not separate backdrop from anatomy. The new layer is built against that specific
finding: it is **points, never filaments** (the rule's own words are "nothing
behind the organism may be made of filaments"), it is capped at **0.2** — under
the faintest tissue, so it can never be read as anatomy — and it is sparse and
slow enough to read as depth rather than as a second drawing.

That may or may not satisfy what GR-03 was protecting. **The rule as written
does not permit it**, and whether the rule should change is a decision for its
owner. Flagged rather than assumed.

**Cost.** 170 motes, each two sines and one fill, baked once at mount and never
reallocated — no physics, no neighbours, no per-frame allocation, the same
recorded approach the formation uses. Measured at 1280×820 with the deep field
and all three planes live: **49.9ms median, 50.1ms p95**, which is PF-01's
stated design target for this map ("~20fps (≈50ms) with the flex filter on —
that is the tuned number, not a fault"), not a regression against it.

**Not yet measured:** the same reading on a low tier, where the deep field is
skipped along with the tide (it is gated behind the same `frozen` test as the
swell), and on a machine that composites reliably enough to judge the three
planes by eye rather than by their numbers.

## 45 · The connections conduct now, and the cords are gone

**Rules:** [LC-02 — Never a Travelling Dash](design/03-light-and-clocks.md),
[LC-04](design/03-light-and-clocks.md), [LC-05](design/03-light-and-clocks.md),
[DG-05](design/01-drawing-grammar.md), [PF-01](design/09-performance.md)
**Code:** `src/utils/tissueCloud.ts` (`C_ALONG`, `C_RUN`), `src/components/organic/TissueField.tsx`

The map's edges read as static cords — a course was a row of points at one
brightness, so the connections were the only part of the organism with no life
in them. They now conduct: light runs along each course, and different courses
run in different directions.

**This is the mechanism LC-02 sanctions, not an exception to it.** That rule
forbids the obvious fix in as many words — an animated dash offset gives light
two ends, and "those ends always read as a bright capsule sliding over the
drawing" — and then names the one permitted answer: stations sharing a period,
each taking a delay from its position along the fibre, so the spike appears to
leap distally. "Nothing moves and nothing has ends — each node simply fires
later than the one behind it." A point cloud is already that: every point
records how far along its course it lies, and one shared clock is offset by that
distance. No mark travels. Direction is per course and signed, so the map stops
pulsing in unison, and rates are spread on the golden ratio (LC-04) so no two
courses fall into a simple ratio.

The run is a multiplier that never reaches zero — a course has to stay
continuous tissue between pulses rather than becoming a dotted line switching on
and off — and it keeps its own clock, off the tide's, because LC-02 is explicit
that a fast discrete event and the slow metabolic swell must not share a period
or they collapse into one effect.

**Measured, 1200×800, production, everything live** — denser cloud (base spacing
5.2 → 4.05, about 30% more points), the second per-point clock, three focus
planes, and 260 deep-field motes: **50.0ms median, 50.9ms p95, 66.7ms worst**.
That is PF-01's stated design target for this map (~20fps, ≈50ms, with the flex
filter on), unchanged from before any of it. The pulse shape is a compare and
two divides rather than `swell`'s trigonometry, which is what bought the second
clock at no cost; the shape matters here and the precision does not.

**Also in this pass:** the focus planes moved to 1 / 0.4 / 0.2, asked for as
"40% more out of focus", and the deep field to 0.4. The far generations are now
very faint by construction — that is the request, and it is the first number to
revisit if the arbors stop reading as tissue.

### 45a · Tissue conducts; a connection is a shot

The first pass gave every course the same gentle run, and the edges still read
as cords — breathing ones. The fix is that they are not the same kind of thing,
and the cloud now says so: `WeightedStrand.conduct` is how much of a course's
brightness the pulse carries.

A cell's arbor is **material** — it is there whether anything is passing through
it or not, so it conducts gently (0.18) and stays continuous. A connection
between cells is **a path something travels**, and at rest there is nothing to
see, so it is nearly dark between pulses (0.9) and full only as one crosses. A
ruleset root sits between the two (0.6): it leaves a cell and goes nowhere in
particular, so it conducts, but it is also the chapter's own reach and has to
stay legible. The pulse itself was reshaped to match — dark for two thirds of
its cycle, because the gap between shots is what makes a shot read as one.

**It is never allowed to reach zero.** A course that vanished between spikes
would be a different claim about the graph than the map makes: OG-01 has
everything connected, at rest, all the time. The floor is what keeps the
topology true while the light is elsewhere.

Re-measured after the change, same frame and build: **50.0ms median**, unchanged.

**Also in this pass:** the composer's branch picker is gone. Eight lit chips
stood above the block on every page carrying it, offering the other seven
branches to a reader who was on one — the same "a list turned into a launcher"
fault the index rows had. Nothing was lost: the composer is seeded with the
branches the page carries, so the block you arrive to is already the one you
wanted, and `picked` stopped being state because nothing on the surface changes
it any more.

## 44 · The default turn is the fade, and the fade had only one half

**Rules:** [MO-07 — A Page Turn Is a Tide, Not a Sheet of Paper](design/07-motion-and-input.md),
[MO-03](design/07-motion-and-input.md)
**Code:** [`userStore.ts`](../src/data/userStore.ts), [`BookSpread.tsx`](../src/components/BookSpread.tsx), [`index.css`](../src/index.css)

**The divergence, asked for directly.** MO-07 names the tide as the default turn
and keeps "flip/slide/fade as options". The default is now the fade. The tide is
unchanged and still selectable; what moved is only which one a reader who has
never opened the settings gets. MO-07 has not been rewritten — this entry is the
record that its first sentence and the shipped default disagree, and that the
disagreement is deliberate.

**The fade was half a fade.** `turn-fade` animates the *arriving* sheet from
transparent to present. The leaving sheet had no exit at all: the content
swapped on the same frame the class replayed, so the old page vanished on a cut
and the new one faded in over the ground. The turn is now deferred by the length
of an out-phase — 110ms out, the page changes while nothing is legible, 220ms
in — which is inside the 0.2–0.28s MO-03 allows a page turn.

**Two wrong attempts, both measured, because the second looked correct.**

1. Inline `opacity: 0` plus a transition applied together on the turn. A
   transition must already be in effect when the value changes, and React
   commits both in one style write.
2. Declaring the transition unconditionally and moving only the opacity. This
   is the standard fix for (1) and it also did nothing — because `.turn-fade`
   fills `both`, so between turns the finished keyframe sits frozen on the
   element holding opacity at 1, and **a filled animation outranks an inline
   declaration**. Sampled every 20ms through a turn, the inline value read
   `"0"` while the computed value stayed `1` for the whole out-phase and then
   cut to 0 at the swap: `1, 1, 1, 1, 1, 0`.

The fix is that the out-phase is an animation too — `.turn-fade-out` replaces
the arriving class while leaving, so the applied animation is the one that runs.
Measured after, every 18ms: **0.99, 0.94, 0.86, 0.73, 0.24, 0** and then
**0.28, 0.75, 0.84, 0.98, 1**. A ramp in both directions.

**Reduced motion takes the cut**, and `commitTurn` checks it before scheduling
the timer: an engine told not to animate must not be handed a delay instead.
`.turn-fade-out` joins the other four in the reduced-motion block.

**Worth knowing.** The default only reaches readers with no stored preference —
`animationStyle` is persisted, so anyone who has already opened the reader keeps
the tide until they change it. Verified by clearing `media_universe_prefs_v1`.

## 45 · The cut follows the frame, and body text stopped resizing

**Rules:** [LY-01](design/08-layout-and-chrome.md), [LY-02](design/08-layout-and-chrome.md),
[TY-01](design/06-typography-and-copy.md), [ME-01](design/10-method.md)
**Code:** `src/utils/sheetBudget.ts` (new), `src/data/pageModel.ts`,
`src/data/anchors.ts`, `src/data/searchIndex.ts`, `src/components/PageRenderer.tsx`, `src/App.tsx`

Two changes that are really one. Body text was set anywhere between **11px and
18px** depending on how full a sheet was — `useFitToBox` shrank a crowded sheet
and grew an empty one — so the manuscript changed size as the reader turned the
page. That is not what TY-01 means by three type sizes: 9, 12 and 18 are three
steps with jobs, not the ends of a range for the layout to pick from.

The fitter is now held at 1 in both directions and the type never moves. What
adapts instead is **the cut**: `generateBookPages` already took a character
budget, and that budget is now measured from the frame rather than fixed at
2,000 for every reader on every screen.

**Measured, before → after.**

Taken against the canonical cut of **55 sheets** (it was 47 when this work
started; the trendwatch addendum added six and two of those cut in two, which is
this budget doing its job).

| frame | sheets | over one column | worst sheet | viewport scroll |
| :-- | --: | --: | --: | --: |
| 1440×900 | 55 → **81** | 8 → **4** spreads | 3.27 | 0 |
| 844×390 | 55 → **92** | 37 → **11** | 20.59 | 0 |

Median columns per sheet at 844×390 is **1**, and the worst sheet in the sampled
range 8–88 is **2.1** — down from 20.59 before. Of the eleven that still exceed
one column, nine sit at exactly 2.1 (the paragraph floor below) and two are the
appendix sheets. No viewport scrolling and no inner vertical scroller appears at
any frame, before or after.

**What it does not fix, and why.** The worst sheets did not move, because they
carry no splittable prose: `generateBookPages` divides `sectionData.content`, and
the production ruleset, the cross-branch checklist and the consolidated sources
have none. A budget cannot cut what it cannot see, so those keep the sideways
flow. Splitting them needs its own pass over those page types.

There is also a floor the budget cannot go under: **a sheet cannot hold less than
one paragraph**. `parts` is capped at `sd.content.length`, so a section of a few
long paragraphs stops dividing while its sheets are still over-full, which is why
eleven sheets rather than none remain over one column on a 390px-tall frame.

**Three wrong versions, each found by measurement.**

1. **Retried on `requestAnimationFrame`.** In a pane delivering 2–3 frames per
   second the thirty-frame retry window never elapsed: the budget resolved
   correctly to **1069** against a default of 2000, and the book was never re-cut
   because the callback carrying that number was still queued. `fitToBox` already
   carries this correction in its own comment — rAF does not fire in a tab that
   is not being painted. It retries on a timer now.
2. **Measured only from rendered prose.** A reader who resumes onto the sources
   sheet, a figure or a chapter opener gives the sampler nothing to read a
   density from, and that is wherever the reader happened to stop rather than a
   rare case. Resuming onto sheet 47 of 47 kept the default cut on the exact
   frame that needed re-cutting most. The type's own metrics stand in now.
3. **One unfittable sheet dragged the whole book down.** The correction assumes
   an over-full sheet means a too-generous budget. That is false for a sheet at
   the paragraph floor, and correcting off one shrinks a budget that was never
   the problem while every other sheet pays. Measured: 1440×900 settled on **132**
   sheets against **112** for a phone held sideways — the desktop, with twice the
   column area, asking for MORE sheets than the cramped frame. Corrections are
   now floored at half the estimate: 81 against 92, which is the right way round.
4. **Estimate and correction fought each other.** The overflow correction would
   shrink the cut, the next tick's estimate would put it back, and the count
   oscillated **47 → 142 → 91** in front of the reader while still landing on a
   2.1-column sheet. The estimate now runs once per frame size and then hands
   over to observation, which is the only one of the two that measures rather
   than predicts.

**Marks are unaffected, by design rather than by luck.** Bookmarks, highlights
and the saved position are anchors — a section and a paragraph — resolved to a
sheet at read time, so a re-cut moves page numbers and never places. The two
caches that hold page indices (`anchors.ts`'s section map, `searchIndex.ts`'s
postings) rebuild on a re-cut through a subscription; without that a search would
send a reader to the sheet a phrase sat on before the book was re-cut for them.

**Node still gets one canonical cut.** The static audits import `BOOK_PAGES` in a
runtime with no viewport, so the default budget remains the canonical pagination
and `audit-relations` continues to report 47 sheets. The array is re-cut **in
place** rather than replaced, because eight modules import the binding directly
and two build caches from it at load; handing out a new array would leave every
one of them pointing at the old book.


## 46 · The trendwatch addendum is a second corpus, and TY-04 now has two sources

**Rule:** [TY-04 — Literal Document Text](design/06-typography-and-copy.md)
**Code:** [`src/data/trendwatch.ts`](../src/data/trendwatch.ts),
[`scripts/audits/static/audit-copy.mjs`](../scripts/audits/static/audit-copy.mjs)

Three report sheets and three figures were asked for, closing Chapters I, III
and V with what the instruments have recorded since. That is a lot of prose, and
none of it is U.R.'s.

It is held in its own module rather than in `bookData.ts`, so the question "is
this sentence the author's?" stays answerable by asking which file it came from.
The copy audit was widened to read `trendwatch.ts` as a second corpus alongside
the manuscript and the ruleset.

**The widening opened a hole, and the hole is now closed.** TY-04's force comes
from the corpus being closed: a rendered sentence is either the author's or it
was asked for, and anything else is invented — which only works while "was this
asked for?" has an answer that is not "somebody put it in the accepted file".
Once the addendum is an accepted destination, the cheapest way past a failure
stops being *make it verbatim or delete it* and becomes *move it into
`trendwatch.ts`*, which the audit would then wave through. The rule would have
turned from a check on **invention** into a check on **location**.

So the second corpus is pinned the way `ALLOWED` closes the first. Its sentences
are hashed (113, `d1d06db733bc3680`) and a sentence added to it fails the build
until somebody re-pins deliberately with
`npm run audit:copy -- --pin-addendum`. Verified by adding an invented sentence
to the module and watching the audit refuse it. That restores the property the
rule depends on: a new sentence requires a person to say *yes, this was asked
for*, rather than requiring nothing at all.

Note the pin is a gate on **provenance**, not on support. Whether a claim
carries its instrument and its year is a separate discipline, enforced by
`trendwatch.ts`'s own shape (`source`, `year`, `chain`), and passing one gate has
never meant passing the other.

**Still open:** a third corpus would start to make the rule meaningless however
well each one is pinned, so the count is the thing to watch now rather than any
single file.

**Also open:** nothing in the app tells a reader which corpus a sheet came from.
The sheets are numbered `TRENDWATCH I/III/V` rather than `1.6`/`3.5`/`5.8`, which
is the only signal, and it is a naming convention rather than a statement.
Whether the addendum should say what it is on the page is a manuscript decision.

## 47 · The antifragile arm of the final model does not grow, and was not made to

**Code:** [`src/data/trendwatch.ts`](../src/data/trendwatch.ts) — `SENSITIVITY`

FIG TRENDWATCH V compares the extractive posture with the adopting one under one
shock. The model was run before anything was drawn and **neither arm grows**:
over 2026–2032 the extractive arm ends at 24.3 on an index of 100 and the
adopting arm at 64.7. No setting of any parameter turns the second arm upward.

What survives the sweep is the ratio, which never leaves 2.15–3.29 — and which
widens as the shock hardens (2.15 at a 10% annual decay, 3.29 at 25%). That is
the only antifragile behaviour the model produces, and it is a claim about
differential survival rather than about growth.

**Open, and it is a real divergence.** §5.5 argues that anti-engagement metrics
*compound* — the Metric Lotus draws `contact → degrade → compound` — and the
model contains no compounding term. Adding one is the single change that would
turn the adopting arm upward, which is exactly why it was not added: tuning a
model until it agrees with the chapter it illustrates is the failure Chapter IV
is about. Either the manuscript's compounding claim gets an evidenced mechanism
and the model gains a term, or the figure keeps saying something narrower than
the chapter it closes. Recorded rather than resolved.

## 48 · `FigureStage` routes figures with an `&&` chain and cannot be exhaustive

**Code:** [`src/components/FigureStage.tsx`](../src/components/FigureStage.tsx),
[`src/components/PageRenderer.tsx`](../src/components/PageRenderer.tsx)

Two registries map a `diagramType` to a component. `PageRenderer`'s is a
`Record<NonNullable<BookPage['diagramType']>, ...>`, so adding a figure type and
forgetting it **fails the build**. `FigureStage`'s is a chain of
`{figure === '...' && <X />}`, so the same omission **compiles clean and renders
nothing** — which is what happened when the three addendum figures were added:
the page previews drew, and the figure worlds opened onto an empty sheet with
working chrome around it.

Fixed by adding the three lines, which leaves the fragility in place. The stage
should read the same `Record` the page does; it is a small refactor and was out
of scope here, but until it happens every new figure has two places to forget
and only one of them says so.

### 45b · The cords came back because the frozen floor was five times the live one

**Code:** [`src/components/organic/TissueField.tsx`](../src/components/organic/TissueField.tsx)
— `FROZEN_CONDUCT`

Reported twice, and 45a did not close it. The still-frame branch discounted a
course by `1 - conduct * 0.55`, which for a connection (conduct 0.9) is **0.505
— five times the 0.1 the live map shows between shots**. So the instant the
surface froze, every connection came back as a cord. The first fix took them
from full brightness to half and left them *static*, and static was the
objection: a frozen surface has no shots by definition, so anything visible on
it is a string.

Measured on the running map before the change: the canvas was **byte-identical
across 2.4s** with `prefers-reduced-motion: false`, which is the frame budget
latching rather than a motion preference. Both branches are now keyed to
`conduct` steeply enough that the ends part company — tissue 0.18 → 0.81, root
0.6 → 0.35, connection 0.9 → 0.03. Verified by hiding each layer in turn: the
canvas alone and the SVG alone both draw the islands with no cords between them.

**The cost is real and is not hidden.** A reader on a strained surface, or one
who asked for reduced motion, now sees the islands without the strands. OG-01
has everything connected at rest, and on a still frame that stays true of the
graph and is no longer visible in the drawing. The alternative is a cord.

**Open:** the frame budget latched at all on an ordinary desktop. PF-01 sets the
threshold at 85ms against a ~20fps design target, and the still frame is
supposed to be the exception. If it is latching in normal use, the fix belongs
in the drawing's cost rather than in how the still frame is drawn.

### 45c · The pointer over the drawing is a white dot

**Rule:** [MO-04 — No Light Follows the Pointer](design/07-motion-and-input.md)
**Code:** [`src/components/Orrery.tsx`](../src/components/Orrery.tsx) — `DOT_CURSOR`

Asked for directly. `grab`/`grabbing` is an affordance borrowed from dragging a
document, and this surface is tissue.

It is an **OS cursor image**, not a mark in the DOM, which is the only form the
rule allows near the pointer: MO-04 refuses a *field carried with the cursor*,
one that can never fall out of attention. A replaced arrow has no glow, no lag,
no trail and no element — there is nothing to follow anything. Hotspot 8 8, so
the point touched is under the centre of the dot.

**Not applied to prose.** The I-beam stays over the manuscript, because
highlighting is a feature of this reader and a dot would take the one cue that
says text can be selected. If the dot is wanted everywhere, that trade is the
decision to make.

## 47 · ~~Half of every sheet was dead space, and the cut was only half the reason~~ — CLOSED IN CODE

**Rules:** [TY-01](design/06-typography-and-copy.md), [LY-02](design/08-layout-and-chrome.md), [ME-01](design/10-method.md)
**Code:** `src/data/pageModel.ts`, `src/utils/sheetBudget.ts`

Reported from the reader, with screenshots: two continuous paragraphs of one
argument split across two pages, most of both pages empty. It was two separate
faults compounding, and the measurement that separated them is the useful part.

**Fault one — sheets were shared out, not filled.** The splitter divided a
section into `ceil(total / budget)` parts and then split the text EVENLY between
them. A section one character over a sheet became two sheets at half capacity; a
section at 2.1x became three at seventy per cent. Measured at 1440x900:
**median fill 57%**, worst sheets **12%** and **14%** — 376 and 444 characters
alone in a column that holds about 2,100. Replaced with a greedy fill: a sheet
takes paragraphs until the next will not fit, then closes.

**Fault two — the correction loop was eating the rest, and it was mine.** After
the fill was fixed the median got *worse*, not better: **39%**. Isolating the
splitter in Node against a fixed budget showed it was working perfectly —
mid-section sheets filling to a **median 93% of budget** — while the browser
showed 56% of the box. The gap was the runtime budget, driven down by the
observed-overflow correction: it read an over-full sheet as proof the budget was
too generous and shrank the cut, which was true while sheets were shared out and
false once they are filled. A sheet taken to just under budget overflows by a
line as a matter of course; every one of those pulled the budget down and nothing
pushed back. The loop is gone. A sheet that genuinely will not fit is carried by
the horizontal flow, which is what that flow is for.

**Measured, 1440×900, sheets 1–43:**

| | before | after |
| :-- | --: | --: |
| median fill | 57% | **77%** |
| worst sheet | 12% | 12% |
| sheets under 40% | — | 7 of 36 |
| median columns | 1 | 1 |

**The orphan guard, wrong twice before it was right.** Filling greedily leaves
the remainder on the last sheet, which can be three lines under a heading.
Rebalancing the last two evenly — the obvious fix, and what the old splitter did
everywhere — reproduced the reported defect exactly: two half-empty sheets where
there had been one full and one short. Removing it entirely produced a genuine
orphan, measured at **56 characters**, one line at the top of an empty column, 3%
of its box. It now moves a SINGLE paragraph back into the tail: the orphan lifts,
its neighbour stays nearly full, and every earlier sheet is untouched.

**What was left was a trade rather than a bug, and the trade is now gone.**
`PACK` converted measured text density into a character budget and was the dial
between dead space and sideways overflow: at 0.82, median fill 83% and thirteen
sheets of twenty-eight past one column; at 0.70, the overflow nearly gone and the
fill back in the mid-fifties. It settled at 0.76 and the entry closed by naming
the real answer — "budgeting in measured HEIGHT rather than in characters, so a
sheet is filled until the column is full rather than until an estimate says it
should be."

**That is what the cut does now.** `utils/proseMetrics.ts` sets every paragraph
in the book offscreen, once per frame size, in a probe that carries the reading
column's own width and the `.hflow` typesetting that decides where a line
breaks — hyphenation, `text-wrap: pretty`, the orphan and widow counts — and
reads its rendered height back. `SheetMetrics` in `pageModel.ts` makes the
unit the caller's business, so the splitter is the same code in both runtimes:
pixels in the browser, characters in Node, where the static audits import this
module with no viewport and must keep walking the book they always walked.

Two constants died with the estimate and a third was split in three. `PACK` and
`PARA_COST` were both discounts against the same uncertainty, and multiplying
them was most of the dead space: 0.76 × 0.80 ≈ 0.61 of the column, which is the
54% a reader was seeing. `HEADER_ALLOWANCE` was one number for three different
sheets — measured at 1440×900, a chapter opener leaves 326px of a 680px column,
a section start 566px and a continuation 652px, and the constant said 604px for
all three.

**Measured, sheets 1–70 before and all sheets after, at three frames:**

| frame | sheets | median fill | under 40% | prose sheets over one column |
| :-- | --: | --: | --: | --: |
| 1440×900 — before | 70 | 62% | 9 | 2 |
| 1440×900 — after | 59 | **79%** | 7 | **0** |
| 390×844 — after | 73 | **80%** | 5 | **0** |
| 844×390 — after | 112 | 66% | 11 | **0** |

The 844×390 median is the lowest and that is quantisation, not slack: a 260px
column holds two or three paragraphs, so the last one that will not fit costs a
larger share of the sheet. The column count is the number that matters there —
the record above this one has eleven sheets past one column on that frame, and
it is now none.

**What is left is the shape of a book.** Seven of forty-five sheets still come in
under 40%, and every one of them is a section ending part-way down its last
sheet. The orphan guard now borrows backwards until the tail clears a third or
the sheet lending would drop under three fifths, which is a floor rather than a
count — one paragraph was the old bound and it was the wrong one when paragraphs
are short. Two half-empty sheets in a row, the defect that started this entry,
is arithmetically unreachable from those two numbers.


## 49 · The four directional glyphs are straight, and DG-01 is now scoped rather than absolute

**Rule:** [DG-01 — Never a Straight Line](design/01-drawing-grammar.md)
**Code:** [`src/components/organic/Icons.tsx`](../src/components/organic/Icons.tsx),
[`scripts/audits/static/audit-lines.mjs`](../scripts/audits/static/audit-lines.mjs)

Asked for directly: classical thin straight arrows. `ChevronLeft`,
`ChevronRight`, `ArrowLeft` and `ArrowRight` were bowed by 2–4% so they
satisfied the rule while reading as straight rules at chrome scale. On a chevron
that works; on an arrow at 12–20px it does not — the bowed shaft and two bowed
head strokes read as a hand-drawn mark rather than as the flat pointer a control
is expected to carry.

DG-01 says "no exception" and its own scope sentence says **root/neural/light
system** — tissue. These four are pictograms on controls: they grow out of
nothing, carry no conduction, take no tide. So this is recorded as a **scoping
line, not an overturn**. Everything that is tissue stays curved.

**The exemption is by SYMBOL, not by file**, which is the part that matters.
`audit-lines` now tracks which exported symbol each line belongs to and releases
only those four names; a straight stroke anywhere else in `Icons.tsx` still
fails. Verified by adding one to `Search` and watching the audit refuse it. A
whole-file allow-list would have quietly released nineteen other glyphs nobody
asked about.

**FW-02 is untouched:** these heads are two strokes meeting at a point, never a
filled triangle.

**Open:** DG-01's text still reads "there is no exception", which is now false.
The rule needs its scope sentence promoted or an exception clause written, and
that is a design-rules edit rather than a code one.

## 50 · The pointer is a dot, and over anything touchable it inverts

**Rules:** [MO-04 — No Light Follows the Pointer](design/07-motion-and-input.md),
[LY-06](design/08-layout-and-chrome.md), [LY-08](design/08-layout-and-chrome.md)
**Code:** [`src/index.css`](../src/index.css) — `--cursor-dot`, `--cursor-dot-live`

Asked for: no hand anywhere, and on a clickable area the pointer glows up and
inverts — white centre to black, light moving to the ring around it. The
inversion IS the affordance, which is why nothing on the control itself has to
change to say it answers.

**Both are OS cursor images**, which is the only form MO-04 allows near the
pointer: the rule refuses a *field carried with the cursor*, and a swapped
image has no element, no lag, no trail and no animation. A div chasing the mouse
under a blend mode would be the exact thing the rule is about, and would arrive
a frame late on every move besides.

LY-06 refuses a black↔white flip on a **control**, and this is not one — it is
the pointer, and the control it crosses does not change. The glow sits on the
ink, which is the form LY-08 permits.

**One home.** The cursor was set at twenty call sites via Tailwind's
`cursor-pointer`; it is now two custom properties and one selector list, for the
same reason tracking is derived rather than passed (TY-03). Disabled controls
are excluded — they do not answer, so they must not claim to. Measured after:
**zero elements on the map still compute `cursor: pointer`.**

**The I-beam is gone too, and the set is now closed at three.** The trade was
called: stylise the text areas as well. The caret keeps the shape of the thing
it replaces — a bar with serifs, so it still reads as *place an insertion point
here* — but it is built like the rest of the family, dissolving at both ends
instead of stopping on a cap.

| where | mark |
| :-- | :-- |
| the drawing (`.tissue-cursor`) | a bare white dot |
| everything else (`body`, inherited) | the same dot, with a dark edge |
| anything that answers a touch | the black hole with its glow |
| selectable prose and fields | the caret of light |

**TWO THINGS THE LIGHT THEME FORCED.** The map is black in both themes (GR-01)
so its dot can be pure white, but every other surface follows the theme — a
white-only mark is invisible on the light one. So the baseline dot and the caret
both carry a dark edge behind the white core, which is the reason every OS draws
its cursors that way and is not a stylistic choice. The black hole needed
nothing: it already has a dark core and a light ring.

**The baseline sits on `body`, not on `.app-shell`.** `cursor` inherits, and the
overlays render through portals attached to `body` — anchoring it to the app
container would have left every stage and drawer on the system arrow. Measured
after: **of every visible element on a book sheet, none computes a system
cursor** — 115 take the baseline dot, 145 the black hole, 6 the caret. Before
the baseline rule, 199 fell through to the OS arrow.

**Recorded because it cost a cycle:** the caret first rendered as nothing at
all. Its fade is an SVG `mask`, masks are read by LUMINANCE, and the gradient
stops carried only `stop-opacity` — so they defaulted to black, luminance zero,
and masked the whole mark away. The stops need an explicit `stop-color`.

## 51 · Density is emission now — the tissue composites additively

**Rules:** [DG-03 — A Lamp Burns Where the Tissue Is Thick](design/01-drawing-grammar.md),
[DG-02](design/01-drawing-grammar.md), [PF-04](design/09-performance.md)
**Code:** [`src/components/organic/TissueField.tsx`](../src/components/organic/TissueField.tsx)

Asked for from the reference sheet: light that behaves the way it does in
generative dot renders — the form glowing where the dots crowd, dark where they
thin, a halo on a sphere's rim and along a ridge crest.

DG-03 already said this in words — *"the form itself glows, hottest where the
material is thickest or turns toward the viewer, dark where it thins"* — and the
drawing did not do it. Points composited `source-over`, which does not
accumulate, so density carried no light at all; the only emission in the field
was the excitation skirt, which is gated on the reader having touched
something. At rest the tissue was evenly grey wherever it was drawn.

**Additive compositing is the whole mechanism.** Under `lighter` the dots sum, a
crowded region climbs to white on its own, and a sparse one stays a scatter of
separate points. One state change per frame, no pass over the cloud. DG-02
survives it: what accumulates is luminance at a pixel, and the marks are the
same one-pixel points they always were — the glow has no edge because nothing
draws one.

**A failed attempt, recorded so it is not repeated.** The per-point alpha was
first scaled to 0.72 to "leave headroom for the stack". Addition only changes a
pixel where marks land on each other, and at map zoom these are single device
pixels on a sparse arbor, so they rarely do — the scale darkened the whole
organism and bought nothing. Reverted.

**Most of the emission therefore comes from the skirt**, which is wide enough
that neighbouring points genuinely overlap: one pass, faint, over points at
bucket 7 of 16 and above. That threshold is DG-03 as arithmetic, since a point
is only bright because its arbor is dense there — thin tissue emits nothing and
keeps reading as a scatter.

**Measured after, on the map at rest: 16.9ms median, 59.2fps**, against PF-01's
85ms threshold. One pass rather than the excitation bloom's two, because this
one runs at rest and PF-04 is unambiguous about blooming a large animated group.

**Open:** the figures are SVG (`LivingFigure`) and are untouched by this — they
still glow through a filter rather than through density. The map and the figures
are supposed to be one drawing made twice (FW-01), and on this property they
have now diverged.

## 52 · The ruleset is a library now, and it takes the whole sheet

**Rules:** [FW-07 — A Schematic Takes the Whole Sheet](design/05-figures-and-worlds.md),
[LY-05](design/08-layout-and-chrome.md), [LY-02](design/08-layout-and-chrome.md),
[GR-08](design/04-ground-and-colour.md), [DG-02](design/01-drawing-grammar.md)
**Code:** [`src/components/PromptLibrary.tsx`](../src/components/PromptLibrary.tsx),
[`src/data/pageModel.ts`](../src/data/pageModel.ts) — `takesWholeSheet`

Asked for: the rules positioned in boxes, organised as a visual library, laid
out after a bento reference, with an image for every rule and the rules revealed
by flipping a card so the structure never alters.

It was an accordion — ten folders in a column, one open at a time, and opening
one pushed everything below it down the page. The set was never visible as a
set.

**The flip is the architecture, not an effect.** Both faces are in the DOM at
once and the cell is the taller of them, so a flip cannot change a cell's height
and therefore cannot move anything else. Measured: flipping a card moves **zero**
other cells, and the card's own box is identical before and after.

**WHAT WAS COPIED AND WHAT WAS NOT.** The bento proportions are the reference's.
The rounding and the fills are not, and three rules say so: LY-05 (zero rounded
corners, no exception), GR-08 (nothing in the book section is a box), DG-02 (no
flat tone over an area). A cell is therefore a `.membrane` — a light-well whose
ground fades to nothing at its own rim. The hero is LIT rather than inverted:
the reference's hero is a black rectangle, which in the dark theme inverts to a
large white one, and that is the blob DG-02 has had removed four times.

**Ten plates, and no DG-01 exemption.** The icon reference is conics — circles,
ellipses, conic sections, lattices, waves with their nodes marked — so every
stroke is an arc and the rule costs nothing here, unlike the four arrows in
entry 49. Each plate is drawn from what its rule IS: the gate is an
intersection, the lifecycle an orbit, the calendar a lattice.

**FULL SHEET, AND IT NEEDED THREE CHANGES, WHICH IS THE POINT OF THE PREDICATE.**
`BookSpread` paired the sheet, `PageRenderer` padded it as prose and capped its
column at `max-w-3xl` — three independent `type === 'diagram'` tests, three
places to forget, and forgetting any one produces a half-width drawing rather
than an error. They now all ask `takesWholeSheet()`. Measured after: **one sheet
at 1368px of a 1400px viewport**, cards 270px → 369px.

**A grid may not live in a multicol box.** Every other ruleset sheet is
`.hflow`, the book's horizontal multicol, which is how prose overruns a sheet
without the viewport scrolling. A CSS grid inside one is FRAGMENTED across the
columns — the bento's second and third rows were laid out off to the right,
which cuts up the one arrangement whose entire value is being seen at once. The
library takes a plain column and scrolls inside itself, which is the permission
LY-02 already gives. Measured: 3 rows × 3 columns, and the viewport does not
scroll.

**Open:** the card face carries each rule's `subtitle`, which is a full sentence
and fills a cell at this size. A library is scanned, not read — the face may
want the name and the plate only, with the sentence moving to the flip. That is
a content decision, not a layout one.

## 53 · A user walkthrough, and the five things it found

Run as a first-time reader on a cleared store: entry → map → index → chapter →
figure sheet → figure world → ruleset library → phone → light theme. Console and
unhandled rejections were collected throughout: **zero across the whole
journey**. Five real faults, all fixed; several suspected ones disproved, which
are recorded too so nobody re-investigates them.

**1 · One action, one name, said twice.** A figure sheet carried two controls
with the identical accessible name — the invisible overlay on the drawing and
the labelled "See figure" under it. Measured: exactly one duplicated name, count
2. A screen reader read the same offer twice with nothing to separate them and a
keyboard user tabbed a stop that went where the next one went. TY-05 on a
control surface. The visible control keeps the name; the drawing keeps the click
and leaves the accessibility tree (`tabIndex={-1}` before `aria-hidden`, so
nothing focusable is ever hidden).

**2 · The library's hero never rendered.** The sheet passed only the eight
branch ids, so the cell the bento is built around was filtered out and the
arrangement flattened into a uniform grid — the hierarchy the layout exists to
state, silently absent. The global rule now sits on the sheet as the cell the
other eight hang off, which is what its own subtitle already promises.

**3 · THE FLIP REFLOWED THE GRID — a regression on the requirement the grid
exists for.** "The rules are shown on flip of cards so that the structure never
alters." Measured: opening one card took it 164px → 241px, pushed every card
below it down 61–77px and shrank all six by 16px. Eight cells moved on one
click. It had been changed deliberately, to stop any rule needing a scroll —
a real goal, but it bought back the accordion this grid replaced. The height is
fixed again and a long rule scrolls inside its own cell, which is the cost LY-02
already sanctions. Measured after: **zero cells move**.

**4 · The spans did not total twelve.** 3+3+3 / 3+8 / 3+3+3 — every row a
different total, the grid auto-flowing into the gaps, five row-bands for three
intended, and 100px of overflow that put two branches below the fold. Now
4 across with a 6-wide hero holding two rows. Nothing below the fold.

**5 · The library sheet anchored to the wrong page.** Caught by `audit-relations`
on the first run after fix 2: `anchorForPage` addresses a ruleset sheet by its
FIRST rule id, so with the global rule first the library anchored to the sheet
before it and a bookmark would have opened the wrong page. The id goes last; the
grid does not read that order.

**Disproved, so they are not bugs.** Index navigation resolves correctly (an
early failure was a loose test selector, not the app). Esc closes the figure
world (LY-04). No vertical page scroll at 1440×900 or 375×812, and no horizontal
overflow (LY-02). The light theme has zero light-text-on-light-sheet. The only
sub-44px target under a coarse pointer is the keyboard skip link, which is never
a thumb target — `.bud` already carries the 44px box.

## 54 · Second pass: cleanup, responsive sweep, and build readiness

**A feature had been dropped, and copying a branch was handing out half a
prompt.** `PromptComposer` was mounted at HEAD and is not mounted in the working
tree, so the "Compose a Prompt Block" panel is gone from the ruleset sheet. That
alone is a layout decision. What it left behind was not: the library's copy
control took `data.promptText` — the branch on its own — while the ruleset's own
instruction is *"paste the Global Rule into any AI tool's system prompt, then
paste the relevant branch on top of it"*, and this sheet's subtitle says the
branches INHERIT it. A reader taking a branch got the half that does not stand
up alone, with nothing saying so.

The assembly moved to where the reader actually reaches — the copy control on
the branch they are already reading. The global rule's own card copies only
itself, having nothing above it to inherit. The labels now say what they do.
With its one job absorbed, `PromptComposer` is genuinely dead and removed, along
with `PromptFolders` (superseded by the bento).

**RESPONSIVE SWEEP — five widths, one content-heavy sheet, all clean.**
322, 375, 768, 1024, 1920. At every one: no vertical page scroll (LY-02), no
horizontal overflow, nothing clipped, no type size outside 9/12/18 (TY-02), no
sub-44px touch target under a coarse pointer (MO-08). **Zero console errors or
unhandled rejections across the whole journey.**

One false positive is recorded so it is not chased again: a naive scan reports
16px type on the sheet. Those are layout wrappers and icon holders carrying no
text of their own — the default size on an element that renders no text. Only
leaves with their own text nodes count.

**MEASURED FRAME COST.** Ruleset library, 9 animated glyphs and 75 running
animations: **16.7ms median, 59.9fps.** The map at 1920x1080, 17,573 SVG nodes
and 260 animations: **45.4ms median, 22fps**, p90 57.5ms — which is PF-01's
intended ~20fps steady state and well inside its 85ms threshold. The budget
latching seen in entry 45b was the measurement harness adding to the frame, not
the drawing.

**BUILD IS EXPORT-READY.** Clean build in 4.18s, no warnings. The service worker
stamps (32 precached entries) and injects modulepreload for the two front-door
chunks. Front door is ~146 kB gzip (html + css + vendor-react + index), and
every figure, widget and stage is its own lazy chunk.

`dist/` is 30 MB, and 28 MB of that is three audio files — but the service
worker skips `/audio/` explicitly, so **an offline install costs 1.0 MB across
32 files**. The ambience streams; the dossier is what goes offline.

**LEFT ALONE, DELIBERATELY: three unreferenced exports that are FEATURES, not
leftovers.** `pageForTool` (its comment says the index needs it to open a tool
at its own sheet), and `exportReaderState` / `importReaderState` (backup and
restore of a reader's bookmarks and highlights). Nothing calls any of them.
Unlike the composer these have no replacement, so deleting them would remove
capability rather than tidy a duplicate — and a bundler tree-shakes them out
anyway, so they cost nothing shipped. They want wiring up or an explicit
decision to drop them; that is not a call a cleanup pass gets to make.

## 55 · The phone gets the map, and the reader gets a way to report a fault

**LY-01'S 700px THRESHOLD IS NOW 340, AND THAT IS A RULE CHANGE.** The rule says
"below 700px, a legible stacked spine", which excluded every phone held upright
— so the one surface the whole dossier is organised around was the one thing a
phone reader never saw. Asked for directly: the map must be visible there too.

The measured finding behind 700 is still true and still honoured, but it is
about the SHORT AXIS, not width: a phone on its side has 390px of height and
cannot hold the drawing at any zoom. A phone upright has 812px and can — once
the resting view stops being fitted to the wrong axis.

**The home view is now shaped to the frame (`homeFor`).** `preserveAspectRatio`
fits by the tighter axis, so a 1300x1092 window in a 375x812 phone drew the
organism 375 wide and 315 tall — a band with 248px of black above and below.
On a frame taller than the organism the window now takes the frame's own aspect
and the organism's full height, centred on the core, floored at half the width
so it never crops past reading as one organism. Measured at 375x812: viewBox
`175 -126 650 1092`, drawing filling 100% of the frame.

**A resize re-frames, and forgetting that was a bug in this change.** The view
is a ref that does not follow a recomputed HOME, so rotating to landscape or
widening a window kept the tall crop — measured at 1440x900 still holding the
phone's `175 -126 650 1092`, half an organism with black either side. It now
glides to the new home on a frame change, on the app's one curve.

**The gesture hint leaves the phone.** With the map there, that line had an
eleven-character column between the corner controls and broke one word per line
down the middle of the drawing. It describes a pointer and an Esc key, neither
of which a touch reader has, so it shows where those exist.

### The bug reporter — attempted, aborted, removed

A reader-initiated report posting to a Supabase table was built and then taken
out at the author's request: the connection was never made, and the feature will
be reached by email instead. Removed whole — `src/data/bugReport.ts`, the
settings panel, the env names, the `.env.example` block, the audit allow-list
entry — so nothing is left half-wired and the settings drawer ends where it did
before.

**Worth keeping from it, for whoever builds the email version.** The shape was
right and the constraints have not changed. This app promises no telemetry, so a
reporter must be opt-in, inert until invoked, and must name where the report is
going BEFORE the reader acts — the same treatment the causal instrument already
gets. It must also not render at all when it has nowhere to send, because a
control that cannot do its job must not offer to. An email route sidesteps the
row-level-security question a public anon key creates, which was the fiddly part
rather than the part that failed.

**Open, and it outlives the attempt:** README.md and CLAUDE.md both say "no
telemetry" flatly. That is true today and would still be true of a
reader-initiated report, but a flat claim standing beside any network call wants
the same qualifier the causal instrument already carries.

## 56 · Export pass: the face switcher, a centring bug, and the first figure over budget

**TWO THIRDS OF THE FINAL FIGURE WAS UNREACHABLE ON A NARROW SHEET, AND THE
CAUSE WAS NOT THE SELECTOR.** Two Trajectories carries three faces and only the
resting one could be reached below ~600px. The selector was `absolute -top-1`,
which is fine over a fixed-ratio SVG and wrong the moment FW-06 swaps that for
the stacked spine — but moving it into flow only changed the number: measured at
540px the three buttons sat at y = -35, -45, -45.

The real fault was in `FigureStage`: `flex items-center` does not clip a child
taller than its box, it PUSHES — so the top of a tall figure goes above the
frame with no way to scroll back to it. `items-start` with `my-auto` on the
child is the pair that behaves: auto margins still centre a short figure, a tall
one starts at the top and scrolls inside its own column (LY-02). Measured after:
all three faces at y 68–78, reachable; desktop unchanged, drawing still centred.

This is a general fault, not one figure's. Any figure that outgrows the stage
had the same silent loss.

**THE FIRST FIGURE TO GO OVER PF-01, AND IT WAS THE NEW ONE.** No frame rate had
been taken on the figure stage — recorded as open twice and never closed.
Measured at 1440x900:

  The Metric Lotus       3,338 nodes     65.8ms     within budget
  Two Trajectories       4,609 nodes    105.4ms     OVER the 85ms threshold

Sixteen cells on one face, every one growing a default arbor at r*3.8. The
stations are small marks on a course rather than cells anyone studies, so they
take a smaller arbor and fewer arms, and the name row smaller still; the origin
keeps its full arbor because the tide rolls from it. Measured after: **3,524
nodes, 72.8ms** — a 24% cut in elements and 31% in frame time, and now in line
with the next-heaviest figure.

**Two design rules were stating things that had stopped being true**, which is
worse than a gap because a rule is read as fact. DG-01 said "there is no
exception" after four interface arrows were exempted; it now states the scope
(the drawing) and names the exemption, including that it is enforced by symbol
rather than by file. MO-03 listed ambient breathing at "~18s" after the cycle
was unified at 19.7s. Both corrected against the code.

## 57 · Decisions taken, and the three things they closed

The author answered the export list. Recorded here because several of these
close entries above rather than adding new ones.

**The figure stays narrower than its chapter (closes 47).** §5.5 argues that
anti-engagement metrics compound; the model contains no compounding term and
will not get one. The decision is that the figure says less than the chapter
rather than that the model is tuned until it agrees — which is the position the
model was built to hold in the first place.

**The corpus cap is enforced, not remembered (closes 46).** "The rules must have
meaning." `audit-copy` now declares its accepted corpora as a list and fails the
build above two, naming why: a third makes "which corpus is this in?" a question
with no principled answer, and turns a check on INVENTION into a check on
LOCATION. Verified both ways — passes at two, refuses three.

**The manuscript is not touched (closes the other half of 46).** Nothing will be
added to the sheets to announce which corpus they came from. The `TRENDWATCH`
numbering stays the only signal, and that is deliberate.

**The library card face stays as it is.** Ignored by decision.

### The figures now glow the way the map does (closes 51)

FW-01 has the figures and the map as one drawing made twice, and on light they
had come apart: the map was rebuilt so density IS emission — its points
composite additively, so a crowded arbor climbs to white and a sparse one stays
a scatter — while the figures composited normally, where a hundred overlapping
strands look much like three.

`mix-blend-mode: screen` on the course group is the same arithmetic in SVG that
`lighter` is on the canvas. One CSS property, no new elements, which is what
PF-04 requires of anything laid over a big animated group. Measured on the
Metric Lotus: **65.8ms → 73.8ms**, inside PF-01's 85ms threshold.

### Dead capability removed, and the argument for each

`pageForTool` is superseded: the index opens instruments directly now rather
than navigating to the sheet one lives on.

`buildReaderState` / `exportReaderState` / `ImportResult` / `importReaderState`
were complete, correct and **unreachable** — a dated JSON download and a
merge-never-replace import that no control anywhere offered. Removed rather than
left standing, and the choice is arguable: unreachable backup is worse than no
backup, because to anyone reading that file it looks as though the marks are
already safe, and the file says plainly two paragraphs earlier that localStorage
is not durable. If it returns it needs a control in the settings drawer beside
"Preferences saved locally", not just the functions; the merge semantics were
right and are worth recovering from git rather than rewriting.

### The search index was doing its work at startup, and rebuilding from stale data

Both halves of one fault. `SearchModal` and the index drawer are statically
imported, so `buildDocs()` walked all 56 sheets, tokenised every field and built
a vocabulary **before the first paint**, for every reader, whether or not they
ever searched — and most never do.

**And the documents were a `const`.** The repagination subscription rebuilt the
postings out of a document set that could never change, so after a re-cut the
index described the book as it had been cut at startup and a hit resolved to the
sheet a phrase used to sit on. The three are now built on first use and
invalidated together, which is what makes that subscription mean what it says.
Verified: search returns real hits, the query itself costs ~10ms, and it still
returns correct hits after a resize forces a re-cut.

**Open:** the front door is ~146 kB gzip and the main chunk is 70 kB of it,
nearly all manuscript prose, which is the one thing that cannot be deferred —
the book has to be paginated before anything can be drawn.

## 58 · The three trendwatch figures stand up on a narrow screen, and the previews stopped being clipped

**Rules:** [FW-06 — Never a Shrunken Figure, and Never a List Instead of One](design/05-figures-and-worlds.md),
[LY-02 — No Page Scrolling](design/08-layout-and-chrome.md),
[TY-08 — Labels Have a Collision Budget](design/06-typography-and-copy.md),
[ME-01 — Verify by Measurement, Not by Eye](design/10-method.md)
**Code:** [`src/components/figures/LivingFigure.tsx`](../src/components/figures/LivingFigure.tsx) — `FigureLayout`, `fit`, `floorPx`;
[`AttentionIntervalDiagram`](../src/components/diagrams/AttentionIntervalDiagram.tsx),
[`WithdrawalDiagram`](../src/components/diagrams/WithdrawalDiagram.tsx),
[`TwoTrajectoriesDiagram`](../src/components/diagrams/TwoTrajectoriesDiagram.tsx)

The side-scroll that replaced the stacked spine was recorded as the honest answer
and not the good one, and this closes that. A figure may now declare a
`portrait` layout and is DRAWN below the 600px floor instead of scrolled. The
three trendwatch figures carry one — five layouts, because the final figure has
three faces and each stands up its own way.

**THE RE-LAYOUT COSTS NOTHING, WHICH IS THE ONE THING THAT NEEDED CHECKING
FIRST.** A portrait form is coordinates and nothing else, so the element count
is identical: measured 1,304 SVG elements for the interval figure in both forms,
at 380px and at 900px. Nothing here goes near PF-01.

**THE FIRST TWO STACKINGS DREW COURSES THAT ARE IN NONE OF THE DATA**, and this
is the finding worth carrying forward. `LivingFigure` joins every cell to its
two nearest neighbours whether the figure asked for it or not, so a narrow
layout is not a matter of fitting cells into a tall box — the spacing IS the
grouping. The withdrawal figure at a 60-unit step within a band and 96 between
them read as one descending series, 29 → 42 → 59 → 46 → 40 → 37, which is
exactly the claim that figure's own note refuses to make. Opening the bands to
160 fixed the readings and not the names: each name sat closer to its
neighbouring names than to its own two points, so the fill wired name to name to
name down the left margin and drew a fourth course.

The gate is a count, not a look: **every cell's two nearest neighbours must be in
its own group.** Measured after, against the wide forms that ship —

    withdrawal, group = band          wide 2 out-of-group    portrait 1
    two trajectories, structure       wide 14                portrait 5
    two trajectories, model           wide 13                portrait 7
    two trajectories, assumptions     wide 0                 portrait 0

— so each narrow layout groups at least as tightly as the wide one it stands in
for. The withdrawal figure's height is set by that count rather than by taste:
240 units between bands is what it takes for INTEREST's name to be nearer its
own readings than the names either side of it, by 26 units at the tightest.

**Labels: `label-audit` reports the same result in both forms** — 21 texts, six
collisions, zero frame overruns, and all six collisions are the glyph and the
name inside one cell, which is what `nameY` deliberately does. The portrait adds
none.

**A third of every schematic page was hanging off the sheet, and it had nothing
to do with the portrait.** The inert page preview took the same 600px floor as
the opened figure: measured on the TRENDWATCH I sheet at 375px, a 600px drawing
in a 380px box, so a reader saw two of three cells with nothing to say there was
a third — on a sheet LY-02 says does not scroll. The floor never applied to the
preview in the first place, because MIN_DRAWN_PX protects the names and the
preview renders none (`!inert && n.label`, and that predates this). Removed;
the preview now fits its box whole at any width.

Measured in the app at 375px: every face of the final figure drawn whole with no
horizontal scroll, the face selector reachable at the top of the stage, and only
the model face scrolling vertically at all, by 18px. At 280px — below what any
mainstream phone reports — the withdrawal figure scrolls 14px sideways against
the 335px it would have before, and its names render at 8px against the 6.4px
the floor was set to protect.

**Closed by §59:** the other six were asked for next and all nine now carry a
portrait form.


## 59 · The Production Ruleset's three sheets are one kind of surface now

**Rules:** [LY-02](design/08-layout-and-chrome.md), [TY-04](design/06-typography-and-copy.md),
[TY-05](design/06-typography-and-copy.md), [FW-07](design/05-figures-and-worlds.md)
**Code:** [`src/components/PageRenderer.tsx`](../src/components/PageRenderer.tsx),
[`src/data/pageModel.ts`](../src/data/pageModel.ts)

Entry 52 gave the branch library the whole sheet and a plain column, on the
argument that a bento cut into multicolumn fragments is the one arrangement
whose whole value is being seen at once. The other two ruleset sheets were left
as `.hflow` in half a spread, and both of them were the same failure wearing
different clothes.

**The verification gate was drawn as a rule card, and it is not a rule.** The
eight branches are rules to read; this sheet is §3.4's five-question standard,
and a reader is on it holding work to check. Drawn as a card it put the five
questions inside a "System Prompt" well at 70% opacity under a title the sheet
had already said in full — the page heading and the card heading were the same
string on one frame, which is TY-05 exactly — with the copy affordance a 9px
label in the corner of the well and the instrument that runs the questions a
lone control above it. Measured at half a spread: **4.46 columns**. Finishing a
five-item checklist took four sideways swipes and the set was never on screen at
once.

It is now the gate itself: the two ways to run it — the instrument and the
clipboard — in one row at the head, both lit, neither a footnote to the other;
the prompt's own opening sentence as the lead, at the body step and at full
light; the five questions under it in a numbered grid with the numeral in the
label track. Nothing is drawn around them. **Measured after: one column, no
scroll at 1440×900 and none at 390×844.**

TY-04 is the part worth recording. The sheet needed a sentence saying what the
gate is *for* — the reader's report was that nothing said this is something you
run after producing work — and no copy may be written for this app. The sentence
already existed: it is the first line of `promptText`, and it had been set at
70% opacity under a heading, inside a well that read as a code block. It was
found rather than composed. `audit-copy` confirms it: 53 rendered sentences, no
new invented copy.

**The overview sheet ran 2.09 columns because it was a column.** It carries the
note on how the blocks are used and the Global Rule those blocks inherit, and
stacked they did not fit — a reader finished the how-to and swiped sideways to
reach the block it describes. Nothing on it can be cut and nothing on it can be
split, so it was given the width instead: the whole spread, three columns, the
note in one and the rule in two. Two thirds to the rule because that is where
the height is; split evenly the rule still ran a third of a column past the
sheet while the note left a third of its own empty. **Measured after: 1.08 at
1440×900, so a sheet that all but fits, against 2.09 columns of sideways
travel.** Below `lg` it stacks and scrolls inside its own column, which is what
LY-02 permits and what a phone does anyway.

`takesWholeSheet` is where all three now agree, which is the point of that
predicate: `BookSpread` reads it to decide pairing and `PageRenderer` reads it
for both the sheet's padding and its measure, and those were three independent
tests before entry 52 put them in one place.

**Open:** the overview's subtitle still ends "& Governed Sources", and no
governed sources are on that sheet — they are the bibliography, two sheets
later. That is manuscript text and TY-04 makes it not ours to edit.


## 60 · A phone journey, and the frozen camera it found

**Rules:** [LY-02](design/08-layout-and-chrome.md), [LY-03](design/08-layout-and-chrome.md),
[ME-01](design/10-method.md), [PF-03](design/09-performance.md)
**Code:** [`src/components/Orrery.tsx`](../src/components/Orrery.tsx),
[`src/components/RulesetOverview.tsx`](../src/components/RulesetOverview.tsx)

Driven end to end at 375×812 with touch emulation on — `pointer: coarse`, five
touch points — as a reader would: front door, map, pinch, dive into a chapter,
swipe through sheets, every drawer, a figure world, an instrument, the ruleset
sheets, and back to the map.

**The map's camera was dead, and one line of cleanup did it.** Pinch, drag and
wheel all moved nothing. Calling `onWheel` directly on the live component
produced zero mutations of `viewBox` in 1.5s, which ruled out event delivery and
pointed at the one function they share. `glide()` refuses to start a second
glide by testing `rafRef.current !== null` — and the unmount cleanup cancelled
the pending frame while leaving the handle in the ref. A cancelled frame was
then indistinguishable from one in flight, so every later glide returned
immediately and the camera never moved again: pan, pinch, wheel, double-tap, the
dive into a chapter and the reset control all go through that function and all
died together. In development it is reached on every load, because StrictMode
mounts, cleans up and mounts again on the same instance — the ref survives, the
frame does not. The cleanup now clears the step state with it. Measured after:
viewBox width 650 → 250 on a spread, 250 → 727 on a pinch, pan moving the frame,
and all of it still working after a map → reader → figure → instrument → map
round trip.

**What the journey found nothing wrong with.** No vertical or horizontal
viewport scroll on any surface. Swipe left and right turn the page; a mostly
vertical drag correctly does not. All four drawers open, carry no undersized
control, clip no text and close on Escape. The figure world opens and closes on
a right swipe. The instrument opens and closes. Every control in the reader
clears 44px.

**The one target that does not: the map's cells, at ~35px.** The nodes carry
24–30 *user-unit* hit radii, and at the phone's resting framing (viewBox 650
wide in 375px) that is about 35px against the 44px this app adopts for coarse
pointers in `index.css`. It is not fixed here and the reason is measured:
sibling section markers cluster within a few user units of each other, so
enlarging the radii would start resolving touches to the wrong cell — a worse
failure than a small target. The mitigation is the pinch that now works.

**The ruleset overview needed the library's phone shape.** Stacked at natural
height its five cells came to **3.31 screens** at 375×812, so a reader scrolled
past the whole Global Rule to reach the sources. Below 768px it is now the list
the branch library already becomes at the same threshold and for the same
reason: every cell present as its name, one open under the name you touched.
Measured after: **1.30**, one body open at a time, every name a 44px row.

## 59 · The other six figures stand up too, and two of them cost something

**Rules:** [FW-06 — Never a Shrunken Figure, and Never a List Instead of One](design/05-figures-and-worlds.md),
[FW-10 — Every Cell in an Observer-Relative Figure Is a Centre](design/05-figures-and-worlds.md),
[DG-09](design/01-drawing-grammar.md), [TY-08](design/06-typography-and-copy.md),
[ME-01](design/10-method.md)
**Code:** all nine files under [`src/components/diagrams/`](../src/components/diagrams/),
and `FigureLayout` in [`LivingFigure.tsx`](../src/components/figures/LivingFigure.tsx)

Closes the open note on §58. Every figure in the book is now drawn whole below
the 600px floor rather than scrolled sideways. Measured in the app at 375px —
**nine of nine portrait, zero horizontal scroll on any of them**, and the sheets
range 360×520 to 360×700.

**THE LAYOUT HAD TO LEARN TO CARRY ORNAMENT.** `FigureLayout` took nodes and
edges, which is enough for a figure whose ornament is sized to its tissue and
wrong for one whose ornament is sized to its FRAME. The bait plane draws its own
axes and four poles; FIG 0.1 draws a particle field and a formula. Both are
handed to `LivingFigure` as finished JSX by a caller that cannot know which
rectangle is about to be drawn — so `backdrop`, `overlay` and `rimStyle` now
belong to the layout that declares the frame, and fall back to the wide ones
when a portrait does not override them.

**THE HARDEST TWO WERE HARD FOR OPPOSITE REASONS.**

*The bait taxonomy is a coordinate system*, so its portrait is the same plane in
a taller rectangle: valence compressed 0.42, arousal stretched 1.9, both about
the origin, every term still where it was on the plane and the empty low-arousal
half still holding its share of the sheet. What it cost is the poles.
UNDESIRABLE EMOTION and DESIRABLE EMOTION need about 330 units between them and
the sheet is 360 with an axis running through it, so they sit on two rows either
side of the axis rather than one. That is a real loss — on the wide sheet the
pair reads as one horizontal scale — and both alternatives were worse: shrinking
them makes the frame of the taxonomy quieter than the five terms it contains,
which is the fault their own note records fixing once already.

*FIG 0.1 needed no rearranging at all and two goes at the space.* "The sheet is
wider than it is tall; the space is not" was already in the file, so turning the
sheet turns the squash and nothing about the model moves. **The first attempt
drew graph paper.** At kx 0.72 / ky 0.92 — which is what a 360×700 drawing
region asks for — the whole lattice fitted inside the frame, rings and rim and
all, and a complete polar grid is a polar grid. A lattice only reads as a MEDIUM
while the frame is cutting it: in the wide form the horizon at 520 comes to 676
against a half-width of 400, so the sheet shows a band through the middle of a
very wide ellipse. 0.52 / 1.02 restores the cut and makes the inner rings long
ellipses rather than near-circles. **And the field ended in a ruled horizontal
edge**, which DG-09 forbids outright — the wide form never had to think about it
because its cull falls inside the opaque part of the plate under the sum. The
cull now sits under the plate on both sheets.

The sum itself is the one thing that genuinely does not fit: twenty-six
characters at 21 units against 360. It breaks before a binary operator, and the
four glosses descend in term order, each still centred on the column its term
stands in rather than sitting directly under it. Recorded as a cost, not a
solution.

**LABELS: IDENTICAL IN BOTH FORMS, ON ALL NINE.** Swept at 380px and at 900px —
same text count, same collision count, zero frame overruns either way, and every
collision without exception is the glyph and the name inside one cell, which is
what `nameY` deliberately does:

    figure              texts   collisions (all in-cell)   overruns
    scale-mismatch         10            0                    0
    media-universe         12            3                    0
    bait-taxonomy          19            6                    0
    fragility-index         6            0                    0
    causal-taxonomy         4            4                    0
    neuro-aesthetic        18            9                    0
    attention-interval      6            3                    0
    news-withdrawal        15            6                    0
    two-trajectories        8            0                    0

**TWO FIGURES INVENT MORE TISSUE THAN THEIR WIDE FORM, AND IT IS RECORDED
RATHER THAN TUNED AWAY.** Counting the links the proximity fill adds that no
figure declared:

    fragility-index      wide 2   portrait 4
    neuro-aesthetic      wide 8   portrait 6
    news-withdrawal      wide 5   portrait 4
    causal-taxonomy      wide 4   portrait 4
    media-universe       wide 3   portrait 3
    scale-mismatch       wide 9   portrait 9
    attention-interval   wide 1   portrait 1
    bait-taxonomy        wide 2   portrait 3

The fragility index gains two because in a narrow corridor the four fractures
are nearer each other than the landlord and tenant they hang between, where in a
wide row the middle two sit close to both. The four are peers — 2.3 argues one
tenancy, not four causes — so four faint links among them says "these are a set"
rather than making a claim, and the weighted fibres that carry the argument are
unchanged.

The bait taxonomy gains two links between terms two apart in the valence chain,
and **swept across every scale factor from 0.36/1.0 to 0.48/1.9 the result never
moved** — so it is not a tuning error, it is what compressing valence against
arousal does to which cells are nearest. Holding it exactly would mean kx = ky,
which flattens the arousal axis to a sliver and makes the vertical half of a
coordinate system meaningless. The portrait also drops one link the wide form
invents, from the joy term to the unharvested cell, which is the one cell meant
to be reached only by the faint fibre from the hook.

**Open:** nothing new. The nearest-neighbour count is a good gate and it is
still run by hand — it belongs in `scripts/audits/runtime/` beside the label
audit, denominated the way that one is.


## 61 · The figures are emitters and filaments; the organism stays on the map

**Rules:** [OG-01](design/02-organism-and-graph.md), [OG-06](design/02-organism-and-graph.md),
[DG-01](design/01-drawing-grammar.md), [DG-02](design/01-drawing-grammar.md),
[DG-06](design/01-drawing-grammar.md)
**Code:** [`src/components/figures/LivingFigure.tsx`](../src/components/figures/LivingFigure.tsx)

Asked for against a reference image: no neurones in the figures, only particle
light emitters, and **DG-01 kept** rather than scoped a second time.

**WHICH FIGURES, SETTLED IN TWO PASSES.** It went to all nine first, and that
was wrong in both directions at once: the trend reports needed the lattice and
the six argument figures had lost the thing that made them arguments. Six were
named back — the scale mismatch, the postures, the bait taxonomy, the fragility
index, the causal taxonomy and the withdrawal — and the Metric Lotus went with
them, because it is a chapter schematic rather than a reading and was never in
the original request. **The emitter grammar is now opt-in per figure**
(`grammar="emitter"` on `LivingFigure`) and the organism is the default, so the
two that keep it are the interval and the two trajectories: the two figures
whose subject is a measured series.

That is the useful part of the entry. A drawing grammar is a property of what a
figure IS, not of the app it sits in — an argument about living structure wants
tissue and a reading wants a lattice — and a switch set globally cannot express
that. Set per figure it can, and the default protects the six that should never
have moved.

**Three things make a figure node a neurone, and an emitter figure has none of them.** The
dendritic field coning out around it, the vortex of strands turning inside it,
and the varicosities strung along every edge. What replaces the first two is
what was already underneath them — the glow the tide passes through and the
core — plus an eleven-point seeded scatter thinning outward, so the emitter has
a grain instead of a rim and reads as light coming off a point rather than a
disc laid on the ground. DG-02 is not bent to allow it: *the only fills in the
system are the light sources*, and a light source is now exactly what a figure
node is.

**The bow is 2%, and that is DG-01 at the floor its own text sets.** The rule
says "at 12–20px the 2–4% bow that satisfies the rule", so the figures now run
at 1.4–2.6% of span against the map's 8–18%. Straight at a glance, visibly drawn
on approach, and `audit-lines` has nothing to argue with — the alternative on
the table was a second scoped exemption in the rule that has been the hardest of
the sixty-nine to hold, and it was not taken.

**It is much less drawing, which was not the goal but is the check.** An arbor
is five to seven arms to depth three and a vortex seventeen to thirty strands,
against eleven points. Measured in the figure world at 1280×860: the
Village-Scale figure draws in a page of 4,204 SVG elements, the Interval figure
**91**, the Causal Taxonomy **1,032**. DG-06's instruction is to count before
moving a density constant, and eleven is that constant.

**What did not change.** The map, the chapter openers, the ruleset plates and
the six argument figures still draw the organism — `ChapterOpener` draws one axon at roughly a hundred
times map scale and is untouched, which is why a chapter still opens on a cell.
One process per connection, taper carrying direction, the zero-at-both-ends
envelope and the relay stations all survive the crossing; they were never the
anatomy, only the grammar.

**Open.** Label placement still reserves room for an arbor that no longer draws
— `reachOf()` returns `arborR ?? r * 3.8` and the collision pass clears it — so
names sit further from their emitters than they now need to. Harmless (it errs
toward space, which TY-08 wants) but it is dead reasoning, and tightening it
would let the denser figures breathe at smaller sizes.


## 62 · The two-trajectories figure gets a plane, and GR-01 is scoped for the first time

**Rules:** [GR-01](design/04-ground-and-colour.md), [DG-01](design/01-drawing-grammar.md),
[TY-06](design/06-typography-and-copy.md), [TY-07](design/06-typography-and-copy.md)
**Code:** [`src/components/diagrams/TwoTrajectoriesDiagram.tsx`](../src/components/diagrams/TwoTrajectoriesDiagram.tsx),
[`scripts/audits/static/audit-lines.mjs`](../scripts/audits/static/audit-lines.mjs)

Reported twice, in the plainest possible terms: *the graph is not clear*. Asked
for: a grid behind the scheme, the dimension names always visible on it, the
courses positioned on a Cartesian plane, and **the grid lines straight**.

**This reverses two rules, and both reversals are scoped rather than general.**

GR-01 does not merely omit a grid, it argues against one: *"nothing is drawn on
that ground: no grid, no rule, no field, no ticks, no technical backdrop"* — and
records that the map's grid was dimmed to 0.14 and then removed outright, on the
finding that a rectilinear field behind a thing containing no straight lines
reads as *diagram* rather than as organism. The figures inherited that removal.
It is also what the rule says makes **Never a Straight Line** absolute: *"the
exception it used to carve out was the backdrop grid, and there is no longer a
backdrop to except."*

The argument that carried it: this is the one drawing in the book whose subject
is a COORDINATE. Five named dimensions against a divergence, and a divergence
with nothing to measure it against is a picture of two lines drifting apart. The
plane belongs to this figure and the other eight keep the empty ground GR-01 won
for them.

DG-01 is scoped the same way and by the same mechanism the four directional
arrows already use: `audit-lines` exempts ONE exported symbol, `CartesianPlane`,
so every other mark in the file — including the two courses that cross the
plane — is still held to the rule and still fails the build if it goes straight.
A datum a reader measures a position against may not bow; a wobbling rule turns
the measurement into a guess, which is the opposite of what a plane is for.

**TY-06 gives way to the axis.** The dimension names were at `labelAtRest` 0.54,
which is a taxonomy's resting weight under TY-07's exemption. They now label the
columns of a plane, and a coordinate whose axis you must touch to read is a
coordinate nobody can use — so they sit at 0.86, always on.

**Measured after, 1200×843:** 24 straight rules in the figure and none anywhere
else in the app; the five axis titles legible at rest; `audit-lines` clean.

**NOT DONE, and it is the half that was asked for most clearly.** The tap-to-
explore pathway mechanic is not built. Touching a dimension already opens its
two authored outcomes — `STRUCTURAL` carries an `extractive` and an
`antifragile` reading for each of the five — so the branch data exists and needs
no invention (TY-04 is not in the way). What does not exist is the mechanic: a
pressed dimension lighting the two courses forward from it, and the reader
walking a route. That is the next piece of work on this figure.


## 63 · The manuscript was set at maximum contrast, which is glare rather than legibility

**Rules:** [TY-01](design/06-typography-and-copy.md), [GR-04](design/04-ground-and-colour.md),
[ME-01](design/10-method.md)
**Code:** [`src/index.css`](../src/index.css), [`src/components/PageRenderer.tsx`](../src/components/PageRenderer.tsx)

Reported from the reader: the body text is very difficult to read, too bright,
and it should be *thinner*.

**Measured before anything was changed.** On a manuscript sheet at 1280×860 the
prose rendered at pure white, alpha **1.000**, against the black ground — a
contrast ratio of **21:1**, which is the maximum a screen can produce. WCAG asks
4.5:1 for body text and 7:1 for AAA. The figure was three times past the
strictest requirement, and on a dark ground everything past that point stops
buying legibility and starts producing glare. The reader's complaint was exactly
right and the cause was the opposite of what "hard to read" usually means.

**It is opacity and not weight, and TY-01 decides that rather than taste.** The
rule bans any numeric weight other than 300 outright — 300 is already the
lightest the app declares — so *thinner* cannot be spelled with a font weight
here at all. The same rule names the instrument that is available: *"Contrast
comes from size, letter-spacing, opacity and light. Never from weight."*
Lowering the light is what the rest of the app already does to say how loud a
thing is (`.bud` rests at 0.70, a label at 0.45, a lit control at 1).

**0.85 is an existing step, not a new one.** The ladder actually in use across
`src/` is 0.45 at 64 call sites and 0.70 at 79, with 0.85 already present — and
a scale carrying a value that is nearly but not exactly a step is a scale nobody
can check, which is the argument `.bud`'s own note makes about 0.68 against
0.70.

**Measured after: 14.8:1**, still more than double AAA, with the prose sitting
clearly above the 0.70 secondary text and below the titles at 1.

**One class, because this is the value most likely to drift.** `.reading` in
`index.css` rather than an opacity utility repeated at every call site: a body
paragraph written next year inherits the reading weight by naming what it is.
Applied to the manuscript paragraphs and pull quotes, the trendwatch bodies, the
references and the ruleset's how-to — every long-form reading surface.

**Checked at the same time, all clean:** type consistency across every sheet at
375, 768 and 1280 — only 9/12/18px, only weight 300, only IBM Plex Sans and
Newsreader, tracking only on uppercase; zero responsiveness faults; zero blank
sheets; zero console errors or React warnings over the full book at all three
widths.

## 64 · `.glyph-alive` animates children on `transform-box: fill-box`, which PF-02 bans outright

**Rule:** [PF-02 — transform-box: view-box, Never fill-box](design/09-performance.md)
**Code:** [`src/index.css:1985`](../src/index.css)

`.glyph-alive svg > *` sets `transform-box: fill-box` and then runs a 40s
infinite `glyph-shift-*` transform on every child. PF-02 is not a preference —
it records `fill-box` collapsing the dendrite groups from 47fps to **1fps** with
two-second frames, because the browser re-measures each group's bounding box
every frame.

**Why it was not simply changed.** The rule's own remedy is `view-box` *plus an
explicit `transform-origin` in user units*, and that second half is what this
call site cannot express. `transform-origin: 50% 50%` under `fill-box` means
"the centre of each child's own box", so every glyph part scales and drifts
about itself; under `view-box` the same declaration means "the centre of the
whole SVG", and all parts would swing about one shared point. That is a
different animation, so the change is not free and is not a refactor — it needs
a per-element origin in user units, which CSS alone cannot derive here.

**Why it is not urgent.** The cost scales with the number of animated children,
and these are icon glyphs: measured on the map and on the index drawer,
`.glyph-alive` is present **0** times, so it contributes nothing on the two
heaviest surfaces. It is bounded, not absent — it belongs here so the violation
is on the record rather than sitting unremarked in the stylesheet next to two
correct `view-box` uses that cite the rule by name.

## 65 · The talk deck carries the page past the frame, and DG-02 forbids a filled area

**Rule set aside:** [DG-02 — Only Lines. Nothing Is Ever a Filled Area](design/01-drawing-grammar.md)
**Code:** [`docs/talk.html`](talk.html) — the `#bleed` block and `paintBleed()`

The deck is a 16:9 frame letterboxed into whatever it is shown on, and on any
screen that is not 16:9 the surround was pure black. On thirteen of the
seventeen sheets that is invisible: sampling the outer 3px of every page, those
thirteen sit at exactly `rgb(0,0,0)` with a standard deviation of 0, so the bar
and the sheet are the same colour and there is no seam to find.

The other four are photographs that run to their own edges — sheet 3
`rgb(177,185,187)`, sheet 5 `rgb(189,198,203)`, sheet 9 `rgb(174,187,198)`,
sheet 12 `rgb(37,54,43)` — and sheet 6 has something bright leaving its right
edge (sd 56.2). On those the letterbox cut a hard line across a picture.

**The frame could not simply grow.** Every coordinate in the live layer is a
percentage of it, and the pages have no crop budget to spend: content comes
within 1.0% of the bottom edge on sheet 7 and 2.7% of the left on sheet 15.
Filling the screen by cropping would have cut the sheets.

So the page is carried outward instead, as a `border-image` whose 4px edge
slices are stretched across a border 100vw/100vh deep and put out of focus. The
value immediately outside the frame is by construction the value immediately
inside it. Measured on a 1800x760 viewport, luminance across the boundary,
outside against inside, before and after:

| sheet | before | after |
| :-- | --: | --: |
| 3 | 133.5 / 151.6 | 3.7 / 1.4 |
| 5 | 179.8 / 156.3 | 2.6 / 0.5 |
| 9 | 152.9 / 80.1 | 7.2 / 7.4 |
| 12 | 43.3 / 73.9 | 9.1 / 1.2 |
| 6 | 6.5 / 29.2 | 6.5 / 1.9 |
| 1 | 0 / 1.6 | 0 / 1.6 |

**Why it is a divergence.** DG-02 forbids flat tone over an area at any
opacity. This is an area of tone. The defence is narrow: the sheets are
photographs and are already filled areas that the rule does not reach, and this
carries that same material further out rather than introducing tone of its own
— on thirteen of the seventeen sheets the tone it carries is `#000` and the
layer changes nothing at all. It is recorded here rather than argued into the
rule, in the same way [§11](#11--the-presentation-is-in-colour-and-the-rules-say-it-may-not-be)
records the deck's colour.

**The app is untouched.** DG-02 holds everywhere in `src/`.

**What it costs.** The blur is static, so it rasterises on arrival and costs
nothing per frame. Two layers alternate rather than seventeen standing in the
layer tree. Over 36 sheet changes it adds 0.165s of main-thread time against
the same run with the layer hidden — about 4.6ms per change, inside the 420ms
transition it happens in.

## 66 · The talk deck's photographs are a liquid surface, and it answers the pointer

**Rules set aside:** [MO-04 — No Light Follows the Pointer](design/07-motion-and-input.md),
[DG-02 — Only Lines. Nothing Is Ever a Filled Area](design/01-drawing-grammar.md)
**Code:** [`docs/talk.html`](talk.html) — `liquid()`, `liqFrame()`, `focusIn()`

Four of the seventeen sheets are full-bleed photographs, and since [§65](#65--the-talk-deck-carries-the-page-past-the-frame-and-dg-02-forbids-a-filled-area)
they fill the whole screen. They are also where the export is weakest. Measured
as JPEG blocking — the mean step across 8px block boundaries against the mean
step inside them, over pixels that carry something:

| page | block ratio | | page | block ratio |
| :-- | --: | --- | :-- | --: |
| 3 | 1.138 | | 12 | 1.109 |
| 9 | 1.135 | | 5 | 1.069 |

Every other page is 1.04 or below. Those four are also ~99% image, on smooth
grounds, which is exactly where 8px blocking shows.

So they carry the fractures sheet's own mechanism — an feTurbulence through an
feDisplacementMap — over the whole page rather than a clipped region. **It
replaces the drift on those four**, which existed in its own words to keep the
grain off the same pixels; a displacement does that better, and running both
would put a filter over a transform and re-filter every frame. No sheet uses
`drift` now.

**The pointer moves it, and MO-04 forbids that.** The rule refuses light
*carried* with the pointer. Nothing here follows the pointer: there is no
position in it, only speed — moving the mouse stirs the whole surface and it
settles back over about a second, the way a liquid does. A still pointer leaves
a sheet breathing on the deck's own 19.7s tide. Asked for explicitly.

**Only the scale is animated.** `baseFrequency` is fixed, so the noise field
rasterises once and is reused; animating it, as page 6 does, regenerates it
every frame. Measured on a 1600x900 viewport: the surface costs **5.5% of
wall-clock main thread** (10.3% running against 4.8% with the loop stopped),
and **14.1%** with the pointer stirred continuously — level with page 14, an
ordinary instrument sheet, at 14.0%.

**Two things this cost, recorded because they are not obvious.**

The displacement rides a wrapper element, not the page. A filter list
containing a `url()` cannot be interpolated, so with both on one element the
focus-in had no transition to run and the sheet arrived already sharp.

And the arrival on these three is a whole-page focus, not a line at a time.
Three ways of hiding a line on a photograph were built and measured at the
boundary of the thing doing the hiding — a patch of the block's own ground
(15.7 / 21.4 / 93.9), a blurred copy of the page in a window (1.7 / 2.3 /
57.3), and that copy carrying the displacement (9.8 / 3.1 / 59.3). Pages 3 and
5 work either way. Page 9 does not, and the reason is in the picture:
"Framework" runs into the moss with no ground to end on, so any window over the
type cuts the branch and the blur stops against detail that is still sharp.
Feathering needs a mask, and a mask makes an element a backdrop root, which is
what made the one version needing no copy inert — covered and open both
measured sd 37, the blur never appearing. A whole-page focus has no window, so
it has no edge, so there is nothing to match. On pages 5 and 9 it is the same
thing regardless: their titles measure as a single band, one line each.

**The app is untouched.** MO-04 and DG-02 hold everywhere in `src/`.

## 67 · The talk deck answers a hover with light, a lens and a second language

**Rules set aside:** [MO-04 — No Light Follows the Pointer](design/07-motion-and-input.md),
[TY-01 — Three Sizes](design/06-typography-and-copy.md),
[TY-02 — One Weight](design/06-typography-and-copy.md),
[DG-02 — Only Lines. Nothing Is Ever a Filled Area](design/01-drawing-grammar.md)
**Code:** [`docs/talk.html`](talk.html) — `lens()`, `translate()`, the `.lens` and
`.xlate` rules, and the `#foot .clock` block

Three things went into the deck that the rules do not have a place for, and
they are recorded together because they are one decision taken three times:
**the deck answers a pointer.**

**The lens** magnifies the index sheet at 2.4x through a disc that follows the
pointer. **The translation** swaps the English set into pages 8 and 9 for the
Italian the talk is given in, on hover, in place. Both are fields carried with
the pointer, which MO-04 refuses by name; the torch on page 1 is already the
same exception, recorded at its own call site. The defence is the one the rule
itself leaves open and it is not broader: neither carries light of its own,
both answer a pointer that has been deliberately put somewhere, and both go
when it leaves. **The clock** is not a divergence of MO-04 but it is new
persistent chrome, and it is here so the ledger has it.

**The translation panels are opaque, which DG-02 forbids.** The ground under
all six blocks was sampled at pure `rgb(0,0,0)` with a standard deviation of 0,
so the panel has no findable edge and what the room sees is the text changing
language. Same defence as the covers, which have always worked this way.

**The type on them was specified as 32px at weight 100**, which was a fourth
size and a second weight: TY-01 fixes three sizes, TY-02 one weight at 300 and
says outright that contrast never comes from weight. Both asked for explicitly.

**The size divergence is closed.** 32px was written `1.667vw`, scaled against
the 1920 the pages are drawn at. Measured there, it came out identical to the
English it replaces — mean line pitch 32px against 32px, 1.00x — so the swap
was the same text at the same size in another language, and it still read as
too heavy on the sheet. It sits on `--t2` now, which is the deck's own second
step, and the deck is back to three sizes.

**The weight divergence stands.** 100, against TY-02's 300. The face declares
`font-weight: 100 700`, so it is a real master and not a synthesised thin. `b`
is neutralised rather than removed, so the markup survives and the rule's point
— that the term is part of the sentence, not a heavier version of it — still
holds inside the panel. This is the only type divergence left in the deck, and
`docs/talk.html` states the rendered scale beside `--t1` so it cannot drift
again unremarked.

**Two things measured on the way, both worth keeping.**

*Live text on these sheets was not monochrome.* `-webkit-font-smoothing:
antialiased` sits on `body` and is a macOS property that does nothing on
Windows, so DirectWrite was antialiasing the Italian on subpixels: chroma
peaking at **210** and averaging **65.6**, where the baked English beside it
measures **1** and **0**. Coloured fringes on type, in a deck that is black and
white. Promoting the panel to its own layer does not fix it — a layer with an
opaque background is still a valid subpixel target, and `will-change: opacity`
left the number unmoved. A background at `.99` alpha does: Chrome must
composite and falls back to greyscale. Measured after: **0 and 0**. This is
deck-wide and only the translation panels are treated; the clock, the chevrons
and the four live instruments still render text the same way.

*The swap is staged, not cross-faded.* An opaque panel fading in over the
English shows both languages through it at once, and a sheet legible in two
languages separately is legible in neither superimposed. The panel goes first
and the Italian follows it on a delay — measured, the panel reaches full
opacity at ~240ms while the Italian is still at 0.21, and neither direction has
a frame carrying both.

## 68 · MO-04 is now a scoped rule in the talk deck, not an absolute one

**Rule:** [MO-04 — No Light Follows the Pointer](design/07-motion-and-input.md)
**Code:** [`docs/talk.html`](talk.html) — `torch()`, `liquid()`, `lens()`, `translate()`

MO-04 has been set aside four times in this deck, each time at its own call
site with its own argument, and §66 and §67 record them. Four exceptions
recorded separately read as four small concessions; together they are a
different rule, and the honest thing is to write the different rule down rather
than keep annotating the old one.

**In the talk deck, MO-04 reads: the pointer may be answered, and nothing may
be carried.** What the rule exists to refuse is a field that moves whenever the
reader moves and so can never fall out of attention. That is still refused
everywhere. What is now allowed is a surface that responds to a pointer
deliberately placed and stops when it leaves:

| | what it does | what it is not |
| :-- | :-- | :-- |
| the torch, page 1 | reveals the photograph through the backdrop | it does not emit; it uncovers |
| the liquid, pages 3/5/9/12 | answers pointer **speed**, settles in ~1s | it has no position in it at all |
| the lens, page 10 | magnifies what is under the pointer | it carries no light, only scale |
| the translation, pages 8/9 | swaps a language in place | it does not move with the pointer |

None of the four follows the pointer with light. Three of them carry no light
at all. The torch is the only one that is light, and it reveals rather than
paints — the dandelion is found in the dark, not lit by a decal.

**The app is untouched.** MO-04 holds absolutely in `src/`, and this scoping is
the deck's alone. It is written here so that the next thing that wants to
answer a pointer is measured against a stated rule rather than against four
precedents.

**What would still break it:** a field that follows the pointer continuously
and emits — a glow under the cursor, a trail, a spotlight that moves with the
hand rather than revealing where it is put. The deck has none and should
acquire none.

---

## 69 · The four fracture cards take a fourth type size, measured off the page they follow

**Rule:** [TY-01 — Three Sizes](design/06-typography-and-copy.md), [TY-03 — Tracking](design/06-typography-and-copy.md)
**Code:** [`docs/talk.html`](talk.html) — `CARDS`, `.sheet.card .say`

Four sheets sit between the wall (page 7) and the Antifragile Framework (page
9) with no photograph behind them. They name, one at a time, the four things
media pollution does to a business. They are the only sheets in the deck that
are drawn rather than exported.

**They were specified, and the specification was wrong for this deck.** The
first build followed a written spec — Playfair Display 400, 64px, uppercase,
letter-spacing 0.1em, centred on black — and was rejected on sight as not
belonging. Two divergences were being carried to serve it: a tracked
non-uppercase line against TY-03, and a serif family the deck has no file for,
silently resolving to whatever the projector happened to have.

**So the type is not designed, it is measured off page-07.jpg**, where the
same register already exists in the four column names the wall carries.
Measured at 1920×1080, column 1, "Algorithmic / Disconnection":

| | measured | gives |
| :-- | --: | :-- |
| ink height, "Disconnection" | 37px | Newsreader 300 at 49.3px |
| ink height, "Algorithmic" | 47px | Newsreader 300 at 47.5px |
| cap-top to cap-top | 51px | line-height 1.06 |
| ink colour | p50 251, p95 255, chroma 0 | `#fff` |
| body rows beside it | p50 100 | not this |
| set width, "Disconnection" | 310px vs 300px predicted untracked | tracking 0, not 0.1em |

The two ink readings bracket **48px**, so that is the size, and the case is as
written rather than uppercase. Dropping the uppercase drops the TY-03
divergence with it.

**The divergence that remains is TY-01's three sizes.** `--t3` is
`clamp(26px, 3.2vw, 52px)` and is viewport-relative; the sheet is letterboxed
to `min(100vw, 16/9 × 100vh)` and the type printed on it scales with the
**sheet**. At 1920 the two agree within 8%; at 1536 they are 28% apart —
`--t3` gives 49.2px where the wall's own heading renders at 38.4px. Matching a
printed page means scaling like it, so the card takes the frame's own `min()`:
`min(2.5vw, 4.444vh)`. Measured against the wall at three viewports, the card
line and the wall's heading agree to within 1.0px, 0.6px and 0.8px.

**The deck therefore has a fourth size, and it is not a step.** It is one
value, used on four sheets, and it exists to stop being a step — to track a
photograph instead of the viewport. TY-01 is about a type scale with three
rungs; this is a measurement of an image. It is recorded here rather than
written into the scale, because adding a rung would invite its use elsewhere.

**One more thing had to be measured.** Live type over an opaque layer is a
valid subpixel target, and on Windows DirectWrite takes it: the first build of
the card measured 76.4% coloured pixels at up to 214 levels of chroma, in a
deck whose every other mark measures 0. `opacity:.999` forces the line into a
layer with an alpha channel, which cannot carry subpixel coverage. Measured
after: chroma 0, white still 255. The background trick the translation panels
use does not work here — tested, still 76.4% — because those panels are
already composited layers.

**What would break this:** re-exporting page 7. Every number above is measured
on that image, and `npm run audit:talk` will refuse the deck if its fingerprint
moves.
