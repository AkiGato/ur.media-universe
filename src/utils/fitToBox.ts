import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Fit a page's prose to the sheet instead of scrolling it.
 *
 * The design rule is that the viewport never scrolls, and long content scrolls
 * *inside* its column. That keeps the page whole, but it also means a reader
 * meets a scrollbar in the middle of a spread — and a scrollbar is an admission
 * that the page did not fit. Reading stops being a page you take in and becomes
 * a trough you drag through.
 *
 * So: measure, and step the type down until the column fits its box. The scale
 * is bounded — below `min` the text would be smaller than the reader chose in
 * settings, and at that point scrolling is the honest answer and the caller
 * keeps its `.soft-scroll`.
 *
 * Measurement runs in useLayoutEffect against ResizeObserver, so it settles
 * before paint and re-settles on font-size changes, window resize and page
 * turns. It never animates: type that eases into its final size is a page that
 * appears to breathe in the one way nothing here should.
 */
export function useFitToBox(
  deps: unknown[],
  { min = 0.72, max = 1, step = 0.04 }: { min?: number; max?: number; step?: number } = {}
) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;

    let raf = 0;

    const measure = () => {
      /*
       * ZOOM, NOT FONT-SIZE — and this is the whole reason the fitter did
       * nothing for two years of pages.
       *
       * It used to set `font-size` as a percentage on the wrapper. Every
       * paragraph under it carries `text-[12px]`, which TY-02 requires and which
       * is an ABSOLUTE size, so it inherited nothing and never moved a pixel.
       * The mechanism ran, reported a scale, and changed nothing on screen:
       * pages could not shrink to fit and could not grow to fill, which is most
       * of why sheets came out half empty with the type stuck at one size.
       *
       * `zoom` scales the whole subtree including absolute lengths, and unlike a
       * transform it REFLOWS — lines re-wrap at the new size instead of the
       * block being stretched and overflowing its column. It is what the fitter
       * always meant.
       */
      let next = 1;
      content.style.zoom = '1';

      /*
       * "Fits" has to mean both directions.
       *
       * The prose column is `.hflow`, a multi-column flow: content too tall for
       * the sheet does not overflow downward, it opens a SECOND COLUMN off to
       * the side. So a height test alone always passes and would let the type
       * grow until the page silently split in two. The honest test is that no
       * second column has appeared — and, for boxes that are not multicol, that
       * the content still clears the bottom.
       */
      const fits = () =>
        box.scrollWidth <= box.clientWidth + 1 &&
        content.getBoundingClientRect().height <= box.clientHeight + 1;

      // too much: step down until it is in, or until the floor says stop and
      // scrolling is the honest answer
      while (!fits() && next > min) {
        next = Math.max(min, +(next - step).toFixed(3));
        content.style.zoom = String(next);
      }

      // too little: step up until one more step would break it. Bounded by
      // `max`, because a sheet holding three short paragraphs must fill the page
      // without setting them at headline size.
      if (next === 1 && max > 1) {
        while (next < max) {
          const trial = Math.min(max, +(next + step).toFixed(3));
          content.style.zoom = String(trial);
          if (!fits()) {
            content.style.zoom = String(next);
            break;
          }
          next = trial;
        }
      }

      setScale(next);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    /*
     * The first measurement is synchronous, and that is not a micro-optimisation.
     *
     * It used to be scheduled through requestAnimationFrame like every later
     * one. rAF does not fire in a tab that is not being painted — a background
     * tab, a hidden pane, a window behind another — so a page laid out while
     * hidden was never measured at all, and because the effect only re-runs on a
     * page turn or a settings change it stayed unmeasured after the reader came
     * back. The page simply kept whatever size it happened to be.
     *
     * useLayoutEffect runs after layout and before paint, so measuring here is
     * both safe and correct. rAF stays for the ResizeObserver, where it is doing
     * its actual job: coalescing a burst of resize callbacks into one pass.
     */
    measure();

    const ro = new ResizeObserver(schedule);
    ro.observe(box);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { boxRef, contentRef, scale, fits: scale > min };
}
