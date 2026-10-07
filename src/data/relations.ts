import { BOOK_DATA, Citation, Source } from './bookData';

/**
 * The graph the app has always been, written down once.
 *
 * Every surface here draws relationships — the map draws them as tissue, a
 * schematic page offers the rule that applies it, a chapter offers its sources,
 * a figure world offers three ways out — and until now each of those edges was
 * held somewhere else and in a different shape:
 *
 *   FIGURE_PASSAGES          a hand-written map, figure -> { chapter, rule }
 *   sectionData.promptRuleId a field assigned by hand while building pages
 *   linkedCaseStudyId        declared on Chapter, set once, read by nothing
 *   diagramType              a page field, the only route from chapter to figure
 *   citations[]              printed strings, matched against the bibliography
 *                            by nothing at all
 *
 * Five shapes meant five places to forget, and the gaps were invisible: a
 * figure could lose the rule it applies, a rule could lose the section that
 * refers to it, a source could be cited by a name the bibliography does not
 * use, and nothing anywhere would notice. So the edges live here, in one list,
 * and scripts/audits/static/audit-relations.mjs walks it on every `npm run lint`.
 *
 * This module knows nothing about pages. Pages are a rendering of the book and
 * change with the type size; the graph is the book's structure and does not.
 * pageModel resolves a node to a sheet — never the other way round.
 */

export type NodeKind = 'chapter' | 'section' | 'figure' | 'rule' | 'case' | 'source';

export interface Ref {
  kind: NodeKind;
  id: string;
}

/**
 * Why two nodes are joined. The verb matters at the far end: a chapter that
 * *argues* a figure and a rule that *applies* one are different offers to the
 * reader, and the surface that renders them has to be able to tell.
 */
export type EdgeKind = 'contains' | 'argues' | 'applies' | 'evidences' | 'cites';

export interface Edge {
  from: Ref;
  to: Ref;
  kind: EdgeKind;
}

export const ref = (kind: NodeKind, id: string): Ref => ({ kind, id });
const key = (r: Ref) => `${r.kind}:${r.id}`;

/* ---------------------------------------------------------------------------
   AUTHORED EDGES — the five scattered links, gathered

   These are the only edges anybody has to write by hand. Everything below them
   is read out of bookData and promptData, which is why those are longer lists
   and this one is short: an edge that can be derived is not authored.
--------------------------------------------------------------------------- */

export type FigureId =
  | 'scale-mismatch'
  | 'fragility-index'
  | 'media-universe'
  | 'bait-taxonomy'
  | 'causal-taxonomy'
  | 'neuro-aesthetic'
  /* The trendwatch addendum's three. They are figures on the same terms as the
     other six — each argued by a chapter, each applying a rule, each opening an
     instrument — and the relations audit holds them to all three. */
  | 'attention-interval'
  | 'news-withdrawal'
  | 'two-trajectories';

/**
 * The four instruments the dossier specifies.
 *
 * Not a UI enum that happens to have four members — these are the four places
 * the manuscript hands the practitioner something to *run* rather than
 * something to read: the Chapter III five-question gate, the Causal Taxonomy
 * applied to a source, §5.6's Restoration Delta, and §5.7's content budget.
 * `causal-taxonomy` is the one that lives inside its own figure rather than on
 * the instrument stage, which is why it is named here and handled there.
 */
export type ToolId =
  | 'five-questions'
  | 'causal-taxonomy'
  | 'restoration-delta'
  | 'content-budget';

/**
 * A figure, the chapter that argues it, the rule that governs it, and THE TOOL
 * THAT PUTS IT TO WORK.
 *
 * The rules are not chosen loosely — each one cites its figure in its own text
 * (branch-2 names "the Causal Taxonomy (Ch. IV)", branch-1 names "the three
 * cognitive postures (Ch. 3.3)") — which is the reasoning FIGURE_PASSAGES
 * carried before this file existed, and it is unchanged.
 *
 * THE TOOL EDGE IS NEW, AND IT IS WHAT "APPLICATION" NOW MEANS.
 *
 * Every figure's Application passage used to land on the branch that governs
 * it, which is a page of prose describing a rule — so a reader who pressed
 * "put this to work" was handed more reading, and every one of the eight
 * branches resolves to the same sheet, so five of the six figures sent every
 * reader to the identical page. The passage promised an instrument and
 * delivered a paragraph.
 *
 * Each figure now names the instrument that actually applies it, and each
 * pairing is the document's own:
 *
 *   scale-mismatch  → content-budget     §2.3's "Attention is Finite" is the
 *                                        budget's own founding assumption; the
 *                                        field figure IS the finite bandwidth.
 *   bait-taxonomy   → causal-taxonomy    the bait figure classifies a headline;
 *                                        the taxonomy takes one apart. §4 is
 *                                        the method §1 diagnoses the need for.
 *   fragility-index → content-budget     fracture 2 of the four is Attention is
 *                                        Finite, and the budget is the only
 *                                        instrument that acts on it.
 *   media-universe  → five-questions     the postures figure asks what state a
 *                                        person is in; question ONE of the gate
 *                                        is that question, in those words.
 *   causal-taxonomy → causal-taxonomy    it carries its own — the figure runs
 *                                        on text the reader pastes in.
 *   neuro-aesthetic → restoration-delta  §5.5 lists the Restoration Delta as
 *                                        the third anti-engagement metric and
 *                                        §5.6 is its instrument. The Metric
 *                                        Lotus draws the metric this runs.
 *
 * The rule edge is kept, because it is true and other things read it — it is
 * simply no longer what the Application passage points at.
 */
const FIGURE_EDGES: Array<{ figure: FigureId; chapter: string; rule: string; tool: ToolId }> = [
  { figure: 'scale-mismatch',  chapter: 'prologue',  rule: 'global-rule', tool: 'content-budget' },
  { figure: 'bait-taxonomy',   chapter: 'chapter-1', rule: 'branch-3',    tool: 'causal-taxonomy' },
  { figure: 'fragility-index', chapter: 'chapter-2', rule: 'branch-4',    tool: 'content-budget' },
  { figure: 'media-universe',  chapter: 'chapter-3', rule: 'branch-1',    tool: 'five-questions' },
  { figure: 'causal-taxonomy', chapter: 'chapter-4', rule: 'branch-2',    tool: 'causal-taxonomy' },
  { figure: 'neuro-aesthetic', chapter: 'chapter-5', rule: 'branch-6',    tool: 'restoration-delta' },

  /* THE ADDENDUM'S THREE. Check 7 of the relations audit refuses two figures
     against one rule — a reader stepping out of two worlds into the same sheet
     has been told the drawings apply to the same practice — so each of these
     had to find a branch no figure already owned, and each pairing is the
     document's own rather than the nearest free slot:

       attention-interval → branch-7   the branch about interfaces rules out
                                       "infinite scroll without a natural
                                       stopping cue"; the figure measures what
                                       happens where the stopping cue is absent.
       news-withdrawal    → branch-5   the one branch that names the four
                                       Attention Restoration properties, which
                                       is the literature §3.2's fatigue and this
                                       figure's readings both sit in.
       two-trajectories   → branch-8   growth "anchored to opt-in, real-world-
                                       connected action" is the owned-audience
                                       posture the model's second arm is. */
  { figure: 'attention-interval', chapter: 'chapter-1', rule: 'branch-7', tool: 'content-budget' },
  { figure: 'news-withdrawal',    chapter: 'chapter-3', rule: 'branch-5', tool: 'restoration-delta' },
  { figure: 'two-trajectories',   chapter: 'chapter-5', rule: 'branch-8', tool: 'content-budget' }
];

/**
 * The rule a section refers to.
 *
 * Keyed by the *manuscript* section id, not by the merged page id that
 * pageModel invents when it pairs two sections onto one sheet: a page is a
 * rendering and these are facts about the text. pageModel looks them up when
 * it builds a sheet, so moving a section between sheets can no longer drop
 * the link.
 */
const SECTION_RULE_EDGES: Array<{ section: string; rule: string }> = [
  { section: '1.1', rule: 'branch-3' },
  { section: '1.3', rule: 'branch-6' },
  { section: '2.1', rule: 'branch-7' },
  { section: '2.3', rule: 'branch-4' },
  { section: '3.3', rule: 'branch-1' },
  { section: '4.4-4.5', rule: 'branch-2' },
  { section: '5.1', rule: 'branch-5' },
  { section: '5.4', rule: 'branch-8' },
  { section: '5.7', rule: 'branch-2' }
];

/**
 * Inline citations whose printed name differs from the bibliography's.
 *
 * The alias is a link between two spellings of one work, never a correction to
 * either — the manuscript's text is the manuscript's (TY-04). Anything not
 * listed here resolves by its printed name, and anything that resolves to
 * nothing fails the audit, which is how this list stays short.
 */
const SOURCE_ALIASES: Record<string, string> = {
  'edelman trust barometer 2024': 'edelman-2024'
};

/* ---------------------------------------------------------------------------
   DERIVED EDGES
--------------------------------------------------------------------------- */

const flatten = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const SOURCE_BY_NAME = new Map<string, Source>(
  BOOK_DATA.consolidatedSources.map((s) => [flatten(s.authorOrSource), s])
);

/** The bibliography entry a printed citation names, if it names one. */
export function sourceIdFor(c: Citation): string | null {
  if (c.note) return null;
  if (c.sourceId) return c.sourceId;
  const flat = flatten(c.authorOrSource);
  const alias = SOURCE_ALIASES[flat];
  if (alias) return alias;
  return SOURCE_BY_NAME.get(flat)?.id ?? null;
}

export const SOURCES: Source[] = BOOK_DATA.consolidatedSources;

function buildEdges(): Edge[] {
  const out: Edge[] = [];
  const add = (from: Ref, to: Ref, kind: EdgeKind) => out.push({ from, to, kind });

  // chapter -> section, and section -> source, straight out of the manuscript
  BOOK_DATA.chapters.forEach((ch) => {
    /* The bibliography is a chapter in the manuscript, and its one section
       "cites" every work in the book — which is not a citation, it is the list
       itself. Left in, every source came back as cited by `sources-list`, so
       every back-reference carried one entry that meant nothing. */
    const isBibliography = ch.id === 'references';

    ch.sections.forEach((sec) => {
      add(ref('chapter', ch.id), ref('section', sec.id), 'contains');
      if (isBibliography) return;
      (sec.citations || []).forEach((c) => {
        const id = sourceIdFor(c);
        if (id) add(ref('section', sec.id), ref('source', id), 'cites');
      });
    });

    /* chapter -> case study. `linkedCaseStudyId` has been declared on Chapter
       since the beginning and read by nothing; this is the first thing that
       reads it, which is why the case study had no way back to its chapter. */
    if (ch.linkedCaseStudyId) {
      add(ref('chapter', ch.id), ref('case', ch.linkedCaseStudyId), 'evidences');
    }
  });

  // case study -> source
  BOOK_DATA.caseStudies.forEach((cs) => {
    cs.citations.forEach((c) => {
      const id = sourceIdFor(c);
      if (id) add(ref('case', cs.title), ref('source', id), 'cites');
    });
  });

  FIGURE_EDGES.forEach((e) => {
    add(ref('chapter', e.chapter), ref('figure', e.figure), 'argues');
    add(ref('figure', e.figure), ref('rule', e.rule), 'applies');
  });

  SECTION_RULE_EDGES.forEach((e) => {
    add(ref('section', e.section), ref('rule', e.rule), 'applies');
  });

  return out;
}

export const RELATIONS: Edge[] = buildEdges();

/* ---------------------------------------------------------------------------
   QUERIES

   Every surface asks its question here rather than reaching into a table of
   its own. All of them are linear walks over a list of about a hundred edges,
   built once at module evaluation — there is nothing here worth indexing.
--------------------------------------------------------------------------- */

/** Everything joined to a node, in either direction. */
export function neighbours(r: Ref, kind?: EdgeKind): Ref[] {
  const k = key(r);
  const out: Ref[] = [];
  RELATIONS.forEach((e) => {
    if (kind && e.kind !== kind) return;
    if (key(e.from) === k) out.push(e.to);
    else if (key(e.to) === k) out.push(e.from);
  });
  return out;
}

const firstOf = (r: Ref, kind: NodeKind, edge?: EdgeKind): string | null =>
  neighbours(r, edge).find((n) => n.kind === kind)?.id ?? null;

/** The chapter that argues a figure. */
export const chapterOfFigure = (figure: FigureId): string | null =>
  firstOf(ref('figure', figure), 'chapter', 'argues');

/** The rule that puts a figure to work. */
export const ruleOfFigure = (figure: FigureId): string | null =>
  firstOf(ref('figure', figure), 'rule', 'applies');

/**
 * The instrument a RULE puts to work.
 *
 * Separate from the figure's tool, and deliberately not derived from it: a rule
 * and the figure beside it can want different instruments. Content planning is
 * the case that proves it — its figure is the Causal Taxonomy, because that is
 * what §4 hands an editorial calendar for judging a story, but the rule's own
 * question is *how much*, and the instrument for that is the content budget.
 *
 * Only the pairings the document actually supports are here. A rule with no
 * instrument gets none rather than the nearest one: five of the ten have no
 * apparatus in the dossier, and inventing a link would make the column look
 * complete while sending readers somewhere the text never points.
 */
const RULE_TOOLS: Record<string, ToolId> = {
  // "Replaces psychographic profiling with the three cognitive postures" — and
  // question ONE of the gate is that replacement, in those words.
  'branch-1': 'five-questions',
  // §5.7's budget is the only instrument that answers "how much".
  'branch-2': 'content-budget',
  // the branch is about headlines; the taxonomy takes one apart.
  'branch-3': 'causal-taxonomy',
  // "Operationalizes anti-engagement metrics" — §5.6 is that metric's instrument.
  'branch-6': 'restoration-delta',
  'branch-7': 'restoration-delta',
  // it *is* the five questions, run as a final gate.
  'verification-checklist': 'five-questions'
};

/** The figure a rule governs — the inverse of `ruleOfFigure`. The Tools folder
    needs it to pair a rule with its drawing without keeping a second table. */
export const figureOfRule = (ruleId: string): FigureId | null =>
  (FIGURE_EDGES.find((e) => e.rule === ruleId)?.figure ?? null);

/** The instrument a rule puts to work, or null where the dossier names none. */
export const toolOfRule = (ruleId: string): ToolId | null => RULE_TOOLS[ruleId] ?? null;

/** The instrument that puts a figure to work — what "Application" opens. */
export const toolOfFigure = (figure: FigureId): ToolId | null =>
  (FIGURE_EDGES.find((e) => e.figure === figure)?.tool ?? null);

/** The rule a manuscript section refers to. */
export const ruleOfSection = (sectionId: string): string | null =>
  firstOf(ref('section', sectionId), 'rule', 'applies');

/** The chapter a case study evidences. */
export const chapterOfCase = (caseTitle: string): string | null =>
  firstOf(ref('case', caseTitle), 'chapter', 'evidences');

/**
 * The bibliography entries a printed list of citations names.
 *
 * Keyed off the citations themselves rather than off a section id, because a
 * sheet often pairs two manuscript sections and then names the pair — so the
 * id a sheet carries ("3.3-3.4") is not an id the graph knows. The citations
 * on the sheet are the same objects the graph resolved, so this needs no
 * translation between the two vocabularies.
 */
export function sourcesOfCitations(citations: Citation[] | undefined): Source[] {
  const ids = new Set(
    (citations || []).map((c) => sourceIdFor(c)).filter((id): id is string => !!id)
  );
  return SOURCES.filter((s) => ids.has(s.id));
}

/**
 * The sections that cite a source, in reading order.
 *
 * The back-reference a bibliography has always implied and never carried: an
 * entry could be the spine of three chapters or cited once in passing, and the
 * page looked identical either way.
 */
export function citedBy(sourceId: string): string[] {
  const order = BOOK_DATA.chapters.flatMap((c) => c.sections.map((s) => s.id));
  const ids = new Set(
    neighbours(ref('source', sourceId), 'cites')
      .filter((n) => n.kind === 'section')
      .map((n) => n.id)
  );
  return order.filter((id) => ids.has(id));
}

/**
 * The authored edges, exposed for the audit only.
 *
 * The audit checks the hand-written half against the derived half — that every
 * chapter, section, rule and figure named above actually exists — which is only
 * possible if it can see what was authored rather than the merged result.
 */
export const AUTHORED = { FIGURE_EDGES, SECTION_RULE_EDGES, SOURCE_ALIASES };
