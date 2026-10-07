# Layout and Chrome · `LY`

How the app is entered, how a page is bounded, how a gesture is read, and the small absolute prohibitions on interface geometry.

[← index](00-index.md)

---

## LY-01 — The Orrery Is the Front Door, Not a Maze

The app opens on `src/components/Orrery.tsx` — the manifesto core at centre, five chapter planets on orbital rings where radius encodes the Fragile → Robust → Antifragile spine, and the bibliography sitting as one more node in the same mesh rather than as a marker parked beside it (**Nothing Floats**). It is an orientation map you consult, never a transit system you must fly through: clicking a planet opens the reader at that chapter, and Esc returns to the map. Never hard-code the page count anywhere — it is derived from `BOOK_PAGES.length`, and the book shrinks or grows whenever `bookData.ts` changes. Reading always happens in the reader. Never restructure the document to fit the map. Below 700px the map is replaced by a legible stacked spine — never a shrunken diagram.

## LY-02 — No Page Scrolling

The page (viewport) itself MUST NEVER be vertically scrollable. Every page spread/card fits 100% inside the viewport height (`h-screen`, `overflow-hidden`). Long content scrolls *inside* its content column via `.soft-scroll` (thin, near-invisible scrollbar) — text must never be clipped or cut off.

**The manuscript fits because the CUT is measured, not because the type is squeezed.** A sheet holds whatever fills its column and not one paragraph more, and the way that is known is that every paragraph in the book is set offscreen at the reading column's own width and its rendered height read back (`utils/proseMetrics.ts`), once per frame size. The splitter takes paragraphs until the next will not fit and then closes the sheet; `SheetMetrics` leaves the unit to the caller, so the same code cuts in pixels in the browser and in characters in Node, where the static audits run with no viewport. **Do not reintroduce a packing constant.** The cut was made from a character estimate discounted twice — a density factor and a per-paragraph charge, both hedging the same uncertainty — and the product of the two gave the reader 54% of every column while still overflowing the unlucky sheet; `docs/OPEN.md` 47 has the measurements at three frames. Three sheets have three different columns and must keep three different limits: a chapter opener gives its head to the cell, a section start gives it to the heading, a continuation gives nothing and has the whole column (326 / 566 / 652px of a 680px column at 1440×900). **Verify by sweeping every sheet for `scrollWidth / clientWidth` and for used height over column height** — the failure this prevents is not a clipped page, it is a second column, and a second column is silent.

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

## LY-08 — A Box Is Never Lit; the Glow Belongs to the Glyph

No shadow, halo, bloom or soft field may be drawn behind a control's **box** — not on hover, not on focus, not on press, at any opacity and at any blur radius. The box of a control is invisible; only its marks are ever visible. This extends **No Hard Outlines** to the case that rule did not name: a blurred edge is still an edge, and a soft-edged rectangle is a bordered pill with the border out of focus.

It also closes **Only Lines. Nothing Is Ever a Filled Area** around interface chrome. A rectangle of tone behind a name is a filled area exactly as a halo disc behind a soma is, and the answer is the same one that rule reached four times: the fix is never a lower number, it is removing the fill.

**Two forms are permitted, and there is no third.**

- **A glow on the ink.** `text-shadow` on the control's own letterforms, and `drop-shadow` on its glyph — both follow the alpha of the marks, so the light lands where the control has ink and nowhere else. This is what focus uses, because focus must be visible and the global reset removes every outline.
- **Nothing at all.** Hover and rest change **opacity only** (`.bud`, `.glass-hover` — 0.68/0.72 to 1). No light is added; the mark simply comes fully present.

**Scope a glow to controls, never to `:focus-visible` bare.** `text-shadow` is an inherited property, so an unscoped rule hands the glow to every descendant of anything that takes focus — and overlays here call `focus()` on their own wrapper to move the reader inside, which would light a whole page of prose. Surfaces that take focus programmatically (`[tabindex="-1"]`, `[role="dialog"]`) are not controls and show nothing.

**How it was found, and why it needs to be written down.** The offending rule was `:focus-visible { box-shadow: 0 0 0 3px …, 0 0 16px 3px … }` and it carried a comment asserting the opposite of what it did — "a swell of light under the glyph, here soft-edged, so it never reads as a border". It read as a lit rectangle on every focused control, and worst on the entry button, which carries `autofocus` and therefore wore one from the first frame of the app. A comment claiming a rule is satisfied is not evidence that it is (**Verify by Measurement, Not by Eye**). The sheet now ends its focus block with `*:focus, *:focus-visible, *:hover { box-shadow: none !important; }`, so the prohibition holds against anything reintroduced above it.
