import React, { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { BookPage, FIGURES, figureCarriesItsOwnApplication } from '../data/pageModel';
import { useOverlayFocus } from '../utils/a11y';
import { useDismiss } from '../utils/dismissStack';
import { ArrowLeft } from './organic/Icons';
import { Soma } from './organic/Organic';
import { FigureWorldContext } from './figures/FigurePrimitives';

import { DIAGRAMS } from './diagrams/registry';

/** The worlds, in chapter order — the list is `FIGURES` in pageModel, and the
    count follows it rather than being restated here. */
const FIGURE_ORDER = FIGURES;

/**
 * One passage out of a figure world.
 *
 * A soma and a name — the same two marks the map uses for everything it offers,
 * because a passage out of the tissue should look like the tissue rather than
 * like a button bolted to it. `lit` marks the one that leads onward instead of
 * back, and it is carried by light, never by weight or by a box.
 */
const Passage: React.FC<{
  onClick: () => void;
  label: string;
  hint: string;
  lit?: boolean;
  /** the way you came, which an arrow says better than any name */
  arrow?: boolean;
  /** the one control that must stay findable while the drawing is studied */
  breathe?: boolean;
}> = ({ onClick, label, hint, lit = false, arrow = false, breathe = false }) => (
  <button
    onClick={onClick}
    title={hint}
    aria-label={hint}
    className={`bud flex items-center gap-2 px-2 py-2 rounded-none outline-none min-w-0 max-w-[46vw] sm:max-w-none ${
      lit ? 'bud-lit' : ''
    }`}
  >
    {arrow
      ? <ArrowLeft className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
      : <Soma size={8} opacity={lit ? 0.95 : 0.5} phase={label.length * 1.7} />}
    <span className={`text-[9px] font-light uppercase tracking-[0.2em] truncate ${
      breathe ? 'cta-breathe' : lit ? 'opacity-95' : 'opacity-75'
    }`}>
      {label}
    </span>
  </button>
);

/**
 * The figure, on a surface of its own.
 *
 * A figure inside a page is a figure inside a box: it gets whatever width the
 * reading margin leaves it, it sits in a framed panel because it needs an edge
 * to separate it from the prose, and it scrolls — a diagram with a scrollbar is
 * a diagram you cannot see. All three are consequences of sharing the sheet
 * with text.
 *
 * So it does not share the sheet. Touching the cell on the page opens the
 * figure here: full bleed, no page furniture, no frame, nothing to scroll, the
 * whole organism animating at the size it was drawn for. Esc or the close mark
 * returns to exactly the page you left, at the position you left it.
 *
 * This is a surface, not a book page. Pages are indexed, and bookmarks,
 * highlights and the saved reading position are all stored by index — adding
 * five pages would move every mark after them. The figure gets its own space
 * without the book renumbering underneath the people already reading it.
 */
export const FigureStage: React.FC<{
  figure: BookPage['diagramType'];
  title: string;
  isDark: boolean;
  onClose: () => void;
  /* The passage straight to the chapter stood here. The corner now carries a
     plain back arrow instead, and the walk to the chapter is the trail's second
     step rather than a jump of its own — so the prop had no caller left, and a
     prop every call site must supply for nothing is how the last fossil got in. */
  /** back to the map that holds every chapter */
  onToMap: () => void;
  /** forward into the rule that puts this figure to work */
  onToPractice: () => void;
  /** the rule's name, so the passage forward says where it goes */
  /** step sideways into another figure world without touching the page under it */
  onToFigure: (f: BookPage['diagramType']) => void;
}> = ({ figure, title, isDark, onClose, onToMap, onToPractice, onToFigure }) => {
  const stageRef = useOverlayFocus<HTMLDivElement>(true);
  const StageDiagram = figure ? DIAGRAMS[figure] : null;

  /* Escape belongs to the topmost surface, and this is one — see dismissStack.
     The listener this replaced called stopPropagation to keep App from also
     leaving for the map, which never worked: both listeners were on window, and
     propagation is about targets. */
  useDismiss(true, onClose);

  /*
   * A backward gesture leaves the world.
   *
   * The reader arrived from a page and that page is still underneath, so the
   * gesture that means "back" everywhere else has to mean it here too — a
   * surface you can only leave by finding a control is a trap however calm it
   * looks. BookSpread already declines to turn pages while a dialog is open, so
   * there is nothing to arbitrate with.
   *
   * The same guards the page turn earned: committed to the horizontal, far
   * enough to be meant, and a lock cleared on a quiet interval so trackpad
   * momentum cannot fire it twice. Backward only — forward has nowhere to go.
   */
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const THRESHOLD = 110;
    const QUIET = 220;
    let acc = 0;
    let locked = false;
    let timer = 0;
    let start: { x: number; y: number } | null = null;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { acc = 0; locked = false; }, QUIET);
      if (locked) return;
      acc += e.deltaX;
      if (acc > -THRESHOLD) return;
      acc = 0;
      locked = true;
      onClose();
    };
    const onTouchStart = (e: TouchEvent) => {
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = start;
      start = null;
      if (!t) return;
      const dx = e.changedTouches[0].clientX - t.x;
      const dy = e.changedTouches[0].clientY - t.y;
      if (dx < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      onClose();
    };

    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      window.clearTimeout(timer);
    };
  }, [onClose, stageRef]);

  /*
   * Portalled to <body>, and this is not optional.
   *
   * The page turn is a motion transform, and a transformed ancestor becomes the
   * containing block for `position: fixed` inside it — so rendered in place this
   * surface was laid out against the sheet rather than the viewport: the reader
   * chrome showed through above and below it, and its own title row was clipped
   * off the top. "Full bleed" has to mean the actual frame.
   */
  return createPortal(
    <div
      ref={stageRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Figure: ${title}`}
      className={`surface fig-ground-black fixed inset-0 z-[60] flex flex-col ${
        'bg-black text-white'
      }`}
    >
{/* One name, at the top edge, and nothing else.

          The subtitle went: it restated the page's own subtitle a second time
          on a surface whose whole purpose is to have less text on it than the
          page did. The close cross went too — it said "this is a panel over
          something", and a world is not a panel. The way out is the three
          passages at the foot, which say where they lead instead of merely
          being an exit. */}
      {/* No title — a world is not captioned. What the top edge does carry is
          the one navigation fact nothing else on this surface states: the quiet
          way out. */}
      {/* The ways back, in the corner every platform keeps them in.

          They sat at the foot beside the way forward, which put "leave" and "go
          on" in one row and made a reader read three labels to find the one that
          was not a retreat. Back belongs where the thumb and the eye already go;
          the foot is left to the single control that leads onward.

          "The chapter" became a plain arrow, because it was never naming a
          destination — it was naming the way you came, which is the one thing an
          arrow says without a word. It is also exactly what the backward swipe
          does, so the gesture and the mark are one behaviour with two doors. */}
      {/* Three columns rather than justify-between: the archive sits at the true
          centre of the bar whatever the two sides happen to weigh, and the
          middle column collapses to nothing when it hides on a narrow screen.

          The third column only claims its half where there is something in it.
          It holds the Esc hint, which is `hidden sm:inline` — but a `1fr` track
          is paid for whether or not its content is displayed, so below `sm` the
          bar was 128px of buds against 128px of nothing. Measured at 320px:
          "Back" drew 17.5px of a 29px word and "The map" 34.5px of 50px, so the
          two ways out of the figure read "B…" and "THE …". As `auto` the empty
          track is 0 and the left column takes all 256px, which is where the
          centring the three columns exist for stops mattering anyway — the
          archive between them is hidden at the same breakpoint. */}
      <div className="flex-shrink-0 pt-3 px-5 sm:px-8 grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Passage onClick={onClose} label="Back" hint="Back to the page you came from" arrow />
          <Passage onClick={onToMap} label="The map" hint="Return to the orientation map" />
        </div>
        <div className="justify-self-center min-w-0">
        {/* Sideways: the other four worlds, one step each way, in chapter order.
            Wrapping — the worlds are a cycle, not a corridor with dead ends. */}
        {(() => {
          const i = FIGURE_ORDER.findIndex(f => f.type === figure);
          if (i < 0) return null;
          const prev = FIGURE_ORDER[(i + FIGURE_ORDER.length - 1) % FIGURE_ORDER.length];
          const next = FIGURE_ORDER[(i + 1) % FIGURE_ORDER.length];
          return (
            <div className="hidden sm:flex items-center gap-1.5 min-w-0">
              <Passage onClick={() => onToFigure(prev.type)} label={'‹ ' + prev.short}
                hint={'Previous figure — ' + prev.short} />
              {/* TY-03: caps here are tracked 0.2em like every other label on this bar.
                  TY-05: the name appears nowhere else on the stage. */}
              <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-25">Figure Archive</span>
              <Passage onClick={() => onToFigure(next.type)} label={next.short + ' ›'}
                hint={'Next figure — ' + next.short} />
            </div>
          );
        })()}
        </div>
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-25 hidden sm:inline justify-self-end"
          aria-hidden="true">
          Esc or swipe back
        </span>
      </div>

      {/* All the remaining room, and no frame around it — the context says so,
          and every figure drawn under it drops its caption, tag, veins and foot
          rather than restating on this surface what the surface already says. */}
      <FigureWorldContext.Provider value={true}>
      {/* CENTRED WHEN IT FITS, TOP-ALIGNED WHEN IT DOES NOT.

          This was `items-center`, and flex centring does not clip — it pushes.
          A figure taller than the stage had its top driven ABOVE the frame with
          no way to reach it: measured at 540px, the Two Trajectories face
          selector sat at y = -45, so a narrow reader could see whichever face
          happened to rest and could not reach the other two. Two thirds of that
          figure was unreachable, and nothing on screen said so.

          `items-start` with `my-auto` on the child is the pair that behaves:
          the auto margins still centre a short figure, and a tall one starts at
          the top and scrolls instead of overflowing upward. `soft-scroll` keeps
          it inside its own column, which is what LY-02 asks for. */}
      <div className="flex-1 min-h-0 w-full flex items-start justify-center overflow-y-auto soft-scroll p-3 sm:p-6 [&>*]:my-auto">
        <Suspense
          fallback={
            <div className="flex items-center gap-3 opacity-40" role="status" aria-live="polite">
              <Soma size={12} phase={3.1} />
              <span className="text-[9px] font-light uppercase tracking-[0.2em]">Figure settling</span>
            </div>
          }
        >
          {/* One table, shared with the page (see diagrams/registry.ts). This
              was a chain of `{figure === '...' && <X />}`, which has no
              exhaustiveness: a figure type added without a line here rendered
              NOTHING and compiled clean. */}
          {StageDiagram && <StageDiagram isDark={isDark} />}
        </Suspense>
      </div>
      </FigureWorldContext.Provider>

{/* The passages out.

          A world with one door is a room. Two lead back — to the chapter that
          argues this figure, and to the map that holds every chapter — and they
          sit at the head of the stage with the archive. What is left down here
          is the one that leads on, into the rule that puts the figure to work,
          which is the only thing in this world that is not more reading. It
          says where it goes rather than what it does to the window.

          Except where the world already ends in its own instrument. The causal
          taxonomy runs itself on text the reader pastes in, a few centimetres
          above this bar; a passage to the prose about that would be the same
          offer twice and the weaker one (TY-05). The foot holds exactly one
          thing, so when that thing is dropped the bar goes with it rather than
          standing as an empty strip of chrome. */}
      {!figureCarriesItsOwnApplication(figure) && (
      <nav className="flex-shrink-0 px-5 sm:px-8 pb-4 pt-2 flex items-center justify-center gap-3 flex-wrap"
        aria-label="Passages out of this figure">
        <Passage onClick={onToPractice} label="Application" hint="Put this to work" lit breathe />
      </nav>
      )}
    </div>,
    document.body
  );
};
