import React from 'react';
import { LivingFigure, FigureLayout, FigureNode, FigureEdge } from '../figures/LivingFigure';

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
  id: string; x: number;
  /** where this fracture sits when the sheet is taller than it is wide */
  px: number; py: number;
  label: string; sub: string;
  /** how loaded this path is — 2.3 measures only the first */
  load: number;
  reading: { kind: string; body: string };
  detail: string[];
}> = [
  {
    id: 'monopoly', x: 116, px: 104, py: 196, label: 'MONOPOLY', sub: "someone else's property",
    load: 1,
    reading: {
      kind: 'Fracture · the address is rented',
      body: 'A single platform controls the building, writes the lease, changes the rules mid-tenancy, and collects rent regardless of outcome'
    },
    detail: [
      'In 2021, one such platform adjusted its algorithm.',
      'Brands that had spent years building audiences inside that architecture lost access to them.'
    ]
  },
  {
    id: 'finite', x: 306, px: 252, py: 276, label: 'FINITE ATTENTION', sub: 'fixed cognitive bandwidth',
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
    id: 'regulatory', x: 496, px: 100, py: 356, label: 'REGULATORY LAG', sub: 'the compliance wave',
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
    id: 'trust', x: 686, px: 248, py: 436, label: 'BORROWED TRUST', sub: 'rented, and in freefall',
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

/* ------------------------------------------------------------- portrait --
 *
 * THE TENANCY STANDS UP, AND IT IS THE SAME TENANCY.
 *
 * The wide form is a bowtie: the landlord above, four rented paths across the
 * middle, the tenant below. Four names of up to sixteen characters cannot sit
 * in a row across 360 units — FINITE ATTENTION alone is about 106 — so in the
 * narrow form the four fractures run DOWN the corridor between the two cells
 * instead of across it.
 *
 * The order is preserved and the reading is unchanged: down from the landlord
 * is leverage, up from the tenant is four ways the address stops being an
 * address. What the narrow form gains is that the four are no longer a row,
 * and a row is the one thing FW-09 says this figure must not be mistaken for —
 * so they are staggered left and right rather than filed into a column, which
 * also fans the eight fibres instead of stacking them in one channel.
 *
 * Nothing here is a scale, so nothing is anchored: the stagger is placement,
 * and x means no more in this form than it does in the wide one.
 */
const PW = 360;
const PH = 640;
const P_PLATFORM = { x: 180, y: 84 };
const P_BRAND = { x: 180, y: 546 };

/**
 * One description of the tenancy, placed twice.
 *
 * Only the coordinates and the field radii differ; every name, reading and
 * detail below is written once. See FigureLayout in LivingFigure for why a
 * second node array is not an option.
 */
const build = (place: {
  platform: { x: number; y: number };
  fracture: (f: typeof FRACTURES[number]) => { x: number; y: number };
  brand: { x: number; y: number };
  /* Not content. A 110-unit field is an eighth of the wide sheet and a third of
     the narrow one, and the landlord's would leave the frame entirely. */
  platformArbor?: number;
  fractureArbor?: number;
  brandArbor?: number;
}): FigureNode[] => [
  {
    id: 'platform',
    kind: 'core',
    ...place.platform, r: 29,
    ...(place.platformArbor ? { arborR: place.platformArbor } : {}),
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
    ...place.fracture(f), r: 15,
    ...(place.fractureArbor ? { arborR: place.fractureArbor } : {}),
    label: f.label,
    sub: f.sub,
    labelAtRest: LIT_NAME,
    /* Brightness carries how loaded the path is. 2.3 gives only the first a
       dated event (the 2021 algorithm change); the rest are ordered by the
       weight the section gives them, not by a number it never states. */
    intensity: 0.62 + f.load * 0.38,
    reading: f.reading,
    detail: f.detail
  })),
  {
    id: 'brand',
    kind: 'cell',
    ...place.brand, r: 23,
    ...(place.brandArbor ? { arborR: place.brandArbor } : {}),
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

const NODES: FigureNode[] = build({
  platform: { x: 400, y: 62 },
  fracture: (f) => ({ x: f.x, y: 182 }),
  brand: { x: 400, y: 300 }
});

const PORTRAIT_NODES: FigureNode[] = build({
  platform: P_PLATFORM,
  fracture: (f) => ({ x: f.px, y: f.py }),
  brand: P_BRAND,
  platformArbor: 76,
  fractureArbor: 42,
  brandArbor: 62
});

const EDGES: FigureEdge[] = [
  /* Down from the landlord: load-bearing, and the heavier the fracture the
     heavier the fibre that delivers it. */
  ...FRACTURES.map(f => ({ a: 'platform', b: f.id, weight: 0.9 + f.load * 0.6 })),
  /* Into the tenant: every one of them faint. Nothing here is owned, and a
     rented process is one that is already being stripped. */
  ...FRACTURES.map(f => ({ a: f.id, b: 'brand', faint: true }))
];

const PORTRAIT: FigureLayout = { width: PW, height: PH, nodes: PORTRAIT_NODES };

export const FragilityIndexDiagram: React.FC<FragilityIndexDiagramProps> = () => (
  <LivingFigure
    id={ID}
    width={800}
    height={368}
    nodes={NODES}
    portrait={PORTRAIT}
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
