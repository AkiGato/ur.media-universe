// Post-build step over the emitted output: stamp sw.js with a cache version
// derived from it, precache the hashed assets Vite just wrote, preload the
// front door, and move the _headers rules under the mount point.
//
// Everything here is a URL path, and all four have to agree about the base the
// build was given — see scripts/basePath.mjs.
//
// Without this, CACHE_NAME never changes between deploys and returning readers
// keep the old shell forever; and the first offline load has nothing but
// index.html in the cache.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { basePath } from './basePath.mjs';

/* The mount point this build was given. Everything the script writes into the
   output — the precache list, the modulepreload hints, the _headers rules — is
   a URL path, and a URL path that forgets the subdirectory is a 404 on the
   portfolio and silently correct on the dossier's own domain, which is the
   worst of both. Read once, here, from the same helper vite.config.ts uses. */
const BASE = basePath();

/* The output directory, so one script can stamp either build.
   `npm run build` writes dist/ for local preview; `npm run build:web` writes
   build/, which is what gets uploaded. The stamping is identical — the cache
   version is derived from the emitted asset hashes either way — so passing the
   directory in was the whole change needed. */
const outDir = process.argv[2] || 'dist';
const dist = join(process.cwd(), outDir);
const swPath = join(dist, 'sw.js');

if (!existsSync(swPath)) {
  console.error(`stamp-sw: ${outDir}/sw.js not found — run the build first.`);
  process.exit(1);
}

const assetDir = join(dist, 'assets');
const assets = existsSync(assetDir)
  ? readdirSync(assetDir)
      .filter((f) => /\.(js|css|woff2?|png|jpe?g|svg)$/i.test(f))
      .sort()
      .map((f) => `${BASE}assets/${f}`)
  : [];

const fonts = existsSync(join(dist, 'fonts'))
  ? readdirSync(join(dist, 'fonts'))
      .filter((f) => /\.woff2?$/i.test(f))
      .sort()
      .map((f) => `${BASE}fonts/${f}`)
  : [];

const precache = [BASE, `${BASE}index.html`, ...assets, ...fonts];
const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12);

let sw = readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${version}';`);
sw = sw.replace(
  /const ASSETS_TO_CACHE = \[[^\]]*\];/,
  `const ASSETS_TO_CACHE = ${JSON.stringify(precache)};`
);
writeFileSync(swPath, sw);

console.log(`stamp-sw: version ${version}, ${precache.length} precached entries`);

// ── modulepreload for the front door ────────────────────────────────────────
//
// The Orrery is what the app opens on, but it is a dynamic import: its chunk
// starts downloading only after index.js has downloaded, parsed and executed —
// a full serial round trip standing between the boot splash and the map. Vite
// emits modulepreload hints only for the entry's static imports, and it cannot
// name a hashed dynamic chunk in source HTML; this step can, because it runs
// after the hashes exist. Preloading the map's chunks lets them ride down in
// parallel with index.js, so by the time the import() fires they are in cache.
const FRONT_DOOR = ['Orrery-', 'FigurePrimitives-'];
const htmlPath = join(dist, 'index.html');
let html = readFileSync(htmlPath, 'utf8');
const links = assets
  .filter((a) => FRONT_DOOR.some((p) => a.startsWith(`${BASE}assets/${p}`)) && a.endsWith('.js'))
  .map((a) => `    <link rel="modulepreload" crossorigin href="${a}">`);
if (links.length) {
  html = html.replace('</head>', `${links.join('\n')}\n  </head>`);
  writeFileSync(htmlPath, html);
  console.log(`stamp-sw: modulepreload injected for ${links.length} front-door chunk(s)`);
}

// ── _headers, moved under the mount point ───────────────────────────────────
//
// public/_headers is copied verbatim by Vite, so its rules still read `/assets/*`
// and `/index.html` after a build with a base. On Cloudflare and on Netlify a
// rule is matched against the request path, and a rule that matches nothing
// fails silently: the deploy succeeds, the pages work, and the year-long
// immutable caching on the hashed assets is simply not there. Rewritten here
// because this is the only step that knows both the file and the base.
if (BASE !== '/') {
  const headersPath = join(dist, '_headers');
  if (existsSync(headersPath)) {
    const before = readFileSync(headersPath, 'utf8');
    // Rule lines start at column 0 with a slash; header lines are indented.
    const after = before.replace(/^\/(?!\/)/gm, BASE);
    writeFileSync(headersPath, after);
    const rules = (after.match(new RegExp(`^${BASE}`, 'gm')) || []).length;
    console.log(`stamp-sw: _headers rewritten under ${BASE} (${rules} rules)`);
  } else {
    console.warn('stamp-sw: no _headers in the output — cache policy not applied.');
  }
}
