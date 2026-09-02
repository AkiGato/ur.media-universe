import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
            if (id.includes('lucide-react')) return 'vendor-icons';
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
    },
  };
});
