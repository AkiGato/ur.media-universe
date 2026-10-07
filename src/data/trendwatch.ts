/**
 * The trendwatch addendum — what the instruments have recorded since.
 *
 * THIS IS NOT THE MANUSCRIPT. Everything in `bookData.ts` is the author's; this
 * file is an addendum that was asked for, and it is held apart for exactly that
 * reason. A reader who wants to know which sentences are U.R.'s can answer the
 * question by asking which file a page came from, and the copy audit treats the
 * two corpora as two corpora (scripts/audits/static/audit-copy.mjs).
 *
 * The discipline TY-04 imposes on interface copy is imposed here on evidence
 * instead: **no number appears without the instrument that produced it and the
 * year it refers to**, and where the chain to the primary source runs through a
 * secondary report, `chain: 'secondary'` says so rather than letting the
 * citation imply a directness it does not have.
 *
 * Three sections, matching the three chapters the addendum was asked to close:
 *
 *   ATTENTION      Ch. I   — what the harvest has actually taken, measured
 *   WITHDRAWAL     Ch. III — the state of the person the chapter describes
 *   TRAJECTORIES   Ch. V   — the two paths, one measured and one modelled
 *
 * The third is the one to read carefully. The extractive arm is extrapolation
 * from recorded series; the antifragile arm is a MODEL, because no population
 * has adopted the framework and there is nothing to measure. Chapter IV is the
 * reason that distinction is drawn this loudly: a figure that quietly presented
 * a projection as a reading would be the thing the dossier exists to argue
 * against. `SCENARIO.assumptions` is therefore part of the figure rather than a
 * note under it, and the comparison carries a face with no numbers on it at all
 * so the claim survives every quantity being disbelieved.
 */

/** How directly this datum reaches the instrument that produced it. */
export type Chain = 'primary' | 'secondary';

export interface Datum {
  id: string;
  /** the year the reading refers to — not the year it was published */
  year: number;
  /** the reading itself, in `unit` */
  value: number;
  unit: string;
  /** what it says, in one line */
  statement: string;
  /** the instrument */
  source: string;
  url?: string;
  chain: Chain;
}

export interface Series {
  id: string;
  /** two words, for a cell (TY-08) */
  short: string;
  title: string;
  unit: string;
  /** what the series is a reading of */
  reading: string;
  /** what it is NOT a reading of — every series here has one */
  caveat: string;
  points: Datum[];
}

/* ------------------------------------------------------------- CHAPTER I --
 *
 * §1.1 argues that System 1 is harvested; §1.4 that the cost is physiological.
 * Neither states an interval, and the interval is the thing that has been
 * measured continuously for twenty years.
 *
 * Mark's series is the one quantity in this file with a genuine longitudinal
 * instrument behind it, and its caveat is the most important sentence in the
 * section: it records how long the architecture PERMITS, not how long a person
 * is able to attend. Read the other way round it becomes a claim about brains
 * that the research does not make.
 */
export const ATTENTION: Series = {
  id: 'attention-interval',
  short: 'THE INTERVAL',
  title: 'Time on one screen before switching',
  unit: 'seconds',
  reading:
    'How long a worker stays with one screen or information resource before switching to another',
  caveat:
    'This measures behaviour inside an environment, not a limit inside a person. It is how long the architecture permits, not how long anyone is able to attend.',
  points: [
    {
      id: 'attn-2004', year: 2004, value: 150, unit: 'seconds',
      statement: 'Roughly two and a half minutes on one screen before switching.',
      source: 'Mark, G. — UC Irvine fieldwork conducted 2003–04; Attention Span (2023)',
      url: 'https://gloriamark.com/attention-span/',
      chain: 'secondary'
    },
    {
      id: 'attn-2012', year: 2012, value: 75, unit: 'seconds',
      statement: 'Seventy-five seconds — half the 2004 interval in eight years.',
      source: 'Mark, G. — UC Irvine',
      url: 'https://gloriamark.com/attention-span/',
      chain: 'secondary'
    },
    {
      id: 'attn-2021', year: 2021, value: 47, unit: 'seconds',
      statement:
        'Forty-seven seconds, median forty; corroborated across five independent studies between 2014 and 2020.',
      source: 'Mark, G. — UC Irvine; studies from 2016 onward',
      url: 'https://www.universityofcalifornia.edu/news/cant-pay-attention-youre-not-alone',
      chain: 'secondary'
    }
  ]
};

/**
 * The scale the interval is being spent at. Not a series — four readings from
 * one instrument in one year, which is what DataReportal publishes.
 */
export const EXPOSURE: Datum[] = [
  {
    id: 'exp-users', year: 2026, value: 5.66, unit: 'billion people',
    statement: 'Social media users worldwide — more than 68% of the world population.',
    source: 'DataReportal, Digital 2026 Global Overview Report',
    url: 'https://datareportal.com/reports/digital-2026-global-overview-report',
    chain: 'primary'
  },
  {
    id: 'exp-daily', year: 2026, value: 141, unit: 'minutes a day',
    statement: 'Global average daily time on social media — 2 hours 21 minutes.',
    source: 'DataReportal, Digital 2026 Global Overview Report',
    url: 'https://datareportal.com/reports/digital-2026-global-overview-report',
    chain: 'primary'
  },
  {
    id: 'exp-weekly', year: 2026, value: 1116, unit: 'minutes a week',
    statement:
      'With video-first platforms included, 18 hours 36 minutes a week — over half of all connected time.',
    source: 'DataReportal, Digital 2026 Global Overview Report',
    url: 'https://datareportal.com/reports/digital-2026-global-overview-report',
    chain: 'primary'
  },
  {
    id: 'exp-reach', year: 2026, value: 94.7, unit: 'per cent',
    statement: 'Share of the world’s internet users who use social media each month.',
    source: 'DataReportal, Digital 2026 Global Overview Report',
    url: 'https://datareportal.com/reports/digital-2026-global-overview-report',
    chain: 'primary'
  }
];

/* ----------------------------------------------------------- CHAPTER III --
 *
 * §3.2 names directed attention fatigue and §3.1 asks for the person rather
 * than the profile. The Reuters Institute has been running the same question
 * across 46–48 markets since 2017, which makes withdrawal the one posture in
 * Chapter III with a longitudinal reading attached to it.
 *
 * The series is deliberately NOT drawn as a decline in attention. It is a
 * decline in willingness, which is a different claim and the one the data
 * supports: a person who avoids the news has not lost the capacity to read it.
 */
export const WITHDRAWAL: Series = {
  id: 'news-avoidance',
  short: 'AVOIDANCE',
  title: 'Selective news avoidance, sometimes or often',
  unit: 'per cent',
  reading:
    'The share of people who say they sometimes or often actively avoid the news',
  caveat:
    'Avoidance is a withdrawal of willingness, not of capacity. It says the environment is being declined, not that anyone has stopped being able to read.',
  points: [
    {
      id: 'avoid-2017', year: 2017, value: 29, unit: 'per cent',
      statement: 'The first year the question was asked.',
      source: 'Reuters Institute, Digital News Report 2026 (baseline year 2017)',
      url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary',
      chain: 'primary'
    },
    {
      id: 'avoid-2026', year: 2026, value: 42, unit: 'per cent',
      statement:
        'Flat year on year, and thirteen points above the 2017 baseline. In Bulgaria, Croatia, Greece and Turkey, 60% or more.',
      source: 'Reuters Institute, Digital News Report 2026',
      url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary',
      chain: 'primary'
    }
  ]
};

/** The readings that move with avoidance, from the same two instruments. */
export const DISENGAGEMENT: Datum[] = [
  {
    id: 'interest-2021', year: 2021, value: 59, unit: 'per cent',
    statement: 'Extremely or very interested in news.',
    source: 'Reuters Institute, Digital News Report 2026',
    url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary',
    chain: 'primary'
  },
  {
    id: 'interest-2026', year: 2026, value: 46, unit: 'per cent',
    statement: 'A thirteen-point fall across 46 markets in five years.',
    source: 'Reuters Institute, Digital News Report 2026',
    url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary',
    chain: 'primary'
  },
  {
    id: 'trust-2025', year: 2025, value: 40, unit: 'per cent',
    statement: 'Trust in news, having held at forty per cent for three years.',
    source: 'Reuters Institute, Digital News Report 2026',
    url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary',
    chain: 'primary'
  },
  {
    id: 'trust-2026', year: 2026, value: 37, unit: 'per cent',
    statement: 'The lowest recorded since measurement began in 2015. In the United States, 25%.',
    source: 'Reuters Institute, Digital News Report 2026',
    url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary',
    chain: 'primary'
  },
  {
    id: 'insularity-2026', year: 2026, value: 70, unit: 'per cent',
    statement:
      'Unwilling or hesitant to trust someone holding different values, background or information sources. Japan 90%, Germany 81%, the UK 76%.',
    source: 'Edelman Trust Barometer 2026 — 33,000+ respondents across 28 countries',
    url: 'https://www.edelman.com/news-awards/2026-edelman-trust-barometer-society-slides-into-insularity',
    chain: 'primary'
  }
];

/* -------------------------------------------------------------- CHAPTER V --
 *
 * §5.6 specifies the Restoration Delta and says of it, in the manuscript's own
 * words, that "it is self-report: not attention measured, but the person's own
 * account of their state, which is what the standard asks."
 *
 * The restoration literature has since arrived at the same place from the
 * opposite direction, and this is the most useful finding in the addendum: the
 * OBJECTIVE measure is the one that fails to replicate, and the subjective one
 * is the one that moves. A 2025 systematic review and meta-analysis finds small
 * effects with substantial heterogeneity; a conceptual replication with its own
 * meta-analysis (14 studies, N = 612) finds no reliable restoration of pure
 * executive attention — while nature exposure still improved subjective fatigue
 * where urban exposure did not.
 *
 * This does not vindicate the instrument and must not be written as though it
 * does. What it establishes is narrower and worth more: §5.6's caveat is the
 * defensible position rather than a hedge, and an instrument claiming to
 * measure attention itself would be claiming more than the field can support.
 */
export const RESTORATION_EVIDENCE: Datum[] = [
  {
    id: 'art-duration', year: 2025, value: 30, unit: 'minutes',
    statement:
      'Where the largest difference between natural and non-natural settings appears; exposure duration moderates restoration non-linearly.',
    source: 'Systematic review and meta-analysis, Journal of Environmental Psychology (2025)',
    url: 'https://www.sciencedirect.com/science/article/pii/S027249442500115X',
    chain: 'primary'
  },
  {
    id: 'art-replication', year: 2021, value: 612, unit: 'participants',
    statement:
      'Conceptual replication and meta-analysis of 14 studies: no reliable restoration of pure executive attention, while subjective fatigue still improved.',
    source: 'Journal of Environmental Psychology — replication and meta-analysis',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S0272494421001626',
    chain: 'primary'
  }
];

/**
 * The shock both arms of the comparison are struck by.
 *
 * This is what makes the final figure a fragility test rather than a forecast:
 * ONE disturbance, applied to two postures, and the question is only what each
 * does under it. Taleb's definition is the whole method — fragile is what
 * suffers disproportionately from volatility — so the comparison is not "which
 * grows faster" but "what does the same volatility do to each".
 */
export const SHOCK: Datum[] = [
  {
    id: 'shock-search', year: 2025, value: -33, unit: 'per cent',
    statement:
      'Global decline in organic search referrals to news publishers, November 2024 to November 2025. In the United States, −38%.',
    source: 'Chartbeat analytics, reported in Reuters Institute DNR 2026',
    url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary',
    chain: 'secondary'
  },
  {
    id: 'shock-ai-overviews', year: 2025, value: -69, unit: 'per cent',
    statement:
      'Upper bound of the fall in publisher search referrals for news within a year of AI Overviews launching.',
    source: 'Similarweb, reported in trade press',
    url: 'https://advertisingweek.com/the-search-traffic-collapse-is-forcing-publishers-to-adapt/',
    chain: 'secondary'
  },
  {
    id: 'shock-expectation', year: 2026, value: -43, unit: 'per cent',
    statement: 'What publishers expect search referrals to do over the next three years.',
    source: 'Reuters Institute, Digital News Report 2026',
    url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary',
    chain: 'primary'
  },
  {
    id: 'shock-regulatory', year: 2026, value: 6, unit: 'per cent of global revenue',
    statement:
      'The Digital Services Act ceiling on a single penalty. EU Big Tech fines reached €3.77bn in one year; Meta has accumulated roughly €2.29bn since 2023.',
    source: 'European Commission enforcement decisions; EU Perspectives (January 2026)',
    url: 'https://euperspectives.eu/2026/01/last-years-big-tech-bill-in-europe/',
    chain: 'secondary'
  }
];

/**
 * What the other posture has to go on.
 *
 * Thin, and it has to be admitted as thin. No brand has run the Chapter V
 * standard as specified, so there is no direct evidence of the framework; what
 * exists is evidence for the two mechanisms it depends on — that attention
 * quality predicts outcomes better than exposure does, and that an owned
 * relationship survives a distribution shock a rented one does not.
 */
export const ANTIFRAGILE_EVIDENCE: Datum[] = [
  {
    id: 'af-attention', year: 2021, value: 3, unit: 'times',
    statement:
      'Attention predicts advertising outcomes roughly three times better than viewability does.',
    source: 'Teads and Dentsu, attention economy report',
    url: 'https://iabeurope.eu/wp-content/uploads/2023/07/Teads-x-Lumen-Attention-Whitepaper.pdf',
    chain: 'secondary'
  },
  {
    id: 'af-conversion', year: 2023, value: 88, unit: 'per cent',
    statement:
      'Senior US marketers who trust the correlation between attention and outcomes; conversion rates rise with attention per impression.',
    source: 'Adelaide, September 2023',
    url: 'https://www.adelaidemetrics.com/attention-resources/bolstering-the-digital-media-market-the-power-of-attention-metrics',
    chain: 'secondary'
  },
  {
    id: 'af-retention', year: 2025, value: 58, unit: 'per cent better',
    statement:
      'Retention advantage of paying subscribers who receive personalised newsletters over those who do not.',
    source: 'INMA research, reported in trade press',
    url: 'https://www.thecurrent.com/media/marketing-strategy-newsletters-publishers-answer-ai-induced-traffic-collapse',
    chain: 'secondary'
  },
  {
    id: 'af-paying', year: 2026, value: 17, unit: 'per cent',
    statement:
      'Paying for online news across a basket of twenty countries, down one point. Norway 40%, Sweden 32%.',
    source: 'Reuters Institute, Digital News Report 2026',
    url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary',
    chain: 'primary'
  }
];

/* ------------------------------------------------------------- THE MODEL --
 *
 * WHAT THIS IS, SAID ONCE AND PLAINLY: a scenario model, not a measurement.
 *
 * One arm of it extrapolates recorded series. The other has nothing to
 * extrapolate, because no population has adopted the Chapter V standard and
 * there is therefore nothing to measure. So the second arm is computed from
 * assumptions, and every assumption is listed below with the status of its
 * SIGN and the status of its SIZE held apart — which is the distinction that
 * does the honest work here. "Attention predicts outcomes about three times
 * better than viewability" establishes that a quality term should rise. It does
 * not establish that it rises six per cent a year. The evidence is cited for
 * the direction; the magnitude is an assumption and is labelled one.
 *
 * The comparison is a FRAGILITY TEST, not a forecast. Both arms are struck by
 * the same shock at the same rate — RENTED_DECAY applies to both, with no
 * exemption for the posture the dossier prefers — and the only question is what
 * each does under it. That is Taleb's definition operationalised: fragile is
 * what suffers disproportionately from volatility, and antifragile is what has
 * a term that is *driven by* the same volatility. SCARCITY_GAIN is that term,
 * and it is worth noticing that it is zero until the shock arrives.
 */

export interface Assumption {
  id: string;
  /** two words, for the cell (TY-08) */
  short: string;
  /** the parameter's value, as the model uses it */
  value: number;
  /** how it enters the model */
  statement: string;
  /** 'measured' — read off a series; 'assumed' — chosen, and changeable */
  status: 'measured' | 'assumed';
  /** what supports it. For an assumption this supports the SIGN, never the size. */
  basis: string;
}

export const ASSUMPTIONS: Assumption[] = [
  {
    id: 'rented-decay', short: 'RENTED DECAY', value: 0.18, status: 'measured',
    statement: 'Rented distribution loses 18% of its reach each year, in both arms.',
    basis:
      'Midpoint of two readings: −33% observed over twelve months to November 2025, and −43% over three years as publishers expect it (≈ −17% a year). Applying a measured rate forward as a constant is itself an assumption.'
  },
  {
    id: 'avoidance-drift', short: 'AVOIDANCE DRIFT', value: 0.025, status: 'measured',
    statement: 'Willingness to receive falls 2.5% a year in the extractive arm.',
    basis:
      'Avoidance rose 29% → 42% over nine years, ≈ 1.44 points a year against the 58% who still do not avoid.'
  },
  {
    id: 'trust-drift', short: 'TRUST DRIFT', value: 0.014, status: 'measured',
    statement: 'Borrowed trust decays 1.4% a year.',
    basis: 'Trust in news 40% → 37% over the period, ≈ 0.5 points a year on a 37% base.'
  },
  {
    id: 'owned-share', short: 'OWNED SHARE', value: 0.20, status: 'assumed',
    statement: 'Both arms begin with a fifth of their reach owned and four fifths rented.',
    basis:
      'Chosen so the two arms start identical: the comparison is of a policy, not of a head start. Nothing in the sources fixes this number.'
  },
  {
    id: 'churn', short: 'CHURN', value: 0.25, status: 'assumed',
    statement: 'An owned audience loses a quarter of itself a year without the standard.',
    basis: 'A conventional annual churn figure. Changeable, and the model is sensitive to it.'
  },
  {
    id: 'retention', short: 'RETENTION', value: 1.58, status: 'measured',
    statement: 'The standard divides that churn by 1.58.',
    basis:
      'Subscribers receiving personalised newsletters retain 58% better than those who do not. The reading is about one practice, not about the whole standard.'
  },
  {
    id: 'conversion', short: 'CONVERSION', value: 0.12, status: 'assumed',
    statement:
      'The adopting arm converts 12% of its rented reach into owned reach each year; the extractive arm converts 2%.',
    basis:
      'The policy difference, expressed as a number. Its sign is the whole content of Chapter V; its size is chosen, and is the single most consequential assumption here.'
  },
  {
    id: 'quality-gain', short: 'QUALITY GAIN', value: 0.06, status: 'assumed',
    statement: 'Value per contact rises 6% a year under the standard, capped at +40%.',
    basis:
      'Attention predicts outcomes about three times better than viewability, and conversion rises with attention per impression — which establishes that this term rises. It does not establish 6%, and 6% is not derived from it.'
  },
  {
    id: 'scarcity-gain', short: 'SCARCITY GAIN', value: 0.35, status: 'assumed',
    statement:
      'A direct relationship gains in value as the rented channel degrades, at 0.35 of the degradation.',
    basis:
      'The antifragile term, and the reason this is a fragility test rather than a forecast: it is zero until the shock arrives and grows only with it. The mechanism is Taleb’s; the coefficient is assumed.'
  }
];

/** Where the projection starts and how far it runs. */
export const HORIZON = { from: 2026, to: 2032 } as const;

export interface Projection {
  year: number;
  /** rules continuing as they are */
  extractive: number;
  /** rules adopting the antifragile framework */
  antifragile: number;
}

const A = Object.fromEntries(ASSUMPTIONS.map((a) => [a.id, a.value])) as Record<string, number>;

/**
 * Run the model.
 *
 * Deliberately a plain readable loop rather than anything clever: this function
 * is the argument, and a reader who wants to check it should be able to. Both
 * arms are indexed to 100 at HORIZON.from, so the drawing compares shapes and
 * never claims a unit it does not have.
 */
export function project(): Projection[] {
  const years = HORIZON.to - HORIZON.from;
  let ownedA = A['owned-share'] * 100;
  let rentedA = (1 - A['owned-share']) * 100;
  let ownedB = ownedA;
  let rentedB = rentedA;
  let qA = 1;
  let qB = 1;
  let trustA = 1;

  const out: Projection[] = [{ year: HORIZON.from, extractive: 100, antifragile: 100 }];

  for (let t = 1; t <= years; t++) {
    /* The shock, applied identically to both. No posture is exempt from it. */
    const rentedA1 = rentedA * (1 - A['rented-decay']);
    const rentedB1 = rentedB * (1 - A['rented-decay']);

    /* The extractive arm replenishes its owned audience only incidentally. */
    ownedA = ownedA * (1 - A['churn']) + rentedA * 0.02;
    /* The adopting arm converts, and churns more slowly for doing so. */
    ownedB = ownedB * (1 - A['churn'] / A['retention']) + rentedB * A['conversion'];

    rentedA = rentedA1;
    rentedB = rentedB1 * (1 - A['conversion']);

    qA *= 1 - A['avoidance-drift'];
    qB = Math.min(qB * (1 + A['quality-gain']), 1.4);
    trustA *= 1 - A['trust-drift'];

    /* The antifragile term: how far the rented channel has fallen from where it
       started, turned into value on the owned side. Zero at t = 0 by
       construction, and it cannot be positive unless the shock is. */
    const fallen = 1 - rentedB / ((1 - A['owned-share']) * 100);
    const scarcity = 1 + A['scarcity-gain'] * Math.max(0, fallen);

    out.push({
      year: HORIZON.from + t,
      extractive: (ownedA + rentedA) * qA * trustA,
      antifragile: (ownedB + rentedB) * qB * scarcity
    });
  }
  return out;
}

export const PROJECTION: Projection[] = project();

/**
 * What the model actually produced, measured rather than asserted (ME-01).
 *
 * It was run before anything was drawn, and it did not produce the flattering
 * answer. **Neither arm grows.** Both decline across the horizon, and no setting
 * of any parameter makes the adopting arm turn upward. That is recorded here
 * rather than tuned away, because tuning a model until it agrees with the
 * chapter it illustrates is the failure this whole document is about.
 *
 * What survives the sweep is a ratio. Running 2026 → 2032 over every plausible
 * value of the three assumptions the result is most sensitive to:
 *
 *   churn        0.15 → 0.30    antifragile index 79.5 → 58.8   ratio 2.82 → 2.55
 *   conversion   0.06 → 0.30    antifragile index 60.4 → 72.4   ratio 2.49 → 2.98
 *   rented decay 0.10 → 0.25    antifragile index 84.7 → 52.1   ratio 2.15 → 3.29
 *
 * The ratio never leaves 2.15–3.29. And the third row is the finding: the gap
 * WIDENS AS THE SHOCK HARDENS — 2.15× under a mild disturbance, 3.29× under a
 * severe one. Nothing put that there. It is what a term driven by the shock
 * does, which is the only thing in this file that behaves the way Taleb's
 * definition requires, and it is a claim about differential survival rather
 * than about growth.
 */
export const SENSITIVITY = {
  /** the horizon the sweep was run over */
  years: `${HORIZON.from}–${HORIZON.to}`,
  /** index at the end of the horizon, base assumptions */
  base: { extractive: 24.3, antifragile: 64.7, ratio: 2.67 },
  /** the ratio never left this band under any setting tested */
  ratioBand: { low: 2.15, high: 3.29 },
  /** ratio at the mildest and harshest shock tested */
  underShock: { mild: { decay: 0.10, ratio: 2.15 }, severe: { decay: 0.25, ratio: 3.29 } },
  finding:
    'Neither posture grows. The gap between them widens as the shock hardens — which is the only antifragile behaviour the model produces, and it is a claim about differential survival rather than about growth.'
} as const;

/**
 * The structural reading — the same comparison with every number removed.
 *
 * DV-07 requires a figure's claim to survive with every interaction unused, and
 * this is the stronger version of that: the claim has to survive the model being
 * disbelieved. Nothing here is computed. It is the dependency structure the two
 * postures have, which is what Chapter II and Chapter V actually argue, and it
 * would still be the argument if every coefficient above were wrong.
 */
export const STRUCTURAL: Array<{
  id: string;
  short: string;
  extractive: string;
  antifragile: string;
}> = [
  {
    id: 'address', short: 'THE ADDRESS',
    extractive: 'Rented. The landlord writes the lease and can change it mid-tenancy.',
    antifragile: 'Owned. The relationship survives a change in the channel that carried it.'
  },
  {
    id: 'trust', short: 'TRUST',
    extractive: 'Borrowed from a system whose own trust is falling.',
    antifragile: 'Held directly, and so not exposed to the lender’s decline.'
  },
  {
    id: 'consent', short: 'CONSENT',
    extractive: 'Bypassed — System 1 is addressed because it cannot decline.',
    antifragile: 'Required — the interaction has to survive being considered.'
  },
  {
    id: 'volatility', short: 'VOLATILITY',
    extractive: 'Suffered disproportionately. Every shock to the channel is a shock to the tenant.',
    antifragile: 'The same shock removes competitors from a channel this posture does not depend on.'
  },
  {
    id: 'regulation', short: 'REGULATION',
    extractive: 'A retrofit, attempted under legal pressure at the pace of the compliance wave.',
    antifragile: 'Already the operating model; the compliance wave arrives at something built for it.'
  }
];

/**
 * The two arms, and the three faces the final figure is drawn on.
 *
 * Named here rather than in the component for the reason everything else in
 * this file is: one home per string (TY-05), and a component that cannot
 * invent a name because it does not hold one. The arm names are the request's
 * own — rules continuing as they are, rules adopting the framework — shortened
 * to the two words TY-08 leaves room for at figure scale.
 */
export const ARMS = {
  shock: 'ONE SHOCK',
  extractive: 'CONTINUING',
  antifragile: 'ADOPTING'
} as const;

/**
 * The readings the final figure's own cells carry.
 *
 * These four sentences were written inside the component first, and the copy
 * audit caught all four — correctly. A string that lives in a component has no
 * home: nothing else can find it, nothing checks it, and the next person to
 * need the same sentence writes a second copy of it. They live here now for the
 * same reason every other string in this file does, and the audit reads this
 * file, so the check that caught them still holds over them.
 */
export const FIGURE_READINGS = {
  shock: 'Both postures are struck at the same rate. The only question is what each does under it.',
  origin:
    'Both postures are indexed to 100 here, so the comparison is of policy rather than of a head start.',
  measured:
    'Read off a recorded series. Applying a measured rate forward as a constant is itself an assumption.',
  assumed:
    'Chosen, and changeable. The evidence establishes the sign of each of these; it does not establish the size.',
  structure:
    'The dependency each posture has. It would still be the argument if every coefficient in the model were wrong.'
} as const;

export type FaceId = 'structure' | 'model' | 'assumptions';

/**
 * Three faces, and the order is an argument.
 *
 * STRUCTURE rests, because DV-07 requires the claim to survive every
 * interaction being unused — and the structural face carries no quantity at
 * all, so it survives the model being disbelieved as well as untouched. MODEL
 * comes second because it is the weaker evidence, and ASSUMPTIONS last because
 * a reader who has seen the curves is the reader who should see what they were
 * built out of. A figure that opened on the curves would be asking to be
 * believed before it had said what it rests on.
 */
export const FACES: Array<{ id: FaceId; name: string }> = [
  { id: 'structure', name: 'STRUCTURE' },
  { id: 'model', name: 'MODEL' },
  { id: 'assumptions', name: 'ASSUMPTIONS' }
];

/* ------------------------------------------------------------ THE PAGES --
 *
 * The addendum as prose, in the same shape a manuscript section has, so
 * pageModel can cut it into sheets with the machinery that already exists and
 * a reader's bookmarks and highlights work on it like any other page.
 *
 * These sections sit at the END of the chapter they answer, which is what was
 * asked for. They do not interleave with the argument and they do not comment
 * on it: each one reports what the instruments have recorded since, and stops.
 * Where a reading contradicts the chapter it follows, it says so — §3's is the
 * one that does, and leaving that out would have made the addendum decorative.
 */
export interface TrendwatchSection {
  id: string;
  /** the chapter this closes */
  chapterId: string;
  number: string;
  title: string;
  subtitle: string;
  content: string[];
  citations: Array<{ authorOrSource: string; text: string }>;
  /** the figure that ends it */
  figure: string;
}

export const TRENDWATCH_SECTIONS: TrendwatchSection[] = [
  {
    id: 'tw-1',
    chapterId: 'chapter-1',
    number: 'TRENDWATCH I',
    title: 'The Harvest, Measured',
    subtitle: 'What the instruments have recorded since',
    content: [
      'This chapter argues that the attention economy harvests the architecture of the human mind. The argument is structural and does not depend on a number. What follows is what has been measured while it was being made.',
      'In fieldwork conducted in 2003–04, office workers held a single screen for roughly two and a half minutes before switching to another. By 2012 the interval was seventy-five seconds. Across studies from 2016 onward it settles at forty-seven seconds, with a median of forty, corroborated by five independent studies between 2014 and 2020. The interval has fallen by roughly two thirds in under twenty years.',
      'The reading must be taken for what it is. It measures behaviour inside an environment, not a limit inside a person: how long the architecture permits, not how long anyone is able to attend. Read the other way round it becomes a claim about brains that the research does not make, and that misreading is itself a specimen of the thing §1.2 describes.',
      'The scale the interval is spent at is not in dispute. 5.66 billion people — more than sixty-eight per cent of the world — now use social media, for an average of two hours and twenty-one minutes a day; with video-first platforms included the figure passes eighteen and a half hours a week, more than half of all connected time. Simon’s finite resource is being spent at a rate that is recorded to the minute.',
      'Nothing here revises the chapter. It supplies the quantity the chapter deliberately did not reach for.'
    ],
    citations: [
      {
        authorOrSource: 'Mark, G. (2023)',
        text: 'Attention Span. Hanover Square Press; UC Irvine fieldwork 2003–04 onward. — 150s (2004), 75s (2012), 47s (2016–21), median 40s.'
      },
      {
        authorOrSource: 'DataReportal (2026)',
        text: 'Digital 2026 Global Overview Report. — 5.66bn social media users; 141 minutes a day; 18h36m a week including video platforms.'
      },
      {
        authorOrSource: 'Simon, H.A. (1971)',
        text: 'Designing Organizations for an Information-Rich World. — Attention as the scarce resource.'
      }
    ],
    figure: 'attention-interval'
  },
  {
    id: 'tw-3',
    chapterId: 'chapter-3',
    number: 'TRENDWATCH III',
    title: 'The Practitioner’s Ground',
    subtitle: 'The state of the person this chapter describes',
    content: [
      'This chapter asks for the person rather than the profile, and names directed attention fatigue as the state that person is in. One instrument has asked a population the adjacent question every year since 2017.',
      'Selective news avoidance — the share who say they sometimes or often actively avoid the news — stood at twenty-nine per cent in 2017. In 2026 it stands at forty-two, flat year on year and thirteen points above the baseline. In Bulgaria, Croatia, Greece and Turkey it is sixty per cent or more. Two shorter series from the same instrument move with it: the share extremely or very interested in news fell from fifty-nine per cent in 2021 to forty-six in 2026, and trust in news fell to thirty-seven per cent, the lowest recorded since measurement began in 2015; in the United States, twenty-five. The three do not share a baseline year, so the figure sets them on one scale and lets the distances be compared rather than the spans.',
      'Avoidance is a withdrawal of willingness, not of capacity. A person who declines the news has not lost the ability to read it. That distinction is the chapter’s own and it is the reason the reading belongs here rather than in Chapter I: this is not a measurement of damage, it is a measurement of refusal.',
      'The restoration literature has moved, and it moves against the easy version of the chapter’s claim. A 2025 systematic review and meta-analysis finds effects that are small with substantial heterogeneity, largest at around thirty minutes of exposure. A conceptual replication with its own meta-analysis — fourteen studies, six hundred and twelve participants — finds no reliable restoration of pure executive attention at all. What it does find is that subjective fatigue improves where urban exposure leaves it unchanged.',
      'That is a finding about instruments, and it lands on §5.6. The Restoration Delta is self-report by construction, and the manuscript says so: not attention measured, but the person’s own account of their state. The literature now says the self-report is the part that moves. This does not vindicate the instrument. It establishes something narrower and worth more — that §5.6’s caveat is the defensible position rather than a hedge, and that an instrument claiming to measure attention itself would be claiming more than the field can support.'
    ],
    citations: [
      {
        authorOrSource: 'Reuters Institute (2026)',
        text: 'Digital News Report 2026. — Avoidance 29% (2017) → 42% (2026); interest 59% (2021) → 46% (2026); trust 37%, lowest recorded.'
      },
      {
        authorOrSource: 'Edelman (2026)',
        text: 'Trust Barometer 2026. — Seven in ten unwilling or hesitant to trust someone with different values; 33,000+ respondents across 28 countries.'
      },
      {
        authorOrSource: 'Journal of Environmental Psychology (2025)',
        text: 'Nature exposures and attention restoration, moderated by exposure duration: systematic review and meta-analysis. — Small effects, substantial heterogeneity, largest near 30 minutes.'
      },
      {
        authorOrSource: 'Journal of Environmental Psychology (2021)',
        text: 'Conceptual replication and meta-analysis, 14 studies, N = 612. — No reliable restoration of pure executive attention; subjective fatigue improved.'
      }
    ],
    figure: 'news-avoidance'
  },
  {
    id: 'tw-5',
    chapterId: 'chapter-5',
    number: 'TRENDWATCH V',
    title: 'Two Trajectories',
    subtitle: 'One shock, two postures — a fragility test, not a forecast',
    content: [
      'The dossier ends by specifying a standard. This closes it by asking what happens to a communicator who adopts that standard and to one who does not, under the same disturbance — which is the only comparison the material supports, because no population has adopted the standard and there is nothing to measure on that side.',
      'The disturbance is already recorded. Organic search referrals to news publishers fell thirty-three per cent globally in the twelve months to November 2025, thirty-eight per cent in the United States; within a year of AI Overviews launching, referrals for news fell by as much as sixty-nine per cent at the extreme. Publishers expect a further forty-three per cent over three years. Alongside it the Digital Services Act carries a ceiling of six per cent of global revenue on a single penalty, and EU enforcement against the large platforms reached €3.77 billion in one year.',
      'Under the extractive posture that disturbance transfers whole. Reach is rented, which is the first fracture of §2.3: a change in the landlord’s distribution is a change in the tenant’s audience, and nothing about the tenant’s conduct alters it. Under the adopting posture the same disturbance is partly a gain, because it degrades a channel this posture does not depend on while leaving the direct relationship untouched — and a direct relationship becomes more valuable as the rented one decays.',
      'The model that follows is a scenario, not a measurement, and every assumption in it is listed on the figure with its sign and its size held apart. The evidence establishes directions; it does not establish coefficients. Both arms are struck at the same rate, with no exemption for the posture this dossier prefers.',
      'It did not produce the flattering answer, and that is left as it came out. Neither posture grows. Across the horizon the extractive arm ends at roughly a quarter of where it began and the adopting arm at roughly two thirds. No setting of any parameter turns the second arm upward. What survives every setting tested is the ratio between them, which never leaves 2.15 and 3.29 — and which widens as the shock hardens: 2.15 under a mild disturbance, 3.29 under a severe one.',
      'That is the whole finding, and it is narrower than the chapter it follows. The standard does not promise growth and this model does not produce any. What it produces is a difference in what a shock costs, and a difference that grows with the shock is what the definition of antifragility actually asks for.'
    ],
    citations: [
      {
        authorOrSource: 'Reuters Institute (2026)',
        text: 'Digital News Report 2026, citing Chartbeat. — Organic search referrals −33% globally, −38% US, Nov 2024 – Nov 2025; publishers expect −43% over three years.'
      },
      {
        authorOrSource: 'Similarweb (2025)',
        text: 'Publisher search referrals for news, first year of AI Overviews. — Falls of up to 69% at the extreme.'
      },
      {
        authorOrSource: 'European Commission (2024–2026)',
        text: 'Digital Services Act and Digital Markets Act enforcement. — Penalty ceiling of 6% of global revenue; €3.77bn in fines in one year; Meta ~€2.29bn accumulated since 2023.'
      },
      {
        authorOrSource: 'Teads & Dentsu (2021); Adelaide (2023)',
        text: 'Attention predicts advertising outcomes about three times better than viewability; conversion rises with attention per impression.'
      },
      {
        authorOrSource: 'INMA (2025)',
        text: 'Subscribers receiving personalised newsletters retain 58% better than those who do not.'
      },
      {
        authorOrSource: 'Taleb, N.N. (2012)',
        text: 'Antifragile: Things That Gain from Disorder. — Fragility as disproportionate suffering under volatility.'
      }
    ],
    figure: 'two-trajectories'
  }
];
