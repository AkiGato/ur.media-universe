import React, { useEffect, useReducer, useRef, useState, useMemo } from 'react';
import { BOOK_DATA } from '../data/bookData';
import { PROMPT_RULESET_DATA } from '../data/promptData';
import {
  BOOK_PAGES,
  BookPage,
  FIGURES,
  FIGURE_PASSAGES,
  firstPageOfChapter,
  firstReferencesPage,
  pageForPromptRule,
  sheetKey
} from '../data/pageModel';
import {
  FigureDefs, VortexSphere, Dendrites, GrowthCone, Label,
  rnd, smoothPolyline, arcSegment, dendriteStrands, type ArborSpec
} from './figures/FigurePrimitives';
import { bakeTissue, type TissueCloud, type WeightedStrand } from '../utils/tissueCloud';
import { Soma } from './organic/Organic';
import { useFrameBudget } from '../utils/frameBudget';
import { DEVICE_TIER } from '../utils/deviceTier';
import { record as recordFormation } from '../utils/formation';
import { Formation } from './organic/Formation';
import { TissueField } from './organic/TissueField';
import { loadMapGestureLearned, markMapGestureLearned } from '../data/userStore';
import { PARTICLE_TISSUE } from '../utils/tissueMode';
import { EASE_ORGANIC, easeOrganic } from '../utils/ease';

const ID = 'orrery';

/**
 * An arbor that the particle map retires.
 *
 * `.tissue-particles .arbor-ink { display: none }` already guarantees these are
 * never seen in particle mode — but `display: none` only buys the paint. React
 * still built every one of them on mount and still walked them on every
 * re-render of the map, which is every pan, every zoom and every hover.
 *
 * Measured on the default (particle) path before this gate: 20,552 SVG nodes
 * under `.tissue-live`, of which 10,302 — almost exactly half the organism —
 * sat inside a `display: none` subtree and could not be seen by anyone. A cold
 * `getBBox()` over that group cost 281ms.
 *
 * The corona arbor was already written as `PARTICLE_TISSUE ? null : …` for
 * exactly this reason; this is that same decision applied to the other six map
 * arbors, in one place instead of six. The drawing is unchanged by
 * construction: the only arbors this removes are ones the stylesheet was
 * already hiding. Figures keep their own `Dendrites` — only the map root ever
 * carries the mode class. (PF-03)
 */
const MapArbor: React.FC<React.ComponentProps<typeof Dendrites>> = (props) =>
  PARTICLE_TISSUE ? null : <Dendrites {...props} />;

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

/**
 * ...and below this HEIGHT, for the same reason.
 *
 * The threshold was width alone, so a phone held sideways — 844 by 390 — read
 * as a wide screen and got the full map in a frame with no vertical room for
 * it. Measured there: the whole organism squeezed into the middle 313px of an
 * 844px frame, because the viewBox letterboxes to the short axis, with the
 * chapter cells at a third of their intended size. The map was technically
 * present and practically unusable, which is the case LY-01 already rules on —
 * "a legible stacked spine, never a shrunken diagram" — for a shape of frame
 * the rule's number could not see.
 *
 * 460 rather than 700: height is scarcer than width in browser chrome, and a
 * 1024x600 netbook or a half-height desktop window still has room for the
 * organism. This is meant to catch the landscape phone, not the short laptop.
 */
const NARROW_H_PX = 460;

/**
 * The narrowest frame that still gets the map rather than the list.
 *
 * THE PHONE GETS THE MAP NOW, AND THIS IS A CHANGE TO LY-01. The rule says
 * "below 700px, a legible stacked spine", and 700 excluded every phone held
 * upright — so the one surface the whole dossier is organised around was the
 * one thing a phone reader never saw. Asked for directly: the map must be
 * visible there too.
 *
 * The measured finding behind the old threshold is still true and still
 * honoured: an organism letterboxed into a third of its frame is "technically
 * present and practically unusable". What that finding is actually about is
 * the SHORT AXIS — a phone on its side has 390px of height and cannot hold the
 * drawing at any zoom. A phone held upright has 812px of height and can, once
 * the home view stops fitting it to the wrong axis (see `homeFor`).
 *
 * So the list is kept for the two frames that genuinely cannot hold a map — too
 * short in height, or narrower than a phone — and every portrait phone gets the
 * drawing.
 */
const MIN_MAP_PX = 340;

/** Whether this frame is too small in either axis to hold the map. */
const frameIsNarrow = () =>
  typeof window === 'undefined'
    ? false
    : window.innerWidth < MIN_MAP_PX || window.innerHeight < NARROW_H_PX;

/**
 * The resting view, shaped to the frame it is drawn in.
 *
 * `preserveAspectRatio="xMidYMid meet"` fits the viewBox inside the frame by
 * its tighter axis, so a 1300x1092 window in a 375x812 phone renders the whole
 * organism 375 wide and 315 tall — a band across the middle with 248px of empty
 * black above and below it. That is the letterboxing the old threshold was
 * written to avoid, and hiding the map was one way to avoid it; shaping the
 * window is the better one.
 *
 * On a frame TALLER than the organism the home window takes the frame's own
 * aspect and the organism's full height, centred on the core. The drawing then
 * fills the screen instead of banding it, and what falls outside is a pan away
 * — which is what a map is for. A frame wider than the organism keeps exactly
 * the view it always had.
 */
const homeFor = (frameW: number, frameH: number) => {
  const boxW = W + HOME_MARGIN_X * 2;
  const boxH = H + HOME_MARGIN_Y * 2;
  const wide = { x: -HOME_MARGIN_X, y: -HOME_MARGIN_Y, w: boxW, h: boxH };
  if (!frameW || !frameH) return wide;
  const frameA = frameW / frameH;
  if (frameA >= boxW / boxH) return wide;
  /* Never crop past the point where the drawing stops reading as one organism:
     half its width is the floor, which still holds the core and its nearest
     chapters, and the rest is reachable by dragging. */
  const w = Math.max(boxW * 0.5, boxH * frameA);
  return { x: CX - w / 2, y: -HOME_MARGIN_Y, w, h: boxH };
};

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
 *
 * The literal and its JS solver both live in `src/utils/ease.ts` now. MO-02
 * requires every clock in the app to be this one curve, and the solver had been
 * written out twice by the time a second surface needed it — which is two
 * places for the curve to drift, and a curve that drifts is the rule quietly
 * broken. `EASE` keeps its name here because it is spelled into transition
 * strings all over this file.
 */
const EASE = EASE_ORGANIC;
/** hover response time — long enough that nothing ever snaps */
const RESPOND = 0.2;

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
  /* `section.key` is the sheet name the visited memory is filed under */
  section?: { label: string; title: string; page: number; parent: string; key?: string };
  /** figure cells: the world this sub-neuron opens onto */
  figure?: { type: NonNullable<BookPage['diagramType']>; short: string; title: string; parent: string };
}

/* ------------------------------------------------------------- the tissue */

/**
 * THE MAP'S NAMES COME FROM THE DOCUMENT.
 *
 * Every `title` below was hand-typed, and two kinds of drift had already set
 * in. The chapter titles were EDITED: chapter one reads "Media Pollution,
 * Neurological Exploitation & the Economy of Extraction" in the manuscript and
 * the map had shortened it to "Media Pollution & the Economy of Extraction" —
 * a title the author did not write, on the surface a reader meets first. The
 * branch titles were rewritten too: "Branch 3 — Copywriting, headlines, CTAs,
 * landing pages" against the ruleset's "BRANCH 3 — Copywriting & Persuasion
 * Mechanics".
 *
 * Both are now looked up. `chapterTitle` and `branchTitle` read the manuscript
 * and the ruleset, and the literals stay only as the fallback for an id that
 * has stopped existing — which is a bug worth seeing rather than hiding.
 * LY-01 and TY-04 are the same requirement here: content is data, and the data
 * is the author's.
 */
const chapterTitle = (id: string, fallback: string): string => {
  const n = Number(id.replace('chapter-', ''));
  return BOOK_DATA.chapters?.[n]?.title || fallback;
};

const branchTitle = (ruleId: string, fallback: string): string =>
  PROMPT_RULESET_DATA[ruleId]?.title || fallback;

/** the Consolidated Sources chapter's own subtitle */
const SOURCES_SUBTITLE =
  (BOOK_DATA.chapters || []).find((c) => /consolidated sources/i.test(c.title || ''))?.subtitle ||
  'Consolidated Sources';

const CHAPTER_DATA: Array<Chapter & { x: number; y: number; size: number; id: string }> = [
  {
    id: 'chapter-1', numeral: 'I', short: 'Extraction', spine: 'Fragile — the mechanism',
    title: chapterTitle('chapter-1', 'Media Pollution & the Economy of Extraction'), x: 341, y: 346, size: 34,
    branches: [
      { rule: 'branch-3', short: 'Copy', title: branchTitle('branch-3', 'Branch 3 — Copywriting, headlines, CTAs, landing pages') },
      { rule: 'branch-6', short: 'Video', title: branchTitle('branch-6', 'Branch 6 — Video & motion generation') }
    ]
  },
  {
    id: 'chapter-2', numeral: 'II', short: 'Fragility', spine: 'Fragile — the liability',
    title: chapterTitle('chapter-2', 'The Fragile Market'), x: 652, y: 164, size: 36,
    branches: [
      { rule: 'branch-7', short: 'UX copy', title: branchTitle('branch-7', 'Branch 7 — Interface & UX microcopy') },
      { rule: 'branch-4', short: 'CRM', title: branchTitle('branch-4', 'Branch 4 — CRM, lifecycle & retention messaging') }
    ]
  },
  {
    id: 'chapter-3', numeral: 'III', short: 'Robustness', spine: 'Robust — the posture',
    title: chapterTitle('chapter-3', 'The Robust Practitioner'), x: 828, y: 396, size: 38,
    branches: [
      { rule: 'branch-1', short: 'Strategy', title: branchTitle('branch-1', 'Branch 1 — Marketing strategy & positioning') }
    ]
  },
  {
    id: 'chapter-4', numeral: 'IV', short: 'Causality', spine: 'Robust — the method',
    title: chapterTitle('chapter-4', 'The Causal Taxonomy'), x: 622, y: 656, size: 40,
    branches: [
      { rule: 'branch-2', short: 'Content', title: branchTitle('branch-2', 'Branch 2 — Content planning & editorial calendars') }
    ]
  },
  {
    id: 'chapter-5', numeral: 'V', short: 'Antifragile', spine: 'Antifragile — the system',
    title: chapterTitle('chapter-5', 'The Antifragile Aesthetic'), x: 190, y: 602, size: 42,
    branches: [
      { rule: 'branch-5', short: 'Image', title: branchTitle('branch-5', 'Branch 5 — Image generation') },
      { rule: 'branch-8', short: 'Community', title: branchTitle('branch-8', 'Branch 8 — Community, growth & social mechanics') }
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
        parent: c.id,
        /* what this cell is remembered by — see sheetKey */
        key: sheetKey(p) ?? undefined
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
  /*
   * TWO NEIGHBOURS, NOT FOUR.
   *
   * Degree is the even dial this comment already argued for. At four, every
   * node reached past its own neighbourhood into the next one, and since the
   * relation is symmetric each node ended up carrying its own four plus
   * everyone else's — which is what made the mesh read as a scribble with cells
   * caught in it rather than as cells with connections between them. The count
   * is the thing to spend, not the distance: a cap deletes links wherever the
   * layout is sparse and leaves the dense parts untouched, which is the failure
   * recorded above and the reason it was not used.
   *
   * At two the mesh is still complete — the component walk below guarantees it,
   * and nothing here can leave an island — and the tissue between the cells is
   * legible as a path rather than as a field. What was lost was never a
   * relationship; the proximity edges never meant anything more specific than
   * "these are near each other", which is exactly as much as two of them say.
   */
  NODES.forEach(n => {
    const near = NODES
      .filter(m => m.id !== n.id)
      .map(m => ({ m, d: Math.hypot(m.x - n.x, m.y - n.y) }))
      .sort((p, q) => p.d - q.d)
      .slice(0, n.kind === 'minor' ? 2 : 2);
    near.forEach(({ m }) => add(n.id, m.id, false));
  });

  /*
   * The long cross-chapter links are GONE, and OG-05 is why.
   *
   * They joined section i to section i+5 for every third section — an arbitrary
   * pairing, drawn as a long diagonal across the whole organism, asserting that
   * two paragraphs in different chapters refer to each other. Nothing in the
   * data says they do. "The map's connections mean something, so a loop closed
   * between chapter cells asserts a relationship that does not exist, and the
   * drawing would be lying to make itself denser." That is this, exactly: the
   * densest and least explicable strands on the map were the ones with no
   * source at all, and they are most of what reads as random.
   *
   * The document's real cross-references are in `relations.ts` and are drawn
   * where they are true — the index, the figure passages, the source lists. If
   * the map is ever to draw them, it draws THOSE.
   */

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
/*
 * …AND IT REACHES A THIRD OF THE MAP, NOT TWO THIRDS.
 *
 * Halving the count was the first pass and it was not enough, because length
 * was doing most of the damage: a 520-unit trunk leaving a chapter at (341,346)
 * on a 1000×840 layout crosses the whole organism and runs off the frame, and a
 * fibre with no second soma to land on has nothing to justify that journey —
 * every cell it passes is a cell it is not connected to. The eye reads a long
 * unexplained sweep as a path, tries to follow it somewhere, and arrives at a
 * growth cone in empty space.
 *
 * At 215 and 160 a root still leaves its chapter, still forks, still terminates
 * in a cone rather than fading (OG-06), and still reads as the ruleset growing
 * out of the chapter that carries it — but it stays in its own quarter of the
 * drawing. The mesh between the cells is then the only thing crossing open
 * space, which is correct, because the mesh is the only thing that means a
 * connection.
 */
function branchSystem(n: Node, ang: number, seed: number): Array<Array<[number, number]>> {
  const trunk = branchPts(n, ang, seed, 215);
  const forkA = branchPts(n, ang + 0.3 + rnd(seed + 11) * 0.18, seed + 31, 160, 105);
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
    /*
     * THROUGH `branchSystem`, BECAUSE THAT IS WHAT IS ACTUALLY DRAWN.
     *
     * This built three roots of its own, at 620 / 540 / 470, while the renderer
     * had already been cut to the trunk-and-one-fork `branchSystem` describes
     * at 520 / 400. So the map carried two different sets of ruleset roots:
     * sixteen that were drawn, and twenty-four that the junction finder and the
     * formation believed in. The consequences were all of the visible kind — a
     * third of the relay cells on the map were fusing crossings between fibres
     * that do not exist, sitting in open space with nothing passing through
     * them, and the other two thirds were placed against courses 100 units off
     * the ones on screen. That is most of what reads as noise out there.
     *
     * One source, the same trade made everywhere else today: whatever is drawn
     * is what everything else reasons about.
     */
    return branchSystem(node, ang, seed).map(pts => ({ pts, owner: c.id }));
  });
});

/**
 * The stations that point at a cell nobody has opened yet.
 *
 * Precomputed per edge, because they are fixed geometry: the same points on the
 * same fibre every frame, with only their brightness sequenced (see `.beckon`
 * in index.css for why that is the only permitted way to send light along a
 * strand). What changes at render time is whether they are drawn at all.
 *
 * Along the OUTER half of the fibre only. A run starting at the presynaptic
 * cell would read as the whole connection firing, which is what the tide
 * already does for every edge; starting halfway makes it an approach to the far
 * end — the thing being pointed at — rather than a property of the link.
 */
const BECKON_STATIONS = 6;
const BECKON: Array<Array<[number, number]>> = EDGE_PTS.map(pts => {
  const out: Array<[number, number]> = [];
  for (let k = 0; k < BECKON_STATIONS; k++) {
    /* 0.5 → 0.94 of the way along, so the last station sits just short of the
       soma rather than inside the arbor around it */
    const t = 0.5 + (k / (BECKON_STATIONS - 1)) * 0.44;
    const idx = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    out.push(pts[idx]);
  }
  return out;
});

/**
 * Has the organism already assembled itself for this reader, this session?
 *
 * Module state, not component state, and not storage. The map unmounts every
 * time a chapter is opened and mounts again on the way back, so component
 * state would replay the formation on every return — a drawing that performs
 * its own arrival each time you look at it is asking to be watched, which is
 * the behaviour this dossier is about. Not storage either: a session is the
 * right unit, and a reader who comes back tomorrow may watch it again.
 */
let FORMED = false;

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

/* ------------------------------------------------------------ the arbors */

/**
 * Every arbor on the map, declared once.
 *
 * These were seven `<Dendrites …>` call sites with their numbers written into
 * the JSX, which was fine while the JSX was the only thing that wanted them.
 * The bake wants them too — a particle standing in for an arbor has to be grown
 * from the SAME arms, depth, seed and reach, or the field is a different
 * organism wearing the map's coordinates. Two copies of a seed is the exact
 * failure stage one removed inside `FigurePrimitives`, and it would be a
 * pointless thing to reintroduce one level up.
 *
 * So the geometry lives here and both readers take it from the same row. What
 * stays in the JSX is the part that is not geometry: `opacity` moves with
 * hover, excitation and whether a cell is the one being read, and that is a
 * render-time property of a mark, not a fact about where tissue runs.
 */
const CHAPTER_NODES: Node[] = NODES.filter(n => n.kind === 'chapter');

/** keyed by node, so a call site asks for its own arbor rather than an index */
const ARBOR: Record<string, ArborSpec> = Object.fromEntries([
  ['corona', { cx: CX, cy: CY, r: CORONA_R, arms: 34, depth: 5, seed: 17, width: 0.62 }],
  ['core', { cx: CX, cy: CY, r: 128, arms: 15, depth: 4, seed: 6, width: 0.85, spines: true }],
  ...CHAPTER_NODES.map((n, i) => [`ch:${n.id}`,
    { cx: n.x, cy: n.y, r: n.size * 3.0, arms: 8, depth: 3, seed: i * 29 + 13, width: 0.66, spines: true }]),
  ...SATELLITES.map((s, i) => [`sat:${s.id}`,
    { cx: s.x, cy: s.y, r: s.size * 3.9, arms: 5, depth: 3, seed: i * 19 + 7, width: 0.5 }]),
  ...FIGURE_NODES.map((f, i) => [`fig:${f.id}`,
    { cx: f.x, cy: f.y, r: f.size * 3.6, arms: 6, depth: 3, seed: i * 23 + 11, width: 0.54 }]),
  ...MINOR_NODES.map((m, i) => [`min:${m.id}`,
    { cx: m.x, cy: m.y, r: m.size * 3.4, arms: 5, depth: 3, seed: i * 13 + 5, width: 0.45 }]),
  ['refs', { cx: REFS.x, cy: REFS.y, r: 42, arms: 5, depth: 3, seed: 91, width: 0.52 }]
] as Array<[string, ArborSpec]>);

/**
 * The whole organism as courses, for the bake.
 *
 * Three kinds, and every one of them is geometry that already existed: the
 * edges between cells (`EDGE_PTS`, the connections), the branch strands hanging
 * off each chapter, and the arbors above. Widths are the widths the SVG draws
 * them at, because that is what carries the generation into the cloud — see
 * `bakeTissue`, where weight becomes spacing.
 *
 * Built lazily. It is a walk over every strand on the map and it is only wanted
 * by a reader who has turned the particle field on; doing it at module scope
 * would put it on the critical path of every load for a feature almost nobody
 * has asked for yet.
 */
let TISSUE_CLOUD: TissueCloud | null = null;
export function mapTissueCloud(): TissueCloud {
  if (TISSUE_CLOUD) return TISSUE_CLOUD;

  const strands: WeightedStrand[] = [];

  /* The connections. Weight is the resting weight the renderer uses — a spine
     edge at 1.6 and an ordinary one at 1.05, before the excitation term that
     only exists while something is being touched. A cloud is the organism at
     rest; the response belongs to whatever draws it. */
  EDGE_PTS.forEach((pts, i) => {
    strands.push({
      pts,
      width: EDGES[i].spine ? 1.6 : 1.05,
      opacity: EDGES[i].spine ? 0.95 : 0.8,
      /* A connection is a path something travels, not a cord strung between two
         cells: nearly dark at rest, full as a pulse crosses. See `conduct`. */
      conduct: 0.9
    });
  });

  /* the branches each chapter puts out */
  BRANCH_STRANDS.forEach(b => {
    /* A root is half a connection and half tissue — it leaves a cell and goes
       nowhere in particular, so it conducts, but it stays legible between
       pulses because it is also the chapter's own reach. */
    strands.push({ pts: b.pts, width: 0.42, opacity: 0.5, conduct: 0.6 });
  });

  /*
   * THE DEEP WEB — the third plane, and the only thing in it that spans islands.
   *
   * Asked for: connective tissue forming between all the islands, on the
   * furthest plane. It is drawn as the reticulation OG-05 describes and nothing
   * else, because that rule draws a hard line this has to stay behind.
   *
   * WHAT OG-05 FORBIDS, AND WHY THIS IS NOT IT. "Reticulation is confined to
   * filler tissue... It must never be applied to a semantic edge. The map's
   * connections mean something, so a loop closed between chapter cells asserts
   * a relationship that does not exist, and the drawing would be lying to make
   * itself denser." So this may not be, and may not read as, a connection.
   *
   * Four things keep it on the right side of that:
   *
   *  - it is in the FAR plane (width 0.2 puts it at 0.2 focus), a fifth of the
   *    brightness of the tissue in front of it, where the drawing is already
   *    saying "this is texture, not anatomy";
   *  - it conducts like tissue, not like a path (0.14), so no shot of light
   *    ever runs along it — the thing that reads as "a connection" in this map
   *    is now conduction, and the deep web never does it;
   *  - it carries no terminal, no junction and no polarity, which is how OG-01
   *    and OG-03 say a real connection is drawn;
   *  - it is not in `EDGES`, so nothing derived from the graph — reachability,
   *    orientation, the audits — can see it. It cannot become a claim about the
   *    topology because nothing reads it as one.
   *
   * What it is FOR is depth: the islands sat in unrelated pools of black, and a
   * far plane that spans them is what makes them read as one organism seen at
   * distance rather than as six drawings on one sheet.
   */
  const ISLANDS = [...CHAPTER_DATA.map(c => ({ x: c.x, y: c.y })), { x: CX, y: CY }];
  ISLANDS.forEach((a, i) => {
    ISLANDS.forEach((b, j) => {
      if (j <= i) return;
      const far = Math.hypot(a.x - b.x, a.y - b.y);
      /* every pair, but the longest spans are drawn thinner still — a web that
         crossed the whole sheet at one weight would read as a frame */
      const w = far > 520 ? 0.14 : 0.2;
      strands.push({
        pts: wander(a.x, a.y, b.x, b.y, 900 + i * 31 + j * 7, 26),
        width: w,
        opacity: 0.34,
        conduct: 0.14
      });
    });
  });

  /* Every arbor, through the one generator stage one extracted — except the
     corona, which is the zoom-out cell. It reaches 1180 units against a
     1000×840 layout and the drawn map only shows it once the camera has pulled
     back far enough for the whole organism to read as one soma; baked in
     unconditionally it put 34 arms of dotted ray straight across the home
     framing and out of the frame, which is the drawing saying something at a
     scale nobody is looking at. It belongs in a cloud of its own, keyed to the
     same pull-back the SVG uses, if the particle map is ever kept. */
  for (const [key, spec] of Object.entries(ARBOR)) {
    if (key === 'corona') continue;
    for (const s of dendriteStrands(spec)) strands.push(s);
  }

  TISSUE_CLOUD = bakeTissue(strands, CX, CY);
  return TISSUE_CLOUD;
}

/**
 * The corona, as its own cloud.
 *
 * It is kept apart from the organism's because it is only ever on screen pulled
 * back, and because of what it costs: baked at the map's spacing it was 39,000
 * points — three and a half times the rest of the drawing put together — for an
 * arbor nobody sees until the camera has left the tissue behind. Folded into
 * the main cloud it also painted 34 arms of dotted ray across the home framing,
 * which is the drawing speaking at a scale nobody is looking at.
 *
 * Sampled far more loosely than the organism (spacing 15 against 5.2), which is
 * not a compromise: this is one cell drawn at a hundred times soma scale, so the
 * same APPARENT density needs far fewer marks per unit — the argument
 * `formation.ts` already makes for sampling a figure and the map differently.
 *
 * It exists at all because the alternative was worse. Left out of the particle
 * map it simply vanished at zoom-out, since the drawn one is hidden with every
 * other arbor; drawn in SVG while the organism is points, it is a stroked cell
 * around a particle one, which is two drawings in one frame.
 */
let CORONA_CLOUD: TissueCloud | null = null;
export function coronaTissueCloud(): TissueCloud {
  if (CORONA_CLOUD) return CORONA_CLOUD;
  CORONA_CLOUD = bakeTissue(dendriteStrands(ARBOR.corona), CX, CY, { spacing: 15 });
  return CORONA_CLOUD;
}

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
        {/* Points or strokes, but never one inside the other — see
            `coronaTissueCloud`. The canvas carries the pull-back ramp through
            `formed`, which is only an alpha multiplier, because the group's own
            opacity above cannot reach a sibling canvas. */}
        {PARTICLE_TISSUE
          ? null
          : <Dendrites id={ID} {...ARBOR.corona} opacity={0.95} />}
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
  visitedPages?: string[];
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
  /**
   * A surface stands in front of the map — the entry gate, while it is up.
   *
   * The formation must not play behind something. The map is mounted under the
   * gate from the first frame (it is the front door, and it is building while
   * the reader reads the way in), so an assembly started on mount would be over
   * before anybody saw it. It waits here instead and begins when the map is
   * actually the thing on screen.
   */
  held?: boolean;
}

export const Orrery: React.FC<OrreryProps> = ({
  isDark, lastPage, onEnter, onOpenFigure, visitedChapters, visitedPages, returning, onOpenIndex, soundEnabled, onToggleSound, focusNodeId, held
}) => {
  const [hover, setHover] = useState<string | null>(null);
  /* chapters already opened — see the nucleolus on each chapter soma */
  const visited = useMemo(() => new Set(visitedChapters ?? []), [visitedChapters]);
  const seen = useMemo(() => new Set(visitedPages ?? []), [visitedPages]);
  /*
   * WHAT A MANUSCRIPT EDIT COSTS.
   *
   * A sheet is remembered under its section's number and the paragraph it
   * starts at, which is stable under every edit except one to that section —
   * and that edit moves the paragraph offsets, so the stored names stop
   * matching any sheet that now exists and the reader silently loses the record
   * of having been there.
   *
   * The names that no longer match are the evidence. A section holding one is a
   * section this reader has been inside under a pagination that no longer
   * exists, so its sheets are lit. The edit costs the precision of which PART
   * was read, which is genuinely lost, rather than the fact of having read it,
   * which is not.
   */
  const seenSectionsStale = useMemo(() => {
    const live = new Set<string>();
    for (const p of BOOK_PAGES) { const k = sheetKey(p); if (k) live.add(k); }
    const stale = new Set<string>();
    for (const k of visitedPages ?? []) {
      if (!live.has(k)) stale.add(k.split('#')[0]);
    }
    return stale;
  }, [visitedPages]);
  const [narrow, setNarrow] = useState<boolean>(frameIsNarrow);
  /* The frame itself, because the resting view is shaped to it — see homeFor.
     Kept beside `narrow` and updated by the same listener, so one resize does
     one re-render rather than two. */
  const [frame, setFrame] = useState(() =>
    typeof window === "undefined"
      ? { w: 0, h: 0 }
      : { w: window.innerWidth, h: window.innerHeight });

  /*
   * The gesture hint, and the moment it stops being needed.
   *
   * Shown until this reader has moved the map once, then gone for good. It
   * leaves on the first pan or pinch that actually CHANGES the view — not on a
   * tap, not on a hover, not merely on a pointer landing — because the hint has
   * done its work exactly when the gesture has worked, and a hint that outlives
   * its lesson is decoration that moves.
   *
   * `leaving` runs the fade rather than unmounting on the spot: a mark that
   * vanishes on the same frame as the reader's first successful gesture reads
   * as something breaking, not as something completed.
   */
  const [gestureHint, setGestureHint] = useState<boolean>(() => !loadMapGestureLearned());
  const [gestureLeaving, setGestureLeaving] = useState(false);
  const gestureTimer = useRef(0);

  useEffect(() => () => clearTimeout(gestureTimer.current), []);

  const learnGesture = React.useCallback(() => {
    if (!markMapGestureLearned()) { setGestureHint(false); return; }
    setGestureLeaving(true);
    gestureTimer.current = window.setTimeout(() => setGestureHint(false), 900);
  }, []);
  // If the device cannot hold the frame budget, the organism sheds its most
  // expensive layers rather than stuttering. Stutter is arousal, not calm.
  const strained = useFrameBudget();

  /* ------------------------------------------------------------ formation */
  /*
   * The organism assembles out of dots of light, once.
   *
   * ONCE PER SESSION, AND THAT IS THE WHOLE OF IT. `FORMED` is module state
   * rather than component state deliberately: the map unmounts every time the
   * reader opens a chapter and mounts again when they come back, and an
   * assembly that replayed on every return would be a thing that demands to be
   * watched again each time you arrive — which is the mechanism this dossier
   * exists to argue against. It happens on the way in and then the map simply
   * is what it is.
   *
   * WHO DOES NOT GET IT. A reader who has asked for less motion, and a device
   * that was already judged unable to carry the drawing at full complexity —
   * the same two gates `deviceTier` exists to answer, decided before the first
   * frame rather than after 1.6s of measurement, because by then the assembly
   * would be half over. Both land on a finished map, immediately; nothing about
   * the organism depends on having watched it arrive.
   */
  const willForm = useMemo(() => {
    if (FORMED) return false;
    if (typeof window === 'undefined') return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    if (DEVICE_TIER === 'low') return false;
    return true;
  }, []);

  /** held back until the gate in front of the map is gone */
  const [forming, setForming] = useState(false);
  /** 0 while the organism is still arriving, 1 once it is here */
  const [formed, setFormed] = useState(willForm ? 0 : 1);
  /* The same number, live. See `formedLive` on TissueField for why the point
     cloud cannot be driven by the state above. */
  const formedLive = useRef(willForm ? 0 : 1);

  /*
   * THE RAMP IS WRITTEN TO THE NODE, NOT THROUGH REACT — and this was measured
   * the hard way.
   *
   * The first build handed the landed fraction to `setState` on every frame.
   * That is a re-render of the entire map — 2,500 lines of JSX over ~8,000
   * elements — sixty times a second, to change one number on one group. The
   * canvas went from a field of thousands of dots to a measured 296 lit pixels
   * on a 1280×960 buffer, because the render loop was being starved by React
   * reconciling the organism underneath it: exactly the per-element cost PF-03
   * is about, arrived at from the other direction.
   *
   * So the formation writes `style.opacity` straight onto the group it already
   * has a ref to, which is what the camera does with the viewBox for the same
   * reason. React is told once, at the end. The inline style is cleared there
   * too, so the attribute React renders governs again and nothing is left
   * holding the drawing at a value the component does not know about.
   */
  const rampTissue = (landed: number) => {
    const g = tissueRef.current;
    if (!g) return;
    const v = viewRef.current;
    const back = Math.max(0, Math.min(1, (v.w - HOME.w) / (MAX_W - HOME.w)));
    const rest = 1 - Math.min(1, Math.max(0, (back - 0.2) / 0.5)) * 0.82;
    /*
     * The drawing reaches full strength BEFORE the last particle lands.
     *
     * Ramping straight to 1 at `landed === 1` means the tissue is still
     * arriving while the field is already dissolving, and the two thin each
     * other out — the seam the reader sees at the end. Saturating at
     * TAIL_FROM's neighbourhood instead puts the organism fully on the sheet
     * while the remaining dots fade over it, so the layers overlap and the
     * handover has no moment you can point at. The exponent keeps the tissue
     * held back early, which is what makes the light the thing you follow.
     */
    const lead = Math.min(1, landed / 0.86);
    const target = landed >= 1 ? 1 : Math.pow(lead, 1.35);

    /*
     * ONE LOW-PASS, SO THE ARRIVAL CANNOT STEP.
     *
     * The ramp follows the landed FRACTION, and that fraction is not smooth:
     * growth is ordered by distance from each cell, so almost nothing lands
     * while the first processes are still short and then a great many land at
     * once as every arbor reaches its middle. Measured, the cloud climbed from
     * 8.7k lit pixels to 46k inside one second — correct arithmetic, and a
     * visible surge.
     *
     * Easing the input cannot fix that, because the lumpiness is in the input.
     * So the ramp chases its target instead of being set to it: one lerp per
     * frame, a time constant of about four tenths of a second, which is slower
     * than any surge the landings can produce and far faster than the assembly
     * itself. It also guarantees monotonic travel — the drawing can never dip
     * back — and it costs one multiply.
     */
    const prev = formedLive.current;
    const up = landed >= 1 ? 1 : prev + (target - prev) * 0.12;
    formedLive.current = up;
    g.style.opacity = String(rest * up);
  };

  const endFormation = () => {
    const g = tissueRef.current;
    formedLive.current = 1;
    if (g) g.style.opacity = '';
    setFormed(1);
    setForming(false);
  };

  useEffect(() => {
    if (!willForm || held || FORMED) return;
    /* Latch immediately, not on completion: a reader who opens a chapter
       mid-assembly and comes straight back must not be handed the formation a
       second time. */
    FORMED = true;
    setForming(true);
  }, [willForm, held]);

  /*
   * The recording — written while the gate is still up, not on the way through
   * it.
   *
   * Two things this is not. It is not module scope: that would walk every
   * strand on the map for every visitor including the ones gated out above, on
   * a lazy chunk sitting on the critical path, to build a table most of them
   * never see. And it is not done at the moment of entry, which is where it was
   * first put and where it measured as a 483ms p95 frame — the one frame in the
   * whole sequence that must not hitch, because it is the frame the reader
   * pressed a button to get.
   *
   * So it is written as soon as it is known the formation will play, which is
   * mount, and spent into the time the reader is looking at the way in. The
   * gate holds no animation that has to finish (IntroScreen says so), so there
   * is nothing here to stutter.
   */
  const formation = useMemo(
    () =>
      willForm
        ? recordFormation(ALL_STRANDS, CX, CY, {
            /* every cell the tissue grows out of — see GROWTH in formation.ts */
            origins: NODES.map(n => [n.x, n.y] as const)
          })
        : null,
    [willForm]
  );

  useEffect(() => {
    /*
     * Re-read once on mount as well as on resize.
     *
     * The initial state is computed during the first render, and there are
     * frames where that render happens before the window has its real size — a
     * tab restored in the background, an embedded frame sized after mount, a
     * pane that lays out late. The value latches, and the only thing that ever
     * corrected it was a resize event that may never arrive: observed here at
     * 1440x900, where a mount at zero width left the map showing the stacked
     * spine on a full desktop until the window was nudged.
     *
     * An orientation change on a phone is the same event by another name, and
     * a resize does not always fire for it on iOS, so the orientation media
     * query is listened to alongside.
     */
    const sync = () => {
      setNarrow(frameIsNarrow());
      setFrame({ w: window.innerWidth, h: window.innerHeight });
    };
    sync();
    window.addEventListener('resize', sync);
    const portrait = typeof matchMedia === 'function'
      ? matchMedia('(orientation: portrait)')
      : null;
    portrait?.addEventListener?.('change', sync);
    return () => {
      window.removeEventListener('resize', sync);
      portrait?.removeEventListener?.('change', sync);
    };
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
  const HOME = homeFor(frame.w, frame.h);
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

  /*
   * THE VIEW MOVES AT A SPEED, NOT AT A FRACTION PER FRAME.
   *
   * This eased toward its target by 34% of the remaining distance every frame,
   * which is a rate expressed in frames and therefore a different speed on
   * every machine. At 60fps a reset lands in about a third of a second. On this
   * drawing, measured at roughly 11fps, the same glide took a little over five
   * seconds to settle — and a control that does nothing visible for a beat and
   * then drifts for five seconds is a control that is reported as broken. It
   * was: "the reset view button doesn't work". It worked. It was arriving.
   *
   * The constant is now what it always meant — 34% per 60th of a second — and
   * the elapsed time between real frames converts it. A slow renderer now
   * covers the same ground per second as a fast one, in fewer, larger steps.
   *
   * dt is clamped because a frame that arrives after a long stall (a hidden
   * tab, a garbage collection) would otherwise resolve almost the entire
   * remaining distance in one jump, which is a teleport rather than a glide.
   */
  const K_PER_FRAME_AT_60 = 0.34;
  const lastStepRef = useRef<number | null>(null);

  const step = (now: number) => {
    const prev = lastStepRef.current;
    lastStepRef.current = now;
    const dt = prev === null ? 1000 / 60 : Math.min(100, now - prev);
    const v = viewRef.current;
    const t = targetRef.current;
    const k = 1 - Math.pow(1 - K_PER_FRAME_AT_60, dt / (1000 / 60));
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
      lastStepRef.current = null;
      /* One render at the end of the move, so anything reading the view from
         render state — the reset control's own indicator — is not left showing
         where the camera was before it travelled. Once per glide, never per
         frame: the whole reason the move is driven imperatively. */
      redraw();
    } else {
      rafRef.current = requestAnimationFrame(step);
    }
  };
  const glide = () => {
    if (rafRef.current !== null) return;
    lastStepRef.current = null;
    glidingRef.current = true;
    tissueRef.current?.removeAttribute('filter');
    rafRef.current = requestAnimationFrame(step);
  };
  /*
   * CANCELLING THE FRAME IS HALF THE CLEANUP. THE OTHER HALF IS SAYING SO.
   *
   * This cancelled the pending frame and left `rafRef.current` holding its id.
   * `glide()` reads exactly that ref to decide whether a glide is already
   * running — `if (rafRef.current !== null) return` — so a handle left behind by
   * a cancelled frame is indistinguishable from a glide in flight, and every
   * later glide returns immediately. The camera then never moves again: pan,
   * pinch, wheel, double-tap, the dive into a chapter and the reset control all
   * go through this one function, and all of them go dead together.
   *
   * It is reached whenever the map unmounts with the camera moving, and in
   * development that is every load — StrictMode mounts, cleans up and mounts
   * again on the SAME instance, so the ref survives while the frame does not.
   * Measured on a phone frame: `onWheel` called directly on the live component,
   * zero mutations of `viewBox` in 1.5s, and the map inert to pinch, drag and
   * wheel from first paint.
   *
   * The step state goes back with it, so the remount starts a glide from a
   * clean slate rather than from a `lastStep` timestamp taken before it.
   */
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastStepRef.current = null;
    glidingRef.current = false;
  }, []);

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
    /* a pinch, a wheel or a double-tap — every route that changes the scale */
    learnGesture();
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

  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    /*
     * CAPTURE BELONGS TO A DRAG, NOT TO A PRESS — AND TAKING IT HERE ATE EVERY
     * CLICK ON THE MAP.
     *
     * This captured the pointer on the <svg> the moment a press began. Pointer
     * capture retargets everything that follows to the capturing element, so
     * the sequence for a plain click on a cell was:
     *
     *     pointerdown -> circle   (the soma disc, correctly)
     *     pointerup   -> svg      (retargeted by capture)
     *     click       -> svg      (the common ancestor of the two)
     *
     * and the node handler, which lives on the group under that disc, was never
     * on the path. Touching a cell lit it — hover is dispatched before any of
     * this — and then did nothing, which is the worst shape a bug can take: the
     * map answered the reader and refused them in the same gesture.
     *
     * Capture is here for touch isolation while the map is being DRAGGED, and a
     * drag announces itself:  goes true past four pixels. So it is taken
     * there instead (see onPointerMove), and a press that never becomes a drag
     * never takes it — leaving the click to hit-test normally and reach the cell
     * the reader aimed at. The pinch path takes capture immediately, because two
     * pointers down is already a gesture and never a click.
     */
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      const t = targetRef.current;
      dragRef.current = { x: e.clientX, y: e.clientY, vx: t.x, vy: t.y, moved: false };
      pinchRef.current = null;
    } else if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      pinchRef.current = { dist, center };
      if (dragRef.current) { dragRef.current.moved = true; learnGesture(); }
      /* Two pointers down is already a gesture and never a click, so capture is
         safe to take at once here. It is the single-press path that must not
         take it — see the note at the top of this handler. */
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
    }
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

  /**
   * THE LIGHT IS IN THE TISSUE, NEVER ON THE POINTER.
   *
   * Asked for: a lit cursor that emits light, is pulled toward whatever can be
   * clicked, and drags a tail behind it. That is the exact shape of the thing
   * the rule above refuses — a field carried with the cursor moves whenever the
   * reader moves and can therefore never fall out of attention, which is hard
   * fascination and is what this dossier argues against. So the pull is real
   * and the dot is not: nothing is drawn on the pointer at any time.
   *
   * What answers instead is the drawing. The tissue already blooms from the
   * cell a reader reaches and propagates outward by TOPOLOGY rather than by
   * distance on screen, each hop taking its own delay — that is `excitation`
   * and `rippleStyle` below. All that was missing is the reach: excitation
   * only fired once the pointer was inside a cell's own hit area, so the map
   * stayed dark until the moment of arrival and the approach said nothing.
   *
   * Now the nearest cell within `MAGNET_REACH` of the pointer is the one
   * reached. Light gathers in the mesh toward the cell being approached before
   * it is under the pointer, which is the magnetism that was wanted, spoken by
   * the organism instead of by an overlay. The tail comes free and is already
   * in the rules: excitation lingers after the cursor leaves (`warm`, below),
   * so crossing the map leaves a wake that decays behind the reader rather than
   * a shape that follows them. It can be left behind, which is the whole
   * difference the rule is drawing.
   *
   * Mouse only. A finger has no approach — it arrives — and coarse pointers
   * already have their own answer.
   */
  const MAGNET_REACH = 90;
  const magnetRaf = useRef(0);

  const magnetise = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'mouse') return;
    // a drag owns the pointer; the map is being moved, not read
    if (activePointersRef.current.size > 0) return;
    const svg = e.currentTarget;
    const { clientX, clientY } = e;
    cancelAnimationFrame(magnetRaf.current);
    magnetRaf.current = requestAnimationFrame(() => {
      const l = toLocal(svg, clientX, clientY);
      let best: Node | null = null;
      let bestD = Infinity;
      for (const n of NODES) {
        const d = Math.hypot(n.x - l.x, n.y - l.y);
        if (d < bestD) { bestD = d; best = n; }
      }
      const within = best !== null && bestD <= MAGNET_REACH + best.size;
      setHover(prev => {
        /* A branch chip is not a node, and it sets `hover` to its own rule id.
           Stomping that from here would put the light back on the mesh while
           the reader is reading the chip, so anything that is not a node id
           keeps what it has. */
        const ours = prev === null || NODES.some(n => n.id === prev);
        if (!ours) return prev;
        const next = within && best ? best.id : null;
        return next === prev ? prev : next;
      });
    });
  };

  useEffect(() => () => cancelAnimationFrame(magnetRaf.current), []);

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    magnetise(e);
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch-to-zoom & two-finger pan
    if (activePointersRef.current.size >= 2 && pinchRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };

      if (dist > 10 && pinchRef.current.dist > 10) {
        const factor = pinchRef.current.dist / dist;
        const l = toLocal(e.currentTarget, center.x, center.y);
        zoomAt(l.x, l.y, factor);

        const rect = e.currentTarget.getBoundingClientRect();
        const scale = viewRef.current.w / rect.width;
        const dx = (center.x - pinchRef.current.center.x) * scale;
        const dy = (center.y - pinchRef.current.center.y) * scale;
        targetRef.current = {
          ...targetRef.current,
          x: targetRef.current.x - dx,
          y: targetRef.current.y - dy
        };
        glide();
      }
      pinchRef.current = { dist, center };
      if (dragRef.current) { dragRef.current.moved = true; learnGesture(); }
      return;
    }

    // Single pointer pan
    const d = dragRef.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = viewRef.current.w / rect.width;
    const dx = (e.clientX - d.x) * scale;
    const dy = (e.clientY - d.y) * scale;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) {
      d.moved = true;
      learnGesture();
      /* now it is a drag: take capture, so the gesture stays with the map even
         if the pointer leaves it. See the note in onPointerDown. */
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }
    targetRef.current = { ...targetRef.current, x: d.vx - dx, y: d.vy - dy };
    glide();
  };

  const endDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    if (activePointersRef.current.size === 0) {
      const d = dragRef.current;
      dragRef.current = null;
      // a drag must not also open whatever was under the pointer
      if (d?.moved) {
        suppressRef.current = true;
        window.setTimeout(() => { suppressRef.current = false; }, 60);
      }
    }
  };
  const suppressRef = useRef(false);

  /*
   * Touch-gesture isolation for mobile browsers:
   * Prevents native swipe-back / swipe-forward navigation (iOS Safari edge swipe),
   * pull-to-refresh, and unwanted window-level gesture collisions while on the map.
   */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onTouch = (ev: TouchEvent) => {
      if (ev.cancelable) {
        ev.preventDefault();
      }
    };

    const onGesture = (ev: Event) => {
      if (ev.cancelable) {
        ev.preventDefault();
      }
    };

    svg.addEventListener('touchstart', onTouch, { passive: false });
    svg.addEventListener('touchmove', onTouch, { passive: false });
    svg.addEventListener('gesturestart', onGesture, { passive: false });
    svg.addEventListener('gesturechange', onGesture, { passive: false });

    return () => {
      svg.removeEventListener('touchstart', onTouch);
      svg.removeEventListener('touchmove', onTouch);
      svg.removeEventListener('gesturestart', onGesture);
      svg.removeEventListener('gesturechange', onGesture);
    };
  }, []);

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
      const e = easeOrganic(p);

      const w = v0.w * Math.pow(ratio, e);
      const h = w * aspect;
      const cx = cx0 + (fx - cx0) * e;
      const cy = cy0 + (fy - cy0) * e;
      viewRef.current = { x: cx - w / 2, y: cy - h / 2, w, h };

      washRef.current =
        p < DIVE.washStart ? 0 : easeOrganic((p - DIVE.washStart) / (1 - DIVE.washStart));

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

  /**
   * A RESIZE RE-FRAMES THE MAP, because the resting view is now shaped to the
   * frame and a frame that changed shape has invalidated it.
   *
   * Without this the view is whatever the last frame made it: rotating a phone
   * to landscape, or dragging a window out to full width, kept the tall crop —
   * measured at 1440x900 still holding the phone's `175 -126 650 1092`, so the
   * desktop showed half an organism with black either side and no indication
   * that anything was wrong.
   *
   * It glides rather than snapping, on the app's one curve, because a view that
   * jumps on resize reads as a reload. `frame.w`/`frame.h` only change when the
   * listener fires, so this cannot run on a pan or a zoom.
   */
  useEffect(() => {
    targetRef.current = { ...homeFor(frame.w, frame.h) };
    glide();
    // `glide` is stable for the life of the component; the frame is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.w, frame.h]);

  /*
   * IS THERE ANYTHING TO PUT BACK?
   *
   * This compared the live view against W and 0 — the LAYOUT box — when the
   * resting view is HOME, which is that box plus its margin: 1300 wide at
   * x=-150, not 1000 at x=0. So the test read |1300-1000| > 1 and was true at
   * the home framing and true everywhere else, permanently. The control beside
   * it carries its state in light and nothing else (TY-01), so the soma sat hot
   * forever: the one signal the button had never moved, and a control whose
   * indicator never answers reads as a dead control. The camera was always
   * fine — measured, the viewBox and the point cloud both return exactly to
   * home — which is why this looked like a broken button rather than a broken
   * reset.
   *
   * Compared against HOME now, on all three axes, since a pure pan moves x and
   * y without touching w and is just as much something to undo.
   */
  const v0 = viewRef.current;
  const zoomed =
    Math.abs(v0.w - HOME.w) > 1 ||
    Math.abs(v0.x - HOME.x) > 1 ||
    Math.abs(v0.y - HOME.y) > 1;

  const chapters = NODES.filter(n => n.kind === 'chapter');
  const hoveredNode = NODES.find(n => n.id === hover);

  /* The cell reached, handed to the particle field as a position it can bloom
     around. Mutated in place rather than reallocated: this is read by a canvas
     loop every frame and a fresh object per render would be garbage on the hot
     path for no gain. Null when nothing is reached — the field then eases its
     own light down, which is where the wake comes from. */
  const exciteBox = useRef({ x: 0, y: 0 });
  const exciteRef = useRef<{ x: number; y: number } | null>(null);
  if (hoveredNode) {
    exciteBox.current.x = hoveredNode.x;
    exciteBox.current.y = hoveredNode.y;
    exciteRef.current = exciteBox.current;
  } else {
    exciteRef.current = null;
  }

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
          /* The author's own subtitle for the Consolidated Sources chapter,
             read rather than rewritten. The map had "Consolidated bibliography
             — every source cited in the dossier", which says the same thing in
             nobody's voice. */
          ? { kind: 'Reference', body: SOURCES_SUBTITLE }
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
            <span className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-45">You are here · the manifesto</span>
            <span className="block text-[12px] font-light mt-0.5">Prologue — Media as Universe</span>
          </button>

          <div className="text-[9px] uppercase tracking-[0.2em] opacity-45 pt-3 pb-0.5">
            Fragile → Robust → Antifragile
          </div>

          {chapters.map((n, i) => (
            <div key={n.id} className="border glass-panel">
              <button onClick={() => onEnter(firstPageOfChapter(n.id))}
                className="w-full text-left p-4 glass-hover flex items-baseline gap-3.5">
                <span className="text-[12px] font-light opacity-45 w-7 flex-shrink-0">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-45">
                    Chapter {n.chapter!.numeral} · {n.chapter!.spine}
                  </span>
                  <span className="block text-[12px] font-light leading-snug">{n.chapter!.title}</span>
                </span>
              </button>
              <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-0.5">
                {n.chapter!.branches.map(b => (
                  <button key={b.rule} onClick={() => onEnter(pageForPromptRule(b.rule))}
                    className="px-2.5 py-1 border glass-hover text-[9px] uppercase tracking-[0.2em] opacity-70">
                    {b.short}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button onClick={() => onEnter(firstReferencesPage())}
            className="w-full text-left p-3.5 border glass-panel glass-hover mt-3">
            <span className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-45">Reference</span>
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
    <div
      className={`relative w-full h-full overflow-hidden bg-black text-white touch-none select-none overscroll-none${
        PARTICLE_TISSUE ? ' tissue-particles' : ''
      }`}
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    >
      {/*
        The organism as points, under the SVG.

        Stage three of the particle map, behind `?tissue=particles`. Under, not
        over: the somas and the beacons are light sources and they have to burn
        in front of the tissue, exactly as they do when the tissue is drawn. The
        canvas takes no input, so the SVG above still answers every touch and
        the map responds as it always did — this changes how the tissue is
        drawn, not what the map is.

        It is mounted only in particle mode, because the cloud is a 52k-point
        bake and a reader on the drawn map should not pay for one.
      */}
      {PARTICLE_TISSUE && (
        <TissueField
          cloud={mapTissueCloud()}
          view={viewRef.current}
          formed={formed}
          formedLive={formedLive}
          strained={strained}
          excite={exciteRef}
        />
      )}

      {/* The corona, on the same gate the drawn one uses and carrying the same
          ramp. `formed` multiplies alpha, so the pull-back fade rides it. */}
      {PARTICLE_TISSUE && pulledBack > 0.2 && !strained && (
        <TissueField
          cloud={coronaTissueCloud()}
          view={viewRef.current}
          formed={Math.min(1, (pulledBack - 0.2) / 0.45) * BACKDROP.corona * formed}
          strained={strained}
        />
      )}
      <svg
        ref={svgRef}
        viewBox={`${viewRef.current.x.toFixed(1)} ${viewRef.current.y.toFixed(1)} ${viewRef.current.w.toFixed(1)} ${viewRef.current.h.toFixed(1)}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full font-sans touch-none select-none tissue-cursor"
        style={{
          touchAction: 'none',
          overscrollBehavior: 'none',
          // once the descent starts nothing may steer it: a pan mid-dive would
          // tear the camera off the cell it is falling into
          pointerEvents: divingRef.current ? 'none' : undefined
        }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
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
          /* `formed` is 0 only until the first frame of the assembly, which
             then drives the ramp imperatively through `rampTissue` — see there
             for why this number does not come through React. */
          opacity={(1 - Math.min(1, Math.max(0, (pulledBack - 0.2) / 0.5)) * 0.82) * formed}
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
            /*
             * Does this fibre point at something still unopened?
             *
             * Chapters, and only chapters. Every satellite section would be ~60
             * more lit runs on a map already carrying ~7,000 elements against a
             * 20fps budget (PF-01), and it would say "everything here is
             * unread" — which is true on a first visit and therefore says
             * nothing. Five doors, going dark one at a time as they are used,
             * is a reading of where you have not been. Sixty is wallpaper.
             *
             * It is NOT gated on the frame budget. Everything else that drops
             * under strain is a luxury — the flex filter, the sway, the tide
             * running along each fibre rather than across the whole strand.
             * This is the only thing on the map that says where you have not
             * been, and a weak device is exactly where the rest of the motion
             * has already gone quiet, so it is both the cheapest thing left and
             * the one most worth keeping. Measured below as a handful of
             * circles carrying one opacity keyframe each, which is the channel
             * PF-03 says organism-wide motion belongs in.
             */
            const post = ORIENT[i].post;
            const beckons = nodeById(post).kind === 'chapter' && !visited.has(post);
            return (
              <g key={`e${i}`}
                className={strained ? 'strand-breathe' : undefined}
                style={strained
                  ? { ...rippleStyle(e.a), animationDelay: tidePhase(mid[0], mid[1], i + 3) }
                  : rippleStyle(e.a)}>
                {/* `fibre-ink` is the drawn tissue, and the particle map
                    retires exactly this and the arbors — never the somas, the
                    relay cells or the hit targets, which are light sources and
                    controls rather than tissue.

                    Gated, not just hidden: the stylesheet's `display: none`
                    saved the paint but not the build, and `tissue()` is a
                    geometry generator — skipping the branch skips the marks AND
                    the work that made them. See `MapArbor`. */}
                {!PARTICLE_TISSUE && (
                  <g className="fibre-ink">
                    {tissue(EDGE_PTS[i], weight, op, e.seed, `e${i}`, true,
                      strained ? undefined : (x, y) => tidePhase(x, y, i + 3))}
                  </g>
                )}
                {beckons && (
                  /* DG-02 admits a point by name — "a bouton, a seed tip, a
                     nucleolus is a bright dot" — and these are boutons. The
                     delay counts UP along the run so the spike leaps toward the
                     cell, and the whole run is offset by the edge's own index so
                     no two fibres fire together (LC-04). */
                  <g className="beckon">
                    {BECKON[i].map(([bx, by], k) => (
                      <circle
                        key={k}
                        cx={bx.toFixed(1)}
                        cy={by.toFixed(1)}
                        r={0.9 + k * 0.12}
                        fill="currentColor"
                        style={{ animationDelay: `${(-((i * 0.41) % 3.7) + k * 0.13).toFixed(2)}s` }}
                      />
                    ))}
                  </g>
                )}
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
                style={{ cursor: 'pointer', pointerEvents: 'none' }}>
                {/* A ruleset branch has no soma to aim at — it is a root running
                    through open space, so the strand itself is the affordance and
                    this is the one node kind whose target is its reach. Pointer
                    events come back on here for exactly that reason. */}
                <path d={smoothPolyline(system[0])} fill="none" stroke="transparent" strokeWidth={20}
                  style={{ pointerEvents: 'auto' }} />
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
                    {/* retired by the particle map — see `MapArbor` */}
                    {!PARTICLE_TISSUE && (
                      <g className="fibre-ink">
                        {tissue(pts,
                          (active ? 1.7 : 1.2) * (si === 0 ? 1 : 0.66),
                          op,
                          seed + si * 13, `b${i}${k}${si}`, false,
                          strained ? undefined : (x, y) => tidePhase(x, y, seed + si))}
                      </g>
                    )}
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
          /* MEMORY, NOT PROGRESS — the same device the chapter beacons carry,
             at the scale of a single sheet.

             A cell the reader has been inside keeps its centre lit; one they
             have not rests dim. It is binary, unordered, and it never
             decreases, so there is nothing here to complete: no bar, no fill,
             no count, and no number anywhere that could become one. What it
             buys is that the organism is a record of where you have been
             without ever asking you to finish it.

             Light is the right channel for this and the only one used: TY-01
             puts state in light everywhere else in the app, and a cell that
             changed SIZE or gained a mark would be a badge. */
          const wasHere = !!s.section?.key &&
            (seen.has(s.section.key) || seenSectionsStale.has(s.section.key.split('#')[0]));
          return (
            <g key={s.id}
              data-node-id={s.id}
              onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}
              onClick={() => enter(s.section!.page, s.x, s.y)}
              onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); enter(s.section!.page, s.x, s.y); } }}
              tabIndex={0} role="button" aria-label={`Section ${s.section!.title}`}
              style={{ cursor: 'pointer', pointerEvents: 'none' }}>
              <circle cx={s.x} cy={s.y} r={s.size + 15} fill="transparent"
                style={{ pointerEvents: 'auto' }} />
              {/* a sub-chapter is a small soma of the same tissue: a dendrite
                  tuft that overlaps its neighbours, a swirl that fades out with
                  no drawn edge, and a lit centre — never a ringed marker */}
              <g className="strand-breathe" style={{ animationDelay: tidePhase(s.x, s.y, i + 31) }}>
              <g style={rippleStyle(s.id)} opacity={active ? 1 : 0.78 + exc * 0.22}>
                {/* the arbor lifts a little with it, so the whole cell reads as
                    having been lit rather than only its centre — but by much
                    less than the centre, because the tissue is the drawing and
                    the drawing is not a status display */}
                {/* Read and unread are further apart than they were. At
                    0.66 against 0.52 the difference was there and did nothing —
                    a fifth of a stop between two dim things, which the eye
                    reads as noise in the drawing rather than as a state. At
                    0.70 against 0.44 a section you have opened is visibly
                    present and one you have not is visibly waiting, and the
                    dimmer one is still well above the tissue around it, so
                    nothing has been hidden — only ranked. */}
                <MapArbor id={ID} {...ARBOR[`sat:${s.id}`]} opacity={active ? 0.8 : (wasHere ? 0.7 : 0.44)} />
                <VortexSphere id={ID} cx={s.x} cy={s.y} r={s.size}
                  seed={i * 5 + 2} strands={13} exits={fibreAngles(s)}
                  intensity={active ? 1.3 : 1.12 + exc * 0.14}
                  reverse={i % 2 === 0} spinning={false} />
                {/* no halo disc — see the chapter somas: a soft radial mass on
                    black is a grey blob, not a cell */}
                <circle cx={s.x} cy={s.y} r={1.7} fill="currentColor"
                  opacity={active ? 1 : Math.min(1, (wasHere ? 0.95 : 0.42) + exc * 0.24)}
                  filter={`url(#${ID}-glow)`}
                  style={{ transition: `opacity 1.6s ${EASE}` }} />
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
              style={{ cursor: 'pointer', pointerEvents: 'none' }}>
              <circle cx={f.x} cy={f.y} r={f.size + 15} fill="transparent"
                style={{ pointerEvents: 'auto' }} />
              {/* Same cell as a section satellite, at a larger scale and a
                  higher intensity — a world is bigger than a page, and that is
                  the whole of how it says so. No new shape. */}
              <g className="strand-breathe" style={{ animationDelay: tidePhase(f.x, f.y, i + 53) }}>
              <g style={rippleStyle(f.id)} opacity={active ? 1 : 0.84 + exc * 0.16}>
                <MapArbor id={ID} {...ARBOR[`fig:${f.id}`]} opacity={active ? 0.86 : 0.64} />
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
                <MapArbor id={ID} {...ARBOR[`min:${m.id}`]} opacity={0.34} />
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
              style={{ cursor: 'pointer', pointerEvents: 'none' }}>
              {/*
                THE CELL IS OPENED BY ITS CORE, NOT BY ITS REACH.

                The handlers hang on the group, and the arbor is inside the
                group — so a click on any dendrite, out to three soma radii of
                fine tissue, opened the chapter. The tissue is meant to answer
                to touch and not to BE a button: reaching for a filament and
                landing in a chapter is the map taking a decision the reader did
                not make.

                One property, twice. The group stops being a pointer target, so
                beacon, arbor, vortex and numeral all inherit that and answer to
                nothing. This disc — already here, already at the soma — turns
                its own pointer events back on, and the event bubbles up to the
                handlers that were always on the group. Nothing moves, nothing
                is added, and the target becomes the lamp the reader is aiming
                at.
              */}
              <circle cx={n.x} cy={n.y} r={n.size + 24} fill="transparent"
                style={{ pointerEvents: 'auto' }} />

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
                  <MapArbor id={ID} {...ARBOR[`ch:${n.id}`]} opacity={1} />
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
                  {/* While the organism is assembling, the numeral is not what
                      the reader is looking at — the light is. It rides `formed`
                      so it comes up last, after the tissue it labels, and it
                      rests lower than it used to: a chapter's number is a mark
                      for finding the cell again, not a thing to read off a
                      drawing that is still arriving. */}
                  <g style={{ transition: `opacity 1.6s ${EASE}` }}
                    opacity={(active ? 1 : 0.46) * formed}>
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
          style={{ cursor: 'pointer', pointerEvents: 'none' }}>
          <circle cx={CX} cy={CY} r={78} fill="transparent"
            style={{ pointerEvents: 'auto' }} />
          {/* no membrane fill — see the chapter somas: only line has no mass */}
          <g style={{ transition: `transform ${RESPOND + 0.4}s ${EASE}, opacity ${RESPOND}s ${EASE}`,
            transform: `scale(${1 + excitation('core') * 0.07})`, transformOrigin: `${CX}px ${CY}px`,
            opacity: 0.8 + excitation('core') * 0.2 }}>
            <MapArbor id={ID} {...ARBOR.core} opacity={1} />
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
          tabIndex={0} role="button" aria-label="Open the bibliography" style={{ cursor: 'pointer', pointerEvents: 'none' }}>
          <circle cx={REFS.x} cy={REFS.y} r={28} fill="transparent"
            style={{ pointerEvents: 'auto' }} />
          <g style={rippleStyle('refs')} opacity={hover === 'refs' ? 1 : 0.8 + excitation('refs') * 0.2}>
            <MapArbor id={ID} {...ARBOR.refs} opacity={hover === 'refs' ? 0.9 : 0.68} />
            <circle cx={REFS.x} cy={REFS.y} r={1.9} fill="currentColor"
              opacity={hover === 'refs' ? 1 : 0.7} />
          </g>
        </g>

        </g>

        {/* ── the gesture, drawn ────────────────────────────────────────
            Two arcs opening away from each other under the core: the shape a
            hand makes to spread the map. It takes no input (`pointerEvents`
            none throughout) so it can never intercept the very gesture it is
            asking for, and it carries no label — the mark is the instruction.

            Under the core rather than over it, because the core is the
            brightest thing on the drawing and a faint mark laid across it would
            be invisible on one side and fighting the light on the other. */}
        {gestureHint && (
          <g
            className={gestureLeaving ? 'map-gesture-out' : undefined}
            transform={`translate(${CX} ${CY + 168})`}
            style={{ pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <path className="map-gesture-l" d="M -22 -15 Q -31 0 -22 15"
              fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" />
            <path className="map-gesture-r" d="M 22 -15 Q 31 0 22 15"
              fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" />
          </g>
        )}
      </svg>

      {/*
        The assembly.

        Over the drawing rather than under it: the particles are the light
        arriving and the tissue is what they leave behind, so a dot must never
        pass behind the strand it is about to become. It is one canvas, it takes
        no input, and it removes itself when the last particle lands — see
        `src/components/organic/Formation.tsx` for why it is not SVG.
      */}
      {formed < 1 && formation && (
        <Formation
          record={formation}
          active={forming}
          view={viewRef.current}
          onProgress={rampTissue}
          onDone={endFormation}
        />
      )}

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

      {/* The ground beneath the two corner controls. Permanent, because they
          are — see the note in index.css for what that costs and how it is
          bounded. */}
      <div aria-hidden="true" className="control-ground" />

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
        <div className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45">
          {caption ? caption.kind : 'U.R. — Strategic Dossier'}
        </div>
        <div className="title-face mt-1 text-[18px] font-light leading-snug">
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
        {/* It used to yield to zero whenever a caption was up — the frame
            refusing to say two things at once (TY-05). That was asked to stop:
            this is the one control a reader arrives wanting, and it is now held
            at full presence whatever else is on screen. The two no longer
            collide because the plateau under this corner is opaque enough to
            carry the word on its own, and the caption lives in the opposite
            corner. */}
        <div className="w-64 flex-shrink-0 pointer-events-auto">
          <button
            onClick={() => (returning ? enter(lastPage) : onOpenIndex())}
            className="bud bud-lit px-3 py-2.5 text-[12px] font-light uppercase tracking-[0.2em] flex items-center gap-2.5 rounded-none outline-none"
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

        {/* THE HINT LEAVES THE PHONE RATHER THAN WRAPPING ON IT.

            Now that a portrait phone gets the map, this line got a column about
            eleven characters wide between the two corner controls, and it broke
            one word per line down the middle of the drawing — nine stacked
            fragments over the tissue. A hint that has to be deciphered is worse
            than no hint, and this one is describing gestures a touch reader
            already has: there is no cursor to hover with and no Esc key to
            press. It is a pointer-and-keyboard instruction, so it shows where
            there is a pointer and a keyboard.

            `hidden sm:flex` rather than a media query in JS: the layout decides
            this, and the layout is where it belongs. */}
        <div className="hidden sm:flex flex-1 min-w-0 text-center items-end justify-center">
          <div className="text-[9px] uppercase tracking-[0.2em] opacity-25 whitespace-nowrap">
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
        {/* Asked for as permanent and at full presence, which reverses the
            reasoning above it: this control used to appear only once the view
            had something to put back, on the argument that a permanently inert
            control is one the eye stops seeing. It is now always here. What
            keeps it honest is that it still reports its own state — inert while
            the view is already home, live once the map has moved — so the
            reader is told whether there is anything to undo rather than left to
            find out by pressing it. */}
        <div className="w-52 flex-shrink-0 flex flex-col items-end gap-1 pointer-events-auto">
          {/* Not disabled when the view is already home. `.bud:disabled` rests
              at 0.22, which is the opposite of what was asked for here, and
              putting a view back that is already back costs nothing — the glide
              simply has nowhere to travel. State is carried by light instead
              (TY-01): the soma is hot while there is something to undo. */}
          <button onClick={resetView}
            className="bud bud-lit px-3 py-2.5 text-[12px] font-light uppercase tracking-[0.2em] flex items-center gap-2.5 rounded-none outline-none"
            title="Put the view back where it started" aria-label="Reset view">
            <Soma size={10} phase={9.7} opacity={zoomed ? 0.95 : 0.5} />
            <span>Reset view</span>
          </button>
        </div>
      </div>
    </div>
  );
};
