import React from 'react';
import {
  FigureDefs, VortexSphere, Dendrites, GrowthCone, rnd, smoothPolyline
} from './figures/FigurePrimitives';

/**
 * The chapter opener.
 *
 * A chapter used to begin exactly like its third page — a label, a title, a
 * rule. On the map each chapter is a cell you can see the size of, and that
 * scale is information: it is the difference between arriving somewhere and
 * scrolling past it. So the first page of a chapter carries the chapter's own
 * soma, grown to fill the head of the page: the same multipolar membrane, the
 * same swirl, the same dendritic field the map draws, with the title emerging
 * out of it rather than sitting above it.
 *
 * It is rendered on the chapter's existing first page rather than as a page of
 * its own. Adding pages would renumber every page after it, and bookmarks,
 * highlights and the saved reading position are all stored by index — five
 * moments of scale are not worth silently moving everyone's marks.
 */

const W = 520;
const H = 300;
const CX = W / 2;
const CY = 148;

/**
 * The spine reading each chapter sits on. Mirrors CHAPTER_DATA in Orrery.tsx —
 * duplicated deliberately rather than imported, because the map is a lazily
 * loaded chunk and one string is not worth pulling it into the reader's bundle.
 */
/** width of the dendritic field, in turns — a little over a half circle, all of
 *  it on the side away from the axon */
const DENDRITE_SPAN_TURNS = 0.52;

const CHAPTER_SPINE: Record<string, string> = {
  'chapter-1': 'Fragile — the mechanism',
  'chapter-2': 'Fragile — the liability',
  'chapter-3': 'Robust — the posture',
  'chapter-4': 'Robust — the method',
  'chapter-5': 'Antifragile — the system',
  prologue: 'The manifesto'
};

/* `somaOutline` stood here — a traced silhouette bulging into a cone wherever a
   process left the cell. Nothing has called it since the membrane fill came out
   ("Only Lines. Nothing Is Ever a Filled Area"): the silhouette is spoken by the
   arbor coning outward instead, which is the whole point of that rule. A drawing
   routine kept for a drawing nobody makes is a loaded gun, so it is gone rather
   than commented out. */

export const ChapterOpener: React.FC<{
  /** the map's own id for this chapter, so the geometry is stable per chapter */
  chapterId: string;
  numeral: string;
  /** the spine reading — Fragile / Robust / Antifragile */
  spine?: string;
  title: string;
  subtitle?: string;
}> = ({ chapterId, numeral, spine, title, subtitle }) => {
  const reading = spine || CHAPTER_SPINE[chapterId] || '';
  const id = `opener-${chapterId}`;
  // seeded off the chapter id so a chapter's cell is the same cell every visit
  const seed = chapterId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = 46;

  /*
   * A neuron is polarised, and that is most of what makes one recognisable.
   *
   * Processes spread evenly around a cell body give a star — a sun with rays —
   * which is what this was. A real cell carries a *dendritic field* over one
   * arc and a single *axon* leaving the other side: longer, finer, sheathed,
   * ending in a terminal arborisation. The asymmetry is the diagnosis; without
   * it no amount of branching reads as neural.
   */
  const axonAngle = Math.PI * (0.86 + rnd(seed + 31) * 0.2);
  const dendriteDirs = Array.from({ length: 6 }, (_, i) =>
    axonAngle + Math.PI - 0.95 + (i / 5) * 1.9 + (rnd(seed + i) - 0.5) * 0.22
  );
  // the silhouette cones toward every process, the axon included — the cone at
  // the axon end is the hillock
  const dirs = [...dendriteDirs, axonAngle];

  /** The axon: one long fibre, bowed, running out of the frame. */
  const axon: Array<[number, number]> = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    const reach = r * 0.92 + t * 250;
    const a = axonAngle + Math.sin(t * 2.1 + rnd(seed + 3)) * 0.16 * (1 - t * 0.35);
    return [CX + Math.cos(a) * reach, CY + Math.sin(a) * reach];
  });

  /* Myelin: pale internodes with bare gaps between them. A long unbroken
     hairline is the one thing an axon never looks like. */
  const internodes = Array.from({ length: 6 }, (_, i) => {
    const from = 0.22 + i * 0.125;
    const to = from + 0.092;
    const seg = axon.slice(Math.floor(from * 15), Math.ceil(to * 15) + 1);
    return seg.length > 1 ? seg : null;
  }).filter(Boolean) as Array<Array<[number, number]>>;

  return (
    <div className="relative w-full flex-shrink-0" aria-hidden="false">
      {/*
        The cell yields to the prose.

        A moment of scale is worth having only where there is room for it: on a
        phone the sheet is one column and every unit the opener takes comes
        straight out of the reading. Measured on a 375×812 screen, the opener at
        its desktop height left the prose column 53px — the chapter announced
        itself and then had nowhere to say anything. It is capped by viewport
        height and kept small until the sheet is wide enough to spare it.
      */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="opener-figure w-full h-auto font-sans"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Chapter ${numeral} — ${title}`}
      >
        <FigureDefs id={id} blur={3} />

        {/* The axon, under everything: the process that leaves.
            Segmented sheath with bare nodes of Ranvier between, so the fibre
            is legible as an axon and not as a long dendrite. */}
        <g opacity={0.5}>
          {/* The core fibre tapers, as every process on the map does: a
              constant width is the thing that made every line read alike.
              Drawn in two pieces because one path has one stroke-width.
              (The myelin stays: the map dropped it because at map scale, over
              232 links, it was correctly drawn and invisible. Here there is one
              axon at a hundred times the size, and it reads.) */}
          {[0, 1].map(sg => {
            const from = Math.floor((sg / 2) * (axon.length - 1));
            const to = Math.ceil(((sg + 1) / 2) * (axon.length - 1));
            return (
              <path key={`ax${sg}`} d={smoothPolyline(axon.slice(from, to + 1))}
                fill="none" stroke="currentColor" strokeLinecap="round"
                strokeWidth={0.62 - sg * 0.22} opacity={0.55 - sg * 0.06} />
            );
          })}
          {internodes.map((seg, i) => (
            <path key={`my${i}`} d={smoothPolyline(seg)} fill="none" stroke="currentColor"
              strokeWidth={2.1 - i * 0.2} strokeLinecap="round" opacity={0.12} />
          ))}
          {/* the bare nodes fire in sequence, distally — saltatory, never a
              travelling dash */}
          {internodes.map((seg, i) => {
            const p = seg[seg.length - 1];
            return (
              <circle key={`nr${i}`} cx={p[0]} cy={p[1]} r={0.85} fill="currentColor"
                className="ranvier"
                style={{ animationDelay: `-${(7.4 - i * 0.33).toFixed(2)}s` }} />
            );
          })}
          {/* terminal arborisation: the fibre ends in boutons, not in a stop */}
          <GrowthCone x={axon[axon.length - 1][0]} y={axon[axon.length - 1][1]}
            angle={Math.atan2(
              axon[axon.length - 1][1] - axon[axon.length - 2][1],
              axon[axon.length - 1][0] - axon[axon.length - 2][0]
            )}
            seed={seed + 5} size={10} opacity={0.5} />
        </g>

        {/* The dendritic field — over one arc only, opposite the axon, and
            spiny: the bulb-headed protrusions on the mid-distal branches are
            the single feature separating a dendrite from a branching line. */}
        <g className="sway" style={{
          transformOrigin: `${CX}px ${CY}px`,
          animationDuration: `${(31 + rnd(seed) * 14).toFixed(2)}s`,
          animationDelay: `-${(rnd(seed + 3) * 20).toFixed(2)}s`
        }}>
          {/* span and rotate are in TURNS, not radians — Dendrites multiplies
              both by TAU. Passing radians here spreads the field at an
              arbitrary angle, which silently undoes the polarity. */}
          <Dendrites id={id} cx={CX} cy={CY} r={r * 4.4} arms={9} depth={4}
            span={DENDRITE_SPAN_TURNS}
            rotate={(axonAngle + Math.PI) / (Math.PI * 2) - DENDRITE_SPAN_TURNS / 2}
            seed={seed + 7} opacity={0.42} width={0.6} spines />
        </g>

        {/* No membrane fill, no nucleus disc.

            Nothing in this system is a filled area — flat tone over an area
            reads as a mass at any opacity, and a mass is a blob. The cell body
            is spoken by the swirl crowding below and the arbor coning out of
            it, both of which are line. The nucleolus stays: it is a point, and
            a point has no area to read as tone. */}
        <circle cx={CX + r * 0.2} cy={CY - r * 0.16} r={r * 0.1} fill="currentColor"
          opacity={0.16} />

        {/* the swirl inside it, on its own slow clock, its escaping streamlines
            running out along the cell's real processes */}
        <g className="alive" style={{
          transformOrigin: `${CX}px ${CY}px`,
          animationDuration: `${(12 + rnd(seed + 5) * 7).toFixed(2)}s`,
          animationDelay: `-${(rnd(seed + 9) * 11).toFixed(2)}s`
        }}>
          <VortexSphere id={id} cx={CX} cy={CY} r={r} seed={seed + 2}
            strands={34} intensity={1} spinning spinSeconds={128 + (seed % 40)}
            exits={dirs} />
        </g>

        {/*
          No glow behind the cell at all.

          It began as a radial disc, which read as a bulb; shaped to the membrane
          and blurred, it still read as a grey cloud parked behind the swirl —
          because that is what a large blurred fill on black is. Any soft mass
          behind fine white filaments lifts the black to grey and takes the
          drawing's contrast with it: the strands lose their ground.

          The cell is legible without it. Density of line is what says "there is
          something here" everywhere else in this organism, and it is enough
          here too.
        */}

        {/* the numeral surfaces from inside the cell rather than labelling it */}
        <text x={CX} y={CY + 11} textAnchor="middle" fill="currentColor"
          fontSize={30} fontWeight={200} opacity={0.82}>
          {numeral}
        </text>

        {/* the title emerges out of the cell, on the tissue's own axis */}
        <text x={CX} y={CY + r + 52} textAnchor="middle" fill="currentColor"
          fontSize={9} fontWeight={300} letterSpacing={1.8} opacity={0.5}>
          {reading.toUpperCase()}
        </text>
      </svg>

      <div className="text-center px-2 -mt-1">
        <h2 className="text-[18px] font-light tracking-[0.2em] uppercase leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 sm:mt-1.5 text-[12px] font-light opacity-65 max-w-xl mx-auto leading-relaxed line-clamp-2 sm:line-clamp-none">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
