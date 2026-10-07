/*
 * THE ORGANISM FOR SHEET 1, GROWN WITH THE PROJECT'S OWN GENERATOR.
 *
 * The deck's first sheet had a network I generated in the deck itself: rays
 * off a centre, two levels deep. It read as asterisks, because that is what it
 * was. A neuron in this project is not a star — it is `dendriteMarks`: a
 * recursive arbor with meandering courses, varicosities along the two finest
 * generations, spines on the mid-distal branches and terminals that disperse
 * rather than stop.
 *
 * So this mounts `Dendrites` from src/components/figures/FigurePrimitives.tsx
 * and `Soma` from src/components/organic/Organic.tsx. Nothing is reimplemented;
 * the cells here are the cells the reader sees in the Orrery.
 *
 * The deck frames it over page-01.jpg on `screen`, so the drawn tissue adds
 * light to the photographed dandelion instead of covering it.
 */
import { useMemo } from 'react';
import { Dendrites, FigureDefs, arcSegment } from './components/figures/FigurePrimitives';

const W = 1920, H = 1080;
/* the dandelion's own core, measured off the rendered page */
const CX = 1024, CY = 420, CROWN = 140;
const SHELLS = 11;

function rng(seed: number) {
  let n = seed % 2147483647;
  if (n <= 0) n += 2147483646;
  return () => (n = (n * 16807) % 2147483647) / 2147483647;
}

interface Cell { x: number; y: number; r: number; shell: number; seed: number; phase: number; drift: number }

function grow() {
  const rand = rng(29);
  const cells: Cell[] = [];
  const COLS = 7, ROWS = 5;

  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const x = (gx + 0.5 + (rand() - 0.5) * 0.8) * (W / COLS);
      const y = (gy + 0.5 + (rand() - 0.5) * 0.8) * (H / ROWS);
      /* the flower needs air: at 1.5 crowns the arbors closed over it and the
         photograph was lost under the drawing */
      if (Math.hypot(x - CX, y - CY) < CROWN * 2.4) continue;
      /* thin the cells over the wordmark so the type stays readable (TY-05) */
      const overType = x > W * 0.40 && x < W * 0.60 && y > H * 0.68 && y < H * 0.83;
      if (overType && rand() < 0.8) continue;
      cells.push({ x, y, r: 44 + rand() * 58, shell: 0, seed: Math.floor(rand() * 9999),
        /* MO-01: idle motion is desynchronised by PHASE, not by giving each
           cell its own period - LC-05 fixes the tide at 19.7s and a second
           clock beating against it is the fault LC-03 was written to remove */
        phase: -rand() * 19.7, drift: -rand() * 51.6 });
    }
  }

  cells.sort((a, b) => Math.hypot(a.x - CX, a.y - CY) - Math.hypot(b.x - CX, b.y - CY));
  const maxD = Math.hypot(cells[cells.length - 1].x - CX, cells[cells.length - 1].y - CY);
  cells.forEach(c => {
    c.shell = Math.min(SHELLS - 1, Math.floor((Math.hypot(c.x - CX, c.y - CY) / maxD) * SHELLS));
  });

  /* links inward, plus a second so the mesh carries cycles rather than being a
     tree — OG-05: an arbor that never rejoins leaves black between branches */
  const links: Array<{ a: Cell | { x: number; y: number }; b: Cell; shell: number; bend: number }> = [];
  cells.forEach((c, i) => {
    const nearer = (i === 0 ? [{ x: CX, y: CY }] : cells.slice(0, i))
      .map(o => ({ o, d: Math.hypot(o.x - c.x, o.y - c.y) }))
      .sort((p, q) => p.d - q.d);
    nearer.slice(0, 1 + (rand() < 0.5 ? 1 : 0)).forEach(n => {
      const len = n.d || 1;
      links.push({ a: n.o, b: c, shell: c.shell, bend: (rand() < 0.5 ? -1 : 1) * len * (0.10 + rand() * 0.16) });
    });
  });

  return { cells, links };
}

export function TalkOrganism() {
  const { cells, links } = useMemo(grow, []);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
         style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
         aria-hidden="true">
      <FigureDefs id="org" blur={2.4} />
      <style>{`
        @keyframes shellIn { from { opacity: 0 } to { opacity: 1 } }
        /* the drift period is the tide through phi squared (LC-04), never a
           number of its own. Scale and a degree of rotation only: a cell that
           translates would tear its own links off their endpoints. */
        @keyframes cellDrift {
          0%,100% { transform: scale(0.955) rotate(-1.4deg) }
          50%     { transform: scale(1.06) rotate(1.6deg) }
        }
        .cell { transform-box: fill-box; transform-origin: center;
          animation: vein-breathe 19.7s ease-in-out infinite,
                     cellDrift 51.6s cubic-bezier(0.45,0.05,0.3,1) infinite }
        .shell { opacity: 0; animation: shellIn 1400ms cubic-bezier(0.45,0.05,0.3,1) forwards }
      `}</style>

      {Array.from({ length: SHELLS }, (_, sh) => (
        /* ten seconds end to end, eleven shells on a 780ms stagger */
        <g key={sh} className="shell" style={{ animationDelay: `${sh * 780}ms` }}>
          {links.filter(l => l.shell === sh).map((l, i) => (
            <path key={i} d={arcSegment(l.a.x, l.a.y, l.b.x, l.b.y, l.bend)}
                  fill="none" stroke="currentColor" strokeWidth={1.1 + (i % 3) * 0.4}
                  strokeLinecap="round" strokeOpacity={0.30} />
          ))}
          {cells.filter(c => c.shell === sh).map((c, i) => (
            <g key={i} className="cell"
               style={{ animationDelay: `${c.phase}s, ${c.drift}s` }}>
              {/* the project's own arbor: recursive, beaded, with spines */}
              <Dendrites id="org" cx={c.x} cy={c.y} r={c.r}
                         arms={7 + (i % 3)} depth={3} seed={c.seed}
                         /* depth 4 with spines put ~28k elements on one sheet against a 6.5k
                  precedent; depth 3 without them keeps the character and the budget */
                         opacity={0.62} width={0.8} spines={false} />
              {/* the cell body. Soma is an HTML component that returns its own
                  <svg>, so it cannot nest here — this is FigureDefs' own core
                  gradient, which is what the project's figures light with. */}
              <circle cx={c.x} cy={c.y} r={Math.max(5, c.r * 0.30)} fill="url(#org-core)" />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
