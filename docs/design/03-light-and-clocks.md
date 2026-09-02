# Light and Clocks · `LC`

How light moves, and what may keep time. Light travels by phase and never by motion; every clock in the app is derived rather than chosen, and one period is fixed.

[← index](00-index.md)

---

## LC-01 — The Luminance Tide

Light travels by *phase*, not by motion. Every strand shares one breathing period (`TIDE`, matching `.strand-breathe`) and takes its phase from its distance to the core via `tidePhase()`, so brightening rolls outward as a wave with no moving object and no ends. Somas and root arms ride the same clock, phased at their own midpoints, so the wave passes *through* them. Never give a strand a random breathing offset again — that is shimmer, not a tide.

## LC-02 — Never a Travelling Dash

Do not animate `stroke-dashoffset` to send light along a strand. A lit dash segment has two ends, and those ends always read as a bright capsule — a worm — sliding over the drawing rather than light living inside it. No amount of softening fixes it: layering translucent strokes on identical geometry makes the opacities *sum to opaque*, and round caps on a wide stroke round the ends into a pill. Light lives in the desynchronised swell of every strand (`.strand-breathe`) and in the edgeless glow at the somas. Expanding concentric rings around a node are equally forbidden — they read as a ripple effect, not a nervous system.

**The sanctioned mechanism is saltatory conduction.** (This was a second rule, *Saltatory Conduction, Not Travelling Dashes*, whose whole content was the exception this one leaves open. Merged here so the prohibition and its one permitted answer cannot drift apart.)

Wherever nodes of Ranvier are drawn, they share a period and take a delay from their position along the fibre, so the spike appears to leap distally. Nothing moves and nothing has ends — each node simply fires later than the one behind it, which is exactly what the real thing does, and it is the only honest way to send light along a strand under **Never a Travelling Dash**. Spikes run on their own clock (`SPIKE`), never the tide's: the tide is the slow metabolic swell of the whole organism, a spike is a fast discrete event, and sharing a period would collapse them into one effect. The keyframe rises in ~3% and falls in ~11%; a spike that eases in and out is a swell.

## LC-03 — One Clock For The Whole App

The reader's ambience breathes on the map's tide — the same 19.7s period, phased by distance from the centre of the sheet — so crossing between map and reader never puts the organism out of step with itself. Never give the reader its own cycle again.

## LC-04 — Irrational Periods

No two clocks on the map may share a simple integer ratio, or the combined image eventually betrays itself as a loop. Derive durations through `period(base, seed)`, which offsets by the golden ratio. Measured: 131 distinct periods, only 5% of pairs in near-integer ratio.

## LC-05 — A Two-Stop Keyframe Is a Metronome

Symmetric rise and fall is what a machine does; the eye finds the beat within a cycle and the motion stops holding attention. Every breathing keyframe is asymmetric — filling faster than it empties, cresting off centre, holding at the trough — and carries a smaller counter-swell so one cycle offers two events. Superpose clocks whose ratio does not resolve (the flex filter's 41.3s frequency against its 67.1s amplitude repeats only every ~46 minutes). **The 19.7s tide period is fixed**: it is shared by every strand and matched by `TIDE` in `Orrery.tsx`. Reshape the contour freely; change the number and the wave falls apart.
