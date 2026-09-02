// Offline strategy
//   - Navigations: network-first, falling back to the cached shell. A deploy must
//     never be shadowed by a stale index.html pointing at deleted asset hashes.
//   - Everything else (hashed JS/CSS/fonts): cache-first, and a miss POPULATES the
//     cache. The previous handler only revalidated entries that were already there,
//     so the build output never entered the cache and offline was a blank page.
// CACHE_VERSION is rewritten at build time by scripts/stamp-sw.mjs.
const CACHE_VERSION = 'dev';
const CACHE_NAME = `media-as-universe-${CACHE_VERSION}`;
const SHELL_URL = '/index.html';
const ASSETS_TO_CACHE = ['/', SHELL_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.map((n) => (n === CACHE_NAME ? undefined : caches.delete(n))))
      )
      .then(() => self.clients.claim())
  );
});

// Precached entries are fetched by the worker (no Origin header); the page then
// asks for the same files as CORS module scripts (Origin set). Servers that send
// `Vary: Origin` — vite preview does — make those two look like different
// entries, so a cache-first hit silently misses and the app boots to a blank
// page offline. The keys here are content-hashed and immutable, so varying on
// Origin buys nothing: ignore it.
const MATCH_OPTS = { ignoreVary: true };

function fromCache(request) {
  return caches.match(request, MATCH_OPTS);
}

function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') return response;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The background music is ~29MB across three files — two orders of magnitude
  // more than the whole shell. Caching it would evict the app itself under a
  // storage quota, so the offline promise stays about the dossier: the reading
  // works with no network, the music does not. (Range requests come back 206
  // and putInCache already refuses those, but a browser that asks for a whole
  // file gets a 200, so the skip has to be explicit.)
  if (url.pathname.startsWith('/audio/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => putInCache(request, res))
        .catch(() => fromCache(SHELL_URL).then((r) => r || fromCache('/')))
    );
    return;
  }

  event.respondWith(
    fromCache(request).then((cached) => {
      if (cached) {
        // Refresh in the background; the reader still gets the cached copy now.
        fetch(request).then((res) => putInCache(request, res)).catch(() => {});
        return cached;
      }
      // A miss offline must not reject — an unhandled rejection here surfaces as
      // a hard network error on the element that asked for the file.
      return fetch(request)
        .then((res) => putInCache(request, res))
        .catch(() => fromCache(request).then((r) => r || Response.error()));
    })
  );
});
