import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';
import {reportRoute} from './server/reportPlugin.mjs';
import {basePath} from './scripts/basePath.mjs';

export default defineConfig(({ mode }) => {
  /* THE SERVER-SIDE VARIABLES, LOADED WITHOUT BEING EXPOSED.

     `loadEnv` with an empty prefix reads every name out of .env.local, which
     is what the report route needs — but the value is put on `process.env`
     here, in the config, and is NEVER added to `define`. Vite bundles only
     names beginning `VITE_`, so BREVO_API_KEY cannot reach the client: not
     through import.meta.env, not through a stray import, not by accident.

     Read the prefix rule as the security boundary it is. Renaming this to
     VITE_BREVO_API_KEY would publish the key to every visitor. */
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['BREVO_API_KEY', 'BREVO_LIST_ID', 'BREVO_SENDER_EMAIL', 'REPORT_TO_EMAIL']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return {
    /* WHERE THIS COPY OF THE APP IS MOUNTED.

       `/` on its own domain, `/projects/mediauniverse/` inside the portfolio.
       Nothing in the source names the subpath: every absolute reference goes
       through `import.meta.env.BASE_URL`, which Vite derives from this, and
       the two files Vite does not process — public/sw.js and public/_headers —
       are rewritten from the same value by scripts/stamp-sw.mjs.

       Set it with BASE_PATH; scripts/basePath.mjs normalises it. */
    base: basePath(),
    plugins: [react(), tailwindcss(), reportRoute()],
    build: {
      // Everything this app needs (ResizeObserver, CSS custom properties, SVG
      // filters) already rules out pre-2020 engines, so shipping their syntax
      // helpers is pure dead weight.
      target: 'es2022',
      rollupOptions: {
        output: {
          // Vendor code changes on upgrades, the manuscript changes on edits.
          // Splitting them means a copy edit does not invalidate React in every
          // reader's cache — which matters more here than raw first-load size,
          // because this is a document people come back to.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
              return 'vendor-react';
            }
          },
        },
      },
    },
    optimizeDeps: {
      // Start serving as soon as the known deps are bundled instead of holding
      // the first request until the whole import graph has been crawled. On a
      // filesystem where a single file read costs milliseconds rather than
      // microseconds, that crawl is what the first request was waiting behind.
      holdUntilCrawlEnd: false,
    },
    server: {
      // The port comes from the environment when a launcher assigns one (the
      // desktop app's autoPort hands it over as PORT), and is 3000 otherwise.
      // Strict either way: a taken port fails loudly instead of drifting to
      // the next free one while the launcher waits on the one it asked for.
      port: Number(process.env.PORT) || 3000,
      strictPort: true,
      // Transform the front door at boot rather than on first navigation.
      // Vite pre-transforms the graph anyway; warming it means the reads happen
      // in parallel during startup instead of serialised in front of the first
      // paint. Only the critical path belongs here — the figures are lazy and
      // must stay off it.
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/App.tsx',
          './src/components/Orrery.tsx',
          './src/components/BookSpread.tsx',
          './src/data/pageModel.ts',
        ],
      },
      // docs/ is prose about the app, not the app. presentation.html is edited
      // live while the reader is open, and every save of an .html file under
      // root is a full page reload — measured at eleven in seven minutes, each
      // one tearing down whatever was being verified in the browser. The
      // reader imports nothing from docs/, so ignoring it costs nothing.
      watch: { ignored: ['**/docs/**'] },
    },
  };
});
