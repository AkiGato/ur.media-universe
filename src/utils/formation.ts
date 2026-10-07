import { rnd } from '../components/figures/FigurePrimitives';
import { DENSITY } from './deviceTier';

/**
 * The formation — a RECORDED particle system.
 *
 * The organism arrives by assembling: dots of light drift in out of the dark
 * and settle onto the courses the tissue actually runs along, and the drawing
 * thickens into existence behind them as they land.
 *
 * WHY IT IS RECORDED AND NOT SIMULATED. A live particle system is a per-frame
 * physics problem — forces, neighbours, integration — over thousands of points,
 * and it would be paying that cost every frame to arrive at an image that is
 * known in advance. Nothing here is emergent: every particle has one job, which
 * is to be at a particular place on the tissue at a particular moment. So the
 * whole performance is written down once, at module load, into a single flat
 * Float32Array — origin, control point, target, start, duration — and playback
 * is an evaluation of that table, not a simulation of anything. Per frame the
 * work is one quadratic bezier and one fill per particle, no allocation, no
 * lookups, no state. That is what makes it cheap enough to run over a drawing
 * that already costs 50ms a frame (PF-01).
 *
 * WHY THE TARGETS ARE SAMPLED FROM THE DRAWING RATHER THAN INVENTED. The
 * particles land on the polylines the map is already built from — the same
 * arrays `tissue()` draws. If the geometry changes, the formation changes with
 * it, and it cannot drift out of register with the organism it is assembling,
 * because it has no geometry of its own to drift.
 *
 * WHAT KEEPS IT INSIDE THE GRAMMAR:
 *
 * - DG-02 — a particle is a POINT, never an area. The rule allows points
 *   explicitly ("a bouton, a seed tip, a nucleolus is a bright dot") and the
 *   thing it forbids is flat tone over an area at any opacity. These are drawn
 *   at roughly one device pixel and never grow into discs. A particle that gets
 *   big enough to have an interior has become the blob the rule removed four
 *   times.
 * - DG-01 — nothing travels in a straight line, not even a dot. Every course is
 *   a quadratic bezier with a real bow, for the same reason no filament is a
 *   segment: living things do not move on rails.
 * - LC-01 — the formation takes its phase from distance to the core, exactly as
 *   the luminance tide does, so assembly rolls outward as a wave rather than
 *   starting everywhere at once. Random start times would be shimmer, which is
 *   the failure that rule was written against.
 * - LC-04 — durations go through the same golden-ratio offset the map's other
 *   clocks use, so no two particles share a simple ratio.
 *
 * ON LC-02 ("never a travelling dash"). That rule governs how light moves
 * through tissue that EXISTS: a lit dash sliding along a settled strand reads
 * as a worm, and light there must live in phase instead. This is a different
 * event — it is the tissue coming into being, once, and the thing in motion is
 * not light travelling along a strand but the material arriving at one. Nothing
 * here slides along a fibre; every particle crosses open dark to land. When the
 * organism is assembled the whole layer is destroyed, and from that moment the
 * map obeys LC-02 exactly as before. See docs/OPEN.md.
 */

/** stride of one particle row in the recording */
export const STRIDE = 12;

/*
 * Offsets into a row. Named because a bare `data[i * 12 + 5]` at the hot end of
 * a render loop is unreadable, and these compile away.
 *
 * WA/WP are the wobble's amplitude and phase; NX/NY the unit normal of the
 * particle's chord. The normal is stored rather than derived because deriving
 * it costs a hypot per particle per frame, and it never changes — which is the
 * whole argument for recording anything here.
 */
export const OX = 0, OY = 1, CX_ = 2, CY_ = 3, TX = 4, TY = 5, T0 = 6, DUR = 7,
  WA = 8, WP = 9, NX = 10, NY = 11;

export interface FormationRecord {
  /** every particle, flat: ox oy cx cy tx ty t0 dur */
  data: Float32Array;
  count: number;
  /** ms from the first start to the last landing */
  duration: number;
}

/** a polyline the tissue is drawn along, in map user units */
export type Strand = ReadonlyArray<readonly [number, number]>;

/**
 * How far apart, in the drawing's own units, two particles land on one strand.
 *
 * This is the density dial, and it is spent against element count rather than
 * taste (DG-06 makes the same argument about beading). Closer spacing reads as
 * a continuous line of light, which defeats the point — the strand should be
 * legible as an assembly of separate marks until the moment it is not.
 *
 * It is a DEFAULT rather than a constant because the same recorder now serves
 * two coordinate spaces. The map lays out in a 1000×840 box; a figure is a few
 * hundred units across, so the map's spacing there would put a handful of dots
 * on a whole course and read as a dotted line rather than as material. FW-01
 * requires the figures to be the same organism as the map, and at a different
 * scale that means the same APPARENT density, not the same number.
 */
export const SPACING = 5.2;

/** how long one particle takes to cross from its origin to its target, ms */
const FALL = 2050;
const FALL_SPREAD = 1500;

/** how far out a particle begins, as a fraction of its distance from the core */
const DRIFT_MIN = 46;
const DRIFT_SPAN = 190;

/**
 * The wobble — how much a particle strays from its own course on the way in.
 *
 * Without it a dot runs a clean bezier from origin to target, and a few
 * thousand clean beziers read as a machine dealing cards: the field arrives
 * correctly and feels like nothing alive. This is the same correction DG-04
 * makes for fibres, and it takes the same shape — one dominant low frequency
 * with a small secondary, never more, because a fast wobble is a scribble and
 * these are supposed to be drifting.
 *
 * Amplitude is a fraction of the particle's own chord, so a dot crossing a
 * long distance wanders further than one settling a few units — and the
 * envelope reaches zero at BOTH ends, so it leaves its origin cleanly and, far
 * more importantly, lands exactly on the tissue. A wobble still open at t=1
 * would put every particle beside the strand it is supposed to become.
 */
/**
 * GROWTH: the drawing comes OUT of its cells, it does not rain onto them.
 *
 * The first build had every particle begin far outside the organism and fall
 * inward onto its target. It assembled the right picture and told the wrong
 * story — tissue arriving from somewhere else and settling on a plan, when the
 * thing being drawn is a nervous system, and a nervous system is the one kind
 * of structure everybody has watched grow: processes extend from a cell body,
 * reach, and meet. Seen on the map it read as precipitation.
 *
 * So every particle now starts at the CELL CENTRE NEAREST ITS TARGET and moves
 * outward along its own strand. Three things follow, and all three are what was
 * asked for:
 *
 *  - the cores are the first thing on the sheet, because every process has to
 *    leave one and the ones leaving it arrive first;
 *  - each cell grows its own arbor outward at its own rate, so the organism
 *    fills from several centres at once rather than sweeping across;
 *  - a strand running between two cells is grown from BOTH ends — its points
 *    belong to whichever centre is nearer — so the two processes travel toward
 *    each other and meet in the middle. That is the interconnection, and it is
 *    a consequence of the rule rather than an effect staged on top of it.
 *
 * Timing is distance along the process divided by a growth rate, which is why
 * it reads as growth rather than as a queue: a point twice as far out takes
 * twice as long to be reached, exactly as a real growth cone would.
 */
const CORE_HOLD = 420;
/** ms per unit of distance from the cell centre — the growth cone's rate */
const GROWTH_RATE = 6.2;
/** so two cells never extend in lockstep */
const CELL_STAGGER = 260;

const WOBBLE = 0.13;
/** cycles across one flight — low, or it stops being drift and becomes noise */
export const WOBBLE_CYCLES = 1.35;

const PHI = 1.6180339887498949;

/**
 * Write the performance down.
 *
 * Called once per session, off geometry that is built at module scope, by a
 * caller that already knows the formation will be played — and called while the
 * entry gate is still up rather than as it is dismissed, because this is a walk
 * over every strand on the map and the frame the reader pressed a button to get
 * is the one frame that must not hitch. See the `formation` memo in
 * `Orrery.tsx` for the measurement that put it there.
 */
export function record(
  strands: ReadonlyArray<{ pts: Strand }>,
  cx: number,
  cy: number,
  opts: {
    /** units between landings along one strand; see SPACING */
    spacing?: number;
    /** scales every distance the recording works in — drift, bow, reach */
    scale?: number;
    /**
     * The cell centres — every soma the drawing grows out of.
     *
     * Without them the formation has no anatomy to grow from and falls back to
     * raining inward on the core, which is what it used to do. See GROWTH.
     */
    origins?: ReadonlyArray<readonly [number, number]>;
  } = {}
): FormationRecord {
  const spacing = opts.spacing ?? SPACING;
  /* Distances that are absolute in map units — how far out a dot begins, how
     far its course bows — have to shrink with the drawing or a figure's
     particles start off the sheet and arrive on courses bowed like ribbons. */
  const scale = opts.scale ?? 1;
  const driftMin = DRIFT_MIN * scale;
  const driftSpan = DRIFT_SPAN * scale;
  /*
   * Collect the targets first, then size the buffer exactly. Growing a
   * Float32Array means reallocating and copying it, and we can know the count
   * cheaply by walking the strands once.
   */
  const tx: number[] = [];
  const ty: number[] = [];

  /* The wave's outer edge: the furthest any tissue sits from the core. Taken
     from the sampled targets rather than assumed, so the sweep always reaches
     the real edge of the drawing however the graph is laid out. */
  let reach = 1;

  for (let s = 0; s < strands.length; s++) {
    const pts = strands[s].pts;
    if (pts.length < 2) continue;

    /*
     * Walk the polyline at constant arc length rather than per vertex. The
     * strands are not evenly tessellated — `wander()` puts its vertices where
     * the curvature is, so sampling vertices would crowd particles into the
     * bends and leave the long easy runs bare, which is the opposite of what
     * the tissue looks like.
     */
    let carried = rnd(s * 3.7 + 1) * spacing;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;

      let at = spacing - carried;
      while (at <= len) {
        const t = at / len;
        const px = ax + dx * t;
        const py = ay + dy * t;
        tx.push(px);
        ty.push(py);
        const d = Math.hypot(px - cx, py - cy);
        if (d > reach) reach = d;
        at += spacing;
      }
      carried = (carried + len) % spacing;
    }
  }

  /*
   * Thin to what the device can carry, using the same dial the organism itself
   * is built with (`DENSITY`) so a phone gets the same formation drawn more
   * sparsely — never a different one. Dropping by a stride rather than at
   * random keeps the thinning even along every strand.
   */
  /*
   * The centres, and a fallback. With none supplied the core is the only cell
   * the recording knows about, which still grows outward — just from one place.
   */
  const origins = (opts.origins && opts.origins.length
    ? opts.origins
    : [[cx, cy] as const]);

  const keep = Math.max(0.16, Math.min(1, DENSITY));
  const step = 1 / keep;

  const count = Math.floor(tx.length * keep);
  const data = new Float32Array(count * STRIDE);

  for (let n = 0; n < count; n++) {
    const src = Math.min(tx.length - 1, Math.round(n * step));
    const x = tx[src];
    const y = ty[src];
    const o = n * STRIDE;

    /*
     * Which cell does this point belong to? The nearest one — so a strand
     * between two somas is grown from both ends and the halves meet. Linear
     * over a few dozen centres; the whole bake is still a few milliseconds.
     */
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < origins.length; k++) {
      const ddx = x - origins[k][0];
      const ddy = y - origins[k][1];
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < bestD) { bestD = d2; best = k; }
    }
    const dist = Math.sqrt(bestD);

    /*
     * The origin IS the cell centre — the process leaves the soma. A little
     * jitter around it so a few hundred strands do not all emanate from one
     * mathematical point, which reads as a starburst rather than an arbor.
     */
    const jr = driftMin * 0.06 + rnd(n * 1.7 + 5) * driftSpan * 0.05;
    const ja = rnd(n * 2.3 + 11) * 6.283;
    const ox = origins[best][0] + Math.cos(ja) * jr;
    const oy = origins[best][1] + Math.sin(ja) * jr;

    /*
     * The bow. DG-01 is about filaments, but a dot crossing the dark on a
     * perfectly straight course is the same lie about how living material
     * moves, so the control point is pushed off the chord — by ~18% of its
     * length, either side, which is a visible curve at map scale without
     * becoming a loop.
     */
    const mx = (ox + x) / 2;
    const my = (oy + y) / 2;
    const chord = Math.hypot(x - ox, y - oy);
    const bow = (rnd(n * 3.1 + 17) - 0.5) * 0.36 * chord;
    const nx = -(y - oy) / (chord || 1);
    const ny = (x - ox) / (chord || 1);

    data[o + OX] = ox;
    data[o + OY] = oy;
    data[o + CX_] = mx + nx * bow;
    data[o + CY_] = my + ny * bow;
    data[o + TX] = x;
    data[o + TY] = y;
    data[o + WA] = chord * WOBBLE * (0.55 + rnd(n * 4.1 + 29) * 0.9);
    data[o + WP] = rnd(n * 6.7 + 31) * 6.283;
    data[o + NX] = nx;
    data[o + NY] = ny;

    /*
     * When this point is reached: how far out along its process it sits,
     * divided by the growth rate. Not a sweep across the sheet — each cell
     * keeps its own clock, staggered so no two extend in lockstep (LC-04's
     * argument, applied to cells rather than to periods), and the core hold is
     * the beat before anything leaves, which is what makes the somas read as
     * the thing everything else came out of.
     */
    data[o + T0] =
      CORE_HOLD +
      ((best * PHI) % 1) * CELL_STAGGER +
      dist * GROWTH_RATE * scale +
      rnd(n * 5.3 + 23) * 260;

    /* LC-04 — durations offset by the golden ratio, so no two particles fall on
       a simple ratio and the field never resolves into pulses. */
    data[o + DUR] = FALL + ((n * PHI) % 1) * FALL_SPREAD;
  }

  let duration = 0;
  for (let n = 0; n < count; n++) {
    const o = n * STRIDE;
    const end = data[o + T0] + data[o + DUR];
    if (end > duration) duration = end;
  }

  return { data, count, duration };
}
