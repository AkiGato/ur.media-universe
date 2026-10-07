import { BOOK_PAGES, BookPage, FIGURES, firstPageOfDiagram, subscribePagination } from './pageModel';
import { Anchor, anchorForPage, pageForAnchor } from './anchors';
import { SOURCES, citedBy, chapterOfCase } from './relations';
import { PROMPT_RULESET_DATA } from './promptData';
import { BOOK_DATA } from './bookData';

/**
 * One index, built once, serving every surface that looks something up.
 *
 * There were two lookups before this and they disagreed. The search well
 * re-scanned BOOK_PAGES with `indexOf` on every keystroke and emitted a row per
 * *match*, unranked and uncapped — a page could produce a title hit, a content
 * hit and three citation hits, listed in page order, so the thing you were
 * looking for sat wherever it happened to fall in the book. The index drawer
 * had a second, weaker matcher that read titles and subtitles only, which meant
 * the same query found different things depending on which panel you typed it
 * into, and neither of them could find a prompt rule or a bibliography entry at
 * all.
 *
 * So: an inverted index over every addressable thing in the book, built at
 * module evaluation. The whole manuscript is about 8,500 words; the index is a
 * few thousand tokens and costs less to build once than one keystroke used to
 * cost to answer.
 *
 * A row is a *document*, and a document is an anchor — never a match. Five hits
 * on one sheet make one row scoring five times, which is the ranking, not five
 * rows pushing everything else off the screen.
 *
 * Measured in the browser: 41 documents, 6,932 indexed words, 2,009 tokens.
 * The postings build in ~3ms, once, at module evaluation. A query answers in
 * 0.2ms (a rare word) to 3.2ms (a six-letter prefix that expands across the
 * vocabulary); the well does not query below two characters, so the one-letter
 * worst case never runs.
 */

/** Where a hit was found. The weights are the ranking. */
export type FieldKind = 'figure' | 'title' | 'subtitle' | 'citation' | 'rule' | 'source' | 'content';

const WEIGHT: Record<FieldKind, number> = {
  /* A figure is the most distinctive thing in the book and the least likely to
     be reached by paging, so somebody typing "postures" almost always wants the
     drawing rather than the paragraph that mentions it. */
  figure: 100,
  title: 60,
  subtitle: 40,
  citation: 25,
  source: 25,
  rule: 20,
  content: 10
};

interface Field {
  kind: FieldKind;
  text: string;
  /**
   * Which paragraph of the section this text is, counted in the section rather
   * than on the sheet. It is what lets one row point at the exact place the
   * query landed even though the row stands for the whole section.
   */
  para?: number;
}

export interface Doc {
  /** stable key — the anchor, flattened */
  id: string;
  anchor: Anchor;
  pageIndex: number;
  /** set when choosing this row should open a figure world rather than a sheet */
  figure?: NonNullable<BookPage['diagramType']>;
  /**
   * The heading this row files under: the book's own name for where it lives
   * ("CHAPTER II", "BIBLIOGRAPHY", "PRODUCTION RULESET"). Taken from the data
   * rather than invented, so the grouping cannot drift from the book, and so
   * no species label has to be written for the interface to have one.
   */
  group: string;
  title: string;
  fields: Field[];
}

export interface Hit {
  doc: Doc;
  /**
   * Where choosing this row goes — the paragraph the query actually landed in,
   * not merely the document it belongs to.
   */
  anchor: Anchor;
  pageIndex: number;
  score: number;
  /** how many times the query matched inside this document */
  count: number;
  /** the strongest field that matched */
  kind: FieldKind;
  snippet: string;
}

export interface Group {
  title: string;
  hits: Hit[];
}

/* ---------------------------------------------------------------------------
   BUILD
--------------------------------------------------------------------------- */

const anchorKey = (a: Anchor): string =>
  a.k === 'section' ? `${a.k}:${a.id}:${a.para}` : a.k === 'cover' ? 'cover' : `${a.k}:${a.id}`;

function buildDocs(): Doc[] {
  const docs: Doc[] = [];
  const byId = new Map<string, Doc>();

  /**
   * Merge rather than append, and never index one string twice.
   *
   * A section longer than a sheet is several pages that repeat the section's
   * title and subtitle, so appending them would both list the same title as
   * two rows and score it twice for being long. One document per section; the
   * paragraphs that differ are what accumulates.
   */
  const push = (doc: Doc) => {
    const incoming = doc.fields;
    let target = byId.get(doc.id);
    if (!target) {
      target = { ...doc, fields: [] };
      byId.set(target.id, target);
      docs.push(target);
    }
    const seen = new Set(target.fields.map((f) => `${f.kind}|${f.para ?? ''}|${f.text}`));
    incoming.forEach((f) => {
      const k = `${f.kind}|${f.para ?? ''}|${f.text}`;
      if (seen.has(k)) return;
      seen.add(k);
      target!.fields.push(f);
    });
  };

  /* The worlds first, and as documents of their own rather than as a property
     of the sheet that carries them: choosing one opens the drawing, not the
     page the drawing sits on. */
  FIGURES.forEach((f) => {
    const pageIndex = firstPageOfDiagram(f.type);
    const sheet = BOOK_PAGES[pageIndex];
    push({
      id: `figure:${f.type}`,
      anchor: { k: 'figure', id: f.type },
      pageIndex,
      figure: f.type,
      group: sheet?.chapterNumber || f.short,
      title: f.title,
      fields: [
        { kind: 'figure', text: f.title },
        { kind: 'figure', text: f.short },
        // the schematic sheet's own subtitle: the figure absorbs the sheet,
        // so nothing the sheet says may fall out of the index with it
        ...(sheet?.subtitle ? [{ kind: 'subtitle' as FieldKind, text: sheet.subtitle }] : [])
      ]
    });
  });

  BOOK_PAGES.forEach((page) => {
    // the figure's own sheet is already represented by the world above
    if (page.diagramType) return;

    const anchor = anchorForPage(page.index);
    const fields: Field[] = [{ kind: 'title', text: page.title }];
    if (page.subtitle) fields.push({ kind: 'subtitle', text: page.subtitle });

    if (page.sectionData) {
      const from = page.sectionData.paragraphOffset ?? 0;
      page.sectionData.content.forEach((p, i) =>
        fields.push({ kind: 'content', text: p, para: from + i })
      );
      (page.sectionData.citations || []).forEach((c) =>
        fields.push({ kind: 'citation', text: `${c.authorOrSource} — ${c.text}` })
      );
    }

    if (page.caseStudyData) {
      const cs = page.caseStudyData;
      [cs.fragile, cs.antifragile, cs.verdict].forEach((t) =>
        fields.push({ kind: 'content', text: t })
      );
      /* The evidence is findable by the argument it is evidence for. The link
         is `linkedCaseStudyId`, which was declared on Chapter from the start
         and read by nothing — so a reader searching for the chapter's own name
         never found the case that proves it. */
      const chapter = chapterOfCase(cs.title);
      const arg = chapter && BOOK_DATA.chapters.find((c) => c.id === chapter);
      if (arg) {
        fields.push({ kind: 'subtitle', text: arg.title });
        fields.push({ kind: 'subtitle', text: arg.number });
      }
      cs.citations.forEach((c) =>
        fields.push({ kind: 'citation', text: `${c.authorOrSource} — ${c.text}` })
      );
    }

    /* The ruleset was unsearchable — nine sheets of operational prompts that
       could only be reached by paging to the end of the book. The prompt text
       is indexed as well as the title, so the mechanic a rule prohibits finds
       the rule that prohibits it. */
    [...(page.promptRuleIds || []), ...(page.promptRuleId ? [page.promptRuleId] : [])].forEach(
      (id) => {
        const rule = PROMPT_RULESET_DATA[id];
        if (!rule) return;
        fields.push({ kind: 'rule', text: rule.title });
        if (rule.subtitle) fields.push({ kind: 'rule', text: rule.subtitle });
        fields.push({ kind: 'content', text: rule.promptText });
      }
    );

    push({
      /* keyed by the section, not by the sheet: two sheets of one section are
         one place in the argument, and listing both put the same title on the
         screen twice — see TY-05, "A Name Is Said Once" */
      id: page.sectionData ? `section:${page.sectionData.id}` : anchorKey(anchor),
      anchor,
      pageIndex: page.index,
      group: page.chapterNumber || page.chapterTitle || page.title,
      title: page.title,
      fields
    });
  });

  /* Bibliography entries, one document each rather than one per sheet of
     eight: a reader looking for Kahneman wants the entry, and the sheet it
     falls on is an accident of how many sources precede it. The sections that
     cite it ride along as text, so a source can also be found by what cites
     it. */
  SOURCES.forEach((s) => {
    const anchor: Anchor = { k: 'source', id: s.id };
    const cites = citedBy(s.id);
    const pageIndex = pageForAnchor(anchor);
    push({
      id: anchorKey(anchor),
      anchor,
      pageIndex,
      group: BOOK_PAGES[pageIndex]?.chapterNumber || '',
      title: s.authorOrSource,
      fields: [
        { kind: 'source', text: s.authorOrSource },
        { kind: 'source', text: s.text },
        ...cites.map((c) => ({ kind: 'source' as FieldKind, text: c }))
      ]
    });
  });

  return docs;
}

/**
 * THE INDEX IS BUILT ON FIRST USE, NOT AT STARTUP.
 *
 * These were module-level constants, so opening the app walked all 56 sheets,
 * tokenised every field on every one of them and built a vocabulary — before
 * the reader had seen anything, and whether or not they ever searched. Most
 * never do. It is pure startup cost on the one surface where cost is most
 * visible, because it lands while the first paint is being waited for.
 *
 * AND THE DOCUMENTS WERE A CONSTANT, WHICH WAS A BUG. The repagination
 * subscription rebuilt the postings — out of a document set that could never
 * change. After a re-cut the index therefore described the book as it had been
 * cut at startup, so a hit resolved to the sheet a phrase used to sit on.
 * Invalidating all three together is what makes that subscription mean what it
 * says.
 *
 * Built at most once per pagination, on the first query, and thrown away when
 * the book is re-cut.
 */
let _docs: Doc[] | null = null;
const DOCS_ = (): Doc[] => (_docs ??= buildDocs());

/** The documents the index is built from, for surfaces that list rather than
    search. Deferred exactly as the postings are. */
export const docs = (): Doc[] => DOCS_();

/* ---------------------------------------------------------------------------
   POSTINGS

   token -> document -> accumulated weight. Built once; queried by walking the
   vocabulary, which is a few thousand strings — cheaper than one pass over the
   manuscript, and it happens per keystroke either way.
--------------------------------------------------------------------------- */

const TOKEN = /[a-z0-9]+/g;

const tokenise = (s: string): string[] => s.toLowerCase().match(TOKEN) || [];

function buildPostings(): Map<string, Map<number, number>> {
  const postings = new Map<string, Map<number, number>>();
  DOCS_().forEach((doc, docIdx) => {
    doc.fields.forEach((f) => {
      const weight = WEIGHT[f.kind];
      tokenise(f.text).forEach((t) => {
        let byDoc = postings.get(t);
        if (!byDoc) {
          byDoc = new Map();
          postings.set(t, byDoc);
        }
        byDoc.set(docIdx, (byDoc.get(docIdx) || 0) + weight);
      });
    });
  });
  return postings;
}

/* Postings are page indices, so a re-cut invalidates every one of them — a
   search would otherwise send a reader to the sheet a phrase was on before the
   book was re-cut for their frame. */
let _postings: ReturnType<typeof buildPostings> | null = null;
let _vocab: string[] | null = null;
const POSTINGS_ = () => (_postings ??= buildPostings());
const VOCAB_ = (): string[] => (_vocab ??= Array.from(POSTINGS_().keys()));
subscribePagination(() => {
  /* All three together: postings derive from documents, and rebuilding one
     out of a stale other is the bug this replaced. */
  _docs = null;
  _postings = null;
  _vocab = null;
});

/* ---------------------------------------------------------------------------
   QUERY
--------------------------------------------------------------------------- */

/**
 * Prefix matching, because a reader is typing.
 *
 * The last term is always treated as incomplete — "postur" has to find
 * "postures" or the results flicker in and out as the word is finished — while
 * earlier terms must match whole, which is what keeps a two-word query from
 * matching half the book.
 */
function expand(term: string, prefix: boolean): string[] {
  if (!prefix) return POSTINGS_().has(term) ? [term] : [];
  if (POSTINGS_().has(term) && term.length > 3) return [term];
  return VOCAB_().filter((t) => t.startsWith(term));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * How many times the query lands inside one document.
 *
 * Counted only for the rows actually shown — it is the reason five hits on one
 * sheet collapse to one row instead of five, so a reader can still tell that
 * the sheet answered five times.
 */
function countIn(doc: Doc, terms: string[]): number {
  let n = 0;
  doc.fields.forEach((f) => {
    const words = tokenise(f.text);
    terms.forEach((term, i) => {
      const last = i === terms.length - 1;
      n += words.filter((w) => (last ? w.startsWith(term) : w === term)).length;
    });
  });
  return Math.max(1, n);
}

/** A window of the field the query landed in, the way the old search cut one. */
function snippetFor(doc: Doc, terms: string[]): { text: string; kind: FieldKind; para?: number } {
  const re = new RegExp(escapeRe(terms[0]), 'i');
  /* Never the row's own title. When a query matches a heading, the heading is
     already the first line of the row, and printing it again underneath is the
     same string twice in one frame — TY-05. The snippet is what the title does
     not already say, so it is drawn from the best field that is not it. */
  const rest = doc.fields
    .filter((f) => f.text !== doc.title)
    .sort((a, b) => WEIGHT[b.kind] - WEIGHT[a.kind]);
  const field = rest.find((f) => re.test(f.text)) || rest[0] || doc.fields[0];
  if (!field) return { text: '', kind: 'content' };
  const at = field.text.toLowerCase().indexOf(terms[0]);
  if (field.kind === 'title' || field.kind === 'figure' || at === -1) {
    return { text: field.text, kind: field.kind, para: field.para };
  }
  const from = Math.max(0, at - 40);
  const to = Math.min(field.text.length, at + 80);
  return {
    text: `${from > 0 ? '…' : ''}${field.text.slice(from, to)}${to < field.text.length ? '…' : ''}`,
    kind: field.kind,
    para: field.para
  };
}

/**
 * Every document matching a query, best first.
 *
 * Terms are ANDed: a document has to answer all of them. Scores are summed
 * across terms and across fields, so a sheet that says the word once in its
 * title outranks a sheet that says it twice in the middle of a paragraph, and
 * a sheet that says it in both outranks either.
 */
export function search(query: string, limit = 40): Hit[] {
  const terms = tokenise(query);
  if (terms.length === 0) return [];

  let live: Map<number, number> | null = null;

  for (let i = 0; i < terms.length; i++) {
    const last = i === terms.length - 1;
    const tokens = expand(terms[i], last);
    if (tokens.length === 0) return [];

    const round = new Map<number, number>();
    tokens.forEach((t) => {
      POSTINGS_().get(t)?.forEach((weight, docIdx) => {
        round.set(docIdx, Math.max(round.get(docIdx) || 0, weight));
      });
    });

    if (live === null) {
      live = round;
    } else {
      const merged = new Map<number, number>();
      live.forEach((score, docIdx) => {
        const add = round.get(docIdx);
        if (add !== undefined) merged.set(docIdx, score + add);
      });
      live = merged;
    }
    if (live.size === 0) return [];
  }

  return Array.from(live || [])
    .sort((a, b) => b[1] - a[1] || DOCS_()[a[0]].pageIndex - DOCS_()[b[0]].pageIndex)
    .slice(0, limit)
    .map(([docIdx, score]) => {
      const doc = DOCS_()[docIdx];
      const snip = snippetFor(doc, terms);
      /* The row stands for the section; the anchor points at the paragraph the
         query landed in, so a hit in the third sheet of a section opens the
         third sheet rather than the section's first. */
      const anchor: Anchor =
        snip.para !== undefined && doc.anchor.k === 'section'
          ? { k: 'section', id: doc.anchor.id, para: snip.para }
          : doc.anchor;
      return {
        doc,
        anchor,
        pageIndex: pageForAnchor(anchor),
        score,
        count: countIn(doc, terms),
        kind: snip.kind,
        snippet: snip.text
      };
    });
}

/**
 * The same results, filed under the book's own headings.
 *
 * Groups are ordered by their best row rather than by position in the book: a
 * bibliography entry that answers the query exactly belongs above a chapter
 * that merely mentions the word, whatever order they are bound in.
 */
export function searchGrouped(query: string, limit = 40): Group[] {
  const hits = search(query, limit);
  const groups: Group[] = [];
  const byTitle = new Map<string, Group>();
  hits.forEach((h) => {
    let g = byTitle.get(h.doc.group);
    if (!g) {
      g = { title: h.doc.group, hits: [] };
      byTitle.set(h.doc.group, g);
      groups.push(g);
    }
    g.hits.push(h);
  });
  return groups;
}

/**
 * The pages a query matches, for the index drawer's filter.
 *
 * The drawer used to match titles and subtitles by substring, so filtering the
 * index for a phrase from the middle of a chapter returned nothing and the
 * reader concluded the book did not contain it. It asks the same index the
 * search well does now, and only renders the answer differently.
 */
export function matchingPages(query: string): Set<number> {
  const out = new Set<number>();
  if (!query.trim()) return out;
  search(query, DOCS_().length).forEach((h) => out.add(h.pageIndex));
  return out;
}
