import React, { useState, lazy, Suspense, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayFocus } from '../utils/a11y';
import {
  BookPage, BOOK_PAGES, firstPageOfChapter, firstReferencesPage,
  pageForPromptRule, FIGURE_PASSAGES, figureCarriesItsOwnApplication
} from '../data/pageModel';
import { FigureStage } from './FigureStage';
import { FigureWorldContext, FigureInertContext } from './figures/FigurePrimitives';
import { InstrumentStage } from './InstrumentStage';
import { UserPreferences, Highlight } from '../data/userStore';
import {
  anchorForPage, anchorForParagraph,
  pageForManuscriptSection, manuscriptSectionName, pageForSources
} from '../data/anchors';
import { sourcesOfCitations, citedBy } from '../data/relations';
import { BookOpen, Bookmark, ArrowRight, ArrowLeft, Copy, Check } from 'lucide-react';
import { DataFlower } from './DataFlower';
import { Vein, Soma, SomaLabel } from './organic/Organic';
import { PromptRuleCard } from './PromptRuleCard';
import { PromptFolders } from './PromptFolders';
import { ChapterOpener } from './ChapterOpener';
import { PromptComposer } from './PromptComposer';
import { PROMPT_RULESET_DATA, FULL_RULESET_TEXT } from '../data/promptData';
import { useFitToBox } from '../utils/fitToBox';

/**
 * Whether a title already carries its eyebrow, so the eyebrow may stand down.
 *
 * TY-05 — "A Name Is Said Once": two readouts of one fact is the tell, and
 * rephrasing so the duplicate is not literal is the same fault in a disguise.
 * Compared case- and punctuation-insensitively, because "PRODUCTION RULESET"
 * and "U.R. Antifragile Production Ruleset" are the same string being said
 * twice however they are set.
 */
function titleSays(eyebrow?: string, title?: string): boolean {
  if (!eyebrow || !title) return false;
  const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return flat(title).includes(flat(eyebrow));
}

/** "CHAPTER III" → "III". The prologue has no numeral and is given none. */
function chapterNumeral(label?: string): string {
  const m = /chapter\s+([ivxlc]+)/i.exec(label || '');
  return m ? m[1].toUpperCase() : '';
}

// Figures and widgets are the heaviest thing in the bundle and only a handful of
// pages carry one, so they load on demand. The reader's prose must never wait on
// an SVG organism it is not currently looking at.
const MediaUniverseDiagram = lazy(() =>
  import('./diagrams/MediaUniverseDiagram').then((m) => ({ default: m.MediaUniverseDiagram }))
);
const BaitTaxonomyDiagram = lazy(() =>
  import('./diagrams/BaitTaxonomyDiagram').then((m) => ({ default: m.BaitTaxonomyDiagram }))
);
const FragilityIndexDiagram = lazy(() =>
  import('./diagrams/FragilityIndexDiagram').then((m) => ({ default: m.FragilityIndexDiagram }))
);
const CausalTaxonomyDiagram = lazy(() =>
  import('./diagrams/CausalTaxonomyDiagram').then((m) => ({ default: m.CausalTaxonomyDiagram }))
);
const CognitivePosturesDiagram = lazy(() =>
  import('./diagrams/CognitivePosturesDiagram').then((m) => ({ default: m.CognitivePosturesDiagram }))
);
const AntiEngagementDiagram = lazy(() =>
  import('./diagrams/AntiEngagementDiagram').then((m) => ({ default: m.AntiEngagementDiagram }))
);

/* `FIGURE_SEEDS` mapped an in-text instrument to the figure page it belonged
   to. Nothing seeds a figure from inside the prose any more — every figure has
   its own sheet — so the map had no reader left. */

/** The figure's own name, for seeds opened from prose rather than a figure page. */
function figureTitle(figure: BookPage['diagramType']): string {
  const page = BOOK_PAGES.find(p => p.diagramType === figure);
  return page?.title || 'Figure';
}

/** the same routing the stage uses — the names are not one-to-one by type */
const DIAGRAMS: Record<
  NonNullable<BookPage['diagramType']>,
  React.ComponentType<{ isDark?: boolean }>
> = {
  'scale-mismatch': MediaUniverseDiagram,
  'media-universe': CognitivePosturesDiagram,
  'bait-taxonomy': BaitTaxonomyDiagram,
  'fragility-index': FragilityIndexDiagram,
  'causal-taxonomy': CausalTaxonomyDiagram,
  'neuro-aesthetic': AntiEngagementDiagram
};

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
          <button
            onClick={onOpen}
            aria-label={`Open the figure: ${title}`}
            title="Open the figure on its own surface"
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
  onFigureOpened?: () => void;
  /** the return leg to the map, for the passages out of a figure world */
  onLeaveToMap: () => void;
  /** pages waiting behind this one, innermost last — see App's backTrail */
  backTrail: number[];
  /** walk one step back along that trail */
  onBack: () => void;
  /** leave for a page while remembering the way back through it */
  onJumpWithTrail: (target: number, trail: number[]) => void;
}

export const PageRenderer: React.FC<PageRendererProps> = ({
  page,
  prefs,
  onAddHighlight,
  highlights = [],
  onJumpToPage,
  pendingFigure,
  onFigureOpened,
  onLeaveToMap,
  backTrail,
  onBack,
  onJumpWithTrail
}) => {
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
  useEffect(() => {
    if (!evidenceOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setEvidenceOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [evidenceOpen]);

  /* A world asked for from outside — the index, the search, the map.
     It opens only on the sheet that actually carries that figure, so the stage
     gets the page's own title rather than a fallback, and the reader lands
     somewhere real if they close it. */
  useEffect(() => {
    if (!pendingFigure || pendingFigure !== page.diagramType) return;
    setStageFigure(pendingFigure);
    onFigureOpened?.();
  }, [pendingFigure, page.diagramType, onFigureOpened]);
  /** the five questions, on a surface of their own — see InstrumentStage */
  const [stageInstrument, setStageInstrument] = useState(false);

  const isDark = prefs.theme === 'dark';

  // Re-fits whenever the page, the reader's type size or the leading changes.
  const {
    boxRef: proseBoxRef,
    contentRef: proseRef
  } = useFitToBox([page.index, prefs.fontSize, prefs.lineHeight], { max: 1.5 });

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
      const text = selection.toString().trim();
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
  const withMarks = (text: string, pIdx: number): React.ReactNode => {
    const marks = marksByParagraph.get(pIdx);
    if (!marks || marks.length === 0) return text;
    const out: React.ReactNode[] = [];
    let at = 0;
    marks.forEach((m, i) => {
      if (m.from < at) return; // overlapping notes: the first one drawn wins
      if (m.from > at) out.push(text.slice(at, m.from));
      out.push(
        <span key={i} className="marked">
          {text.slice(m.from, m.to)}
        </span>
      );
      at = m.to;
    });
    if (at < text.length) out.push(text.slice(at));
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
        page.type === 'diagram'
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
            <p className="text-[12px] font-light opacity-60 max-w-lg mx-auto tracking-[0.2em] uppercase">
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
            {/* `chapterNumber` already ends in EVIDENCE, so appending the kind
                printed "CHAPTER II EVIDENCE — CASE STUDY EVIDENCE". See
                TY-05, "A Name Is Said Once". */}
            <SomaLabel opacity={0.6} phase={2.4}>
              {page.chapterNumber}
            </SomaLabel>
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
                  <p className="text-[12px] font-light leading-relaxed opacity-90 mt-1">
                    {page.caseStudyData.fragile}
                  </p>
                </div>

                <div className="membrane p-3 space-y-1.5 rounded-none flex flex-col">
                  <SomaLabel opacity={0.75} phase={10.7}>Antifragile (Restorative)</SomaLabel>
                  <p className="text-[12px] font-light leading-relaxed opacity-90 mt-1">
                    {page.caseStudyData.antifragile}
                  </p>
                </div>
              </div>

              <div className="membrane-lit p-3 space-y-1 rounded-none">
                <SomaLabel opacity={0.6} phase={15.2}>Strategic Verdict</SomaLabel>
                <p className="text-[12px] font-light leading-relaxed italic opacity-90">
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
            {/* likewise: every diagram page's `chapterNumber` already ends in
                SCHEMATIC, and this printed it a second time */}
            <div className="flex justify-center">
              <SomaLabel opacity={0.6} phase={4.9}>
                {page.chapterNumber}
              </SomaLabel>
            </div>
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
          {page.diagramType && (
            <div className="flex-shrink-0 flex items-center justify-center gap-5 pt-1">
              <FigureWay
                onClick={() => setStageFigure(page.diagramType || null)}
                label="See figure"
                hint={`Open the figure: ${page.title}`}
                carried
                phase={2.4}
              />
              {!figureCarriesItsOwnApplication(page.diagramType) && (
              <FigureWay
                onClick={() => {
                  const passage = FIGURE_PASSAGES[page.diagramType!];
                  if (!passage) return;
                  /* the way back out, innermost last: the chapter this figure
                     argues, then the figure page itself */
                  onJumpWithTrail(pageForPromptRule(passage.ruleId), [
                    firstPageOfChapter(passage.chapterId),
                    page.index
                  ]);
                }}
                label="See application"
                hint="Open the rule that puts this figure to work"
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
            {/* The section number lives in the title ("1.1 System 1 & 1.2 The
                Persuasion Mechanics"), so printing it again here put the same
                digits on the sheet twice. The eyebrow keeps the one fact the
                title does not carry: which chapter this is. */}
            {!continuesSection && (
              <SomaLabel opacity={0.7} phase={0.9}>
                {page.chapterNumber}
              </SomaLabel>
            )}

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
                className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-35 hover:opacity-80 transition-opacity duration-500 underline underline-offset-4 decoration-[0.5px] rounded-none outline-none"
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
                className="block text-[9px] font-light uppercase tracking-[0.2em] opacity-35 hover:opacity-80 transition-opacity duration-500 underline underline-offset-4 decoration-[0.5px] rounded-none outline-none"
                title={page.caseStudyData.title}
              >
                See the evidence
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
            className="flex-1 min-h-0 pr-1 hflow"
          >
            <div ref={proseRef} className="space-y-3">
              {page.sectionData.content.map((paragraph, pIdx) => {
                const isQuote = paragraph.startsWith('"') && paragraph.endsWith('"');

                if (isQuote) {
                  return (
                    <blockquote
                      key={pIdx}
                      data-para={pIdx}
                      className="membrane my-1.5 p-3 font-light italic text-[12px] leading-relaxed rounded-none"
                    >
                      {withMarks(paragraph, pIdx)}
                    </blockquote>
                  );
                }

                return (
                  <p
                    key={pIdx}
                    data-para={pIdx}
                    className="text-[12px] font-light leading-relaxed opacity-90"
                  >
                    {withMarks(paragraph, pIdx)}
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
        <div className="h-full max-w-3xl mx-auto py-2 rounded-none space-y-4 min-h-0 hflow px-1.5 pr-2">
          {/* Header */}
          <div className="space-y-1 flex-shrink-0">
            {/* "Operational Prompt Rules" sat opposite the eyebrow while the
                subtitle two lines below read "Operational prompts for
                AI-assisted marketing…" — the same label in two registers. The
                subtitle says it better, so the eyebrow's twin is gone.

                The eyebrow itself yields on the one page whose title already
                contains it ("PRODUCTION RULESET" over "U.R. Antifragile
                Production Ruleset"), rather than being deleted for the eight
                pages where it is the only thing saying where you are. */}
            {!titleSays(page.chapterNumber, page.title) && (
              <SomaLabel opacity={0.6} phase={2.8}>{page.chapterNumber}</SomaLabel>
            )}
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

          {/* Intro Section if present */}
          {page.promptRulesetIntro && (
            <div className="membrane p-3 space-y-2 rounded-none">
              <div className="flex items-center justify-between gap-3">
                <SomaLabel opacity={0.8} phase={5.9}>Documentation &amp; Overview</SomaLabel>
                <button
                  onClick={handleCopyFullRuleset}
                  className={`bud px-2.5 py-1 text-[9px] font-light uppercase tracking-[0.2em] flex items-center space-x-1.5 rounded-none outline-none ${
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

              <p className="text-[12px] font-light italic opacity-90">
                {page.promptRulesetIntro.context}
              </p>
              <p className="text-[12px] leading-relaxed whitespace-pre-wrap opacity-90">
                {page.promptRulesetIntro.howToUse}
              </p>
            </div>
          )}

          {/* The ruleset says the global rule is inherited by every branch; the
              composer is where that is actually true. Seeded with whatever
              branches this page carries, so the block you most likely want is
              already assembled when you arrive. */}
          <PromptComposer
            initial={[
              ...(page.promptRuleIds || []),
              ...(page.promptRuleId ? [page.promptRuleId] : [])
            ].filter(id => id.startsWith('branch-'))}
          />

          {/* The instrument, on the one page that is already about it.

              This ruleset page IS section 3.4's five-question gate — its own
              subtitle says so — which makes it the only place in the book where
              a reader is holding work to check rather than reading an argument
              about checking. That is the posture the instrument wants, and it is
              not the posture anybody is in mid-chapter. */}
          {page.promptRuleId === 'verification-checklist' && (
            <div className="flex justify-center pt-1">
              <FigureWay
                onClick={() => setStageInstrument(true)}
                label="The five questions"
                hint="Open the five-question verification gate"
                carried
                phase={6.8}
              />
            </div>
          )}

          {/* Cards */}
          <div className="flex-1 space-y-5">
            {page.promptRuleId && PROMPT_RULESET_DATA[page.promptRuleId] && (
              <PromptRuleCard data={PROMPT_RULESET_DATA[page.promptRuleId]} isDark={isDark} />
            )}

            {/* More than one rule on a sheet is a set to choose from, not a
                stack to read through — so it is drawn as folders. A single rule
                stays a card: there is nothing to choose between. */}
            {page.promptRuleIds && (
              page.promptRuleIds.length > 1
                ? <PromptFolders branchIds={page.promptRuleIds} isDark={isDark} />
                : page.promptRuleIds.map(id => (
                    PROMPT_RULESET_DATA[id] ? (
                      <PromptRuleCard key={id} data={PROMPT_RULESET_DATA[id]} isDark={isDark} />
                    ) : null
                  ))
            )}
          </div>
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
          onToPractice={() => {
            const p = FIGURE_PASSAGES[stageFigure!];
            setStageFigure(null);
            if (p) onJumpToPage(pageForPromptRule(p.ruleId));
          }}
          onToFigure={f => setStageFigure(f)}
        />
      )}

      {/* The instrument, on a surface of its own — same reasoning as the figure
          world, and the same reason it is not a sixth page in Chapter III. */}
      {stageInstrument && (
        <InstrumentStage
          onClose={() => setStageInstrument(false)}
          onToChapter={() => {
            setStageInstrument(false);
            if (page.chapterId) onJumpToPage(firstPageOfChapter(page.chapterId));
          }}
          onToMap={() => { setStageInstrument(false); onLeaveToMap(); }}
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
              setStageInstrument(false);
              setStageFigure(ref.figure as BookPage['diagramType']);
              return;
            }
            setStageInstrument(false);
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
