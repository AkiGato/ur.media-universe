/**
 * How much organism this device can carry, decided before the first frame.
 *
 * The frame-budget probe (`useFrameBudget`) measures what is actually happening
 * and is the right instrument for that — but it can only react *after* ~1.6s of
 * real frames, which means a weak device spends its first two seconds building
 * and animating ~8,000 SVG nodes before anything is allowed to shed load. That
 * is exactly the window in which a first impression is formed, and on a phone it
 * is also the window in which the page appears to hang.
 *
 * So complexity is chosen up front from what the platform will tell us for free,
 * synchronously, at module load: no state, no effect, no re-render, and the very
 * first tree React builds is already the right size. The probe stays as the
 * safety net for devices that lie or that are busy for reasons we cannot see.
 *
 * The signals are deliberately coarse. `deviceMemory` and `hardwareConcurrency`
 * are absent on Safari, so their absence must never itself imply "weak" — an
 * unknown device is assumed mid, never low.
 */

export type DeviceTier = 'low' | 'mid' | 'high';

function detect(): DeviceTier {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'mid';

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

  // An explicit request for less motion is also a request for less machinery.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'low';
  // Data-saver is a statement about the device's whole situation, not just bytes.
  if (nav.connection?.saveData) return 'low';

  const cores = nav.hardwareConcurrency;
  const memory = nav.deviceMemory;
  // Physical pixels the compositor has to fill — the cost that actually scales.
  const dpr = window.devicePixelRatio || 1;
  const pixels = window.screen.width * window.screen.height * dpr * dpr;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;

  let score = 0;
  if (cores !== undefined) score += cores >= 8 ? 2 : cores >= 4 ? 1 : -1;
  if (memory !== undefined) score += memory >= 8 ? 2 : memory >= 4 ? 1 : -1;
  // A touch device is usually thermally limited even when its core count is not
  if (coarse) score -= 1;
  // A very high pixel count on a modest chip is the classic stutter combination
  if (pixels > 4_500_000 && (cores ?? 8) < 8) score -= 1;

  if (score <= -1) return 'low';
  if (score >= 2) return 'high';
  return 'mid';
}

/** Decided once. Re-deciding mid-session would rebuild the whole organism. */
export const DEVICE_TIER: DeviceTier = detect();

/**
 * Multiplier applied to every generated element count.
 *
 * Low keeps the same drawing — the same grammar, the same anatomy — with fewer
 * filaments in it. It must never become a different picture: a phone reader and
 * a desktop reader are looking at the same organism, one drawn more sparsely.
 */
export const TIER_DENSITY: Record<DeviceTier, number> = {
  low: 0.45,
  mid: 0.72,
  high: 1
};

export const DENSITY = TIER_DENSITY[DEVICE_TIER];

/** Scale a generated count by the device's density, never below a floor. */
export const scaleCount = (n: number, floor = 3): number =>
  Math.max(floor, Math.round(n * DENSITY));
