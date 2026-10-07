# Motion and Input · `MO`

Idle motion and response are different properties with different budgets: ambient cycles are slow because soft fascination lives there, and anything answering an input lands almost immediately. One curve serves both.

[← index](00-index.md)

---

## MO-01 — Everything Is Alive

Every motion is organic, fluid and elegant — the system should feel like touching moss or grass that lights up, moves and breathes under your hand. Idle motion is **desynchronised** (`aliveStyle()` varies duration and applies a negative delay per element) because synchronised motion reads as machinery. Touch propagates outward through the tissue with a per-distance `transition-delay` rather than snapping. Easing is always `--ease-organic` (see **One Curve**) over ~0.75s, never linear or instant.

## MO-02 — One Curve

Every easing in the app is `--ease-organic` = `cubic-bezier(0.45, 0.05, 0.3, 1)`, the map's curve, defined once in `src/index.css` and mirrored by the `EASE` constant in each component that drives motion from JS. It replaced an ease-out quint that covered most of its distance in the first fifth of the duration: the eye registers rate, not amount, so that leading edge read as aggressive however small the movement, and the reader kept it long after the map had moved on. A curve that starts slowly cannot feel like a flash. The single exception is `--ease-exit`, its deliberate inverse, for motion that is *leaving* — nothing arrives on it. A firing node of Ranvier also keeps `ease-out`, because the spike shape lives in its keyframe and a spike that eases in and out is a swell.

## MO-03 — Neurologically Calm Motion, Instant Response

Calm is an *idle* property; responsiveness is an *input* property, and the two were conflated until interaction response was cut to near-instant (2026-08). Ambient cycles stay slow — breathing, rotations 240s+ and the luminance tide all on the one 19.7s period (LC-05) — because idle motion is what soft fascination lives in. But anything answering an input lands almost immediately: touch response ~0.16–0.2s, excitation ripple 0.04s/hop, page turns 0.2–0.28s, the dive 520ms, the return leg 180ms, glide k=0.34. Respect `prefers-reduced-motion`. Do not slow an interaction down to make it feel organic — the organism is in the idle motion, not in input lag.

## MO-04 — No Light Follows the Pointer

A field carried with the cursor moves whenever the reader moves, so it can never fall out of attention — that is hard fascination by definition, and it is the mechanism this dossier argues against. Touch is answered by the tissue itself, through excitation propagating out from the cell actually reached, and nowhere else.

## MO-05 — Opening a Chapter Is a Dive, Never a Cut

A cut is the one transition with no rate at all, and the eye reads rate — so the calmest map in the world still handed off like a channel change. Touching any cell falls the camera into it (`enter()` in `Orrery.tsx`, tuned by `DIVE`): the viewBox width is interpolated **geometrically**, `w₀·(w₁/w₀)^e`, so the zoom rate stays constant through the descent — a linear width ramp lurches at the end, because the same number of units is a far larger apparent step once you are close. The wash is always the background you are arriving on, never white (a white flash in the dark theme would be the most arousing frame in the app), and the reader `.surface`s up out of it. Three escapes, all mandatory: `prefers-reduced-motion`, a strained frame budget, and `visibilityState === 'hidden'` (a backgrounded tab stops `requestAnimationFrame`, which would strand the descent) — plus a wall-clock backstop, because a reader must never be left on a frozen map that ignores input.

## MO-06 — The Journey Has a Return Leg

The dive into a cell is only half the seam. Leaving the reader sinks the page back through the same light (`.submerge`, shorter than `.surface` — going back to something already seen should not take as long as arriving), and the map reopens *centred on the cell that page belongs to* rather than at the home framing, pulling back from tight to comfortable and warming that cell for a moment. `mapNodeForPage()` in App.tsx derives the cell from the page's own fields and never imports it from the Orrery — the map is a lazy chunk and one lookup must not drag it into the first paint. Any camera move must leave a readable framing if its animation never runs: set the *destination* under reduced motion, never the starting frame.

## MO-07 — A Page Turn Is a Tide, Not a Sheet of Paper

The default turn is the luminance tide passing through the page: a radial mask flooding outward from the spine, driven by framer through a `--tide` custom property. Flip/slide/fade stay as options. The mask must fail *visible*: it starts at 55%, never 0, because every reason the animation might stall (a dropped frame, a reduced-motion engine, a browser that declines to interpolate the property) would otherwise leave the reader looking at a blank sheet. Under reduced motion there is no mask at all.

## MO-08 — Thumbs Are Not Cursors

Under `@media (pointer: coarse)` every `.bud` and `button.glass-hover` takes a 44px minimum box. The swell itself does not grow — only the area that answers to touch. Verify by listing every rendered `<button>` under 40px tall at 375px with touch emulation on; the map's narrow-spine branch chips sat at 25px until that rule existed.

**The class list is not the rule; reachability is.** Run against every control rather than every bud, the first sweep found three kinds the two selectors never named, and each needed a different answer.

- **`.reader-bar button`** — the page-turn arrows, measured 44×32. They are the reader's primary navigation and were neither a bud nor a glass-hover. Padding sizes them, so the glyph does not move.
- **`.reader-bar`** itself takes a 44px minimum, because a band must be able to hold what this rule puts in it. **Chrome and Margin Yield Too** (LY, `index.css`) shrinks the bars for a shallow sheet, and at 390px tall — a phone on its side — the head band came to 41.6px around 44px buds: measured top −1 and bottom 43 against a band running 0 to 42, so every target in the chrome hung out of it at both edges. The band yields until it would be smaller than its controls, and then stops.
- **`input[type="range"]`** takes the box as **padding against `content-box`**, never as height. The track is drawn 4px tall and is the whole of the target — there is nothing around it a thumb can hit instead. Height grows the track the browser paints and the slider returns as a thick rounded pill, which is both louder than the drawing asks for and a rounded corner (LY-05). Padding leaves the painted track at 4px and grows only the box: measured 4px → 44px, mark unchanged.

**A control already inside a label needs nothing.** The settings checkboxes measure 13×13 and are correct as they are: each sits in its own `p-3` label, and the label is the control. Where a field is *not* labelled the fix is the label, not the pixels — the search and index filter inputs are one line of 12px type, 18px tall, inside padded rows drawn to look like the control; wrapping the row in a `<label>` hands it the whole 34–50px without moving anything. A `<button>` nested in such a label still does its own job: a click on an interactive descendant never runs the label's action.

So the sweep is the rule and the selectors are only its current answer. Anything that takes a tap is in scope, `<input>` included, and a control that cannot grow without opening a hole in the stack around it is telling you the stack is the thing to change.
