import React from 'react';
import { LivingFigure, FigureNode, FigureEdge } from '../figures/LivingFigure';
import { rnd, smoothPolyline, arcSegment } from '../figures/FigurePrimitives';

interface MediaUniverseDiagramProps {
  isDark?: boolean;
}

const ID = 'fig-universe';

/**
 * FIG 0.1 — Media as an observer-relative space.
 *
 * Media is not a source you face; it is a space you are inside, and — like
 * spacetime — it has no absolute centre. There is only ever *a* centre, and it
 * is whoever is observing. So the drawing has no left and no right and nothing
 * to stand outside of: one cell at the middle, its field running out past every
 * edge of the sheet, and the reader placed where the model puts them.
 *
 * THE FIELD IS RAYS, NOT AN ARBOR — and this is the whole lesson of the first
 * attempt, which drew it as one enormous dendrite (20 arms, four generations,
 * radius 520) and produced fog. `growDendrite` curls every segment by ±0.35 rad
 * and forks by ±0.42–0.72; over four generations the outward bearing randomises
 * completely, so what should have been *space reaching past the frame* rendered
 * as uniform speckle with a knot in the middle. Measured: 2.5% ink coverage,
 * flat in every direction, no radial read at all. An arbor is the right shape
 * for a cell, which branches to gather locally, and the wrong shape for a field,
 * which must hold its bearing to say *outward*.
 *
 * So the field is drawn as long rays that keep their heading: each wanders — it
 * must, nothing here is ever a straight line — but the wander is a slow bearing
 * drift that never overcomes the radial direction, and the ray is chained in
 * segments that thin and dim as they go until they are gone. There is no rim,
 * no ring and no terminal: the sheet crops something already dissolving, which
 * is how a finite frame shows a space that does not stop.
 *
 * Everything else follows the same argument:
 *
 *   both ways     You absorb and you produce, so you *are* media. Every process
 *                 to a network cell carries light out and back (`both`) as a
 *                 relay — stations sharing one clock, firing outward in sequence
 *                 then back. Neither end is the source.
 *
 *   many centres  Each network cell has its own field, because each is a centre
 *                 too. A satellite with no field would quietly restore the
 *                 privileged frame the model denies.
 *
 *   distortion    Nothing is concentric and nothing is evenly spaced. The
 *                 distortion is the geometry, not an effect over it.
 *
 * Text: the sum, and nothing else. Names still surface under touch exactly as
 * they do on the map — see the formula block below for why the sum does not.
 */

const CX = 400;
const CY = 170;

/** the sheet is wider than it is tall; the space is not */
const KX = 1.30;
const KY = 0.78;

const pt = (a: number, r: number): [number, number] => [
  CX + Math.cos(a) * r * KX,
  CY + Math.sin(a) * r * KY
];

/* --------------------------------------------------------------- the field */

/** past the far corner of the frame, so every ray is cut rather than ended */
const HORIZON = 520;

/**
 * One ray of the field.
 *
 * A slow bearing drift, growing with distance so the near end stays honestly
 * radial and the far end wanders — which is what perspective on a disordered
 * space looks like. Two frequencies only: more and it reads as noise, which is
 * the failure this replaced.
 */
function ray(a: number, seed: number): Array<[number, number]> {
  const p1 = rnd(seed) * 6.283;
  const p2 = rnd(seed + 7) * 6.283;
  const amp = 0.10 + rnd(seed + 3) * 0.13;
  /* The field begins OUTSIDE the structure it bends around.

     Rays used to start at 22 — effectively on the core — so every one of the
     46 crossed the whole drawing, and the thing the figure exists to show (one
     centre, the other centres it sums over, the courses between them) was drawn
     underneath all of them. The field is what the sum is bent BY; it is not a
     term you read, and it was the loudest mark on the sheet.

     Starting it past the core arbor leaves the middle legible and costs the
     argument nothing: the rays still hold their bearing and still run out past
     every edge, which is the whole claim ("a space that does not stop"). */
  const start = 82 + rnd(seed + 11) * 26;
  const end = HORIZON * (0.72 + rnd(seed + 5) * 0.5);
  const N = 16;
  const pts: Array<[number, number]> = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const drift = (Math.sin(t * 2.3 + p1) * 0.72 + Math.sin(t * 5.1 + p2) * 0.28) * amp * t;
    pts.push(pt(a + drift, start + t * (end - start)));
  }
  return pts;
}

/**
 * The field, drawn behind the tissue.
 *
 * Each ray is chained in six pieces so it can thin and dim along its length —
 * the same device `tissue()` uses for taper, which is how direction is read
 * everywhere else in this organism. Opacity falls as (1-t)^0.85: below 1 so the
 * middle distance keeps its ink and only the far end lets go.
 */
const RadialField: React.FC = () => {
  const out: React.ReactNode[] = [];
  /* 46 rays was tuned when they were the only thing in the outer field. With
     the sum drawn under them it read as noise over a diagram; 32 still says
     "without end" and lets the centres be counted. */
  const RAYS = 32;
  const SEGS = 6;

  for (let i = 0; i < RAYS; i++) {
    /* golden angle rather than an even fan: an even fan reads as a sunburst,
       and a sunburst is a graphic device, not a space */
    const a = i * 2.399963229728653 + rnd(i + 31) * 0.16;
    const pts = ray(a, i * 13 + 5);
    /* The field is the medium the sum is bent by, not a term you count, so it
       sits under the cells rather than beside them. At 0.30-0.46 the rays were
       the brightest thing on the sheet and the six other centres could not be
       picked out of them at all — which made the figure unreadable as an
       illustration of Σ over those centres. GR-04: when the drawing is hard to
       read, empty what is behind it before touching what is in front. */
    const bright = 0.19 + rnd(i + 17) * 0.11;

    for (let s = 0; s < SEGS; s++) {
      const from = Math.floor((s / SEGS) * (pts.length - 1));
      const to = Math.ceil(((s + 1) / SEGS) * (pts.length - 1));
      const seg = pts.slice(from, to + 1);
      if (seg.length < 2) continue;
      const t = s / (SEGS - 1);
      const fade = Math.pow(1 - t, 0.85);
      if (fade < 0.02) continue;
      out.push(
        <path
          key={`r${i}s${s}`}
          d={smoothPolyline(seg)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={0.62 * (1 - t * 0.68)}
          opacity={bright * fade}
        />
      );
    }

    /* varicosities, sparse and only on the near half — the grain that makes a
       line read as tissue rather than as a drawn vector */
    for (let b = 2; b < 9; b++) {
      if (rnd(i * 7 + b * 19) > 0.30) continue;
      const q = pts[b];
      const t = b / 16;
      out.push(
        <circle key={`r${i}b${b}`} cx={q[0].toFixed(1)} cy={q[1].toFixed(1)}
          r={0.4} fill="currentColor" opacity={bright * Math.pow(1 - t, 0.85) * 1.1} />
      );
    }
  }
  return <g>{out}</g>;
};

/* ------------------------------------------------------------- the cells */

/* Your network: six other centres, at deliberately unequal radii and angles.
   An even ring would read as a diagram of a network; unevenness reads as a
   neighbourhood, which is what a nebula is. */
const NET: Array<[number, number]> = [
  [0.55, 150], [1.75, 104], [2.62, 178], [3.55, 120], [4.55, 186], [5.42, 132]
];

const NETWORK: FigureNode[] = NET.map(([a, r], i) => {
  const [x, y] = pt(a, r);
  return {
    id: `net${i}`,
    kind: 'cell' as const,
    x, y,
    /* Each of these is one term of the sum. They were r:8 against a field at
       nearly their own brightness and read as more field; the sum is only
       legible if its terms can be counted at a glance. */
    r: 10,
    /* its own field, at its own scale — a centre, not a satellite. An arbor is
       right here: at this size it reads as a cell gathering locally, which is
       exactly what it is. */
    arborR: 46 + (i % 3) * 9,
    arborArms: 8,
    intensity: 1 - (i % 3) * 0.04,
    reading: {
      kind: 'Your network · another centre',
      body: 'They produce as you do, and the field reaches them at a different angle'
    },
    detail: [
      'Every member of a network is the middle of their own media space, not a point in yours.',
      'What reaches them is the same field arriving on a different bearing, so it is not the same field.'
    ]
  };
});

/* The wider field: other observers you will never meet, several cut by the
   frame. They recede into the far plane, so the eye reads depth. */
const FIELD: FigureNode[] = Array.from({ length: 9 }, (_, i) => {
  const t = (i + 0.5) / 9;
  const a = 1.1 + i * 2.399963229728653;
  const [x, y] = pt(a, 235 + Math.sqrt(t) * 130);
  return {
    id: `far${i}`,
    kind: 'minor' as const,
    x, y,
    r: 3.4 + (i % 3) * 0.7,
    arborR: 22 + (i % 3) * 6,
    intensity: 0.62 - t * 0.12,
    reading: {
      kind: 'The field · media without end',
      body: 'Every point in it is the centre of someone you will never meet'
    }
  };
});

/* Declaration order is reading order, not paint order: the far field is drawn
   behind everything by `renderCells`, which partitions on `kind` rather than on
   position, so the centre can come first — where the argument starts, and where
   the narrow-width spine needs it. */
const NODES: FigureNode[] = [
  {
    id: 'you',
    kind: 'core',
    x: CX, y: CY,
    r: 17,
    /* A cell, not a field. The field is `RadialField`, drawn behind everything;
       this arbor only has to say "there is a cell here", and the first attempt's
       radius-520 version said "there is fog here" instead. */
    arborR: 58,
    arborArms: 10,
    reading: {
      kind: 'You · wherever you are is a centre',
      body: 'Media has no middle, so the only middle it has is whoever is observing'
    },
    detail: [
      'The field arrives from every direction at once and you return to it continuously.',
      'You produce, therefore you are media — not its audience, and not outside it. P(you) is never zero, which is the whole of that argument.',
      'U(you) = Σ P(everyone) · d(angle, distance). The sum runs over every other centre; d is what their output becomes by the time it reaches yours.',
      'Two consequences fall straight out of it. U(you) ≠ U(anyone else), because no two positions share a set of angles — the distortion is the geometry, not an effect laid over it. And because every term of the sum is another centre’s P, a network is not an audience: it is the sum computing itself.',
      'Move, and the centre moves with you: nothing here is a fixed frame.'
    ]
  },
  ...NETWORK,
  ...FIELD
];

/* Every process carries light out and back, because neither end is the source.
   The cluster links make a neighbourhood out of six separate cells: your
   network is media to each other, not only to you. */
/* Every process carries light out and back, because neither end is the source —
   and it carries several exchanges at once, because the claim is not that a
   message occasionally passes but that the traffic never stops. Your own fibres
   are the busiest: you are reached and you produce continuously. The cluster
   links run a shade quieter, which is the honest asymmetry — you see all of your
   own exchanges and only some of theirs. */
/* ────────────────────────────────────────────────────────────── the formula
 *
 * U(you) = Σ P(everyone) · d(angle, distance)
 *
 * It was already here, in two places a reader could only reach by working for
 * it: the core cell's `detail`, which needs the cell pressed, and `rest.body`,
 * which prints it in the strip under the drawing. The strip is a caption. The
 * claim the whole figure exists to make is the sum itself, so the sum is now
 * set in the drawing, at rest, with each term joined to the thing it denotes.
 *
 * This overturns a decision recorded in this file — "No text: no caption, tag,
 * foot, names or magnitudes", and "the figure is wordless by design, and stays
 * so" — and it is the narrow case TY-07 allows: a figure whose argument IS the
 * naming keeps its names at rest. Every word below is the manuscript's own,
 * lifted from the readings already on these cells (TY-04); nothing is written
 * for the drawing.
 *
 * NO ARROWHEADS (FW-02). A term reaches its meaning the way everything reaches
 * anything here: a filament that tapers as it goes and lands in one bright
 * terminal. Every leader is an `arcSegment`, never a ruled line (DG-01).
 *
 * THE GROUND UNDER A WORD. The field runs past every edge of this sheet, so
 * there is no empty band to put type in and nothing to be gained by thinning
 * the drawing. The ground under the words is emptied instead — the same move,
 * and the same justification, as the vignette and the map's caption plate: it
 * darkens toward the black the figure already sits on and can only ever
 * subtract light, so it cannot lift the ground (GR-04, GR-07).
 */

/**
 * The sum sits in a band UNDER the field, not inside it.
 *
 * It was set across the middle of the drawing first, which put the terms over
 * the densest tissue and made the figure read as a diagram with a caption laid
 * on top of it. The frame is taller instead: the field keeps the space it had
 * and the sum gets its own, so what is above is the drawing and what is below
 * is the sum, and the leaders between them are the only thing crossing.
 */
const FY = 372;

/** where the drawing actually is, once the frame is taller than the field */
const RIM: React.CSSProperties = {
  ['--rim-cy' as string]: '40%',
  ['--rim-clear' as string]: '70%'
};

/** viewBox units, not pixels: this is a drawing that zooms (TY-02) */
const TERM = 21;
const GLOSS = 11;

/**
 * Each term, where it sits on the line, and what in the drawing it means.
 * `to` is the point the leader lands on; `gx`/`gy` is where the gloss sits.
 */
const TERMS: Array<{
  text: string; x: number; gloss: string; gx: number; gy: number;
  to: [number, number]; bend: number;
  /** extra landings, for the one term that denotes a set rather than a thing */
  fan?: Array<[number, number]>;
}> = [
  {
    text: 'U(you)', x: 191,
    gloss: 'wherever you are is a centre', gx: 180, gy: 400,
    to: [CX, CY + 26], bend: 40
  },
  {
    text: 'Σ', x: 273,
    gloss: 'over every other centre', gx: 280, gy: 421,
    to: [258, 132], bend: 30,
    /* the rest of the centres the sum runs over — NET, in figure coordinates */
    fan: [[199, 239], [376, 250], [511, 92], [566, 231]]
  },
  {
    text: 'P(everyone)', x: 355,
    gloss: 'what everyone else produces', gx: 400, gy: 400,
    to: [566, 231], bend: -30
  },
  {
    text: 'd(angle, distance)', x: 545,
    gloss: 'bent by where it reaches you from', gx: 640, gy: 400,
    /* The bending happens on the way, not at the far end, so this lands on the
       course between another centre and you rather than on the centre itself. */
    to: [676, 168], bend: -38
  }
];

/** the operators, which denote nothing and so point at nothing */
const OPERATORS: Array<{ text: string; x: number }> = [
  { text: '=', x: 240 },
  { text: '·', x: 435 }
];

const Formula: React.FC = () => (
  <g aria-hidden="true">
    {/* the emptied ground, feathered so it never becomes an edge */}
    <defs>
      {/* The emptied ground under the sum takes the theme's ground for the
          same reason the rim does: hardcoded black, it was a dark smudge lying
          across a white sheet in the light theme. */}
      <radialGradient id={`${ID}-plate`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" style={{ stopColor: 'rgb(var(--fig-ground-rgb, 0 0 0))' }} stopOpacity="0.94" />
        <stop offset="62%" style={{ stopColor: 'rgb(var(--fig-ground-rgb, 0 0 0))' }} stopOpacity="0.82" />
        <stop offset="100%" style={{ stopColor: 'rgb(var(--fig-ground-rgb, 0 0 0))' }} stopOpacity="0" />
      </radialGradient>
      {/* A leader is a line arriving among lines, and the field it crosses is
          made of nothing but lines, so the landing needs to be a light rather
          than a line-end — that is the one thing the tissue around it is not.
          DG-02 allows it for the same reason it allows a soma: this is a light
          source, not a filled area. */}
      <radialGradient id={`${ID}-land`}>
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.85" />
        <stop offset="38%" stopColor="currentColor" stopOpacity="0.22" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx={400} cy={FY + 14} rx={330} ry={62} fill={`url(#${ID}-plate)`} />

    {/* every leader: tapering, bowed, landing in one bright terminal */}
    {TERMS.map(t => (
      <g key={`lead-${t.text}`}>
        <path d={arcSegment(t.x, FY - 26, t.to[0], t.to[1], t.bend)}
          fill="none" stroke="currentColor" strokeWidth={1.05}
          strokeLinecap="round" opacity={0.34} />
        <path d={arcSegment(t.x, FY - 26, t.to[0], t.to[1], t.bend)}
          fill="none" stroke="currentColor" strokeWidth={0.4}
          strokeLinecap="round" opacity={0.72} />
        <circle cx={t.to[0]} cy={t.to[1]} r={9} fill={`url(#${ID}-land)`} />
        <circle cx={t.to[0]} cy={t.to[1]} r={2.3} fill="currentColor" opacity={0.95} />

        {/* Σ is the only term that does not denote one thing. It runs over
            every other centre, so it reaches every other centre — a fan from
            one origin, which is what a sum looks like when it is drawn rather
            than written. Thinner than the single-referent leaders, because six
            lines at full weight would be a starburst of their own. */}
        {t.fan?.map(([fx, fy], fi) => (
          <g key={`fan-${fi}`}>
            <path d={arcSegment(t.x, FY - 26, fx, fy, -22 + fi * 15)}
              fill="none" stroke="currentColor" strokeWidth={0.3}
              strokeLinecap="round" opacity={0.34} />
            <circle cx={fx} cy={fy} r={6.5} fill={`url(#${ID}-land)`} opacity={0.7} />
            <circle cx={fx} cy={fy} r={1.5} fill="currentColor" opacity={0.75} />
          </g>
        ))}
      </g>
    ))}

    {/* the sum */}
    {TERMS.map(t => (
      <text key={`term-${t.text}`} x={t.x} y={FY} textAnchor="middle"
        fill="currentColor" fontSize={TERM} fontWeight={300} opacity={0.96}>
        {t.text}
      </text>
    ))}
    {OPERATORS.map(o => (
      <text key={`op-${o.x}`} x={o.x} y={FY} textAnchor="middle"
        fill="currentColor" fontSize={TERM} fontWeight={300} opacity={0.55}>
        {o.text}
      </text>
    ))}

    {/* what each term means, at the end of its own leader */}
    {TERMS.map(t => (
      <text key={`gloss-${t.text}`} x={t.gx} y={t.gy} textAnchor="middle"
        fill="currentColor" fontSize={GLOSS} fontWeight={300} opacity={0.62}>
        {t.gloss}
      </text>
    ))}
  </g>
);
const EDGES: FigureEdge[] = [
  ...NETWORK.map(n => ({ a: 'you', b: n.id, weight: 1.5, both: true, traffic: 3 })),
  { a: 'net0', b: 'net5', weight: 0.8, both: true, traffic: 2 },
  { a: 'net1', b: 'net2', weight: 0.8, both: true, traffic: 2 },
  { a: 'net3', b: 'net4', weight: 0.7, both: true, traffic: 2 }
];

export const MediaUniverseDiagram: React.FC<MediaUniverseDiagramProps> = () => (
  <LivingFigure
    id={ID}
    width={800}
    height={430}
    nodes={NODES}
    edges={EDGES}
    core="you"
    backdrop={<RadialField />}
    overlay={<Formula />}
    rimStyle={RIM}
    caption=""
    tag=""
    footLeft=""
    footRight=""
    /* The strip under the figure, not a caption on it. Without a resting reading
       it falls back to "touch a cell to read it", which on the stage is redundant
       and in the page preview is simply untrue.

       The sum is drawn in the figure now (see the formula block above), so what
       is left here is the sentence around it — the claim is hard to carry in a
       sentence and trivial to carry in a sum: every observer adds up the same
       field from a different position, so the universe is not a thing you are
       shown but a thing your position computes. A model, not a measurement. */
    rest={{
      kind: 'Observer-relative · a centre, never the centre',
      body: 'U(you) = Σ P(everyone) · d(angle, distance) — you sum what everyone else produces, each bent by where it reaches you from, so no two people are ever in the same universe'
    }}
  />
);
