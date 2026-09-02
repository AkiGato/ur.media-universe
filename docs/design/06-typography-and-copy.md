# Typography and Copy · `TY`

One family, one weight, three sizes, one tracking rule — and the hard limit on what text may exist at all. Copy is the most easily invented thing in the app and the most expensive to strip out later.

[← index](00-index.md)

---

## TY-01 — One Voice, and It Is Light

One font family, and one weight: light. The map settled this — *a name is typography, not signage* — and the rest of the app was still setting every label in `font-bold uppercase`, which is the one register that makes an interface shout. `font-weight: 300` is the inherited default on `body`/`button`/`input` in `src/index.css`, so anything that never states a weight lands in the voice rather than a step above it. Contrast comes from size, letter-spacing, opacity and light. **Never from weight** — no `font-bold`, `font-semibold`, `font-medium`, `font-normal` anywhere, and no numeric `fontWeight` above 300 on SVG text. Where weight used to carry *state* (a selected tab, the current index row), state is now carried by light: `.bud` rests at 0.68 and `.bud-lit` at 1, which is the same thing the tissue does when you touch it.

## TY-02 — Three Type Sizes: 9, 12, 18

The whole app is set at three sizes and no others — 9px for labels, eyebrows and instrument readings, 12px for body and everything conversational, 18px for the largest thing on any sheet. It ran on **fourteen** distinct sizes before they were collapsed (8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 30, 48), which is not a scale, it is an accident. Sizes are written as `text-[9px]`, `text-[12px]`, `text-[18px]`; the named Tailwind steps (`text-xs`, `text-lg`, `text-xl`…) are banned because they smuggle a fourth and fifth value back in under a friendly name. Remapping rounds to the nearest step with **ties resolved downward**, because this app may not scroll and a size that rounds up can overflow a sheet while a size that rounds down never can. Two things sit legitimately outside the scale and must not be "fixed": `.sr-only` text, which is never rendered, and SVG `font-size`, which is in **viewBox units, not pixels** — it is part of a drawing that zooms, not part of the interface. Verify with a computed-style sweep, not a grep: every rendered element must report 9, 12 or 18.

## TY-03 — One Spacing Rule, Everywhere

**Uppercase is tracked 0.2em. Nothing else is tracked at all.** There is no ladder, no size step, no per-call-site value, and no responsive variant — a rule that has to be remembered at eighty-eight call sites is the rule that drifted in the first place, and this app had seven different tracking values running at once (0.3em on 57 elements, 0.22em on 16, plus 0.25em, 0.14em, 0.08em, `tracking-wide` and `tracking-widest`) before they were collapsed. In markup that means exactly one utility, `tracking-[0.2em]`, and it appears only on a class list that also says `uppercase`. In SVG it is **derived, never passed**: `FigureText` computes `letterSpacing={uppercase ? size * 0.2 : 0}` and no longer accepts a `tracking` prop, so a call site cannot state a value to drift from. Hand-set SVG text follows the same arithmetic — 0.2em of its own font size when it is caps, zero when it is not (8.5px caps → 1.7, 9px caps → 1.8). **Numerals and single symbols are never tracked**, whatever their case: letter spacing on a lone glyph adds a trailing gap that `text-anchor="middle"` counts as width and pushes the glyph off its own centre. Verify with `grep -rhoE 'tracking-[^" `}]+' src/ | sort | uniq -c` — one line of output, or the rule is broken.

## TY-04 — Literal Document Text

**No copy is written for this app unless it was asked for.** Not a subtitle, not a strapline, not a caption, not a tag, not a footer, not an empty state, not a sentence introducing a control. If a string is not in the source dossier and nobody requested it, it does not get written — and when in doubt the answer is to ship nothing and ask, because an interface with a missing label is a five-second fix and an interface full of invented voice takes a day to strip and leaves the reader unable to tell which sentences are the author's. Never add AI-generated subtitles, summary fluff, or extraneous intro copy. Follow the text of the source documents verbatim (informational core: `UR_Strategic_Dossier_Revised` PDF → `src/data/bookData.ts`). **This governs interface copy exactly as it governs the manuscript.** A heading, blurb, placeholder, empty state or explanatory paragraph written into a component is invented text the moment it says more than the control it sits on: a figure that needs a paragraph to introduce it is a figure that has not been drawn clearly enough, and a surface padded with prose to feel finished is a surface that was not designed. Write the control's own name and stop — never decorate a heading with a subtitle, never restate in words what the drawing already says, never invent a second sentence because the first looked lonely. The repetition half of this is **A Name Is Said Once**: a string already on the frame may not appear again, and rephrasing it so the duplicate is not literal is the same fault wearing a disguise.

## TY-05 — A Name Is Said Once

No title, label, subtitle, count or caption appears twice within one frame — one page, one card, one figure, one world, one bar. If a surface already says what a thing is, nothing drawn on that surface may say it again; the inner element drops its own name rather than the outer one suppressing it, because only the inner element knows it is nested.

This rule was discovered independently six times before it was written down, which is the argument for writing it down:

- `FigureStage` carried a title *and* a subtitle that restated the page's own subtitle, on a surface whose whole purpose is to hold less text than the page did. Both went; the stage now names nothing and the top edge carries only the way out.
- `FigureFrame` steps aside entirely inside a figure world. The mechanism belongs to **A World Carries Less Text Than the Page It Came From**, which owns that case; this rule only supplies the reason.
- `HeaderNav` once showed the position while the footer said `Page n of 27` a few centimetres below — two readouts of one fact, disagreeing by one because they counted differently. The readout went, and later so did the fossil props that had fed it (`currentPageDisplay`, then `title`); the position lives once, next to the navigation.
- The map's bottom-left wordmark yields to zero opacity whenever a caption is up, so the frame never says the same thing twice.
- `FigureSeed` exists because the page drew the diagram *and* offered to open it, and the reader could not tell whether the second one was new.
- The chapter opener sets its numeral inside the cell and its title below it — the numeral is a glyph, not a repeat, which is the line: the same *fact* in two registers (drawn and written) is not a repetition; the same *string* twice is.

Two readouts of one fact is the tell. It is what makes a page feel instrumented rather than composed, it doubles the maintenance surface, and when the two disagree — as the page counters did — the reader is left arbitrating between an interface and itself. Check a screen by reading only its text: any string you meet twice is a bug.

## TY-06 — Labels Surface Under Touch

Names surface where the cursor is and nowhere else — the caption corner carries whatever is being touched, so no text stands out in the open field. **Chapter numerals are the exception**: they are set at rest inside every soma and brighten on touch.

The numeral is faint there, and that is a known cost rather than an oversight. It is white type on the hottest part of a white lamp — the two beacon circles composite to roughly 90% white before the vortex and the glow are counted — so at the home framing it is barely legible. Three ways out have been tried and all three were rejected on looks, which is the record worth keeping: dimming the lamp trades the map's one moment of light for a character; setting the reading below the soma reads as a caption parked under a drawing; setting it into the lamp as a dark knockout reads as a label stuck onto the cell. **Names in the open field lose to the drawing every time.** The caption corner is where this map names things, and if the numeral ever has to carry more than it does, the lamp is the thing to reconsider — not the type.

## TY-07 — A Taxonomy May Keep Its Names

**Labels Surface Under Touch** holds everywhere except where the names *are* the subject. FIG 3.1 is a taxonomy — a set of named registers — and a taxonomy nobody can read is not a taxonomy, so its cells opt in through `labelAtRest` exactly as magnitudes opt in through `glyphAtRest`. The exemption is narrow and must stay narrow: it is for figures whose argument is carried by the naming, never for making a drawing easier to label. FIG 3.1 also spends it only at its *structure* depth; its surface depth stays wordless, because the System 1 read there is a small bright event over a heavy meeting over a response, and that lands without a word.

## TY-08 — Labels Have a Collision Budget

At figure scale a cell name is capped at about two words and the full sentence lives in the cell's `reading`/`detail`, which surfaces in the strip on touch. A long name written under a cell runs straight over its neighbour's. Verify with a DOM audit that compares every `<text>` rect in a figure against every other and against the SVG frame — both collisions and overruns shipped invisibly before that audit existed.
