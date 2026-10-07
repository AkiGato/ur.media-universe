/*
 * Runtime audit: type, spacing and fit, measured on what the browser actually
 * rendered rather than on what the source says.
 *
 * TY-02 and TY-03 both end with the same instruction — "verify with a
 * computed-style sweep, not a grep" — because both of them drifted the same
 * way: a named Tailwind step or a second tracking value entering through a
 * class the grep was not looking for. This is that sweep, plus the two fit
 * checks LY-02 is about, because text that does not fit is the failure this
 * app cannot absorb: the viewport may not scroll, so an overflow is not a
 * scrollbar, it is a clipped sentence.
 *
 * Paste into the console with any surface on screen. Run it again on each —
 * the map, a prose sheet, a figure world, an instrument, the index — and at a
 * narrow width, because almost every collision this found was width-dependent.
 *
 *   textAudit()            → { ok, sizes, badSizes, badTracking, overflow, clipped, collisions }
 *
 * WHAT IS DELIBERATELY NOT A FAILURE:
 *   · `.sr-only` text — never rendered, and TY-02 exempts it by name.
 *   · SVG text — font-size there is in viewBox units, not pixels, and is part
 *     of a drawing that zooms. TY-02 exempts it by name too. Its collisions
 *     are label-audit.js's job, not this one's.
 *   · a box whose own overflow is `auto`/`scroll` — that is `.soft-scroll`
 *     doing exactly what LY-02 asks of it.
 *   · `text-overflow: ellipsis` — truncation that was asked for and is visible
 *     to the reader as truncation.
 *
 * SETTLE THE ANIMATIONS FIRST, OR YOU WILL CHASE A GHOST.
 *
 * Call `settle()` before `textAudit()`. The reader arrives under `.surface`,
 * a one-shot scale from 1.035 down to 1 with `animation-fill-mode: both` — so
 * while that animation is unfinished the whole reader measures 3.5% too big,
 * and the audit reports 22px of shell overflow that does not exist at rest.
 *
 * It bites hardest exactly where you are most likely to be working. A preview
 * pane that is not compositing does not advance the document timeline at all,
 * so the animation sits at `currentTime: 0` indefinitely — reporting
 * `playState: "running"` while holding its FROM frame. That is the same
 * rAF-is-paused trap `docs/OPEN.md` records against the presentation deck, and
 * measured naively it looks precisely like a layout bug. `settle()` finishes
 * every one-shot animation so the geometry is the one a reader sits in front
 * of; infinite animations are left alone, because those are the tide.
 */
function settle() {
  let n = 0;
  for (const el of document.querySelectorAll('*')) {
    for (const a of el.getAnimations()) {
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
      if (t && t.iterations !== Infinity) {
        try { a.finish(); n++; } catch (e) { /* already finished, or unresolvable */ }
      }
    }
  }
  return n;
}

function textAudit() {
  const SIZES = ['9px', '12px', '18px'];
  const out = {
    sizes: {}, badSizes: [], badTracking: [],
    families: {}, badFamilies: [],
    overflow: [], clipped: [], collisions: [], offscreen: [],
    repeats: []
  };

  /* THE TWO VOICES, AND ONLY TWO.
     One serif for titles, one sans for everything else. Both are self-hosted
     and both are declared in index.css; anything else on screen means a stack
     fell through to a system face, which reads as a third voice nobody chose
     and is invisible until it is measured. */
  const ALLOWED_FAMILIES = ['IBM Plex Sans', 'Newsreader'];

  const label = (el) =>
    (el.className && el.className.toString ? el.className.toString() : el.tagName).slice(0, 70);
  const says = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50);

  /* The union of the element's OWN text, in real glyph boxes. Child elements
     are excluded because each is measured on its own pass, and pseudo-elements
     are excluded because a Range cannot see them — which is the point. */
  const textRect = (el) => {
    let box = null;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const rng = document.createRange();
      rng.selectNodeContents(n);
      for (const r of rng.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        box = box
          ? {
              left: Math.min(box.left, r.left), top: Math.min(box.top, r.top),
              right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom)
            }
          : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      }
    }
    return box;
  };

  /* The nearest ancestor that would actually cut this text off. `visible`
     ancestors let it through; an `auto`/`scroll` one is reported but flagged as
     reachable, because that is `.soft-scroll` satisfying LY-02. */
  const clippingAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const ox = cs.overflowX, oy = cs.overflowY;
      if (ox !== 'visible' || oy !== 'visible') {
        return {
          el: p,
          scrollsX: ox === 'auto' || ox === 'scroll',
          scrollsY: oy === 'auto' || oy === 'scroll'
        };
      }
    }
    return null;
  };

  const els = Array.from(document.querySelectorAll('body *'));

  for (const el of els) {
    if (el.ownerSVGElement || el.tagName === 'svg') continue;
    if (el.classList.contains('sr-only') || el.closest('.sr-only')) continue;

    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;

    const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());

    if (ownText) {
      const fs = cs.fontSize;
      out.sizes[fs] = (out.sizes[fs] || 0) + 1;
      if (!SIZES.includes(fs)) out.badSizes.push({ size: fs, says: says(el), at: label(el) });

      /* Whichever family actually won, not the whole stack. */
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      out.families[fam] = (out.families[fam] || 0) + 1;
      if (!ALLOWED_FAMILIES.includes(fam)) {
        out.badFamilies.push({ family: fam, says: says(el), at: label(el) });
      }

      /* TY-03: uppercase is tracked 0.2em. Nothing else is tracked at all. */
      const ls = parseFloat(cs.letterSpacing);
      if (!Number.isNaN(ls) && ls !== 0) {
        const upper = cs.textTransform === 'uppercase';
        const want = parseFloat(fs) * 0.2;
        if (!upper) {
          out.badTracking.push({ says: says(el), tracking: cs.letterSpacing, why: 'tracked but not uppercase', at: label(el) });
        } else if (Math.abs(ls - want) > 0.15) {
          out.badTracking.push({ says: says(el), tracking: cs.letterSpacing, want: want.toFixed(1) + 'px', at: label(el) });
        }
      }
    }

    /* Fit — MEASURED ON THE TEXT, NOT ON scrollWidth.

       scrollWidth was the obvious instrument and it is the wrong one here. It
       counts pseudo-elements, and this app draws every soft ground as one:
       `.membrane::before` is `inset: -7px -11px`, a feather that reaches
       deliberately outside its box. So every membrane in the app reported
       exactly 11px of horizontal and 7px of vertical "overflow" — the drawing
       doing its job, reported as a layout fault. Ten of them in the Tools
       folder alone, and not one was a clipped word.

       What the question actually is: can the reader read the text. So the text
       is what gets measured — Range rects for the real glyph boxes — against
       the nearest ancestor that would clip it. */
    if (ownText) {
      const clipper = clippingAncestor(el);
      if (clipper) {
        const box = clipper.el.getBoundingClientRect();
        const r = textRect(el);
        /* PARKED IS NOT CLIPPED. Something wholly outside its clipper was put
           there on purpose — the skip link rests at translateY(-140%) until it
           takes focus, and reporting it says "Skip to the reader is cut off by
           38px" on every surface in the app. A partial cut is the bug; a total
           absence is a decision. */
        const parked =
          r && (r.bottom <= box.top || r.top >= box.bottom || r.right <= box.left || r.left >= box.right);
        if (r && !parked) {
          const cutX = Math.max(0, r.right - box.right, box.left - r.left);
          const cutY = Math.max(0, r.bottom - box.bottom, box.top - r.top);
          if (cutX > 2 && !clipper.scrollsX && cs.textOverflow !== 'ellipsis') {
            out.overflow.push({ says: says(el), by: Math.round(cutX) + 'px', clippedBy: label(clipper.el), at: label(el) });
          }
          if (cutY > 2 && !clipper.scrollsY) {
            out.clipped.push({ says: says(el), by: Math.round(cutY) + 'px', clippedBy: label(clipper.el), at: label(el) });
          }
        }
      }
    }
  }

  /* Collisions between two pieces of interface text.

     THE FIRST VERSION OF THIS COUNTED OCCLUSION AS COLLISION. With the index
     drawer open it reported eighteen, every one of them a drawer row sitting
     over a paragraph of the sheet underneath — which is what a drawer is for.
     Excluding positioned elements did not help, because the offending nodes are
     the STATIC CHILDREN of a positioned overlay.

     The second version hit-tested with `elementsFromPoint` and was no better,
     for a reason worth writing down: that call returns the WHOLE STACK at the
     point, not the top of it. Asking "is my element in the stack" is therefore
     always true for both, occluded or not, and the check silently passed
     everything through.

     What actually separates the two cases is whether something OPAQUE is
     painted between the lower element and the viewer. A drawer sits on solid
     theme ground (GR-02 — overlays are solid ground, never translucent), so
     the drawer's own panel is in the stack above the sheet's paragraph with a
     background alpha of 1. Two labels genuinely colliding have nothing between
     them. So: walk the stack down to the lower of the two elements, and if
     anything on the way has a background that would hide it, this is occlusion
     and not a collision. */
  const leaves = els.filter((el) => {
    if (el.ownerSVGElement || el.closest('.sr-only')) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
    return Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
  });

  /* WHICH LAYER A PIECE OF TEXT LIVES ON.

     The background-alpha test that stood here did not work either, and the
     reason is this app specifically: its overlays are not painted with
     `background-color`. GR-02 retired the glass, so a drawer's ground is drawn
     by a `::before` on `.veil`/`.membrane`, and the element's own computed
     background is transparent. Sampling it says "nothing is covering this"
     about a panel that plainly is.

     So stop asking what is painted and ask what layer it is on. Two pieces of
     text can only collide if they are stacked together — same overlay, same
     drawer, same sheet. The nearest positioned ancestor carrying a z-index is
     that layer; the index drawer has one, the figure stage has one, the reader
     sheet is on the base. Different layer means one is over the other on
     purpose, which is what an overlay IS. */
  const layerOf = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.position !== 'static' && cs.zIndex !== 'auto') return p;
      if (cs.position === 'fixed') return p;
    }
    return document.body;
  };

  /* Is this element the thing a reader would touch at its own centre? If
     something else answers, it is buried under an overlay and whatever it does
     down there is not a visible fault. */
  const onTop = (el) => {
    const r = textRect(el) || el.getBoundingClientRect();
    const x = (r.left + r.right) / 2;
    const y = (r.top + r.bottom) / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
  };

  /* Scrolled-out-of-view is not hidden — `.soft-scroll` is how LY-02 is
     satisfied, and a row further down a scrolling column is reachable. */
  const inScroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) return true;
    }
    return false;
  };

  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], b = leaves[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      if (ra.width < 2 || rb.width < 2) continue;
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox <= 3 || oy <= 3) continue;

      const cx = (Math.max(ra.left, rb.left) + Math.min(ra.right, rb.right)) / 2;
      const cy = (Math.max(ra.top, rb.top) + Math.min(ra.bottom, rb.bottom)) / 2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;

      if (layerOf(a) !== layerOf(b)) continue;

      /* And both have to be ON SCREEN RIGHT NOW. Two paragraphs of the spread
         behind an open instrument are in the same layer as each other and do
         overlap — but nobody can see either of them, because a portalled
         `fixed` stage is over the top. Hit-testing the pair's own centres is
         what separates "these two collide" from "these two are both buried". */
      if (!onTop(a) || !onTop(b)) continue;

      out.collisions.push({ a: says(a), b: says(b), overlap: Math.round(ox) + '×' + Math.round(oy) });
    }
  }

  /* Text pushed outside the viewport, WHERE NO SCROLLER CAN REACH IT.

     The page may not scroll (LY-02), so text outside it is not
     offscreen-until-you-scroll, it is gone. But text below the fold of a
     `.soft-scroll` column is exactly what that rule asks for, and the first
     version of this check reported seventy-eight of them in the index drawer —
     which is not a finding, it is a list of the rows you have not scrolled to
     yet. Anything inside a scrolling ancestor is therefore reachable and is
     skipped; what is left is text that overflows a box nobody can scroll. */
  for (const el of leaves) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (inScroller(el)) continue;
    if (getComputedStyle(el).position === 'absolute' && r.bottom < 0) continue; // the skip link, parked above
    if (r.right > innerWidth + 2 || r.left < -2 || r.bottom > innerHeight + 2 || r.top < -2) {
      out.offscreen.push({ says: says(el), box: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], at: label(el) });
    }
  }

  /* REPEATED INFORMATION, WITHIN ONE FRAME (TY-05 — A Name Is Said Once).
     Any string a reader meets twice on the same screen is the tell that rule
     is about: two readouts of one fact, free to disagree, doubling the surface
     without adding anything. Short strings are excluded because a numeral or a
     one-word control legitimately recurs (a "1" on each of six scales is six
     different answers, not one name said six times), and so are strings inside
     different overlay layers, since only one of those is being read. */
  const seen = new Map();
  for (const el of leaves) {
    if (!onTop(el)) continue;
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t.length < 8) continue;
    const key = t.toLowerCase() + ' @' + (layerOf(el) === document.body ? 'base' : 'overlay');
    const prev = seen.get(key);
    if (prev && !prev.contains(el) && !el.contains(prev)) {
      /* A COLUMN LABEL IS NOT A DUPLICATED FACT.
         A list where every row offers the same action prints that action on
         every row, and a chapter eyebrow repeats down the sections it groups.
         Neither is what TY-05 is about: that rule is about two readouts of ONE
         fact, free to drift apart. Six rows saying "Open Rule" are six
         different rules; three rows under "CHAPTER I" are three different
         sections.

         The discriminator is the element signature. Conventional repetition
         comes from one component rendered N times, so tag and classes match
         exactly. A genuine duplicate comes from two different places rendering
         the same string — which is how the real one here showed itself: the
         index printed a section title twice at `opacity-55` and `opacity-100`,
         two different rows for two sheets of one section, and the mismatched
         signature is precisely what gave it away. */
      const sig = (n) => n.tagName + '|' + (n.className && n.className.toString ? n.className.toString() : '');
      if (sig(el) !== sig(prev)) {
        out.repeats.push({ says: t.slice(0, 60), at: label(el), alsoAt: label(prev) });
      }
    } else if (!prev) {
      seen.set(key, el);
    }
  }

  out.ok =
    out.badSizes.length === 0 &&
    out.badTracking.length === 0 &&
    out.badFamilies.length === 0 &&
    out.repeats.length === 0 &&
    out.overflow.length === 0 &&
    out.clipped.length === 0 &&
    out.collisions.length === 0 &&
    out.offscreen.length === 0;

  return out;
}

/* The viewport itself, which LY-02 says may never scroll vertically. Separate
   from textAudit because it is a property of the page, not of any element. */
function viewportAudit() {
  const d = document.documentElement;
  return {
    ok: d.scrollHeight <= d.clientHeight + 1 && document.body.scrollHeight <= document.body.clientHeight + 1,
    documentScroll: d.scrollHeight - d.clientHeight,
    bodyScroll: document.body.scrollHeight - document.body.clientHeight
  };
}
