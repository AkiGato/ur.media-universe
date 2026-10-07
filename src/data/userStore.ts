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
  /** opt-in accessible reader profile: weight 400 + scaled font size */
  accessibleReader?: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  fontSize: 16,
  lineHeight: 1.6,
  soundEnabled: true,
  musicEnabled: true,
  viewMode: 'spread',
  // A page flip is paper. The tide is the organism's own motion — the same wave
  // that crosses the map, passing through the sheet — and it remains the
  // alternative closest to the drawing, alongside the paper metaphors.
  //
  // The default is the fade, asked for directly: the page leaves on light and
  // arrives on light, with nothing travelling across the sheet. It is also the
  // only turn that says nothing about which direction the reader went, which
  // is the honest thing for a surface where a turn may be a step within a
  // sheet as readily as a step between two (MO-07 names the tide as the
  // default; this overrides that, and docs/OPEN.md records it).
  animationStyle: 'fade',
  zenMode: false,
  accessibleReader: false
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

/* BACKUP AND RESTORE OF A READER'S MARKS WAS HERE, AND IT WAS UNREACHABLE.
 *
 * `buildReaderState`, `exportReaderState`, `ImportResult` and
 * `importReaderState` were complete and correct — a dated JSON download and a
 * merge-never-replace import — and nothing in the app ever called any of them.
 * No control anywhere offered either one.
 *
 * Removed rather than left standing, and the choice is arguable. Unreachable
 * backup is worse than no backup: to anyone reading this file it looks as
 * though the marks are already safe, and they are not — the note above says
 * plainly that localStorage is the only home these have and that it is not
 * durable.
 *
 * IF IT COMES BACK it needs a control, not just the functions: two rows in the
 * settings drawer beside "Preferences saved locally", which is the one line in
 * the app that already tells a reader where their marks live. The merge
 * semantics were right and are worth recovering from git rather than rewriting.
 */

/**
 * Whether this reader has ever been into the book.
 *
 * Not `loadLastPage() > 0`: page zero is the cover, and somebody who opened the
 * cover and left has read before while somebody arriving for the first time
 * also reports zero. The two are only distinguishable by whether anything was
 * ever written, so that is what this asks.
 */
const STORAGE_KEY_MAP_GESTURE = 'media_universe_map_gesture_v1';

/**
 * Whether this reader has already moved the map.
 *
 * The map zooms and pans and never said so. There is no scrollbar to imply it,
 * no handle to grab, and the organism fills its frame at rest — so a reader who
 * does not idly try a pinch has no way to learn that the thing is navigable.
 * That is the one place on this surface where a reader can simply fail.
 *
 * Binary and one-way, the same shape as the visited set and for the same
 * reason: it is a thing that has happened, not a score. It is written the first
 * time a pan or a pinch actually succeeds — not on a tap, not on a hover —
 * because the hint has done its job precisely when the gesture has worked once,
 * and never needs to appear again for this reader.
 */
export function loadMapGestureLearned(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_MAP_GESTURE) === '1';
  } catch (e) {
    /* A reader with storage blocked sees the hint every visit, which is the
       safe failure: a hint too often is an irritation, a hint never is a
       surface nobody can use. */
    return false;
  }
}

/** Records that the map has been moved. Returns true if this was the first time. */
export function markMapGestureLearned(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY_MAP_GESTURE) === '1') return false;
    localStorage.setItem(STORAGE_KEY_MAP_GESTURE, '1');
    return true;
  } catch (e) {
    return false;
  }
}

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

const STORAGE_KEY_VISITED_PAGES = 'media_universe_visited_pages_v1';

/**
 * The sheets this reader has opened.
 *
 * The same shape, and the same argument, as the chapters above: a set of names,
 * never a count, never an ordering, and it never decreases. The map draws it as
 * a cell that has been inside, so the organism carries a record of where the
 * reader has been without anywhere on it filling up. A percentage or a bar
 * would turn the drawing into a completion meter, which is the mechanic Chapter
 * I diagnoses — the finer granularity makes that temptation stronger, not
 * weaker, so it is worth saying twice.
 */
export function loadVisitedPages(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITED_PAGES);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
  } catch (e) {
    return [];
  }
}

/** Records a sheet as visited. Returns the new set, or null if unchanged. */
export function markPageVisited(key: string): string[] | null {
  try {
    const seen = loadVisitedPages();
    if (seen.includes(key)) return null;
    const next = [...seen, key];
    localStorage.setItem(STORAGE_KEY_VISITED_PAGES, JSON.stringify(next));
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
