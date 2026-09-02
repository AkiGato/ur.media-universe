# Method · `ME`

How a rule in this file is established, checked and overturned. One rule, cited as law by two others long before it was written down.

[← index](00-index.md)

---

## ME-01 — Verify by Measurement, Not by Eye

Cited as law by **Black, White, and One Temperature of Light** (GR-05) and by **Blur a Line, Never a Mass** (GR-07), and never actually written down until this file existed. Nearly every perceptual rule here regressed at least once *while looking fine*, which is the whole argument: the eye adapts to the surface it has been staring at, and what it adapts to fastest is a slow lift in the ground.

So wherever a rule has a threshold, the threshold is a number, the number is measured, and the measurement is recorded beside it. A rule stated as a preference is one that will be argued with at the next call site; a rule stated as a gate either passes or does not.

A gate takes one of three forms here.

- **Rasterise and difference.** Where the question is whether something lifted the ground or tinted the ink, render the surface twice — with the pass and without it, or with the live stops and forced to white — and difference them. In force: ground luma within 3/255 across non-drawing pixels (GR-07); mean saturation under 22%, max ≤ 22%, no pixel's luma moving more than 12/255 (GR-05).
- **Sweep the rendered DOM.** Where the question is whether a rule holds across every instance, enumerate the instances from the rendered page, never from the source. In force: reachability from the core (OG-02); `<text>` rect collisions and frame overruns (TY-08); every rendered element reporting 9, 12 or 18 (TY-02); every `<button>` at 44px or more under touch emulation (MO-08). `scripts/audits/runtime/` holds the first two.
- **Count, or take a profile.** Where the question is cost or distribution, count elements or profile them across the sheet. In force: element budgets before any change to a density constant (DG-06); the radial coverage profile that must fall smoothly and then plateau with ink still arriving at the frame's corners (DG-08); frame timings against the design target rather than against 60fps (PF-01).

Three things follow from that.

**A measurement that has been taken is recorded with its value.** "131 distinct periods, only 5% of pairs in near-integer ratio"; "mean 2.46%, max 15.79%, zero pixels shifted"; "7,564 → 8,057 elements (+6.5%)". The number in the rule is what lets the next person tell a regression from a redesign.

**A measurement that cannot be automated is still a measurement.** Two of the three audits are console-paste scripts, because the alternative was installing a headless browser into a project that has deliberately avoided one. Pasted before shipping is fine. Skipped is not.

**When the measurement and the eye disagree, the measurement wins, and the change comes out however good it looked.** That has already happened twice: a pair of halo stops at 27% chroma was softened rather than argued for, and a soft pass that lifted the black was removed. Neither was reversed afterwards.
