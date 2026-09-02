import { useEffect, useState } from 'react';

/**
 * Frame-budget probe.
 *
 * The organism is ~6000 SVG elements under an animated displacement filter. On
 * the machines it was tuned on that runs at 20–47fps; on a mid-range phone or an
 * older Safari it can fall far enough that the "calm" motion reads as stutter —
 * the opposite of the soft-fascination the design is for.
 *
 * So: sample real frame times for a short window after mount and, if the median
 * frame is slower than `budgetMs`, report the tissue as strained. Callers drop
 * the expensive layers (whole-organism filter, corona, ambient drift) exactly as
 * they do for `prefers-reduced-motion` — same escape hatch, no new vocabulary.
 *
 * The probe itself is one rAF loop for ~1.6s and then nothing.
 */
/*
 * Calibration note — this threshold was wrong at first, and wrong in the
 * direction that quietly removes features.
 *
 * 28ms (≈35fps) sounds like a reasonable floor, but PF-01 records this
 * map's *intended* steady state as ~20fps (≈50ms) with the flex filter on: the
 * organism is ~6000 elements and was tuned to that number deliberately. A 28ms
 * budget therefore trips on a healthy machine running the map exactly as
 * designed, and silently strips the filter, the sway and the dive for almost
 * everyone.
 *
 * The budget exists for the pathological cases the same file documents — the
 * 6fps and 1fps regressions — not for the design target. 85ms (≈12fps) is below
 * anything the map is meant to do and above its normal working range.
 */
export function useFrameBudget(budgetMs = 85, sampleMs = 1600): boolean {
  const [strained, setStrained] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('requestAnimationFrame' in window)) return;

    // An explicit reduced-motion preference already takes the same path.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const frames: number[] = [];
    let raf = 0;
    let last = performance.now();

    /*
     * SAMPLE BY FRAMES, NOT ONLY BY TIME.
     *
     * This used to stop dead at `sampleMs` and then require eight frames before
     * it would judge anything. Those two rules disagree with each other exactly
     * where it matters: the window is 1600ms and the warmup eats 400ms, so a
     * machine running at 60fps banks ~70 frames and decides easily — but one
     * running at 4fps banks about five, falls under the threshold, and the
     * budget silently never trips.
     *
     * Measured on this drawing at 3.2-5.3fps: `strained` stayed false, so the
     * flex filter, the sway, the dive and the depth-of-field lens all stayed ON
     * for the machine least able to afford them. The probe that exists to rescue
     * a struggling renderer switched itself off precisely when it was struggling
     * most, and the worse the frame rate, the more certain that became.
     *
     * So the window now extends until it has enough frames to judge, with a hard
     * cap so it can never sample forever. Nothing changes for a healthy machine:
     * it still has its frames long before `sampleMs` and still decides there.
     */
    const MIN_FRAMES = 6;
    const maxMs = Math.max(sampleMs * 4, 6000);

    /*
     * AND LOOK MORE THAN ONCE.
     *
     * The probe used to take a single reading as the map mounted and stand by it
     * forever. Mount is the one moment the drawing is cheap: the organism is
     * still being built, most of its 11,000 marks do not exist yet, and the
     * frames that early are nothing like the steady state that follows. Measured
     * here: the window closed under budget, `strained` latched false, and the map
     * then settled at 102-105ms — over budget, with every expensive effect left
     * running and no way for the probe to change its mind.
     *
     * So it re-reads a few times, spaced out, and stops at the first reading that
     * says strained. A healthy machine pays for at most a few frame counts and
     * never latches; a struggling one now gets its answer even if the strain
     * arrives late. It only ever latches ON — nothing here can un-strain a map,
     * because effects flickering back in on a recovering machine would be worse
     * than leaving them off.
     */
    const ROUNDS = 4;
    const GAP_MS = 4000;
    let round = 0;
    let timer = 0;
    let cancelled = false;

    const decide = (): boolean => {
      // Three is enough for a median to mean anything; below that the renderer
      // has produced almost nothing and guessing would be worse than waiting.
      if (frames.length < 3) return false;
      const sorted = [...frames].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      if (median > budgetMs) { setStrained(true); return true; }
      return false;
    };

    const startRound = () => {
      if (cancelled) return;
      frames.length = 0;
      const roundStart = performance.now();
      last = roundStart;
      const roundWarmup = roundStart + (round === 0 ? 400 : 120);

      const tick = (now: number) => {
        if (cancelled) return;
        const delta = now - last;
        last = now;
        if (now > roundWarmup) frames.push(delta);

        const elapsed = now - roundStart;
        const ready = elapsed >= sampleMs && frames.length >= MIN_FRAMES;
        if (ready || elapsed >= maxMs) {
          if (decide()) return;              // strained: latched, stop looking
          if (++round >= ROUNDS) return;     // healthy enough, often enough
          timer = window.setTimeout(startRound, GAP_MS);
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    startRound();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [budgetMs, sampleMs]);

  return strained;
}
