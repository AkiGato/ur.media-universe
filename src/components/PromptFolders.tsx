import React, { useState } from 'react';
import { PROMPT_RULESET_DATA } from '../data/promptData';
import { PromptRuleCard } from './PromptRuleCard';
import { Soma } from './organic/Organic';

/**
 * The ruleset, as folders.
 *
 * It used to be eight sheets, one or two branches each, and it read as a filing
 * cabinet emptied onto the floor: every branch's full prompt block open at once,
 * a reader turning pages through six blocks they did not want to reach the one
 * they did, and the sheets themselves mostly white. The titles had drifted off
 * their contents too — "Branch 1 & Branch 2 Prompts" carried only branch 1,
 * "Branch 3 & Branch 4" only branch 3 — which is what a hand-maintained page
 * list does once the data underneath it moves.
 *
 * A branch is a place you go for one job: writing a headline, planning a
 * calendar, generating an image. So it is a folder. Closed, it is the soma, the
 * branch's name, the domain it governs, and one line saying what you would
 * reach for it on and what it takes away — eight of those are a contents page
 * that answers "which one do I want" without opening anything. Open, it is the
 * whole prompt block, unchanged, with its own copy control.
 *
 * The instruction lives in `promptData` as each branch's `subtitle`, not in a
 * lookup here: DOMAIN is layout vocabulary, but what a rule is FOR is part of
 * the rule (LY-01). The open card drops its own subtitle rather than this line
 * suppressing itself, because only the inner element knows it is nested — see
 * TY-05, and FigureFrame doing the same thing inside a figure world.
 *
 * ONE OPEN AT A TIME. Not a preference: two open blocks put the reading column
 * back into the scrolling trough this replaced, and nobody is pasting two
 * branches into one prompt — the Global Rule is the thing that composes with
 * every branch, and it sits above this, always open, because it is never the
 * thing you are choosing between.
 */

/** The domain each branch governs, in the fewest words that still locate it. */
const DOMAIN: Record<string, string> = {
  'branch-1': 'Strategy & positioning',
  'branch-2': 'Content planning & calendars',
  'branch-3': 'Copywriting, headlines & CTAs',
  'branch-4': 'CRM & lifecycle messaging',
  'branch-5': 'Image generation',
  'branch-6': 'Video, motion & product design',
  'branch-7': 'Interface & UX microcopy',
  'branch-8': 'Community, growth & social'
};

/** "BRANCH 1 — Marketing Strategy & Positioning" → "Branch 1" */
function shortName(title: string): string {
  const m = /^(BRANCH\s+\d+)/i.exec(title);
  return m ? m[1].charAt(0) + m[1].slice(1).toLowerCase() : title;
}

export const PromptFolders: React.FC<{ branchIds: string[]; isDark?: boolean }> = ({
  branchIds,
  isDark = false
}) => {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="w-full">
      {branchIds.map((id, i) => {
        const data = PROMPT_RULESET_DATA[id];
        if (!data) return null;
        const isOpen = open === id;
        return (
          <div key={id}>
            {/* The folder's own line. A soma and two pieces of type, which is
                what every other thing this app offers looks like — never a
                chevron, never a box, and it lights from the ink rather than
                growing a field behind itself. */}
            <button
              onClick={() => setOpen(isOpen ? null : id)}
              aria-expanded={isOpen}
              className={`w-full flex items-start gap-3 py-2.5 text-left rounded-none outline-none ${
                isOpen ? 'opacity-100' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ transition: 'opacity 0.6s var(--ease-organic)' }}
            >
              <span className="pt-1.5 flex-shrink-0">
                <Soma size={8} opacity={isOpen ? 0.95 : 0.5} phase={(i * 3.7) % 19} />
              </span>
              <span className="text-[9px] font-light uppercase tracking-[0.2em] flex-shrink-0 w-[4.6rem] pt-1">
                {shortName(data.title)}
              </span>
              {/* TY-02: an unstyled wrapper inherits the sheet's 16px and reports
                  a fourth size to a computed-style sweep, even though both children
                  set their own. It states the size its primary line uses. */}
              <span className="min-w-0 flex-1 text-[12px]">
                <span className="block text-[12px] font-light opacity-80 truncate">
                  {DOMAIN[id] ?? ''}
                </span>
                {data.subtitle && (
                  <span className="block text-[9px] font-light leading-relaxed opacity-45 mt-0.5">
                    {data.subtitle}
                  </span>
                )}
              </span>
            </button>

            {isOpen && (
              <div className="pb-3">
                <PromptRuleCard data={data} isDark={isDark} nested />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
