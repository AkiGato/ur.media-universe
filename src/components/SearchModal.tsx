import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ArrowRight, BookOpen } from './organic/Icons';
import { BookPage } from '../data/pageModel';
import { searchGrouped, Hit } from '../data/searchIndex';
import { UserPreferences } from '../data/userStore';
import { Vein, Soma, SomaLabel } from './organic/Organic';
import { useOverlayFocus } from '../utils/a11y';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (pageIndex: number) => void;
  onOpenFigure?: (type: NonNullable<BookPage['diagramType']>) => void;
  prefs: UserPreferences;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPage,
  onOpenFigure,
  prefs
}) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const panelRef = useOverlayFocus<HTMLDivElement>(isOpen);
  const listRef = useRef<HTMLDivElement | null>(null);

  const isDark = prefs.theme === 'dark';

  /* One call into the index, which was built once at module evaluation. What
     stood here re-walked every page, every paragraph and every citation with
     `indexOf` on each keystroke, and emitted a row per match. */
  const groups = useMemo(() => (query.trim().length < 2 ? [] : searchGrouped(query)), [query]);

  /** the same rows the eye reads, in one list, so a key can walk them */
  const flat = useMemo(() => groups.flatMap((g) => g.hits), [groups]);

  useEffect(() => setCursor(0), [query]);

  const open = (hit: Hit) => {
    if (hit.doc.figure && onOpenFigure) onOpenFigure(hit.doc.figure);
    else onSelectPage(hit.pageIndex);
    onClose();
  };

  /**
   * The keys a list of results is expected to answer to.
   *
   * There were none: the only way to take a result was to leave the keyboard
   * and reach for the mouse, having arrived by Cmd-K. Held here rather than on
   * the input so it works wherever focus has landed inside the well.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flat.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (c + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = flat[cursor];
      if (hit) open(hit);
    }
  };

  // keep the walked row in view without ever scrolling the page itself
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-cursor="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor, groups]);

  if (!isOpen) return null;

  let row = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 rounded-none">
      {/* Backdrop */}
      <div className="scrim fixed inset-0 transition-opacity rounded-none" onClick={onClose} />

      {/* Modal Container — a well of light, edgeless */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search the dossier"
        onKeyDown={handleKeyDown}
        className={`well settle relative w-full max-w-2xl z-10 flex flex-col max-h-[75vh] rounded-none ${
        isDark ? 'text-white' : 'text-black'
      }`}>

        {/* Input Header */}
        {/* A label, so the 50px row is the target rather than the 18px line of
            type inside it — see the same note on the index drawer's filter.
            The close button is exempt without being asked to be: a click on an
            interactive descendant of a label never runs the label's own
            action, so it still closes rather than focusing the field. */}
        <label className="p-4 flex items-center space-x-3 rounded-none cursor-text">
          <Search className="w-5 h-5 opacity-70 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all chapters, the case study, citations..."
            autoFocus
            className="w-full bg-transparent border-none text-[12px] font-light focus:outline-none placeholder-current/40 rounded-none"
          />
          <button onClick={onClose} className="bud p-1.5 rounded-none outline-none" aria-label="Close search">
            <X className="w-4 h-4" />
          </button>
        </label>
        <div className="opacity-45 px-4">
          <Vein opacity={0.5} phase={4.6} />
        </div>

        {/* Search Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto soft-scroll p-4 space-y-4 rounded-none">
          {query.trim() === '' ? (
            /* NO EMPTY-STATE SENTENCE. This said "Type to search dossier and
               manifesto", which TY-04 names outright — "not an empty state, not
               a sentence introducing a control". The field's own placeholder
               already says what it searches, so the sentence was the second
               time this surface said one thing (TY-05). The mark stays: it says
               the well is empty without claiming to instruct. */
            <div className="py-12 text-center opacity-40">
              <BookOpen className="w-8 h-8 mx-auto opacity-70" aria-hidden="true" />
            </div>
          ) : flat.length === 0 ? (
            /* A LABEL, NOT A SENTENCE. This read `No results found for "{query}".`
               — an invented sentence that also quoted the reader's own words
               back at them, which they can already see in the field above it
               (TY-05). Two words is what this has to say, and two words is not
               prose. The function survives: a search that answers with nothing
               at all is indistinguishable from one that is broken. */
            <div className="py-12 text-center opacity-45 text-[12px] font-light uppercase tracking-[0.2em]">
              Nothing found
            </div>
          ) : (
            groups.map((group, gIdx) => (
              /* Filed under the book's own heading for where the answer lives.
                 The species label each row used to carry ("title", "content",
                 "citation") said the same thing worse, once per row — and could
                 not say the one thing a reader actually needs, which is whether
                 the answer is in Chapter II or in the ruleset. */
              <div key={group.title} className="space-y-2">
                <SomaLabel opacity={0.7} phase={(gIdx * 4.7) % 19}>{group.title}</SomaLabel>
                <div className="opacity-40">
                  <Vein opacity={0.4} phase={(gIdx * 3.3 + 2) % 19} />
                </div>
                <div className="space-y-2.5">
                  {group.hits.map((hit) => {
                    row += 1;
                    const at = row;
                    const walked = at === cursor;
                    return (
                      <button
                        key={hit.doc.id}
                        data-cursor={walked}
                        onMouseEnter={() => setCursor(at)}
                        onClick={() => open(hit)}
                        className={`bud w-full text-left p-3 flex items-start justify-between gap-3 text-[12px] rounded-none ${
                          walked ? 'bud-lit' : ''
                        }`}
                      >
                        {/* `truncate` here was a bug with two heads. It is
                            shorthand for `overflow:hidden; text-overflow:
                            ellipsis; white-space:nowrap`, and the nowrap
                            inherited into the snippet below — which asks for two
                            lines. So the snippet was forced onto ONE line and
                            ran 77–88px past this box, where overflow:hidden cut
                            it mid-word with no ellipsis, because the ellipsis
                            belongs to the parent and the parent was not the
                            thing overflowing.

                            `min-w-0` is what was actually wanted: it lets this
                            flex child shrink so its children can do their own
                            truncation — the title still has `truncate` on the
                            line where one line is right, and the snippet keeps
                            `line-clamp-2`. */}
                        <div className="space-y-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2.5">
                            <Soma size={9} opacity={walked ? 1 : 0.5} phase={(at * 3.4) % 19} />
                            <span className="font-light text-[12px] truncate">{hit.doc.title}</span>
                            {/* how many times this one place answered — the
                                reason five hits are one row and not five */}
                            {hit.count > 1 && (
                              <span className="text-[9px] font-light opacity-45">({hit.count})</span>
                            )}
                          </div>
                          <p className="text-[12px] font-light opacity-70 line-clamp-2 leading-relaxed pl-5">
                            {hit.snippet}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-light opacity-70 shrink-0 uppercase tracking-[0.2em]">
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="opacity-40 px-4">
          <Vein opacity={0.45} phase={14.9} />
        </div>
        {/* "Press ESC or click backdrop to close" was invented, and it was also
            a third wording for a thing the app already says two other ways —
            the figure world says "Esc or swipe back", the instrument says "Esc
            returns to the page". One wording, matching the instrument's, or
            none. The backdrop half went with it: LY-04 is satisfied by Esc, and
            a surface does not need to narrate its own dismissal. */}
        <div className="p-3 text-center text-[9px] font-light uppercase tracking-[0.2em] opacity-45 rounded-none">
          Esc returns to the page
        </div>

      </div>
    </div>
  );
};
