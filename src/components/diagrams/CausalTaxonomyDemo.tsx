import React, { useEffect, useRef, useState } from 'react';
import { LivingFigure, FigureNode, FigureEdge } from '../figures/LivingFigure';
import { analyse, fetchSource, Analysis } from '../../data/causalAnalysis';
import { research, storedKey, storeKey, haveKey } from '../../data/causalResearch';

/**
 * FIG 3.1, turned on a source the reader brings.
 *
 * The same figure and the same routine — a bright surface cell over three
 * registers, each terminating in its findings. Nothing here draws anything of
 * its own; it builds the node list the taxonomy already knows how to render, so
 * the reader's article arrives as the same organism the chapter argued with.
 *
 * Two depths of answer:
 *
 *   READ      a lexicon in the browser, free, offline, nothing sent anywhere.
 *             It can see the System 1 levers, because those are properties of
 *             the prose. It cannot see who owns the outlet, so it asks.
 *   RESEARCH  the same taxonomy handed to a model with a search tool, which can
 *             answer the two registers the lexicon can only ask about.
 *
 * The honesty is the feature in both. A finding that was *detected* is drawn lit
 * and quotes the sentence that produced it; one that was *researched* is drawn
 * brightest and carries the URL it was established at; one that is only the
 * register's *question* is drawn dim and says so. Filling the dim ones in with
 * confident invention would be a working instance of the thing this chapter
 * diagnoses, which is the one failure mode not available to it.
 */

const ID = 'fig-taxonomy-live';

const SURFACE_Y = 58;
const ROOT_Y = 148;
const ROOT_X = [168, 400, 632];

/** the three modes, as light: established > quoted > asked */
const LIT: Record<string, number> = { researched: 1, detected: 0.8, question: 0.3 };

function buildNodes(a: Analysis): FigureNode[] {
  return [
    {
      id: 'headline',
      kind: 'core',
      x: 400, y: SURFACE_Y, r: 24,
      label: a.headline.length > 58 ? `${a.headline.slice(0, 55)}…` : a.headline.toUpperCase(),
      sub: a.source,
      glyph: '!',
      labelAt: 'above',
      reading: { kind: 'Surface · the event as delivered', body: a.headline },
      detail: [`Source: ${a.source}`, ...a.caveats]
    },
    ...a.roots.map((r, i) => ({
      id: r.register,
      kind: 'cell' as const,
      x: ROOT_X[i], y: ROOT_Y, r: 25,
      label: r.title,
      sub: r.sub,
      glyph: r.glyph,
      /* the register's brightness is its evidence: a root nothing was
         established in stays dim, which is a true statement about the reading */
      intensity: 0.5 + r.strength * 0.5,
      reading: {
        kind: `Structural root · ${r.title.toLowerCase()}`,
        body: r.strength > 0
          ? `${r.findings.filter(f => f.mode !== 'question').length} of 3 evidenced`
          : 'Nothing established — this register is asking, not answering'
      },
      detail: r.findings.map(f =>
        f.mode === 'researched' ? `${f.full} — ${f.evidence} (${f.source})`
          : f.mode === 'detected' ? `${f.full} — “${f.evidence}”`
            : `Open question: ${f.full}`)
    })),
    ...a.roots.flatMap((r, i) =>
      r.findings.map((f, k) => ({
        id: `${r.register}-${k}`,
        kind: 'minor' as const,
        x: ROOT_X[i] + (k === 1 ? 0 : k === 0 ? -60 : 60),
        y: ROOT_Y + (k === 1 ? 104 : 64),
        r: f.mode === 'researched' ? 8.5 : 7,
        label: f.short,
        /* the three modes differ in light, not in weight — the difference is
           the whole claim of the reading, so it is drawn rather than written */
        intensity: LIT[f.mode] ?? 0.3,
        reading: {
          kind: f.mode === 'researched' ? `${r.title} · established`
            : f.mode === 'detected' ? `${r.title} · found in the text`
              : `${r.title} · unanswered`,
          body: f.mode === 'researched' ? `${f.full} — ${f.evidence}`
            : f.mode === 'detected' ? `${f.full} — “${f.evidence}”`
              : f.full
        }
      }))
    )
  ];
}

function buildEdges(a: Analysis): FigureEdge[] {
  return [
    ...a.roots.map(r => ({ a: 'headline', b: r.register, weight: 0.9 + r.strength * 0.7 })),
    ...a.roots.flatMap(r =>
      r.findings.map((f, k) => ({
        a: r.register, b: `${r.register}-${k}`,
        weight: f.mode === 'researched' ? 1.15 : f.mode === 'detected' ? 0.9 : undefined,
        faint: f.mode === 'question'
      }))
    )
  ];
}

/* ─────────────────────────────────────────────────────────────── the surface */

type Phase = 'idle' | 'reading' | 'researching' | 'done';

export const CausalTaxonomyDemo: React.FC = () => {
  const [url, setUrl] = useState('');
  const [pasted, setPasted] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [key, setKey] = useState(() => storedKey());
  const [phase, setPhase] = useState<Phase>('idle');
  const [note, setNote] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  /** citations gathered from the reading, listed under the figure */
  const [sources, setSources] = useState<Array<{ short: string; url: string }>>([]);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const land = (a: Analysis, n: string) => {
    setAnalysis(a);
    setSources(
      a.roots.flatMap(r => r.findings)
        .filter(f => f.mode === 'researched' && f.source)
        .map(f => ({ short: f.short, url: f.source as string }))
    );
    setNote(n);
    setPhase('done');
  };

  /** read the text, then optionally go and establish what the text cannot say */
  const run = async (headline: string, body: string, src: string, baseNote: string) => {
    const quick = analyse(headline, body, src);
    if (!haveKey()) {
      land(quick, baseNote);
      return;
    }
    land(quick, `${baseNote} Researching the structure…`);
    setPhase('researching');
    const ctl = new AbortController();
    abort.current = ctl;
    const got = await research(headline, body, src, ctl.signal);
    if (ctl.signal.aborted) return;
    if (got.analysis) land(got.analysis, baseNote);
    else land(quick, `${baseNote} ${got.error ?? ''}`.trim());
  };

  const runUrl = async () => {
    if (!url.trim() || phase === 'reading' || phase === 'researching') return;
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setPhase('reading');
    setNote(null);
    const got = await fetchSource(url.trim(), ctl.signal);
    if (ctl.signal.aborted) return;
    if (!got.ok) {
      setNote(got.note);
      setPhase('idle');
      setShowPaste(true);
      return;
    }
    await run(got.headline, got.body, got.source, got.note);
  };

  const runText = () => {
    if (!pasted.trim()) return;
    const headline = (pasted.trim().split('\n').find(Boolean) || '').slice(0, 140);
    void run(headline, pasted.trim(), 'pasted text', 'Read from pasted text.');
  };

  const reset = () => {
    abort.current?.abort();
    setAnalysis(null);
    setSources([]);
    setPhase('idle');
    setNote(null);
  };

  const saveKey = (v: string) => { setKey(v); storeKey(v.trim()); };

  const field =
    'w-full bg-transparent border-0 border-b outline-none rounded-none ' +
    'text-[12px] font-light placeholder-current/30 py-1.5';
  const control =
    'text-[9px] font-light uppercase tracking-[0.2em] opacity-70 hover:opacity-100 outline-none rounded-none';

  const busy = phase === 'reading' || phase === 'researching';

  return (
    <div className="w-full flex flex-col items-center gap-2">
      {analysis && (phase === 'done' || phase === 'researching') ? (
        <>
          <LivingFigure
            id={ID}
            width={800}
            height={330}
            nodes={buildNodes(analysis)}
            edges={buildEdges(analysis)}
            core="headline"
            caption=""
            tag=""
            /* a count, not a caption: the one fact the drawing cannot show */
            footLeft={`${Math.round(analysis.confidence * 9)} of 9 evidenced`}
            footRight=""
          />

          {/* The citations, listed rather than buried in a tooltip: a figure
              that claims a cause has to show where the cause came from, and a
              reading strip only shows one at a time. */}
          {sources.length > 0 && (
            <div className="max-w-2xl w-full px-4">
              <div className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45 mb-1.5">
                Established at
              </div>
              <ul className="space-y-1">
                {sources.map((s, i) => (
                  <li key={i} className="flex gap-2 items-baseline text-[9px] font-light">
                    <span className="opacity-65 uppercase tracking-[0.2em] shrink-0">{s.short}</span>
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="opacity-50 hover:opacity-95 truncate underline underline-offset-4 decoration-[0.5px]"
                      style={{ transition: 'opacity 0.6s var(--ease-organic)' }}>
                      {s.url.replace(/^https?:\/\//, '')}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {note && (
            <p className="max-w-2xl text-center text-[9px] font-light uppercase tracking-[0.2em] opacity-45 leading-relaxed px-3">
              {note}
            </p>
          )}
          <button onClick={reset} className={`mt-0.5 px-2 py-1 ${control}`}
            style={{ transition: 'opacity 0.6s var(--ease-organic)' }}>
            Read another source
          </button>
        </>
      ) : (
        <div className="w-full max-w-xl px-4 py-6 flex flex-col gap-4">

          <div>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void runUrl(); }}
              placeholder="https://…"
              inputMode="url"
              aria-label="Link to the source you want the taxonomy to read"
              className={field}
            />
            <div className="flex items-center justify-between gap-3 mt-2">
              <button onClick={() => setShowPaste(v => !v)} className={control}
                style={{ transition: 'opacity 0.6s var(--ease-organic)' }}>
                {showPaste ? 'Use a link' : 'Paste the text instead'}
              </button>
              <button onClick={() => void runUrl()} disabled={!url.trim() || busy}
                className="bud text-[9px] font-light uppercase tracking-[0.2em] outline-none">
                {phase === 'reading' ? 'Reading…' : phase === 'researching' ? 'Researching…' : 'Read the roots'}
              </button>
            </div>
          </div>

          {showPaste && (
            <div>
              <textarea
                value={pasted}
                onChange={e => setPasted(e.target.value)}
                rows={5}
                placeholder="Paste the headline on the first line, then the text…"
                aria-label="The text of the source you want the taxonomy to read"
                className={`${field} soft-scroll resize-none leading-relaxed`}
              />
              <div className="flex justify-end mt-2">
                <button onClick={runText} disabled={!pasted.trim() || busy}
                  className="bud text-[9px] font-light uppercase tracking-[0.2em] outline-none">
                  Read the roots
                </button>
              </div>
            </div>
          )}

          {/* The key. The reader's own, on the reader's own machine — there is no
              server in this app for it to go to, and it is sent to Google and
              nowhere else. Said plainly, next to the field, because a key field
              with no explanation is the kind of thing this dossier is about. */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setShowKey(v => !v)} className={control}
                style={{ transition: 'opacity 0.6s var(--ease-organic)' }}>
                {haveKey() ? 'Researching is on · edit key' : 'Add a key to research the structure'}
              </button>
              {haveKey() && (
                <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45">
                  economic · historical answerable
                </span>
              )}
            </div>
            {showKey && (
              <div className="mt-2">
                <input
                  value={key}
                  onChange={e => saveKey(e.target.value)}
                  type="password"
                  placeholder="Gemini API key"
                  aria-label="Your own Gemini API key, kept on this device"
                  autoComplete="off"
                  spellCheck={false}
                  className={field}
                />
                <p className="mt-2 text-[9px] font-light leading-relaxed opacity-45">
                  Free from Google AI Studio. Kept in this browser, sent to Google and
                  nowhere else — there is no server here to send it to. Clear the field
                  to remove it. Without a key the lexicon still reads the text; the
                  economic and historical registers just keep asking instead of answering.
                </p>
              </div>
            )}
          </div>

          {note && <p className="text-[9px] font-light leading-relaxed opacity-45">{note}</p>}

          {/* What it cannot do, said before it is tried rather than after it
              fails. The closed platforms are most of what people will paste. */}
          <p className="text-[9px] font-light leading-relaxed opacity-45 border-t pt-3">
            Ordinary articles and blogs are read through a free extraction proxy, so the
            link is sent to that service. YouTube gives up only a title. X, Instagram,
            TikTok, Facebook, LinkedIn and paywalled news serve nothing to a signed-out
            browser — paste their text. Nothing is stored but the key, and only if you add one.
          </p>
        </div>
      )}
    </div>
  );
};
