# Layout and Chrome · `LY`

How the app is entered, how a page is bounded, how a gesture is read, and the small absolute prohibitions on interface geometry.

[← index](00-index.md)

---

## LY-01 — The Orrery Is the Front Door, Not a Maze

The app opens on `src/components/Orrery.tsx` — the manifesto core at centre, five chapter planets on orbital rings where radius encodes the Fragile → Robust → Antifragile spine, and the bibliography sitting as one more node in the same mesh rather than as a marker parked beside it (**Nothing Floats**). It is an orientation map you consult, never a transit system you must fly through: clicking a planet opens the reader at that chapter, and Esc returns to the map. Never hard-code the page count anywhere — it is derived from `BOOK_PAGES.length`, and the book shrinks or grows whenever `bookData.ts` changes. Reading always happens in the reader. Never restructure the document to fit the map. Below 700px the map is replaced by a legible stacked spine — never a shrunken diagram.

## LY-02 — No Page Scrolling

The page (viewport) itself MUST NEVER be vertically scrollable. Every page spread/card fits 100% inside the viewport height (`h-screen`, `overflow-hidden`). Long content scrolls *inside* its content column via `.soft-scroll` (thin, near-invisible scrollbar) — text must never be clipped or cut off.

## LY-03 — A Horizontal Scroll Is a Gesture, Not a Scrollbar

Two-finger horizontal scroll and touch swipe turn the page, and neither makes the viewport scrollable — the sheet stays `overflow-hidden` in both axes and **No Page Scrolling** is untouched. What is read is the *intent* of the swipe; a page turn is played from it exactly as the arrow keys play one. Four guards, each earned: **axis** — vertical intent wins ties and everything else, or scrolling a column of prose turns the page on its diagonal component (the touch handler shipped without this and a 100px-left/120px-down drag paged); **momentum** — a trackpad emits deltas long after the fingers lift, so the accumulator locks on firing and unlocks only after ~220ms of silence, the one reliable end-of-gesture signal (verified: one flick plus 80 tail events = exactly one turn); **ownership** — if anything under the pointer can still take the scroll itself (a wide figure in its `.soft-scroll` box), it keeps it, and the page turns only when the gesture has nowhere else to go; **overlays** — a drawer, the search or a figure world owns the surface while open and must not be paged out from underneath. Bind the listener to the sheet, never to `window`: the map reads its own wheel for zoom and a windowed `preventDefault` reaches across views to fight it. **The unlock timer must not be cleared in the listener effect's cleanup** — turning a page changes `groupIdx`, which re-runs the effect, and clearing the timer there kills the pending unlock so every second gesture is swallowed. Clear it on real unmount only.

## LY-04 — A Mode Is Never Sealed

Zen mode hides every control, so it keeps exactly one — a bud resting at 0.16 opacity that comes to full under touch or focus — and `z` leaves it as readily as it enters. Esc escalates: overlay, then zen, then the map. A mode whose only exit is an untold keystroke is a trap, however calm it looks.

## LY-05 — Zero Rounded Corners

Never use rounded corners (`rounded-none` only across all UI elements, cards, buttons, modals, and inputs).

## LY-06 — No Hard Outlines

Never use hard 1px black/white borders, focus outlines, or ring offsets. All borders are translucent hairlines (enforced globally in `src/index.css` via `.theme-dark` / `.theme-light` border-color overrides). Hover states shift glass opacity softly — no harsh black↔white inversion flips.

## LY-07 — Theme classes

The App root carries `theme-dark` / `theme-light`; global glass and hairline CSS keys off these classes.
