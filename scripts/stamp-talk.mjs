/*
 * Postbuild for the talk deck's instrument bundle.
 *
 * Two things the lib build cannot do for itself:
 *
 *  1. THE FONT PATHS ARE ABSOLUTE. src/index.css serves the faces from
 *     /fonts, which is correct for the app on a server and broken for the
 *     deck, which runs from file://. The faces are copied next to the bundle
 *     and the urls rewritten relative. Without this the instruments fall back
 *     to system fonts in the middle of a talk about typography.
 *
 *  2. THERE IS NO HOST PAGE. A lib build emits the script and the stylesheet
 *     and nothing to load them, so the frame the deck points at is written
 *     here — a classic <script>, no module, no network.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs/talk-assets/widgets');
const CSS = path.join(OUT, 'widgets.css');

if (!fs.existsSync(CSS)) {
  console.error('no widgets.css — run the build first');
  process.exit(1);
}

/* 1 · fonts beside the bundle, urls made relative */
const FONTS = path.join(OUT, 'fonts');
fs.mkdirSync(FONTS, { recursive: true });
let css = fs.readFileSync(CSS, 'utf8');
const names = [...new Set([...css.matchAll(/url\(\/fonts\/([^)]+\.woff2)\)/g)].map(m => m[1]))];
let copied = 0;
for (const n of names) {
  const src = path.join(ROOT, 'public/fonts', n);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(FONTS, n)); copied++; }
  else console.warn(`  missing face: ${n}`);
}
css = css.replace(/url\(\/fonts\//g, 'url(fonts/');
fs.writeFileSync(CSS, css);

/* 2 · the host page the deck frames */
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Instrument</title>
<meta name="color-scheme" content="dark" />
<link rel="stylesheet" href="widgets.css" />
<style>
  /* the frame is transparent: the deck's own page shows through around the
     instrument, so this never paints a panel of its own (DG-02) */
  html,body{margin:0;height:100%;background:transparent;overflow:hidden}
  /* the app renders these inside a padded reading column; edge-to-edge in a
     bare frame they touch the projector bezel */
  #root{height:100%;display:grid;align-content:center;padding:4.5vh 2.5vw}

  /* THE INSTRUMENTS HAVE TO SCALE WITH THE SHEET, AND BY THEMSELVES THEY DO
     NOT. The deck's own type is written in vw and grows with the frame — 13.1,
     19.2 and 49.2px on a 1536 screen. The app's is written in pixels, because
     the app is a reading column on a desk, so inside this frame it renders at
     a fixed 7 to 18px however large the projector is. Measured: the budget
     widget's body at 9px, the five questions down to 7px, the fragility index
     at 8.5. Two of those are not even among the three sizes TY-01 allows.

     zoom, not transform: transform would scale a laid-out box and leave it
     overflowing its frame, while zoom changes the pixel and lets the widget
     lay itself out again inside the room it has.

     THE CEILING IS THE WIDGET'S OWN LAYOUT, NOT THE TYPE SCALE. Scaling by
     --t1/9, which would put the instrument's smallest type exactly on the
     deck's smallest, is 1.45 at 1536 — and zoom buys legibility by taking
     layout width away, so at 1.45 the budget widget has a quarter less room
     than it was built for and starts eliding its own cells: "A MEDIA CREAT…",
     "one of hundreds a pers…". A truncated label is unreadable at any size, so
     that is worse than the thing it fixes.

     Swept against the widgets, truncation starts at 1.2 and the last clean
     step is 1.15, so 1.15 at 1536 is the figure and the scale is written to
     hold the layout width constant above it — 1268 CSS px at every size. The
     side padding comes down from 6vw to 2.5vw to pay for part of it.

     Measured separately and left alone: the five-questions widget elides three
     of its own cells at EVERY scale including 1.0, with more room than it had
     before. That is the app's layout, not this frame, and it is not fixed
     here.

     It is set from script and not from CSS because it cannot be written in
     CSS: zoom takes a number and vw is a length, and clamp() will not mix the
     two — written as clamp(1.111, 0.0944vw, 1.667) the declaration is invalid
     and silently dropped, which is exactly what happened first. */
</style>
</head>
<body>
<!-- theme-dark IS NOT DECORATION. src/index.css turns every border in the app
     into a translucent hairline, and that rule is scoped to ".theme-dark *".
     Without the class the instruments fall through to Tailwind 4's default
     border colour, which is currentColor — measured in the frame, the budget
     widget drew a 1px rgb(255,255,255) rule 1352px wide under its title and
     another under its panels, two hard white lines across the sheet, against
     LY-06. The class carries no background of its own, so the frame stays
     transparent and the deck's page still shows through. -->
<div id="root" class="theme-dark"></div>
<script>
/* 1.15 at 1536, scaled to hold the widget's layout width constant above that.
   See the #root note for why the ceiling is 1.15 and why this is not a
   stylesheet rule. */
(function(){
  var r=document.getElementById('root');
  function fit(){
    r.style.zoom=Math.min(1.6, Math.max(1, innerWidth*0.000749)).toFixed(3);
  }
  fit(); addEventListener('resize', fit, {passive:true});
})();
</script>
<script src="widgets.js"></script>
</body>
</html>
`);

const js = fs.statSync(path.join(OUT, 'widgets.js')).size;
console.log(`talk widgets stamped — ${copied}/${names.length} faces, host page written, js ${(js/1024).toFixed(0)}KB`);
