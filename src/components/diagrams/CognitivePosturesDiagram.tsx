import React from 'react';
import { LivingFigure, FigureNode, FigureEdge } from '../figures/LivingFigure';

interface CognitivePosturesDiagramProps {
  isDark?: boolean;
}

const ID = 'fig-postures';

/**
 * FIG 2.1 — Three postures as three states of one cell.
 *
 * Not three personas: the same organism met at three moments, so the three
 * posture cells are wired to each other along the recovery of directed
 * attention rather than standing apart as separate columns. Each carries the
 * trap laid for it and the ethical response owed to it as two small cells of
 * its own — one dim, one lit.
 */

/**
 * Labels carry their own collision budget: at this scale a two-word cap on the
 * name with the full phrase moved into `sub` is what keeps three postures and
 * their six satellite cells from writing over each other.
 */
const POSTURES: Array<{
  id: string; x: number; title: string; state: string; glyph: string;
  intensity: number;
  trap: string; trapFull: string;
  ethic: string; ethicSub: string; ethicFull: string;
  detail: string[];
}> = [
  {
    id: 'restoration', x: 152, title: 'RESTORATION-SEEKING',
    state: 'System 1 dominant · depleted', glyph: '☾', intensity: 0.62,
    trap: 'panic CTAs · false scarcity',
    trapFull: 'Panic CTAs & artificial scarcity',
    ethic: 'SOFT FASCINATION', ethicSub: 'zero urgency',
    ethicFull: 'Soft fascination, zero urgency — respect biological fatigue',
    detail: [
      'System 2 has left the building. The person is reaching for relief, not information.',
      'Anything demanding evaluation at this moment is a demand that cannot be met.'
    ]
  },
  {
    id: 'agency', x: 400, title: 'AGENCY-SEEKING',
    state: 'System 2 engaged · recovered', glyph: '◈', intensity: 0.82,
    trap: 'bypass evaluation',
    trapFull: 'Bypass evaluation / quick buy',
    ethic: 'TRANSPARENCY', ethicSub: 'structured comparison',
    ethicFull: 'Structured transparency — empower rational comparison',
    detail: [
      'Directed attention has recovered enough for deliberate intent.',
      'The person arrives with purpose to evaluate options and can be met plainly.'
    ]
  },
  {
    id: 'meaning', x: 648, title: 'MEANING-SEEKING',
    state: 'Values alignment · testing', glyph: '✧', intensity: 1,
    trap: 'virtue signalling',
    trapFull: 'Virtue signalling / shallow hype',
    ethic: 'VERIFIABLE PROOF', ethicSub: 'skin in the game',
    ethicFull: 'Verifiable skin in the game — complete behavioural proof',
    detail: [
      'Testing whether principles match actions, at the level of structure not slogan.',
      'Consumers end relationships over value conflicts, and the test is never announced.'
    ]
  }
];

const CY = 132;

/**
 * The names stay legible at rest, and without them this figure said nothing.
 *
 * Drawn wordless it is nine cells of identical construction: three large ones in
 * a row, each with a dim satellite low-left and a brighter one low-right. The
 * whole argument is *which* satellite is which — the trap a state invites
 * against the response it is owed — and that is carried entirely by the naming.
 * Point at every cell in turn and the logic appears; look at it and there is
 * none. That is the same failure the map's numerals were written to prevent.
 *
 * So this spends TY-07's exemption ("A Taxonomy May Keep Its Names"), and spends
 * it in three steps of light rather than flat: the posture is the subject, the
 * response is what the section argues for, and the trap is the thing being
 * refused — so the trap is the dimmest word on the sheet, which is also the
 * correct emphasis for it.
 */
const LIT_POSTURE = 0.74;
const LIT_ETHIC = 0.6;
const LIT_TRAP = 0.4;

const NODES: FigureNode[] = [
  ...POSTURES.map(p => ({
    id: p.id,
    kind: 'cell' as const,
    x: p.x, y: CY, r: 30,
    label: p.title,
    sub: p.state,
    glyph: p.glyph,
    labelAt: 'above' as const,
    labelAtRest: LIT_POSTURE,
    intensity: 0.72 + p.intensity * 0.28,
    reading: { kind: 'Posture · state at the moment of contact', body: p.state },
    detail: p.detail
  })),
  // the trap laid for each posture — dim, and it falls away from the cell
  ...POSTURES.map(p => ({
    id: `${p.id}-trap`,
    kind: 'minor' as const,
    x: p.x - 70, y: CY + 100, r: 8,
    label: 'TRAP',
    sub: p.trap,
    labelAtRest: LIT_TRAP,
    intensity: 0.5,
    reading: { kind: 'Extractive response · what this state invites', body: p.trapFull }
  })),
  // the response owed to it — lit, and it carries the weight
  ...POSTURES.map(p => ({
    id: `${p.id}-ethic`,
    kind: 'cell' as const,
    x: p.x + 56, y: CY + 64, r: 14,
    label: p.ethic,
    sub: p.ethicSub,
    labelAtRest: LIT_ETHIC,
    intensity: 0.7 + p.intensity * 0.3,
    reading: { kind: 'Ethical response · what this state is owed', body: p.ethicFull },
    detail: [p.ethicFull]
  }))
];

const EDGES: FigureEdge[] = [
  // the postures are one organism recovering, not three columns
  { a: 'restoration', b: 'agency', weight: 1.3 },
  { a: 'agency', b: 'meaning', weight: 1.45 },
  ...POSTURES.flatMap(p => [
    { a: p.id, b: `${p.id}-trap`, faint: true },
    { a: p.id, b: `${p.id}-ethic`, weight: 1.15 }
  ])
];

export const CognitivePosturesDiagram: React.FC<CognitivePosturesDiagramProps> = () => (
  <LivingFigure
    id={ID}
    width={800}
    height={330}
    nodes={NODES}
    edges={EDGES}
    core="restoration"
    caption=""
    tag=""
    footLeft=""
    footRight=""
    /* Says what the row IS, so the strip stops falling back to "touch a cell to
       read it" — redundant on the stage, untrue in the page preview. */
    rest={{
      kind: 'Three postures · one organism, met at three moments',
      body: 'Each state carries the trap it invites, low and dim, against the response it is owed'
    }}
  />
);
