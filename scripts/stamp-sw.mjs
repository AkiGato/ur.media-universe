// Post-build step: stamp dist/sw.js with a cache version derived from the build
// output, and precache the hashed assets Vite just emitted.
//
// Without this, CACHE_NAME never changes between deploys and returning readers
// keep the old shell forever; and the first offline load has nothing but
// index.html in the cache.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const swPath = join(dist, 'sw.js');

if (!existsSync(swPath)) {
  console.error('stamp-sw: dist/sw.js not found — run the build first.');
  process.exit(1);
}

const assetDir = join(dist, 'assets');
const assets = existsSync(assetDir)
  ? readdirSync(assetDir)
      .filter((f) => /\.(js|css|woff2?|png|jpe?g|svg)$/i.test(f))
      .sort()
      .map((f) => `/assets/${f}`)
  : [];

const fonts = existsSync(join(dist, 'fonts'))
  ? readdirSync(join(dist, 'fonts'))
      .filter((f) => /\.woff2?$/i.test(f))
      .sort()
      .map((f) => `/fonts/${f}`)
  : [];

const precache = ['/', '/index.html', ...assets, ...fonts];
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
  .filter((a) => FRONT_DOOR.some((p) => a.startsWith(`/assets/${p}`)) && a.endsWith('.js'))
  .map((a) => `    <link rel="modulepreload" crossorigin href="${a}">`);
if (links.length) {
  html = html.replace('</head>', `${links.join('\n')}\n  </head>`);
  writeFileSync(htmlPath, html);
  console.log(`stamp-sw: modulepreload injected for ${links.length} front-door chunk(s)`);
}
