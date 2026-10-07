import { useEffect, useState } from 'react';
import { Soma, SomaLabel } from '../organic/Organic';
import type { QuestionRef } from './FiveQuestionsWidget';
import { RegisterSpine, type Register } from './RegisterSpine';

/**
 * Content Pollution Control — the instrument for §5.7, Content Minimisation.
 *
 * It answers one question: how much content can this source put out each week
 * without the sum of it becoming the pollution §1.4 names. And it answers it
 * the only way the dossier permits, which is as a MODEL WITH ITS ASSUMPTIONS
 * SHOWING, not as an oracle. The document holds no research figure for a right
 * number of posts; a calculator that produced one while hiding its arithmetic
 * would fail the third and fourth of the five questions on the sheet it stands
 * beside. So every number here is a stated assumption the reader can change,
 * and every assumption carries a pointer into the section that argues it.
 *
 * WHY IT IS A BENTO AND NOT A COLUMN. It was a single column of every choice
 * and every assumption at once, roughly two and a half screens of it, and the
 * reading — the number the instrument exists to produce — sat at the bottom
 * where you could not see it while you were changing the things that decide it.
 * That is the wrong shape for a calculator: the whole point is watching the
 * answer move.
 *
 * So the choices are curtains on one side, one open at a time, and the reading
 * stands permanently on the other. Nothing scrolls: the panel is given the
 * frame and fills it, which is LY-02 satisfied by fitting rather than by
 * putting a trough inside a sheet.
 *
 * THE TWO REGISTERS, GROUNDED RATHER THAN INVENTED.
 * Asked for: a reading of how the producer's own plan and the shared media
 * space move toward or away from the document's Fragile → Robust spine as the
 * plan changes. A first draft did this with an invented 0–100 "index" and
 * unsourced coefficients — exactly the oracle behaviour this instrument's own
 * epistemics refuse. What replaced it reuses the app's one existing
 * antifragility mechanism (`AntifragilityGraph`'s bands: no partial credit, no
 * score, a qualifying threshold) and drives it from variables the calculator
 * already computes:
 *
 *   producer register     §2.3 — "five goals divide one fair share five ways".
 *                          Concentrated into few goals, none is starved:
 *                          Robust. Spread across most of the five allowed,
 *                          each output thins: Fragile.
 *   media-space register  §1.4 — pollution scales with reach, which is what
 *                          `share` already encodes (FIELDS is ordered by
 *                          reach, and share shrinks as reach grows). A field
 *                          whose reach is wide enough to cut its own fair
 *                          share to the bottom of the table leaves the least
 *                          room for anyone else: Fragile. Everything narrower
 *                          leaves more: Robust.
 *
 * Neither register is ever called Antifragile. §5.4 reserves that word for
 * practice made more valuable by the harm others do, and nothing in a
 * publishing cadence does that — the honest word here, as there, is robust.
 *
 * THE ARITHMETIC, in the document's own terms:
 *
 *   minutes this source may claim  =  budget × share
 *   minutes per goal               =  that ÷ (how many goals are set)
 *   pieces per week, per goal      =  minutes per goal ÷ that goal's cost
 *
 *   budget  minutes of directed attention one person can give one channel in a
 *           week before it depletes — finite (Simon, §2.3) and restored only by
 *           rest (Kaplan & Kaplan, §3.2).
 *   share   the fraction of that budget it is fair for THIS field to claim. It
 *           shrinks with reach, because each piece from a large source lands on
 *           more nervous systems at once (§1.4).
 *   cost    minutes a single piece asks of a person to receive. A property of
 *           the GOAL, not a constant: a two-minute film and an interface string
 *           are not the same draw on the same week.
 *
 * WHY MORE GOALS MEANS LESS OF EACH. The audience's week does not grow because
 * the producer wants more from it. Five goals divide one fair share five ways —
 * §2.3 applied to a content plan rather than argued about.
 */

type Field = 'agency' | 'company' | 'influencer' | 'creator' | 'student' | 'user';
type Product = 'calendar' | 'campaign' | 'other';
type Curtain = 'field' | 'product' | 'goals' | null;
/** what just changed, so its mark can carry the light for one pulse */
type Pulse = { kind: 'field' | 'product' | 'goal'; id: string } | null;
/** which face of the reading is showing */
type Face = 'drawn' | 'written';

/** ordered by reach, because reach is what sets the share */
const FIELDS: Array<{ id: Field; title: string; detail: string; share: number }> = [
  { id: 'agency', title: 'An agency', detail: 'many brands at once', share: 0.03 },
  { id: 'company', title: 'A company', detail: 'one of hundreds a person follows', share: 0.05 },
  { id: 'influencer', title: 'An influencer', detail: 'one of dozens, carried by an algorithm', share: 0.08 },
  { id: 'creator', title: 'A media creator', detail: 'one of dozens, carried by the work', share: 0.1 },
  { id: 'student', title: 'A student', detail: 'a practice audience', share: 0.18 },
  { id: 'user', title: 'A media user', detail: 'a personal account', share: 0.2 }
];

/**
 * The product this plan is for.
 *
 * `other` carries no detail line on purpose. The two named products each have
 * one because each says what its cadence IS, and a line under "Other" would be
 * a sentence describing a thing the dossier does not describe — TY-04's own
 * case. It reads as the steady cadence, because the campaign is the qualified
 * shape here (a horizon, and silence owed after it) and the plain fair share is
 * the unqualified one. An unnamed product gets the arithmetic with nothing
 * added to it rather than a coefficient nobody argued for.
 */
const PRODUCTS: Array<{ id: Product; title: string; detail?: string }> = [
  { id: 'calendar', title: 'An editorial calendar', detail: 'a steady presence, week after week' },
  { id: 'campaign', title: 'A marketing campaign', detail: 'a bounded burst, then silence' },
  { id: 'other', title: 'Other' }
];

/**
 * The goals — the production ruleset's eight branches, each with the draw its
 * output makes on a week. The costs are ASSUMPTIONS and are editable; what is
 * not an assumption is that they differ, which is why a goal changes the
 * quantity.
 */
const GOALS: Array<{ id: string; title: string; cost: number }> = [
  { id: 'branch-1', title: 'Strategy & positioning', cost: 6 },
  { id: 'branch-2', title: 'Editorial calendar', cost: 4 },
  { id: 'branch-3', title: 'Copywriting', cost: 1.5 },
  { id: 'branch-4', title: 'CRM & lifecycle', cost: 2 },
  { id: 'branch-5', title: 'Imagery', cost: 0.5 },
  { id: 'branch-6', title: 'Video & motion', cost: 5 },
  { id: 'branch-7', title: 'Interface & UX copy', cost: 0.5 },
  { id: 'branch-8', title: 'Community & growth', cost: 3 }
];

const MAX_GOALS = 5;
/** at or above this many of the five, each goal is thinned past the point §2.3 calls sustainable */
const CONCENTRATION_FLOOR = 4;
/** at or below this share, reach alone is wide enough to crowd the field — see FIELDS, ordered by reach */
const REACH_CEILING = 0.05;
const CAMPAIGN_HORIZON_WEEKS = 4;
const WEEKS_PER_MONTH = 4;

/** the two registers, named once and read by both faces of the reading (TY-05) */
const REGISTER_NAMES: [string, string] = ['Producer', 'Media space'];

/** half the turn, matching `.turn-face` in index.css — the face swaps at the edge */
const HALF_TURN_MS = 190;

/* The `share` entry was removed rather than left unrendered. It argued the fair
   share under the field chooser — "Pollution scales with reach, so the fair
   share of one person's week shrinks as reach grows" — and was asked to come
   off that card: a chooser of six one-line options does not need a paragraph
   under it. Its two references went with it; §1.4 is still reachable from the
   reading's own written face, which is where the rest of the provenance is. */
/**
 * Where each assumption is argued — as the words themselves, not as a row of
 * chips under them.
 *
 * THE REFERENCE IS A PHRASE IN THE SENTENCE, NOT A LABEL BESIDE IT. Each of
 * these used to render as a paragraph followed by one or two tracked-caps
 * buttons naming the chapter, which is the same thought said twice: the
 * sentence states the claim and the chip states where the claim comes from, and
 * the reader has to carry the first to the second. A link over the words that
 * ARE the claim says both at once and costs no copy at all.
 *
 * WHICH IS ALSO WHY `phrase` MUST BE A SUBSTRING OF `text`, AND IS ASSERTED TO
 * BE. Nothing here is written for the link — every one of these phrases was
 * already in the sentence, and the markup only decides where it stops. That is
 * TY-04 satisfied by construction rather than by care: a reference cannot
 * introduce a word, because it has no text of its own.
 */
const WHY: Record<'budget' | 'cost' | 'model', {
  text: string;
  /** phrases inside `text`, each carrying where that clause is argued */
  links: Array<{ phrase: string; ref: QuestionRef }>;
}> = {
  budget: {
    text: 'Attention is the scarce resource, not content, and it depletes with use. Replace the default with your own Restoration Delta reading.',
    links: [
      { phrase: 'Attention is the scarce resource', ref: { kind: 'chapter', id: 'chapter-2', label: 'Ch II — Attention is finite' } },
      { phrase: 'your own Restoration Delta reading', ref: { kind: 'chapter', id: 'chapter-5', label: '§5.6 — The instrument' } }
    ]
  },
  cost: {
    text: 'What a piece asks of a nervous system to receive it, which is a property of the kind of piece.',
    links: [
      { phrase: 'What a piece asks of a nervous system', ref: { kind: 'chapter', id: 'chapter-5', label: 'Ch V — Soft fascination' } }
    ]
  },
  model: {
    text: 'A model, not a measurement. The dossier states no correct number of posts; it states the arithmetic and asks you to supply the readings.',
    links: [
      { phrase: 'The dossier states no correct number of posts', ref: { kind: 'chapter', id: 'chapter-5', label: '§5.7 — Content minimisation' } }
    ]
  }
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
const say = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ''));

export function ContentBudgetWidget({
  onFollow
}: {
  onFollow?: (ref: QuestionRef) => void;
} = {}) {
  const [field, setField] = useState<Field | null>(null);
  const [product, setProduct] = useState<Product | null>('calendar');
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [budget, setBudget] = useState(30);
  const [costs, setCosts] = useState<Record<string, number>>(
    () => Object.fromEntries(GOALS.map(g => [g.id, g.cost]))
  );
  const [weeks, setWeeks] = useState(2);
  /* ONE CURTAIN AT A TIME. Not a preference: two open panels put this back
     into the scrolling column it replaced, and the reading has to stay on
     screen while a choice is being made. */
  const [open, setOpen] = useState<Curtain>('field');

  /* THE LIGHT THAT CARRIES A CHANGE. A pressed choice used to just relight —
     correct, but every press looked the same as every other and nothing said
     a change had actually travelled anywhere. One mark now pulses on
     `--ease-organic` over 1.15s (the same curve and duration the trajectory's
     own `.answer-pulse` already uses, not a new clock — MO-02), so a fresh
     pick brightens and settles rather than snapping. Nothing moves and
     nothing has ends: this is the saltatory idiom LC-02 requires, not a
     travelling dash. */
  const [pulse, setPulse] = useState<Pulse>(null);
  useEffect(() => {
    if (!pulse) return;
    const t = window.setTimeout(() => setPulse(null), 1150);
    return () => window.clearTimeout(t);
  }, [pulse]);

  /* THE CARD TURNS ON ONE FACE. Only the visible face is ever in the DOM — see
     `.turn-face` in index.css for why stacking two of them is not available
     here. The card rotates a quarter, the face is swapped at that edge, and it
     rotates back, so the height always belongs to the face on show. Under
     reduced motion the CSS drops the rotation and this is a plain swap with a
     280ms pause in it, which is the honest degradation: nothing moves, and the
     reader still ends up on the other face. */
  const [face, setFace] = useState<Face>('drawn');
  const [turning, setTurning] = useState(false);
  useEffect(() => {
    if (!turning) return;
    const swap = window.setTimeout(() => setFace(f => (f === 'drawn' ? 'written' : 'drawn')), HALF_TURN_MS);
    const done = window.setTimeout(() => setTurning(false), HALF_TURN_MS * 2);
    return () => { window.clearTimeout(swap); window.clearTimeout(done); };
  }, [turning]);
  /* A press mid-turn is ignored rather than queued: restarting the rotation
     from a quarter turn reads as a stutter, and the swap timer it would race
     is the thing that decides which face you land on. */
  const turn = () => { if (!turning) setTurning(true); };

  /* START AGAIN. A calculator you cannot clear is one you have to reload the
     app to re-run, and this one is meant to be run against several plans in a
     sitting. Every answer goes back to where it started, including the curtain,
     so the next run begins the way the first one did. */
  const reset = () => {
    setField(null);
    setProduct('calendar');
    setGoalIds([]);
    setBudget(30);
    setCosts(Object.fromEntries(GOALS.map(g => [g.id, g.cost])));
    setWeeks(2);
    setOpen('field');
    /* including the face. Starting again on the written side would open the
       next run on an explanation of the run that just ended. */
    setFace('drawn');
    setTurning(false);
  };
  const touched = field !== null || goalIds.length > 0 || budget !== 30;

  const share = FIELDS.find(f => f.id === field)?.share ?? 0;
  const goals = goalIds.map(id => GOALS.find(g => g.id === id)!).filter(Boolean);
  const claim = budget * share;
  const perGoalMinutes = goals.length > 0 ? claim / goals.length : 0;

  const rows = goals.map(g => {
    const cost = costs[g.id] || g.cost;
    const weekly = cost > 0 ? perGoalMinutes / cost : 0;
    return { ...g, cost, weekly, monthly: weekly * WEEKS_PER_MONTH };
  });

  const totalWeekly = rows.reduce((s, r) => s + r.weekly, 0);
  const totalMonthly = totalWeekly * WEEKS_PER_MONTH;
  const shownWeekly = Number(say(totalWeekly));
  const campaignWeeks = clamp(weeks, 1, CAMPAIGN_HORIZON_WEEKS);
  const campaignPerWeek = (totalWeekly * CAMPAIGN_HORIZON_WEEKS) / campaignWeeks;
  const restWeeks = CAMPAIGN_HORIZON_WEEKS - campaignWeeks;
  const ready = field !== null && product !== null && goals.length > 0;

  /* THE TWO REGISTERS. See the file header for why these are bands, not a
     score, and where each threshold comes from. */
  const producerRegister: { band: Register; note: string } | null = goals.length === 0
    ? null
    : goals.length >= CONCENTRATION_FLOOR
      ? { band: 'Fragile', note: `${goals.length} of ${MAX_GOALS} goals divide the claim that many ways — §2.3.` }
      : { band: 'Robust', note: `${goals.length} of ${MAX_GOALS} goals — concentrated enough that none is starved.` };
  const mediaSpaceRegister: { band: Register; note: string } | null = !field
    ? null
    : share <= REACH_CEILING
      ? { band: 'Fragile', note: `${fieldTitleOf(field)}'s reach cuts its own fair share to the floor — §1.4.` }
      : { band: 'Robust', note: `${fieldTitleOf(field)}'s reach leaves room for other claims on the field — §1.4.` };

  const toggleGoal = (id: string) => {
    setGoalIds(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : prev.length < MAX_GOALS ? [...prev, id] : prev
    );
    setPulse({ kind: 'goal', id });
  };

  /* ── a curtain: its name, what it currently says, and its contents ────── */
  const Curtain = ({
    id, label, value, children
  }: { id: Exclude<Curtain, null>; label: string; value: string; children: React.ReactNode }) => {
    const on = open === id;
    return (
      /* THE OPEN CARD TAKES THE SLACK; ITS CONTENTS DO NOT.
         Both halves of that matter and each was learned by getting it wrong.
         Giving the card's CONTENTS a share of the height put eight 9px goal
         chips in cells 183px tall at 1440×900, every label floating in the
         middle of its own empty box. Giving the card nothing left the column
         packed at the top of a 900px frame with ~380px of black through the
         middle of the bento, which is a hole rather than a margin.
         So the open card grows to fill the slack its column has and its
         contents sit at the top of it at their own size. That slack is the
         difference between this column and the tallest of the three now, not
         the whole frame — the row is content-sized, so an open curtain on a
         900px frame grows by tens of pixels rather than hundreds. Only at lg: below that the column's
         height comes from its content, there is no slack to take, and a
         flex-basis of 0 through an indefinite ancestor is the thing that
         collapsed these cards to 0px once already. */
      <div className={`membrane-faint border rounded-none flex-shrink-0 flex flex-col ${on ? 'lg:flex-1 lg:min-h-0' : ''}`}>
        <button
          onClick={() => setOpen(on ? null : id)}
          aria-expanded={on}
          className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left rounded-none outline-none"
        >
          <span className="flex items-center gap-2 flex-shrink-0">
            <Soma size={on ? 9 : 7} opacity={on ? 0.9 : 0.4} phase={label.length * 2.7} />
            {/* The name does not wrap. "Goals — 5 of 5" broke to three lines
                against a long value, which turned the card's own header into
                the tallest thing on it. The value gives ground instead: it
                truncates, and the open card says it in full. */}
            <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70 whitespace-nowrap">{label}</span>
          </span>
          {/* The current answer rides the closed curtain, so a shut panel still
              says what it decided — otherwise closing one hides the choice and
              the reader has to open all four to read their own setup. */}
          <span className="text-[12px] font-light opacity-70 truncate text-right min-w-0">{value}</span>
        </button>
        {on && (
          /* `content-start` is what keeps the contents their own size while the
             card around them grows — and the scroller is for the case where
             the card is the smaller of the two. */
          <div className="settle px-3 pb-3 flex flex-col gap-2.5 content-start lg:min-h-0 lg:overflow-y-auto soft-scroll">
            {children}
          </div>
        )}
      </div>
    );
  };

  /* A row per choice, at the height of a row. The just-picked mark carries the
     pulse. Two columns once there is width for them, so six fields read as a
     block rather than as a long ladder. */
  const Choice = <T extends string>({
    kind, items, value, onPick
  }: { kind: 'field' | 'product'; items: Array<{ id: T; title: string; detail?: string }>; value: T | null; onPick: (v: T) => void }) => (
    <div className={`grid gap-1 ${items.length > 2 ? 'sm:grid-cols-2' : ''}`}>
      {items.map((it, i) => {
        const on = value === it.id;
        const justPicked = pulse?.kind === kind && pulse.id === it.id;
        return (
          <button
            key={it.id}
            onClick={() => { onPick(it.id); setPulse({ kind, id: it.id }); }}
            aria-pressed={on}
            className={`w-full text-left px-2.5 py-2 flex flex-col gap-0.5 rounded-none ${on ? 'bud-lit' : 'bud'}`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Soma size={7} opacity={on ? 0.95 : 0.35} phase={(i * 5.1) % 19} className={justPicked ? 'answer-pulse' : undefined} />
              <span className="text-[12px] font-light uppercase truncate">{it.title}</span>
            </span>
            {/* A choice with nothing to add says nothing rather than reserving
                an empty line for symmetry — "Other" is the whole of what that
                option can honestly be called (TY-04). */}
            {it.detail && (
              <span className="text-[9px] font-light opacity-45 truncate pl-[15px]">{it.detail}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  const Assumption = ({
    label, unit, value, onChange, min, max, step
  }: { label: string; unit: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number }) => (
    <label className="flex items-baseline gap-2.5">
      <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70 flex-1 min-w-0">{label}</span>
      <input
        type="number" inputMode="decimal" value={value} min={min} max={max} step={step}
        onChange={e => onChange(clamp(parseFloat(e.target.value), min, max))}
        className="w-14 bg-transparent border-none text-[12px] font-light focus:outline-none rounded-none text-right"
      />
      <span className="text-[9px] font-light opacity-45 w-[7.5rem] flex-shrink-0">{unit}</span>
    </label>
  );

  /**
   * One provenance line, with its references set in it.
   *
   * The sentence is cut at its own linked phrases and the pieces are laid back
   * down in order, so the paragraph is still exactly the string in `WHY` — the
   * markup decides where a link starts and stops and nothing else. A phrase
   * that is not found is rendered as plain text rather than dropped, because
   * losing a clause to a typo in a selector would be silent.
   *
   * The link register is the one the sheet already uses for a way out of the
   * prose (`Explore sources` on a chapter sheet): underlined at a hairline,
   * offset far enough not to touch the descenders, and coming up to full on
   * hover by opacity alone. No box, no chip, no tracked caps — those said the
   * chapter's name a second time, which is what this replaced.
   */
  const Why = ({ k }: { k: keyof typeof WHY }) => {
    const { text, links } = WHY[k];

    type Piece = { t: string; ref?: QuestionRef };
    const pieces: Piece[] = [];
    let rest = text;
    let guard = 0;
    while (rest.length > 0 && guard++ < 32) {
      /* the earliest phrase still ahead of us, so the sentence is walked in
         reading order however `links` happens to be ordered */
      let at = -1;
      let hit: (typeof links)[number] | null = null;
      for (const l of links) {
        const i = rest.indexOf(l.phrase);
        if (i >= 0 && (at < 0 || i < at)) { at = i; hit = l; }
      }
      if (!hit || at < 0) break;
      if (at > 0) pieces.push({ t: rest.slice(0, at) });
      pieces.push({ t: hit.phrase, ref: hit.ref });
      rest = rest.slice(at + hit.phrase.length);
    }
    if (rest.length > 0) pieces.push({ t: rest });

    return (
      <p className="text-[9px] font-light leading-relaxed opacity-45 pt-1 flex-shrink-0">
        {pieces.map((p, i) =>
          p.ref && onFollow ? (
            /* A SPAN, BECAUSE A BUTTON CANNOT BE INLINE. An inline-block box is
               not broken across lines, so a five-word phrase set as a `<button>`
               is one unbreakable run that pushes the measure out rather than
               wrapping — and `display: inline` does not fix it, because Chrome
               coerces a button back to inline-block whatever the sheet says
               (measured: `.inline` present and applying, computed `inline-block`
               regardless). The same `role`/`tabIndex`/key handling the figures
               already use on their own non-button affordances, which is what
               keeps it a control for anything that is not a mouse. */
            <span
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => onFollow(p.ref!)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFollow(p.ref!); }
              }}
              className="underline underline-offset-4 decoration-[0.5px] opacity-80 hover:opacity-100 transition-opacity duration-500 cursor-pointer rounded-none outline-none"
              title={`Go to ${p.ref.label}`}
            >
              {p.t}
            </span>
          ) : (
            <span key={i}>{p.t}</span>
          )
        )}
      </p>
    );
  };

  const fieldTitle = FIELDS.find(f => f.id === field)?.title;
  const productTitle = PRODUCTS.find(p => p.id === product)?.title;

  /**
   * The count, at the top of whichever face is showing.
   *
   * ONE HERO, ONE QUALIFIER. Both counts sat at 18 once and read as a pair of
   * equals, so the panel had two subjects. The week is what the instrument is
   * for; the month is the same finding at another scale, and it is set at 12 to
   * say so.
   *
   * Defined once because both faces carry it. It was written out twice while
   * only the drawn face had it, which is the sort of duplication that survives
   * until the two copies disagree about a rounding.
   */
  const Hero = () =>
    product !== 'campaign' ? (
      <div className="flex-shrink-0 flex items-baseline gap-2.5 flex-wrap">
        <span className="text-[18px] font-light leading-none">{say(totalWeekly)}</span>
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45">a week</span>
        <span className="text-[12px] font-light opacity-70 pl-2">{say(totalMonthly)}</span>
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45">a month</span>
      </div>
    ) : (
      <div className="flex-shrink-0 flex items-baseline gap-2.5 flex-wrap">
        <span className="text-[18px] font-light leading-none">{say(campaignPerWeek)}</span>
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-70">
          a week for {campaignWeeks} {campaignWeeks === 1 ? 'week' : 'weeks'}
        </span>
      </div>
    );

  /* THE ARITHMETIC, WITH THIS READER'S NUMBERS IN IT.
     Asked for as a panel of its own, and it is the one thing that turns a
     number into a model: the instrument's whole claim is that it is a model
     with its assumptions showing, and until now the assumptions showed but the
     working did not. Each line is the step above it, evaluated. The two
     registers' own thresholds are included here too, in the same terms as
     every other line — a qualifying condition, not a hidden coefficient. */
  const formula = [
    {
      label: 'Fair claim on one week',
      expr: 'budget × share',
      value: field ? `${budget} × ${Math.round(share * 100)}% = ${say(claim)} min` : '—'
    },
    {
      label: 'Divided by the goals set',
      expr: 'claim ÷ goals',
      value: goals.length ? `${say(claim)} ÷ ${goals.length} = ${say(perGoalMinutes)} min` : '—'
    },
    {
      label: 'Pieces, per goal',
      expr: 'minutes ÷ cost',
      value: rows.length
        ? `${say(perGoalMinutes)} ÷ ${rows[0].cost} = ${say(rows[0].weekly)} / wk`
        : '—'
    },
    {
      label: 'A month',
      expr: 'week × 4',
      value: ready ? `${say(totalWeekly)} × 4 = ${say(totalMonthly)}` : '—'
    },
    {
      label: 'Producer register',
      expr: `goals ≥ ${CONCENTRATION_FLOOR} → Fragile`,
      value: producerRegister ? producerRegister.band : '—'
    },
    {
      label: 'Media-space register',
      expr: `share ≤ ${Math.round(REACH_CEILING * 100)}% → Fragile`,
      value: mediaSpaceRegister ? mediaSpaceRegister.band : '—'
    }
  ];

  return (
    <div className="text-current flex flex-col min-h-0 h-full py-0.5 gap-2">

      {/* ── head: what this is, and the way to start again ─────────────── */}
      <div className="flex-shrink-0 flex items-baseline justify-between gap-3 pb-1.5 border-b">
        <h2 className="title-face text-[18px] font-light leading-none">Content Pollution Control</h2>
        <button
          onClick={reset}
          disabled={!touched}
          className="bud px-2.5 py-1 text-[9px] font-light uppercase tracking-[0.2em] rounded-none flex items-center gap-2 disabled:opacity-25"
          title="Clear every answer and start again"
        >
          <Soma size={7} opacity={touched ? 0.7 : 0.3} phase={12.4} />
          <span>Start again</span>
        </button>
      </div>

      {/* ── the bento ───────────────────────────────────────────────────
          Three columns on a wide frame, two in the middle, stacking on a narrow
          one. The choices hold one column and the reading holds the next for
          its whole height, so the number is never off screen while it is being
          changed — which is the entire reason this stopped being a column. */}
      {/* THREE SHAPES, AND THE NARROW ONE SCROLLS ITSELF.
          At lg: the fitted bento — the choices, the reading beside them for
          their whole height, and the working in the third column — and nothing
          scrolls, because it is sized to the frame.

          At sm the working drops under both and the reading comes up beside the
          choices. It used to go the other way: the choices went two across and
          the reading fell underneath them, which put the number the instrument
          exists to produce below the fold of its own panel on every tablet. The
          rows stay `min-content` here for the reason the next paragraph gives —
          a `1fr` row in a box with a definite height is the failure this panel
          has already had twice.

          Below sm every card stacks, and the stack can be taller than a short
          frame however tight the cards are: three cards plus a reading plus the
          working does not fit 340px of landscape phone at any padding. Two
          earlier attempts to make it fit by force both failed in the same
          place. `auto / minmax(0,1fr) / auto` handed the leftover to the
          reading, which works until the choices alone exceed the frame — then
          the reading's row resolves to nothing, its content has no box to sit
          in, and it paints over the cards above and below it (measured at
          720×340: the reading and the working both overlapping `What for`).
          Stretching the cards to absorb the slack was the other attempt, and
          that is what put eight 9px chips in 183px cells.

          So below lg the rows are `min-content` and this container carries the
          scroller — including the two-column shape at sm, where the reading and
          the choices share a row and grid's own `stretch` gives the shorter of
          them the taller one's height without either row being told a size.
          That is the same slack the open curtain takes at lg, arrived at
          without a flexible track anywhere near it.

          `auto` was tried first and is the trap: an `auto` track is
          flexible under space pressure, so in a container with a definite
          height the rows SHRINK rather than overflow — measured at 720×340,
          `grid-template-rows` resolved to `0px 33.6px 129.6px` with 318px of
          choices inside the 0px one, which is precisely why the reading and
          the working were painting over the cards. A `min-content` track does
          not give ground, the grid therefore exceeds its box, and the
          scroller engages instead. LY-02 allows exactly this: the viewport
          still never scrolls, content scrolls inside its own column on
          `.soft-scroll`. Kept on at lg too, where it costs nothing because the
          content fits, and means a frame nobody has measured yet scrolls
          rather than clips.

          AND THE lg ROW IS `min-content` AS WELL, WITH THE BAND CENTRED. It
          was `minmax(0,1fr)`, which gave the three cards the whole column
          whatever they held: measured at 1440x900 with nothing chosen, all
          three stood 764.7px tall and the working — the one card whose height
          is its own content, since it has no flexible child to hand the slack
          to — carried 482.8px of black under 281.9px of arithmetic. The row is
          the tallest card's own height now (307.3px) and `align-content`
          centres the band, so the spare height sits above and below it as
          ground: the working's void falls to 25.4px, which is the difference
          between it and its neighbours, and the 6px of phantom scroll range
          the flexible track rounded into existence goes to 0.

          `safe`, not bare `center`: on a frame too short for the band, plain
          centring overflows past both edges and the top of the first card
          cannot be scrolled back to. `safe` falls back to the start edge as
          soon as the content exceeds the box, which is what keeps LY-02's
          promise that content is reachable rather than clipped. */}
      <div className="grid grid-rows-[repeat(3,min-content)] sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[min-content] lg:[align-content:safe_center] gap-2.5 min-h-0 flex-1 overflow-y-auto soft-scroll">

        {/* THE CHOICES ARE ONE COLUMN, ALWAYS.
            They were two sub-columns of two cards, and with one curtain open at
            a time that guarantees a hole: whichever sub-column does not hold
            the open card packs to the top and leaves the rest of its height
            black — measured at 1440×900, ~380px of it through the middle of the
            bento. In one column the open card is always the card that takes the
            slack, so the column always fills.

            They also went two across between sm and lg, to keep four cards off
            a tablet as a ladder. There are three now and the reading sits in
            the other half of that row, so the width that used to be spent on a
            second column of choices is spent on the answer instead — which is
            the thing the panel is for. */}
        {/* `min-w-0`, for the reason the reader's foot bar carries it. A grid
            item's automatic minimum is its content's minimum, and the goals
            curtain's closed value — "Copywriting, Imagery, Video & motion" — is
            `truncate`, whose `overflow: hidden` sits on the span and so never
            shrinks this column. Measured at 320px with three goals set: the
            column stood at 345px inside a 288px cell and the curtain headers
            ran off the right edge of the phone, un-truncated, with the page
            unable to scroll to them (LY-02). Released, the column is 290px and
            the value ellipsises as it was always meant to. */}
        <div className="flex flex-col gap-2.5 min-h-0 min-w-0">
          <Curtain id="field" label="Who is producing" value={fieldTitle ?? 'Not set'}>
            <Choice<Field> kind="field" items={FIELDS} value={field} onPick={v => { setField(v); setOpen('product'); }} />
          </Curtain>

          {/* Product sits between the producer and the goals because that is
              the order the arithmetic runs in: who is claiming, what they are
              claiming for, and then what they will spend the claim on. It was
              the second card already, but in a two-across grid it read as the
              thing beside the producer rather than the thing after it. */}
          <Curtain id="product" label="Product" value={productTitle ?? 'Not set'}>
            <Choice<Product> kind="product" items={PRODUCTS} value={product} onPick={v => { setProduct(v); setOpen('goals'); }} />
            {product === 'campaign' && (
              <div className="pt-1.5 flex-shrink-0">
                <Assumption
                  label="Campaign length"
                  unit={`of ${CAMPAIGN_HORIZON_WEEKS} weeks' share`}
                  value={campaignWeeks} onChange={setWeeks}
                  min={1} max={CAMPAIGN_HORIZON_WEEKS} step={1}
                />
              </div>
            )}
          </Curtain>

          <Curtain id="goals" label={`Goals — ${goalIds.length} of ${MAX_GOALS}`}
            value={goals.length ? goals.map(g => g.title).join(', ') : 'None set'}>
            {/* A chip is the size of its own label. `auto-rows-fr` was tried
                here and is the one thing on this panel that has to stay out:
                it made every row an equal share of the card's height, which
                at 1440×900 meant eight 9px chips in 183px cells. */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(136px,1fr))] gap-1">
              {GOALS.map((g, i) => {
                const on = goalIds.includes(g.id);
                const blocked = !on && goalIds.length >= MAX_GOALS;
                const justPicked = pulse?.kind === 'goal' && pulse.id === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGoal(g.id)}
                    aria-pressed={on}
                    disabled={blocked}
                    className={`bud px-2.5 py-2 text-[9px] font-light uppercase tracking-[0.2em] rounded-none flex items-center gap-2 text-left ${on ? 'bud-lit' : ''}`}
                  >
                    <Soma size={6} opacity={on ? 0.95 : 0.4} phase={(i * 4.7) % 19} className={justPicked ? 'answer-pulse' : undefined} />
                    <span>{g.title}</span>
                  </button>
                );
              })}
            </div>
          </Curtain>
        </div>

        {/* ── the reading, which has two faces ─────────────────────────────
            It sits beside the choices rather than under them, in the half of
            the row the second column of choices used to hold.

            THE DRAWN FACE IS THE FRONT. Asked for: illustrate the reading, and
            let the card turn to the written explanation. The division fell out
            of what each face is good for. A drawing answers "where does this
            plan sit" in one look and cannot answer "why"; the sentences answer
            why and take longer than a look. Putting both on one face is what
            the panel was already doing, and it is why the written reading had
            to be scrolled past to reach the numbers under it.

            WHAT MOVED TO THE BACK, AND WHY IT IS NOT HIDDEN. The registers used
            to be two text readouts here — "Producer / Fragile", "Media space /
            Robust" — each with a line of explanation. The drawing says the two
            bands and the relation between them, so keeping the readouts would
            be the same fact twice on one face (TY-05). The sentences that
            explain a band are on the written face with the rest of the prose,
            one turn away, which is where every other explanation on this
            instrument already lives. */}
        {/* `min-w-0` — the third place on this panel that needs it, and the
            one that hid the longest. A grid item's automatic minimum is its
            content's minimum, and the per-goal rows inside the card report
            285px of it. Measured at 320px with five goals: the card stood at
            319px in a 288px cell and ran 15px past the right edge of the
            phone, where `.app-shell`'s `overflow: hidden` cut it — so the
            curtain values and the reading both lost their last characters with
            no ellipsis and nothing to scroll to.

            It survived a clean sweep because this panel is not portalled: it
            renders inside the sheet, and the sheet is a `.hflow` with
            `overflow-x: auto`, so an audit that skips anything inside a
            horizontally scrollable ancestor — correctly, for the prose columns
            — waves the instrument through as well. The measurement that found
            it was the card's own rect against the viewport. */}
        <div className="turn-hold flex min-h-0 min-w-0">
          <div
            data-turning={turning ? 'true' : 'false'}
            className="turn-face membrane-faint border rounded-none p-4 flex flex-col min-h-0 gap-3 w-full"
            role="status"
            aria-live="polite"
          >
            <div className="flex-shrink-0 flex items-center justify-between gap-3">
              <SomaLabel opacity={0.7} phase={3.9}>The reading</SomaLabel>
              {/* The name of the face you are NOT on, which is what the control
                  gets you. Naming the face you are on would be the title of the
                  thing you are already looking at. */}
              <button
                onClick={turn}
                className="bud px-2 py-1 text-[9px] font-light uppercase tracking-[0.2em] rounded-none flex items-center gap-2"
                title={face === 'drawn' ? 'Turn the card to the written reading' : 'Turn the card to the drawn reading'}
              >
                <Soma size={7} opacity={0.7} phase={16.3} />
                <span>{face === 'drawn' ? 'In words' : 'Drawn'}</span>
              </button>
            </div>

            {face === 'drawn' ? (
              <div className="flex-1 min-h-0 overflow-y-auto soft-scroll flex flex-col gap-3">
                {!ready ? (
                  <p className="text-[12px] font-light leading-relaxed opacity-70">
                    Say who is producing, the product, and at least one goal.
                  </p>
                ) : (
                  <Hero />
                )}

                {/* The drawing takes the slack at lg, where the card has height
                    to give it, and its own size everywhere else. Same trade the
                    open curtain makes, and for the same reason: a flex basis of
                    0 through an indefinite ancestor is what collapsed the cards
                    on this panel once already. */}
                {(producerRegister || mediaSpaceRegister) && (
                  <div className="lg:flex-1 lg:flex lg:items-center lg:min-h-0">
                    <RegisterSpine
                      producer={producerRegister?.band ?? null}
                      mediaSpace={mediaSpaceRegister?.band ?? null}
                      labels={REGISTER_NAMES}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* EVERYTHING THAT FLOWS, IN ONE SCROLLER.
                 Only the per-goal list could shrink before, so on a short frame
                 the paragraph above it had nowhere to go and the stage — which
                 clips rather than scrolls — cut it. Measured at 640×700 with
                 five goals: 8px of "A person can give this channel about 30
                 minutes a week…" gone, with no way to reach it. LY-02 allows
                 content to scroll inside its own column; it does not allow it
                 to be cut. The header stays put and everything under it
                 scrolls. */
              <div className="flex-1 min-h-0 overflow-y-auto soft-scroll flex flex-col gap-2.5">
                {/* THE COUNT LEADS ON THIS FACE TOO.
                    The written face opened on its own explanation, so the one
                    thing the instrument exists to produce was three lines of
                    prose away on the side of the card that is meant to say why.
                    The hero is the same block the drawn face carries, and the
                    two faces are never on screen together, so saying it on both
                    is not saying it twice (TY-05) — it is the same thing said
                    once, whichever way the card is facing. What follows it is
                    now unambiguously a gloss on a number already read, which is
                    the hierarchy 18 → 12 → 9 exists to give. */}
                {ready && <Hero />}

                {!ready ? (
                  <p className="text-[12px] font-light leading-relaxed opacity-70">
                    Say who is producing, the product, and at least one goal.
                  </p>
                ) : product !== 'campaign' ? (
                  /* THE ARITHMETIC AS A SEQUENCE, NOT AS ONE BREATH. It was a
                     single sentence carrying the budget, the share, the claim
                     and the division — four steps, three of them behind commas
                     and an em dash, and the reader had to hold all of it to the
                     end. The steps are the same and so are almost all of the
                     words; what changed is that each one now closes before the
                     next begins, and the per-goal figure is stated rather than
                     left to be inferred from the rows underneath. */
                  <p className="text-[12px] font-light leading-relaxed opacity-70">
                    A person gives this channel about {budget} minutes a week. It is fair for {fieldTitle?.toLowerCase()} to claim about {Math.round(share * 100)}% of that — {say(claim)} minutes. {goals.length === 1 ? 'One goal has all of it.' : `${goals.length} goals divide it into ${say(perGoalMinutes)} minutes each.`} {shownWeekly < 1 ? 'Under one piece a week, which is a finding about the assumptions rather than a fault in the arithmetic.' : 'Publishing more than this depends on attention the audience does not have to give.'}
                  </p>
                ) : (
                  <p className="text-[12px] font-light leading-relaxed opacity-70">
                    {CAMPAIGN_HORIZON_WEEKS} weeks of a fair share concentrated into {campaignWeeks}. {restWeeks > 0 ? `It then owes ${restWeeks} ${restWeeks === 1 ? 'week' : 'weeks'} of silence, or it is not a campaign but a cadence.` : 'Spread over the whole horizon, it is the calendar.'}
                  </p>
                )}

                {/* What each band on the drawing turns on. These are the lines
                    the old text readouts carried; the drawing says which band,
                    and this says why it is that one. */}
                {(producerRegister || mediaSpaceRegister) && (
                  <div className="space-y-1.5 pt-0.5">
                    {([[REGISTER_NAMES[0], producerRegister], [REGISTER_NAMES[1], mediaSpaceRegister]] as const).map(
                      ([name, reading]) => reading && (
                        <div key={name} className="flex items-baseline gap-2">
                          <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45 w-[5.5rem] flex-shrink-0">{name}</span>
                          <p className="text-[9px] font-light leading-snug opacity-45 flex-1 min-w-0">{reading.note}</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {ready && (
                  <div className="space-y-1 pt-0.5">
                    {/* PLAIN. This list carries no scroller and no flex basis of
                        its own — the face above is the single box that scrolls,
                        so a second scroller here would put a trough inside a
                        trough and let the rows shrink independently of the
                        paragraph they belong to.

                        It did briefly own the scrolling, and that is the version
                        to avoid: with only the rows able to give ground, a short
                        frame had nowhere to put the text above them, and at
                        640×700 with five goals the stage clipped 8px of the
                        reading's own paragraph — unreachable, which is the one
                        thing LY-02 does not allow. */}
                    {rows.map((r, i) => (
                      <div key={r.id} className="flex items-baseline gap-2 text-[12px] font-light">
                        <Soma size={6} opacity={0.6} phase={(i * 6.3) % 19} />
                        <span className="text-[9px] uppercase tracking-[0.2em] opacity-70 flex-1 min-w-0 truncate">{r.title}</span>
                        <label className="flex items-baseline gap-1 flex-shrink-0" title={`Minutes to receive one piece of ${r.title.toLowerCase()}`}>
                          <input
                            type="number" inputMode="decimal" value={r.cost} min={0.5} max={120} step={0.5}
                            onChange={e => setCosts(c => ({ ...c, [r.id]: clamp(parseFloat(e.target.value), 0.5, 120) }))}
                            className="w-9 bg-transparent border-none text-[12px] font-light focus:outline-none rounded-none text-right opacity-70"
                          />
                          <span className="text-[9px] uppercase tracking-[0.2em] opacity-45">min</span>
                        </label>
                        <span className="opacity-90 flex-shrink-0">{say(r.weekly)} / wk</span>
                        <span className="opacity-55 flex-shrink-0">{say(r.monthly)} / mo</span>
                      </div>
                    ))}
                    <Why k="cost" />
                  </div>
                )}

                {/* The provenance note lives INSIDE the scroller, not pinned
                    under it. Pinned it could not shrink, and on a short narrow
                    frame — measured at 375×812 — its 142px of text ran straight
                    out of the panel and was clipped by the stage. */}
                <Why k="budget" />
              </div>
            )}
          </div>
        </div>

        {/* ── the working ──────────────────────────────────────────────────
            The third column at lg, full height beside the reading it explains;
            under both of them at sm. It was a full-width bar under everything,
            which put the one panel nobody reads first across the widest measure
            on the sheet and left the choices column short.

            THE ASSUMPTION LIVES WHERE IT IS SPENT. The attention budget had a
            curtain of its own — one number, a unit and a provenance note, in a
            card the same size as the three that actually decide the answer, and
            it shut to read "30 min · 0%" against a field nobody had chosen yet.
            It is an input to the first line of this panel and to nothing else,
            so it is now that line: `budget × share`, with the budget editable
            in place. The instrument's claim is a model with its assumptions
            showing, and an assumption shown inside the arithmetic that consumes
            it is showing more than one boxed off on its own. */}
        <div className="membrane-faint border rounded-none p-3.5 flex flex-col min-h-0 sm:col-span-2 lg:col-span-1">
          <SomaLabel opacity={0.7} phase={7.1}>How it is worked out</SomaLabel>
          <div className="flex-shrink-0 pt-2.5">
            <Assumption label="Attention budget" unit="min / person / week"
              value={budget} onChange={setBudget} min={1} max={600} step={1} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-x-6 gap-y-1.5 pt-2.5 lg:gap-y-2.5 content-start min-h-0 overflow-y-auto soft-scroll">
            {formula.map(f => (
              <div key={f.label} className="flex items-baseline gap-2 min-w-0">
                <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45 flex-1 min-w-0 truncate">
                  {f.label}
                </span>
                <span className="text-[9px] font-light opacity-45 flex-shrink-0">{f.expr}</span>
                <span className="text-[12px] font-light opacity-100 flex-shrink-0">{f.value}</span>
              </div>
            ))}
            <div className="pt-1 sm:col-span-2 lg:col-span-1">
              <Why k="model" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fieldTitleOf(id: Field): string {
  return FIELDS.find(f => f.id === id)?.title ?? '';
}
