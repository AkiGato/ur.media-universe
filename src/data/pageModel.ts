import { BOOK_DATA, CaseStudy, Citation } from './bookData';
import { FigureId, ToolId, chapterOfFigure, ruleOfFigure, ruleOfSection, toolOfFigure } from './relations';
import { TRENDWATCH_SECTIONS } from './trendwatch';

/**
 * The name a sheet is remembered by.
 *
 * Not its index. An index is a fact about the current pagination, and the
 * pagination is derived from the manuscript — edit a paragraph anywhere early
 * and every index after it shifts, which would silently hand the reader someone
 * else's memory. A section's own number plus the paragraph it starts at is
 * stable under everything except an edit to that section itself, which is the
 * one case where forgetting is the honest answer.
 *
 * Only sheets that carry a section have one, because those are the only sheets
 * the map draws as cells.
 */
export function sheetKey(p: BookPage): string | null {
  if (!p.sectionData) return null;
  return `${p.sectionData.id}#${p.sectionData.paragraphOffset ?? 0}`;
}

export interface BookPage {
  index: number;
  type: 'cover' | 'chapter-section' | 'references' | 'diagram' | 'prompt-ruleset';
  chapterNumber?: string;
  chapterTitle?: string;
  title: string;
  subtitle?: string;
  caseStudyData?: CaseStudy;
  sectionData?: {
    id: string;
    number?: string;
    title: string;
    content: string[];
    quotes?: string[];
    citations?: Citation[];
    interactiveWidget?: 'cognitive-postures' | 'five-questions' | 'causal-taxonomy' | 'anti-engagement' | 'content-budget' | 'restoration-delta';
    promptRuleId?: string;
    /**
     * Where this sheet's chunk begins in the section's own paragraph array.
     *
     * A section longer than a sheet is cut into consecutive pages, and until
     * this existed the cut was total: paragraph 3 of page two had no name for
     * itself except "the third paragraph of page two", which is a fact about
     * the pagination rather than about the book. Every stored mark was
     * therefore an index into a layout, and the layout had to be frozen for
     * every reader on every screen so the marks would keep pointing at the
     * same words.
     *
     * With the offset, a paragraph's address is (section id, ordinal in the
     * section) — see anchors.ts — which survives being re-cut.
     */
    paragraphOffset?: number;
  };
  promptRuleId?: string;
  promptRuleIds?: string[];
  /* `header` and `subtitle` used to live here too, holding byte-for-byte copies
     of the page's own `title` and `subtitle`. Nothing ever rendered them — they
     were the fossil of a header this block once drew for itself, and the kind of
     second readout TY-05, "A Name Is Said Once", is about. */
  promptRulesetIntro?: {
    context: string;
    howToUse: string;
  };
  chapterId?: string;
  /* `pageNumberDisplay` stood here, holding "P.7" for every page. Nothing in
     the interface counts pages at a reader any more: not the index, not the
     search results, not the control that returns you to where you stopped. A
     count is an instrument reading, and where you are in this book is a place
     in an argument rather than an index into an array — printing the index
     invites a reader to measure progress against a total instead of reading.
     The number still exists where it is actually needed, in `index`, which is
     what bookmarks and the saved position are stored by. */
  consolidatedSourcesChunk?: Citation[];
  /**
   * The manuscript's own lead-in to the bibliography.
   *
   * Carried as its own field rather than as `sectionData`, because
   * `anchorForPage` reads `sectionData` before it reads `references` — giving
   * this sheet a section would change what it anchors as and break its
   * round-trip, taking every bookmark on it along.
   */
  sourcesIntro?: string;
  diagramType?: 'scale-mismatch' | 'media-universe' | 'bait-taxonomy' | 'fragility-index'
    | 'causal-taxonomy' | 'neuro-aesthetic'
    /* The trendwatch addendum's three. They are figures like any other — same
       engine, same passages, same audits — and the only thing that marks them
       out is that their content comes from `trendwatch.ts` rather than from the
       manuscript. See the header of that file for why the two are kept apart. */
    | 'attention-interval' | 'news-withdrawal' | 'two-trajectories';
}

/**
 * The default character budget for one sheet of prose. See the long note at
 * the cut itself for why the unit is characters and why the parts are
 * balanced rather than filled front-to-back.
 */
export const SHEET_BUDGET = 2000;

/**
 * Under this share of a sheet, a final part is an orphan rather than a page,
 * and it is re-divided with the part before it. A third is the point at which a
 * column reads as abandoned rather than merely ending early.
 */
const RUNT = 0.35;

/**
 * How full the sheet that lends a paragraph to an orphan must remain.
 *
 * The orphan guard below borrows backwards, and the only failure that
 * borrowing has ever produced here is two half-empty sheets in a row. Three
 * fifths is the floor that makes that arithmetically impossible: the lender
 * may not go under it, and the borrower stops at a third, so the pair can
 * never both be short.
 */
const KEEP = 0.6;

/**
 * What the first sheet of a CHAPTER may hold, against an ordinary sheet.
 *
 * Five sheets in the book open a chapter, and each carries that chapter's cell
 * grown to the head of the page — measured at 224px of a 564px column. They
 * therefore hold roughly six tenths of what every other sheet holds, and giving
 * them a full sheet's text is what put 1,423 characters into a 306px flow: 2.18
 * columns and 145% fill on the one sheet a reader opens a chapter on.
 *
 * The budget cannot see that, because it is measured from a column and the
 * figure is a property of the PAGE. So the cut accounts for it here, where the
 * page model already knows which sheet opens a chapter.
 */
const OPENER_SHARE = 0.55;

/**
 * What a paragraph BREAK costs, in characters.
 *
 * The budget counted characters and nothing else, and a sheet of nine short
 * paragraphs takes far more column than a sheet of six long ones with the same
 * character count — every break is a gap plus a part-empty last line. Measured:
 * chapter 1 opener, 645 characters over 6 paragraphs, one column; chapter 2
 * opener, 671 characters over 9 paragraphs, 2.18 columns. Twenty-six more
 * characters and three more breaks, and it ran past the sheet twice over.
 *
 * A gap is about 20px and a line of this column holds roughly 90 characters, so
 * a break costs about a line. Charging it makes the budget a measure of SPACE
 * rather than of text.
 */
const PARA_COST = 45;

/**
 * WHAT A SHEET HOLDS, AND WHAT A PARAGRAPH COSTS IT.
 *
 * The cut was made in CHARACTERS, and the record of why that was never quite
 * right is `docs/OPEN.md` 47: the constants above convert text into space and
 * every one of them is an average, so the budget had to be discounted twice
 * over to stop the average sheet overflowing the unlucky one. `PACK` took
 * 0.76 of the measured column and `PARA_COST` took another fifth on top, and
 * the product of the two is the 54% of a page a reader was actually given.
 *
 * That entry also names the honest fix — "budgeting in measured HEIGHT rather
 * than in characters, so a sheet is filled until the column is full rather than
 * until an estimate says it should be" — and this interface is it. The unit is
 * not fixed: the cut asks the metrics what a paragraph costs and what a sheet
 * holds, and both answers are in whatever unit the caller measures in.
 *
 * In the browser that unit is PIXELS and both numbers are measured — every
 * paragraph is set offscreen at the column's own width and its rendered height
 * read back (`utils/proseMetrics.ts`). There is then nothing left to discount:
 * the cost of a sheet is the sum of what is on it, exactly.
 *
 * In Node it stays CHARACTERS, because the static audits import this module in
 * a runtime with no viewport and no layout to measure. `charMetrics` below is
 * the old arithmetic, unchanged, so the default cut the audits walk is the same
 * book it always was.
 *
 * THE THREE LIMITS ARE THREE DIFFERENT SHEETS, and collapsing them into one
 * number was the other half of the dead space. A sheet that opens a chapter
 * gives half its column to the cell; a sheet that starts a section gives a
 * heading and a vein to it; a sheet that continues a section gives nothing at
 * all and has the whole column. Measured at 1440x900: 326px, 566px and 652px of
 * a 680px column — the widest spread of any three things the old budget was
 * pretending were equal.
 */
export interface SheetMetrics {
  /** what one paragraph costs a sheet, gap included */
  costOf: (paragraph: string) => number;
  /** what a sheet that STARTS a section holds — it carries the heading */
  section: number;
  /** what a sheet that CONTINUES one holds — it carries no heading */
  continuation: number;
  /** what the sheet that OPENS a chapter holds — it carries the cell */
  opener: number;
}

/**
 * The cut as it was, in characters — the default, and what Node gets.
 *
 * Every number here is the one that was already in force, so a build with no
 * viewport produces the identical book: the audits' page count, the anchors and
 * the search index all follow `BOOK_PAGES` and would otherwise move under
 * them for no reason anybody asked for.
 */
const charMetrics = (budget: number): SheetMetrics => ({
  costOf: (p) => p.length + PARA_COST,
  section: budget,
  continuation: budget,
  opener: budget * OPENER_SHARE
});

/**
 * The rule the sections on one sheet refer to.
 *
 * A sheet often pairs two manuscript sections, and the link belongs to the
 * section rather than to the pairing — so the sheet asks the graph about each
 * section it carries and takes the first answer. These were eight literal
 * branch ids typed into the page builder, which meant re-pairing two sections
 * silently dropped whichever link was not typed on the surviving line.
 */
const ruleFor = (...sectionIds: string[]): string | undefined => {
  for (const id of sectionIds) {
    const rule = ruleOfSection(id);
    if (rule) return rule;
  }
  return undefined;
};

/**
 * The addendum's two sheets for one chapter: the report, then its figure.
 *
 * Pushed at the END of the chapter it answers, which is where it was asked to
 * go and also the only place it belongs — the addendum reports what has been
 * recorded since the chapter was written, and interleaving that with the
 * argument would make the chapter look like it was making a case it never made.
 *
 * The report sheet is an ordinary `chapter-section`, so it inherits the whole
 * apparatus without a special case anywhere: it is cut to the sheet budget like
 * any prose, it anchors by (section id, paragraph) so bookmarks and highlights
 * survive a re-cut, and it is indexed by search. What it does NOT get is a
 * `promptRuleId` — the ruleset governs the manuscript's practice, and an
 * addendum reporting measurements has no rule to hand anyone.
 */
function pushTrendwatch(
  rawPages: Omit<BookPage, 'index'>[],
  chapterId: string
): void {
  const tw = TRENDWATCH_SECTIONS.find((s) => s.chapterId === chapterId);
  if (!tw) return;
  const figure = TRENDWATCH_FIGURES.find((f) => f.section === tw.id);

  rawPages.push({
    type: 'chapter-section',
    chapterNumber: tw.number,
    chapterTitle: tw.title,
    title: `${tw.number} ${tw.title}`,
    subtitle: tw.subtitle,
    chapterId,
    sectionData: {
      id: tw.id,
      number: tw.number,
      title: tw.title,
      content: tw.content,
      citations: tw.citations
    }
  });

  if (!figure) return;
  rawPages.push({
    type: 'diagram',
    chapterNumber: `${tw.number} SCHEMATIC`,
    chapterTitle: figure.short,
    title: figure.title,
    subtitle: figure.subtitle,
    diagramType: figure.type
  });
}

/**
 * The three addendum figures, named once.
 *
 * `short` is the walking name on the stage rail and `title` is what a lookup
 * surface shows — the same contract `FIGURES` has, and these are spliced into
 * it below so nothing downstream has to know there are two kinds of figure.
 */
const TRENDWATCH_FIGURES: Array<{
  section: string;
  type: NonNullable<BookPage['diagramType']>;
  short: string;
  title: string;
  subtitle: string;
}> = [
  {
    section: 'tw-1', type: 'attention-interval', short: 'The interval',
    title: 'The Interval — Time on One Screen Before Switching',
    subtitle: 'Three readings of one instrument, 2004 to 2021'
  },
  {
    section: 'tw-3', type: 'news-withdrawal', short: 'Withdrawal',
    title: 'Withdrawal — Avoidance, Interest and Trust on One Scale',
    subtitle: 'Three series, one vertical scale, so the distances are comparable'
  },
  {
    section: 'tw-5', type: 'two-trajectories', short: 'Trajectories',
    title: 'Two Trajectories — One Shock, Two Postures',
    subtitle: 'Structure, model and assumptions, on three faces of one figure'
  }
];

export function generateBookPages(
  budget: number = SHEET_BUDGET,
  metrics: SheetMetrics = charMetrics(budget)
): BookPage[] {
  const rawPages: Omit<BookPage, 'index'>[] = [];

  // COVER
  rawPages.push({
    type: 'cover',
    title: BOOK_DATA.title,
    subtitle: BOOK_DATA.subtitle,
    chapterNumber: "MANIFESTO",
    chapterTitle: BOOK_DATA.dossierTitle,
  });

  // PROLOGUE — Media as Universe
  const prologueCh = BOOK_DATA.chapters.find(c => c.id === 'prologue');
  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "PROLOGUE",
    chapterTitle: "Media as Universe",
    title: "The Scale Mismatch & Distortion of Rules",
    subtitle: "On evolutionary mismatch and the space where something went wrong",
    chapterId: "prologue",
    sectionData: {
      id: "prologue-combined",
      title: "The Scale Mismatch & Distortion of Rules",
      content: [
        ...(prologueCh?.sections[0]?.content || []),
        ...(prologueCh?.sections[1]?.content || [])
      ],
      citations: prologueCh?.sections[0]?.citations
    }
  });

  // PROLOGUE SCHEMATIC — the scale mismatch the prologue describes
  rawPages.push({
    type: 'diagram',
    chapterNumber: "PROLOGUE SCHEMATIC",
    chapterTitle: "The Scale Mismatch",
    title: "Village-Scale Neurology vs the Expanding Cosmos",
    diagramType: 'scale-mismatch'
  });

  // CHAPTER I
  const ch1 = BOOK_DATA.chapters.find(c => c.id === 'chapter-1');
  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER I",
    chapterTitle: ch1?.title || "Media Pollution & Neurological Exploitation",
    title: "1.1 System 1 & 1.2 The Persuasion Mechanics",
    subtitle: ch1?.subtitle,
    chapterId: "chapter-1",
    sectionData: {
      id: "1.1-1.2",
      number: "1.1 & 1.2",
      title: "System 1 and the Harvest & The Persuasion Mechanics",
      content: [
        ...(ch1?.sections[0]?.content || []),
        ...(ch1?.sections[1]?.content || [])
      ],
      promptRuleId: ruleFor('1.1', '1.2'),
      citations: [...(ch1?.sections[0]?.citations || []), ...(ch1?.sections[1]?.citations || [])]
    }
  });

  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER I",
    chapterTitle: ch1?.title || "Media Pollution & Neurological Exploitation",
    title: "1.3 The Outrage Architecture & High-Arousal Filter",
    subtitle: "Engagement Extraction Engines operating on nervous system activation",
    chapterId: "chapter-1",
    sectionData: {
      id: "1.3",
      number: "1.3",
      title: "The Outrage Architecture & High-Arousal Filter",
      /* This sheet used to carry four paragraphs typed into the page builder
         rather than read from the manuscript — authored copy living in the
         layout engine, which is the exact inversion of LY-01. §1.3 is the
         longest section in the book (16 paragraphs, 812 words) and none of it
         reached a reader; what they read instead was a summary of it that only
         existed here, and that nothing in bookData could correct. */
      content: ch1?.sections[2]?.content || [],
      promptRuleId: ruleFor('1.3'),
      citations: ch1?.sections[2]?.citations
    }
  });

  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER I",
    chapterTitle: ch1?.title || "Media Pollution & Neurological Exploitation",
    title: "1.4 Physiological Cost & 1.5 Neuro-Capitalism Defined",
    subtitle: "The systematic exploitation of human neurological vulnerabilities",
    chapterId: "chapter-1",
    sectionData: {
      id: "1.4-1.5",
      number: "1.4 & 1.5",
      title: "The Physiological Cost & Neuro-Capitalism Defined",
      content: [
        ...(ch1?.sections[3]?.content || []),
        ...(ch1?.sections[4]?.content || [])
      ]
    }
  });

  // CHAPTER I DIAGRAM — Positioned in Chapter I per chapter logic
  rawPages.push({
    type: 'diagram',
    chapterNumber: "CHAPTER I SCHEMATIC",
    chapterTitle: "The -Bait Taxonomy",
    title: "The -Bait Taxonomy — Engineered Emotion on Two Axes",
    /* The subtitle used to open "Arousal against valence", which the plane
       itself now prints at rest on all four poles — a caption restating what
       the drawing already says. What is left is the part no cell carries. */
    subtitle: "How a fishing word became a map of algorithmic manipulation",
    diagramType: 'bait-taxonomy'
  });

  // CHAPTER I ADDENDUM — what the instruments have recorded since
  pushTrendwatch(rawPages, 'chapter-1');

  // CHAPTER II
  const ch2 = BOOK_DATA.chapters.find(c => c.id === 'chapter-2');
  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER II",
    chapterTitle: ch2?.title || "The Fragile Market",
    title: "2.1 The Trust Collapse & 2.2 The Regulatory Horizon",
    subtitle: ch2?.subtitle,
    chapterId: "chapter-2",
    sectionData: {
      id: "2.1-2.2",
      number: "2.1 & 2.2",
      title: "The Trust Collapse & The Regulatory Horizon",
      content: [
        ...(ch2?.sections[0]?.content || []),
        ...(ch2?.sections[1]?.content || [])
      ],
      promptRuleId: ruleFor('2.1', '2.2'),
      citations: [...(ch2?.sections[0]?.citations || []), ...(ch2?.sections[1]?.citations || [])]
    }
  });

  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER II",
    chapterTitle: ch2?.title || "The Fragile Market",
    title: "2.3 The Fragility Index & Structural Fractures",
    subtitle: "Four structural vulnerabilities of the extractive attention model",
    chapterId: "chapter-2",
    sectionData: {
      id: "2.3",
      number: "2.3",
      title: "The Fragility Index & Four Structural Fractures",
      content: ch2?.sections[2]?.content || [],
      promptRuleId: ruleFor('2.3'),
      citations: ch2?.sections[2]?.citations
    },
    /* CHAPTER II EVIDENCE — carried by the section it evidences.

       It was a sheet of its own, and two before that. But a case study is not
       the next thing to read after 2.3; it is the evidence *for* 2.3, and a
       reader who has just been told the model has four structural fractures
       wants to look at the one that broke without leaving the page that named
       it. The sheet is gone and the evidence opens over the section instead.

       Hung here rather than dropped from the model, because the graph still
       carries a chapter -> case edge and the `case` anchor still has to land
       on a sheet. `anchorForPage` reads `sectionData` before `caseStudyData`,
       so this page still anchors as section 2.3 and every mark on it survives
       — see the round-trip check in audit-relations. */
    caseStudyData: BOOK_DATA.caseStudies.find(cs => cs.chapterNumber === "CHAPTER II")
  });


  // CHAPTER II SCHEMATIC — the fragility index 2.3 names, drawn as one
  // tenancy rather than as the four-item list the section numbers. See the
  // component header, and FW-09.
  rawPages.push({
    type: 'diagram',
    chapterNumber: "CHAPTER II SCHEMATIC",
    chapterTitle: "The Fragility Index",
    title: "The Fragility Index — Four Fractures in One Tenancy",
    diagramType: 'fragility-index'
  });

  // CHAPTER III
  const ch3 = BOOK_DATA.chapters.find(c => c.id === 'chapter-3');
  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER III",
    chapterTitle: ch3?.title || "The Robust Practitioner",
    title: "3.1 The Person, Not the Profile & 3.2 Attention Fatigue",
    subtitle: ch3?.subtitle,
    chapterId: "chapter-3",
    sectionData: {
      id: "3.1-3.2",
      number: "3.1 & 3.2",
      title: "The Person, Not the Profile & Directed Attention Fatigue",
      content: [
        ...(ch3?.sections[0]?.content || []),
        ...(ch3?.sections[1]?.content || [])
      ],
      citations: [...(ch3?.sections[0]?.citations || []), ...(ch3?.sections[1]?.citations || [])]
    }
  });

  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER III",
    chapterTitle: ch3?.title || "The Robust Practitioner",
    title: "3.3 Three Cognitive Postures & 3.4 Operational Protocol",
    subtitle: "Restoration-Seeking, Agency-Seeking, and Meaning-Seeking states",
    chapterId: "chapter-3",
    sectionData: {
      id: "3.3-3.4",
      number: "3.3 & 3.4",
      title: "Three Cognitive Postures & The Five Questions",
      content: [
        ...(ch3?.sections[2]?.content || []),
        ...(ch3?.sections[3]?.content || [])
      ],
      /* 3.4's instrument, not 3.3's figure. This page merges both sections,
         and it declared the postures seed — which routes to the figure on the
         very next page, so the seed was a second door to the room next door,
         while section 3.4's own instrument rendered nowhere at all. */
      interactiveWidget: 'five-questions',
      promptRuleId: ruleFor('3.3', '3.4'),
      citations: ch3?.sections[2]?.citations
    }
  });

  // CHAPTER III DIAGRAM — Positioned in Chapter III per chapter logic
  rawPages.push({
    type: 'diagram',
    chapterNumber: "CHAPTER III SCHEMATIC",
    chapterTitle: "Attentional Vectors & Postures",
    title: "Three Cognitive Postures as States of One Flower",
    diagramType: 'media-universe'
  });

  // CHAPTER III ADDENDUM — the state of the person the chapter describes
  pushTrendwatch(rawPages, 'chapter-3');

  // CHAPTER IV
  const ch4 = BOOK_DATA.chapters.find(c => c.id === 'chapter-4');
  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER IV",
    chapterTitle: ch4?.title || "The Causal Taxonomy",
    title: "4.1 The Headline Problem & 4.2 Economic Roots",
    subtitle: ch4?.subtitle,
    chapterId: "chapter-4",
    sectionData: {
      id: "4.1-4.2",
      number: "4.1 & 4.2",
      title: "The Headline Problem & Root-Node Analysis",
      content: [
        ...(ch4?.sections[0]?.content || []),
        ...(ch4?.sections[1]?.content || [])
      ],
      citations: ch4?.sections[0]?.citations
    }
  });

  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER IV",
    chapterTitle: ch4?.title || "The Causal Taxonomy",
    title: "4.3 Historical & Neuro-Psychological Roots",
    subtitle: "Deconstructing information to restore the capacity to evaluate",
    chapterId: "chapter-4",
    sectionData: {
      id: "4.3",
      number: "4.3",
      title: "Historical Sequences & Neuro-Psychological Mechanisms",
      content: [
        ...(ch4?.sections[2]?.content || [])
      ],
      interactiveWidget: 'causal-taxonomy',
      promptRuleId: ruleFor('4.4-4.5'),
      citations: ch4?.sections[2]?.citations
    }
  });

  // CHAPTER IV DIAGRAM — Positioned in Chapter IV per chapter logic
  rawPages.push({
    type: 'diagram',
    chapterNumber: "CHAPTER IV SCHEMATIC",
    chapterTitle: "Causal Taxonomy Engine",
    title: "Causal Taxonomy — the Root System Beneath the Headline",
    diagramType: 'causal-taxonomy'
  });

  // CHAPTER V
  const ch5 = BOOK_DATA.chapters.find(c => c.id === 'chapter-5');
  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER V",
    chapterTitle: ch5?.title || "The Antifragile Aesthetic",
    title: "5.1 Neuro-Aesthetic Standards & 5.2 Soft Fascination",
    subtitle: ch5?.subtitle,
    chapterId: "chapter-5",
    sectionData: {
      id: "5.1-5.2",
      number: "5.1 & 5.2",
      title: "Neuro-Aesthetic Standards & Soft Fascination as Design Standard",
      content: [
        ...(ch5?.sections[0]?.content || []),
        ...(ch5?.sections[1]?.content || [])
      ],
      promptRuleId: ruleFor('5.1', '5.2'),
      citations: [...(ch5?.sections[0]?.citations || []), ...(ch5?.sections[1]?.citations || [])]
    }
  });

  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER V",
    chapterTitle: ch5?.title || "The Antifragile Aesthetic",
    title: "5.3 Creative Economy & 5.4 B2B2C Architecture",
    subtitle: "A socio-economic system deriving value from human imagination and agency",
    chapterId: "chapter-5",
    sectionData: {
      id: "5.3-5.4",
      number: "5.3 & 5.4",
      title: "The Creative Economy & B2B2C Ethical Architecture",
      content: [
        ...(ch5?.sections[2]?.content || []),
        ...(ch5?.sections[3]?.content || [])
      ],
      promptRuleId: ruleFor('5.3', '5.4'),
      citations: ch5?.sections[3]?.citations
    }
  });

  /* §5.5 — the section that had a figure and a rule but no prose.

     The Metric Lotus argues it and BRANCH 6 applies it, so the graph has always
     known this section exists; there was simply no sheet carrying its ten
     paragraphs, and a reader could reach everything about the Anti-Engagement
     Metric except the passage that defines it. It sits before its own schematic,
     the way every other section precedes the figure that argues it. */
  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER V",
    chapterTitle: ch5?.title || "The Antifragile Aesthetic",
    title: "5.5 The Anti-Engagement Metric",
    subtitle: "Measuring what the work leaves behind rather than what it extracts",
    chapterId: "chapter-5",
    sectionData: {
      id: "5.5",
      number: "5.5",
      title: "The Anti-Engagement Metric",
      content: ch5?.sections[4]?.content || [],
      promptRuleId: ruleFor('5.5'),
      citations: ch5?.sections[4]?.citations
    }
  });

  /* §5.6 — the one metric written out as an instrument. It follows the
     section that names the five, so the reader meets the definition before
     the questionnaire that operationalises it. */
  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER V",
    chapterTitle: ch5?.title || "The Antifragile Aesthetic",
    title: "5.6 The Restoration Delta Instrument",
    subtitle: "Three questions, one scale, a worked example",
    chapterId: "chapter-5",
    sectionData: {
      id: "5.6",
      number: "5.6",
      title: "The Restoration Delta Instrument",
      content: ch5?.sections[5]?.content || [],
      /* READ, NOT RESTATED. This sheet carries exactly one section, so the
         instrument it opens is a fact about that section and belongs to it.
         §5.7 below restated its own flag as a literal for a while and §5.6
         simply had none — the section declared one in bookData and nothing
         read it, so the Restoration Delta was specified in the manuscript,
         declared in the data, and unreachable in the app.

         The merged sheets above (3.3 & 3.4, 4.3) still name theirs outright,
         and correctly: where one sheet carries two sections there is a real
         editorial choice about which section's instrument the sheet offers,
         and a choice has to be written down. Here there is no choice to make. */
      interactiveWidget: ch5?.sections[5]?.interactiveWidget,
      promptRuleId: ruleFor('5.6'),
      citations: ch5?.sections[5]?.citations
    }
  });

  /* §5.7 — content minimisation, with the budget instrument on its sheet.
     After §5.6 for the same reason §5.6 follows §5.5: the argument first,
     then the instrument that operationalises it. */
  rawPages.push({
    type: 'chapter-section',
    chapterNumber: "CHAPTER V",
    chapterTitle: ch5?.title || "The Antifragile Aesthetic",
    title: "5.7 Content Minimisation",
    subtitle: "How much of a person's week it is fair to claim",
    chapterId: "chapter-5",
    sectionData: {
      id: "5.7",
      number: "5.7",
      title: "Content Minimisation",
      content: ch5?.sections[6]?.content || [],
      interactiveWidget: ch5?.sections[6]?.interactiveWidget,
      promptRuleId: ruleFor('5.7'),
      citations: ch5?.sections[6]?.citations
    }
  });

  // CHAPTER V DIAGRAM — Positioned in Chapter V per chapter logic
  rawPages.push({
    type: 'diagram',
    chapterNumber: "CHAPTER V SCHEMATIC",
    chapterTitle: "The Anti-Engagement Metric",
    title: "The Metric Lotus — What Gets Measured Gets Built",
    diagramType: 'neuro-aesthetic'
  });

  // CHAPTER V ADDENDUM — the comparison the dossier ends on
  pushTrendwatch(rawPages, 'chapter-5');

  // PRODUCTION RULESET
  rawPages.push({
    type: 'prompt-ruleset',
    chapterNumber: "PRODUCTION RULESET",
    chapterTitle: "U.R. Antifragile Production Ruleset",
    title: "U.R. Antifragile Production Ruleset",
    subtitle: "Operational prompts for AI-assisted marketing, media, and product development",
    promptRulesetIntro: {
      context: "Derived from the U.R. Strategic Dossier — Chapters I–V",
      howToUse: "Each rule set below is written as an inheritable prompt block. The Global Rule sits above every branch and is never overridden — a copywriting prompt or an image-generation prompt inherits it silently. Branches add domain-specific constraints on top. In practice: paste the Global Rule into any AI tool's system prompt, then paste the relevant branch on top of it.\n\nEvery rule traces to a specific mechanism named in the dossier, not to a general ethical intuition. Where the dossier names a mechanism as extractive, the corresponding rule prohibits it. Where the dossier names a restorative standard, the corresponding rule requires it."
    },
    promptRuleId: 'global-rule'
  });

  /* THE EIGHT BRANCHES, ON ONE SHEET.

     They were eight sheets carrying one or two branches each, every prompt
     block open at once — so reaching the branch you wanted meant paging through
     six you did not, and each sheet was mostly empty around the block it held.
     The page titles had also drifted off their own contents ("Branch 1 & Branch
     2 Prompts" carried only branch 1, "Branch 3 & Branch 4" only branch 3),
     which is what happens to a hand-written page list once the data under it
     moves.

     One sheet now, and the branches are folders on it — closed, a branch is a
     line naming the job it is for; open, it is the whole block it always was.
     Eight lines is a contents page you can take in at a glance, and the sheet
     stops being a corridor. The folders became the bento grid; see
     PromptLibrary. */
  rawPages.push({
    type: 'prompt-ruleset',
    chapterNumber: "PRODUCTION RULESET",
    chapterTitle: "U.R. Antifragile Production Ruleset",
    title: "The Eight Branches",
    subtitle: "Domain rules that inherit the Global Rule — open the one you are working in",
    /* THE GLOBAL RULE IS ON THIS SHEET TOO, AS THE ONE CELL THAT GOVERNS.

       The library is laid out as a bento: eight domain cells around one that
       spans two rows and carries the light. Without the global rule the sheet
       had only the eight, the hero cell never rendered, and the arrangement
       flattened into a uniform four-column grid — the hierarchy the layout
       exists to state, silently absent.

       It is not a duplicate reading. The sheet before this one is where the
       global rule is READ, in full, with the composer; here it is the cell the
       other eight hang off, and this sheet's own subtitle already names the
       relationship — "domain rules that inherit the Global Rule". A reader
       looking at the library can see what they inherit from without leaving it.

       `pageForPromptRule` still resolves the global rule to its own sheet,
       because that lookup takes the first sheet carrying it and that one comes
       first.

       IT GOES LAST IN THIS ARRAY, AND THE ORDER IS LOAD-BEARING FOR ONE REASON
       ONLY: `anchorForPage` addresses a ruleset sheet by its FIRST rule id, so
       with the global rule first this sheet anchored to `rule:global-rule`,
       which resolves to the sheet before it — a bookmark here would have opened
       the wrong page. The relations audit caught it on the first run. The grid
       does not read this order at all (the layout comes from `CELLS`), so last
       is free. */
    promptRuleIds: [
      'branch-1', 'branch-2', 'branch-3', 'branch-4',
      'branch-5', 'branch-6', 'branch-7', 'branch-8',
      'global-rule'
    ]
  });

  rawPages.push({
    type: 'prompt-ruleset',
    chapterNumber: "PRODUCTION RULESET",
    chapterTitle: "U.R. Antifragile Production Ruleset",
    title: "Cross-Branch Verification Checklist",
    subtitle: "Chapter 3.4 Five-Question Final Verification Gate & Governed Sources",
    promptRuleId: 'verification-checklist'
  });

  /* BIBLIOGRAPHY — one sheet, however long the list gets.

     It was three hardcoded slices of eight, then derived balanced parts. Both
     were answers to a question the sheet does not actually have to ask: the
     references column is `.hflow`, so a list longer than the sheet flows into
     the next column and the reader travels sideways through it. Splitting the
     same list across book pages as well put two paginations on one list, and a
     work cited on the far side of a page break was a work with two places to
     look. LY-02 is satisfied by the column flow, not by the part count.

     Sorted, because a bibliography nobody can look a name up in is a list, not
     a library. The order is derived here rather than kept in bookData: it is a
     property of how the sheet is read, not of what the manuscript says. */
  const sources = [...BOOK_DATA.consolidatedSources]
    .sort((a, b) => a.authorOrSource.localeCompare(b.authorOrSource, 'en'));

  rawPages.push({
    type: 'references',
    chapterNumber: "BIBLIOGRAPHY",
    chapterTitle: "Consolidated Sources & Citations",
    title: 'Consolidated Sources',
    subtitle: "Academic, Empirical & Strategic Dossier References",
    /* The one paragraph of manuscript that reached no sheet once the prose was
       untruncated. It is the sentence the dossier itself opens its source list
       with, so it belongs above the list rather than nowhere. */
    sourcesIntro: BOOK_DATA.chapters.flatMap(c => c.sections).find(x => x.id === 'sources-list')?.content[0],
    consolidatedSourcesChunk: sources
  });

  /* Length is answered with pages, and a page is measured in TEXT, not in
     paragraphs.

     This split every five paragraphs. A paragraph here runs from nine words to
     ninety, so five of them is anywhere between a third of a sheet and two
     sheets, and the count told you nothing about either — which is why sheets
     came out half empty while the one after them was crammed. Measured at 900px
     and 17px: 1,365 characters filling 282px of a 493px column, 57% of the
     sheet, with the bottom sitting empty under the last line.

     So the budget is characters, and the parts are BALANCED rather than filled
     front-to-back. Chunking greedily leaves whatever is left over alone on the
     final sheet — the runt page, three lines under a heading — so the number of
     parts is decided first and the text is then divided as evenly as paragraph
     boundaries allow. Every part of a section comes out about the same length,
     which is also what makes a section read as one thing crossing several
     sheets rather than as several sheets of unequal offcuts.

     Over-filling is safe and under-filling is not, which is why the budget aims
     high. useFitToBox steps the type down when a column runs long — that is
     what it is for — and a sheet slightly too full simply sets a little tighter,
     while a sheet half empty has no mechanism at all to fix itself.

     One number, one place — but no longer a frozen one.

     It used to be deliberately not tuned per viewport, because page indices
     were what bookmarks, highlights and the saved position stored, so the book
     had to paginate identically for every reader on every screen or the marks
     would slide. Marks are anchors now (see anchors.ts): they name a section
     and a paragraph, and they are resolved to a sheet at read time. Re-cutting
     the book no longer moves anything a reader saved, so the budget is a
     parameter rather than a constant.

     The default is still one number for everybody, and changing that is a
     design call rather than a refactor: the spread groups two sheets at a
     time, the reading strand measures the book in sheets, and both would read
     differently on a phone than on a desktop. What has changed is only that
     the decision is now available. */

  /* Which raw pages open a chapter — the ones that will carry the opener
     figure and therefore have less room for prose. Computed from the order the
     pages were pushed in, which is the same order the reader meets them. */
  const opensChapter = new Set<number>();
  {
    /* Mirror the renderer exactly. It draws the opener on a sheet that is the
       FIRST page carrying its chapter id — of any type — and is itself a
       chapter-section. Marking the first SECTION instead let a chapter whose
       first page is a figure slip through: chapter 2 kept a full budget on a
       sheet that had 306px of column, and ran 2.18 columns because of it. */
    const firstOfChapter = new Map<string, number>();
    rawPages.forEach((it, i) => {
      if (it.chapterId && !firstOfChapter.has(it.chapterId)) firstOfChapter.set(it.chapterId, i);
    });
    firstOfChapter.forEach((i) => {
      if (rawPages[i].type === 'chapter-section') opensChapter.add(i);
    });
  }

  const paged = rawPages.flatMap((item, rawIdx) => {
    const sd = item.sectionData;
    if (!sd || sd.content.length === 0) return [item];
    // an uncut section still has an address: it begins at its own beginning
    const whole = { ...item, sectionData: { ...sd, paragraphOffset: 0 } };

    /* One budget, because no page gives its height to anything but prose any
       more. A widget page used to hold a live instrument and was allowed a
       fraction of the text; then it held only a seed; now it holds neither —
       every figure has its own sheet and the five questions live on the ruleset
       page that names them. A smaller budget here was shrinking pages to leave
       room for something that is no longer on them. */
    /* What each paragraph costs this sheet, asked of the metrics rather than
       counted here: in the browser that is the paragraph's measured height at
       the column's own width, in Node its character count plus the break that
       follows it. */
    const lengths = sd.content.map(metrics.costOf);
    const total = lengths.reduce((a, b) => a + b, 0);
    const firstLimit = opensChapter.has(rawIdx) ? metrics.opener : metrics.section;
    if (total <= firstLimit) return [whole];

    /*
     * SHEETS ARE FILLED, NOT SHARED OUT — AND THE DIFFERENCE IS MOST OF A PAGE.
     *
     * This divided a section into `ceil(total / budget)` parts and then split
     * the text EVENLY between them. Even shares are the wrong target: a section
     * carrying one character more than a sheet holds became two sheets at half
     * capacity each, and the reader met two continuous paragraphs of one
     * argument broken across two pages with most of both pages empty. A section
     * at 2.1x budget became three sheets at seventy per cent, and so on — the
     * fuller the section, the more sheets it took to say the same thing.
     *
     * Measured at 1440x900 before this change: median fill **57%**, with the
     * worst sheets at **12%** and **14%** — 376 and 444 characters alone in a
     * column that holds about 2,100. Half of the book was dead space, and the
     * cause was arithmetic rather than the budget.
     *
     * So each sheet now takes paragraphs until the next one would not fit, and
     * then closes. A sheet is full or it is the last one. That also makes the
     * measured budget mean what it says: capacity, rather than a number that
     * gets divided by an integer before anything is laid out.
     *
     * A paragraph is never broken across sheets, so a single paragraph longer
     * than the budget simply takes a sheet of its own and overruns it — the
     * horizontal flow carries the remainder, which is what it is for.
     */
    /* THREE SHEETS, THREE LIMITS. The first chunk of a section is the sheet
       that carries the heading — or the chapter cell, if the section also opens
       a chapter — and every chunk after it opens straight into the text, so it
       has the heading's height back. That last part is worth 86px of a 680px
       column at 1440x900, which is four and a half lines the continuation
       sheets were being charged for furniture they do not carry. */
    const limitFor = (chunkIndex: number) =>
      chunkIndex > 0 ? metrics.continuation : firstLimit;

    const chunks: string[][] = [];
    let current: string[] = [];
    let run = 0;
    sd.content.forEach((para, i) => {
      if (current.length > 0 && run + lengths[i] > limitFor(chunks.length)) {
        chunks.push(current);
        current = [];
        run = 0;
      }
      current.push(para);
      run += lengths[i];
    });
    if (current.length) chunks.push(current);

    /*
     * NO RUNT GUARD, AND THAT IS THE SECOND HALF OF THE SAME LESSON.
     *
     * The first version of this rebalanced the last two sheets whenever the
     * final one came out under a third, to avoid three lines alone under a
     * heading. It manufactured the exact defect greedy filling had just removed:
     * a section a little over one sheet became two sheets at half capacity,
     * which is two pages of dead space instead of one full page and one short
     * one. Measured with the guard in: median fill 56%, thirteen sheets under
     * 40%, several of them two-paragraph halves of a section that would have
     * fitted on a sheet and a bit.
     *
     * A section ending part-way down its last sheet is what a book looks like.
     * Two half-empty sheets in a row is not, and the reader noticed. So the
     * remainder stays on the last sheet and every sheet before it stays full.
     */
    /*
     * THE ORPHAN GUARD MOVES ONE PARAGRAPH, NEVER HALF THE SECTION.
     *
     * Two versions of this were wrong in opposite directions. Rebalancing the
     * last two sheets evenly turned a section a little over one sheet into two
     * half-empty ones — the defect the reader reported, manufactured by the fix
     * for the other one. Removing it entirely left a genuine orphan: measured,
     * a sheet carrying 56 characters, one line at the top of an empty column,
     * 3% of its box.
     *
     * So the tail borrows from the sheet before it, which lifts the orphan
     * without emptying its neighbour — and the borrowing STOPS AT A FLOOR
     * rather than at a count, which is what keeps it from becoming the
     * rebalance again. One paragraph was the first bound and it is the wrong
     * one when paragraphs are short: measured against the height cut at
     * 1440x900, six sheets still came out under 40% and two under a fifth,
     * because a single short paragraph moved a tail from 5% to 17% and the
     * guard had already spent its one move.
     *
     * Now it keeps moving paragraphs back while the tail is a runt AND the
     * sheet lending them stays past `KEEP` of its column. Neither sheet can
     * end up half empty, because the lender is not allowed below three fifths
     * and the borrower stops as soon as it is over a third: the two-half-empty-
     * sheets failure needs both of them under a half, and this cannot produce
     * it. Every sheet before the last two is untouched, as it was.
     */
    if (chunks.length >= 2) {
      const tail = chunks[chunks.length - 1];
      const prev = chunks[chunks.length - 2];
      const cost = (c: string[]) => c.reduce((a, x) => a + metrics.costOf(x), 0);
      const floor = metrics.continuation * KEEP;
      const runt = metrics.continuation * RUNT;
      while (
        prev.length >= 2 &&
        cost(tail) < runt &&
        cost(prev) - metrics.costOf(prev[prev.length - 1]) >= floor
      ) {
        tail.unshift(prev.pop() as string);
      }
    }
    if (chunks.length === 1) return [whole];

    let offset = 0;
    return chunks.map((content, i) => {
      const last = i === chunks.length - 1;
      const paragraphOffset = offset;
      offset += content.length;
      return {
        ...item,
        sectionData: {
          ...sd,
          content,
          paragraphOffset,
          citations: last ? sd.citations : undefined,
          interactiveWidget: last ? sd.interactiveWidget : undefined
        }
      };
    });
  });

  return paged.map((item, idx) => ({
    ...item,
    index: idx
  })) as BookPage[];
}

/**
 * THE BOOK, AS CUT FOR THE FRAME IT IS BEING READ IN.
 *
 * This is still one array and still the only place a page count comes from
 * (LY-01) — what has changed is that its contents can be re-cut when the frame
 * says a sheet holds more or less than the default assumed.
 *
 * IT IS RE-CUT IN PLACE, and that is deliberate rather than lazy. Eight modules
 * import this binding directly, two of them building caches from it at module
 * load; handing out a new array would leave every one of them pointing at the
 * old cut. Mutating the array every holder already has keeps one book in the
 * application, and the version counter below is how the ones with caches know
 * to rebuild.
 *
 * Node gets the default cut and nothing else. The static audits import this in
 * a runtime with no viewport, so generateBookPages() with its own default
 * budget is the canonical pagination for them — audit-relations walks this
 * array and reports its own length as the sheet count, which simply follows
 * whatever the default gives.
 */
export const BOOK_PAGES: BookPage[] = generateBookPages();

let paginationVersion = 0;
let appliedMetrics: SheetMetrics = charMetrics(SHEET_BUDGET);
const paginationListeners = new Set<() => void>();

/** The cut currently in force, so a re-cut can decline to repeat itself. */
export const currentSheetMetrics = (): SheetMetrics => appliedMetrics;

/** Bumped on every real re-cut; what `useSyncExternalStore` watches. */
export const getPaginationVersion = () => paginationVersion;

/**
 * Rebuild caches derived from the cut. Anything holding page indices across a
 * re-cut subscribes here — `anchors.ts` and `searchIndex.ts` both do, and both
 * would otherwise resolve a mark to whatever sheet used to carry it.
 *
 * They subscribe rather than being called, because this module may not import
 * them: both import IT, and the cycle would be real.
 */
export function subscribePagination(fn: () => void): () => void {
  paginationListeners.add(fn);
  return () => { paginationListeners.delete(fn); };
}

/**
 * Re-cut the book for a measured sheet capacity.
 *
 * Returns whether anything moved. A re-cut that produces the same sheets is
 * not published: the listeners rebuild indexes and the app re-renders, and
 * doing that on every resize tick for an identical book is the kind of work
 * PF-03 exists to refuse.
 */
export function repaginate(metrics: SheetMetrics): boolean {
  /* The floor is a sheet that can still hold something. A measurement taken
     while the frame is collapsing — a window dragged to nothing, a pane being
     torn out — reports a column of a few pixels, and cutting the book against
     that asks for one sheet per paragraph. */
  if (!(metrics.section > 40) || !(metrics.continuation > 40)) return false;
  const next = generateBookPages(SHEET_BUDGET, metrics);
  const same =
    next.length === BOOK_PAGES.length &&
    next.every((p, i) =>
      p.title === BOOK_PAGES[i].title &&
      (p.sectionData?.paragraphOffset ?? -1) === (BOOK_PAGES[i].sectionData?.paragraphOffset ?? -1));
  appliedMetrics = metrics;
  if (same) return false;
  BOOK_PAGES.length = 0;
  for (const p of next) BOOK_PAGES.push(p);
  paginationVersion++;
  paginationListeners.forEach((fn) => fn());
  return true;
}

/**
 * The ruleset sheet that carries the library rather than a single rule.
 *
 * One rule on a sheet is a card and reads in a column like prose. More than one
 * is the LIBRARY — a bento of ten cells a reader navigates by shape — and a
 * library folded into half a spread at `max-w-3xl` is the same failure FW-07
 * records for a schematic squeezed into half a sheet: the grid is the argument,
 * and a grid with no room does not make it.
 */
export const isRuleLibrary = (p?: BookPage): boolean =>
  !!p && p.type === 'prompt-ruleset' && (p.promptRuleIds?.length ?? 0) > 1;

/**
 * Sheets that take the whole spread, and drop the reading margin to do it.
 *
 * FW-07's rule generalised, and held in ONE place because three surfaces need
 * the same answer: `BookSpread` decides whether to pair the sheet, and
 * `PageRenderer` decides both the sheet's padding and its column measure. Those
 * were three independent `type === 'diagram'` tests, which is three places to
 * forget — and forgetting any one of them produces a half-width drawing rather
 * than an error.
 */
/**
 * The sheet that IS the gate rather than a sheet about it.
 *
 * Every other ruleset sheet carries a rule to read. This one carries the five
 * questions of §3.4 and the two ways to run them, and a reader is on it holding
 * work to check rather than an argument to follow. It is drawn like an
 * instrument for that reason, and both of the things that follow from being an
 * instrument are decided here: it takes the whole spread, and `PageRenderer`
 * gives it a plain column instead of the horizontal flow.
 *
 * Paired into half a spread it measured 4.46 columns — a checklist you swipe
 * sideways four times to finish reading is not a checklist you would run.
 */
export const isVerificationGate = (p?: BookPage): boolean =>
  !!p && p.type === 'prompt-ruleset' && p.promptRuleId === 'verification-checklist';

/**
 * The sheet the Production Ruleset opens on: what the ruleset is, how the
 * blocks are used, and the Global Rule every branch inherits.
 *
 * It is the last of the three appendix sheets to stop being a column of prose.
 * Paired into half a spread it measured 2.09 columns — the documentation and
 * the rule it documents could not be on screen together, and the reader had to
 * swipe sideways past the end of the how-to to reach the block it describes.
 * Nothing on it can be cut and nothing on it can be split, so it is given the
 * width instead: the whole spread, the two halves side by side.
 */
export const isRulesetOverview = (p?: BookPage): boolean =>
  !!p && p.type === 'prompt-ruleset' && !!p.promptRulesetIntro;

export const takesWholeSheet = (p?: BookPage): boolean =>
  !!p && (
    p.type === 'diagram' ||
    isRuleLibrary(p) ||
    isVerificationGate(p) ||
    isRulesetOverview(p)
  );

/** First page index for a chapter id, or 0 if the chapter has no section page. */
export function firstPageOfChapter(chapterId: string): number {
  const idx = BOOK_PAGES.findIndex(p => p.chapterId === chapterId);
  return idx >= 0 ? idx : 0;
}

/** First page of the Production Ruleset section. */
export function firstRulesetPage(): number {
  const idx = BOOK_PAGES.findIndex(p => p.type === 'prompt-ruleset');
  return idx >= 0 ? idx : 0;
}

/** The ruleset page carrying a given prompt branch. */
export function pageForPromptRule(ruleId: string): number {
  const idx = BOOK_PAGES.findIndex(
    p => p.promptRuleId === ruleId || (p.promptRuleIds || []).includes(ruleId)
  );
  return idx >= 0 ? idx : firstRulesetPage();
}

/**
 * The three passages out of a figure world.
 *
 * A figure is a separate world you explore, not a picture inside a page, so it
 * needs its own exits rather than one close button: back to the chapter that
 * argues it, back to the map that holds every chapter, and forward into the
 * rule that puts it to work. The rules are not chosen loosely — each one cites
 * its figure in its own text (branch-2 names "the Causal Taxonomy (Ch. IV)",
 * branch-1 names "the three cognitive postures (Ch. 3.3)"), so the passage
 * forward lands on the page that already claims the figure.
 */
/**
 * The figure worlds, in reading order.
 *
 * This lived inside `FigureStage` as a private array, which is exactly why the
 * figures were unreachable: the only surface that knew the set was the one you
 * had to already be inside. Here it is shared, so the index, the search and the
 * map can all offer a world without duplicating the list.
 *
 * `short` is the walking name used on the stage rail; `title` is what a lookup
 * surface shows. Neither is invented copy — both name the drawing.
 */
export const FIGURES: Array<{
  type: NonNullable<BookPage['diagramType']>;
  short: string;
  title: string;
  /**
   * The world already ends in its own application.
   *
   * Most figures argue something and then hand the reader to the branch of
   * the ruleset that puts it to work, which is a different surface reached by
   * a passage. The causal taxonomy does not: it ends in a live instrument that
   * runs the taxonomy on text the reader pastes in, so "see application" and
   * "run it on your own source" are one offer written twice (TY-05) — and the
   * weaker of the two, because the instrument applies the figure to the
   * reader's own material while the passage only points at prose about it.
   *
   * Where this is set, the passage to the ruleset is dropped on every surface
   * that already shows the figure's own control. The graph edge stays: the
   * figure still applies that rule, and the index and the relations audit both
   * still say so. What goes is the second door to it, not the connection.
   */
  carriesItsOwnApplication?: boolean;
}> = [
  { type: 'scale-mismatch',  short: 'Media space',   title: 'Village-Scale Neurology vs the Expanding Cosmos' },
  { type: 'bait-taxonomy',   short: 'Bait taxonomy', title: 'The -Bait Taxonomy — Engineered Emotion on Two Axes' },
  { type: 'fragility-index', short: 'Fragility',     title: 'The Fragility Index — Four Fractures in One Tenancy' },
  { type: 'media-universe',  short: 'Postures',      title: 'Three Cognitive Postures as States of One Flower' },
  { type: 'causal-taxonomy', short: 'Taxonomy',      title: 'Causal Taxonomy — the Root System Beneath the Headline',
    carriesItsOwnApplication: true },
  { type: 'neuro-aesthetic', short: 'Aesthetic',     title: 'The Metric Lotus — What Gets Measured Gets Built' },
  /* The addendum's three, spliced in so every surface that offers a world —
     the index, the search, the map, the stage rail — offers these without
     knowing they came from a different file. */
  ...TRENDWATCH_FIGURES.map(f => ({ type: f.type, short: f.short, title: f.title }))
];

/** Whether this figure ends in its own instrument — see `carriesItsOwnApplication`. */
export const figureCarriesItsOwnApplication = (type: BookPage['diagramType']): boolean =>
  Boolean(FIGURES.find(f => f.type === type)?.carriesItsOwnApplication);

/**
 * Where the chapter containing `pageIndex` starts and ends, as fractions of the
 * whole book.
 *
 * Feeds the reading strand's second scale. Returned as extent rather than as a
 * completion figure on purpose: the strand says how much of *this chapter* is
 * left, which is a fact about the text, where a percentage would be a score
 * about the reader.
 */
export function chapterBounds(pageIndex: number): { from: number; to: number } | null {
  const page = BOOK_PAGES[pageIndex];
  const id = page?.chapterId;
  if (!id) return null;
  let first = -1;
  let last = -1;
  BOOK_PAGES.forEach((p, i) => {
    if (p.chapterId !== id) return;
    if (first === -1) first = i;
    last = i;
  });
  if (first === -1) return null;
  const n = BOOK_PAGES.length;
  return { from: first / n, to: (last + 1) / n };
}

export const FIGURE_PASSAGES: Record<
  NonNullable<BookPage['diagramType']>,
  { chapterId: string; ruleId: string; toolId: ToolId | null }
> = Object.fromEntries(
  FIGURES.map(f => [
    f.type,
    {
      chapterId: chapterOfFigure(f.type as FigureId) || '',
      ruleId: ruleOfFigure(f.type as FigureId) || '',
      /* What the Application passage opens. A tool, never a branch — see the
         FIGURE_EDGES comment in relations.ts for why each pairing is the one
         the document makes. */
      toolId: toolOfFigure(f.type as FigureId)
    }
  ])
) as Record<
  NonNullable<BookPage['diagramType']>,
  { chapterId: string; ruleId: string; toolId: ToolId | null }
>;

/** The sheet that carries a given figure world. */
export function firstPageOfDiagram(type: NonNullable<BookPage['diagramType']>): number {
  const idx = BOOK_PAGES.findIndex(p => p.diagramType === type);
  return idx >= 0 ? idx : 0;
}

/**
 * The sheet that carries a given instrument.
 *
 * Same shape as `firstPageOfDiagram`, and for the same reason: an instrument
 * asked for from the index or from a figure opens on the sheet whose section
 * specifies it, so closing it leaves the reader somewhere real rather than on
 * whatever page happened to be open when they asked.
 *
 * `causal-taxonomy` is deliberately absent from the instrument stage — it runs
 * inside its own figure — but it still has a home sheet here, which is what the
 * index needs in order to send anyone to it.
 */

/** First page of the bibliography. */
export function firstReferencesPage(): number {
  const idx = BOOK_PAGES.findIndex(p => p.type === 'references');
  return idx >= 0 ? idx : 0;
}
