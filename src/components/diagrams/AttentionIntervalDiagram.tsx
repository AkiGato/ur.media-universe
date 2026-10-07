import React from 'react';
import { LivingFigure, FigureNode, FigureEdge } from '../figures/LivingFigure';
import { ATTENTION, Datum } from '../../data/trendwatch';
import { CartesianPlane } from '../figures/FigurePlane';

interface AttentionIntervalDiagramProps {
  isDark?: boolean;
}

const ID = 'fig-attention-interval';

/**
 * TRENDWATCH I — the interval, on a common vertical scale.
 *
 * The first figure in this document that carries a QUANTITY rather than a
 * topology, which is the whole reason it needed arguing about before it was
 * drawn. Three constraints meet here and only one arrangement satisfies all
 * three:
 *
 *   DV-01  magnitude goes on position, always — never on radius, never on
 *          opacity. So the reading is the cell's height and nothing else.
 *   GR-01  the ground is black and NOTHING is drawn on it: no grid, no rule,
 *          no ticks. Which removes the axis a chart would normally use to make
 *          a position legible.
 *   FW-04  the glyph exception — a magnitude that is the figure's whole
 *          argument stays legible at rest.
 *
 * Take them together and the axis is not missing, it is redundant: each cell
 * carries its own reading as a glyph and its own year as a name, so position
 * does the comparing and the glyph does the quoting. A ruled scale would say
 * the same numbers a second time (TY-05) against a rule that may not exist
 * (GR-01). This is the pattern every trendwatch figure uses.
 *
 * The names stand at rest under TY-07. In a time series the pairing of year to
 * reading IS the claim — a fall from 150 to 47 says nothing without the twenty
 * years it happened over — so hiding the years until touch would leave three
 * cells at three heights and no argument.
 */

/* The scale. `V_MAX` is above the highest reading rather than equal to it, so
   the topmost cell is not jammed against the frame; `Y_BASE` sits above the
   caption strip. Both are geometry, not data. */
const V_MAX = 168;
const Y_TOP = 92;
const Y_BASE = 296;
const y = (v: number) => Y_BASE - (v / V_MAX) * (Y_BASE - Y_TOP);

/* Spacing proportional to elapsed time: 2004→2012 is eight years and 2012→2021
   is nine, so the second gap is drawn 9/8 of the first. Spacing the three cells
   evenly would draw a constant rate of change the data does not have.

   IT DID NOT DELIVER WHAT IT CLAIMED. The positions were 148 / 404 / 664 —
   gaps of 256 and 260, a ratio of 0.985 against the 0.889 the years actually
   have. The comment asserted proportional spacing and the numbers drew an even
   one, which is the quietest kind of wrong: a figure whose geometry disagrees
   with its own note, in the one direction a reader cannot check by eye.
   516 units over seventeen years puts the middle cell at 391. */
const X: Record<string, number> = {
  'attn-2004': 148,
  'attn-2012': 391,
  'attn-2021': 664
};

/* ------------------------------------------------------------- portrait --
 *
 * THE FIGURE TRANSPOSED, NOT SHRUNK AND NOT SUMMARISED.
 *
 * Below the drawn floor the wide form used to scroll sideways, which keeps a
 * three-point series readable one point at a time and destroys the only thing
 * it has to say: this reading is lower than that one. A comparison you cannot
 * see both ends of is not a comparison.
 *
 * So the two axes swap. Magnitude moves to the horizontal and time runs down
 * the page, which is the one rearrangement that costs the figure nothing:
 *
 *   DV-01  is satisfied either way. It fixes magnitude to POSITION and says
 *          nothing about which axis position runs along — it is radius and
 *          opacity that are forbidden, and neither is touched here.
 *   GR-01  is why the transpose is free. A charted quantity normally cannot be
 *          turned on its side without re-ruling and re-labelling an axis; this
 *          figure has no axis to re-rule, because it is not allowed one. The
 *          glyph quotes the reading and the name carries the year, in both
 *          forms, unchanged.
 *
 * Zero is anchored in both forms — `X_ZERO` is where a reading of nothing
 * would sit, exactly as `Y_BASE` is — so the ratio between two readings is
 * the ratio between two distances on either sheet. Anchoring the low end at
 * the lowest reading instead would have drawn a 47 as a third of a 75 in one
 * form and a twentieth in the other, out of the same numbers.
 *
 * The spacing stays proportional to elapsed time, now downward: 432 units over
 * seventeen years, so the second gap is 9/8 of the first here as well. It is
 * the same arithmetic the wide form got wrong once and it is written once,
 * below, so it cannot be got wrong twice.
 */
const PW = 360;
const PH = 600;
/* MEASURED, AND WIDENED ONCE. At 90/272 the tissue spanned x 99–297 of 360 —
   55% of the sheet, with 63 units of nothing on the right and the three
   readings pressed into 112 units of the one channel that carries the figure's
   whole content. Anchoring zero nearer the edge and running the scale out to
   306 puts the spread at 163 units, a 45% wider reading, and leaves the drawn
   tissue at 66–336. The margin before zero is margin; it is not evidence, and
   it was being paid for in the only currency this figure has. */
const X_ZERO = 40;
const X_FULL = 306;
const px = (v: number) => X_ZERO + (v / V_MAX) * (X_FULL - X_ZERO);
const T_TOP = 88;
const T_BASE = 520;
const YEARS = ATTENTION.points.map((p) => p.year);
const SPAN = YEARS[YEARS.length - 1] - YEARS[0];
const py = (year: number) => T_TOP + ((year - YEARS[0]) / SPAN) * (T_BASE - T_TOP);

/**
 * THE YEARS ARE THE AXIS NOW, SO THEY ARE READ RATHER THAN DISCOVERED.
 *
 * 0.5 was a taxonomy's resting weight under TY-07, and the figure's own note
 * already argued these must stand at rest — in a time series the pairing of
 * year to reading IS the claim. They now also label the divisions of a plane,
 * and a coordinate whose axis you cannot read is a coordinate nobody can use —
 * on screen at 1200x843 the three years were simply not legible against the
 * emitters' glow. 0.86 matches the dimension names on the trajectories figure,
 * so the two trendwatch sheets label their axes at one weight.
 */
const LIT = 0.86;

/**
 * One list of cells, placed twice.
 *
 * Everything that is not a coordinate — the ids, the years, the glyphs, the
 * readings, the falling brightness — is written once and both forms take it.
 * The alternative is two node arrays, and a second hand-kept copy of a series
 * is exactly how a figure ends up telling a phone something it does not tell a
 * desk. See FigureLayout in LivingFigure.
 *
 * The arbor is the one thing that is not shared, and it is not content: a 72
 * unit field is a tenth of the wide sheet and a fifth of the narrow one, and
 * three of those overlapping at that scale fuse into the grey mass DG-02 spends
 * every other rule avoiding. The cells keep their radii — a phone gets the
 * larger touch target, which is what MO-08 asks for — and the fields come in.
 */
const cells = (place: (p: Datum) => { x: number; y: number },
               arbor?: (i: number) => number): FigureNode[] =>
  ATTENTION.points.map((p, i) => ({
    id: p.id,
    kind: i === 0 ? ('core' as const) : ('cell' as const),
    ...place(p),
    /* Constant radius. A radius that grew with the reading would encode the same
       magnitude twice, once on the accurate channel and once on the worst one
       (DV-01 — area makes the reader estimate a square root). */
    r: i === 0 ? 24 : 19,
    ...(arbor ? { arborR: arbor(i) } : {}),
    label: String(p.year),
    labelAt: 'below' as const,
    labelAtRest: LIT,
    glyph: `${p.value}s`,
    glyphAtRest: 0.82,
    /* THE SECOND LINE IS THE READING, AND IT TRAVELS.
       This figure puts its whole measurement in the glyph and its position, so
       any form that lost the drawing lost the argument with it — three years
       and no numbers is not a degraded figure, it is a meaningless one. The
       portrait form keeps both, which is the point of it; `sub` survives from
       when the narrow form was a list, and is what the annotation falls back
       to for a cell with no considered sentence of its own. */
    sub: `${p.value} seconds`,
    /* Brightness falls with the series, so the drawing dims as the interval
       shortens. This is light, not data — the reading is the height — but a
       figure whose subject is depletion should not brighten as it depletes. */
    intensity: 0.55 + (p.value / V_MAX) * 0.45,
    reading: { kind: `${p.year} · ${ATTENTION.unit}`, body: p.statement },
    detail: [p.source]
  }));

const NODES: FigureNode[] = cells((p) => ({ x: X[p.id], y: y(p.value) }));

const PORTRAIT_NODES: FigureNode[] = cells(
  (p) => ({ x: px(p.value), y: py(p.year) }),
  (i) => (i === 0 ? 58 : 48)
);

/* Time, drawn as one process. `tissue()` tapers pre → post, so the fibre thins
   in the direction the years run and the polarity says which way to read it
   without an arrowhead (FW-02, OG-03). */
const EDGES: FigureEdge[] = [
  { a: 'attn-2004', b: 'attn-2012', weight: 1.5 },
  { a: 'attn-2012', b: 'attn-2021', weight: 1.2 }
];

export const AttentionIntervalDiagram: React.FC<AttentionIntervalDiagramProps> = () => (
  <LivingFigure
        /* A READING, NOT AN ORGANISM — taut filaments and light emitters.
           See the grammar note on LivingFigureProps. */
        grammar="emitter"
    id={ID}
    width={800}
    height={368}
    nodes={NODES}
    portrait={{
      width: PW, height: PH, nodes: PORTRAIT_NODES,
      /* Time runs down the page here, so the named divisions lie down with it.
         The figure does not re-rule itself for the narrow sheet — it says which
         way it turned and the plane turns with it. */
      backdrop: (
        <CartesianPlane
          at={YEARS.map(py)}
          divisions="horizontal"
          top={T_TOP - 22}
          bottom={T_BASE + 26}
          left={X_ZERO - 8}
          right={X_FULL + 18}
        />
      )
    }}
    edges={EDGES}
    core="attn-2004"
    caption=""
    tag=""
    footLeft=""
    footRight=""
    /* The caveat is what the figure says when nothing is touched, because it is
       the sentence most easily lost: the drawing already states the fall, and
       the fall is the thing that gets misquoted as a fact about brains. */
    rest={{ kind: ATTENTION.title, body: ATTENTION.caveat }}
    /*
     * THE PLANE THE READING IS TAKEN AGAINST.
     *
     * This figure's own note argued the axis was not missing but REDUNDANT:
     * each cell quotes its reading as a glyph and its year as a name, so a
     * ruled scale would say the same numbers twice (TY-05) against a ground
     * GR-01 does not allow one on. Both halves of that were true and the
     * conclusion still did not hold — reported plainly, the graph is not clear.
     *
     * What the glyphs cannot do is make a DISTANCE legible. "150s" and "47s"
     * quote two numbers; what the figure is for is the shape of the fall
     * between them, and a height with nothing behind it is a dot at a height.
     * The plane does only that: it is unnumbered, so nothing is said twice, and
     * the cells keep every word they had.
     *
     * The divisions are the three years, which is the axis the reader counts
     * along and which the cells already name; the scale crossing them is
     * unlabelled. Zero is the foot of the plane, so the ratio between two
     * readings is the ratio between two heights on it — the same anchoring the
     * portrait form's `X_ZERO` already keeps.
     */
    backdrop={
      <CartesianPlane
        at={ATTENTION.points.map((p) => X[p.id])}
        top={Y_TOP - 18}
        bottom={Y_BASE + 26}
        left={64}
        right={748}
      />
    }
  />
);
