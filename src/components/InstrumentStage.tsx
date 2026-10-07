import React, { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayFocus } from '../utils/a11y';
import { useDismiss } from '../utils/dismissStack';
import type { QuestionRef } from './widgets/FiveQuestionsWidget';
import { Soma } from './organic/Organic';

const FiveQuestionsWidget = lazy(() =>
  import('./widgets/FiveQuestionsWidget').then((m) => ({ default: m.FiveQuestionsWidget }))
);
const ContentBudgetWidget = lazy(() =>
  import('./widgets/ContentBudgetWidget').then((m) => ({ default: m.ContentBudgetWidget }))
);
const RestorationDeltaWidget = lazy(() =>
  import('./widgets/RestorationDeltaWidget').then((m) => ({ default: m.RestorationDeltaWidget }))
);

/** The instruments this surface can hold. Each one operationalises a section
    that argues it, and opens from that section's own sheet. */
export type Instrument = 'five-questions' | 'content-budget' | 'restoration-delta';

/** What each one is called on the surface that holds it, said once, here.
    The stage used to decide this inline with a ternary, which stopped being
    able to spell three names the moment there were three. */
const INSTRUMENT_NAME: Record<Instrument, string> = {
  'five-questions': 'The five operational questions',
  'content-budget': 'Content Pollution Control',
  'restoration-delta': 'The Restoration Delta'
};

/**
 * WHICH INSTRUMENTS FIT ONE SCREEN.
 *
 * This surface scrolled because the five questions used to be five open cards
 * and the budget was a column of every assumption at once. Both are panels now
 * — one question at a time, one accordion open at a time — sized to the frame
 * they are given, so the scroll they needed is gone and LY-02 is satisfied the
 * way the rest of the app satisfies it: by fitting, not by scrolling.
 *
 * The Restoration Delta is not in this set. It asks for six readings at once
 * and its whole claim is comparative, so collapsing it into a sequence would
 * hide the pair that is the measurement. It keeps the scrolling column.
 */
const FITS_ONE_SCREEN: Record<Instrument, boolean> = {
  'five-questions': true,
  'content-budget': true,
  'restoration-delta': false
};

/**
 * One passage out of the instrument. The same two marks the figure worlds use,
 * because a passage should look like the tissue and not like a button on it.
 */
const Passage: React.FC<{
  onClick: () => void;
  label: string;
  hint: string;
  lit?: boolean;
}> = ({ onClick, label, hint, lit = false }) => (
  <button
    onClick={onClick}
    title={hint}
    aria-label={hint}
    className={`bud flex items-center gap-2 px-2 py-2 rounded-none outline-none min-w-0 ${
      lit ? 'bud-lit' : ''
    }`}
  >
    <Soma size={8} opacity={lit ? 0.95 : 0.5} phase={label.length * 1.7} />
    <span className={`text-[9px] font-light uppercase tracking-[0.2em] truncate ${
      lit ? 'opacity-95' : 'opacity-75'
    }`}>
      {label}
    </span>
  </button>
);

/**
 * The instrument, on a surface of its own.
 *
 * The five questions were set inside the prose of 3.3 & 3.4, and an instrument
 * inside a reading is in the wrong posture twice over. It asks you to stop
 * reading and start judging your own work in the middle of a column — the
 * fragmentation the manuscript is about — and, being a thing you fill in, it
 * carries state the surrounding page has no use for and cannot show: five
 * answers and what they add up to.
 *
 * So it stands alone, exactly as the figures do. A cell on the page says the
 * instrument belongs there; touching it opens the questions here, with room to
 * answer them and room to be told what the answers came to.
 *
 * A surface, not a book page: bookmarks, highlights and the saved reading
 * position are all stored by index, and a sixth page in Chapter III would move
 * every mark after it.
 */
export const InstrumentStage: React.FC<{
  onClose: () => void;
  /** back to the section that poses the questions */
  onToChapter: () => void;
  /** back to the map that holds every chapter */
  onToMap: () => void;
  /** follow a proposed strategy to the part of the document that argues it */
  onFollow: (ref: QuestionRef) => void;
  /** which instrument this surface is holding */
  instrument: Instrument;
  /**
   * The reader's own polarity, carried onto the instrument.
   *
   * GR-01 says every drawing surface is black in both themes, and this surface
   * holds tissue — so this is a departure, made on instruction: the instruments
   * were asked for in both polarities, black on white as well as white on
   * black. It is scoped to the instruments; the map and the figure worlds still
   * force their own ground, which is where that rule was actually earned.
   */
  isDark?: boolean;
}> = ({ onClose, onToChapter, onToMap, onFollow, instrument, isDark = true }) => {
  const stageRef = useOverlayFocus<HTMLDivElement>(true);

  /* Escape belongs to the topmost surface, and this is one — see dismissStack.
     The listener this replaced called stopPropagation to keep App from also
     leaving for the map, which never worked: both listeners were on window, and
     propagation is about targets. */
  useDismiss(true, onClose);

  /* Portalled to <body> for the same reason the figure world is: the page turn
     is a motion transform, and a transformed ancestor becomes the containing
     block for `position: fixed` inside it, so rendered in place this surface
     would lay out against the sheet instead of the viewport. */
  return createPortal(
    <div
      ref={stageRef}
      role="dialog"
      aria-modal="true"
      aria-label={INSTRUMENT_NAME[instrument]}
      className={`surface fixed inset-0 z-[60] flex flex-col ${
        isDark ? 'theme-dark bg-black text-white' : 'theme-light bg-white text-black'
      }`}
    >
      <div className="flex-shrink-0 pt-3 px-5 sm:px-8 hidden sm:flex justify-end">
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-25" aria-hidden="true">
          Esc returns to the page
        </span>
      </div>
      <div className="flex-shrink-0 pt-3 sm:hidden" aria-hidden="true" />

      {/* A fitted instrument is given the frame and told to fill it; the one
          that is not keeps the scrolling column it needs. */}
      <div className={`flex-1 min-h-0 w-full px-4 sm:px-8 py-2 ${
        FITS_ONE_SCREEN[instrument] ? 'overflow-hidden flex' : 'overflow-y-auto soft-scroll'
      }`}>
        <div className={`mx-auto w-full ${
          /* A fitted instrument is a panel, not a column of prose, so it
             takes the width a panel needs. max-w-2xl is a reading measure and
             the right cap for the scrolling instrument; holding the bento to
             it left a 768px strip in a 1280px frame with the reading squeezed
             beside the choices. */
          FITS_ONE_SCREEN[instrument] ? 'max-w-6xl min-h-0 flex flex-col' : 'max-w-2xl'
        }`}>
          <Suspense
            fallback={
              <div className="flex items-center gap-3 opacity-40 py-12" role="status" aria-live="polite">
                <Soma size={12} phase={3.1} />
                <span className="text-[9px] font-light uppercase tracking-[0.2em]">Instrument settling</span>
              </div>
            }
          >
            {instrument === 'five-questions' ? (
              <FiveQuestionsWidget onFollow={onFollow} />
            ) : instrument === 'content-budget' ? (
              <ContentBudgetWidget onFollow={onFollow} />
            ) : (
              <RestorationDeltaWidget onFollow={onFollow} />
            )}
          </Suspense>
        </div>
      </div>

      <nav className="flex-shrink-0 px-5 sm:px-8 pb-4 pt-2 flex items-center gap-1.5 sm:gap-3"
        aria-label="Passages out of the instrument">
        <Passage onClick={onToChapter} label="The chapter" hint="Return to the argument" />
        <Passage onClick={onToMap} label="The map" hint="Return to the orientation map" />
      </nav>
    </div>,
    document.body
  );
};
