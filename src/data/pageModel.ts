import { BOOK_DATA, CaseStudy, Citation } from './bookData';
import { FigureId, chapterOfFigure, ruleOfFigure, ruleOfSection } from './relations';

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
    interactiveWidget?: 'cognitive-postures' | 'five-questions' | 'causal-taxonomy' | 'anti-engagement';
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
    | 'causal-taxonomy' | 'neuro-aesthetic';
}

/**
 * The default character budget for one sheet of prose. See the long note at
 * the cut itself for why the unit is characters and why the parts are
 * balanced rather than filled front-to-back.
 */
export const SHEET_BUDGET = 2000;

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

export function generateBookPages(budget: number = SHEET_BUDGET): BookPage[] {
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

  // CHAPTER V DIAGRAM — Positioned in Chapter V per chapter logic
  rawPages.push({
    type: 'diagram',
    chapterNumber: "CHAPTER V SCHEMATIC",
    chapterTitle: "The Anti-Engagement Metric",
    title: "The Metric Lotus — What Gets Measured Gets Built",
    diagramType: 'neuro-aesthetic'
  });

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
     stops being a corridor. See PromptFolders. */
  rawPages.push({
    type: 'prompt-ruleset',
    chapterNumber: "PRODUCTION RULESET",
    chapterTitle: "U.R. Antifragile Production Ruleset",
    title: "The Eight Branches",
    subtitle: "Domain rules that inherit the Global Rule — open the one you are working in",
    promptRuleIds: [
      'branch-1', 'branch-2', 'branch-3', 'branch-4',
      'branch-5', 'branch-6', 'branch-7', 'branch-8'
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

  const paged = rawPages.flatMap(item => {
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
    const lengths = sd.content.map(c => c.length);
    const total = lengths.reduce((a, b) => a + b, 0);
    const parts = Math.min(sd.content.length, Math.max(1, Math.ceil(total / budget)));
    if (parts === 1) return [whole];

    /* Greedy against a running target rather than a fixed size: each part takes
       paragraphs until it passes its share of the whole, so a single very long
       paragraph cannot push every later part off its stride. */
    const target = total / parts;
    const chunks: string[][] = [];
    let current: string[] = [];
    let run = 0;
    sd.content.forEach((para, i) => {
      current.push(para);
      run += lengths[i];
      const remainingParts = parts - chunks.length - 1;
      const remainingParas = sd.content.length - i - 1;
      // close this part when it has had its share — unless every paragraph
      // still to come is needed to give the remaining parts one each
      if (remainingParts > 0 && run >= target * (chunks.length + 1) - target * 0.15
        && remainingParas > remainingParts - 1) {
        chunks.push(current);
        current = [];
      }
    });
    if (current.length) chunks.push(current);

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

export const BOOK_PAGES = generateBookPages();

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
  { type: 'neuro-aesthetic', short: 'Aesthetic',     title: 'The Metric Lotus — What Gets Measured Gets Built' }
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
  { chapterId: string; ruleId: string }
> = Object.fromEntries(
  FIGURES.map(f => [
    f.type,
    {
      chapterId: chapterOfFigure(f.type as FigureId) || '',
      ruleId: ruleOfFigure(f.type as FigureId) || ''
    }
  ])
) as Record<NonNullable<BookPage['diagramType']>, { chapterId: string; ruleId: string }>;

/** The sheet that carries a given figure world. */
export function firstPageOfDiagram(type: NonNullable<BookPage['diagramType']>): number {
  const idx = BOOK_PAGES.findIndex(p => p.diagramType === type);
  return idx >= 0 ? idx : 0;
}

/** First page of the bibliography. */
export function firstReferencesPage(): number {
  const idx = BOOK_PAGES.findIndex(p => p.type === 'references');
  return idx >= 0 ? idx : 0;
}
