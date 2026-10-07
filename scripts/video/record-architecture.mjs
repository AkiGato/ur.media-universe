// Records the architecture walkthrough: the map, a figure world, the
// instrument that figure applies, and back to the map.
//
// Dependency free on purpose — scripts/README.md says no headless browser is
// installed for the runtime audits, and that holds here too. This drives a
// Chrome you already have over the DevTools protocol (Node's global WebSocket,
// Node 22+), captures a screencast as JPEG frames, and writes an ffmpeg concat
// list carrying each frame's real duration, so the timing in the file is the
// timing the browser actually produced rather than a guessed frame rate.
//
// The on-screen captions are injected by this script at runtime. They are not
// app copy and must never move into src/ — TY-04 forbids a caption in the
// product; a video asset is a different surface.
//
// Run:  node scripts/video/record-architecture.mjs [url] [--show]
//       node scripts/video/record-architecture.mjs https://u-r-mediauniverse.netlify.app/
// Out:  build/video/frames/*.jpg + frames.txt, then the ffmpeg line it prints.

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, createWriteStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ARGS = process.argv.slice(2);
const TARGET_URL = ARGS.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000/';
const HEADED = ARGS.includes('--show');
const OUT = join(process.cwd(), 'build', 'video');
const FRAMES = join(OUT, 'frames');
const PORT = 9222;

/* 1 — Chrome -------------------------------------------------------------- */

const CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
].filter(Boolean);
const CHROME = CANDIDATES.find((p) => existsSync(p));
if (!CHROME) {
  console.error('No Chrome found. Set CHROME=<path to the chrome executable>.');
  process.exit(1);
}

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
const profile = join(tmpdir(), `mu-capture-${Date.now()}`);

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  ...(HEADED ? [] : ['--headless=new']),
  '--window-size=1920,1080',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  // Without these the renderer is throttled while nothing has focus, and the
  // screencast goes quiet for seconds at a time.
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let page;
for (let i = 0; i < 80; i += 1) {
  try {
    const open = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
    page = open.find((t) => t.type === 'page');
    if (page) break;
  } catch { /* port not up yet */ }
  await sleep(250);
}
if (!page) { chrome.kill(); throw new Error('Chrome never answered on the debugging port.'); }

/* 2 — the protocol -------------------------------------------------------- */

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let seq = 0;
const pending = new Map();
const handlers = new Map();

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
  } else if (msg.method && handlers.has(msg.method)) {
    handlers.get(msg.method)(msg.params);
  }
};

const send = (method, params = {}) => new Promise((res, rej) => {
  const id = (seq += 1);
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
const on = (method, fn) => handlers.set(method, fn);

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
});

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true
  });
  if (exceptionDetails) throw new Error(`${exceptionDetails.text} — ${expression.slice(0, 70)}`);
  return result.value;
};

const sel = (s) => JSON.stringify(s);

/* A map cell is a <g> with pointer-events: none over a transparent hit circle
   that has pointer-events: auto (Orrery.tsx), so the centre of the group's box
   is not necessarily clickable. Aim at the circle when there is one. */
const pointIn = (s) => evaluate(`(() => {
  const el = document.querySelector(${sel(s)});
  if (!el) return null;
  const hit = el.querySelector && el.querySelector('circle') ? el.querySelector('circle') : el;
  const r = hit.getBoundingClientRect();
  return (r.width || r.height) ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
})()`);

const waitFor = async (s, ms = 20000) => {
  for (let i = 0; i < ms / 250; i += 1) {
    if (await evaluate(`!!document.querySelector(${sel(s)})`)) return;
    await sleep(250);
  }
  throw new Error(`never appeared: ${s}`);
};

/** Is the target actually the topmost thing under that point? */
const topmostIs = (s, p) => evaluate(`(() => {
  const el = document.querySelector(${sel(s)});
  const hit = document.elementFromPoint(${p.x}, ${p.y});
  return !!(el && hit && (el === hit || el.contains(hit)));
})()`);

const click = async (s) => {
  await waitFor(s);
  const p = await pointIn(s);
  if (!p) throw new Error(`no box: ${s}`);
  const at = { x: p.x, y: p.y, button: 'left', clickCount: 1 };
  await send('Input.dispatchMouseEvent', { ...at, type: 'mouseMoved' });
  await sleep(240);                            // let the cell's hover state settle

  /* Two figure cells on the map can overlap — measured at 1920x1080, the
     Postures cell sits at (1386, 522) and Withdrawal at (1374, 523), both with
     a 34px hit radius, so a pointer aimed at one lands on whichever paints
     last. Where the real pointer would open the wrong world, the click is
     dispatched on the intended cell instead; the mouse has already been moved
     there, so the hover the camera sees is still the right one. */
  if (await topmostIs(s, p)) {
    await send('Input.dispatchMouseEvent', { ...at, type: 'mousePressed' });
    await send('Input.dispatchMouseEvent', { ...at, type: 'mouseReleased' });
  } else {
    await evaluate(`(() => {
      const el = document.querySelector(${sel(s)});
      const hit = el.querySelector && el.querySelector('circle') ? el.querySelector('circle') : el;
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: ${p.x}, clientY: ${p.y} }));
    })()`);
  }
};

/* 3 — the caption layer --------------------------------------------------- */

const CAPTION_CSS = `
  #cap { position: fixed; left: 72px; bottom: 68px; z-index: 2147483647;
         pointer-events: none; color: #fff; max-width: 980px;
         font-weight: 300; text-shadow: 0 0 24px rgba(0,0,0,.9);
         opacity: 0; transition: opacity .55s cubic-bezier(0.45, 0.05, 0.3, 1); }
  #cap.on { opacity: 1; }
  /* index.css sets the sans on every div with !important, so the title face
     here has to answer in kind — same two families as the app, nothing new. */
  #cap .k, #cap .c { font-family: 'IBM Plex Sans', system-ui, sans-serif !important; }
  #cap .k { font-size: 13px; text-transform: uppercase; letter-spacing: 0.2em; opacity: .45; }
  #cap .l { font-family: 'Newsreader', Georgia, serif !important;
            font-size: 40px; line-height: 1.16; margin-top: 14px; }
  #cap .c { font-size: 15px; letter-spacing: 0.02em; opacity: .62; margin-top: 18px; white-space: pre-line; }
  #cap-tick { position: fixed; top: -8px; left: -8px; height: 1px; opacity: 0; pointer-events: none; }
`;

const installCaptions = () => evaluate(`(() => {
  if (document.getElementById('cap')) return;
  const style = document.createElement('style');
  style.textContent = ${JSON.stringify(CAPTION_CSS)};
  const box = document.createElement('div');
  box.id = 'cap';
  box.innerHTML = '<div class="k"></div><div class="l"></div><div class="c"></div>';
  document.head.append(style);
  document.body.append(box);

  /* Page.screencastFrame only fires on a main-frame commit. The map at rest is
     entirely CSS animation on the compositor, so a still stretch of it emits no
     frames at all and the concat list holds one image for the whole beat —
     measured at 22.5s of frozen map on the first capture. This forces a layout
     every rAF off-screen, which costs nothing visible and keeps the capture at
     the browser's own frame rate. */
  const tick = document.createElement('div');
  tick.id = 'cap-tick';
  document.body.append(tick);
  let n = 0;
  const beat = () => { tick.style.width = (1 + (n += 1) % 2) + 'px'; requestAnimationFrame(beat); };
  requestAnimationFrame(beat);
  window.__cue = (k, l, c) => {
    const e = document.getElementById('cap');
    e.classList.remove('on');
    setTimeout(() => {
      e.querySelector('.k').textContent = k;
      e.querySelector('.l').textContent = l;
      e.querySelector('.c').textContent = c || '';
      e.classList.add('on');
    }, 560);
  };
  window.__cueOut = () => document.getElementById('cap').classList.remove('on');
})()`);

const cue = async (k, l, c = '') => {
  await installCaptions();   // the stages portal to <body>; the layer outlives them, but cheap to assert
  await evaluate(`window.__cue(${JSON.stringify(k)}, ${JSON.stringify(l)}, ${JSON.stringify(c)})`);
};

/* 4 — frames -------------------------------------------------------------- */

const list = createWriteStream(join(FRAMES, 'frames.txt'));
list.write('ffconcat version 1.0\n');
let count = 0;
let prevName = null;
let prevAt = null;

on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
  count += 1;
  const name = `f${String(count).padStart(5, '0')}.jpg`;
  writeFileSync(join(FRAMES, name), Buffer.from(data, 'base64'));
  const at = metadata.timestamp;
  if (prevName !== null) {
    list.write(`file '${prevName}'\nduration ${Math.max(0.008, at - prevAt).toFixed(4)}\n`);
  }
  prevName = name;
  prevAt = at;
  try { await send('Page.screencastFrameAck', { sessionId }); } catch { /* shutting down */ }
});

/* 5 — the walkthrough ----------------------------------------------------- */

const POSTURES = '[aria-label^="Open the figure: Three Cognitive Postures"]';

await send('Page.navigate', { url: TARGET_URL });
await sleep(2500);
// The map's one-shot gesture hint is a first-visit affordance, not part of the
// architecture being shown. Mark it learned, then reload into a clean map.
await evaluate(`localStorage.setItem('media_universe_map_gesture_v1','1')`);
await send('Page.reload');
await sleep(3400);
await installCaptions();

/* Enter, and let the organism finish arriving, BEFORE the camera starts.
   The map takes about ten seconds to bake its tissue on a cold load, and
   capturing that put twelve seconds of a static entry screen at the head of a
   forty-second asset. The walkthrough opens on the map, built. */
await click('[title="Open the orientation map"]');
await waitFor(POSTURES);
await sleep(1500);

await send('Page.startScreencast', {
  format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1
});

// Beat 1 — the map is the graph
await sleep(900);
await cue(
  'One list of edges',
  'The map is not a picture of the book. It is the graph.',
  'src/data/relations.ts   ·   70 nodes   ·   88 edges   ·   5 verbs'
);
await sleep(5200);

// Beat 2 — a node opens a world
await cue(
  'argues  ·  9 of 88',
  'A chapter argues a figure, so pressing the figure opens it.',
  'chapter:iii   —argues→   figure:media-universe'
);
await sleep(3400);
await click(POSTURES);
await waitFor('[role="dialog"][aria-label^="Figure:"]');
await sleep(3800);

// Beat 3 — the one edge that is not more reading
await cue(
  'applies  ·  18 of 88',
  'One edge leads on — to the instrument the figure puts to work.',
  'figure:media-universe   —applies→   tool:five-questions'
);
await sleep(4200);
await click('[aria-label="Put this to work"]');
await sleep(700);
await waitFor('[aria-label="Passages out of the instrument"]');
await sleep(4000);

// Beat 4 — the graph is checked rather than trusted
await cue(
  'Checked, not trusted',
  'Every edge is walked by the build. A dangling one fails it.',
  'npm run lint\naudit-relations: clean — 88 edges, 9 figures, 19 sources, 70 sheets round-trip'
);
await sleep(4600);
await click('[aria-label="Return to the orientation map"]');
await sleep(2300);
await evaluate('window.__cueOut()');
await sleep(1700);

/* 6 — close out ----------------------------------------------------------- */

await send('Page.stopScreencast');
await sleep(400);
if (prevName !== null) {
  // concat needs a duration for the last frame, and the final `file` line is
  // what ffmpeg actually holds on screen for it.
  list.write(`file '${prevName}'\nduration 0.1\nfile '${prevName}'\n`);
}
await new Promise((res) => list.end(res));
ws.close();
chrome.kill();
// Windows holds the profile's handles for a moment after the process goes, and
// a failed temp-dir sweep is not a failed recording.
for (let i = 0; i < 10; i += 1) {
  try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(300); }
}

console.log(`\n${count} frames → ${FRAMES}\n`);
console.log('ffmpeg -y -f concat -safe 0 -i "build/video/frames/frames.txt" \\');
console.log('  -vf "fps=30,format=yuv420p" -c:v libx264 -crf 18 -movflags +faststart \\');
console.log('  "build/video/architecture.mp4"\n');
