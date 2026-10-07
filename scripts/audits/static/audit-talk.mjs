// Static audit: the talk deck against the pages it is measured on.
//
// `docs/talk.html` is a single file whose live layer is almost entirely
// COORDINATES — lift zones, covers, line bands, ink boxes, hover zones and
// translation panels, every one of them a percentage taken off a specific
// exported page image. None of it is derived at runtime. None of it is checked
// by anything.
//
// That has already cost twice. The caption on page 4 was measured against a
// layout that moved, so its three covers sat at 75 / 79.33 / 83.66 while the
// lines were at 79.81 / 84.07 / 87.78 — the first press uncovered empty ground
// and the last line was visible before the first press, and it shipped. And
// two sheets picked up a second `build` key, which in an object literal is not
// a second anything: the later one silently won and the earlier never ran.
//
// Neither failure threw. Neither showed in a console. The deck looked fine.
//
// So this audit does not try to re-measure the images — that needs a decoder
// and a renderer, and a rendering audit that is slow gets skipped. It does the
// one thing that makes the measurements trustworthy instead: it FINGERPRINTS
// the pages. If a page is re-exported, every coordinate taken against it is
// suspect, and this fails until someone has looked. The rest is structure that
// can be checked by reading.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DECK = join(ROOT, 'docs', 'talk.html');
const PAGES = join(ROOT, 'docs', 'talk-assets', 'pages');
const WIDGETS = join(ROOT, 'src', 'talkWidgets.tsx');
const BASELINE = join(ROOT, 'scripts', 'audits', 'static', 'audit-talk.pages.json');

const problems = [];
const say = m => problems.push(m);

if (!existsSync(DECK)) {
  console.log('audit-talk: no docs/talk.html — nothing to check.');
  process.exit(0);
}
const src = readFileSync(DECK, 'utf8');

/* ---------- the running order ---------- */
const orderM = src.match(/const ORDER=\[([^\]]+)\]/);
if (!orderM) say('no ORDER array found');
// ORDER takes a page number or a card name; a card has no image behind it.
const ENTRIES = orderM ? orderM[1].split(',').map(t => t.trim().replace(/^'|'$/g, '')) : [];
const ORDER = ENTRIES.filter(t => /^\d+$/.test(t)).map(Number);
const CARD_KEYS = ENTRIES.filter(t => !/^\d+$/.test(t));
const dupes = ENTRIES.filter((t, i) => ENTRIES.indexOf(t) !== i);
if (dupes.length) say(`ORDER shows the same sheet twice: ${[...new Set(dupes)].join(', ')}`);

// every card named in ORDER has to exist, and carry a line to say
const cardBlock = src.slice(src.indexOf('const CARDS={'), src.indexOf('const ORDER='));
for (const key of CARD_KEYS) {
  const at = cardBlock.indexOf(key + ':{');
  if (at < 0) { say(`ORDER names a card "${key}" that CARDS does not define`); continue; }
  const chunk = cardBlock.slice(at, at + 400);
  if (!/\bsay:\s*'[^']+'/.test(chunk)) say(`card "${key}" has no \`say\` line`);
  if (!/\bnote:/.test(chunk)) say(`card "${key}" has no speaker note`);
}

/* ---------- the sheet definitions ---------- */
const bodyStart = src.indexOf('const SHEETS=[');
const bodyEnd = src.indexOf('\n];', bodyStart);
if (bodyStart < 0 || bodyEnd < 0) say('no SHEETS array found');
const sheets = src.slice(bodyStart, bodyEnd).split(/\n\{ id:/).slice(1);

if (sheets.length !== 17)
  say(`SHEETS holds ${sheets.length} page definitions, expected 17`);

const KEYS = ['build', 'on', 'enter', 'note', 'text', 'steps', 'foot',
  'drift', 'light', 'liquid', 'glass', 'lens', 'xlate'];
for (const part of sheets) {
  const id = part.slice(1, part.indexOf("'", 1));
  const seen = {};
  for (const m of part.matchAll(/^\s{0,4}(\w+)\s*[:(]/gm))
    if (KEYS.includes(m[1])) seen[m[1]] = (seen[m[1]] || 0) + 1;
  for (const [k, n] of Object.entries(seen))
    if (n > 1) say(`"${id}" declares \`${k}\` ${n} times — in an object literal the last one silently wins`);

  /* every percentage a sheet states has to be on the page */
  for (const m of part.matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)) {
    const [x, y, w, h] = m.slice(1, 5).map(Number);
    if (x < -5 || y < -5 || w <= 0 || h <= 0 || x + w > 105 || y + h > 105)
      say(`"${id}" has a rect off the sheet: [${x}, ${y}, ${w}, ${h}]`);
  }
}

/* ---------- speech and stage direction stay separate ---------- */
// sayWords() drops any paragraph carrying a `.cue`, so a cue sitting inside a
// spoken sentence makes the sheet uncountable and the clock wrong.
for (const part of sheets) {
  const id = part.slice(1, part.indexOf("'", 1));
  const note = part.match(/note:`([\s\S]*?)`/);
  if (!note) continue;
  // What a cue paragraph legitimately looks like is a label followed by the
  // direction that explains it, so text AFTER the cue proves nothing. What
  // cannot be right is a cue arriving partway through a sentence: everything
  // before it was being spoken, and dropping the paragraph loses it.
  for (const para of note[1].split(/<\/p>/)) {
    const at = para.indexOf('<span class="cue">');
    if (at < 0) continue;
    const before = para.slice(0, at)
      .replace(/<[^>]+>/g, ' ').replace(/&#\d+;/g, '').trim();
    const words = before.split(/\s+/).filter(Boolean).length;
    if (words > 6)
      say(`"${id}" opens a cue paragraph with ${words} spoken words — split it, or sayWords() drops them and the sheet is timed short`);
  }
}

/* ---------- every instrument names something that exists ---------- */
if (existsSync(WIDGETS)) {
  const w = readFileSync(WIDGETS, 'utf8');
  const known = [...w.matchAll(/^\s*'([a-z-]+)':\s*\(\)/gm)].map(m => m[1]);
  for (const m of src.matchAll(/instrument\(L,\s*'([a-z-]+)'\)/g))
    if (!known.includes(m[1]))
      say(`the deck mounts an instrument called "${m[1]}", which src/talkWidgets.tsx does not export`);
}

/* ---------- the pages the coordinates were taken from ---------- */
const jpegSize = buf => {
  for (let i = 2; i < buf.length - 9;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
};

const prints = {};
for (const page of ORDER) {
  const name = `page-${String(page).padStart(2, '0')}.jpg`;
  const file = join(PAGES, name);
  if (!existsSync(file)) { say(`ORDER names page ${page} but ${name} is missing`); continue; }
  const buf = readFileSync(file);
  prints[name] = createHash('sha256').update(buf).digest('hex').slice(0, 16);
  const size = jpegSize(buf);
  if (!size) say(`${name} is not a JPEG this can read`);
  else if (size.w !== 1920 || size.h !== 1080)
    say(`${name} is ${size.w}x${size.h}, not 1920x1080 — every coordinate on it is scaled wrong`);
}

if (process.argv.includes('--accept')) {
  writeFileSync(BASELINE, JSON.stringify(prints, null, 2) + '\n');
  console.log(`audit-talk: accepted ${Object.keys(prints).length} page fingerprints.`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  say('no page fingerprints recorded yet — run `npm run audit:talk -- --accept` once the coordinates are known good');
} else {
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  for (const [name, hash] of Object.entries(prints)) {
    if (!(name in base)) say(`${name} is new and has no recorded fingerprint`);
    else if (base[name] !== hash)
      say(`${name} has been re-exported. Every lift zone, cover, band and ink box measured on it is now unverified — re-measure, then \`npm run audit:talk -- --accept\``);
  }
  for (const name of Object.keys(base))
    if (!(name in prints)) say(`${name} is recorded but no longer used by ORDER`);
}

if (problems.length) {
  console.error('audit-talk: the deck and the pages it is measured on have come apart.\n');
  for (const p of problems) console.error('  ' + p);
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log(`audit-talk: clean — ${ENTRIES.length} sheets (${ORDER.length} pages, ${CARD_KEYS.length} cards), ` +
            `${Object.keys(prints).length} pages at 1920x1080, fingerprints match, ` +
            `no duplicate keys, speech and cues separate.`);
