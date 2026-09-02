import React, { useState, useRef } from 'react';
import {
  X,
  BookOpen,
  Bookmark as BookmarkIcon,
  FileText,
  Search,
  Trash2,
  Clock,
  CheckCircle,
  ExternalLink,
  Download,
  Upload
} from 'lucide-react';
import { BOOK_PAGES, BookPage, FIGURES } from '../data/pageModel';
import { Bookmark, Highlight, UserPreferences } from '../data/userStore';
import { pageForAnchor } from '../data/anchors';
import { matchingPages } from '../data/searchIndex';
import { Vein, Soma, SomaLabel } from './organic/Organic';
import { useOverlayFocus } from '../utils/a11y';
import { exportReaderState, importReaderState } from '../data/userStore';

interface TableOfContentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageIndex: number;
  onSelectPage: (pageIndex: number) => void;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  onRemoveBookmark: (id: string) => void;
  onRemoveHighlight: (id: string) => void;
  prefs: UserPreferences;
  /** Called after a successful restore so App can re-read storage. */
  onOpenFigure?: (type: NonNullable<BookPage['diagramType']>) => void;
  onImported?: () => void;
}

/* HOW LONG THIS TAKES TO READ, COUNTED RATHER THAN TYPED IN.

   This was `const readingTimeMin = 42`, sitting beside a hand-written figure
   count that was also wrong. Both are LY-01 in miniature: a number written by
   hand cannot track a list it does not own, and neither had any way to notice
   when the sheets changed underneath it — which they since have, twice, as the
   bibliography collapsed to one sheet and the case study stopped being one.

   Counted over what a reader can actually reach: the prose on the sheets, the
   evidence that opens over 2.3, and the annotations in the bibliography. 220wpm
   is the rate the original estimate was struck at, kept so the two are
   comparable. */
const READING_WPM = 220;

const READING_MINUTES = Math.max(1, Math.round(
  BOOK_PAGES.reduce((words, p) => {
    const parts: string[] = [];
    if (p.sectionData?.content) parts.push(...p.sectionData.content);
    if (p.caseStudyData) {
      parts.push(p.caseStudyData.fragile, p.caseStudyData.antifragile, p.caseStudyData.verdict);
    }
    (p.consolidatedSourcesChunk || []).forEach((c) => parts.push(c.text));
    return words + parts.join(' ').split(/\s+/).filter(Boolean).length;
  }, 0) / READING_WPM
));

export const TableOfContentsDrawer: React.FC<TableOfContentsDrawerProps> = ({
  isOpen,
  onClose,
  currentPageIndex,
  onSelectPage,
  bookmarks,
  highlights,
  onRemoveBookmark,
  onRemoveHighlight,
  prefs,
  onOpenFigure,
  onImported
}) => {
  const [activeTab, setActiveTab] = useState<'contents' | 'figures' | 'bookmarks' | 'highlights'>('contents');
  const [filterQuery, setFilterQuery] = useState('');
  const [importNote, setImportNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useOverlayFocus<HTMLDivElement>(isOpen);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    const result = importReaderState(await file.text());
    setImportNote(result.message);
    if (result.ok) onImported?.();
  };

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
          <Soma size={9} opacity={isSelected ? 1 : 0.5} phase={phase} />
          <span className="min-w-0">
            <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-60 block truncate">
              {page.chapterNumber}
            </span>
            <span className={`text-[12px] font-light block truncate ${isSelected ? 'opacity-100' : 'opacity-65'}`}>
              {page.title}
            </span>
            {showSubtitle && page.subtitle && (
              <span className="text-[9px] font-light opacity-60 block truncate">{page.subtitle}</span>
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
    const visible = pages.filter(matches);
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
        <div className="flex gap-3 px-3 py-2.5 rounded-none">
          {([
            { id: 'contents', label: 'Index', Icon: null, count: null },
            { id: 'figures', label: 'Figures', Icon: null, count: FIGURES.length },
            { id: 'bookmarks', label: 'Marks', Icon: BookmarkIcon, count: bookmarks.length },
            { id: 'highlights', label: 'Notes', Icon: FileText, count: highlights.length }
          ] as const).map(({ id, label, Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`bud flex-1 py-2 text-[12px] uppercase tracking-[0.2em] rounded-none flex items-center justify-center gap-1.5 ${
 activeTab === id ? 'bud-lit' : 'opacity-60'
 }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{label}</span>
              {count !== null && <span className="opacity-70">({count})</span>}
            </button>
          ))}
        </div>

        {/* Quick Filter Input */}
        <div className="px-3 pb-3 rounded-none">
          <div className="membrane-faint flex items-center px-3 py-2 text-[12px] rounded-none">
            <Search className="w-3.5 h-3.5 opacity-70 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search chapters & figures..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="bg-transparent border-none focus:outline-none w-full text-[12px] font-light placeholder-current/40 rounded-none"
            />
          </div>
        </div>

        {/* Main Content List */}
        <div className="flex-1 overflow-y-auto soft-scroll p-3 space-y-5 rounded-none">

          {activeTab === 'contents' && (
            <>
              <Section
                title="Part I: Manifesto & Core Text"
                phase={1.4}
                pages={BOOK_PAGES.filter(p => p.type === 'cover' || p.type === 'chapter-section' || p.type === 'references')}
              />
              {/* The count follows the list. It read "4 Figures" against five
                  diagram sheets, and then six — a number written by hand cannot
                  track a list it does not own (LY-01; OPEN.md 7 records the
                  same fault in the bibliography). */}
              <Section
                title="Part II: Vector Diagrams"
                note={`${diagramPages.length} Figures`}
                phase={6.2}
                showSubtitle
                pages={diagramPages}
              />
              {/* "Supplementary Addendum" stood here over a
                  `type === 'case-study'` filter. The evidence stopped being a
                  sheet of its own and now opens over the section it evidences,
                  so that filter can never match and the group can never appear.
                  Removed rather than left as a heading waiting on a page type
                  nothing constructs. */}
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
              part of it with no index. A row opens the world itself rather than
              the page hiding it. */}
          {activeTab === 'figures' && (
            <div className="py-1">
              {FIGURES.filter(f =>
                !filterQuery ||
                f.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
                f.short.toLowerCase().includes(filterQuery.toLowerCase())
              ).map((f, i) => (
                <button
                  key={f.type}
                  onClick={() => { onOpenFigure?.(f.type); onClose(); }}
                  className="bud w-full text-left px-3 py-2 flex items-center gap-2.5 rounded-none outline-none"
                >
                  <Soma size={9} opacity={0.75} phase={i * 3.1 + 1.4} />
                  <span className="min-w-0">
                    <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-60 block truncate">
                      {f.short}
                    </span>
                    <span className="text-[12px] font-light block truncate">{f.title}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="space-y-3.5">
              {bookmarks.length === 0 ? (
                <div className="py-12 text-center opacity-60 text-[12px] space-y-2">
                  <BookmarkIcon className="w-8 h-8 mx-auto mb-2 opacity-70" />
                  <p className="font-light uppercase tracking-[0.2em]">No bookmarks saved</p>
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="membrane p-3 flex items-center justify-between gap-2 text-[12px] rounded-none"
                  >
                    <button
                      onClick={() => {
                        onSelectPage(pageForAnchor(bm.anchor));
                        onClose();
                      }}
                      className="text-left truncate flex-1 pr-2"
                    >
                      <span className="font-light block truncate">{bm.title}</span>
                      <span className="text-[9px] opacity-70 block truncate">{bm.sectionTitle}</span>
                      <span className="text-[9px] opacity-50">{bm.date}</span>
                    </button>
                    <button
                      onClick={() => onRemoveBookmark(bm.id)}
                      className="bud p-1.5 rounded-none"
                      title="Remove Bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'highlights' && (
            <div className="space-y-3.5">
              {highlights.length === 0 ? (
                <div className="py-12 text-center opacity-60 text-[12px] space-y-2">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-70" />
                  <p className="font-light uppercase tracking-[0.2em]">No notes saved</p>
                </div>
              ) : (
                highlights.map((hl, i) => (
                  <div key={hl.id} className="membrane p-3 text-[12px] space-y-1.5 rounded-none">
                    <div className="flex items-center justify-between gap-2">
                      <SomaLabel opacity={0.7} phase={(i * 4.3) % 19}>{hl.sectionTitle}</SomaLabel>
                      <button
                        onClick={() => onRemoveHighlight(hl.id)}
                        className="bud p-1 rounded-none"
                        title="Remove note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {/* the quote hangs off a filament, not off a bar */}
                    <div className="flex gap-2.5">
                      <div className="h-auto self-stretch">
                        <Vein orientation="v" opacity={0.45} phase={(i * 2.7) % 19} />
                      </div>
                      <p className="italic text-[12px] font-light leading-relaxed opacity-90 flex-1">
                        "{hl.text}"
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onSelectPage(pageForAnchor(hl.anchor));
                        onClose();
                      }}
                      className="bud text-[9px] font-light uppercase tracking-[0.2em] flex items-center gap-1.5 px-1 py-0.5"
                    >
                      <span>Jump to Page</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Marks custody — browser storage is not durable, so the reader must be
            able to carry their own marks out and back in. */}
        <div className="opacity-45 px-3">
          <Vein opacity={0.5} phase={13.7} />
        </div>
        <div className="px-3 pt-2.5 flex items-center gap-2.5">
          <button
            onClick={exportReaderState}
            className="bud flex-1 py-2 text-[9px] font-light uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 rounded-none"
            title="Download bookmarks, notes and preferences as a JSON file"
          >
            <Download className="w-3 h-3" />
            <span>Export Marks</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bud flex-1 py-2 text-[9px] font-light uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 rounded-none"
            title="Merge a previously exported marks file"
          >
            <Upload className="w-3 h-3" />
            <span>Restore</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
        {importNote && (
          <p className="px-3 pt-1.5 text-[9px] font-light opacity-65" role="status" aria-live="polite">
            {importNote}
          </p>
        )}

        {/* Footer Info */}
        <div className="p-3 text-[12px] flex items-center justify-between opacity-70 rounded-none">
          <div className="flex items-center space-x-1.5 text-[9px] font-light uppercase tracking-[0.2em]">
            <Clock className="w-3 h-3" />
            <span>~{READING_MINUTES} min read</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[9px] font-light uppercase tracking-[0.2em]">
            <CheckCircle className="w-3 h-3" />
            <span>Offline Ready</span>
          </div>
        </div>

      </div>
    </div>
  );
};

