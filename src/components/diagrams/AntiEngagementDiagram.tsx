import React from 'react';
import { LivingFigure, FigureLayout, FigureNode, FigureEdge } from '../figures/LivingFigure';

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

/* ------------------------------------------------------------- portrait --
 *
 * THE TWO ORGANS STAY LEFT AND RIGHT. THE OUTCOMES STOP SHARING A ROW.
 *
 * Which column a name sits in IS the argument here — extractive on one side,
 * anti-engagement on the other — and DV-02 leaves a monochrome drawing no
 * second channel to carry that with, so position is doing all of it. Stacking
 * the two organs one above the other would have been the easy narrow layout
 * and it reads as sequence, first these then those, where side by side reads
 * as two kinds. So the columns hold, and what gives is everything else.
 *
 * The interaction moves from the middle to the top, because with the columns
 * narrowed there is no middle left to stand in — and the top is where a shared
 * origin belongs when both organs hang below it.
 *
 * THE TWO OUTCOME CELLS CANNOT SHARE A ROW, and that is arithmetic rather than
 * taste: DEGRADES TRUST · CAUSES FATIGUE is thirty-one characters, which at
 * 8.5 units tracked 0.2em is about 205 — more than half the sheet on its own,
 * and COMPOUNDS TRUST & LOYALTY is another 166. They are therefore offset in
 * depth, which costs the figure its symmetry and keeps its two sides. The
 * asymmetry is not a misreading here: one outcome dims and the other
 * brightens, and the figure has never claimed the two are mirror images.
 */
const PW = 360;
const PH = 660;
const P_ROW_Y = [176, 268, 360];

/**
 * One description of both organs, placed twice.
 *
 * The metric names, their subs, glyphs, readings and the brightness step that
 * separates the two sides are written once. Only coordinates and field radii
 * differ. See FigureLayout in LivingFigure.
 */
const build = (place: {
  ext: (i: number) => { x: number; y: number };
  res: (i: number) => { x: number; y: number };
  contact: { x: number; y: number };
  degrade: { x: number; y: number };
  compound: { x: number; y: number };
  metricArbor?: number;
  contactArbor?: number;
  outcomeArbor?: number;
}): FigureNode[] => {
  const ext: FigureNode[] = EXTRACTIVE.map(([label, sub, glyph, detail], i) => ({
    id: `e${i}`,
    kind: 'cell' as const,
    ...place.ext(i),
    r: 17,
    ...(place.metricArbor ? { arborR: place.metricArbor } : {}),
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
  const res: FigureNode[] = RESTORATIVE.map(([label, sub, glyph, detail], i) => ({
    id: `r${i}`,
    kind: 'cell' as const,
    ...place.res(i),
    r: 17 + i * 1.5,
    ...(place.metricArbor ? { arborR: place.metricArbor + i * 4 } : {}),
    label: label.toUpperCase(),
    sub,
    glyph,
    labelAtRest: 0.64,
    intensity: 0.86 + i * 0.05,
    reading: { kind: 'Anti-engagement measurement · counts the state left behind', body: sub },
    detail
  }));
  return [
    ...ext,
    ...res,
    {
      id: 'contact',
      kind: 'core',
      ...place.contact, r: 26,
      ...(place.contactArbor ? { arborR: place.contactArbor } : {}),
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
      ...place.degrade, r: 20,
      ...(place.outcomeArbor ? { arborR: place.outcomeArbor } : {}),
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
      ...place.compound, r: 22,
      ...(place.outcomeArbor ? { arborR: place.outcomeArbor } : {}),
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
};

const NODES: FigureNode[] = build({
  ext: (i) => ({ x: 96 + i * 8, y: 62 + i * 78 }),
  res: (i) => ({ x: 704 - i * 8, y: 62 + i * 78 }),
  contact: { x: 400, y: 140 },
  degrade: { x: 232, y: 258 },
  compound: { x: 568, y: 258 }
});

const PORTRAIT_NODES: FigureNode[] = build({
  ext: (i) => ({ x: 92 + i * 6, y: P_ROW_Y[i] }),
  res: (i) => ({ x: 268 - i * 6, y: P_ROW_Y[i] }),
  contact: { x: 180, y: 66 },
  degrade: { x: 110, y: 480 },
  compound: { x: 252, y: 574 },
  metricArbor: 44,
  contactArbor: 62,
  outcomeArbor: 50
});

const EXT = NODES.filter(n => n.id.startsWith('e'));
const RES = NODES.filter(n => n.id.startsWith('r'));

const EDGES: FigureEdge[] = [
  ...EXT.map(n => ({ a: 'contact', b: n.id, faint: true })),
  ...RES.map(n => ({ a: 'contact', b: n.id, weight: 1.2 })),
  ...EXT.map(n => ({ a: n.id, b: 'degrade', weight: 0.9 })),
  ...RES.map(n => ({ a: n.id, b: 'compound', weight: 1.3 }))
];

const PORTRAIT: FigureLayout = { width: PW, height: PH, nodes: PORTRAIT_NODES };

export const AntiEngagementDiagram: React.FC<AntiEngagementDiagramProps> = () => (
  <LivingFigure
    id={ID}
    width={800}
    height={330}
    nodes={NODES}
    portrait={PORTRAIT}
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
