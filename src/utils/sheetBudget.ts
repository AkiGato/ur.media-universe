import { useEffect } from 'react';
import { repaginate, currentSheetMetrics } from '../data/pageModel';
import { measureProse } from './proseMetrics';

/**
 * Keep the cut matched to the frame.
 *
 * WHAT USED TO BE HERE, AND WHY IT IS NOT.
 *
 * This file held the estimate: it read a character density off whatever prose
 * happened to be on screen, multiplied it by the column box, and discounted the
 * product by a packing constant. Three notes of several hundred words each
 * defended the parts of that arithmetic, and every one of them was defending an
 * average against the sheet that was not average. The record of what it cost is
 * `docs/OPEN.md` 47: a median sheet filled to 54% of its column, and a dial
 * whose two ends were dead space and sideways overflow with no setting that
 * avoided both.
 *
 * The measurement moved to `proseMetrics.ts`, where every paragraph is set
 * offscreen at the column's own width and its height read back. There is then
 * no density, no packing constant and no dial: a sheet is filled until the
 * column is full. What is left here is the schedule — when to measure, and when
 * a measurement is worth re-cutting the book for.
 *
 * Re-cuts only when the frame has moved: a re-cut rebuilds the anchor and
 * search indexes and re-renders the reader, and doing that on every resize tick
 * is the work PF-03 refuses. It also means a drag of a window edge settles
 * rather than thrashing.
 *
 * The retry loop exists because the first measurement often runs before the
 * prose has been laid out — there is no prose column to measure yet,
 * `measureProse` says so by returning null, and a moment later there is.
 *
 * IT DOES NOT GIVE UP, and that is a correction to the version before it. The
 * retry window was forty tries at 120ms and then silence, on the assumption
 * that the only reason to fail is prose that has not painted yet. The other
 * reason is a sheet with no prose ON it: a reader who follows a figure from the
 * map lands on a schematic, and fourteen of the book's fifty-nine sheets carry
 * no manuscript paragraph at all. Five seconds later the measurement stopped
 * asking, and the book kept the default cut — the one made for no frame in
 * particular — for the rest of the session. So after the fast window it keeps
 * looking, twice a second, until it has measured once; a `querySelector` at
 * that cadence is not work worth counting, and it stops the moment it succeeds.
 *
 * IT RETRIES ON A TIMER AND NOT ON A FRAME, which is the same correction
 * `fitToBox` already carries in its own words: rAF does not fire in a tab that
 * is not being painted, so a reader who opens the book in a background tab, or
 * on a machine whose compositor has stalled, would never be measured at all and
 * would silently keep the default cut. Measured when this was written against
 * the old estimate: in a pane delivering 2–3 frames per SECOND the thirty-frame
 * retry window never elapsed, and the book was never re-cut because the
 * callback carrying the number was still queued. A timer fires regardless of
 * paint.
 */
export function useSheetBudget(deps: unknown[]): void {
  useEffect(() => {
    let timer = 0;
    let tries = 0;
    let calibratedFor = '';
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const measured = measureProse();
      if (measured === null) {
        timer = window.setTimeout(tick, tries++ < 40 ? 120 : 500);
        return;
      }

      /*
       * ONCE PER FRAME SIZE, AND THEN OUT OF THE WAY.
       *
       * The old estimate ran on every tick and fought a correction loop that
       * ran on every tick beside it — measured at 844x390, the sheet count went
       * 47 → 142 → 91 while a page was being read. Neither survives, but the
       * discipline they had to learn does: the cut is a property of the FRAME,
       * so it is made when the frame changes and at no other time. A reader
       * turning pages must never watch the book re-cut itself underneath them.
       */
      const key = `${window.innerWidth}x${window.innerHeight}`;
      if (calibratedFor === key) return;
      calibratedFor = key;

      /* A measurement that says the same thing as the cut in force is not worth
         rebuilding the book for. A tenth of the column is about half a
         paragraph — under that, nothing moves on any sheet. */
      const applied = currentSheetMetrics();
      const moved =
        Math.abs(measured.continuation - applied.continuation) / applied.continuation > 0.1 ||
        Math.abs(measured.section - applied.section) / applied.section > 0.1 ||
        applied.costOf !== measured.costOf;
      if (moved) repaginate(measured);
    };

    const restart = () => {
      tries = 0;
      calibratedFor = '';
      clearTimeout(timer);
      /* A resize settles before it is measured: the frame is still moving while
         a window edge is dragged, and re-cutting the book per tick would be the
         thrash the frame test exists to avoid. */
      timer = window.setTimeout(tick, 180);
    };

    /* First pass synchronously, for the same reason fitToBox takes its first
       measurement synchronously: if the prose is already laid out there is
       nothing to wait for, and waiting is what loses a hidden tab. */
    tick();
    window.addEventListener('resize', restart);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('resize', restart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
