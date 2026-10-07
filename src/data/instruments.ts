/**
 * The instruments the dossier specifies, in the dossier's own words.
 *
 * Same contract as `definitions.ts` and held by the same audit: every string
 * here is verbatim manuscript text, checked against `bookData.ts` on every
 * `npm run lint`. An instrument is the most tempting surface in the app to
 * write on — a scale needs anchors, a reading needs a verdict — and every one
 * of those is a sentence the author already wrote in §5.6.
 *
 * WHAT IS AUTHORED HERE, AND IT IS ONLY THIS: the order, and the arithmetic
 * the manuscript states in prose being stated again as numbers the code can
 * run. The thresholds are the author's (+0.5 / −0.5); the code does not choose
 * them, it reads them off the paragraph that sets them.
 */

export interface ScaleQuestion {
  /** the question, verbatim */
  text: string;
  /** what 1 means and what 5 means, verbatim from the same sentence */
  low: string;
  high: string;
}

/**
 * §5.6 — The Restoration Delta Instrument.
 *
 * "Three questions, asked immediately before the interaction and immediately
 * after, each answered from one to five; the *delta* is the after-reading
 * minus the before, averaged across the three."
 */
export const RESTORATION_DELTA = {
  sectionId: '5.6',

  questions: [
    {
      text: 'Right now, how easily could you concentrate on something that requires effort?',
      low: 'not at all',
      high: 'easily'
    },
    {
      text: 'Right now, how much does anything feel urgent or demanding of you?',
      low: 'everything',
      high: 'nothing'
    },
    {
      text: 'Right now, could you make a considered decision, or only react?',
      low: 'only react',
      high: 'a considered decision'
    }
  ] as ScaleQuestion[],

  /* "The averaged reading runs from 1.0 to 5.0 and the delta from −4.0 to
     +4.0. At or above +0.5 is restorative; between −0.5 and +0.5, neutral; at
     or below −0.5, depleting." */
  bands: [
    { id: 'restorative', name: 'Restorative', from: 0.5 },
    { id: 'neutral', name: 'Neutral', from: -0.5 },
    { id: 'depleting', name: 'Depleting', from: -Infinity }
  ],

  /* The consequence the manuscript attaches to a depleting reading. Quoted
     rather than paraphrased, because it is the sentence that makes the
     instrument a standard instead of a thermometer. */
  consequence:
    'A depleting score fails the fifth question of the Chapter III standard, whatever the conversion rate.',

  /* Its own statement of what kind of reading this is. Shown once, where a
     reader could otherwise mistake self-report for measurement. */
  caveat:
    "It is self-report: not attention measured, but the person's own account of their state, which is what the standard asks."
} as const;

/** Which band a delta falls in. One implementation, so the words and the
    drawing can never disagree about the same number (TY-05). */
export function bandForDelta(delta: number): { id: string; name: string } {
  return RESTORATION_DELTA.bands.find((b) => delta >= b.from) ?? RESTORATION_DELTA.bands[2];
}
