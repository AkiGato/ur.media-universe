/*
 * Builds the talk deck's instrument bundle — see src/talkWidgets.tsx.
 *
 * Output is a CLASSIC script with its CSS inlined, because the deck must run
 * from file:// with the network off and a module script is blocked by CORS
 * there. Separate from vite.config.ts so the app's own build is untouched.
 *
 *   npm run build:talk
 */
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  /* public/ is the app's, not the deck's: copying it here dragged in the
     audio folder, the service worker and _headers. The only asset this
     bundle needs is the faces, and scripts/stamp-talk.mjs places those. */
  /* Vite substitutes process.env.NODE_ENV for an app build but not for a lib
     one, so React reached the browser still asking for  and threw
     before the first render. */
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  publicDir: false,
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    outDir: 'docs/talk-assets/widgets',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/talkWidgets.tsx',
      name: 'TalkWidgets',
      formats: ['iife'],
      fileName: () => 'widgets.js',
    },
    rollupOptions: {
      output: { assetFileNames: 'widgets.[ext]' },
    },
  },
});
