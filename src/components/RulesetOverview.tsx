import React, { useEffect, useState } from 'react';
import { parsePromptSections, type PromptBlock } from '../data/promptText';
import { PROMPT_RULESET_DATA } from '../data/promptData';
import {
  Copy, Check, PlateGlobal,
  PlateDocumentation, PlateProhibited, PlateRequired, PlateSources
} from './organic/Icons';
import { SomaLabel, Soma } from './organic/Organic';

/**
 * THE RULESET'S OPENING SHEET, AS A BENTO.
 *
 * It was a column — the note on how the blocks are used, then the Global Rule
 * under it — and a column is what made it 2.09 columns of sideways travel in
 * half a spread, then a long single scroll once it had the whole one. Widening
 * it to three tracks helped the wide frame and did nothing for the one the
 * reader was actually on: the grid opened at `lg`, and a sheet 900px wide is
 * below that, so it stacked back into the column it had been.
 *
 * It is the same set of cells the branch library is, and it gets the same
 * treatment (see `PromptLibrary` for the argument, and for what is deliberately
 * NOT copied from the reference: LY-05 square corners, GR-08 membranes rather
 * than panels, DG-02 no flat tone, light rather than inversion for emphasis).
 *
 * THE CELLS ARE THE AUTHOR'S OWN BANDS, NOT AN EDITORIAL CUT.
 *
 * The Global Rule is written in shouted sections — the core test, the
 * prohibited mechanics, the required standard, the sources — and those sections
 * are the structure of the rule. `parsePromptSections` reads them back out, so
 * the arrangement follows the data (LY-01) and no heading on this sheet was
 * written for it (TY-04). Add a band to the rule in `promptData.ts` and a cell
 * appears; nothing here has to be told.
 *
 * COMPACT MEANS EACH CELL SCROLLS, NOT THE SHEET.
 *
 * The prohibited list alone is nine clauses and will not fit a third of a
 * sheet at any size this app is allowed to set type. So the grid is fixed
 * furniture — the same argument the library makes — and a cell that holds more
 * than its share scrolls inside itself, which is the permission LY-02 gives and
 * the one thing that keeps the whole set on screen at once. Below the grid the
 * cells stack at their natural height and the sheet's own column takes over,
 * because five cells sharing a phone screen is five windows nobody can read.
 */

/**
 * Where each cell sits, and it has to add to twelve on every row — the same
 * arithmetic the library's note is about, and the same way to get it wrong.
 *
 *   row 1   documentation(4)   GLOBAL RULE(8)                        = 12
 *   row 2   core test(3)  prohibited(3)  required(3)  sources(3)     = 12
 *
 * Two bands, both full, so `auto-rows-fr` splits the sheet in half and every
 * cell is the same height as its neighbours. The first arrangement gave each
 * band a third and left the sources cell alone on a row of its own with eight
 * empty columns beside it, which is a gap rather than a composition.
 */
const SPAN = {
  documentation: 'col-span-12 sm:col-span-6 md:col-span-4',
  rule: 'col-span-12 sm:col-span-6 md:col-span-8'
};

/**
 * The bands share the second row, so their width follows how many there are.
 *
 * The rule's sections come from `promptData`, so a band added there has to land
 * somewhere without anybody editing this file (LY-01). Tailwind cannot take a
 * computed class name, so the four cases that divide twelve are written out and
 * anything else falls back to a quarter and wraps — which is a row that still
 * reads, rather than a layout that silently stops adding up.
 */
/**
 * Below this the overview is a list of cells, not a bento.
 *
 * The same finding the library records at the same number, for the same
 * reason: stacked at their natural height the five cells came to 3.31 screens
 * at 375x812, and a reader on a phone scrolled past the whole Global Rule to
 * reach the sources. So the phone gets the other shape of the same set — every
 * cell present as its name, one of them open under the name you touched — and
 * the grid begins exactly where it fits.
 */
const COMPACT_PX = 768;

/**
 * This sheet's step through the shared round.
 *
 * The round is thirty seconds and the moving window three (see `.plate-turn`).
 * Five tiles stepping every six seconds fill it exactly, with one plate moving
 * and the rest at rest at every moment. The branch library holds ten and steps
 * every three through the same round, which is how the two sheets read as one
 * set of marks rather than two.
 */
const TURN_SECONDS = 6;

/**
 * A plate per band, in the order the rule states them.
 *
 * By position rather than by heading, for the same reason `BAND_SPAN` counts
 * rather than names: the bands come from `promptData` and this file may not be
 * the thing that has to be edited when one is added. A band past the end falls
 * back to the sources plate, which is a mark rather than a hole.
 */
const BAND_PLATES: Array<React.FC<{ className?: string }>> = [
  PlateProhibited,
  PlateRequired,
  PlateSources
];

const BAND_SPAN = (count: number): string =>
  ({
    1: 'col-span-12',
    2: 'col-span-12 sm:col-span-6',
    3: 'col-span-12 sm:col-span-6 md:col-span-4',
    4: 'col-span-12 sm:col-span-6 md:col-span-3',
    6: 'col-span-12 sm:col-span-6 md:col-span-2'
  } as Record<number, string>)[count] || 'col-span-12 sm:col-span-6 md:col-span-3';

/**
 * The blocks of a band, set as PHRASING content.
 *
 * Every one of these now renders inside the tile's `<button>`, and a button's
 * content model is phrasing — a `<p>` or a `<div>` in there is invalid, which
 * browsers forgive and validators and assistive tech do not. Spans carrying
 * `block` and `grid` display classes say the same thing to the layout and the
 * right thing to the parser. The library's card reached the same answer.
 */
const Blocks: React.FC<{ blocks: PromptBlock[] }> = ({ blocks }) => (
  <>
    {blocks.map((b, i) =>
      b.kind === 'item' ? (
        <span key={i} className="grid grid-cols-[1.25rem_1fr] gap-x-2 items-baseline">
          <span className="text-[9px] font-light tabular-nums opacity-45 text-right">{b.marker}</span>
          <span className="block text-[12px] font-light leading-relaxed opacity-80">{b.text}</span>
        </span>
      ) : (
        <span key={i} className="block text-[12px] font-light leading-relaxed opacity-80">
          {b.text}
        </span>
      )
    )}
  </>
);

/**
 * ONE TILE. A NAME ON THE FRONT, THE TEXT ON THE FLIP.
 *
 * This is the branch library's card, and deliberately the same one rather than
 * a second thing that resembles it — the two sheets sit next to each other in
 * the Production Ruleset and a reader crossing from one to the other must not
 * have to learn a new object. Everything load-bearing about it is carried over
 * with its reasons intact:
 *
 * — THE BOX NEVER CHANGES SIZE. The face sets the height and the text is lifted
 *   OUT OF FLOW over it, so opening a tile cannot push its neighbours. The
 *   library measured the alternative: one card growing 164px → 241px moved
 *   eight cells on a single click, which is the accordion a grid exists to
 *   replace, arriving by another route. A body longer than its tile scrolls
 *   inside the tile (LY-02), which moves nothing.
 *
 * — `border` IS THE DEFINITION. A membrane is a feathered glow with no edge,
 *   so a grid of them reads as text floating on black rather than as a set of
 *   boxes. The hairline is the theme's own translucent border colour, which is
 *   the one outline LY-06 permits, and it is what makes the arrangement legible
 *   as an arrangement.
 *
 * — ONLY THE SHOWING FACE IS RENDERED. Keeping both and fading between them is
 *   what forced one of them out of flow in the first place.
 *
 * The actions stay outside the flip: a copy control is a nested control inside
 * a button, so it stops the click, or taking the text would also shut the tile
 * under the reader's hand.
 */
const Tile: React.FC<{
  name: string;
  sub?: string | null;
  actions?: React.ReactNode;
  glyph?: React.ReactNode;
  tall?: boolean;
  lit?: boolean;
  className?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ name, sub, actions, glyph, tall = false, lit = false, className = '', open, onToggle, children }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={open}
    aria-label={open ? `${name} — close` : `${name} — read`}
    style={{ zIndex: open ? 20 : undefined }}
    className={`${lit ? 'membrane-lit' : 'membrane'} border relative w-full rounded-none
      text-left outline-none p-4 ${tall ? 'h-full min-h-[184px]' : 'h-full min-h-[150px]'} ${className}`}
  >
    {!open && (
      <span className="settle flex h-full flex-col justify-between">
        <span className="flex items-start justify-between gap-4">
          <span className="text-[12px] font-light leading-snug min-w-0 flex-1 uppercase tracking-[0.2em]">
            {name}
          </span>
          {glyph}
        </span>
        {sub && (
          <span className="block text-[12px] font-light italic leading-relaxed opacity-60 mt-3">
            {sub}
          </span>
        )}
        {/* The one thing the face could not say before: that it is a control.
            The library's tiles carry the same line for the same reason. */}
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45 mt-4">
          Tap to view
        </span>
      </span>
    )}

    {open && (
      <span className="settle absolute inset-0 p-4 flex flex-col gap-2 min-h-0">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <Soma size={8} opacity={0.75} phase={2.3} />
            <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70 truncate">
              {name}
            </span>
          </span>
          {actions}
        </span>
        <span className="soft-scroll min-h-0 flex-1 flex flex-col gap-2 pr-1">{children}</span>
      </span>
    )}
  </button>
);

/**
 * The plate on a tile's face, and its turn in the round.
 *
 * `glyph-alive` is what makes it EXTRA THIN — the class sets every stroke in
 * the svg under it to 0.4, which is the weight the branch library's plates are
 * drawn at and the reason the two sheets read as one set. Nothing here restates
 * the width; taking it from the class is what keeps the two in step when it
 * moves.
 *
 * `--turn-delay` is this plate's slice of the shared round: five tiles, three
 * seconds each, so no two are ever moving at once. See `.plate-turn`.
 */
const Plate: React.FC<{ icon: React.FC<{ className?: string }>; turn: number }> = ({
  icon: Icon, turn
}) => (
  <span
    className="glyph-alive plate-turn shrink-0 inline-flex"
    style={{ '--turn-delay': `-${turn * TURN_SECONDS}s` } as React.CSSProperties}
  >
    <Icon className="w-[68px] h-[68px]" />
  </span>
);

/**
 * A copy control on an open tile.
 *
 * A COMPONENT RATHER THAN A HELPER CALL, and the reason is the copy audit
 * rather than taste. As `act('Copy Full Ruleset', copiedAll, onCopyAll, 'Copy
 * the full ruleset…')` the two strings sat as positional arguments on a source
 * line between a `>` and a `<`, which is exactly the shape
 * `audit-copy` scans for rendered prose — so it read a function call as two
 * new sentences and failed the build. As props they are what they actually
 * are: a label, and a `title`/`aria-label` the audit collects as a tooltip and
 * does not fail on. The lesson is the audit's own: prose is recognised by where
 * it sits, so put it where it belongs.
 *
 * A nested control inside the tile's button, so it takes its own click — or
 * copying would also shut the tile under the reader's hand.
 */
const Act: React.FC<{
  label: string;
  hint: string;
  done: boolean;
  onDo: () => void;
}> = ({ label, hint, done, onDo }) => (
  <span
    role="button"
    tabIndex={0}
    onClick={(ev) => { ev.stopPropagation(); onDo(); }}
    onKeyDown={(ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); onDo(); }
    }}
    title={hint}
    aria-label={hint}
    className={`bud shrink-0 px-2 py-1 text-[9px] font-light uppercase tracking-[0.2em] inline-flex items-center gap-1.5 rounded-none outline-none ${done ? 'bud-lit' : ''}`}
  >
    {done ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    <span>{done ? 'Copied' : label}</span>
  </span>
);

export const RulesetOverview: React.FC<{
  context: string;
  howToUse: string;
  onCopyAll: () => void;
  copiedAll: boolean;
}> = ({ context, howToUse, onCopyAll, copiedAll }) => {
  const rule = PROMPT_RULESET_DATA['global-rule'];
  const [copiedRule, setCopiedRule] = useState(false);

  const copyRule = () => {
    if (!rule) return;
    navigator.clipboard.writeText(rule.promptText);
    setCopiedRule(true);
    setTimeout(() => setCopiedRule(false), 2000);
  };

  /* A resize is not the only way a phone changes shape, so orientation is
     watched as well — rotating does not always fire a resize. */
  const [compact, setCompact] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < COMPACT_PX
  );
  /* CLOSED ON ARRIVAL. The sheet's whole shape is five names, and a tile that
     opens itself is one box talking over the arrangement the reader came to
     read. -1 is "none", which is also what a second tap returns to. */
  const [openIdx, setOpenIdx] = useState<number>(-1);
  useEffect(() => {
    const sync = () => setCompact(window.innerWidth < COMPACT_PX);
    sync();
    window.addEventListener('resize', sync);
    const portrait = typeof matchMedia === 'function' ? matchMedia('(orientation: portrait)') : null;
    portrait?.addEventListener?.('change', sync);
    return () => {
      window.removeEventListener('resize', sync);
      portrait?.removeEventListener?.('change', sync);
    };
  }, []);

  if (!rule) return null;
  const sections = parsePromptSections(rule.promptText);
  /* The run before the first shouted heading is the rule's own preamble, and it
     belongs to the rule rather than to a band of it. */
  const preamble = sections.find((s) => s.heading === null);
  /* THE HERO CARRIES THE RULE'S OWN STATEMENT OF ITSELF.

     The preamble alone left the widest cell on the sheet holding two sentences
     while the bands beside it were dense enough to scroll. The preamble leads
     straight into the first band — for the Global Rule that is the core test,
     which is the thing the rule actually asks — so the hero takes both, and the
     bands that remain share the row below. Taken by POSITION rather than by
     name, so a rule whose first band is something else still composes. */
  const headed = sections.filter((s) => s.heading !== null);
  const lead = headed[0];
  const bands = headed.slice(1);

  /*
   * THE CELLS, BUILT ONCE AND LAID OUT TWICE.
   *
   * The bento and the phone list are two shapes of one set, so the set is
   * described here and each shape only decides where the pieces go. Writing the
   * cells twice is how the two drift apart — the library's note makes the same
   * argument about its own arrangement being data rather than class strings
   * spread through the markup.
   *
   * A name is a STRING here, not a node. The tile sets it itself — one size,
   * one tracking, on the front and again on the open face — and a name handed
   * in as pre-styled markup is a name that can arrive at a different size on
   * every tile, which is most of what made this sheet read as unorganised.
   */
  const cells = [
    {
      key: 'documentation',
      span: SPAN.documentation,
      name: 'Documentation & Overview',
      glyph: <Plate icon={PlateDocumentation} turn={0} />,
      actions: (
        <Act
          label="Copy Full Ruleset"
          hint="Copy the full ruleset to the clipboard"
          done={copiedAll}
          onDo={onCopyAll}
        />
      ),
      body: (
        <>
          <span className="reading block text-[12px] font-light italic">{context}</span>
          <span className="block text-[12px] font-light leading-relaxed whitespace-pre-wrap opacity-80">
            {howToUse}
          </span>
        </>
      )
    },
    {
      key: 'rule',
      span: SPAN.rule,
      tall: true,
      lit: true,
      name: rule.title,
      sub: rule.subtitle,
      glyph: <Plate icon={PlateGlobal} turn={1} />,
      actions: (
        <Act
          label="Copy Referred Prompt"
          hint="Copy the Global Rule to the clipboard"
          done={copiedRule}
          onDo={copyRule}
        />
      ),
      body: (
        <>
          {preamble && <Blocks blocks={preamble.blocks} />}
          {lead && (
            <span className="block space-y-2 pt-1">
              <SomaLabel opacity={0.85} phase={8.8}>{lead.heading}</SomaLabel>
              <Blocks blocks={lead.blocks} />
            </span>
          )}
        </>
      )
    },
    ...bands.map((sec, i) => ({
      key: sec.heading as string,
      span: BAND_SPAN(bands.length),
      name: sec.heading as string,
      /* A NAME OVER AN EMPTY BOX IS NOT A CARD, AND ONE MARK REPEATED FIVE
         TIMES IS NOT A SET.

         The faces carried the same soma five times over, which told a reader
         nothing about which box was which — and a face that shows only a title
         is exactly the case where the mark beside it has to do the
         distinguishing. Each band now has its own plate, drawn to the branch
         library's grammar so the two sheets are one set: a ring with a bar
         across it for what is forbidden, a level and the mark that clears it
         for what is required, courses running back into one root for the
         sources. The plates are BY POSITION, so a band added to the rule in
         `promptData` still lands on something rather than on nothing. */
      glyph: <Plate icon={BAND_PLATES[i] ?? PlateSources} turn={2 + i} />,
      body: <Blocks blocks={sec.blocks} />
    }))
  ];

  /* One open at a time in both shapes. The library keeps several open in its
     bento because it has ten cells and room; five tiles on one sheet read as a
     set only while at most one of them is talking. */
  const toggle = (i: number) => setOpenIdx(openIdx === i ? -1 : i);

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        {cells.map((c, i) => (
          <Tile
            key={c.key}
            name={c.name}
            sub={(c as { sub?: string }).sub}
            actions={(c as { actions?: React.ReactNode }).actions}
            lit={!!(c as { lit?: boolean }).lit}
            open={openIdx === i}
            onToggle={() => toggle(i)}
            className="min-h-0"
          >
            {c.body}
          </Tile>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 auto-rows-fr flex-1 min-h-0 gap-3">
      {cells.map((c, i) => (
        <Tile
          key={c.key}
          className={c.span}
          name={c.name}
          sub={(c as { sub?: string }).sub}
          glyph={(c as { glyph?: React.ReactNode }).glyph}
          actions={(c as { actions?: React.ReactNode }).actions}
          tall={!!(c as { tall?: boolean }).tall}
          lit={!!(c as { lit?: boolean }).lit}
          open={openIdx === i}
          onToggle={() => toggle(i)}
        >
          {c.body}
        </Tile>
      ))}
    </div>
  );
};
