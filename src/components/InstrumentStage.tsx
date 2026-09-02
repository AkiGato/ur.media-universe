import React, { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayFocus } from '../utils/a11y';
import type { QuestionRef } from './widgets/FiveQuestionsWidget';
import { Soma } from './organic/Organic';

const FiveQuestionsWidget = lazy(() =>
  import('./widgets/FiveQuestionsWidget').then((m) => ({ default: m.FiveQuestionsWidget }))
);

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
}> = ({ onClose, onToChapter, onToMap, onFollow }) => {
  const stageRef = useOverlayFocus<HTMLDivElement>(true);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // stop App's own Escape handler from also sending us back to the map
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  /* Portalled to <body> for the same reason the figure world is: the page turn
     is a motion transform, and a transformed ancestor becomes the containing
     block for `position: fixed` inside it, so rendered in place this surface
     would lay out against the sheet instead of the viewport. */
  return createPortal(
    <div
      ref={stageRef}
      role="dialog"
      aria-modal="true"
      aria-label="The five operational questions"
      className={`surface fixed inset-0 z-[60] flex flex-col ${
        'bg-black text-white'
      }`}
    >
      <div className="flex-shrink-0 pt-3 px-5 sm:px-8 hidden sm:flex justify-end">
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-30" aria-hidden="true">
          Esc returns to the page
        </span>
      </div>
      <div className="flex-shrink-0 pt-3 sm:hidden" aria-hidden="true" />

      {/* Unlike a figure, an instrument is taller than the frame once five
          questions are open, so this surface scrolls where a figure world
          never does. */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto soft-scroll px-4 sm:px-8 py-2">
        <div className="max-w-2xl mx-auto">
          <Suspense
            fallback={
              <div className="flex items-center gap-3 opacity-40 py-12" role="status" aria-live="polite">
                <Soma size={12} phase={3.1} />
                <span className="text-[9px] font-light uppercase tracking-[0.2em]">Instrument settling</span>
              </div>
            }
          >
            <FiveQuestionsWidget onFollow={onFollow} />
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
