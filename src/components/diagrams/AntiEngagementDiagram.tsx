import React from 'react';
import { LivingFigure, FigureNode, FigureEdge } from '../figures/LivingFigure';

interface AntiEngagementDiagramProps {
  isDark?: boolean;
}

const ID = 'fig-metric';

/**
 * FIG 4.1 — What gets measured gets built.
 *
 * Two measurement organs on one tissue. The extractive metrics all converge on
 * a single outcome cell that dims the further you follow it; the
 * anti-engagement metrics converge on one that brightens. Both are wired to
 * the same interaction, which is the chapter's point: the interaction did not
 * change, only what was counted about it.
 */

const EXTRACTIVE: Array<[string, string, string, string[]]> = [
  ['Time-On-Site', 'maximises exposure to ad inventory', '⏱', [
    'Counts duration, which is indistinguishable from being unable to leave.'
  ]],
  ['Click-Through Rate', 'rewards provocative & misleading framing', '↗', [
    'Rewards the promise, never the delivery — the two are measured apart.'
  ]],
  ['Viral Coefficient', 'exploits outrage & emotional contagion', '⋔', [
    'Outrage is the cheapest transmissible state, so outrage is what compounds.'
  ]]
];

const RESTORATIVE: Array<[string, string, string, string[]]> = [
  ['Clarity Efficiency', 'comprehension per minute spent', '◎', [
    'Counts understanding gained against attention spent, so shorter can win.'
  ]],
  ['Intention Fulfilment', 'sessions where the user got what they came for', '⌾', [
    'Measures whether the person left with the thing they arrived for.'
  ]],
  ['Post-Session Calm', 'self-reported clarity vs anxiety after contact', '✧', [
    'The only metric that asks what state the interaction left behind.'
  ]]
];

const EXT: FigureNode[] = EXTRACTIVE.map(([label, sub, glyph, detail], i) => ({
  id: `e${i}`,
  kind: 'cell' as const,
  x: 96 + i * 8,
  y: 62 + i * 78,
  r: 17,
  label: label.toUpperCase(),
  sub,
  glyph,
  /* Drawn wordless, this figure is two columns of identical cells with no way to
     tell the extractive metric from the restorative one but pointing at each in
     turn — and which name sits on which side IS the argument. TY-07's exemption,
     spent for the same reason the taxonomy spends it. The extractive column sits
     a step dimmer, which is the emphasis the chapter actually wants. */
  labelAtRest: 0.52,
  intensity: 0.66,
  reading: { kind: 'Extractive measurement · counts the reaction', body: sub },
  detail
}));

const RES: FigureNode[] = RESTORATIVE.map(([label, sub, glyph, detail], i) => ({
  id: `r${i}`,
  kind: 'cell' as const,
  x: 704 - i * 8,
  y: 62 + i * 78,
  r: 17 + i * 1.5,
  label: label.toUpperCase(),
  sub,
  glyph,
  labelAtRest: 0.64,
  intensity: 0.86 + i * 0.05,
  reading: { kind: 'Anti-engagement measurement · counts the state left behind', body: sub },
  detail
}));

const NODES: FigureNode[] = [
  ...EXT,
  ...RES,
  {
    id: 'contact',
    kind: 'core',
    x: 400, y: 140, r: 26,
    label: 'THE INTERACTION',
    sub: 'unchanged — only what is counted about it changes',
    glyph: '◇',
    labelAt: 'above',
    reading: {
      kind: 'The interaction itself · measured two ways',
      body: 'The same contact, counted by two organs that build two different systems'
    },
    detail: [
      'Nothing about the encounter differs between the two sides of this figure.',
      'What differs is which signal the system optimises, and that builds the product.'
    ]
  },
  {
    id: 'degrade',
    kind: 'cell',
    x: 232, y: 258, r: 20,
    label: 'DEGRADES TRUST · CAUSES FATIGUE',
    glyph: '↓',
    intensity: 0.55,
    reading: {
      kind: 'Outcome · what extractive measurement compounds into',
      body: 'Performance that decays as the audience it depends on is spent'
    },
    detail: ['Each cycle returns a slightly more depleted audience than the one before.']
  },
  {
    id: 'compound',
    kind: 'cell',
    x: 568, y: 258, r: 22,
    label: 'COMPOUNDS TRUST & LOYALTY',
    glyph: '↑',
    intensity: 1,
    reading: {
      kind: 'Outcome · what anti-engagement measurement compounds into',
      body: 'Performance that improves as the relationship it depends on deepens'
    },
    detail: ['Not the intensity of the reaction — the quality of the state left behind.']
  }
];

const EDGES: FigureEdge[] = [
  ...EXT.map(n => ({ a: 'contact', b: n.id, faint: true })),
  ...RES.map(n => ({ a: 'contact', b: n.id, weight: 1.2 })),
  ...EXT.map(n => ({ a: n.id, b: 'degrade', weight: 0.9 })),
  ...RES.map(n => ({ a: n.id, b: 'compound', weight: 1.3 }))
];

export const AntiEngagementDiagram: React.FC<AntiEngagementDiagramProps> = () => (
  <LivingFigure
    id={ID}
    width={800}
    height={330}
    nodes={NODES}
    edges={EDGES}
    core="contact"
    caption=""
    tag=""
    footLeft=""
    footRight=""
    rest={{
      kind: 'One interaction · two measurement organs',
      body: 'The encounter never changes. What gets counted about it is what gets built'
    }}
  />
);
