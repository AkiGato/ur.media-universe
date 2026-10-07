import React from 'react';
import { Vein, Soma } from '../organic/Organic';
import { DEVICE_TIER, scaleCount } from '../../utils/deviceTier';

/**
 * Liquid-glass data-flower figure primitives.
 *
 * Everything is drawn as fine luminous filaments on black — no boxes, no arrows,
 * no fills. Geometry is deterministic (seeded sine hash) so figures render
 * identically on every paint.
 */

/** Deterministic pseudo-random in [0,1). */
export const rnd = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const TAU = Math.PI * 2;

/**
 * Smooth a polyline into flowing curves. Nothing in the neural/root system is
 * ever drawn as a perfectly straight line — living tissue does not do that.
 */
export function smoothPolyline(pts: Array<[number, number]>): string {
  if (pts.length < 3) {
    return `M ${pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')}`;
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const e = pts[pts.length - 1];
  return `${d} Q ${e[0].toFixed(1)} ${e[1].toFixed(1)} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
}

/**
 * A short filament that always carries a live kink — used wherever a straight
 * segment would otherwise appear (seed crowns, floret rays, tick marks).
 */
export function arcSegment(
  x1: number, y1: number, x2: number, y2: number, bend: number
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${(mx - (dy / len) * bend).toFixed(1)} ${(my + (dx / len) * bend).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/* ------------------------------------------------------------------ defs */

export const FigureDefs: React.FC<{ id: string; blur?: number }> = ({ id, blur = 2.2 }) => (
  <defs>
    <filter id={`${id}-glow`} x="-150%" y="-150%" width="400%" height="400%">
      <feGaussianBlur stdDeviation={blur} result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    {/* The one place hue is permitted: this is emitted light, not ink. Both
        lit stops fall back to currentColor, so a figure rendered outside a
        themed shell is exactly as monochrome as it always was. */}
    <radialGradient id={`${id}-core`}>
      <stop offset="0%" style={{ stopColor: 'rgb(var(--lume-rgb, 255 255 255))' }} stopOpacity="0.9" />
      <stop offset="30%" style={{ stopColor: 'rgb(var(--lume-halo-rgb, 255 255 255))' }} stopOpacity="0.22" />
      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
    </radialGradient>
    <pattern id={`${id}-grid`} width="26" height="26" patternUnits="userSpaceOnUse">
      <path d="M 26 0 L 0 0 0 26" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.05" />
    </pattern>
  </defs>
);

/* ---------------------------------------------------- recursive dendrite */

interface DendriteSeg {
  x: number; y: number; angle: number; length: number;
  depth: number; seed: number; width: number; opacity: number;
  /** grow spines on the mid-distal branches — see `Dendrites.spines` */
  spines?: boolean;
}


/**
 * One drawn piece of an arbor, in the coordinates it was grown in.
 *
 * WHY THE GEOMETRY IS NOW A VALUE. `growDendrite` computed an arbor and emitted
 * React nodes in the same pass, so the only way to find out where an arbor runs
 * was to render one and read the DOM back. That was fine while the SVG was the
 * only consumer. It stops being fine the moment anything else needs the same
 * courses — a particle field standing in for the tissue, a formation landing on
 * it, a hit test — because each of those would otherwise carry its own copy of
 * the growth rules, and two generators of one drawing drift the first time
 * either is touched (`docs/OPEN.md` 29 names this as the change worth making).
 *
 * So growth answers in marks and rendering is a separate, dumb pass over them.
 * Every number the renderer used to compute inline — the clamped stroke width,
 * the bead radius, the boosted opacities — is computed once here and carried,
 * so the two cannot disagree about what a generation looks like either.
 *
 * The order of the array IS the paint order, and it is the order the recursion
 * produced before: a segment, then its beads, its spines and its terminal, then
 * its children. SVG has no z-index; changing this changes the drawing.
 */
export interface DendriteMark {
  /** the meandering course of this segment */
  pts: Array<[number, number]>;
  /** stroke width, already clamped as the renderer used to clamp it */
  width: number;
  opacity: number;
  /** varicosities along the course — the two finest generations only */
  beads: Array<{ x: number; y: number; r: number; opacity: number }>;
  /** dendritic spines: a bowed stalk and its bulb head */
  spines: Array<{
    x1: number; y1: number; x2: number; y2: number;
    bow: number; headR: number; stalkOpacity: number; headOpacity: number;
  }>;
  /** the beaded ending, on a segment that closes its branch */
  terminal?: { x: number; y: number; r: number; opacity: number };
}

/**
 * Grow one segment and its children into `out`.
 *
 * Pure: no React, no DOM, no module state beyond the seeded `rnd`. The body is
 * the body that was here before, with every `out.push(<element/>)` replaced by
 * the numbers that element was going to be built from.
 */
function growDendriteGeo(o: DendriteSeg, out: DendriteMark[]): void {
  if (o.depth <= 0 || o.length < 2.5) return;

  const curl = (rnd(o.seed) - 0.5) * 0.7;
  const a2 = o.angle + curl;
  const ex = o.x + Math.cos(a2) * o.length;
  const ey = o.y + Math.sin(a2) * o.length;

  /*
   * The segment meanders; it does not arc.
   *
   * A single quadratic between fork and fork is a clean mathematical curve, and
   * clean is exactly what the reference is not. A real neurite — and the slime
   * mould in the second reference even more so — wavers continuously along its
   * length: small direction changes every few units, never repeating, so no
   * stretch of it reads as a drawn curve. That waver is most of why the
   * references look grown and a smooth arbor looks illustrated.
   *
   * Four interior samples, each pushed off the chord by a seeded amount that
   * falls to zero at both ends so the joins between generations stay exact.
   */
  const STEPS = 4;
  const nx = -Math.sin(o.angle);
  const ny = Math.cos(o.angle);
  const meander = o.length * 0.14;
  const pts: Array<[number, number]> = [];
  for (let s = 0; s <= STEPS; s++) {
    const t = s / STEPS;
    // the segment also swings from its start angle to its curled one
    const bx = o.x + (ex - o.x) * t;
    const by = o.y + (ey - o.y) * t;
    const env = Math.sin(t * Math.PI);
    const off =
      (Math.sin(t * 3.1 + rnd(o.seed + s) * 6.28) * 0.7 +
        Math.sin(t * 6.7 + rnd(o.seed + s + 40) * 6.28) * 0.3) *
      env * meander;
    pts.push([bx + nx * off, by + ny * off]);
  }

  const mark: DendriteMark = {
    pts,
    width: Math.max(0.22, o.width),
    opacity: o.opacity,
    beads: [],
    spines: []
  };
  out.push(mark);

  /*
   * Beading along the length.
   *
   * Both references are dotted all the way down every branch, not only at the
   * tips — varicosities on the neurite in one, granules in the plasmodial
   * strand in the other. Without them a branch is a clean stroke; with them it
   * has substance and the whole arbor gains the granular texture that is most
   * of its character. Sparse and seeded, on the finer generations only, where
   * the eye actually reads texture rather than structure.
   *
   * Budget: beading is per-segment and the arbor count is large, so the naive
   * version added ~3,800 circles. Measured on the current map the baseline is
   * 7,564 elements and the density lift takes it to 8,057 (+6.5%). Revert by
   * returning the keep rate to 0.34 if a frame budget ever says so.
   */
  if (o.depth <= 1) {
    for (let b = 1; b < STEPS; b++) {
      if (rnd(o.seed + b * 17 + 3) > 0.46) continue;
      const p = pts[b];
      mark.beads.push({
        x: p[0],
        y: p[1],
        r: Math.max(0.26, o.width * 0.6),
        opacity: Math.min(1, o.opacity * 1.2)
      });
    }
  }

  /*
   * Dendritic spines.
   *
   * The stubby, bulb-headed protrusions that cover the distal arbor of a real
   * neuron and carry nearly all of its excitatory synapses. They are the single
   * feature that separates a dendrite from a generic branching line, so a
   * neuronal figure without them never quite reads as tissue.
   *
   * Only the mid-distal generation wears them: a spiny primary trunk is
   * anatomically wrong, and spining every segment triples the element count of
   * an arbor for a difference nobody can see at the proximal end.
   */
  if (o.spines && o.depth === 2) {
    for (let i = 0; i < 3; i++) {
      if (rnd(o.seed + i * 23 + 5) > 0.62) continue;
      const t = 0.24 + i * 0.26;
      const bx = o.x + (ex - o.x) * t;
      const by = o.y + (ey - o.y) * t;
      const side = rnd(o.seed + i * 7 + 2) > 0.5 ? 1 : -1;
      const sa = a2 + side * (1.05 + rnd(o.seed + i * 3) * 0.55);
      const sl = 1.5 + rnd(o.seed + i * 11) * 1.6;
      mark.spines.push({
        x1: bx, y1: by,
        x2: bx + Math.cos(sa) * sl,
        y2: by + Math.sin(sa) * sl,
        bow: sl * 0.32,
        headR: 0.5,
        stalkOpacity: o.opacity * 0.85,
        headOpacity: Math.min(1, o.opacity * 1.3)
      });
    }
  }

  if (o.depth === 1) {
    mark.terminal = {
      x: ex, y: ey,
      r: Math.max(0.7, o.width * 1.5),
      opacity: Math.min(1, o.opacity * 1.7)
    };
    return;
  }

  const forks = rnd(o.seed + 11) > 0.72 ? 3 : 2;
  for (let i = 0; i < forks; i++) {
    const off = (i - (forks - 1) / 2) * (0.42 + rnd(o.seed + i) * 0.3);
    growDendriteGeo(
      {
        x: ex, y: ey,
        angle: a2 + off,
        length: o.length * (0.58 + rnd(o.seed + i + 31) * 0.22),
        depth: o.depth - 1,
        seed: o.seed * 3 + i * 17 + 7,
        width: o.width * 0.68,
        opacity: o.opacity * 0.94,
        spines: o.spines
      },
      out
    );
  }
}

/** The parameters an arbor is grown from — shared by the drawing and the geometry. */
export interface ArborSpec {
  cx: number;
  cy: number;
  r: number;
  arms?: number;
  depth?: number;
  seed?: number;
  span?: number;
  rotate?: number;
  opacity?: number;
  width?: number;
  spines?: boolean;
}

/**
 * A whole arbor, as marks.
 *
 * This is the single source of every dendrite in the app. `Dendrites` renders
 * what it returns; anything that needs to know where the tissue runs — without
 * drawing it — asks the same function and gets the same answer by construction.
 *
 * Density is applied here, at the one place every arbor in the app is grown, so
 * no call site has to know about it and none can forget. Arms scale linearly;
 * depth is the expensive axis, because each generation multiplies the element
 * count by the fork factor — dropping one level on a weak device removes more
 * than half the nodes while leaving the silhouette and the branching character
 * intact. It is the same drawing, drawn sparsely.
 */
export function dendriteMarks(spec: ArborSpec): DendriteMark[] {
  const {
    cx, cy, r, arms = 14, depth = 4, seed = 1,
    span = 1, rotate = 0, opacity = 1, width = 0.85, spines = false
  } = spec;

  const out: DendriteMark[] = [];
  const armCount = arms === 1 ? 1 : scaleCount(arms, 3);
  const growDepth = DEVICE_TIER === 'low' ? Math.max(2, depth - 1) : depth;

  for (let i = 0; i < armCount; i++) {
    const t = armCount === 1 ? 0 : i / armCount;
    const a = (rotate + t * span) * TAU + (rnd(seed + i) - 0.5) * 0.18;
    growDendriteGeo(
      {
        x: cx + Math.cos(a) * r * 0.1,
        y: cy + Math.sin(a) * r * 0.1,
        angle: a,
        length: r * (0.3 + rnd(seed + i + 3) * 0.14),
        depth: growDepth,
        seed: seed + i * 13 + 1,
        width,
        // near-white: the references are saturated line on black, and the
        // glow in them is density of bright line rather than a soft wash
        opacity: Math.min(1, 0.86 * opacity),
        spines
      },
      out
    );
  }
  return out;
}

/**
 * The courses of an arbor, with nothing else on them.
 *
 * What a sampler wants: polylines and the weight each was drawn at, in the same
 * shape `formation.ts` already walks for the map's edges. The spine stalks come
 * through as courses of their own — they are tissue, two points long — and the
 * beads and terminals do not, because a sampler laying points along a line has
 * no use for the points that were already there.
 */
export function dendriteStrands(spec: ArborSpec): Array<{ pts: Array<[number, number]>; width: number; opacity: number }> {
  const out: Array<{ pts: Array<[number, number]>; width: number; opacity: number }> = [];
  for (const m of dendriteMarks(spec)) {
    out.push({ pts: m.pts, width: m.width, opacity: m.opacity });
    for (const s of m.spines) {
      out.push({ pts: [[s.x1, s.y1], [s.x2, s.y2]], width: 0.22, opacity: s.stalkOpacity });
    }
  }
  return out;
}

/**
 * Marks to elements.
 *
 * The one place an arbor becomes SVG, shared by the two things that grow one —
 * `Dendrites` and the vortex's own strands. Emission order is the order the
 * recursion produced (segment, beads, spines, terminal, then children) because
 * SVG has no z-index and that order is part of the drawing.
 */
function renderDendriteMarks(marks: DendriteMark[], kb: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  marks.forEach((m, i) => {
    out.push(
      <path
        key={`${kb}${i}`}
        d={smoothPolyline(m.pts)}
        fill="none"
        stroke="currentColor"
        strokeWidth={m.width}
        strokeLinecap="round"
        opacity={m.opacity}
      />
    );
    m.beads.forEach((b, j) => {
      out.push(
        <circle key={`${kb}${i}b${j}`} cx={b.x.toFixed(1)} cy={b.y.toFixed(1)} r={b.r}
          fill="currentColor" opacity={b.opacity} />
      );
    });
    m.spines.forEach((s, j) => {
      out.push(
        <path key={`${kb}${i}n${j}`} d={arcSegment(s.x1, s.y1, s.x2, s.y2, s.bow)} fill="none"
          stroke="currentColor" strokeWidth={0.22} strokeLinecap="round"
          opacity={s.stalkOpacity} />,
        <circle key={`${kb}${i}h${j}`} cx={s.x2.toFixed(1)} cy={s.y2.toFixed(1)} r={s.headR}
          fill="currentColor" opacity={s.headOpacity} />
      );
    });
    if (m.terminal) {
      out.push(
        <circle key={`${kb}${i}t`} cx={m.terminal.x} cy={m.terminal.y} r={m.terminal.r}
          fill="currentColor" opacity={m.terminal.opacity} />
      );
    }
  });
  return out;
}

/** Grow one arbor's worth of marks without the `Dendrites` wrapper — for the vortex. */
function growArborMarks(o: DendriteSeg): DendriteMark[] {
  const out: DendriteMark[] = [];
  growDendriteGeo(o, out);
  return out;
}

/** A neuron-like branching burst: recursive dendrites radiating from a soma. */
export const Dendrites: React.FC<{
  id: string;
  cx: number;
  cy: number;
  r: number;
  arms?: number;
  depth?: number;
  seed?: number;
  span?: number;
  rotate?: number;
  opacity?: number;
  width?: number;
  /** Gaussian bloom is costly over a large area — only switch it on for small,
   *  bright, non-animated tufts. Animated groups must leave it off. */
  glow?: boolean;
  /** Grow spines on the mid-distal branches. Opt-in: it roughly doubles the
   *  element count of an arbor, so it belongs on the large somas only. */
  spines?: boolean;
}> = ({ id, cx, cy, r, arms = 14, depth = 4, seed = 1, span = 1, rotate = 0, opacity = 1, width = 0.85, glow = false, spines = false }) => {
  /* Rendering is a dumb walk over the marks: every number was decided in
     `dendriteMarks`. The walk itself is shared with the vortex, which grows
     arbors of its own — one generator, one renderer, no second opinion. */
  const out = renderDendriteMarks(
    dendriteMarks({ cx, cy, r, arms, depth, seed, span, rotate, opacity, width, spines }),
    `d`
  );

  /* `arbor-ink` marks this as tissue rather than a light source, so the
     particle map can retire the drawn arbors and keep the somas. Harmless
     everywhere else: only the map root ever carries the mode class. */
  return <g className="arbor-ink" filter={glow ? `url(#${id}-glow)` : undefined}>{out}</g>;
};

/* ------------------------------------------------------------- growth cone */

/**
 * The tip of a process that is still growing.
 *
 * A neurite does not simply stop: it ends in a growth cone — a lamellipodial
 * veil with filopodia probing ahead of it. Any free-ending fibre that just
 * fades out reads as a line the artist ran out of room for; a growth cone reads
 * as tissue heading somewhere.
 */
export const GrowthCone: React.FC<{
  x: number; y: number;
  /** direction of travel, radians */
  angle: number;
  seed?: number;
  size?: number;
  opacity?: number;
}> = ({ x, y, angle, seed = 1, size = 8, opacity = 1 }) => {
  const filopodia = 5;
  const veil: Array<[number, number]> = [];
  for (let k = 0; k <= 7; k++) {
    const a = angle + (-0.85 + (k / 7) * 1.7);
    const rr = size * (0.44 + 0.3 * Math.cos((k / 7 - 0.5) * Math.PI) + rnd(seed + k) * 0.16);
    veil.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return (
    <g>
      {/* The veil, drawn and not filled. A lamellipodium really is a sheet,
          which is why this was a fill — but nothing else in the organism is a
          filled area, and one exception at the tip of every root is still tone
          over an area. Its leading edge as a filament, with the arc struck
          across it, reads as the same membrane and has no mass. */}
      <path d={smoothPolyline(veil)} fill="none" stroke="currentColor"
        strokeWidth={0.26} strokeLinecap="round" opacity={0.3 * opacity} />
      <path d={smoothPolyline([veil[0], [x, y], veil[veil.length - 1]])} fill="none"
        stroke="currentColor" strokeWidth={0.22} strokeLinecap="round"
        opacity={0.22 * opacity} />
      {Array.from({ length: filopodia }, (_, k) => {
        const a = angle + (-0.78 + (k / (filopodia - 1)) * 1.56) + (rnd(seed + k + 9) - 0.5) * 0.2;
        const l = size * (0.62 + rnd(seed + k + 21) * 0.75);
        const tx = x + Math.cos(a) * l;
        const ty = y + Math.sin(a) * l;
        return (
          <g key={k}>
            <path d={arcSegment(x, y, tx, ty, (rnd(seed + k + 33) - 0.5) * l * 0.42)}
              fill="none" stroke="currentColor" strokeWidth={0.24} strokeLinecap="round"
              opacity={0.55 * opacity} />
            <circle cx={tx.toFixed(1)} cy={ty.toFixed(1)} r={0.52} fill="currentColor"
              opacity={0.8 * opacity} />
          </g>
        );
      })}
    </g>
  );
};

/* ---------------------------------------------------------- vortex sphere */

/**
 * A liquid-glass sphere with a hurricane swirling inside it: logarithmic arms
 * spiralling into a luminous eye, a rim light along the upper edge, and a
 * glass falloff. The swirl rotates slowly; the sphere itself stays put.
 */
export const VortexSphere: React.FC<{
  id: string;
  cx: number;
  cy: number;
  r: number;
  seed?: number;
  strands?: number;
  intensity?: number;
  reverse?: boolean;
  /** seconds per rotation — lower spins faster */
  spinSeconds?: number;
  /** Set false for small spheres. A clipped, rotating group is expensive per
   *  frame; at small radii the rotation is imperceptible anyway, and the flow
   *  field already contains itself, so neither clip nor animation is needed. */
  spinning?: boolean;
  /**
   * Angles, in radians, of the fibres that actually leave this cell.
   *
   * Without them the vortex is a self-contained ball: every streamline is
   * clamped inside the rim, so the swirl has no visible relationship to the
   * network it sits in — an ornament parked on the tissue. Given them, a few
   * streamlines are allowed to escape along the real courses, spiralling out
   * of the flow field and straightening into the fibre, tapering to nothing as
   * they go. The cell then reads as the *source* of its connections rather
   * than as a sphere the connections happen to touch.
   */
  exits?: number[];
}> = ({ id, cx, cy, r, seed = 1, strands = 46, intensity = 1, reverse = false, spinSeconds = 150, spinning = true, exits }) => {
  const uid = `${id}-vx-${Math.round(cx)}-${Math.round(cy)}`;
  const dir = reverse ? -1 : 1;

  /* Differential rotation: a real vortex turns faster at its centre than at
     its rim, so strands are banded by their seed radius and each band spins at
     its own rate. Two counter-rotating halves merely turned; graded bands
     shear against each other, which is what makes a vortex hypnotic. */
  // three bands still shear against each other; four doubled the number of
  // clipped rotating groups and cost 4fps for a difference nobody can see
  const BANDS = 3;
  const bands: React.ReactNode[][] = Array.from({ length: BANDS }, () => []);

  /*
   * The cell body is a branching arbor, not a burst of spokes.
   *
   * This is the difference between the two readings, and it is structural
   * rather than a matter of tuning. An unbranched filament running from centre
   * to rim is a spoke; a ring of spokes is an asterisk, and no amount of
   * jitter, length variation or opacity work rescues it — I tried all three.
   *
   * What every neuron and every seed head actually does is *branch*: a process
   * leaves the soma, forks, forks again, each generation thinner and shorter
   * than the last, ending in a small bulb. The silhouette is then dense near
   * the middle and open at the rim, with real depth between the generations.
   *
   * growDendrite already does exactly this — recursive forking, width tapering
   * by a third per generation, beaded terminals. The cell just was not using
   * it. Each strand is now a short arbor instead of a line.
   */
  const ARBORS = scaleCount(Math.round(strands * 0.55), 6);
  for (let i = 0; i < ARBORS; i++) {
    // loosely stratified: roughly one arbor per slice, straying well inside it
    const ang = ((i + 0.5) / ARBORS) * TAU + (rnd(seed + i) - 0.5) * (TAU / ARBORS) * 1.5;
    const reach = 0.46 + Math.pow(rnd(seed + i + 700), 0.7) * 0.6;
    const op = Math.min(1, (0.72 + rnd(seed + i + 55) * 0.28) * intensity);

    const strandOut = renderDendriteMarks(growArborMarks(
      {
        // starts just off the receptacle so the arbors converge to a point
        x: cx + Math.cos(ang) * r * 0.08,
        y: cy + Math.sin(ang) * r * 0.08,
        angle: ang + dir * 0.26 * (0.6 + rnd(seed + i + 5) * 0.8),
        length: r * reach * 0.44,
        depth: 3,
        seed: seed + i * 13 + 1,
        width: 0.44,
        opacity: op,
        spines: false
      }
    ), `vx${i}`);

    const band = Math.min(BANDS - 1, Math.max(0, Math.floor(((reach - 0.46) / 0.6) * BANDS)));
    bands[band].push(<g key={i}>{strandOut}</g>);
  }

  /*
   * Efferents: the flow leaving the cell.
   *
   * Each one starts inside the vortex, is carried by the same field that turns
   * the swirl, and once past the rim straightens onto the fibre's true course.
   * It is drawn in three chained segments of falling opacity rather than one
   * stroke, so it dissolves into the surrounding arbor instead of stopping —
   * the same taper the bundles use, for the same reason: a fibre that simply
   * ends is a line that ran out of canvas.
   *
   * These sit OUTSIDE the rotating bands. A strand that leaves along an axon
   * and then rotates away from it would be worse than no strand at all.
   */
  const efferents: React.ReactNode[] = (exits || []).flatMap((ang, ei) => {
    const jitter = (rnd(seed + ei * 31 + 3) - 0.5) * 0.5;
    const pts: Array<[number, number]> = [];
    const STEPS = 22;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      // radius grows from inside the vortex out past the rim into open tissue
      const rad = r * (0.36 + t * 1.55);
      // the flow still turns near the centre and lets go as it gets away
      const swirlLeft = Math.max(0, 1 - t * 1.7);
      const a =
        ang +
        jitter * (1 - t) +
        dir * swirlLeft * (0.9 + rnd(seed + ei + 9) * 0.5) +
        Math.sin(t * 5.3 + ei) * 0.06 * (1 - t * 0.6);
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    // three overlapping segments, each fainter than the last
    const cuts: Array<[number, number, number]> = [
      [0, 9, 1],
      [8, 16, 0.55],
      [15, STEPS, 0.24]
    ];
    return cuts.map(([from, to, fade], si) => (
      <path
        key={`ef-${ei}-${si}`}
        d={smoothPolyline(pts.slice(from, to + 1))}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={(0.42 - si * 0.07) * (0.85 + rnd(seed + ei) * 0.3)}
        opacity={0.5 * fade * intensity}
      />
    ));
  });

  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-glass`} cx="50%" cy="50%" r="50%" fx="34%" fy="28%">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.15 * intensity} />
          <stop offset="45%" stopColor="currentColor" stopOpacity={0.05 * intensity} />
          <stop offset="78%" stopColor="currentColor" stopOpacity={0.012 * intensity} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </radialGradient>
      </defs>

      <g>
        {/* No glass fill.

            A radial gradient behind the streamlines lifts the black inside the
            cell to grey, and a soft grey mass with no edge is exactly what makes
            a soma read as a blob rather than as tissue. Everywhere else in this
            organism presence is built from density of line; the vortex is dense
            enough on its own. */}

        {/* no bloom filter here — this group animates, and re-filtering a large
            blurred region every frame is what turns fluid motion into jank */}
        {/* The efferents run under the swirl, so the flow appears to gather
            into them rather than to be crossed by them. */}
        {efferents}

        {/* No clip. A circular clipPath — however wide — cuts every strand that
            reaches it along one perfect arc, and a perfect arc is a boundary:
            it is what made the vortex read as a ball set into the tissue. The
            streamlines already contain themselves; the escaping ones are meant
            to cross out, and nothing may stop them at a rim. */}
        {spinning ? (
          <g>
            {bands.map((band, bi) => (
              <g key={bi} className={bi % 2 === 0 ? 'vortex-spin' : 'vortex-spin-rev'}
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  // inner bands turn fastest; the ratios are irrational so the
                  // bands never come back into alignment
                  animationDuration: `${(spinSeconds * (0.44 + bi * 0.41) * (1 + (bi * 0.6180339887) % 1 * 0.18)).toFixed(2)}s`
                }}>{band}</g>
            ))}
          </g>
        ) : (
          <g>{bands}</g>
        )}

        {/* No rim. A drawn circle — however faint or dashed — gives the sphere a
            hard boundary and makes it read as an object sitting on top of the
            tissue. The flow density alone defines where the sphere is. */}
      </g>
    </g>
  );
};

/* ------------------------------------------------------------------ labels */

export const Label: React.FC<{
  x: number; y: number;
  children: React.ReactNode;
  size?: number;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
  uppercase?: boolean;
}> = ({ x, y, children, size = 9, weight = 300, anchor = 'start', opacity = 0.85, uppercase = false }) => (
  <text
    x={x}
    y={y}
    fill="currentColor"
    fontSize={size}
    fontWeight={weight}
    textAnchor={anchor}
    opacity={opacity}
    /* The one spacing rule, derived rather than passed: caps are tracked
       0.2em and nothing else is tracked at all. A call site cannot drift from
       it because a call site can no longer state it. */
    letterSpacing={uppercase ? size * 0.2 : 0}
    style={uppercase ? { textTransform: 'uppercase' } : undefined}
  >
    {children}
  </text>
);

/* ------------------------------------------------------------------- frame */

/**
 * Whether a figure is being drawn inside its own world rather than on a page.
 *
 * A context rather than a prop because the five diagram components sit between
 * the stage and the frame and none of them has any business knowing about this:
 * threading a flag through all of them would put a layout concern into five
 * files that are about tissue.
 */
export const FigureWorldContext = React.createContext(false);

/**
 * Whether this figure is drawn but cannot be touched.
 *
 * The page's preview renders the real organism inside `inert`, so every cell
 * keeps its appearance and loses its behaviour. That turns the reading strip
 * into furniture: it can never change, and the line it falls back to — "touch a
 * cell to read it" — offers an affordance the preview does not have, a
 * centimetre above the one instruction that is true. Two instructions, and the
 * louder one false.
 *
 * A context of its own rather than a mode on FigureWorldContext, because the
 * two facts are independent: the stage is a world AND touchable; the preview is
 * a world and is not.
 */
export const FigureInertContext = React.createContext(false);

export const FigureFrame: React.FC<{
  caption: string;
  tag: string;
  footLeft: string;
  footRight: string;
  children: React.ReactNode;
}> = ({ caption, tag, footLeft, footRight, children }) => {
  const inWorld = React.useContext(FigureWorldContext);

  /* Inside a world the frame is gone entirely — no membrane, no caption, no
     tag, no veins, no foot. All four of those restate on the surface what the
     surface already says at its top edge, and a world you explore should carry
     less text than the page it came from, not the same text twice. */
  if (inWorld) return <div className="relative w-full">{children}</div>;

  /* Every band here is conditional. Emptying a caption used to leave its soma,
     its vein and a blank row standing — chrome with nothing in it, which is
     worse than the words were. A frame with nothing to say draws nothing. */
  const head = Boolean(caption || tag);
  const foot = Boolean(footLeft || footRight);

  return (
  <div className="membrane w-full p-3 sm:p-4 rounded-none">
    {head && (
    <div className="flex items-center justify-between mb-1 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Soma size={9} phase={2.6} />
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70 truncate">
          {caption}
        </span>
      </div>
      <span className="text-[9px] uppercase font-light tracking-[0.2em] opacity-45 flex-shrink-0 hidden sm:inline">
        {tag}
      </span>
    </div>
    )}
    {head && (
    <div className="opacity-45 mb-2">
      <Vein opacity={0.45} phase={7.3} />
    </div>
    )}

    <div className="relative w-full overflow-x-auto soft-scroll">{children}</div>

    {foot && (
    <div className="opacity-35 mt-2">
      <Vein opacity={0.4} phase={13.5} />
    </div>
    )}
    {foot && (
    <div className="mt-1.5 text-[9px] font-light flex items-center justify-between gap-3 opacity-45">
      <span className="truncate">{footLeft}</span>
      <span className="font-light tracking-[0.2em] uppercase flex-shrink-0 hidden sm:inline">{footRight}</span>
    </div>
    )}
  </div>
  );
};
