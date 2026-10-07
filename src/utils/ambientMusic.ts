/**
 * The background music: three tracks, played in order, looping the set.
 *
 * One `HTMLAudioElement` rather than the Web Audio graph in `audio.ts`, because
 * that graph exists to *synthesise* a page turn from noise and this only has to
 * play a file — decoding 29MB into an AudioBuffer to gain the same volume knob
 * the element already has would be a straight loss.
 *
 * Two properties of the app it has to answer to. Nothing here cuts (MO-05), so
 * the music arrives and leaves on a ramp rather than at full level, and every
 * boundary between tracks is a fade rather than a splice. And a browser will
 * not start audible playback without a gesture, so starting is armed on the
 * first pointer or key event and re-armed if the play promise is rejected.
 */

/** 40% — the level asked for, applied as the element's linear gain. */
const TARGET_VOLUME = 0.4;

const FADE_IN_MS = 2500;
const FADE_OUT_MS = 1200;
/** Between tracks: long enough to read as a passage, short enough not to be a gap. */
const FADE_BETWEEN_MS = 1800;

/**
 * How long the map gets to itself before the first byte of music is asked for.
 *
 * The gesture that starts the music is, on a first visit, the ENTER click — the
 * exact moment the organism begins assembling. The tracks are 6–13MB and the
 * element streams them eagerly once `src` is set, so the music was competing
 * for bandwidth with the idle prefetch of the reader and the five figure worlds
 * at the one moment the reader is watching something happen.
 *
 * Nothing is lost by waiting: the music arrives on a 2.5s ramp from silence
 * anyway (MO-05 — nothing cuts), so the first second of it was inaudible by
 * design. This just stops the download from being issued during the assembly.
 *
 * MEASURED FROM WHEN THE MUSIC WAS FIRST WANTED, NOT FROM THE GESTURE. A reader
 * who studies the entry screen for half a minute has already given the map all
 * the room it needs and should hear the music the moment they enter; only a
 * reader who clicks ENTER straight away waits, and only for the remainder.
 */
const SETTLE_MS = 4000;

/* Order as given. Named `artist--title.mp3`; provenance and licences are in
   `public/audio/CREDITS.md`. Files live in `public/audio`, so they are served
   verbatim under the mount point and are never hashed into `assets/` — which
   also keeps them out of the service worker's precache (see `public/sw.js`).
   Written relative and joined to BASE_URL: an absolute `/audio/...` would ask
   the portfolio's own root for a file that lives three directories down. */
const TRACKS = [
  'audio/vilnius-hang--what-is-that.mp3',
  'audio/hang-massive--luminous-emptiness.mp3',
  'audio/aaron-ximm--blue-moon-gold-sun.mp3',
].map((name) => import.meta.env.BASE_URL + name);

type Ramp = { raf: number; backstop: number; to: number; start: number; ms: number };

let el: HTMLAudioElement | null = null;
let index = 0;
let ramp: Ramp | null = null;
let armed: (() => void) | null = null;
/** what the caller last asked for, so a late gesture or a tab return knows. */
let wanted = false;
/** when the music was first asked for — the clock `SETTLE_MS` is measured on. */
let wantedSince = 0;
/** a deferred `start`, so turning the music off can cancel one in flight. */
let settling = 0;

function cancelRamp() {
  if (ramp) {
    cancelAnimationFrame(ramp.raf);
    clearTimeout(ramp.backstop);
  }
  ramp = null;
}

/**
 * Linear ramp on the element's volume. `onDone` fires once, on arrival.
 *
 * The ramp is driven by `requestAnimationFrame` for smoothness, but rAF does
 * not run in a hidden or backgrounded tab — so a fade started there would stall
 * at whatever level it had reached and stay. A page that mounts in a background
 * tab would play its music at volume 0 forever. Hence the backstop: a timer for
 * the full duration that snaps to the target and finishes the job if the frames
 * never came. A snap nobody is looking at is not a cut anyone can hear.
 */
function fadeTo(to: number, ms: number, onDone?: () => void) {
  if (!el) return;
  cancelRamp();
  const from = el.volume;
  if (ms <= 0 || from === to) {
    el.volume = to;
    onDone?.();
    return;
  }
  const arrive = () => {
    if (!el || !ramp) return;
    cancelRamp();
    el.volume = to;
    onDone?.();
  };
  const step = (now: number) => {
    if (!el || !ramp) return;
    const t = Math.min(1, (now - ramp.start) / ramp.ms);
    if (t >= 1) {
      arrive();
      return;
    }
    el.volume = Math.max(0, Math.min(1, from + (to - from) * t));
    ramp.raf = requestAnimationFrame(step);
  };
  ramp = {
    raf: requestAnimationFrame(step),
    backstop: window.setTimeout(arrive, ms + 50),
    to,
    start: performance.now(),
    ms,
  };
}

function element(): HTMLAudioElement {
  if (el) return el;
  el = new Audio();
  el.preload = 'none';
  el.volume = 0;
  /* Not `loop`: looping is over the *set*, so the end of a track is a cue to
     advance. A single track repeating would be the metronome LC-05 is about. */
  el.addEventListener('ended', () => advance());
  /* A track that will not load must not end the music — step past it. Guarded
     against a dead playlist by the counter in `advance`. */
  el.addEventListener('error', () => { if (wanted) advance(); });
  return el;
}

let advancing = false;
function advance() {
  if (advancing) return;
  advancing = true;
  index = (index + 1) % TRACKS.length;
  const a = element();
  a.src = TRACKS[index];
  a.volume = 0;
  a.play()
    .then(() => fadeTo(TARGET_VOLUME, FADE_BETWEEN_MS))
    .catch(() => arm())
    .finally(() => { advancing = false; });
}

/** Wait for a gesture, then start. Browsers will not begin audible playback without one. */
function arm() {
  if (armed) return;
  const go = () => {
    disarm();
    if (wanted) startAfterSettle();
  };
  armed = () => {
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
  };
  window.addEventListener('pointerdown', go, { once: true });
  window.addEventListener('keydown', go, { once: true });
}

function disarm() {
  armed?.();
  armed = null;
}

/** Cancel a deferred start. Turning the music off must beat a pending timer. */
function cancelSettle() {
  if (settling) window.clearTimeout(settling);
  settling = 0;
}

/**
 * `start`, but not while the map is still assembling — see `SETTLE_MS`.
 *
 * ON DEFERRING PLAYBACK OUT OF THE GESTURE HANDLER. Chrome and Firefox treat
 * user activation as sticky for the page, so a `play()` a few seconds after the
 * click is allowed. Safari is stricter and may reject it. That path is already
 * built and already tested: `start` catches a rejected play and calls `arm()`,
 * which waits for the next pointer or key event — and a reader who has just
 * entered the map is about to pan, zoom or tap something within seconds. So the
 * worst case on a strict browser is that the music begins on the next touch
 * rather than this one, which is the same behaviour the app already had for
 * anyone whose first gesture was not a trusted one.
 */
function startAfterSettle() {
  cancelSettle();
  const waited = wantedSince ? performance.now() - wantedSince : SETTLE_MS;
  const left = Math.max(0, SETTLE_MS - waited);
  if (left === 0) {
    start();
    return;
  }
  settling = window.setTimeout(() => {
    settling = 0;
    if (wanted) start();
  }, left);
}

function start() {
  /* Opened in a background tab, the music would play to nobody until the tab
     was closed. Wait instead — two independent things will start it: the
     visibility binding when the tab is looked at, and the armed gesture, since
     a pointer or key event cannot reach a tab that is not on screen anyway. */
  if (document.visibilityState === 'hidden') {
    arm();
    return;
  }
  const a = element();
  if (!a.src) a.src = TRACKS[index];
  a.volume = 0;
  a.play()
    .then(() => fadeTo(TARGET_VOLUME, FADE_IN_MS))
    .catch(() => arm());
}

/**
 * Turn the music on or off. Idempotent — safe to call on every render of a
 * preference, which is how `App` uses it.
 */
export function setAmbientMusic(on: boolean) {
  wanted = on;
  if (on) {
    /* The settle clock starts the first time the music is wanted at all, which
       on a default-on preference is the app's own start — so the wait is spent
       on the entry screen and is usually over before ENTER is clicked. */
    if (!wantedSince) wantedSince = performance.now();
    if (el && !el.paused) {
      fadeTo(TARGET_VOLUME, FADE_BETWEEN_MS);
      return;
    }
    startAfterSettle();
    return;
  }
  /* Off must beat a start that is merely pending: without this, switching the
     music off during the settle window would be undone by the timer. */
  cancelSettle();
  disarm();
  if (!el || el.paused) return;
  fadeTo(0, FADE_OUT_MS, () => el?.pause());
}

/**
 * A backgrounded tab keeps playing by default, and sound coming from a tab
 * nobody is looking at is exactly the attention the dossier argues against.
 * The position is kept, so returning resumes rather than restarts.
 */
export function bindAmbientMusicToVisibility(): () => void {
  const onChange = () => {
    if (!wanted) return;
    if (document.visibilityState === 'hidden') {
      if (!el) return;
      cancelRamp();
      el.pause();
      return;
    }
    /* `el` is null when the app mounted hidden and `start` declined to play.
       Either way the first visible moment is where the music begins — through
       the settle gate, which is already spent by the time a tab is returned to
       and so only matters for a tab made visible within the first seconds. */
    if (!el || el.paused) {
      startAfterSettle();
      return;
    }
    // Playing, but a ramp was interrupted or never ran. Bring it to level.
    if (el.volume !== TARGET_VOLUME) fadeTo(TARGET_VOLUME, FADE_BETWEEN_MS);
  };
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
