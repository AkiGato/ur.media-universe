import React from 'react';
import { useOverlayFocus } from '../utils/a11y';
import { useDismiss } from '../utils/dismissStack';
import { BOOK_DATA } from '../data/bookData';
import { Soma } from './organic/Organic';
import { IntroField } from './organic/IntroField';

/**
 * The controls, one to a point.
 *
 * The same words that were in the two middot runs this replaced, split at the
 * separators and nowhere else — a middot was doing the work a line break does
 * better, and dropping it changes no copy (TY-04). The order is the order a
 * reader needs them in: what the map answers to, how to leave it, and then what
 * lies behind it.
 */
const ENTRY_POINTS = [
  'Touch the tissue',
  'Scroll to zoom',
  'Esc returns here',
  'A chapter opens the reader',
  'The index holds definitions, figures and tools'
];

/**
 * The way in — and, since it stands where the loading mark used to hand over,
 * the thing that is on screen while the organism is still being built.
 *
 * THE SPLASH IS NOT REPLACED, IT IS EXTENDED. `index.html` still paints its
 * cell in the same frame as the document, before a byte of JavaScript, because
 * that is the only thing that can — and the alternative was measured once and
 * recorded there: a white flash, then a blank black rectangle. What changed is
 * where it hands over. It used to hand over to the map directly; now it hands
 * over to this, which draws the same cell at the same place, so the handoff is
 * still a thickening rather than a swap. The map finishes building underneath.
 *
 * WHY IT IS A GATE AND NOT A FADE. Asked for as one: an entry screen the reader
 * dismisses. The cost is real and worth naming — a returning reader meets a
 * surface between them and the map every visit, which is the friction the map's
 * own Resume control was shaped to avoid. It is kept survivable rather than
 * argued with: Esc leaves it (LY-04, a mode is never sealed), it holds no
 * animation that has to finish, and nothing behind it is unloading while it is
 * up.
 *
 * THE COPY IS THREE LINES, AND THAT IS A CEILING RATHER THAN A BUDGET TO SPEND.
 * Asked for as "what it is + instructions, three lines maximum". The first line
 * is the dossier's own subtitle, lifted from `bookData` rather than written
 * here, so what the thing IS is said in the author's words (TY-04). The other
 * two name controls that already exist and say nothing a control does not
 * already do. No fourth line, no strapline under the title, no sentence
 * introducing the way in — the button says where it goes.
 */
export const IntroScreen: React.FC<{
  onEnter: () => void;
}> = ({ onEnter }) => {
  const ref = useOverlayFocus<HTMLDivElement>(true);

  /* Esc leaves, exactly as it leaves every other surface in the app. This is
     the whole of LY-04's requirement here: the gate has a second way out that
     is not the one control drawn on it. */
  useDismiss(true, onEnter);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={BOOK_DATA.title}
      /* Black in both themes. GR-01 — this surface holds tissue, and a cell
         drawn on white is ink rather than light. The stages force their own
         ground for the same reason and in the same words. */
      className="surface fixed inset-0 z-[70] bg-black text-white flex flex-col items-center justify-center px-6"
    >
      {/*
        The field, on the splash's own centre.

        It opens holding the splash's cell — the same path data, pinned to the
        same 132px whatever this box grows to — so the handover from the mark
        `index.html` paints before any JavaScript is still a thickening rather
        than a swap. Then it reassembles: a pappus, a shell, a wave field, a
        ring, and back to the cell. `IntroField` carries the whole argument for
        why that is a canvas, why it loops where the map's formation does not,
        and what it does for a reader who asked for less motion.

        The BOX is larger than the cell because the other forms need the room;
        the cell does not use it. It is bound to the height of the viewport
        rather than its width, the way the chapter opener's figure is and for
        the same reason — it is the short axis that runs out, and a shallow
        window is in exactly the position a phone on its side is.

        aria-hidden because it says nothing the heading beneath it does not: a
        drawing that duplicates a name is the repetition TY-05 is about, and the
        accessible name is already on the dialog.
      */}
      <IntroField className="intro-field" />

      {/* The work's name, in the author's own words, at the one large step. */}
      <h1 className="mt-6 text-[18px] font-light text-center">{BOOK_DATA.title}</h1>

      {/*
        WHAT IT IS, BOUND TO THE NAME; HOW IT IS WORKED, SET APART.

        These were one stack on an even rhythm, so the title, the subtitle and
        two lines of instruction read as four things of equal standing. They are
        not: the first two are one statement — a work and what it is — and the
        rest is a guide to the controls.

        The rule says so, and it sits BETWEEN the title and the subtitle rather
        than under both, which is what binds them: a rule through a pair reads
        as one block divided, where a rule under a pair reads as two blocks. The
        subtitle comes up tight to it and the guide drops away, so the gap does
        the ranking that the type sizes alone could not.

        IT IS STRAIGHT, AND THAT IS A DEPARTURE — asked for directly, and worth
        naming rather than burying. GR-08 says dividers are `<Vein />`, "a
        curved filament that fades to nothing at both ends, never a rule", and
        DG-01 forbids a straight segment anywhere in the drawing. This is now a
        rule: one device pixel, dead straight, fading out at both ends.

        What keeps it defensible is that it is not tissue. DG-01 governs "the
        root/neural/light system", and this mark makes no claim to be a fibre —
        it is typographic furniture between two lines of type, in the register
        where the app already permits hairline borders (LY-06). It is also not
        SVG: a background gradient on a one-pixel box, so no path in this file
        asserts a straight fibre, and `audit-lines` keeps its teeth for the
        drawing, which is what it is for. The fade at both ends is the one thing
        kept from the Vein — a rule that ends in two hard stops would be the
        boundary GR-01 refuses.

        If GR-08 should change to admit this, that is a rules edit and belongs
        in docs/design, not in a component comment. Flagged, not assumed.
      */}
      <div
        className="mt-2.5 w-full max-w-[13rem] h-px opacity-80"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to right, transparent 0%, currentColor 22%, currentColor 78%, transparent 100%)'
        }}
      />
      <p className="mt-2.5 max-w-md text-center text-[12px] font-light leading-relaxed opacity-70">
        {BOOK_DATA.subtitle}
      </p>

      {/*
        THE GUIDE, ONE POINT TO A LINE.

        It was two runs of points separated by middots, which puts five separate
        instructions into two paragraphs and makes the reader parse punctuation
        to find where one ends and the next begins. Each stands on its own line
        now, in the order they are needed, and the middots are gone because the
        line break is the separator. No word has changed.

        On a shallow frame they flow into rows instead — see `.entry-points`.
        Five lines of 9px type is 92px against the 34px this replaced, and at
        844×390 there were 33px of slack in the whole screen (LY-02: the
        viewport never scrolls, so it has to fit).
      */}
      <div className="entry-points mt-7 max-w-md text-[9px] font-light uppercase tracking-[0.2em] opacity-45">
        {ENTRY_POINTS.map(point => (
          <span key={point}>{point}</span>
        ))}
      </div>

      {/* The way in. It names the act and stops — no sentence beneath it
          explaining what it will do, which is the thing TY-04 names outright. */}
      <button
        onClick={onEnter}
        autoFocus
        className="bud bud-lit mt-8 px-4 py-2.5 rounded-none outline-none flex items-center gap-2.5 text-[12px] font-light uppercase tracking-[0.2em]"
        title="Open the orientation map"
      >
        <Soma size={10} phase={4.2} />
        <span>Enter</span>
      </button>
    </div>
  );
};
