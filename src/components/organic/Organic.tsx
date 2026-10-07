import React, { useId } from 'react';

/**
 * Organic chrome for the reader — the map's vocabulary, applied to a page.
 *
 * The map draws no rectangles and no rules: a connection is a filament that
 * bows, fades to nothing at both ends and carries beads of light, and a node
 * is a glow with no rim. Everything here is that same grammar at page scale,
 * so the reader and the Orrery read as one organism rather than a diagram
 * bolted onto a document.
 */

/** The one curve — the map's. See --ease-organic in index.css. */
const EASE = 'cubic-bezier(0.45, 0.05, 0.3, 1)';

/** Zero-length strokes are unreliable across engines; a hair of length with a
 *  round cap is a dependable dot, and non-scaling stroke keeps it circular
 *  however hard the viewBox is stretched. */
const dot = (x: number, y: number) => `M ${x} ${y} L ${x + 0.01} ${y}`;

/**
 * A vein — the divider. Never a straight rule: it bows, its brightness reaches
 * zero at both ends so it stays attached to nothing, and beads ride it.
 */
export const Vein: React.FC<{
  orientation?: 'h' | 'v';
  /** peak opacity at the swell */
  opacity?: number;
  /** phase offset in seconds, so no two veins on a page breathe in step */
  phase?: number;
  className?: string;
}> = ({ orientation = 'h', opacity = 0.55, phase = 0, className = '' }) => {
  const gid = `vein-${useId().replace(/:/g, '')}`;
  const horizontal = orientation === 'h';

  const stops = (
    <>
      <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
      <stop offset="14%" stopColor="currentColor" stopOpacity={opacity * 0.35} />
      <stop offset="50%" stopColor="currentColor" stopOpacity={opacity} />
      <stop offset="86%" stopColor="currentColor" stopOpacity={opacity * 0.35} />
      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
    </>
  );

  if (horizontal) {
    return (
      <svg
        viewBox="0 0 1000 8"
        height={8}
        preserveAspectRatio="none"
        className={`block w-full flex-shrink-0 vein-breathe ${className}`}
        style={{ animationDelay: `-${phase}s`, overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">{stops}</linearGradient>
        </defs>
        {/* the strand — a live bow, never a dead horizontal */}
        <path
          d="M 0 5.4 Q 260 2.1 520 4.2 T 1000 3.2"
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={0.9}
          vectorEffect="non-scaling-stroke"
        />
        {/* beads riding the strand */}
        <path d={dot(318, 3.1)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"
          opacity={opacity * 0.85} vectorEffect="non-scaling-stroke" />
        <path d={dot(662, 3.7)} stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"
          opacity={opacity * 0.6} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 8 1000"
      width={8}
      preserveAspectRatio="none"
      className={`block h-full flex-shrink-0 vein-breathe ${className}`}
      style={{ animationDelay: `-${phase}s`, overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">{stops}</linearGradient>
      </defs>
      <path
        d="M 4.6 0 Q 1.8 260 3.8 520 T 3.0 1000"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={0.9}
        vectorEffect="non-scaling-stroke"
      />
      <path d={dot(2.9, 318)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"
        opacity={opacity * 0.85} vectorEffect="non-scaling-stroke" />
      <path d={dot(3.5, 662)} stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"
        opacity={opacity * 0.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

/**
 * A soma — the glowing cell that anchors a label. Replaces every badge, pill
 * and square bullet: a mark made of light instead of a little box.
 */
export const Soma: React.FC<{
  size?: number;
  opacity?: number;
  /** breathing phase in seconds */
  phase?: number;
  className?: string;
}> = ({ size = 10, opacity = 1, phase = 0, className = '' }) => {
  const gid = `soma-${useId().replace(/:/g, '')}`;
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      className={`flex-shrink-0 vein-breathe ${className}`}
      style={{ animationDelay: `-${phase}s`, overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gid}>
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.85 * opacity} />
          <stop offset="34%" stopColor="currentColor" stopOpacity={0.2 * opacity} />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="6" cy="6" r="6" fill={`url(#${gid})`} />
      <circle cx="6" cy="6" r="1.15" fill="currentColor" opacity={0.9 * opacity} />
      {/* two hairs of dendrite, so the mark is grown into the page and not
          dropped onto it */}
      <path d="M 6 6 Q 9.4 4.6 11.6 6.6" fill="none" stroke="currentColor"
        strokeWidth={0.4} opacity={0.4 * opacity} />
      <path d="M 6 6 Q 3.1 7.6 0.5 6.2" fill="none" stroke="currentColor"
        strokeWidth={0.35} opacity={0.28 * opacity} />
    </svg>
  );
};

/** A soma with a micro-label beside it — the map's caption form. */
export const SomaLabel: React.FC<{
  children: React.ReactNode;
  opacity?: number;
  phase?: number;
  className?: string;
}> = ({ children, opacity = 0.7, phase = 0, className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 ${className}`} style={{ opacity }}>
    <Soma size={9} phase={phase} />
    <span className="text-[9px] font-light uppercase tracking-[0.2em] leading-none">{children}</span>
  </span>
);

/**
 * A progress filament — the reading position as light travelling through a
 * strand, with a luminous head where the tide has reached.
 */
/**
 * The reading strand, at two scales on one element.
 *
 * The strand said where you are in the whole book and nothing about the chapter
 * you are actually in — which is the question a reader actually has, and the
 * one the book's own argument about a finite attention budget should answer.
 *
 * Rather than a second readout (which would be two instruments saying one
 * thing — TY-05, A Name Is Said Once), the same gradient carries both:
 * the current chapter's span is lifted out of the ground on either side of it,
 * so the strand shows where the chapter began, where you are inside it, and how
 * much of it is left. Extent, never percentage — the lit span is a fact about
 * the text, where a completion figure would be a score about the reader.
 */
export const ProgressStrand: React.FC<{
  progress: number;
  /** the current chapter's span, as fractions of the whole book */
  chapterFrom?: number;
  chapterTo?: number;
  className?: string;
}> = ({
  progress,
  chapterFrom,
  chapterTo,
  className = ''
}) => {
  const gid = `prog-${useId().replace(/:/g, '')}`;
  const t = Math.max(0, Math.min(100, progress)) / 100;

  /* Offsets in a linearGradient must not go backwards, so the stops are built
     as a list and then clamped into order. A chapter that starts at the head
     (the first page of one) would otherwise emit a reversed pair. */
  const pct = (v: number) => Math.max(0, Math.min(100, v));
  const hasChapter =
    typeof chapterFrom === 'number' && typeof chapterTo === 'number' && chapterTo > chapterFrom;
  const h = t * 100;
  const cf = hasChapter ? pct(chapterFrom! * 100) : 0;
  const ct = hasChapter ? pct(chapterTo! * 100) : 100;

  /** [offset, opacity] — read outside the chapter, read inside it, the head,
      the chapter still to come, and the book beyond it */
  const raw: Array<[number, number]> = hasChapter
    ? [
        [0, 0.09],
        [cf - 0.4, 0.09],
        [cf, 0.3],
        [h - 1.5, 0.34],
        [h, 0.95],
        [h + 0.6, 0.24],
        [ct, 0.24],
        [ct + 0.4, 0.05],
        [100, 0.05]
      ]
    : [
        [0, 0.12],
        [Math.max(2, h - 26), 0.55],
        [h, 0.95],
        [Math.min(100, h + 0.6), 0.1],
        [100, 0.06]
      ];

  let last = 0;
  const stops = raw.map(([o, op]) => {
    const at = Math.max(last, pct(o));
    last = at;
    return { at, op };
  });
  // the head rides the same bow the strand is drawn on
  const hx = t * 1000;
  const hy = 5.4 + (3.2 - 5.4) * t - Math.sin(t * Math.PI) * 2.6;

  return (
    <svg
      viewBox="0 0 1000 10"
      height={10}
      preserveAspectRatio="none"
      className={`block w-full ${className}`}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          {stops.map((s, i) => (
            <stop key={i} offset={`${s.at}%`} stopColor="currentColor" stopOpacity={s.op} />
          ))}
        </linearGradient>
      </defs>
      <path
        /* THE LINE OF NAVIGATION IS A RULE, SO IT IS RULED.
           It wandered by 2.6 units over a 1000-unit span, which is a meander on
           the one mark in the app whose whole job is to say how far along you
           are — a position read against a wavy datum is a position you cannot
           read. Straight to the limit the grammar allows: a 0.06 bow, which is
           PlateCalendar's settlement and keeps DG-01 untouched. */
        d="M 0 4.2 Q 500 4.14 1000 4.2"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        style={{ transition: `stroke 0.9s ${EASE}` }}
      />
      <path
        d={dot(hx, hy)}
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.95}
        vectorEffect="non-scaling-stroke"
        style={{ transition: `d 0.9s ${EASE}` }}
      />
    </svg>
  );
};

