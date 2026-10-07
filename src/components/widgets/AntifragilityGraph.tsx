import React, { useEffect, useMemo, useRef, useState } from 'react';
import { arcSegment, rnd } from '../figures/FigurePrimitives';
import { Formation } from '../organic/Formation';
import { TissueField } from '../organic/TissueField';
import { bakeTissue, type WeightedStrand } from '../../utils/tissueCloud';
import { record, SPACING } from '../../utils/formation';
import { DEVICE_TIER } from '../../utils/deviceTier';

/**
 * THE TRAJECTORY IS PARTICLES, NOT STROKES.
 *
 * Asked for: every motion on this graphic animated by the particle system. It
 * had two kinds of life and neither was that — `.strand-breathe` on the SVG
 * paths, which is a CSS opacity cycle on a solid line, and a one-off particle
 * formation that ran on first open and then handed the drawing back to the
 * strokes. So the instrument arrived as particles and then stopped being made
 * of them, which is the same "adjacent to the drawing rather than made of it"
 * fault FW-01 records for the figures.
 *
 * It is now the map's own arrangement, at instrument scale, and the split is
 * the map's split exactly: THE COURSES ARE THE CLOUD, and the stations, the
 * ring and the register names stay in SVG — because those are light sources,
 * marks and type, never tissue.
 *
 * The two kinds of course keep the conduct values they have everywhere else,
 * which is what makes them read as different things (see `WeightedStrand`):
 * a register line is MATERIAL — the scale is there whether anything is on it or
 * not — so it conducts gently and stays continuous; the reader's own trajectory
 * is A PATH SOMETHING TRAVELS, so it is nearly dark between shots and full as
 * one crosses. That is the same distinction OPEN.md 45a settled for the map.
 */
const PARTICLE_GRAPH = true;

/** Sample the quadratic `arcSegment` actually draws, so particles land on the
    curve rather than on the chord under it. Mirrors `growStrands`. */
function sampleArc(
  x1: number, y1: number, x2: number, y2: number, bend: number, steps = 14
): Array<[number, number]> {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (x1 + x2) / 2 - (dy / len) * bend;
  const cy = (y1 + y2) / 2 + (dx / len) * bend;
  return Array.from({ length: steps + 1 }, (_, k) => {
    const t = k / steps;
    const u = 1 - t;
    return [
      u * u * x1 + 2 * u * t * cx + t * t * x2,
      u * u * y1 + 2 * u * t * cy + t * t * y2
    ] as [number, number];
  });
}

/**
 * Has the trajectory already grown itself, this session?
 *
 * The same latch the map, the figures and the chapter openers keep, for the
 * same reason: an instrument that performs its own arrival every time it is
 * opened is asking to be watched. It grows once, on the first opening.
 */
let GRAPH_FORMED = false;

/**
 * The reading for the five questions, drawn as a trajectory rather than a score.
 *
 * WHY A LINE THAT MOVES AND NOT A GAUGE. Asked for: the graph should rise and
 * fall as the answers are given. A gauge would show the sum, and the sum is the
 * one thing the document already refuses to let this instrument report — four
 * out of five is not eighty per cent of a pass, it is a fail with one named
 * cause. A trajectory shows something a total cannot: WHERE it turned. A project
 * that clears the first four and fails the fifth draws a different shape from
 * one that fails the first and recovers, and the two are different problems even
 * though they score the same.
 *
 * THE VERTICAL AXIS IS THE DOCUMENT'S OWN SPINE. Fragile → Robust →
 * Antifragile, which is the order the map already arranges the chapters in and
 * the order the manuscript argues them in. Nothing new is named here.
 *
 * WHERE THE CEILING COMES FROM. §5.4 is explicit, and it is the one place the
 * dossier qualifies its own title: "Most of what this dossier prescribes is
 * robust rather than antifragile... Where that mechanism is absent — where a
 * practice merely avoids harm without being made more valuable by the harm
 * others do — the honest word is robust, and this dossier uses it." So clearing
 * questions climbs toward robust and stops there; the antifragile band opens
 * only when every one of the five has cleared, because that is the only state
 * the document is willing to call by that word. The graph cannot be walked into
 * the top band by four good answers and one shrug.
 *
 * EVERY SEGMENT CARRIES A BOW. Consecutive answers that agree would otherwise
 * put three points on one line and draw a straight run, which DG-01 forbids
 * with no exception — including the zero-bow filament that is not literally an
 * `L`. The bow is `arcSegment`'s, the amplitude is ~5% of the segment (DG-04,
 * one dominant low frequency, no scribble), and its direction alternates so a
 * flat passage reads as tissue holding a course rather than as a ruled line.
 *
 * NOTHING HERE IS FILLED (DG-02). The bands are strokes, the trajectory is a
 * stroke, and the only solid marks are the station points — which that rule
 * admits by name: a bouton, a seed tip, a nucleolus is a bright dot.
 */

/**
 * THIS SURFACE RIDES THE APP'S TIDE.
 *
 * It was the one drawing in the dossier with no clock in it. Every strand
 * elsewhere — the map's tissue, the figures' courses, the veins in the reader —
 * breathes on one 19.7s period and takes its phase from its distance to the
 * drawing's own core, so brightening rolls outward as a wave with nothing
 * moving and no ends (LC-01). An instrument that held perfectly still beside
 * them read as a chart pasted onto the organism rather than as part of it,
 * which is the failure FW-01 records for the figures and the same answer
 * applies: when the grammar moves, port it.
 *
 * The core here is where the walk begins — the Fragile line at the left margin,
 * the point the whole reading is measured from. The wave therefore rolls along
 * the trajectory in the direction the reading is made.
 *
 * LC-03 and LC-05 both fix the number: 19.7s, not a period of this surface's
 * own choosing. The wavelength is local because the drawing is 300 units wide
 * and a map-scale wavelength would put the entire graph inside one phase, which
 * is a surface blinking in unison — the shimmer LC-01 exists to prevent.
 */
const TIDE = 19.7;
const TIDE_WAVELENGTH = 190;

/** −1 fails, 0 not yet answered, +1 clears */
export type Answer = -1 | 0 | 1;

const W = 300;
const H = 128;
/* Room for the longest band name, not for the average one.
   At 58 this read "TIFRAGILE": the names are set `text-anchor="end"` against
   PAD_L − 10, and "ANTIFRAGILE" is eleven characters at font-size 7 carrying
   TY-03's 0.2em — about 60 viewBox units — so it ran off the left edge and the
   viewBox clipped it. That is TY-08's overrun half, and the fix is the one that
   rule points at: give the label its room rather than shrink the type (there is
   no step below 9) or narrow the tracking (there is one value).
   Measured after the change: widest name 59.2 units against 64 available. */
const PAD_L = 74;
const PAD_R = 16;
const TOP = 18;
const BOT = 112;

/** the three registers, bottom to top, in the document's own words */
const BANDS = [
  { name: 'Fragile', y: BOT - 6 },
  { name: 'Robust', y: (TOP + BOT) / 2 },
  { name: 'Antifragile', y: TOP + 6 }
];

const STEP = (BANDS[1].y - BANDS[2].y) / 2.5;

/** Phase by distance from the walk's origin — `tidePhase()`, at this scale. */
function tidePhase(x: number, y: number, seed: number): string {
  const d = Math.hypot(x - PAD_L, y - BANDS[0].y);
  const along = (d / TIDE_WAVELENGTH) % 1;
  const jitter = (rnd(seed) - 0.5) * 0.09;
  const frac = (1 - along + jitter + 1) % 1;
  return `-${(frac * TIDE).toFixed(2)}s`;
}

/**
 * The walk, computed once.
 *
 * The component drew it and `bandFor` recomputed it, which is TY-05's fault in
 * code rather than in type: two readouts of one fact, free to disagree the
 * moment either is edited. Both now call this.
 */
export function walk(answers: Answer[], count: number) {
  const cleared = answers.filter(a => a === 1).length;
  const allClear = count > 0 && cleared === count;

  /* It starts on the Fragile line, because that is where the document says the
     extractive default already sits — not at a neutral midpoint the manuscript
     never claims. */
  const pts: Array<[number, number]> = [];
  const dx = (W - PAD_L - PAD_R) / count;
  let y = BANDS[0].y;
  pts.push([PAD_L, y]);

  for (let i = 0; i < count; i++) {
    y = y - (answers[i] ?? 0) * STEP;
    /* The ceiling: robust, until every question has cleared. §5.4's own
       qualification, enforced rather than merely described. */
    y = Math.min(BOT - 2, Math.max(allClear ? BANDS[2].y : BANDS[1].y, y));
    pts.push([PAD_L + dx * (i + 1), y]);
  }

  /* A register is claimed only when the walk has actually REACHED its line.
     The first cut called a project robust at two clears out of five, on a
     midpoint test — which reads the climb as progress and is exactly the
     eighty-per-cent arithmetic the instrument's own header refuses. Reaching
     the robust line takes three clears with nothing dragging back. */
  const band = allClear ? BANDS[2] : pts[pts.length - 1][1] <= BANDS[1].y + 0.5 ? BANDS[1] : BANDS[0];

  return { pts, band, allClear, cleared };
}

export function bandFor(answers: Answer[], count: number): 'Fragile' | 'Robust' | 'Antifragile' {
  return walk(answers, count).band.name as 'Fragile' | 'Robust' | 'Antifragile';
}

export const AntifragilityGraph: React.FC<{
  answers: Answer[];
  /** how many questions there are — the walk is one station per question */
  count: number;
  /** which question the reader is on; its station is ringed */
  current?: number;
  /** the station that just moved — it and its run pulse once */
  changedAt?: number | null;
  /** touching a station goes to that question */
  onPick?: (i: number) => void;
}> = ({ answers, count, current, changedAt = null, onPick }) => {
  /* Gradient ids must not collide when two of these are on one sheet. */
  const gid = React.useId().replace(/:/g, '');
  const { pts, band } = walk(answers, count);
  const last = pts[pts.length - 1];

  /* Segment by segment, so each one can be given its own bow. The traced-path
     helper next door rounds corners but leaves a collinear run flat, and a flat
     run is exactly the zero-bow filament DG-01 names. */
  const segs = pts.slice(0, -1).map((p, i) => {
    const q = pts[i + 1];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const bow = len * 0.05 * (i % 2 === 0 ? 1 : -1);
    return arcSegment(p[0], p[1], q[0], q[1], bow);
  });

  /*
   * THE TRAJECTORY GROWS OUT OF WHERE THE WALK BEGINS.
   *
   * The map assembles from its cells, the figures from theirs, a chapter cell
   * from its soma; this surface was the last one that simply appeared. It now
   * grows from the same place its tide is phased from — the Fragile line at the
   * left margin, which is where the dossier says the extractive default already
   * sits and therefore where every reading starts.
   *
   * The courses are sampled along the quadratic arcSegment actually draws,
   * with the same bow and the same alternating sign, so the particles land on
   * the curve the eye ends up looking at rather than on the chord beneath it.
   */
  const growStrands = useMemo(
    () =>
      pts.slice(0, -1).map((p, i) => {
        const q = pts[i + 1];
        const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
        const bow = len * 0.05 * (i % 2 === 0 ? 1 : -1);
        const ctlx = (p[0] + q[0]) / 2 - ((q[1] - p[1]) / len) * bow;
        const ctly = (p[1] + q[1]) / 2 + ((q[0] - p[0]) / len) * bow;
        return {
          pts: Array.from({ length: 11 }, (_, k) => {
            const t = k / 10;
            const u = 1 - t;
            return [
              u * u * p[0] + 2 * u * t * ctlx + t * t * q[0],
              u * u * p[1] + 2 * u * t * ctly + t * t * q[1]
            ] as [number, number];
          })
        };
      }),
    [pts]
  );

  /**
   * The whole drawing as one cloud, rebuilt when the reading moves.
   *
   * Cheap to rebuild — a few hundred points against the map's tens of thousands
   * — and it has to be, because `pts` moves every time an answer is given and a
   * cloud held across that would leave the particles on the old trajectory.
   *
   * Baked from the Fragile line at the left margin, the same origin the tide is
   * phased from and the same place the formation grows out of, so the wave rolls
   * along the reading in the direction the reading is made.
   */
  const cloud = useMemo(() => {
    if (!PARTICLE_GRAPH) return null;
    const strands: WeightedStrand[] = [];

    /* The registers: material, so they conduct gently and stay legible. */
    BANDS.forEach((b, i) => {
      strands.push({
        pts: sampleArc(PAD_L - 4, b.y, W - PAD_R, b.y, i === 1 ? 1.6 : 1.1),
        width: 0.16,
        opacity: band.name === b.name ? 0.42 : 0.16,
        conduct: 0.18
      });
    });

    /* The reading's own course: a path something travels. An unanswered run
       stays faint and carries no shot — there is nothing on it yet. */
    growStrands.forEach((s, i) => {
      const unanswered = answers[i] === 0;
      strands.push({
        pts: s.pts,
        width: unanswered ? 0.28 : 0.6,
        opacity: unanswered ? 0.3 : 0.95,
        conduct: unanswered ? 0.18 : 0.9
      });
    });

    return bakeTissue(strands, PAD_L, BANDS[0].y, { spacing: 1.7 });
  }, [growStrands, answers, band.name]);

  const willForm = useMemo(() => {
    if (GRAPH_FORMED) return false;
    if (typeof window === 'undefined') return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    if (DEVICE_TIER === 'low') return false;
    return true;
  }, []);

  const [formed, setFormed] = useState(1);
  const [forming, setForming] = useState(false);
  const drawnRef = useRef<SVGGElement | null>(null);
  /* The recording is frozen at the first frame: `pts` moves as answers are
     given, and a table rebuilt mid-growth would move every landing under the
     particles already on their way to it. */
  const heldRecord = useRef<ReturnType<typeof record> | null>(null);

  useEffect(() => {
    if (!willForm || GRAPH_FORMED) return;
    GRAPH_FORMED = true;
    setFormed(0);
    setForming(true);
  }, [willForm]);

  if (forming && !heldRecord.current) {
    const k = Math.min(W, H) / 900;
    heldRecord.current = record(growStrands, PAD_L, BANDS[0].y, {
      spacing: Math.max(1.9, SPACING * k),
      scale: Math.max(0.3, k),
      origins: [[PAD_L, BANDS[0].y]]
    });
  }

  /* Straight to the node, never through React — see `rampTissue` in Orrery. */
  const rampDrawn = (landed: number) => {
    const g = drawnRef.current;
    if (!g) return;
    const lead = Math.min(1, landed / 0.86);
    g.style.opacity = String(landed >= 1 ? 1 : Math.pow(lead, 1.35));
  };
  const endFormation = () => {
    const g = drawnRef.current;
    if (g) g.style.opacity = '';
    setFormed(1);
    setForming(false);
  };

  return (
    /* The wrapper hugs the svg — which is block and sized by its own aspect
       ratio — so the canvas covers the drawing and nothing else, and the band's
       height is unchanged by any of this. */
    <div className="relative">
    {/* The tissue. Under the svg, because the stations and the type are drawn
        ON the courses and must stay above them — the same stacking the map
        keeps between its canvas and its somas. The view is static: this
        instrument has no camera, so the cloud's units are the viewBox's. */}
    {PARTICLE_GRAPH && cloud && (
      <TissueField cloud={cloud} view={{ x: 0, y: 0, w: W, h: H }} formed={formed} />
    )}
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      role="img"
      aria-label={`Antifragility trajectory: ${band.name}`}
    >
      <g ref={drawnRef} style={formed < 1 ? { opacity: 0 } : undefined}>
      {/* The three registers. Drawn with a bow for the same reason everything
          else is, and held under a quarter so the trajectory is the only thing
          on this surface that reads as a mark rather than as a ground. */}
      {BANDS.map((b, i) => (
        <g key={b.name}>
          {/* The register breathes; its NAME does not. A label that dimmed on a
              cycle would be type flickering under the reader, which is the one
              thing the tide may not reach (TY-08 wants a name legible whenever
              it is on the sheet). */}
          {/* Drawn by the cloud when particles are on — see PARTICLE_GRAPH. */}
          {!PARTICLE_GRAPH && (
          <g className="strand-breathe" style={{ animationDelay: tidePhase(W / 2, b.y, i + 3) }}>
            <path
              d={arcSegment(PAD_L - 4, b.y, W - PAD_R, b.y, i === 1 ? 1.6 : 1.1)}
              strokeWidth="0.16"
              opacity={band.name === b.name ? 0.42 : 0.16}
              style={{ transition: 'opacity 0.75s var(--ease-organic)' }}
            />
          </g>
          )}
          {/* SVG font-size is in viewBox units, not pixels — TY-02 exempts it
              by name. Tracking is derived at 0.2em of its own size for caps,
              exactly as FigureText computes it (TY-03). */}
          <text
            x={PAD_L - 10}
            y={b.y + 2.4}
            textAnchor="end"
            fontSize="7"
            letterSpacing={7 * 0.2}
            className="uppercase"
            fill="currentColor"
            stroke="none"
            opacity={band.name === b.name ? 0.95 : 0.28}
            style={{ transition: 'opacity 0.75s var(--ease-organic)' }}
          >
            {b.name}
          </text>
        </g>
      ))}

      {/* The trajectory. The run that the last answer redrew pulses once — the
          only thing on this drawing that ties a press on the left to a movement
          on the right (see .answer-pulse-run). */}
      <g>
        {segs.map((d, i) => {
          const moved = changedAt === i;
          /* The cloud draws the course now. The stroke stays behind
             PARTICLE_GRAPH rather than being deleted, because it is also the
             fallback the formation hands back to, and because a one-line
             switch is what makes the two comparable. */
          const run = PARTICLE_GRAPH ? null : (
            <path
              d={d}
              className={moved ? 'answer-pulse-run' : undefined}
              strokeWidth={answers[i] === 0 ? 0.28 : 0.6}
              opacity={answers[i] === 0 ? 0.3 : 0.95}
              style={moved ? undefined : { transition: 'opacity 0.75s var(--ease-organic)' }}
            />
          );
          /* A run that is pulsing keeps its own clock for that one cycle —
             `.answer-pulse-run` is a single event tying a press to a movement,
             and laying the tide over it would make the two fight for the same
             channel. It rejoins the tide as soon as the pulse is done. */
          return moved ? (
            <g key={i}>{run}</g>
          ) : (
            <g key={i} className="strand-breathe"
              style={{ animationDelay: tidePhase(pts[i][0], pts[i][1], i + 11) }}>
              {run}
            </g>
          );
        })}
      </g>

      {/* The stations, which are also the position and also the way back.
          They were a second row of dots underneath this — the same five facts
          drawn twice (TY-05). A station is now the whole affordance: it says
          whether its question is answered, whether you are on it, and it takes
          you there. */}
      {pts.map((p, i) => {
        if (i === 0) {
          return (
            <circle key="origin" cx={p[0]} cy={p[1]} r="1.2"
              fill="currentColor" stroke="none" opacity="0.35" />
          );
        }
        const qi = i - 1;
        const answered = (answers[qi] ?? 0) !== 0;
        const here = current === qi;
        const moved = changedAt === qi;
        const rest = answered ? 0.95 : 0.35;
        return (
          <g key={i}>
            {/* the ring that says "you are here" — a mark, not a highlight */}
            {here && (
              <circle cx={p[0]} cy={p[1]} r="5.2" fill="none" stroke="currentColor"
                strokeWidth="0.2" opacity="0.5" />
            )}
            <circle
              cx={p[0]}
              cy={p[1]}
              r={answered ? 2.4 : 1.5}
              fill="currentColor"
              stroke="none"
              className={moved ? 'answer-pulse' : undefined}
              opacity={moved ? undefined : rest}
              style={moved
                ? ({ ['--rest' as string]: String(rest) })
                : { transition: 'opacity 0.75s var(--ease-organic)' }}
            />
            {onPick && (
              /* A generous transparent target over the mark: the drawn station
                 is 2.4 units and nothing is clickable at that size. */
              <circle
                cx={p[0]} cy={p[1]} r="8"
                fill="transparent" stroke="none"
                style={{ cursor: 'pointer' }}
                onClick={() => onPick(qi)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(qi); } }}
              >
                <title>{`Question ${qi + 1}`}</title>
              </circle>
            )}
          </g>
        );
      })}

      {/*
        The head of the walk, lit — the one lamp on this drawing, and it sits
        where the reading actually is.

        IT WAS A FLAT DISC AT 0.1 AND THAT IS THE BLOB DG-02 KEEPS REMOVING.
        That rule names four previous attempts — halo discs at 0.4, soma
        membranes at 0.17 and then 0.055, boutons at 0.28 — and says outright
        that "the fix was never a lower number, it was removing the fill", and
        that the only fills the system permits are light sources, which are
        "layered radial falloffs, bright at the heart". A single dim flat circle
        is haze, and "the difference between haze and lamp is intensity, not
        construction".

        So it is built the way every other light in the app is built: the same
        three-stop falloff the map's `-core` and the chapter openers use, hot at
        the centre and reaching zero at the rim, carrying the light temperature
        through `--lume-rgb` (GR-05 — hue lives only in emitted light).
      */}
      <defs>
        <radialGradient id={`${gid}-core`}>
          <stop offset="0%" stopColor="rgb(var(--lume-rgb, 255 255 255))" stopOpacity="0.9" />
          <stop offset="30%" stopColor="rgb(var(--lume-halo-rgb, 255 255 255))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="strand-breathe" style={{ animationDelay: tidePhase(last[0], last[1], 7) }}>
        <circle cx={last[0]} cy={last[1]} r="6.4" fill={`url(#${gid}-core)`} stroke="none" />
      </g>
      </g>
    </svg>

    {formed < 1 && heldRecord.current && (
      <Formation
        record={heldRecord.current}
        active={forming}
        view={{ x: 0, y: 0, w: W, h: H }}
        onProgress={rampDrawn}
        onDone={endFormation}
      />
    )}
    </div>
  );
};
