# Performance · `PF`

Five rules, each written from a measured regression on this specific drawing. The numbers are the point — every one of them was a frame rate or an element count someone actually observed, and three of them were catastrophic.

[← index](00-index.md)

---

## PF-01 — A Frame Budget Must Be Calibrated Against the Design Target, Not Against 60fps

This map's intended steady state is ~20fps (≈50ms) with the flex filter on — that is the tuned number, not a fault. `useFrameBudget` exists for the 6fps and 1fps regressions recorded above, so its threshold is 85ms. A stricter budget trips on a healthy machine and silently strips the filter, the sway and the dive for everyone.

## PF-02 — transform-box: view-box, Never fill-box

`fill-box` makes the browser measure a group's bounding box every frame. On the dendrite groups this alone collapsed the map from 47fps to **1fps** with 2-second frames. Always use `view-box` and pass an explicit `transform-origin` in user units; build geometry in absolute coordinates so no wrapper `translate` confuses the origin.

## PF-03 — Filters Are Cheap; Transforms On Big Groups Are Not

A `transform` animation on a group re-rasterises *every descendant* each frame — on the ~6000-element organism that measured **6fps**. A `filter` is a single pass over the already-rasterised group: an animated `feTurbulence` + `feDisplacementMap` over the same 6000 elements cost **1fps** (21 → 20) and gives the tissue genuine flexing geometry. So: organism-wide motion goes through filters or opacity, never through transforms. Transforms are for small groups only (individual somas, the backdrop).

## PF-04 — Bloom Costs Frames

Never apply the Gaussian `-glow` filter to a group that animates or contains many elements — re-filtering a large blurred region every frame turns fluid motion into jank (measured: 30fps → 57fps by removing it from the spinning and swaying groups). Reserve bloom for small, bright, static marks: the core emitter and the firing pulses. `Dendrites` takes an opt-in `glow` prop, defaulting off.

## PF-05 — A Retired Renderer Is Unmounted, Not Hidden

`display: none` buys the paint and nothing else. The node is still constructed, still held in memory, and still walked by the framework on every re-render of its owner — which on the map is every pan, every zoom and every hover.

Measured on the default (particle) path, which retires the drawn tissue through `.tissue-particles .fibre-ink, .arbor-ink { display: none }`: **20,552 SVG nodes under `.tissue-live`, of which 10,302 — almost exactly half the organism — were inside a `display: none` subtree and could not be seen by anyone.** A cold `getBBox()` over that group cost **281ms**. Gating the same branches on `PARTICLE_TISSUE` instead took the group to **10,250 nodes (-50%)**, the whole document to **10,404 (-50.5%)**, and the same cold `getBBox()` to **5.7ms (-98%)**. The drawing is unchanged by construction — the only marks removed are ones the stylesheet was already hiding — and settled screenshots before and after are identical.

So the stylesheet may express *that* a renderer is retired, but it may not be the thing that retires it. Gate the branch, so the geometry generator never runs and the marks are never built; keep the CSS as the statement of intent. `?tissue=drawn` must still bring the whole drawn map back, so the gate is on the mode, never deleted.
