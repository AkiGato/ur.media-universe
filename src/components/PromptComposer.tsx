import React, { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { PROMPT_RULESET_DATA } from '../data/promptData';
import { Vein, Soma, SomaLabel } from './organic/Organic';

/**
 * The composer.
 *
 * The ruleset is written to be inherited: the Global Rule sits above every
 * branch and is never overridden, and a branch is only the domain-specific
 * layer on top of it. The pages honoured that on paper and not in practice —
 * every block had its own copy button, so the thing a practitioner actually
 * needs (the global rule *plus* the branch they are about to work in, as one
 * paste) had to be assembled by hand in a text editor, correctly, every time.
 *
 * This assembles it. Pick the branches you are working in; the global rule is
 * always the head of the block and cannot be removed, because in the document
 * it cannot be either.
 */

const BRANCH_IDS = [
  'branch-1', 'branch-2', 'branch-3', 'branch-4',
  'branch-5', 'branch-6', 'branch-7', 'branch-8'
];

/** "Branch 3 — Copywriting, headlines, CTAs, landing pages" → "Copywriting…" */
function shortTitle(title: string): string {
  const after = title.split('—')[1] || title;
  return after.trim();
}

function assemble(ids: string[]): string {
  const global = PROMPT_RULESET_DATA['global-rule'];
  const parts: string[] = [];

  if (global) {
    parts.push(`# ${global.title}`, '', global.promptText.trim());
  }

  ids.forEach(id => {
    const rule = PROMPT_RULESET_DATA[id];
    if (!rule) return;
    parts.push(
      '',
      '---',
      '',
      `# ${rule.title}`,
      ...(rule.subtitle ? ['', rule.subtitle] : []),
      '',
      rule.promptText.trim()
    );
  });

  parts.push(
    '',
    '---',
    '',
    'The Global Rule above is inherited by every branch and is never overridden.',
    'Where a branch is silent, the Global Rule still applies.'
  );

  return parts.join('\n');
}

export const PromptComposer: React.FC<{
  /** a branch to start with — the page the composer is sitting on */
  initial?: string[];
}> = ({ initial = [] }) => {
  const [picked, setPicked] = useState<string[]>(initial.filter(id => PROMPT_RULESET_DATA[id]));
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const text = useMemo(() => assemble(picked), [picked]);
  const lines = text.split('\n').length;

  const toggle = (id: string) =>
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="membrane p-3 space-y-2.5 rounded-none">
      <div className="flex items-center justify-between gap-3">
        <SomaLabel opacity={0.8} phase={4.1}>Compose a Prompt Block</SomaLabel>
        <button
          onClick={copy}
          className={`bud px-2.5 py-1 text-[9px] font-light uppercase tracking-[0.2em] flex items-center space-x-1.5 rounded-none outline-none ${
 copied ? 'bud-lit' : ''
 }`}
          title="Copy the global rule and the chosen branches as one block"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied Block' : 'Copy Block'}</span>
        </button>
      </div>

      <p className="text-[12px] font-light leading-snug opacity-70">
        The Global Rule is always the head of the block — in the document it is never
        overridden, so here it cannot be removed. Add the branches you are working in.
      </p>

      <div className="opacity-40">
        <Vein opacity={0.4} phase={9.7} />
      </div>

      {/* the global rule, present and not removable */}
      <div className="flex items-center gap-2.5 opacity-90">
        <Soma size={9} phase={2.2} />
        <span className="text-[9px] font-light uppercase tracking-[0.2em]">Global Rule</span>
        <span className="text-[9px] uppercase tracking-[0.2em] opacity-45">always inherited</span>
      </div>

      {/* the branches */}
      <div className="flex flex-wrap gap-x-3 gap-y-2 pt-0.5">
        {BRANCH_IDS.map((id, i) => {
          const rule = PROMPT_RULESET_DATA[id];
          if (!rule) return null;
          const on = picked.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              aria-pressed={on}
              className={`bud px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] rounded-none flex items-center gap-2 ${
 on ? 'bud-lit font-light' : 'font-light opacity-65'
 }`}
              title={rule.title}
            >
              <Soma size={7} opacity={on ? 1 : 0.4} phase={(i * 3.3) % 19} />
              <span>{shortTitle(rule.title).split(',')[0]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45">
          {picked.length === 0
            ? 'Global rule only'
            : `Global rule + ${picked.length} branch${picked.length > 1 ? 'es' : ''}`}
          {' · '}
          {lines} lines
        </span>
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="bud px-2 py-1 text-[9px] font-light uppercase tracking-[0.2em] rounded-none"
        >
          {open ? 'Hide Block' : 'Read Block'}
        </button>
      </div>

      {open && (
        <div className="membrane-faint p-2 rounded-none">
          <pre
            className="text-[9px] font-light leading-relaxed whitespace-pre-wrap select-all max-h-64 overflow-y-auto soft-scroll pr-1 opacity-85"
            style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}
          >
            {text}
          </pre>
        </div>
      )}
    </div>
  );
};
