import React, { useState } from 'react';
import { LivingFigure, FigureLayout, FigureNode, FigureEdge } from '../figures/LivingFigure';
import { FigureInertContext } from '../figures/FigurePrimitives';
import { CartesianPlane } from '../figures/FigurePlane';
import { SomaLabel } from '../organic/Organic';
import {
  ARMS, ASSUMPTIONS, FACES, FaceId, FIGURE_READINGS, HORIZON, PROJECTION, SENSITIVITY, STRUCTURAL
} from '../../data/trendwatch';

interface TwoTrajectoriesDiagramProps {
  isDark?: boolean;
}

const W = 860;
const H = 412;

/**
 * TRENDWATCH V — one shock, two postures, drawn three ways.
 *
 * This is the figure the whole addendum is for, and it is the one that could
 * most easily have lied. A single drawing of two diverging curves would have
 * made a modelled arm and a measured arm look like two readings of the same
 * kind, which is the move Chapter IV exists to take apart. So the comparison is
 * drawn on three faces instead, and which face RESTS is the load-bearing
 * decision:
 *
 *   STRUCTURE    rests. No quantity anywhere on it. It is the dependency
 *                structure the two postures have, and it would still be the
 *                argument if every coefficient in the model were wrong.
 *   MODEL        the two trajectories, sharing one origin because the arms are
 *                identical at t=0 by construction.
 *   ASSUMPTIONS  what the second face was built out of, split by POSITION into
 *                what was measured and what was chosen.
 *
 * DV-07 says a figure's claim must survive every interaction being unused. The
 * resting face is the strong form of that: it survives the reader never
 * touching it AND the reader disbelieving the model.
 *
 * Three faces are three LivingFigures with three ids rather than one figure
 * whose nodes swap, because formation is latched per id (FIGURES_FORMED) — a
 * single id would replay the arrival animation on every flip, which is a
 * drawing performing for the reader, and the thing this dossier argues against.
 */

/* ------------------------------------------------------------- structure --
 *
 * Two courses out of one origin, passing the five dimensions. The dimension
 * names sit in a row BELOW both courses, off any scale — the same device the
 * withdrawal figure uses — because a name placed between two courses on a sheet
 * where height means something would be read as a reading.
 */
const S_STATION_X = [214, 348, 482, 616, 744];
const S_EXTRACTIVE_Y = [232, 258, 284, 308, 328];
const S_ANTIFRAGILE_Y = [180, 164, 148, 134, 122];
const S_NAME_ROW = 380;

/* ------------------------------------------------------------- portrait --
 *
 * The same face stood up: the shock at the top, the two courses running down
 * the page, and the divergence — which is the whole of what this face says —
 * carried on the horizontal instead of the vertical.
 *
 * THE NAMES ARE STILL OUTSIDE BOTH COURSES. The wide form parks them below the
 * pair rather than between it, because a name sitting between two courses on a
 * sheet where the gap means something is read as a position in that gap. The
 * gap here is horizontal, so the column left of both courses is the same place
 * that row was: outside the thing being measured, where nothing can be
 * mistaken for a reading of it. Between the courses would be the one position
 * the wide form rejected, drawn ninety degrees round.
 */
const P_W = 360;
const P_H = 560;
const P_S_ORIGIN = { x: 244, y: 110 };
const P_S_DEPTH = [188, 262, 336, 410, 484];
/* The courses spread apart as they run, in the proportions the wide form has.
   Shifted right once, MEASURED: at 232/128 the terminal name CONTINUING came
   within 14 units of REGULATION in the name column — no overlap, and 14 units
   is 15px at the width this form is for, which is two labels touching. At 244
   the gap is 42. TY-08 is about labels fitting; this is the other half of it. */
const P_S_EXTRACTIVE_X = [218, 202, 186, 168, 152];
const P_S_ANTIFRAGILE_X = [268, 282, 296, 312, 326];
/** left of both courses, where no divergence can reach */
const P_S_NAME_COL = 46;

/**
 * The structural face, described once and placed twice.
 *
 * Every string, every reading and every brightness below belongs to the cell
 * rather than to the rectangle; only the four coordinate functions change
 * between the wide form and the narrow one. See FigureLayout in LivingFigure
 * for why this is not two node arrays.
 */
const structureNodes = (place: {
  origin: { x: number; y: number };
  ext: (i: number) => { x: number; y: number };
  anti: (i: number) => { x: number; y: number };
  name: (i: number) => { x: number; y: number };
  /* THE ARBOR BUDGET, AND IT IS PF-01 NOT TASTE.
     This face carries sixteen cells and every one of them grew an arbor at the
     default r*3.8 with the default arm count, which made it the heaviest figure
     in the app: measured 4,609 SVG nodes against the previous heaviest at
     3,338, and 105.4ms a frame against PF-01's threshold of 85. It was the only
     figure over budget. The stations are small marks on a course rather than
     cells anyone studies, so they take a smaller arbor and fewer arms; the name
     row smaller still, being a caption row. The origin keeps its full arbor,
     because that is the cell the tide rolls from. Measured after: 3,524 nodes,
     72.8ms. The narrow form takes the fields in further still — a 57-unit
     field is a fifteenth of the wide sheet and a sixth of the narrow one. */
  stationArbor: number;
  nameArbor: number;
}): FigureNode[] => [
  {
    id: 's-origin',
    kind: 'core',
    ...place.origin, r: 26,
    label: ARMS.shock,
    labelAt: 'above',
    labelAtRest: 0.62,
    intensity: 1,
    reading: {
      kind: ARMS.shock,
      body: FIGURE_READINGS.shock
    }
  },
  ...STRUCTURAL.map((s, i) => ({
    id: `s-ext-${s.id}`,
    kind: 'cell' as const,
    ...place.ext(i),
    r: 15,
    arborR: place.stationArbor, arborArms: 4,
    /* Only the terminal is named. The dimension is named once, in the row
       below, and naming it again on each of its two cells would say the same
       string three times in one frame (TY-05). */
    ...(i === STRUCTURAL.length - 1
      ? { label: ARMS.extractive, labelAt: 'above' as const, labelAtRest: 0.62 }
      : {}),
    intensity: 0.72 - i * 0.09,
    reading: { kind: `${s.short} · ${ARMS.extractive}`, body: s.extractive }
  })),
  ...STRUCTURAL.map((s, i) => ({
    id: `s-anti-${s.id}`,
    kind: 'cell' as const,
    ...place.anti(i),
    r: 15,
    arborR: place.stationArbor, arborArms: 4,
    ...(i === STRUCTURAL.length - 1
      ? { label: ARMS.antifragile, labelAt: 'above' as const, labelAtRest: 0.62 }
      : {}),
    intensity: 0.62 + i * 0.07,
    reading: { kind: `${s.short} · ${ARMS.antifragile}`, body: s.antifragile }
  })),
  ...STRUCTURAL.map((s, i) => ({
    id: `s-name-${s.id}`,
    kind: 'cell' as const,
    ...place.name(i),
    r: 11,
    arborR: place.nameArbor, arborArms: 3,
    label: s.short,
    labelAt: 'below' as const,
    /* THE AXIS IS READ, NOT DISCOVERED.

       TY-07 already exempts this face — the five dimensions ARE the taxonomy —
       but 0.54 was a taxonomy's resting weight, not an axis's. These names now
       sit ON a plane and label its columns, and a coordinate whose axis you
       have to touch to read is a coordinate you cannot use: the reader's report
       was the plain form of it, that the graph is not clear. Asked for
       directly, "always visible". At 0.86 they read as the frame's own type
       against a drawing that sits well above them in weight. */
    labelAtRest: 0.86,
    intensity: 0.4,
    reading: { kind: s.short, body: s.extractive },
    detail: [s.antifragile]
  }))
];

const STRUCTURE_NODES: FigureNode[] = structureNodes({
  origin: { x: 76, y: 206 },
  ext: (i) => ({ x: S_STATION_X[i], y: S_EXTRACTIVE_Y[i] }),
  anti: (i) => ({ x: S_STATION_X[i], y: S_ANTIFRAGILE_Y[i] }),
  name: (i) => ({ x: S_STATION_X[i], y: S_NAME_ROW }),
  stationArbor: 28,
  nameArbor: 18
});

const P_STRUCTURE_NODES: FigureNode[] = structureNodes({
  origin: P_S_ORIGIN,
  ext: (i) => ({ x: P_S_EXTRACTIVE_X[i], y: P_S_DEPTH[i] }),
  anti: (i) => ({ x: P_S_ANTIFRAGILE_X[i], y: P_S_DEPTH[i] }),
  name: (i) => ({ x: P_S_NAME_COL, y: P_S_DEPTH[i] }),
  stationArbor: 22,
  nameArbor: 15
});

const chain = (ids: string[], weight: number): FigureEdge[] =>
  ids.slice(1).map((b, i) => ({ a: ids[i], b, weight }));

const STRUCTURE_EDGES: FigureEdge[] = [
  ...chain(['s-origin', ...STRUCTURAL.map((s) => `s-ext-${s.id}`)], 1.3),
  ...chain(['s-origin', ...STRUCTURAL.map((s) => `s-anti-${s.id}`)], 1.3)
];

/* ----------------------------------------------------------------- model --
 *
 * One origin, because both arms are indexed to 100 at the start and drawing
 * them as two cells at one coordinate would be two marks for one fact.
 */
const M_V_MAX = 112;
const M_Y_TOP = 100;
const M_Y_BASE = 338;
const my = (v: number) => M_Y_BASE - (v / M_V_MAX) * (M_Y_BASE - M_Y_TOP);
const M_X = [86, 204, 322, 440, 558, 676, 788];

/* ------------------------------------------------------------- portrait --
 *
 * The axes swap and nothing else does. Index moves to the horizontal and the
 * seven years run down the page, which costs this face nothing for the reason
 * it costs the interval figure nothing: GR-01 forbids the drawing an axis, so
 * there is no ruled scale to re-rule — the reading is the position and the
 * glyph on the terminal cell quotes it.
 *
 * Zero is anchored here as it is in the wide form (`M_X0` is where an index of
 * nothing would fall, exactly as `M_Y_BASE` is), so the distance between the
 * two arms at the horizon is the same fraction of the same scale on either
 * sheet. That distance is the entire finding — the arms never cross, neither
 * grows, and the gap widens — and it is the one thing a re-layout could
 * silently have exaggerated.
 */
const M_X0 = 56;
const M_X1 = 312;
const mx = (v: number) => M_X0 + (v / M_V_MAX) * (M_X1 - M_X0);
const P_M_Y = [96, 167, 238, 309, 380, 451, 522];
const P_M_H = 590;

const modelArm = (
  key: 'extractive' | 'antifragile',
  name: string,
  baseIntensity: number,
  place: (i: number, v: number) => { x: number; y: number },
  arbor?: { station: number; terminal: number }
): FigureNode[] =>
  PROJECTION.slice(1).map((p, i) => {
    const last = i === PROJECTION.length - 2;
    return {
      id: `m-${key}-${p.year}`,
      kind: 'cell' as const,
      ...place(i + 1, p[key]),
      r: last ? 19 : 13,
      ...(arbor ? { arborR: last ? arbor.terminal : arbor.station } : {}),
      ...(last
        ? {
            label: name,
            labelAt: (key === 'extractive' ? 'below' : 'above') as 'below' | 'above',
            labelAtRest: 0.62,
            glyph: String(Math.round(p[key])),
            glyphAtRest: 0.82
          }
        : {}),
      intensity: baseIntensity,
      reading: { kind: `${name} · ${p.year}`, body: `Index ${p[key].toFixed(1)}, against 100 at ${HORIZON.from}.` }
    };
  });

/**
 * The model face, described once and placed twice.
 *
 * `place` takes the step index and the value, and returns where that reading
 * goes; everything else — the names, the glyphs, the readings, which arm burns
 * brighter — is the same object in both forms.
 */
const modelNodes = (
  place: (i: number, v: number) => { x: number; y: number },
  arbor?: { origin: number; station: number; terminal: number }
): FigureNode[] => [
  {
    id: 'm-origin',
    kind: 'core',
    ...place(0, 100), r: 24,
    ...(arbor ? { arborR: arbor.origin } : {}),
    label: String(HORIZON.from),
    labelAt: 'above',
    labelAtRest: 0.62,
    glyph: '100',
    glyphAtRest: 0.82,
    intensity: 1,
    reading: {
      kind: `${HORIZON.from} · both arms`,
      body: FIGURE_READINGS.origin
    }
  },
  ...modelArm('extractive', ARMS.extractive, 0.56, place, arbor),
  ...modelArm('antifragile', ARMS.antifragile, 0.86, place, arbor)
];

const MODEL_NODES: FigureNode[] = modelNodes((i, v) => ({ x: M_X[i], y: my(v) }));

const P_MODEL_NODES: FigureNode[] = modelNodes(
  (i, v) => ({ x: mx(v), y: P_M_Y[i] }),
  { origin: 56, station: 34, terminal: 46 }
);

const MODEL_EDGES: FigureEdge[] = [
  ...chain(['m-origin', ...PROJECTION.slice(1).map((p) => `m-extractive-${p.year}`)], 1.2),
  ...chain(['m-origin', ...PROJECTION.slice(1).map((p) => `m-antifragile-${p.year}`)], 1.2)
];

/* ----------------------------------------------------------- assumptions --
 *
 * Split by POSITION into measured and assumed, because that is the distinction
 * the face exists to make and position is the only channel a monochrome drawing
 * can spend on identity without lying (DV-02 — never an opacity step, opacity
 * here means light). Two clusters, each with its own name cell.
 */
const MEASURED = ASSUMPTIONS.filter((a) => a.status === 'measured');
const ASSUMED = ASSUMPTIONS.filter((a) => a.status === 'assumed');

/**
 * A cluster is a jittered COLUMN, not a ring.
 *
 * It was a ring first — golden-angle placement around a centre — and it
 * collided: `AVOIDANCE DRIFT` is fifteen characters at 8.5 units tracked
 * 0.2em, which is about 110 user units wide, and five of those cannot be laid
 * around a circle of any radius this sheet has room for without two of them
 * landing on each other. TY-08 is the rule and the arithmetic is the reason.
 *
 * A column gives every label a row of its own, so the only axis that has to be
 * negotiated is the cheap one. Grouping still happens by position — measured on
 * the left, assumed on the right — which is the whole point of the face.
 *
 * The jitter is not decoration: FW-10's principle is that nothing here is
 * evenly spaced, and a ruled column of five would read as a table, which is a
 * box by another name. It is seeded off the index so it is deterministic.
 */
const ROW_Y = [132, 184, 236, 288, 340];

/* ------------------------------------------------------------- portrait --
 *
 * THE SPLIT IS THE FACE, SO THE SPLIT DOES NOT MOVE. Measured on the left,
 * assumed on the right, in both forms. Stacking the two groups one above the
 * other would have been the easy narrow layout and it would have thrown away
 * the only channel this face has: DV-02 forbids distinguishing them by tone,
 * so position is carrying the whole distinction, and above/below reads as
 * sequence — first these, then those — where left/right reads as two kinds.
 *
 * What gives instead is the column width and the jitter. Two columns of names
 * fit a 360-unit sheet with room to spare: the longest label here is AVOIDANCE
 * DRIFT, fifteen characters at 8.5 units tracked 0.2em, which is about 99 units
 * — so the two label boxes come to 46–146 and 214–314 and clear each other by
 * 68 units. The jitter comes in to a third of its wide value, because it is
 * scattering cells inside a column a third as wide; it is still there, because
 * a ruled column of five reads as a table, which is a box by another name
 * (FW-10). It is still seeded off the index, so it is still deterministic.
 */
const P_A_H = 540;
const P_A_ROW_Y = [156, 232, 308, 384, 460];
const P_A_NAME_Y = 84;
const P_A_MEASURED_X = 96;
const P_A_ASSUMED_X = 264;

const cluster = (
  items: typeof ASSUMPTIONS,
  columnX: number,
  rows: number[],
  jitter: { x: number; y: number },
  arborR?: number
): FigureNode[] =>
  items.map((a, i) => {
    const jx = (((i * 37) % 7) - 3) * jitter.x;
    const jy = (((i * 23) % 5) - 2) * jitter.y;
    return {
      id: `a-${a.id}`,
      kind: 'cell' as const,
      x: columnX + jx,
      y: rows[i] + jy,
      r: 13,
      ...(arborR ? { arborR } : {}),
      label: a.short,
      labelAt: 'below' as const,
      labelAtRest: 0.52,
      intensity: a.status === 'measured' ? 0.86 : 0.54,
      reading: { kind: `${a.short} · ${a.value}`, body: a.statement },
      detail: [a.basis]
    };
  });

/**
 * The assumptions face, described once and placed twice.
 *
 * The two group cells and the two clusters under them are the same objects in
 * both forms; the layout supplies the two column positions, the row depths and
 * how hard to scatter within them.
 */
const assumptionNodes = (layout: {
  measuredX: number;
  assumedX: number;
  rows: number[];
  nameY: number;
  jitter: { x: number; y: number };
  arborR?: number;
}): FigureNode[] => [
  {
    id: 'a-measured',
    kind: 'core',
    /* The group name sits ABOVE its column rather than at its centre. At the
       centre it was inside the ring it named, and its own label crossed two of
       the cells it was naming. */
    x: layout.measuredX, y: layout.nameY, r: 20,
    label: 'MEASURED',
    labelAt: 'above',
    labelAtRest: 0.62,
    intensity: 1,
    reading: {
      kind: 'MEASURED',
      body: FIGURE_READINGS.measured
    }
  },
  ...cluster(MEASURED, layout.measuredX, layout.rows, layout.jitter, layout.arborR),
  {
    id: 'a-assumed',
    kind: 'cell',
    x: layout.assumedX, y: layout.nameY, r: 20,
    label: 'ASSUMED',
    labelAt: 'above',
    labelAtRest: 0.62,
    intensity: 0.6,
    reading: {
      kind: 'ASSUMED',
      body: FIGURE_READINGS.assumed
    }
  },
  ...cluster(ASSUMED, layout.assumedX, layout.rows, layout.jitter, layout.arborR)
];

const ASSUMPTION_NODES: FigureNode[] = assumptionNodes({
  measuredX: 232, assumedX: 628, rows: ROW_Y, nameY: 68,
  jitter: { x: 9, y: 4 }
});

const P_ASSUMPTION_NODES: FigureNode[] = assumptionNodes({
  measuredX: P_A_MEASURED_X, assumedX: P_A_ASSUMED_X,
  rows: P_A_ROW_Y, nameY: P_A_NAME_Y,
  /* Measured at 3: the two columns rendered as ruled files of cells, which is
     the table FW-10 is about. At 5 the scatter is visible and the longest label
     in each column still clears the other by 45 units. */
  jitter: { x: 5, y: 5 },
  arborR: 34
});

const ASSUMPTION_EDGES: FigureEdge[] = [
  ...MEASURED.map((a) => ({ a: 'a-measured', b: `a-${a.id}`, weight: 1.2 })),
  ...ASSUMED.map((a) => ({ a: 'a-assumed', b: `a-${a.id}`, weight: 1.2, faint: true }))
];

/* ------------------------------------------------------------------ faces */

const FACE_FIGURE: Record<FaceId, {
  nodes: FigureNode[]; edges: FigureEdge[]; core: string;
  /* Each face is its own drawing and stands up its own way — the structural
     face keeps its courses, the model keeps its scale, the assumptions keep
     their split — so the portrait form is declared per face rather than once
     for the figure. The heights differ for the same reason. */
  portrait: FigureLayout;
  rest: { kind: string; body: string };
}> = {
  structure: {
    nodes: STRUCTURE_NODES, edges: STRUCTURE_EDGES, core: 's-origin',
    portrait: { width: P_W, height: P_H, nodes: P_STRUCTURE_NODES },
    rest: {
      kind: 'Structure · no quantities on this face',
      body: FIGURE_READINGS.structure
    }
  },
  model: {
    nodes: MODEL_NODES, edges: MODEL_EDGES, core: 'm-origin',
    portrait: { width: P_W, height: P_M_H, nodes: P_MODEL_NODES },
    rest: {
      kind: `Scenario model · ${SENSITIVITY.years} · not a measurement`,
      body: SENSITIVITY.finding
    }
  },
  assumptions: {
    nodes: ASSUMPTION_NODES, edges: ASSUMPTION_EDGES, core: 'a-measured',
    portrait: { width: P_W, height: P_A_H, nodes: P_ASSUMPTION_NODES },
    rest: {
      kind: 'What the model rests on',
      body: `Across every setting tested the ratio between the two arms stayed between ${SENSITIVITY.ratioBand.low} and ${SENSITIVITY.ratioBand.high}.`
    }
  }
};

export const TwoTrajectoriesDiagram: React.FC<TwoTrajectoriesDiagramProps> = () => {
  const inert = React.useContext(FigureInertContext);
  const [face, setFace] = useState<FaceId>('structure');
  const f = FACE_FIGURE[face];

  return (
    <div className="relative w-full">
      {/* The face selector. Hidden in the page preview, where nothing is
          touchable — an affordance that does not answer is worse than none
          (see FigureInertContext). Drawn as somas and names, which is the same
          two marks the map uses for everything it offers, and lit by opacity
          alone: no box, no outline, no halo behind a control (LY-06, LY-08).

          IN FLOW, NOT ABSOLUTE, AND THAT WAS A BUG WORTH THE CHANGE. It was
          `absolute right-0 -top-1`, which hangs it a little above the drawing —
          fine while the drawing is a fixed-ratio SVG, and wrong the moment the
          narrow form changes that ratio: measured at 540px the three buttons
          sat at y = -13 and -23, above the top of the viewport. All three
          existed, none could be reached, and a narrow reader could see only the
          face that happens to rest. Two thirds of the figure — the model and
          the assumptions it stands on — were unreachable on a phone.

          It matters more now, not less: the portrait form is TALLER than the
          wide one, so the height above this row is exactly what a narrow reader
          gains and an absolutely-positioned selector would lose.

          A row in the flow cannot leave the frame, and it wraps rather than
          overflowing when three names do not fit a narrow sheet. */}
      {!inert && (
        <div className="mb-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          {FACES.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setFace(o.id)}
              className={`${o.id === face ? 'bud-lit' : 'bud'} rounded-none`}
              aria-pressed={o.id === face}
            >
              <SomaLabel opacity={o.id === face ? 0.92 : 0.55}>{o.name}</SomaLabel>
            </button>
          ))}
        </div>
      )}
      <LivingFigure
        /* A READING, NOT AN ORGANISM — taut filaments and light emitters.
           See the grammar note on LivingFigureProps. */
        grammar="emitter"
        /* One id per face — formation is latched per id, and a shared id would
           replay the arrival on every flip. */
        id={`fig-two-trajectories-${face}`}
        width={W}
        height={H}
        nodes={f.nodes}
        portrait={f.portrait}
        edges={f.edges}
        core={f.core}
        caption=""
        tag=""
        footLeft=""
        footRight=""
        rest={f.rest}
        /* The plane belongs to the two faces that HAVE an x of named
           dimensions. The assumptions face is a split by position rather than
           a course across a scale, so a grid behind it would be measuring
           something that is not there. */
        backdrop={
          face === 'assumptions' ? undefined : (
            <CartesianPlane
              at={S_STATION_X}
              top={96}
              bottom={S_NAME_ROW - 22}
              left={96}
              right={W - 56}
            />
          )
        }
      />
    </div>
  );
};
