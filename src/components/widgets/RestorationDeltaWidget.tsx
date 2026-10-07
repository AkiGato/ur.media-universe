import { useState } from 'react';
import { Vein, Soma, SomaLabel } from '../organic/Organic';
import { RESTORATION_DELTA, bandForDelta } from '../../data/instruments';
import { arcSegment } from '../figures/FigurePrimitives';
import type { QuestionRef } from './FiveQuestionsWidget';

/**
 * §5.6 — The Restoration Delta Instrument.
 *
 * The dossier calls this "the one metric a practitioner can run tomorrow, with
 * no platform access and nothing they do not already control", and the app did
 * not have it. Every other instrument here is a model this project built on top
 * of the argument; this one is written out in the manuscript in full — three
 * questions, their anchors, the arithmetic, the thresholds and the consequence
 * of failing them — so none of it is designed here. The strings live in
 * `src/data/instruments.ts` and `audit-definitions` fails the build if any of
 * them stops being the author's.
 *
 * WHAT IT ASKS FOR. A reading before the interaction and a reading after, three
 * answers each on the manuscript's one-to-five. The delta is after minus
 * before, averaged across the three. The bands are the author's: at or above
 * +0.5 restorative, between −0.5 and +0.5 neutral, at or below −0.5 depleting.
 *
 * WHY BOTH COLUMNS ARE ON ONE SCREEN. The instrument is used twice around one
 * event, and its whole claim is comparative — a single 4 means nothing, the
 * pair means everything. Splitting it into two visits would hide the one number
 * that matters behind a mode change, and would invite the second reading to be
 * taken from memory.
 *
 * THE DRAWING IS THE DELTA, NOT THE SCORE. Two stations and the span between
 * them, drawn as tissue under the same grammar as everything else: a bow on
 * every segment (DG-01 — a flat run is the zero-bow filament that rule names),
 * no filled area (DG-02), points for the readings.
 */

const SCALE = [1, 2, 3, 4, 5];

export function RestorationDeltaWidget({
  onFollow
}: {
  onFollow?: (ref: QuestionRef) => void;
} = {}) {
  const { questions, consequence, caveat } = RESTORATION_DELTA;

  const [before, setBefore] = useState<(number | null)[]>(() => questions.map(() => null));
  const [after, setAfter] = useState<(number | null)[]>(() => questions.map(() => null));

  const mean = (xs: (number | null)[]) => {
    const got = xs.filter((n): n is number => n !== null);
    return got.length === questions.length ? got.reduce((a, b) => a + b, 0) / got.length : null;
  };

  const b = mean(before);
  const a = mean(after);
  const delta = b !== null && a !== null ? a - b : null;
  const band = delta !== null ? bandForDelta(delta) : null;

  /* Choosing the value already chosen does NOT clear it.
     The five questions next door toggle, and that is right there — a question
     either clears, fails, or has not been looked at, and un-answering is a real
     thing to want. A point on a scale is not like that. These carry
     `role="radio"`, where one of the set is chosen once any is, and pressing
     the current answer to mean "never mind" is not a gesture anyone makes on a
     scale — it just silently voids the reading and the panel goes back to
     saying a reading is outstanding. Changing an answer means choosing a
     different point. */
  const set = (which: 'before' | 'after', qi: number, v: number) => {
    const apply = (prev: (number | null)[]) => prev.map((x, i) => (i === qi ? v : x));
    if (which === 'before') setBefore(apply);
    else setAfter(apply);
  };

  /* One row of five. Radio semantics, because exactly one of the five is the
     answer — a set of toggles would let a reader record two states at once and
     then average something the instrument never asked. */
  const Scale = ({
    which, qi, value, low, high
  }: { which: 'before' | 'after'; qi: number; value: number | null; low: string; high: string }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label={`${which}: question ${qi + 1}`}>
        {SCALE.map(n => {
          const on = value === n;
          return (
            <button
              key={n}
              role="radio"
              aria-checked={on}
              onClick={() => set(which, qi, n)}
              className={`bud flex-1 min-w-0 py-1 text-[12px] font-light rounded-none flex items-center justify-center gap-1.5 ${
                on ? 'bud-lit' : ''
              }`}
              title={n === 1 ? low : n === 5 ? high : String(n)}
            >
              <Soma size={on ? 9 : 6} opacity={on ? 0.95 : 0.35} phase={(n * 3.3 + qi * 5.1) % 19} />
              <span>{n}</span>
            </button>
          );
        })}
      </div>
      {/* The anchors, in the author's words. Said once per scale — the two ends
          are the whole legend, and repeating them under every row would be the
          same two strings five times over (TY-05). */}
      <div className="flex justify-between text-[9px] font-light uppercase tracking-[0.2em] opacity-45">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );

  return (
    <div className="text-current space-y-3 py-1">
      {/* Read once, before either column, because the instrument is only
          meaningful as a pair and a reader who takes the first reading without
          knowing that will take the second from memory. */}
      <p className="text-[12px] font-light leading-relaxed opacity-70">
        Three questions, asked immediately before the interaction and immediately after, each answered from one to five.
      </p>

      <div className="space-y-2.5">
        {questions.map((q, i) => (
          <div key={i} className="membrane-faint p-2.5 space-y-2 rounded-none">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0" aria-hidden="true">
                <Soma size={9} opacity={0.6} phase={(i * 6.1) % 19} />
              </span>
              <p className="text-[12px] font-light leading-relaxed">{q.text}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
              <div className="space-y-1">
                <SomaLabel opacity={0.7} phase={2.2 + i}>Before</SomaLabel>
                <Scale which="before" qi={i} value={before[i]} low={q.low} high={q.high} />
              </div>
              <div className="space-y-1">
                <SomaLabel opacity={0.7} phase={8.4 + i}>After</SomaLabel>
                <Scale which="after" qi={i} value={after[i]} low={q.low} high={q.high} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="opacity-45"><Vein opacity={0.45} phase={9.9} /></div>

      <div className="space-y-3" role="status" aria-live="polite">
        {delta === null ? (
          <p className="text-[12px] font-light leading-relaxed opacity-70">
            Both readings are needed before there is a delta. {b !== null ? 'The after-reading is outstanding.' : a !== null ? 'The before-reading is outstanding.' : ''}
          </p>
        ) : (
          <>
            <DeltaMark before={b!} after={a!} />
            <div className="flex items-baseline gap-3 flex-wrap">
              {/* A true minus (U+2212), not a hyphen. §5.6 writes its own
                  range as "−4.0 to +4.0" and its worked example as "−1.33";
                  `toFixed` emits a hyphen, which is a shorter, lower dash that
                  sits wrong against the digits beside it at the 18px step. */}
              <span className="text-[18px] font-light">
                {delta > 0 ? '+' : delta < 0 ? '−' : ''}{Math.abs(delta).toFixed(2)}
              </span>
              <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70">{band!.name}</span>
            </div>
            {band!.id === 'depleting' && (
              <p className="text-[12px] font-light leading-relaxed opacity-70">{consequence}</p>
            )}
          </>
        )}
      </div>

      <div className="membrane-faint p-2.5 space-y-1.5 rounded-none">
        <p className="text-[12px] font-light leading-relaxed opacity-70">{caveat}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          <button
            onClick={() => onFollow?.({ kind: 'chapter', id: 'chapter-5', label: '§5.6 — The instrument' })}
            disabled={!onFollow}
            className="bud px-2.5 py-1 text-[9px] font-light uppercase tracking-[0.2em] rounded-none flex items-center gap-2 disabled:opacity-45"
            title="Go to the section that specifies this instrument"
          >
            <Soma size={7} opacity={0.6} phase={4.4} />
            <span>§5.6 — The instrument</span>
          </button>
          <button
            onClick={() => onFollow?.({ kind: 'figure', figure: 'neuro-aesthetic', label: 'The metric' })}
            disabled={!onFollow}
            className="bud px-2.5 py-1 text-[9px] font-light uppercase tracking-[0.2em] rounded-none flex items-center gap-2 disabled:opacity-45"
            title="Go to the figure this metric belongs to"
          >
            <Soma size={7} opacity={0.6} phase={11.2} />
            <span>The metric</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The reading, drawn. Two stations on one span: where the person was, where
 * they were left. The span bows like everything else here — a straight run
 * between two points is the zero-bow filament DG-01 refuses — and nothing is
 * filled except the two station points, which that rule admits as points.
 */
function DeltaMark({ before, after }: { before: number; after: number }) {
  const W = 300, H = 54, PAD = 30;
  /* 1..5 maps onto the span; the after-station sits above the before-station
     when the interaction restored, below when it depleted, so the mark reads
     as a direction before any number is looked at. */
  const y = (v: number) => H - 12 - ((v - 1) / 4) * (H - 26);
  const x1 = PAD, x2 = W - PAD;
  const bow = Math.hypot(x2 - x1, y(after) - y(before)) * 0.05;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" fill="none" stroke="currentColor"
      strokeLinecap="round" role="img"
      aria-label={`Before ${before.toFixed(2)}, after ${after.toFixed(2)}`}>
      <path d={arcSegment(x1, y(before), x2, y(after), bow)} strokeWidth="1.4" opacity="0.9" />
      <circle cx={x1} cy={y(before)} r="2.6" fill="currentColor" stroke="none" opacity="0.55" />
      <circle cx={x2} cy={y(after)} r="4.4" fill="currentColor" stroke="none" opacity="0.12" />
      <circle cx={x2} cy={y(after)} r="2.6" fill="currentColor" stroke="none" opacity="0.95" />
      {/* The two readings, at the one small step. In viewBox units, which TY-02
          exempts, and untracked because they are numerals (TY-03). */}
      <text x={x1} y={y(before) - 7} textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" opacity="0.6">
        {before.toFixed(2)}
      </text>
      <text x={x2} y={y(after) - 9} textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" opacity="0.9">
        {after.toFixed(2)}
      </text>
    </svg>
  );
}
