import { handleReport } from './brevoReport.mjs';

/**
 * The adapter, and it is the whole of the framework-specific code.
 *
 * Mounted on both `configureServer` (npm run dev) and `configurePreviewServer`
 * (npm run preview), because a route that exists in development and vanishes
 * in the preview is a route nobody has actually tested. The logic itself lives
 * in `brevoReport.mjs` and knows nothing about Vite.
 *
 * TO PUT THIS ON A REAL HOST, this file is what gets replaced — an Express
 * route, a serverless handler, a worker `fetch` — and `handleReport` is what
 * gets kept. It takes a parsed body and returns `{ status, json }`.
 */
const MAX_BODY = 64 * 1024;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      /* A body cap before parsing, not after: the point is to stop reading, not
         to notice afterwards that too much was read. */
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(new Error('body is not JSON')); }
    });
    req.on('error', reject);
  });
}

const send = (res, status, json) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  /* No caching of a POST response, and nothing here is cross-origin: the form
     is served from the same origin as this route, so no CORS header is set.
     Adding one would open the endpoint to any page on the internet. */
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(json));
};

const middleware = async (req, res, next) => {
  if (!req.url || !req.url.startsWith('/api/report')) return next();
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Use POST.' });

  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return send(res, 400, { ok: false, error: 'The report could not be read.' });
  }

  try {
    const { status, json } = await handleReport(body);
    send(res, status, json);
  } catch (err) {
    /* The reason stays in the server log. The browser gets a sentence a person
       can act on and nothing about the account or the upstream service. */
    console.error('[report] unhandled', err);
    send(res, 500, { ok: false, error: 'Something went wrong sending the report.' });
  }
};

export function reportRoute() {
  return {
    name: 'report-route',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); }
  };
}
