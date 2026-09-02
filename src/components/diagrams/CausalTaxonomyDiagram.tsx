import React, { useEffect, useRef, useState } from 'react';
import { LivingFigure, FigureNode, FigureEdge } from '../figures/LivingFigure';
import { CausalTaxonomyDemo } from './CausalTaxonomyDemo';

interface CausalTaxonomyDiagramProps {
  isDark?: boolean;
}

const ID = 'fig-taxonomy';

/**
 * FIG 3.1 — Two roots meet, and what they make of you.
 *
 * This drew the taxonomy as three parallel columns hanging under a headline —
 * economic, historical, neuro-psychological, side by side, equal and separate.
 * That is how the chapter first names them, and it is a weaker claim than the
 * chapter itself goes on to make: *"Economic conditions and historical sequences
 * are external. They exist in the world… The neuro-psychological root is
 * internal: the cognitive and emotional architecture that the story is landing
 * inside."* Two of the three are causes out in the world. The third is not a
 * third cause. It is what the first two produce when they arrive somewhere.
 *
 * So the figure is now a causal ordering rather than a list:
 *
 *   the surface     The news event, on top — the only part that is reported.
 *
 *   two roots       Historical/cultural on one side, economic/political on the
 *                   other. External, mappable, and indifferent to you.
 *
 *   the meeting     They converge. The convergence is drawn as the densest cell
 *                   in the figure because a convergence is not a junction: it is
 *                   where two orders of causation become one condition.
 *
 *   the reader      Demographics sit on the fibre between that convergence and
 *                   the response — not as a fourth cause but as a *relay*, the
 *                   position from which the convergence is received. The same
 *                   meeting reaches a different reader as a different event.
 *
 *   the response    Psychology at the bottom: not a root you go and look up, but
 *                   the specific thing the other two made happen in you.
 *
 * Read down and it is causal. Read up — which is how a reader actually arrives,
 * at the headline — and it is the deconstruction the chapter asks for.
 */

/**
 * Each finding carries a short name and the full line it stands for: at figure
 * scale a full sentence under a cell writes straight over its neighbour, so
 * the sentence lives in the reading strip and the cell keeps two words.
 */
const ROOTS: Array<{
  id: string; x: number; y: number; title: string; sub: string; glyph: string;
  weight: number; items: Array<[string, string, string, number, number]>; body: string;
}> = [
  {
    id: 'historical', x: 156, y: 168, title: 'HISTORICAL', sub: 'History & culture', glyph: '⧗',
    weight: 1.25,
    body: 'The sequence already running when this event arrived, and the culture it runs inside',
    items: [
      ['PRECEDENT', 'Regulatory precedents', 'the rules already written', 44, 92],
      ['INERTIA', 'Path-dependent inertia', 'yesterday’s decision, still load-bearing', 36, 232],
      ['CULTURE', 'Inherited cultural frame', 'the story a place already tells about itself', 128, 282]
    ]
  },
  {
    id: 'economic', x: 644, y: 168, title: 'ECONOMIC', sub: 'Economy & politics', glyph: '$',
    weight: 1.25,
    body: 'Who holds an interest — financial or political — in this framing being the one that travels',
    items: [
      ['REVENUE', 'Revenue model incentives', 'the framing that sells the inventory', 756, 92],
      ['CAPITAL', 'Capital allocation force', 'what gets funded gets published', 764, 232],
      ['POLITICS', 'Political utility', 'whose position this framing improves', 672, 282]
    ]
  }
];

/*
 * Two depths of the same figure.
 *
 * SURFACE is what System 1 reads: the event on top and mass underneath, with
 * nothing written on the drawing. You see in a second that the reported part is
 * the small bright thing and that it sits on something much larger — which is
 * the chapter's whole claim, delivered without a word being read. Touch still
 * answers, so curiosity is met immediately rather than deferred.
 *
 * STRUCTURE is what System 2 reads: every register and every finding named.
 *
 * The surface layer is NOT a teaser. Most readers will never open the second,
 * and that has to be fine — they got the actual argument, not a trailer for it.
 * The second layer adds resolution; it never supplies the point.
 */
type Depth = 'surface' | 'structure' | 'live';

const buildNodes = (depth: Depth): FigureNode[] => {
  const deep = depth === 'structure';
  /* Names are legible at rest only in the structure depth. The surface depth is
     the System 1 read — a small bright event, a heavy meeting under it, and a
     response at the bottom — and it says that without a word being read. */
  const lit = deep ? 0.72 : 0;
  return [
    {
      id: 'headline',
      kind: 'core',
      // low enough that the name above it clears the top of the frame
      x: 400, y: 62, r: 22,
      label: deep ? 'THE NEWS' : undefined,
      sub: deep ? 'the surface, and the only part reported' : undefined,
      labelAtRest: lit,
      glyph: '!',
      glyphAtRest: 0.7,
      labelAt: 'above',
      reading: {
        kind: 'Surface · the event as delivered',
        body: 'What happened, stripped of everything that made it happen'
      },
      detail: deep
        ? [
            'Outrage journalism operates entirely at this depth and calls that reporting.',
            'Nothing below is an opinion about the event. They are the conditions that produced it.'
          ]
        : undefined
    },
    ...ROOTS.map(r => ({
      id: r.id,
      kind: 'cell' as const,
      x: r.x, y: r.y, r: 24,
      label: deep ? r.title : undefined,
      sub: deep ? r.sub : undefined,
      labelAtRest: lit,
      glyph: deep ? r.glyph : undefined,
      intensity: deep ? 1 : 0.7,
      reading: { kind: `External root · ${r.title.toLowerCase()}`, body: r.body },
      detail: deep ? r.items.map(([, full, t]) => `${full} — ${t}`) : undefined
    })),
    {
      /* Where the two orders of causation stop being two. Densest cell in the
         figure and the smallest — a convergence is a condition, not a container. */
      id: 'meeting',
      kind: 'cell',
      x: 400, y: 168, r: 15,
      label: deep ? 'THEY MEET' : undefined,
      labelAtRest: lit,
      labelDy: -6,
      arborArms: 11,
      arborR: 66,
      reading: {
        kind: 'The meeting · two causes becoming one condition',
        body: 'Neither root explains this alone; what reaches you is what they made together'
      },
      detail: deep
        ? [
            'A history without an economy is a story. An economy without a history is a spreadsheet.',
            'The event you meet is their product, and it arrives already fused.'
          ]
        : undefined
    },
    {
      /* Not a fourth cause — a relay. The position the meeting is received from,
         which is why the same convergence lands as a different event on the next
         person. Drawn small and on the fibre, as every relay in this system is. */
      id: 'demographic',
      kind: 'minor',
      x: 400, y: 240, r: 9,
      label: deep ? 'YOUR POSITION' : undefined,
      labelAtRest: lit * 0.85,
      intensity: deep ? 0.8 : 0.5,
      reading: {
        kind: 'Your position · where the meeting is received from',
        body: 'Age, place, class, language — the same convergence reaches the next reader as a different event'
      },
      detail: deep
        ? [
            'This is not a cause. It is the angle of arrival, and it changes what arrives.',
            'It is also the only term in the figure that the reader cannot audit in the world, because it is them.'
          ]
        : undefined
    },
    {
      id: 'psychology',
      kind: 'cell',
      x: 400, y: 312, r: 24,
      label: deep ? 'PSYCHOLOGY' : undefined,
      sub: deep ? 'the response produced in you' : undefined,
      labelAtRest: lit,
      glyph: deep ? '⌁' : undefined,
      intensity: deep ? 1 : 0.72,
      reading: {
        kind: 'The response · what the meeting made of you',
        body: 'Not a third root to go and look up — the specific thing the other two produced in you'
      },
      detail: deep
        ? [
            'Fear of the other, belonging anxiety, loss aversion, status competition.',
            'The register is internal, so it is the one you cannot check by reading more news.',
            'It is also the one the framing was built to land on.'
          ]
        : undefined
    },
    /* what each external root terminates in — dim, load-bearing, and pushed
       outward so no two names are written close enough to touch */
    ...ROOTS.flatMap(r =>
      r.items.map(([short, full, t, fx, fy], k) => ({
        id: `${r.id}-${k}`,
        kind: 'minor' as const,
        x: fx, y: fy, r: 7,
        label: deep ? short : undefined,
        labelAtRest: lit * 0.8,
        intensity: deep ? 0.62 : 0.34,
        reading: { kind: `${r.title} · finding`, body: `${full} — ${t}` }
      }))
    )
  ];
};

/*
 * The diamond of the sketch, and the causal order it encodes.
 *
 * The surface reaches both roots, the roots meet, the meeting passes through the
 * reader's own position, and a response comes out. The two long diagonals from
 * root to response are the same claim drawn the short way — each root reaches you
 * directly as well as through the meeting — and they are faint because that is
 * the weaker path: what actually lands is the fused thing.
 */
const EDGES: FigureEdge[] = [
  ...ROOTS.map(r => ({ a: 'headline', b: r.id, weight: r.weight })),
  { a: 'headline', b: 'meeting', weight: 1.5 },
  ...ROOTS.map(r => ({ a: r.id, b: 'meeting', weight: 1.6 })),
  { a: 'meeting', b: 'demographic', weight: 1.7 },
  { a: 'demographic', b: 'psychology', weight: 1.7 },
  ...ROOTS.map(r => ({ a: r.id, b: 'psychology', faint: true })),
  ...ROOTS.flatMap(r => r.items.map((_, k) => ({ a: r.id, b: `${r.id}-${k}`, weight: 0.85 })))
];

export const CausalTaxonomyDiagram: React.FC<CausalTaxonomyDiagramProps> = () => {
  const [depth, setDepth] = useState<Depth>('surface');
  const deep = depth === 'structure';

  /* The descent, under the wheel.

     The two depths are a vertical relation — the structure is *under* the
     surface — so the gesture that reaches it is the one that means down. The
     button stays: this is a second way in, not a replacement, and it is the
     only one a keyboard or a thumb has.

     LY-02: the event is always cancelled, so no vertical scroll is ever
     produced — the wheel is being read as a direction, not as a scrollbar.
     Horizontal intent is left alone, or shift-wheel would stop reaching the
     figure's own overflow.

     MO-03: it answers the moment the gesture passes the threshold, then goes
     deaf for 600ms. Trackpad momentum keeps firing long after the fingers
     have lifted, and without the cooldown one flick falls through both depths
     and back out again. */
  const stageRef = useRef<HTMLDivElement>(null);
  const travelRef = useRef(0);
  const deafRef = useRef(0);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || depth === 'live') return;
    const THRESHOLD = 90;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (e.timeStamp < deafRef.current) return;
      travelRef.current += e.deltaY;
      if (travelRef.current > THRESHOLD && depth === 'surface') {
        setDepth('structure');
      } else if (travelRef.current < -THRESHOLD && depth === 'structure') {
        setDepth('surface');
      } else if (Math.abs(travelRef.current) <= THRESHOLD) {
        return;
      }
      travelRef.current = 0;
      deafRef.current = e.timeStamp + 600;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [depth]);

  /* The third depth is the same figure with the reader's own source in it.
     Kept behind the two static layers rather than replacing them: the chapter's
     example is the argument, and the live reading is the argument being used. */
  if (depth === 'live') {
    return (
      <div className="w-full flex flex-col items-center">
        <CausalTaxonomyDemo />
        <button
          onClick={() => setDepth('structure')}
          className="mt-1 px-2 py-1 text-[9px] font-light uppercase tracking-[0.2em] opacity-45 hover:opacity-90 outline-none rounded-none"
          style={{ transition: 'opacity 0.6s var(--ease-organic)' }}
        >
          Back to the chapter's example
        </button>
      </div>
    );
  }

  return (
    <div ref={stageRef} className="w-full flex flex-col items-center">
      <LivingFigure
        id={ID}
        width={800}
        height={368}
        nodes={buildNodes(depth)}
        edges={EDGES}
        core="headline"
        rest={deep
          ? {
              kind: 'Causal order · two roots, a meeting, a response',
              body: 'The response at the bottom is not a third cause — it is what the other two made of you'
            }
          : {
              kind: 'The surface, and what it made of you',
              body: 'The reported part is the small bright one at the top; everything under it is why'
            }}
        caption=""
        tag=""
        footLeft=""
        footRight=""
      />

      {/*
        The descent.

        Bare type, like every control in this app, and worded as the figure's own
        subject rather than as an instruction to the reader. It never gates: the
        surface layer already carries the claim, so this offers resolution, not
        the answer. Reversible in one touch, and nothing anywhere records which
        depth was reached.
      */}
      <div className="mt-1 flex items-center gap-5">
        <button
          onClick={() => setDepth(deep ? 'surface' : 'structure')}
          className="px-2 py-1 text-[9px] font-light uppercase tracking-[0.2em] opacity-45 hover:opacity-90 outline-none rounded-none"
          style={{ transition: 'opacity 0.6s var(--ease-organic)' }}
        >
          {deep ? 'Return to the surface' : 'Descend to the structure'}
        </button>
        {/* The method, turned on something of the reader's own. A taxonomy you
            can only watch being applied to one chosen example is a claim; one
            you can point at your own morning feed is a tool. */}
        <button
          onClick={() => setDepth('live')}
          className="px-2 py-1 text-[9px] font-light uppercase tracking-[0.2em] opacity-45 hover:opacity-90 outline-none rounded-none"
          style={{ transition: 'opacity 0.6s var(--ease-organic)' }}
        >
          Run it on your own source
        </button>
      </div>
    </div>
  );
};
