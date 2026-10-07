/**
 * Which way the map's tissue is drawn.
 *
 * THE PARTICLE MAP IS THE MAP NOW. The organism's tissue is the baked point
 * cloud (`tissueCloud.ts`) on one canvas; `?tissue=drawn` brings back the
 * stroked SVG tissue it replaced. The comparison this flag was built for has
 * been made, and the decision it was holding open is taken — see
 * `docs/OPEN.md` 32 and 37 for what was decided and what it cost.
 *
 * The drawn map is kept rather than deleted, and not out of sentiment. It is
 * the reference the particle map is measured against: DG-05's four separable
 * generations come from stroke width in one and from spacing and brightness in
 * the other, and the only way to tell whether that translation still holds
 * after a change to the arbor generator is to put the two side by side. A
 * renderer with no reference drifts and nobody can say when.
 *
 * Read once, at module load. A mode that could change mid-session would mean
 * both renderers alive at once on the app's heaviest surface, for a comparison
 * a reload makes just as well.
 */
export type TissueMode = 'drawn' | 'particles';

function decide(): TissueMode {
  if (typeof window === 'undefined') return 'particles';
  try {
    const q = new URLSearchParams(window.location.search).get('tissue');
    return q === 'drawn' ? 'drawn' : 'particles';
  } catch {
    return 'particles';
  }
}

export const TISSUE_MODE: TissueMode = decide();
export const PARTICLE_TISSUE = TISSUE_MODE === 'particles';
