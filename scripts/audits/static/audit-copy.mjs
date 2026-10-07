// Static audit: every sentence the app renders, against the dossier.
//
// TY-04 — LITERAL DOCUMENT TEXT — is the rule this project is least able to
// enforce by reading a diff, because invented copy does not look invented. It
// looks like a helpful sentence. Once a dozen of those are in, a reader can no
// longer tell which sentences are the author's, and that is the damage the rule
// exists to prevent: "an interface full of invented voice takes a day to strip
// and leaves the reader unable to tell which sentences are the author's."
//
// So this reads the components, pulls out what will be RENDERED AS PROSE, and
// checks it against the manuscript. It is looking for SENTENCES, not labels — a
// control is allowed to be called "Start again".
//
// WHAT PASSES
//   · anything that is a substring of the manuscript (bookData) or of the
//     production ruleset (promptData) — the author's own words;
//   · anything in ALLOWED, the explicit record of copy the user asked for. That
//     list is the point of this audit: short, reviewable, every entry argued
//     for once. If it grows without a request behind it, that is the drift.
//
// TOOLTIPS AND ACCESSIBLE NAMES ARE NOT FAILED ON. `title` and `aria-label` are
// how a control says what it does, not the author's voice, and a screen reader
// needs them. They are collected and printed under --tooltips so the whole set
// can still be eyeballed.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { transformSync } from 'esbuild';

const ROOT = process.cwd();
const MIN_WORDS = 5;

function load(rel) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const js = transformSync(src, { loader: 'ts', format: 'cjs' }).code;
  const mod = { exports: {} };
  new Function('module', 'exports', js)(mod, mod.exports);
  return mod.exports;
}

/* ---------------------------------------------------------- the corpus --- */

const { BOOK_DATA } = load('src/data/bookData.ts');
const promptData = load('src/data/promptData.ts');
const definitions = load('src/data/definitions.ts');
const instruments = load('src/data/instruments.ts');
/* The trendwatch addendum is a SECOND corpus, not an extension of the first.
   It was asked for, so the sentences in it are requested copy and belong in
   what this audit accepts; it is loaded separately and joined below so the
   reason it is here stays visible. What the audit still refuses is the case it
   exists for — a sentence appearing in a component that is in neither corpus
   and on nobody's list. See the header of src/data/trendwatch.ts. */
const trendwatch = load('src/data/trendwatch.ts');

const norm = (s) =>
  String(s).replace(/\s+/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim();

const corpusParts = [];
for (const ch of BOOK_DATA.chapters || []) {
  // the subtitle too — it was missing, and a subtitle is exactly the kind of
  // line an interface reaches for, so leaving it out made real matches fail
  corpusParts.push(ch.title || '', ch.subtitle || '', ch.number || '');
  for (const sec of ch.sections || []) {
    corpusParts.push(sec.title || '', ...(sec.content || []));
    for (const c of sec.citations || []) corpusParts.push(c.text || '', c.authorOrSource || '');
  }
}
for (const cs of BOOK_DATA.caseStudies || []) {
  corpusParts.push(cs.title, cs.subtitle, cs.fragile, cs.antifragile, cs.verdict);
  for (const c of cs.citations || []) corpusParts.push(c.text || '');
}
for (const s of BOOK_DATA.consolidatedSources || []) corpusParts.push(s.text || '', s.authorOrSource || '');
corpusParts.push(
  BOOK_DATA.title, BOOK_DATA.subtitle, BOOK_DATA.author,
  BOOK_DATA.dossierTitle, BOOK_DATA.dossierSubtitle
);
corpusParts.push(promptData.FULL_RULESET_TEXT || '');
for (const r of Object.values(promptData.PROMPT_RULESET_DATA || {})) {
  corpusParts.push(r.title || '', r.subtitle || '', r.promptText || '');
}
// these two are themselves audited as verbatim by audit-definitions
for (const d of definitions.DEFINITIONS || []) corpusParts.push(d.quote || '', d.term || '');
const rd = instruments.RESTORATION_DELTA || {};
for (const q of rd.questions || []) corpusParts.push(q.text || '', q.low || '', q.high || '');
corpusParts.push(rd.consequence || '', rd.caveat || '');

/* THE ADDENDUM — collected separately, then joined.
   Separately because it is PINNED: see THE ADDENDUM IS CLOSED, below. */
const addendumParts = [];
for (const s of trendwatch.TRENDWATCH_SECTIONS || []) {
  addendumParts.push(s.title || '', s.subtitle || '', s.number || '', ...(s.content || []));
  for (const c of s.citations || []) addendumParts.push(c.text || '', c.authorOrSource || '');
}
for (const key of ['ATTENTION', 'WITHDRAWAL']) {
  const ser = trendwatch[key];
  if (!ser) continue;
  addendumParts.push(ser.title || '', ser.reading || '', ser.caveat || '');
  for (const p of ser.points || []) addendumParts.push(p.statement || '', p.source || '');
}
for (const key of ['EXPOSURE', 'DISENGAGEMENT', 'RESTORATION_EVIDENCE', 'SHOCK', 'ANTIFRAGILE_EVIDENCE']) {
  for (const d of trendwatch[key] || []) addendumParts.push(d.statement || '', d.source || '');
}
for (const a of trendwatch.ASSUMPTIONS || []) {
  addendumParts.push(a.short || '', a.statement || '', a.basis || '');
}
for (const s of trendwatch.STRUCTURAL || []) {
  addendumParts.push(s.short || '', s.extractive || '', s.antifragile || '');
}
for (const v of Object.values(trendwatch.FIGURE_READINGS || {})) addendumParts.push(v || '');
addendumParts.push(trendwatch.SENSITIVITY?.finding || '');
corpusParts.push(...addendumParts);

/* ── TWO CORPORA, AND THE COUNT IS ENFORCED ───────────────────────────────
   TY-04's force comes from the accepted set being CLOSED. One corpus — the
   manuscript — makes "is this the author's?" a question with an answer. Two is
   a considered exception: the trendwatch addendum was asked for, it is held in
   its own file, and it is pinned so it cannot grow silently.

   THREE WOULD END THE RULE. Not because a third file is worse than the second,
   but because "which corpus is this in?" stops having a principled answer once
   there is a list of them — at that point the audit checks location, and TY-04
   is a check on invention. The count is the thing to watch, so the count is
   checked here rather than remembered in a comment somebody will not read.

   Raising this number is a decision about what TY-04 means. It is not a
   configuration value and there is no scenario where it is raised in passing. */
const CORPORA = ['manuscript + ruleset', 'trendwatch addendum'];
const MAX_CORPORA = 2;
if (CORPORA.length > MAX_CORPORA) {
  console.error(
    `audit-copy: ${CORPORA.length} accepted corpora — ${CORPORA.join(', ')}.\n\n` +
    '  TY-04 accepts two: the manuscript and the addendum that was asked for.\n' +
    '  A third makes "which corpus is this in?" a question with no principled\n' +
    '  answer, and turns this audit from a check on INVENTION into a check on\n' +
    '  LOCATION. If a third is genuinely wanted, that is a decision about what\n' +
    '  the rule means — make it deliberately and raise MAX_CORPORA with it.\n'
  );
  process.exit(1);
}

const CORPUS = norm(corpusParts.join(' ¶ ')).toLowerCase();

/* ── THE ADDENDUM IS CLOSED ────────────────────────────────────────────────
   TY-04's force comes from the corpus being CLOSED. A rendered sentence is
   either the author's or it was asked for, and anything else is invented —
   which only works while "was this asked for?" has an answer that is not
   "somebody put it in the accepted file".

   Widening the corpus to `trendwatch.ts` broke that, and the break is not
   theoretical: the four sentences this audit caught during the addendum's
   build were caught because a component is not an accepted destination. Once
   the addendum IS one, the cheapest way past a failure stops being "make it
   verbatim or delete it" and becomes "move it into trendwatch.ts", which the
   audit would then green-light. The rule would have quietly turned from a
   check on invention into a check on location.

   So the second corpus is pinned the way ALLOWED closes the first. Its
   sentences are hashed, and a sentence added to it fails the build until
   somebody re-pins deliberately:

       npm run audit:copy -- --pin-addendum

   That is one line here and one deliberate act per addition, and it restores
   the property the rule depends on: a new sentence requires a person to say
   "yes, this was asked for" rather than requiring nothing at all.

   NOTE this gate is about PROVENANCE — was it asked for. It is not about
   support. Whether a claim carries its instrument and its year is a separate
   discipline, enforced in trendwatch.ts's own shape (`source`, `year`,
   `chain`), and passing one gate has never meant passing the other. */
const ADDENDUM_PIN = join(ROOT, 'scripts', 'audits', 'static', 'audit-copy.addendum.json');

const addendumSentences = [...new Set(
  addendumParts
    .map((s) => norm(s))
    .filter((s) => s && s.split(/\s+/).filter(Boolean).length >= MIN_WORDS)
)].sort();

const addendumHash = createHash('sha256')
  .update(addendumSentences.join('\n'))
  .digest('hex')
  .slice(0, 16);

if (process.argv.includes('--pin-addendum')) {
  writeFileSync(
    ADDENDUM_PIN,
    JSON.stringify(
      {
        note:
          'The trendwatch addendum is a SECOND corpus that audit-copy accepts, and it is ' +
          'pinned so it cannot grow silently. Adding a sentence to src/data/trendwatch.ts ' +
          'fails the build until this is regenerated deliberately: ' +
          'npm run audit:copy -- --pin-addendum. Re-pin only when the addition was asked for.',
        generated: new Date().toISOString().slice(0, 10),
        count: addendumSentences.length,
        hash: addendumHash
      },
      null,
      2
    ) + '\n'
  );
  console.log(`audit-copy: addendum pinned — ${addendumSentences.length} sentences, hash ${addendumHash}.`);
  process.exit(0);
}

let addendumPin = null;
try {
  addendumPin = JSON.parse(readFileSync(ADDENDUM_PIN, 'utf8'));
} catch {
  addendumPin = null;
}

if (!addendumPin) {
  console.error(
    'audit-copy: the addendum corpus is unpinned. It is accepted copy, so it must be ' +
    'closed: run `npm run audit:copy -- --pin-addendum`.'
  );
  process.exit(1);
}

if (addendumPin.hash !== addendumHash) {
  const delta = addendumSentences.length - addendumPin.count;
  console.error(
    `audit-copy: the trendwatch addendum changed — ${addendumPin.count} pinned sentences, ` +
    `${addendumSentences.length} now (${delta >= 0 ? '+' : ''}${delta}).\n`
  );
  console.error(
    '  The addendum is a second corpus this audit accepts, so it is pinned to stop it\n' +
    '  growing silently. If the change was asked for, re-pin it deliberately:\n\n' +
    '    npm run audit:copy -- --pin-addendum\n\n' +
    '  If it was not, the sentence belongs nowhere — TY-04.'
  );
  process.exit(1);
}

/* ------------------------------------------------- asked-for interface --- */

const ALLOWED = [
  // the entry screen — "what it is + instructions, only 3 lines maximum"
  'Touch the tissue · scroll to zoom · Esc returns here',
  'A chapter opens the reader · the index holds definitions, figures and tools',
  // the map's own standing instruction, which predates this audit
  'Touch a cell to read it · press to keep it open',
  // instrument scaffolding, asked for when the panels were asked for
  'Answer three questions, then read the budget the answers imply. Every number underneath it is an assumption you can change, and each one says where the document argues it.',
  'Three questions, asked immediately before the interaction and immediately after, each answered from one to five.',
  // "what for" became "the product" when that card was renamed Product — the
  // sentence names the three cards, so it tracks their names or it points at
  // one that is no longer there. Same entry, one word.
  'Say who is producing, the product, and at least one goal.',
  'Both readings are needed before there is a delta.',
  'Answer against the project in front of you.',
  'Evaluate your communication project against these 5 non-negotiable operational questions:',
  'Esc returns to the page',
  // the branch tiles flip, and nothing on the face said so — the affordance
  // lived only in the aria-label. Asked for with the description removed:
  // "only title, figure and the tap to view".
  'Tap to view',
  'Esc returns to the map',

  /* CONTROL NAMES that happen to run to five words. TY-04 permits these in so
     many words — "Write the control's own name and stop" — and the audit's
     five-word threshold cannot tell a short label from a short sentence. They
     are listed rather than exempted by a rule, so the set stays countable. */
  "Back to the chapter's example",
  'Run it on your own source',
  'How it is worked out',

  /* A PRIVACY DISCLOSURE, AND THE ONE PIECE OF INTERFACE PROSE THAT MUST STAY.
     The causal instrument sends a pasted link to third parties — an extraction
     proxy for articles, the platform itself for a video. The app's central
     promise is "no telemetry, and no third-party request unless you invoke the
     causal-research instrument with your own key", and this paragraph is where
     that promise is actually kept: it names the services before the reader
     hands anything over. Deleting it as invented copy would make the app
     quietly do the thing it promises not to do silently. It is written here
     because the dossier has no sentence about this app's network behaviour —
     there is nothing verbatim to use. */
  'Ordinary articles and blogs are read through a free extraction proxy, so the link is sent to that service.',

  /* THE REPORT FORM'S DISCLOSURE, and it stands beside the causal instrument's
     above for exactly the same reason. The form was asked for; this sentence is
     what keeps the project's promise honest while it exists. It names what
     leaves the machine — the message, the address, the three technical fields —
     and says plainly that the address joins a mailing list, which is the one
     consequence a reader could not guess from a control called "Report a
     problem". Deleting it as invented copy would make the app quietly do a
     thing it does not admit to. */
  'Sent by email, with the page you are on ( … ), your window size ( … ) and your browser version. Your address joins the project mailing list. Nothing else is collected, and nothing is sent unless you press send.'
];
const ALLOWED_N = ALLOWED.map((s) => norm(s).toLowerCase());

/* ------------------------------------------------------- the components -- */

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full);
    else if (/[.]tsx$/.test(e)) files.push(full);
  }
})(join(ROOT, 'src', 'components'));

/* Comments go first: this audit is about what RENDERS, and these files carry
   long explanatory comments that are not copy. */
const BLOCK = new RegExp('/\\*[\\s\\S]*?\\*/', 'g');
const LINE = new RegExp('(^|[^:])//[^\\n]*', 'g');
const stripComments = (src) => src.replace(BLOCK, ' ').replace(LINE, '$1 ');

const SEP = String.fromCharCode(92); // backslash

const rendered = [];
const tooltips = [];

for (const f of files) {
  const src = stripComments(readFileSync(f, 'utf8'));
  const where = relative(ROOT, f).split(SEP).join('/');

  // JSX text nodes, with any {…} holes blanked
  for (const m of src.matchAll(/>([^<>]{12,}?)</g)) {
    rendered.push({ where, text: m[1].replace(/\{[^{}]*\}/g, ' … ') });
  }
  // tooltips / accessible names / placeholders
  for (const m of src.matchAll(/(?:aria-label|placeholder)=(?:"([^"]{10,})"|'([^']{10,})')/g)) {
    tooltips.push({ where, text: m[1] || m[2] });
  }
  /* `title=` is a tooltip AND sometimes the only name a control has, so it is
     collected as a tooltip too. */
  for (const m of src.matchAll(/title=(?:"([^"]{10,})"|'([^']{10,})')/g)) {
    tooltips.push({ where, text: m[1] || m[2] });
  }

  /* PROSE HIDING IN DATA. The first version of this audit read JSX text only,
     and missed the thing it most needed to catch: a component holding its own
     little table of copy. The Tools folder carried ten hand-written `subtitle:`
     strings that were paraphrases of the ruleset's own — every one a sentence
     no reader could tell from the author's, and none of them his.

     So any string literal assigned to a field that gets RENDERED is read too.
     The field names are listed rather than inferred: a component is free to
     hold an id or a className, and only the ones that reach a reader matter. */
  const PROSE_FIELDS = /\b(title|subtitle|detail|strategy|text|body|gloss|label|reading|caption|hint|summary|description)\s*:\s*/;
  for (const m of src.matchAll(/\b(?:title|subtitle|detail|strategy|text|body|gloss|label|reading|caption|hint|summary|description)\s*:\s*(?:'((?:[^'\\]|\\.){20,}?)'|"((?:[^"\\]|\\.){20,}?)")/g)) {
    const raw = (m[1] || m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"');
    rendered.push({ where, text: raw });
  }
  void PROSE_FIELDS;
}

/* ------------------------------------------------------------ classify --- */

const CODE_WORDS = /\b(const|let|var|return|function|export|import|useState|useRef|useMemo|useEffect|className|props|React|null|undefined|true|false|typeof|interface|type)\b/;

const looksLikeCode = (t) =>
  /[;={}[\]$|#`\\]/.test(t) ||
  /=>|\.\w+\(|\(\s*\)|:\s*\w+\s*[,)]|https?:/.test(t) ||
  CODE_WORDS.test(t);

const looksLikeClasses = (t) => {
  const toks = t.split(/\s+/).filter(Boolean);
  if (!toks.length) return false;
  const classy = toks.filter(
    (w) => /-/.test(w) || /^(flex|grid|block|absolute|relative|hidden|truncate|uppercase|italic)$/.test(w)
  );
  return classy.length / toks.length > 0.34;
};

/* Four consecutive ordinary words is what a sentence actually looks like. */
const SENTENCE = /(^|\s)[A-Za-z'’]{2,}(\s[A-Za-z'’]{2,}){3,}/;

const isProse = (t) => {
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) return false;
  if (looksLikeClasses(t)) return false;
  if (!SENTENCE.test(t)) return false;
  if (t === t.toUpperCase() && words.length < 9) return false; // an eyebrow
  return true;
};

const inCorpus = (key) => {
  if (CORPUS.includes(key)) return true;
  // an interpolated sentence passes if every literal run of it is the author's
  const runs = key.split('…').map((r) => norm(r)).filter((r) => r.split(/\s+/).length >= MIN_WORDS);
  return runs.length > 0 && runs.every((r) => CORPUS.includes(r));
};

const problems = [];
const seen = new Set();
let checked = 0;

for (const c of rendered) {
  const t = norm(c.text);
  if (!t || looksLikeCode(t) || !isProse(t)) continue;
  const key = t.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  checked++;
  if (inCorpus(key)) continue;
  if (ALLOWED_N.some((a) => a.includes(key) || key.includes(a))) continue;
  problems.push({ where: c.where, text: t });
}

/* ------------------------------------------------------------- report ---- */

const tips = [...new Set(tooltips.map((t) => norm(t.text)))]
  .filter((t) => !CORPUS.includes(t.toLowerCase()))
  .sort();

if (process.argv.includes('--tooltips')) {
  console.log(`audit-copy: ${tips.length} tooltip/aria strings not in the dossier (never a failure):\n`);
  for (const t of tips) console.log('  · ' + t);
  console.log('');
}

/* ── THE BASELINE ──────────────────────────────────────────────────────────
   This audit arrived after the app did, and it found sentences already in
   place — most of them the interpretive text on the six figures, the layer
   that says what each cell MEANS. Failing the build on those would either
   stop the build outright or force somebody to rewrite six figures in one
   pass to make it green, and neither is a decision an audit gets to make.

   So the known set is recorded in `audit-copy.baseline.json` and reported as
   debt, while anything NEW fails. The count can only go down: a string leaves
   the baseline when it is made verbatim, asked for, or deleted, and the file
   is only ever rewritten by running --update deliberately. Nothing enters the
   baseline by accident. */
const BASELINE_PATH = join(ROOT, 'scripts', 'audits', 'static', 'audit-copy.baseline.json');

let baseline = [];
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).known || [];
} catch {
  baseline = [];
}
const baseSet = new Set(baseline.map((b) => norm(b).toLowerCase()));

if (process.argv.includes('--update')) {
  const known = [...new Set(problems.map((p) => p.text))].sort();
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        note:
          "Rendered sentences that are neither the dossier's nor on the asked-for list, " +
          'recorded when audit-copy was introduced. This is DEBT, not permission — the ' +
          'count may only go down. Regenerate with: npm run audit:copy -- --update',
        generated: new Date().toISOString().slice(0, 10),
        count: known.length,
        known
      },
      null,
      2
    ) + '\n'
  );
  console.log(`audit-copy: baseline written — ${known.length} known strings.`);
  process.exit(0);
}

const fresh = problems.filter((p) => !baseSet.has(p.text.toLowerCase()));
const resolved = [...baseSet].filter((b) => !problems.some((p) => p.text.toLowerCase() === b));

if (fresh.length) {
  console.error(`audit-copy: ${fresh.length} NEW rendered sentence(s) are neither the dossier's nor on the asked-for list.\n`);
  const byFile = new Map();
  for (const p of fresh) {
    if (!byFile.has(p.where)) byFile.set(p.where, []);
    byFile.get(p.where).push(p.text);
  }
  for (const [file, texts] of [...byFile].sort()) {
    console.error('  ' + file);
    for (const t of texts) console.error('    · ' + (t.length > 160 ? t.slice(0, 160) + '…' : t));
    console.error('');
  }
  console.error("Each one is either the author's (make it verbatim), asked for (add it to ALLOWED with the request behind it), or invented (delete it).");
  process.exit(1);
}

const debt = problems.length;
console.log(
  `audit-copy: clean — ${checked} rendered sentences, no new invented copy. ` +
  (debt
    ? `${debt} known from the baseline still to resolve` +
      (resolved.length
        ? `; ${resolved.length} baseline entr${resolved.length === 1 ? 'y is' : 'ies are'} gone — run with --update to drop ${resolved.length === 1 ? 'it' : 'them'}. `
        : '. ')
    : 'nothing outstanding. ') +
  `(${tips.length} tooltip/aria strings are not checked; --tooltips lists them.)`
);
