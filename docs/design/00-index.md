# Design & Architectural Rules — Index

70 rules, binding. They are the accumulated record of what has already been tried on this drawing and what it cost — most of them were written after a regression, and several carry the frame rate or the pixel measurement that produced them.

**Read the file that covers what you are about to touch, before you touch it.** The one-line summaries below are pointers, not the rule; none of them is sufficient to work from.

## How to cite a rule

Every rule has a stable ID (`DG-01`) and a name (*Never a Straight Line*). **Code comments cite the ID**, so a rename never orphans a reference. **Prose inside the rules cites the name**, because that is what reads. This index is the only place the two are bound together, and it is the only file that has to be updated when a rule is renamed.

## The files

### [Drawing Grammar](01-drawing-grammar.md) · `DG` · 9 rules

What a mark may be. These rules govern the geometry itself — the stroke, the fill that is never allowed, the taper, the wander, the grain. They apply identically to the map, the figures, the chapter openers and the seeds, because all four are one drawing made four times.

- **DG-01** — [Neurones Never have Straight Lines](01-drawing-grammar.md#dg-01--never-a-straight-line) — No `<line>`, no `L`-only path, no zero-bow filament anywhere in the drawing. Four interface arrows are exempt by symbol; nothing else is.
- **DG-02** — [Only Lines. Nothing Is Ever a Filled Area](01-drawing-grammar.md#dg-02--only-lines-nothing-is-ever-a-filled-area) — Flat tone over an area is a blob at any opacity; a cell body is spoken by line density. The only fills left are the light sources.
- **DG-03** — [A Lamp Burns Where the Tissue Is Thick](01-drawing-grammar.md#dg-03--a-lamp-burns-where-the-tissue-is-thick) — A beacon's intensity is keyed to the structure at its own node, within three guards, with a floor below which the fill is removed rather than dimmed.
- **DG-04** — [Fibres Take Direct Courses](01-drawing-grammar.md#dg-04--fibres-take-direct-courses) — Wander is ~5% of span, one dominant frequency and one small secondary. A fibre under tension is going somewhere.
- **DG-05** — [Hierarchy Is Generations, Not a Ratio](01-drawing-grammar.md#dg-05--hierarchy-is-generations-not-a-ratio) — At least four separably distinct widths, counted at reading scale. Buy the range at the thin end, never by fattening trunks.
- **DG-06** — [Density Is the Texture](01-drawing-grammar.md#dg-06--density-is-the-texture) — Grain comes from beading on the two finest generations. Keep rate 0.46, radius factor 0.6 — measured against element count, not taste.
- **DG-07** — [A Sphere Is Where the Fibres Come From](01-drawing-grammar.md#dg-07--a-sphere-is-where-the-fibres-come-from) — Cell body, flow and fibre must agree about where connections leave. No clip path, because a clip is a boundary.
- **DG-08** — [A Field Is Rays; A Cell Is an Arbor](01-drawing-grammar.md#dg-08--a-field-is-rays-a-cell-is-an-arbor) — An arbor randomises its bearing over three generations, which is right for a cell and fatal for a field. A field is long rays holding their heading.
- **DG-09** — [An Unbounded Field Fades; It Never Ends](01-drawing-grammar.md#dg-09--an-unbounded-field-fades-it-never-ends) — No ring, rim or horizon where the drawing says *this space does not stop*. Fading is a property of a field, and fields are rays.

### [The Organism and Its Graph](02-organism-and-graph.md) · `OG` · 8 rules

What connects to what, and how a connection is drawn. The map is one graph drawn by one routine; these rules keep it one, keep it oriented, and keep its anatomy at the scale that anatomy actually reads.

- **OG-01** — [One Organism, One Routine](02-organism-and-graph.md#og-01--one-organism-one-routine) — One graph, one `tissue()`. A connection is one meandering process, never a bundle; emphasis is opacity on the same edges. Scoped: the two trend reports draw taut filaments and particle emitters instead, opt-in per figure.
- **OG-02** — [Nothing Floats](02-organism-and-graph.md#og-02--nothing-floats) — Everything interactive lives in `NODES` everything is wired, and a component walk bridges every island. Verified by DOM audit.
- **OG-03** — [A Connection Has a Direction](02-organism-and-graph.md#og-03--a-connection-has-a-direction) — Every edge is oriented pre → post, and the map says so with taper alone. Keep the polarity; spend nothing on saying it twice.
- **OG-04** — [Crossings Must Fuse](02-organism-and-graph.md#og-04--crossings-must-fuse) — Every genuine crossing gets a bipolar interneuron. Two strands merely laid over each other read as unrelated ribbons.
- **OG-05** — [A Mesh Closes Its Cells; A Graph Does Not](02-organism-and-graph.md#og-05--a-mesh-closes-its-cells-a-graph-does-not) — Anastomosis is where the reference's density comes from — but reticulation is confined to filler tissue and must never close a loop between semantic nodes.
- **OG-06** — [Dendrites Wear Spines](02-organism-and-graph.md#og-06--dendrites-wear-spines) — Spines opt in, only at `depth === 2`. Free ends terminate in a `GrowthCone`; the one exception is a ray field.
- **OG-07** — [Myelin Belongs Where the Scale Carries It](02-organism-and-graph.md#og-07--myelin-belongs-where-the-scale-carries-it) — Right at single-cell scale in `ChapterOpener`, wrong at map scale across 232 links where no internode reads.
- **OG-08** — [Light Goes Both Ways as a Relay, Never as Two Arrows](02-organism-and-graph.md#og-08--light-goes-both-ways-as-a-relay-never-as-two-arrows) — A `both` edge runs two counter-phased station sets at the same coordinates, and draws no terminal bouton.

### [Light and Clocks](03-light-and-clocks.md) · `LC` · 5 rules

How light moves, and what may keep time. Light travels by phase and never by motion; every clock in the app is derived rather than chosen, and one period is fixed.

- **LC-01** — [The Luminance Tide](03-light-and-clocks.md#lc-01--the-luminance-tide) — One period, phase from distance to the core. Brightening rolls outward as a wave with no moving object. Never a random offset — that is shimmer.
- **LC-02** — [Never a Travelling Dash](03-light-and-clocks.md#lc-02--never-a-travelling-dash) — No animated `stroke-dashoffset`: a lit dash has ends, and ends read as a worm. Saltatory conduction is the one sanctioned way to send light along a strand.
- **LC-03** — [One Clock For The Whole App](03-light-and-clocks.md#lc-03--one-clock-for-the-whole-app) — The reader breathes on the map's tide, phased by distance from the centre of the sheet. Never give the reader its own cycle again.
- **LC-04** — [Irrational Periods](03-light-and-clocks.md#lc-04--irrational-periods) — No two clocks in a simple integer ratio. Derive through `period(base, seed)`. Measured: 131 distinct periods, 5% of pairs near-integer.
- **LC-05** — [A Two-Stop Keyframe Is a Metronome](03-light-and-clocks.md#lc-05--a-two-stop-keyframe-is-a-metronome) — Asymmetric rise and fall, cresting off centre, with a counter-swell. The 19.7s tide period is fixed; reshape the contour, never the number.

### [The Ground and Its Colour](04-ground-and-colour.md) · `GR` · 8 rules

What lies behind the drawing, and what colour anything is allowed to be. The ground is the app's main contrast instrument: nearly every legibility problem here was solved by emptying the background rather than by touching the drawing.

- **GR-01** — [The Ground Is Black, and Nothing Is Drawn On It](04-ground-and-colour.md#gr-01--the-ground-is-black-and-nothing-is-drawn-on-it) — Every drawing surface is black in both themes, and nothing sits behind it — no grid, no rule, no field, no ticks.
- **GR-02** — [Plain Ground — the Glass Is Retired](04-ground-and-colour.md#gr-02--plain-ground--the-glass-is-retired) — No glassmorphism. Surfaces that sit over content are solid theme ground; everything that merely decorated a page gets nothing.
- **GR-03** — [The Map's Ground Is Empty](04-ground-and-colour.md#gr-03--the-maps-ground-is-empty) — Nothing behind the organism may be made of filaments, or the eye cannot separate backdrop from anatomy.
- **GR-04** — [Legibility Comes From the Ground, Not From Thicker Strands](04-ground-and-colour.md#gr-04--legibility-comes-from-the-ground-not-from-thicker-strands) — When the tissue is hard to read, empty the background before touching the drawing. Filaments stay hairlines; contrast is bought with opacity.
- **GR-05** — [Black, White, and One Temperature of Light](04-ground-and-colour.md#gr-05--black-white-and-one-temperature-of-light) — Ink is monochrome without exception. Hue exists only in emitted light, as warm and cool whites, under a measured saturation ceiling.
- **GR-06** — [A Cell That Emits No Light Takes No Temperature](04-ground-and-colour.md#gr-06--a-cell-that-emits-no-light-takes-no-temperature) — The chapter opener draws no glow, so it shows no register either. That is correct rather than a gap.
- **GR-07** — [Blur a Line, Never a Mass](04-ground-and-colour.md#gr-07--blur-a-line-never-a-mass) — Blur a mass and you get fog; blur a line and you still have a line, with black beside it. Every soft pass is gated on a measured ground.
- **GR-08** — [The Reader Is Made of Light-Wells, Not Panels](04-ground-and-colour.md#gr-08--the-reader-is-made-of-light-wells-not-panels) — Nothing in the book section is a box. `.membrane`, `.bud`, `.veil`, `.scrim`, `.well`, `<Vein />`, `<Soma />` — and never a `.membrane` as the scroll container.

### [Figures and Worlds](05-figures-and-worlds.md) · `FW` · 10 rules

The five data visualisations, the surfaces they open onto, and the arguments they are required to make. A figure is the map at figure scale — never a bespoke composition, never a shrunken diagram, never a panel over a page.

- **FW-01** — [Every Figure Is the Same Organism as the Map](05-figures-and-worlds.md#fw-01--every-figure-is-the-same-organism-as-the-map) — All five visualisations are `LivingFigure`. When the map's grammar moves, port it — it was left a full generation behind once.
- **FW-02** — [Figures Are Filaments, Never Boxes](05-figures-and-worlds.md#fw-02--figures-are-filaments-never-boxes) — One parametric generator, seeded and deterministic. No rectangles, no flowchart boxes, no arrowheads.
- **FW-03** — [A Figure Is a World, and a World Has Three Passages](05-figures-and-worlds.md#fw-03--a-figure-is-a-world-and-a-world-has-three-passages) — No close cross. Three named exits — the chapter, the map, the practice — each drawn as a soma and a name.
- **FW-04** — [A World Carries Less Text Than the Page It Came From](05-figures-and-worlds.md#fw-04--a-world-carries-less-text-than-the-page-it-came-from) — Inside a world the whole `FigureFrame` steps aside and names surface only under touch. The glyph exception stands.
- **FW-05** — [A Figure Has a Far Plane](05-figures-and-worlds.md#fw-05--a-figure-has-a-far-plane) — Field cells recede behind one group-level Gaussian at 0.85 user units, only if they carry no name, with the original index carried through. No parallax.
- **FW-06** — [Never a Shrunken Figure, and Never a List Instead of One](05-figures-and-worlds.md#fw-06--never-a-shrunken-figure-and-never-a-list-instead-of-one) — 600px is the measured type floor. Below it every figure takes its `portrait` layout — the same cells stood up, ornament included; never a shrunken drawing and never a list. Branch on a value, never on an early return.
- **FW-07** — [A Schematic Takes the Whole Sheet](05-figures-and-worlds.md#fw-07--a-schematic-takes-the-whole-sheet) — `BookSpread` groups pages rather than deriving pairs from index parity — parity puts a figure at half scale and can skip a page.
- **FW-08** — [A Chapter Opens As Its Cell](05-figures-and-worlds.md#fw-08--a-chapter-opens-as-its-cell) — The chapter's soma grown large, on the chapter's existing first page — never as a new page, because marks are stored by index.
- **FW-09** — [A List Is Not a Cause](05-figures-and-worlds.md#fw-09--a-list-is-not-a-cause) — FIG 3.1 is a causal order, not three peers in parallel columns: two external roots converge and pass through the reader as a relay.
- **FW-10** — [Every Cell in an Observer-Relative Figure Is a Centre](05-figures-and-worlds.md#fw-10--every-cell-in-an-observer-relative-figure-is-a-centre) — If a figure claims there is no absolute frame, the drawing must not quietly keep one. The distortion is the geometry, not an effect over it.

### [Typography and Copy](06-typography-and-copy.md) · `TY` · 8 rules

One family, one weight, three sizes, one tracking rule — and the hard limit on what text may exist at all. Copy is the most easily invented thing in the app and the most expensive to strip out later.

- **TY-01** — [One Voice, and It Is Light](06-typography-and-copy.md#ty-01--one-voice-and-it-is-light) — Two families, one to a role: Newsreader sets titles, IBM Plex Sans everything else. One weight — 300. Contrast comes from size, spacing, opacity and light. Never from weight.
- **TY-02** — [Three Type Sizes: 9, 12, 18](06-typography-and-copy.md#ty-02--three-type-sizes-9-12-18) — Three sizes and no others, written as arbitrary values. Named Tailwind steps are banned. Ties round downward. Verified by computed-style sweep.
- **TY-03** — [One Spacing Rule, Everywhere](06-typography-and-copy.md#ty-03--one-spacing-rule-everywhere) — Uppercase is tracked 0.2em. Nothing else is tracked at all. In SVG it is derived, never passed; numerals and single glyphs are never tracked.
- **TY-04** — [Literal Document Text](06-typography-and-copy.md#ty-04--literal-document-text) — No copy is written for this app unless it was asked for. This governs interface copy exactly as it governs the manuscript.
- **TY-05** — [A Name Is Said Once](06-typography-and-copy.md#ty-05--a-name-is-said-once) — No string appears twice in one frame; the inner element drops its own name. Discovered independently six times before it was written down.
- **TY-06** — [Labels Surface Under Touch](06-typography-and-copy.md#ty-06--labels-surface-under-touch) — Names surface where the cursor is and nowhere else. Chapter numerals are the exception — legible at rest, brightening on touch.
- **TY-07** — [A Taxonomy May Keep Its Names](06-typography-and-copy.md#ty-07--a-taxonomy-may-keep-its-names) — The narrow exemption for figures whose argument *is* the naming, via `labelAtRest`. Never for making a drawing easier to label.
- **TY-08** — [Labels Have a Collision Budget](06-typography-and-copy.md#ty-08--labels-have-a-collision-budget) — About two words at figure scale; the sentence lives in `reading`/`detail`. Verified by DOM audit against every other rect and the frame.

### [Motion and Input](07-motion-and-input.md) · `MO` · 8 rules

Idle motion and response are different properties with different budgets: ambient cycles are slow because soft fascination lives there, and anything answering an input lands almost immediately. One curve serves both.

- **MO-01** — [Everything Is Alive](07-motion-and-input.md#mo-01--everything-is-alive) — Idle motion is desynchronised, because synchronised motion reads as machinery. Touch propagates outward by per-distance delay rather than snapping.
- **MO-02** — [One Curve](07-motion-and-input.md#mo-02--one-curve) — `--ease-organic` everywhere, mirrored by `EASE` in JS. The single exception is `--ease-exit`, for motion that is leaving; nothing arrives on it.
- **MO-03** — [Neurologically Calm Motion, Instant Response](07-motion-and-input.md#mo-03--neurologically-calm-motion-instant-response) — Calm is an idle property, responsiveness an input property. Never slow an interaction down to make it feel organic.
- **MO-04** — [No Light Follows the Pointer](07-motion-and-input.md#mo-04--no-light-follows-the-pointer) — A field carried with the cursor can never fall out of attention — that is hard fascination, and it is what this dossier argues against.
- **MO-05** — [Opening a Chapter Is a Dive, Never a Cut](07-motion-and-input.md#mo-05--opening-a-chapter-is-a-dive-never-a-cut) — Geometric viewBox interpolation so the zoom rate stays constant. Three mandatory escapes plus a wall-clock backstop.
- **MO-06** — [The Journey Has a Return Leg](07-motion-and-input.md#mo-06--the-journey-has-a-return-leg) — Leaving sinks the page back through the same light and reopens the map centred on the cell that page belongs to.
- **MO-07** — [A Page Turn Is a Tide, Not a Sheet of Paper](07-motion-and-input.md#mo-07--a-page-turn-is-a-tide-not-a-sheet-of-paper) — A radial mask flooding from the spine, starting at 55% and never 0, so every way it can stall still fails visible.
- **MO-08** — [Thumbs Are Not Cursors](07-motion-and-input.md#mo-08--thumbs-are-not-cursors) — 44px minimum box under `pointer: coarse`. The swell does not grow — only the area that answers.

### [Layout and Chrome](08-layout-and-chrome.md) · `LY` · 7 rules

How the app is entered, how a page is bounded, how a gesture is read, and the small absolute prohibitions on interface geometry.

- **LY-01** — [The Orrery Is the Front Door, Not a Maze](08-layout-and-chrome.md#ly-01--the-orrery-is-the-front-door-not-a-maze) — An orientation map you consult, never a transit system you fly through. Never hard-code the page count. Below 700px, a legible stacked spine.
- **LY-02** — [No Page Scrolling](08-layout-and-chrome.md#ly-02--no-page-scrolling) — The viewport is never vertically scrollable. Long content scrolls inside its own column via `.soft-scroll`. The manuscript fits because the cut is measured — every paragraph set offscreen and its height read back — never because a packing constant was guessed.
- **LY-03** — [A Horizontal Scroll Is a Gesture, Not a Scrollbar](08-layout-and-chrome.md#ly-03--a-horizontal-scroll-is-a-gesture-not-a-scrollbar) — Intent, not overflow. Four guards — axis, momentum, ownership, overlays — and the unlock timer must not be cleared in the effect cleanup.
- **LY-04** — [A Mode Is Never Sealed](08-layout-and-chrome.md#ly-04--a-mode-is-never-sealed) — Zen keeps exactly one control. Esc escalates: overlay, then zen, then the map. A mode whose only exit is an untold keystroke is a trap.
- **LY-05** — [Zero Rounded Corners](08-layout-and-chrome.md#ly-05--zero-rounded-corners) — `rounded-none` across every element, with no exception.
- **LY-06** — [No Hard Outlines](08-layout-and-chrome.md#ly-06--no-hard-outlines) — No 1px black/white borders, focus outlines or ring offsets. Hover shifts opacity softly, never a black↔white flip.
- **LY-07** — [Theme classes](08-layout-and-chrome.md#ly-07--theme-classes) — The App root carries `theme-dark` / `theme-light`; global hairline CSS keys off these.
- **LY-08** — [A Box Is Never Lit; the Glow Belongs to the Glyph](08-layout-and-chrome.md#ly-08--a-box-is-never-lit-the-glow-belongs-to-the-glyph) — No shadow, halo or soft field behind a control's box, ever. Two permitted forms: a glow on the ink (`text-shadow` / `drop-shadow`, for focus) or nothing at all (opacity only, for hover).

### [Performance](09-performance.md) · `PF` · 5 rules

Five rules, each written from a measured regression on this specific drawing. The numbers are the point — every one of them was a frame rate or an element count someone actually observed, and three of them were catastrophic.

- **PF-01** — [A Frame Budget Must Be Calibrated Against the Design Target, Not Against 60fps](09-performance.md#pf-01--a-frame-budget-must-be-calibrated-against-the-design-target-not-against-60fps) — The intended steady state is ~20fps with the flex filter on. The threshold is 85ms; a stricter one silently strips the app on a healthy machine.
- **PF-02** — [transform-box: view-box, Never fill-box](09-performance.md#pf-02--transform-box-view-box-never-fill-box) — `fill-box` re-measures a group's bbox every frame. On the dendrite groups this alone took the map from 47fps to 1fps.
- **PF-03** — [Filters Are Cheap; Transforms On Big Groups Are Not](09-performance.md#pf-03--filters-are-cheap-transforms-on-big-groups-are-not) — A transform on the ~6000-element organism measured 6fps; an animated turbulence + displacement filter over the same elements cost 1fps.
- **PF-04** — [Bloom Costs Frames](09-performance.md#pf-04--bloom-costs-frames) — Never bloom a group that animates or holds many elements — measured 30fps → 57fps by removing it. Reserve it for small, bright, static marks.
- **PF-05** — [A Retired Renderer Is Unmounted, Not Hidden](09-performance.md#pf-05--a-retired-renderer-is-unmounted-not-hidden) — `display: none` buys the paint and nothing else. Half the organism (10,302 of 20,552 nodes) was built every load and never seen; gating it cut the document 50.5% and a cold `getBBox()` from 281ms to 5.7ms.

### [Method](10-method.md) · `ME` · 1 rules

How a rule in this file is established, checked and overturned. One rule, cited as law by two others long before it was written down.

- **ME-01** — [Verify by Measurement, Not by Eye](10-method.md#me-01--verify-by-measurement-not-by-eye) — Where a rule has a threshold, the threshold is a number, the number is measured, and the value is recorded beside it. When the measurement and the eye disagree, the measurement wins.

### Text Justification & Typography Balance
Alignment Rules
 * Justification Standard: Body text utilizes precision block justification to maintain sharp, clean vertical margins matching the traditional ink-on-paper aesthetic.
 * Orphan & Widow Prevention: Never leave a single isolated word on a trailing line (orphan/widow control). Layout logic must dynamically pull preceding words or push trailing content to ensure a minimum threshold of at least two words per final line.
 * Stroke & Line Break Constraints: A single word must never be orphaned or separated on an isolated line segment or stroke division.
Readability & Optical Balance
 * Ragged Management: Where left-alignment or natural ragged balancing is applied, line lengths are constrained to an optimal character count (typically 45 to 75 characters per line) to eliminate saccadic fatigue.
 * Optical Flow: Paragraph spacing and letter-spacing (tracking) adjust dynamically to prevent awkward word gaps (rivers) during full-width block justification, ensuring an even, harmonious reading rhythm across the aged paper canvas.

Everything else is held by ME-01 — see [Method](10-method.md).
