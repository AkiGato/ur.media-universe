import React, { useEffect, useRef } from 'react';
import {
  CLOUD_STRIDE, C_X, C_Y, C_PHASE, C_SHINE, C_FOCUS, C_ALONG, C_RUN, C_DEPTH,
  type TissueCloud
} from '../../utils/tissueCloud';

/**
 * THE DEEP FIELD — what lies behind the organism.
 *
 * Asked for: motes drifting far behind the drawing, faint, brightening and
 * fading, so the map has something to be suspended IN rather than sitting on
 * flat black.
 *
 * GR-03 SAYS THE MAP'S GROUND IS EMPTY, AND THIS IS A DEPARTURE FROM IT. That
 * rule is explicit — "what is left behind the organism is nothing at all" — and
 * it was earned: an ambience layer of drifting flowers and arc ticks was
 * removed because it was made of the same mark as the tissue, so at rest the
 * eye could not separate backdrop from anatomy and the map read as busy. The
 * finding is real and this layer is built to not repeat it:
 *
 *  - it is POINTS, never filaments — the thing GR-03 names is "nothing behind
 *    the organism may be made of filaments", and nothing here is a strand;
 *  - it is capped at a fifth of focus, under the faintest tissue, so it can
 *    never be mistaken for anatomy;
 *  - it is sparse and slow, and it drifts on its own long clock, so it reads as
 *    depth rather than as a second drawing.
 *
 * Whether that is enough to satisfy the rule's intent is a design call and not
 * one a component comment gets to make. Recorded in docs/OPEN.md.
 *
 * IT COSTS ALMOST NOTHING, WHICH WAS ALSO ASKED FOR. Every mote is two sines
 * and one fill, there are a couple of hundred of them, and they are baked at
 * mount and never reallocated. No physics, no neighbours, no per-frame
 * allocation — the same recorded approach the formation uses.
 */
const MOTES = 260;
/** alpha buckets for the deep field — few, because it is barely there */
const DEEP_STEPS = 6;
/**
 * The ceiling on the whole layer.
 *
 * Asked for at 60% out of focus — so 0.4, twice what it opened at. It sits just
 * under the far plane of the tissue (0.4 of focus, dimmed again by its own
 * shine), which is the relationship that matters: the field must read as the
 * next thing back from the faintest anatomy, never as anatomy itself. That is
 * also the guard GR-03 is owed, and it is the number to revisit first if the
 * ground ever starts competing with the drawing again.
 */
const DEEP_PEAK = 0.4;
/** stride: x, y, drift radius, drift rate, phase, brightness */
const M_STRIDE = 6;

/**
 * The organism drawn as points, on one canvas.
 *
 * Stage three. Stage one made the primitives report their geometry, stage two
 * baked every course into a flat table with a tide phase and a brightness per
 * point; this reads that table each frame and puts it on screen, following the
 * map's own camera. It replaces the drawn tissue rather than sitting on top of
 * it — the somas, the beacons, the relay cells, the labels and every hit target
 * stay exactly where they were in SVG, because those are light sources and
 * controls, not tissue.
 *
 * ONE CANVAS, WHICH IS THE WHOLE POINT. The drawn map is ~6,900 paths and
 * ~7,600 circles, each one styled, laid out and composited every frame it
 * changes; PF-03 records a transform on a group of that size at 6fps and PF-04
 * records bloom over it at 30. This is one element whatever it holds, and its
 * per-frame cost is arithmetic over a typed array — no allocation, no lookups,
 * no style recalculation, nothing in the tree to invalidate.
 *
 * THE CAMERA IS READ THROUGH THE OBJECT, NOT THROUGH A PROP. The map mutates
 * `viewRef.current` in place and never re-renders for a pan or a zoom, which is
 * deliberate and is why the drawing keeps its frame rate while being dragged.
 * So the same object is handed here and read inside the loop — a value copied
 * at render time would freeze the field at the first frame and leave the points
 * behind while the map moved under them. `Formation` takes the camera the same
 * way for the same reason.
 *
 * NOTHING HERE TAKES INPUT. `pointer-events: none` throughout: the SVG above is
 * still the thing that answers a touch, so the organism responds exactly as it
 * did. The field is a way of drawing the tissue, not a layer between the reader
 * and it.
 */

/** Alpha buckets — see `Formation`: sixteen state changes instead of thousands. */
const BUCKETS = 16;

/** LC-05 fixes this. Every ambient cycle in the app is this number. */
const TIDE_MS = 19700;

/**
 * How hard a still frame discounts a course by how much it CONDUCTS.
 *
 * A frozen surface has no shots — that is what frozen means — so anything
 * visible on it is static by definition, and a connection drawn at any
 * appreciable brightness there is precisely the cord this drawing refuses.
 * The floor in OPEN.md 45a exists to keep the topology true *between shots*;
 * where there are no shots it is not holding a gap open, it is just a string.
 *
 * So the discount is keyed to `conduct`, and it is steep enough that the two
 * ends of that scale part company:
 *
 *   arbor / tissue   conduct 0.18  ->  0.81   material, and stays material
 *   ruleset root     conduct 0.6   ->  0.35   half-lit, as it is when alive
 *   connection       conduct 0.9   ->  0.03   effectively gone
 *
 * It was 0.55, which put a connection at 0.505 — FIVE TIMES the 0.1 the live
 * map shows between pulses. That is why the cords kept coming back and why the
 * first fix did not take: it halved their brightness and left them static,
 * and static was the objection.
 *
 * NOTE the cost, because it is real: a reader whose surface is strained, or who
 * asked for reduced motion, now sees the islands without the strands between
 * them. OG-01 has everything connected at rest, and on a still frame that is
 * true of the graph and no longer visible in the drawing. The alternative is a
 * cord, and the cord is the thing this app is not allowed to have.
 */
const FROZEN_CONDUCT = 1.08;

/**
 * The swell, in the contour `.strand-breathe` uses.
 *
 * Asymmetric on purpose (LC-05): it crests early and holds its trough, because
 * a two-stop rise and fall is a metronome — "the eye finds the beat within a
 * cycle and the motion stops holding attention". Cheap enough to run per point
 * per frame: one `Math.sin` and two multiplies.
 */
function swell(u: number): number {
  const t = u - Math.floor(u);
  /* crest at ~0.43, then a long fall — a skewed sine rather than a symmetric
     one, which is the same shape the CSS keyframe draws in four stops */
  const skew = t < 0.43 ? (t / 0.43) * 0.5 : 0.5 + ((t - 0.43) / 0.57) * 0.5;
  return 0.5 - 0.5 * Math.cos(skew * Math.PI * 2);
}

/**
 * The conduction pulse — a fast rise and a long fall, without a cosine.
 *
 * This runs once per point per frame on top of the tide, over tens of thousands
 * of points, so it is built from a compare and two divides rather than from
 * `swell`'s trigonometry: the shape matters, the precision does not.
 *
 * Asymmetric, because LC-05 refuses a symmetric rise and fall — "the eye finds
 * the beat within a cycle and the motion stops holding attention" — and because
 * that asymmetry IS the spike: light arrives at a station quickly and leaves it
 * slowly, which is what makes a run of them read as travelling rather than as
 * blinking.
 */
function pulse(u: number): number {
  const t = u - Math.floor(u);
  /* Dark for most of the cycle: the gap between shots is the thing that makes
     a shot read as one. A band that merely swelled and ebbed was still a
     string, only a breathing one. */
  if (t > 0.34) return 0;
  return t < 0.09 ? t / 0.09 : (0.34 - t) / 0.25;
}

/** how many shots stand on one course at once */
/**
 * How far the reach carries, in map units, and how hard it lights.
 *
 * 170 is a little under the gap between neighbouring cells, so the bloom is
 * plainly about ONE cell and does not wash its neighbours in. The drawn map
 * says the same thing by topology, three hops out; this is the particle
 * field's version of that statement.
 */
const EXC_R = 170;
const EXC_GAIN = 1.25;
/** below this a point is lit but not bloomed — keeps the skirt off the fringe */
const EXC_BLOOM = 0.16;
const BLOOM_PASSES = 2;
const BLOOM_ALPHA = 0.1;

/* ─── EMISSION ────────────────────────────────────────────────────────────
 *
 * DG-03 states the principle and the references are what it was written from:
 * *the form itself glows, hottest where the material is thickest or turns
 * toward the viewer, dark where it thins.* Until now the drawing did not do
 * that. Points composited `source-over`, which does not accumulate — a hundred
 * dots landing on one pixel look much like three — so density carried no light
 * at all, and the only emission in the field was the excitation skirt, which is
 * gated on the reader having touched something. At rest the tissue was evenly
 * grey wherever it was drawn, thick or thin.
 *
 * ADDITIVE COMPOSITING IS THE WHOLE MECHANISM. Under `lighter` the dots sum, so
 * a crowded region climbs to white on its own and a sparse one stays a scatter
 * of separate points. That is how the reference images are actually made, it is
 * keyed to exactly the quantity DG-03 names — how much material is there — and
 * it costs one state change per frame rather than a pass over the cloud.
 *
 * It also keeps DG-02. Nothing here becomes an area: what accumulates is
 * luminance at a pixel, and the marks are the same one-pixel points they were.
 * The glow has no edge because nothing drew one.
 *
 * THE PER-POINT ALPHA IS NOT REDUCED, and one attempt to reduce it is worth
 * recording. Addition only changes a pixel where marks actually LAND ON EACH
 * OTHER, and at map zoom these are one-device-pixel points on a sparse
 * dendritic arbor, so they almost never do. Scaling every dot down by 0.72 to
 * "leave headroom for the stack" therefore darkened the entire organism and
 * bought nothing — measured by eye against the previous frame and reverted.
 * Addition pays off at the cores, where the arbor crowds, which is precisely
 * where DG-03 wants the lamp.
 *
 * THE SKIRT IS WHERE MOST OF THE EMISSION ACTUALLY COMES FROM, for the same
 * reason: it is wide enough that neighbouring points DO overlap, so their
 * skirts sum into a haze whose brightness is the local density. It is what puts
 * the halo on the sphere's rim in the reference.
 *
 * One pass, faint, over points at `EMIT_FROM_Q` and above — DG-03's sentence as
 * arithmetic, since a point is only bright because its arbor is dense there.
 * Thin tissue emits nothing and stays a scatter of separate dots, which is what
 * keeps the reference's fringes reading as fringes. Gated by a count so it is
 * skipped entirely when the field is dim, and one pass rather than the
 * excitation bloom's two, because this one runs at rest and PF-04 is
 * unambiguous about what blooming a big animated group costs.
 */
/** Bucket at or above which a point emits at rest. 16 buckets, so this is 0.44. */
const EMIT_FROM_Q = 7;
const EMIT_ALPHA = 0.075;
const EMIT_SPREAD = 4.2;

const RUN_WAVES = 1.7;

export const TissueField: React.FC<{
  cloud: TissueCloud;
  /** the map's live viewBox — the same object it mutates, not a copy */
  view: { x: number; y: number; w: number; h: number };
  /** 0 → 1 as the organism assembles; the field comes up on it */
  formed?: number;
  /**
   * The assembly's live progress, updated every frame without a render.
   *
   * `formed` is React state and moves 0 → 1 in one step at the end of the
   * formation, which was fine while the tissue was SVG and the ramp was written
   * to that group — but in particle mode the group is `display: none` and THIS
   * canvas is the tissue. The cloud therefore stayed invisible for the whole
   * assembly and snapped to full in a single frame: the entire point of the
   * crossfade, landing on the one layer the reader is actually watching.
   *
   * Passed as a ref because the ramp has to move per frame and re-rendering the
   * map to carry a number is what PF-03 and the formation's own measurement
   * both refuse. When present it wins; `formed` remains the fallback for any
   * caller that has no formation to run.
   */
  formedLive?: React.RefObject<number>;
  /** true when the frame budget is strained — the tide stops, the field stays */
  strained?: boolean;
  /**
   * The cell the reader has reached, in map units — or null, when they have
   * reached nothing.
   *
   * THE LIGHT IS IN THE TISSUE AND NOT ON THE POINTER (MO-04). What arrives
   * here is a CELL, never a cursor position: the bloom is centred on the thing
   * reached and stays there while the pointer moves around it. That is the
   * whole distinction the rule draws — a field carried with the cursor can
   * never be escaped, a cell that lights and then lets go can.
   *
   * A ref, for the reason `formedLive` is one: this changes as often as a
   * reader moves, and re-rendering a 52k-point canvas to carry two numbers is
   * what PF-03 refuses. The loop reads it per frame and eases its own ramp.
   */
  excite?: React.RefObject<{ x: number; y: number } | null>;
}> = ({ cloud, view, formed = 1, formedLive, strained = false, excite }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const viewRef = useRef(view);
  viewRef.current = view;
  const formedRef = useRef(formed);
  formedRef.current = formed;
  const strainedRef = useRef(strained);
  strainedRef.current = strained;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const { data, count } = cloud;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * dpr));
      const h = Math.max(1, Math.round(r.height * dpr));
      if (w === W && h === H) return;
      W = w; H = h;
      canvas.width = W;
      canvas.height = H;
      ctx.fillStyle = '#ffffff';
    };
    resize();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    /* Scratch, allocated once. Per-frame arrays of this size handed to the
       collector is a GC pause in the middle of a drag (PF-01). */
    const sx = new Float32Array(count);
    const sy = new Float32Array(count);
    const bucket = new Int8Array(count);
    /* per-point excitation, 0 → 1, kept so the bloom pass does not recompute it */
    const exc = new Float32Array(count);

    /*
     * The motes, written once. Positions are in map units over a box wider than
     * the layout, so the field keeps going past wherever the camera is.
     */
    const motes = new Float32Array(MOTES * M_STRIDE);
    for (let m = 0; m < MOTES; m++) {
      const o = m * M_STRIDE;
      const r1 = Math.sin(m * 12.9898 + 78.233) * 43758.5453;
      const r2 = Math.sin(m * 39.3468 + 11.135) * 24634.6345;
      const r3 = Math.sin(m * 7.6431 + 41.772) * 13751.9137;
      const a = r1 - Math.floor(r1);
      const b = r2 - Math.floor(r2);
      const c = r3 - Math.floor(r3);
      motes[o] = -420 + a * 1840;
      motes[o + 1] = -380 + b * 1600;
      motes[o + 2] = 12 + c * 46;
      motes[o + 3] = 0.035 + a * 0.06;
      motes[o + 4] = b * 6.283;
      motes[o + 5] = 0.35 + c * 0.65;
    }

    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let stopped = false;
    const started = performance.now();
    let lastNow = 0;
    const exState = { x: 0, y: 0, k: 0 };

    const frame = (now: number) => {
      if (stopped) return;
      const t = Math.max(0, now - started);
      const v = viewRef.current;

      /* xMidYMid meet, computed exactly as the <svg> computes it — or the
         points land on a drawing that is somewhere else. */
      const scale = Math.min(W / v.w, H / v.h);
      const ox = (W - v.w * scale) / 2 - v.x * scale;
      const oy = (H - v.h * scale) / 2 - v.y * scale;

      /* The tide is one number per frame; each point only offsets it by its own
         phase, so the swell rolls outward from the core as a wave rather than
         brightening everywhere at once (LC-01). Under a strained budget the
         wave stops and the field rests — the same trade the drawn map makes
         when it drops the per-fibre tide. */
      const tide = t / TIDE_MS;
      /* seconds, for the conduction rates, which are in cycles per second */
      const runT = t * 0.001;
      const ramp = formedLive ? formedLive.current : formedRef.current;
      const frozen = still || strainedRef.current;

      /*
       * THE REACH RISES FAST AND LETS GO SLOWLY, AND THAT ASYMMETRY IS THE TAIL.
       *
       * Rising answers an input, so it lands almost immediately — MO-03's
       * 0.16–0.2s, here a rate of 5 per second. Releasing takes about four
       * times as long, which is what leaves a wake behind a reader crossing the
       * map rather than a shape welded to them. It is also the only part of
       * this allowed to be slow: the light must be able to fall out of
       * attention or it is the hard fascination MO-04 refuses.
       *
       * The centre is held from the last cell reached, so the glow stays where
       * it was lit while it fades instead of sliding after the pointer.
       */
      const dt = Math.min(0.05, (now - (lastNow || now)) * 0.001);
      lastNow = now;
      const target = excite ? excite.current : null;
      if (target) {
        exState.x = target.x;
        exState.y = target.y;
        exState.k = Math.min(1, exState.k + dt * 5);
      } else {
        exState.k = Math.max(0, exState.k - dt * 1.25);
      }
      const exOn = exState.k > 0.002;
      const exX = exState.x, exY = exState.y, exK = exState.k;

      /*
       * The deep field goes down first, so every point of tissue lands on top
       * of it. One alpha for the whole layer — 170 state changes would cost
       * more than the motes do — with each mote's own brightness folded into
       * how long it spends visible rather than into a separate draw state.
       */
      ctx.clearRect(0, 0, W, H);
      /* Every mark on this surface is light arriving on black, and light adds.
         See EMISSION: this one line is what makes density read as brightness. */
      ctx.globalCompositeOperation = 'lighter';
      if (!frozen && ramp > 0.02) {
        const ms = 1.25 * dpr;
        for (let q = 0; q < DEEP_STEPS; q++) {
          ctx.globalAlpha = (DEEP_PEAK * ramp * (q + 1)) / DEEP_STEPS;
          let open = false;
          for (let m = 0; m < MOTES; m++) {
            const o = m * M_STRIDE;
            const ph = t * 0.001 * motes[o + 3] + motes[o + 4];
            /* the swell is the same asymmetric shape the tide uses, so the
               field breathes with the organism rather than against it */
            const lum = motes[o + 5] * (0.25 + 0.75 * swell(ph / 6.283));
            const step = (lum * DEEP_STEPS) | 0;
            if (step !== q) continue;
            const dx = Math.cos(ph) * motes[o + 2];
            const dy = Math.sin(ph * 0.73) * motes[o + 2] * 0.6;
            const px = (motes[o] + dx) * scale + ox;
            const py = (motes[o + 1] + dy) * scale + oy;
            if (px < -2 || py < -2 || px > W + 2 || py > H + 2) continue;
            if (!open) open = true;
            ctx.fillRect(px - ms * 0.5, py - ms * 0.5, ms, ms);
          }
        }
        ctx.globalAlpha = 1;
      }

      let drawn = 0;
      let bloomed = 0;
      let emitters = 0;
      for (let i = 0; i < count; i++) {
        const o = i * CLOUD_STRIDE;
        const px = data[o + C_X] * scale + ox;
        const py = data[o + C_Y] * scale + oy;

        /* Cull before anything else. Zoomed into one cell, most of the organism
           is off screen, and a point that is not on the canvas must cost a
           comparison rather than a draw. */
        if (px < -2 || py < -2 || px > W + 2 || py > H + 2) { bucket[i] = -1; continue; }

        sx[i] = px;
        sy[i] = py;

        const shine = data[o + C_SHINE];
        /* The plane this point lies in — full, 0.7 or 0.4 (see C_FOCUS). The
           near plane is left at its own brightness and the two behind it fall
           away, which is what gives an island a front and a back. */
        const focus = data[o + C_FOCUS];

        /*
         * The tide is the organism's slow metabolic swell; the run is light
         * conducting along one course. Two clocks, deliberately — LC-02 keeps
         * the spike off the tide's period ("a spike is a fast discrete event,
         * and sharing a period would collapse them into one effect").
         *
         * The run is a multiplier that never reaches zero: a course must read as
         * continuous tissue between pulses, not as a dotted line switching on
         * and off. Frozen surfaces get neither clock.
         */
        /*
         * A FROZEN SURFACE STILL KNOWS WHAT A CONNECTION IS.
         *
         * This branch used to drop the conduction term entirely, so the moment
         * anything froze the map — an explicit reduced-motion preference, or
         * the frame budget latching, which it can do up to twenty seconds in —
         * every connection jumped from nearly dark to full and the solid cords
         * came back. That is the reported bug, and its shape explains the
         * report: the lines reappeared "at a certain point" because the budget
         * probe decides late, not because anything about the drawing changed.
         *
         * Stopping the clocks must not change what a thing IS. A still frame
         * holds a connection at roughly half the brightness of tissue: clearly
         * present, because OG-01 has everything connected at rest and a reader
         * who asked for less motion is still owed the topology — and clearly
         * subordinate, because it is a path rather than material.
         */
        /* THE FROZEN FLOOR IS THE LIVE FLOOR. It was `1 - depth * 0.55`, which
           for a connection (depth 0.9) is 0.505 — FIVE TIMES the 0.1 the live
           map shows between shots. So the moment anything froze the surface —
           reduced motion, or the frame budget latching up to twenty seconds in
           — every connection came back as a solid cord at half brightness. The
           cords were reported twice and this factor is why: the first fix took
           them from full to half and left them static, which is the thing being
           objected to, not the brightness.

           The principle stated two paragraphs up is the fix: stopping the
           clocks must not change what a thing IS. A frozen connection now sits
           at exactly the floor a live one sits at between pulses, so freezing
           changes only whether the shots arrive — never whether there is a
           string there. Tissue (0.18) is barely touched at 0.82 and stays
           material; a connection drops to 0.1, which is the documented floor
           that keeps OG-01's topology true while the light is elsewhere. */
        const a = frozen
          ? shine * 0.82 * ramp * focus * Math.max(0, 1 - data[o + C_DEPTH] * FROZEN_CONDUCT)
          : shine *
            (0.58 + 0.42 * swell(tide - data[o + C_PHASE])) *
            (1 - data[o + C_DEPTH] +
              data[o + C_DEPTH] *
                pulse(runT * data[o + C_RUN] - data[o + C_ALONG] * RUN_WAVES)) *
            ramp *
            focus;

        /*
         * Excitation, by distance from the cell reached.
         *
         * A box test before the square root: at any moment almost every point
         * of a 52k cloud is outside the reach, and a point that is not lit must
         * cost two comparisons rather than a multiply and a root. The falloff
         * is squared so the bloom has a core and an edge instead of a flat
         * disc — the reference is dots crowding into light, not a lamp.
         */
        let e = 0;
        if (exOn) {
          const dx = data[o + C_X] - exX;
          if (dx > -EXC_R && dx < EXC_R) {
            const dy = data[o + C_Y] - exY;
            if (dy > -EXC_R && dy < EXC_R) {
              const d2 = dx * dx + dy * dy;
              if (d2 < EXC_R * EXC_R) {
                const f = 1 - Math.sqrt(d2) / EXC_R;
                e = f * f * exK;
              }
            }
          }
        }
        exc[i] = e;

        const q = ((e > 0 ? a * (1 + e * EXC_GAIN) : a) * BUCKETS) | 0;
        if (e > EXC_BLOOM) bloomed++;
        if (q <= 0) { bucket[i] = -1; continue; }
        bucket[i] = q >= BUCKETS ? BUCKETS - 1 : q;
        if (bucket[i] >= EMIT_FROM_Q) emitters++;
        drawn++;
      }

      if (drawn > 0) {
        for (let q = BUCKETS - 1; q >= 0; q--) {
          let open = false;
          for (let i = 0; i < count; i++) {
            if (bucket[i] !== q) continue;
            if (!open) { ctx.globalAlpha = (q + 1) / BUCKETS; open = true; }
            /* DG-02 — a point, never an area. One device pixel; the extra
               luminance goes into alpha, because a dot given real area stops
               being a point of light and becomes the fill that rule has
               removed four times. fillRect, not arc: indistinguishable at this
               size and an order of magnitude cheaper. */
            /* Defocus, not blur: a mark on a far plane is fractionally wider
               and much dimmer, which the eye reads as out of focus. It stays a
               point — DG-02 — and it costs one multiply. */
            const s = (1.15 + (1 - data[i * CLOUD_STRIDE + C_FOCUS]) * 0.5) * dpr;
            ctx.fillRect(sx[i] - s * 0.5, sy[i] - s * 0.5, s, s);
          }
        }
        ctx.globalAlpha = 1;
      }

      /*
       * THE RESTING EMISSION — one pass, over the brightest points only.
       *
       * The excitation bloom below answers a touch. This one is always there,
       * because in the references the form glows whether anyone is looking at
       * it or not: the sphere carries a halo on its rim, the ridge carries one
       * along its crest, and both are simply where the dots crowd.
       *
       * Restricted to `EMIT_FROM_Q` and above, which is DG-03 as arithmetic —
       * a lamp burns where the tissue is thick, and a point is only bright in
       * the first place because its arbor is dense there. Thin tissue emits
       * nothing and stays a scatter of separate dots, which is what keeps the
       * fringes in the reference reading as fringes.
       *
       * Additive, so the skirts of neighbouring points sum: the glow is made
       * of the dots rather than laid behind them, and it has no edge because
       * nothing draws one (DG-02).
       */
      if (emitters > 0) {
        ctx.globalAlpha = EMIT_ALPHA;
        const s = EMIT_SPREAD * dpr;
        const half = s * 0.5;
        for (let i = 0; i < count; i++) {
          if (bucket[i] < EMIT_FROM_Q) continue;
          ctx.fillRect(sx[i] - half, sy[i] - half, s, s);
        }
        ctx.globalAlpha = 1;
      }

      /*
       * THE BLOOM — TWO EXTRA PASSES, OVER THE LIT POINTS ONLY.
       *
       * Asked for from a reference of tiny white dots that crowd into a soft
       * emission where they are dense. So the light is still MADE OF THE DOTS:
       * each excited point is drawn again, wider and much dimmer, and where the
       * points are close together those skirts overlap into the glow. Where
       * they are sparse it stays a scatter of dots, which is how the
       * reference's fringes read.
       *
       * Not `shadowBlur`: a real blur is per-draw state, and at tens of
       * thousands of points it is the most expensive thing available here. This
       * is one more fillRect over a subset that is empty whenever the reader
       * has reached nothing.
       *
       * DG-02 survives it. The skirt has no edge and no fill of its own — it is
       * the same point of light drawn faint and fractionally wider, so what
       * grows is luminance, not an area with a boundary.
       */
      if (bloomed > 0) {
        for (let b = 0; b < BLOOM_PASSES; b++) {
          const spread = (2.6 + b * 3.4) * dpr;
          ctx.globalAlpha = BLOOM_ALPHA / (b + 1);
          for (let i = 0; i < count; i++) {
            const e = exc[i];
            if (e <= EXC_BLOOM || bucket[i] < 0) continue;
            const s = spread * e;
            ctx.fillRect(sx[i] - s * 0.5, sy[i] - s * 0.5, s, s);
          }
        }
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!stopped) raf = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', onVisibility);

    if (!document.hidden) raf = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      ro?.disconnect();
    };
  }, [cloud]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
};
