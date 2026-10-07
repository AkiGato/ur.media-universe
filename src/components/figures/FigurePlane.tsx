import React from 'react';

/**
 * THE COORDINATE PLANE — the only straight rules in the app, and only here.
 *
 * GR-01 does not merely omit a grid, it argues against one: *"nothing is drawn
 * on that ground: no grid, no rule, no field, no ticks, no technical
 * backdrop"* — and records that the map's grid was dimmed to 0.14 and then
 * removed outright, on the finding that a rectilinear field behind a thing
 * containing no straight lines reads as *diagram* rather than as organism. The
 * figures inherited that removal. It is also what the rule says makes **Never a
 * Straight Line** absolute: *"the exception it used to carve out was the
 * backdrop grid, and there is no longer a backdrop to except."*
 *
 * It comes back for the TRENDWATCH figures and nowhere else, asked for
 * directly. The argument that carried it: those two are the only drawings in
 * the book whose subject is a COORDINATE. The interval is a quantity against a
 * year and the trajectories are a divergence against five named dimensions,
 * and a quantity with nothing to measure it against is not a reading — it is a
 * dot at a height. The reader's report was the plain form of that, twice: the
 * graph is not clear. What was missing was the plane it is drawn on.
 *
 * The seven figures that draw an argument keep the empty ground GR-01 won for
 * them, and this file is why the exception stays countable: one module, one
 * exported symbol, and `audit-lines` exempts exactly that symbol — the same
 * mechanism the four directional arrows use. Every other mark in every figure,
 * including the courses that cross this plane, still fails the build if it goes
 * straight.
 *
 * STRAIGHT IS THE WHOLE POINT. A datum a reader measures a position against may
 * not bow: a wobbling rule turns the measurement into a guess, which is the
 * opposite of what a plane is for.
 *
 * THE AESTHETIC IS THE REFERENCE'S. Dotted rules rather than solid, so the
 * plane is a measured space and not a cage; a dot closing every division at
 * each end, which is what makes the reference read as an instrument rather
 * than as graph paper; and the whole thing kept well under the drawing's
 * weight, because GR-04's finding holds even here — legibility comes from the
 * ground, and a plane that competed with the courses would take back exactly
 * what it was added to give.
 */
export const CartesianPlane: React.FC<{
  /**
   * Where the named divisions fall, in figure units. These are the axis the
   * reader counts along: the years of a series, the dimensions of a comparison.
   */
  at: number[];
  /** the plane's bounds, in figure units */
  top: number;
  bottom: number;
  left: number;
  right: number;
  /**
   * Which way the named divisions run.
   *
   * `vertical` draws one rule per division standing up the page, for a figure
   * whose named axis is the horizontal — a series across time. `horizontal`
   * lays them down, which is the same plane transposed, for the portrait form
   * where time runs down the page. The figure does not get to re-rule itself
   * for the narrow sheet: it says which way it turned and the plane turns with
   * it.
   */
  divisions?: 'vertical' | 'horizontal';
  /** how many unnamed rules cross the divisions — the scale, never labelled */
  scale?: number;
}> = ({ at, top, bottom, left, right, divisions = 'vertical', scale = 4 }) => {
  const vertical = divisions === 'vertical';
  /* `useId`, not a module counter behind `useMemo`.

     The first version incremented a module-scope counter inside a useMemo. A
     useMemo is a CACHE, not a guarantee — React may discard and recompute it,
     and under StrictMode's double-invoke it already runs twice — so the mask's
     id could change between the `<mask id>` and the `mask="url(#…)"` that
     points at it, and a plane would silently render as nothing. `useId` is the
     API for exactly this: stable for the life of the instance, unique across
     instances, and identical between server and client. */
  const uid = React.useId().replace(/:/g, '');

  /* The scale runs across the divisions, so which axis it sits on follows them.
     It is never labelled: the cells quote their own readings as glyphs, and a
     ruled number beside a quoted one is the same fact twice (TY-05). */
  const cross = Array.from({ length: scale + 1 }, (_, i) =>
    vertical
      ? top + ((bottom - top) * i) / scale
      : left + ((right - left) * i) / scale
  );

  /*
   * THE PLANE FADES OUT; IT DOES NOT STOP.
   *
   * A grid that ends on a hard rectangle is a frame, and a frame around a
   * drawing is the "technical backdrop" GR-01 removed twice — the edge is what
   * makes it read as graph paper rather than as space that happens to be
   * measured. DG-09 already settled the same question for the map's field: it
   * dissolves, it does not end.
   *
   * So the whole plane is masked by a radial falloff, opaque across the middle
   * and reaching zero before the frame. The rules are still straight and still
   * exactly where a reading is measured against them; what goes is the edge.
   */
  return (
    <g aria-hidden="true" mask={`url(#${uid}-fade)`}>
      <defs>
        <radialGradient id={`${uid}-falloff`} cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="58%" stopColor="#fff" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={`${uid}-fade`} maskUnits="userSpaceOnUse"
          x={left - 40} y={top - 40} width={right - left + 80} height={bottom - top + 80}>
          <rect x={left - 40} y={top - 40} width={right - left + 80} height={bottom - top + 80}
            fill={`url(#${uid}-falloff)`} />
        </mask>
      </defs>
      {cross.map((c, i) => {
        /* The far end of the scale is the baseline a reading is measured from
           — zero, or the foot of the frame — so it carries more than the rules
           above it, which are only there to make a height countable. */
        const base = vertical ? i === scale : i === 0;
        return (
          <line
            key={`s${i}`}
            x1={vertical ? left : c}
            y1={vertical ? c : top}
            x2={vertical ? right : c}
            y2={vertical ? c : bottom}
            stroke="currentColor"
            strokeWidth={0.4}
            strokeDasharray="1 5"
            opacity={base ? 0.72 : 0.46}
          />
        );
      })}

      {at.map((d, i) => {
        const x1 = vertical ? d : left;
        const y1 = vertical ? top : d;
        const x2 = vertical ? d : right;
        const y2 = vertical ? bottom : d;
        return (
          <g key={`d${i}`}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="currentColor"
              strokeWidth={0.4}
              strokeDasharray="1 6"
              opacity={0.6}
            />
            {/* the dot that closes each division at both ends — the mark that
                makes the reference read as an instrument */}
            <circle cx={x1} cy={y1} r={1.1} fill="currentColor" opacity={0.85} />
            <circle cx={x2} cy={y2} r={1.1} fill="currentColor" opacity={0.85} />
          </g>
        );
      })}
    </g>
  );
};
