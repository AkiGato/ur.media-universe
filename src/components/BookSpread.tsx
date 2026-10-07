import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from './organic/Icons';
import { BOOK_PAGES, BookPage, chapterBounds, takesWholeSheet } from '../data/pageModel';
import { UserPreferences, Highlight } from '../data/userStore';
import { PageRenderer } from './PageRenderer';
import { Vein, ProgressStrand } from './organic/Organic';
import { playPageTurnSound } from '../utils/audio';

interface BookSpreadProps {
  currentPageIndex: number;
  onPageChange: (newPageIndex: number) => void;
  prefs: UserPreferences;
  onAddHighlight: (highlight: Omit<Highlight, 'id'>) => void;
  /** the reader's own marks, so a sheet can draw the ones that fall on it */
  highlights: Highlight[];
  /** the return leg to the map, for the passages out of a figure world */
  onLeaveToMap: () => void;
  /** pages waiting behind this one, innermost last — see App's backTrail */
  backTrail: number[];
  /** walk one step back along that trail */
  onBack: () => void;
  /** leave for a page while remembering the way back through it */
  pendingFigure?: BookPage["diagramType"] | null;
  /** an instrument asked for from outside — opened by the sheet that owns it */
  pendingTool?: string | null;
  onToolOpened?: () => void;
  onFigureOpened?: () => void;
}

export const BookSpread: React.FC<BookSpreadProps> = ({
  currentPageIndex,
  onPageChange,
  prefs,
  onAddHighlight,
  highlights,
  onLeaveToMap,
  backTrail,
  onBack,
  pendingFigure,
  pendingTool,
  onToolOpened,
  onFigureOpened
}) => {
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  /**
   * The sheet measures itself, rather than asking the window how wide it is.
   *
   * This read `window.innerWidth` once at mount and then only when the window
   * fired a resize — and the 1-page/2-page control appeared broken because of
   * it. Toggling the setting flips `viewMode` immediately, but the layout it
   * feeds also depends on the width, and a width captured at mount goes stale
   * for every reason that is not a window resize: the browser zoomed, the pane
   * or split view changed, a drawer opened beside the reading area, the OS
   * scaled the display. In any of those the reader flips the switch, nothing
   * moves, and the switch is what gets blamed.
   *
   * A ResizeObserver on the sheet answers the question actually being asked —
   * how much room is there to lay pages in — instead of a proxy for it. The
   * window listener stays alongside it because a plain resize is still the
   * common case and some engines deliver it first; the observer covers
   * everything else, exactly as LivingFigure's own measurement does.
   */
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  /* Held in state, not only in a ref, because the observer has to be attached
     when the node EXISTS rather than when this component first mounts. A ref
     read inside a mount-once effect is null on the pass that matters and stays
     null forever after, which is precisely how the observer below silently did
     nothing while the window listener carried on working — the bug looked like
     "sometimes it updates, sometimes it does not". */
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (stageEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect?.width;
        if (w) setWindowWidth(w);
      });
      ro.observe(stageEl);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [stageEl]);

  const isDark = prefs.theme === 'dark';
  const totalPages = BOOK_PAGES.length;

  const isDesktop = windowWidth >= 1024;
  const isSpreadView = prefs.viewMode === 'spread' && isDesktop;

  /**
   * How the sheet is divided.
   *
   * Pages are grouped once and paging moves group by group, rather than being
   * derived from the parity of the index. Parity forces every page into a pair,
   * and a schematic squeezed into half a spread is a schematic drawn at half
   * scale — which is the one thing the figures are not allowed to be. So a
   * diagram takes the whole sheet, exactly as the cover does, and grouping the
   * rest around it keeps navigation honest: no page is ever skipped because its
   * partner was rendered alone.
   */
  const groups = React.useMemo<number[][]>(() => {
    /* The cover, every schematic, and the ruleset library — see takesWholeSheet. */
    const solo = (i: number) => i === 0 || takesWholeSheet(BOOK_PAGES[i]);
    const out: number[][] = [];
    let i = 0;
    while (i < totalPages) {
      if (!isSpreadView || solo(i) || i + 1 >= totalPages || solo(i + 1)) {
        out.push([i]);
        i += 1;
      } else {
        out.push([i, i + 1]);
        i += 2;
      }
    }
    return out;
  }, [isSpreadView, totalPages]);

  const groupIdx = Math.max(
    0,
    groups.findIndex(g => g.includes(currentPageIndex))
  );
  const group = groups[groupIdx] || [0];

  const leftPageIndex = group[0];
  const rightPageIndex: number | null = group.length > 1 ? group[1] : null;

  const leftPage: BookPage = BOOK_PAGES[leftPageIndex] || BOOK_PAGES[0];
  /* the strand shows the chapter it is inside as well as the whole book */
  const chapterSpan = chapterBounds(leftPageIndex);
  const rightPage: BookPage | null = rightPageIndex !== null ? BOOK_PAGES[rightPageIndex] || null : null;

  /**
   * A fade has two halves, and only one of them was here.
   *
   * `turn-fade` animates the ARRIVING sheet from transparent to present. The
   * leaving sheet had no exit at all: React swapped the content on the same
   * frame the class replayed, so the old page vanished on a cut and the new one
   * faded in over the ground. Asked for: fade out and fade in.
   *
   * So the turn is deferred by exactly the length of the out-phase. The sheet
   * goes to transparent, the page changes while nothing is legible, and the
   * arriving sheet plays its own half. 110ms each way is 220ms end to end,
   * inside the 0.2–0.28s MO-03 allows a page turn — the reader waits no longer
   * than before, they simply see the first half of what was already happening.
   *
   * Only for the fade. The tide, the slide and the settle carry their own exit
   * in their keyframes, and reduced motion takes the cut, because an engine
   * that has been told not to animate must not be handed a timer instead.
   *
   * The out-phase swaps the CLASS rather than setting an inline opacity. The
   * arriving keyframe fills `both`, so between turns it sits frozen on this
   * element holding opacity at 1, and a filled animation outranks an inline
   * style — an inline `opacity: 0` measured as no change at all for the whole
   * out-phase. `.turn-fade-out` replaces it instead, and the applied animation
   * is the one that runs.
   */
  const [fadingOut, setFadingOut] = React.useState(false);
  const fadeTimer = React.useRef<number | null>(null);
  const FADE_OUT_MS = 110;

  React.useEffect(() => () => {
    if (fadeTimer.current !== null) clearTimeout(fadeTimer.current);
  }, []);

  const commitTurn = React.useCallback((go: () => void) => {
    const reduced = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefs.animationStyle !== 'fade' || reduced) { go(); return; }
    if (fadeTimer.current !== null) clearTimeout(fadeTimer.current);
    setFadingOut(true);
    fadeTimer.current = window.setTimeout(() => {
      fadeTimer.current = null;
      setFadingOut(false);
      go();
    }, FADE_OUT_MS);
  }, [prefs.animationStyle]);

  const handlePrev = () => {
    if (groupIdx <= 0) return;
    setDirection('prev');
    commitTurn(() => onPageChange(groups[groupIdx - 1][0]));
    playPageTurnSound(prefs.soundEnabled);
  };

  /**
   * Backwards means "out of here" before it means "one page left".
   *
   * A reader who followed a figure into the rule that applies it is not reading
   * a sequence at that moment — they are standing at the end of a short
   * excursion, and the gesture they will reach for is the one every platform
   * has taught them means back. So while a trail exists, a backward gesture
   * walks it: one step to the figure, a second to the chapter they left. The
   * trail empties after two, and from there the same gesture is a page turn
   * again, which is what it always was.
   */
  const handleBackOrPrev = () => {
    if (backTrail.length > 0) {
      setDirection('prev');
      commitTurn(onBack);
      playPageTurnSound(prefs.soundEnabled);
      return;
    }
    handlePrev();
  };

  const handleNext = () => {
    if (groupIdx >= groups.length - 1) return;
    setDirection('next');
    commitTurn(() => onPageChange(groups[groupIdx + 1][0]));
    playPageTurnSound(prefs.soundEnabled);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        onPageChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onPageChange(totalPages - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // groupIdx, not currentPageIndex: the handlers close over the group walk
  }, [groupIdx, groups, totalPages, isSpreadView, prefs.soundEnabled]);

    /*
   * Horizontal scroll turns the page.
   *
   * This is a gesture, not a scrollbar. The sheet stays `overflow-hidden` and
   * the viewport is never scrollable in either axis — **No Page Scrolling** is
   * intact. What is read here is the *intent* of a two-finger swipe, and a page
   * turn is played from it, exactly as the arrow keys play one.
   *
   * Four things a naive deltaX listener gets wrong, and each cost a rule:
   *
   *   axis        A trackpad flick is never purely horizontal. Without a lock,
   *               scrolling prose vertically turns the page on the diagonal
   *               component. Vertical intent wins ties and everything else.
   *
   *   momentum    A trackpad keeps emitting deltas long after the fingers lift,
   *               so a single flick arrives as dozens of events and would turn
   *               dozens of pages. One gesture is one turn: the accumulator
   *               locks on firing and only unlocks after the stream has been
   *               quiet, which is the only reliable end-of-gesture signal.
   *
   *   ownership   A wide figure on the sheet scrolls horizontally inside its own
   *               `.soft-scroll` box. If anything under the pointer can still
   *               take the scroll itself, it keeps it — the page turns only when
   *               the gesture has nowhere else to go.
   *
   *   overlays    A drawer, the search, or a figure world owns the surface while
   *               it is open, and must not be paged out from underneath.
   *
   * Bound to the sheet rather than to `window`: the map reads its own wheel for
   * zoom, and a listener on the window with `preventDefault` would reach across
   * views to fight it.
   */
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const wheel = React.useRef({ acc: 0, locked: false, timer: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    /** true when something under the pointer can still take this scroll itself */
    const ownsGesture = (start: Element | null, dx: number): boolean => {
      for (let n: Element | null = start; n && n !== el; n = n.parentElement) {
        if (!/(auto|scroll)/.test(getComputedStyle(n).overflowX)) continue;
        if (n.scrollWidth <= n.clientWidth + 1) continue;
        const max = n.scrollWidth - n.clientWidth;
        if (dx < 0 && n.scrollLeft > 1) return true;
        if (dx > 0 && n.scrollLeft < max - 1) return true;
      }
      return false;
    };

    /** far enough to be meant; a flick under this is a wobble */
    const THRESHOLD = 110;
    /** silence that marks the end of a gesture, momentum included */
    const QUIET = 220;

    const onWheel = (e: WheelEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      if (ownsGesture(e.target as Element, e.deltaX)) return;

      e.preventDefault();
      const w = wheel.current;
      window.clearTimeout(w.timer);
      w.timer = window.setTimeout(() => { w.acc = 0; w.locked = false; }, QUIET);

      if (w.locked) return;
      w.acc += e.deltaX;
      if (Math.abs(w.acc) < THRESHOLD) return;
      if (w.acc > 0) handleNext(); else handleBackOrPrev();
      w.acc = 0;
      w.locked = true;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    /* Detach the listener and NOTHING else. The unlock timer belongs to the
       gesture, not to this effect: turning a page changes groupIdx, which
       re-runs the effect, and clearing the timer here killed the pending unlock
       — so `locked` stayed true and every second gesture was swallowed. It is
       cleared on real unmount instead, below. */
    return () => el.removeEventListener('wheel', onWheel);
    // groupIdx, not currentPageIndex: the handlers close over the group walk
    // backTrail joins the deps: the handler closes over it, and a stale closure
    // would keep walking a trail the reader has already walked out of
  }, [groupIdx, groups, isSpreadView, prefs.soundEnabled, backTrail]);

  useEffect(() => () => window.clearTimeout(wheel.current.timer), []);

  /*
   * The turn, without a motion library.
   *
   * framer-motion was 42 kB of gzip carried for this one transition, and its
   * AnimatePresence kept BOTH spreads mounted while it ran — two sheets of a
   * few thousand nodes each, double-rendered for every page turn. The turn is
   * now a CSS enter animation on a keyed remount: the arriving sheet plays its
   * animation, the leaving one is simply gone, and the ground beneath is plain
   * black — so the eye reads a calm dissolve, not a removal.
   *
   * Each style maps to a class in index.css; direction rides a custom property
   * so one keyframe set serves both ways. Reduced motion is handled where it
   * belongs, in the stylesheet.
   */
  const turnClass =
    prefs.animationStyle === 'slide' ? 'turn-slide'
    : prefs.animationStyle === 'tide' ? 'turn-tide'
    : prefs.animationStyle === 'fade' ? 'turn-fade'
    : 'turn-settle';

  /* Touch swipe — the same gesture, and the same axis lock. It had none: a
     drag down a column of prose that drifted 60px sideways turned the page,
     which on a phone is most drags. */
  const touch = React.useRef<{ x: number; y: number; el: Element | null } | null>(null);

  return (
    <div
      ref={node => { stageRef.current = node; setStageEl(node); }}
      className={`relative flex-1 w-full h-full flex flex-col justify-between overflow-hidden select-none rounded-none transition-colors duration-500 ${
      isDark ? 'bg-black text-white' : 'bg-white text-black'
    }`}>

      {/* Main Content Workspace Stage */}
      <main className="relative flex-1 w-full h-full mx-auto flex items-center justify-center overflow-hidden rounded-none p-2 sm:p-4">
          <div
            key={leftPageIndex + (rightPageIndex ? `-${rightPageIndex}` : '')}
            onTouchStart={e => {
              touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY,
                el: e.target as Element };
            }}
            onTouchEnd={e => {
              const t = touch.current;
              touch.current = null;
              if (!t) return;
              const dx = e.changedTouches[0].clientX - t.x;
              const dy = e.changedTouches[0].clientY - t.y;
              // committed to the horizontal, not merely drifting across it
              if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
              // a horizontal flow under the finger owns the gesture until its
              // own edge — same yield the wheel already makes
              for (let n: Element | null = t.el; n; n = n.parentElement) {
                if (!n.classList?.contains('hflow')) continue;
                const max = n.scrollWidth - n.clientWidth;
                if (max > 2 && ((dx < 0 && n.scrollLeft < max - 1) || (dx > 0 && n.scrollLeft > 1))) return;
                break;
              }
              if (dx < 0) handleNext(); else handleBackOrPrev();
            }}
            style={{ '--turn-dir': direction === 'next' ? 1 : -1 } as React.CSSProperties}
            className={`${fadingOut ? 'turn-fade-out' : turnClass} w-full h-full flex overflow-hidden transition-colors duration-500 rounded-none ${
              isDark ? 'text-white' : 'text-black'
            }`}
          >
            {/* No tissue in the sheet's corners.

                They were arcs, then real branching arbors, then faint branching
                arbors. Each pass made them better drawings and none of them made
                the page better: a reading surface with growth in two corners is
                a reading surface with two things on it that are not the reading.
                The organism is the map, and the chapter openers are where it
                enters the book. A page of prose is paper. */}

            {/* Left Page Component */}
            <div className="flex-1 min-w-0 h-full relative overflow-hidden rounded-none">
              <PageRenderer
                page={leftPage}
                prefs={prefs}
                onAddHighlight={onAddHighlight}
                highlights={highlights}
                onJumpToPage={onPageChange}
                onLeaveToMap={onLeaveToMap}
                backTrail={backTrail}
                onBack={onBack}
                pendingFigure={pendingFigure}
                pendingTool={pendingTool}
                onToolOpened={onToolOpened}
                onFigureOpened={onFigureOpened}
              />
            </div>

            {/* Right Page Component (In 2-Page Spread View) */}
            {rightPage && (
              <>
                {/* The gutter is a filament, never a rule */}
                <div className="hidden lg:block h-full py-10 opacity-60 pointer-events-none">
                  <Vein orientation="v" opacity={0.4} phase={5.2} />
                </div>
                <div className="flex-1 min-w-0 h-full relative hidden lg:block overflow-hidden rounded-none">
                  {/* The right page takes the same pending requests as the left.
                      It did not, and a figure or an instrument asked for from
                      the index simply never opened when its sheet happened to
                      fall on this side of the spread — which is half of them,
                      and is why §5.6's instrument could be reached from its own
                      sheet but not from the index. Both renderers guard on
                      matching their OWN page, so only the one actually carrying
                      the thing ever acts; handing the request to both is how it
                      stops depending on which side of the gutter a section
                      landed after the last repagination. */}
                  <PageRenderer
                    page={rightPage}
                    prefs={prefs}
                    onAddHighlight={onAddHighlight}
                    highlights={highlights}
                    onJumpToPage={onPageChange}
                    onLeaveToMap={onLeaveToMap}
                    backTrail={backTrail}
                    onBack={onBack}
                        pendingFigure={pendingFigure}
                    pendingTool={pendingTool}
                    onToolOpened={onToolOpened}
                    onFigureOpened={onFigureOpened}
                  />
                </div>
              </>
            )}
          </div>
      </main>

      {/* App Shell Footer Control Bar */}
      {!prefs.zenMode && (
        <footer className={`relative w-full flex-shrink-0 z-30 rounded-none transition-colors duration-500 ${
          isDark ? 'text-white' : 'text-black'
        }`}>
          {/* No divider above the bar. A .veil already fades into the page at
              its own edge; a filament drawn across that edge is a second line
              saying what the first one said. */}
          <div className="veil veil-up reader-bar reader-bar--foot px-4 flex items-center justify-between text-[12px]">
            <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-4">
              <button
                onClick={handlePrev}
                disabled={groupIdx <= 0}
                className={`px-3 py-1.5 outline-none flex items-center justify-center opacity-55 hover:opacity-100 transition-opacity duration-500 ${
                  groupIdx <= 0
                    ? 'opacity-25 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
                title="Previous Page"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Progress, not a number. The strand says how far along you are
                  without asking to be read — the count it replaces was words in
                  the one place the eye passes on every single turn. */}
              {/* The running head, and the progress it runs above.

                  The chapter announces itself once, at full size, on the sheet
                  that opens it. Everywhere after that its name lives here — a
                  third of full strength, directly over the strand — because a
                  reader deep in a section wants to be reminded where they are,
                  not told again what they are reading. Faded to 0.3 it is
                  available to a glance and invisible to a sentence.

                  It is the chapter's own name, never the section's: the section
                  is named at the top of the sheet that starts it, and repeating
                  that here would be the same string twice on one frame. */}
              {/* `min-w-0`, and the page-turn controls depend on it. A flex
                  item's automatic minimum is its content's minimum, and the
                  running head below is `truncate` — whose `overflow: hidden`
                  sits on the span, not on this column, so it never shrinks this
                  box. Measured at 375px: the column took the full 448px of nowrap
                  title inside a 343px bar and carried Next out to x=540, 165px
                  past the right edge of the phone — unreachable, on a surface
                  where the viewport does not scroll (LY-02) and the swipe is
                  the only other way to turn (LY-03). With the minimum released
                  the column folds to 223px and the button lands at 359. The
                  bare strand overflowed too, at 250px against 223: 11px on a
                  sheet carrying no running head at all. */}
              <div className="flex-1 min-w-0 max-w-md mx-auto px-2 flex flex-col items-center gap-1"
                aria-label={`Page ${leftPageIndex + 1} of ${totalPages}`}>
                {leftPage.chapterTitle && (
                  <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-25 truncate max-w-full leading-none">
                    {leftPage.chapterTitle}
                  </span>
                )}
                <ProgressStrand
                  progress={((leftPageIndex + 1) / totalPages) * 100}
                  chapterFrom={chapterSpan?.from}
                  chapterTo={chapterSpan?.to}
                />
              </div>

              <button
                onClick={handleNext}
                disabled={groupIdx >= groups.length - 1}
                className={`px-3 py-1.5 outline-none flex items-center justify-center opacity-55 hover:opacity-100 transition-opacity duration-500 ${
                  groupIdx >= groups.length - 1
                    ? 'opacity-25 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
                title="Next Page"
                aria-label="Next Page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
