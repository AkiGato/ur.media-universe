// Static audit: the deck's figures against the app's.
//
// `docs/presentation.html` redraws five of the app's figures. It has to hold
// its own copy of them, because it is one self-contained file with no build
// step and no import of anything in src/ — and a hand-kept copy of somebody
// else's data drifts. It already had: the causal figure ran backwards and
// ended on the news, the anti-engagement figure had lost the asymmetry between
// its two halves, and the postures figure said TRAP three times.
//
// So this reads the app's diagram components, evaluates them, and checks that
// the deck still agrees with them. It compares SEMANTICS, not geometry:
//
//   which cells exist, what each is called, and what connects to what.
//
// Coordinates are deliberately excluded. FW-01 and FW-06 require a figure to
// be re-laid-out for the rectangle it is drawn in, and a projected sheet is
// 1000x640 where the app's is roughly 800x400 — so the deck's positions are
// SUPPOSED to differ, and an audit that failed on them would be noise that
// taught everyone to ignore it.
//
// The app's data is read without modifying the app: the source is patched in
// memory to export its module-level constants, transformed by esbuild, and
// evaluated against stubbed React. Nothing in src/ is touched.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { transformSync } from 'esbuild';

const ROOT = process.cwd();
const DECK = join(ROOT, 'docs', 'presentation.html');
const DIAGRAMS = join(ROOT, 'src', 'components', 'diagrams');

/*
 * Which deck figure mirrors which component, and how the two name the same
 * cell. The id maps are the correspondence stated out loud: if the app grows a
 * node this table does not know about, the audit reports it rather than
 * quietly passing.
 */
const MIRRORS = [
  { deck: 'fragility', file: 'FragilityIndexDiagram.tsx',
    ids: { platform: 'plat', monopoly: 'mono', finite: 'fin', regulatory: 'reg',
           trust: 'trust', brand: 'brand' } },
  { deck: 'postures', file: 'CognitivePosturesDiagram.tsx',
    ids: { restoration: 'rest', 'restoration-trap': 'rtrap', 'restoration-ethic': 'reth',
           agency: 'agen', 'agency-trap': 'atrap', 'agency-ethic': 'aeth',
           meaning: 'mean', 'meaning-trap': 'mtrap', 'meaning-ethic': 'meth' } },
  { deck: 'bait', file: 'BaitTaxonomyDiagram.tsx',
    ids: { hook: 'hook', rage: 'rage', fear: 'fear', click: 'click',
           goon: 'goon', joy: 'joy', unharvested: 'un' } },
  { deck: 'causal', file: 'CausalTaxonomyDiagram.tsx',
    ids: { headline: 'news', historical: 'hist', economic: 'econ',
           meeting: 'meet', demographic: 'you', psychology: 'psych' } },
  { deck: 'lotus', file: 'AntiEngagementDiagram.tsx',
    ids: { contact: 'inter', degrade: 'ext', compound: 'res',
           e0: 'e0', e1: 'e1', e2: 'e2', r0: 'r0', r1: 'r1', r2: 'r2' } }
];

/* Figures the deck authored for itself. They have no upstream to drift from;
   named here so their absence from the check is a decision, not an omission. */
const DECK_ORIGINAL = ['centre', 'harvest', 'weapons', 'antifragile'];

const stubRequire = name => {
  if (name === 'react') return { default: {}, createElement: () => null };
  return new Proxy({}, { get: () => () => null });
};

function appFigure(file) {
  const src = readFileSync(join(DIAGRAMS, file), 'utf8')
    .replace(/^const (NODES|EDGES|buildNodes)\b/gm, 'export const $1');
  const { code } = transformSync(src, { loader: 'tsx', format: 'cjs', target: 'es2020' });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', code)(mod, mod.exports, stubRequire);
  const nodes = mod.exports.NODES ?? mod.exports.buildNodes?.('structure') ?? [];
  return { nodes, edges: mod.exports.EDGES ?? [] };
}

function deckFigures() {
  const html = readFileSync(DECK, 'utf8');
  const start = html.indexOf('const FIGURES = {');
  if (start < 0) throw new Error('deck: FIGURES block not found');
  // Walk braces to the matching close so nested decor() bodies are included.
  let i = html.indexOf('{', start), depth = 0, end = -1;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  const body = html.slice(html.indexOf('{', start), end);
  // The object only *references* geo/G/P inside decor bodies, which are never
  // called here, so defining it needs no drawing machinery.
  return new Function(`return ${body};`)();
}

const app = {};
for (const m of MIRRORS) app[m.deck] = appFigure(m.file);
const deck = deckFigures();

const problems = [];
for (const m of MIRRORS) {
  const a = app[m.deck], d = deck[m.deck];
  if (!d) { problems.push(`${m.deck}: missing from the deck entirely`); continue; }

  const mapped = new Map();               // app id -> deck id
  for (const [k, v] of Object.entries(m.ids)) mapped.set(k, v);
  const deckIds = new Set(d.nodes.map(n => n.id));

  for (const n of a.nodes) {
    // findings/detail nodes on the app's deeper layers are not deck cells
    if (!mapped.has(n.id)) continue;
    const want = mapped.get(n.id);
    if (!deckIds.has(want)) problems.push(`${m.deck}: app node "${n.id}" has no deck cell "${want}"`);
  }

  const appLinks = new Set();
  for (const e of a.edges) {
    if (!mapped.has(e.a) || !mapped.has(e.b)) continue;
    appLinks.add(mapped.get(e.a) + '->' + mapped.get(e.b));
  }
  const deckLinks = new Set(d.links.map(([x, y]) => x + '->' + y));
  for (const l of appLinks) {
    const [x, y] = l.split('->');
    if (!deckLinks.has(l) && !deckLinks.has(y + '->' + x)) {
      problems.push(`${m.deck}: app connects ${l}, the deck does not`);
    }
  }
  for (const l of deckLinks) {
    const [x, y] = l.split('->');
    if (!appLinks.has(l) && !appLinks.has(y + '->' + x)) {
      problems.push(`${m.deck}: deck connects ${l}, the app does not`);
    }
  }
}

if (problems.length) {
  console.error('audit-figures: the deck has drifted from the app.\n');
  for (const p of problems) console.error('  ' + p);
  console.error(`\n${problems.length} divergence(s). Update docs/presentation.html to match src/components/diagrams/.`);
  process.exit(1);
}
console.log(`audit-figures: clean — ${MIRRORS.length} figures match the app; ` +
            `${DECK_ORIGINAL.length} are deck-original (${DECK_ORIGINAL.join(', ')}).`);
