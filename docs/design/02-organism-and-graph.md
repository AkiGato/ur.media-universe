# The Organism and Its Graph · `OG`

What connects to what, and how a connection is drawn. The map is one graph drawn by one routine; these rules keep it one, keep it oriented, and keep its anatomy at the scale that anatomy actually reads.

[← index](00-index.md)

---

## OG-01 — One Organism, One Routine

The map is a single connected graph — core, chapters, their section satellites, and filler cells are all the same kind of node at different scales, and every connection is drawn by the same `tissue()` routine. Never add a second drawing layer for a "path" or a "chain"; emphasis is opacity on the same edges. A connection is ONE process, not a bundle. The bundle — a halo bed under three splaying filaments — rested on the premise that a single path always reads as a precise drawn line, and the premise was wrong: one line reads as living when it *meanders continuously and branches*, which is what the arbors already do. Multiplicity then buys nothing and costs everything, being the difference between a drawing of a connection and a rope, and at map scale a hundred ropes are a thicket. So: a single meandering process, drawn in two chained pieces so it can taper (trunks near 1.3 against twigs at 0.22–0.34; the range and how it is spent belong to **Hierarchy Is Generations, Not a Ratio**), with sparse seeded varicosities along it and one bright terminal where it lands. Direction is read from thickness. Wander amplitude must scale with span length, and the envelope must reach zero at both ends (so strands stay attached) via a fractional power, never a floor — a floored envelope detaches the strand from its node.

## OG-02 — Nothing Floats

Every element on the map must be visibly grown into the tissue. All interactive nodes — including auxiliary ones like the bibliography — belong in `NODES` so proximity wiring reaches them; never render a marker at a fixed position outside the graph. Edge building ends with a component walk that bridges any island to its nearest neighbour, so the graph is provably one organism. Verify with a DOM audit that reconstructs the graph from rendered geometry and BFS-checks reachability — an isolated bibliography node survived several rounds of "looks connected" before that audit caught it.

## OG-03 — A Connection Has a Direction

A synapse is not a symmetric wire. Every edge is oriented pre → post — the endpoint fewer hops from the core is presynaptic, so signal travels outward with the tide, and ties break on geometric distance. The map says that with **taper alone**: full width at the source, thinning as it goes. It used to say it with drawn polarity marks — an axon hillock at the pre end, a terminal arborisation of boutons and postsynaptic densities at the post end — and that was real anatomy, correctly drawn, and invisible at every zoom level anyone actually reads the map at, for five to twenty elements on each of 232 links. Keep the polarity; spend nothing on saying it twice.

## OG-04 — Crossings Must Fuse

A complete graph is not enough — two strands that merely cross each other read as unrelated ribbons laid over one another, which is what makes regions look disconnected even when every node is reachable. Every genuine crossing between strands (graph edges *and* ruleset roots — long roots sweeping open space are the worst offenders) gets a small **bipolar interneuron** relaying between them: a spindle-shaped cell body lying along the bisector of the two fibres, with neurites running out of both poles into each direction of each fibre. An abstract lit star fused the crossing with a graphic device; a cell fuses it with anatomy. Sharing a node is not grounds to skip a pair: two strands leaving the same soma still cross far out in open space. Only a crossing landing *on* a soma is already resolved. Keep halo strokes narrow (~1–2px); a wide soft stroke over a long span stops reading as glow around fibre and becomes a grey smoke ribbon.

## OG-05 — A Mesh Closes Its Cells; A Graph Does Not

The third reference is a slime-mould plasmodium, and the one feature that separates it from the two neurite references is that its fine veins **anastomose** — they loop back into each other, so most of the gaps between them are *enclosed cells*, bounded on all sides. The neurites are pure trees: nothing rejoins, and every gap is open ground. That closure is where the reference's density and material substance come from, and it is the largest idea in the reference set that the drawing has never used. The test is negative space: if the gaps are background, it is a tree; if most gaps are bounded, it is a mesh. The map's *topology* already has cycles — nearest-neighbour wiring makes them and the component-bridging walk adds more — but no enclosed region ever reads as enclosed, because the loops are too large and too irregular to register as cells. **Reticulation is confined to filler tissue**: minor cells, arbor peripheries, the backdrop. It must never be applied to a semantic edge. The map's connections mean something, so a loop closed between chapter cells asserts a relationship that does not exist, and the drawing would be lying to make itself denser. Closed mesh is texture where nothing is being claimed, and nowhere else.

## OG-06 — Dendrites Wear Spines

The stubby bulb-headed protrusions on the mid-distal arbor are the single feature separating a dendrite from a generic branching line. `Dendrites` takes an opt-in `spines` prop (it roughly doubles an arbor's element count, so it belongs on the chapter somas and the core only), and only the `depth === 2` generation wears them — a spiny primary trunk is anatomically wrong and spining every segment buys nothing at the proximal end. Free-ending processes terminate in a `GrowthCone`, never fading out: a neurite that just stops reads as a line that ran out of canvas. **The one exception is a ray field**: its segments dim to nothing by design (see **A Field Is Rays; A Cell Is an Arbor**) because there the fade is space continuing past the sheet, not a process running out of canvas — a growth cone at every ray tip would mark an edge on the one thing that must not have one. Arbors always terminate.

## OG-07 — Myelin Belongs Where the Scale Carries It

An unbroken hairline is the one thing a long axon never looks like — segmented internodes, a pale sheath fattening the fibre and tapering distally, separated by bare **nodes of Ranvier**. This is right at single-cell scale and wrong at map scale: on the map it is one more thing drawn per link across 232 links and invisible at any zoom a reader uses, so the map spends its width budget on the taper instead. It lives in `ChapterOpener.tsx`, which draws ONE axon at roughly a hundred times map size, where every internode reads.

## OG-08 — Light Goes Both Ways as a Relay, Never as Two Arrows

Where neither end of a connection is the source — you produce, they produce — set `both` on the edge. Stations along the fibre share the `.ranvier` clock and take a delay from their position, so a spike leaps outward; a second set of stations at the same coordinates, delayed by half the period and counted in reverse, leaps back. **Every mark stays exactly where it is and only its brightness changes**, which keeps this inside **Never a Travelling Dash** and makes it the same saltatory device the map already uses. A larger negative delay fires *earlier*, so the outward sweep counts down from the far end and the return counts up — get this backwards and both sweeps run the same way. A `both` edge draws no terminal bouton: a terminal marks where a process lands, and a process that lands at both ends has no terminal to mark.
