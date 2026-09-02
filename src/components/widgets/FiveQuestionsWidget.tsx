import { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Vein, Soma, SomaLabel } from '../organic/Organic';

/**
 * The five operational questions, verbatim from the dossier, and what the
 * answers come to.
 *
 * The instrument used to end where the fifth question ended: five checkboxes
 * and a running count, which is a tally, not a reading. A tally tells you how
 * far down the list you are; it does not tell you what the list decided. The
 * document is explicit that these are *non-negotiable*, and non-negotiable has
 * an arithmetic: every one of them has to clear, so four out of five is not
 * eighty per cent of a pass — it is a fail with one named cause.
 *
 * So the score is derived from the document's own standard rather than invented
 * as a grade. It reports what cleared, what is outstanding, and — because a
 * number alone would let four read as nearly-five — it names the outstanding
 * questions rather than counting them.
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
  const [checkedState, setCheckedState] = useState<boolean[]>(
    () => QUESTIONS.map(() => false)
  );

  const toggleCheck = (idx: number) =>
    setCheckedState(prev => prev.map((v, i) => (i === idx ? !v : v)));

  const cleared = checkedState.filter(Boolean).length;
  const outstanding = QUESTIONS.filter((_, i) => !checkedState[i]);
  const clears = outstanding.length === 0;
  const started = cleared > 0;

  return (
    <div className="text-current space-y-4 py-2">
      <p className="text-[12px] font-light leading-relaxed opacity-80">
        Evaluate your communication project against these 5 non-negotiable operational questions:
      </p>

      <div className="space-y-3.5">
        {QUESTIONS.map((q, idx) => {
          const on = checkedState[idx];
          return (
            <button
              key={q.num}
              onClick={() => toggleCheck(idx)}
              aria-pressed={on}
              className={`w-full text-left p-2.5 text-[12px] flex items-start gap-2.5 rounded-none ${
                on ? 'membrane-lit' : 'membrane-faint opacity-85'
              }`}
              style={{ transition: 'opacity 0.75s var(--ease-organic)' }}
            >
              <span className="mt-0.5 shrink-0" aria-hidden="true">
                {on ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-50" />}
              </span>
              <span className="space-y-0.5 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70">{q.num}</span>
                  <span className="font-light text-[12px] uppercase">{q.title}</span>
                </span>
                <span className="block leading-relaxed text-[12px] font-light">{q.question}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/*
        The score.

        Five cells on one strand, lit as each question clears — the same reading
        the map uses, and not a bar, because a bar says four fifths and four
        fifths is exactly the thing this standard does not permit.
      */}
      <div className="opacity-45">
        <Vein opacity={0.45} phase={9.9} />
      </div>

      <div className="space-y-2.5 pt-0.5" role="status" aria-live="polite">
        <div className="flex items-center gap-2.5">
          {checkedState.map((on, i) => (
            <Soma key={i} size={on ? 13 : 9} opacity={on ? 1 : 0.28} phase={(i * 3.7) % 19} />
          ))}
          <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-60 pl-1">
            {cleared} of {QUESTIONS.length} cleared
          </span>
        </div>

        <p className="text-[12px] font-light leading-relaxed opacity-85">
          {clears
            ? 'All five clear. The standard is met on every question it asks.'
            : started
              ? `Not cleared. These questions are non-negotiable, so the process does not pass while any remains open — ${outstanding.length} outstanding.`
              : 'Nothing scored yet. Answer each question against the project in front of you, not against the project you intended.'}
        </p>
      </div>

      {/*
        What to do about it.

        Shown only once there is a score to be low: a list of moves before the
        reader has answered anything would be advice nobody asked for. Each
        outstanding question brings the document's own remedy and the places
        that argue it, so a failed question is a route into the chapter rather
        than a verdict to sit with.
      */}
      {started && !clears && (
        <div className="space-y-3.5 pt-1">
          <SomaLabel opacity={0.7} phase={5.3}>What the document proposes</SomaLabel>

          {outstanding.map((q, i) => {
            const r = REMEDIES[q.num];
            if (!r) return null;
            return (
              <div key={q.num} className="membrane-faint p-3 space-y-2 rounded-none">
                <div className="flex items-center gap-2.5">
                  <Soma size={9} opacity={0.55} phase={(i * 4.3) % 19} />
                  <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70">
                    {q.title}
                  </span>
                </div>

                <p className="text-[12px] font-light leading-relaxed opacity-85">{r.strategy}</p>

                <div className="flex flex-wrap gap-x-3 gap-y-2 pt-0.5">
                  {r.refs.map(ref => (
                    <button
                      key={ref.label}
                      onClick={() => onFollow?.(ref)}
                      disabled={!onFollow}
                      className="bud px-2.5 py-1 text-[9px] font-light uppercase tracking-[0.2em] rounded-none flex items-center gap-2 disabled:opacity-40"
                      title={`Go to ${ref.label}`}
                    >
                      <Soma size={7} opacity={0.6} phase={ref.label.length * 1.3} />
                      <span>{ref.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="membrane-faint p-3 text-center rounded-none">
        <p className="text-[12px] italic font-light">
          "The practitioner who internalises these five questions is not choosing ethics over commerce. For once, finally, this is a choice for humanity and the choice for success."
        </p>
      </div>
    </div>
  );
}
