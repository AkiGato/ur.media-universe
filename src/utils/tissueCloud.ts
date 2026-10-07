import { DENSITY } from './deviceTier';

/**
 * The organism as points — baked once, read every frame.
 *
 * Stage two of the particle map. Stage one made the primitives report their
 * geometry (`dendriteMarks` / `dendriteStrands` in `FigurePrimitives`); this
 * walks every course the map is drawn along and writes down where a particle
 * would sit on it, what phase of the tide it breathes on, and how bright it is.
 * Stage three draws it. Nothing here renders anything.
 *
 * WHY IT IS BAKED AND NOT SIMULATED — the argument `formation.ts` already makes
 * for the arrival, applied to the resting state. Nothing about this field is
 * emergent: every point has one job, which is to be at a particular place on
 * the tissue and to breathe on a particular phase. A per-frame physics problem
 * over thousands of points would be paying for an image that is known in
 * advance. So the whole cloud is one flat `Float32Array` written at module
 * load, and playback is an evaluation of that table — one sine and one fill per
 * point, no allocation, no lookups, no branching on structure.
 *
 * THE POINT THIS TURNS ON: DENSITY CARRIES THE HIERARCHY, BECAUSE WIDTH CANNOT.
 * DG-05 asks for at least four visibly distinct generations and gets them from
 * stroke width — a trunk is drawn fatter than a twig. A point has no width to
 * give. What it has is neighbours, and DG-06 already says density is how this
 * drawing makes texture: "thousands of small marks reading as one surface". So
 * the spacing between points is a function of the strand's own weight — a thick
 * course is sampled closer and reads as a dense, bright run; a fine one is
 * sampled sparsely and reads as a thin scatter. The generations survive as
 * separable densities rather than separable widths, which is the same
 * information in the medium that can carry it.
 *
 * That is a claim about the drawing, not just about the code, and it is the
 * thing stage three's flag exists to let someone judge. See `docs/OPEN.md` 32.
 */

/**
 * x, y, phase, shine, focus.
 *
 * FOCUS IS DEPTH, AND DEPTH IS THE GENERATION.
 *
 * An island of this organism is not flat: a cell body and its trunks sit in
 * front, the mid arbor behind them, the finest reticulation behind that. The
 * drawing had every point in one plane, so an island read as a disc of even
 * material rather than as something with a near and a far side.
 *
 * The plane a point belongs to is decided by the width the strand was drawn at,
 * which is already the generation (DG-05) — so depth and hierarchy are the same
 * fact read twice, and a change to one cannot drift from the other. Three
 * planes, at full, 0.7 and 0.4 of focus.
 *
 * IT IS NOT A BLUR. GR-07 permits a soft pass only over line geometry, with a
 * measured gate, and FW-05 puts the far plane behind ONE Gaussian over a group
 * — neither is available to a canvas drawing 52k points, and a real blur here
 * would be a per-frame pass over the whole buffer, which is the cost PF-04
 * exists to refuse. Recession is carried the way a camera carries it instead:
 * the far planes are dimmer and their marks fractionally softer-edged, which at
 * one device pixel is a size the eye reads as out-of-focus rather than as
 * smaller. They stay points — nothing here is allowed to grow into an area
 * (DG-02).
 */
export const CLOUD_STRIDE = 8;
export const C_X = 0, C_Y = 1, C_PHASE = 2, C_SHINE = 3, C_FOCUS = 4,
  C_ALONG = 5, C_RUN = 6, C_DEPTH = 7;

export interface TissueCloud {
  /** every point, flat: x y phase shine focus */
  data: Float32Array;
  count: number;
  /** furthest any point sits from the core, in map units — the tide's outer edge */
  reach: number;
}

/** A course the tissue is drawn along, with the weight it was drawn at. */
export interface WeightedStrand {
  pts: ReadonlyArray<readonly [number, number]>;
  /** stroke width the SVG drew this at — the generation, in the only units it had */
  width: number;
  opacity: number;
  /**
   * How much of this course's brightness the conducted pulse carries, 0..1.
   *
   * THIS IS THE DIFFERENCE BETWEEN TISSUE AND A SIGNAL, and it is why the two
   * do not look alike. A cell's own arbor is material: it is there whether
   * anything is passing through it or not, so it conducts gently and stays
   * continuous. A connection BETWEEN cells is not a cord strung across the gap
   * — it is a path something travels along, and at rest there is nothing to
   * see. Near 1 here means the course is almost dark between pulses and full
   * only as one passes, which reads as a shot of light rather than as a string.
   *
   * It is never exactly 1: a course that reached zero would vanish, and an
   * organism whose connections disappear between spikes is a different claim
   * about the graph than the one the map makes (OG-01 — everything is
   * connected, at rest, all the time).
   */
  conduct?: number;
}

/**
 * Units between points on a course of width 1.
 *
 * The dial, spent against point count rather than taste — the same argument
 * DG-06 makes about beading and `formation.ts` makes about its own spacing.
 * Closer reads as a continuous line of light, which defeats the whole point:
 * the tissue should be legible as an assembly of separate marks until the
 * moment it is not.
 */
/*
 * Closer packing: the cells carry more marks than they did.
 *
 * Density IS the generation in this renderer (see WEIGHT_PULL), so tightening
 * the base tightens every course in proportion and the hierarchy is preserved —
 * a trunk stays separably denser than a twig, which is what DG-05 needs. It is
 * the one dial to measure after moving, and it was: see docs/OPEN.md.
 */
const BASE_SPACING = 4.05;

/**
 * How hard weight pulls the spacing in.
 *
 * A map arbor runs from `width` 0.85 at the trunk to the 0.22 floor at the
 * finest twig — a spread of about 3.9:1, which is roughly the four separable
 * generations DG-05 asks for. At this exponent that becomes a spacing spread of
 * about 2.3:1 and, because brightness carries the rest, a clearly readable
 * difference between a trunk and a twig without the trunk becoming a bar.
 */
const WEIGHT_PULL = 0.55;

const PHI = 1.6180339887498949;

/** Deterministic, so the cloud is the same drawing on every load. */
const rnd = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Write the resting field down.
 *
 * Walks each polyline at CONSTANT ARC LENGTH rather than per vertex, exactly as
 * `formation.ts` does and for the same reason: the strands are not evenly
 * tessellated — the meander puts its vertices where the curvature is — so
 * sampling vertices crowds points into the bends and leaves the long easy runs
 * bare, which is the opposite of what tissue looks like.
 */
export function bakeTissue(
  strands: ReadonlyArray<WeightedStrand>,
  cx: number,
  cy: number,
  opts: { spacing?: number } = {}
): TissueCloud {
  const base = opts.spacing ?? BASE_SPACING;

  const xs: number[] = [];
  const ys: number[] = [];
  const ws: number[] = [];
  const fs_: number[] = [];
  const as_: number[] = [];
  const rs_: number[] = [];
  const ds_: number[] = [];

  let reach = 1;

  for (let s = 0; s < strands.length; s++) {
    const st = strands[s];
    const pts = st.pts;
    if (pts.length < 2) continue;

    /* Weight decides the spacing: this is where a generation stops being a
       width and becomes a density. Clamped so a hairline never degenerates to
       one point on a whole course, and a trunk never packs into a solid rule. */
    const w = Math.max(0.18, Math.min(1.4, st.width));
    const spacing = Math.max(1.8, base / (WEIGHT_PULL + w));

    /* …and the rest of the generation is carried as brightness, so a trunk is
       both closer-packed AND lighter than a twig. Opacity the strand was drawn
       at rides along, because a dim arbor is dim tissue, not thin tissue.

       THE TISSUE HAS TO OUTSHINE WHAT DELIVERS IT. Measured against the
       formation: a travelling particle reaches alpha 1.0, while a twig at this
       curve's old floor settled at about 0.31 — so the carriers were three
       times brighter than the material, and the eye read the transport as the
       subject. The branches are what the drawing IS; the particles are only
       how it got there. The floor and the slope both come up, which lifts the
       fine generations most, where the gap was worst. DG-05's generations are
       untouched: this scales the whole ramp, so a trunk stays separably
       brighter than a twig — it is the ratio to the FORMATION that changes. */
    const shine = Math.min(1, (0.5 + w * 0.72) * Math.max(0.24, st.opacity));

    /* Which plane this course lies in — see C_FOCUS. Trunks in front, the
       finest reticulation furthest back, and the mid arbor between them. */
    const focus = w >= 0.72 ? 1 : w >= 0.38 ? 0.4 : 0.2;

    /*
     * SALTATORY CONDUCTION, WHICH IS THE ONLY WAY LIGHT MAY RUN ALONG A STRAND.
     *
     * The connections read as static cords: a course was a row of points at one
     * brightness, so the map's edges were the one part of the organism with no
     * life in them. LC-02 forbids the obvious fix outright — an animated
     * dash offset gives light two ends and "those ends always read as a bright
     * capsule sliding over the drawing" — and names the one permitted answer:
     * stations that share a period and take a delay from their position along
     * the fibre, so the spike appears to leap distally. "Nothing moves and
     * nothing has ends — each node simply fires later than the one behind it."
     *
     * A point cloud is that mechanism already built. Every point records how far
     * along its own course it lies, and the renderer offsets one shared clock by
     * that distance. No mark travels; each simply brightens after its neighbour,
     * which is what conduction actually is.
     *
     * DIRECTION IS PER COURSE. The rate carries a sign, so some edges conduct
     * outward and some inward and the map stops pulsing in unison. Rates are
     * spread on the golden ratio (LC-04), so no two courses fall into a simple
     * ratio and the field never resolves into a beat.
     */
    const runFrom = as_.length;
    let travelled = 0;
    const runRate =
      (rnd(s * 5.1 + 3) < 0.5 ? -1 : 1) * (0.085 + ((s * PHI) % 1) * 0.075);
    /* Tissue conducts gently and stays visible; a connection is nearly dark
       between shots. See `conduct` on WeightedStrand. */
    const conduct = st.conduct ?? 0.18;

    let carried = rnd(s * 3.7 + 1) * spacing;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1];
      const bx = pts[i][0], by = pts[i][1];
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;

      let at = spacing - carried;
      while (at <= len) {
        const t = at / len;
        const px = ax + dx * t;
        const py = ay + dy * t;
        xs.push(px);
        ys.push(py);
        ws.push(shine);
        fs_.push(focus);
        as_.push(travelled + at);
        rs_.push(runRate);
        ds_.push(conduct);
        const d = Math.hypot(px - cx, py - cy);
        if (d > reach) reach = d;
        at += spacing;
      }
      carried = (carried + len) % spacing;
      travelled += len;
    }

    /* Normalise the distances this course just wrote to 0..1, so one clock
       serves every course whatever its length — a long edge conducts over the
       same cycle as a short one, which is what keeps the map in step. */
    const span = travelled || 1;
    for (let k = runFrom; k < as_.length; k++) as_[k] /= span;
  }

  /*
   * Thin to what the device can carry, with the same dial the organism itself
   * is built with, so a phone gets the same field drawn more sparsely — never a
   * different one. Dropping by a stride rather than at random keeps the
   * thinning even along every course, which matters more here than anywhere
   * else: density IS the hierarchy now, and random thinning would eat the
   * generations unevenly.
   */
  const keep = Math.max(0.16, Math.min(1, DENSITY));
  const step = 1 / keep;
  const count = Math.floor(xs.length * keep);
  const data = new Float32Array(count * CLOUD_STRIDE);

  for (let n = 0; n < count; n++) {
    const src = Math.min(xs.length - 1, Math.round(n * step));
    const o = n * CLOUD_STRIDE;
    const x = xs[src];
    const y = ys[src];

    data[o + C_X] = x;
    data[o + C_Y] = y;

    /*
     * Phase from distance to the core, exactly as `tidePhase()` sets it for the
     * drawn tissue (LC-01): the swell rolls outward as a wave rather than
     * arriving everywhere at once, which is the difference between a tide and a
     * shimmer. The golden-ratio offset on top is LC-04 — no two points land on
     * a simple ratio, so the field never resolves into pulses.
     */
    const dist = Math.hypot(x - cx, y - cy);
    data[o + C_PHASE] = (dist / reach) + ((n * PHI) % 1) * 0.12;
    data[o + C_SHINE] = ws[src];
    data[o + C_FOCUS] = fs_[src];
    data[o + C_ALONG] = as_[src];
    data[o + C_RUN] = rs_[src];
    data[o + C_DEPTH] = ds_[src];
  }

  return { data, count, reach };
}
