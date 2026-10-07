// Records one clip per instrument: the four places the dossier hands the
// reader something to run rather than something to read.
//
// Same machinery as record-architecture.mjs — a Chrome you already have,
// driven over CDP, no dependencies. Each tool is reached the way a reader
// reaches it: the map cell for the figure that applies it, then the passage
// out of that figure world. The causal taxonomy ends in its own instrument,
// so its figure world IS the clip.
//
// Nothing in src/ is touched, and the captions are injected at runtime —
// TY-04 forbids this copy in the product.
//
// Run:   node scripts/video/record-tools.mjs [url] [--only=five-questions] [--show]
//        node scripts/video/record-tools.mjs --probe     (list each tool's controls)
// Out:   build/video/<tool>/frames/*.jpg + frames.txt

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, createWriteStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ARGS = process.argv.slice(2);
const TARGET_URL = ARGS.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000/';
const HEADED = ARGS.includes('--show');
const PROBE = ARGS.includes('--probe');
const ONLY = ARGS.find((a) => a.startsWith('--only='))?.slice(7);
const PORT = 9222;

/* The four instruments, each with the figure that applies it (relations.ts,
   toolOfFigure) and the controls a clip should exercise. A step that finds
   nothing is skipped — the instruments differ, and a missing control is not a
   failed recording. */
const TOOLS = [
  {
    id: 'five-questions',
    name: 'The Five Questions',
    line: 'A gate, not a score. Five questions, answered before anything ships.',
    figure: 'Three Cognitive Postures',
    steps: ['Clears', 'Question 2', 'Clears', 'Question 3', 'Fails']
  },
  {
    id: 'content-budget',
    name: 'The Content Budget',
    line: 'Attention is finite, so the budget is spent rather than filled.',
    figure: 'The Fragility Index',
    steps: []
  },
  {
    id: 'restoration-delta',
    name: 'The Restoration Delta',
    line: 'What a reader leaves with, measured against what they arrived with.',
    figure: 'The Metric Lotus',
    steps: ['4#2', '2#8', '5#14']
  },
  {
    id: 'causal-taxonomy',
    name: 'The Causal Taxonomy',
    line: 'The figure ends in its own instrument — it runs on a source you paste in.',
    figure: 'Causal Taxonomy',
    carriesItsOwn: true,
    steps: []
  }
];

/* 1 — Chrome -------------------------------------------------------------- */

const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) { console.error('No Chrome found. Set CHROME=<path>.'); process.exit(1); }

const profile = join(tmpdir(), `mu-tools-${Date.now()}`);
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  ...(HEADED ? [] : ['--headless=new']),
  '--window-size=1920,1080', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--no-first-run', '--no-default-browser-check',
  'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let page;
for (let i = 0; i < 80; i += 1) {
  try { page = (await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())).find((t) => t.type === 'page'); if (page) break; } catch {}
  await sleep(250);
}
if (!page) { chrome.kill(); throw new Error('Chrome never answered on the debugging port.'); }

/* 2 — the protocol -------------------------------------------------------- */

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0;
const pending = new Map();
const handlers = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    if (m.error) p.rej(new Error(m.error.message)); else p.res(m.result);
  } else if (m.method && handlers.has(m.method)) handlers.get(m.method)(m.params);
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = (seq += 1); pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(`${exceptionDetails.text} — ${expression.slice(0, 70)}`);
  return result.value;
};
const sel = (s) => JSON.stringify(s);

const waitFor = async (s, ms = 20000) => {
  for (let i = 0; i < ms / 250; i += 1) {
    if (await evaluate(`!!document.querySelector(${sel(s)})`)) return true;
    await sleep(250);
  }
  return false;
};

const pointIn = (s) => evaluate(`(() => {
  const el = document.querySelector(${sel(s)});
  if (!el) return null;
  const hit = el.querySelector && el.querySelector('circle') ? el.querySelector('circle') : el;
  const r = hit.getBoundingClientRect();
  return (r.width || r.height) ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
})()`);

/* Two figure cells on the map can sit on top of each other — measured at
   1920x1080, Postures (1386, 522) and Withdrawal (1374, 523) both carry a 34px
   hit radius. Where the real pointer would open the wrong world, the click is
   dispatched on the intended cell; the mouse is already there, so the hover the
   camera sees is still the right one. */
const click = async (s) => {
  if (!(await waitFor(s, 8000))) return false;
  const p = await pointIn(s);
  if (!p) return false;
  const at = { x: p.x, y: p.y, button: 'left', clickCount: 1 };
  await send('Input.dispatchMouseEvent', { ...at, type: 'mouseMoved' });
  await sleep(240);
  const top = await evaluate(`(() => { const el = document.querySelector(${sel(s)});
    const h = document.elementFromPoint(${p.x}, ${p.y});
    return !!(el && h && (el === h || el.contains(h))); })()`);
  if (top) {
    await send('Input.dispatchMouseEvent', { ...at, type: 'mousePressed' });
    await send('Input.dispatchMouseEvent', { ...at, type: 'mouseReleased' });
  } else {
    await evaluate(`(() => { const el = document.querySelector(${sel(s)});
      const h = el.querySelector && el.querySelector('circle') ? el.querySelector('circle') : el;
      h.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: ${p.x}, clientY: ${p.y} })); })()`);
  }
  return true;
};

/**
 * Click a control inside the open stage by its visible text.
 *
 * `"4#2"` means the second control reading "4" — the restoration delta is five
 * scales of 1-5, so its labels are only unique together with their position.
 */
const clickLabel = async (step) => {
  const [text, nth = '1'] = step.split('#');
  const p = await evaluate(`(() => {
    const stage = document.querySelector('[role="dialog"]');
    if (!stage) return null;
    const all = [...stage.querySelectorAll('button, [role="button"]')]
      .filter((b) => b.offsetParent !== null && b.textContent.trim().toLowerCase() === ${sel(text.toLowerCase())});
    const el = all[${Number(nth) - 1}];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return (r.width || r.height) ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  })()`);
  if (!p) return false;
  const at = { x: p.x, y: p.y, button: 'left', clickCount: 1 };
  await send('Input.dispatchMouseEvent', { ...at, type: 'mouseMoved' });
  await sleep(300);
  await send('Input.dispatchMouseEvent', { ...at, type: 'mousePressed' });
  await send('Input.dispatchMouseEvent', { ...at, type: 'mouseReleased' });
  return true;
};

/* 3 — captions ------------------------------------------------------------ */

const CAPTION_CSS = `
  #cap { position: fixed; left: 72px; bottom: 68px; z-index: 2147483647;
         pointer-events: none; color: #fff; max-width: 980px; font-weight: 300;
         text-shadow: 0 0 24px rgba(0,0,0,.9);
         opacity: 0; transition: opacity .55s cubic-bezier(0.45, 0.05, 0.3, 1); }
  #cap.on { opacity: 1; }
  #cap .k { font-family: 'IBM Plex Sans', system-ui, sans-serif !important;
            font-size: 13px; text-transform: uppercase; letter-spacing: 0.2em; opacity: .45; }
  #cap .l { font-family: 'Newsreader', Georgia, serif !important;
            font-size: 38px; line-height: 1.16; margin-top: 14px; }
  #cap-tick { position: fixed; top: -8px; left: -8px; height: 1px; opacity: 0; pointer-events: none; }
`;

const installCaptions = () => evaluate(`(() => {
  if (document.getElementById('cap')) return;
  const style = document.createElement('style');
  style.textContent = ${JSON.stringify(CAPTION_CSS)};
  const box = document.createElement('div');
  box.id = 'cap';
  box.innerHTML = '<div class="k"></div><div class="l"></div>';
  document.head.append(style); document.body.append(box);
  /* Page.screencastFrame only fires on a main-frame commit, and a surface at
     rest here is CSS animation on the compositor — without this the capture
     goes quiet for seconds at a time. */
  const tick = document.createElement('div'); tick.id = 'cap-tick'; document.body.append(tick);
  let n = 0;
  const beat = () => { tick.style.width = (1 + (n += 1) % 2) + 'px'; requestAnimationFrame(beat); };
  requestAnimationFrame(beat);
  window.__cue = (k, l) => { const e = document.getElementById('cap'); e.classList.remove('on');
    setTimeout(() => { e.querySelector('.k').textContent = k; e.querySelector('.l').textContent = l;
      e.classList.add('on'); }, 560); };
  window.__cueOut = () => document.getElementById('cap').classList.remove('on');
})()`);

const cue = async (k, l) => {
  await installCaptions();
  await evaluate(`window.__cue(${JSON.stringify(k)}, ${JSON.stringify(l)})`);
};

/* 4 — capture ------------------------------------------------------------- */

let writer = null;
handlers.set('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
  if (writer) {
    writer.count += 1;
    const name = `f${String(writer.count).padStart(5, '0')}.jpg`;
    writeFileSync(join(writer.dir, name), Buffer.from(data, 'base64'));
    if (writer.prevName) {
      writer.list.write(`file '${writer.prevName}'\nduration ${Math.max(0.008, metadata.timestamp - writer.prevAt).toFixed(4)}\n`);
    }
    writer.prevName = name;
    writer.prevAt = metadata.timestamp;
  }
  try { await send('Page.screencastFrameAck', { sessionId }); } catch {}
});

const startClip = async (id) => {
  const dir = join(process.cwd(), 'build', 'video', id, 'frames');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const list = createWriteStream(join(dir, 'frames.txt'));
  list.write('ffconcat version 1.0\n');
  writer = { dir, list, count: 0, prevName: null, prevAt: null };
  await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
};

const endClip = async () => {
  await send('Page.stopScreencast');
  await sleep(400);
  const w = writer;
  writer = null;
  if (w.prevName) w.list.write(`file '${w.prevName}'\nduration 0.1\nfile '${w.prevName}'\n`);
  await new Promise((res) => w.list.end(res));
  return w.count;
};

/* 5 — the walk ------------------------------------------------------------ */

/**
 * Back to the map between clips.
 *
 * Escape closes a stage and leaves the reader on the page beneath, and that
 * page carries its own `Open the figure: …` passage — so waiting on that
 * selector alone reports success on the wrong surface, and the next clip
 * records the previous figure. The map is identified by `Reset view`, which
 * exists nowhere else, and reached by the header's own control.
 */
const onMap = () => evaluate(`!!document.querySelector('[aria-label="Reset view"]')`);

const toMap = async () => {
  for (let i = 0; i < 4 && !(await onMap()); i += 1) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(1000);
    if (await onMap()) break;
    await click('[aria-label="Return to map"]');
    await sleep(1600);
  }
  if (!(await onMap())) throw new Error('could not get back to the map');
  await waitFor('[aria-label^="Open the figure"]');
  await sleep(900);
};

await send('Page.navigate', { url: TARGET_URL });
await sleep(2500);
await evaluate(`localStorage.setItem('media_universe_map_gesture_v1','1')`);
await send('Page.reload');
await sleep(3400);
await installCaptions();
await click('[title="Open the orientation map"]');
await waitFor('[aria-label^="Open the figure"]');
await sleep(1500);

for (const tool of TOOLS) {
  if (ONLY && ONLY !== tool.id) continue;

  /* A clip of the wrong surface is worse than no clip — every step that could
     silently land somewhere else is checked. */
  if (!(await onMap())) throw new Error(`${tool.id}: not on the map`);
  if (!(await click(`[aria-label^="Open the figure: ${tool.figure}"]`))) {
    throw new Error(`${tool.id}: no map cell for ${tool.figure}`);
  }
  if (!(await waitFor('[role="dialog"][aria-label^="Figure:"]'))) {
    throw new Error(`${tool.id}: the figure world never opened`);
  }
  await sleep(1800);

  if (!tool.carriesItsOwn) {
    await click('[aria-label="Put this to work"]');
    if (!(await waitFor('[aria-label="Passages out of the instrument"]'))) {
      throw new Error(`${tool.id}: the instrument never opened`);
    }
    await sleep(1600);
  }

  if (PROBE) {
    console.log(`\n${tool.id}:`, await evaluate(`JSON.stringify([...document.querySelectorAll('[role="dialog"]')]
      .flatMap((d) => [...d.querySelectorAll('button, [role="button"], input, textarea, select')])
      .filter((b) => b.offsetParent !== null)
      .map((b) => (b.textContent || '').trim().slice(0, 28) || b.tagName + ':' + (b.getAttribute('placeholder') || b.getAttribute('aria-label') || ''))
      .slice(0, 24))`));
    await toMap();
    continue;
  }

  await startClip(tool.id);
  await sleep(700);
  await cue(tool.name, tool.line);
  await sleep(4200);

  for (const step of tool.steps) {
    if (await clickLabel(step)) await sleep(1700);
  }
  await sleep(2200);
  await evaluate('window.__cueOut()');
  await sleep(1200);
  const frames = await endClip();
  console.log(`${tool.id}: ${frames} frames → build/video/${tool.id}/frames`);

  await toMap();
}

/* 6 — close out ----------------------------------------------------------- */

ws.close();
chrome.kill();
// Windows holds the profile's handles for a moment after the process goes.
for (let i = 0; i < 10; i += 1) {
  try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(300); }
}
if (!PROBE) {
  console.log('\nEncode each with:');
  console.log('ffmpeg -y -f concat -safe 0 -i "build/video/<tool>/frames/frames.txt" \\');
  console.log('  -vf "fps=30,format=yuv420p" -c:v libx264 -crf 18 "build/video/<tool>.mp4"');
}
