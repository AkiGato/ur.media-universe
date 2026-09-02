import React, { useEffect, useReducer, useRef, useState, useMemo } from 'react';
import { BOOK_DATA } from '../data/bookData';
import {
  BOOK_PAGES,
  BookPage,
  FIGURES,
  FIGURE_PASSAGES,
  firstPageOfChapter,
  firstReferencesPage,
  pageForPromptRule
} from '../data/pageModel';
import {
  FigureDefs, VortexSphere, Dendrites, GrowthCone, Label,
  rnd, smoothPolyline, arcSegment
} from './figures/FigurePrimitives';
import { Soma } from './organic/Organic';
import { useFrameBudget } from '../utils/frameBudget';

const ID = 'orrery';

/**
 * Below this the map is replaced by the stacked spine.
 *
 * It was 820, which is not a phone — it is an ordinary half-screen laptop
 * window, and at that width the map simply vanished on someone who had done
 * nothing but not maximise their browser. The organism scales with its viewBox
 * and stays legible far below that; the stacked spine is for widths where the
 * cells would genuinely collide, which is the 700 the design rules name.
 */
const NARROW_PX = 700;

/** Margin the resting view adds around the layout box, so nothing is clipped. */
const HOME_MARGIN_X = 150;
const HOME_MARGIN_Y = 126;

const W = 1000;
const H = 840;
const CX = 500;
const CY = 420;

/*
 * A symmetric, slow-in slow-out curve.
 *
 * The previous easing was cubic-bezier(0.22, 1, 0.36, 1) — an ease-out quint,
 * which covers most of its distance in the first fifth of the duration. That
 * fast leading edge is what read as aggressive no matter how small the change
 * was made: the eye registers the rate, not the amount. A curve that starts
 * slowly cannot feel like a flash.
 */
const EASE = 'cubic-bezier(0.45, 0.05, 0.3, 1)';
/** hover response time — long enough that nothing ever snaps */
const RESPOND = 0.2;

/** The same curve as EASE, evaluated in JS for animations we drive ourselves. */
function bezierEase(t: number): number {
  const [x1, y1, x2, y2] = [0.45, 0.05, 0.3, 1];
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  // solve x(u) = t for u, then return y(u)
  let u = t;
  for (let i = 0; i < 6; i++) {
    const x = ((ax * u + bx) * u + cx) * u - t;
    const dx = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(dx) < 1e-6) break;
    u -= x / dx;
  }
  u = Math.max(0, Math.min(1, u));
  return ((ay * u + by) * u + cy) * u;
}

/**
 * The dive.
 *
 * Opening a chapter used to be a cut: the map vanished and the reader was
 * simply there. A cut is the one transition with no rate at all, and the eye
 * registers rate — so the calmest map in the world still handed off like a
 * channel change.
 *
 * Instead the camera falls into the soma you touched. Width is interpolated
 * *geometrically* (w0 · (w1/w0)^e), not linearly, so the zoom rate stays
 * constant through the whole descent — a linear width ramp lurches at the end,
 * because the same number of units covers a far larger apparent step once you
 * are close. The tissue streams outward past the frame, the cell's own light
 * grows to fill it, and the page dissolves in out of that light.
 */
const DIVE = {
  /** total descent, ms — slower than any page transition, this is an arrival */
  duration: 520,
  /** final viewBox width, in user units: well inside the cell body */
  endWidth: 34,
  /** fraction of the dive spent before the page begins to dissolve in */
  washStart: 0.52
} as const;

/** period of the luminance tide — must match .strand-breathe in index.css */
const TIDE = 19.7;
/** how far the brightness wave travels before it repeats, in user units */
const TIDE_WAVELENGTH = 660;

/**
 * Phase for one point on the luminance tide.
 *
 * A negative delay places the strand partway into its cycle, and the amount is
 * set by distance from the core, so near strands crest before far ones and the
 * brightening reads as a wave rolling outward. A little jitter keeps the wave
 * front ragged rather than a perfect ring.
 */
function tideFraction(x: number, y: number, seed: number): number {
  const d = Math.hypot(x - CX, y - CY);
  const along = (d / TIDE_WAVELENGTH) % 1;
  const jitter = (rnd(seed) - 0.5) * 0.09;
  return (1 - along + jitter + 1) % 1;
}

function tidePhase(x: number, y: number, seed: number): string {
  return `-${(tideFraction(x, y, seed) * TIDE).toFixed(2)}s`;
}

/* The map's myelin machinery stood here: SPIKE and SALTATION, the action-
   potential clock, and the arc-length kit that spaced nodes of Ranvier evenly
   along a course — arcTable, atArc, tangentAt, arcSlice.

   None of it has been called since "Myelin Belongs Where the Scale Carries It"
   sent the sheath to ChapterOpener, which draws one axon at roughly a hundred
   times map size where every internode reads. The map spends its width budget
   on the taper instead. The clock still exists where it is still used, in
   LivingFigure's own SPIKE; keeping a second copy here only invited the two to
   drift apart while neither was doing anything. */

/**
 * A period near `base` whose ratio to the other periods is irrational, so no
 * two clocks on the map ever come back into step. Round numbers eventually
 * betray themselves as a loop; the golden ratio guarantees they never do.
 */
const PHI = 1.6180339887498949;
function period(base: number, seed: number, spread = 0.55): number {
  return base * (1 + ((seed * PHI) % 1) * spread);
}

interface Branch {
  rule: string;
  short: string;
  title: string;
}

interface Chapter {
  numeral: string;
  short: string;
  title: string;
  spine: string;
  branches: Branch[];
}

interface Node {
  id: string;
  kind: 'core' | 'chapter' | 'satellite' | 'minor';
  x: number;
  y: number;
  size: number;
  chapter?: Chapter;
  /** satellites: the section this sub-neuron carries */
  section?: { label: string; title: string; page: number; parent: string };
  /** figure cells: the world this sub-neuron opens onto */
  figure?: { type: NonNullable<BookPage['diagramType']>; short: string; title: string; parent: string };
}

/* ------------------------------------------------------------- the tissue */

const CHAPTER_DATA: Array<Chapter & { x: number; y: number; size: number; id: string }> = [
  {
    id: 'chapter-1', numeral: 'I', short: 'Extraction', spine: 'Fragile — the mechanism',
    title: 'Media Pollution & the Economy of Extraction', x: 341, y: 346, size: 34,
    branches: [
      { rule: 'branch-3', short: 'Copy', title: 'Branch 3 — Copywriting, headlines, CTAs, landing pages' },
      { rule: 'branch-6', short: 'Video', title: 'Branch 6 — Video & motion generation' }
    ]
  },
  {
    id: 'chapter-2', numeral: 'II', short: 'Fragility', spine: 'Fragile — the liability',
    title: 'The Fragile Market', x: 652, y: 164, size: 36,
    branches: [
      { rule: 'branch-7', short: 'UX copy', title: 'Branch 7 — Interface & UX microcopy' },
      { rule: 'branch-4', short: 'CRM', title: 'Branch 4 — CRM, lifecycle & retention messaging' }
    ]
  },
  {
    id: 'chapter-3', numeral: 'III', short: 'Robustness', spine: 'Robust — the posture',
    title: 'The Robust Practitioner', x: 828, y: 396, size: 38,
    branches: [
      { rule: 'branch-1', short: 'Strategy', title: 'Branch 1 — Marketing strategy & positioning' }
    ]
  },
  {
    id: 'chapter-4', numeral: 'IV', short: 'Causality', spine: 'Robust — the method',
    title: 'The Causal Taxonomy', x: 622, y: 656, size: 40,
    branches: [
      { rule: 'branch-2', short: 'Content', title: 'Branch 2 — Content planning & editorial calendars' }
    ]
  },
  {
    id: 'chapter-5', numeral: 'V', short: 'Antifragile', spine: 'Antifragile — the system',
    title: 'The Antifragile Aesthetic', x: 190, y: 602, size: 42,
    branches: [
      { rule: 'branch-5', short: 'Image', title: 'Branch 5 — Image generation' },
      { rule: 'branch-8', short: 'Community', title: 'Branch 8 — Community, growth & social mechanics' }
    ]
  }
];

/** Minor cells that fill the tissue between the named ones. */
/* Filler cells. Eight of them, each wired to its neighbours, was eight more
   things to look at that carry no meaning — the map's density should come from
   the connections between things that mean something. Four still say "this is
   tissue, not a diagram of five items" without crowding it. */
const MINOR_NODES: Node[] = Array.from({ length: 4 }, (_, i) => {
  const a = (i / 11) * Math.PI * 2 + rnd(i + 3) * 0.55;
  const rad = 205 + rnd(i + 40) * 215;
  return {
    id: `m${i}`,
    kind: 'minor' as const,
    x: CX + Math.cos(a) * rad * (1 + (rnd(i + 9) - 0.5) * 0.22),
    y: CY + Math.sin(a) * rad * 0.85,
    size: 9 + rnd(i + 70) * 7
  };
});

/**
 * Satellites: each chapter's own section pages, orbiting their parent. Every
 * paragraph of the dossier is connected, so these are real nodes in the mesh —
 * they carry a page and open it, and the proximity pass wires them to whatever
 * else is nearby, including sections of other chapters.
 */
const SATELLITES: Node[] = CHAPTER_DATA.flatMap((c, ci) => {
  const pages = BOOK_PAGES
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.chapterId === c.id && p.sectionData);
  const outward = Math.atan2(c.y - CY, c.x - CX);
  return pages.map(({ p, idx }, k) => {
    const spread = 1.5;
    const a = outward + Math.PI + (k - (pages.length - 1) / 2) * spread + (rnd(ci * 7 + k) - 0.5) * 0.4;
    const rad = c.size * 2.5 + rnd(ci * 11 + k) * 26;
    return {
      id: `${c.id}-s${k}`,
      kind: 'satellite' as const,
      x: c.x + Math.cos(a) * rad,
      y: c.y + Math.sin(a) * rad,
      size: 15,
      section: {
        label: p.sectionData!.number || p.sectionData!.title.slice(0, 12),
        title: p.sectionData!.title,
        page: idx,
        parent: c.id
      }
    };
  });
});

/**
 * The figure worlds, as cells.
 *
 * They were reachable only by paging until a seed appeared, which made the most
 * distinctive thing in the book the hardest thing in it to find. A figure is
 * part of the organism, so it is drawn as part of the organism: a satellite of
 * the chapter that argues it, proximity-wired like everything else, and so
 * covered by **Nothing Floats** rather than exempt from it.
 *
 * The sections hang inward, toward the core; the worlds hang outward, away from
 * it — a figure is where a chapter opens out, not where it folds in. And a
 * world says it is a world through **size and light alone**: 20 against a
 * section's 15, and a brighter centre. No new shape, because every node here is
 * the same kind of thing at a different scale.
 */
const FIGURE_NODES: Node[] = FIGURES.map((f, i) => {
  const parent = FIGURE_PASSAGES[f.type].chapterId;
  const c = CHAPTER_DATA.find(ch => ch.id === parent);
  const host = c ?? { x: CX, y: CY, size: 30, id: 'core' };
  const outward = Math.atan2(host.y - CY, host.x - CX);
  const a = outward + (rnd(i * 13 + 3) - 0.5) * 0.9;
  const rad = host.size * 2.35 + rnd(i * 7 + 5) * 18;
  return {
    id: `fig-${f.type}`,
    kind: 'satellite' as const,
    x: host.x + Math.cos(a) * rad,
    y: host.y + Math.sin(a) * rad,
    size: 20,
    figure: { type: f.type, short: f.short, title: f.title, parent }
  };
});

/** where the bibliography sits — a node in the mesh, never a floating marker */
const REFS = { x: 872, y: 724 };

/** One graph. Every node is the same kind of thing at a different scale. */
const NODES: Node[] = [
  { id: 'core', kind: 'core', x: CX, y: CY, size: 30 },
  { id: 'refs', kind: 'minor', x: REFS.x, y: REFS.y, size: 11 },
  ...CHAPTER_DATA.map(c => ({
    id: c.id, kind: 'chapter' as const, x: c.x, y: c.y, size: c.size,
    chapter: {
      numeral: c.numeral, short: c.short, title: c.title,
      spine: c.spine, branches: c.branches
    }
  })),
  ...SATELLITES,
  ...FIGURE_NODES,
  ...MINOR_NODES
];

const nodeById = (id: string) => NODES.find(n => n.id === id)!;

/** The reading spine — the only edges that carry emphasis. */
const SPINE = ['core', 'chapter-1', 'chapter-2', 'chapter-3', 'chapter-4', 'chapter-5'];

/**
 * Edges are built from proximity, so the whole thing is one connected mesh
 * rather than a stack of separate diagrams. The spine is not a second layer —
 * it is a subset of these same edges, emphasised.
 */
const EDGES: Array<{ a: string; b: string; spine: boolean; seed: number }> = (() => {
  const out: Array<{ a: string; b: string; spine: boolean; seed: number }> = [];
  const key = (a: string, b: string) => [a, b].sort().join('|');
  const seen = new Set<string>();

  const add = (a: string, b: string, spine: boolean) => {
    const k = key(a, b);
    if (a === b || seen.has(k)) return;
    seen.add(k);
    out.push({ a, b, spine, seed: out.length * 7 + 3 });
  };

  // the spine first, so it always exists
  for (let i = 0; i < SPINE.length - 1; i++) add(SPINE[i], SPINE[i + 1], true);

  // every satellite is anchored to the section it belongs to
  SATELLITES.forEach(s => add(s.id, s.section!.parent, false));

  /*
   * Proximity: everything connects to everything near it, with no distance cap.
   *
   * A reach limit was tried to thin the mesh and it was the wrong instrument:
   * it does not thin connections evenly, it deletes them wherever the layout
   * happens to be sparse, so parts of the organism end up with a couple of
   * links and parts with none of their own. The map's whole claim is that the
   * document is one connected argument — the mesh has to read as complete.
   *
   * Density is controlled where it belongs instead: in what a connection costs
   * to draw, and in the edge fade that takes the far ones into darkness.
   */
  NODES.forEach(n => {
    const near = NODES
      .filter(m => m.id !== n.id)
      .map(m => ({ m, d: Math.hypot(m.x - n.x, m.y - n.y) }))
      .sort((p, q) => p.d - q.d)
      .slice(0, n.kind === 'minor' ? 3 : 4);
    near.forEach(({ m }) => add(n.id, m.id, false));
  });

  // Long cross-links between sections of different chapters — the document's
  // paragraphs reference each other across the whole argument, and these are
  // the strands that say so.
  const bySection = SATELLITES.map(s => s.id);
  for (let i = 0; i < bySection.length; i += 3) {
    const a = SATELLITES[i];
    const b = SATELLITES[(i + 5) % SATELLITES.length];
    if (a && b && a.section!.parent !== b.section!.parent) add(a.id, b.id, false);
  }

  /*
   * Nearest-neighbour wiring can still leave a pocket of nodes joined only to
   * each other. Nothing on this map may float: walk the graph, and wherever a
   * separate island exists, grow tissue between the closest pair of nodes
   * across the gap until the whole system is one connected organism.
   */
  const linked: Record<string, string[]> = {};
  NODES.forEach(n => { linked[n.id] = []; });
  out.forEach(e => { linked[e.a].push(e.b); linked[e.b].push(e.a); });

  const componentOf = (): Record<string, number> => {
    const comp: Record<string, number> = {};
    let c = 0;
    NODES.forEach(n => {
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

  for (let guard = 0; guard < 40; guard++) {
    const comp = componentOf();
    const groups = new Set(Object.values(comp));
    if (groups.size <= 1) break;
    // closest pair spanning two different components
    let best: { a: string; b: string; d: number } | null = null;
    NODES.forEach(p => NODES.forEach(q => {
      if (comp[p.id] === comp[q.id]) return;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (!best || d < best.d) best = { a: p.id, b: q.id, d };
    }));
    if (!best) break;
    const bridge = best as { a: string; b: string; d: number };
    add(bridge.a, bridge.b, false);
    linked[bridge.a].push(bridge.b);
    linked[bridge.b].push(bridge.a);
  }

  return out;
})();

/** adjacency + graph distance, so touch spreads by topology not by geometry */
const ADJ: Record<string, string[]> = (() => {
  const m: Record<string, string[]> = {};
  NODES.forEach(n => { m[n.id] = []; });
  EDGES.forEach(e => { m[e.a].push(e.b); m[e.b].push(e.a); });
  return m;
})();

/*
 * Hop distance from one cell to every other, memoised.
 *
 * There are 22 possible sources and the adjacency never changes, so the whole
 * result set is a couple of kilobytes and each entry is computed at most once.
 * Previously this ran a fresh breadth-first walk on every render — and renders
 * fire on every hover, including the ones the pointer generates while crossing
 * the tissue. Also note `queue.shift()` is O(n) on an array; with the walk now
 * running once per node it no longer matters, but the cache is what makes that
 * true.
 */
const DIST_CACHE: Record<string, Record<string, number>> = {};

function graphDistances(from: string): Record<string, number> {
  const hit = DIST_CACHE[from];
  if (hit) return hit;

  const dist: Record<string, number> = { [from]: 0 };
  const queue = [from];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    (ADJ[cur] || []).forEach(nb => {
      if (dist[nb] === undefined) {
        dist[nb] = dist[cur] + 1;
        queue.push(nb);
      }
    });
  }
  DIST_CACHE[from] = dist;
  return dist;
}

/* --------------------------------------------------------- drawing tissue */

/**
 * A wandering polyline between two points. Every parameter is seed-derived, so
 * no two connections share a shape: the envelope peaks off-centre, the meander
 * amplitude drifts along the span, the frequencies and phases differ, and the
 * path does not advance at a constant rate. A symmetric envelope with fixed
 * frequencies is what made these read as the same arc drawn over and over.
 */
function wander(
  x1: number, y1: number, x2: number, y2: number, seed: number, steps = 22
): Array<[number, number]> {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const peak = 0.34 + rnd(seed + 1) * 0.32;                 // where it bulges

  /*
   * Amplitude and frequency.
   *
   * These were cut to a quarter of their value to answer "too chaotic", and
   * that was an over-correction: at 4.5% of span with a single low frequency,
   * every connection became a taut straight cable strung between two cells.
   * Rigid is not the opposite of chaotic — both are mechanical, and a cable is
   * the more obviously wrong of the two because tissue is never under tension
   * like that.
   *
   * What reads as living fibre is a generous bow with genuine variety between
   * strands: a dominant low frequency carrying the sweep, a real secondary, and
   * a small third term so no two curves resolve into the same shape. The
   * amplitude sits between the scribble and the cable.
   */
  const amp = Math.max(12, len * (0.085 + rnd(seed) * 0.095)) * (rnd(seed + 2) > 0.5 ? 1 : -1);
  const f1 = 1.15 + rnd(seed + 3) * 1.15;
  const f2 = 2.6 + rnd(seed + 4) * 2.2;
  const f3 = 5.4 + rnd(seed + 5) * 3.6;
  const p1 = rnd(seed + 6) * 6.283;
  const p2 = rnd(seed + 7) * 6.283;
  const p3 = rnd(seed + 8) * 6.283;
  const drag = (rnd(seed + 9) - 0.5) * 0.09;                // uneven advance

  const pts: Array<[number, number]> = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    // Skewed envelope raised to a fractional power: it still reaches exactly
    // zero at both somas, so every strand stays physically attached, but it
    // climbs steeply enough that no visible stretch is ever straight. A plain
    // sine leaves long dead-straight run-ins; a floored envelope would detach
    // the strand from the node entirely.
    const te = t < peak ? (t / peak) * 0.5 : 0.5 + ((t - peak) / (1 - peak)) * 0.5;
    const env = Math.pow(Math.sin(te * Math.PI), 0.38);
    const ampDrift = 0.74 + 0.42 * Math.sin(t * 1.9 + p1);
    const wob =
      Math.sin(t * f1 + p1) * 0.88 +
      Math.sin(t * f2 + p2) * 0.3 +
      Math.sin(t * f3 + p3) * 0.11;
    const off = wob * env * amp * ampDrift;
    const along = t + Math.sin(t * Math.PI) * drag;
    pts.push([x1 + dx * along + nx * off, y1 + dy * along + ny * off]);
  }
  return pts;
}


/**
 * One connection, drawn as one process.
 *
 * This was a BUNDLE: a wide halo bed under three hairline filaments that
 * splayed apart mid-span and converged at the somas, plus — where the edge
 * carried a synapse — myelin internodes, nodes of Ranvier, an axon hillock at
 * the pre end and a terminal arborisation with boutons and postsynaptic
 * densities at the post end. Five to twenty elements per link, on 232 links.
 *
 * The reasoning behind the bundle was sound and its premise was wrong. The
 * premise was that a single path always reads as a precise drawn line, so
 * life had to come from multiplicity. But the references answer it a different
 * way: one line reads as living when it *meanders continuously and branches*,
 * which is exactly what the arbors already do. Given that, multiplicity buys
 * nothing and costs everything — it is the difference between a drawing of a
 * connection and a rope, and at map scale a hundred ropes are a thicket.
 *
 * So a connection is now what the references show: a single meandering process
 * with varicosities along it, thicker toward its source and tapering as it
 * goes. The anatomy it dropped was real anatomy, correctly drawn, and invisible
 * at every zoom level anyone actually reads the map at.
 */
function tissue(
  pts: Array<[number, number]>,
  weight: number,
  opacity: number,
  seed: number,
  keyBase: string,
  terminal?: boolean,
  /**
   * The tide, sampled per piece of the taper rather than once for the strand.
   *
   * A whole fibre on one phase brightens as a unit, which the eye reads as a
   * pulse — the strand blinks. Sampling the phase at each piece's own midpoint
   * makes the swell arrive at the near end before the far one, so the light
   * rolls ALONG the fibre instead of over it.
   *
   * This is still LC-01 exactly: phase, not motion. Nothing moves, nothing has
   * ends, and no mark travels — each piece simply crests later than the one
   * behind it, which is the same argument saltatory conduction runs on. It is
   * emphatically NOT a travelling dash (LC-02): there is no lit segment with
   * two ends sliding over the drawing.
   *
   * Callers must pass the SAME seed for every piece of one strand. tideFraction
   * folds a small jitter in from the seed, and varying it per piece would put
   * an independent wobble inside a single fibre — "that is shimmer, not a tide".
   */
  phaseAt?: (x: number, y: number) => string
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const n = pts.length - 1;
  if (n < 2) return out;

  /*
   * The taper. A process leaves its source at full width and thins along its
   * length, so the eye can read direction from thickness alone — which is what
   * the polarity marks (hillock, arborisation) used to say, at a fraction of
   * the cost. Drawn in three chained pieces rather than one so the width can
   * actually change; a single path has a single stroke-width.
   */
  /* Five pieces, not two.

     Two was right while a piece was only ever a width: "a taper needs at least
     two widths to exist and no more than two to read at this scale", and the
     third piece was 232 extra paths for nothing the eye could see.

     A piece is now also a phase. The tide is sampled at each piece's midpoint,
     so the number of pieces is the resolution of the wave travelling along the
     fibre — at two, light steps from one half of a strand to the other and the
     eye reads a blink; at five it rolls. That is a reason two never had to
     answer, and it is the only reason this number is allowed to rise.

     MEASURE BEFORE RAISING IT AGAIN (PF-01, DG-06): this is the surface that
     has twice collapsed to single-figure frame rates. Revert to 2 if a measured
     frame budget ever says so — nothing else depends on the value. */
  const SEGS = 2;
  /* Trunk weight. The references' clearest signal is hierarchy: main
     processes visibly thicker than the twigs they feed. Arbor twigs sit at
     0.22–0.34, so trunks start near 1.3 (spine ≈1.8) and taper — roughly a
     5:1 ratio, against the flat 2.5:1 that made every line read alike. */
  const w0 = 0.72 + weight * 0.62;

  /* Worked out before the loop so every bead can be filed under the piece it
     sits on, and ride that piece's phase rather than the strand's. */
  const beadCount = Math.max(1, Math.round(n * 0.14));
  const beads: Array<{ k: number; b: number; seg: number }> = [];
  for (let b = 1; b <= beadCount; b++) {
    const k = Math.round((b / (beadCount + 1)) * n);
    if (rnd(seed + b * 13) > 0.62) continue;
    beads.push({ k, b, seg: Math.min(SEGS - 1, Math.floor((k / n) * SEGS)) });
  }

  for (let s = 0; s < SEGS; s++) {
    const from = Math.floor((s / SEGS) * n);
    const to = Math.ceil(((s + 1) / SEGS) * n);
    const seg = pts.slice(from, to + 1);
    if (seg.length < 2) continue;
    const t = s / (SEGS - 1 || 1);
    const segW = w0 * (1 - t * 0.52);
    const marks: React.ReactNode[] = [];
    marks.push(
      <path
        key={`${keyBase}-s${s}`}
        d={smoothPolyline(seg)}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        /* .halo opts out of the touch swell (see index.css): the swell width is
           1.15, and swelling anything already wider than that would shrink it
           under the finger — the trunk is now the widest line on the map */
        className={segW > 1.1 ? 'halo' : undefined}
        strokeWidth={segW}
        opacity={opacity * (0.9 - t * 0.12)}
      />
    );

    /* Varicosities: the swellings strung along every process in both
       references. Sparse and seeded, never at the ends — an end bead would
       read as a terminal, and these are points along the way. */
    beads.filter(v => v.seg === s).forEach(({ k, b }) => {
      const p = pts[k];
      marks.push(
        <circle
          key={`${keyBase}-v${b}`}
          cx={p[0].toFixed(1)}
          cy={p[1].toFixed(1)}
          r={0.42 + rnd(seed + b * 5) * 0.3}
          fill="currentColor"
          opacity={Math.min(1, opacity * 1.1)}
        />
      );
    });

    // One bright terminal where the process lands on its target — the single
    // mark the references keep at the end of every branch. It belongs to the
    // last piece, so it crests with the end of the fibre rather than the start.
    if (terminal && s === SEGS - 1) {
      const tip = pts[n];
      marks.push(
        <circle key={`${keyBase}-t`} cx={tip[0].toFixed(1)} cy={tip[1].toFixed(1)}
          r={0.85} fill="currentColor" opacity={Math.min(1, opacity * 1.3)} />
      );
    }

    if (phaseAt) {
      const mid = pts[Math.max(0, Math.min(n, Math.round((from + to) / 2)))];
      out.push(
        <g key={`${keyBase}-g${s}`} className="strand-breathe"
          style={{ animationDelay: phaseAt(mid[0], mid[1]) }}>
          {marks}
        </g>
      );
    } else {
      out.push(...marks);
    }
  }

  return out;
}

/**
 * A root running from a chapter outward past the frame. The angle wanders hard
 * and the radius does not advance evenly — a small angular wobble over a long
 * radial reach still reads as a straight ray, which is what these used to be.
 */
function branchPts(
  n: Node, ang: number, seed: number, reach: number, from = 0
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const steps = 20;
  const start = from || n.size * 0.9;
  const f1 = 1.1 + rnd(seed + 1) * 1.0;
  const f2 = 3.4 + rnd(seed + 2) * 2.6;
  const sway = 0.72 + rnd(seed + 3) * 0.55;
  const p1 = rnd(seed + 4) * 6.283;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    // eased, uneven radial advance
    const rt = Math.pow(t, 0.82) + Math.sin(t * Math.PI * 2 + p1) * 0.035;
    const rad = start + (reach - start) * Math.max(0, rt);
    // the high-frequency term matters: without it each rendered sub-segment of
    // a long root is locally straight even when the whole root curves
    const a = ang
      + Math.sin(t * f1 + seed) * sway
      + Math.sin(t * f2 + seed * 1.6) * sway * 0.34
      + Math.sin(t * 9.4 + seed * 0.7) * 0.085
      + Math.sin(t * 19.3 + seed * 1.9) * 0.032;
    pts.push([n.x + Math.cos(a) * rad, n.y + Math.sin(a) * rad]);
  }
  return pts;
}

/** Roots fork. One trunk plus two offspring leaving at different depths. */
/*
 * A root leaving a chapter. One trunk and one fork, not three limbs.
 *
 * Three long branches per rule, on eight rules, was twenty-four wandering
 * fibres sweeping across open space — the biggest single contributor to the map
 * reading as a thicket, because unlike every other strand these have no second
 * soma to land on and so cross everything on their way out.
 */
function branchSystem(n: Node, ang: number, seed: number): Array<Array<[number, number]>> {
  const trunk = branchPts(n, ang, seed, 520);
  const forkA = branchPts(n, ang + 0.3 + rnd(seed + 11) * 0.18, seed + 31, 400, 170);
  return [trunk, forkA];
}

/**
 * Polarity.
 *
 * A synapse has a direction, so every edge has to know which end is the axon
 * and which is the dendrite it lands on. Signal leaves the manifesto and
 * travels outward — the same direction the luminance tide rolls — so the
 * endpoint fewer hops from the core is presynaptic. Where both ends sit at the
 * same graph depth, the one nearer the core geometrically wins, which keeps
 * lateral connections between siblings pointing consistently outward instead of
 * flipping at random.
 */
const CORE_DEPTH = graphDistances('core');

const ORIENT: Array<{ pre: string; post: string }> = EDGES.map(e => {
  const da = CORE_DEPTH[e.a] ?? 99;
  const db = CORE_DEPTH[e.b] ?? 99;
  if (da !== db) return da < db ? { pre: e.a, post: e.b } : { pre: e.b, post: e.a };
  const na = nodeById(e.a);
  const nb = nodeById(e.b);
  return Math.hypot(na.x - CX, na.y - CY) <= Math.hypot(nb.x - CX, nb.y - CY)
    ? { pre: e.a, post: e.b }
    : { pre: e.b, post: e.a };
});

/* precomputed geometry — stable across renders, and always drawn pre → post */
const EDGE_PTS = EDGES.map((e, i) => {
  const a = nodeById(ORIENT[i].pre);
  const b = nodeById(ORIENT[i].post);
  return wander(a.x, a.y, b.x, b.y, e.seed);
});


/**
 * Junctions.
 *
 * Two strands that merely cross each other read as unrelated ribbons laid over
 * one another — the thing that made parts of the map look disconnected even
 * though the graph was complete. Living tissue does not do that: where fibres
 * meet they fuse, and the meeting point is visible. So every genuine crossing
 * between two connections is found and knitted: a lit node at the intersection
 * with short branchlets binding it into both strands.
 */
/**
 * Every ruleset root, precomputed. These sweep the widest arcs on the map, so
 * they must take part in junction-finding — leaving them out was what left long
 * ribbons crossing open space without ever touching the tissue they passed.
 */
const BRANCH_STRANDS: Array<{ pts: Array<[number, number]>; owner: string }> = CHAPTER_DATA.flatMap((c, i) => {
  const node = NODES.find(n => n.id === c.id)!;
  return c.branches.flatMap((_, k) => {
    const outward = Math.atan2(node.y - CY, node.x - CX);
    const ang = outward + (k - (c.branches.length - 1) / 2) * 0.62;
    const seed = i * 17 + k * 5 + 1;
    return [
      { pts: branchPts(node, ang, seed, 620), owner: c.id },
      { pts: branchPts(node, ang + 0.34 + rnd(seed + 11) * 0.2, seed + 31, 540, 150), owner: c.id },
      { pts: branchPts(node, ang - 0.3 - rnd(seed + 12) * 0.22, seed + 47, 470, 230), owner: c.id }
    ];
  });
});

/** every strand on the map that can meet another */
const ALL_STRANDS: Array<{ pts: Array<[number, number]>; a: string; b: string }> = [
  ...EDGE_PTS.map((pts, i) => ({ pts, a: ORIENT[i].pre, b: ORIENT[i].post })),
  ...BRANCH_STRANDS.map(s => ({ pts: s.pts, a: s.owner, b: `branch-${s.owner}` }))
];

interface Junction {
  x: number; y: number;
  a: number; b: number;
  /** direction each of the two fibres runs at the crossing, radians */
  angA: number; angB: number;
  seed: number;
}

const JUNCTIONS: Junction[] = (() => {
  const out: Junction[] = [];

  const cross = (
    p1: [number, number], p2: [number, number],
    p3: [number, number], p4: [number, number]
  ): [number, number] | null => {
    const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
    if (Math.abs(d) < 1e-6) return null;
    const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
    const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
  };

  const bbox = (pts: Array<[number, number]>) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(p => {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    });
    return { x0, y0, x1, y1 };
  };
  const boxes = ALL_STRANDS.map(s => bbox(s.pts));

  for (let i = 0; i < ALL_STRANDS.length; i++) {
    for (let j = i + 1; j < ALL_STRANDS.length; j++) {
      const S = ALL_STRANDS[i], T = ALL_STRANDS[j];
      // Sharing a node is not grounds to skip the pair: two strands that leave
      // the same soma can still cross each other far out in open space, and
      // that crossing needs fusing like any other. Only the crossing that lands
      // on the shared node itself is already resolved, and the per-hit node
      // test below handles that.
      const A = boxes[i], B = boxes[j];
      if (A.x1 < B.x0 || B.x1 < A.x0 || A.y1 < B.y0 || B.y1 < A.y0) continue;

      const P = S.pts, Q = T.pts;
      let hits = 0;
      for (let a = 0; a < P.length - 1 && hits < 2; a++) {
        for (let b = 0; b < Q.length - 1 && hits < 2; b++) {
          const hit = cross(P[a], P[a + 1], Q[b], Q[b + 1]);
          if (hit) {
            // a crossing sitting on a soma is already joined there
            const onNode = NODES.some(n => Math.hypot(n.x - hit[0], n.y - hit[1]) < n.size * 1.35);
            if (!onNode) {
              out.push({
                x: hit[0], y: hit[1], a: i, b: j,
                angA: Math.atan2(P[a + 1][1] - P[a][1], P[a + 1][0] - P[a][0]),
                angB: Math.atan2(Q[b + 1][1] - Q[b][1], Q[b + 1][0] - Q[b][0]),
                seed: out.length * 5 + 2
              });
              hits++;
            }
          }
        }
      }
    }
  }
  return out;
})();

/**
 * The angles of the fibres that actually leave a given cell.
 *
 * A vortex without them is a self-contained ball, with every streamline clamped
 * inside its own rim — an ornament parked on the tissue. Given them, a few
 * streamlines escape along the real courses, so the cell reads as the *source*
 * of its connections rather than as a sphere they happen to touch.
 *
 * Precomputed once per node: this is called during render for every soma, and
 * the adjacency it walks is fixed for the life of the module.
 */
const FIBRE_ANGLES: Record<string, number[]> = (() => {
  const m: Record<string, number[]> = {};
  NODES.forEach(n => { m[n.id] = []; });
  EDGES.forEach(e => {
    const A = nodeById(e.a);
    const B = nodeById(e.b);
    if (!A || !B) return;
    m[e.a]?.push(Math.atan2(B.y - A.y, B.x - A.x));
    m[e.b]?.push(Math.atan2(A.y - B.y, A.x - B.x));
  });
  return m;
})();

const fibreAngles = (n: Node): number[] => FIBRE_ANGLES[n.id] || [];

/** Reach of the zoom-out arbor, in user units — the whole map as one cell. */
const CORONA_R = 1180;

/* ---------------------------------------------------------------- backdrop */

/**
 * Everything behind the organism, and the single place its legibility is tuned.
 *
 * The ground used to be four competing drawings: a CSS data grid and two large
 * drifting data flowers in the ambience layer, plus this SVG grid and a field of
 * scattered arc ticks. The flowers and the ticks are *filaments* — the same mark
 * the tissue is made of — so at rest the eye could not tell backdrop from
 * organism, and the connections read as one more layer of texture.
 *
 * The grid outlived them for a while as "deliberately not tissue", then went
 * the same way (GR-01): a rectilinear field behind a thing with no straight
 * lines in it is the one texture guaranteed to read as diagram. What is left
 * behind the organism is nothing at all — only the corona, gated on pulling
 * back, remains here.
 */
const BACKDROP = {
  /** corona strength at full zoom-out — the clock has to actually read */
  corona: 0.95
} as const;

const Backdrop: React.FC<{ pulledBack: number; strained: boolean }> = ({
  pulledBack,
  strained
}) => (
  <>
    {/* Depth. Parallax comes from the backdrop drifting against the organism,
        never from splitting the organism itself into planes — that would shear
        strands away from the somas they attach to. */}
    {/* No grid. Both references are one organism on empty ground and nothing
        else — no rule, no field, no technical backdrop. The grid was already
        down to 0.14 to stop it competing; at that point it was contributing
        nothing but a rectilinear field behind a thing that has no straight
        lines in it, which is the one texture guaranteed to read as "diagram". */}

    {/*
      The clock, resolving as you pull back.

      Pull far enough away and the whole organism should stop being a network
      and become one cell: filaments radiating from a single core, each ending
      in a seed — a dandelion clock. That is the reading the whole map is built
      toward, so the corona must actually arrive, and arrive strongly. Gated at
      0.35 with a 0.4 ceiling it never did: by the time it faded in it was too
      faint to change what you were looking at.

      Now it begins at a fifth of the way out and reaches full strength by
      two-thirds, so the transition from mesh to seed head happens while you are
      still moving and reads as the organism resolving rather than as a layer
      being switched on.
    */}
    {pulledBack > 0.2 && !strained && (
      <g
        className="plane-mid"
        style={{ transformOrigin: `${CX}px ${CY}px`, pointerEvents: 'none' }}
        opacity={Math.min(1, (pulledBack - 0.2) / 0.45) * BACKDROP.corona}
      >
        {/*
          One cell, at the scale of the whole map.

          This was 96 unbranched filaments radiating from the core, which is a
          sunburst — the same mistake the somas were making, at a hundred times
          the size. A neuron branches: each process forks, and forks again,
          thinner and shorter every generation, ending in a bulb. That recursion
          is what fills the silhouette densely near the middle and openly at the
          rim, and it is the whole difference between a drawing of a cell and a
          drawing of a star.

          Drawn with the same arbor generator as every soma, at map scale, so
          the organism is literally the same cell at every zoom level.
        */}
        <Dendrites
          id={ID} cx={CX} cy={CY} r={CORONA_R}
          arms={34} depth={5} seed={17}
          opacity={0.95} width={0.62}
        />
      </g>
    )}
  </>
);

/* ------------------------------------------------------------------ orrery */

interface OrreryProps {
  isDark: boolean;
  lastPage: number;
  /** chapters the reader has opened — drawn as memory, never as progress */
  visitedChapters?: string[];
  /** open a figure world straight from the map */
  onOpenFigure?: (type: NonNullable<BookPage['diagramType']>) => void;
  onEnter: (pageIndex: number) => void;
  /** false for somebody who has never been into the book */
  returning: boolean;
  /** open the index — the first way in, for a reader with nothing to resume */
  onOpenIndex: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  /** the cell the reader was in, so the map opens where it was left */
  focusNodeId?: string | null;
}

export const Orrery: React.FC<OrreryProps> = ({
  isDark, lastPage, onEnter, onOpenFigure, visitedChapters, returning, onOpenIndex, soundEnabled, onToggleSound, focusNodeId
}) => {
  const [hover, setHover] = useState<string | null>(null);
  /* chapters already opened — see the nucleolus on each chapter soma */
  const visited = useMemo(() => new Set(visitedChapters ?? []), [visitedChapters]);
  const [narrow, setNarrow] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < NARROW_PX : false
  );
  // If the device cannot hold the frame budget, the organism sheds its most
  // expensive layers rather than stuttering. Stutter is arousal, not calm.
  const strained = useFrameBudget();

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < NARROW_PX);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ------------------------------------------------------------ zoom & pan */
  /*
   * The resting view, with margin.
   *
   * The organism is drawn larger than the coordinate box it is laid out in —
   * arbors reach three radii past their somas and the ruleset roots run 500
   * units beyond the chapters they leave, and the chapters nearest the frame
   * sit only ~190 units from it. With the viewBox set to exactly W×H, all of
   * that was clipped at the edges: the map opened on cells cut in half, which
   * reads as a detail crop of something larger rather than as a whole organism.
   *
   * So home is the layout box plus a margin wide enough to hold the overflow.
   */
  const HOME = { x: -HOME_MARGIN_X, y: -HOME_MARGIN_Y, w: W + HOME_MARGIN_X * 2, h: H + HOME_MARGIN_Y * 2 };
  const viewRef = useRef({ ...HOME });
  const targetRef = useRef({ ...HOME });
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const [, redraw] = useReducer((c: number) => c + 1, 0);

  /*
   * Panning and zooming do not re-render the organism.
   *
   * This was the single largest cost in the app. `step()` ran every frame of
   * every pan, zoom and glide, and each frame called redraw() — which walks
   * React's reconciler over the entire tissue, ~8,000 elements, to change one
   * attribute on one node. Nothing about the geometry depends on the view: the
   * strands are in absolute coordinates and the viewBox is the only thing
   * moving. So the loop writes that attribute straight to the DOM and React is
   * left out of it entirely.
   *
   * A re-render is still needed when something *structural* changes with scale
   * — the corona appearing, the mesh dimming — so the pulled-back value is
   * bucketed and a render is requested only when it crosses a bucket, roughly
   * twenty times across the whole zoom range instead of every frame.
   */
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBucketRef = useRef(-1);
  /* the tissue group, so the glide can lift its filter without a render */
  const tissueRef = useRef<SVGGElement | null>(null);
  const glidingRef = useRef(false);

  const applyView = () => {
    const v = viewRef.current;
    svgRef.current?.setAttribute(
      'viewBox',
      `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`
    );
    const pb = Math.max(0, Math.min(1, (v.w - HOME.w) / (MAX_W - HOME.w)));
    const bucket = Math.round(pb * 20);
    if (bucket !== zoomBucketRef.current) {
      zoomBucketRef.current = bucket;
      redraw();
    }
  };

  const step = () => {
    const v = viewRef.current;
    const t = targetRef.current;
    const k = 0.34;
    const nv = {
      x: v.x + (t.x - v.x) * k, y: v.y + (t.y - v.y) * k,
      w: v.w + (t.w - v.w) * k, h: v.h + (t.h - v.h) * k
    };
    const settled = Math.abs(nv.w - t.w) < 0.3 && Math.abs(nv.x - t.x) < 0.3 && Math.abs(nv.y - t.y) < 0.3;
    viewRef.current = settled ? { ...t } : nv;
    applyView();
    if (settled) {
      glidingRef.current = false;
      // the undulation returns only once the view is still
      tissueRef.current?.setAttribute('filter', `url(#${ID}-flex)`);
      rafRef.current = null;
    } else {
      rafRef.current = requestAnimationFrame(step);
    }
  };
  const glide = () => {
    if (rafRef.current !== null) return;
    glidingRef.current = true;
    tissueRef.current?.removeAttribute('filter');
    rafRef.current = requestAnimationFrame(step);
  };
  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); }, []);

  /*
   * Coming back up.
   *
   * The map used to reopen at the home framing however deep into the dossier
   * you had been, which threw away the one thing the reader knew: where you
   * were. Instead it opens tight on the cell that page belongs to and pulls
   * back to a comfortable framing — the exact inverse of the dive — and warms
   * that cell for a moment so the eye is told where it landed. Runs once per
   * arrival: `focusNodeId` only changes when the reader hands one over.
   */
  useEffect(() => {
    if (!focusNodeId) return;
    const n = NODES.find(m => m.id === focusNodeId);
    if (!n) return;

    const frame = (w: number) => ({
      x: n.x - w / 2, y: n.y - (w * H / W) / 2, w, h: w * H / W
    });
    const settled = frame(W * 0.82);
    const still = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // The pull-back is the animation, not the destination. If it cannot run —
    // reduced motion, a device shedding frames — the map must still open at a
    // framing someone can read, never stranded at the tight starting one.
    viewRef.current = still ? settled : frame(W * 0.46);
    targetRef.current = settled;
    if (!still) glide();

    // a brief warmth on the cell you came out of, then the tissue settles
    setHover(focusNodeId);
    const t = window.setTimeout(() => setHover(null), 1900);
    return () => window.clearTimeout(t);
  }, [focusNodeId]);

  const MIN_W = W / 4;
  const MAX_W = W * 2.6;   // hard floor on zoom-out
  /** 0 at the resting view, 1 at the zoom-out limit — measured from HOME, not
   *  from W, so opening the map is not already counted as being pulled back */
  const pulledBack = Math.max(0, Math.min(1, (viewRef.current.w - HOME.w) / (MAX_W - HOME.w)));

  /** zoom about a point given in viewBox coordinates */
  const zoomAt = (px: number, py: number, factor: number) => {
    const t = targetRef.current;
    const nw = Math.min(MAX_W, Math.max(MIN_W, t.w * factor));
    const s = nw / t.w;
    targetRef.current = {
      x: px - (px - t.x) * s, y: py - (py - t.y) * s,
      w: nw, h: t.h * s
    };
    glide();
  };

  const toLocal = (svg: SVGSVGElement, clientX: number, clientY: number) => {
    const m = svg.getScreenCTM();
    if (!m) return { x: W / 2, y: H / 2 };
    const p = svg.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    const l = p.matrixTransform(m.inverse());
    return { x: l.x, y: l.y };
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const l = toLocal(e.currentTarget, e.clientX, e.clientY);
    const factor = Math.exp(Math.max(-140, Math.min(140, e.deltaY)) * 0.0022);
    zoomAt(l.x, l.y, factor);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const t = targetRef.current;
    dragRef.current = { x: e.clientX, y: e.clientY, vx: t.x, vy: t.y, moved: false };
  };
  /*
   * No warmth carried with the pointer.
   *
   * This has now been built twice and removed twice, so the reasoning belongs
   * here rather than in a commit message. The second version was careful — it
   * lagged behind the hand and faded when the hand rested, so it was not
   * rigidly cursor-bound. It still reads as a light that follows you, because
   * anything whose position is a function of the pointer does, however much it
   * is damped: the eye locks onto the correlation, not onto the lag.
   *
   * A thing that moves whenever you move can never fall out of attention. That
   * is hard fascination, and it is the mechanism this dossier exists to argue
   * against — the map may not use it. Touch is answered by the tissue itself,
   * through excitation propagating out from the cell actually reached, and
   * nowhere else. Do not add it a third time.
   */

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = viewRef.current.w / rect.width;
    const dx = (e.clientX - d.x) * scale;
    const dy = (e.clientY - d.y) * scale;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true;
    targetRef.current = { ...targetRef.current, x: d.vx - dx, y: d.vy - dy };
    glide();
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    // a drag must not also open whatever was under the pointer
    if (d?.moved) {
      suppressRef.current = true;
      window.setTimeout(() => { suppressRef.current = false; }, 60);
    }
  };
  const suppressRef = useRef(false);

  /* ----------------------------------------------------------------- dive */
  const divingRef = useRef(false);
  const diveRafRef = useRef<number | null>(null);
  const diveGuardRef = useRef<number | null>(null);
  /** 0 → 1 as the page dissolves in over the last stretch of the descent */
  const washRef = useRef(0);
  /** written to directly during the descent, so no frame costs a render */
  const washElRef = useRef<HTMLDivElement | null>(null);
  const chromeElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => {
    if (diveRafRef.current !== null) cancelAnimationFrame(diveRafRef.current);
    if (diveGuardRef.current !== null) window.clearTimeout(diveGuardRef.current);
  }, []);

  /**
   * Fall into the cell at (fx, fy), then open `page`.
   *
   * A reader who has asked for less motion, or a device already missing its
   * frame budget, gets the old immediate handoff — a dive that stutters is
   * worse than no dive, and this is the same escape hatch the organism uses
   * for its filter and its sway.
   */
  const enter = (page: number, fx = CX, fy = CY) => {
    if (suppressRef.current || divingRef.current) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // A backgrounded tab does not composite, so requestAnimationFrame stops:
    // animating there would strand the descent instead of playing it.
    const unseen = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (reduced || strained || unseen) {
      onEnter(page);
      return;
    }

    divingRef.current = true;
    // the pan/zoom glide must not fight the descent for the same viewBox
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const v0 = { ...viewRef.current };
    const cx0 = v0.x + v0.w / 2;
    const cy0 = v0.y + v0.h / 2;
    const aspect = v0.h / v0.w;
    const ratio = DIVE.endWidth / v0.w;
    const t0 = performance.now();

    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / DIVE.duration);
      const e = bezierEase(p);

      const w = v0.w * Math.pow(ratio, e);
      const h = w * aspect;
      const cx = cx0 + (fx - cx0) * e;
      const cy = cy0 + (fy - cy0) * e;
      viewRef.current = { x: cx - w / 2, y: cy - h / 2, w, h };

      washRef.current =
        p < DIVE.washStart ? 0 : bezierEase((p - DIVE.washStart) / (1 - DIVE.washStart));

      /* Same rule as the pan loop: the descent moves the viewBox and two
         opacities, none of which need React. Re-rendering 8,000 elements on
         every frame of the dive was making the one moment that has to feel
         smooth the heaviest thing the app does. */
      const v = viewRef.current;
      svgRef.current?.setAttribute(
        'viewBox',
        `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`
      );
      if (washElRef.current) washElRef.current.style.opacity = String(washRef.current);
      if (chromeElRef.current) {
        chromeElRef.current.style.opacity = String(1 - Math.min(1, washRef.current * 2.4));
      }

      if (p < 1) {
        diveRafRef.current = requestAnimationFrame(frame);
      } else {
        if (diveGuardRef.current !== null) window.clearTimeout(diveGuardRef.current);
        onEnter(page);
      }
    };

    diveRafRef.current = requestAnimationFrame(frame);

    // Wall-clock backstop. If frames stop arriving mid-descent — the tab is
    // hidden, the renderer is throttled — the reader must still arrive at the
    // page they asked for rather than sit on a frozen map that ignores input.
    diveGuardRef.current = window.setTimeout(() => {
      if (!divingRef.current) return;
      if (diveRafRef.current !== null) cancelAnimationFrame(diveRafRef.current);
      onEnter(page);
    }, DIVE.duration * 2 + 600);
  };

  const resetView = () => { targetRef.current = { ...HOME }; glide(); };
  const zoomed = Math.abs(viewRef.current.w - W) > 1 || Math.abs(viewRef.current.x) > 1;

  const chapters = NODES.filter(n => n.kind === 'chapter');
  const hoveredNode = NODES.find(n => n.id === hover);

  /*
   * The excitation layer lingers after the cursor leaves.
   *
   * Mounting it only while hovered cut the fade dead on exit; keeping it in the
   * tree permanently cost 2fps for 64 paths that are invisible most of the
   * time. So it mounts on touch and unmounts only once the fade has finished.
   */
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    if (hover) { setWarm(true); return; }
    const t = window.setTimeout(() => setWarm(false), (RESPOND + 0.5) * 1000 + 500);
    return () => window.clearTimeout(t);
  }, [hover]);
  const hoveredBranch = chapters
    .flatMap(n => n.chapter!.branches)
    .find(b => b.rule === hover);

  /* touch spreads through the actual topology */
  const dist = hoveredNode ? graphDistances(hoveredNode.id) : null;
  const distOf = (id: string) => (dist && dist[id] !== undefined ? dist[id] : 99);
  const excitation = (id: string) => {
    if (!dist) return 0;
    const d = distOf(id);
    return d >= 3 ? 0 : 1 - d / 3;
  };
  const rippleStyle = (id: string): React.CSSProperties => ({
    transition: `opacity ${RESPOND}s ${EASE} ${(Math.min(distOf(id), 4) * 0.04).toFixed(2)}s`
  });
  /** view-box transforms need an explicit origin in user units */
  const spin = (n: { x: number; y: number }, dur: number, seed: number): React.CSSProperties => ({
    transformOrigin: `${n.x}px ${n.y}px`,
    animationDuration: `${period(dur, seed, 0.5).toFixed(2)}s`,
    animationDelay: `-${(rnd(seed) * dur).toFixed(2)}s`
  });

  const spineIdx = hoveredNode ? SPINE.indexOf(hoveredNode.id) : -1;

  /* Touch devices have no hover, so the caption corner behaves differently
     there (persistent, upper-left). Decided once — a pointer does not change
     kind mid-session, and re-checking would cost a media query per render. */
  const coarse = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  ).current;

  const caption = hoveredNode?.chapter
    ? { kind: `Chapter ${hoveredNode.chapter.numeral} · ${hoveredNode.chapter.spine}`, body: hoveredNode.chapter.title }
    : hoveredNode?.section
      ? { kind: `Section ${hoveredNode.section.label} · part of the argument`, body: hoveredNode.section.title }
    : hoveredNode?.figure
      ? { kind: `Figure · ${hoveredNode.figure.short}`, body: hoveredNode.figure.title }
    : hoveredBranch
      ? { kind: 'Ruleset branch · where this chapter concludes', body: hoveredBranch.title }
      : hover === 'core'
        ? { kind: 'You are here · the manifesto', body: 'Prologue — Media as Universe' }
        : hover === 'refs'
          ? { kind: 'Reference', body: 'Consolidated bibliography — every source cited in the dossier' }
          : null;

  /* ------------------------------------------- narrow: the same, as a list */
  if (narrow) {
    return (
      <div className={`relative w-full h-full overflow-y-auto soft-scroll ${isDark ? 'text-white' : 'text-black'}`}>
        <div className="px-4 py-6 space-y-2 max-w-lg mx-auto">
          <div className="pb-1">
            <div className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45">{BOOK_DATA.dossierTitle}</div>
            <h1 className="mt-1.5 text-[18px] font-light uppercase tracking-[0.2em] leading-tight">{BOOK_DATA.title}</h1>
          </div>

          {/* Same control as the wide map's, same wording, and the same silence
              about the number — see the note on the corner control below. */}
          {returning && (
            <button onClick={() => onEnter(lastPage)} className="w-full p-3 border glass-panel glass-hover text-[12px] font-light uppercase tracking-[0.2em]">
              Resume
            </button>
          )}
          {!returning && (
            <button onClick={onOpenIndex} className="w-full p-3 border glass-panel glass-hover text-[12px] font-light uppercase tracking-[0.2em]">
              Proceed
            </button>
          )}

          <button onClick={() => onEnter(1)} className="w-full text-left p-4 border glass-panel glass-hover">
            <span className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-50">You are here · the manifesto</span>
            <span className="block text-[12px] font-light mt-0.5">Prologue — Media as Universe</span>
          </button>

          <div className="text-[9px] uppercase tracking-[0.2em] opacity-40 pt-3 pb-0.5">
            Fragile → Robust → Antifragile
          </div>

          {chapters.map((n, i) => (
            <div key={n.id} className="border glass-panel">
              <button onClick={() => onEnter(firstPageOfChapter(n.id))}
                className="w-full text-left p-4 glass-hover flex items-baseline gap-3.5">
                <span className="text-[12px] font-light opacity-55 w-7 flex-shrink-0">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-50">
                    Chapter {n.chapter!.numeral} · {n.chapter!.spine}
                  </span>
                  <span className="block text-[12px] font-light leading-snug">{n.chapter!.title}</span>
                </span>
              </button>
              <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-0.5">
                {n.chapter!.branches.map(b => (
                  <button key={b.rule} onClick={() => onEnter(pageForPromptRule(b.rule))}
                    className="px-2.5 py-1 border glass-hover text-[9px] uppercase tracking-[0.2em] opacity-75">
                    {b.short}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button onClick={() => onEnter(firstReferencesPage())}
            className="w-full text-left p-3.5 border glass-panel glass-hover mt-3">
            <span className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-50">Reference</span>
            <span className="block text-[12px] font-light mt-0.5">Bibliography</span>
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------- one organism
   *
   * The map carries its own ground, and it is black in both themes. It used to
   * inherit the shell's, so a reader on the light theme got the organism as
   * black ink on white — and every mechanism here (the beacons, the tide, the
   * -core stops, the corona) describes light against a void, which inverts into
   * a smudge the moment the void is white. Prose keeps the preference; tissue
   * does not have one.
   */
  return (
    <div className="relative w-full h-full overflow-hidden bg-black text-white">
      <svg
        ref={svgRef}
        viewBox={`${viewRef.current.x.toFixed(1)} ${viewRef.current.y.toFixed(1)} ${viewRef.current.w.toFixed(1)} ${viewRef.current.h.toFixed(1)}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full font-sans"
        style={{
          cursor: dragRef.current?.moved ? 'grabbing' : 'grab',
          touchAction: 'none',
          // once the descent starts nothing may steer it: a pan mid-dive would
          // tear the camera off the cell it is falling into
          pointerEvents: divingRef.current ? 'none' : undefined
        }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onDoubleClick={resetView}
        xmlns="http://www.w3.org/2000/svg">
        <FigureDefs id={ID} blur={3.2} />

        {/*
          Flex.

          An animated turbulence displacement over the whole organism, so the
          tissue itself undulates rather than only brightening and dimming.
          Measured cost: 20fps with it against 21fps without — a filter is one
          pass over the rasterised group, not per-element work, which is why it
          is nearly free where a transform on the same group cost 15fps.

          The displacement is small (8 user units) and slow. Hit-testing uses
          undisplaced geometry, so pointer targets sit up to 8px from where a
          strand appears — well inside the 24–30px hit radii on every node.
        */}
        <defs>
          {/*
            Two clocks, not one.

            A displacement whose frequency alone oscillates undulates at a fixed
            depth, and a fixed depth is a texture: after a minute the eye has
            the whole gesture and stops attending. Animating the *amplitude* on a
            second period — 67.1s against the frequency's 41.3s, a ratio that
            does not resolve — means the tissue sometimes barely stirs and
            sometimes visibly flows, and the combination takes ~46 minutes to
            repeat. That non-resolution is the whole of soft fascination: enough
            structure to hold the eye, never enough to finish reading.

            The frequency pair is anisotropic (x ≠ y), so the noise field is
            stretched rather than square, and the tissue drifts along a direction
            instead of shimmering in place.

            Still one raster pass over the already-rasterised group — measured at
            ~1fps for the original filter, and a second <animate> on the same
            filter primitive adds no passes.
          */}
          {/*
            The organism goes into darkness rather than into an edge.

            Every fibre used to stop dead at the SVG bounds, which draws a hard
            rectangle around a thing that has no rectangle in it — the frame
            became the most definite line on the map. Tissue continuing past the
            frame should simply become too faint to see, the way the references
            fade into their own ground.

            A radial mask over the whole organism: opaque across the middle, and
            falling to nothing before the corner. One mask over a group that is
            already buffered for its filter, so it costs no extra raster pass.
          */}
          <radialGradient id={`${ID}-edgefade`} cx="50%" cy="50%" r="62%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="58%" stopColor="#fff" stopOpacity="1" />
            <stop offset="80%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={`${ID}-edgemask`} maskUnits="userSpaceOnUse"
            x={-HOME_MARGIN_X} y={-HOME_MARGIN_Y}
            width={W + HOME_MARGIN_X * 2} height={H + HOME_MARGIN_Y * 2}>
            <rect x={-HOME_MARGIN_X} y={-HOME_MARGIN_Y}
              width={W + HOME_MARGIN_X * 2} height={H + HOME_MARGIN_Y * 2}
              fill={`url(#${ID}-edgefade)`} />
          </mask>

          <filter id={`${ID}-flex`} x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence type="fractalNoise" baseFrequency="0.0052 0.0068" numOctaves={2} result="flexNoise">
              <animate attributeName="baseFrequency"
                values="0.0052 0.0068;0.0089 0.0061;0.0064 0.0093;0.0052 0.0068"
                dur="41.3s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="flexNoise" scale={8}
              xChannelSelector="R" yChannelSelector="G">
              <animate attributeName="scale"
                values="5.2;9.6;6.8;11;5.2" dur="67.1s" repeatCount="indefinite" />
            </feDisplacementMap>
          </filter>
        </defs>

        <Backdrop pulledBack={pulledBack} strained={strained} />

        {/* The organism does NOT carry a tidal transform. Animating a transform
            on a group of ~6000 elements re-rasterises every one of them each
            frame — measured at 6fps. The tide is carried by opacity instead
            (see .strand-breathe), which composites cheaply, and the sense of
            depth comes from the backdrop planes drifting behind. The flex
            filter, by contrast, is a single raster pass and costs ~1fps. */}
        {/* The mesh yields to the clock.

            Pulling back is a change of scale, and at the far end of it the
            organism should have resolved into a single cell — filaments from
            one core, each ending in a seed. That cannot happen while the mesh
            is still drawn at full strength over it: you would see a seed head
            with a network on top, which is neither reading. So the whole
            organism dims as the corona arrives, and what is left at the limit
            is the dandelion.

            The opacity rides on the group that already carries the flex filter,
            so it costs no extra raster pass — the offscreen buffer is there
            either way. */}
        <g
          ref={tissueRef}
          className="tissue-live"
          filter={strained || glidingRef.current ? undefined : `url(#${ID}-flex)`}
          mask={`url(#${ID}-edgemask)`}
          opacity={1 - Math.min(1, Math.max(0, (pulledBack - 0.2) / 0.5)) * 0.82}
        >

        {/* ----------------------------------- every connection, one routine */}
        <g>
          {EDGES.map((e, i) => {
            const exc = Math.max(excitation(e.a), excitation(e.b));
            const spineLit = e.spine && spineIdx >= 0 &&
              SPINE.indexOf(e.a) < spineIdx && SPINE.indexOf(e.b) <= spineIdx;
            // Resting visibility carries the "everything is connected" reading;
            // the hover delta stays small so touch warms rather than flashes.
            // Raised with the backdrop clearing: at rest every connection must
            // be readable as a connection, not inferred from a smudge.
            const base = e.spine ? 0.95 : 0.8;
            const op = Math.min(1, base + exc * 0.22 + (spineLit ? 0.12 : 0));
            const weight = (e.spine ? 1.6 : 1.05) * (0.85 + exc * 0.55);
            // Breathing a group re-composites its whole subtree each frame, so
            // only part of the mesh carries a clock. Because neighbours differ,
            // the shimmer still reads across the whole organism.
            // Every strand breathes on the tide now — one shared period, phase
            // set by distance from the core — so the mesh brightens in a wave
            // rolling outward instead of shimmering at random.
            // The tide sits on the pieces of the taper, not on the whole strand,
            // so the swell rolls ALONG the fibre instead of blinking all of it at
            // once. One seed for the whole strand: phase may vary by position
            // only, or the jitter inside tideFraction turns into shimmer (LC-01).
            //
            // Under a strained frame budget it falls back to one phase for the
            // whole strand — the wave still rolls outward across the organism,
            // it just stops rolling within each fibre. That halves the number of
            // separately animated groups, and the flow is a luxury for the same
            // reason the sway and the depth-of-field lens are.
            const mid = EDGE_PTS[i][Math.floor(EDGE_PTS[i].length / 2)];
            return (
              <g key={`e${i}`}
                className={strained ? 'strand-breathe' : undefined}
                style={strained
                  ? { ...rippleStyle(e.a), animationDelay: tidePhase(mid[0], mid[1], i + 3) }
                  : rippleStyle(e.a)}>
                {tissue(EDGE_PTS[i], weight, op, e.seed, `e${i}`, true,
                  strained ? undefined : (x, y) => tidePhase(x, y, i + 3))}
              </g>
            );
          })}

          {/*
            Where two fibres cross, a cell relays between them.

            Crossings must fuse — two strands laid over one another read as
            unrelated ribbons and that is what made whole regions look
            disconnected. But an abstract lit star was fusing them with a
            graphic device, not with anatomy. What sits at a crossing in real
            tissue is a small interneuron: a spindle-shaped cell body lying
            along the bisector of the two fibres, with neurites running out of
            both poles into each of them. It fuses the crossing exactly as
            before, and now it is a cell doing it.
          */}
          {JUNCTIONS.map((j, i) => {
            const exc = Math.max(
              excitation(ALL_STRANDS[j.a].a), excitation(ALL_STRANDS[j.a].b),
              excitation(ALL_STRANDS[j.b].a), excitation(ALL_STRANDS[j.b].b)
            );
            const lit = 0.4 + exc * 0.4;
            // the long axis of a bipolar cell splits the angle between the two
            // fibres it relays, so both neurites leave it along tissue
            const bis = Math.atan2(
              Math.sin(j.angA) + Math.sin(j.angB),
              Math.cos(j.angA) + Math.cos(j.angB)
            );
            const rx = 3.1 + rnd(j.seed + 1) * 1.3;
            const ry = 1.5 + rnd(j.seed + 2) * 0.6;
            const body: Array<[number, number]> = Array.from({ length: 13 }, (_, k) => {
              const a = (k / 12) * Math.PI * 2;
              const lx = Math.cos(a) * rx * (0.92 + rnd(j.seed + k) * 0.16);
              const ly = Math.sin(a) * ry * (0.9 + rnd(j.seed + k + 30) * 0.2);
              return [
                j.x + lx * Math.cos(bis) - ly * Math.sin(bis),
                j.y + lx * Math.sin(bis) + ly * Math.cos(bis)
              ];
            });
            // one neurite into each direction of each crossing fibre
            const runs = [j.angA, j.angA + Math.PI, j.angB, j.angB + Math.PI];
            return (
              <g key={`j${i}`} style={rippleStyle(ALL_STRANDS[j.a].a)}>
                {runs.map((a, k) => {
                  const l = 4.5 + rnd(j.seed + k + 7) * 5.5;
                  const sx = j.x + Math.cos(a) * rx * 0.8;
                  const sy = j.y + Math.sin(a) * rx * 0.8;
                  const tx = j.x + Math.cos(a) * (rx * 0.8 + l);
                  const ty = j.y + Math.sin(a) * (rx * 0.8 + l);
                  return (
                    <path key={k} d={arcSegment(sx, sy, tx, ty, (rnd(j.seed + k + 19) - 0.5) * l * 0.5)}
                      fill="none" stroke="currentColor" strokeWidth={0.26}
                      strokeLinecap="round" opacity={lit * 0.6} />
                  );
                })}
                {/* The relay cell is drawn, not filled. There is one of these at
                    every crossing in the organism — a gradient disc plus a
                    filled spindle at each was the largest single source of grey
                    haze on the map. The spindle is now its own outline as a
                    filament, which is what every other body here is. */}
                <path d={`${smoothPolyline(body)} Z`} fill="none" stroke="currentColor"
                  strokeWidth={0.3} strokeLinecap="round" opacity={lit * 0.75} />
                <circle cx={j.x} cy={j.y} r={0.8} fill="currentColor" opacity={lit} />
              </g>
            );
          })}

          {/* continuous waves — every wave its own speed and phase, so light is
              always moving somewhere and nothing ever pulses in lockstep */}
          {/* No travelling dash pulses. A dash sliding along a stroke always
              renders as a discrete bright capsule — a worm — no matter how it
              is softened or layered, because a lit dash segment has ends and
              those ends read as an object moving over the drawing rather than
              light living in it. The system carries its light instead through
              the desynchronised swell of every strand (.strand-breathe) and the
              glow at the somas, which have no edges to give them away. */}

          {/*
            The excitation layer is transition-driven, and it outlives the touch.

            It used to run a keyframe on paths that were mounted on hover and
            unmounted the instant the cursor left — which cut the fade dead. A
            mount/unmount animation cannot reverse, so it can never feel fluid.
            Now it is a plain CSS transition, and the layer stays mounted for
            the length of the fade after the cursor leaves (see `warm`), so it
            cools as gently as it warmed. It is absent the rest of the time
            because 64 permanently-mounted paths cost 2fps for nothing.
          */}
          {warm && EDGES.map((e, i) => {
            const d = Math.min(distOf(e.a), distOf(e.b));
            const lit = d <= 2 ? (1 - d / 3) * 0.12 : 0;
            return (
              <path key={`x${i}`} d={smoothPolyline(EDGE_PTS[i])}
                fill="none" stroke="currentColor"
                strokeWidth={1.1} strokeLinecap="round"
                opacity={lit}
                style={{ transition: `opacity ${RESPOND + 0.5}s ${EASE} ${(Math.min(d, 3) * 0.16).toFixed(2)}s` }} />
            );
          })}
        </g>

        {/* --------------------------- ruleset roots, running past the frame */}
        {chapters.map((n, i) =>
          n.chapter!.branches.map((b, k) => {
            const outward = Math.atan2(n.y - CY, n.x - CX);
            const ang = outward + (k - (n.chapter!.branches.length - 1) / 2) * 0.62;
            const active = hover === b.rule;
            const seed = i * 17 + k * 5 + 1;
            const exc = excitation(n.id);
            const system = branchSystem(n, ang, seed);
            return (
              <g key={b.rule}
                onMouseEnter={() => setHover(b.rule)} onMouseLeave={() => setHover(null)}
                onClick={() => enter(pageForPromptRule(b.rule))}
                onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); enter(pageForPromptRule(b.rule)); } }}
                tabIndex={0} role="button" aria-label={b.title}
                style={{ cursor: 'pointer' }}>
                <path d={smoothPolyline(system[0])} fill="none" stroke="transparent" strokeWidth={20} />
                {/* Each arm of the root carries its own phase, taken at its own
                    midpoint. Phasing the whole root at the soma made a 600px
                    limb light all at once while the wave was still crossing the
                    chapter; per-arm phase lets the tide travel along it. */}
                {system.map((pts, si) => {
                  const m = pts[Math.floor(pts.length / 2)];
                  const tip = pts[pts.length - 1];
                  const prev = pts[pts.length - 2];
                  const op = (active ? 0.95 : 0.62 + exc * 0.3) * (si === 0 ? 1 : 0.78);
                  return (
                  <g key={si}
                    className={strained ? 'strand-breathe' : undefined}
                    style={strained
                      ? { animationDelay: tidePhase(m[0], m[1], seed + si) }
                      : undefined}>
                    {tissue(pts,
                      (active ? 1.7 : 1.2) * (si === 0 ? 1 : 0.66),
                      op,
                      seed + si * 13, `b${i}${k}${si}`, false,
                      strained ? undefined : (x, y) => tidePhase(x, y, seed + si))}
                    {/* These are the only free ends in the organism, so they
                        are the only place a growth cone belongs: the fibre is
                        still extending, and a neurite that simply stops reads
                        as a line that ran out of canvas. */}
                    {strained ? (
                      <GrowthCone x={tip[0]} y={tip[1]}
                        angle={Math.atan2(tip[1] - prev[1], tip[0] - prev[0])}
                        seed={seed + si * 23 + 3} size={si === 0 ? 11 : 8}
                        opacity={op} />
                    ) : (
                      <g className="strand-breathe"
                        style={{ animationDelay: tidePhase(tip[0], tip[1], seed + si) }}>
                        <GrowthCone x={tip[0]} y={tip[1]}
                          angle={Math.atan2(tip[1] - prev[1], tip[0] - prev[0])}
                          seed={seed + si * 23 + 3} size={si === 0 ? 11 : 8}
                          opacity={op} />
                      </g>
                    )}
                  </g>);
                })}
              </g>
            );
          })
        )}

        {/* -------------------- satellites: the chapter's own sections, linked */}
        {SATELLITES.map((s, i) => {
          const active = hover === s.id;
          const exc = excitation(s.id);
          return (
            <g key={s.id}
              data-node-id={s.id}
              onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}
              onClick={() => enter(s.section!.page, s.x, s.y)}
              onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); enter(s.section!.page, s.x, s.y); } }}
              tabIndex={0} role="button" aria-label={`Section ${s.section!.title}`}
              style={{ cursor: 'pointer' }}>
              <circle cx={s.x} cy={s.y} r={s.size + 15} fill="transparent" />
              {/* a sub-chapter is a small soma of the same tissue: a dendrite
                  tuft that overlaps its neighbours, a swirl that fades out with
                  no drawn edge, and a lit centre — never a ringed marker */}
              <g className="strand-breathe" style={{ animationDelay: tidePhase(s.x, s.y, i + 31) }}>
              <g style={rippleStyle(s.id)} opacity={active ? 1 : 0.78 + exc * 0.22}>
                <Dendrites id={ID} cx={s.x} cy={s.y} r={s.size * 3.9} arms={5} depth={3}
                  seed={i * 19 + 7} opacity={active ? 0.8 : 0.58} width={0.5} />
                <VortexSphere id={ID} cx={s.x} cy={s.y} r={s.size}
                  seed={i * 5 + 2} strands={13} exits={fibreAngles(s)}
                  intensity={active ? 1.3 : 1.12 + exc * 0.14}
                  reverse={i % 2 === 0} spinning={false} />
                {/* no halo disc — see the chapter somas: a soft radial mass on
                    black is a grey blob, not a cell */}
                <circle cx={s.x} cy={s.y} r={1.7} fill="currentColor"
                  opacity={active ? 1 : 0.72 + exc * 0.28} filter={`url(#${ID}-glow)`} />
              </g>
              </g>
            </g>
          );
        })}

        {/* ------------------------------ the worlds, hung off their chapters */}
        {FIGURE_NODES.map((f, i) => {
          const active = hover === f.id;
          const exc = excitation(f.id);
          return (
            <g key={f.id}
              data-node-id={f.id}
              onMouseEnter={() => setHover(f.id)} onMouseLeave={() => setHover(null)}
              onClick={() => onOpenFigure?.(f.figure!.type)}
              onKeyDown={ev => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpenFigure?.(f.figure!.type); }
              }}
              tabIndex={0} role="button" aria-label={`Open the figure: ${f.figure!.title}`}
              style={{ cursor: 'pointer' }}>
              <circle cx={f.x} cy={f.y} r={f.size + 15} fill="transparent" />
              {/* Same cell as a section satellite, at a larger scale and a
                  higher intensity — a world is bigger than a page, and that is
                  the whole of how it says so. No new shape. */}
              <g className="strand-breathe" style={{ animationDelay: tidePhase(f.x, f.y, i + 53) }}>
              <g style={rippleStyle(f.id)} opacity={active ? 1 : 0.84 + exc * 0.16}>
                <Dendrites id={ID} cx={f.x} cy={f.y} r={f.size * 3.6} arms={6} depth={3}
                  seed={i * 23 + 11} opacity={active ? 0.86 : 0.64} width={0.54} />
                <VortexSphere id={ID} cx={f.x} cy={f.y} r={f.size}
                  seed={i * 9 + 4} strands={17} exits={fibreAngles(f)}
                  intensity={active ? 1.42 : 1.24 + exc * 0.16}
                  reverse={i % 2 === 1} spinning={false} />
                <circle cx={f.x} cy={f.y} r={2.1} fill="currentColor"
                  opacity={active ? 1 : 0.82 + exc * 0.18} filter={`url(#${ID}-glow)`} />
              </g>
              </g>
            </g>
          );
        })}

        {/* --------------------------------- minor cells: same tissue, smaller */}
        {MINOR_NODES.map((m, i) => {
          const exc = excitation(m.id);
          return (
            <g key={m.id} data-node-id={m.id} className={strained ? undefined : 'sway'} style={spin(m, 26 + rnd(i + 4) * 16, i + 90)}>
              <g style={rippleStyle(m.id)} opacity={0.42 + exc * 0.4}>
                <Dendrites id={ID} cx={m.x} cy={m.y} r={m.size * 3.4} arms={5} depth={3}
                  seed={i * 13 + 5} opacity={0.34} width={0.45} />
                <circle cx={m.x} cy={m.y} r={m.size * 0.28} fill="currentColor" opacity={0.28 + exc * 0.3} />
                <circle cx={m.x} cy={m.y} r={1.1} fill="currentColor" opacity={0.6 + exc * 0.4} />
              </g>
            </g>
          );
        })}

        {/* ------------------------------------------------- chapter neurons */}
        {chapters.map((n, i) => {
          const active = hover === n.id;
          const exc = excitation(n.id);
          const onSpine = spineIdx >= 0 && SPINE.indexOf(n.id) <= spineIdx && SPINE.indexOf(n.id) >= 0;

          return (
            <g key={n.id}
              data-node-id={n.id}
              onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
              onClick={() => enter(firstPageOfChapter(n.id), n.x, n.y)}
              onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); enter(firstPageOfChapter(n.id), n.x, n.y); } }}
              tabIndex={0} role="button" aria-label={`Chapter ${n.chapter!.numeral} — ${n.chapter!.title}`}
              style={{ cursor: 'pointer' }}>
              <circle cx={n.x} cy={n.y} r={n.size + 24} fill="transparent" />

              {/* The beacon.

                  A chapter is a light source, built exactly like the emitter at
                  the centre: layered radial falloff, bright at the heart. This
                  is not the grey halo that was removed twice — that was a single
                  disc at 0.3 opacity, a dim cloud that lifted the ground and
                  took the strands' contrast with it. A light source is layered
                  and BRIGHT; the difference between haze and lamp is intensity,
                  not construction. No solid hot dot at the very centre, though —
                  the numeral lives there, white on white.

                  It breathes on the tide, phased at the soma like everything
                  attached to it, so the light swells as the wave passes. */}
              <g className="strand-breathe"
                style={{ animationDelay: tidePhase(n.x, n.y, i + 19) }}>
                <circle cx={n.x} cy={n.y} r={n.size * (active ? 2.1 : 1.75)}
                  fill={`url(#${ID}-core)`}
                  opacity={active ? 0.72 : 0.5 + exc * 0.2}
                  style={{ transition: `opacity ${RESPOND}s ${EASE}, r ${RESPOND}s ${EASE}` }} />
                <circle cx={n.x} cy={n.y} r={n.size * 0.95}
                  fill={`url(#${ID}-core)`}
                  opacity={active ? 1 : 0.85 + exc * 0.15}
                  style={{ transition: `opacity ${RESPOND}s ${EASE}` }} />
              </g>


              {/* The membrane. A multipolar silhouette, coned out toward every
                  fibre the cell carries — the shape of the soma is itself a
                  statement about how many connections it makes. Filled, never
                  stroked: an outline would be the hard edge the map avoids. */}
              {/* No membrane fill. NOTHING in this organism is a filled area.

                  This shape was tried at 0.17, then 0.055, and the lower value
                  was still a blob — because the problem was never the opacity,
                  it was the fill. Flat tone over an area reads as a mass at any
                  strength; only line has no mass. The multipolar silhouette is
                  still there and still says how many fibres the cell carries:
                  it is spoken by the pappus crowding at the centre and by the
                  arbor coning outward, both of which are drawn. */}

              {/* the soma reaches when touched — dendrites extend, not just brighten */}
              <g className={strained ? undefined : 'sway'} style={spin(n, 24 + rnd(i * 5 + 2) * 14, i + 40)}>
                <g style={{ transition: `transform ${RESPOND + 0.4}s ${EASE}, opacity ${RESPOND}s ${EASE}`,
                  transform: `scale(${1 + exc * 0.06})`, transformOrigin: `${n.x}px ${n.y}px`,
                  opacity: 0.78 + exc * 0.22 }}>
                  {/* spiny: these are the big arbors, and spines are what make a
                      branching line read as a dendrite rather than a twig.
                      More arms, reaching further: an arbor is the other half of
                      what identifies a neuron, and seven short ones read as a
                      tuft attached to a ball. */}
                  <Dendrites id={ID} cx={n.x} cy={n.y} r={n.size * 3.0} arms={8} depth={3}
                    seed={i * 29 + 13} opacity={1} width={0.66} spines />
                </g>
              </g>

              <g className="strand-breathe" style={{ animationDelay: tidePhase(n.x, n.y, i + 7) }}>
              <g className="alive" style={spin(n, 9 + rnd(i * 3 + 7) * 6, i + 60)}>
                <g style={rippleStyle(n.id)} opacity={active ? 1 : onSpine ? 0.92 : 0.6 + exc * 0.3}>
                  {/* spinSeconds must not change on hover: altering
                      animation-duration mid-cycle makes the browser recompute
                      the rotation's position, so the planet visibly snaps. The
                      swirl keeps its own steady pace whatever the cursor does. */}
                  {/* damped: cytoplasm inside a cell body, not the cell itself */}
                  <VortexSphere id={ID} cx={n.x} cy={n.y} r={n.size}
                    seed={i * 11 + 3} strands={22} exits={fibreAngles(n)}
                    intensity={active ? 1.35 : 1.12 + exc * 0.2}
                    reverse={i % 2 === 1}
                    spinSeconds={34 + rnd(i + 3) * 20} />
                  {/* The nucleus, with its nucleolus off to one side.
                      Cytoplasm swirls around it; the quiet round zone and the
                      dense body in it are what make the swirl read as the
                      inside of a cell rather than weather.

                      The nucleus disc is gone with every other filled area —
                      a 33-unit circle of flat tone is a small blob, and small
                      blobs are what a lot of small blobs are made of. The
                      nucleolus stays: it is a point, and a point has no area
                      to read as tone. It sits off-axis, as it does in life. */}
                  {/* Memory, not progress.

                      A chapter the reader has opened carries a brighter
                      nucleolus — a cell that has fired once looks different
                      from one that never has. It is binary and it never
                      decreases, so there is nothing here to complete: no bar,
                      no fill, no count. A map that filled up as you read it
                      would be a completion mechanic wearing tissue, which is
                      the exact thing Chapter I is about. */}
                  <circle cx={n.x + n.size * 0.19} cy={n.y - n.size * 0.15}
                    r={n.size * 0.1} fill="currentColor" filter={`url(#${ID}-glow)`}
                    opacity={active ? 0.3 : (visited.has(n.id) ? 0.82 : 0.4) + exc * 0.18}
                    style={{ transition: `opacity 1.6s ${EASE}` }} />
                  {/* The numeral, at the centre of the cell.

                      It is faint against the lamp it sits in — the beacon
                      composites to roughly 90% white before the vortex and the
                      glow are counted. Two ways out of that were tried and both
                      were worse to look at: the reading set below the soma read
                      as a caption parked under a drawing, and set into the lamp
                      as a dark knockout it read as a label stuck on the cell.
                      The drawing wins; the caption corner carries the name on
                      touch, which is what it is for. */}
                  <g style={{ transition: `opacity 1.6s ${EASE}` }} opacity={active ? 1 : 0.72}>
                    {/* A numeral is one glyph, so it is not tracked: letter
                        spacing on a lone character adds a trailing gap that
                        text-anchor="middle" then counts as width, pushing the
                        glyph off its own centre. */}
                    <Label x={n.x} y={n.y + 5.5} anchor="middle" size={16} weight={300}
                      opacity={1}>
                      {n.chapter!.numeral}
                    </Label>
                  </g>
                </g>
              </g>
              </g>

              {/* No name beside the cell.

                  Names were tried here twice — as two-line blocks, and as one
                  line knocked out of a lamp of its own — and both put text out
                  in the open field, which is the one thing on this map that is
                  not tissue. The caption corner names whatever is touched, and
                  that is the whole of the naming this surface does. */}


            </g>
          );
        })}

        {/* ----------------------------------- the emitter, same tissue family */}
        {/* data-node-id is what lets scripts/audits/runtime/graph-audit.js rebuild the
            graph from rendered geometry — see OG-02, Nothing Floats. */}
        <g data-node-id="core"
          onMouseEnter={() => setHover('core')} onMouseLeave={() => setHover(null)}
          onClick={() => enter(1, CX, CY)}
          onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); enter(1, CX, CY); } }}
          tabIndex={0} role="button" aria-label="Open the Prologue — Media as Universe"
          style={{ cursor: 'pointer' }}>
          <circle cx={CX} cy={CY} r={78} fill="transparent" />
          {/* no membrane fill — see the chapter somas: only line has no mass */}
          <g style={{ transition: `transform ${RESPOND + 0.4}s ${EASE}, opacity ${RESPOND}s ${EASE}`,
            transform: `scale(${1 + excitation('core') * 0.07})`, transformOrigin: `${CX}px ${CY}px`,
            opacity: 0.8 + excitation('core') * 0.2 }}>
            <Dendrites id={ID} cx={CX} cy={CY} r={128} arms={15} depth={4} seed={6}
              opacity={1} width={0.85} spines />
          </g>
          {/* the source: layered falloff so the light has depth rather than an edge.
              transform-origin in user units — .core-pulse is view-box boxed, so
              nothing here costs a bounding-box measurement per frame */}
          <g className="core-pulse" style={{ transformOrigin: `${CX}px ${CY}px` }}
            opacity={1 - Math.min(1, Math.max(0, (pulledBack - 0.2) / 0.5)) * 0.92}>
            <circle cx={CX} cy={CY} r={hover === 'core' ? 112 : 96}
              fill={`url(#${ID}-core)`} opacity={0.42}
              style={{ transition: `r ${RESPOND}s ${EASE}, opacity ${RESPOND}s ${EASE}` }} />
            <circle cx={CX} cy={CY} r={hover === 'core' ? 70 : 60}
              fill={`url(#${ID}-core)`} opacity={hover === 'core' ? 1 : 0.95}
              style={{ transition: `r ${RESPOND}s ${EASE}, opacity ${RESPOND}s ${EASE}` }} />
            <circle cx={CX} cy={CY} r={hover === 'core' ? 26 : 22}
              fill={`url(#${ID}-core)`} opacity={1}
              style={{ transition: `r ${RESPOND}s ${EASE}` }} />
            <circle cx={CX} cy={CY} r={5} fill="currentColor" filter={`url(#${ID}-glow)`} />
          </g>
          {/* No script over the emitter. "YOU ARE HERE" was the one piece of
              text standing in the open field; the light itself says centre,
              and the caption corner says the rest on touch. */}
        </g>

        {/* -------------------------------------- bibliography, quiet and aside */}
        <g data-node-id="refs"
          onMouseEnter={() => setHover('refs')} onMouseLeave={() => setHover(null)}
          onClick={() => enter(firstReferencesPage(), REFS.x, REFS.y)}
          onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); enter(firstReferencesPage(), REFS.x, REFS.y); } }}
          tabIndex={0} role="button" aria-label="Open the bibliography" style={{ cursor: 'pointer' }}>
          <circle cx={REFS.x} cy={REFS.y} r={28} fill="transparent" />
          <g style={rippleStyle('refs')} opacity={hover === 'refs' ? 1 : 0.8 + excitation('refs') * 0.2}>
            <Dendrites id={ID} cx={REFS.x} cy={REFS.y} r={42} arms={5} depth={3}
              seed={91} opacity={hover === 'refs' ? 0.9 : 0.68} width={0.52} />
            <circle cx={REFS.x} cy={REFS.y} r={1.9} fill="currentColor"
              opacity={hover === 'refs' ? 1 : 0.7} />
          </g>
        </g>

        </g>
      </svg>

      {/*
        The landing.

        Not a flash and not a curtain: the page ground rises through the frame
        over the last stretch of the descent, so the tissue streaming past
        simply thins into the sheet you are about to read. Washing to white in
        the dark theme would be the single most arousing frame in the app — the
        wash is always the background you are arriving on.
      */}
      {/* The ground under the chrome.

          In front of the organism and behind every word, so the wordmark and
          the controls sit on their own ground instead of on whatever filament
          happened to be there. It darkens toward the theme's own ground and
          never lifts it — see .ground-vignette in index.css for why this is the
          one feathered surface the plain ground still allows.

          What is permanent here is deliberately light. The strong plateau is
          the next element, and it is gated on there being a name to carry. */}
      {/* The surround does two things, and this is the second: the periphery
          defocuses as well as darkens, so it reads as distance rather than as a
          dimmer copy of the same plane. It shares the vignette's ellipse, so the
          two are one lens. Dropped entirely when the frame budget is strained —
          it is a per-frame GPU composite, and the first thing that should go on
          a machine already struggling to draw the organism. */}
      {!strained && <div aria-hidden="true" className="depth-of-field" />}

      <div aria-hidden="true" className="ground-vignette" />

      {/* The name's ground, and it exists only while the name does.

          Permanent, this pad buried the top-left corner of the drawing: at the
          home framing nothing is there, but zoomed in the organism reaches it
          and the cells went under 96% black. Sharing the caption's own
          condition means the corner is dark exactly while there is something
          to read in it, and the map is never veiled while you are looking at
          it. The two fade on one curve so they arrive as one surface. */}
      <div
        aria-hidden="true"
        className="name-ground"
        style={{
          opacity: caption || coarse ? 1 : 0,
          transition: `opacity .7s ${EASE}`
        }}
      />

      <div
        ref={washElRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: isDark ? '#000000' : '#ffffff', opacity: washRef.current }}
      />

      {/* The name, in the upper-left corner — one element for every device.
          On a fine pointer it surfaces under the cursor and fades when the
          cursor leaves; on touch, where there is no hover to wait for, it
          stays in view carrying whatever was last touched, the dossier's own
          name before anything has been.

          Thin and elegant, the house voice: the single family, extralight,
          wide-tracked — never the bold instrument-label style. A name is
          typography, not signage. */}
      {/* The box is bounded, and bounded to the vignette's plateau rather than
          to a share of the window. `max-w-[60%]` let the name run as wide as
          the viewport allowed and wrap to as many lines as it liked, which on a
          wide window carried it clean out of the dark corner and back onto the
          tissue — the readability problem again, one layer up.

          360px at 18px holds about 22 characters a line, and the longest name
          in the book is the bibliography's at 60, so three lines is the real
          worst case and four is the ceiling. `overflow-hidden` is the guard of
          last resort, not the mechanism: nothing in the data reaches it.

          The type is not scaled to fit. The scale is 9, 12, 18 and a fitted
          name would land between them; the box is sized to the longest name
          instead, which is the same answer arrived at without spending a size
          that does not exist. */}
      <div
        className="absolute top-5 left-6 pointer-events-none w-[min(56vw,360px)] max-h-[136px] overflow-hidden"
        style={{
          opacity: caption || coarse ? 1 : 0,
          transition: `opacity .7s ${EASE}`
        }}
      >
        <div className="text-[9px] font-light uppercase tracking-[0.2em] opacity-50">
          {caption ? caption.kind : 'U.R. — Strategic Dossier'}
        </div>
        <div className="mt-1 text-[18px] font-light leading-snug">
          {caption ? caption.body : 'Media as Universe'}
        </div>
      </div>

      {/* Sound, in the corner opposite the name.

          Its state is the only thing it says, and light says it: lit is on,
          faded is off. No icon that swaps, no word that changes to its own
          opposite, no crossed-out speaker — a control whose label rewrites
          itself makes the reader parse a sentence to learn a state they could
          have simply seen. This is the same thing .bud/.bud-lit does everywhere
          else in the app, which is why it needs no explaining here. */}
      <div className="absolute top-4 right-5 z-20 pointer-events-auto">
        <button
          onClick={onToggleSound}
          className={`bud px-2 py-1.5 text-[9px] font-light uppercase tracking-[0.2em] flex items-center gap-2 rounded-none outline-none ${
            soundEnabled ? 'bud-lit' : ''
          }`}
          style={{ opacity: soundEnabled ? 0.95 : 0.3, transition: `opacity .6s ${EASE}` }}
          title={soundEnabled ? 'Sound is on' : 'Sound is off'}
          aria-label="Sound"
          aria-pressed={soundEnabled}
        >
          <Soma size={8} opacity={soundEnabled ? 0.95 : 0.45} phase={13.1} />
          <span>Sound</span>
        </button>
      </div>

      {/* one bottom bar, three zones that cannot collide */}
      <div
        ref={chromeElRef}
        className="absolute inset-x-0 bottom-0 flex items-end gap-4 px-5 pb-4 pointer-events-none"
        style={{
          // the chrome leaves early, so the last thing on screen is the cell
          opacity: 1 - Math.min(1, washRef.current * 2.4),
          transition: divingRef.current ? undefined : `opacity .6s ${EASE}`
        }}>
        {/* The way in, where the wordmark used to sit.

            The wordmark said "Media as Universe" — which the caption corner
            already says at rest, so it was the frame naming itself twice, and it
            was the only thing down here that could not be acted on. The corner
            now carries the one control a reader actually arrives wanting: back
            to where they stopped, or, for somebody who has never been in, the
            way in at all.

            A first visit says PROCEED and opens the index rather than dropping
            the reader at page one: the book is not a queue, and somebody meeting
            it for the first time is owed the shape of it before a position in
            it. There is nothing to resume, and offering to resume nothing is
            how an interface starts lying in its first sentence. */}
        <div className="w-56 flex-shrink-0 pointer-events-auto"
          style={{ opacity: caption ? 0 : 1, transition: `opacity .7s ${EASE}` }}>
          <button
            onClick={() => (returning ? enter(lastPage) : onOpenIndex())}
            className="bud px-2 py-1.5 text-[9px] font-light uppercase tracking-[0.2em] flex items-center gap-2 rounded-none outline-none opacity-60 hover:opacity-100"
            style={{ transition: `opacity .6s ${EASE}` }}
            title={returning ? 'Return to where you stopped reading' : 'Open the index and begin'}
            aria-label={returning ? 'Return to where you stopped reading' : 'Open the index and begin'}
          >
            <Soma size={8} phase={4.2} />
            {/* No page number, here or anywhere. A count is an instrument
                reading, and "P.5" tells a reader nothing they wanted to know —
                where they stopped is a place in an argument, not an index into
                an array, and printing the index invites them to measure their
                progress against a total instead of reading. The control names
                the act; the book keeps the arithmetic to itself. */}
            <span>{returning ? 'Resume' : 'Proceed'}</span>
          </button>
        </div>

        <div className="flex-1 min-w-0 text-center flex items-end justify-center">
          <div className="text-[9px] uppercase tracking-[0.2em] opacity-25">
            Touch the tissue · scroll to zoom · Esc returns here
          </div>
        </div>

        {/* One named control, and only while it has something to undo.

            The + and − were two glyphs doing what the wheel and the pinch
            already do better, and they were the only signage on this surface —
            a name is typography, not a pair of symbols. What is left is the one
            thing a gesture cannot express: put it back. It appears when the view
            has actually moved, because a control that is permanently present and
            usually inert is one the eye stops seeing. */}
        <div className="w-40 flex-shrink-0 flex flex-col items-end gap-1 pointer-events-auto">
          {zoomed && (
            <button onClick={resetView}
              className="bud px-2 py-1.5 text-[9px] font-light uppercase tracking-[0.2em] flex items-center gap-2 rounded-none outline-none opacity-45 hover:opacity-95"
              style={{ transition: `opacity .6s ${EASE}` }}
              title="Put the view back where it started" aria-label="Reset view">
              <Soma size={8} phase={9.7} />
              <span>Reset view</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
