/**
 * The forms the entry field assembles into, as point clouds.
 *
 * WHY THESE ARE COMPUTED AND NOT RECORDED. The map's formation plays a baked
 * recording (`src/utils/formation.ts`) because its targets are the map's own
 * ~8,000 strands, which only exist once the organism has been generated —
 * there is nothing to compute them from at module load. These forms are
 * parametric: eight processes off a soma, a pappus, a shell, a ring, a field of
 * rows. Computing them costs a few thousand multiplications once, and shipping
 * them as data would put kilobytes of Float32 on the front door's critical path
 * to save that.
 *
 * EVERY FORM IS A POINT CLOUD, WHICH IS THE ONLY THING IT MAY BE (DG-02). Not
 * one of these is a filled shape or a stroked outline: a sphere is points on a
 * shell, a ring is points on a circumference, the field is points on rows. That
 * rule permits a point by name — "a bouton, a seed tip, a nucleolus is a bright
 * dot" — and permits nothing else here. Where a form implies a line, the line
 * is the density of points along it, which is **Density Is the Texture**
 * (DG-06) doing the work it already does in the tissue.
 *
 * AND NO RAY IS STRAIGHT (DG-01). The pappus and the cell are chains of points
 * along quadratic curves, and the field's rows are sums of two sines. A row of
 * points sitting on a ruled line is the zero-bow case that rule names, and it
 * would be the easiest thing in the world to write by accident here — the
 * reference material for this field is full of perfectly straight rays.
 */

/** A form: two arrays of the same length, in units of half the box. */
export interface Cloud {
  x: Float32Array;
  y: Float32Array;
}

/** Deterministic, so a form is the same drawing on every load and every device. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A point along a quadratic, which is how every curve in this drawing is written. */
function quad(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number) {
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1] as const;
}

/* ─────────────────────────────────────────────────────────── the cell ─── */

/**
 * The boot splash's own geometry, to the number.
 *
 * This is the form the field is holding when the reader arrives, and it is a
 * transcription rather than a likeness: the same eight processes, the same
 * sixteen finer ones, the same nine tips, lifted out of the `<path>` data in
 * `index.html`. The splash paints that cell before a byte of JavaScript and
 * hands over to this screen, and the handover has to be a thickening rather
 * than a swap — which it can only be if the first thing the field spells is the
 * mark already on the glass, at the size it is already drawn.
 *
 * Coordinates are the splash's 100×100 viewBox, mapped so that ±1 is exactly
 * its 132px. The component holds the cell to that size whatever the box grows
 * to, so the handover stays exact and the other forms use the extra room.
 */
const PRIMARY: Array<readonly [number, number, number, number]> = [
  [57, 40, 62, 27], [60, 52, 74, 48], [57, 62, 68, 71], [48, 62, 43, 76],
  [38, 57, 26, 60], [40, 44, 28, 36], [49, 38, 46, 24], [63, 45, 78, 34]
];

const FINE: Array<readonly [number, number, number, number, number, number]> = [
  [62, 27, 66, 21, 65, 14], [62, 27, 68, 24, 73, 19],
  [74, 48, 82, 46, 88, 49], [74, 48, 80, 52, 84, 58],
  [68, 71, 73, 77, 72, 84], [68, 71, 75, 72, 81, 77],
  [43, 76, 41, 83, 36, 88], [43, 76, 47, 83, 46, 90],
  [26, 60, 18, 62, 12, 60], [26, 60, 20, 66, 14, 68],
  [28, 36, 20, 33, 15, 27], [28, 36, 22, 39, 15, 39],
  [46, 24, 44, 16, 40, 11], [46, 24, 49, 16, 48, 9],
  [78, 34, 85, 30, 90, 24], [78, 34, 86, 36, 92, 33]
];

const TIPS: Array<readonly [number, number]> = [
  [62, 27], [74, 48], [68, 71], [43, 76], [26, 60], [28, 36], [46, 24], [78, 34]
];

function cell(n: number): Cloud {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const r = rng(0x5eed01);
  /** viewBox unit → half-box unit, at the splash's own 132px */
  const v = (u: number) => (u - 50) / 50;

  /* The shares: the soma is a crowd, the processes are chains, the tips are
     beads. Density says which is which — there is no width here to say it. */
  /* THE SOMA IS A SIXTEENTH, NOT AN EIGHTH. At 0.12 it was ~100 points inside a
     0.075 radius and the cell read as a dense ball with fringe: the centre won
     the whole drawing, because density IS the mark here (DG-06) and the densest
     thing is the one you see. A cell is spoken by the arbor, so the arbor gets
     the points and the receptacle gets just enough to be a crowd. */
  const nSoma = Math.round(n * 0.055);
  const nTip = Math.round(n * 0.1);
  const nFine = Math.round(n * 0.33);
  const nPrim = n - nSoma - nTip - nFine;

  let i = 0;
  for (let k = 0; k < nSoma; k++, i++) {
    const a = r() * Math.PI * 2;
    const rad = Math.pow(r(), 1.7) * 0.055;
    x[i] = Math.cos(a) * rad;
    y[i] = Math.sin(a) * rad;
  }
  /* The eight processes. Points are spaced EVENLY along each curve rather than
     drawn at random along it: random spacing clumps, and a clumped chain is a
     smear where a filament should be. The count per arm is fixed so all eight
     carry the same weight, which is what makes them read as eight. */
  {
    const per = Math.max(1, Math.round(nPrim / PRIMARY.length));
    for (let arm = 0; arm < PRIMARY.length; arm++) {
      const p = PRIMARY[arm];
      for (let k = 0; k < per && i < nSoma + nPrim; k++, i++) {
        /* from just off the soma to the tip, so the arm starts where the
           crowd ends instead of inside it */
        const t = 0.12 + 0.88 * ((k + 0.5) / per);
        const [px, py] = quad(50, 50, p[0], p[1], p[2], p[3], t);
        /* a hair of scatter, well under the gap between arms — enough that the
           chain is tissue rather than a plotted curve, not enough to blur it */
        x[i] = v(px + (r() - 0.5) * 0.55);
        y[i] = v(py + (r() - 0.5) * 0.55);
      }
    }
    while (i < nSoma + nPrim) { x[i] = 0; y[i] = 0; i++; }
  }
  /* the finer generation, which is what makes it tissue rather than a star */
  {
    const per = Math.max(1, Math.round(nFine / FINE.length));
    const end = i + nFine;
    for (let f0 = 0; f0 < FINE.length; f0++) {
      const f = FINE[f0];
      for (let k = 0; k < per && i < end; k++, i++) {
        const t = (k + 0.5) / per;
        const [px, py] = quad(f[0], f[1], f[2], f[3], f[4], f[5], t);
        x[i] = v(px + (r() - 0.5) * 0.45);
        y[i] = v(py + (r() - 0.5) * 0.45);
      }
    }
    while (i < end) { x[i] = 0; y[i] = 0; i++; }
  }
  /* the bead tips */
  for (let k = 0; k < nTip; k++, i++) {
    const tp = TIPS[k % TIPS.length];
    const a = r() * Math.PI * 2;
    const rad = Math.pow(r(), 0.6) * 1.1;
    x[i] = v(tp[0] + Math.cos(a) * rad);
    y[i] = v(tp[1] + Math.sin(a) * rad);
  }
  return { x, y };
}

/* ───────────────────────────────────────────────────────── the pappus ─── */

/**
 * A seed head: rays that hold their bearing, thinning and beading at the tip.
 *
 * Drawn as a field is drawn rather than as a cell is (DG-08): the bearing drifts
 * slowly along each ray instead of forking, because a ray that forks randomises
 * its heading over three generations and the form stops reading as radial. The
 * drift is scaled by distance, so the near end is honestly radial and only the
 * far end strays.
 */
function pappus(n: number): Cloud {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const r = rng(0x5eed02);
  const RAYS = 34;
  const per = Math.max(2, Math.floor(n / RAYS));

  for (let i = 0; i < n; i++) {
    const ray = i % RAYS;
    /* the golden angle: an even fan reads as a sunburst, which is a graphic
       device rather than a thing that grew (DG-08) */
    const a0 = ray * 2.399963 + (r() - 0.5) * 0.06;
    const len = 0.52 + ((ray * 7919) % 100) / 100 * 0.4;
    const k = (i / RAYS | 0) % per;
    /* thinning outward: the exponent puts more points near the receptacle */
    const t = Math.pow((k + r()) / per, 0.72);
    const drift = (((ray * 104729) % 100) / 100 - 0.5) * 0.55;
    const a = a0 + drift * t * t;
    const rad = t * len;
    x[i] = Math.cos(a) * rad + (r() - 0.5) * 0.012;
    y[i] = Math.sin(a) * rad + (r() - 0.5) * 0.012;
    /* the bead at the end of a filament — the one solid mark DG-02 allows */
    if (k === per - 1) {
      x[i] = Math.cos(a) * (len + 0.035);
      y[i] = Math.sin(a) * (len + 0.035);
    }
  }
  return { x, y };
}

/* ───────────────────────────────────────────────────────── the shell ─── */

/**
 * Points on a sphere, seen flat.
 *
 * A Fibonacci lattice, which distributes on a shell without the pole crowding a
 * lat/long grid gives — the same even-without-being-regular spacing the golden
 * angle buys the pappus above. Both hemispheres are kept: the far side reads as
 * the denser grain at the rim, which is what makes it a shell and not a disc.
 */
function shell(n: number): Cloud {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const r = rng(0x5eed03);
  const R = 0.88;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const phi = Math.acos(1 - 2 * t);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    /* tipped, so the lattice does not read as a regular grid face-on */
    const sx = Math.sin(phi) * Math.cos(theta);
    const sy = Math.cos(phi);
    const sz = Math.sin(phi) * Math.sin(theta);
    const TILT = 0.42;
    const yy = sy * Math.cos(TILT) - sz * Math.sin(TILT);
    x[i] = sx * R + (r() - 0.5) * 0.01;
    y[i] = yy * R + (r() - 0.5) * 0.01;
  }
  return { x, y };
}

/* ────────────────────────────────────────────────────────── the ring ─── */

/**
 * A ring seen at an angle, with its own grain around it.
 *
 * Most of the cloud is the circumference; the rest is a thin halo that keeps the
 * edge from reading as a drawn outline. A ring is the one form here that could
 * most easily become a stroked circle, and a stroked circle is a line with no
 * bow in it anywhere — the halo and the radial scatter are what keep it a
 * density instead.
 */
function ring(n: number): Cloud {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const r = rng(0x5eed04);
  const R = 0.82;
  const SQUASH = 0.46;
  const halo = Math.round(n * 0.22);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 * 3 + r() * 0.09;
    if (i < halo) {
      const rad = R * (0.62 + r() * 0.62);
      x[i] = Math.cos(a) * rad;
      y[i] = Math.sin(a) * rad * SQUASH;
    } else {
      const rad = R * (1 + (r() - 0.5) * 0.09);
      x[i] = Math.cos(a) * rad;
      y[i] = Math.sin(a) * rad * SQUASH;
    }
    /* a slow swell around the circumference, so the ring is not a perfect
       circle — the same refusal of the ruled figure DG-01 asks for in a line */
    const swell = 1 + Math.sin(a * 3) * 0.045;
    x[i] *= swell;
    y[i] *= swell;
  }
  return { x, y };
}

/* ───────────────────────────────────────────────────────── the field ─── */

/**
 * Rows of points over a standing wave.
 *
 * Two sines of different period, which is **Fibres Take Direct Courses**
 * (DG-04) applied to a surface: one dominant low frequency and one small
 * secondary is tissue, and a dozen harmonics is a scribble. The rows spread and
 * separate toward the bottom, so the field reads as receding rather than as a
 * grid — and no row is ever level, which is the whole reason this form is
 * allowed to exist here at all.
 */
function field(n: number): Cloud {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const r = rng(0x5eed05);
  const ROWS = 15;
  const per = Math.max(2, Math.floor(n / ROWS));
  for (let i = 0; i < n; i++) {
    const row = i % ROWS;
    const k = ((i / ROWS) | 0) % per;
    /* depth: near rows are wider apart and wider across */
    const d = row / (ROWS - 1);
    const spread = 0.34 + d * 0.66;
    const u = (k + r() * 0.9) / per;
    const px = (u - 0.5) * 2 * spread;
    const base = -0.62 + Math.pow(d, 1.35) * 1.28;
    const wave =
      Math.sin(px * 3.1 + row * 0.42) * 0.1 +
      Math.sin(px * 6.7 - row * 0.23) * 0.034;
    x[i] = px;
    y[i] = base + wave * (0.45 + d * 0.75) + (r() - 0.5) * 0.008;
  }
  return { x, y };
}

/* ───────────────────────────────────────────────────────────────────────── */

/**
 * The sequence, and the one that has to be first.
 *
 * The cell leads because the splash is already holding it. Everything after is
 * ordered so that consecutive forms are unalike — a shell into a ring is two
 * round things in a row, and the field between them gives the eye a change of
 * kind rather than a change of degree.
 */
export const SHAPE_BUILDERS: Array<(n: number) => Cloud> = [cell, pappus, shell, field, ring];

/** Index of the form the splash hands over — held at the splash's own size. */
export const CELL_SHAPE = 0;

export function buildShapes(n: number): Cloud[] {
  return SHAPE_BUILDERS.map(b => b(n));
}
