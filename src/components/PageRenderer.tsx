import React, { useState, lazy, Suspense, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayFocus } from '../utils/a11y';
import {
  BookPage, BOOK_PAGES, firstPageOfChapter, firstReferencesPage,
  pageForPromptRule, FIGURE_PASSAGES, figureCarriesItsOwnApplication, isRuleLibrary,
  isVerificationGate, isRulesetOverview, takesWholeSheet
} from '../data/pageModel';
import { FigureStage } from './FigureStage';
import { FigureWorldContext, FigureInertContext } from './figures/FigurePrimitives';
import { InstrumentStage, type Instrument } from './InstrumentStage';
import { UserPreferences, Highlight } from '../data/userStore';
import {
  anchorForPage, anchorForParagraph,
  pageForManuscriptSection, manuscriptSectionName, pageForSources
} from '../data/anchors';
import { sourcesOfCitations, citedBy } from '../data/relations';
import { parseEmphasis, keepUnits } from '../data/emphasis';
import { BookOpen, Bookmark, ArrowRight, ArrowLeft, Copy, Check } from './organic/Icons';
import { DataFlower } from './DataFlower';
import { Vein, Soma, SomaLabel } from './organic/Organic';
import { PromptRuleCard, type PromptRuleData } from './PromptRuleCard';
import { parsePromptText } from '../data/promptText';
import { PromptLibrary } from './PromptLibrary';
import { RulesetOverview } from './RulesetOverview';
import { ChapterOpener } from './ChapterOpener';
import { PROMPT_RULESET_DATA, FULL_RULESET_TEXT } from '../data/promptData';
import { useFitToBox } from '../utils/fitToBox';
import { useDismiss } from '../utils/dismissStack';


/**
 * The size the manuscript is actually set at, and the size below which it stops
 * being readable.
 *
 * `PROSE_PX` is TY-02's body step, written here as a number because the fit
 * arithmetic needs it as one — the paragraphs themselves still carry
 * `text-[12px]`, and if that ever moves this has to move with it.
 *
 * `MIN_PROSE_PX` is a floor, not a step, which is why it is not one of the
 * three: it is the smallest the *rendering* may be compressed to, never a size
 * anything is authored at. It sits above 9 deliberately — 9 is the label step,
 * and body prose must never render smaller than a label.
 */
/**
 * How the ruleset blocks are used, taken from wherever the book states it.
 *
 * The branches sheet does not carry the note; the ruleset overview does. The
 * lead cell of the bento needs it, and reading it out of the book keeps one
 * copy of the sentence rather than a second that could drift from the first.
 */
const rulesetHowToUse =
  BOOK_PAGES.find((p) => p.promptRulesetIntro?.howToUse)?.promptRulesetIntro?.howToUse;

const PROSE_PX = 12;
const MIN_PROSE_PX = 11;

/** "CHAPTER III" → "III". The prologue has no numeral and is given none. */
function chapterNumeral(label?: string): string {
  const m = /chapter\s+([ivxlc]+)/i.exec(label || '');
  return m ? m[1].toUpperCase() : '';
}

// Figures and widgets are the heaviest thing in the bundle and only a handful of
// pages carry one, so they load on demand. The reader's prose must never wait on
// an SVG organism it is not currently looking at.
import { DIAGRAMS } from './diagrams/registry';

/** The sheet title for a figure, looked up rather than restated (TY-05). */
function figureTitle(figure: BookPage['diagramType']): string {
  const page = BOOK_PAGES.find(p => p.diagramType === figure);
  return page?.title || 'Figure';
}

/**
 * The figure itself, on the page, as a preview.
 *
 * The schematic page used to carry only a seed — a cell standing in for the
 * figure — which meant the reader chose to open a figure they had never seen.
 * Now the page shows the actual drawing, alive but inert: `inert` strips its
 * tab stops, tooltips and pin interactions, so the whole surface is one thing
 * to do — touch it, and the figure opens full bleed on its own surface where
 * the interactions actually live (see FigureStage).
 *
 * The preview measures the box the page gives it and sizes the drawing to fit
 * both dimensions, because the sheet cannot scroll: the drawings are ~2.35:1
 * with ~70px of fixed-height reading strip below, so width is capped at
 * (height − 70) × 2.2 as well as at the box width. Rendered in world context
 * so the membrane frame drops away — on the page, the page is the frame.
 */
const FigurePreview: React.FC<{
  figure: NonNullable<BookPage['diagramType']>;
  title: string;
  isDark: boolean;
  onOpen: () => void;
}> = ({ figure, title, isDark, onOpen }) => {
  const Diagram = DIAGRAMS[figure];
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  const [drawnW, setDrawnW] = useState(0);

  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setDrawnW(Math.max(0, Math.min(r.width, (r.height - 70) * 2.2)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="relative w-full h-full flex items-center justify-center min-h-0">
      {drawnW > 40 && (
        <div className="relative group" style={{ width: `${drawnW.toFixed(0)}px` }}>
          {/* the living drawing, with every interaction stripped: one surface,
              one action, no half-alive cells competing with the click */}
          <div inert aria-hidden="true">
            <FigureInertContext.Provider value={true}>
            <FigureWorldContext.Provider value={true}>
              <Suspense fallback={<FigurePending label="Figure" />}>
                <Diagram isDark={isDark} />
              </Suspense>
            </FigureWorldContext.Provider>
            </FigureInertContext.Provider>
          </div>
          {/* the click surface lies over the preview rather than around it, so
              no interactive content ever sits inside a button */}
          {/* THE DRAWING IS A POINTER TARGET, NOT A SECOND ANNOUNCEMENT.

              This carried `aria-label="Open the figure: …"` — the same string
              the labelled "See figure" control under the sheet carries — so the
              sheet offered one action under one name twice. Measured on the
              live sheet: exactly one duplicated accessible name, count 2. A
              screen reader read the same offer twice with nothing to tell the
              two apart, and a keyboard user tabbed through a stop that went
              where the next one went. That is TY-05 on a control surface.

              The visible control keeps the name. This keeps the click, and
              leaves the accessibility tree and the tab order — `tabIndex={-1}`
              first, so nothing focusable is ever hidden from assistive tech. */}
          <button
            onClick={onOpen}
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full rounded-none outline-none cursor-pointer"
          />
          {/* No hint of its own any more — the two ways on sit under the sheet,
              and this said the left-hand one a second time. */}
        </div>
      )}
    </div>
  );
};

/**
 * A way on from a figure.
 *
 * Two of these sit under every schematic: the drawing on the left, the rule
 * that applies it on the right. They are a soma and a name — the same two marks
 * the map uses for everything it offers — so a way out of the tissue looks like
 * tissue rather than like a button laid on top of it.
 *
 * `carried` marks the one that survives into the figure world. It keeps its
 * side of the sheet and its wording when the figure opens over it, so it reads
 * as the same control still standing there rather than a new one appearing; and
 * it breathes, because a control that must stay findable while somebody studies
 * a drawing has to ask for attention without ever demanding it. See
 * .cta-breathe.
 */
const FigureWay: React.FC<{
  onClick: () => void;
  label: string;
  hint: string;
  carried?: boolean;
  phase?: number;
}> = ({ onClick, label, hint, carried = false, phase = 3.2 }) => (
  <button
    onClick={onClick}
    title={hint}
    aria-label={hint}
    className={`bud flex items-center gap-2 px-2 py-2 rounded-none outline-none min-w-0 ${
      carried ? 'bud-lit' : ''
    }`}
  >
    <Soma size={8} opacity={carried ? 0.95 : 0.5} phase={phase} />
    {/* MO-01: the pulse takes the same phase the soma does. Two lit ways sit
        side by side on a figure page, and two labels breathing in step read as
        machinery rather than tissue. */}
    <span className={`text-[9px] font-light uppercase tracking-[0.2em] truncate ${
      carried ? 'cta-breathe' : 'opacity-70'
    }`} style={carried ? { animationDelay: `-${phase}s` } : undefined}>
      {label}
    </span>
  </button>
);

/**
 * THE FIVE QUESTIONS, AS THE SUBJECT OF THE SHEET THEY ARE ON.
 *
 * This sheet renders §3.4's verification gate, and it used to render it as a
 * rule card like the eight branches: the questions set inside a "System Prompt"
 * well at 70% opacity, under a title the sheet had already said, with the copy
 * affordance a 9px label in the corner of the well and the instrument that runs
 * them a small control below the fold. Everything about that arrangement said
 * *here is a page to look at*, and the one thing a reader is doing on this
 * sheet is holding work they have just produced against five questions.
 *
 * Four things change, and each of them is one of the reasons it read wrongly:
 *
 * — THE QUESTIONS COME FIRST AND AT FULL LIGHT. They are the sheet's content,
 *   not a specimen of a prompt, so they are set at the body step at full
 *   opacity with the numeral in its own track at the label step. Nothing is
 *   drawn around them: the well made five sentences look like a code block.
 *
 * — THE TWO WAYS TO RUN THEM SIT TOGETHER, ABOVE. Running them as an instrument
 *   and taking them to a model are the same act by two routes, so they are one
 *   row of two controls at the head of the sheet rather than a link at the top
 *   and a label in a corner. Both are lit; neither is the fallback.
 *
 * — THE SHEET SAYS ITS OWN NAME ONCE. The card repeated the page's title
 *   verbatim under the page's title, which is TY-05 exactly. The card is gone;
 *   the sheet header keeps the name.
 *
 * — WHAT THE GATE IS FOR IS THE AUTHOR'S SENTENCE, NOT A NEW ONE. The prompt
 *   opens by saying to run this before shipping anything produced under the
 *   ruleset. That paragraph is promoted to the lead. TY-04: no copy is written
 *   for this app, so the sentence that was needed had to be found rather than
 *   composed — and it was already in `promptData`, being set at 70% under a
 *   heading nobody reads.
 *
 * The copy control still sends `data.promptText` verbatim, exactly as the rule
 * card's did: the string is what gets pasted into a model, and nothing the
 * layout does here may reach it.
 */
const VerificationGate: React.FC<{
  data: PromptRuleData;
  onRun: () => void;
}> = ({ data, onRun }) => {
  const [copied, setCopied] = useState(false);
  const blocks = parsePromptText(data.promptText);
  const lead = blocks.find(b => b.kind === 'para');
  const questions = blocks.filter(b => b.kind === 'item');

  const handleCopy = () => {
    navigator.clipboard.writeText(data.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* The two routes, in one row. `carried` on both: this is the one sheet in
          the book where there is no secondary action. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <FigureWay
          onClick={onRun}
          label="The five questions"
          hint="Open the five-question verification gate"
          carried
          phase={6.8}
        />
        <button
          onClick={handleCopy}
          title="Copy prompt text to clipboard"
          aria-label="Copy Prompt"
          className="bud bud-lit flex items-center gap-2 px-2 py-2 rounded-none outline-none min-w-0"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span className="text-[9px] font-light uppercase tracking-[0.2em] truncate">
            {copied ? 'Copied Referred Prompt' : 'Copy Referred Prompt'}
          </span>
        </button>
      </div>

      {lead && (
        <p className="reading text-[12px] font-light leading-relaxed max-w-3xl">
          {lead.text}
        </p>
      )}

      {/* The gate itself. `select-all` so the whole set can still be taken by
          hand, as it could from the well it used to sit in. */}
      <ol className="select-all space-y-4 max-w-3xl">
        {questions.map((q, i) => (
          <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-x-3 items-baseline">
            <span className="text-[9px] font-light tabular-nums opacity-45 text-right">
              {q.marker}
            </span>
            <span className="reading text-[12px] font-light leading-relaxed">
              {q.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

/** Waiting state: a single breathing soma, never a spinner. Arousal stays flat. */
export const FigurePending: React.FC<{ label?: string }> = ({ label = 'Figure' }) => (
  <div
    className="flex items-center justify-center gap-2.5 opacity-40 py-8"
    role="status"
    aria-live="polite"
  >
    <Soma size={10} phase={7.3} />
    <span className="text-[9px] font-light uppercase tracking-[0.2em]">{label} settling</span>
  </div>
);

interface PageRendererProps {
  page: BookPage;
  prefs: UserPreferences;
  onAddHighlight: (highlight: Omit<Highlight, 'id'>) => void;
  /** the reader's own notes, so the ones taken from this sheet are drawn on it */
  highlights?: Highlight[];
  onJumpToPage: (pageIndex: number) => void;
  /** a world the index or the map asked for; opened once the page carrying it
   *  is mounted, then cleared through `onFigureOpened` */
  pendingFigure?: BookPage['diagramType'] | null;
  /** an instrument asked for from outside — see the effect below */
  pendingTool?: string | null;
  onToolOpened?: () => void;
  onFigureOpened?: () => void;
  /** the return leg to the map, for the passages out of a figure world */
  onLeaveToMap: () => void;
  /** pages waiting behind this one, innermost last — see App's backTrail */
  backTrail: number[];
  /** walk one step back along that trail */
  onBack: () => void;
}

export const PageRenderer: React.FC<PageRendererProps> = ({
  page,
  prefs,
  onAddHighlight,
  highlights = [],
  onJumpToPage,
  pendingFigure,
  pendingTool,
  onToolOpened,
  onFigureOpened,
  onLeaveToMap,
  backTrail,
  onBack}) => {
  const [selectedText, setSelectedText] = useState('');
  /** which paragraph of this sheet the selection started in, and how far into it */
  const [selectedAt, setSelectedAt] = useState<{ para: number; at: number } | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightCoords, setHighlightCoords] = useState({ x: 0, y: 0 });
  const [fullRulesetCopied, setFullRulesetCopied] = useState(false);
  /** which figure is open on its own surface, if any */
  const [stageFigure, setStageFigure] = useState<BookPage['diagramType'] | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const evidenceRef = useOverlayFocus<HTMLDivElement>(evidenceOpen);

  /* The overlay belongs to the sheet it was opened from. PageRenderer is not
     keyed per page — BookSpread swaps the `page` prop under one instance — so
     without this the open state outlives the page turn and the evidence would
     spring open again, unasked, the next time 2.3 came round. */
  useEffect(() => {
    setEvidenceOpen(false);
  }, [page.index]);

  /* Escape leaves it, the way Escape leaves a figure world. Capture phase and
     stopPropagation for the same reason FigureStage does it: App binds Escape
     to "back to the map", and closing an overlay must not also leave the book. */
  useDismiss(evidenceOpen, () => setEvidenceOpen(false));

  /* A world asked for from outside — the index, the search, the map.
     It opens only on the sheet that actually carries that figure, so the stage
     gets the page's own title rather than a fallback, and the reader lands
     somewhere real if they close it. */
  useEffect(() => {
    if (!pendingFigure || pendingFigure !== page.diagramType) return;
    setStageFigure(pendingFigure);
    onFigureOpened?.();
  }, [pendingFigure, page.diagramType, onFigureOpened]);
  /** an instrument on a surface of its own — see InstrumentStage */
  const [stageInstrument, setStageInstrument] = useState<Instrument | null>(null);

  /* An instrument asked for from outside — the index's Application column.
     Same shape as the figure effect above: it opens only on the sheet whose
     section specifies it, so closing it leaves the reader on the argument.

     THE REQUEST IS NOT CONSUMED HERE, ONLY ACTED ON. Clearing it the moment
     the stage opened looked right and lost a race: turning to the sheet
     remounts this component, `stageInstrument` is local state and goes with
     it, and by then the request had already been marked handled — so the
     reader landed on the right sheet with nothing open. It is cleared when the
     instrument is CLOSED instead, which also means any remount in between
     simply re-opens it. */
  useEffect(() => {
    if (!pendingTool || pendingTool !== page.sectionData?.interactiveWidget) return;
    setStageInstrument(pendingTool as Instrument);
  }, [pendingTool, page.sectionData?.interactiveWidget]);

  const isDark = prefs.theme === 'dark';

  // Re-fits whenever the page, the reader's type size or the leading changes.
  const {
    boxRef: proseBoxRef,
    contentRef: proseRef
  /* THE FLOOR IS A SIZE, NOT A RATIO.

     `useFitToBox` shrinks the column until it fits and its floor was a bare
     0.72. Measured across all 47 sheets: the densest sheet in every chapter
     bottomed out there, rendering the manuscript at **8.64px** — smaller than
     the 9px step this app reserves for labels and instrument readings. Five
     sheets set their whole argument in type too small to read.

     The base is PROSE_PX, not `prefs.fontSize`. That was the first version's
     mistake and it silently did nothing: the manuscript paragraphs carry
     `text-[12px]` outright, so the sheet's inherited size never reaches them
     and 12 is the number the zoom actually multiplies. Anchoring the floor to
     the reader's preference computed a ratio against a size the prose does not
     use, and the sheets stayed at 8.64px.

     Nothing is lost when the floor is not enough to fit. `.hflow` is a
     horizontal multicolumn flow — overflow becomes another column, reached by
     scrolling sideways, never clipped. So the trade is one more column against
     type nobody can read, and it is not close. Verified after the change: zero
     sheets under 11px, zero clipped or overflowing paragraphs. */
  } = useFitToBox([page.index, prefs.fontSize, prefs.lineHeight], {
    /*
     * ONE SIZE FOR BODY TEXT, EVERYWHERE, ON EVERY SHEET.
     *
     * This used to range from 0.917 to 1.5 — the fitter shrank a crowded sheet
     * and grew an empty one, so the manuscript was set anywhere between 11px
     * and 18px and the size changed as the reader turned the page. That is a
     * body size the reader can never settle into, and it is what TY-01 means by
     * three type sizes: 9, 12 and 18 are three STEPS with jobs, not the ends of
     * a range for the layout to pick from.
     *
     * Holding both bounds at 1 leaves the fitter measuring and deciding
     * nothing, which is correct: the sheet no longer adapts to the text, the
     * CUT adapts to the sheet. useSheetBudget reads how much this frame
     * actually holds and the book is re-cut to fit it, so a sheet that would
     * have been shrunk is now simply two sheets at the same size.
     *
     * The refs are still wanted — the prose column and its box are what that
     * measurement is taken from.
     */
    max: 1,
    min: 1
  });

  /**
   * A section split across sheets is one section, not three with the same name.
   *
   * pageModel breaks a long section into consecutive pages that keep the title,
   * the number and the subtitle, so the reader met an 18px heading, a subtitle
   * and a rule three times over while reading one continuous argument — and
   * each repeat cost the sheet the room the prose actually needed. The heading
   * belongs to the first sheet of a section. After that the page opens straight
   * into the text, and the running head at the foot says where you are.
   */
  const prevPage = page.index > 0 ? BOOK_PAGES[page.index - 1] : undefined;
  const continuesSection =
    !!page.sectionData &&
    !!prevPage?.sectionData &&
    prevPage.chapterId === page.chapterId &&
    prevPage.sectionData.id === page.sectionData.id;

  /** the first page of a chapter carries that chapter's cell, grown large */
  const opensChapter =
    page.type === 'chapter-section' &&
    !!page.chapterId &&
    firstPageOfChapter(page.chapterId) === page.index;

  const handleCopyFullRuleset = () => {
    navigator.clipboard.writeText(FULL_RULESET_TEXT);
    setFullRulesetCopied(true);
    setTimeout(() => setFullRulesetCopied(false), 2000);
  };

  /* Which paragraph a selection began in, and how far into that paragraph.

     A note used to record only the page it was taken on, which is why jumping
     to one landed the reader on the right sheet and left them to find the
     sentence again by eye. The paragraph carries its ordinal in the DOM
     (data-para) and the offset is counted across the text nodes inside it, so
     a paragraph that already has a mark drawn in it still measures correctly. */
  const paragraphOf = (node: Node | null): HTMLElement | null => {
    let el: HTMLElement | null =
      node instanceof HTMLElement ? node : (node?.parentElement ?? null);
    while (el && el.dataset.para === undefined) el = el.parentElement;
    return el;
  };

  const offsetWithin = (root: HTMLElement, node: Node, offset: number): number => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let seen = 0;
    let cur = walker.nextNode();
    while (cur) {
      if (cur === node) return seen + offset;
      seen += (cur.textContent || '').length;
      cur = walker.nextNode();
    }
    return 0;
  };

  // Handle Text Selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 5) {
      /* The rendered text carries a non-breaking space between a number and
         its unit (keepUnits); the manuscript carries a plain one. A note is
         re-found later by indexOf against the manuscript, so it must be stored
         in the manuscript's form or a selection across "8 billion" is lost the
         next time the sheet renders. Same length, so the offset still lands. */
      const text = selection.toString().replace(/\u00A0/g, ' ').trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const host = paragraphOf(range.startContainer);
      const para = host ? Number(host.dataset.para) : NaN;
      setSelectedText(text);
      setSelectedAt(
        host && Number.isFinite(para)
          ? { para, at: offsetWithin(host, range.startContainer, range.startOffset) }
          : null
      );
      setHighlightCoords({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setShowHighlightMenu(true);
    } else {
      setShowHighlightMenu(false);
    }
  };

  const handleSaveHighlight = () => {
    if (selectedText) {
      onAddHighlight({
        anchor: selectedAt
          ? anchorForParagraph(page.index, selectedAt.para, selectedAt.at)
          : anchorForPage(page.index),
        text: selectedText,
        sectionTitle: page.title
      });
      setShowHighlightMenu(false);
      setSelectedAt(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  /**
   * The notes that fall on this sheet, by paragraph.
   *
   * Resolved through the anchor rather than through a stored page index, and
   * re-found in the text when the offset no longer lands where it did — a note
   * survives the book being re-cut, and survives the paragraph being edited
   * under it as long as the words it quotes are still there.
   */
  const marksByParagraph = React.useMemo(() => {
    const out = new Map<number, Array<{ from: number; to: number }>>();
    const sd = page.sectionData;
    if (!sd) return out;
    const base = sd.paragraphOffset ?? 0;

    highlights.forEach((h) => {
      const a = h.anchor;
      if (!a || a.k !== 'section' || a.id !== sd.id) return;
      const idx = a.para - base;
      if (idx < 0 || idx >= sd.content.length) return;
      const text = sd.content[idx];

      let from = a.at ?? -1;
      if (from < 0 || text.slice(from, from + h.text.length) !== h.text) {
        const found = text.indexOf(h.text);
        if (found !== -1) from = found;
        // a note taken across a paragraph break keeps the part that is here
        else if (!(from >= 0 && from < text.length && h.text.startsWith(text.slice(from)))) from = -1;
      }
      if (from < 0) return;
      const to = Math.min(text.length, from + h.text.length);
      const list = out.get(idx) || [];
      list.push({ from, to });
      out.set(idx, list);
    });

    out.forEach((list) => list.sort((a, b) => a.from - b.from));
    return out;
  }, [page.index, page.sectionData, highlights]);

  /** One paragraph, with the notes taken from it drawn back in. */
    /**
   * The reader's own marks and the manuscript's own emphasis, in one pass.
   *
   * These are two different things that land on the same string: a highlight is
   * a range the reader chose, in the coordinates of the text as rendered, and an
   * emphasis is a range the author wrote, which arrives as markup and has to be
   * stripped before those coordinates mean anything. `parseEmphasis` does the
   * stripping at the top of the paragraph, so by the time anything gets here
   * both are ranges over the same clean string and neither can shift the other.
   *
   * They are rendered together rather than in sequence because they overlap
   * freely — a reader may highlight half of an emphasised phrase — and nesting
   * two independent range sets by cutting at every boundary is the only way that
   * does not silently drop one of them.
   */
  const withMarks = (text: string, pIdx: number, emphasis: Array<[number, number]> = []): React.ReactNode => {
    const marks = marksByParagraph.get(pIdx) ?? [];
    if (marks.length === 0 && emphasis.length === 0) return text;

    /* overlapping notes: the first one drawn still wins, as before */
    const kept: Array<{ from: number; to: number }> = [];
    let at = 0;
    for (const m of marks) {
      if (m.from < at) continue;
      kept.push({ from: m.from, to: m.to });
      at = m.to;
    }

    const cuts = new Set<number>([0, text.length]);
    for (const [a, b] of emphasis) { cuts.add(a); cuts.add(b); }
    for (const m of kept) { cuts.add(m.from); cuts.add(m.to); }
    const edges = [...cuts].filter(n => n >= 0 && n <= text.length).sort((a, b) => a - b);

    const out: React.ReactNode[] = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const from = edges[i], to = edges[i + 1];
      if (to <= from) continue;
      let node: React.ReactNode = text.slice(from, to);
      if (emphasis.some(([a, b]) => from >= a && to <= b)) node = <em>{node}</em>;
      if (kept.some(m => from >= m.from && to <= m.to)) node = <span className="marked">{node}</span>;
      out.push(<React.Fragment key={i}>{node}</React.Fragment>);
    }
    return out;
  };

  return (
    <div 
      onMouseUp={handleMouseUp}
      /* A schematic is given the sheet's full measure: the reading margin that
         makes prose comfortable is the same margin that costs a figure the
         width it needs to stay legible.

         The margin grows with the window rather than stopping at sm. A desktop
         sheet held its text 32px from the glass at any width, so at 1400px the
         page read as a wall of type pushed against both edges with nothing
         holding it — the column has a maximum measure, but the SHEET around it
         had no breathing room, and a margin that stops growing stops being a
         margin and becomes an edge. The schematic keeps a narrower one at every
         step, for the same reason it always did: a figure spends the width the
         prose gives away. */
      className={`sheet-pad hflow-hold relative w-full h-full flex flex-col justify-between overflow-hidden select-text transition-colors duration-300 rounded-none ${
        takesWholeSheet(page)
          ? 'p-2 sm:p-3 lg:p-6 xl:p-8'
          : 'p-4 sm:p-8 lg:px-16 lg:py-10 xl:px-24 2xl:px-32'
      } ${isDark ? 'text-white' : 'text-black'}`}
      style={{
        fontSize: `${prefs.fontSize}px`,
        lineHeight: prefs.lineHeight
      }}
    >
      {/* The way back out of an excursion.

          Upper-left, which is where every platform has taught a reader to look
          for it, and present only while there is somewhere to go: a back control
          that is always there but usually inert teaches people to stop seeing
          it. One touch is one step — the figure, then the chapter — which is the
          same walk the backward swipe makes, so the gesture and the mark agree
          rather than being two separate systems. */}
      {backTrail.length > 0 && (
        <button
          onClick={onBack}
          className="bud absolute top-2 left-2 z-30 flex items-center gap-2 px-2 py-2 rounded-none outline-none"
          title={backTrail.length > 1 ? 'Back to the figure' : 'Back to the chapter'}
          aria-label={backTrail.length > 1 ? 'Back to the figure' : 'Back to the chapter'}
        >
          <ArrowLeft className="w-3.5 h-3.5 opacity-70" />
          <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70">
            {backTrail.length > 1 ? 'The figure' : 'The chapter'}
          </span>
        </button>
      )}

      {/* Popover menu for text highlight */}
      {showHighlightMenu && (
        <div
          className="membrane-lit settle fixed z-50 -translate-x-1/2 -translate-y-full mb-2 px-4 py-2 flex items-center space-x-2 text-[12px] rounded-none"
          style={{ left: `${highlightCoords.x}px`, top: `${highlightCoords.y}px` }}
        >
          <button
            onClick={handleSaveHighlight}
            className="bud px-1 flex items-center space-x-2 text-[9px] font-light uppercase tracking-[0.2em]"
          >
            <Bookmark className="w-3 h-3" />
            <span>Save Quote Note</span>
          </button>
        </div>
      )}

      {/* RENDER COVER PAGE */}
      {page.type === 'cover' && (
        <div className="flex flex-col justify-between h-full py-8 text-center max-w-2xl mx-auto rounded-none overflow-hidden">
          <div className="space-y-6 my-auto flex flex-col items-center min-h-0">
            <div className="opacity-60 ambient-breathe flex-shrink min-h-0">
              <DataFlower size={190} rays={40} />
            </div>

            <div className="flex items-center justify-center gap-2.5 opacity-85">
              <Soma size={9} phase={4.4} />
              <span className="text-[12px] font-light uppercase tracking-[0.2em]">{page.chapterNumber}</span>
              <Soma size={9} phase={12.8} />
            </div>

            <h1 className="text-[18px] font-light tracking-[0.2em] uppercase leading-tight">
              {page.title}
            </h1>
            <div className="w-40 max-w-full opacity-50">
              <Vein opacity={0.5} phase={6.1} />
            </div>
            <p className="text-[12px] font-light opacity-70 max-w-lg mx-auto tracking-[0.2em] uppercase">
              {page.subtitle}
            </p>
          </div>

          <div className="pb-6">
            <button
              onClick={() => onJumpToPage(1)}
              className="bud px-8 py-3.5 font-light text-[12px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2.5 mx-auto rounded-none outline-none"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Begin Dossier (Page 1)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* THE EVIDENCE, OVER THE SECTION IT EVIDENCES.

          Small and centred rather than full bleed: a figure world replaces the
          page because the drawing needs the whole sheet, but this is the
          apparatus behind a paragraph, and the paragraph should still be there
          behind it. LY-05/LY-06: square corners, and the panel is a membrane,
          so its edge is feathered rather than outlined. LY-02: the evidence
          scrolls inside its own column, never the viewport. */}
      {evidenceOpen && page.caseStudyData && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8"
          onClick={() => setEvidenceOpen(false)}
          style={{
            background: 'radial-gradient(ellipse 130% 110% at 50% 50%, rgba(0,0,0,0.86), rgba(0,0,0,0.66))',
            backdropFilter: 'blur(18px) saturate(120%)',
            WebkitBackdropFilter: 'blur(18px) saturate(120%)'
          }}
        >
        <div
          ref={evidenceRef}
          className="membrane surface w-full max-w-2xl max-h-[80vh] flex flex-col rounded-none p-5 sm:p-6 space-y-3"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={page.caseStudyData.title}
        >
          {/* Header */}
          <div className="space-y-1 flex-shrink-0">
            {/* The chapter eyebrow is gone from every sheet.

                It was the small tracked line above the title that repeated where
                you already were — PROLOGUE over a prologue, CHAPTER II EVIDENCE
                over a case study whose title says so. Removed on instruction,
                and it is the direction TY-05 was already pushing: three of the
                four instances here carried a comment about the eyebrow printing
                a second copy of something the title had said, each one patched
                with a narrower condition rather than removed. The chapter is
                carried by the chapter opener, by the index, and by the map. */}
            <h2 className="text-[18px] font-light">
              {page.caseStudyData.title}
            </h2>
            <p className="text-[12px] font-light opacity-70">
              {page.caseStudyData.subtitle}
            </p>
            <div className="opacity-55 pt-1">
              <Vein opacity={0.5} phase={8.3} />
            </div>
          </div>

          {/* Fragile against antifragile, the verdict, and the citations that
              carry them — the comparison is the point, so it is one column and
              never a page turn. */}
          {(
            <div className="flex-1 min-h-0 hflow space-y-5 py-2 px-1.5 pr-2">
              <div className="space-y-5">
                <div className="membrane p-3 space-y-1.5 rounded-none flex flex-col">
                  <SomaLabel opacity={0.75} phase={1.1}>Fragile (Extractive)</SomaLabel>
                  <p className="reading text-[12px] font-light leading-relaxed mt-1">
                    {page.caseStudyData.fragile}
                  </p>
                </div>

                <div className="membrane p-3 space-y-1.5 rounded-none flex flex-col">
                  <SomaLabel opacity={0.75} phase={10.7}>Antifragile (Restorative)</SomaLabel>
                  <p className="reading text-[12px] font-light leading-relaxed mt-1">
                    {page.caseStudyData.antifragile}
                  </p>
                </div>
              </div>

              <div className="membrane-lit p-3 space-y-1 rounded-none">
                <SomaLabel opacity={0.6} phase={15.2}>Strategic Verdict</SomaLabel>
                <p className="reading text-[12px] font-light leading-relaxed italic">
                  "{page.caseStudyData.verdict}"
                </p>
              </div>

              <div className="space-y-1.5">
                <SomaLabel opacity={0.5} phase={5.5}>Evidence &amp; Citations</SomaLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 text-[9px]">
                  {page.caseStudyData.citations.map((c, i) => (
                    <div key={i} className="membrane-faint p-1.5 rounded-none">
                      <span className="font-light block">{c.authorOrSource}</span>
                      <span className="opacity-70 block">{c.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>,
        document.body
      )}

      {/* RENDER DIAGRAM PAGE */}
      {/* a schematic takes the whole sheet — see the grouping in BookSpread —
          so it is not held to the reading column's measure */}
      {page.type === 'diagram' && (
        <div className="flex flex-col h-full max-w-5xl mx-auto py-2 rounded-none space-y-3 min-h-0">
          {/* Centred. A schematic page is a drawing with a name on it, not a
              column of prose: the figure below is centred in the full width of
              the sheet, and a title hard against the left margin reads as the
              heading of a text block that is not there. */}
          <div className="space-y-1 flex-shrink-0 text-center">
            <h2 className="text-[18px] font-light">{page.title}</h2>
            {page.subtitle && (
              <p className="text-[12px] font-light opacity-70">{page.subtitle}</p>
            )}
            <div className="opacity-55 pt-1">
              <Vein opacity={0.5} phase={16.7} />
            </div>
          </div>

          {/* The figure IS drawn here — as an inert preview sized to the box,
              so the sheet never scrolls. Touching anywhere on it opens the
              figure full bleed on a surface of its own, where the interactions
              live. See FigurePreview and FigureStage. */}
          <div className="flex-1 min-h-0 rounded-none">
            {page.diagramType && (
              <FigurePreview
                figure={page.diagramType}
                title={page.title}
                isDark={isDark}
                onOpen={() => setStageFigure(page.diagramType || null)}
              />
            )}
          </div>

          {/* The ways on. Where there are two they carry equal weight: one
              opens the drawing, the other leaves for the rule that puts it to
              work. Centred as a pair rather than pushed to opposite margins —
              equal weight reads as equal only when they are close enough to be
              seen as one offer. gap-5 is the spacing the taxonomy already uses
              between its own two controls.

              A figure that ends in its own instrument shows only the first:
              its "run it on your own source" is the application, and offering
              a second door to the prose about it says the same thing twice. */}
          {/* The pair wraps rather than pushing the sheet wider. Under a coarse
              pointer each way carries MO-08's 44px box, and at 280px the two of
              them plus `gap-5` came to a 252px minimum inside a 248px column.
              They are centred as a pair wherever a pair fits, and stack where
              it does not. */}
          {page.diagramType && (
            <div className="flex-shrink-0 flex flex-wrap items-center justify-center gap-5 pt-1">
              <FigureWay
                onClick={() => setStageFigure(page.diagramType || null)}
                label="See figure"
                hint={`Open the figure: ${page.title}`}
                carried
                phase={2.4}
              />
              {!figureCarriesItsOwnApplication(page.diagramType) && (
              /* APPLICATION OPENS AN INSTRUMENT, NOT A BRANCH.
                 This used to jump to `pageForPromptRule(passage.ruleId)` — a
                 page of prose about a rule, and the same page for five of the
                 six figures, since every branch lives on one sheet. A control
                 that says "put this to work" and hands over more reading is
                 promising the wrong thing. It now opens the tool the figure's
                 own argument runs on. */
              <FigureWay
                onClick={() => {
                  const tool = FIGURE_PASSAGES[page.diagramType!]?.toolId;
                  if (tool && tool !== 'causal-taxonomy') setStageInstrument(tool);
                }}
                label="See application"
                hint="Open the instrument that puts this figure to work"
                carried
                phase={11.6}
              />
              )}
            </div>
          )}
        </div>
      )}

      {/* RENDER CHAPTER SECTION PAGE */}
      {page.type === 'chapter-section' && page.sectionData && (
        <div className="flex flex-col h-full max-w-3xl mx-auto py-2 rounded-none space-y-3 min-h-0">
          {/* Header */}
          <div className="space-y-1 flex-shrink-0">
            {/* No copy control up here. A clipboard action in a chapter header
                is an instrument bolted onto the reading; the prompts live at
                the very end of the book, in the Production Ruleset, and are
                copied there — next to the prompt itself, where what you are
                copying is on screen. */}

            {/* A chapter begins as the cell it is on the map, grown to the head
                of the page — the one place in the reader where scale is used
                as information. Every other page keeps the plain title block. */}
            {continuesSection ? null : opensChapter ? (
              <ChapterOpener
                chapterId={page.chapterId!}
                numeral={chapterNumeral(page.chapterNumber)}
                title={page.title}
                subtitle={page.subtitle}
              />
            ) : (
              <>
                <h2 className="text-[18px] font-light">
                  {page.title}
                </h2>
                {page.subtitle && (
                  <p className="sheet-subtitle text-[12px] font-light opacity-70">{page.subtitle}</p>
                )}
              </>
            )}

            {/* Where this argument comes from, offered before it is read —
                a plain text link, the lightest mark on the page: no glyph, no
                arrow, no control shape. It is a footnote that happens to sit
                at the top. */}
            {!continuesSection && page.sectionData.citations && page.sectionData.citations.length > 0 && (
              <button
                onClick={() => {
                  /* The sheet of the bibliography this section's own sources
                     are on, not the first sheet of the list. The link opened
                     the bibliography at its beginning and left the reader to
                     find the works just cited among nineteen. */
                  const own = sourcesOfCitations(page.sectionData!.citations).map(x => x.id);
                  const sheet = own.length ? pageForSources(own) : -1;
                  onJumpToPage(sheet >= 0 ? sheet : firstReferencesPage());
                }}
                className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-25 hover:opacity-70 transition-opacity duration-500 underline underline-offset-4 decoration-[0.5px] rounded-none outline-none"
                title="Open the consolidated bibliography"
              >
                Explore sources
              </button>
            )}

            {/* The evidence for this section, which used to be the sheet after
                it. Same register as the way into the bibliography, because it
                is the same kind of offer: the apparatus behind the claim,
                reachable without leaving the claim. */}
            {page.caseStudyData && (
              <button
                onClick={() => setEvidenceOpen(true)}
                className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-25 hover:opacity-70 transition-opacity duration-500 underline underline-offset-4 decoration-[0.5px] rounded-none outline-none"
                title={page.caseStudyData.title}
              >
                See the evidence
              </button>
            )}

            {/* §3.4 declares the five-question gate and could not open it.

                `bookData` marks 3.3 & 3.4 with `interactiveWidget:
                'five-questions'` — the section IS the operational protocol those
                questions come from — but only the `content-budget` branch below
                was ever written, so the flag sat there reading as live data that
                nothing consumed. The instrument was reachable from the
                verification-checklist ruleset page and nowhere else, which meant
                the one section that poses the questions was the one place a
                reader could not put them to work.

                LY-01's half of this is the part worth naming: content is data,
                so the fix is to make the renderer honour the flag rather than to
                delete the flag for disagreeing with the renderer. */}
            {page.sectionData?.interactiveWidget === 'restoration-delta' && (
              <button
                onClick={() => setStageInstrument('restoration-delta')}
                className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-25 hover:opacity-70 transition-opacity duration-500 underline underline-offset-4 decoration-[0.5px] rounded-none outline-none"
                title="Open the Restoration Delta instrument"
              >
                The Restoration Delta
              </button>
            )}

            {page.sectionData?.interactiveWidget === 'five-questions' && (
              <button
                onClick={() => setStageInstrument('five-questions')}
                className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-25 hover:opacity-70 transition-opacity duration-500 underline underline-offset-4 decoration-[0.5px] rounded-none outline-none"
                title="Open the five-question verification gate"
              >
                The five questions
              </button>
            )}

            {/* The instrument behind this section, in the same row as the
                bibliography and the evidence — the apparatus that puts the
                argument to work, reachable without leaving it. It opens only
                from the part of the section that carries it, which the
                paginator keeps on the last sheet. */}
            {page.sectionData?.interactiveWidget === 'content-budget' && (
              <button
                onClick={() => setStageInstrument('content-budget')}
                className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-25 hover:opacity-70 transition-opacity duration-500 underline underline-offset-4 decoration-[0.5px] rounded-none outline-none"
                title="Open Content Pollution Control"
              >
                Content Pollution Control
              </button>
            )}

            {!continuesSection && (
              <div className="opacity-55 pt-1">
                <Vein opacity={0.5} phase={1.7} />
              </div>
            )}
          </div>

          {/*
            Section prose — fitted to the sheet, not scrolled inside it.

            A scrollbar in the middle of a spread is the page admitting it did
            not fit: reading stops being something you take in and becomes a
            trough you drag through, which is precisely the posture the
            manuscript argues against. useFitToBox steps the type down until the
            column fits. It only falls back to scrolling when a page would need
            to go below ~72% of the reader's chosen size, at which point
            shrinking further would be worse than scrolling.
          */}
          <div
            ref={proseBoxRef}
            /* `auto` in both branches, never `hidden`. When the fit succeeds
               auto shows no scrollbar, so the fitted reading is unchanged — but
               when it does not (a measurement that has not settled, a viewport
               that changed under it, a column too short for even the floor size)
               the difference between the two is whether the reader can reach
               the rest of the chapter or simply never sees it. Text is not
               allowed to be lost to a layout guess. */
            /* WHICH SHEET THE MEASURER IS LOOKING AT.

               The cut of the book is made from the height of this box, and the
               box is different on the three kinds of prose sheet: one opens a
               chapter and gives a third of its column to the cell, one starts a
               section and gives a heading to it, one continues a section and
               gives nothing. `utils/proseMetrics.ts` reads whichever is on
               screen and derives the other two from it, so it has to be told
               which it has — and the renderer is the only thing that knows.
               Inferring it from the markup was the alternative and it is the
               kind of guess that goes quietly wrong the next time a header
               gains an element. */
            data-prose={continuesSection ? 'continuation' : opensChapter ? 'opener' : 'section'}
            className="flex-1 min-h-0 pr-1 hflow"
          >
            <div ref={proseRef} className="space-y-3">
              {page.sectionData.content.map((paragraph, pIdx) => {
                /* Emphasis is stripped first, so every offset after this point
                   is an offset into the text the reader actually sees.
                   `keepUnits` is length-preserving by construction, so the
                   spans survive it untouched. */
                const { text: plain, spans } = parseEmphasis(paragraph);
                const typeset = keepUnits(plain);
                const isQuote = plain.startsWith('"') && plain.endsWith('"');

                if (isQuote) {
                  return (
                    <blockquote
                      key={pIdx}
                      data-para={pIdx}
                      className="reading membrane my-1.5 p-3 font-light italic text-[12px] leading-relaxed rounded-none"
                    >
                      {withMarks(typeset, pIdx, spans)}
                    </blockquote>
                  );
                }

                return (
                  <p
                    key={pIdx}
                    data-para={pIdx}
                    className="reading text-[12px] font-light leading-relaxed"
                  >
                    {withMarks(typeset, pIdx, spans)}
                  </p>
                );
              })}

              {/* Widget and prompt block ride the same scrolling column as the
                  prose. As siblings of the column they could not shrink, so a
                  tall card pushed the tail of the page past the sheet and the
                  text was clipped rather than scrolled. */}
              {/* No seed in the prose.

                  Two of these stood here — one opening a figure, one opening the
                  five questions — from when a figure had no page of its own and
                  had to be reached from the paragraph that argued it. Every
                  figure now has its own sheet, with the drawing itself on it and
                  two named ways on, so a seed in the middle of a chapter offers
                  a second door to a room the reader is already walking toward.

                  It also landed badly: a cell floating in the gap under four
                  paragraphs, with the rest of the sheet empty around it. The
                  instrument moved to the page that names it — see the
                  verification checklist in the Production Ruleset. */}

              {/* No prompt card inside the chapters. The rule the section
                  refers to lives in full at the very end of the book, in the
                  Production Ruleset, copied next to the prompt itself. */}
            </div>
          </div>

          {/* The sources link moved to the head of the chapter — see the header
              block above. At the foot it read as a conclusion the section had
              arrived at; at the head it is what it actually is, a note about
              where this argument comes from, offered before you read it. */}
        </div>
      )}

      {/* RENDER REFERENCES PAGE */}
      {page.type === 'references' && (
        <div className="flex flex-col h-full max-w-3xl mx-auto py-2 rounded-none space-y-3 min-h-0">
          <div className="space-y-1 flex-shrink-0">
            <SomaLabel opacity={0.6} phase={6.6}>Bibliography</SomaLabel>
            <h2 className="text-[18px] font-light">{page.title}</h2>
            {page.subtitle && <p className="text-[12px] opacity-70">{page.subtitle}</p>}
            <div className="opacity-55 pt-1">
              <Vein opacity={0.5} phase={12.2} />
            </div>
          </div>

          {page.sourcesIntro && (
            <p className="text-[12px] font-light leading-relaxed opacity-70 flex-shrink-0">
              {page.sourcesIntro}
            </p>
          )}

          <div className="flex-1 min-h-0 hflow px-1.5 pr-2">
            <div className="space-y-3 text-[12px] py-2">
              {page.consolidatedSourcesChunk?.map((source, idx) => {
                /* Where this work is actually used.

                   The bibliography could not say: an entry that carries three
                   chapters and an entry mentioned once in passing were drawn
                   identically, and the list was the one part of the book with
                   no way back into it. The numbers are the manuscript's own
                   section numbers — nothing is written here — and each one is
                   the way to the sheet that cites it. Names surface under
                   touch (TY-06): the section's title is the control's
                   accessible name, not a caption printed beside it. */
                const cites = 'id' in source ? citedBy((source as { id: string }).id) : [];
                return (
                  /* Set as a catalogue entry rather than a card. A membrane
                     around every work drew nineteen boxes and no list; the
                     headword sits flush and everything belonging to it hangs
                     indented under it, which is how a bibliography has always
                     told you where one work ends and the next begins. */
                  <div key={idx} className="break-inside-avoid">
                    <span className="font-light block text-[12px]">{source.authorOrSource}</span>
                    <span className="opacity-70 block text-[12px] font-light pl-4">{source.text}</span>
                    {cites.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 pl-4">
                        {cites.map((sectionId) => (
                          <button
                            key={sectionId}
                            onClick={() => onJumpToPage(pageForManuscriptSection(sectionId))}
                            title={manuscriptSectionName(sectionId)}
                            aria-label={manuscriptSectionName(sectionId)}
                            className="bud flex items-center gap-1.5 text-[9px] font-light uppercase tracking-[0.2em] rounded-none outline-none"
                          >
                            <Soma size={7} opacity={0.55} phase={(idx * 3.7 + sectionId.length) % 19} />
                            <span>{sectionId}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RENDER PROMPT RULESET PAGE */}
      {page.type === 'prompt-ruleset' && (
        /* THE LIBRARY DOES NOT FLOW INTO COLUMNS.
           Every other ruleset sheet is `.hflow` — the book's horizontal multicol,
           which is how prose overruns a sheet without the viewport scrolling
           (LY-02, LY-03). A CSS grid inside a multicol box is FRAGMENTED across
           the columns, so the bento's second and third rows were laid out in a
           column off to the right: the one arrangement whose whole value is
           being seen at once, cut into pieces you have to swipe between.
           It takes a plain column instead, and scrolls inside itself if the
           sheet is short — which is the same permission LY-02 already gives. */
        <div className={`h-full mx-auto py-2 rounded-none space-y-4 min-h-0 px-1.5 pr-2 ${
          isRuleLibrary(page) || isRulesetOverview(page)
            ? 'max-w-6xl flex flex-col soft-scroll'
            /* A GATE IS A PLAIN COLUMN, FOR THE SAME REASON THE LIBRARY IS.
               `.hflow` sends what will not fit into a column off to the right,
               which is right for prose and wrong for a checklist: measured at
               4.46 columns, finishing the five questions took four sideways
               swipes and there was no way to see the set at once. It scrolls
               inside itself instead, which is the permission LY-02 already
               gives, and it has the whole spread to do it in. */
            : isVerificationGate(page)
              ? 'max-w-4xl flex flex-col soft-scroll'
              : 'max-w-3xl hflow'
        }`}>
          {/* Header.

              On a library sheet it is not here — it is the first cell of the
              bento, handed to PromptLibrary as its lead. Eight tiles leave a
              hole in a three-column grid, and the title is exactly the right
              size to fill it; keeping the heading above as well would be the
              same name said twice on one frame (TY-05). */}
          {!isRuleLibrary(page) && (
            <div className="space-y-1 flex-shrink-0">
              <h2 className="text-[18px] font-light">
                {page.title}
              </h2>
              {page.subtitle && (
                <p className="text-[12px] font-light opacity-70">{page.subtitle}</p>
              )}
              <div className="opacity-55 pt-1">
                <Vein opacity={0.5} phase={7.1} />
              </div>
            </div>
          )}

          {/* THE OVERVIEW IS A BENTO, NOT A COLUMN — see RulesetOverview.

              Stacked, it ran 2.09 columns in half a spread; given the whole
              spread and three tracks it still stacked, because the tracks
              opened at `lg` and the sheet a reader is usually on is narrower
              than that. It is now the same kind of surface as the branch
              library next to it: fixed cells, each scrolling inside itself,
              the whole set on screen at once. */}
          {isRulesetOverview(page) && page.promptRulesetIntro && (
            <RulesetOverview
              context={page.promptRulesetIntro.context}
              howToUse={page.promptRulesetIntro.howToUse}
              onCopyAll={handleCopyFullRuleset}
              copiedAll={fullRulesetCopied}
            />
          )}

          {/* Intro Section if present */}
          {page.promptRulesetIntro && !isRulesetOverview(page) && (
            <div className="membrane p-3 space-y-2 rounded-none">
              {/* IT WRAPS RATHER THAN BREAKING BOTH HALVES.

                  This row is a name and a control, and it used to have a
                  half-sheet to sit in. The column is a third of a sheet now,
                  and held on one line at that width the label broke after
                  "Documentation &" and the control broke after "Copy Full" —
                  two two-line stumps where there had been two labels. Allowed
                  to wrap, the control takes the next line whole and each keeps
                  its own line; `whitespace-nowrap` is what makes that the
                  break that happens rather than a third one inside the words. */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <SomaLabel opacity={0.8} phase={5.9}>Documentation &amp; Overview</SomaLabel>
                <button
                  onClick={handleCopyFullRuleset}
                  className={`bud px-2.5 py-1 text-[9px] font-light uppercase tracking-[0.2em] whitespace-nowrap flex items-center space-x-1.5 rounded-none outline-none ${
 fullRulesetCopied ? 'bud-lit' : ''
 }`}
                  title="Copy full ruleset prompt to clipboard"
                >
                  {fullRulesetCopied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied Full Ruleset</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Full Ruleset</span>
                    </>
                  )}
                </button>
              </div>
              <div className="opacity-40">
                <Vein opacity={0.4} phase={14.6} />
              </div>

              <p className="reading text-[12px] font-light italic">
                {page.promptRulesetIntro.context}
              </p>
              <p className="reading text-[12px] leading-relaxed whitespace-pre-wrap">
                {page.promptRulesetIntro.howToUse}
              </p>
            </div>
          )}

        {/* THE COMPOSER IS GONE FROM THIS SHEET.

            It opened the ruleset page with a second set of controls above the
            grid — compose, copy, read — describing the same eight rules the
            grid beneath it already holds, and it was reported as making no
            sense in place. It was answering "how do these fit together" on a
            sheet whose subject is "which one do I need", and it pushed the
            set it was describing below the fold to do it.

            Nothing it did is lost: every branch copies from its own card now,
            from the face that is showing the rule. */}

          {/* The instrument is no longer announced separately from the sheet.

              It used to stand here, above the card, as a lone control on a line
              of its own — the one thing to DO on the sheet, introduced before
              the sheet had said what it was. It now sits inside the gate beside
              the copy control, because running the questions and taking them to
              a model are two routes through one act and neither is a footnote
              to the other. See VerificationGate. */}

          {/* Cards */}
          {/* THE GATE SITS IN THE FIELD, NOT AT THE TOP OF IT.

              Five questions and two controls do not fill a sheet that has just
              been given the whole spread, and left at the top they read as a
              page that ran out rather than as an instrument. `my-auto` rather
              than `flex-1` + `justify-center`: an auto margin collapses to
              zero the moment the content is taller than the column, so a narrow
              frame scrolls from the true top instead of centring content it
              cannot then reach. */}
          {/* AN EMPTY BOX STILL TAKES ITS SHARE OF THE SHEET.

              The overview draws its own cells now and this holder has nothing
              left to put in them, but it kept `flex-1` — so it took half the
              free height of the column and the bento was squeezed into the
              other half. Measured: the grid got 270px of a 656px sheet and
              every cell showed its heading and one line of its body. It is not
              rendered at all on that sheet now. */}
          {!isRulesetOverview(page) && (
          <div className={isVerificationGate(page)
            ? 'my-auto space-y-5'
            : 'flex-1 min-h-0 space-y-5'}>
            {isVerificationGate(page) && PROMPT_RULESET_DATA['verification-checklist'] ? (
              <VerificationGate
                data={PROMPT_RULESET_DATA['verification-checklist']}
                onRun={() => setStageInstrument('five-questions')}
              />
            ) : page.promptRuleId && PROMPT_RULESET_DATA[page.promptRuleId] && !isRulesetOverview(page) ? (
              <PromptRuleCard data={PROMPT_RULESET_DATA[page.promptRuleId]} isDark={isDark} />
            ) : null}

            {/* More than one rule on a sheet is a set to choose from, not a
                stack to read through — so it is drawn as folders. A single rule
                stays a card: there is nothing to choose between. */}
            {page.promptRuleIds && (
              page.promptRuleIds.length > 1
                ? <PromptLibrary
                    branchIds={page.promptRuleIds}
                    isDark={isDark}
                    /* The note on how the blocks are used is the tallest thing in
                       this cell, and on a frame that shows the branches as a list
                       it is the difference between fitting and scrolling —
                       measured at 866x694, 172px of scroll with it and none
                       without. The rule itself stays; only the paragraph about
                       using it goes, and it is still on the ruleset overview. */
                    leadCompact={
                      <>
                        <h2 className="text-[18px] font-light leading-snug">{page.title}</h2>
                        <span className="flex items-center gap-2.5 mt-3">
                          <SomaLabel opacity={0.85} phase={2.2}>Global Rule</SomaLabel>
                          <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45">
                            always inherited
                          </span>
                        </span>
                        {PROMPT_RULESET_DATA['global-rule']?.subtitle && (
                          <p className="text-[12px] font-light leading-relaxed opacity-70 mt-2">
                            {PROMPT_RULESET_DATA['global-rule'].subtitle}
                          </p>
                        )}
                      </>
                    }
                    lead={
                      /* THE LEAD SQUARE CARRIES THE THING EVERY OTHER TILE
                         INHERITS.

                         It was the sheet's title and a rule, in a cell four
                         times the size of its neighbours — mostly empty, and
                         the reader had lost the Global Rule and the note on how
                         the blocks are used when the composer came off this
                         sheet. Both belong here: the rule that sits above all
                         eight is the one cell that is bigger than all eight,
                         which says the relation by geometry instead of by a
                         sentence.

                         NO FLIP. The other tiles hide their rule because there
                         are eight of them and no room; this one has the room,
                         so hiding it behind a tap would be a gesture that buys
                         nothing. Below lg the cell is a full-width row and the
                         same content simply stacks — the branches keep their
                         flip there because eight of them still cannot fit. */
                      <>
                        <h2 className="text-[18px] font-light leading-snug">{page.title}</h2>
                        {/* The page subtitle is not repeated here. It said the
                            branches inherit the Global Rule, which is the same
                            thing the note below says at length and the geometry
                            of this cell says without words (TY-05). */}

                        <div className="opacity-55 py-3">
                          <Vein opacity={0.5} phase={7.1} />
                        </div>

                        <span className="flex items-center gap-2.5">
                          <SomaLabel opacity={0.85} phase={2.2}>Global Rule</SomaLabel>
                          <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45">
                            always inherited
                          </span>
                        </span>

                        {PROMPT_RULESET_DATA['global-rule']?.subtitle && (
                          <p className="text-[12px] font-light leading-relaxed opacity-70 mt-2">
                            {PROMPT_RULESET_DATA['global-rule'].subtitle}
                          </p>
                        )}

                        {/* The note on how the blocks are used lives on the
                            ruleset overview sheet, not this one, so it is read
                            from the book rather than copied into a second
                            place where it could drift. */}
                        {rulesetHowToUse && (
                          <p className="text-[12px] font-light leading-relaxed opacity-45 mt-2">
                            {rulesetHowToUse}
                          </p>
                        )}

                        <button
                          onClick={handleCopyFullRuleset}
                          className={`bud self-start mt-auto px-2.5 py-1 text-[9px] font-light uppercase tracking-[0.2em] flex items-center gap-1.5 rounded-none outline-none ${
                            fullRulesetCopied ? 'bud-lit' : ''
                          }`}
                          title="Copy the global rule and every branch as one block"
                        >
                          {fullRulesetCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{fullRulesetCopied ? 'Copied Full Ruleset' : 'Copy Full Ruleset'}</span>
                        </button>
                      </>
                    }
                  />
                : page.promptRuleIds.map(id => (
                    PROMPT_RULESET_DATA[id] ? (
                      <PromptRuleCard key={id} data={PROMPT_RULESET_DATA[id]} isDark={isDark} />
                    ) : null
                  ))
            )}
          </div>
          )}
        </div>
      )}

      {/* The figure, on a surface of its own — outside the sheet, outside the
          page sequence, so nothing renumbers and no stored mark moves. */}
      {stageFigure && (
        <FigureStage
          figure={stageFigure}
          title={page.type === 'diagram' && page.diagramType === stageFigure ? page.title : figureTitle(stageFigure)}
          isDark={isDark}
          onClose={() => setStageFigure(null)}
          onToMap={() => { setStageFigure(null); onLeaveToMap(); }}
          /* The way out of a figure world and into the thing that runs it.
             It closed the figure and turned to a branch page before — which is
             why the stage's own comment described it as "the rule that puts the
             figure to work". It is an instrument now, so the reader crosses
             from one full-bleed surface to another without a page turn in
             between, the way the figure→figure passages already do. */
          onToPractice={() => {
            const tool = FIGURE_PASSAGES[stageFigure!]?.toolId;
            setStageFigure(null);
            if (tool && tool !== 'causal-taxonomy') setStageInstrument(tool);
          }}
          onToFigure={f => setStageFigure(f)}
        />
      )}

      {/* The instrument, on a surface of its own — same reasoning as the figure
          world, and the same reason it is not a sixth page in Chapter III. */}
      {stageInstrument && (
        <InstrumentStage
          instrument={stageInstrument}
          isDark={isDark}
          onClose={() => { setStageInstrument(null); onToolOpened?.(); }}
          onToChapter={() => {
            setStageInstrument(null);
            if (page.chapterId) onJumpToPage(firstPageOfChapter(page.chapterId));
          }}
          onToMap={() => { setStageInstrument(null); onLeaveToMap(); }}
          /*
           * A proposed strategy is only advice until you can reach what it
           * refers to. Chapters and rules are pages, so following one closes
           * the instrument and turns to it; a figure is a world, so following
           * one hands the reader straight across without going through a page
           * at all. Every destination resolves here, at follow time, from the
           * chapter, rule or figure named — never from a stored index.
           */
          onFollow={ref => {
            if (ref.kind === 'figure') {
              setStageInstrument(null);
              setStageFigure(ref.figure as BookPage['diagramType']);
              return;
            }
            setStageInstrument(null);
            onJumpToPage(
              ref.kind === 'chapter'
                ? firstPageOfChapter(ref.id)
                : pageForPromptRule(ref.id)
            );
          }}
        />
      )}
    </div>
  );
};
