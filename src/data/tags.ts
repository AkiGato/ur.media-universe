/**
 * INVISIBLE TAGS — what a rule or a figure is *about*, for finding it.
 *
 * Nothing here is ever rendered. These are search keys only: the words a
 * practitioner would actually type when they are looking for the thing but do
 * not know what the dossier calls it. Somebody with a newsletter problem types
 * "email"; the rule they want is filed under CRM & lifecycle messaging, and
 * without a tag the index answers that the book does not contain it.
 *
 * WHY THIS IS NOT COPY. TY-04 governs text that appears on a surface, and none
 * of this does — it is an index, in the librarian's sense. The rule it is
 * actually serving is the opposite one: a reader who cannot find a tool has the
 * same experience as a reader for whom the tool does not exist.
 *
 * WHAT GOES IN. The domain the thing governs, the artefacts it is used on, and
 * the mechanisms the dossier names inside it — the vocabulary of the work, not
 * synonyms for its title. A tag that only restates the name earns nothing,
 * because the name is already matched.
 */

/** Tags on the production rules, by rule id. */
export const RULE_TAGS: Record<string, string[]> = {
  'global-rule': [
    'ethics', 'standard', 'constraint', 'system prompt', 'baseline',
    'manipulation', 'urgency', 'scarcity', 'social proof', 'disclosure'
  ],
  'branch-1': [
    'strategy', 'positioning', 'brand', 'go to market', 'segmentation',
    'psychographics', 'personas', 'audience', 'cognitive postures',
    'restoration-seeking', 'agency-seeking', 'meaning-seeking'
  ],
  'branch-2': [
    'content', 'planning', 'editorial', 'calendar', 'cadence', 'volume',
    'frequency', 'publishing', 'news', 'newsjacking', 'current events',
    'topics', 'schedule', 'how much', 'how often'
  ],
  'branch-3': [
    'copy', 'copywriting', 'headlines', 'ads', 'advertising', 'cta',
    'call to action', 'landing page', 'subject line', 'clickbait', 'bait',
    'urgency', 'scarcity', 'countdown', 'persuasion'
  ],
  'branch-4': [
    'crm', 'lifecycle', 'retention', 'email', 'newsletter', 'onboarding',
    're-engagement', 'win-back', 'churn', 'streaks', 'guilt', 'open rate',
    'click rate', 'trust compounding'
  ],
  'branch-5': [
    'image', 'imagery', 'visual', 'photography', 'art direction',
    'illustration', 'generative', 'midjourney', 'body image', 'comparison',
    'lifestyle', 'attention restoration'
  ],
  'branch-6': [
    'video', 'motion', 'film', 'sound', 'audio', 'product', 'pacing',
    'editing', 'cuts', 'soft fascination', 'interface', 'design',
    'anti-engagement', 'metrics'
  ],
  'branch-7': [
    'ux', 'ui', 'microcopy', 'interface', 'product copy', 'buttons',
    'notifications', 'badges', 'confirmshaming', 'dark patterns',
    'infinite scroll', 'stopping cues', 'onboarding'
  ],
  'branch-8': [
    'community', 'growth', 'social', 'loops', 'referral', 'gamification',
    'leaderboards', 'vanity metrics', 'followers', 'engagement', 'virality',
    'moderation'
  ],
  'verification-checklist': [
    'checklist', 'review', 'gate', 'sign off', 'qa', 'approval',
    'five questions', 'before shipping', 'audit', 'ethics check'
  ]
};

/** Tags on the figures, by figure id. */
export const FIGURE_TAGS: Record<string, string[]> = {
  'scale-mismatch': [
    'attention', 'finite', 'scale', 'overload', 'saturation', 'volume',
    'media space', 'observer', 'relative', 'field', 'noise'
  ],
  'media-universe': [
    'postures', 'states', 'cognitive', 'audience', 'segmentation',
    'psychographics', 'restoration', 'agency', 'meaning', 'persona'
  ],
  'bait-taxonomy': [
    'bait', 'clickbait', 'ragebait', 'headlines', 'arousal', 'emotion',
    'outrage', 'valence', 'engagement', 'copy'
  ],
  'fragility-index': [
    'fragility', 'platform', 'dependency', 'distribution', 'channel',
    'owned audience', 'algorithm', 'rented reach', 'monopoly', 'risk',
    'regulation', 'borrowed trust'
  ],
  'causal-taxonomy': [
    'causal', 'taxonomy', 'roots', 'deconstruction', 'analysis', 'headline',
    'economic', 'historical', 'neuro-psychological', 'method', 'news'
  ],
  'neuro-aesthetic': [
    'metrics', 'measurement', 'anti-engagement', 'restoration delta',
    'kpi', 'analytics', 'meaning alignment', 'agency index', 'lotus',
    'what gets measured'
  ]
};

/** Tags on the instruments, by tool id. */
export const TOOL_TAGS: Record<string, string[]> = {
  'five-questions': [
    'questions', 'checklist', 'gate', 'review', 'standard', 'ethics',
    'sign off', 'before shipping', 'audit'
  ],
  'content-budget': [
    'budget', 'calculator', 'how much', 'how often', 'volume', 'cadence',
    'frequency', 'quantity', 'posts', 'calendar', 'minimisation', 'pollution control'
  ],
  'restoration-delta': [
    'restoration', 'delta', 'metric', 'measurement', 'before after',
    'depletion', 'attention', 'survey', 'self report', 'score'
  ],
  'causal-taxonomy': [
    'taxonomy', 'analyse', 'deconstruct', 'headline', 'roots', 'source',
    'url', 'article', 'news'
  ]
};

/**
 * Everything a thing can be found by, lowercased and flattened.
 *
 * Built once per call site rather than memoised: the lists are short, the
 * filter runs on keystroke over ten rows, and a cache here would be the sort
 * of optimisation that costs more in indirection than it saves in work.
 */
export function searchKeyFor(parts: Array<string | undefined>, ...tagSets: Array<string[] | undefined>): string {
  const tags = tagSets.flatMap((t) => t ?? []);
  return [...parts.filter(Boolean), ...tags].join(' ').toLowerCase();
}
