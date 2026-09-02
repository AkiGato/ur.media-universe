// Static audit for the relations table (src/data/relations.ts) and the anchor
// layer (src/data/anchors.ts).
//
// The graph replaced five hand-kept links — FIGURE_PASSAGES, the section/rule
// ids typed into the page builder, `linkedCaseStudyId`, `diagramType`, and the
// printed citation strings — and the reason those drifted is that nothing ever
// checked them. A figure could lose the rule it applies, a section could point
// at a branch that had been renamed, a citation could name a work the
// bibliography spells differently, and the interface would simply offer one
// fewer way through with no error anywhere.
//
// This walks every edge and fails the build on a dangling one. It also
// round-trips every page through an anchor, which is the guarantee the reader's
// bookmarks and notes now rest on.
//
// Run: npm run audit:relations (part of npm run lint).
import { build } from 'esbuild';

const ENTRY = `
export { BOOK_DATA } from './src/data/bookData';
export { PROMPT_RULESET_DATA } from './src/data/promptData';
export * as relations from './src/data/relations';
export { BOOK_PAGES, FIGURES } from './src/data/pageModel';
export * as anchors from './src/data/anchors';
`;

const bundle = await build({
  stdin: { contents: ENTRY, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent'
});

const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

const { BOOK_DATA, PROMPT_RULESET_DATA, relations, BOOK_PAGES, FIGURES, anchors } = mod;
const { AUTHORED, sourceIdFor, SOURCES, chapterOfFigure, ruleOfFigure } = relations;

const problems = [];
const fail = (where, what) => problems.push({ where, what });

const chapterIds = new Set(BOOK_DATA.chapters.map((c) => c.id));
const sectionIds = new Set(BOOK_DATA.chapters.flatMap((c) => c.sections.map((s) => s.id)));
const ruleIds = new Set(Object.keys(PROMPT_RULESET_DATA));
const figureIds = new Set(FIGURES.map((f) => f.type));
const sourceIds = new Set(SOURCES.map((s) => s.id));

/* 1 — every authored edge names something that exists */
AUTHORED.FIGURE_EDGES.forEach((e) => {
  if (!figureIds.has(e.figure)) fail('FIGURE_EDGES', `no such figure: ${e.figure}`);
  if (!chapterIds.has(e.chapter)) fail('FIGURE_EDGES', `${e.figure} -> no such chapter: ${e.chapter}`);
  if (!ruleIds.has(e.rule)) fail('FIGURE_EDGES', `${e.figure} -> no such rule: ${e.rule}`);
});

AUTHORED.SECTION_RULE_EDGES.forEach((e) => {
  if (!sectionIds.has(e.section)) fail('SECTION_RULE_EDGES', `no such section: ${e.section}`);
  if (!ruleIds.has(e.rule)) fail('SECTION_RULE_EDGES', `${e.section} -> no such rule: ${e.rule}`);
});

/* 2 — every figure keeps both of its passages, and has a sheet to sit on */
FIGURES.forEach((f) => {
  if (!chapterOfFigure(f.type)) fail('figures', `${f.type} argues no chapter`);
  if (!ruleOfFigure(f.type)) fail('figures', `${f.type} applies to no rule`);
  if (!BOOK_PAGES.some((p) => p.diagramType === f.type)) {
    fail('figures', `${f.type} has no sheet in the book`);
  }
});

/* 3 — every rule the ruleset declares is reachable, and every rule a sheet
       declares exists. A branch nobody can page to is a branch nobody has. */
const onSheets = new Set(
  BOOK_PAGES.flatMap((p) => [...(p.promptRuleIds || []), ...(p.promptRuleId ? [p.promptRuleId] : [])])
);
onSheets.forEach((id) => {
  if (!ruleIds.has(id)) fail('sheets', `a sheet carries an unknown rule: ${id}`);
});
ruleIds.forEach((id) => {
  if (!onSheets.has(id)) fail('ruleset', `no sheet carries rule: ${id}`);
});

/* 4 — a ruleset sheet's title may not name branches it does not carry.
       "Branch 1 & Branch 2 Prompts" carried only branch 1, and "Branch 3 &
       Branch 4" only branch 3, for as long as the titles were hand-written. */
BOOK_PAGES.filter((p) => p.type === 'prompt-ruleset').forEach((p) => {
  const named = [...(p.title.match(/branch\s+(\d+)/gi) || [])].map((m) =>
    `branch-${m.replace(/\D+/g, '')}`
  );
  const carried = new Set([...(p.promptRuleIds || []), ...(p.promptRuleId ? [p.promptRuleId] : [])]);
  named.forEach((id) => {
    if (!carried.has(id)) fail('sheets', `"${p.title}" names ${id} but does not carry it`);
  });
});

/* 5 — every inline citation resolves to a bibliography entry, or says it is a
       derivation note rather than a source */
BOOK_DATA.chapters.forEach((ch) => {
  ch.sections.forEach((sec) => {
    (sec.citations || []).forEach((c) => {
      if (c.note) return;
      const id = sourceIdFor(c);
      if (!id) fail('citations', `${ch.id}/${sec.id}: unresolved source "${c.authorOrSource}"`);
      else if (!sourceIds.has(id)) fail('citations', `${ch.id}/${sec.id}: no such source id "${id}"`);
    });
  });
});

/* 6 — no alias that points nowhere, and none that nothing uses. A dead alias is
       a claim about the manuscript that has stopped being true. */
const printed = new Set(
  BOOK_DATA.chapters
    .flatMap((c) => c.sections.flatMap((s) => s.citations || []))
    .concat(BOOK_DATA.caseStudies.flatMap((cs) => cs.citations))
    .map((c) => c.authorOrSource.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
);
Object.entries(AUTHORED.SOURCE_ALIASES).forEach(([from, to]) => {
  if (!sourceIds.has(to)) fail('aliases', `"${from}" points at no such source: ${to}`);
  if (!printed.has(from)) fail('aliases', `"${from}" is used by no citation`);
});

/* 7 — every source id is unique */
const seenIds = new Set();
SOURCES.forEach((s) => {
  if (!s.id) fail('bibliography', `entry has no id: ${s.authorOrSource}`);
  else if (seenIds.has(s.id)) fail('bibliography', `duplicate source id: ${s.id}`);
  seenIds.add(s.id);
});

/* 7b — no two figures open the same application.

       Each figure is the argument for one branch of the ruleset, and the way
       onward from a figure world is that branch. Two figures pointing at one
       rule is not a dangling edge, so check 7 passed straight over it — but a
       reader stepping out of two different worlds into the same sheet has been
       told the drawings apply to the same practice, which is a claim the book
       does not make. Caught once, when a sixth figure was added against a rule
       another figure already owned. */
const ruleUsers = new Map();
FIGURES.forEach((f) => {
  const rule = relations.ruleOfFigure(f.type);
  ruleUsers.set(rule, [...(ruleUsers.get(rule) || []), f.type]);
});
ruleUsers.forEach((figs, rule) => {
  if (figs.length > 1) {
    fail('figures', `${figs.length} figures open the same application (${rule}): ${figs.join(', ')}`);
  }
});

/* 8 — every sheet round-trips through its own anchor.
       This is what the reader's bookmarks, notes and saved position now rest
       on: if a page cannot be named in terms that survive re-pagination, a mark
       on it cannot survive either. */
BOOK_PAGES.forEach((p) => {
  const a = anchors.anchorForPage(p.index);
  const back = anchors.pageForAnchor(a);
  if (back !== p.index) {
    fail('anchors', `sheet ${p.index} (${p.type}) anchors to ${JSON.stringify(a)} -> sheet ${back}`);
  }
});

/* 9 — every manuscript section can be reached from a citation's back-reference */
BOOK_DATA.chapters
  .filter((c) => c.id !== 'references')
  .forEach((ch) => {
    ch.sections.forEach((sec) => {
      const page = anchors.pageForManuscriptSection(sec.id);
      if (!BOOK_PAGES[page]) fail('back-references', `${sec.id} resolves to no sheet`);
    });
  });

if (problems.length) {
  console.error(`\naudit-relations: ${problems.length} broken link(s)\n`);
  for (const p of problems) console.error(`  [${p.where}] ${p.what}`);
  console.error('\nSee src/data/relations.ts and src/data/anchors.ts\n');
  process.exit(1);
}

console.log(
  `audit-relations: clean — ${relations.RELATIONS.length} edges, ` +
    `${FIGURES.length} figures, ${SOURCES.length} sources, ${BOOK_PAGES.length} sheets round-trip.`
);
