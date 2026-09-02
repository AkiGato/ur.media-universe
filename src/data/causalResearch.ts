/**
 * The registers, answered instead of asked.
 *
 * `causalAnalysis.ts` reads the text and nothing else, which is why two of its
 * three registers mostly return questions: who owns the publisher and what
 * legislation preceded the event are not properties of the prose. They are
 * facts about the world, and finding them needs search.
 *
 * This module hands the same taxonomy to a model with a search tool and asks it
 * to fill in what it can *establish*, with a citation, and to leave the rest as
 * a question. The output is the same `Analysis` the figure already renders, so
 * nothing downstream knows or cares which path produced it.
 *
 * The discipline is unchanged and matters more here, not less: a model asked
 * for three causes will always produce three causes. So the schema forces every
 * non-question finding to carry either a verbatim quote from the supplied text
 * or a source URL from the search, the prompt says plainly that an honest
 * question outranks a confident guess, and anything returned without evidence
 * is demoted to a question before it reaches the drawing.
 */

import { Analysis, Finding, Register, RootAnalysis } from './causalAnalysis';

/* ────────────────────────────────────────────────────────────── the key

   The user's own key, on the user's own machine. It is sent to Google and to
   nowhere else — there is no server in this app to send it to. Kept in
   localStorage so a reader does not paste it once per figure, and removable
   from the same place it was entered.                                       */

const KEY_STORE = 'ur.causal.geminiKey';

export function storedKey(): string {
  try {
    return localStorage.getItem(KEY_STORE) || '';
  } catch {
    return '';
  }
}

export function storeKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORE, key);
    else localStorage.removeItem(KEY_STORE);
  } catch {
    /* private mode, or storage disabled — the key simply does not persist */
  }
}

/** a build-time key, if whoever deployed this set one; the reader's key wins */
function ambientKey(): string {
  try {
    return (import.meta as unknown as { env?: Record<string, string> })
      .env?.VITE_GEMINI_API_KEY || '';
  } catch {
    return '';
  }
}

export function haveKey(): boolean {
  return Boolean(storedKey() || ambientKey());
}

/* ────────────────────────────────────────────────────────────── the ask */

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

const REGISTER_BRIEF = `
ECONOMIC — the monetization engine. Who holds a financial interest in this
framing being the one that travels: ownership of the outlet, who funds it, what
the page sells, which industry gains if this account is believed.

HISTORICAL — the institutional lineage. What decision made earlier made this
outcome the available one: prior legislation, rulings, precedents, the slow
structural moves that arrive here looking sudden.

NEURO-PSYCHOLOGICAL — the subcortical target. Which System 1 vulnerability the
framing was built to land on: threat detection, in-group confirmation, out-group
indignation, novelty, urgency, and what evaluation this arranges for you to skip.
`.trim();

const INSTRUCTION = `
You are applying a causal taxonomy to a piece of media. The surface event is
what was reported; your job is the structure underneath it, in three registers.

${REGISTER_BRIEF}

Return EXACTLY three findings per register.

For each finding choose a mode, and choose it honestly:
  "detected"   — supported by the supplied text. "evidence" MUST be a verbatim
                 quote copied from that text. Do not paraphrase.
  "researched" — established by searching. "evidence" MUST state the fact, and
                 "source" MUST be the URL you found it at.
  "question"   — you could not establish it. "evidence" and "source" stay empty.

Rules that override everything else:
  - An honest "question" is worth more than a confident guess. If you cannot
    evidence a cause, mark it a question. Filling the registers with plausible
    invention is the exact failure this taxonomy exists to expose.
  - Never present speculation as "researched". No source, no research.
  - "short" is at most two words, uppercase, and names the mechanism.
  - "full" is one sentence naming the causal mechanism, not a summary.

Reply with JSON only, no prose and no code fence:
{"roots":[{"register":"economic","findings":[{"short":"","full":"","evidence":"","source":"","mode":""}]}]}
`.trim();

interface RawFinding {
  short?: string; full?: string; evidence?: string; source?: string; mode?: string;
}

const TITLES: Record<Register, { title: string; sub: string; glyph: string }> = {
  economic: { title: 'ECONOMIC', sub: 'Monetization Engine', glyph: '$' },
  historical: { title: 'HISTORICAL', sub: 'Institutional Lineage', glyph: '⧗' },
  neuro: { title: 'NEURO-PSYCHOLOGICAL', sub: 'Subcortical Target', glyph: '⌁' }
};

const ORDER: Register[] = ['economic', 'historical', 'neuro'];

/** models like to wrap JSON in a fence however firmly they are asked not to */
function parseLoose(text: string): { roots?: Array<{ register?: string; findings?: RawFinding[] }> } | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = (fenced ? fenced[1] : text).trim();
  const from = body.indexOf('{');
  const to = body.lastIndexOf('}');
  if (from === -1 || to === -1) return null;
  try {
    return JSON.parse(body.slice(from, to + 1));
  } catch {
    return null;
  }
}

/**
 * A finding is only as good as what it can show.
 *
 * This is the gate, and it runs on the model's output rather than trusting it:
 * a "researched" finding with no URL and a "detected" finding whose quote is
 * not actually in the supplied text are both demoted to questions. The model
 * cannot talk its way past this, which is the point of doing it here rather
 * than in the prompt.
 */
function discipline(raw: RawFinding, sourceText: string): Finding | null {
  const short = (raw.short || '').trim().toUpperCase().slice(0, 22);
  const full = (raw.full || '').trim();
  if (!short || !full) return null;

  const evidence = (raw.evidence || '').trim();
  const source = (raw.source || '').trim();
  const mode = (raw.mode || '').trim().toLowerCase();

  if (mode === 'researched' && /^https?:\/\//i.test(source)) {
    return { short, full, evidence, source, mode: 'researched' };
  }

  if (mode === 'detected' && evidence) {
    // the quote has to actually be there — normalised, because models
    // re-punctuate and re-space quotations almost every time
    const norm = (s: string) => s.toLowerCase().replace(/[\s"'“”‘’]+/g, ' ').trim();
    const needle = norm(evidence).slice(0, 60);
    if (needle.length > 12 && norm(sourceText).includes(needle)) {
      return { short, full, evidence, mode: 'detected' };
    }
  }

  return { short, full, evidence: '', mode: 'question' };
}

export interface ResearchResult {
  analysis?: Analysis;
  /** why it could not run, in the reader's language */
  error?: string;
}

/**
 * Run the taxonomy through Gemini with Google Search grounding.
 *
 * Grounding and JSON response-schema cannot be requested together, so the
 * schema lives in the prompt and the reply is parsed defensively. That trade is
 * worth it: without search this path could answer no more than the lexicon
 * already does, which would make the whole upgrade decorative.
 */
export async function research(
  headline: string,
  body: string,
  source: string,
  signal?: AbortSignal
): Promise<ResearchResult> {
  const key = storedKey() || ambientKey();
  if (!key) return { error: 'No key. Add one to research the structure, or read the text without it.' };

  const supplied = `${headline}\n\n${body}`.slice(0, 16000);
  const prompt =
    `${INSTRUCTION}\n\n--- SOURCE: ${source}\n--- HEADLINE: ${headline}\n--- TEXT:\n${supplied}`;

  let res: Response;
  try {
    res = await fetch(ENDPOINT(key), {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2 }
      })
    });
  } catch {
    return { error: 'Could not reach Gemini. Check the connection, or read the text without it.' };
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) {
      return { error: 'Gemini refused that key. Check it, or read the text without it.' };
    }
    if (res.status === 429) {
      return { error: 'The free tier is rate-limited and you have hit it. Wait a minute, or read the text without it.' };
    }
    return { error: `Gemini answered ${res.status}. Read the text without it, or try again.` };
  }

  const json = await res.json().catch(() => null);
  const text: string =
    json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
  const parsed = parseLoose(text);
  if (!parsed?.roots) return { error: 'Gemini answered in a shape this figure could not read. Try again.' };

  const byRegister = new Map<string, RawFinding[]>();
  parsed.roots.forEach(r => {
    const reg = (r.register || '').toLowerCase();
    if (reg) byRegister.set(reg, r.findings || []);
  });

  const roots: RootAnalysis[] = ORDER.map(register => {
    const meta = TITLES[register];
    const findings = (byRegister.get(register) || [])
      .map(f => discipline(f, supplied))
      .filter((f): f is Finding => f !== null)
      .slice(0, 3);
    while (findings.length < 3) {
      findings.push({
        short: 'UNANSWERED',
        full: 'This register was not established for this source',
        evidence: '',
        mode: 'question'
      });
    }
    const evidenced = findings.filter(f => f.mode !== 'question').length;
    return { register, ...meta, strength: evidenced / 3, findings };
  });

  const evidencedTotal = roots.reduce(
    (n, r) => n + r.findings.filter(f => f.mode !== 'question').length, 0);
  const researched = roots.reduce(
    (n, r) => n + r.findings.filter(f => f.mode === 'researched').length, 0);

  const caveats = [
    `Researched with ${MODEL} and Google Search. ${researched} of ${evidencedTotal} evidenced findings carry an external source; the rest quote the text.`,
    'Findings without evidence were demoted to questions before drawing, whatever the model called them.',
    'A model asked for three causes will produce three causes. Check the citations.'
  ];

  return {
    analysis: {
      headline: headline.trim() || 'Untitled source',
      source,
      roots,
      confidence: evidencedTotal / 9,
      caveats
    }
  };
}
