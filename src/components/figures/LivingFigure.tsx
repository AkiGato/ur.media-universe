import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FigureDefs, FigureFrame, FigureInertContext, VortexSphere, Dendrites,
  rnd, smoothPolyline, arcSegment
} from './FigurePrimitives';
import { Vein, Soma } from '../organic/Organic';

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
}

/* ------------------------------------------------------- drawing the tissue */

/**
 * A wandering course between two cells. The envelope reaches exactly zero at
 * both ends so the strand stays attached, and every frequency, phase and
 * amplitude is seed-derived so no two connections share a shape.
 */
function wander(
  x1: number, y1: number, x2: number, y2: number, seed: number, steps = 20
): Array<[number, number]> {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const peak = 0.3 + rnd(seed + 1) * 0.4;
  const amp = Math.max(7, len * (0.08 + rnd(seed) * 0.1)) * (rnd(seed + 2) > 0.5 ? 1 : -1);
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
  traffic = 1
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const n = pts.length - 1;
  if (n < 2) return out;

  /* The taper. Two pieces: a taper needs at least two widths to exist and no
     more than two to read at this scale. Arbor twigs sit at 0.22–0.34, so
     trunks start near 1.3 and thin — the hierarchy the references show, and
     the thing a flat width made every line lose. */
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
     along the way. */
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

  /* The relay, when the fibre carries light both ways.

     An element with a negative delay starts its keyframe already underway, so a
     LARGER delay fires EARLIER: the outward sweep therefore counts down from the
     far end, and the return counts up, offset by half the period. Two stationary
     circles per station, never one moving one. */
  if (both) {
    const stations = 7;
    /* tighter than the 0.17 a single pair used: with several exchanges sharing
       the fibre the leap has to read as a leap, or the crossings smear into one
       another and the strand simply looks busy rather than carrying anything */
    const stepS = traffic > 1 ? 0.1 : 0.17;
    const lanes = Math.max(1, Math.round(traffic));
    for (let lane = 0; lane < lanes; lane++) {
      /* evenly through the period, so the gaps between exchanges close as the
         lane count rises instead of the exchanges piling onto one another */
      const phase = (SPIKE / lanes) * lane;
      for (let m = 0; m <= stations; m++) {
        const q = pts[Math.round((m / stations) * n)];
        if (!q) continue;
        const r = 0.5 + rnd(seed + m * 3) * 0.22;
        out.push(
          <circle key={`${keyBase}-ro${lane}-${m}`} className="ranvier"
            cx={q[0].toFixed(1)} cy={q[1].toFixed(1)} r={r} fill="currentColor"
            style={{ animationDelay: `-${(phase + (stations - m) * stepS).toFixed(2)}s` }} />,
          <circle key={`${keyBase}-rb${lane}-${m}`} className="ranvier"
            cx={q[0].toFixed(1)} cy={q[1].toFixed(1)} r={r} fill="currentColor"
            style={{ animationDelay: `-${(phase + SPIKE / 2 + m * stepS).toFixed(2)}s` }} />
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

export interface LivingFigureProps {
  id: string;
  width: number;
  height: number;
  nodes: FigureNode[];
  /** omit to let proximity wire the tissue */
  edges?: FigureEdge[];
  /** the cell the luminance tide rolls out from */
  core?: string;
  /** FigureFrame chrome */
  caption: string;
  tag: string;
  footLeft: string;
  footRight: string;
  /** the reading shown when nothing is touched */
  rest?: { kind: string; body: string };
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
const SPINE_BELOW = 600;

export const LivingFigure: React.FC<LivingFigureProps> = ({
  id, width: W, height: H, nodes, edges, core,
  caption, tag, footLeft, footRight, rest, backdrop, overlay, rimStyle
}) => {
  /* drawn but not touchable — the preview on a page. See FigureInertContext. */
  const inert = React.useContext(FigureInertContext);
  const [touched, setTouched] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  /* the figure measures the column it was given, not the window: in a two-page
     spread the sheet is wide and the column is not */
  const holdRef = useRef<HTMLDivElement | null>(null);
  const [held, setHeld] = useState(0);
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
  const narrow = held > 0 && held < SPINE_BELOW;

  const active = touched || pinned;

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
      const pts = wander(A.x, A.y, B.x, B.y, e.seed);
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
  }, [nodes, edges, byId, coreId]);

  /* touch propagates by topology, not by geometry, so excitation runs along
     the tissue instead of jumping across whatever happens to be nearby */
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

  /**
   * The cells the spine lists, in the order a reader needs them.
   *
   * Two rules, and both exist because FIG 0.1 broke without them. Its field of
   * eighteen supply cells is declared before the three named ones — it has to
   * be, so the named cells paint over the field rather than under it — and the
   * spine took that order literally: eighteen identical rows, and the three
   * cells carrying the argument below the fold. So named cells come first here.
   *
   * And an anonymous field is one thing, not eighteen. Cells with no name and
   * the same reading collapse to a single row, because a list that repeats one
   * sentence eighteen times is not a list, it is a wall.
   */
  const spineCells = useMemo(() => {
    const listed = nodes.filter(n => n.label || n.reading);
    const named = listed.filter(n => n.label);
    const anon = listed.filter(n => !n.label);
    const seen = new Set<string>();
    const collapsed = anon.filter(n => {
      const k = n.reading?.kind ?? n.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return [...named, ...collapsed];
  }, [nodes]);

  /* ------------------------------------------- narrow: the same, as a spine
     Built as a value, never as an early return: the measured wrapper has to be
     the same DOM node in both modes, or switching modes unmounts the node the
     ResizeObserver is watching and the figure can never switch back. */
  const spine = (
        <>
          {rest && (
            <p className="text-[12px] font-light leading-snug opacity-70 pb-2">{rest.body}</p>
          )}
          <div className="space-y-2.5">
            {spineCells.map((n, i) => {
              const open = pinned === n.id;
              const linked = (built.adj[n.id] || [])
                .map(m => byId[m]?.label)
                .filter(Boolean) as string[];
              return (
                <div key={n.id}>
                  <button
                    onClick={() => setPinned(open ? null : n.id)}
                    aria-expanded={open}
                    className={`w-full text-left p-2.5 flex items-start gap-2.5 rounded-none ${
                      open ? 'membrane-lit' : 'bud opacity-85'
                    }`}
                  >
                    <span className="pt-0.5">
                      <Soma size={10} opacity={open ? 1 : (n.intensity ?? 1) * 0.7} phase={(i * 3.7) % 19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[12px] tracking-[0.2em] uppercase leading-snug ${
 open ? 'font-light' : 'font-light'
 }`}>
                        {n.label || n.reading?.kind}
                      </span>
                      {n.sub && (
                        <span className="block text-[9px] font-light opacity-60 leading-snug mt-0.5">{n.sub}</span>
                      )}
                      {/* the kind line is what the strip would have shown; the
                          body is skipped when it only repeats the sub already
                          printed above it */}
                      {open && n.reading && (
                        <>
                          <span className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-45 mt-2">
                            {n.reading.kind}
                          </span>
                          {n.reading.body !== n.sub && (
                            <span className="block text-[12px] font-light opacity-85 leading-snug mt-1">
                              {n.reading.body}
                            </span>
                          )}
                        </>
                      )}
                      {open && n.detail && (
                        <span className="block space-y-1 mt-1.5">
                          {n.detail.map((d, k) => (
                            <span key={k} className="flex items-start gap-2 text-[12px] font-light leading-snug opacity-75">
                              <span className="pt-1"><Soma size={6} opacity={0.7} phase={(k * 4.1) % 19} /></span>
                              <span className="min-w-0">{d}</span>
                            </span>
                          ))}
                        </span>
                      )}
                      {/* the topology survives the loss of the drawing: what a
                          cell is wired to is the figure's actual content */}
                      {open && linked.length > 0 && (
                        <span className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-40 mt-2 leading-relaxed">
                          Wired to · {linked.join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </>
  );

  const drawn = (
    <>
      {/* The rim wraps the drawing and nothing else — not the reading strip
          below it, which is type and must not be darkened at its edges. */}
      <div className={`figure-rim${inert ? ' figure-rim-inert' : ''}`} style={rimStyle}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
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
        <g filter={`url(#${id}-flex)`}>
          {built.courses.map((c, i) => {
            const exc = Math.max(excite(c.pre), excite(c.post));
            const base = c.edge.faint ? 0.5 : 0.76;
            const op = Math.min(1, base + exc * 0.24);
            const weight = (c.edge.weight ?? (c.edge.faint ? 0.8 : 1.25)) * (0.85 + exc * 0.5);
            const mid = c.pts[Math.floor(c.pts.length / 2)];
            return (
              <g key={`e${i}`} className="strand-breathe"
                style={{ ...ripple(c.pre), animationDelay: tidePhase(mid[0], mid[1], i + 3) }}>
                {tissue(c.pts, weight, op, c.edge.seed, `${id}e${i}`,
                  !c.edge.both, c.edge.both, c.edge.traffic)}
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

        {overlay}

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
          const labelY =
            (n.labelAt === 'above' ? n.y - n.r - 15 : n.y + n.r + 19) + (n.labelDy ?? 0);
          const glyphSize = n.r * 0.72;

          return (
            <g key={n.id}
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

                {/* the dendritic field — overlapping its neighbours' */}
                <Dendrites id={id} cx={n.x} cy={n.y}
                  r={n.arborR ?? n.r * (minor ? 3.2 : 3.8)}
                  arms={n.arborArms ?? (minor ? 5 : 7)}
                  depth={3} seed={i * 19 + 7}
                  opacity={(isActive ? 0.56 : 0.42) * rest0}
                  width={0.5} />

                {/* No membrane fill. NOTHING here is a filled area — flat tone
                    over an area reads as a mass at any strength, and the map
                    tried this shape at 0.17 and again at 0.055 before removing
                    it. Only line has no mass. The multipolar silhouette is
                    still spoken, by the arbor coning outward around the cell. */}

                {/* the swirl inside the cell — density defines where it is,
                    so there is no rim to give it a hard edge */}
                {!minor && (
                  <VortexSphere id={id} cx={n.x} cy={n.y} r={n.r}
                    seed={i * 5 + 2} strands={n.kind === 'core' ? 30 : 17}
                    intensity={(isActive ? 1.05 : 0.9 + exc * 0.1) * rest0}
                    reverse={i % 2 === 0}
                    spinning={n.kind === 'core'}
                    spinSeconds={period(150, i + 2)} />
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

              {/* the name stays legible at rest so navigation is never a guess */}
              {n.label && (
                <text x={n.x} y={labelY} textAnchor="middle" fill="currentColor"
                  fontSize={8.5} fontWeight={300} letterSpacing={1.7}
                  /* The map's rule, which the figures used to break: a name
                     surfaces where you touch and nowhere else. At rest a figure
                     is cells and fibre, exactly as the map is; the excitation
                     term lets a neighbour warm rather than snap on alone. */
                  opacity={(isActive ? 0.95 : Math.max(n.labelAtRest ?? 0, exc * 0.45)) * rest0}
                  style={{ transition: `opacity ${RESPOND}s ${EASE}`, pointerEvents: 'none' }}>
                  {n.label}
                </text>
              )}
              {n.sub && (
                <text x={n.x} y={labelY + 11} textAnchor="middle" fill="currentColor"
                  fontSize={7.2} fontWeight={300} letterSpacing={0}
                  /* the second line belongs to the touched cell only, unless the
                     figure has opted its names into resting legibility */
                  opacity={(isActive ? 0.7 : (n.labelAtRest ?? 0) * 0.62) * rest0}
                  style={{ transition: `opacity ${RESPOND}s ${EASE}`, pointerEvents: 'none' }}>
                  {n.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
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
        <div className="pt-1.5 flex items-start justify-center gap-2.5"
          style={{ transition: `opacity ${RESPOND}s ${EASE}` }}>
          <div className="pt-0.5">
            <Soma size={9} opacity={active ? 1 : 0.45} phase={2.3} />
          </div>
          {/* Centred under the drawing it belongs to. The detail list below
              keeps its own left edge — centred bullets read as ragged. */}
          <div className="min-w-0 text-center">
            {reading ? (
              <>
                <div className="text-[9px] font-light uppercase tracking-[0.2em] opacity-75">
                  {reading.kind}
                </div>
                <div className="text-[12px] font-light leading-relaxed mt-1">{reading.body}</div>
              </>
            ) : (
              <div className="text-[9px] uppercase tracking-[0.2em] opacity-55">
                Touch a cell to read it · press to keep it open
              </div>
            )}
            {detail && (
              <ul className="mt-1.5 space-y-1 inline-block text-left">
                {detail.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] font-light leading-relaxed opacity-90">
                    <span className="pt-1"><Soma size={7} opacity={0.7} phase={(i * 4.1) % 19} /></span>
                    <span className="min-w-0">{d}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      )}
    </>
  );

  return (
    <FigureFrame caption={caption} tag={tag} footLeft={footLeft} footRight={footRight}>
      <div ref={holdRef} className="w-full">
        {narrow ? spine : drawn}
      </div>
    </FigureFrame>
  );
};
