import { BOOK_PAGES, BookPage, FIGURES } from './pageModel';
import { BOOK_DATA } from './bookData';

/**
 * Where a mark points.
 *
 * A bookmark, a note and the saved reading position all used to store an array
 * index into BOOK_PAGES — which is not a place in the book, it is a place in
 * one particular cutting of the book. The cost was paid in pageModel, which
 * had to promise that the cut would be identical for every reader on every
 * screen forever, so a phone and a desktop got the same 2,000-character sheet
 * and useFitToBox shrank the type to absorb the difference. Adding a paragraph
 * to Chapter II would have quietly moved every mark after it by one sheet.
 *
 * An anchor names the thing instead of its offset: this section and this
 * paragraph, this figure, this rule, this bibliography entry. Resolution to a
 * sheet happens at read time, against whatever cutting is current — so the
 * book can be re-cut, the manuscript can grow, and nobody's notes move.
 *
 * The shapes are deliberately narrow. There is no free-text selector and no
 * DOM path: every one of these addresses something the data layer already
 * names, which is what makes them survivable.
 *
 * Verified by re-cutting the book under a saved note: at SHEET_BUDGET 2000 the
 * note sat on sheet 13 of 29; at 1200 the same note sat on sheet 19 of 39 and
 * still marked the same words. Under the old page index it would have pointed
 * at whatever had moved into slot 13.
 */
export type Anchor =
  | { k: 'cover' }
  /** section id from the page model, paragraph ordinal within that section */
  | { k: 'section'; id: string; para: number; at?: number }
  | { k: 'figure'; id: NonNullable<BookPage['diagramType']> }
  /** case study, addressed by its title — the only id a case study has */
  | { k: 'case'; id: string }
  | { k: 'rule'; id: string }
  | { k: 'source'; id: string };

/** Where an anchor resolves to: a sheet, and the paragraph on it if there is one. */
export interface Resolved {
  pageIndex: number;
  /** index into that page's `sectionData.content`, when the anchor names a paragraph */
  paraOnPage?: number;
}

const FIGURE_TYPES = new Set(FIGURES.map((f) => f.type));

/**
 * The anchor for a sheet — what this page is, said in terms that survive it.
 *
 * Used when a reader marks a page rather than a sentence, and to migrate marks
 * that were stored as bare indices before anchors existed.
 */
export function anchorForPage(pageIndex: number): Anchor {
  const page = BOOK_PAGES[pageIndex];
  if (!page) return { k: 'cover' };

  if (page.sectionData) {
    return {
      k: 'section',
      id: page.sectionData.id,
      para: page.sectionData.paragraphOffset ?? 0
    };
  }
  if (page.diagramType) return { k: 'figure', id: page.diagramType };
  if (page.caseStudyData) return { k: 'case', id: page.caseStudyData.title };
  if (page.type === 'prompt-ruleset') {
    const id = page.promptRuleId || page.promptRuleIds?.[0];
    if (id) return { k: 'rule', id };
  }
  if (page.type === 'references') {
    const first = page.consolidatedSourcesChunk?.[0];
    const id = first && 'id' in first ? (first as { id?: string }).id : undefined;
    if (id) return { k: 'source', id };
  }
  return { k: 'cover' };
}

/** The anchor for one paragraph on a sheet, optionally into it by `at` characters. */
export function anchorForParagraph(
  pageIndex: number,
  paraOnPage: number,
  at?: number
): Anchor {
  const sd = BOOK_PAGES[pageIndex]?.sectionData;
  if (!sd) return anchorForPage(pageIndex);
  return {
    k: 'section',
    id: sd.id,
    para: (sd.paragraphOffset ?? 0) + paraOnPage,
    ...(at === undefined ? {} : { at })
  };
}

/**
 * The sheet an anchor lands on, and the paragraph on it.
 *
 * Every branch degrades to a sheet rather than to nothing: a section that has
 * been cut differently since the mark was made still resolves — to the sheet
 * carrying that paragraph if it exists, and to the section's first sheet if
 * the paragraph itself has gone. A mark may lose its sentence when the
 * manuscript is edited under it; it may never lose its place in the book.
 */
export function resolveAnchor(a: Anchor | undefined | null): Resolved {
  if (!a) return { pageIndex: 0 };

  switch (a.k) {
    case 'section': {
      const sheets = BOOK_PAGES.filter((p) => p.sectionData?.id === a.id);
      if (sheets.length === 0) return { pageIndex: 0 };
      const hit = sheets.find((p) => {
        const from = p.sectionData!.paragraphOffset ?? 0;
        return a.para >= from && a.para < from + p.sectionData!.content.length;
      });
      if (!hit) return { pageIndex: sheets[0].index };
      return {
        pageIndex: hit.index,
        paraOnPage: a.para - (hit.sectionData!.paragraphOffset ?? 0)
      };
    }
    case 'figure': {
      const i = BOOK_PAGES.findIndex((p) => p.diagramType === a.id);
      return { pageIndex: i >= 0 ? i : 0 };
    }
    case 'case': {
      const i = BOOK_PAGES.findIndex((p) => p.caseStudyData?.title === a.id);
      return { pageIndex: i >= 0 ? i : 0 };
    }
    case 'rule': {
      const i = BOOK_PAGES.findIndex(
        (p) => p.promptRuleId === a.id || (p.promptRuleIds || []).includes(a.id)
      );
      return { pageIndex: i >= 0 ? i : 0 };
    }
    case 'source': {
      const i = BOOK_PAGES.findIndex((p) =>
        (p.consolidatedSourcesChunk || []).some(
          (c) => 'id' in c && (c as { id?: string }).id === a.id
        )
      );
      return { pageIndex: i >= 0 ? i : 0 };
    }
    default:
      return { pageIndex: 0 };
  }
}

/** The sheet an anchor lands on. */
export const pageForAnchor = (a: Anchor | undefined | null): number =>
  resolveAnchor(a).pageIndex;

/**
 * The bibliography sheet carrying most of a set of sources.
 *
 * A section's works are rarely all on one sheet of the list, so "the sheet" is
 * the one that holds the largest number of them — and ties go to the earliest,
 * because a reader sent into the middle of a list can read forward but does not
 * know to read back. Returns -1 when none of them can be placed.
 */
export function pageForSources(ids: string[]): number {
  const tally = new Map<number, number>();
  ids.forEach((id) => {
    const page = pageForAnchorInternal({ k: 'source', id });
    if (page < 0) return;
    tally.set(page, (tally.get(page) || 0) + 1);
  });
  let best = -1;
  let most = 0;
  tally.forEach((n, page) => {
    if (n > most || (n === most && best >= 0 && page < best)) {
      most = n;
      best = page;
    }
  });
  return best;
}

/** resolveAnchor, but reporting "nowhere" instead of falling back to the cover */
function pageForAnchorInternal(a: Anchor): number {
  if (a.k !== 'source') return resolveAnchor(a).pageIndex;
  return BOOK_PAGES.findIndex((p) =>
    (p.consolidatedSourcesChunk || []).some(
      (c) => 'id' in c && (c as { id?: string }).id === a.id
    )
  );
}

/**
 * The sheet a *manuscript* section is printed on.
 *
 * The book's own section ids ("3.1", "4.4-4.5") and the page model's ids
 * ("3.1-3.2", "4.3") are different vocabularies: a sheet often pairs two
 * sections and then names the pair, so nothing in the interface could get from
 * a section the manuscript names — a citation's back-reference, say — to the
 * sheet it is printed on.
 *
 * Derived by matching the text rather than by anybody declaring the pairing,
 * because the pairing is already implicit in what each sheet carries, and a
 * declaration would be a second place to keep it true. Where a sheet's prose
 * was written into the page model rather than taken from the manuscript, no
 * paragraph matches and the section falls back to its chapter's first sheet.
 */
const SECTION_SHEETS: Map<string, number> = (() => {
  const out = new Map<string, number>();
  const paragraphs = new Map<string, number>();
  BOOK_PAGES.forEach((p) => {
    p.sectionData?.content.forEach((para) => {
      if (!paragraphs.has(para)) paragraphs.set(para, p.index);
    });
  });

  BOOK_DATA.chapters.forEach((ch) => {
    ch.sections.forEach((sec) => {
      const hit = sec.content.map((c) => paragraphs.get(c)).find((i) => i !== undefined);
      if (hit !== undefined) out.set(sec.id, hit);
      else {
        const chapterStart = BOOK_PAGES.findIndex((p) => p.chapterId === ch.id);
        if (chapterStart >= 0) out.set(sec.id, chapterStart);
      }
    });
  });
  return out;
})();

export const pageForManuscriptSection = (sectionId: string): number =>
  SECTION_SHEETS.get(sectionId) ?? 0;

/** The heading printed over a manuscript section, for a control that points at it. */
export function manuscriptSectionName(sectionId: string): string {
  for (const ch of BOOK_DATA.chapters) {
    const sec = ch.sections.find((s) => s.id === sectionId);
    if (sec) return sec.number ? `${sec.number} ${sec.title}` : sec.title;
  }
  return sectionId;
}

/**
 * Whether a value parsed out of storage is an anchor this build understands.
 *
 * Storage is a file the reader can edit and carry between versions, so nothing
 * out of it is trusted: an unrecognised shape falls back to the legacy page
 * index rather than throwing on load and taking every other mark with it.
 */
export function isAnchor(v: unknown): v is Anchor {
  if (!v || typeof v !== 'object') return false;
  const a = v as Anchor;
  switch (a.k) {
    case 'cover':
      return true;
    case 'section':
      return typeof a.id === 'string' && Number.isFinite(a.para);
    case 'figure':
      return typeof a.id === 'string' && FIGURE_TYPES.has(a.id);
    case 'case':
    case 'rule':
    case 'source':
      return typeof a.id === 'string';
    default:
      return false;
  }
}
