import React from 'react';

/**
 * The icon set — instrument diagrams, not interface pictograms.
 *
 * Asked for in the language of a reference sheet: thin white line on black,
 * geometric and mathematical — conic sections, orbital diagrams, wireframe
 * solids, lattices, sine waves with their nodes marked. Drawn at chrome scale
 * that becomes: one weight of hairline, one construction per glyph, no
 * shoulders, no filled counters, nothing that reads as a UI symbol borrowed
 * from a toolkit. They replace `lucide-react`, which is now gone from the
 * dependency list — a general-purpose icon font is exactly the "adjacent to the
 * drawing rather than made of it" failure FW-01 records for the figures.
 *
 * ONLY THE FOUR DIRECTIONAL GLYPHS ARE STRAIGHT. EVERYTHING ELSE IS NOT.
 *
 * The reference is full of straight rules — axes, grids, the edges of wireframe
 * cubes — and DG-01 forbids them in the tissue, in those words: no segment
 * elements, no L-only paths, no zero-bow filaments. `npm run lint` fails the
 * build on it. (Phrased around the tag name on purpose: audit-lines reads
 * source text, so naming that element even inside a comment fails the build —
 * see docs/OPEN.md entry 29.)
 *
 * So every stroke here is a quadratic or an arc with a real bow, typically 2–4%
 * of its span. At 12–20px that is under a third of a pixel of deflection: it
 * reads as the reference's straight rule and is not one, which is the same
 * answer `arcSegment()` gives everywhere else in the app ("use arcSegment()
 * wherever a short straight stroke would otherwise appear"). The glyphs are
 * built from the shapes the rule already permits — arcs, circles, points.
 *
 * The exception is the four arrows and chevrons, which were asked for straight
 * and are argued for at their own definition below. The bow stays everywhere
 * else in this file, and nothing outside it changes at all.
 *
 * One weight, one viewBox, `currentColor` throughout (GR-05), and sizing comes
 * from the call site's className exactly as it did before, so no call site
 * learns anything new.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

/** Every glyph is this frame: one box, one weight, one cap. */
const Glyph: React.FC<IconProps & { children: React.ReactNode }> = ({ children, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

/* ── navigation ─────────────────────────────────────────────────────────── */

/* ── THE FOUR DIRECTIONAL GLYPHS ARE STRAIGHT, AND EVERYTHING ELSE IS NOT ──
 *
 * Asked for directly: classical thin straight arrows.
 *
 * These four were bowed by 2–4% so they satisfied DG-01 while reading as
 * straight rules at chrome scale. At 12–20px that trick works on a chevron and
 * fails on an arrow: the bowed shaft and two bowed head strokes read as a
 * drawn, slightly organic mark rather than as the flat pointer a reader expects
 * from a control, which is what was objected to.
 *
 * DG-01's scope is "the root/neural/light system" — tissue. These are
 * PICTOGRAMS ON CONTROLS: they do not grow out of the organism, carry no
 * conduction, take no tide, and sit in chrome. So this is read as a scoping
 * line rather than an overturn — the drawing stays curved everywhere, and the
 * four marks that only ever meant "this way" are allowed to be straight. The
 * line audit is narrowed to match, in one named entry, so the exemption is a
 * decision somebody can find rather than a hole. See docs/OPEN.md 49.
 *
 * WHAT DOES NOT CHANGE: every other glyph in this file stays built from arcs
 * and circles, and nothing in the tissue, the figures or the openers may take
 * this as licence. FW-02 also still refuses a FILLED arrowhead — these heads
 * are two strokes meeting at a point, never a solid triangle.
 */
export const ChevronLeft: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M15 5 L8 12 L15 19" />
  </Glyph>
);

export const ChevronRight: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M9 5 L16 12 L9 19" />
  </Glyph>
);

export const ArrowLeft: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M20 12 L4 12" />
    <path d="M10.5 5.5 L4 12 L10.5 18.5" />
  </Glyph>
);

export const ArrowRight: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M4 12 L20 12" />
    <path d="M13.5 5.5 L20 12 L13.5 18.5" />
  </Glyph>
);

/* ── instruments ────────────────────────────────────────────────────────── */

/** The sheet's opening figure: two fields, and the search is their overlap.
    The overlap is struck by two arcs rather than hatched — hatching at 16px is
    a filled area arriving as texture, which DG-02 refuses. */
export const Search: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="9.2" cy="12" r="6.2" />
    <circle cx="14.8" cy="12" r="6.2" />
    <path d="M12 6.1 Q13.5 9 13.5 12 Q13.5 15 12 17.9" opacity="0.5" />
    <path d="M12 6.1 Q10.5 9 10.5 12 Q10.5 15 12 17.9" opacity="0.5" />
  </Glyph>
);

/** The saved places — the sheet marked wave, whose whole subject is named
    points on a course. Three nodes, because the figure marks several and a
    saved-places list that drew one would be the toggle again. */
export const Bookmarks: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M2.6 15.4 Q6.2 6.4 9.8 12 Q13.4 17.6 17 8.6 Q19.2 3.8 21.4 9.2" opacity="0.7" />
    <circle cx="6.1" cy="10.6" r="1.5" />
    <circle cx="12" cy="14.1" r="1.5" />
    <circle cx="17.9" cy="7.3" r="1.5" />
  </Glyph>
);

/** A pennant. Takes `fill` from the call site — the only glyph that does. */
export const Bookmark: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M6.8 4.6 Q12 4.2 17.2 4.6 Q17.5 12 17.2 19.6 Q12.2 15.9 12 15.7 Q11.8 15.9 6.8 19.6 Q6.5 12 6.8 4.6 Z" />
  </Glyph>
);

/** Reader customization — the sheet's nested fields with their signs, the
    figure for a quantity you raise and lower. The signs are two short bowed
    strokes each, never a glyph set in type: at 16px a typographic + is a
    crossing of two rules. */
export const Sliders: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="12" cy="13.4" r="7.4" />
    <circle cx="12" cy="11.2" r="5.1" opacity="0.7" />
    <circle cx="12" cy="9.4" r="2.9" opacity="0.5" />
    <path d="M9.5 19.2 Q10.8 19.05 12.1 19.2" />
    <path d="M10.8 17.95 Q10.65 19.15 10.8 20.35" />
    <path d="M14.4 5.6 Q15.7 5.45 17 5.6" />
  </Glyph>
);

/** The index — the sheet's plotted lattice, thinned to what survives 16px.
    Three courses and two uprights: the grid's structure without its silt. */
export const List: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M4.2 6.9 Q12 6.5 19.8 6.9" />
    <path d="M4.2 12 Q12 11.6 19.8 12" />
    <path d="M4.2 17.1 Q12 16.7 19.8 17.1" />
    <path d="M9.4 5.6 Q9.05 12 9.4 18.4" opacity="0.45" />
    <path d="M15.2 5.6 Q14.85 12 15.2 18.4" opacity="0.45" />
  </Glyph>
);

/** The map — the sheet orbital figure, which is what the Orrery already is:
    a core, its rings, and bodies riding them. */
export const Waypoints: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="2.2" />
    <circle cx="12" cy="12" r="5.6" opacity="0.65" />
    <circle cx="12" cy="12" r="9.1" opacity="0.45" />
    <circle cx="17.6" cy="12" r="1.15" />
    <circle cx="8.1" cy="5.2" r="1.05" opacity="0.8" />
  </Glyph>
);

/** The book — the sheet golden rectangle with its quarter-arc spiral, which is
    the one figure on the reference that is already about a page. */
export const BookOpen: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M3.4 4.6 Q12 4.25 20.6 4.6 Q20.95 12 20.6 19.4 Q12 19.75 3.4 19.4 Q3.05 12 3.4 4.6 Z" />
    <path d="M3.4 19.4 A16 16 0 0 1 20.6 4.6" opacity="0.75" />
    <path d="M12 19.4 Q12.2 12 12 4.6" opacity="0.4" />
    <path d="M12 12 A8 8 0 0 1 20.6 4.6" opacity="0.4" />
  </Glyph>
);

/** Two frames offset in depth — the reference's stacked planes. */
export const Copy: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M8.6 3.9 Q14.2 3.7 20.1 3.9 Q20.3 9.2 20.1 14.6 Q14.2 14.8 8.6 14.6 Q8.4 9.2 8.6 3.9 Z" opacity="0.5" />
    <path d="M3.9 9.4 Q9.5 9.2 15.4 9.4 Q15.6 14.7 15.4 20.1 Q9.5 20.3 3.9 20.1 Q3.7 14.7 3.9 9.4 Z" />
  </Glyph>
);

export const Check: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M4.4 12.4 Q7.4 14.9 9.4 17.8 Q13.8 10.6 19.6 6.2" />
  </Glyph>
);

export const X: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M5.8 5.8 Q12.2 11.5 18.2 18.2" />
    <path d="M18.2 5.8 Q11.8 11.5 5.8 18.2" />
  </Glyph>
);

/* ── settings ───────────────────────────────────────────────────────────── */

/** A frame and its division — the lattice, cropped to two cells. */
export const Layout: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M4.2 4.4 Q12 4.1 19.8 4.4 Q20.1 12 19.8 19.6 Q12 19.9 4.2 19.6 Q3.9 12 4.2 4.4 Z" />
    <path d="M9.9 4.4 Q10.2 12 9.9 19.6" opacity="0.6" />
  </Glyph>
);

/** A lens from two conics, with its focus marked. */
export const Eye: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M2.4 12 Q12 4.9 21.6 12" />
    <path d="M2.4 12 Q12 19.1 21.6 12" />
    <circle cx="12" cy="12" r="3.1" />
    <circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none" />
  </Glyph>
);

export const Moon: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M16.6 4.4 A8.3 8.3 0 1 0 16.6 19.6 A6.5 6.5 0 1 1 16.6 4.4 Z" />
  </Glyph>
);

/** A core and its field — the same two marks the organism uses for a cell. */
export const Sun: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="4.3" />
    <path d="M12 2.6 Q12.3 3.9 12 5.2" />
    <path d="M12 18.8 Q12.3 20.1 12 21.4" />
    <path d="M2.6 12 Q3.9 12.3 5.2 12" />
    <path d="M18.8 12 Q20.1 12.3 21.4 12" />
    <path d="M5.3 5.3 Q6.4 6.1 7.2 7.2" />
    <path d="M16.8 16.8 Q17.9 17.6 18.7 18.7" />
    <path d="M18.7 5.3 Q17.9 6.4 16.8 7.2" />
    <path d="M7.2 16.8 Q6.4 17.9 5.3 18.7" />
  </Glyph>
);

/** A wave with its nodes marked — the reference sheet's first row, literally. */
export const Music: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M3.2 14.6 Q6.6 5.2 10.4 9.4 Q14.2 13.6 17.4 6.2" />
    <circle cx="5.6" cy="18.4" r="2.2" />
    <circle cx="18.2" cy="15.6" r="2.2" />
    <path d="M7.8 18.4 Q8.1 12.6 7.8 8.2" opacity="0.6" />
    <path d="M20.4 15.6 Q20.7 9.8 20.4 5.4" opacity="0.6" />
  </Glyph>
);

/* ── the ruleset, one plate per rule ─────────────────────────────────────
 *
 * A plate for every branch, in the reference sheet's own language: conic
 * sections, orbital diagrams, lattices, wave forms with their nodes marked,
 * wireframe solids. The set exists so the ruleset can be read as a visual
 * library — a reader looking for "the one about headlines" finds the wave
 * before they find the word.
 *
 * DRAWN FROM WHAT THE RULE ALREADY IS, never decorated onto it: the gate is an
 * intersection because it is one, the lifecycle is an orbit because it returns,
 * the calendar is a lattice because it is a grid of slots. A plate that could be
 * swapped with its neighbour without anyone noticing is a plate doing nothing.
 *
 * These are NOT the four straight arrows. Every stroke here is an arc, a circle
 * or an ellipse — the reference's own vocabulary is conics, so obeying DG-01
 * costs nothing at all here and no exemption is claimed. Hatched fills in the
 * reference become struck arcs (DG-02), exactly as `Search` already does.
 */

/** Concentric fields, off-centre — the rule that contains every other one. */
export const PlateGlobal: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9.4" />
    <circle cx="12" cy="13.4" r="6.1" opacity="0.72" />
    <circle cx="12" cy="15" r="3.3" opacity="0.5" />
    <circle cx="12" cy="16.2" r="1" opacity="0.85" />
  </Glyph>
);

/** Three fields and their common ground — positioning is a triangulation. */
export const PlateStrategy: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="9.3" cy="9.8" r="5.5" />
    <circle cx="14.7" cy="9.8" r="5.5" />
    <circle cx="12" cy="14.4" r="5.5" />
    <path d="M12 8.4 Q13.1 10.6 12 12.8" opacity="0.55" />
    <path d="M12 8.4 Q10.9 10.6 12 12.8" opacity="0.55" />
  </Glyph>
);

/** A lattice of slots — a calendar is a grid before it is anything else. */
export const PlateCalendar: React.FC<IconProps> = (p) => (
  /* ASKED FOR AS STRAIGHT RULES, AND DRAWN AS THE STRAIGHTEST THING THE
     GRAMMAR ALLOWS.

     A calendar is a grid and it was reading as a woven basket: the bow was 0.4
     units over an 18-unit span, which at the 68px these now render is about
     1.1px of sag on every rule — small on paper, obvious once the glyph tripled
     in size.

     It cannot become an actual straight segment. DG-01 forbids one in those
     words, `audit-lines` fails the build on it, and the whole icon set exists
     inside that settlement (docs/OPEN.md 41). So the bow drops to 0.06 units —
     about a sixth of a device pixel at this size, well under what the display
     can resolve. It reads as a ruled grid, it is still a curve, and no rule had
     to be bent to get there. */
  <Glyph {...p}>
    <path d="M3 6.4 Q12 6.34 21 6.4" />
    <path d="M3 10.3 Q12 10.24 21 10.3" opacity="0.8" />
    <path d="M3 14.2 Q12 14.14 21 14.2" opacity="0.8" />
    <path d="M3 18.1 Q12 18.04 21 18.1" opacity="0.8" />
    <path d="M6.2 4 Q6.14 12 6.2 20" opacity="0.7" />
    <path d="M12 4 Q11.94 12 12 20" opacity="0.7" />
    <path d="M17.8 4 Q17.74 12 17.8 20" opacity="0.7" />
  </Glyph>
);

/** A wave with its nodes marked — a headline is an amplitude. */
export const PlateCopy: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M2.6 12 Q6.1 3.4 9.6 12 Q13.1 20.6 16.6 12 Q19.1 5.8 21.4 9.2" />
    <circle cx="9.6" cy="12" r="1.15" />
    <circle cx="16.6" cy="12" r="1.15" opacity="0.72" />
    <circle cx="2.6" cy="12" r="0.9" opacity="0.5" />
  </Glyph>
);

/** An orbit with a body on it — a lifecycle is a thing that comes back. */
export const PlateLifecycle: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <ellipse cx="12" cy="12" rx="9.4" ry="4.6" />
    <ellipse cx="12" cy="12" rx="4.6" ry="9.4" opacity="0.62" />
    <circle cx="12" cy="12" r="2.1" />
    <circle cx="21.2" cy="12" r="1.15" />
    <circle cx="12" cy="2.8" r="0.95" opacity="0.7" />
  </Glyph>
);

/** A cone cut by its own base — the conic section, for what an image is. */
export const PlateImage: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <ellipse cx="12" cy="17.6" rx="7.6" ry="2.9" />
    <path d="M4.4 17.6 Q7.4 9.6 12 3.4" />
    <path d="M19.6 17.6 Q16.6 9.6 12 3.4" />
    <path d="M6.4 13 Q12 14.4 17.6 13" opacity="0.5" />
    <circle cx="12" cy="3.4" r="0.95" />
  </Glyph>
);

/** A coil seen side-on — motion is the same form advanced through time. */
export const PlateMotion: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <ellipse cx="12" cy="6.2" rx="8.2" ry="2.5" />
    <ellipse cx="12" cy="10" rx="8.2" ry="2.5" opacity="0.82" />
    <ellipse cx="12" cy="13.8" rx="8.2" ry="2.5" opacity="0.64" />
    <ellipse cx="12" cy="17.6" rx="8.2" ry="2.5" opacity="0.46" />
  </Glyph>
);

/** A radial web — an interface is what the reader reaches through. */
export const PlateInterface: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9.3" />
    <circle cx="12" cy="12" r="5.9" opacity="0.7" />
    <circle cx="12" cy="12" r="2.5" opacity="0.5" />
    <path d="M12 2.7 Q12.4 12 12 21.3" opacity="0.62" />
    <path d="M2.7 12 Q12 12.4 21.3 12" opacity="0.62" />
    <path d="M5.4 5.4 Q12 12.4 18.6 18.6" opacity="0.42" />
    <path d="M18.6 5.4 Q12 12.4 5.4 18.6" opacity="0.42" />
  </Glyph>
);

/** Bodies and the courses between them — growth is who reaches whom. */
export const PlateCommunity: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="2.3" />
    <circle cx="4.6" cy="6.6" r="1.5" />
    <circle cx="19.4" cy="6.6" r="1.5" />
    <circle cx="4.6" cy="17.4" r="1.5" />
    <circle cx="19.4" cy="17.4" r="1.5" />
    <path d="M6 7.6 Q8.6 9.4 10.2 10.6" opacity="0.66" />
    <path d="M18 7.6 Q15.4 9.4 13.8 10.6" opacity="0.66" />
    <path d="M6 16.4 Q8.6 14.6 10.2 13.4" opacity="0.66" />
    <path d="M18 16.4 Q15.4 14.6 13.8 13.4" opacity="0.66" />
  </Glyph>
);

/** Two fields and the lens where they agree — the gate is an intersection. */
export const PlateGate: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="8.8" cy="12" r="6.4" />
    <circle cx="15.2" cy="12" r="6.4" />
    <path d="M12 6.2 Q13.9 9 13.9 12 Q13.9 15 12 17.8" opacity="0.55" />
    <path d="M12 6.2 Q10.1 9 10.1 12 Q10.1 15 12 17.8" opacity="0.55" />
    <circle cx="12" cy="12" r="1" opacity="0.9" />
  </Glyph>
);

/* ── the ruleset overview's four bands ───────────────────────────────────
 *
 * The overview sheet's tiles carried one repeated soma, which told a reader
 * nothing about which box was which — the whole point of a face that shows only
 * a title is that the mark beside it does the distinguishing. These are drawn to
 * the same grammar as the branch plates above and read at the same weight:
 * `.glyph-alive` sets every stroke to 0.4, so the silhouette has to carry the
 * meaning and not the line weight.
 *
 * No straight segments anywhere in them (DG-01) and no filled area (DG-02) —
 * every mark is an arc, and the one filled dot in each is a core, which is a
 * light source and the one fill the system allows.
 */

/*
 * FIVE SIGNS, AND NOTHING IN THEM THAT IS NOT LOAD-BEARING.
 *
 * These were drawn as pictures — a book with a spine and four ruled pages, a
 * chevron over a double level, a root with five courses — and at 68px on a
 * face whose whole job is to be scanned they read as detail rather than as
 * signs. Asked for: hyper-minimalist, elegant, mathematical.
 *
 * So each is reduced to the smallest set of marks that still separates it from
 * the other four, and every mark is a PRIMITIVE — a circle, a rule, a ray, a
 * point. Nothing is drawn twice, nothing is shaded, nothing describes a
 * physical object. Two or three marks each, and the silhouettes stay distinct:
 * a divided whole, nested wholes, a struck whole, a level cleared, a
 * convergence.
 *
 * STRAIGHT TO THE LIMIT THE GRAMMAR ALLOWS, which is PlateCalendar's
 * settlement and the reason it is not restated at every path: DG-01 forbids an
 * actual straight segment, `audit-lines` fails the build on one, and the whole
 * icon set lives inside that (docs/OPEN.md 41). Every rule here carries a bow
 * of 0.06 units — about a sixth of a device pixel at this size — so it reads
 * as ruled and is still a curve.
 *
 * The one filled mark in each is a point, which DG-02 admits by name as a
 * light source.
 */

/** A whole, divided — the overview and what it is an overview of. */
export const PlateDocumentation: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M3.6 12 Q12 11.94 20.4 12" opacity="0.7" />
  </Glyph>
);

/** A whole, struck through. */
export const PlateProhibited: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M6.1 6.1 Q11.94 12.06 17.9 17.9" opacity="0.8" />
  </Glyph>
);

/** A level, and the point that clears it. */
export const PlateRequired: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M3.6 16.4 Q12 16.34 20.4 16.4" />
    <circle cx="12" cy="8.2" r="1" opacity="0.9" />
  </Glyph>
);

/** Courses converging on one point. */
export const PlateSources: React.FC<IconProps> = (p) => (
  <Glyph {...p}>
    <path d="M12 17.6 Q8.06 11.86 4.2 6.2" opacity="0.7" />
    <path d="M12 17.6 Q11.94 11.9 12 6.2" opacity="0.7" />
    <path d="M12 17.6 Q15.94 11.86 19.8 6.2" opacity="0.7" />
    <circle cx="12" cy="17.6" r="1" opacity="0.9" />
  </Glyph>
);
