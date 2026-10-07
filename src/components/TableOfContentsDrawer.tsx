import React, { useState, useMemo, useEffect } from 'react';
import { X, BookOpen, Search } from './organic/Icons';
import { BOOK_PAGES, BookPage, FIGURES, pageForPromptRule, sheetKey } from '../data/pageModel';
import { DEFINITIONS } from '../data/definitions';
import { parseEmphasis } from '../data/emphasis';
import { UserPreferences, Bookmark } from '../data/userStore';
import { pageForAnchor } from '../data/anchors';
import { matchingPages } from '../data/searchIndex';
import { ruleName, FULL_RULESET_TEXT, PROMPT_RULESET_DATA } from '../data/promptData';
import { toolOfRule, figureOfRule, chapterOfFigure } from '../data/relations';
import { RULE_TAGS, FIGURE_TAGS, TOOL_TAGS, searchKeyFor } from '../data/tags';
import { Vein, Soma, SomaLabel } from './organic/Organic';
import { useOverlayFocus } from '../utils/a11y';

/**
 * The order the folder lists the rules in: the global rule, the eight branches,
 * then the gate. It is the ruleset's own order, written out because
 * `PROMPT_RULESET_DATA` is a record and a record has no order to read.
 */
const RULE_ORDER = [
  'global-rule',
  'branch-1', 'branch-2', 'branch-3', 'branch-4',
  'branch-5', 'branch-6', 'branch-7', 'branch-8',
  'verification-checklist'
];

/** "chapter-3" → "CHAPTER III", from the manuscript rather than from a table. */
function chapterLabel(chapterId: string): string | undefined {
  const page = BOOK_PAGES.find((p) => p.chapterId === chapterId && p.chapterNumber);
  return page?.chapterNumber;
}

interface ApplicationItem {
  id: string;
  ruleId: string;
  title: string;
  subtitle: string;
  figureType?: NonNullable<BookPage['diagramType']>;
  figureShort?: string;
  figureTitle?: string;
  chapterNumber?: string;
}

/**
 * THE ROWS, DERIVED — not a second copy of the ruleset with its own wording.
 *
 * This was ten hand-written entries, and nine of them carried a `subtitle`
 * that was a PARAPHRASE of the author's: "Replaces psychographic profiling
 * with the three cognitive postures." against his "Reach for this when writing
 * positioning or a go-to-market plan. It replaces demographic and psychographic
 * segments with the three cognitive postures, and makes you name the source
 * under every strategic claim."
 *
 * Every clause of the paraphrase was true. Not one word of it was his — and
 * TY-04 does not distinguish: "rephrasing it so the duplicate is not literal is
 * the same fault wearing a disguise." A reader could not tell those nine lines
 * from the dossier, which is the whole damage the rule names.
 *
 * So the row is assembled from what already exists. The title and the
 * description come from `PROMPT_RULESET_DATA`, the figure from the relations
 * graph, and the chapter from the figure's own chapter. Nothing here is written,
 * and nothing can drift from the ruleset, because there is no second copy to
 * drift.
 */
const APPLICATIONS: ApplicationItem[] = RULE_ORDER.map((ruleId) => {
  const rule = PROMPT_RULESET_DATA[ruleId];
  const figureType = figureOfRule(ruleId) as NonNullable<BookPage['diagramType']> | null;
  const figure = figureType ? FIGURES.find((f) => f.type === figureType) : undefined;
  const chapterId = figureType ? chapterOfFigure(figureType) : null;
  return {
    id: ruleId,
    ruleId,
    title: rule?.title || ruleId,
    subtitle: rule?.subtitle || '',
    figureType: figureType || undefined,
    figureShort: figure?.short,
    figureTitle: figure?.title,
    chapterNumber: chapterId ? chapterLabel(chapterId) : undefined
  };
});

/**
 * Authored emphasis, drawn. The ranges come from `parseEmphasis`, which the
 * reader's own page renderer uses on the same strings — one parser, so a
 * definition and the paragraph it was lifted from can never italicise
 * differently.
 */
function renderSpans(text: string, spans: Array<[number, number]>): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let at = 0;
  spans.forEach(([from, to], i) => {
    if (from > at) out.push(text.slice(at, from));
    out.push(<em key={i} className="italic">{text.slice(from, to)}</em>);
    at = to;
  });
  if (at < text.length) out.push(text.slice(at));
  return out;
}

/**
 * The paragraph at the head of the folder, in the document's own words.
 *
 * Lifted out of `FULL_RULESET_TEXT` rather than typed here, so it cannot drift
 * from the ruleset it introduces and so no sentence on this surface is one the
 * author did not write (TY-04). It is the second paragraph of the ruleset's own
 * "How to use this document" — chosen over the first because the first explains
 * how to paste a *branch*, and this folder has stopped calling them that.
 */
const RULESET_PARAGRAPH = (() => {
  const m = /Every rule traces to[^]*?requires it\./.exec(FULL_RULESET_TEXT);
  return m ? m[0].replace(/\s+/g, ' ').trim() : '';
})();

/**
 * What each instrument is called, said on the control that opens it.
 *
 * This column used to read "Application" on all six rows — one word, six times,
 * naming an action rather than a destination, which is both the repetition
 * TY-05 refuses and a promise the control could not keep back when it led to a
 * branch of prose. Now that each row opens a different instrument, the row can
 * say which one, and the reader chooses a tool instead of pressing the same
 * word six times to find out where it goes.
 *
 * Two figures share the content budget and two share the causal taxonomy, so
 * two names do each appear twice down the column. That is not a name said
 * twice about one thing — it is two different figures correctly pointing at the
 * same instrument, and hiding it would make the column less true, not less
 * repetitive.
 */
const TOOL_NAMES: Record<string, string> = {
  'five-questions': 'Five questions',
  'content-budget': 'Content Pollution Control',
  'restoration-delta': 'Restoration Delta',
  'causal-taxonomy': 'Causal Taxonomy'
};

/** The drawer's folders. Saved leads because it is the reader's own. */
export type TocTab = 'saved' | 'contents' | 'definitions' | 'tools';

interface TableOfContentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageIndex: number;
  onSelectPage: (pageIndex: number) => void;
  prefs: UserPreferences;
  /**
   * The sheets this reader has been inside, by sheetKey.
   *
   * The map already draws this and the index is where a reader actually looks
   * for their place, so the same memory is spoken in the same language in both:
   * light, and nothing else. No tick, no count, no bar — a row that has been
   * read is simply lit, exactly as a cell is.
   */
  visitedPages?: string[];

  /** The reader's own saved places, newest first, as `userStore` holds them. */
  bookmarks?: Bookmark[];
  /** Drop one saved place. */
  onRemoveBookmark?: (id: string) => void;
  /**
   * Which folder to open on. The saved-places control in the chrome opens this
   * drawer directly on its own folder rather than dropping the reader on the
   * index to find it — a control that opens a surface but not the thing it
   * names has not actually arrived anywhere.
   */
  initialTab?: TocTab;

  /** open one of the instruments — what a figure's Application row now does */

}

export const TableOfContentsDrawer: React.FC<TableOfContentsDrawerProps> = ({
  isOpen,
  onClose,
  currentPageIndex,
  onSelectPage,
  prefs,
  visitedPages,
  bookmarks,
  onRemoveBookmark,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<TocTab>(initialTab ?? 'contents');

  /* The folder the drawer opens on follows the control that opened it, but only
     on the opening. Re-syncing on every render would drag a reader who opened
     on Saved and then tapped Index straight back to Saved. */
  useEffect(() => {
    if (isOpen && initialTab) setActiveTab(initialTab);
  }, [isOpen, initialTab]);
  const readSheets = useMemo(() => new Set(visitedPages ?? []), [visitedPages]);
  const [filterQuery, setFilterQuery] = useState('');

  /* THE FILTER READS WHAT IS NOT ON THE ROW.

     A practitioner with a newsletter problem types "email". Nothing on the CRM
     row says email — the dossier calls it lifecycle messaging — so the folder
     used to answer that it holds nothing of the kind. Every row now carries an
     invisible key built from its own name, its description, its figure, its
     instrument and its tags (`src/data/tags.ts`), and the filter matches that.

     Word by word, and every word must hit: "email onboarding" narrows to the
     row that is about both, where the old OR-over-fields matched anything
     containing either and put the whole list back. */
  const visibleApplications = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return APPLICATIONS;
    const words = q.split(/s+/).filter(Boolean);
    return APPLICATIONS.filter((app) => {
      const tool = toolOfRule(app.ruleId);
      const key = searchKeyFor(
        [
          ruleName(app.ruleId, app.title),
          app.title,
          app.subtitle,
          app.chapterNumber,
          app.figureShort,
          app.figureTitle,
          tool ? TOOL_NAMES[tool] : undefined
        ],
        RULE_TAGS[app.ruleId],
        app.figureType ? FIGURE_TAGS[app.figureType] : undefined,
        tool ? TOOL_TAGS[tool] : undefined
      );
      return words.every((w) => key.includes(w));
    });
  }, [filterQuery]);
  const panelRef = useOverlayFocus<HTMLDivElement>(isOpen);

  /**
   * The filter asks the same index the search well asks.
   *
   * It had a matcher of its own that read the title, the chapter title and the
   * subtitle — so filtering the index for a phrase from the middle of a chapter
   * returned nothing at all, and a reader could only conclude the book did not
   * contain it. Two lookups over one book is one lookup too many; the drawer
   * now only renders the answer differently.
   */
  const hits = React.useMemo(
    () => (filterQuery.trim().length < 2 ? null : matchingPages(filterQuery)),
    [filterQuery]
  );

  /* Every hook above the early return: a drawer that is closed still
     renders, and a hook that only runs when it is open changes the hook order
     between the two. */
  if (!isOpen) return null;

  const isDark = prefs.theme === 'dark';

  const matches = (page: BookPage) => {
    if (!filterQuery.trim()) return true;
    if (hits) return hits.has(page.index);
    // a single character is a prefix, not a query — match the visible names
    const q = filterQuery.toLowerCase();
    return (
      page.title.toLowerCase().includes(q) ||
      !!(page.chapterTitle && page.chapterTitle.toLowerCase().includes(q)) ||
      !!(page.subtitle && page.subtitle.toLowerCase().includes(q))
    );
  };

  /**
   * One entry in the index. Selection is a swell of light inside the cell —
   * never a slab of inverted ink, which is what makes a list read as a table
   * of boxes rather than a run of cells on the same strand.
   */
  const PageCell: React.FC<{ page: BookPage; showSubtitle?: boolean; phase: number }> = ({
    page,
    showSubtitle = false,
    phase
  }) => {
    const isSelected = page.index === currentPageIndex;
    const k = sheetKey(page);
    const wasRead = !!k && readSheets.has(k);
    return (
      <button
        onClick={() => {
          onSelectPage(page.index);
          onClose();
        }}
        className={`w-full text-left p-2.5 flex items-center justify-between gap-2 text-[12px] rounded-none ${
 isSelected ? 'membrane-lit' : 'bud opacity-80'
 }`}
      >
        <div className="truncate pr-2 flex items-center gap-2.5 min-w-0">
          <Soma size={9} opacity={isSelected ? 1 : wasRead ? 0.85 : 0.35} phase={phase} />
          <span className="min-w-0">
            <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70 block truncate">
              {page.chapterNumber}
            </span>
            <span className={`title-face text-[12px] font-light block truncate ${isSelected ? 'opacity-100' : wasRead ? 'opacity-100' : 'opacity-45'}`}>
              {page.title}
            </span>
            {showSubtitle && page.subtitle && (
              <span className="text-[9px] font-light opacity-70 block truncate">{page.subtitle}</span>
            )}
          </span>
        </div>
      </button>
    );
  };

  /* Read twice: once for the count on the group, once for the rows in it.
     Filtering separately in each place is exactly how the two drift apart. */
  const diagramPages = BOOK_PAGES.filter(p => p.type === 'diagram');

  const Section: React.FC<{
    title: string;
    note?: string;
    pages: BookPage[];
    showSubtitle?: boolean;
    phase: number;
  }> = ({ title, note, pages, showSubtitle, phase }) => {
    /* ONE ROW PER SECTION, NOT PER SHEET.
       The paginator cuts a long section into balanced parts, and this list drew
       a row for each one — so a section that runs to three sheets printed its
       chapter and its title three times, identical line for identical line,
       with nothing on the row to tell a reader which part they were choosing.
       Measured in the drawer: ten such rows, including "The Scale Mismatch &
       Distortion of Rules" twice under "PROLOGUE" twice.

       Collapsing them says each name once (TY-05) and adds no copy to do it —
       the alternative was numbering the parts, which is a label the manuscript
       does not contain. The row opens the section's first sheet, which is where
       a reader choosing a section wants to start; the rest is a page turn away.

       Deduped by section id where there is one, and otherwise by what the row
       actually prints, so two genuinely different sheets that happen to render
       the same two lines still collapse — which is the thing being fixed. */
    const visible = pages.filter(matches).filter((page, i, all) => {
      if (i === 0) return true;
      const prev = all[i - 1];
      const key = (pg: BookPage) =>
        pg.sectionData?.id ?? `${pg.chapterNumber ?? ''}|${pg.title}`;
      return key(page) !== key(prev);
    });
    if (visible.length === 0) return null;
    return (
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <SomaLabel opacity={0.75} phase={phase}>{title}</SomaLabel>
          {note && (
            <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45">{note}</span>
          )}
        </div>
        <div className="opacity-40">
          <Vein opacity={0.42} phase={phase + 4} />
        </div>
        <div className="space-y-2.5 px-1">
          {visible.map((page, i) => (
            <PageCell key={page.index} page={page} showSubtitle={showSubtitle} phase={(i * 3.1) % 19} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-start rounded-none">
      {/* Backdrop */}
      <div className="scrim fixed inset-0 transition-opacity rounded-none" onClick={onClose} />

      {/* Drawer — a column of glass with no rule down its inner edge */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation and index"
        className={`veil veil-right settle relative w-full max-w-sm sm:max-w-md h-full flex flex-col z-10 rounded-none ${
        isDark ? 'text-white' : 'text-black'
      }`}>

        {/* Top Header */}
        <div className="p-4 flex items-center justify-between rounded-none">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <h2 className="font-light text-[12px] uppercase tracking-[0.2em]">Navigation &amp; Index</h2>
          </div>
          <button onClick={onClose} className="bud p-1.5 rounded-none outline-none" aria-label="Close index">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="opacity-45 px-3">
          <Vein opacity={0.5} phase={2.6} />
        </div>

        {/* Tab Navigation */}
        {/*
          FOUR FOLDERS IN THE WIDTH THAT HELD THREE.

          The first cut kept `gap-3` and hung `truncate` on the label, and the
          drawer rendered "DEFINIT…(11)" — a folder whose name the reader cannot
          read, which is the failure this app has the least room for: the
          viewport does not scroll, so there is no second look.

          None of the three obvious escapes was available. The type may not drop
          below 9 (TY-02 has three sizes and this is already the smallest), the
          tracking may not be narrowed (TY-03 is one value everywhere, and this
          is uppercase so it carries it), and shortening "Definitions" would be
          writing a label the reader did not ask for.

          So the space comes from the gaps and the padding, which cost nothing:
          measured at 424px of drawer, the four labels and their counts need
          ~410px including gaps at `gap-1.5`. `truncate` is gone entirely — if a
          narrower case ever appears the label wraps onto a second line, which is
          legible where an ellipsis is not.
        */}
        {/*
          THREE FOLDERS. Figures used to be a fourth, listing the same six
          drawings that every rule row already links to — so the reader met each
          figure twice, once on its own and once beside the rule it argues, and
          had to guess which list was the real one. They are one list now, and a
          figure is reached from the work it belongs to.

          No counts. "(6)", "(10)", "(11)" were three numbers that told a reader
          nothing they could act on and shrank the space the names had to be
          read in — which is what forced "DEFINIT…(11)" the last time this bar
          was touched. The names now have the width to themselves.
        */}
        {/* FOUR FOLDERS DO NOT FIT ONE ROW ON A PHONE, so below the width where
            they do, they are two rows of two.

            Measured at 390px with the saved folder added: "Definitions" set 93px
            of type inside an 85.5px button and ran out of both ends of its own
            box. The row needs 4 x 101px of label plus gaps and padding — about
            446px — before it holds, which is why the switch is at 460 and not
            at a named breakpoint. Shortening the word was the other way and it
            is the wrong one: the folder is called what it is called, and a bar
            that renames its contents to fit itself is a bar that has stopped
            describing the app. */}
        <div className="grid grid-cols-2 min-[460px]:flex gap-1.5 px-3 py-2.5 rounded-none">
          {([
            { id: 'saved', label: 'Saved' },
            { id: 'contents', label: 'Index' },
            { id: 'definitions', label: 'Definitions' },
            { id: 'tools', label: 'Tools' }
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`bud flex-1 min-w-0 py-2 px-1 text-[9px] uppercase tracking-[0.2em] rounded-none flex items-center justify-center text-center leading-tight ${
                activeTab === id ? 'bud-lit' : 'opacity-60'
              }`}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Quick Filter Input */}
        <div className="px-3 pb-3 rounded-none">
          {/* A label, so the row is the target. The field itself is 18px tall —
              the height of one line of 12px type — and it was the only part of
              this that answered to a thumb, inside a membrane drawn to look
              like the control. Labelling costs no markup and no pixels: the
              whole 34px row now focuses the field, and nothing moves. */}
          <label className="membrane-faint flex items-center px-3 py-2 text-[12px] rounded-none cursor-text">
            <Search className="w-3.5 h-3.5 opacity-70 mr-2 shrink-0" />
            <input
              type="text"
              /* Names the folders that exist. It said "index, figures & tools"
                 — Figures stopped being a folder when it merged into Tools, so
                 the field was offering to search somewhere the reader could no
                 longer go. Written with a literal ampersand rather than the
                 entity: JSX decodes it either way, and one of the two spellings
                 is readable in the source. */
              placeholder="Search index, definitions & tools..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              /* `w-full` here meant 100% of the ROW, not of the space left
                 beside the icon, so the field ran past its own padding by the
                 width of the glyph and the gap — measured at 435 against a
                 424 box. `flex-1 min-w-0` is the flex-child spelling of the
                 same intent and cannot overshoot. */
              className="bg-transparent border-none focus:outline-none flex-1 min-w-0 text-[12px] font-light placeholder-current/40 rounded-none"
            />
          </label>
        </div>

        {/* Main Content List */}
        <div className="flex-1 overflow-y-auto soft-scroll p-3 space-y-5 rounded-none">

          {/* THE READER'S OWN PLACES.

              Nothing is written here that the reader did not put here. A saved
              place carries the sheet's own title, the section it sits in and
              the date it was saved, all of which are already stored on the
              mark — so the folder says them and invents nothing (TY-04). When
              there are none the folder is empty: an empty state would be a
              sentence this app was never asked for, and a reader who has saved
              nothing already knows it.

              The place resolves through its anchor at read time rather than a
              stored index, so a mark still lands on its own paragraph after the
              book has been re-cut (anchors.ts). */}
          {activeTab === 'saved' && (bookmarks ?? []).map((bm) => {
            const target = pageForAnchor(bm.anchor);
            return (
              <div key={bm.id} className="membrane-faint flex items-stretch rounded-none">
                <button
                  onClick={() => { onSelectPage(target); onClose(); }}
                  className="bud flex-1 min-w-0 text-left px-3 py-2.5 rounded-none flex flex-col gap-1"
                  title={bm.title}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Soma size={7} opacity={target === currentPageIndex ? 0.95 : 0.45} phase={bm.title.length * 2.1} />
                    <span className="text-[12px] font-light truncate">{bm.title}</span>
                  </span>
                  <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45 truncate">
                    {bm.sectionTitle} · {bm.date}
                  </span>
                </button>
                {onRemoveBookmark && (
                  <button
                    onClick={() => onRemoveBookmark(bm.id)}
                    className="bud px-3 rounded-none flex items-center justify-center shrink-0"
                    title={`Remove ${bm.title}`}
                    aria-label={`Remove ${bm.title}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {activeTab === 'contents' && (
            <>
              <Section
                title="Part I: Manifesto & Core Text"
                phase={1.4}
                pages={BOOK_PAGES.filter(p => p.type === 'cover' || p.type === 'chapter-section' || p.type === 'references')}
              />
              <Section
                title="Part II: Vector Diagrams"
                note={`${diagramPages.length} Figures`}
                phase={6.2}
                showSubtitle
                pages={diagramPages}
              />
              <Section
                title="Part III: Production Ruleset"
                note="Prompts"
                phase={15.8}
                pages={BOOK_PAGES.filter(p => p.type === 'prompt-ruleset')}
              />
            </>
          )}

          {/* The worlds.

              These were reachable only by paging until a seed appeared on the
              right sheet — the most distinctive thing in the book, and the only
              part of it with no index. A row opens the world itself, with its
              direct application linked next to it. */}
          {/*
            THE DEFINITIONS.

            Every word of every entry is the author's, lifted verbatim out of
            `bookData` and held there by `audit-definitions`. Nothing on this
            surface is written: the term is the manuscript's own word for the
            thing, the body is the manuscript's own sentence about it, and the
            only thing this component contributes is the order and the way out.

            A row does not restate the section it came from — the section's
            number is the way back, not a caption (TY-05).
          */}
          {activeTab === 'definitions' && (
            <div className="py-1 space-y-1.5">
              {DEFINITIONS.filter(d =>
                !filterQuery ||
                d.term.toLowerCase().includes(filterQuery.toLowerCase()) ||
                d.quote.toLowerCase().includes(filterQuery.toLowerCase())
              ).map((d, i) => {
                const { text, spans } = parseEmphasis(d.quote);
                return (
                  <button
                    key={d.term}
                    onClick={() => {
                      const idx = BOOK_PAGES.findIndex(pg => pg.sectionData?.id === d.sectionId);
                      if (idx >= 0) { onSelectPage(idx); onClose(); }
                    }}
                    className="bud w-full p-2.5 text-left rounded-none block"
                    title={`Go to §${d.sectionId}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Soma size={9} opacity={0.75} phase={i * 3.7 + 2.2} />
                      <span className="text-[12px] font-light uppercase min-w-0 truncate">{d.term}</span>
                      <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45 ml-auto shrink-0">
                        §{d.sectionId}
                      </span>
                    </span>
                    {/* The manuscript's sentence, whole. It wraps and is never
                        clipped — LY-02 puts the scroll in this column, so there
                        is no reason to truncate a definition. */}
                    <span className="block text-[12px] font-light leading-relaxed opacity-70 pt-1.5">
                      {spans.length === 0 ? text : renderSpans(text, spans)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/*
            ONE FOLDER: THE WORK, AND WHAT IT IS DONE WITH.

            Figures and Tools were two lists over the same six drawings. Every
            rule row already linked to its figure and the Figures folder linked
            back to the rule's instrument, so a reader met each figure twice and
            had to work out which list was the real one. They are one row now:
            the rule that governs a piece of work, the drawing that argues it,
            and the instrument that runs it, abreast.

            NO "BRANCH N". The names come from `RULE_NAMES` — "Strategy &
            positioning", not "BRANCH 1 — Marketing Strategy & Positioning".
            The numbering is how the document files them, not what they are
            called, and a reader looking for where to start does not think in
            branch numbers.

            The controls wrap rather than truncate: two of them will not sit on
            one line at every name length and every drawer width, and a control
            whose name is cut is one a reader has to press to identify.
          */}
          {activeTab === 'tools' && (
            <div className="py-1 space-y-2.5">
              {/* What these are, before the list of them. Hidden once a filter
                  is running: a reader who is searching has already decided what
                  the folder is for, and the paragraph would push the answers
                  off the first screen. */}
              {!filterQuery && RULESET_PARAGRAPH && (
                <p className="text-[12px] font-light leading-relaxed opacity-70 pb-1">
                  {RULESET_PARAGRAPH}
                </p>
              )}
              {visibleApplications.length === 0 ? (
                <div className="py-12 text-center opacity-70 text-[12px] space-y-2">
                  <p className="font-light uppercase tracking-[0.2em]">No matching tools</p>
                </div>
              ) : (
                visibleApplications.map((app) => (
                    <div key={app.id} className="membrane p-3 text-[12px] space-y-2 rounded-none">
                      <button
                        onClick={() => {
                          onSelectPage(pageForPromptRule(app.ruleId));
                          onClose();
                        }}
                        className="text-left w-full outline-none block"
                        title="Open the rule"
                      >
                        {app.chapterNumber && (
                          <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70 block truncate">
                            {app.chapterNumber}
                          </span>
                        )}
                        <span className="title-face text-[12px] font-light block opacity-100">
                          {ruleName(app.ruleId, app.title)}
                        </span>
                        <span className="text-[9px] font-light opacity-70 block leading-relaxed mt-0.5">
                          {app.subtitle}
                        </span>
                      </button>

                      {/* THE APPARATUS CHIPS ARE GONE FROM THIS LIST.
                          A branch row carried its figure and its instrument as
                          two lit chips beneath the name, which made every row
                          three offers deep and turned a list of rules into a
                          launcher. The row's own job is to name the rule and
                          open it; the figure and the instrument are reachable
                          from the rule itself, where they are in context, and
                          from the Figures and Tools tabs beside this one. Said
                          once, in the place that owns it (TY-05). */}
                    </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

