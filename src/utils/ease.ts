/**
 * The app's one curve, evaluated in JS.
 *
 * MO-02 — every easing in the app is `--ease-organic`, defined once in
 * `src/index.css`. Anything driving motion from JS rather than from CSS has to
 * evaluate the same cubic itself, and that solver was written twice before this
 * file existed. Once is enough: a second copy is a second place for the curve
 * to drift, and a curve that drifts is the rule quietly broken.
 */
export const EASE_ORGANIC = 'cubic-bezier(0.45, 0.05, 0.3, 1)';

const [X1, Y1, X2, Y2] = [0.45, 0.05, 0.3, 1];

const CX = 3 * X1;
const BX = 3 * (X2 - X1) - CX;
const AX = 1 - CX - BX;
const CY = 3 * Y1;
const BY = 3 * (Y2 - Y1) - CY;
const AY = 1 - CY - BY;

/**
 * y at x, for the curve above.
 *
 * Newton from x as the first guess — six iterations is far past convergence for
 * a curve this gentle, and a fixed count keeps the cost of a call constant,
 * which matters where this runs once per particle per frame.
 */
export function easeOrganic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let u = t;
  for (let i = 0; i < 6; i++) {
    const x = ((AX * u + BX) * u + CX) * u - t;
    const dx = (3 * AX * u + 2 * BX) * u + CX;
    if (Math.abs(dx) < 1e-6) break;
    u -= x / dx;
  }
  u = Math.max(0, Math.min(1, u));
  return ((AY * u + BY) * u + CY) * u;
}
