import React from 'react';
import { LivingFigure, FigureNode, FigureEdge } from '../figures/LivingFigure';
import { arcSegment } from '../figures/FigurePrimitives';

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

/**
 * WHERE THE SPACE IS, AND HOW IT IS SQUASHED.
 *
 * "The sheet is wider than it is tall; the space is not" — so the anisotropy
 * exists purely to fit a rectangle, and a different rectangle wants a different
 * one. That was already true when it was written and it is why this figure
 * needed no rearranging at all to stand up: the nebula is polar, and turning
 * the sheet turns the squash with it. Nothing about the model changes, because
 * a model that had a preferred orientation would be claiming a frame it spends
 * every other rule denying (FW-10).
 */
interface Space {
  cx: number; cy: number; kx: number; ky: number;
  /** the frame the field is culled against */
  w: number;
  /** where the field stops, which is the top of the band the sum is set in */
  fieldBottom: number;
  /** how far a centre's wave reaches before it has fully faded */
  reach: number;
  /** points nearer a centre than this are left out — the tissue is there already */
  nearCull: number;
}

const WIDE_SPACE: Space = {
  cx: 400, cy: 170, kx: 1.30, ky: 0.78,
  w: 800, fieldBottom: 400, reach: 190, nearCull: 30
};

/**
 * THE SQUASH INVERTS, AND IT HAS TO INVERT BY MORE THAN THE SHEET DOES.
 *
 * The first narrow space took kx 0.72 / ky 0.92 — nearly round, which is what
 * a 360x700 drawing region looks like once the sum has its band. It drew
 * GRAPH PAPER: a set of concentric dotted rings around the core, which is the
 * exact read the ring-spacing exponent was tuned to avoid and which this file
 * already records losing once.
 *
 * The cause is not the warp, which is unchanged. It is that a lattice only
 * reads as a MEDIUM while the frame is cutting it. In the wide form the
 * horizon at 520 comes to 676 units against a half-width of 400, so the sheet
 * shows a band through the middle of a very wide ellipse and you see radial
 * grain rather than closed rings. At 0.72 the whole lattice fitted inside the
 * frame, rings and rim and all, and a complete polar grid is a polar grid.
 *
 * So the narrow space is squashed the other way, and HARDER than the sheet
 * asks for: 0.52 against 1.02. At the inverse of the wide ratio the horizon is
 * cut again and the medium fills the frame, but the inner rings come back —
 * they are near-circles at that setting, and a near-circle reads as a ring
 * where a long ellipse reads as grain. The squash has to do the work the wide
 * form gets for free from a 800x430 sheet. The horizon lands at 270 against a
 * half-width of 180, and the network cells at 54% of it against 60% in the
 * wide form, so the neighbourhood keeps about the share of the sheet it had.
 *
 * AND THE FIELD STOPS UNDER THE PLATE, NEVER BEFORE IT. Culled at 452 the
 * lattice ended in a ruled horizontal edge across the sheet, which is the one
 * thing DG-09 forbids a field — it dissolves, it does not end. The wide form
 * never had to think about it because its cull at 400 falls inside the opaque
 * part of the plate under the sum. 500 is the same relation on this sheet.
 */
const PORTRAIT_SPACE: Space = {
  cx: 180, cy: 224, kx: 0.52, ky: 1.02,
  w: 360, fieldBottom: 500, reach: 150, nearCull: 20
};

/** the narrow sheet: the drawing to 452, the sum in the band below it */
const P_H = 700;

const CX = WIDE_SPACE.cx;
const CY = WIDE_SPACE.cy;

const at = (sp: Space, a: number, r: number): [number, number] => [
  sp.cx + Math.cos(a) * r * sp.kx,
  sp.cy + Math.sin(a) * r * sp.ky
];

const pt = (a: number, r: number): [number, number] => at(WIDE_SPACE, a, r);

/* --------------------------------------------------------------- the field */

/** past the far corner of the frame, so every ray is cut rather than ended */
const HORIZON = 520;


/**
 * THE FIELD IS A PARTICLE SYSTEM, AND THE PARTICLES CARRY THE TRAFFIC.
 *
 * WHAT IT REPLACED, AND WHY. The field was 32 long rays drawn as strokes. It
 * said "a space that does not stop" and nothing else — the space was inert, and
 * a figure whose whole claim is that information is *moving between centres*
 * drew no movement at all. Beading those rays was tried first and was not
 * enough: thirteen dots on each of thirty-two courses is a sparse fringe, not a
 * medium, and the drawing still read as filament.
 *
 * So the space itself is sampled. A lattice — rings by spokes, warped — is what
 * a medium looks like when you can see its grain, and it is dense enough that
 * the FIELD becomes the figure's mass rather than a fringe around the cells.
 *
 * THE WAVES COME FROM EVERY CENTRE AT ONCE, WHICH IS THE FORMULA.
 *
 *     U(you) = Σ P(everyone) · d(angle, distance)
 *
 * Each point takes its phase from its distance to the NEAREST centre — the core
 * and all six network cells. So brightening rolls outward from every one of
 * them simultaneously, and where two centres' waves meet the lattice carries
 * both. That is the sum, drawn: what reaches you is everyone else's production,
 * bent by how far off it started. A single wave from the middle would have been
 * a transmitter, and the figure exists to deny that there is one.
 *
 * IT MOVES BY PHASE, NEVER BY MOTION (LC-01). Nothing travels, nothing has
 * ends, no dash slides: every point simply brightens later than the one inside
 * it. That is the only mechanism LC-02 leaves open, and it is the honest one —
 * information does not slide through a medium as an object, it is regenerated
 * at each place in turn.
 *
 * HOW IT COSTS ALMOST NOTHING (PF-03, PF-04). The obvious build — one CSS
 * animation per point — is ~1,400 animated elements, which is exactly the
 * numerousness PF-04 warns about. Instead the points are BUCKETED BY PHASE:
 * every point that fires at the same moment goes into one <g>, and the group
 * carries the animation. That is 30 animated elements for 1,400 particles, all
 * of it opacity, which is the channel PF-03 sends organism-wide motion through.
 * No transform, no filter, nothing per-frame per-point.
 *
 * NOTHING HERE IS A LINE OR A FILL (DG-01, DG-02). There is not one stroke in
 * this field — it is entirely points, which DG-02 admits by name ("a bouton, a
 * seed tip, a nucleolus is a bright dot and is allowed"). The lattice is warped
 * by the same bearing drift the rays used, so no row of it is straight and no
 * ring of it closes into a rim (DG-09).
 */

/** every centre the waves start from: the core, and the six other cells.
    Lazy because `NET` is declared with the cells, below this block. */
const CENTRES_CACHE = new Map<Space, Array<[number, number]>>();
const centres = (sp: Space): Array<[number, number]> => {
  let c = CENTRES_CACHE.get(sp);
  if (!c) {
    c = [[sp.cx, sp.cy], ...NET.map(([a, r]) => at(sp, a, r))];
    CENTRES_CACHE.set(sp, c);
  }
  return c;
};

/** phase buckets — the granularity of the wave, and the animated element count */
const BUCKETS = 30;

const ParticleField: React.FC<{ sp: Space }> = ({ sp }) => {
  /* Rings by spokes. Both counts are the density of the medium, and the whole
     cost of the figure is here: RINGS × SPOKES points, culled to the frame. */
  const RINGS = 30;
  const SPOKES = 76;
  const R0 = 26;

  /** points grouped by the phase they fire on */
  const buckets: Array<Array<{ x: number; y: number; r: number; o: number }>> =
    Array.from({ length: BUCKETS }, () => []);

  for (let ri = 0; ri < RINGS; ri++) {
    /* Radii open out toward the rim, but only gently. At pow 1.35 the lattice
       banked almost all of itself into the middle and drew a set of concentric
       dotted rings around the core — graph paper, which is the read this is
       trying to avoid. 1.12 keeps a little more grain close in without
       collapsing the whole medium into the centre. */
    const t = ri / (RINGS - 1);
    const rad = R0 + Math.pow(t, 1.12) * (HORIZON - R0);

    for (let si = 0; si < SPOKES; si++) {
      const a0 = (si / SPOKES) * 6.283185;
      /* The warp. Two low frequencies, amplitude growing with radius, so the
         lattice is a distorted space rather than a polar grid — no row of it is
         straight and nothing closes into a ring. Same device the rays used. */
      /* Amplitude no longer scales from zero at the centre: `0.35 + t` keeps a
         third of the warp at the innermost ring, which is what stops the first
         few rings reading as circles drawn round the core. Two low frequencies
         only — more is noise, which is the failure DG-04 records. */
      const warp = 0.13 * (0.35 + t);
      const drift =
        (Math.sin(a0 * 2.0 + t * 3.1) * 0.62 + Math.sin(a0 * 3.0 - t * 5.3) * 0.28) * warp;
      const rWarp = rad * (1 + Math.sin(a0 * 3.0 + t * 4.7) * 0.09 * (0.4 + t));
      const [x, y] = at(sp, a0 + drift, rWarp);

      // cull anything the sheet will never show
      if (x < -30 || x > sp.w + 30 || y < -30 || y > sp.fieldBottom) continue;

      /* Distance to the nearest centre decides BOTH the phase and the
         brightness: a point near a centre fires early and burns brighter,
         which is what makes each cell look like a source rather than a dot
         sitting on a grid. */
      let near = Infinity;
      let nearIdx = 0;
      let nearA = 0;
      const cs = centres(sp);
      for (let ci = 0; ci < cs.length; ci++) {
        const d = Math.hypot(x - cs[ci][0], y - cs[ci][1]);
        if (d < near) {
          near = d;
          nearIdx = ci;
          /* the bearing FROM that centre, which is what turns the wave's
             equal-phase lines into spirals below */
          nearA = Math.atan2(y - cs[ci][1], x - cs[ci][0]);
        }
      }

      /* Points inside a cell's own arbor are omitted — the tissue is already
         drawn there and a lattice under it reads as noise behind the one thing
         the figure wants counted. */
      if (near < sp.nearCull) continue;

      const reach = sp.reach;
      const nearT = Math.min(1, near / reach);
      /* fades with distance from its centre, and again toward the frame, so the
         field dissolves rather than ending (DG-09) */
      const edge = Math.pow(1 - Math.min(1, rad / HORIZON), 0.55);
      /* Lifted from (0.5 − …) × (0.35 + …): at the old values the lattice was
         dimmer than the filaments crossing it, so the figure still read as
         tissue with speckle behind it rather than as cells inside a medium.
         GR-04 cuts the other way here — the thing that was hard to read WAS the
         field, and the ground behind it is already empty. */
      const o = (0.72 - nearT * 0.42) * (0.42 + edge * 0.82);
      if (o < 0.04) continue;

      /*
       * THE WAVE TURNS, AND HALF THE CENTRES BREATHE IN.
       *
       * Phase was distance alone, so every equal-phase line was a circle and
       * the wave could only pulse in and out. Two terms are added and NOTHING
       * ELSE CHANGES — no transform, no second animation, no extra element.
       * The field still costs thirty animated groups for fourteen hundred
       * points, which is the whole reason it is built this way (PF-03, PF-04).
       *
       * THE TWIST makes it spin. Adding the bearing to the phase tilts every
       * equal-phase line into an Archimedean spiral, and a spiral whose phase
       * advances is a spiral that appears to ROTATE. Nothing rotates: each
       * point simply brightens after the one beside it, which is the only
       * mechanism LC-02 leaves open and the one the figure already uses. A
       * transform on this group would re-rasterise fourteen hundred circles a
       * frame, which is precisely the regression PF-03 records.
       *
       * THE SIGN makes it attract. The radial term ran one way for every
       * centre, so all seven did the same thing at the same time — which is a
       * transmitter with seven heads. Reversed on alternate centres, half the
       * cells draw the medium in while the other half throw it out, and the
       * two sets interfere across the sheet. That is what the figure already
       * claims in words: many centres, and the sets interfere. A cell that
       * only emits is a broadcaster; a field that is also drawn IN is what
       * makes each cell read as a participant in the medium rather than a
       * source parked on top of it.
       */
      const TWIST = 1;
      const inward = nearIdx % 2 === 1;
      const radial = (near / reach) * 0.85;
      const turn = ((nearA / 6.283185) + 1) % 1;
      const phase = (inward ? -radial : radial) + turn * TWIST;
      const bucket = Math.floor(phase * BUCKETS);

      /* WRAPPED PROPERLY, BECAUSE THE PHASE CAN NOW GO NEGATIVE.

         `(bucket + BUCKETS) % BUCKETS` was enough while the phase was a
         distance and could only be positive. The inward centres make it
         negative, and JavaScript's % keeps the sign of the DIVIDEND — so a
         point far from an inhaling centre indexed `buckets[-17]`, which is
         undefined, and the figure died on `.push` with a React error naming
         neither this file nor this line. Double-modulo is the idiom that
         actually wraps. */
      buckets[((bucket % BUCKETS) + BUCKETS) % BUCKETS].push({
        x: +x.toFixed(1),
        y: +y.toFixed(1),
        r: +(0.72 - nearT * 0.3).toFixed(2),
        o: +o.toFixed(3)
      });
    }
  }

  return (
    <g>
      {buckets.map((pts2, bi) =>
        pts2.length === 0 ? null : (
          <g
            key={bi}
            className="field-station"
            style={{
              animationDelay: `${(-(bi / BUCKETS) * 19.7).toFixed(2)}s`,
              ['--fire']: '1'
            } as React.CSSProperties}
          >
            {pts2.map((q, qi) => (
              <circle key={qi} cx={q.x} cy={q.y} r={q.r} fill="currentColor" opacity={q.o} />
            ))}
          </g>
        )
      )}
    </g>
  );
};

/* ------------------------------------------------------------- the cells */

/* Your network: six other centres, at deliberately unequal radii and angles.
   An even ring would read as a diagram of a network; unevenness reads as a
   neighbourhood, which is what a nebula is. */
const NET: Array<[number, number]> = [
  [0.55, 150], [1.75, 104], [2.62, 178], [3.55, 120], [4.55, 186], [5.42, 132]
];

const network = (sp: Space, scale: number): FigureNode[] => NET.map(([a, r], i) => {
  const [x, y] = at(sp, a, r);
  return {
    id: `net${i}`,
    kind: 'cell' as const,
    /* EVERY CENTRE TURNS, not only the middle one.
       The core alone spinning is a drawing with a hub, and a hub is the one
       reading this figure exists to deny — "wherever you are is a centre".
       Each satellite has its own field for that reason and now has its own
       rotation for the same one. */
    spin: true,
    x, y,
    /* Each of these is one term of the sum. They were r:8 against a field at
       nearly their own brightness and read as more field; the sum is only
       legible if its terms can be counted at a glance. */
    r: 10,
    /* its own field, at its own scale — a centre, not a satellite. An arbor is
       right here: at this size it reads as a cell gathering locally, which is
       exactly what it is. `scale` is the only concession the narrow form makes:
       a 46-unit field is a seventeenth of the wide sheet and an eighth of the
       narrow one, and six of them at that size fuse into the medium they are
       supposed to be standing in. */
    arborR: (46 + (i % 3) * 9) * scale,
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
const field = (sp: Space, scale: number): FigureNode[] => Array.from({ length: 9 }, (_, i) => {
  const t = (i + 0.5) / 9;
  const a = 1.1 + i * 2.399963229728653;
  const [x, y] = at(sp, a, 235 + Math.sqrt(t) * 130);
  return {
    id: `far${i}`,
    kind: 'minor' as const,
    x, y,
    r: 3.4 + (i % 3) * 0.7,
    arborR: (22 + (i % 3) * 6) * scale,
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
const nodesFor = (sp: Space, scale: number): FigureNode[] => [
  {
    id: 'you',
    kind: 'core',
    x: sp.cx, y: sp.cy,
    r: 17,
    /* A cell, not a field. The field is `ParticleField`, drawn behind everything;
       this arbor only has to say "there is a cell here", and the first attempt's
       radius-520 version said "there is fog here" instead. */
    arborR: 58 * scale,
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
  ...network(sp, scale),
  ...field(sp, scale)
];

const NODES: FigureNode[] = nodesFor(WIDE_SPACE, 1);
const PORTRAIT_NODES: FigureNode[] = nodesFor(PORTRAIT_SPACE, 0.62);
const NETWORK = network(WIDE_SPACE, 1);

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
/** where the drawing actually is, once the frame is taller than the field */
const RIM: React.CSSProperties = {
  ['--rim-cy' as string]: '40%',
  ['--rim-clear' as string]: '70%'
};

/** the same, for a frame where the drawing takes the top two thirds */
const P_RIM: React.CSSProperties = {
  ['--rim-cy' as string]: '30%',
  ['--rim-clear' as string]: '62%'
};

/** viewBox units, not pixels: this is a drawing that zooms (TY-02) */
const TERM = 21;
const GLOSS = 11;

/**
 * WHAT EACH TERM POINTS AT, SAID AS A PLACE IN THE MODEL RATHER THAN A POINT
 * ON THE SHEET.
 *
 * The landings were six pairs of hardcoded coordinates, and every one of them
 * was a cell — `[566,231]` is net0, `[258,132]` is net3, and the Σ fan is
 * net2, net1, net5, net0 in order. Written as numbers they only pointed at the
 * right cells in the rectangle they were measured in; written as the cells
 * themselves they point at them in any rectangle, which is what a second
 * layout needs and also what they always meant.
 *
 * The one landing that is not a cell stays what it was: `d` bends the output
 * on the way rather than at the far end, so it lands on open space out along
 * the plane — polar here, like everything else in this figure, so it turns
 * with the squash.
 */
type Landing =
  | { on: 'core'; dy: number }
  | { on: 'net'; i: number }
  | { on: 'space'; a: number; r: number };

const landing = (sp: Space, scale: number, l: Landing): [number, number] => {
  if (l.on === 'core') return [sp.cx, sp.cy + l.dy * scale];
  if (l.on === 'net') return at(sp, NET[l.i][0], NET[l.i][1]);
  return at(sp, l.a, l.r);
};

/**
 * Each term, what it denotes, and its gloss. Where any of it SITS is the
 * layout's business — see FORMULA_WIDE and FORMULA_PORTRAIT below.
 */
const TERMS: Array<{
  text: string; gloss: string;
  to: Landing; bend: number;
  /** extra landings, for the one term that denotes a set rather than a thing */
  fan?: Landing[];
}> = [
  {
    text: 'U(you)',
    gloss: 'wherever you are is a centre',
    to: { on: 'core', dy: 26 }, bend: 40
  },
  {
    text: 'Σ',
    gloss: 'over every other centre',
    to: { on: 'net', i: 3 }, bend: 30,
    /* the rest of the centres the sum runs over */
    fan: [{ on: 'net', i: 2 }, { on: 'net', i: 1 }, { on: 'net', i: 5 }, { on: 'net', i: 0 }]
  },
  {
    text: 'P(everyone)',
    gloss: 'what everyone else produces',
    to: { on: 'net', i: 0 }, bend: -30
  },
  {
    text: 'd(angle, distance)',
    gloss: 'bent by where it reaches you from',
    /* The bending happens on the way, not at the far end, so this lands on the
       course between another centre and you rather than on the centre itself. */
    to: { on: 'space', a: -0.01, r: 212 }, bend: -38
  }
];

/** the operators, which denote nothing and so point at nothing */
const OPERATORS = ['=', '·'];

/**
 * How the sum is SET — which is the one part of this figure a narrow sheet
 * genuinely breaks.
 *
 * The sum is twenty-six characters at 21 units and it runs across two thirds
 * of the wide sheet. At 360 units it does not fit on a line, and the two ways
 * of making it fit were both worse than breaking it: shrinking the type stops
 * it outranking the cell names, which is the whole reason it is set at 21, and
 * scaling the block by the width ratio does the same thing by arithmetic.
 *
 * So the narrow form breaks it where a formula is broken — before a binary
 * operator — and the glosses, which sit under their own terms on one row in
 * the wide form, descend in term order with each one still centred on the
 * column its term stands in. That is weaker than sitting directly underneath,
 * and it is the cost recorded rather than hidden.
 */
interface FormulaLayout {
  /** every piece of the sum: its text, where it sits, which row it is on */
  place: Record<string, { x: number; y: number }>;
  gloss: Record<string, { x: number; y: number }>;
  /** where the leaders leave from, measured up from each term's baseline */
  lift: number;
  /** the emptied ground under the sum */
  plate: { cx: number; cy: number; rx: number; ry: number };
}

const FY = 372;

const FORMULA_WIDE: FormulaLayout = {
  place: {
    'U(you)': { x: 191, y: FY },
    '=': { x: 240, y: FY },
    'Σ': { x: 273, y: FY },
    'P(everyone)': { x: 355, y: FY },
    '·': { x: 435, y: FY },
    'd(angle, distance)': { x: 545, y: FY }
  },
  gloss: {
    'U(you)': { x: 180, y: 400 },
    'Σ': { x: 280, y: 421 },
    'P(everyone)': { x: 400, y: 400 },
    'd(angle, distance)': { x: 640, y: 400 }
  },
  lift: 26,
  plate: { cx: 400, cy: FY + 14, rx: 330, ry: 62 }
};

const P_FY = 502;

const FORMULA_PORTRAIT: FormulaLayout = {
  place: {
    'U(you)': { x: 88, y: P_FY },
    '=': { x: 142, y: P_FY },
    'Σ': { x: 171, y: P_FY },
    'P(everyone)': { x: 248, y: P_FY },
    '·': { x: 82, y: P_FY + 40 },
    'd(angle, distance)': { x: 188, y: P_FY + 40 }
  },
  gloss: {
    'U(you)': { x: 96, y: P_FY + 78 },
    'Σ': { x: 172, y: P_FY + 100 },
    'P(everyone)': { x: 240, y: P_FY + 122 },
    'd(angle, distance)': { x: 180, y: P_FY + 144 }
  },
  lift: 26,
  plate: { cx: 180, cy: P_FY + 60, rx: 210, ry: 128 }
};

const Formula: React.FC<{ sp: Space; scale: number; L: FormulaLayout }> = ({ sp, scale, L }) => (
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
    <ellipse cx={L.plate.cx} cy={L.plate.cy} rx={L.plate.rx} ry={L.plate.ry}
      fill={`url(#${ID}-plate)`} />

    {/* every leader: tapering, bowed, landing in one bright terminal */}
    {TERMS.map(t => {
      const from = L.place[t.text];
      const to = landing(sp, scale, t.to);
      return (
      <g key={`lead-${t.text}`}>
        <path d={arcSegment(from.x, from.y - L.lift, to[0], to[1], t.bend)}
          fill="none" stroke="currentColor" strokeWidth={1.05}
          strokeLinecap="round" opacity={0.34} />
        <path d={arcSegment(from.x, from.y - L.lift, to[0], to[1], t.bend)}
          fill="none" stroke="currentColor" strokeWidth={0.4}
          strokeLinecap="round" opacity={0.72} />
        <circle cx={to[0]} cy={to[1]} r={9 * scale} fill={`url(#${ID}-land)`} />
        <circle cx={to[0]} cy={to[1]} r={2.3} fill="currentColor" opacity={0.95} />

        {/* Σ is the only term that does not denote one thing. It runs over
            every other centre, so it reaches every other centre — a fan from
            one origin, which is what a sum looks like when it is drawn rather
            than written. Thinner than the single-referent leaders, because six
            lines at full weight would be a starburst of their own. */}
        {t.fan?.map((f, fi) => {
          const q = landing(sp, scale, f);
          return (
          <g key={`fan-${fi}`}>
            <path d={arcSegment(from.x, from.y - L.lift, q[0], q[1], -22 + fi * 15)}
              fill="none" stroke="currentColor" strokeWidth={0.3}
              strokeLinecap="round" opacity={0.34} />
            <circle cx={q[0]} cy={q[1]} r={6.5 * scale} fill={`url(#${ID}-land)`} opacity={0.7} />
            <circle cx={q[0]} cy={q[1]} r={1.5} fill="currentColor" opacity={0.75} />
          </g>
          );
        })}
      </g>
      );
    })}

    {/* the sum */}
    {TERMS.map(t => (
      <text key={`term-${t.text}`} x={L.place[t.text].x} y={L.place[t.text].y} textAnchor="middle"
        fill="currentColor" fontSize={TERM} fontWeight={300} opacity={0.96}>
        {t.text}
      </text>
    ))}
    {OPERATORS.map(o => (
      <text key={`op-${o}`} x={L.place[o].x} y={L.place[o].y} textAnchor="middle"
        fill="currentColor" fontSize={TERM} fontWeight={300} opacity={0.55}>
        {o}
      </text>
    ))}

    {/* what each term means, at the end of its own leader */}
    {TERMS.map(t => (
      <text key={`gloss-${t.text}`} x={L.gloss[t.text].x} y={L.gloss[t.text].y} textAnchor="middle"
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
    portrait={{
      width: PORTRAIT_SPACE.w,
      height: P_H,
      nodes: PORTRAIT_NODES,
      backdrop: <ParticleField sp={PORTRAIT_SPACE} />,
      overlay: <Formula sp={PORTRAIT_SPACE} scale={0.62} L={FORMULA_PORTRAIT} />,
      rimStyle: P_RIM
    }}
    edges={EDGES}
    core="you"
    backdrop={<ParticleField sp={WIDE_SPACE} />}
    overlay={<Formula sp={WIDE_SPACE} scale={1} L={FORMULA_WIDE} />}
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
