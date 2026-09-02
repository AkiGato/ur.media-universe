import { Anchor, anchorForPage, isAnchor, pageForAnchor } from './anchors';

/**
 * A mark points at the book, not at a cutting of it.
 *
 * Both of these stored `pageIndex` — an index into BOOK_PAGES — which made
 * every saved mark a hostage to the pagination: the book could never be re-cut,
 * for any reader on any screen, without sliding somebody's notes onto the wrong
 * sheet. `anchor` names the section and paragraph instead and is resolved to a
 * sheet at read time (see anchors.ts). Marks written before anchors existed are
 * migrated on load, from the only address they have.
 */
export interface Bookmark {
  id: string;
  anchor: Anchor;
  title: string;
  sectionTitle: string;
  date: string;
}

export interface Highlight {
  id: string;
  anchor: Anchor;
  text: string;
  sectionTitle: string;
  note?: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  fontSize: number; // 14 to 22
  lineHeight: number; // 1.4 to 2.0
  soundEnabled: boolean;
  /** the three background tracks, played in order and looping the set */
  musicEnabled: boolean;
  viewMode: 'spread' | 'single'; // spread (2 pages side-by-side on desktop) or single page
  animationStyle: 'tide' | '3d-flip' | 'slide' | 'fade';
  zenMode: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  fontSize: 16,
  lineHeight: 1.6,
  soundEnabled: true,
  musicEnabled: true,
  viewMode: 'spread',
  // A page flip is paper. The tide is the organism's own motion — the same wave
  // that crosses the map, passing through the sheet — so it is the default and
  // the paper metaphors are the alternatives.
  animationStyle: 'tide',
  zenMode: false
};

const STORAGE_KEY_PREFS = 'media_universe_prefs_v1';
const STORAGE_KEY_BOOKMARKS = 'media_universe_bookmarks_v1';
const STORAGE_KEY_HIGHLIGHTS = 'media_universe_highlights_v1';
const STORAGE_KEY_LAST_PAGE = 'media_universe_last_page_v1';

export function loadPreferences(): UserPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PREFS);
    if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
  } catch (e) {
    console.error('Error loading preferences', e);
  }
  return DEFAULT_PREFERENCES;
}

export function savePreferences(prefs: UserPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
  } catch (e) {
    console.error('Error saving preferences', e);
  }
}

/**
 * One pass over stored marks, mapping the legacy page index to an anchor.
 *
 * Applied on every load rather than once behind a flag: an exported file made
 * before anchors existed can be restored at any time, and a reader who keeps
 * two browsers will keep producing old-shaped marks in one of them for as long
 * as that build is cached. Idempotent — a mark that already has a usable anchor
 * is returned untouched.
 */
function withAnchor<T extends { anchor?: unknown; pageIndex?: number }>(mark: T): T & { anchor: Anchor } {
  const { pageIndex, ...rest } = mark as T & { pageIndex?: number };
  const anchor = isAnchor(mark.anchor)
    ? mark.anchor
    : anchorForPage(typeof pageIndex === 'number' ? pageIndex : 0);
  return { ...(rest as T), anchor };
}

export function loadBookmarks(): Bookmark[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.map(withAnchor) as Bookmark[];
    }
  } catch (e) {
    console.error('Error loading bookmarks', e);
  }
  return [];
}

export function saveBookmarks(bookmarks: Bookmark[]) {
  try {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Error saving bookmarks', e);
  }
}

export function loadHighlights(): Highlight[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HIGHLIGHTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.map(withAnchor) as Highlight[];
    }
  } catch (e) {
    console.error('Error loading highlights', e);
  }
  return [];
}

export function saveHighlights(highlights: Highlight[]) {
  try {
    localStorage.setItem(STORAGE_KEY_HIGHLIGHTS, JSON.stringify(highlights));
  } catch (e) {
    console.error('Error saving highlights', e);
  }
}

/* ---------------------------------------------------------------------------
   Export / import
   localStorage is the only home this reader's marks have, and it is not durable:
   Safari's ITP evicts script-written storage after ~7 days without a visit, and
   clearing site data takes everything with no warning. A plain JSON file the
   reader holds themselves is the only recovery path that does not require an
   account, a server, or trusting us with their annotations.
--------------------------------------------------------------------------- */

export interface ReaderStateExport {
  format: 'media-as-universe/reader-state';
  /** 1 stored page indices; 2 stores anchors. Version 1 files still restore. */
  version: 2;
  exportedAt: string;
  prefs: UserPreferences;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  /** where the reader stopped, as an anchor */
  lastAnchor: Anchor;
  /** the same place as an index, for a build that predates anchors */
  lastPage: number;
}

export function buildReaderState(): ReaderStateExport {
  const lastAnchor = loadLastAnchor();
  return {
    format: 'media-as-universe/reader-state',
    version: 2,
    exportedAt: new Date().toISOString(),
    prefs: loadPreferences(),
    bookmarks: loadBookmarks(),
    highlights: loadHighlights(),
    lastAnchor,
    lastPage: pageForAnchor(lastAnchor)
  };
}

/** Downloads the reader's marks as a dated JSON file. */
export function exportReaderState() {
  const state = buildReaderState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `media-as-universe-marks-${state.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  ok: boolean;
  message: string;
  bookmarks?: Bookmark[];
  highlights?: Highlight[];
  prefs?: UserPreferences;
}

/**
 * Merges a previously exported file into local storage. Merge, never replace:
 * importing an older backup must not delete marks made since.
 */
export function importReaderState(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'Not a readable JSON file.' };
  }

  const data = parsed as Partial<ReaderStateExport>;
  if (!data || data.format !== 'media-as-universe/reader-state') {
    return { ok: false, message: 'Not a Media as Universe marks file.' };
  }

  const incomingBookmarks = (Array.isArray(data.bookmarks) ? data.bookmarks : []).map(withAnchor) as Bookmark[];
  const incomingHighlights = (Array.isArray(data.highlights) ? data.highlights : []).map(withAnchor) as Highlight[];

  const byId = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
    const seen = new Set(existing.map((x) => x.id));
    return [...existing, ...incoming.filter((x) => x && x.id && !seen.has(x.id))];
  };

  const bookmarks = byId(loadBookmarks(), incomingBookmarks);
  const highlights = byId(loadHighlights(), incomingHighlights);
  const prefs = data.prefs ? { ...loadPreferences(), ...data.prefs } : loadPreferences();

  saveBookmarks(bookmarks);
  saveHighlights(highlights);
  savePreferences(prefs);

  return {
    ok: true,
    message: `Restored ${incomingBookmarks.length} marks and ${incomingHighlights.length} notes.`,
    bookmarks,
    highlights,
    prefs
  };
}

/**
 * Whether this reader has ever been into the book.
 *
 * Not `loadLastPage() > 0`: page zero is the cover, and somebody who opened the
 * cover and left has read before while somebody arriving for the first time
 * also reports zero. The two are only distinguishable by whether anything was
 * ever written, so that is what this asks.
 */
const STORAGE_KEY_VISITED = 'media_universe_visited_chapters_v1';

/**
 * The chapters this reader has opened.
 *
 * Deliberately a set of ids and not a count of pages: the map draws this as
 * memory — a cell that has been inside — and never as progress. A percentage
 * would turn the organism into a completion meter, which is the mechanic the
 * book spends Chapter I diagnosing. Binary, unordered, and it never decreases.
 */
export function loadVisitedChapters(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITED);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
  } catch (e) {
    return [];
  }
}

/** Records a chapter as visited. Returns the new set, or null if unchanged. */
export function markChapterVisited(chapterId: string): string[] | null {
  try {
    const seen = loadVisitedChapters();
    if (seen.includes(chapterId)) return null;
    const next = [...seen, chapterId];
    localStorage.setItem(STORAGE_KEY_VISITED, JSON.stringify(next));
    return next;
  } catch (e) {
    return null;
  }
}

export function hasReadBefore(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_PAGE) !== null;
  } catch (e) {
    return false;
  }
}

const STORAGE_KEY_LAST_ANCHOR = 'media_universe_last_anchor_v1';

/**
 * Where the reader stopped.
 *
 * Written as an anchor and, alongside it, as the page index it currently
 * resolves to — the index is what `hasReadBefore` has always keyed on, and it
 * is the address a build that predates anchors would look for. The anchor is
 * the truth; the index is a shadow of it.
 */
export function loadLastAnchor(): Anchor {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_ANCHOR);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isAnchor(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading last anchor', e);
  }
  return anchorForPage(loadLastPage());
}

export function loadLastPage(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LAST_PAGE);
    const parsed = saved !== null ? parseInt(saved, 10) : NaN;
    // A stored index outlives the page count it was written against — the book
    // shrinks whenever a case study or section leaves bookData. Callers clamp
    // to the current length; here we only guarantee a non-negative integer.
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  } catch (e) {
    console.error('Error loading last page', e);
  }
  return 0;
}

export function saveLastPage(pageIndex: number) {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_PAGE, pageIndex.toString());
    localStorage.setItem(STORAGE_KEY_LAST_ANCHOR, JSON.stringify(anchorForPage(pageIndex)));
  } catch (e) {
    console.error('Error saving last page', e);
  }
}
