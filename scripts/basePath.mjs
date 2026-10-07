/**
 * Where this copy of the app is mounted, as one value with one spelling.
 *
 * The dossier is served from the root of its own domain and from
 * `/projects/mediauniverse/` inside the portfolio, and three separate things
 * have to agree about which: Vite's `base` (the asset URLs it writes into the
 * shell and the stylesheet), the service worker (its scope, its shell URL and
 * every precached path), and the `_headers` cache policy, whose rules are
 * matched against the request path and silently match nothing if the prefix is
 * wrong. Vite processes the first and neither of the other two, so the value
 * is read from the environment here and all three are stamped from it.
 *
 *   BASE_PATH unset   → '/'                        (npm run build, build:web)
 *   BASE_PATH=x/y     → '/x/y/'                    (npm run build:portfolio)
 *
 * Normalised in one place on purpose: Vite joins the base onto asset names by
 * plain concatenation, so a base missing its trailing slash emits
 * `/projectsassets/index.js` — a build that completes, uploads, and 404s.
 */
export function normaliseBase(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '/') return '/';
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}

/** The base this build was asked for. */
export function basePath() {
  return normaliseBase(process.env.BASE_PATH);
}
