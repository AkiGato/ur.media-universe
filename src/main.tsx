import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for offline capability
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    // Mounted under BASE_URL, not at the origin root: inside the portfolio the
    // worker lives at /projects/mediauniverse/sw.js, and a worker registered
    // from there with the default scope may only control that subtree anyway.
    // Naming the scope says so rather than relying on the default.
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch((err) => {
      console.log('SW registration failed: ', err);
    });
  });
}

/*
 * Start fetching the map in parallel with mounting, not after it.
 *
 * The Orrery is a lazy chunk, so its request was only issued once App rendered
 * and React reached the Suspense boundary — a waterfall of entry → parse →
 * render → fetch → parse → paint. It is also the one chunk every single visit
 * needs, because the map is the front door. Kicking the import off here costs
 * nothing (it is the same request, moved earlier) and removes a whole round
 * trip from the critical path. The chunk stays split, so the reader and the
 * figures are still not in it.
 */
void import('./components/Orrery');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/*
 * Retire the boot cell once the real organism is on screen.
 *
 * Two rAF ticks put us on the far side of the first real paint, so the handoff
 * is a thickening of the same shape rather than a swap. But rAF does not run in
 * a tab that is not compositing — a link opened in a background tab, a window
 * behind another — and the reader would then return to a finished map with the
 * boot mark still laid over it, permanently, because the callback never fired.
 *
 * So: whichever of the paint signal and a wall-clock fallback arrives first
 * wins, and the removal is idempotent. A visible tab gets the frame-accurate
 * handoff; a hidden one gets the app it came back for.
 */
function retireBootMark() {
  const boot = document.getElementById('boot');
  if (!boot || boot.classList.contains('done')) return;
  boot.classList.add('done');
  boot.addEventListener('transitionend', () => boot.remove(), { once: true });
  // transitionend never fires on a hidden tab either — do not depend on it
  window.setTimeout(() => boot.remove(), 1200);
}

requestAnimationFrame(() => requestAnimationFrame(retireBootMark));
window.setTimeout(retireBootMark, 1500);

