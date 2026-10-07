import { useState, useEffect, useSyncExternalStore, lazy, Suspense } from 'react';
import {
  sheetKey, BOOK_PAGES, BookPage, firstPageOfDiagram,
  subscribePagination, getPaginationVersion
} from './data/pageModel';
import { useSheetBudget } from './utils/sheetBudget';
import { anchorForPage, pageForAnchor } from './data/anchors';
import { 
  loadPreferences, 
  savePreferences, 
  loadBookmarks, 
  saveBookmarks, 
  loadHighlights, 
  saveHighlights, 
  loadLastAnchor,
  saveLastPage,
  loadVisitedChapters,
  markChapterVisited,
  loadVisitedPages,
  markPageVisited, 
  hasReadBefore, 
  Bookmark, 
  Highlight, 
  UserPreferences 
} from './data/userStore';
import { HeaderNav } from './components/HeaderNav';
import { Soma } from './components/organic/Organic';
import { TableOfContentsDrawer, TocTab } from './components/TableOfContentsDrawer';
import { IntroScreen } from './components/IntroScreen';
import { dismissDepth } from './utils/dismissStack';
import { SettingsDrawer } from './components/SettingsDrawer';
import { SearchModal } from './components/SearchModal';
import { setAmbientMusic, bindAmbientMusicToVisibility } from './utils/ambientMusic';

// The map is ~6000 SVG elements and the single heaviest module in the app. It is
// the front door, so it still loads first — but as its own chunk, so the reader
// and the manuscript are not held behind it.
/* The fetch starts NOW — at module evaluation, in parallel with everything else
   index.js does — instead of after React has mounted and rendered the first
   Suspense fallback. On a cold load that removes a full serial round trip from
   the path to the map. */
const orreryImport = import('./components/Orrery');
const Orrery = lazy(() => orreryImport.then((m) => ({ default: m.Orrery })));

// The reader (and with it the page-turn animation engine) is not needed until
// someone leaves the map, so it does not belong in the first paint either.
/* The reader is not on the first-paint path, so it must not compete with the
   map for bandwidth — but by the time anyone dives into a chapter it should
   already be here. Fetched when the main thread goes idle. */
let bookSpreadImport: Promise<typeof import('./components/BookSpread')> | null = null;
const fetchBookSpread = () =>
  (bookSpreadImport ??= import('./components/BookSpread'));
const BookSpread = lazy(() => fetchBookSpread().then((m) => ({ default: m.BookSpread })));
if (typeof window !== 'undefined') {
  const idle = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 2500));
  idle(() => {
    fetchBookSpread();
    // the five figure worlds: ~50KB total, and a first touch on any of them
    // should open from cache, not from the network
    import('./components/FigureStage');
    import('./components/diagrams/MediaUniverseDiagram');
    import('./components/diagrams/BaitTaxonomyDiagram');
    import('./components/diagrams/CausalTaxonomyDiagram');
    import('./components/diagrams/CognitivePosturesDiagram');
    import('./components/diagrams/AntiEngagementDiagram');
  });
}

/**
 * Which cell on the map a page belongs to.
 *
 * Kept here, on the page's own fields, rather than imported from the Orrery:
 * the map is a lazily loaded chunk and reaching into it for one lookup would
 * pull the whole organism back into the first paint.
 */
function mapNodeForPage(page: { type: string; chapterId?: string }): string {
  if (page.type === 'references') return 'refs';
  if (!page.chapterId || page.chapterId === 'prologue') return 'core';
  return page.chapterId;
}

/**
 * Front-door waiting state.
 *
 * The same cell the inline boot splash in index.html draws, at the same size
 * and the same spot — so boot splash, this, and the map's core are one organism
 * thickening in place, never three different loading screens. The second
 * generation of twigs is what the splash cannot afford (it lives in the HTML
 * head); here it costs nothing and reads as the tissue growing while you wait.
 * No spinner, no bar: one cell, breathing, and a name almost too quiet to read.
 */
function MapPending() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center" role="status" aria-live="polite">
      <svg viewBox="0 0 100 100" width="132" height="132" fill="none"
        stroke="currentColor" strokeLinecap="round" className="ambient-breathe pending-cell"
        style={{ overflow: 'visible' }} aria-hidden="true">
        {/* the splash's eight processes, exactly */}
        <g strokeWidth="1" opacity="0.85">
          <path d="M50 50 Q57 40 62 27" /><path d="M50 50 Q60 52 74 48" />
          <path d="M50 50 Q57 62 68 71" /><path d="M50 50 Q48 62 43 76" />
          <path d="M50 50 Q38 57 26 60" /><path d="M50 50 Q40 44 28 36" />
          <path d="M50 50 Q49 38 46 24" /><path d="M50 50 Q63 45 78 34" />
        </g>
        {/* the generation the splash could not afford: finer, forking on */}
        <g strokeWidth="0.45" opacity="0.5" className="pending-fine">
          <path d="M62 27 Q66 21 65 14" /><path d="M62 27 Q68 24 73 19" />
          <path d="M74 48 Q82 46 88 49" /><path d="M74 48 Q80 52 84 58" />
          <path d="M68 71 Q73 77 72 84" /><path d="M68 71 Q75 72 81 77" />
          <path d="M43 76 Q41 83 36 88" /><path d="M43 76 Q47 83 46 90" />
          <path d="M26 60 Q18 62 12 60" /><path d="M26 60 Q20 66 14 68" />
          <path d="M28 36 Q20 33 15 27" /><path d="M28 36 Q22 39 15 39" />
          <path d="M46 24 Q44 16 40 11" /><path d="M46 24 Q49 16 48 9" />
          <path d="M78 34 Q85 30 90 24" /><path d="M78 34 Q86 36 92 33" />
        </g>
        {/* bead tips, as the splash draws them */}
        <g fill="currentColor" stroke="none">
          <circle cx="62" cy="27" r="1.2" /><circle cx="74" cy="48" r="1.2" />
          <circle cx="68" cy="71" r="1.2" /><circle cx="43" cy="76" r="1.2" />
          <circle cx="26" cy="60" r="1.2" /><circle cx="28" cy="36" r="1.2" />
          <circle cx="46" cy="24" r="1.2" /><circle cx="78" cy="34" r="1.2" />
          <circle cx="50" cy="50" r="2.2" />
        </g>
        {/* the glow the tide passes through, as every soma carries */}
        <circle cx="50" cy="50" r="10" fill="currentColor" stroke="none" opacity="0.06" />
      </svg>
      <span className="mt-4 text-[9px] font-light uppercase tracking-[0.2em] opacity-25">
        Tissue settling
      </span>
    </div>
  );
}

export default function App() {
  /* Resumed from an anchor, not from a stored index: the book may have been
     re-cut since this reader was last here — a longer sheet on this screen, a
     paragraph added to the manuscript — and an index would land them wherever
     that number now falls. The anchor lands them on the words they left. */
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(
    () => Math.min(pageForAnchor(loadLastAnchor()), BOOK_PAGES.length - 1)
  );
  /* Asked once, at mount. The first save would otherwise flip it mid-session and
     turn "Proceed" into "Resume" under a reader who has not gone anywhere. */
  const [returning] = useState<boolean>(() => hasReadBefore());
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences());
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => loadBookmarks());
  const [highlights, setHighlights] = useState<Highlight[]>(() => loadHighlights());

  /* The entry screen, asked for as a surface the reader dismisses rather than
     one that fades on a timer. It stands where the inlined boot mark hands over,
     so it is up before the map has finished building and the reader is never
     looking at a blank ground. Not remembered across visits: it was asked for as
     a gate, and a gate that only appears once is a splash with extra steps. */
  const [introOpen, setIntroOpen] = useState(true);

  /*
   * THE BOOK IS CUT FOR THIS FRAME, AND THE COUNT FOLLOWS THE CUT.
   *
   * LY-01 has never allowed a hard-coded page count, and now the count is not
   * even fixed across frames: a phone holds less of a section per sheet than a
   * desktop does, so it gets more sheets. Subscribing here is what makes the
   * reader, the running head and the live region all read the SAME cut — a
   * cached count would go on saying "of 47" on a frame that now has 61.
   *
   * Marks are unaffected by design: bookmarks, highlights and the saved
   * position are anchors — a section and a paragraph — resolved to a sheet at
   * read time, so a re-cut moves the page number and never the place.
   */
  useSyncExternalStore(subscribePagination, getPaginationVersion, getPaginationVersion);

  const [isTocOpen, setIsTocOpen] = useState(false);
  /* Which folder the index opens on. The chrome has two controls that open this
     one drawer — the index and the saved places — and each has to arrive at
     the thing it names rather than at the drawer's last state. */
  const [tocTab, setTocTab] = useState<TocTab>('contents');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // The Orrery is the front door: the app always opens on the map.
  const [view, setView] = useState<'orrery' | 'reader'>('orrery');

  /* Measured once the reader is actually on screen: the cut is taken from real
     prose in a real column, and there is none of either on the map. */
  useSheetBudget([view]);
  // The reader surfaces out of the dive rather than cutting in. Cleared once
  // the emergence has played, so returning to a page later is not re-animated.
  const [arrivedByDive, setArrivedByDive] = useState(false);
  // ...and sinks back on the way out, into the cell the map will open on.
  const [departing, setDeparting] = useState(false);
  const [mapFocus, setMapFocus] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /* The music follows the preference and nothing else — it plays across the map
     and the reader alike, so it is bound here rather than in either view, and
     crossing between them never restarts it. `setAmbientMusic` is idempotent,
     so re-running on an unrelated preference change costs nothing. */
  useEffect(() => {
    setAmbientMusic(prefs.musicEnabled);
  }, [prefs.musicEnabled]);

  useEffect(() => bindAmbientMusicToVisibility(), []);

  const handleUpdatePrefs = (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...prefs, ...newPrefs };
    setPrefs(updated);
    savePreferences(updated);
  };

  useEffect(() => {
    if (prefs.accessibleReader) {
      document.body.setAttribute('data-accessible', 'true');
    } else {
      document.body.removeAttribute('data-accessible');
    }
  }, [prefs.accessibleReader]);

  /**
   * The trail back out of an excursion.
   *
   * A figure and the rule that applies it are a detour from the chapter, not
   * three unrelated destinations, and the reader arrives at the rule holding two
   * questions: where was the drawing, and where was I reading. So leaving for
   * the practice records both — [the chapter, the figure] — and one step back
   * answers the first, a second step the second. Nothing here is a browser
   * history: it is only ever this one excursion, and any ordinary page turn ends
   * it, because turning a page is the reader saying they are reading again.
   */
  const [backTrail, setBackTrail] = useState<number[]>([]);

  /* Chapters the reader has opened. The map draws this as memory — a cell that
     has been inside — and never as progress; see the nucleolus in Orrery. */
  const [visitedChapters, setVisitedChapters] = useState<string[]>(() => loadVisitedChapters());
  const [visitedPages, setVisitedPages] = useState<string[]>(() => loadVisitedPages());

  /*
   * A sheet is remembered on arrival, by whatever route.
   *
   * This is an effect on the index rather than a line inside the page-turn
   * handler, because turning a page is only one of the ways a reader arrives at
   * one: the map enters directly, search jumps, the index drawer jumps, a
   * figure's "see the application" jumps, the back-trail returns, and the very
   * first sheet of a session is arrived at without any handler running at all.
   * Marking where the reader IS catches every one of those; marking where they
   * went catches whichever ones someone remembered to edit.
   */
  useEffect(() => {
    const key = sheetKey(BOOK_PAGES[currentPageIndex]);
    if (!key) return;
    const next = markPageVisited(key);
    if (next) setVisitedPages(next);
  }, [currentPageIndex]);

  const handlePageChange = (newIdx: number) => {
    setCurrentPageIndex(newIdx);
    saveLastPage(newIdx);
    setBackTrail([]);
    const chapterId = BOOK_PAGES[newIdx]?.chapterId;
    if (chapterId) {
      const next = markChapterVisited(chapterId);
      if (next) setVisitedChapters(next);
    }
  };

  /** one step back along the trail; two steps is simply this twice */
  const goBack = () => {
    setBackTrail(prev => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      const target = prev[prev.length - 1];
      setCurrentPageIndex(target);
      saveLastPage(target);
      return next;
    });
  };

  const currentPage = BOOK_PAGES[currentPageIndex] || BOOK_PAGES[0];
  const isBookmarked = bookmarks.some(b => pageForAnchor(b.anchor) === currentPageIndex);

  const handleToggleBookmark = () => {
    if (isBookmarked) {
      const updated = bookmarks.filter(b => pageForAnchor(b.anchor) !== currentPageIndex);
      setBookmarks(updated);
      saveBookmarks(updated);
    } else {
      const newBm: Bookmark = {
        id: `bm-${Date.now()}`,
        anchor: anchorForPage(currentPageIndex),
        title: currentPage.title,
        sectionTitle: currentPage.chapterTitle || currentPage.chapterNumber || 'Book Page',
        date: new Date().toLocaleDateString()
      };
      const updated = [newBm, ...bookmarks];
      setBookmarks(updated);
      saveBookmarks(updated);
    }
  };

  /* Removing from the list, rather than from the sheet the mark is on. The
     header toggle can only unset the page the reader is standing on; the list
     is where a mark made three chapters ago is actually let go of. */
  const handleRemoveBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    saveBookmarks(updated);
  };

  const handleAddHighlight = (hlData: Omit<Highlight, 'id'>) => {
    const newHl: Highlight = {
      ...hlData,
      id: `hl-${Date.now()}`
    };
    const updated = [newHl, ...highlights];
    setHighlights(updated);
    saveHighlights(updated);
  };

  /* The index is reachable from the map as well as the reader, and from there a
     chosen page has to open the book rather than quietly renumbering a map the
     reader is still looking at. */
  /* A world asked for from the index, the search or the map.

     Two steps rather than one: turn to the sheet that carries the figure, then
     let that sheet open it. The stage takes its name from the page it sits on,
     and closing a world should leave the reader somewhere real rather than on
     whatever sheet happened to be open when they asked. */
  const [pendingFigure, setPendingFigure] = useState<BookPage['diagramType'] | null>(null);
  const openFigure = (type: NonNullable<BookPage['diagramType']>) => {
    handleSelectPage(firstPageOfDiagram(type));
    setPendingFigure(type);
  };

  /* An instrument asked for from outside the reader.

     The index's Application column used to raise this: a branch row carried a
     chip for its instrument, and opening one turned to the sheet that specifies
     it and let that sheet open it. Those chips were removed from the branch
     rows, so nothing sets this any more — the state and its prop chain stay
     because PageRenderer still consumes them, but the only route that filled it
     is gone. Reachability of the instruments from the index is an open question
     recorded in docs/OPEN.md, not something to answer by leaving a dead
     function here. */
  const [pendingTool, setPendingTool] = useState<string | null>(null);

  const handleSelectPage = (pageIndex: number) => {
    if (view === 'orrery') handleEnterFromMap(pageIndex);
    else handlePageChange(pageIndex);
  };

  const handleEnterFromMap = (pageIndex: number) => {
    handlePageChange(pageIndex);
    setArrivedByDive(true);
    setView('reader');
  };

  /**
   * The return leg.
   *
   * The page sinks back through the light it surfaced from, and the map opens
   * centred on the cell that page belongs to rather than resetting to the home
   * framing — you come back to where you were standing, not to the front door.
   */
  const leaveToMap = () => {
    if (view !== 'reader' || departing) return;
    setMapFocus(mapNodeForPage(currentPage));
    setDeparting(true);
    window.setTimeout(() => {
      setDeparting(false);
      setView('orrery');
    }, 180);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      // z leaves zen mode as readily as it enters it, so the mode is never a
      // room you can only be let out of by someone who knows the password
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUpdatePrefs({ zenMode: !prefs.zenMode });
        return;
      }

      /* Escape, once every surface that owns one has had its turn.

         A portalled surface — a figure world, an instrument, the evidence —
         registers itself on the dismiss stack, and while any of them is open
         this handler never runs: the stack's own listener takes the key and
         stops it dead. So by the time control arrives here, nothing is open
         that could be closed, and what is left is this app's own ladder. The
         drawers stay on the ladder rather than on the stack because they are
         App's own state and it can see all three of them from here. */
      if (e.key === 'Escape') {
        if (dismissDepth() > 0) return;
        e.preventDefault();
        if (isSearchOpen) setIsSearchOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isTocOpen) setIsTocOpen(false);
        else if (prefs.zenMode) handleUpdatePrefs({ zenMode: false });
        else leaveToMap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTocOpen, isSettingsOpen, isSearchOpen, prefs, currentPageIndex]);


  /* The chapter's light temperature. Chapters alternate so that moving through
     the dossier is felt rather than noticed; the prologue opens warm because the
     argument it makes is about a body, and Chapter II — the fragile market — is
     the first cool one. Anything with no chapter emits neutral white. */
  const lumeRegister = ((): 'ember' | 'cyanotype' | undefined => {
    /* Only prose pages carry a chapterId — the schematics and the ruleset pages
       do not. Reading the current page alone therefore made the
       light blink back to white on every diagram in the middle of a chapter, which
       is the one thing a temperature is supposed not to do. So the register comes
       from the nearest chapter at or before this page, and holds until the next
       one starts. Front matter, ahead of any chapter, stays neutral. */
    let id: string | undefined;
    for (let i = currentPageIndex; i >= 0; i--) {
      if (BOOK_PAGES[i]?.chapterId) { id = BOOK_PAGES[i].chapterId; break; }
    }
    if (!id) return undefined;
    if (id === 'prologue') return 'ember';
    const n = parseInt(id.replace(/[^0-9]+/g, ''), 10);
    if (!Number.isFinite(n)) return undefined;
    return n % 2 === 1 ? 'ember' : 'cyanotype';
  })();

  /* Stamped on <html> rather than on the shell so the figure stage — which is
     portalled to <body>, out of the shell's subtree — inherits the same light. */
  useEffect(() => {
    const root = document.documentElement;
    if (lumeRegister) root.setAttribute('data-lume', lumeRegister);
    else root.removeAttribute('data-lume');
    root.setAttribute('data-theme', prefs.theme);
  }, [lumeRegister, prefs.theme]);

  return (
    <div
      className={`app-shell w-full flex flex-col overflow-hidden font-sans transition-colors duration-150 rounded-none ${
        prefs.theme === 'dark' ? 'theme-dark bg-black text-white' : 'theme-light bg-white text-black'
      }`}>
      {/* The way in. Rendered before everything else it covers, and holding no
          state of its own that the map needs back. */}
      {introOpen && <IntroScreen onEnter={() => setIntroOpen(false)} />}

      {/* Keyboard readers land on the map's ~6000 nodes first; this is the way past it. */}
      <a href="#reader-main" className="skip-link" onClick={() => setView('reader')}>
        Skip to the reader
      </a>

      {/* Page changes are silent for a screen reader without this. */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {view === 'reader'
          ? `Page ${currentPageIndex + 1} of ${BOOK_PAGES.length}. ${currentPage.title}`
          : 'Orientation map'}
      </div>

      {/* The Orrery — front door and orientation map.
          No ambience layer here: the drifting data flowers are filament drawings
          too, and behind the organism they competed with it for the same reading.
          The map's ground stays empty so the tissue is the only thing on it. */}
      {view === 'orrery' && (
        <div className="relative flex-1 w-full h-full overflow-hidden">
          <Suspense fallback={<MapPending />}>
            <Orrery
              isDark={prefs.theme === 'dark'}
              onOpenFigure={openFigure}
              visitedChapters={visitedChapters}
              visitedPages={visitedPages}
              lastPage={currentPageIndex}
              onEnter={handleEnterFromMap}
              returning={returning}
              soundEnabled={prefs.soundEnabled}
              onToggleSound={() => handleUpdatePrefs({ soundEnabled: !prefs.soundEnabled })}
              onOpenIndex={() => setIsTocOpen(true)}
              focusNodeId={mapFocus}
              held={introOpen}
            />
          </Suspense>
        </div>
      )}

      {/* Top Web App Header Bar */}
      {view === 'reader' && !prefs.zenMode && (
        <HeaderNav
          prefs={prefs}
          onOpenToc={() => { setTocTab('contents'); setIsTocOpen(true); }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenMap={leaveToMap}
          isBookmarked={isBookmarked}
          onToggleBookmark={handleToggleBookmark}
          onOpenBookmarks={() => { setTocTab('saved'); setIsTocOpen(true); }}
          isOffline={isOffline}
        />
      )}

      {/* Main Interactive Reader Workspace */}
      {view === 'reader' && (
        <main
          id="reader-main"
          tabIndex={-1}
          aria-label={`Reader, page ${currentPageIndex + 1} of ${BOOK_PAGES.length}`}
          className={`flex-1 w-full h-full flex overflow-hidden rounded-none relative ${
            departing ? 'submerge' : arrivedByDive ? 'surface' : ''
          }`}
          onAnimationEnd={() => setArrivedByDive(false)}
        >
          <Suspense fallback={<MapPending />}>
            <BookSpread
              currentPageIndex={currentPageIndex}
              onPageChange={handlePageChange}
              prefs={prefs}
              onAddHighlight={handleAddHighlight}
              highlights={highlights}
              onLeaveToMap={leaveToMap}
              backTrail={backTrail}
              onBack={goBack}
              pendingFigure={pendingFigure}
              pendingTool={pendingTool}
              onToolOpened={() => setPendingTool(null)}
              onFigureOpened={() => setPendingFigure(null)}
            />
          </Suspense>

          {/* Zen mode hides every control, which left the only way out a key
              nobody had been told about. This stays — barely — and comes up to
              full under touch or focus, so the mode is quiet but not sealed. */}
          {prefs.zenMode && (
            <button
              onClick={() => handleUpdatePrefs({ zenMode: false })}
              className="bud zen-exit fixed bottom-4 right-4 z-40 px-3 py-2 text-[9px] font-light uppercase tracking-[0.2em] flex items-center gap-2 rounded-none"
              title="Leave zen mode (Z or Esc)"
              aria-label="Leave zen mode"
            >
              <Soma size={8} phase={5.4} />
              <span>Zen · Z</span>
            </button>
          )}
        </main>
      )}

      {/* Navigation Sidebar & Drawer */}
      <TableOfContentsDrawer
        visitedPages={visitedPages}
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        currentPageIndex={currentPageIndex}
        onSelectPage={handleSelectPage}
        prefs={prefs}
        bookmarks={bookmarks}
        onRemoveBookmark={handleRemoveBookmark}
        initialTab={tocTab}
      />

      {/* Reader Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        prefs={prefs}
        onUpdatePrefs={handleUpdatePrefs}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPage={handleSelectPage}
        onOpenFigure={openFigure}
        prefs={prefs}
      />
    </div>
  );
}
