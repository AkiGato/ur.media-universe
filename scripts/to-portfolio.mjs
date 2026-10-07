/**
 * Put the built dossier inside the portfolio.
 *
 *   npm run build:portfolio
 *   node scripts/to-portfolio.mjs ../portfolio20267
 *
 * The portfolio is a static repository with no build step: whatever sits at
 * `projects/mediauniverse/` is what the domain serves. So the transfer is a
 * directory replacement, and this script is here to make it one command and
 * one that cannot half-finish — it refuses rather than guesses.
 *
 * It replaces the destination outright, because a merge would leave the
 * previous build's hashed chunks behind: dead files that the shell no longer
 * names, that nothing will ever ask for, and that the next person to read the
 * directory has no way of telling from the live ones.
 *
 * Nothing outside `projects/mediauniverse/` is touched, and nothing is
 * committed — the diff is left for a person to look at.
 */
import { cpSync, existsSync, rmSync, statSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(root, 'build', 'portfolio');
const DEST_SUBPATH = join('projects', 'mediauniverse');

const target = process.argv[2];
if (!target) {
  console.error('to-portfolio: pass the portfolio repository, e.g.\n' +
                '  node scripts/to-portfolio.mjs ../portfolio20267');
  process.exit(1);
}

const repo = resolve(process.cwd(), target);
if (!existsSync(join(repo, '.git')) || !existsSync(join(repo, 'index.html'))) {
  console.error(`to-portfolio: ${repo} does not look like the portfolio repository ` +
                '(no .git, or no index.html at its root).');
  process.exit(1);
}
if (!existsSync(join(SRC, 'index.html'))) {
  console.error('to-portfolio: no build at build/portfolio — run `npm run build:portfolio` first.');
  process.exit(1);
}

const dest = join(repo, DEST_SUBPATH);
if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
cpSync(SRC, dest, { recursive: true });

/* The cache policy cannot travel inside the directory. Cloudflare reads one
   `_headers`, at the root of what it serves, and a copy in a subdirectory is
   not read — it is just another static file sitting there, publicly fetchable
   and doing nothing. The rules are stamped under the mount point by the build
   and they live in the portfolio's own root `_headers`; the paths have no
   hashes in them, so they are written once and do not go stale. Dropping the
   copy here means a rebuild cannot quietly put the dead file back. */
const strayHeaders = join(dest, '_headers');
if (existsSync(strayHeaders)) unlinkSync(strayHeaders);

const bytes = (function size(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    const p = join(dir, entry.name);
    return total + (entry.isDirectory() ? size(p) : statSync(p).size);
  }, 0);
})(dest);

console.log(`to-portfolio: ${DEST_SUBPATH} written in ${repo} (${(bytes / 1e6).toFixed(1)} MB)`);
console.log("to-portfolio: _headers dropped — the cache policy lives in the portfolio's root _headers.");
console.log("to-portfolio: review it with `git status` there, then commit.");
