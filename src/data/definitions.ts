/**
 * The definitions the dossier gives for its own terms.
 *
 * EVERY QUOTE HERE IS VERBATIM MANUSCRIPT TEXT. Nothing in this file is
 * written — not a gloss, not a paraphrase, not a connecting clause. Each
 * `quote` is an exact substring of a paragraph in `bookData.ts`, and
 * `scripts/audits/static/audit-definitions.mjs` fails the build if it ever
 * stops being one. That audit is the point of the file: a glossary is the
 * easiest surface in an app to start writing on, and TY-04 is the rule it would
 * break first. The check makes the rule mechanical rather than remembered.
 *
 * WHAT IS AUTHORED HERE, AND IT IS ONLY THIS: which passages count as
 * definitions, and what to file each one under. Selection is not invention —
 * but it is a judgement, so the term is always a word the manuscript itself
 * uses in the section the quote comes from, and the audit checks that too.
 *
 * A definition is not a summary of the section. Where the dossier defines a
 * term in one sentence, that sentence is the entry; where it takes a paragraph
 * to draw a distinction, the paragraph is the entry. Nothing is trimmed to fit.
 */

export interface Definition {
  /** the term, as the manuscript spells it in the section cited */
  term: string;
  /** verbatim manuscript text — never edited, never paraphrased */
  quote: string;
  /** the section it is lifted from; resolves to a sheet at read time */
  sectionId: string;
}

export const DEFINITIONS: Definition[] = [
  {
    term: 'Neuro-Capitalism',
    sectionId: '1.5',
    quote:
      'This is the systematic exploitation of human neurological vulnerabilities — the need for self-expression, for safety, for belonging — for commercial extraction. It treats consciousness as a resource to be mined, not a condition to be respected.'
  },
  {
    term: 'Engagement Extraction Engine',
    sectionId: '1.3',
    quote:
      'The "Feed" is a misnomer. It implies nourishment — something that sustains you. In reality, it is an Engagement Extraction Engine that operates on a single biological filter: Nervous System Activation.'
  },
  {
    term: 'Reflective will and impulsive will',
    sectionId: '1.3',
    quote:
      'Williams names the precise mechanism at work: the architecture is not optimised for what you would choose if you stopped and thought — your reflective will — but for what you cannot help but react to: your impulsive will. The two are not the same thing. The system has learned to treat them as identical.'
  },
  {
    term: 'Synthetic distrust',
    sectionId: '2.1',
    quote:
      'Institutional distrust is a judgement about sources. Synthetic distrust is a judgement about the medium itself, and it cannot be repaired by a more credible source, because the doubt attaches before the source is identified.'
  },
  {
    term: 'Attention is Finite',
    sectionId: '2.3',
    quote:
      'Simon established in 1971 that in an information-rich world, the scarce resource is not content but the human attention required to receive it. Every additional feed, every additional notification, every additional platform competes for the same fixed cognitive bandwidth.'
  },
  {
    term: 'Robustness',
    sectionId: '3.1',
    quote:
      'Robustness is the refusal to be broken by volatility — achieved not through rigidity, but through an accurate reading of shifting conditions.'
  },
  {
    term: 'Directed attention',
    sectionId: '3.2',
    quote:
      'Directed attention, the focused, effortful cognitive mode required for complex decision-making, critical thinking, and meaningful choice, is a finite resource. It depletes with use.'
  },
  {
    term: 'Soft fascination',
    sectionId: '3.2',
    quote:
      'Soft fascination is the opposite condition. It is the effortless, involuntary engagement with stimuli that hold interest without demanding cognitive effort. Kaplan and Kaplan identified its neurological requirements: environments that signal, immediately and without demand, that nothing urgent is required of you here.'
  },
  {
    term: 'Robust and antifragile',
    sectionId: '5.3',
    quote:
      'Most of what this dossier prescribes is *robust* rather than *antifragile*: transparency, causal disclosure, restorative design, owned distribution. These resist breakage under volatility; they do not gain from it. Robustness is the floor, and on its own it is enough to outlast the extractive model. The antifragile claim is narrower and rests on one mechanism: a relationship built on disclosed, verifiable practice is strengthened by exactly the events that damage extractive competitors.'
  },
  {
    term: 'Restoration Delta',
    sectionId: '5.5',
    quote:
      '3. Restoration Delta: Self-reported cognitive state before and after interaction. Did this communication deplete directed attention or replenish it? The only metric in this framework that directly measures the soft fascination standard in real-world deployment. Operationalised through brief pre/post attentional load assessment.'
  },
  {
    term: 'Meaning Alignment Score',
    sectionId: '5.5',
    quote:
      '5. Meaning Alignment Score: Measure of whether the communication reinforced or undermined coherence between values and choices. The metric the meaning-seeking posture requires and the one no extractive model currently has the architecture or incentive to collect. Operationalised through post-interaction identity consistency prompts.'
  }
];
