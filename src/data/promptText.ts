/**
 * Reading a system prompt as structure instead of as a wall.
 *
 * The prompt texts in `promptData.ts` are written the way a prompt is written:
 * plain text, hard-wrapped by the author at whatever column the manuscript used,
 * with numbered standards inside them. Rendered into a `<pre>` that soft-wraps
 * as well, the two wrapping schemes fight — a line breaks at the author's column
 * AND again at the reader's, the numerals sit inline so a wrapped line runs back
 * under its own number, and the whole thing reads as a block of noise rather
 * than as the five things it actually asks.
 *
 * This reads the shape back out. It changes NOTHING about the words: the copy
 * button still sends the original string, character for character, because that
 * string is what a practitioner pastes into a model and it is the author's.
 * What is discarded is only the author's line breaks INSIDE a run of prose,
 * which were a typewriter decision about column width and never part of the
 * text.
 */

export type PromptBlock =
  | { kind: 'para'; text: string }
  | { kind: 'item'; marker: string; text: string };

/**
 * A line that opens a standard: "1." / "2)" / "a." — or a bullet.
 *
 * The bullet half was missing, and the Global Rule is written entirely in
 * bullets: its nine prohibited mechanics arrived as ONE paragraph with the
 * dashes still inside it — "- Manufactured urgency: … - Manufactured scarcity:
 * …" — which is the wall this parser exists to take apart, surviving in the one
 * rule that needed it most. A hyphen, an en or em dash, a bullet or a middot
 * all open an item; what they are drawn with is settled below.
 */
const ITEM = /^\s*(\d{1,2}[.)]|[a-z][.)]|[-–—•·])\s+(.*)$/i;

/**
 * What goes in the numeral track.
 *
 * A number or a letter is an index and is kept as the author wrote it. A bullet
 * is not an index — it is only a mark saying *another one* — so the four
 * characters the manuscript uses for it are all drawn as the one the app uses,
 * and the track stays a column of identical marks rather than a column of
 * whichever dash happened to be typed.
 */
const markerOf = (raw: string): string =>
  /[0-9a-z]/i.test(raw) ? raw.replace(/[.)]$/, '') : '·';

/**
 * Split a prompt into paragraphs and numbered items.
 *
 * Continuation lines — an indented line under a numbered item, or a further
 * line of the same paragraph — are joined back onto what they continue, so the
 * text wraps to the column it is given rather than to the one it was typed in.
 * A blank line is the only thing that ends a block, which is the convention the
 * prompts were already written to.
 */
export function parsePromptText(raw: string): PromptBlock[] {
  const blocks: PromptBlock[] = [];
  let current: PromptBlock | null = null;

  const flush = () => {
    if (current) {
      current.text = current.text.replace(/\s+/g, ' ').trim();
      if (current.text) blocks.push(current);
    }
    current = null;
  };

  for (const line of raw.split('\n')) {
    if (!line.trim()) { flush(); continue; }
    const m = line.match(ITEM);
    if (m) {
      flush();
      current = { kind: 'item', marker: markerOf(m[1]), text: m[2] };
    } else if (current) {
      current.text += ' ' + line.trim();
    } else {
      current = { kind: 'para', text: line.trim() };
    }
  }
  flush();
  return blocks;
}

/** A run of the prompt that the author gave a heading of its own. */
export interface PromptSection {
  /** the author's heading, verbatim, or null for the text before the first one */
  heading: string | null;
  blocks: PromptBlock[];
}

/**
 * Is this line one of the author's section headings?
 *
 * The Global Rule is written in shouted bands — `CORE TEST (apply before
 * generating anything):`, `PROHIBITED MECHANICS (...):`, `REQUIRED STANDARD:`,
 * `SOURCES GOVERNING THIS RULE:` — and those bands are the structure of the
 * rule rather than a typographic flourish. A heading is recognised by the
 * SHOUT, not by the colon: the branches all open on a line ending in a colon
 * ("When drafting positioning or go-to-market strategy:") and none of them is a
 * heading, so a colon test alone would cut every branch in half at its first
 * sentence.
 *
 * The test is taken on the part before any parenthesis, because two of the four
 * headings carry a lower-case aside inside one.
 */
const isHeading = (line: string): boolean => {
  const head = line.split('(')[0].replace(/:\s*$/, '').trim();
  const letters = head.replace(/[^A-Za-z]/g, '');
  return (
    line.trim().endsWith(':') &&
    letters.length >= 3 &&
    letters === letters.toUpperCase()
  );
};

/**
 * Split a prompt into the bands its author gave it.
 *
 * Used by the ruleset overview sheet, which lays the Global Rule out as a bento
 * rather than as a column: the cells ARE these sections, so the arrangement is
 * the author's own and not an editorial one imposed on top of it (TY-04, LY-01
 * — the layout follows the data rather than the data being cut to fit a
 * layout). A prompt with no shouted heading comes back as a single section with
 * a null heading, which is every branch and the verification gate.
 */
export function parsePromptSections(raw: string): PromptSection[] {
  const sections: PromptSection[] = [];
  let heading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const blocks = parsePromptText(buffer.join('\n'));
    if (blocks.length) sections.push({ heading, blocks });
    buffer = [];
  };

  for (const line of raw.split('\n')) {
    if (isHeading(line)) {
      flush();
      heading = line.trim().replace(/:\s*$/, '');
      continue;
    }
    buffer.push(line);
  }
  flush();
  return sections;
}
