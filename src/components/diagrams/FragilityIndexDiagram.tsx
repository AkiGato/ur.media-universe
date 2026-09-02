import React from 'react';
import { LivingFigure, FigureNode, FigureEdge } from '../figures/LivingFigure';

interface FragilityIndexDiagramProps {
  isDark?: boolean;
}

const ID = 'fig-fragility';

/**
 * FIG 2.3 — The fragility index, drawn as one tenancy with four load paths.
 *
 * 2.3 names four structural fractures and numbers them, and the obvious figure
 * is four cells in a row under a headline. **A List Is Not a Cause** (FW-09)
 * retired exactly that shape once already, on FIG 3.1, and for the same reason
 * it would be wrong here: the section does not argue four peers. It argues one
 * dependency — "conducting your entire distribution strategy on someone else's
 * property" — and closes by saying so outright: *when the system fractures, the
 * brands dependent on it fracture with it*.
 *
 * So the four fractures are not the subject. The tenancy is. The platform sits
 * above, the brand below, and everything the brand has reaches it through four
 * fibres it does not own. Read down it is a landlord's leverage; read up — the
 * direction a brand actually experiences it — it is four ways the address stops
 * being an address.
 *
 * Every fibre into the brand is `faint`: a process being stripped rather than a
 * load-bearing bundle, which is what a rented connection is.
 */

/* Two-word names with the sentence moved into `reading`/`detail` — the label
   collision budget (TY-08), and the four names are the taxonomy, so they are
   legible at rest under the narrow exemption in TY-07. Everything printed here
   is the manuscript's own wording; nothing is written for the drawing. */
const FRACTURES: Array<{
  id: string; x: number; label: string; sub: string;
  /** how loaded this path is — 2.3 measures only the first */
  load: number;
  reading: { kind: string; body: string };
  detail: string[];
}> = [
  {
    id: 'monopoly', x: 116, label: 'MONOPOLY', sub: "someone else's property",
    load: 1,
    reading: {
      kind: 'Fracture · the address is rented',
      body: 'A single platform controls the building, writes the lease, changes the rules mid-tenancy, and collects rent regardless of outcome'
    },
    detail: [
      'In 2021, one such platform adjusted its algorithm. Organic reach dropped an estimated 52% within twelve months.',
      'Brands that had spent years building audiences inside that architecture lost access to them.'
    ]
  },
  {
    id: 'finite', x: 306, label: 'FINITE ATTENTION', sub: 'fixed cognitive bandwidth',
    load: 0.82,
    reading: {
      kind: 'Fracture · the resource does not grow',
      body: 'Simon established in 1971 that in an information-rich world, the scarce resource is not content but the human attention required to receive it'
    },
    detail: [
      'Every additional feed, every additional notification, every additional platform competes for the same fixed cognitive bandwidth.'
    ]
  },
  {
    id: 'regulatory', x: 496, label: 'REGULATORY LAG', sub: 'the compliance wave',
    load: 0.68,
    reading: {
      kind: 'Fracture · the ground is moving',
      body: 'The operating model was calibrated for a regulatory environment that no longer exists'
    },
    detail: [
      'Legacy platforms cannot retrofit ethical architecture under legal pressure at the pace the compliance wave is moving.'
    ]
  },
  {
    id: 'trust', x: 686, label: 'BORROWED TRUST', sub: 'rented, and in freefall',
    load: 0.93,
    reading: {
      kind: 'Fracture · none of it is owned',
      body: 'Platform credibility, influencer authority, algorithmic reach — none of it belongs to the brand'
    },
    detail: [
      'All of it is rented from systems whose trust is in measurable structural freefall.',
      'When the system fractures, the brands dependent on it fracture with it.'
    ]
  }
];

const LIT_NAME = 0.5;
const LIT_END = 0.66;

const NODES: FigureNode[] = [
  {
    id: 'platform',
    kind: 'core',
    x: 400, y: 62, r: 29,
    label: 'THE PLATFORM',
    sub: 'writes the lease',
    labelAt: 'above',
    labelAtRest: LIT_END,
    intensity: 1,
    reading: {
      kind: 'The landlord · three billion through the building every day',
      body: 'When a single platform controls the building and collects rent regardless of outcome, brands have no viable alternative address'
    },
    detail: [
      'It is the logical consequence of conducting your entire distribution strategy on someone else’s property.'
    ]
  },
  ...FRACTURES.map(f => ({
    id: f.id,
    kind: 'cell' as const,
    x: f.x, y: 182, r: 15,
    label: f.label,
    sub: f.sub,
    labelAtRest: LIT_NAME,
    /* Brightness carries how loaded the path is. 2.3 measures only the first
       (52% in twelve months); the rest are ordered by the weight the section
       gives them, not by a number it never states. */
    intensity: 0.62 + f.load * 0.38,
    reading: f.reading,
    detail: f.detail
  })),
  {
    id: 'brand',
    kind: 'cell',
    x: 400, y: 300, r: 23,
    label: 'THE BRAND',
    sub: 'no viable alternative address',
    labelAt: 'below',
    labelAtRest: LIT_END,
    /* Dimmer than the platform it hangs from, because that is the claim. */
    intensity: 0.6,
    reading: {
      kind: 'The tenant · what fractures when the system does',
      body: 'When the system fractures, the brands dependent on it fracture with it'
    },
    detail: [
      'A system is fragile when it benefits from stability and suffers disproportionately from volatility.'
    ]
  }
];

const EDGES: FigureEdge[] = [
  /* Down from the landlord: load-bearing, and the heavier the fracture the
     heavier the fibre that delivers it. */
  ...FRACTURES.map(f => ({ a: 'platform', b: f.id, weight: 0.9 + f.load * 0.6 })),
  /* Into the tenant: every one of them faint. Nothing here is owned, and a
     rented process is one that is already being stripped. */
  ...FRACTURES.map(f => ({ a: f.id, b: 'brand', faint: true }))
];

export const FragilityIndexDiagram: React.FC<FragilityIndexDiagramProps> = () => (
  <LivingFigure
    id={ID}
    width={800}
    height={368}
    nodes={NODES}
    edges={EDGES}
    core="platform"
    caption=""
    tag=""
    footLeft=""
    footRight=""
    rest={{
      kind: 'Four fractures · one tenancy',
      body: 'When the system fractures, the brands dependent on it fracture with it'
    }}
  />
);
