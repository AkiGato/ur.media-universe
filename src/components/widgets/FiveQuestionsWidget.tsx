import { useState, useRef, useEffect } from 'react';
import { Soma } from '../organic/Organic';
import { AntifragilityGraph, bandFor, type Answer } from './AntifragilityGraph';

/**
 * The five operational questions, verbatim from the dossier, as ONE PANEL YOU
 * MOVE THROUGH rather than a column you scroll.
 *
 * WHY IT IS A PANEL NOW. Five open cards plus five remedies plus a reading was
 * a page and a half of instrument, and the reading — the thing the instrument
 * exists to produce — sat at the bottom where you could not see it while you
 * were answering. Asked for as a condensed panel you swipe through, with the
 * antifragility reading appearing as you go, and that turns out to be what the
 * standard wants anyway: these are five separate judgements about one project,
 * and showing four of them while somebody makes the fifth is noise.
 *
 * So: one question at a time, the trajectory permanently on screen underneath
 * it, and the whole thing sized to the frame. Nothing scrolls.
 *
 * HOW YOU MOVE. Swipe, the two chevrons, the arrow keys, or the row of
 * stations — four ways in, because a panel whose only affordance is a gesture
 * is a panel half the readers never turn. Answering advances on its own, so the
 * common path is five presses and nothing else, and the last question stays put
 * so the panel ends on the reading rather than running off the end.
 *
 * THE REMEDY IS SHOWN IN PLACE. Each outstanding question used to list its own
 * strategy at the bottom, five at once. It now appears under the question it
 * belongs to, only once that question has been answered against the project —
 * which is the only moment it is advice rather than a lecture.
 */

/**
 * Where a question is answered in the document, and what to do about it.
 *
 * A score that only reports a failure leaves the reader exactly where they
 * were, holding a verdict and no move. Every one of these questions is argued
 * somewhere in the dossier, at length, with a mechanism attached — so an
 * outstanding question is not a scold, it is a pointer into the chapter that
 * already answered it.
 *
 * Nothing here is invented doctrine. Each strategy is the document's own
 * remedy for that question, and each reference resolves at follow time from
 * the chapter, rule or figure it names — never from a stored page number,
 * which the book renumbers underneath.
 */
export type QuestionRef =
  | { kind: 'chapter'; id: string; label: string }
  | { kind: 'rule'; id: string; label: string }
  | { kind: 'figure'; figure: string; label: string };

const REMEDIES: Record<string, { strategy: string; refs: QuestionRef[] }> = {
  ONE: {
    strategy:
      'Read the state rather than the profile. The dossier replaces psychographics with three cognitive postures — restoration-seeking, agency-seeking, meaning-seeking — and asks which one the person is in when the message lands, before anything is written.',
    refs: [
      { kind: 'chapter', id: 'chapter-3', label: 'Ch III — The Robust Practitioner' },
      { kind: 'figure', figure: 'media-universe', label: 'The postures' }
    ]
  },
  TWO: {
    strategy:
      'Name the mechanism you are about to use and check it against the prohibited list — manufactured urgency, manufactured scarcity, weaponised social proof, comparison-based shaming. Where one appears, the Global Rule requires redesigning the approach rather than softening the language.',
    refs: [
      { kind: 'chapter', id: 'chapter-1', label: 'Ch I — The Weapons' },
      { kind: 'rule', id: 'global-rule', label: 'The Global Rule' }
    ]
  },
  THREE: {
    strategy:
      'Run the core test: would this still work if the recipient could see exactly how and why it was built to affect them? Scarcity, urgency and social proof survive it only in their disclosed, verifiable form — if the mechanism could not be named to the person experiencing it, it is coercion.',
    refs: [
      { kind: 'rule', id: 'global-rule', label: 'The Global Rule' },
      { kind: 'chapter', id: 'chapter-2', label: 'Ch II — The Trust Collapse' }
    ]
  },
  FOUR: {
    strategy:
      'Deconstruct your own piece the way the taxonomy deconstructs a headline — its economic, historical and neuro-psychological roots — and ask whether you would show the reader what you find. The mechanism you would not disclose is the one that fails this question.',
    refs: [
      { kind: 'chapter', id: 'chapter-4', label: 'Ch IV — The Causal Taxonomy' },
      { kind: 'figure', figure: 'causal-taxonomy', label: 'Surface to roots' }
    ]
  },
  FIVE: {
    strategy:
      'Measure what the interaction left behind instead of what it extracted. The Restoration Delta asks whether the person’s cognitive state was equal to or better than it was found — the anti-engagement metrics are built to answer exactly this question.',
    refs: [
      { kind: 'chapter', id: 'chapter-5', label: 'Ch V — The Antifragile Aesthetic' },
      { kind: 'figure', figure: 'neuro-aesthetic', label: 'The metric' }
    ]
  }
};

const QUESTIONS = [
  {
    num: 'ONE',
    title: 'Neurological Condition at Reception',
    question: 'What state is this person actually in when my message arrives? Not their demographic. Not their purchase history. Their probable neurological condition at the moment of reception.'
  },
  {
    num: 'TWO',
    title: 'Appropriateness vs. Exploitation',
    question: 'Is what I am about to deliver appropriate for that state, or designed to exploit it? There is a difference between meeting a person where they are and ambushing them there.'
  },
  {
    num: 'THREE',
    title: 'The Transparency Test',
    question: 'Would these mechanics still work if the person could see them clearly? Scarcity can reflect reality or manufacture panic. Social proof can inform or coerce. The test is whether the person, fully informed, would still respond — or would feel manipulated.'
  },
  {
    num: 'FOUR',
    title: 'Mechanism Comfort Standard',
    question: 'Would I be comfortable if this person could see exactly what I am doing and why? Not the polished campaign rationale. The actual mechanism, the pre-suasive sequence, the emotional trigger.'
  },
  {
    num: 'FIVE',
    title: 'The Golden Rule of Agency',
    question: 'How would you feel, as a member of society, as a human being — being treated the way you treat the other?'
  }
];

export function FiveQuestionsWidget({
  onFollow
}: {
  /** follow a reference out of the instrument to where the document argues it */
  onFollow?: (ref: QuestionRef) => void;
} = {}) {
  /*
   * THREE STATES, NOT TWO.
   *
   * A checkbox could only ever climb. Unticked meant both "this fails" and "I
   * have not reached it yet", so the instrument could not tell a project that
   * had been examined and found wanting from one that had not been examined —
   * and a reading that cannot fall is not a reading, it is a progress bar.
   */
  const [answers, setAnswers] = useState<Answer[]>(() => QUESTIONS.map(() => 0 as Answer));
  const [idx, setIdx] = useState(0);
  /* Which station the last answer moved. The graph pulses it once, which is the
     only thing on the surface that says the press on the left and the movement
     on the right were one event. Cleared after the pulse so it never re-fires
     on an unrelated re-render. */
  const [changedAt, setChangedAt] = useState<number | null>(null);

  const go = (n: number) => setIdx(() => Math.min(QUESTIONS.length - 1, Math.max(0, n)));

  /* Answering moves on, so the common path is five presses. Pressing the state
     a question is already in clears it and stays put — that is a correction,
     not progress, and advancing on it would carry the reader away from the
     thing they just changed their mind about.

     THE ADVANCE IS DECIDED HERE, NOT INSIDE THE UPDATER. The first version
     scheduled it from within `setAnswers`, which is a side effect inside a
     reducer: React may call an updater twice to check it is pure, and under
     StrictMode it does — so the advance either fired twice or, as measured
     here, never landed at all and the panel sat on question one however many
     times it was answered. The updater now only computes state. */
  const answer = (value: Answer) => {
    const clearing = answers[idx] === value;
    setAnswers(prev => prev.map((v, i) => (i === idx ? (clearing ? 0 : value) : v)));
    setChangedAt(idx);
    if (!clearing && idx < QUESTIONS.length - 1) setIdx(idx + 1);
  };

  /* The pulse is a one-shot, so the flag has to be dropped or the next render
     restarts it. 1.2s is the animation's own length. */
  useEffect(() => {
    if (changedAt === null) return;
    const t = window.setTimeout(() => setChangedAt(null), 1200);
    return () => window.clearTimeout(t);
  }, [changedAt]);

  const cleared = answers.filter(a => a === 1).length;
  const failed = answers.filter(a => a === -1).length;
  const outstanding = QUESTIONS.filter((_, i) => answers[i] !== 1);
  const clears = outstanding.length === 0;
  const started = cleared + failed > 0;
  /* Read off the same walk the drawing is built from, so the words and the line
     can never disagree about one number (TY-05's argument in code). */
  const band = bandFor(answers, QUESTIONS.length);

  /* ── moving through: keys, and a swipe that ignores a vertical drag ────── */
  const panelRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx]);

  const onPointerDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    /* Vertical intent wins ties and everything else — the same guard LY-03
       puts on the page turn, for the same reason: a diagonal drag must not be
       read as a sideways one. */
    if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy)) return;
    go(idx + (dx < 0 ? 1 : -1));
  };

  const q = QUESTIONS[idx];
  const a = answers[idx];
  const remedy = REMEDIES[q.num];

  /**
   * An arrow, and it took three strokes to become one.
   *
   * It was a single bowed stroke — one curve, read as a stray mark rather than
   * as a direction, which is what it was called out as. An arrow needs a shaft
   * and a head, so it is three: the shaft, and the two strokes of the head.
   *
   * Every one of them bows (DG-01), and the bow is checked rather than
   * assumed, because `audit-lines` reads line elements and `L`-only paths in
   * source and a collinear `Q` is neither — OPEN.md entry 14 records that gap.
   * (Spelling that element's tag out here in prose is itself enough to fail
   * the audit, which is worth knowing before writing about it.) Against
   * each chord: shaft 6.7%, upper head 7%, lower head 5.3%, all in DG-04's
   * range of about 5% with one dominant low frequency. FW-02's ban on
   * arrowheads is scoped to figures; this is interface chrome, and the
   * instrument needs a control a reader can recognise.
   */
  const Chevron = ({ dir }: { dir: -1 | 1 }) => {
    const dead = dir < 0 ? idx === 0 : idx === QUESTIONS.length - 1;
    const arrow = dir < 0
      ? ['M 10.4 6.25 Q 6.5 5.6 2.5 6', 'M 2.5 6 Q 4.25 4 6.1 2.6', 'M 2.5 6 Q 4.4 8.05 6.1 9.4']
      : ['M 1.6 6.25 Q 5.5 5.6 9.5 6', 'M 9.5 6 Q 7.75 4 5.9 2.6', 'M 9.5 6 Q 7.6 8.05 5.9 9.4'];
    return (
      <button
        onClick={() => go(idx + dir)}
        disabled={dead}
        aria-label={dir < 0 ? 'Previous question' : 'Next question'}
        title={dir < 0 ? 'Previous question' : 'Next question'}
        /* `bud` already carries every state this needs: 0.68 at rest, full
           under touch, and 0.22 when disabled. An `opacity-70` used to sit
           here as well and multiplied against the first of those, taking the
           mark to ~0.48 — which is where an arrow stops reading as one — and a
           `dead` class here would be a second opinion about the third. */
        className="bud px-2.5 py-2 rounded-none outline-none"
      >
        <svg viewBox="0 0 12 12" width="15" height="15" fill="none" stroke="currentColor"
          strokeWidth="1.15" strokeLinecap="round" aria-hidden="true">
          {arrow.map(d => <path key={d} d={d} />)}
        </svg>
      </button>
    );
  };

  /* WHAT THE READING MEANS, not just what it is.
     The panel reported "3 outstanding" and left the reader to work out why that
     mattered, which is the instrument doing half its job — the standard's whole
     point is that outstanding is not nearly-passed. Each band says what it is
     and what it would take to leave it. */
  const verdict = clears
    ? {
        head: 'Antifragile',
        body: 'Every question clears. This is the only state the dossier is willing to call antifragile — §5.3 reserves the word for practice that is made more valuable by the harm others do, and reaching it here means nothing in the project is trading on a mechanism it could not disclose.'
      }
    : band === 'Robust'
      ? {
          head: 'Robust',
          body: `Enough clears to resist breakage, and ${outstanding.length} still open. §5.3 is exact that this is the floor rather than the goal: robust practice does not gain from disorder, it survives it. The band above opens only when every question clears.`
        }
      : {
          head: 'Fragile',
          body: started
            ? `${failed} answered against the project. These five are non-negotiable, so a project does not pass by clearing most of them — one open question is one named mechanism the reader could not be shown.`
            : 'Nothing answered yet. The walk starts on Fragile because that is where the dossier says the extractive default already sits — this is the state you begin in, not a score you have earned.'
        };

  return (
    <div className="text-current flex flex-col min-h-0 h-full gap-3 py-1">

      {/* ── head: where you are, and — on a small frame only — the two ways
          through.

          THE ARROWS ARE IN TWO PLACES AND THAT IS THE POINT. At lg: they live
          in the corner of the question's own card, beside the thing they move.
          Below lg the card can be taller than the panel's scroller, and then a
          corner is the one place a control must not be: measured at 716×338,
          the card's bottom sat 41px past the fold, so the primary way forward
          was only reachable by scrolling to it. Up here it is outside the
          scroller and always in view.

          Only ever one pair per frame. `display: none` is what does the
          hiding, so the other pair is out of the accessibility tree as well as
          out of sight — two buttons both labelled "Next question" would be a
          name said twice (TY-05) to anyone reading the page rather than
          looking at it. */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3">
        {/* A COUNT IS NUMERALS, AND IT IS NOT TRACKED.
            It read "ONE of 5" — a word and a numeral in one phrase, counting the
            same kind of thing two different ways. `q.num` still exists because
            it keys the remedies; it is simply not the thing a counter should
            print. And with the word gone the tracking has to go with it: TY-03
            tracks UPPERCASE and nothing else, and says numerals are never
            tracked at all, because letter-spacing on digits opens gaps inside a
            figure that the eye reads as separate numbers. */}
        <span className="text-[9px] font-light opacity-45 tabular-nums">
          {idx + 1}/{QUESTIONS.length}
        </span>
        <div className="flex lg:hidden items-center gap-1.5">
          <Chevron dir={-1} />
          <Chevron dir={1} />
        </div>
      </div>

      {/* ── the bento: what is being asked, and where it has got to ──────
          Two cards side by side once there is width for them, stacked below
          that, and the stack scrolls inside its own column rather than being
          crushed — the same shape and the same reasoning as the content
          instrument next door, so the two read as one family. `min-content`
          rows rather than `auto`: an `auto` track is flexible under space
          pressure, so in a definite-height container the rows shrink and the
          cards paint over each other instead of the scroller engaging.

          THE ROW IS CONTENT-SIZED AT lg TOO, AND THE PAIR IS CENTRED RATHER
          THAN STRETCHED. A `1fr` row hands the cards the whole column whatever
          they hold, and the cards then hand the slack to whatever is at their
          bottom edge: measured at 1440x900 on question 1, the question card
          stood 798.5px tall around 218px of content and the reading card
          798.5px around 335px — 581px and 464px of black inside two lit boxes,
          which is a hole rather than a margin. The row is now the taller
          card's own height (336.5px) and `align-content` centres it, so the
          frame's spare height is 231px of ground above the pair and 231px
          below it. The 6px of phantom scroll range this panel reported at lg
          went with the flexible track (772/778 -> 772/772).

          `safe` is the half of that which only shows on a short frame. A plain
          `center` overflows past BOTH edges and the top of the first card can
          never be scrolled back to; `safe` falls back to the start edge the
          moment the content exceeds the box. Measured at 1024x400: 40px of
          overflow, first card flush to the top of the scroller, all of it
          reachable — LY-02 intact. */}
      <div className="grid grid-rows-[repeat(2,min-content)] lg:grid-cols-[1.15fr_1fr] lg:grid-rows-[min-content] lg:[align-content:safe_center] gap-2.5 min-h-0 flex-1 overflow-y-auto soft-scroll">

      {/* ── the question ─────────────────────────────────────────────────
          Its contents sit at the top at their own size; the card takes the
          row, which is the taller of the two cards' own height rather than the
          whole column. Stretching the contents instead is what put a three-line
          question in the middle of a half-height box, and centring it only
          moved the void. What is left under them is the difference between
          this card and its neighbour (132.7px with question 1 answered), which
          the chevrons take — a margin inside a card that matches its sibling,
          not the 581px hole the stretched column left. */}
      <div
        ref={panelRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className={`membrane-faint border p-4 rounded-none flex flex-col gap-3 min-h-0 ${
          a === 1 ? 'membrane-lit' : ''
        }`}
        style={{ transition: 'opacity 0.75s var(--ease-organic)', touchAction: 'pan-y' }}
      >
        <div key={q.num} className="settle flex flex-col gap-2.5">
          {/* THE ONE LARGE THING ON THIS SURFACE, in the title face.
              The panel ran entirely at 9 and 12 — no 18 anywhere — so nothing
              told the eye where to land and the question, which is the subject,
              read as a caption. TY-02's largest step is for the largest thing
              on a sheet; here that is what is being asked. */}
          <div className="flex items-baseline gap-2.5">
            <span className="shrink-0 translate-y-[-1px]" aria-hidden="true">
              <Soma size={a === 0 ? 9 : 12} opacity={a === 0 ? 0.3 : 0.95} phase={(idx * 3.7) % 19} />
            </span>
            <h2 className="title-face text-[18px] font-light leading-tight">{q.title}</h2>
          </div>

          <p className="text-[12px] font-light leading-relaxed opacity-70">{q.question}</p>

          {/* THE TWO STATES, GIVEN THE WEIGHT OF A DECISION.
              They were 9px chips and read as footnotes to the question rather
              than as the thing the panel is asking you to do — the one action
              on this card, dressed as its smallest element. They take the body
              step now, a hairline of their own so each is visibly a control,
              and a mark that grows when chosen. Emphasis by size, spacing and
              light, which is TY-01's list; not by weight, and not by a
              black↔white flip, which LY-06 refuses. */}
          <div className="flex gap-2.5 pt-1.5">
            {([[1, 'Clears'], [-1, 'Fails']] as Array<[Answer, string]>).map(([v, label]) => (
              <button
                key={label}
                onClick={() => answer(v)}
                aria-pressed={a === v}
                className={`bud border px-4 py-2.5 text-[12px] font-light uppercase tracking-[0.2em] rounded-none flex items-center gap-2.5 ${
                  a === v ? 'bud-lit' : ''
                }`}
                title={`${q.title}: ${label}`}
              >
                <Soma size={a === v ? 12 : 9} opacity={a === v ? 0.95 : 0.4} phase={label.length * 2.3} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* What the document proposes — here, for this question, once it has
              been answered against the project. */}
          {a === -1 && remedy && (
            <div className="settle flex flex-col gap-2 pt-1">
              <p className="text-[12px] font-light leading-relaxed opacity-70">{remedy.strategy}</p>
              <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                {remedy.refs.map(ref => (
                  <button
                    key={ref.label}
                    onClick={() => onFollow?.(ref)}
                    disabled={!onFollow}
                    className="bud px-2 py-1 text-[9px] font-light uppercase tracking-[0.2em] rounded-none flex items-center gap-2 disabled:opacity-45"
                    title={`Go to ${ref.label}`}
                  >
                    <Soma size={7} opacity={0.6} phase={ref.label.length * 1.3} />
                    <span>{ref.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* The same two ways through, in the corner of the card they move —
            the lg: half of the pair in the header above. `mt-auto` puts them
            at the card's bottom, which only means a corner because at this
            width the card takes a tall column; it is scoped for the same
            reason the pair is, since on a frame where the card already
            exceeds its box an auto margin has no free space to take and the
            row draws across the card's own bottom border (measured at
            716×338: 243px of content in a 236px card).

            The stations on the trajectory, the swipe and the arrow keys are
            the other three ways through, at every width. */}
        <div className="hidden lg:flex lg:mt-auto flex-shrink-0 items-center justify-end gap-1.5 pt-2">
          <Chevron dir={-1} />
          <Chevron dir={1} />
        </div>
      </div>

      {/* ── the reading ─────────────────────────────────────────────────
          Its own card beside the question, carrying the trajectory and the
          verdict. The trajectory carries the stations, which are the position
          AND the way back to any question — the separate row of dots under it
          was the same five facts drawn twice (TY-05).

          The drawing sits against the top of the card and the verdict against
          the bottom, so the card fills its row without either being
          stretched: a graph scaled to fill 500px of height is a graph whose
          three bands stop reading as bands. */}
      <div className="membrane-faint border rounded-none p-4 flex flex-col justify-between gap-4 min-h-0"
        role="status" aria-live="polite">
        <div className="w-full">
          <AntifragilityGraph
            answers={answers}
            count={QUESTIONS.length}
            current={idx}
            changedAt={changedAt}
            onPick={go}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="title-face text-[18px] font-light leading-none">{verdict.head}</span>
          <p className="text-[12px] font-light leading-relaxed opacity-70">
            {verdict.body}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
