/**
 * Serve the portfolio build at the path it will actually live on.
 *
 *   npm run build:portfolio
 *   npm run preview:portfolio     → http://localhost:4175/projects/mediauniverse/
 *
 * `vite preview` reads the same config as the build, so giving it the same
 * BASE_PATH mounts the output under the subdirectory instead of at the root.
 * That is the whole point of previewing this build rather than `dist/`: every
 * fault a base introduces — a 404 on a font, a service worker registered one
 * directory too high, a `_headers` rule matching nothing — only appears when
 * the app is not at the root, and looks perfect when it is.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const BASE_PATH = process.env.BASE_PATH || '/projects/mediauniverse/';
const PORT = process.env.PORT || '4175';

console.log(`preview:portfolio: http://localhost:${PORT}${BASE_PATH}`);
const res = spawnSync(
  process.execPath,
  [join('node_modules', 'vite', 'bin', 'vite.js'), 'preview',
   '--outDir', 'build/portfolio', '--port', PORT, '--strictPort'],
  { cwd: root, env: { ...process.env, BASE_PATH }, stdio: 'inherit' }
);
process.exit(res.status ?? 1);
