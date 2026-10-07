import React, { useEffect, useRef } from 'react';
import { easeOrganic } from '../../utils/ease';
import { FormationRecord, STRIDE, OX, OY, CX_, CY_, TX, TY, T0, DUR, WA, WP, NX, NY, WOBBLE_CYCLES } from '../../utils/formation';

/**
 * Plays the recording (`src/utils/formation.ts`) over the map, once.
 *
 * ONE CANVAS, NOT N ELEMENTS. The obvious build is an SVG dot per particle,
 * animated. At the sizes this runs — a few thousand marks over an organism that
 * is already ~8,000 elements — that is precisely the numerousness PF-03 and
 * PF-04 were written about: 8,000 more nodes in the tree, each one composited,
 * on top of a drawing measured at 20fps in its healthy steady state. A canvas
 * is ONE element whatever it holds, and its per-frame cost is arithmetic rather
 * than layout, style and compositing. The organism underneath is untouched — no
 * transform on it, no filter added to it, nothing animated per element. It only
 * fades up, which is the channel PF-03 sends organism-wide motion through.
 *
 * AND THEN IT IS GONE. When the last particle lands the layer unmounts, the
 * canvas is released and the map costs exactly what it cost before this existed.
 * The formation is an event with an end, not a background process — anything
 * that kept running would be a second clock on the drawing forever, for a thing
 * the reader has already watched happen.
 *
 * FOUR WAYS OUT, AND EVERY ONE OF THEM LEAVES A FINISHED MAP. This is MO-05's
 * requirement, in the same words it uses for the dive: a reader must never be
 * left looking at a drawing that never arrived.
 *
 *  - `prefers-reduced-motion` and a low device tier — decided by the caller,
 *    which simply does not mount this.
 *  - a hidden tab — requestAnimationFrame does not run there, so a formation
 *    started in a background tab would freeze half-assembled and the reader
 *    would come back to a ruin. It finishes immediately instead.
 *  - a wall-clock backstop — if frames stop arriving for any reason the timer
 *    still fires and the map completes.
 *
 * Nothing here takes input. It is `pointer-events: none` throughout, so the map
 * underneath answers touch during the assembly exactly as it does after it —
 * the organism is not sealed behind its own arrival.
 */

/**
 * Fraction of its life a particle spends coming up out of the dark.
 *
 * Short, because the alpha bucketing culls anything under 1/16 and a long
 * lead-in means a dot that has started is still nothing for the first tenth of
 * its fall — which reads as the field arriving late rather than softly.
 */
const LEAD_IN = 0.09;
/** …and going out, as the strand it landed on takes over carrying the light. */
const HAND_OVER = 0.15;

/**
 * Alpha buckets.
 *
 * `globalAlpha` is a context state change, and setting it per particle makes
 * every dot its own draw state — the single most expensive thing you can do in
 * a 2D canvas loop. Instead each particle's alpha is quantised to one of these
 * and drawn in a pass with its peers, which turns thousands of state changes
 * into sixteen. The quantisation is invisible: sixteen steps of alpha on a
 * one-pixel dot is finer than the display can resolve.
 */
const BUCKETS = 16;

/** device pixels over which a particle fades out at the buffer's boundary */
const EDGE_FADE = 46;

/**
 * THE LAST STRETCH IS A CROSSFADE, NOT A CUT.
 *
 * The handoff used to end on an event: the final particle landed, the layer
 * unmounted, and whatever was still lit went with it in one frame. Everything
 * before that was smooth and the last moment was a switch — which is the cut
 * MO-05 spends its whole rule avoiding, arriving at the end of the sequence
 * instead of the start of it.
 *
 * So the field fades out AS A FIELD over its final stretch. Once this fraction
 * of the particles have landed, every remaining dot dims together on one ramp,
 * while the tissue underneath is already at full strength — the two overlap
 * rather than meeting at a line, and what the eye follows is light handing over
 * to material rather than one layer being replaced by another.
 */
const TAIL_FROM = 0.82;

/** the wobble’s angular frequency, folded once so the loop does one multiply */
const WOBBLE_OMEGA = Math.PI * 2 * WOBBLE_CYCLES;

export const Formation: React.FC<{
  record: FormationRecord;
  /**
   * False while a surface still stands in front of the map.
   *
   * THE LAYER MOUNTS BEFORE IT PLAYS, AND THAT IS THE POINT. Creating the
   * canvas at the moment of entry put a 2D context, four typed arrays and a
   * ~5MB backing store into the same frame as the gate unmounting and the map
   * re-rendering — the one frame in the sequence the reader asked for by
   * pressing a button. Mounted early and idle, all of that is paid while the
   * reader is still reading the way in, and entry has only a boolean to flip.
   */
  active: boolean;
  /** the map's viewBox, so a particle lands exactly where its strand is drawn */
  view: { x: number; y: number; w: number; h: number };
  /** 0 → 1 as the tissue assembles; the caller fades the drawing up on it */
  onProgress: (landed: number) => void;
  onDone: () => void;
}> = ({ record, active, view, onProgress, onDone }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /*
   * The view is read through a ref inside the loop rather than closed over.
   * The map can be panned or zoomed while the formation runs — nothing stops
   * the reader touching it — and a closure over the first frame's viewBox would
   * leave the particles landing where the strands used to be.
   */
  const viewRef = useRef(view);
  viewRef.current = view;

  /* Same reasoning for the callbacks: they are re-created every render by the
     caller, and re-running the effect would restart the assembly from nothing. */
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const { data, count, duration } = record;

    /*
     * Physical pixels, capped.
     *
     * A 3x phone display would otherwise ask the compositor to fill nine times
     * the area for marks that are one pixel wide — the "high pixel count on a
     * modest chip" combination `deviceTier` already docks a device for. Two is
     * past the point where a single-pixel dot reads any crisper.
     */
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    /* Seeded from the element, not from zero. This effect runs a second time
       when the layer goes active, and starting these at 0 would make `resize`
       believe the size had changed and throw away the backing store it was
       mounted early precisely to have allocated already. */
    let W = canvas.width;
    let H = canvas.height;

    /* Assigning width/height reallocates the backing store and clears it even
       when the number is unchanged, and ResizeObserver fires for reasons that
       are not a size change — so measure, compare, and only then reallocate. */
    const resize = () => {
      const r = canvas.getBoundingClientRect();
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

    /* Mounted, sized and holding a context — and doing nothing else until the
       map is the thing on screen. Everything below this line belongs to the
       performance itself, and is not paid for until there is one. */
    if (!active) {
      return () => { ro?.disconnect(); };
    }

    /*
     * Scratch buffers, allocated once for the whole performance.
     *
     * Per-frame arrays would be a few thousand-element allocations a second
     * handed straight to the collector, and a GC pause during a slow fade is
     * exactly the stutter this drawing is tuned to avoid (PF-01).
     */
    const sx = new Float32Array(count);
    const sy = new Float32Array(count);
    const bucket = new Int8Array(count);
    const size = new Float32Array(count);

    let raf = 0;
    let finished = false;
    const started = performance.now();
    /* Carried between frames: the previous frame's landed fraction drives this
       frame's tail. One frame stale, which at these rates is invisible, and it
       saves a second pass over every particle to know the count in advance. */
    let tail = 1;

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(backstop);
      /*
       * Wipe the buffer before handing back.
       *
       * Unmounting is React's job and it takes a commit; clearing is ours and
       * it takes an instruction. Whenever the two are not in the same frame —
       * and on the backstop path, where frames have stopped arriving at all,
       * they are not — the last drawn frame stays on screen over a finished
       * drawing. Observed exactly that: a completed map with 52,621 lit pixels
       * of half-landed particles frozen on top of it. The layer owes the map an
       * empty canvas the moment it stops, whatever happens to the element.
       */
      try { ctx.clearRect(0, 0, W, H); } catch { /* context lost; nothing to wipe */ }
      progressRef.current(1);
      doneRef.current();
    };

    /*
     * The wall clock has the last word.
     *
     * Generous — the recording plus a wide margin — because it is a backstop
     * and not a deadline. It exists for the cases where frames simply stop:
     * a tab suspended and restored, a renderer that gives up, a machine that
     * stalls. The map completes and the reader is never stranded on a drawing
     * caught halfway into being.
     */
    const backstop = window.setTimeout(finish, duration + 4000);

    const onVisibility = () => {
      /* rAF is throttled to nothing in a background tab, so a formation left
         running there would resume mid-assembly minutes later, as if the
         organism had been waiting to finish forming until it was watched. It
         is simply already built when the reader comes back. */
      if (document.hidden) finish();
    };
    document.addEventListener('visibilitychange', onVisibility);

    ctx.fillStyle = '#ffffff';

    const frame = (now: number) => {
      if (finished) return;
      const t = now - started;

      const v = viewRef.current;
      /* xMidYMid meet — the same fit the <svg> applies, computed the same way,
         or the dots land on a drawing that is somewhere else. */
      const scale = Math.min(W / v.w, H / v.h);
      const ox = (W - v.w * scale) / 2 - v.x * scale;
      const oy = (H - v.h * scale) / 2 - v.y * scale;

      let landed = 0;
      let drawn = 0;

      for (let n = 0; n < count; n++) {
        const o = n * STRIDE;
        const local = (t - data[o + T0]) / data[o + DUR];

        if (local <= 0) { bucket[n] = -1; continue; }
        if (local >= 1) { bucket[n] = -1; landed++; continue; }

        const e = easeOrganic(local);
        const inv = 1 - e;

        /* quadratic bezier: the bowed course recorded for this particle */
        const a = inv * inv;
        const b = 2 * inv * e;
        const c = e * e;
        let px = a * data[o + OX] + b * data[o + CX_] + c * data[o + TX];
        let py = a * data[o + OY] + b * data[o + CY_] + c * data[o + TY];

        /* The wobble. Envelope 4e(1-e) peaks mid-flight and is exactly zero at
           both ends, so the dot leaves its origin and reaches its target on the
           bezier and only strays in between — see WOBBLE in formation.ts. */
        const env = 4 * e * (1 - e);
        const w = Math.sin(e * WOBBLE_OMEGA + data[o + WP]) * data[o + WA] * env;
        px += data[o + NX] * w;
        py += data[o + NY] * w;

        sx[n] = px * scale + ox;
        sy[n] = py * scale + oy;

        /*
         * The dot brightens as it arrives and then hands its light to the
         * strand: up out of the dark over the lead-in, gaining through the
         * fall, and out over the last sixth as the tissue underneath reaches
         * full strength. The crossover is what makes a particle look like it
         * BECAME the line rather than landing on top of one.
         */
        const rise = local < LEAD_IN ? local / LEAD_IN : 1;
        /*
         * A PARTICLE IN TRANSIT IS A CARRIER, AND IT IS LIT LIKE ONE.
         *
         * This has been tuned twice from opposite directions and both readings
         * are in the curve. First it was 0.46 + 0.54·local^1.5, which spent a
         * particle's whole life dim and put all its light in the final instant
         * — the field read as faint and nearly invisible. Then 0.72 + 0.28·
         * local^1.1, high throughout, which fixed that and overshot: a dot
         * crossing open dark was brighter than the tissue it was on its way to
         * become, so the transport outshone the drawing.
         *
         * A floor high enough to read while travelling, and a real climb into
         * the landing, is what says the right thing: the dot is visible as it
         * moves, and it FLARES at the moment it becomes tissue, which is the
         * moment worth marking. Against the branch brightness raised in the
         * tissue cloud, the settled material now outshines its carriers at
         * every point of the flight except the landing itself.
         */
        const gain = 0.5 + 0.5 * Math.pow(local, 2.1);
        const out = local > 1 - HAND_OVER ? (1 - local) / HAND_OVER : 1;
        let alpha = rise * gain * out;

        /*
         * THE CANVAS EDGE IS NOT A DOOR.
         *
         * A particle begins well outside the tissue it is falling onto, so on a
         * tight framing a good many of them start beyond the viewport and cross
         * into it — and a dot at full brightness crossing the boundary of its
         * own buffer pops into existence against a straight invisible line, the
         * canvas rectangle drawn by subtraction. Same failure as a viewBox
         * cutting an axon, and DG-09 gives the same answer: dissolve, never
         * end. Alpha falls to nothing over the outermost band of the buffer, so
         * a dot fades up out of the dark exactly as it would have if the sheet
         * had been larger.
         */
        alpha *= tail;

        const eIn = Math.min(
          Math.min(sx[n], W - sx[n]) / EDGE_FADE,
          Math.min(sy[n], H - sy[n]) / EDGE_FADE
        );
        if (eIn <= 0) { bucket[n] = -1; continue; }
        if (eIn < 1) alpha *= eIn;

        const q = (alpha * BUCKETS) | 0;
        if (q <= 0) { bucket[n] = -1; continue; }
        bucket[n] = q >= BUCKETS ? BUCKETS - 1 : q;

        /* DG-02 — a point, never an area. It stays near one device pixel and
           swells by a hair as it lands; anything with an interior is the blob
           that rule has removed four times. This is the one dimension where
           "brighter" must NOT be spent: a dot given real area stops being a
           point of light and becomes the fill the rule forbids, so the extra
           luminance goes into alpha above and the mark stays about a pixel. */
        size[n] = (1.05 + 0.5 * e) * dpr;
        drawn++;
      }

      ctx.clearRect(0, 0, W, H);

      if (drawn > 0) {
        /* One pass per bucket: sixteen state changes for the whole field. */
        for (let q = BUCKETS - 1; q >= 0; q--) {
          let open = false;
          for (let n = 0; n < count; n++) {
            if (bucket[n] !== q) continue;
            if (!open) {
              ctx.globalAlpha = (q + 1) / BUCKETS;
              open = true;
            }
            const s = size[n];
            /* fillRect, not arc — at one pixel the two are indistinguishable
               and a path per dot costs an order of magnitude more. */
            ctx.fillRect(sx[n] - s * 0.5, sy[n] - s * 0.5, s, s);
          }
        }
        ctx.globalAlpha = 1;
      }

      const done = count === 0 ? 1 : landed / count;
      progressRef.current(done);
      tail = done <= TAIL_FROM ? 1 : Math.max(0, 1 - (done - TAIL_FROM) / (1 - TAIL_FROM));

      if (landed >= count) { finish(); return; }
      raf = requestAnimationFrame(frame);
    };

    if (document.hidden) {
      /* Never start one we cannot run. */
      finish();
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(backstop);
      document.removeEventListener('visibilitychange', onVisibility);
      ro?.disconnect();
    };
    /* `record` never changes identity and `active` only ever goes false → true,
       so this runs exactly twice: once to build the canvas, once to play it. */
  }, [record, active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
};
