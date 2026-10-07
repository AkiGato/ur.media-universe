// Static audit: the glossary against the manuscript.
//
// A definitions surface is the easiest place in this app to start writing. It
// looks like data, it reads like reference, and a single helpful clause added
// to make an entry "clearer" is authored doctrine sitting inside the author's
// own vocabulary where no reader could tell the difference. TY-04 forbids it;
// this makes the prohibition checkable instead of remembered.
//
// Three things are checked, and all three are about provenance rather than
// taste:
//
//   1. Every `quote` is an EXACT substring of some paragraph in bookData. Not
//      a fuzzy match, not a normalised one — byte for byte, after the same
//      whitespace collapse the reader's own renderer would apply. A paraphrase,
//      a trimmed clause, a swapped dash or a "fixed" typo all fail here.
//
//   2. Every `term` actually appears in the section the quote is lifted from.
//      Selection is the one judgement this file is allowed to make, so the
//      judgement is held to the manuscript's own vocabulary: you may not file a
//      passage under a name the dossier does not use where it stands.
//
//   3. Every `sectionId` resolves to a real section, so an entry can always be
//      followed back to the argument that made it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { transformSync } from 'esbuild';

const ROOT = process.cwd();

function load(rel) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const js = transformSync(src, { loader: 'ts', format: 'cjs' }).code;
  const mod = { exports: {} };
  new Function('module', 'exports', js)(mod, mod.exports);
  return mod.exports;
}

const { BOOK_DATA } = load('src/data/bookData.ts');
const { DEFINITIONS } = load('src/data/definitions.ts');
const { RESTORATION_DELTA } = load('src/data/instruments.ts');

/* The reader collapses runs of whitespace when it lays a paragraph out, so a
   quote that differs from the manuscript only in wrapping is still the same
   text. Anything else is a difference the author would notice. */
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const sections = new Map();
for (const ch of BOOK_DATA.chapters) {
  for (const sec of ch.sections) {
    sections.set(sec.id, { ...sec, chapter: ch.number });
  }
}

const problems = [];

for (const d of DEFINITIONS) {
  const sec = sections.get(d.sectionId);
  if (!sec) {
    problems.push(`"${d.term}" cites section ${d.sectionId}, which does not exist`);
    continue;
  }

  const paras = (sec.content || []).map(norm);
  const quote = norm(d.quote);

  if (!paras.some((p) => p.includes(quote))) {
    // say WHERE it diverges — a glossary drifts by a word, and "not found" on a
    // 300-character quote is not a diagnosis
    const best = paras.reduce(
      (acc, p) => {
        let i = 0;
        while (i < quote.length && i < p.length && quote[i] === p[i]) i++;
        return i > acc.at ? { at: i, p } : acc;
      },
      { at: 0, p: '' }
    );
    problems.push(
      `"${d.term}" (§${d.sectionId}) is not verbatim manuscript text.\n` +
        `    diverges at character ${best.at}\n` +
        `    glossary:   …${quote.slice(Math.max(0, best.at - 30), best.at + 40)}…\n` +
        `    manuscript: …${best.p.slice(Math.max(0, best.at - 30), best.at + 40)}…`
    );
    continue;
  }

  /* The term has to be the manuscript's word for this thing, here. Compared
     case-insensitively across the whole section including its title, because
     the dossier capitalises a term differently when it opens a sentence. */
  const hay = norm([sec.title, ...(sec.content || [])].join(' ')).toLowerCase();
  const head = d.term.split(/\s+and\s+/)[0].toLowerCase();
  if (!hay.includes(head)) {
    problems.push(`"${d.term}" is not a word §${d.sectionId} uses — the section never says "${head}"`);
  }
}

/* THE INSTRUMENTS, HELD TO THE SAME STANDARD.
 *
 * An instrument is an even softer target than a glossary. A scale wants
 * anchors, a reading wants a verdict, and each of those is a sentence somebody
 * will write "just to make it usable" — at which point the app is quietly
 * issuing doctrine in the author's voice. §5.6 already wrote all of it, so
 * every string the Restoration Delta renders is checked here the same way.
 *
 * The 1-and-5 anchors are checked as substrings of their own question's
 * paragraph rather than of the whole section, because that is where the
 * manuscript defines them ("One is not at all; five is easily") and a looser
 * check would let an anchor drift onto the wrong question. */
{
  const secId = RESTORATION_DELTA.sectionId;
  const sec = sections.get(secId);
  if (!sec) {
    problems.push(`the Restoration Delta cites §${secId}, which does not exist`);
  } else {
    const paras = (sec.content || []).map(norm);
    const whole = norm((sec.content || []).join(' '));

    const check = (label, text, haystack) => {
      const t = norm(text);
      if (!haystack.includes(t)) {
        problems.push(
          `Restoration Delta · ${label} is not verbatim §${secId} text.\n` +
            `    reads: ${t.slice(0, 110)}`
        );
        return false;
      }
      return true;
    };

    RESTORATION_DELTA.questions.forEach((q, i) => {
      // the paragraph this question lives in, so the anchors are checked there
      const home = paras.find((p) => p.includes(norm(q.text)));
      if (!check(`question ${i + 1}`, q.text, whole)) return;
      check(`question ${i + 1} low anchor`, q.low, home || whole);
      check(`question ${i + 1} high anchor`, q.high, home || whole);
    });

    check('consequence', RESTORATION_DELTA.consequence, whole);
    check('caveat', RESTORATION_DELTA.caveat, whole);

    /* The thresholds are the author's numbers, so they are read back out of the
       sentence that sets them rather than trusted. */
    const bandsText = paras.find((p) => p.includes('restorative')) || '';
    for (const n of ['+0.5', '−0.5']) {
      if (!bandsText.includes(n)) {
        problems.push(`Restoration Delta · §${secId} no longer states the ${n} threshold the bands use`);
      }
    }
  }
}

const dupes = DEFINITIONS.map((d) => d.term).filter((t, i, a) => a.indexOf(t) !== i);
if (dupes.length) problems.push(`duplicate terms: ${dupes.join(', ')}`);

if (problems.length) {
  console.error('audit-definitions: FAILED\n');
  for (const p of problems) console.error('  · ' + p + '\n');
  process.exit(1);
}

console.log(
  `audit-definitions: clean — ${DEFINITIONS.length} definitions and ${RESTORATION_DELTA.questions.length * 3 + 2} instrument strings, every one verbatim from the manuscript.`
);
