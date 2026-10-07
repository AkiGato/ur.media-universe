import React, { useEffect, useRef } from 'react';
import { easeOrganic } from '../../utils/ease';
import { DEVICE_TIER, scaleCount } from '../../utils/deviceTier';
import { buildShapes, CELL_SHAPE, SHAPE_BUILDERS } from '../../utils/introShapes';

/**
 * The mark on the front door: one field of particles, assembling and
 * reassembling.
 *
 * IT OPENS ON THE CELL THE SPLASH IS ALREADY HOLDING. `index.html` paints eight
 * processes off a soma in the same frame as the document, before a byte of
 * JavaScript, and the screen it hands over to used to redraw exactly that cell
 * so the handover was a thickening rather than a swap. That is still true — the
 * first form this field spells is the splash's own path data, at the splash's
 * own 132px, on the splash's own centre. What is new is that it does not stay:
 * having arrived as the cell, the field goes on to reassemble as a pappus, a
 * shell, a wave field and a ring, and returns to the cell.
 *
 * ONE CANVAS, NOT N ELEMENTS — the same reasoning as `Formation`, and the same
 * measured rule behind it (PF-03, PF-04). A dot per particle is a few hundred
 * more nodes in the tree, each composited, on a screen whose whole job is to be
 * up while the ~8,000-element organism is being built underneath. A canvas is
 * one element whatever it holds and its per-frame cost is arithmetic. The count
 * is scaled by `deviceTier` on top of that, because this runs in competition
 * with the map's construction rather than after it.
 *
 * IT IS A LOOP, AND THAT IS THE ONE THING HERE THAT COST SOMETHING. The map's
 * formation is an event with an end — it plays once and unmounts, and the
 * comment there is explicit that anything which kept running would be a second
 * clock on the drawing forever. This one does keep running, because a front
 * door that performs once and then goes still is a door with a dead mark on it
 * for as long as the reader stands there. Three things pay for that: it is on a
 * surface with nothing else moving on it, it stops the moment the surface goes
 * (the gate unmounts on entry and takes the loop with it), and its period is
 * the tide's — see `SHAPE_MS`, which is a third of 19.7s, so three forms pass
 * per breath of the organism and no new clock is introduced (LC-03, LC-05).
 *
 * NOTHING IS ANIMATED THAT THE READER DID NOT ASK FOR. `prefers-reduced-motion`
 * and a low device tier both land on the same behaviour, and it is not a frozen
 * first frame: the field is drawn as the cell, complete and still, which is
 * what the splash was already showing. A hidden tab stops the loop outright —
 * rAF is throttled to nothing there, and a field left running would resume
 * mid-morph minutes later, halfway between two forms and reading as a fault.
 */

/** Alpha buckets — see `Formation`: sixteen state changes instead of hundreds. */
const BUCKETS = 16;

/**
 * How long one form owns the field, hold and morph together.
 *
 * 19.7s is the app's one ambient period (LC-05 fixes the number outright), and
 * this is a QUARTER of it, so four forms pass per breath of the organism and
 * the sequence still closes on the tide rather than beating against it. It was
 * a third — the step to a quarter is what "a third faster" buys here without
 * leaving the one clock: 6.57s a form becomes 4.93s, which is 33% more forms in
 * the same minute.
 *
 * And the split inside went with it. At a third still to two parts moving, a
 * quarter-period would have left the field standing about as long as before and
 * taken the whole cut out of the movement, which is the opposite of the point —
 * the reassembly is the part worth watching. Half and half: the field is moving
 * as much as it is holding, and each morph is 2.46s rather than 2.76s, so it
 * reads as quicker without reading as hurried.
 */
const SHAPE_MS = 19700 / 4;
const MORPH_MS = SHAPE_MS * 0.5;

/** The splash draws its cell at this, and the cell form is held to it. */
const SPLASH_PX = 132;

export const IntroField: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    /* Fewer marks on a device that has told us it is working hard, and the same
       drawing either way — never a different picture (see `TIER_DENSITY`). */
    /* Measured before it was raised: 820 particles on a 290×290 backing store
       cost 0.456ms a frame, against PF-01's 85ms budget — 186× headroom, which
       is not a budget being spent, it is a budget going unused. Density is what
       makes a point cloud read as a form rather than as a scatter (DG-06), and
       the grain was the one thing thin about this field. */
    const count = scaleCount(DEVICE_TIER === 'high' ? 1180 : 760, 220);
    const shapes = buildShapes(count);

    /* Per-particle character, drawn once. Every one of these exists to break
       the lockstep MO-01 forbids: a field where all the points set off at the
       same instant, on the same curve, at the same brightness, reads as one
       object being transformed rather than as a crowd rearranging itself. */
    const delay = new Float32Array(count);   // share of the morph spent waiting
    const bow = new Float32Array(count);     // how far its course bellies out
    const shine = new Float32Array(count);   // its own resting brightness
    const wob = new Float32Array(count);     // phase of its idle drift
    for (let i = 0; i < count; i++) {
      const a = Math.sin(i * 12.9898) * 43758.5453;
      const b = Math.sin(i * 78.233) * 12345.6789;
      const c = Math.sin(i * 39.425) * 24634.6345;
      const f0 = a - Math.floor(a);
      const f1 = b - Math.floor(b);
      const f2 = c - Math.floor(c);
      delay[i] = f0 * 0.34;
      bow[i] = (f1 - 0.5) * 0.34;
      shine[i] = 0.45 + f2 * 0.55;
      wob[i] = f0 * Math.PI * 2;
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    let cssW = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      cssW = r.width;
      const w = Math.max(1, Math.round(r.width * dpr));
      const h = Math.max(1, Math.round(r.height * dpr));
      if (w === W && h === H) return;
      W = w;
      H = h;
      canvas.width = W;
      canvas.height = H;
      ctx.fillStyle = '#ffffff';
    };
    resize();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    const sx = new Float32Array(count);
    const sy = new Float32Array(count);
    const bucket = new Int8Array(count);

    /* The cell is pinned to the splash's size however large the box gets, so
       the handover lands on the pixel. Every other form takes the whole box —
       which is the point of giving it one bigger than 132. Clamped at 1 so a
       box smaller than the splash (a phone on its side) scales the cell down
       with everything else rather than letting it run over the edge. */
    const fitFor = (shape: number) =>
      shape === CELL_SHAPE ? Math.min(1, SPLASH_PX / Math.max(1, cssW)) : 1;

    const paint = (from: number, to: number, u: number, t: number) => {
      const R = Math.min(W, H) / 2;
      const cx = W / 2;
      const cy = H / 2;
      const A = shapes[from];
      const B = shapes[to];
      const fa = fitFor(from) * R;
      const fb = fitFor(to) * R;
      /* the tide, and the only cycle in here besides the sequence itself */
      const tide = (t / 19700) * Math.PI * 2;

      let drawn = 0;
      for (let i = 0; i < count; i++) {
        /* its own share of the morph, after its own wait */
        const local = u <= 0 ? 0 : Math.min(1, Math.max(0, (u - delay[i]) / (1 - delay[i])));
        const e = local <= 0 ? 0 : local >= 1 ? 1 : easeOrganic(local);

        const ax = A.x[i] * fa;
        const ay = A.y[i] * fa;
        const bx = B.x[i] * fb;
        const by = B.y[i] * fb;

        let px = ax + (bx - ax) * e;
        let py = ay + (by - ay) * e;

        /* A COURSE, NOT A CHORD. Points crossing on straight lines is the one
           thing that would make this read as a machine interpolating between
           two states. Each takes a bellied course, perpendicular to its own
           crossing and signed per particle, which is the same bow `arcSegment`
           puts in every filament in the app. It is zero at both ends, so a
           particle at rest sits exactly on its form. */
        if (e > 0 && e < 1) {
          const dx = bx - ax;
          const dy = by - ay;
          const len = Math.hypot(dx, dy);
          if (len > 0.0001) {
            const belly = Math.sin(Math.PI * e) * bow[i] * len * 0.5;
            px += (-dy / len) * belly;
            py += (dx / len) * belly;
          }
        }

        /* Idle drift. Small enough to be texture rather than movement — the
           form is still, and its grain is alive (MO-01). On the tide's clock,
           desynchronised by phase, so no two points swell together. */
        const w = tide + wob[i];
        px += Math.sin(w) * R * 0.006;
        py += Math.cos(w * 0.87) * R * 0.006;

        sx[i] = cx + px;
        sy[i] = cy + py;

        /* Brighter at rest, dimmer in transit — a crossing crowd should not
           compete with the form it is on its way to becoming. */
        const travel = Math.sin(Math.PI * e);
        const alpha = shine[i] * (1 - travel * 0.42) * (0.82 + 0.18 * Math.sin(w));

        const q = (alpha * BUCKETS) | 0;
        if (q <= 0) { bucket[i] = -1; continue; }
        bucket[i] = q >= BUCKETS ? BUCKETS - 1 : q;
        drawn++;
      }

      ctx.clearRect(0, 0, W, H);
      if (drawn === 0) return;
      /* One pass per bucket — sixteen state changes for the whole field. */
      for (let q = BUCKETS - 1; q >= 0; q--) {
        let open = false;
        for (let i = 0; i < count; i++) {
          if (bucket[i] !== q) continue;
          if (!open) { ctx.globalAlpha = (q + 1) / BUCKETS; open = true; }
          /* DG-02 — a point, never an area. One device pixel, and the extra
             luminance goes into alpha rather than into radius: a dot given real
             area stops being a point of light and becomes the fill that rule
             has removed four times. fillRect, not arc: indistinguishable at
             this size and an order of magnitude cheaper. */
          const s = 1.15 * dpr;
          ctx.fillRect(sx[i] - s * 0.5, sy[i] - s * 0.5, s, s);
        }
      }
      ctx.globalAlpha = 1;
    };

    /* STILL, FOR ANYONE WHO ASKED FOR STILL. Not a frozen frame of the loop —
       the cell, complete, which is what was on the glass a moment ago. */
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || DEVICE_TIER === 'low';
    if (still) {
      paint(CELL_SHAPE, CELL_SHAPE, 0, 0);
      return () => { ro?.disconnect(); };
    }

    let raf = 0;
    let stopped = false;
    const started = performance.now();

    const frame = (now: number) => {
      if (stopped) return;
      /*
       * CLAMPED AT ZERO, BECAUSE THE FIRST FRAME CAN ARRIVE BEFORE THE START.
       *
       * `started` is a `performance.now()` taken when the loop is scheduled;
       * `now` is the frame timestamp, which is the time the BROWSER BEGAN THE
       * FRAME — and that can be earlier than the moment the callback was
       * registered. So `now - started` is negative on the first frame often
       * enough to matter, `Math.floor` of it is −1, and JS keeps the sign
       * through `%`, so `shapes[-1]` is `undefined` and the field throws on its
       * own first paint. Measured as exactly that: an uncaught "Cannot read
       * properties of undefined (reading 'x')" and a canvas with zero lit
       * pixels for the whole session.
       *
       * Two guards rather than one, because they fail differently: the clamp
       * keeps time moving forward, and the floored modulo keeps the index
       * inside the sequence whatever time does.
       */
      const t = Math.max(0, now - started);
      const len = SHAPE_BUILDERS.length;
      const step = t / SHAPE_MS;
      const idx = Math.floor(step);
      const within = (step - idx) * SHAPE_MS;
      const from = ((idx % len) + len) % len;
      const to = (from + 1) % len;
      /* hold, then cross: the morph is the tail of a form's own turn, so a
         form is only ever leaving — never arriving and leaving at once */
      const held = SHAPE_MS - MORPH_MS;
      const u = within <= held ? 0 : (within - held) / MORPH_MS;
      paint(from, to, u, t);
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!stopped) {
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    if (!document.hidden) raf = requestAnimationFrame(frame);
    else paint(CELL_SHAPE, CELL_SHAPE, 0, 0);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      ro?.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
};
