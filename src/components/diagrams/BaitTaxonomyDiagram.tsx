import React from 'react';
import { CartesianPlane } from '../figures/FigurePlane';
import { LivingFigure, FigureLayout, FigureNode, FigureEdge } from '../figures/LivingFigure';
import { arcSegment } from '../figures/FigurePrimitives';

interface BaitTaxonomyDiagramProps {
  isDark?: boolean;
}

const ID = 'fig-bait';

/**
 * FIG 1.1 — The -bait taxonomy on the arousal × valence plane.
 *
 * The suffix left the tackle box, passed through marketing, and became a
 * working taxonomy of engineered emotion. The figure is a coordinate system
 * because the taxonomy is one: arousal runs vertically, valence horizontally,
 * and every variant is the same lure aimed at a different feeling.
 *
 * Two things the drawing says that no caption does:
 *
 *   radial   The hook sits at the origin and every term is wired to it, so the
 *            derivation is visible — one mechanism, five aims. `tissue()` gives
 *            each process its taper, so direction is read from thickness and
 *            nothing is ever an arrow.
 *
 *   lateral  The five are also wired to each other in valence order — rage,
 *            fear, click, goon, joy — because that ordering IS the taxonomy.
 *            They differ in which way the spike resolves, never in how hard it
 *            hits, and the chain runs left to right without ever descending.
 *
 * The low-arousal half holds one dim cell reached by a `faint` process: the
 * connection the architecture does not make. Calm, boredom and reflection
 * generate no clicks, so the High-Arousal Filter of 1.3 never selects them, and
 * the emptiness below the axis is the diagnosis rather than spare room.
 *
 * The hook wears a large arbor because that is the neuron-dandelion the burst
 * always wanted to be: an arbor gathers locally around a cell, which is what
 * this is, and it is grown by the same `Dendrites` routine as the map rather
 * than by a bespoke ray generator (see DG-08 — "A Field Is Rays; A Cell Is
 * an Arbor", and the fog its radius-520 version produced on FIG 0.1).
 */

const W = 800;
const H = 340;
/** the plane's origin, and the cell the hook occupies */
const OX = 400;
const OY = 196;

/* ------------------------------------------------------------- portrait --
 *
 * THIS ONE IS A COORDINATE SYSTEM, SO THE PORTRAIT IS A COORDINATE SYSTEM.
 *
 * Every other figure here could be rearranged; this one cannot. Both axes
 * carry meaning — arousal vertical, valence horizontal — so the narrow form is
 * the same plane in a taller rectangle, and every term keeps its position ON
 * IT. What changes is only how many units an axis is given: valence is
 * compressed to 0.42 and arousal stretched to 1.9, about the plane's own
 * origin, so no term crosses the axis it did not cross before and the order
 * along both axes is exactly the order in the wide form.
 *
 * The empty half stays empty. The low-arousal region below the horizontal axis
 * is the diagnosis rather than spare room, so it keeps its share of the sheet
 * rather than being reclaimed for the terms above it — the origin sits at the
 * same fraction of the height in both forms.
 *
 * THE POLES ARE WHAT THE NARROW PLANE ACTUALLY COSTS. UNDESIRABLE EMOTION and
 * DESIRABLE EMOTION are nineteen and seventeen characters at 11.5 units
 * tracked 0.2em; measured, they need about 330 units between them, against a
 * 360-unit sheet with the axis running between. They therefore sit on two rows
 * rather than one, the undesirable pole above the axis and the desirable pole
 * below it. That is a real loss — on the wide sheet the pair reads as one
 * horizontal scale — and the alternatives were worse: shrinking the poles
 * makes the frame of the taxonomy quieter than the five terms it contains,
 * which is the exact fault their own note records being fixed once already.
 */
const P_W = 360;
const P_H = 560;
const P_OX = 180;
const P_OY = 324;
/** valence compressed, arousal stretched, both about the origin */
const P_KX = 0.42;
const P_KY = 1.9;
const px = (x: number) => P_OX + (x - OX) * P_KX;
const py = (y: number) => P_OY + (y - OY) * P_KY;

/**
 * The poles outrank everything drawn on the plane.
 *
 * They were set at 8.5 — the same size LivingFigure gives a cell's own name — so
 * the frame of the taxonomy read as one more label among the five it contains.
 * The axes are what every term is being measured against, and they were the
 * quietest thing on the sheet.
 *
 * Emphasis is bought the only way TY-02 allows: size, tracking, opacity and
 * light, never weight. Caps stay tracked 0.2em of their own size, so the
 * tracking follows the size instead of being restated beside it.
 */
const POLE = 11.5;
const POLE_TRACK = POLE * 0.2;
const SUB = 7.2;

/**
 * The names stay legible at rest.
 *
 * This is the narrow exemption TY-07 grants under "A Taxonomy May Keep Its
 * Names": a figure whose subject *is* a set of named registers has nothing left
 * when the names go, and a taxonomy nobody can read is not a taxonomy. It is
 * spent here and nowhere else — the glyphs still surface only under touch.
 */
const LIT = 0.6;

/**
 * How common each kind is — and how firmly that is known.
 *
 * `share` is an estimated fraction of the engineered-emotion mix, and it is an
 * ESTIMATE rather than a measurement. Clickbait has actually been counted in the
 * headline literature; ragebait and fearbait are well evidenced as
 * algorithmically favoured without ever being cleanly counted by category;
 * goonbait and joybait are vernacular terms nobody has measured at all.
 *
 * Publishing confident percentages across that spread would be a worked example
 * of the thing this chapter diagnoses, and it is the same refusal
 * CausalTaxonomyDemo already makes when it draws an unanswered register dim and
 * says so. So the numbers are round, every one of them surfaces with the word
 * "estimate" attached, and each carries what it actually rests on.
 *
 * The dot encodes the share by AREA, never by radius: a radius taken straight
 * from the value makes a 2x share look 4x larger, which is the oldest lie in a
 * bubble chart. Hence r = base + sqrt(share) x scale.
 */
const R_BASE = 9;
const R_SCALE = 22;
const radiusFor = (share: number) => R_BASE + Math.sqrt(share) * R_SCALE;

const TERMS: Array<{
  id: string; x: number; y: number; label: string; sub: string; glyph: string;
  weight: number; intensity: number; share: number; shareNote: string;
  reading: { kind: string; body: string };
  detail: string[];
}> = [
  {
    id: 'rage', x: 128, y: 84, label: 'RAGEBAIT', sub: 'anger as fuel', glyph: '↯',
    weight: 1.5, intensity: 1, share: 0.25,
    shareNote:
      'Well evidenced as algorithmically favoured — out-group animosity is among the strongest predictors of sharing — but never cleanly counted as a category of its own.',
    reading: {
      kind: 'High arousal · undesirable · rage',
      body: 'Engineered to infuriate — the comment section is the harvest'
    },
    detail: [
      'Content built to be argued with: the objection is the engagement, and the feed cannot tell outrage from interest.',
      'Anger is the highest-velocity sharing emotion, so the filter selects for it structurally, never editorially.'
    ]
  },
  {
    id: 'fear', x: 246, y: 116, label: 'FEARBAIT', sub: 'alarm & doom', glyph: '◬',
    weight: 1.32, intensity: 0.92, share: 0.18,
    shareNote:
      'Common in news framing and much studied as a persuasion lever; no per-category count exists.',
    reading: {
      kind: 'High arousal · undesirable · fear',
      body: 'Designed to scare — the threat layer answers before the person does'
    },
    detail: [
      'Sensationalised warning and doomsday framing address the subcortical hook directly, below deliberation.',
      'Fear does not need to be plausible to work; it only needs to be expensive to ignore.'
    ]
  },
  {
    id: 'click', x: 340, y: 68, label: 'CLICKBAIT', sub: 'withheld payoff', glyph: '❯',
    weight: 1.26, intensity: 0.95, share: 0.35,
    shareNote:
      'The most measured of the five: headline studies have put clickbait characteristics at roughly a quarter to a third of headlines on aggregators.',
    reading: {
      kind: 'High arousal · undesirable · curiosity gap',
      body: 'The original species — a promise built to be unresolvable without the click'
    },
    detail: [
      'The headline opens a loop the body never closes; the click is the product and the content is packaging.',
      'Ancestor of the whole family: every later -bait keeps its grammar and swaps in a different emotion.'
    ]
  },
  {
    id: 'goon', x: 368, y: 130, label: 'GOONBAIT', sub: 'compulsive hold', glyph: '≋',
    weight: 1.1, intensity: 0.88, share: 0.07,
    shareNote:
      'A vernacular term with no measurement behind it at all — the smallest dot here is also the least certain one.',
    reading: {
      kind: 'High arousal · borderline valence',
      body: 'Hyper-stimulation tuned to lock in obsessive focus — pleasure on the hook, depletion on the line'
    },
    detail: [
      'It straddles the axis because it registers as desirable while it costs like the undesirable half.',
      'The lock-in is the point: captured, obsessive focus is the most extractable attention state there is.'
    ]
  },
  {
    id: 'joy', x: 600, y: 84, label: 'JOYBAIT', sub: 'engineered delight', glyph: '✧',
    weight: 0.92, intensity: 0.97, share: 0.15,
    shareNote:
      'Vernacular, and unmeasured. Feel-good content farms are visibly large; how large is not established.',
    reading: {
      kind: 'High arousal · desirable · joy',
      body: 'Built to uplift in one burst — the gentlest hook is still a hook'
    },
    detail: [
      'Wholesome by content and extractive by mechanism: the spike is still a spike, and it still returns you to the feed.',
      'Proof that the horizontal axis does not measure harm — only the vertical one measures what is being spent.'
    ]
  }
];

/**
 * One description of the taxonomy, placed twice.
 *
 * Every name, share, estimate and caveat is written once; `place` supplies the
 * point on the plane, which is the only thing that differs. See FigureLayout in
 * LivingFigure for why this is not two node arrays.
 */
const build = (
  place: (x: number, y: number) => { x: number; y: number },
  hookArbor: number
): FigureNode[] => [
  {
    id: 'hook',
    kind: 'core',
    ...place(OX, OY),
    r: 16,
    /* the dandelion: an arbor, grown by the map's own routine. Held well short
       of the radius that fogged FIG 0.1 — this gathers around a cell, it does
       not claim to be a field, and the arm count is the axis that buys density
       without buying speckle. */
    arborR: hookArbor,
    arborArms: 13,
    label: 'THE HOOK',
    sub: 'fishing → marketing → feed',
    glyph: '⌇',
    labelAt: 'below',
    labelAtRest: LIT,
    reading: {
      kind: 'The lure · the suffix itself',
      body: 'A lure is a meal that is actually a hook, and each variant names which emotion is on it'
    },
    detail: [
      'In fishing, bait is the thing offered so that the taking of it costs the taker.',
      'Marketing borrowed the word for attention; the algorithmic feed industrialised it into a production category.',
      'Every process leaving this cell carries the same mechanism outward to a different feeling.'
    ]
  },
  ...TERMS.map(t => ({
    id: t.id,
    kind: 'cell' as const,
    ...place(t.x, t.y),
    r: radiusFor(t.share),
    label: t.label,
    sub: t.sub,
    glyph: t.glyph,
    labelAt: 'below' as const,
    labelAtRest: LIT,
    intensity: t.intensity,
    reading: t.reading,
    /* the estimate never travels without its caveat */
    detail: [
      `Estimated share of the -bait mix: about ${Math.round(t.share * 100)}% — an estimate, not a measurement. ${t.shareNote}`,
      ...t.detail
    ]
  })),
  {
    id: 'unharvested',
    kind: 'minor',
    ...place(566, 272),
    r: 6,
    label: 'THE UNHARVESTED',
    sub: 'calm · boredom · reflection',
    labelAt: 'above',
    labelAtRest: LIT * 0.72,
    intensity: 0.5,
    reading: {
      kind: 'Low arousal · never selected for',
      body: 'States that generate no clicks are not farmed — which is why this half of the plane is empty'
    },
    detail: [
      'Nothing evolved down here, because nothing down here survives the High-Arousal Filter of Chapter 1.3.',
      'The empty half is the diagnosis: the taxonomy above it maps what the architecture farms, not what a person needs.'
    ]
  }
];

const NODES: FigureNode[] = build((x, y) => ({ x, y }), 104);
const PORTRAIT_NODES: FigureNode[] = build((x, y) => ({ x: px(x), y: py(y) }), 92);

const EDGES: FigureEdge[] = [
  // radial: one mechanism, five aims
  ...TERMS.map(t => ({ a: 'hook', b: t.id, weight: t.weight })),
  // lateral: the valence order, which is the taxonomy
  ...TERMS.slice(0, -1).map((t, i) => ({ a: t.id, b: TERMS[i + 1].id, weight: 0.72 })),
  // the process that is not made: unmyelinated, and it goes nowhere
  { a: 'hook', b: 'unharvested', faint: true }
];

/**
 * The plane itself — technical annotation, drawn behind the tissue.
 *
 * The axes bow. A perfectly straight segment is the one thing nothing in this
 * system is allowed to be (DG-01 — "Never a Straight Line", enforced by
 * `scripts/audits/static/audit-lines.mjs`), so they are `arcSegment`s carrying a gentle live
 * kink rather than ruled segments. The bow is small enough to read as an axis
 * and large enough that the drawing is never machine-ruled.
 */
const Plane: React.FC<{
  ox: number; oy: number; w: number; h: number; inset: number;
}> = ({ ox, oy, w, h, inset }) => (
  <g aria-hidden="true">
    <path d={arcSegment(ox, 30, ox, h - 26, 5)} fill="none" stroke="currentColor"
      strokeWidth={0.45} opacity={0.26} />
    <path d={arcSegment(inset, oy, w - inset, oy, 6)} fill="none" stroke="currentColor"
      strokeWidth={0.45} opacity={0.26} />
  </g>
);

/**
 * The four poles, over the tissue and under the somas.
 *
 * These stay legible at rest for the same reason the names do: an axis whose
 * poles surface only under touch is a coordinate system you have to interrogate
 * before you can read anything placed on it.
 */
const Poles: React.FC<{
  ox: number; oy: number; w: number; h: number; inset: number;
  /* The two valence poles on one row, or stacked either side of the axis. One
     row is right and it does not fit a 360-unit sheet — see the portrait note
     at the top of this file. */
  split?: boolean;
}> = ({ ox, oy, w, h, inset, split = false }) => (
  <g aria-hidden="true">
    <text x={ox} y={18} textAnchor="middle" fill="currentColor"
      fontSize={POLE} fontWeight={300} letterSpacing={POLE_TRACK} opacity={0.7}>
      HIGH AROUSAL
    </text>
    <text x={ox} y={h - 8} textAnchor="middle" fill="currentColor"
      fontSize={POLE} fontWeight={300} letterSpacing={POLE_TRACK} opacity={0.45}>
      LOW AROUSAL
    </text>
    <text x={inset} y={split ? oy - 34 : oy - 10} textAnchor="start" fill="currentColor"
      fontSize={POLE} fontWeight={300} letterSpacing={POLE_TRACK} opacity={0.7}>
      UNDESIRABLE EMOTION
    </text>
    <text x={inset} y={split ? oy - 12 : oy + 14} textAnchor="start" fill="currentColor"
      fontSize={SUB} fontWeight={300} opacity={0.4}>
      anger · fear · outrage · anxiety
    </text>
    <text x={w - inset} y={split ? oy + 26 : oy - 10} textAnchor="end" fill="currentColor"
      fontSize={POLE} fontWeight={300} letterSpacing={POLE_TRACK} opacity={0.7}>
      DESIRABLE EMOTION
    </text>
    <text x={w - inset} y={split ? oy + 48 : oy + 14} textAnchor="end" fill="currentColor"
      fontSize={SUB} fontWeight={300} opacity={0.4}>
      happiness · excitement · satisfaction
    </text>
  </g>
);

const PORTRAIT: FigureLayout = {
  width: P_W,
  height: P_H,
  nodes: PORTRAIT_NODES,
  backdrop: <Plane ox={P_OX} oy={P_OY} w={P_W} h={P_H} inset={10} />,
  overlay: <Poles ox={P_OX} oy={P_OY} w={P_W} h={P_H} inset={8} split />
};

export const BaitTaxonomyDiagram: React.FC<BaitTaxonomyDiagramProps> = () => (
  <LivingFigure
    id={ID}
    width={W}
    height={H}
    nodes={NODES}
    portrait={PORTRAIT}
    edges={EDGES}
    core="hook"
    /*
     * THE THIRD FIGURE THAT EARNS A GRID, AND THE ONLY OTHER ONE.
     *
     * Asked for: check whether any other figure needs a plane behind it. This
     * is the one. It already draws AXES — arousal vertical, valence horizontal,
     * about an origin — so it is a coordinate figure by construction, and a
     * cell's meaning here is literally where it sits in a quadrant. Axes alone
     * say which side of the origin a cell is on; they cannot say how far, and
     * "how far" is what the taxonomy is claiming.
     *
     * The other six are not coordinates and get nothing: the scale mismatch is
     * a field with no axis, the postures are states of one flower, the
     * fragility index and the causal taxonomy are topologies, the Metric Lotus
     * is a set, and the withdrawal figure carries its own vertical scale with
     * its readings quoted on the cells. A grid behind any of those is the
     * "technical backdrop" GR-01 removed, with nothing bought for it.
     *
     * Under its own axes, not instead of them — the axes are the argument and
     * the grid is only the measure.
     */
    backdrop={
      <>
        <CartesianPlane
          at={[OX - 244, OX - 122, OX + 122, OX + 244]}
          top={58}
          bottom={H - 58}
          left={58}
          right={W - 58}
        />
        <Plane ox={OX} oy={OY} w={W} h={H} inset={58} />
      </>
    }
    overlay={<Poles ox={OX} oy={OY} w={W} h={H} inset={58} />}
    caption=""
    tag=""
    footLeft=""
    footRight=""
    /* Without a resting reading the strip falls back to "touch a cell to read
       it", which on the stage is merely redundant and in the page preview is
       untrue. This says what the drawing encodes instead. */
    rest={{
      kind: 'One hook, five aims',
      body: 'Dot area is the estimated share of the mix — touch a cell for the estimate and what it rests on'
    }}
  />
);
