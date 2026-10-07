/**
 * Authored emphasis, written `*like this*` in the manuscript.
 *
 * Returns the text with the markers removed and the ranges they enclosed, in
 * the coordinates of that clean text. Asterisks are free as a delimiter here:
 * every one in `bookData.ts` is inside a comment, and prose that needs a
 * literal asterisk has none.
 *
 * An unclosed marker is left exactly as it was typed rather than swallowing the
 * rest of the paragraph, which is the failure mode that makes this kind of
 * markup dangerous in a document nobody previews.
 */
export function parseEmphasis(src: string): { text: string; spans: Array<[number, number]> } {
  if (src.indexOf('*') === -1) return { text: src, spans: [] };
  const spans: Array<[number, number]> = [];
  let text = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] === '*') {
      const close = src.indexOf('*', i + 1);
      if (close > i + 1) {
        const inner = src.slice(i + 1, close);
        spans.push([text.length, text.length + inner.length]);
        text += inner;
        i = close + 1;
        continue;
      }
    }
    text += src[i];
    i++;
  }
  return { text, spans };
}

/**
 * A number and its unit are one word.
 *
 * "8 billion" split across a line reads as an eight and then a billion. The
 * manuscript carries three such pairs, and the typesetting rule is that they
 * never separate. Done at render rather than in the data: the manuscript stays
 * verbatim (TY-04), and U+0020 -> U+00A0 keeps the string the same length, so
 * every highlight offset stored against the original paragraph still lands
 * where it was made. Narrow on purpose — only a number immediately followed by
 * a unit word — so it can never touch a sentence that merely contains a digit.
 *
 * IT LIVES HERE, NEXT TO `parseEmphasis`, BECAUSE TWO PLACES NOW SET THE SAME
 * PARAGRAPH. The reader sets it to be read; `utils/proseMetrics.ts` sets it
 * offscreen to find out how tall it is, and the cut of the whole book follows
 * from that number. A non-breaking space changes where a line wraps, so a
 * measurer that skipped this would measure a paragraph the reader never sees —
 * one line short on every paragraph carrying a magnitude.
 */
export const keepUnits = (text: string): string =>
  text.replace(/(\d[\d.,]*%?) (million|billion|km|characters|words|countries|paragraphs|minutes|min|percent)\b/g, '$1 $2');
