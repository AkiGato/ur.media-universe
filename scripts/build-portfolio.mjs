/**
 * The build that goes inside the portfolio.
 *
 *   npm run build:portfolio
 *
 * Identical to `npm run build:web` in every respect but one: it is mounted at
 * `/projects/mediauniverse/` instead of at the root of a domain, so Vite is
 * given a base and the post-build step moves the service worker's precache
 * list, the modulepreload hints and the `_headers` rules under it too.
 *
 * A wrapper rather than an inline `BASE_PATH=... vite build` in package.json,
 * because that syntax is a shell feature and npm runs scripts through cmd.exe
 * on Windows, where it is a syntax error rather than an environment variable.
 *
 * Override the mount point with BASE_PATH if the portfolio ever files it
 * somewhere else; `scripts/basePath.mjs` normalises whatever it is given.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = 'build/portfolio';
const BASE_PATH = process.env.BASE_PATH || '/projects/mediauniverse/';

const env = { ...process.env, BASE_PATH };

function run(args, label) {
  const res = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`build:portfolio: ${label} failed.`);
    process.exit(res.status ?? 1);
  }
}

console.log(`build:portfolio: base ${BASE_PATH} → ${OUT_DIR}`);
run([join('node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', OUT_DIR, '--emptyOutDir'], 'vite build');
run([join('scripts', 'stamp-sw.mjs'), OUT_DIR], 'stamp-sw');
