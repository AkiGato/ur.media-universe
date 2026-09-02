import React from 'react';

/**
 * A "data flower" — a dandelion-like filament burst drawn as pure SVG.
 * Deterministic geometry (no randomness) so it renders identically every time.
 *
 * It stands on a page as a mark, never behind one. The full-viewport ambience
 * layer this used to share a file with is gone: a grid and three drifting
 * flowers laid behind the reading were decoration on the ground, which
 * GR-02 (Plain Ground) does not allow.
 */
export const DataFlower: React.FC<{
  size?: number;
  rays?: number;
  className?: string;
  strokeOpacity?: number;
}> = ({ size = 420, rays = 36, className = '', strokeOpacity = 1 }) => {
  const c = size / 2;
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    // deterministic length variation
    const wobble = 0.72 + 0.24 * Math.abs(Math.sin(i * 2.399963));
    const r = c * 0.86 * wobble;
    const x = c + Math.cos(angle) * r;
    const y = c + Math.sin(angle) * r;
    const midX = c + Math.cos(angle + 0.05) * r * 0.55;
    const midY = c + Math.sin(angle + 0.05) * r * 0.55;

    elements.push(
      <path
        key={`ray-${i}`}
        d={`M ${c} ${c} Q ${midX} ${midY} ${x} ${y}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.6}
        opacity={0.5 * strokeOpacity}
      />,
      <circle key={`tip-${i}`} cx={x} cy={y} r={1.6} fill="currentColor" opacity={0.8 * strokeOpacity} />,
      <circle
        key={`seed-${i}`}
        cx={c + Math.cos(angle) * r * 0.72}
        cy={c + Math.sin(angle) * r * 0.72}
        r={0.8}
        fill="currentColor"
        opacity={0.45 * strokeOpacity}
      />
    );

    // secondary filament fork at the tip
    const forkAngle = angle + 0.09;
    const fx = c + Math.cos(forkAngle) * r * 1.06;
    const fy = c + Math.sin(forkAngle) * r * 1.06;
    // The fork bows like every other filament — a straight segment reads as
    // drafting, not tissue (DG-01, Never a Straight Line).
    const fmx = (x + fx) / 2;
    const fmy = (y + fy) / 2;
    const fdx = fx - x;
    const fdy = fy - y;
    const flen = Math.hypot(fdx, fdy) || 1;
    const bow = flen * 0.18;
    elements.push(
      <path
        key={`fork-${i}`}
        d={`M ${x} ${y} Q ${fmx - (fdy / flen) * bow} ${fmy + (fdx / flen) * bow} ${fx} ${fy}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.4}
        strokeLinecap="round"
        opacity={0.3 * strokeOpacity}
      />,
      <circle key={`fork-tip-${i}`} cx={fx} cy={fy} r={0.9} fill="currentColor" opacity={0.5 * strokeOpacity} />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* faint concentric halos */}
      <circle cx={c} cy={c} r={c * 0.86} fill="none" stroke="currentColor" strokeWidth={0.3} opacity={0.14 * strokeOpacity} />
      <circle cx={c} cy={c} r={c * 0.55} fill="none" stroke="currentColor" strokeWidth={0.3} opacity={0.1 * strokeOpacity} />
      {elements}
      {/* luminous core */}
      <circle cx={c} cy={c} r={5} fill="currentColor" opacity={0.9 * strokeOpacity} />
      <circle cx={c} cy={c} r={11} fill="none" stroke="currentColor" strokeWidth={0.7} opacity={0.4 * strokeOpacity} />
    </svg>
  );
};
