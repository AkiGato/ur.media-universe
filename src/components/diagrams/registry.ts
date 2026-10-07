import React, { lazy } from 'react';
import { BookPage } from '../../data/pageModel';

/**
 * The one table from a figure type to the component that draws it.
 *
 * There were two. `PageRenderer` held a `Record` keyed by `diagramType`, so a
 * figure type added without a component **failed the build**; `FigureStage`
 * held a chain of `{figure === '...' && <X />}`, so the same omission
 * **compiled clean and rendered nothing**. Both were true at once when the
 * three trendwatch figures were added: the page previews drew correctly and
 * the figure worlds opened onto an empty sheet with working chrome around it,
 * which is a bug that ships — nothing is red, and the only way to see it is to
 * open the world and look.
 *
 * The asymmetry was the whole problem. A registry that fails loudly and a
 * conditional chain that fails silently, for the identical mistake, teaches
 * everyone to trust the loud one and forget the quiet one. So there is now one
 * table, it is a `Record` over `NonNullable<BookPage['diagramType']>`, and
 * TypeScript refuses a missing key at the single place that already knows how
 * to check it. Adding a figure type is now one edit that cannot be half done.
 *
 * THE MAPPING IS NOT ONE-TO-ONE BY NAME, and that is deliberate rather than a
 * mistake carried forward: `scale-mismatch` draws `MediaUniverseDiagram` and
 * `media-universe` draws `CognitivePosturesDiagram`. The keys are what the book
 * calls the figure; the components are named for what they draw. Both surfaces
 * used the same crossing before this file existed, which is the only reason
 * lifting them into one table was safe.
 *
 * Lazy, because a figure is a large drawing that most readers never open, and
 * the page preview and the world want the same chunk.
 */
export type DiagramType = NonNullable<BookPage['diagramType']>;

export const DIAGRAMS: Record<
  DiagramType,
  React.ComponentType<{ isDark?: boolean }>
> = {
  'scale-mismatch': lazy(() =>
    import('./MediaUniverseDiagram').then((m) => ({ default: m.MediaUniverseDiagram }))
  ),
  'media-universe': lazy(() =>
    import('./CognitivePosturesDiagram').then((m) => ({ default: m.CognitivePosturesDiagram }))
  ),
  'bait-taxonomy': lazy(() =>
    import('./BaitTaxonomyDiagram').then((m) => ({ default: m.BaitTaxonomyDiagram }))
  ),
  'fragility-index': lazy(() =>
    import('./FragilityIndexDiagram').then((m) => ({ default: m.FragilityIndexDiagram }))
  ),
  'causal-taxonomy': lazy(() =>
    import('./CausalTaxonomyDiagram').then((m) => ({ default: m.CausalTaxonomyDiagram }))
  ),
  'neuro-aesthetic': lazy(() =>
    import('./AntiEngagementDiagram').then((m) => ({ default: m.AntiEngagementDiagram }))
  ),
  'attention-interval': lazy(() =>
    import('./AttentionIntervalDiagram').then((m) => ({ default: m.AttentionIntervalDiagram }))
  ),
  'news-withdrawal': lazy(() =>
    import('./WithdrawalDiagram').then((m) => ({ default: m.WithdrawalDiagram }))
  ),
  'two-trajectories': lazy(() =>
    import('./TwoTrajectoriesDiagram').then((m) => ({ default: m.TwoTrajectoriesDiagram }))
  )
};
