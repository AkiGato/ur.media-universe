import { BOOK_PAGES, type SheetMetrics } from '../data/pageModel';
import { parseEmphasis, keepUnits } from '../data/emphasis';

/**
 * HOW TALL IS THIS PARAGRAPH, AND HOW MUCH OF THE SHEET IS LEFT FOR IT.
 *
 * The cut of the book used to be made in characters and discounted twice to
 * survive its own averages — `docs/OPEN.md` 47 has the arithmetic and the 54%
 * of a page it left the reader. This is the alternative that entry names:
 * every paragraph is SET, offscreen, at the column's own width and in the
 * column's own type, and its rendered height is read back. A sheet is then
 * filled until the column is full, because the cost of what is on it is the
 * sum of what was measured rather than the sum of an estimate.
 *
 * Nothing here draws. The probe is `visibility: hidden` and parked off the left
 * edge, it is built and destroyed inside one call, and it runs once per frame
 * size — PF-03's objection is to work repeated per frame, and this is work done
 * once and then not again until the window changes shape.
 */

/**
 * What the sheet that opens a chapter holds, against one that merely starts a
 * section.
 *
 * The chapter cell is the one place in the reader where scale is used as
 * information, and it is capped in `vh` rather than set in pixels, so its share
 * of the column is not a constant anybody can write down — measured at
 * 1440x900 it takes a 566px column down to 326px, a share of 0.58.
 *
 * It is charged at 0.55 rather than 0.58 because the share is the one number
 * here that is NOT measured on the frame it is applied to, and the cost of the
 * two errors is not symmetric: too generous and the sheet a reader meets a
 * chapter on runs into a second column, which is the defect this whole
 * mechanism exists to prevent, and which is exactly what the old cut did to
 * chapter 2 — 2.15 columns, measured, on the first sheet of the chapter.
 */
const OPENER_SHARE = 0.55;

/**
 * THE GAP BETWEEN TWO PARAGRAPHS, WHICH IS NOT PART OF EITHER.
 *
 * `space-y-3` in the prose column, so 12px, and it belongs to the cut rather
 * than to the paragraph: eight paragraphs of the same total height take 84px
 * more column than one. Charging it to every paragraph including the last
 * overstates a full sheet by a single gap, which is the direction to be wrong
 * in.
 */
const PARA_GAP = 12;

/**
 * The small links that sit under a section's title — the bibliography, the
 * evidence, the instrument the section carries.
 *
 * They are not on every sheet and the paginator cannot know which sheet will
 * end up holding one, because the instrument is attached to whichever chunk
 * comes out last. So a flat two rows are charged to every prose sheet. Three
 * rows do occur, and a sheet that meets that case is carried sideways by
 * `.hflow`, which is what that flow is for.
 */
const LINK_ROWS = 2;

/** Keyed by the frame, because the frame is what changes the answers. */
let cachedFor = '';
let cached: SheetMetrics | null = null;

const style = (el: HTMLElement, css: Partial<CSSStyleDeclaration>) =>
  Object.assign(el.style, css);

/**
 * Measure the frame, and the book against it.
 *
 * Returns null while there is nothing trustworthy to measure — before the first
 * prose sheet has been laid out, or on a surface that carries no prose at all.
 * The caller retries; see `useSheetBudget`.
 */
export function measureProse(): SheetMetrics | null {
  /*
   * THE MARKER, NOT THE CLASS.
   *
   * `.hflow` is on the ruleset sheets and the bibliography as well, and their
   * columns are a different width and carry different furniture. `data-prose`
   * is set only by the manuscript column, and it carries which of the three
   * kinds of prose sheet it is — the one thing that cannot be read off the
   * markup without guessing.
   */
  const flow = document.querySelector('[data-prose]');
  if (!(flow instanceof HTMLElement)) return null;
  const column = flow.parentElement;
  const header = flow.previousElementSibling;
  if (!column || !(header instanceof HTMLElement)) return null;

  const columnH = column.clientHeight;
  const flowH = flow.clientHeight;
  const cs = getComputedStyle(flow);
  const width =
    flow.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
  if (!(columnH > 160) || !(width > 60)) return null;

  /*
   * WHAT THE COLUMN COSTS BEFORE ANYTHING IS WRITTEN IN IT — and it has to be
   * the same number whichever sheet the reader happens to be standing on.
   *
   * The cut has to be deterministic: a bookmark taken on sheet 30 is sheet 30
   * after a reload, and it is not if the book was cut against whatever
   * furniture the sheet that happened to be showing was carrying. So the
   * sheet's OWN header is subtracted back out here, leaving the column's
   * padding and the gap beneath the header — the same on all three kinds of
   * sheet, and the same on a sheet with three links under its title as on one
   * with none.
   */
  const base = Math.max(0, columnH - flowH - header.getBoundingClientRect().height);

  const key = `${Math.round(width)}x${Math.round(columnH)}x${Math.round(base)}`;
  if (cached && cachedFor === key) return cached;

  const probe = document.createElement('div');
  probe.className = 'hflow';
  probe.setAttribute('aria-hidden', 'true');
  /* `.hflow` is a multicolumn box a hundred container-widths wide and of full
     height; neither survives being taken out of a sheet, so both are overridden
     here. The class stays for the typesetting it carries — hyphenation,
     `text-wrap: pretty`, the orphan and widow counts — every one of which moves
     where a line breaks, and so moves the height this exists to read. */
  style(probe, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${width}px`,
    height: 'auto',
    columns: 'auto',
    columnWidth: 'auto',
    columnGap: 'normal',
    overflow: 'visible',
    visibility: 'hidden',
    pointerEvents: 'none'
  });

  const para = (text: string) => {
    const quote = text.startsWith('"') && text.endsWith('"');
    const el = document.createElement(quote ? 'blockquote' : 'p');
    el.className = quote
      ? 'membrane my-1.5 p-3 font-light italic text-[12px] leading-relaxed rounded-none'
      : 'text-[12px] font-light leading-relaxed opacity-100';
    /* The reader sets the text with its emphasis markers stripped and every
       magnitude bound to its unit. Both move where the line breaks. */
    el.textContent = keepUnits(parseEmphasis(text).text);
    return el;
  };

  /* Every paragraph in the book, once. The chunks partition the manuscript, so
     the union across the current cut is the manuscript — and stays so across a
     re-cut, which is why this reads the pages rather than the chapters. */
  const texts: string[] = [];
  const seen = new Set<string>();
  BOOK_PAGES.forEach((p) => {
    (p.sectionData?.content ?? []).forEach((c) => {
      if (seen.has(c)) return;
      seen.add(c);
      texts.push(c);
    });
  });
  if (texts.length === 0) return null;

  const nodes = texts.map((t) => {
    const el = para(t);
    probe.appendChild(el);
    return el;
  });

  /* The tallest heading in the book, because one cut serves every sheet and the
     sheet it must not overflow is the worst one. A title and its subtitle, set
     exactly as the sheet sets them. */
  const headingNodes = BOOK_PAGES.filter((p) => p.type === 'chapter-section').map((p) => {
    const block = document.createElement('div');
    block.className = 'space-y-1';
    const h = document.createElement('h2');
    h.className = 'text-[18px] font-light';
    h.textContent = p.title;
    block.appendChild(h);
    if (p.subtitle) {
      const sub = document.createElement('p');
      sub.className = 'sheet-subtitle text-[12px] font-light opacity-70';
      sub.textContent = p.subtitle;
      block.appendChild(sub);
    }
    probe.appendChild(block);
    return block;
  });

  const link = document.createElement('button');
  link.className =
    'block text-[9px] font-light uppercase tracking-[0.2em] underline underline-offset-4 decoration-[0.5px]';
  link.textContent = 'Explore sources';
  probe.appendChild(link);

  document.body.appendChild(probe);

  /* One write, then one read. Every height below comes out of the same forced
     reflow rather than one reflow per paragraph. */
  const heights = new Map<string, number>();
  let usable = true;
  nodes.forEach((el, i) => {
    const h = el.getBoundingClientRect().height;
    if (!(h > 0)) usable = false;
    heights.set(texts[i], h + PARA_GAP);
  });
  const headingPx = headingNodes.reduce(
    (m, el) => Math.max(m, el.getBoundingClientRect().height),
    0
  );
  const linkPx = link.getBoundingClientRect().height;
  probe.remove();

  if (!usable || !(headingPx > 0)) return null;

  /*
   * The three sheets. A continuation opens straight into the text and has the
   * whole column; a section start gives back the heading and the vein under it;
   * a chapter opener gives most of what is left to the cell.
   */
  const chrome = base + linkPx * LINK_ROWS;
  const continuation = Math.max(80, columnH - chrome);
  const section = Math.max(80, continuation - headingPx);
  const opener = Math.max(80, section * OPENER_SHARE);

  /* A paragraph that was not in the book when the probe ran — there is no such
     paragraph today, and a division that silently returns zero would fill one
     sheet with the whole manuscript if there ever were. */
  const fallback = continuation / 8;

  cached = {
    costOf: (p) => heights.get(p) ?? fallback,
    section,
    continuation,
    opener
  };
  cachedFor = key;
  return cached;
}
