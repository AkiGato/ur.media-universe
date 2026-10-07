import React from 'react';
import { LivingFigure, FigureNode, FigureEdge } from '../figures/LivingFigure';
import { WITHDRAWAL, DISENGAGEMENT, Datum } from '../../data/trendwatch';

interface WithdrawalDiagramProps {
  isDark?: boolean;
}

const ID = 'fig-withdrawal';

/**
 * TRENDWATCH III — three readings of the same withdrawal, on one scale.
 *
 * DV-06 is the rule that shaped this: when a figure wants a third variable,
 * repeat the figure rather than loading another channel onto it. Three series
 * is also exactly the ceiling DV-02 sets for a monochrome drawing, so the
 * alternative — three series distinguished by three greys — was never
 * available. They are separated by grouping and position, which are the two
 * channels this drawing still has.
 *
 * The three share ONE scale, which is the only reason the comparison means
 * anything: avoidance rising thirteen points and interest falling thirteen are
 * the same distance on the sheet, and a reader can see that they are without
 * being told. That holds in both layouts — there is one `V_MAX` and one
 * anchored zero, and the narrow form turns the scale rather than rescaling it.
 *
 * THE NAME CELLS SIT OFF THE SCALE. Everything else on this sheet is positioned
 * by its value, so a name cell placed anywhere in the plotting band would be
 * read as a reading — the figure would be asserting a quantity it does not
 * have. In the wide form they are parked in a row below the baseline and in
 * the narrow one in a column left of zero; both are places no value could ever
 * fall, and both read as names rather than as data.
 */

const byId = (id: string): Datum => {
  const all = [...WITHDRAWAL.points, ...DISENGAGEMENT];
  const d = all.find((p) => p.id === id);
  if (!d) throw new Error(`trendwatch: no datum ${id}`);
  return d;
};

/* One scale for all three series. */
const V_MAX = 68;
const Y_TOP = 92;
const Y_BASE = 300;
const y = (v: number) => Y_BASE - (v / V_MAX) * (Y_BASE - Y_TOP);

/** Below the baseline, off the value scale entirely — see the note above. */
const NAME_ROW = 334;

const LIT = 0.5;

/**
 * The three bands. What they ARE, with no coordinate in sight.
 *
 * The geometry used to be written into this list, which meant the list could
 * only describe one rectangle. It now describes the figure — three named
 * groups of two readings each — and the two layouts below say where those go.
 */
const BANDS: Array<{ id: string; name: string; points: [Datum, Datum] }> = [
  { id: 'avoid', name: 'AVOIDANCE', points: [byId('avoid-2017'), byId('avoid-2026')] },
  { id: 'interest', name: 'INTEREST', points: [byId('interest-2021'), byId('interest-2026')] },
  { id: 'trust', name: 'TRUST', points: [byId('trust-2025'), byId('trust-2026')] }
];

/** The wide form: the bands side by side, the names in a row underneath. */
const WIDE_NAME_X = [174, 434, 684];
const WIDE_POINT_X = [[130, 218], [390, 478], [640, 728]];

/* ------------------------------------------------------------- portrait --
 *
 * THE BANDS STOP STANDING SIDE BY SIDE AND STACK.
 *
 * Three small multiples across a sheet is the right arrangement for a sheet
 * that is wider than it is tall, and the wrong one for a column: below the
 * drawn floor the wide form scrolled, and a reader could see AVOIDANCE or
 * TRUST but never both — which is the entire content of a figure whose claim
 * is that these three move together. DV-06 asks for the figure repeated rather
 * than a third channel loaded on; it does not ask for the repetitions to be in
 * a row.
 *
 * So the bands stack down the page and the shared scale turns with them. It is
 * STILL ONE SCALE — the same `V_MAX`, the same anchored zero, one function
 * below — which is the only reason the comparison means anything in either
 * form: thirteen points of rise and thirteen points of fall are the same
 * distance on the sheet, and a reader can see that they are without being told.
 *
 * Each pair keeps both separations it has in the wide form. Value moves it
 * along the scale, and the step within the band moves it across the band, so
 * the two readings are never two marks at nearly one place. In the wide form
 * those axes are x and y; here they are y and x; nothing else changes.
 *
 * THE NAMES ARE STILL OFF THE SCALE. Parked left of where a reading of zero
 * would fall, for exactly the reason they are parked below the baseline in the
 * wide form: everything else on this sheet is positioned by its value, so a
 * name cell anywhere a value could land would be read as a reading, and the
 * figure would be asserting a quantity it does not have. No value is negative,
 * so nothing can ever reach that column.
 *
 * THE GAPS ARE THE GROUPING, AND THE GROUPING IS SET BY THE WIRING RULE.
 *
 * Small multiples are made by SPACING and nothing else — DV-02 leaves this
 * drawing no second channel to mark a group with. And the spacing is not a
 * matter of taste here, because LivingFigure's proximity fill JOINS EVERY CELL
 * TO ITS TWO NEAREST NEIGHBOURS whether the figure asked for it or not. The
 * arrangement therefore has to satisfy one property, which the wide form
 * satisfies by accident and a narrow one has to be built to satisfy:
 *
 *   EVERY CELL'S TWO NEAREST NEIGHBOURS ARE IN ITS OWN BAND.
 *
 * Two stackings failed it before this one, and both failed visibly. At a
 * 60-unit step within a band and 96 between them the six cells read as ONE
 * descending series, 29 → 42 → 59 → 46 → 40 → 37 — precisely the claim the
 * wide form's own note refuses to make, that "an edge between them would claim
 * one moves the next". Opening the bands to 160 fixed the readings and not the
 * names: INTEREST's own two points sat 178 and 214 units away, its neighbouring
 * NAMES sat 220, so the fill wired name to name to name and drew a fourth
 * course down the left margin that is in none of the data.
 *
 * At 240 the three names are further from each other than from their own
 * readings, by 26 units at the tightest — INTEREST again, whose first reading
 * is the highest number on the sheet and therefore the furthest right. That is
 * the constraint that sets this figure's height, and it is why the height is
 * 700 rather than something chosen to look comfortable.
 *
 * Counted rather than judged: ONE cell here has a nearest pair reaching out of
 * its band — the 59%, which reaches the 42% at 186 units having already found
 * its own 46% at 70. The wide form has TWO by the same count. So the narrow
 * layout groups these three series at least as tightly as the one that ships,
 * which is the bar it had to clear; a faint bridge or two between groups is
 * what that note means by the fill "bridging the islands in faint tissue", and
 * a chain through all six is an argument. Only the second is being kept out.
 *
 * Each name sits at the middle of its own band, so its two fibres are
 * symmetrical and the band reads as one run rather than as a tail.
 */
const PW = 360;
const PH = 700;
const X_ZERO = 96;
const X_FULL = 290;
const px = (v: number) => X_ZERO + (v / V_MAX) * (X_FULL - X_ZERO);
/** the column left of zero, where no reading can fall */
const NAME_COL = 52;
const BAND_Y = [[100, 160], [340, 400], [580, 640]];
const bandMid = (b: number) => (BAND_Y[b][0] + BAND_Y[b][1]) / 2;

/**
 * One description of the cells, placed twice.
 *
 * Everything that is not a coordinate — the names, the years, the glyphs, the
 * readings, the sources, which of a pair burns brighter — is written once here
 * and both layouts take it. See FigureLayout in LivingFigure for why a second
 * hand-kept node array is not an option.
 */
const build = (
  place: {
    name: (band: number) => { x: number; y: number };
    point: (band: number, i: number, d: Datum) => { x: number; y: number };
    /* Not content. A 68-unit field is a twelfth of the wide sheet and a fifth
       of the narrow one, and six of those at that scale fuse into a grey mass. */
    nameArbor?: number;
    pointArbor?: number;
  }
): FigureNode[] =>
  BANDS.flatMap((b, bi) => [
    {
      id: `name-${b.id}`,
      kind: 'cell' as const,
      ...place.name(bi),
      r: 12,
      ...(place.nameArbor ? { arborR: place.nameArbor } : {}),
      label: b.name,
      labelAt: 'below' as const,
      /* The three names are the taxonomy this figure is of — TY-07. Hidden until
         touch they would leave six cells at six heights and no way to tell which
         line is which. */
      labelAtRest: 0.56,
      intensity: 0.42,
      reading: { kind: b.name, body: b.points[b.points.length - 1].statement }
    },
    ...b.points.map((d, i) => ({
      id: d.id,
      kind: 'cell' as const,
      ...place.point(bi, i, d),
      r: i === 0 ? 15 : 18,
      ...(place.pointArbor ? { arborR: place.pointArbor } : {}),
      label: String(d.year),
      labelAt: 'above' as const,
      labelAtRest: LIT,
      glyph: `${d.value}%`,
      glyphAtRest: 0.8,
      /* The reading, carried in words as well as in the glyph and the position —
         it is what the annotation falls back to, and what survives a cell being
         read rather than looked at. */
      sub: `${b.name.toLowerCase()} ${d.value}%`,
      /* The later reading of each pair burns brighter — it is the one that is
         true now. Light, not data; the reading is the position. */
      intensity: i === 0 ? 0.58 : 0.9,
      reading: { kind: `${b.name} · ${d.year}`, body: d.statement },
      detail: [d.source]
    }))
  ]);

const NODES: FigureNode[] = build({
  name: (b) => ({ x: WIDE_NAME_X[b], y: NAME_ROW }),
  point: (b, i, d) => ({ x: WIDE_POINT_X[b][i], y: y(d.value) })
});

const PORTRAIT_NODES: FigureNode[] = build({
  name: (b) => ({ x: NAME_COL, y: bandMid(b) }),
  point: (b, i, d) => ({ x: px(d.value), y: BAND_Y[b][i] }),
  nameArbor: 24,
  pointArbor: 30
});

/* Each band is one course, read left to right: what it is, where it was, where
   it is. The bands are not wired to each other — they are small multiples, not
   a causal chain, and an edge between them would claim one moves the next.
   LivingFigure's own proximity fill bridges the islands in faint tissue, which
   is the organism holding together rather than an argument. */
const EDGES: FigureEdge[] = BANDS.flatMap((b) => [
  { a: `name-${b.id}`, b: b.points[0].id, weight: 0.8 },
  { a: b.points[0].id, b: b.points[1].id, weight: 1.4 }
]);

export const WithdrawalDiagram: React.FC<WithdrawalDiagramProps> = () => (
  <LivingFigure
    id={ID}
    width={800}
    height={392}
    nodes={NODES}
    portrait={{ width: PW, height: PH, nodes: PORTRAIT_NODES }}
    edges={EDGES}
    core="name-avoid"
    caption=""
    tag=""
    footLeft=""
    footRight=""
    rest={{ kind: WITHDRAWAL.title, body: WITHDRAWAL.caveat }}
  />
);
