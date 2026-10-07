import React, { useState } from 'react';
import { parsePromptText } from '../data/promptText';
import { Copy, Check } from './organic/Icons';
import { Vein, SomaLabel } from './organic/Organic';

export interface PromptRuleData {
  id: string;
  title: string;
  subtitle?: string;
  prohibited?: string;
  required?: string;
  promptText: string;
}

interface PromptRuleCardProps {
  data: PromptRuleData;
  isDark?: boolean;
  /**
   * The card is inside a folder whose line already carries the subtitle.
   *
   * TY-05: the inner element drops its own name rather than the outer one
   * suppressing it, because only the inner element knows it is nested. Same
   * mechanism as FigureFrame stepping aside inside a figure world.
   */
  nested?: boolean;
}

export const PromptRuleCard: React.FC<PromptRuleCardProps> = ({ data, isDark = false, nested = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`membrane w-full p-3 rounded-none text-left space-y-2.5 outline-none ${
      isDark ? 'text-white' : 'text-black'
    }`}>
      {/* Header */}
      <div className="space-y-0.5">
        <SomaLabel opacity={0.7} phase={3.1}>Operational Prompt Block</SomaLabel>
        <h3 className="text-[12px] font-light uppercase tracking-[0.2em]">
          {data.title}
        </h3>
        {data.subtitle && !nested && (
          <p className="text-[12px] font-light italic opacity-70 mt-0.5">
            {data.subtitle}
          </p>
        )}
        <div className="opacity-45 pt-1">
          <Vein opacity={0.45} phase={10.3} />
        </div>
      </div>

      {/* Prohibited Constraints */}
      {data.prohibited && (
        <div className="text-[12px] leading-tight space-y-0.5">
          <SomaLabel opacity={0.85} phase={6.8}>Prohibited</SomaLabel>
          <p className="font-light opacity-90">{data.prohibited}</p>
        </div>
      )}

      {/* Required Standards */}
      {data.required && (
        <div className="text-[12px] leading-tight space-y-0.5">
          <SomaLabel opacity={0.85} phase={15.7}>Required</SomaLabel>
          <p className="font-light opacity-90">{data.required}</p>
        </div>
      )}

      {/* Copyable Prompt — a nested light-well, never a nested box */}
      <div className="membrane-faint relative p-2 mt-3 rounded-none outline-none">
        <div className="flex items-center justify-between gap-3 pb-1">
          <SomaLabel opacity={0.65} phase={8.8}>System Prompt</SomaLabel>
          <button
            onClick={handleCopy}
            className={`bud px-2 py-1 text-[9px] font-light uppercase tracking-[0.2em] flex items-center space-x-1.5 rounded-none outline-none ${
 copied ? 'bud-lit' : ''
 }`}
            title="Copy prompt text to clipboard"
            aria-label="Copy Prompt"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied Referred Prompt</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Referred Prompt</span>
              </>
            )}
          </button>
        </div>
        <div className="opacity-35 mb-1.5">
          <Vein opacity={0.4} phase={18.5} />
        </div>

        {/* THE PROMPT IS READ AS STRUCTURE, NOT AS A WALL.

            It was one pre-formatted block at the 9px step: the author's hard
            wraps and the reader's soft wraps both applying, numerals sitting
            inline so a wrapped line ran back underneath its own number, and the
            five things the gate actually asks arriving as a single grey mass.
            It was reported as unreadable, and on the verification sheet — the
            one page in the book a practitioner is meant to WORK from rather
            than read — that is the worst place for it.

            Numbered standards now take a two-column grid: the numeral in its
            own track, the text in the other, so every wrapped line aligns under
            the first and the list reads as a list. The numeral is at the 9px
            label step because it is an index, not content; the standard itself
            is at the body step, because a rule someone has to apply is not a
            caption (TY-01, TY-02).

            `select-all` moves to the wrapper so a reader can still take the
            whole thing in one gesture, and the copy button above is untouched —
            it sends `data.promptText` verbatim, because that string is what
            gets pasted into a model and reflowing it here must never reach it. */}
        <div className="select-all space-y-2 pr-1">
          {parsePromptText(data.promptText).map((block, i) =>
            block.kind === 'item' ? (
              <div key={i} className="grid grid-cols-[1.25rem_1fr] gap-x-2 items-baseline">
                <span className="text-[9px] font-light tabular-nums opacity-45 text-right">
                  {block.marker}
                </span>
                <p className="text-[12px] font-light leading-relaxed opacity-70">{block.text}</p>
              </div>
            ) : (
              <p key={i} className="text-[12px] font-light leading-relaxed opacity-70">
                {block.text}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
};
