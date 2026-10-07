import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FigureDefs, FigureFrame, FigureInertContext, FigureWorldContext, VortexSphere, Dendrites,
  rnd, smoothPolyline, arcSegment
} from './FigurePrimitives';
import { Vein, Soma } from '../organic/Organic';
import { Formation } from '../organic/Formation';
import { record, SPACING } from '../../utils/formation';
import { DEVICE_TIER } from '../../utils/deviceTier';

/**
 * The living figure — the Orrery's grammar at figure scale.
 *
 * Every data visualisation in the dossier is the same organism as the map,
 * only smaller: cells joined by bundles of fibre, light travelling as a tide
 * rather than as a moving object, and nothing anywhere drawn as a box, an
 * arrow or a straight line. A figure is not a picture of a system — it is a
 * piece of the same tissue, and you touch it the same way: hover warms the
 * cells around what you touched, and pressing one pins its reading.
 *
 * Figures declare cells and (optionally) which cells connect. Everything else
 * — the courses, the crossings, the phases, the propagation — is this module.
 */

/* --------------------------------------------------------------- constants */

/** The one curve — the map's. See --ease-organic in index.css. */
const EASE = 'cubic-bezier(0.45, 0.05, 0.3, 1)';
/** hover response — long enough that nothing ever snaps */
const RESPOND = 0.16;
/** period of the luminance tide — must match .strand-breathe in index.css */
const TIDE = 19.7;
/** how far the brightness wave travels before it repeats, in user units */
const TIDE_WAVELENGTH = 420;

const PHI = 1.6180339887498949;
/** a period whose ratio to every other clock is irrational, so nothing loops */
function period(base: number, seed: number, spread = 0.55): number {
  return base * (1 + ((seed * PHI) % 1) * spread);
}

/* ------------------------------------------------------------------- types */

export interface FigureNode {
  id: string;
  x: number;
  y: number;
  /** soma radius in user units */
  r: number;
  kind?: 'core' | 'cell' | 'minor';
  /** the cell's name — dim at rest, never hidden, so nothing is a guess */
  label?: string;
  /** a second line under the name, dimmer still */
  sub?: string;
  /** glyph inside the sphere — surfaces only under touch, as on the map */
  glyph?: string;
  /**
   * Resting opacity for the glyph, 0–1. Opt-in, and the same exception the map
   * already makes for its chapter numerals: where a figure's argument is carried
   * by the magnitudes written inside two cells, hiding them until hover leaves
   * cells of identical construction and no way to tell them apart but pointing
   * at each in turn. Omit it and the glyph stays touch-only.
   */
  glyphAtRest?: number;
  /** nudge the label baseline, so cells of unequal radius can share one line */
  labelDy?: number;
  /**
   * Resting opacity for the name, 0–1. Opt-in, and the same exception the glyph
   * makes: names surface under touch because a figure is a space, not a legend —
   * but a figure whose subject *is* a set of named registers has nothing left
   * when the names go. A taxonomy nobody can read is not a taxonomy. Use it only
   * where the names carry the argument, never to make a drawing easier to label.
   */
  labelAtRest?: number;
  /** what the caption strip reads when this cell is touched */
  reading?: { kind: string; body: string };
  /** the lines that unfold when the cell is pressed */
  detail?: string[];
  /**
   * This cell's vortex turns.
   *
   * Only the core spun, on the argument that one turning thing in a drawing is
   * a centre and several are a machine. A figure whose subject is that EVERY
   * cell is a centre needs the opposite: the scale-mismatch figure says in its
   * own words that a satellite with no field would quietly restore the middle
   * this drawing exists to deny, and a satellite that does not turn restores it
   * the same way. Per node rather than per figure, and the core's behaviour is
   * still the default when nothing is said.
   *
   * It is a transform on a group of seventeen to thirty strands, which is the
   * small bounded case PF-03 leaves open by name — never the whole organism.
   */
  spin?: boolean;
  /** resting brightness, 0–1 */
  intensity?: number;
  /** where the label sits relative to the soma */
  labelAt?: 'above' | 'below';
  /** arbor radius override, in user units — defaults to r * 3.8 (3.2 if minor) */
  arborR?: number;
  /** arm count override for the arbor */
  arborArms?: number;
}

export interface FigureEdge {
  a: string;
  b: string;
  /** thicker bundles read as load-bearing connections */
  weight?: number;
  /** a fibre that is being stripped away reads fainter and unmyelinated */
  faint?: boolean;
  /**
   * Light travels this process in both directions.
   *
   * Not two arrows and not a travelling dash — a relay. Beads along the fibre
   * share one period and take a delay from their position, so a spike appears
   * to leap outward, and a second set delayed by half a period leaps back. Every
   * mark stays exactly where it is and only its brightness changes, which is
   * what real saltatory conduction does and the only honest way to send light
   * along a strand here. Use it where the two cells are each other's source:
   * you produce, they produce, and neither end is the origin.
   */
  both?: boolean;
  /**
   * How many exchanges are in flight at once along a `both` fibre.
   *
   * One relay pair reads as an occasional ping: a leap out, a wait, a leap back,
   * a longer wait. Where the claim is that traffic is CONSTANT and two-way — you
   * are producing while you are being reached, and so is everyone you are wired
   * to — one pair understates it to the point of saying the opposite.
   *
   * So a fibre can carry several pairs, evenly spread through the period, and
   * something is then almost always crossing it. This buys no new speed and adds
   * no new clock: every station still fires on the one `.ranvier` period, and
   * every mark still stays exactly where it is with only its brightness
   * changing, which is what keeps it inside DG-06 (never a travelling dash).
   */
  traffic?: number;
  /**
   * The spike dies before it lands.
   *
   * At 0 — the default, and what every fibre here did before this existed — the
   * relay completes: every station fires at full strength and the signal
   * arrives. Above 0 each station downstream fires weaker than the one behind
   * it, and at 1 the far end is dark. That is a different claim from a faint
   * fibre: `faint` says the connection is being stripped away, `fade` says the
   * connection is intact and the signal formed and was not received.
   *
   * It costs nothing. The stations are the same circles on the same clock; only
   * the peak each one reaches is scaled, through `--fire` in the keyframe.
   */
  fade?: number;
  /**
   * Put this fibre on a declared phase rather than on its own.
   *
   * Ordinarily every fibre takes its phase from its own geometry, so two spikes
   * that happen to coincide do so by accident and never because of one another.
   * Where the claim IS about because — this arrived and that is why that left —
   * the courses have to share one clock with declared offsets, which is the only
   * arrangement in which one course can be seen to interrupt or merge with
   * another. Expressed in turns of the spike period: 0 and 0 fire together, 0
   * and 0.5 alternate.
   *
   * Declaring it also gives a one-way fibre a relay, which it otherwise has
   * none of — `both` is what turns the return leg on, and that is unchanged.
   */
  sync?: number;
}

/* ------------------------------------------------------- drawing the tissue */

/**
 * A wandering course between two cells. The envelope reaches exactly zero at
 * both ends so the strand stays attached, and every frequency, phase and
 * amplitude is seed-derived so no two connections share a shape.
 */
function wander(
  x1: number, y1: number, x2: number, y2: number, seed: number, steps = 20, taut = false
): Array<[number, number]> {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const peak = 0.3 + rnd(seed + 1) * 0.4;
  /*
   * TWO AMPLITUDES, ONE PER GRAMMAR.
   *
   * 8–18% of the span is the map's, and it is right wherever the drawing is an
   * organism: a fibre that meanders reads as living tissue. The trend reports
   * are not organisms — they are readings, and a reading carried on a meander
   * reads as a nerve rather than as a measurement — so those run taut.
   *
   * Which figure gets which is the figure's own call (`grammar`), not a global
   * setting. It was global for one pass and that was wrong in both directions
   * at once: the trend reports needed the lattice and the six argument figures
   * needed their tissue back.
   *
   * DG-01 is untouched and that is the point of the number. The rule's own text
   * fixes the floor — "at 12–20px the 2–4% bow that satisfies the rule" — so
   * 1.4–2.6% of the span at figure scale is a filament under tension rather
   * than a ruled line: straight at a glance, visibly drawn on approach, and
   * still nothing the straight-line audit will ever have to be argued with. The
   * floor of 1.2 units is for short spans, where a percentage of very little is
   * nothing at all and the bow would vanish.
   */
  const amp = taut
    ? Math.max(1.2, len * (0.014 + rnd(seed) * 0.012)) * (rnd(seed + 2) > 0.5 ? 1 : -1)
    : Math.max(7, len * (0.08 + rnd(seed) * 0.1)) * (rnd(seed + 2) > 0.5 ? 1 : -1);
  const f1 = 1.3 + rnd(seed + 3) * 1.7;
  const f2 = 3.1 + rnd(seed + 4) * 3.2;
  const f3 = 6.8 + rnd(seed + 5) * 6.4;
  const p1 = rnd(seed + 6) * 6.283;
  const p2 = rnd(seed + 7) * 6.283;
  const p3 = rnd(seed + 8) * 6.283;
  const drag = (rnd(seed + 9) - 0.5) * 0.1;

  const pts: Array<[number, number]> = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const te = t < peak ? (t / peak) * 0.5 : 0.5 + ((t - peak) / (1 - peak)) * 0.5;
    const env = Math.pow(Math.sin(te * Math.PI), 0.4);
    const ampDrift = 0.7 + 0.5 * Math.sin(t * 2.1 + p1);
    const wob =
      Math.sin(t * f1 + p1) * 0.85 +
      Math.sin(t * f2 + p2) * 0.36 +
      Math.sin(t * f3 + p3) * 0.15;
    const off = wob * env * amp * ampDrift;
    const along = t + Math.sin(t * Math.PI) * drag;
    pts.push([x1 + dx * along + nx * off, y1 + dy * along + ny * off]);
  }
  return pts;
}

/**
 * One connection, drawn as one process.
 *
 * This was a BUNDLE — a halo bed under three hairline filaments that splayed
 * mid-span and converged at the somas, plus a hillock at the pre end and a
 * terminal arborisation with boutons and postsynaptic densities at the post
 * end. That is what the map used to be, and the map has since answered it:
 * one line reads as living when it *meanders continuously and branches*, which
 * is what the arbors already do, so multiplicity buys nothing and costs
 * everything — the difference between a drawing of a connection and a rope.
 *
 * A connection is now a single meandering process with varicosities along it,
 * thicker at its source and tapering as it goes, so direction is read from
 * thickness rather than from polarity marks nobody can see at figure scale.
 * Ported from Orrery's `tissue()` so the reader's diagrams and the map are one
 * drawing made twice, not two drawings that resemble each other.
 */
/** period of .ranvier-fire in index.css — a relay must share its clock */
const SPIKE = 7.4;

function tissue(
  pts: Array<[number, number]>,
  weight: number,
  opacity: number,
  seed: number,
  keyBase: string,
  terminal?: boolean,
  both?: boolean,
  traffic = 1,
  fade = 0,
  sync?: number,
  /** how many stations this fibre may light, or undefined for none */
  stationBudget?: number,
  taut = false
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const n = pts.length - 1;
  if (n < 2) return out;

  /* The taper. Two pieces: a taper needs at least two widths to exist and no
     more than two to read at this scale. Arbor twigs sit at 0.22–0.34, so
     trunks start near 1.3 and thin — the hierarchy the references show, and
     the thing a flat width made every line lose. */
  /*
   * A READING IS A CLOUD, NOT A STROKE.
   *
   * The emitter grammar drew its courses as taut hairlines, and that was still
   * a chart drawn with vector lines — the thing the reference is not. In the
   * reference the data has no outline at all: it is a dense field of individual
   * points where DENSITY carries intensity, and the only rigid marks on the
   * sheet are the grid's. That tension is the whole aesthetic — a mathematical
   * dotted lattice against an organic, fluid distribution of particles — and a
   * stroked line collapses it, because a line is as rigid as the grid and the
   * drawing goes flat.
   *
   * So a taut course is scattered instead. Each sample along it throws a few
   * points, offset on the local NORMAL so the cloud follows the course's
   * bearing, with the spread swelling mid-span and pinching to nothing at the
   * ends — the stream comes OUT of one emitter and lands IN the next rather
   * than passing near them. Two uniforms are summed for the offset, which is a
   * triangular distribution: dense on the centreline, thinning outward, and
   * that falloff is what reads as volume.
   *
   * DG-02 admits every mark here by name — "a bouton, a seed tip, a nucleolus
   * is a bright dot and is allowed" — and there is not one fill or stroke in
   * the stream. PF-04's numerousness is answered the way the scale-mismatch
   * field answers it: the points are STATIC, and the one animated element is
   * the group the caller already wraps them in, so a course costs one animation
   * whether it throws four points or eighty.
   */
  if (taut) {
    /*
     * DENSITY IS THE READING, SO IT IS SET PER UNIT OF LENGTH.
     *
     * The first scatter threw a fixed few points per SAMPLE, and a sample is an
     * arbitrary subdivision — so a short course came out as dense as a long one
     * and the whole thing read as a dotted line rather than as a cloud. Points
     * per unit of course gives every stream the same texture whatever its
     * length, which is what makes density mean volume rather than mean nothing.
     *
     * Two tiers, because a noise field has a core and a fringe. The core is
     * tight on the course and carries the reading; the fringe is a quarter as
     * many points at three times the spread and is what stops the stream having
     * an EDGE — a cloud with a boundary is a thick line, and DG-09's argument
     * about fields applies exactly: it dissolves, it does not end.
     */
    const total = pts.reduce(
      (a, q, k) => (k === 0 ? 0 : a + Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1])),
      0
    );
    /* Capped at both ends: a very short course must still read as a stream, and
       a very long one may not spend the sheet's whole element budget on itself
       (PF-04). Measured: at 0.9/unit the trajectories face draws ~1,500 points
       across twelve courses, against the 1,400 the scale-mismatch field already
       carries without cost. */
    const core = Math.max(60, Math.min(340, Math.round(total * 0.9 * (0.7 + weight * 0.3))));
    const spread = 1.6 + weight * 1.5;

    const shed = (count: number, reach: number, dim: number, tag: string) => {
      for (let i = 0; i < count; i++) {
        /* position along the course, jittered off the sample lattice so no row
           of the cloud lines up with another */
        const t = (i + rnd(seed + i * 7 + 1)) / count;
        const f = Math.min(n - 1e-6, t * n);
        const k = Math.floor(f);
        const frac = f - k;
        const qx = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * frac;
        const qy = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * frac;
        const dx = pts[k + 1][0] - pts[k][0];
        const dy = pts[k + 1][1] - pts[k][1];
        const len = Math.hypot(dx, dy) || 1;
        /* pinched at both ends, so a stream leaves one emitter and lands in the
           next rather than passing near them */
        const env = Math.pow(Math.sin(t * Math.PI), 0.5);
        /* two uniforms summed — triangular, so the cloud is dense on the course
           and thins off it with no rim anywhere */
        const u1 = rnd(seed + i * 13 + 3);
        const u2 = rnd(seed + i * 29 + 5);
        const off = (u1 + u2 - 1) * reach * env * 2;
        const cx = qx + (-dy / len) * off;
        const cy = qy + (dx / len) * off;
        const near = 1 - Math.min(1, Math.abs(off) / (reach * 2 || 1));
        out.push(
          <circle
            key={`${keyBase}-${tag}${i}`}
            cx={cx.toFixed(1)}
            cy={cy.toFixed(1)}
            r={(0.3 + near * 0.4).toFixed(2)}
            fill="currentColor"
            opacity={(opacity * dim * (0.22 + near * 0.78)).toFixed(3)}
          />
        );
      }
    };

    shed(core, spread, 1, 'p');
    shed(Math.round(core * 0.28), spread * 3, 0.42, 'f');
    return out;
  }

  const SEGS = 2;
  const w0 = 0.66 + weight * 0.56;
  for (let s = 0; s < SEGS; s++) {
    const from = Math.floor((s / SEGS) * n);
    const to = Math.ceil(((s + 1) / SEGS) * n);
    const seg = pts.slice(from, to + 1);
    if (seg.length < 2) continue;
    const t = s / (SEGS - 1 || 1);
    const segW = w0 * (1 - t * 0.52);
    out.push(
      <path
        key={`${keyBase}-s${s}`}
        d={smoothPolyline(seg)}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        className={segW > 1.1 ? 'halo' : undefined}
        strokeWidth={segW}
        opacity={opacity * (0.9 - t * 0.12)}
      />
    );
  }

  /* Varicosities: the swellings strung along every process. Sparse and seeded,
     never at the ends — an end bead reads as a terminal, and these are points
     along the way.

     THEY BELONG TO THE ORGANISM AND NOT TO A READING. They are the second thing
     after the meander that makes a line read as a nerve, so a taut fibre has
     none: what is left on one is the light that travels it, which is the relay
     below. */
  if (!taut) {
    const beads = Math.max(1, Math.round(n * 0.14));
    for (let b = 1; b <= beads; b++) {
      const k = Math.round((b / (beads + 1)) * n);
      if (rnd(seed + b * 13) > 0.62) continue;
      const q = pts[k];
      out.push(
        <circle
          key={`${keyBase}-v${b}`}
          cx={q[0].toFixed(1)}
          cy={q[1].toFixed(1)}
          r={0.38 + rnd(seed + b * 5) * 0.28}
          fill="currentColor"
          opacity={Math.min(1, opacity * 1.1)}
        />
      );
    }
  }

  /* The relay, when the fibre carries light both ways.

     An element with a negative delay starts its keyframe already underway, so a
     LARGER delay fires EARLIER: the outward sweep therefore counts down from the
     far end, and the return counts up, offset by half the period. Two stationary
     circles per station, never one moving one. */
  /* A relay runs where light travels the fibre both ways, and also where a
     one-way fibre has declared a phase — because a declared phase exists to be
     seen against another one, and there is nothing to see if the fibre is
     dark. A fibre that declares neither is drawn exactly as it always was. */
  if (stationBudget && (both || sync !== undefined)) {
    const stations = stationBudget;
    /* tighter than the 0.17 a single pair used: with several exchanges sharing
       the fibre the leap has to read as a leap, or the crossings smear into one
       another and the strand simply looks busy rather than carrying anything */
    const stepS = traffic > 1 ? 0.1 : 0.17;
    const lanes = Math.max(1, Math.round(traffic));
    for (let lane = 0; lane < lanes; lane++) {
      /* evenly through the period, so the gaps between exchanges close as the
         lane count rises instead of the exchanges piling onto one another */
      /* A declared phase displaces the whole fibre on the shared clock; an
         undeclared one sits at zero and takes its character from position, as
         before. */
      const phase = (sync ?? 0) * SPIKE + (SPIKE / lanes) * lane;
      for (let m = 0; m <= stations; m++) {
        const q = pts[Math.round((m / stations) * n)];
        if (!q) continue;
        const r = 0.5 + rnd(seed + m * 3) * 0.22;
        /* The strength this station reaches. The outward run weakens with
           distance travelled; the return runs the other way, so it weakens
           toward the near end. A floor of 0.06 rather than 0, because a station
           that vanishes entirely reads as a gap in the fibre rather than as a
           signal that failed to arrive. */
        const t = m / stations;
        const fireOut = Math.max(0.06, 1 - fade * t);
        const fireBack = Math.max(0.06, 1 - fade * (1 - t));
        out.push(
          <circle key={`${keyBase}-ro${lane}-${m}`} className="ranvier"
            cx={q[0].toFixed(1)} cy={q[1].toFixed(1)} r={r} fill="currentColor"
            style={{ animationDelay: `-${(phase + (stations - m) * stepS).toFixed(2)}s`,
                     ...(fade ? { ['--fire' as string]: fireOut.toFixed(3) } : null) }} />,
          ...(both ? [
            <circle key={`${keyBase}-rb${lane}-${m}`} className="ranvier"
              cx={q[0].toFixed(1)} cy={q[1].toFixed(1)} r={r} fill="currentColor"
              style={{ animationDelay: `-${(phase + SPIKE / 2 + m * stepS).toFixed(2)}s`,
                       ...(fade ? { ['--fire' as string]: fireBack.toFixed(3) } : null) }} />
          ] : [])
        );
      }
    }
  }

  // one bright terminal where the process lands on its target
  if (terminal) {
    const tip = pts[n];
    out.push(
      <circle key={`${keyBase}-t`} cx={tip[0].toFixed(1)} cy={tip[1].toFixed(1)}
        r={0.8} fill="currentColor" opacity={Math.min(1, opacity * 1.3)} />
    );
  }

  return out;
}

/**
 * A PARTICLE LIGHT EMITTER — what a figure node is, now that it is not a cell.
 *
 * A ring of seeded points thinning outward from the centre, over the glow and
 * the core that were always there. The grain is the whole job: a plain disc
 * with a gradient behind it reads as a sticker on the ground, and the same disc
 * with light breaking up at its edge reads as something emitting. Density says
 * where the source is, exactly as the vortex it replaces did, with an order of
 * magnitude less drawing.
 *
 * Eleven points, not more. DG-06's instruction is to measure element count
 * before moving a density constant, and this is the constant: eleven across
 * every node in every figure is a net saving against the arbor and vortex it
 * replaces, and the grain still reads at figure scale. The radius spread is
 * squared so points crowd the centre rather than sitting on a ring — a ring is
 * a rim, and a rim is the hard edge GR-08 and DG-02 both refuse.
 */
const Emitter: React.FC<{
  cx: number; cy: number; r: number; seed: number; opacity: number;
}> = ({ cx, cy, r, seed, opacity }) => (
  <g opacity={opacity}>
    {Array.from({ length: 11 }, (_, k) => {
      const a = rnd(seed + k * 7) * 6.283;
      /* squared, so the spray is dense at the source and sparse at its reach */
      const t = rnd(seed + k * 11 + 3);
      const d = r * (0.25 + t * t * 1.5);
      return (
        <circle
          key={k}
          cx={(cx + Math.cos(a) * d).toFixed(1)}
          cy={(cy + Math.sin(a) * d).toFixed(1)}
          r={(0.3 + rnd(seed + k * 3) * 0.35).toFixed(2)}
          fill="currentColor"
          opacity={(0.95 - t * 0.6).toFixed(2)}
        />
      );
    })}
  </g>
);

/** where two courses genuinely cross, in figure coordinates */
/** the axis-aligned box a course occupies, for cheap rejection */
type Box = { x0: number; y0: number; x1: number; y1: number };

function boxOf(pts: Array<[number, number]>): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

const boxesTouch = (a: Box, b: Box): boolean =>
  a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;

function crossing(
  p1: [number, number], p2: [number, number], p3: [number, number], p4: [number, number]
): [number, number] | null {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-6) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
}

/* ------------------------------------------------------------- the figure */

/**
 * The same figure, laid out for a tall rectangle instead of a wide one.
 *
 * THIS IS GEOMETRY AND NOTHING ELSE. The same cell ids, the same names, the
 * same readings, the same wiring — moved. A figure that declares one must
 * build both forms from one list of cells through a placement function, never
 * from two hand-kept node arrays: a second copy of somebody else's data
 * drifts, and a portrait form that had drifted would be a figure saying
 * something different to whoever happened to be holding a narrow screen. That
 * is the precise failure `audit-figures` exists to catch on the deck, and
 * there is no reason to reintroduce it here.
 *
 * `edges` is optional because the wiring belongs to the graph rather than to
 * the rectangle it is drawn in. Supply it only where the portrait genuinely
 * joins different cells, which should be almost never.
 *
 * `backdrop`, `overlay` and `rimStyle` ARE routinely different, and they have
 * to live here rather than beside the wide ones. A figure that draws its own
 * plane, axis poles or formula hands those to this component as finished JSX,
 * and the component is where the branch happens — so the caller cannot know
 * which rectangle it is drawing for. Anything sized to the frame belongs to
 * the layout that declares the frame. Omit them and the wide ones are reused,
 * which is right for ornament that is sized to the tissue instead.
 */
export interface FigureLayout {
  width: number;
  height: number;
  nodes: FigureNode[];
  edges?: FigureEdge[];
  backdrop?: React.ReactNode;
  overlay?: React.ReactNode;
  rimStyle?: React.CSSProperties;
}

export interface LivingFigureProps {
  id: string;
  width: number;
  height: number;
  nodes: FigureNode[];
  /** omit to let proximity wire the tissue */
  edges?: FigureEdge[];
  /**
   * The portrait form, taken when the column is too narrow to draw the wide
   * one at readable type. Optional: a figure without one is unchanged — it
   * holds at MIN_DRAWN_PX and the column scrolls sideways.
   */
  portrait?: FigureLayout;
  /** the cell the luminance tide rolls out from */
  core?: string;
  /** FigureFrame chrome */
  caption: string;
  tag: string;
  footLeft: string;
  footRight: string;
  /** the reading shown when nothing is touched */
  rest?: { kind: string; body: string };
  /**
   * WHICH DRAWING THIS FIGURE IS.
   *
   * `organism` is the default and the book's own grammar: an arbor coning out
   * around each cell, a vortex turning inside it, a meandering fibre with
   * varicosities along it. It is right wherever the figure is an ARGUMENT — a
   * taxonomy, a root system, a set of postures — because those are drawings of
   * living structure and the tissue is what says so.
   *
   * `emitter` is the trend reports': a particle light emitter at each node and
   * a taut filament between them, with no arbor, no vortex and no
   * varicosities. It is right wherever the figure is a READING, because a
   * measurement carried on a meander reads as a nerve rather than as a number.
   *
   * It is per figure and not global. Set globally it was wrong in both
   * directions at once — see `docs/OPEN.md` 61.
   */
  grammar?: 'organism' | 'emitter';
  /** ornament drawn behind the tissue, in figure coordinates */
  backdrop?: React.ReactNode;
  /** ornament drawn over the tissue but under the somas */
  overlay?: React.ReactNode;
  /**
   * Where the vignette should treat the drawing as being.
   *
   * A figure that sets type outside its own drawing — FIG 0.1 puts its sum in
   * a band under the field — needs the rim to hug the drawing rather than the
   * frame, or the rim blacks out the very thing the figure was asked to make
   * always visible. `--rim-cy` and `--rim-clear`; see THE FIGURE'S RIM.
   */
  rimStyle?: React.CSSProperties;
}

/**
 * Below this container width the figure would have to be shrunk to fit, and a
 * shrunken figure is not a small figure — it is an unreadable one: at 500px the
 * 8.5-unit names render at five screen pixels. The map already answered this
 * question for itself (never a shrunken diagram, a legible stacked spine
 * instead) and the figures answer it the same way.
 */
/**
 * Which figures have already assembled themselves, this session.
 *
 * Keyed by figure id, module state for the same reason the map's latch is
 * (`FORMED` in `Orrery.tsx`): a figure world unmounts every time the reader
 * leaves it, and a formation that replayed on every visit would be a drawing
 * performing its own arrival each time you looked at it — which is the
 * behaviour this dossier exists to argue against. Once per figure, per session.
 */
const FIGURES_FORMED = new Set<string>();

/**
 * The narrowest a figure may be DRAWN at before it starts scrolling instead.
 *
 * This is FW-06 measurement, kept and repurposed. That rule found the floor by
 * experiment — "at 500px the 8.5-unit names render at five screen pixels" — and
 * 600 is where it put the line. The number is still the point at which the type
 * stops being readable; what changed is what happens there. It used to swap the
 * drawing for a list. It now holds the drawing at this width and lets the
 * container scroll, so the labels never shrink past the size that measurement
 * established.
 */
const MIN_DRAWN_PX = 600;

/**
 * How many relay circles one figure may animate at once.
 *
 * MEASURED, and it is the most expensive thing on a figure by some way. On the
 * Village-Scale Neurology sheet — 3,701 elements, browser pane visible — the
 * drawing ran at 11.8fps and switching the relay circles off alone took it to
 * 17.3. Nothing else came close: the flex displacement filter was worth 0.3fps,
 * and every breathing animation on the sheet together was worth 2.3.
 *
 * The reason is the one the presentation deck recorded independently: an
 * animating <circle> inside a large SVG cannot be composited on its own, so it
 * forces the whole layer to re-rasterise, and the cost tracks the number of
 * them rather than anything about the drawing.
 *
 * The budget is CIRCLES and not fibres, which was the first attempt and did
 * nothing here: this figure already had exactly twelve relay fibres, each
 * carrying two lanes of eight stations in two directions, which is the 384 that
 * cost the frames. Capping the fibre count left every one of them untouched.
 * A budget has to be denominated in the thing that costs.
 *
 * Spent by shortening each fibre's run rather than by darkening some fibres
 * entirely: a fibre with four stations still leaps, and a dark fibre next to a
 * lit one says something about the graph that is not true.
 */
const RELAY_CIRCLE_BUDGET = 132;
/** never fewer than this many stations, or the leap stops reading as a leap */
const RELAY_MIN_STATIONS = 3;

/**
 * One axis of the annotation's offset.
 *
 * Positive moves it past the cell by the gap; negative pulls its far edge back
 * by the same gap; zero centres it, which is what puts an annotation directly
 * above or below the thing it names.
 */
function axisShift(sign: number, gapPx: number): string {
  const g = gapPx.toFixed(0);
  if (sign > 0) return g + 'px';
  if (sign < 0) return 'calc(-100% - ' + g + 'px)';
  return '-50%';
}

/**
 * What the annotation says about the held cell.
 *
 * A cell's `reading` is the considered sentence and its `sub` is the second
 * line the drawing used to carry underneath the name. Now that the second line
 * is no longer drawn on the tissue, it has to reach the reader somewhere, so it
 * is the fallback here — the annotation says the reading where there is one and
 * the second line where there is not, and nothing at all for a cell that
 * carries neither.
 */
function callout1Body(
  nodes: FigureNode[],
  active: string,
  reading: { kind: string; body: string } | null
): string | null {
  if (reading?.body) return reading.body;
  const n = nodes.find(v => v.id === active);
  return n?.sub || null;
}

export const LivingFigure: React.FC<LivingFigureProps> = ({
  id, width: wideW, height: wideH, nodes: wideNodes, edges: wideEdges, core,
  portrait,
  caption, tag, footLeft, footRight, rest,
  backdrop: wideBackdrop, overlay: wideOverlay, rimStyle: wideRimStyle,
  grammar = 'organism'
}) => {
  const taut = grammar === 'emitter';
  /* drawn but not touchable — the preview on a page. See FigureInertContext. */
  const inert = React.useContext(FigureInertContext);
  /* opened on its own surface rather than sitting on a page — the figure's
     equivalent of arriving at the map, and the only place the formation plays */
  const inWorld = React.useContext(FigureWorldContext);
  /*
   * A SURFACE WITH NO HOVER HAS TO SHOW WHAT IT DOES.
   *
   * The figure answers when a cell is touched, and on a fine pointer the reader
   * discovers that by moving the pointer across it. On a coarse pointer there
   * is no such thing as moving across: nothing happens until something is
   * deliberately tapped, so a reader who does not already know the surface
   * responds has no way to find out except by guessing, and the only thing
   * telling them is one nine-pixel line.
   *
   * So on a coarse pointer the figure opens with its first readable cell
   * already held — the surface demonstrating itself rather than describing
   * itself. This is the map's own answer to the same problem, where the caption
   * "stays in view carrying whatever was last touched" on touch and fades on
   * hover. Nothing is added to the drawing and nothing new moves.
   */
  const coarse = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  ).current;
  const [touched, setTouched] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  /* the figure measures the column it was given, not the window: in a two-page
     spread the sheet is wide and the column is not */
  const holdRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const calloutRef = useRef<HTMLDivElement | null>(null);
  const [held, setHeld] = useState(0);
  /* where the annotation sits, in pixels within the measured wrapper, and which
     way it opens. Null until a cell is held. */
  const [callout, setCallout] = useState<{ x: number; y: number; sx: number; sy: number; gap: number } | null>(null);
  useEffect(() => {
    const el = holdRef.current;
    if (!el) return;
    const measure = () => setHeld(el.getBoundingClientRect().width);
    measure();
    // the window listener is not redundant: the column can change width without
    // the window doing so (a drawer opening, the layout setting flipping), and
    // the observer covers that — but a plain resize is the common case and some
    // environments deliver it first
    window.addEventListener('resize', measure);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(entries => {
        const cr = entries[0]?.contentRect;
        if (cr) setHeld(cr.width);
      });
      ro.observe(el);
    }
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, []);
  /*
   * PORTRAIT — THE SAME CELLS, STOOD UP.
   *
   * The sideways scroll below MIN_DRAWN_PX keeps a figure readable and it does
   * not keep it WHOLE: a reader on a phone sees a third of the drawing at a
   * time and has to hold the rest in their head, which is the one thing these
   * figures ask a reader not to have to do — they say what they say by where
   * things sit relative to each other, and a comparison you cannot see both
   * halves of at once is not a comparison.
   *
   * So a figure may declare a portrait layout, and below the same measured
   * floor it is DRAWN rather than scrolled. Nothing is dropped, nothing is
   * summarised and nothing is set as a list: the same cells, the same fibres,
   * repositioned for a tall rectangle. This is what FW-06 was reaching for
   * when it rejected the shrunken drawing, and what the spine failed to be.
   *
   * THE BRANCH IS ON A VALUE, NEVER AN EARLY RETURN — FW-06's own warning, and
   * it is load-bearing: `holdRef` is the observed node, so an early return
   * would unmount the thing being measured and the figure could never come
   * back. Everything below reads `nodes`, `W` and `H` and does not know
   * which form it is drawing.
   *
   * NOT ON THE INERT PREVIEW. The preview on a page is a thumbnail sized to a
   * fixed box by `FigurePreview`, which caps its width against the wide
   * form's ~2.2:1 ratio; a tall drawing handed to it would overrun a sheet
   * that cannot scroll (LY-02). The preview's job is to be recognisable, and
   * the portrait form belongs to the surface where the figure is read.
   */
  const fit = portrait && !inert && held > 0 && held < MIN_DRAWN_PX ? portrait : null;
  const W = fit ? fit.width : wideW;
  const H = fit ? fit.height : wideH;
  const nodes = fit ? fit.nodes : wideNodes;
  const edges = fit ? fit.edges ?? wideEdges : wideEdges;
  const backdrop = fit && fit.backdrop !== undefined ? fit.backdrop : wideBackdrop;
  const overlay = fit && fit.overlay !== undefined ? fit.overlay : wideOverlay;
  const rimStyle = fit && fit.rimStyle !== undefined ? fit.rimStyle : wideRimStyle;
  /*
   * The floor, carried across rather than chosen again.
   *
   * MIN_DRAWN_PX is a statement about TYPE, not about figures: at 600px a
   * name set at 8.5 user units in an 800-unit box renders at 6.4 screen
   * pixels, and that is the floor FW-06 measured. A portrait box is narrower
   * in user units, so the same 8.5 units survive a narrower screen in exact
   * proportion — scaling the floor by the two widths keeps the promise the
   * measurement made instead of picking a second number by eye (ME-01).
   *
   * For the three figures that carry one this lands at 251–270px, below the
   * width any mainstream phone reports, so the portrait form never scrolls
   * sideways in practice. The clamp is still here because a floor that only
   * holds on the devices you thought of is not a floor.
   *
   * AND THERE IS NO FLOOR ON THE INERT PREVIEW, WHICH WAS A BUG. The preview
   * on a page took the same 600px minimum, so at 375px it drew 600px of figure
   * into a 380px box — measured, on the TRENDWATCH I sheet — and a third of
   * every schematic page in the book hung off the right edge of a sheet that
   * is not supposed to scroll at all (LY-02). The reader saw two of three
   * cells and nothing said there was a third.
   *
   * The floor never applied to it in the first place: MIN_DRAWN_PX protects
   * the NAMES, and the preview renders none — `!inert && n.label` is the
   * condition a few hundred lines down, and it predates this. A preview is
   * recognised rather than read; the surface where the names exist is the one
   * the floor is about. So it fits its box, whole, at any width.
   */
  const floorPx = inert ? 0 : fit ? Math.round(MIN_DRAWN_PX * (fit.width / wideW)) : MIN_DRAWN_PX;

  /* On a coarse pointer, the first readable cell stands in until the reader
     picks one of their own. Never on an inert preview, which answers nothing. */
  const firstReadable = useMemo(
    () => nodes.find(n => n.reading || n.sub)?.id ?? null,
    [nodes]
  );
  const active = touched || pinned || (coarse && !inert ? firstReadable : null);

  /*
   * WHERE THE ANNOTATION GOES: WHEREVER THERE IS NO DRAWING.
   *
   * Flipping on which half of the figure the cell sits in answers "which side
   * has more room", and the question is "which side has no tissue" — on a
   * radial figure those are routinely different corners. A reading laid over a
   * lit filament is unreadable however it is styled.
   *
   * So all four diagonals are scored against the figure's own geometry: every
   * other cell counts heavily, every sampled point along every course counts
   * once, and running off the sheet is disqualifying. The emptiest corner wins.
   * It is a few hundred arithmetic operations over a handful of cells, run when
   * the held cell changes and when the column is resized — never per frame.
   *
   * The light-well behind the callout is the belt to this pair of braces, for
   * the figure where no corner quite is empty.
   */
  useEffect(() => {
    if (inert || !active) { setCallout(null); return; }
    const svg = svgRef.current, host = holdRef.current;
    if (!svg || !host) return;
    const n = nodes.find(v => v.id === active);
    if (!n) { setCallout(null); return; }
    const m = svg.getScreenCTM();
    if (!m) return;

    /* THE BOX IS SCORED AT THE SIZE IT IS ACTUALLY DRAWN, MEASURED.

       Two guesses were tried and both were wrong in the way that matters. A
       fraction of the figure (W * 0.36 by H * 0.26) was the wrong shape; a fixed
       300 by 86 pixels was more than twice the real height of a two-line
       annotation. Height is the sensitive one: an over-tall box runs off the top
       of the figure, the bounds test disqualifies the corner, and the scorer
       then picks a crowded corner over an empty one it wrongly believes is out
       of bounds. That is exactly how the annotation ended up across the middle
       of the drawing with clear sky above it.

       So it is measured. React has already re-rendered the annotation with this
       cell's text by the time this effect runs, so the element in the DOM is the
       one about to be placed — reading it back costs one layout and no guess
       survives. The fallback is only for the very first placement, before the
       element exists. */
    const svgRect = svg.getBoundingClientRect();
    const perUnit = svgRect.width > 0 ? svgRect.width / W : 1;
    const box = calloutRef.current?.getBoundingClientRect();
    const BW = Math.min(W * 0.5, (box?.width || 230) / perUnit);
    const BH = Math.min(H * 0.5, (box?.height || 44) / perUnit);
    /* Clear the cell's own arbor, not its soma. `r` is the cell body; the
       drawing around it reaches about 3.8 times that (DG-08), which is what the
       annotation was landing on. */
    /* Every word currently drawn on the figure, in viewBox units. Measured
       rather than derived: a figure's overlay is arbitrary JSX and there is no
       list of what is in it. */
    const textBoxes: Array<{ cx: number; cy: number; w: number; h: number }> = [];
    for (const t of Array.from(svg.querySelectorAll('text'))) {
      try {
        const b = (t as SVGGraphicsElement).getBBox();
        if (b.width > 0 && b.height > 0) {
          textBoxes.push({ cx: b.x + b.width / 2, cy: b.y + b.height / 2, w: b.width, h: b.height });
        }
      } catch { /* a text node not yet laid out has no box to avoid */ }
    }
    const reachOf = (v: FigureNode) => v.arborR ?? v.r * 3.8;
    /* Clear the whole arbor, and then some.
       At 0.62 of the reach the annotation started inside the drawing of the very
       cell it was describing, and over that cell's own lit name — the one mark
       on the figure it must never cover. The gap is carried to the transform in
       pixels below, so the box the scorer places and the box the browser draws
       are the same box. They were two numbers before, this one and a hard-coded
       22px, and they disagreed by exactly the overlap. */
    /* And clear the name as well as the arbor.
       A long name on a small cell is wider than the arbor it sits in, so a
       clearance measured from the drawing alone let the annotation land on the
       one mark it must never cover. The lit name is in the DOM by the time this
       effect runs, so its half-width is measurable rather than guessable. */
    let nameHalf = 0;
    const litName = svg.querySelector('text.fig-name-lit');
    if (litName) {
      try { nameHalf = (litName as SVGGraphicsElement).getBBox().width / 2; } catch { nameHalf = 0; }
    }
    const GAP = Math.max(reachOf(n) + 12, nameHalf + 14);
    const pos: Record<string, { x: number; y: number }> = {};
    for (const v of nodes) pos[v.id] = { x: v.x, y: v.y };
    /* EIGHT WAYS OUT, NOT FOUR.
       Four diagonals is the right idea and not enough of it. On a figure whose
       cells ring a dense middle — which is most of them here — every diagonal
       from a perimeter cell points either off the sheet or straight into the
       crowd, and the scorer is left choosing the least bad of four bad corners.
       The empty ground on a figure like that is the band directly above and
       below it, which no diagonal can reach. Adding the four straight
       directions costs four more candidates, each a few dozen comparisons, and
       gives the annotation somewhere to actually stand. */
    const DIRS = [
      { sx: 1, sy: -1 }, { sx: -1, sy: -1 }, { sx: 1, sy: 1 }, { sx: -1, sy: 1 },
      { sx: 0, sy: -1 }, { sx: 0, sy: 1 }, { sx: 1, sy: 0 }, { sx: -1, sy: 0 }
    ];
    /* Two rings, not one.
       Eight directions at a single distance still leaves a dense figure with
       nowhere to put an annotation, and the scorer then returns the least bad
       collision — which on a figure carrying its own axis labels means type on
       type. A second ring further out gives it somewhere to escape to. Standing
       off costs a little of the connection between the cell and its annotation,
       so the far ring is only taken when it is genuinely better: it carries a
       penalty of its own, and a near placement wins every tie. */
    let best = { sx: 1, sy: -1, ring: 1 }, bestScore = Infinity;
    for (const ring of [1, 2.05]) {
    for (const c of DIRS) {
      const cx = n.x + c.sx * (GAP * ring + BW / 2);
      const cy = n.y + c.sy * (GAP * ring + BH / 2);
      let score = 0;
      if (cx - BW / 2 < 4 || cx + BW / 2 > W - 4 ||
          cy - BH / 2 < 4 || cy + BH / 2 > H - 4) score += 1000;
      for (const v of nodes) {
        if (v.id === n.id) continue;
        const reach = reachOf(v);
        if (Math.abs(v.x - cx) < BW / 2 + reach && Math.abs(v.y - cy) < BH / 2 + reach) score += 12;
      }
      /* TEXT NEVER LANDS ON TEXT.
         Tissue and cells were scored from the start; the words already standing
         on the figure were not, so the annotation would clear every filament on
         the sheet and then come down squarely on an axis label. Type over type
         is the one collision no amount of receding the drawing can rescue,
         because the thing underneath is not part of the drawing and does not
         recede. Weighted above everything else here for that reason. The boxes
         are read from the DOM in the figure's own units, so this covers whatever
         a figure happens to draw — axis labels, the overlay, the names in the
         other cells — without any of it having to be declared. */
      for (const box of textBoxes) {
        if (Math.abs(box.cx - cx) < BW / 2 + box.w / 2 &&
            Math.abs(box.cy - cy) < BH / 2 + box.h / 2) score += 60;
      }
      for (const e of edges || []) {
        const p0 = pos[e.a], p1 = pos[e.b];
        if (!p0 || !p1) continue;
        for (let t = 0; t <= 1.001; t += 0.08) {
          const lx = p0.x + (p1.x - p0.x) * t, ly = p0.y + (p1.y - p0.y) * t;
          if (Math.abs(lx - cx) < BW / 2 && Math.abs(ly - cy) < BH / 2) score++;
        }
      }
      if (ring > 1) score += 8;
      if (score < bestScore) { bestScore = score; best = { sx: c.sx, sy: c.sy, ring }; }
    }
    }
    const hostRect = host.getBoundingClientRect();
    const p = new DOMPoint(n.x, n.y).matrixTransform(m);
    setCallout({ x: p.x - hostRect.left, y: p.y - hostRect.top,
                 sx: best.sx, sy: best.sy, gap: GAP * best.ring * perUnit });
  }, [active, inert, nodes, edges, W, H, held]);

  const byId = useMemo(() => {
    const m: Record<string, FigureNode> = {};
    nodes.forEach(n => { m[n.id] = n; });
    return m;
  }, [nodes]);

  const coreId = core || nodes.find(n => n.kind === 'core')?.id || nodes[0]?.id;
  const coreNode = byId[coreId];

  /* the tide takes its phase from distance to the core, so brightening rolls
     outward as a wave with nothing moving and no ends to read as a capsule */
  const tidePhase = (x: number, y: number, seed: number): string => {
    const d = coreNode ? Math.hypot(x - coreNode.x, y - coreNode.y) : 0;
    const along = (d / TIDE_WAVELENGTH) % 1;
    const jitter = (rnd(seed) - 0.5) * 0.09;
    const frac = (1 - along + jitter + 1) % 1;
    return `-${(frac * TIDE).toFixed(2)}s`;
  };

  /* ------------------------------------------------------------ the graph */

  const built = useMemo(() => {
    const key = (a: string, b: string) => [a, b].sort().join('|');
    const seen = new Set<string>();
    const out: Array<FigureEdge & { seed: number }> = [];
    const add = (e: FigureEdge) => {
      const k = key(e.a, e.b);
      if (e.a === e.b || seen.has(k) || !byId[e.a] || !byId[e.b]) return;
      seen.add(k);
      out.push({ ...e, seed: out.length * 7 + 3 });
    };

    (edges || []).forEach(add);

    // proximity fill: nothing on a figure floats, so every cell reaches its
    // nearest neighbours whether or not the figure declared the link
    nodes.forEach(n => {
      const near = nodes
        .filter(m => m.id !== n.id)
        .map(m => ({ m, d: Math.hypot(m.x - n.x, m.y - n.y) }))
        .sort((p, q) => p.d - q.d)
        .slice(0, n.kind === 'minor' ? 1 : 2);
      near.forEach(({ m }) => add({ a: n.id, b: m.id, faint: true }));
    });

    // and if a pocket is still islanded, grow tissue across the narrowest gap
    const linked: Record<string, string[]> = {};
    nodes.forEach(n => { linked[n.id] = []; });
    out.forEach(e => { linked[e.a].push(e.b); linked[e.b].push(e.a); });

    const components = () => {
      const comp: Record<string, number> = {};
      let c = 0;
      nodes.forEach(n => {
        if (comp[n.id] !== undefined) return;
        const q = [n.id];
        comp[n.id] = c;
        while (q.length) {
          const cur = q.shift()!;
          linked[cur].forEach(nb => {
            if (comp[nb] === undefined) { comp[nb] = c; q.push(nb); }
          });
        }
        c++;
      });
      return comp;
    };

    for (let guard = 0; guard < 12; guard++) {
      const comp = components();
      if (new Set(Object.values(comp)).size <= 1) break;
      let best: { a: string; b: string; d: number } | null = null;
      nodes.forEach(p => nodes.forEach(q => {
        if (comp[p.id] === comp[q.id]) return;
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (!best || d < best.d) best = { a: p.id, b: q.id, d };
      }));
      if (!best) break;
      const bridge = best as { a: string; b: string; d: number };
      add({ a: bridge.a, b: bridge.b, faint: true });
      linked[bridge.a].push(bridge.b);
      linked[bridge.b].push(bridge.a);
    }

    /* polarity: signal leaves the core and travels outward, the same direction
       the tide rolls, so the end nearer the core is presynaptic */
    const adj: Record<string, string[]> = {};
    nodes.forEach(n => { adj[n.id] = []; });
    out.forEach(e => { adj[e.a].push(e.b); adj[e.b].push(e.a); });

    const depth: Record<string, number> = { [coreId]: 0 };
    const queue = [coreId];
    while (queue.length) {
      const cur = queue.shift()!;
      (adj[cur] || []).forEach(nb => {
        if (depth[nb] === undefined) { depth[nb] = depth[cur] + 1; queue.push(nb); }
      });
    }

    const courses = out.map(e => {
      const da = depth[e.a] ?? 99;
      const db = depth[e.b] ?? 99;
      const pre = da <= db ? e.a : e.b;
      const post = pre === e.a ? e.b : e.a;
      const A = byId[pre];
      const B = byId[post];
      const pts = wander(A.x, A.y, B.x, B.y, e.seed, 20, taut);
      return {
        edge: e,
        pre,
        post,
        pts,
        bbox: boxOf(pts)
      };
    });

    /* crossings must fuse: two strands merely laid over one another read as
       unrelated ribbons, which is what makes a region look disconnected even
       when every cell is reachable */
    const junctions: Array<{ x: number; y: number; angA: number; angB: number; seed: number; a: string; b: string }> = [];
    for (let i = 0; i < courses.length; i++) {
      for (let j = i + 1; j < courses.length; j++) {
        const ci = courses[i];
        const cj = courses[j];
        // sharing a cell is not grounds to skip a pair: two fibres leaving the
        // same soma still cross far out in open space. Only a crossing landing
        // ON a cell is already resolved, and that is tested per-point below.
        // Two courses whose bounding boxes do not touch cannot cross, and most
        // pairs on a figure do not touch. Rejecting them here turns the search
        // from every-segment-against-every-segment into a handful of real
        // candidates: measured on FIG 0.1, 312,000 segment intersections became
        // about 12,000. Same junctions, same seeds, same drawing.
        if (!boxesTouch(ci.bbox, cj.bbox)) continue;

        let found = false;
        for (let a = 0; a < ci.pts.length - 1 && !found; a++) {
          const a0 = ci.pts[a];
          const a1 = ci.pts[a + 1];
          const aMinX = Math.min(a0[0], a1[0]);
          const aMaxX = Math.max(a0[0], a1[0]);
          const aMinY = Math.min(a0[1], a1[1]);
          const aMaxY = Math.max(a0[1], a1[1]);
          for (let b = 0; b < cj.pts.length - 1 && !found; b++) {
            const b0 = cj.pts[b];
            const b1 = cj.pts[b + 1];
            // the same rejection one level down, on the segments themselves
            if (Math.min(b0[0], b1[0]) > aMaxX || Math.max(b0[0], b1[0]) < aMinX) continue;
            if (Math.min(b0[1], b1[1]) > aMaxY || Math.max(b0[1], b1[1]) < aMinY) continue;

            const p = crossing(a0, a1, b0, b1);
            if (!p) continue;
            // a crossing landing on a cell is already fused by the cell
            if (nodes.some(nd => Math.hypot(nd.x - p[0], nd.y - p[1]) < nd.r * 1.35)) continue;
            junctions.push({
              x: p[0], y: p[1],
              angA: Math.atan2(a1[1] - a0[1], a1[0] - a0[0]),
              angB: Math.atan2(b1[1] - b0[1], b1[0] - b0[0]),
              seed: i * 31 + j * 7 + 1,
              a: ci.pre, b: cj.pre
            });
            found = true;
          }
        }
      }
    }

    return { courses, adj, junctions };
  }, [nodes, edges, byId, coreId, taut]);

  /*
   * Which fibres get one, when there are more than the budget allows.
   *
   * Ranked, never truncated arbitrarily, so the fibres that keep their relays
   * are the ones whose claim IS the traffic on them: a declared phase first,
   * because a phase exists to be seen against another one and there is nothing
   * to see on a dark fibre; then declared traffic; then the heavier bundles,
   * which is what the drawing already says is load-bearing. Ties break on
   * index, so the choice is stable across renders and across reloads.
   */
  const relayStations = useMemo(() => {
    const want = built.courses
      .map((c, i) => ({ i, e: c.edge }))
      .filter(({ e }) => e.both || e.sync !== undefined);
    /* circles this fibre would draw at N stations: (N + 1) positions, two
       directions where light returns, once per lane */
    const perStation = want.reduce((sum, { e }) => {
      const lanes = Math.max(1, Math.round(e.traffic ?? 1));
      return sum + lanes * (e.both ? 2 : 1);
    }, 0);
    const out = new Map<number, number>();
    if (!want.length) return out;
    /* one station count for the whole figure, so no fibre is arbitrarily
       shorter than its neighbour */
    const stations = Math.max(
      RELAY_MIN_STATIONS,
      Math.min(7, Math.floor(RELAY_CIRCLE_BUDGET / Math.max(1, perStation)) - 1)
    );
    for (const { i } of want) out.set(i, stations);
    return out;
  }, [built.courses]);


  /* touch propagates by topology, not by geometry, so excitation runs along
     the tissue instead of jumping across whatever happens to be nearby */
  /* -------------------------------------------------------- the formation */
  /*
   * The figure assembles out of dots of light, exactly as the map does.
   *
   * FW-01 is the reason this is here rather than a decision to be made: the
   * figures are the same organism as the map at another scale, and the rule
   * records what it cost the last time they were allowed to fall a generation
   * behind it — "the reader quietly stopped looking like the thing it opens out
   * of". When the map's grammar moves, it gets ported.
   *
   * ONLY IN A WORLD. A figure appears twice: inline on a page as an inert
   * preview, and opened on its own surface. Only the second is an arrival. A
   * preview assembling itself would mean every page turn onto a figure page
   * fired a five-second animation the reader did not ask for and cannot read
   * past — an attention mechanism on a page of prose, which is the thing the
   * manuscript is about. The spine form gets nothing either: it is a list of
   * names, and there is no tissue there to assemble.
   */
  const mayForm = inWorld && !inert;

  const willForm = useMemo(() => {
    if (!mayForm || FIGURES_FORMED.has(id)) return false;
    if (typeof window === 'undefined') return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    if (DEVICE_TIER === 'low') return false;
    return true;
  }, [mayForm, id]);

  const [formed, setFormed] = useState(1);
  const [forming, setForming] = useState(false);

  useEffect(() => {
    if (!willForm || FIGURES_FORMED.has(id)) return;
    FIGURES_FORMED.add(id);
    setFormed(0);
    setForming(true);
  }, [willForm, id]);

  /*
   * The recording, in the figure's own units.
   *
   * A figure is a few hundred units across against the map's thousand, so the
   * spacing and every absolute distance are scaled to the sheet — same apparent
   * density, not the same number (see `record`). `built.courses` is already
   * `{ pts }`, the same shape the map hands over, which is what FW-01's "one
   * routine" buys: the recorder did not have to learn anything about figures.
   */
  const formation = useMemo(() => {
    if (!forming) return null;
    const k = Math.min(W, H) / 900;
    return record(built.courses, coreNode?.x ?? W / 2, coreNode?.y ?? H / 2, {
      spacing: Math.max(1.9, SPACING * k),
      scale: Math.max(0.3, k),
      /* the figure grows out of its own cells, as the map does */
      origins: nodes.map(nd => [nd.x, nd.y] as const)
    });
  }, [forming, built.courses, coreNode, nodes, W, H]);

  /*
   * The ramp is written to the node, not through React — the map's measurement,
   * and it applies here for the same reason: a figure is a few thousand
   * elements and re-rendering all of them every frame to change one number
   * starves the loop drawing the particles. See `rampTissue` in `Orrery.tsx`
   * and entry 28 in docs/OPEN.md.
   */
  const rampFigure = (landed: number) => {
    const el = svgRef.current;
    if (el) el.style.opacity = String(landed >= 1 ? 1 : Math.pow(landed, 1.45));
  };
  const endFormation = () => {
    const el = svgRef.current;
    if (el) el.style.opacity = '';
    setFormed(1);
    setForming(false);
  };

  const dist = useMemo(() => {
    if (!active) return null;
    const d: Record<string, number> = { [active]: 0 };
    const q = [active];
    while (q.length) {
      const cur = q.shift()!;
      (built.adj[cur] || []).forEach(nb => {
        if (d[nb] === undefined) { d[nb] = d[cur] + 1; q.push(nb); }
      });
    }
    return d;
  }, [active, built]);

  const distOf = (nid: string) => (dist && dist[nid] !== undefined ? dist[nid] : 99);
  const excite = (nid: string) => {
    if (!dist) return 0;
    const d = distOf(nid);
    return d >= 3 ? 0 : 1 - d / 3;
  };
  const ripple = (nid: string): React.CSSProperties => ({
    transition: `opacity ${RESPOND}s ${EASE} ${(Math.min(distOf(nid), 4) * 0.04).toFixed(2)}s`
  });

  const reading = (active && byId[active]?.reading) || rest || null;
  const detail = (pinned && byId[pinned]?.detail) || null;

  /**
   * Depth of field. The cells are drawn in two passes rather than one.
   *
   * A drawing where everything is equally sharp is a drawing with no distance in
   * it, and the field cells — the ones that exist to say "there are more of these
   * than you can count" — were competing for focus with the three that carry the
   * argument. So they recede: one Gaussian pass over the whole group and a step
   * down in opacity, which is what a lens does and what nothing else here was
   * doing.
   *
   * Two constraints shape it. The blur is applied to the GROUP, not per cell —
   * one filter pass over one rasterised group is cheap, twenty-six are not. And
   * a cell only recedes if it carries no name: text must never be blurred, so a
   * labelled minor stays in the sharp pass by construction rather than by anyone
   * remembering to check.
   *
   * The indices are carried through the partition. Every period, phase and seed
   * in this figure is derived from a cell's position in `nodes`, so splitting the
   * list without keeping the original index would redraw the whole organism.
   */
  const renderCells = (draw: (n: FigureNode, i: number) => React.ReactNode) => {
    const indexed = nodes.map((n, i) => ({ n, i }));
    const recedes = ({ n }: { n: FigureNode }) => n.kind === 'minor' && !n.label && !n.sub;
    const far = indexed.filter(recedes);
    const near = indexed.filter(x => !recedes(x));
    return (
      <>
        {far.length > 0 && (
          <g filter={`url(#${id}-recede)`} opacity={0.72}>
            {far.map(({ n, i }) => draw(n, i))}
          </g>
        )}
        {near.map(({ n, i }) => draw(n, i))}
      </>
    );
  };

  /*
   * THE STACKED SPINE WAS HERE, AND IT IS GONE.
   *
   * FW-06 swapped the drawing for a list of its cells below 600px. Removed at
   * the author’s instruction — "the list is unclear and impossible to
   * understand" — and the judgement is right: on a window under about 660px
   * that list was ALL a reader ever saw of any figure in the book, because the
   * stage hands the figure its width minus padding.
   *
   * It listed each cell as a name and a second line, with the reading, the
   * detail and the wiring on press. The information was all there and the
   * ARGUMENT was not: these figures say what they say by where things sit and
   * what joins them — a causal order, two courses under one shock, three
   * readings on one scale — and none of that survives being set as a column of
   * text. A list of the parts of a diagram is not a diagram.
   *
   * What replaces it is above the return: the drawing, always, held at
   * MIN_DRAWN_PX and scrolling when the frame is narrower than that.
   */

  const drawn = (
    <>
      {/* The rim wraps the drawing and nothing else — not the reading strip
          below it, which is type and must not be darkened at its edges. */}
      <div className={`figure-rim${inert ? ' figure-rim-inert' : ''}`} style={rimStyle}>
      {/* The wrapper exists so the canvas can sit exactly on the drawing. It
          hugs the svg — which is display:block and sized by its own aspect
          ratio — so `inset-0` is the svg's box and not the rim's padding. */}
      <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={formed < 1 ? { opacity: 0 } : undefined}
        className="w-full h-auto font-sans"
        xmlns="http://www.w3.org/2000/svg"
        onPointerLeave={() => setTouched(null)}
      >
        <FigureDefs id={id} />

        {/*
          Flex. An animated turbulence displacement over the fibre, so the
          tissue undulates rather than only brightening and dimming. A filter is
          one pass over the already-rasterised group, which is why the map can
          afford it across 6000 elements. It is applied to the strands only —
          displacing the names would smear type that is already small.
        */}
        <defs>
          <filter id={`${id}-flex`} x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence type="fractalNoise" baseFrequency="0.0075" numOctaves={2} result="flexNoise">
              <animate attributeName="baseFrequency"
                values="0.0075;0.0122;0.0075" dur="41.3s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="flexNoise" scale={4}
              xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* The far plane. One pass, in user units, over the group of field
              cells — see renderCells. Kept under a unit so the arbors stay
              legible as line: past that the tufts fuse into the grey mass this
              drawing spends every other rule avoiding. */}
          <filter id={`${id}-recede`} x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation={0.85} />
          </filter>
        </defs>

        {/* No backdrop. The map removed its grid on the finding that a
            rectilinear field behind a thing containing no straight lines is the
            one texture guaranteed to read as a diagram; figures kept theirs
            longer and get the same answer. The ground is black and empty. */}

        {/* clearing the pin by touching open tissue */}
        <rect width={W} height={H} fill="transparent" onClick={() => setPinned(null)} />

        {backdrop}

        {/* ---------------------------------------- every connection, one routine */}
        {/* The connections recede while an annotation is up — see .fig-recede-live.
            The class carries a CSS filter, which overrides this presentation
            attribute for as long as it is applied, so the flex displacement and
            the blur are never both running: it is one filter either way, and the
            cheaper one is the one that runs while you are reading. */}
        {/* THE COURSES SUM WHERE THEY CROSS, AS THE MAP'S DO.

            FW-01 has the figures and the map as one drawing made twice, and on
            light they had come apart: the map was rebuilt so that DENSITY IS
            EMISSION — its points composite additively, so a crowded arbor
            climbs to white on its own and a sparse one stays a scatter (see
            TissueField, and OPEN.md 51). The figures kept compositing normally,
            where a hundred overlapping strands look much like three, so their
            cores stayed flat while the map's burned.

            `screen` is the same arithmetic in SVG that `lighter` is on the
            canvas: overlapping light adds rather than replacing. It costs one
            CSS property and no elements, which matters here — PF-04 is
            unambiguous about filters over big animated groups, and this figure
            was already the first one over PF-01's budget.

            DG-02 survives it. Nothing becomes an area: what accumulates is
            luminance where strokes already lie on each other, and the marks are
            the same hairlines they were. */}
        <g
          filter={`url(#${id}-flex)`}
          className={active ? 'fig-recede-live' : undefined}
          style={{ mixBlendMode: 'screen' }}
        >
          {built.courses.map((c, i) => {
            const exc = Math.max(excite(c.pre), excite(c.post));
            const stations = relayStations.get(i);
            const base = c.edge.faint ? 0.5 : 0.76;
            const op = Math.min(1, base + exc * 0.24);
            const weight = (c.edge.weight ?? (c.edge.faint ? 0.8 : 1.25)) * (0.85 + exc * 0.5);
            const mid = c.pts[Math.floor(c.pts.length / 2)];
            return (
              <g key={`e${i}`} className="strand-breathe"
                style={{ ...ripple(c.pre), animationDelay: tidePhase(mid[0], mid[1], i + 3) }}>
                {tissue(c.pts, weight, op, c.edge.seed, `${id}e${i}`,
                  !c.edge.both, c.edge.both, c.edge.traffic,
                  c.edge.fade, c.edge.sync, stations, taut)}
              </g>
            );
          })}

          {/* where two fibres cross, a bipolar cell relays between them */}
          {built.junctions.map((j, i) => {
            const exc = Math.max(excite(j.a), excite(j.b));
            const lit = 0.38 + exc * 0.4;
            const bis = Math.atan2(
              Math.sin(j.angA) + Math.sin(j.angB),
              Math.cos(j.angA) + Math.cos(j.angB)
            );
            const rx = 2.4 + rnd(j.seed + 1) * 1.1;
            const ry = 1.2 + rnd(j.seed + 2) * 0.5;
            const body: Array<[number, number]> = Array.from({ length: 13 }, (_, k) => {
              const a = (k / 12) * Math.PI * 2;
              const lx = Math.cos(a) * rx * (0.92 + rnd(j.seed + k) * 0.16);
              const ly = Math.sin(a) * ry * (0.9 + rnd(j.seed + k + 30) * 0.2);
              return [
                j.x + lx * Math.cos(bis) - ly * Math.sin(bis),
                j.y + lx * Math.sin(bis) + ly * Math.cos(bis)
              ];
            });
            return (
              <g key={`j${i}`} style={ripple(j.a)} opacity={lit}>
                {[j.angA, j.angA + Math.PI, j.angB, j.angB + Math.PI].map((a, k) => (
                  <path key={k} fill="none" stroke="currentColor" strokeWidth={0.26}
                    strokeLinecap="round" opacity={0.7}
                    d={arcSegment(
                      j.x + Math.cos(a) * rx * 0.8, j.y + Math.sin(a) * rx * 0.8,
                      j.x + Math.cos(a) * (rx + 7), j.y + Math.sin(a) * (rx + 7),
                      (rnd(j.seed + k) - 0.5) * 3.2
                    )} />
                ))}
                {/* The relay cell is drawn, not filled. There is one at every
                    crossing, and a filled spindle at each was the largest
                    single source of grey haze — its own outline as a filament
                    is what every other body in this drawing is. */}
                <path d={`${smoothPolyline(body)} Z`} fill="none" stroke="currentColor"
                  strokeWidth={0.3} strokeLinecap="round" opacity={0.75} />
                <circle cx={j.x.toFixed(1)} cy={j.y.toFixed(1)} r={0.7} fill="currentColor" opacity={0.85} />
              </g>
            );
          })}
        </g>

        {/* The overlay recedes too. It is type standing on the drawing, so
            leaving it lit while the drawing dims would make the one thing you
            are not reading the brightest thing on the sheet. */}
        <g className={active ? 'fig-recede-live' : undefined}>{overlay}</g>

        {/* --------------------------------------------------------- the cells */}
        {renderCells((n, i) => {
          const isActive = active === n.id;
          const isPinned = pinned === n.id;
          const exc = excite(n.id);
          const rest0 = n.intensity ?? 1;
          const minor = n.kind === 'minor';
          /* A shared baseline is what makes two cells comparable: unequal radii
             put their names on different lines, and the eye then reads two rows
             instead of one row of two things. */
          const glyphSize = n.r * 0.72;
          /* THE NAME IS CENTRED IN ITS CELL.

             Centring SVG text by nudging its baseline is guesswork, and there
             were three guesses stacked here: a +3, and `labelAt`/`labelDy`,
             which were offsets tuned back when the name stood OUTSIDE the soma.
             Carrying them over tilted every name they touched off the centre of
             the cell it had just moved into. All three are gone.
             `dominant-baseline: central` puts the glyph box's own middle on the
             point given, which is right for every name at every size without a
             number being chosen for it.

             The one offset left is real: a cell carrying a glyph already has a
             mark on its centre line, so the name drops clear of it and the two
             read as centred together. */
          const nameY = n.y + (n.glyph ? glyphSize * 0.72 : 0);

          return (
            <g key={n.id}
              /* every cell but the one you are holding steps back, so the held
                 cell and its annotation are the only things in focus */
              className={active && !isActive ? 'fig-recede-live' : undefined}
              onPointerEnter={() => setTouched(n.id)}
              onPointerLeave={() => setTouched(null)}
              onClick={ev => { ev.stopPropagation(); setPinned(isPinned ? null : n.id); }}
              onKeyDown={ev => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setPinned(isPinned ? null : n.id); }
                if (ev.key === 'Escape') setPinned(null);
              }}
              onFocus={() => setTouched(n.id)}
              onBlur={() => setTouched(null)}
              tabIndex={0}
              role="button"
              aria-pressed={isPinned}
              aria-label={n.reading ? `${n.reading.kind} — ${n.reading.body}` : n.label || n.id}
              style={{ cursor: 'pointer' }}>

              {/* the touch target, larger than the drawn cell */}
              <circle cx={n.x} cy={n.y} r={n.r + 16} fill="transparent" />

              {/* clamped: an opacity over 1 is silently floored to 1 by the
                  renderer, which flattens the excitation gradient exactly where
                  it is supposed to be most legible */}
              <g style={ripple(n.id)}
                opacity={Math.min(1, (minor ? 0.5 : 0.74) * rest0 + exc * 0.2 + (isActive ? 0.1 : 0))}>

                {/* Everything alive breathes and sways, and never in step:
                    each cell takes its own period through the golden ratio and
                    a negative delay, because synchronised motion reads as
                    machinery. Transforms are safe here and only here — the
                    group is one cell, not the whole organism, and it carries an
                    explicit origin in user units so view-box needs no measure. */}
                <g className={minor ? 'sway' : 'alive'}
                  style={{
                    transformOrigin: `${n.x}px ${n.y}px`,
                    animationDuration: `${period(minor ? 26 : 11, i * 3 + 5, 0.5).toFixed(2)}s`,
                    animationDelay: `-${(rnd(i + 17) * 14).toFixed(2)}s`
                  }}>

                {/* THE CELL, OR THE EMITTER — the figure says which.

                    Two things make a node a neurone: the dendritic field
                    coning out around it and the vortex of strands turning
                    inside it. On an argument figure they are the drawing — the
                    taxonomy, the root system and the postures are pictures of
                    living structure and the tissue is what says so. On a trend
                    report they are a costume on a measurement.

                    The emitter is what was already underneath both: the glow
                    the tide passes through and the core, plus a seeded scatter
                    thinning outward so the light has a grain rather than a rim.
                    DG-02 is not bent for it — "the only fills in the system are
                    the light sources" — and that is what it is. */}
                {taut ? (
                  <Emitter cx={n.x} cy={n.y} r={n.r} seed={i * 19 + 7}
                    opacity={(isActive ? 0.85 : 0.55 + exc * 0.2) * rest0} />
                ) : (
                  <>
                    {/* the dendritic field — overlapping its neighbours' */}
                    <Dendrites id={id} cx={n.x} cy={n.y}
                      r={n.arborR ?? n.r * (minor ? 3.2 : 3.8)}
                      arms={n.arborArms ?? (minor ? 5 : 7)}
                      depth={3} seed={i * 19 + 7}
                      opacity={(isActive ? 0.56 : 0.42) * rest0}
                      width={0.5} />

                    {/* No membrane fill. NOTHING here is a filled area — flat
                        tone over an area reads as a mass at any strength, and
                        the map tried this shape at 0.17 and again at 0.055
                        before removing it. Only line has no mass. The
                        multipolar silhouette is still spoken, by the arbor
                        coning outward around the cell. */}

                    {/* the swirl inside the cell — density defines where it is,
                        so there is no rim to give it a hard edge */}
                    {!minor && (
                      <VortexSphere id={id} cx={n.x} cy={n.y} r={n.r}
                        seed={i * 5 + 2} strands={n.kind === 'core' ? 30 : 17}
                        intensity={(isActive ? 1.05 : 0.9 + exc * 0.1) * rest0}
                        reverse={i % 2 === 0}
                        spinning={n.spin ?? n.kind === 'core'}
                        spinSeconds={period(150, i + 2)} />
                    )}
                  </>
                )}

                {/* the glow the tide passes through */}
                <circle cx={n.x} cy={n.y} r={n.r * (minor ? 0.9 : 1.55)}
                  fill={`url(#${id}-core)`}
                  className="strand-breathe"
                  style={{ animationDelay: tidePhase(n.x, n.y, i + 11) }}
                  opacity={(isActive ? 0.62 : 0.26 + exc * 0.26) * rest0} />
                <circle cx={n.x} cy={n.y} r={minor ? 1 : 1.7} fill="currentColor"
                  opacity={(isActive ? 0.95 : 0.5 + exc * 0.3) * rest0} />

                {/* a pinned cell keeps a soft standing swell so you can see
                    which reading is open without a ring or a highlight box */}
                {isPinned && (
                  <circle cx={n.x} cy={n.y} r={n.r * 2.1} fill={`url(#${id}-core)`}
                    opacity={0.3} className="ambient-breathe" />
                )}
                </g>
              </g>

              {/* the glyph lives on the moving surface, so it surfaces only
                  under touch — a fixed mark on a turning sphere reads pasted on */}
              {n.glyph && (
                <text x={n.x} y={n.y + glyphSize * 0.35} textAnchor="middle" fill="currentColor"
                  /* the numeric ladder: 300 at 16 units, 200 by 30 — large type
                     falls apart at the weight and tracking small type needs */
                  fontSize={glyphSize} fontWeight={glyphSize >= 26 ? 200 : 300}
                  letterSpacing={0}
                  opacity={isActive ? 0.95 : (n.glyphAtRest ?? 0) * rest0}
                  style={{ transition: `opacity ${RESPOND}s ${EASE}`, pointerEvents: 'none' }}>
                  {n.glyph}
                </text>
              )}

              {/* The name stays legible at rest so navigation is never a guess —
                  on the opened figure. The inert preview on a page is a drawing
                  sized to a box, not a surface anyone navigates: there a name
                  is a caption the sheet did not ask for, and labelAtRest does
                  not apply. Names belong to the surface where the cells can be
                  touched. */}
              {/* The name sits inside the cell it names and burns there.

                  It used to stand outside the soma, above or below, which is
                  where a label goes when it is a caption for a shape. This one
                  is not a caption: the cell you are holding is the lit one, and
                  the name is the light. Held, it goes full white with the bloom
                  (.fig-name-lit); at rest it keeps exactly the resting rule it
                  always had, so a figure whose names carry its argument still
                  reads at rest and every other figure is still cells and fibre
                  until you touch one.

                  The second line is gone from the drawing entirely — it is in
                  the annotation beside the cell now, where a sentence can be
                  read without lying across the tissue. */}
              {!inert && n.label && (
                <text x={n.x} y={nameY} textAnchor="middle" dominantBaseline="central"
                  fill="currentColor"
                  className={`fig-name${isActive ? ' fig-name-lit' : ''}`}
                  fontSize={8.5} fontWeight={300} letterSpacing={1.7}
                  opacity={(isActive ? 1 : Math.max(n.labelAtRest ?? 0, exc * 0.45)) * rest0}
                  style={{ pointerEvents: 'none' }}>
                  {n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* The assembly. Over the drawing, never under it: the particles are the
          light arriving and the tissue is what they leave behind. */}
      {formed < 1 && formation && (
        <Formation
          record={formation}
          active={forming}
          view={{ x: 0, y: 0, w: W, h: H }}
          onProgress={rampFigure}
          onDone={endFormation}
        />
      )}
      </div>
      </div>

      {/* ------------------------------------------------------ the reading */}
      {/* Dropped where the figure cannot be touched: an inert preview can never
          change this strip, so it is dead furniture whose fallback line offers
          an interaction the preview does not have. */}
      {!inert && (
      <div className="mt-2 min-h-[46px]">
        <div className="opacity-30">
          <Vein opacity={0.4} phase={id.length * 1.7} />
        </div>
        {/* What is left down here is the invitation, and only that.

            The reading itself now stands beside the cell it belongs to, so
            repeating it under the drawing would say the same thing twice in one
            frame, which is exactly what TY-05 forbids. When a cell is held this
            strip has nothing to add and goes quiet; the figure's own resting
            state — before anything is held — is the one moment there is
            something to say, and it says it once.

            The row keeps its height either way so that holding a cell never
            moves the drawing above it. */}
        <div className="pt-1.5 flex items-start justify-center gap-2.5"
          style={{ transition: `opacity ${RESPOND}s ${EASE}` }}>
          <div className="pt-0.5">
            <Soma size={9} opacity={active ? 1 : 0.45} phase={2.3} />
          </div>
          <div className="min-w-0 text-center">
            {!active && (
              <div className="text-[9px] uppercase tracking-[0.2em] opacity-45">
                Touch a cell to read it · press to keep it open
              </div>
            )}
            {!active && rest && (
              <div className="text-[12px] font-light leading-relaxed mt-1 opacity-70">{rest.body}</div>
            )}
          </div>
        </div>
      </div>
      )}
    </>
  );

  return (
    <FigureFrame caption={caption} tag={tag} footLeft={footLeft} footRight={footRight}>
      {/* THE FIGURE IS ALWAYS THE DRAWING. THE LIST IS GONE.

          AND THE SIDEWAYS SCROLL IS THE FALLBACK, NOT THE ANSWER. A figure
          that declares a `portrait` layout is re-laid-out for the narrow
          column and drawn whole; everything below is what happens to a figure
          that has not been given one yet. The scroll is what the drawing gets
          when nobody has decided where its cells go on a tall sheet — which is
          honest, and is not the same as good.

          FW-06 traded the picture for a stacked spine below 600px, and the
          spine has been removed at the author's instruction: "the list is
          unclear and impossible to understand." That judgement is the one that
          counts — a fallback nobody can read is not a fallback, and on a window
          under ~660px it was ALL a reader ever saw of any figure in the book.

          THIS OVERTURNS THE LAST CLAUSE OF FW-06, WHICH SHOULD BE SAID PLAINLY.
          That rule rejects both alternatives by name: a scaled-down drawing
          ("at 500px the 8.5-unit names render at five screen pixels") and this
          one ("never restore a min-w on a figure SVG — that trades an
          unreadable diagram for a side-scrolling one"). With the list rejected
          too, all three options were forbidden and one had to give.

          The side-scroll is the one that keeps the figure COMPREHENSIBLE, which
          is the thing that was actually missing: every proportion, every label
          position and every reading survives at full size, and the cost is a
          gesture on a surface that already reads horizontal gestures (LY-03).
          The scaled drawing would have kept the shape and lost the words.

          `soft-scroll` shows no bar until there is something to scroll, so a
          window wide enough for the figure sees no change at all. */}
      <div
        ref={holdRef}
        className="w-full relative soft-scroll"
        style={{ overflowX: 'auto' }}
      >
        <div style={{ minWidth: `${floorPx}px` }}>
        {drawn}
        </div>
        {/* The annotation. Placed against the drawing's own emptiness by the
            effect above, and standing on an emptied ground (.fig-callout::before)
            for the figure where no corner quite is empty. It never carries the
            cell's NAME: that is burning inside the cell, and saying it here as
            well would be the same name twice in one frame. */}
        {!inert && callout && active && (callout1Body(nodes, active, reading) || null) && (
          <div
            ref={calloutRef}
            className="fig-callout on"
            style={{
              left: `${callout.x.toFixed(1)}px`,
              top: `${callout.y.toFixed(1)}px`,
              /* Offset by the gap the scorer used, on whichever axes the chosen
                 direction actually moves along. A direction with a zero
                 component is centred on that axis, which is what makes "straight
                 above" sit over the cell rather than beside it. */
              transform: 'translate(' + axisShift(callout.sx, callout.gap) + ', ' + axisShift(callout.sy, callout.gap) + ')',
              /* The text hangs off the end nearest the cell, so the eye returns
                 to the drawing rather than to a ragged margin. Centred where the
                 annotation sits directly above or below. */
              textAlign: callout.sx < 0 ? 'right' : callout.sx > 0 ? 'left' : 'center'
            }}
          >
            {reading?.kind && (
              <div className="fig-callout-kind text-[9px] font-light uppercase tracking-[0.2em] opacity-70">
                {reading.kind}
              </div>
            )}
            <div className="fig-callout-body text-[12px] font-light leading-relaxed mt-1">
              {callout1Body(nodes, active, reading)}
            </div>
            {detail && (
              <ul className="mt-1.5 space-y-1 text-left">
                {detail.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] font-light leading-relaxed opacity-100">
                    <span className="pt-1"><Soma size={7} opacity={0.7} phase={(i * 4.1) % 19} /></span>
                    <span className="min-w-0">{d}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </FigureFrame>
  );
};
