# Data Visualisation · `DV`

Universal principles for encoding data, and what each one costs or gives in a
drawing that has no colour.

[← docs](README.md) · [design rules](design/00-index.md)

---

This file is not a tenth rules file. The rules in [`design/`](design/00-index.md)
say what a mark in this app **may be**; these say what a mark **means** when it
carries a number. They are the general literature, written down here so a figure
can be argued about against something other than taste — and, more usefully,
so the places where this project *cannot* follow the standard advice are stated
rather than discovered.

The constraint that shapes everything below: **this drawing is monochrome**
(GR-05 — ink is black and white, hue exists only in emitted light). Most
published visualisation guidance spends its colour budget first. Here there is
none to spend, so every job colour usually does has to be done by something
else, and saying which is the whole point of this document.

---

## DV-01 — Rank the Channel to the Job

Visual channels are not interchangeable. For **magnitude** — how much, how many,
how far — the accurate channels are, in order: position along a common scale,
then length, then angle, then area, then colour value. For **identity** — which
category is this — the channels are shape, grouping, texture and hue.

Using a magnitude channel for identity, or the reverse, is the most common way a
correct chart becomes unreadable: area for a count makes the reader estimate a
square root, and hue for an ordered series makes them invent a rank that is not
in the data.

**Here:** magnitude goes on position, always. The antifragility trajectory puts
a reading on a common vertical scale; the Restoration Delta puts two readings on
one and draws the span between them. Neither encodes a quantity as a radius, and
neither may — a bright dot is a point in this grammar (DG-02), not a measurement.

## DV-02 — Identity Without Colour

With hue unavailable, categories are separated by **position, grouping, shape
and density**. This is a real limit and it binds the number of categories
tightly: three to five is the practical ceiling for any encoding, and without
colour it is nearer three.

The document's own taxonomies are already built this way — three cognitive
postures, three roots, four fractures, five metrics — so the constraint and the
material agree. Where a figure needs more categories than the channels can
carry, the answer is to split it, not to find a fifth grey.

**Never encode a category as an opacity step.** Opacity in this app means
*light*: the tide, the register, what is being touched. A drawing that also uses
it for identity has two meanings on one channel, and the reader cannot tell a
dim category from a category at the trough of its own breath.

## DV-03 — Colour Is for Ordered Data, and This App Has None

The standard advice: qualitative scales for categories (and only three to five
of them), sequential scales for ordered data, diverging scales for data with a
meaningful midpoint, and every one of them checked against the common colour
vision deficiencies — roughly 8% of men — so that the encoding survives without
hue.

**This app passes that check by construction.** There is no categorical hue and
no sequential ramp; the one place colour exists is emitted light, under a
measured saturation ceiling, and it never carries data. A figure here is already
the greyscale fallback that accessible palettes are tested against.

The cost is stated in DV-02 and is real: the channel is spent, so it cannot be
called on later. Anything wanting a sixth category needs a different figure.

## DV-04 — Planar, Never Perspectival

Human cognition reads a plane far faster than a projection. Unwarranted 3D —
extruded bars, tilted pies, perspective scatter — makes every quantity ambiguous
because the reader must undo the projection before comparing anything. Angled or
rotated text costs the same way: it is read more slowly and remembered worse.

**Here:** every figure is planar. The one case that looks like an exception —
FIG 0.1's field, which recedes — is not encoding a quantity in that recession;
it is drawing a space that does not stop (DG-09), and nothing is measured
against it. Where a figure has a far plane, FW-05 already requires it to carry
no names.

Text stays horizontal. The map's chapter numerals and a taxonomy's labels are
set upright at every zoom.

## DV-05 — Order Is an Encoding

An unordered list of categories is a decision not to help. Order by the value
being shown, or by a sequence the data actually has — chronology, the document's
own argument, a spine — and keep that order across every figure that shows the
same set.

**Here:** the Fragile → Robust → Antifragile spine orders the map's radii, the
antifragility trajectory's bands and the chapters themselves. Any figure
introducing a different order for the same three is introducing a claim.

## DV-06 — Small Multiples Before More Channels

When a figure wants a fourth or fifth variable, repeat the figure instead of
loading another channel onto it. Small multiples let the reader compare like
with like using position alone, which is the most accurate channel available.

This is the cheapest fix for the monochrome limit in DV-02, and it is what the
six figures already are at the document scale: one grammar, repeated, each
instance carrying one argument.

## DV-07 — Interaction Is for Detail, Never for the Claim

Zoom, hover and highlight are for detail on demand. **The claim a figure makes
must survive with every interaction unused** — a reader who never touches it
should still get the argument, because most never will, and a printed or
screenshotted figure has no interactions at all.

**Here:** this is TY-06 and FW-04 from the other side. Names surface under touch
because the drawing is legible without them; the taxonomy keeps its labels at
rest precisely because in that one figure the naming *is* the claim (TY-07).
Touch adds the reading, never the point.

## DV-08 — Every Figure Earns Its Place in the Argument

Consistency across a set, without repetition: the same grammar, the same order,
the same channels meaning the same things — but each figure making a claim the
others do not. A figure that restates its neighbour is a figure to delete, and a
chart that is decorative is one the reader has to work out is decorative.

**Here:** FW-01 holds the grammar constant, and [`OPEN.md`](OPEN.md) is where a
figure whose argument has drifted from its section gets recorded. A figure with
no argument of its own does not get drawn.

---

## Sources

The principles above are the common ground of the standard references; the
application to a monochrome, non-scrolling, filament-only drawing is this
project's own.

- **Data Visualization Rules** — Springer. Practical and theoretical guidance by
  chart type and analysis category.
  <https://link.springer.com/content/pdf/10.1007/978-1-4842-8942-6_6.pdf>
- **Fundamentals of Data Visualization** — Claus O. Wilke. Mapping data to
  visuals, colour use, chart selection.
  <https://schulich.yorku.ca/wp-content/uploads/2023/04/Data-Visualization-Principles.pdf>
- **Visualization Analysis & Design** — Tamara Munzner, UBC. Visual channels,
  cognitive load, layout.
  <https://www.cs.ubc.ca/~tmm/talks/vad/VAD-rules.pdf>

## Where this sits

These are **principles**, not audited rules. Nothing in `npm run lint` checks
them, and that is deliberate: DV-01 and DV-05 are judgements about meaning, and
an audit that claimed to check them would only be checking a proxy. What the
audits do cover is the grammar underneath — no straight segments, no filled
areas, label collisions, sizes and tracking — which is
[`scripts/README.md`](../scripts/README.md).

When one of these principles and a `design/` rule disagree, the design rule
wins and the disagreement goes in [`OPEN.md`](OPEN.md). `design/` is the record
of what this specific drawing has already cost somebody; this file is the record
of what is generally true.
