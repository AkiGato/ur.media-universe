import React from 'react';
import { Search, Bookmark, Bookmarks, Sliders, Waypoints, List } from './organic/Icons';
import { UserPreferences } from '../data/userStore';
import { Vein, Soma } from './organic/Organic';

/* The header once showed the position while the footer said "Page n of 27" a
   few centimetres below — two readouts of one fact, disagreeing by one because
   they counted differently, which is the case TY-05, "A Name Is Said Once",
   was written from. The readout went, and so did the props that fed it
   (`currentPageDisplay`, then `title`): a prop every call site must supply for
   nothing is a standing invitation to render it again. */
interface HeaderNavProps {
  prefs: UserPreferences;
  onOpenToc: () => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onOpenMap: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  /** Open the reader's saved places. */
  onOpenBookmarks: () => void;
  isOffline: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  prefs,
  onOpenToc,
  onOpenSettings,
  onOpenSearch,
  onOpenMap,
  isBookmarked,
  onToggleBookmark,
  onOpenBookmarks,
  isOffline
}) => {
  const isDark = prefs.theme === 'dark';

  return (
    <header className={`relative w-full flex-shrink-0 z-40 rounded-none transition-colors duration-500 outline-none ${
      isDark ? 'text-white' : 'text-black'
    }`}>
      <div className="veil reader-bar w-full px-4 flex items-center justify-between rounded-none outline-none">

        {/* Left: Map + Sidebar Toggle.
            Below 380px the two named controls plus the three instruments do not
            fit a single row — measured at 338px of content in a 320px bar, with
            the last control 10px past the edge. The names give way to icons
            there rather than the row overflowing; a soma alone would not tell
            the two apart, so each keeps a glyph of its own. */}
        <div className="flex items-center gap-2 min-[380px]:gap-4 outline-none">
          <button
            onClick={onOpenMap}
            className="bud px-2 min-[380px]:px-3 py-1.5 text-[9px] font-light uppercase tracking-[0.2em] flex items-center gap-2 rounded-none outline-none"
            title="Return to the Orrery map (Esc)"
            aria-label="Return to map"
          >
            <Waypoints className="w-4 h-4 min-[380px]:hidden" />
            <span className="hidden min-[380px]:inline-flex items-center gap-2">
              <Soma size={8} phase={1.3} />
              <span>Map</span>
            </span>
          </button>
          <button
            onClick={onOpenToc}
            className="bud px-2 min-[380px]:px-3 py-1.5 text-[9px] font-light uppercase tracking-[0.2em] flex items-center gap-2 rounded-none outline-none"
            title="Toggle Navigation Sidebar (Index)"
            aria-label="Table of Contents"
          >
            <List className="w-4 h-4 min-[380px]:hidden" />
            <span className="hidden min-[380px]:inline-flex items-center gap-2">
              <Soma size={8} phase={7.9} />
              <span>Index</span>
            </span>
          </button>
        </div>

        {/* The progress line lives in the foot now, between the arrows — beside the
            act of turning, not above the title. This slot keeps the bar's balance. */}
        <div className="hidden sm:flex max-w-[230px] w-full" aria-hidden="true" />

        {/* Right: the instruments.
            Search, the bookmark and the settings drawer were all reachable
            only by a shortcut nobody was told about — the drawer that holds
            font size, layout and the theme had no control anywhere in the app.

            THE SAVED PLACES COME FIRST, asked for directly. They are the only
            thing in this group the reader made themselves: the other three act
            on the app, and this one opens what the reader put into it. Its
            neighbour is the toggle that ADDS to it, so the pair reads left to
            right as the list and the act of adding to the list — which is also
            why the two glyphs differ by their number of marked nodes rather
            than by being unrelated drawings. */}
        <div className="flex items-center gap-1 min-[380px]:gap-2 sm:gap-3 outline-none">
          <button
            onClick={onOpenBookmarks}
            className="bud p-2 rounded-none outline-none flex items-center justify-center"
            title="Saved places"
            aria-label="Saved places"
          >
            <Bookmarks className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSearch}
            className="bud p-2 rounded-none outline-none flex items-center justify-center"
            title="Search the dossier (⌘K)"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleBookmark}
            aria-pressed={isBookmarked}
            className={`bud p-2 rounded-none outline-none flex items-center justify-center ${
              isBookmarked ? 'bud-lit' : 'opacity-70'
            }`}
            title={isBookmarked ? 'Remove bookmark from this page' : 'Bookmark this page'}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={onOpenSettings}
            className="bud p-2 rounded-none outline-none flex items-center justify-center"
            title="Reader customization"
            aria-label="Reader settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Offline state — a lit cell, not a badge */}
          <div
            className="hidden lg:flex items-center gap-2 text-[9px] font-light uppercase tracking-[0.2em] opacity-45 rounded-none pl-1"
            title={isOffline ? 'Working Offline' : 'Stored Offline Ready'}
          >
            <Soma size={7} opacity={isOffline ? 0.5 : 1} phase={14.2} />
            <span>{isOffline ? 'Offline' : 'Cached'}</span>
          </div>
        </div>
      </div>

      <div className="opacity-45 -mt-1">
        <Vein opacity={0.5} phase={3.8} />
      </div>
    </header>
  );
};


