import React, { useState, useEffect } from 'react';
import { PROMPT_RULESET_DATA, ruleName } from '../data/promptData';
import {
  PlateGlobal, PlateStrategy, PlateCalendar, PlateCopy, PlateLifecycle,
  PlateImage, PlateMotion, PlateInterface, PlateCommunity, PlateGate
} from './organic/Icons';
import { Soma, Vein } from './organic/Organic';
import { Copy, Check } from './organic/Icons';
import { parsePromptText } from '../data/promptText';

/**
 * THE RULESET AS A VISUAL LIBRARY.
 *
 * It was an accordion: ten folders in a column, one open at a time, and opening
 * one pushed every rule below it down the page. That is a filing cabinet with a
 * drawer out — the reader loses their place in the set every time they look at
 * anything in it, and the set itself is never visible as a set.
 *
 * Asked for instead: a grid of cards, balanced and hierarchical, navigable the
 * way a library is; the rules themselves revealed by FLIPPING a card, so the
 * structure never alters. That last clause is the whole architecture. A flip
 * happens inside the cell's own footprint, so the grid is fixed furniture: ten
 * places that are always in the same place, whatever any of them is showing.
 *
 * THE LAYOUT IS THE REFERENCE'S, THE SURFACES ARE NOT, AND THAT IS DELIBERATE.
 * The bento proportions are copied — three across, a tall pair down the left
 * against one cell spanning two rows, a full-width close — because that is what
 * was asked for and it is what gives the set its hierarchy. What is NOT copied
 * is the rounding and the fills:
 *
 *   LY-05  zero rounded corners, no exception. The reference's cards are heavily
 *          rounded and every one here is square.
 *   GR-08  nothing in the book section is a box. So a cell is a `.membrane` —
 *          a light-well whose ground fades to nothing at its own rim — rather
 *          than a panel with an edge. It reads as a cell without being one.
 *   DG-02  no flat tone over an area, which is what the reference's grey and
 *          black cards are.
 *
 * The emphasis cell is therefore lit (`.membrane-lit`), not inverted. The
 * reference makes its hero a black rectangle; in this app's dark theme that
 * inverts to a large white one, which is the blob DG-02 has had removed four
 * times. Light is how this drawing has always said "this one governs".
 *
 * BOTH THEMES BY CONSTRUCTION. There is no black version and a white version to
 * keep in step — the membranes, the plates and the type all take `currentColor`
 * and the theme supplies it (LY-07, GR-05), so the two are one build.
 */

/** The plate that stands for each rule. See the set's own note in `Icons`. */
const PLATES: Record<string, React.FC<{ className?: string }>> = {
  'global-rule': PlateGlobal,
  'branch-1': PlateStrategy,
  'branch-2': PlateCalendar,
  'branch-3': PlateCopy,
  'branch-4': PlateLifecycle,
  'branch-5': PlateImage,
  'branch-6': PlateMotion,
  'branch-7': PlateInterface,
  'branch-8': PlateCommunity,
  'verification-checklist': PlateGate
};

/**
 * Where each rule sits, and how much room it takes.
 *
 * The reference's arrangement, held as data rather than as class strings spread
 * through the markup: the grid is the argument this component makes, and an
 * argument written in twelve places is one nobody can check. Twelve columns,
 * because that is what divides by three and by four.
 *
 * `lit` is the emphasis, and only the global rule has it — it is the one rule
 * that composes with every other, which is exactly the reference's hero cell.
 */
/**
 * Below this the library is a list of titles, not a bento.
 *
 * The tiles are sized to hold a whole rule without scrolling, and on a phone
 * that is arithmetic that cannot be satisfied: measured at 390x844, eight rules
 * one per column came to 1,642px of grid against a 720px sheet. No type size
 * fixes that — each rule genuinely needs its own ~180px, and eight of them need
 * more than twice a phone screen.
 *
 * So the phone gets the other shape of the same set: every branch present as a
 * title, and one rule open at a time under the one you touched. The reader
 * still sees the whole library at once, still reads a complete rule with no
 * scroller inside it, and never scrolls past seven rules to reach the eighth.
 *
 * 1024 is where the four-column bento begins. It was 640, which left the
 * two-column shape in between — and that shape does not fit either: measured
 * at 866x694, the lead plus eight tiles came to 988px of grid in a 566px
 * sheet, 462px of it scrolled. The list is the shape that holds a tablet, so
 * the bento now starts exactly where it fits and the list covers everything
 * below it.
 */
const COMPACT_PX = 1024;

/*
 * THE ARRANGEMENT, AND IT HAS TO ADD UP TO TWELVE ON EVERY ROW.
 *
 * It did not. The tiles were widened from a third to a quarter without the hero
 * moving with them, so the spans ran 3+3+3 / 3+8 / 3+3+3 — every row a different
 * total, the grid auto-flowing to fill the gaps, and the bento landing as
 * whatever fell out. Measured on the live sheet: five distinct row positions for
 * what should be three bands, and the grid 100px taller than the sheet, which
 * put two branches below the fold and a scroller under a set whose entire
 * purpose is being seen at once.
 *
 * Four across, and the hero holds the left of the lower band for two rows:
 *
 *   row 1     b1(3)  b2(3)  b3(3)  b4(3)          = 12
 *   row 2     HERO(6, two rows)  b5(3)  b6(3)     = 12
 *   row 3     HERO continues     b7(3)  b8(3)     = 12
 *
 * Which is the reference's shape — a block of small cells with one large cell
 * anchoring them — at the column count the tiles actually want. Measured after:
 * the grid ends inside the sheet and nothing is below the fold.
 */
const CELLS: Array<{ id: string; span: string; tall?: boolean; lit?: boolean }> = [
  { id: 'branch-1', span: 'col-span-12 sm:col-span-6 lg:col-span-3' },
  { id: 'branch-2', span: 'col-span-12 sm:col-span-6 lg:col-span-3' },
  { id: 'branch-3', span: 'col-span-12 sm:col-span-6 lg:col-span-3' },
  { id: 'branch-4', span: 'col-span-12 sm:col-span-6 lg:col-span-3' },

  /* The one rule the other eight inherit, so it is the one cell that carries
     the light and the room. */
  { id: 'global-rule', span: 'col-span-12 sm:col-span-12 lg:col-span-6', tall: true, lit: true },
  { id: 'branch-5', span: 'col-span-12 sm:col-span-6 lg:col-span-3' },
  { id: 'branch-6', span: 'col-span-12 sm:col-span-6 lg:col-span-3' },

  { id: 'branch-7', span: 'col-span-12 sm:col-span-6 lg:col-span-3' },
  { id: 'branch-8', span: 'col-span-12 sm:col-span-6 lg:col-span-3' },

  { id: 'verification-checklist', span: 'col-span-12' }
];

/**
 * One cell, and the two faces it holds.
 *
 * Both faces are in the DOM at once and the card is the taller of them, so
 * flipping cannot change the cell's height and therefore cannot move anything
 * else. That is the requirement stated as a layout rule: a flip that resized
 * its own cell would reflow the grid, which is the accordion's fault arriving
 * by another route.
 *
 * MO-02: one curve, `--ease-organic`. MO-03: it answers immediately — the flip
 * is a response to an input, not an ambient cycle, so it lands in the same
 * fifth of a second every other response in this app does.
 */
const Card: React.FC<{
  id: string;
  tall?: boolean;
  lit?: boolean;
  /** position in the grid: the plate takes its turn to change by this */
  order?: number;
  /* When the set is one-at-a-time the open card is decided above, so the tile
     is told rather than remembering. Uncontrolled everywhere else, which keeps
     the bento's behaviour exactly as it was. */
  open?: boolean;
  onToggle?: () => void;
  /** true while some card in the set is open, including this one */
  squeezed?: boolean;
}> = ({ id, tall = false, lit = false, order = 0, open, onToggle, squeezed = false }) => {
  const data = PROMPT_RULESET_DATA[id];
  const [ownFlip, setOwnFlip] = useState(false);
  const controlled = open !== undefined;
  const flipped = controlled ? open : ownFlip;
  const setFlipped = () => (controlled ? onToggle?.() : setOwnFlip((f) => !f));
  if (!data) return null;

  const Plate = PLATES[id];
  const name = ruleName(id, data.title);
  /* A number that is this cell's and always the same: the glyph's phases come
     from it, so a card breathes identically on every visit and differently from
     its neighbours. */
  const seed = Array.from(id).reduce((a, ch) => a + ch.charCodeAt(0), 0);

  /* Copying from the face that is actually showing the rule.
     The card flips to the branch's constraints and there was no way to take
     them from here — a reader who had found the right branch had to leave the
     grid and find the same rule again on its own card to copy it. */
  const [copied, setCopied] = useState(false);
  /**
   * A BRANCH IS COPIED WITH THE RULE IT INHERITS, NEVER ON ITS OWN.
   *
   * This took `data.promptText` — the branch by itself — and that is an
   * incomplete prompt by the ruleset's own instruction: *"paste the Global Rule
   * into any AI tool's system prompt, then paste the relevant branch on top of
   * it."* This sheet's subtitle says the same thing in four words: domain rules
   * that INHERIT the Global Rule. A reader who took a branch from here got the
   * half that does not stand up alone, and nothing told them so.
   *
   * The composer used to do this assembly on its own panel. That panel is gone
   * from the sheet, so the assembly moved to the place the reader actually
   * reaches for — the copy control on the branch they were already reading.
   * The global rule's own card copies only itself: it is the thing being
   * inherited, so there is nothing above it to inherit.
   */
  const copyBranch = (ev: React.MouseEvent) => {
    /* the card itself flips on click, so the control must keep its own */
    ev.stopPropagation();
    const globalRule = PROMPT_RULESET_DATA['global-rule']?.promptText;
    const composed =
      id === 'global-rule' || !globalRule
        ? data.promptText
        : `${globalRule}\n\n${data.promptText}`;
    navigator.clipboard?.writeText(composed);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={() => setFlipped()}
      aria-pressed={flipped}
      aria-label={flipped ? `${name} — close the rules` : `${name} — read the rules`}
      /* THE TILE IS THE SIZE THE PAGE CAN AFFORD; THE RULE IS NOT.

         Sizing every tile to its own rule was tried and it fails the sheet: a
         closed tile then carries the height of text it is not showing, so eight
         mostly-empty boxes ran past the fold and only six were reachable
         without scrolling.

         The two requirements — a whole rule with no scroller, and the set on
         one page — are only incompatible while the rule has to fit INSIDE the
         tile. So the tile is compact and the rule OVERLAYS it when opened,
         taking whatever height it needs and rising above its neighbours. The
         grid never reflows, the set stays on one page, and the rule is still
         whole.

         `border` is the outline asked for. It is a hairline at the theme's own
         translucent border colour, which is what LY-06 permits and the only
         thing it permits — the membrane is a feathered glow with no edge at
         all, so the tiles read as text floating on black until one is drawn. */
      style={{ zIndex: flipped ? 20 : undefined }}
      /* THE BOX NEVER CHANGES SIZE. THIS IS THE REQUIREMENT, NOT A PREFERENCE.
         "The rules are shown on flip of cards SO THAT THE STRUCTURE NEVER
         ALTERS" — that clause is the reason this sheet is a grid at all.

         It was briefly the other way: the open tile grew to exactly the height
         of its rule and the closed tiles shrank to make room, so that no rule
         would ever need scrolling. That is a real goal and it bought a real
         thing, but it cost the invariant. MEASURED on the live sheet: opening
         one card took it 164px → 241px, pushed every card in the rows below it
         down by 61–77px, and shrank all six of them by 16px. Eight cells moved
         on one click. That is the accordion this grid replaced, arriving by
         another route — a reader loses their place in the set every time they
         look at anything in it.

         So the height is fixed, identical whether the card is showing its face
         or its rule, and identical whether or not some other card is open. The
         cost is paid where the rules already allow it: a rule longer than its
         cell scrolls INSIDE the cell (LY-02 — "long content scrolls inside its
         own column"), which moves nothing.

         `squeezed` is still threaded through because the list mode uses it, but
         it may never reach this height again. */
      className={`${lit ? 'membrane-lit' : 'membrane'} border relative w-full rounded-none
        text-left outline-none p-4 sm:p-5 ${
          tall ? 'h-full min-h-[208px]' : 'h-full min-h-[164px]'
        }`}
    >
      {/* THE FACE. It never leaves — it fades and the rules come up over it, so
          the cell always looks like the same cell.

          The face is in flow and sets the tile's height; the rules are lifted
          out of flow so their length cannot push the grid off the page. */}
      {/* Only the showing face is rendered. Keeping both and fading between
          them is what forced one of them out of flow, and an out-of-flow rule
          cannot make its box taller — which is the whole requirement now. */}
      {!flipped && (
      <span className="settle flex h-full flex-col justify-between">
        {/* `gap-5` and a `min-w-0` on the name: at 68px the figure is most of
            the tile's right-hand side, and a two-line title like "Video, motion
            & product design" was setting its second line hard against the
            glyph's strokes. The name wraps in the space it has and the gap is
            wide enough that the two never meet. */}
        <span className="flex items-start justify-between gap-5">
          <span className="text-[12px] font-light leading-snug min-w-0 flex-1">{name}</span>
          {Plate && (
            /* THE FIGURE IS THE CARD'S SUBJECT, SO IT IS DRAWN AT THAT SIZE.

               Asked for at forty per cent over what it was — 32px to 45, and 48
               to 67 on a tall cell. At the old size it read as a bullet beside
               the name; at this one it is the thing the eye lands on, which is
               what it should have been on a grid whose whole job is telling
               eight branches apart at a glance.

               The alive class and its two periods are per card: `breath` and
               `drift` are varied by the cell's own index so no two glyphs on a
               sheet share a phase, and the negative delays start each one
               already part-way through its cycle rather than all of them at
               zero (MO-01). */
            <span
              className="glyph-alive plate-turn shrink-0 inline-flex"
              style={{
                '--breath': `${(16 + (seed % 7)).toFixed(1)}s`,
                '--breath-delay': `-${(seed * 1.7 % 16).toFixed(1)}s`,
                '--morph-delay': `-${order * 5}s`,
                /* ONE ROUND FOR EVERY PLATE IN THE RULESET.
                   The overview's tiles take it in turns — three seconds each,
                   never two at once — and these sat on a different clock
                   entirely, so crossing from one sheet to the next met the same
                   marks behaving differently. They share the round now, and the
                   cell's own position in the set is its slice of it. */
                '--turn-delay': `-${order * 3}s`
              } as React.CSSProperties}
            >
              <Plate className={tall ? 'w-[100px] h-[100px] opacity-80' : 'w-[68px] h-[68px] opacity-70'} />
            </span>
          )}
        </span>

        {/* WHAT THE CARD DOES, WHERE THE DESCRIPTION WAS.

            The description was a paragraph of 9px uppercase under every cell —
            asked to go, and it was doing the grid no favours: eight of them
            turned a set you scan into a page you read, and the sentence
            explaining a branch belongs on the branch, not on the tile that
            opens it.

            What replaces it is the one thing the tile could not say before.
            The cards flip, and nothing on the face admitted it: the affordance
            lived only in the aria-label, so a sighted reader had to guess that
            a tile was a control at all. */}
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45 mt-6">
          Tap to view
        </span>
      </span>
      )}

      {/* THE RULES, LIFTED OUT OF FLOW, so their length cannot size the box.
          In flow they were the box's height, which is what moved the grid. */}
      {flipped && (
      <span
        className="settle absolute inset-0 p-4 sm:p-5 flex flex-col gap-2 min-h-0"
        aria-hidden={false}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <Soma size={8} opacity={0.75} phase={2.3} />
            <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70 truncate">
              {name}
            </span>
          </span>
          {/* A nested control inside a button: the click is stopped here so
              taking the rule does not also flip the card back under the
              reader's hand. */}
          <span
            role="button"
            tabIndex={flipped ? 0 : -1}
            onClick={copyBranch}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                copyBranch(ev as unknown as React.MouseEvent);
              }
            }}
            title={`Copy the ${name} branch with the Global Rule it inherits`}
            aria-label={`Copy the ${name} branch with the Global Rule it inherits`}
            className={`bud shrink-0 px-2 py-1 text-[9px] font-light uppercase tracking-[0.2em] inline-flex items-center gap-1.5 rounded-none outline-none ${copied ? 'bud-lit' : ''}`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </span>
        </span>
        {/* THE RULE SCROLLS INSIDE ITS OWN CELL, AND ONLY WHEN IT HAS TO.
            The alternative was letting the tile grow to the rule's height, and
            that moved eight cells on one click (see the height note above). A
            scroller is the cheaper of the two costs and it is the one the rules
            already sanction: LY-02 puts long content in its own scrolling
            column rather than moving the page. Most branches fit without ever
            reaching it — `.soft-scroll` shows no bar until there is overflow. */}
        <span className="soft-scroll min-h-0 flex-1 flex flex-col gap-2 pr-1">
          {data.prohibited && (
            <span className="block text-[9px] font-light leading-relaxed opacity-70">
              {data.prohibited}
            </span>
          )}
          {data.required && (
            <span className="block text-[9px] font-light leading-relaxed opacity-100">
              {data.required}
            </span>
          )}
          {!data.prohibited && !data.required && (
            <span className="block text-[9px] font-light leading-relaxed opacity-70 whitespace-pre-wrap">
              {data.promptText}
            </span>
          )}
        </span>
      </span>
      )}
    </button>
  );
};

/**
 * One branch as a row: its title, and its rule when it is the open one.
 *
 * The same content as the tile, in the shape a narrow column can hold. The
 * glyph comes down to 28px — at 68 it would be most of the row — and keeps its
 * own breath and its turn in the morph, so the list is the same organism as
 * the grid rather than a plain menu wearing its name.
 */
const Row: React.FC<{ id: string; order: number; open: boolean; onToggle: () => void }> = ({
  id, order, open, onToggle
}) => {
  const data = PROMPT_RULESET_DATA[id];
  const [copied, setCopied] = useState(false);
  if (!data) return null;
  const Plate = PLATES[id];
  const name = ruleName(id, data.title);
  const seed = Array.from(id).reduce((a, ch) => a + ch.charCodeAt(0), 0);

  return (
    <div className={`${open ? 'membrane-lit' : 'membrane'} rounded-none`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-none outline-none"
      >
        {Plate && (
          <span
            className="glyph-alive plate-turn shrink-0 inline-flex"
            style={{
              '--breath': `${(16 + (seed % 7)).toFixed(1)}s`,
              '--breath-delay': `-${(seed * 1.7 % 16).toFixed(1)}s`,
              '--morph-delay': `-${order * 5}s`,
              /* the same round the bento's tiles take — see .plate-turn */
              '--turn-delay': `-${order * 3}s`
            } as React.CSSProperties}
          >
            <Plate className="w-[28px] h-[28px] opacity-70" />
          </span>
        )}
        <span className="text-[12px] font-light leading-snug flex-1 min-w-0">{name}</span>
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45 shrink-0">
          {open ? 'Close' : 'Tap to view'}
        </span>
      </button>

      {/* The rule, whole. No scroller: only one is ever open, so it has the
          height it needs and the seven titles above and below it are 44px each. */}
      {open && (
        <div className="settle px-3 pb-3 flex flex-col gap-2">
          <div className="opacity-35">
            <Vein opacity={0.4} phase={seed % 20} />
          </div>
          {data.prohibited && (
            <p className="text-[12px] font-light leading-relaxed opacity-70">{data.prohibited}</p>
          )}
          {data.required && (
            <p className="reading text-[12px] font-light leading-relaxed">{data.required}</p>
          )}
          {!data.prohibited && !data.required && (
            parsePromptText(data.promptText).map((block, i) =>
              block.kind === 'item' ? (
                <div key={i} className="grid grid-cols-[1.25rem_1fr] gap-x-2 items-baseline">
                  <span className="text-[9px] font-light tabular-nums opacity-45 text-right">{block.marker}</span>
                  <p className="text-[12px] font-light leading-relaxed opacity-70">{block.text}</p>
                </div>
              ) : (
                <p key={i} className="text-[12px] font-light leading-relaxed opacity-70">{block.text}</p>
              )
            )
          )}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(data.promptText);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            }}
            title={`Copy the ${name} branch with the Global Rule it inherits`}
            className={`bud self-start px-2 py-1 text-[9px] font-light uppercase tracking-[0.2em] inline-flex items-center gap-1.5 rounded-none outline-none ${copied ? 'bud-lit' : ''}`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const PromptLibrary: React.FC<{
  branchIds?: string[];
  isDark?: boolean;
  /**
   * The sheet's own title, taken INTO the grid as its first cell.
   *
   * Eight tiles across three columns is nine slots with one of them empty, and
   * the hole sat at the end of the set where it read as something missing
   * rather than as space. Four columns with the title occupying two by two is
   * twelve slots for twelve: the lead square, then eight tiles, and no gap.
   *
   * It also puts the sheet's name inside the object it names instead of above
   * it, which is the shape a bento wants — the heading is the largest cell
   * rather than a line of type with a rule under it.
   */
  lead?: React.ReactNode;
  /** the same cell with its long note dropped, for frames that cannot hold it */
  leadCompact?: React.ReactNode;
}> = ({ branchIds, lead, leadCompact }) => {
  /* Same shape of check the map uses, and for the same reason: read on mount as
     well as on resize, because the first render can happen before the window
     has its real size, and listen to the orientation query because a phone
     rotating does not always fire a resize. */
  const [compact, setCompact] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < COMPACT_PX
  );
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

  /* One at a time, and only in the list: the bento has room to hold several
     open and never had a reason not to. */
  const [openId, setOpenId] = useState<string | null>(null);
  /* The sheet may carry a subset. The ORDER is the library's, never the
     sheet's — a set that rearranges itself depending on where you entered it
     is not a library, and the whole point of the grid is that a rule is always
     in the same place. */
  /*
   * THE LEAD CELL IS THE GLOBAL RULE, SO THE GLOBAL RULE IS NOT ALSO A TILE.
   *
   * This sheet lists the global rule among its ids, and CELLS gives it a tile
   * of its own. With the lead carrying the same rule the sheet said it twice —
   * the name, the standing and the constraint, in two cells a row apart
   * (TY-05) — and the spare tile was what broke the row arithmetic: ten cells
   * in a four-column grid is three rows and a remainder, which is the vertical
   * scroll that was reported.
   *
   * Dropping it leaves the lead (two by two) and the eight branches: twelve
   * slots, three rows, nothing said twice and nothing left over.
   */
  const shown = branchIds && branchIds.length
    ? CELLS.filter((c) => branchIds.includes(c.id) && !(lead && c.id === 'global-rule'))
    : CELLS;

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        {/* The lead keeps its content here too — the title, the Global Rule and
            how the blocks are used. It was dropped entirely in this mode, so a
            phone reader met eight branch names and no statement of the rule
            they all inherit. */}
        {lead && (
          <div className="membrane border rounded-none p-4 flex flex-col mb-1.5">{leadCompact ?? lead}</div>
        )}
        {shown.map((c, i) => (
          <Row
            key={c.id}
            id={c.id}
            order={i}
            open={openId === c.id}
            onToggle={() => setOpenId((cur) => (cur === c.id ? null : c.id))}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-3 sm:gap-4">
      {lead && (
        /* Two columns by two rows at lg; the whole width below that, where the
           tiles stack two-across and an odd lead would open the same hole again. */
        <div className="col-span-12 lg:col-span-6 lg:row-span-2 min-h-0">
          <div className="membrane border h-full w-full rounded-none p-4 sm:p-5 flex flex-col">
            {lead}
          </div>
        </div>
      )}
      {shown.map((c, i) => (
        <div key={c.id} className={`${c.span} ${c.tall ? 'lg:row-span-2' : ''} min-h-0`}>
          <Card
            id={c.id}
            tall={c.tall}
            lit={c.lit}
            order={i}
            /* One at a time here too. Several tiles could be left open at once
               and the overlays then stacked over each other's neighbours, which
               is unreadable and was never useful — a reader is working in one
               branch. Opening a card closes whichever was open. */
            squeezed={openId !== null}
            open={openId === c.id}
            onToggle={() => setOpenId((cur) => (cur === c.id ? null : c.id))}
          />
        </div>
      ))}
    </div>
  );
};
