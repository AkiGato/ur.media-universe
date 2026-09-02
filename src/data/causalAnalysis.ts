/**
 * The Causal Taxonomy, applied to a source the reader brings.
 *
 * FIG 3.1 argues that the reported event is the small bright thing and that
 * everything which produced it runs below in three registers. This module is
 * that argument turned on an arbitrary URL — and the honesty of it matters more
 * than the coverage, because a tool that confidently invents causes is exactly
 * the thing the chapter is about.
 *
 * So it never asserts a cause. It does two separable things:
 *
 *   DETECT   surface markers genuinely present in the text — the System 1
 *            levers, the money language, the temporal claims. Each is quoted
 *            back with the sentence that triggered it, so nothing has to be
 *            taken on trust.
 *   ASK      the register's diagnostic question wherever nothing was detected.
 *            An unanswered question is a finding too: it is the shape of what
 *            the piece left out.
 *
 * Everything here runs in the browser with no key and no model. That is a
 * deliberate ceiling, not a stopgap — see `analyse()` for what it cannot see.
 */

export type Register = 'economic' | 'historical' | 'neuro';

export interface Finding {
  /** two words, for the cell */
  short: string;
  /** the full line, for the reading strip */
  full: string;
  /** what triggered it — a verbatim quote, or a researched fact. Empty for a question. */
  evidence: string;
  /** where a researched finding was established; absent otherwise */
  source?: string;
  /**
   * 'detected'   found in the supplied text, and `evidence` quotes it
   * 'researched' established outside the text, and `source` cites it
   * 'question'   not established — the register asking rather than answering
   */
  mode: 'detected' | 'researched' | 'question';
}

export interface RootAnalysis {
  register: Register;
  title: string;
  sub: string;
  glyph: string;
  /** 0–1, drives the root's brightness: how much of this register is evidenced */
  strength: number;
  findings: Finding[];
}

export interface Analysis {
  headline: string;
  source: string;
  roots: RootAnalysis[];
  /** 0–1 across all three registers — how much structure was actually found */
  confidence: number;
  /** what the reader should know about how this was produced */
  caveats: string[];
}

/* ─────────────────────────────────────────────────────────── the lexicons

   Each entry is [pattern, short name, the line it stands for]. Patterns are
   deliberately narrow: a miss becomes a question, a false positive becomes a
   claim, and this figure must never make a claim it cannot show.             */

type Marker = [RegExp, string, string];

const ECONOMIC_MARKERS: Marker[] = [
  [/\b(sponsored|in partnership with|paid (?:post|content|partnership)|advertorial|promoted)\b/i,
    'PAID PLACEMENT', 'The piece is itself an advertisement, disclosed or otherwise'],
  [/\b(affiliate link|affiliate program|we may earn|earn(?:s|ed)? a commission|commission on (?:sales|purchases)|referral link)\b/i,
    'AFFILIATE STAKE', 'The publisher earns on the reader acting, not on the reader understanding'],
  [/\b(subscribe|subscription|paywall|sign up|become a member|newsletter)\b/i,
    'CONVERSION GOAL', 'The page is measured on conversion, and that selects the framing'],
  [/\b(advertis\w+|ad revenue|impressions?|CPM|inventory|monetiz\w+|monetis\w+)\b/i,
    'AD INVENTORY', 'Attention here is inventory, and the framing that fills it is the one that travels'],
  [/\b(share price|shares (?:fell|rose|jumped|plunged|surged)|stock price|valuation|investors?|venture funding|market cap|IPO)\b/i,
    'CAPITAL FLOW', 'Capital allocation is named in the piece — what gets funded gets published'],
  [/\b(lobb\w+|donor|donation|campaign finance|trade group|industry body)\b/i,
    'PURCHASED VOICE', 'An interest with money is speaking through a channel that looks editorial']
];

const HISTORICAL_MARKERS: Marker[] = [
  [/\b(?:since|after|following|in the wake of)\s+(?:the\s+)?\d{4}\b/i,
    'PRIOR EVENT', 'The piece anchors itself to an earlier moment, which is already a causal claim'],
  [/\b(for the first time|unprecedented|never before|record[- ](?:high|low|breaking))\b/i,
    'NOVELTY CLAIM', 'Novelty is asserted — and novelty claims are the ones that most need a baseline'],
  [/(\b[A-Z]\w+ Act\b|\b(?:legislation|regulator|regulatory|regulation|ruling|court|verdict|statute|the law)\b)/,
    'RULES ALREADY WRITTEN', 'A rule made earlier is doing the work the event is being credited with'],
  [/\b(precedent|historically|traditionally|long[- ]standing|decades?|centur\w+)\b/i,
    'PATH DEPENDENCE', 'Yesterday’s decision is still load-bearing under today’s event'],
  [/\b(reform|overhaul|amend\w+|repeal|deregulat\w+|privatis\w+|privatiz\w+)\b/i,
    'STRUCTURAL SHIFT', 'A slow structural move surfaces here as a sudden event'],
  [/\b(public inquiry|inquiry into|investigation into|royal commission|independent review|audit(?:ed|or)?)\b/i,
    'PROCESS UNDERWAY', 'An institutional process is running that predates and outlasts the headline']
];

/* The System 1 levers. The most reliably detectable of the three, because they
   are properties of the text itself rather than of the world behind it. */
const NEURO_MARKERS: Marker[] = [
  [/\b(slam\w*|blast\w*|destroy\w*|shred\w*|savage\w*|eviscerat\w+|torch\w*)\b/i,
    'COMBAT VERB', 'Disagreement is rendered as physical violence, which is processed before context'],
  [/\b(fear|panic|threat|danger\w*|warn\w*|alarm\w*|crisis|catastroph\w+|collapse|disaster)\b/i,
    'THREAT FRAME', 'The threat-detection layer is addressed first, and it does not wait for evidence'],
  [/\b(outrage\w*|fury|furious|backlash|scandal|shock\w*|horrif\w+|disgust\w+)\b/i,
    'INDIGNATION', 'Indignation travels further than analysis, so indignation is what is supplied'],
  [/\b(those people|elites?|the left|the right|insiders?|the establishment|globalists?)\b/i,
    'OUT-GROUP', 'An out-group is named, which converts a question into an identity'],
  [/\b(you (?:won’t|won't|need to|should|must)|here’s why|here's why|what you need to know)\b/i,
    'SECOND PERSON', 'The reader is addressed directly, which borrows the authority of a warning'],
  [/\b[A-Z]{4,}\b[^.!?]{0,80}\b[A-Z]{4,}\b|[!?]{2,}/,
    'TYPOGRAPHIC SHOUT', 'Emphasis is carried by shouting rather than by evidence']
];

const REGISTERS: Record<Register, {
  title: string; sub: string; glyph: string; markers: Marker[];
  /** asked when nothing was detected — the register's own diagnostic */
  questions: Array<[string, string]>;
}> = {
  economic: {
    title: 'ECONOMIC', sub: 'Monetization Engine', glyph: '$',
    markers: ECONOMIC_MARKERS,
    questions: [
      ['WHO PAYS', 'Who pays for this to exist, and are they named anywhere in it'],
      ['WHO GAINS', 'Who holds a financial interest in this framing being the one that travels'],
      ['WHAT SELLS', 'What does this page sell — a product, a subscription, or your attention']
    ]
  },
  historical: {
    title: 'HISTORICAL', sub: 'Institutional Lineage', glyph: '⧗',
    markers: HISTORICAL_MARKERS,
    questions: [
      ['WHAT CAME FIRST', 'What decision, made earlier, made this outcome the available one'],
      ['WHAT PRECEDENT', 'Which rule was already written that this event merely runs along'],
      ['WHAT WAS SLOW', 'What moved slowly for years to arrive here looking sudden']
    ]
  },
  neuro: {
    title: 'NEURO-PSYCHOLOGICAL', sub: 'Subcortical Target', glyph: '⌁',
    markers: NEURO_MARKERS,
    questions: [
      ['WHICH LEVER', 'Which System 1 vulnerability was this framing built to land on'],
      ['WHAT STATE', 'What state does this leave the reader in, and who benefits from that state'],
      ['WHAT BYPASSED', 'What evaluation did the framing arrange for you to skip']
    ]
  }
};

/* ───────────────────────────────────────────────────────────── evidence */

/** the sentence a match sits in, trimmed to something a reading strip can carry */
function sentenceAround(text: string, index: number): string {
  const from = Math.max(0, text.lastIndexOf('.', index) + 1);
  let to = text.indexOf('.', index);
  if (to === -1) to = Math.min(text.length, index + 160);
  const s = text.slice(from, to + 1).replace(/\s+/g, ' ').trim();
  return s.length > 180 ? `${s.slice(0, 177)}…` : s;
}

function scan(text: string, markers: Marker[]): Finding[] {
  const out: Finding[] = [];
  for (const [re, short, full] of markers) {
    const m = re.exec(text);
    if (!m || m.index === undefined) continue;
    out.push({ short, full, evidence: sentenceAround(text, m.index), mode: 'detected' });
  }
  return out;
}

/* ─────────────────────────────────────────────────────────── the analysis */

/**
 * Three registers, three findings each — the shape FIG 3.1 already draws.
 *
 * What this can see: the text, and only the text. Every 'detected' finding
 * quotes the sentence that produced it.
 *
 * What it cannot see: who owns the publisher, where the funding comes from,
 * what the legislative history is. Those are the registers' *questions*, and
 * they are returned as questions rather than guessed at. A model with a search
 * tool could answer some of them; a lexicon in a browser cannot, and pretending
 * otherwise would make this figure an instance of the thing it diagnoses.
 */
export function analyse(headline: string, body: string, source: string): Analysis {
  const text = `${headline}\n\n${body}`;
  const roots: RootAnalysis[] = (Object.keys(REGISTERS) as Register[]).map(register => {
    const spec = REGISTERS[register];
    const detected = scan(text, spec.markers).slice(0, 3);
    const findings: Finding[] = [...detected];
    for (const [short, full] of spec.questions) {
      if (findings.length >= 3) break;
      if (findings.some(f => f.short === short)) continue;
      findings.push({ short, full, evidence: '', mode: 'question' });
    }
    return {
      register,
      title: spec.title,
      sub: spec.sub,
      glyph: spec.glyph,
      strength: detected.length / 3,
      findings: findings.slice(0, 3)
    };
  });

  const detectedTotal = roots.reduce(
    (n, r) => n + r.findings.filter(f => f.mode === 'detected').length, 0);

  const caveats: string[] = [];
  if (body.trim().length < 400) {
    caveats.push('Only a short extract was available, so the registers had little to read.');
  }
  if (detectedTotal === 0) {
    caveats.push('Nothing was detected in the text — every finding below is a question, which is itself a reading.');
  }
  caveats.push('Detected findings quote the sentence that produced them. Questions are not answers, and no cause is asserted.');

  return {
    headline: headline.trim() || 'Untitled source',
    source,
    roots,
    confidence: detectedTotal / 9,
    caveats
  };
}

/* ───────────────────────────────────────────────────────────── the fetching */

export interface FetchedSource {
  headline: string;
  body: string;
  source: string;
  /** what happened, in the reader's language */
  note: string;
  ok: boolean;
}

const YT = /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\/)/i;
/** the platforms that will not serve a page to a browser that is not logged in */
const CLOSED = /(?:^|\.)(?:x\.com|twitter\.com|instagram\.com|tiktok\.com|facebook\.com|threads\.net|linkedin\.com)$/i;

function hostOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Retrieve what can be retrieved, for free, from a browser with no server.
 *
 * There are exactly three ways in without a key, and each has a hard edge:
 *
 *   YouTube oEmbed   free, no key, CORS-open — title and channel only, never
 *                    the transcript, so the analysis is reading a title.
 *   r.jina.ai        a free text-extraction proxy returning clean text for
 *                    ordinary web pages. The URL is sent to a third party, and
 *                    that is disclosed in the interface, not buried here.
 *   paste            always works, needs nothing, and is the only path that
 *                    works for the closed platforms.
 *
 * The closed platforms are refused up front rather than attempted and failed:
 * a spinner that ends in nothing teaches the reader less than a sentence
 * explaining that the door is shut and why.
 */
export async function fetchSource(url: string, signal?: AbortSignal): Promise<FetchedSource> {
  const host = hostOf(url);
  const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const fail = (note: string): FetchedSource =>
    ({ headline: '', body: '', source: host || url, note, ok: false });

  if (!host) return fail('That does not parse as a link. Paste the text instead.');

  if (CLOSED.test(host)) {
    return fail(
      `${host} does not serve its posts to a browser that is not signed in, and no free route ` +
      'around that exists. Copy the post’s text and paste it below — the taxonomy reads text, not links.'
    );
  }

  if (YT.test(full)) {
    try {
      const r = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(full)}&format=json`, { signal });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      return {
        headline: j.title || '',
        body: `Video published by ${j.author_name || 'an unnamed channel'}.`,
        source: `youtube.com · ${j.author_name || ''}`.trim(),
        note: 'YouTube gives away the title and channel for free and nothing else — no transcript, ' +
              'no description. The registers below are reading a title. Paste the transcript for a real reading.',
        ok: true
      };
    } catch {
      return fail('YouTube did not answer. Paste the title or transcript instead.');
    }
  }

  try {
    const r = await fetch(`https://r.jina.ai/${full}`, { signal, headers: { Accept: 'text/plain' } });
    if (!r.ok) throw new Error(String(r.status));
    const raw = await r.text();
    const title = /^Title:\s*(.+)$/m.exec(raw)?.[1]?.trim() || '';
    const body = raw
      .replace(/^Title:.*$/m, '')
      .replace(/^URL Source:.*$/m, '')
      .replace(/^Markdown Content:\s*/m, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .trim();
    if (!body) throw new Error('empty');
    return {
      headline: title,
      body: body.slice(0, 20000),
      source: host,
      note: 'Read through r.jina.ai, a free extraction proxy. The link was sent to that service.',
      ok: true
    };
  } catch {
    return fail(
      `${host} could not be read from the browser — it is behind a paywall, a bot check, or ` +
      'rendered by scripts. Paste the text instead; that path never fails.'
    );
  }
}
