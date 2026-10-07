# Presentation design

The aesthetic and design decisions behind [`presentation.html`](presentation.html),
and the measurements that settled them.

This is not a rules file. [`design/`](design/00-index.md) states what is true of
the **app**; this states what was decided for the **deck**, including the places
the two now disagree on purpose. Where a decision was made against a measurement,
the number is here — ME-01 applies to a slide as much as to a page.

---

## 1 · What the deck is

One self-contained HTML file. Both typefaces are embedded as base64, there is no
build step and no network request: open it and it runs. Ten sheets — an opening,
eight in two parts, and a close. Arrow keys or edge clicks to move, `G` for the
atlas.

It began as a demonstration that the manuscript's argument could be practised
rather than asserted, and held itself to all 68 rules. It no longer does. What
follows says where, and why.

---

## 2 · The departure

Recorded in full as entry 11 of [`OPEN.md`](OPEN.md). In summary, the deck sets
aside **GR-05** (monochrome ink), **DG-02**'s no-fill clause, and **GR-02** (the
glass is retired), on explicit instruction. The app is untouched; those rules
hold everywhere in `src/`.

What survived the departure, because the reasoning behind each rule did not stop
being true:

- **Hue is never arbitrary and never per-stroke.** GR-05's real objection is
  colour landing on structure at random.
- **Colour is static.** PF-03's lesson intact: animating a stroke's hue repaints
  every frame, and this deck carries ~16,000 strokes.
- **The glass is made of lines.** GR-07 holds — translucency comes from
  overlapping strokes, never a filled surface or a blurred mass.
- **DG-01 is absolute.** A DOM audit across every sheet still measures zero
  `L`-only paths, zero filled paths, and zero `<line>` outside the instrument.

**Current state:** the ground came back to flat black and the tissue to white.
The colour layers are written, documented and *not emitted* — three `<div>`s in
`realise()` bring them back. The ground has been called both ways more than once
and the rules for it are kept rather than deleted.

---

## 3 · Ground and light

**The ground is nothing at all.** `Orrery.tsx` settled this once: *"No grid.
Both references are one organism on empty ground and nothing else — no rule, no
field, no technical backdrop."* Its own history is a list of things tried behind
the organism and removed. The deck rebuilt every one of them — a substrate grid,
a frost stipple, a glass pane — and hit the same wall. All three are gone; their
CSS is kept, documented.

**Light is internal.** The sheath around a strand stops at 5.2x its width, not
14x: read one strand at a time a wide halo is a glow, read a thousand
overlapping it is haze filling the gaps, and the drawing loses its black. The
brightness is contained within the width of the strand and a near-white channel
runs down the middle of it — light *inside* a translucent body rather than light
escaping one.

**Lamps** keep GR-05's two registers of warm and cool white, measured against
the rule's own gate (saturation <= 22%, no pixel's luma moving more than 12/255):

| register | stop | saturation | luma delta |
| :-- | :-- | --: | --: |
| ember | near | 17.6% | 11.8 |
| ember | far | 9.0% | 6.0 |
| cyanotype | near | 6.7% | 11.5 |
| cyanotype | far | 3.5% | 5.5 |

The **luma gate binds harder than the saturation gate**, and asymmetrically:
blue carries 7% of luma against green's 72%, so a cool white loses luma far
faster per unit of chroma. Ember reaches 17.6%; cyanotype runs out at 6.7%. That
is physics, not preference, and it is why the two numbers differ.

The register alternates by act — and since the act label was removed from the
sheets, **the temperature of the light is now the only place the deck's
structure is declared.** Which is GR-05's own argument: a register should be
felt rather than read.

---

## 4 · The tissue is particles

Every strand is a chain of dots rather than a continuous line — a near-zero dash
against a gap, on round caps. Same element count, no new animation. Individual
particle elements were never an option: an animating `<circle>` inside a large
SVG cannot be composited alone and forces the whole layer to re-rasterise.

- **The gap scales with the stroke**, so a trunk is a dense run of large
  particles and a fourth-generation hairline a sparse dusting of small ones. The
  hierarchy survives being dissolved.
- **Two sizes per strand.** A second pass at a third of the width, on a gap that
  is not a multiple of the first, lands between the larger particles and never
  in step with them.
- **The halo passes stay continuous.** They are light in the air around the
  strand, not the strand; dotting them scatters the glow into grey discs.
- **Terminals disperse.** Each growth cone throws a tail of diminishing
  particles along its own bearing — DG-09's argument about fields applied to the
  end of a single fibre. Nothing ends; density falls to zero.
- **Drawn courses resolve.** A course carrying the entrance reveal cannot be
  dotted while it plays — the reveal *is* a dash animation — so it draws solid
  and becomes particles once the sheet settles.

**Anastomosis.** The arbors close their own loops. A tree diverges and never
returns, so the space between two branches is black all the way out; a
plasmodial network branches and *rejoins*, and the result is polygonal. OG-05
already asked for this and was being honoured by a separate filler layer. Now
the arbor **is** the mesh.

**Nothing floats.** Rays grow from the core rather than starting on a circle
around it, and `mesh()` ends with the component walk OG-02 asks for by name —
union-find over the joins, bridging any island to its nearest cell. A cluster
that found only its own members is fully connected internally and still
floating; that is the failure the rule records surviving several rounds of
"looks connected".

---

## 5 · The instrument

Two registers, both razor-sharp, both exempt from DG-01 because they are the
ruler and not the thing measured:

- **Clinical white** — axes, brackets. The frame somebody laid over the tissue.
  Stays *below* the drawing.
- **Signal orange** (`hsl(24 100% 58%)`) — ticks and registration squares. The
  places a measurement was actually taken. Hoisted **above** the colour, because
  multiplied by a cyan wash orange goes brown and by a violet one near-black.

Each registration square **acquires its cell**: it enters offset and oversized,
converges, and the cell's growth is delayed to land just after it. The order is
carried on the element as `data-seq` rather than inferred from markup order, so
it is guaranteed to be the figure's reading order.

The graticule was built, then removed — see section 3.

---

## 6 · Type

**Newsreader Light** for titles, **IBM Plex Sans** for everything else. Both OFL,
both from Google Fonts, both embedded.

The pairing is chosen for what this deck is. Newsreader is an editorial face
fitted for headlines; Plex was drawn as a system for technical documentation,
which is the register the instrument, the readouts and the annotation callout
already occupy. Plex is **variable across 100–700**, so the 240 body weight is a
real instance of the face rather than a browser approximation.

Measured at 100px, cap / x-height:

| face | cap | x-height |
| :-- | --: | --: |
| Georgia (reference) | 69 | 48 |
| Cormorant Garamond 300 *(previous)* | 63 | 39 |
| Newsreader 300 | 72 | 52 |
| IBM Plex Sans 240 | 70 | 51 |

Cormorant carried 0.81 of Georgia's x-height, which had forced a 1.2x inflation
of the title step and -0.022em tracking to keep its presence. Newsreader carries
1.08. **Both corrections came out** — a face that does not need propping up
should not be propped up — and `letter-spacing` returned to 0, which is what
TY-03 asked for all along.

Three sizes and no others (TY-02). Titles are **one line, always**: `fitTitle()`
measures the rendered word against its column after the webfont loads and scales
the step down where one line would not fit.

**Names sit inside their cells and burn.** Held at full white with a tight
text-shadow, centred on the arbor they name. There is nothing to carry back to
the thing — the name *is* at the thing. This also retires most of TY-08's
collision budget, which existed to keep two side-placed names out of the same
band.

**Hyphenation is off everywhere.** Correct hyphenation breaks at morpheme
boundaries and needs a dictionary this file cannot carry. A wrong break inside a
word costs more than a ragged edge, so no word is split; text breaks between
words and the balancing decides where.

**The annotation callout** is a name, a rule, and the reading typed out beneath —
the shape a technical annotation actually takes. It stands beside its cell rather
than in a fixed strip, because on a figure whose method is that names surface
where you are looking, the bottom of the sheet is the wrong place for the one
piece of text that answers you. Both break points are **solved for, not walked
into**: every arrangement of two breaks is scored, wanting two long lines and a
short one, and a single word alone on any line is excluded outright.

---

## 7 · Motion

**One clock.** `TIDE = 19.7s`, phase from distance to the core. **`SPIKE = 7.4s`**
for saltatory conduction, deliberately not the tide's — the tide is the slow
metabolic swell of the organism, a spike is a fast discrete event, and sharing a
period collapses them into one effect. Every other period derives through phi
(LC-04).

**Light travels by leaping, never by sliding.** LC-02 bans the travelling dash
and sanctions one substitute: stations that hold still and fire in sequence.
Nothing moves; nothing has ends.

`fade` is what makes this say something: at 0 the spike arrives at full strength
— a relay that completes. Above 0 it dies before it lands — a signal that formed
and was not received. `sync` puts several courses on one clock with declared
phases, which is the **only** arrangement in which one course can be seen to
interrupt or merge with another. Spikes on unrelated periods coincide sooner or
later, but never *because* of one another, and two figures here are entirely
claims about because:

- **The Extraction Engine** — the feed fires into System 1; System 1 sets off
  toward System 2 already dimming; the loop fires and returns just as the System
  2 spike would have completed. The circuit is not broken, it is bypassed, and
  only one parameter differs to say so.
- **The Causal Taxonomy** — both roots fire together and at identical strength,
  and one spike leaves the meeting. Two arrived, one departed. The merge is the
  whole of what happened, and no word on the sheet says so.

**Ten entrances, one per sheet** — iris, rise, sweep, approach, turn, unfold,
drift, bloom, cascade, settle. All transform-and-opacity on the `.art` wrapper,
a single promoted layer, so they can be as slow and elaborate as they like for
nothing. The morph is delayed by the entrance length: both animate `transform`,
and the last declared wins.

**Sheets have direction and depth.** `--dir` on the body flips the whole
geometry, so forward feels forward. **Pixel dissolves** run only in the
diagnosis half and only forwards: the Introduction is the part about a system
coming apart under load, and a transition that degrades is saying the same thing
the sheets are. Everything from the Response onward transitions cleanly.

---

## 8 · The figures stay in sync

Five of the deck's figures redraw the app's. A hand-kept copy of somebody else's
data drifts — it already had: the causal figure ran backwards and ended on the
news, the anti-engagement figure had lost the asymmetry between its halves, and
the postures figure said `TRAP` three times.

`scripts/audits/static/audit-figures.mjs` reads each diagram component,
evaluates it, and fails `npm run lint` on divergence. It **does not touch
`src/`**: the source is patched in memory to export its constants, transformed
with esbuild, and run against a stubbed React.

**It compares semantics, not geometry** — which cells exist, what each is
called, what connects to what. Coordinates are excluded deliberately: FW-01 and
FW-06 require a figure to be re-laid-out for its rectangle, a projected sheet is
1000x640 against the app's ~800x400, and an audit failing on positions would be
noise that teaches everyone to ignore it.

Four figures are deck-original — `centre`, `harvest`, `weapons`, `antifragile` —
and named in the audit so their absence from the check is a decision.

**A figure states its claim geometrically, or it is not doing its job.** Two
errors of this kind were found and fixed: `OFF THE RAILS` and `UNBOTHERED` were
both drawn as *nodes* with fibres running to them, but each is a **state**, not
a destination. Nothing travels to them. Being unbothered is now the one column
where the drawing simply stops.

---

## 9 · Performance, measured

PF-01's budget is 47fps. **Every reading below was taken with
`document.hidden === false`** — a hidden pane throttles `requestAnimationFrame`
to near zero while screenshots keep rendering, which produced two false alarms
before the guard was added. Any reading without it is worthless.

| finding | measurement |
| :-- | :-- |
| Settled, heaviest sheet (6,456 els) | **60.0–60.3 fps** |
| During entrance, before the fix | 16.3 fps |
| Inactive sheets *paused* rather than removed | all 21 sheets' animations resident at once |
| Arbor bloodstream, 240 stations | 30.0 fps; disabling them alone gave 60.8 |
| ...halved to 108 stations | 31.5 fps — **cost is not proportional to count** |
| Finished `draw` reveals still attached under `fill: both` | 317 live animations doing nothing |

Three lessons, each of which changed the code:

1. **An animating `<circle>` in a large SVG cannot be composited alone.** It
   forces the whole layer to re-rasterise, so a handful costs nearly what a
   hundred does. The arbor bloodstream is off; the relays on figure *links*
   stay, because there are a dozen per sheet and they carry argument.
2. **A one-shot animation with `fill: both` never lets go.** `.settled` removes
   them once the entrance has played.
3. **A dash reveal is the one animation that cannot be composited.**
   `DRAW_BUDGET` went 320 to 96 once the tissue was dotted, because a dotted
   stroke costs more to rasterise and every reveal re-rasterises its path every
   frame. The character of an entrance now comes from the sheet's composited
   transition instead.

**Outstanding:** the entrance has not been re-measured since `DRAW_BUDGET` was
cut. The settled state was 60 and nothing in it got heavier, but that is
reasoning, not measurement.

---

## 10 · Tried and removed

Kept here so nothing is rebuilt twice.

| what | why it went |
| :-- | :-- |
| Iridescent per-band stroke colour | Read as coloured wire, not glass. Colour moved off the tissue, then off the sheet. |
| Full-bleed conic wash on `screen` | A conic covers everything; it is a backdrop, not an atmosphere. |
| Substrate grid, frost stipple, glass pane | Same wall the map hit: a backdrop of the same kind of mark as the tissue leaves the eye unable to separate them. |
| Pixel register and bronze particulate | Ground texture the map's history rejects. |
| The empty Scale Mismatch sheet | Merged with the observer-relative figure on request. |
| `THEY MEET` as a label | A caption telling you what the drawing was failing to do. Now shown by timing. |
| Act label, top-left | The register carries the structure instead. |
| Curved progress strand | DG-01 governs tissue; this is chrome, and a bowed bar lies about position. |
