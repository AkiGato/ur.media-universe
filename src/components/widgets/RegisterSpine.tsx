import React from 'react';
import { arcSegment } from '../figures/FigurePrimitives';

/**
 * The Content Pollution Control reading, drawn.
 *
 * WHAT IT PLOTS, AND WHY THERE IS NO SCALE ON IT. The instrument produces two
 * qualitative readings — a producer register and a media-space register — and
 * both are bands rather than scores, for the reason the widget's own header
 * gives: the dossier states no correct number of posts, so an axis with numbers
 * up it would be the oracle behaviour this instrument refuses. What a picture
 * can show that the two words cannot is the RELATION between them. Two stations
 * on one spine say at a glance whether the plan and the space it publishes into
 * agree, and a filament that runs level or runs across is the whole finding.
 *
 * THE SPINE IS THE DOCUMENT'S OWN. Fragile below, Robust above — the order the
 * map arranges the chapters in and the order the manuscript argues them in.
 * Antifragile is not a band here: §5.4 reserves that word for practice made
 * more valuable by the harm others do, and nothing in a publishing cadence does
 * that, which is why the widget never calls either register by it. A band that
 * can never be reached would be a promise the arithmetic cannot keep.
 *
 * EVERY MARK IS A BOWED STROKE (DG-01). The bands, and the filament joining the
 * two stations, are `arcSegment` — including the case where both registers land
 * on the same band and the join would otherwise be a ruled horizontal. The bow
 * is ~5% of the span (DG-04: one dominant low frequency, no scribble).
 *
 * NOTHING HERE IS FILLED (DG-02). Bands and filament are strokes; the only
 * solid marks are the two stations, which that rule admits by name — a bouton,
 * a seed tip, a nucleolus is a bright dot.
 *
 * THE NAMES ARE SAID HERE AND NOWHERE ELSE ON THE CARD (TY-05). This drawing
 * replaced a pair of text readouts that said "Producer / Fragile" and
 * "Media space / Robust" in words; keeping both would have put each register on
 * the card twice. The sentence that explains a band lives on the card's other
 * face, with the rest of the written reading.
 */

export type Register = 'Fragile' | 'Robust';

const W = 300;
const H = 168;

/* Room for the longer band name rather than the average one — the same
   measurement AntifragilityGraph records for "ANTIFRAGILE". The names are set
   `text-anchor="end"` against PAD_L − 10, and "FRAGILE" is seven characters at
   font-size 7 carrying TY-03's 0.2em: ~38 viewBox units against the 42 this
   leaves. TY-08's overrun half, answered the way that rule says to — give the
   label its room rather than shrink the type or narrow the tracking. */
const PAD_L = 52;
const PAD_R = 18;

const ROBUST_Y = 44;
const FRAGILE_Y = 116;
/** where a station sits when its register has not been decided yet */
const UNSET_Y = (ROBUST_Y + FRAGILE_Y) / 2;

const BANDS: Array<{ name: Register; y: number }> = [
  { name: 'Robust', y: ROBUST_Y },
  { name: 'Fragile', y: FRAGILE_Y }
];

const SPAN = W - PAD_L - PAD_R;
const STATIONS = [PAD_L + SPAN * 0.26, PAD_L + SPAN * 0.76];

const EASE = { transition: 'all 0.75s var(--ease-organic)' };

export const RegisterSpine: React.FC<{
  producer: Register | null;
  mediaSpace: Register | null;
  /** names for the two stations, from the panel that owns them */
  labels: [string, string];
}> = ({ producer, mediaSpace, labels }) => {
  const ys: [number, number] = [
    producer ? (producer === 'Robust' ? ROBUST_Y : FRAGILE_Y) : UNSET_Y,
    mediaSpace ? (mediaSpace === 'Robust' ? ROBUST_Y : FRAGILE_Y) : UNSET_Y
  ];
  const set: [boolean, boolean] = [producer !== null, mediaSpace !== null];

  /* The join, bowed even when it is level. Two registers on the same band put
     both stations on one y, and a filament between them with no bow is the
     zero-bow case DG-01 names as a violation in its own right. */
  const join = arcSegment(STATIONS[0], ys[0], STATIONS[1], ys[1], SPAN * 0.05);

  const said = (r: Register | null) => r ?? 'not set';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      role="img"
      aria-label={`${labels[0]}: ${said(producer)}. ${labels[1]}: ${said(mediaSpace)}.`}
    >
      {/* The two registers. Held under a half so the stations are the only
          things on this surface reading as marks rather than as ground. A band
          comes up only when something is actually standing on it. */}
      {BANDS.map((b, i) => {
        const occupied = producer === b.name || mediaSpace === b.name;
        return (
          <g key={b.name}>
            <path
              d={arcSegment(PAD_L - 4, b.y, W - PAD_R, b.y, i === 0 ? 1.4 : -1.4)}
              strokeWidth="0.4"
              opacity={occupied ? 0.42 : 0.16}
              style={EASE}
            />
            {/* SVG font-size is in viewBox units, not pixels — TY-02 exempts it
                by name. Tracking is 0.2em of its own size for caps (TY-03). */}
            <text
              x={PAD_L - 10}
              y={b.y + 2.4}
              textAnchor="end"
              fontSize="7"
              letterSpacing={7 * 0.2}
              className="uppercase"
              fill="currentColor"
              stroke="none"
              opacity={occupied ? 0.95 : 0.28}
              style={EASE}
            >
              {b.name}
            </text>
          </g>
        );
      })}

      {/* The relation. This is the mark the two words could not make: level
          means the plan and the space it publishes into are reading the same
          way, and a run across means they are not. */}
      <path
        d={join}
        strokeWidth={set[0] && set[1] ? 1.5 : 0.7}
        opacity={set[0] && set[1] ? 0.9 : 0.25}
        style={EASE}
      />

      {STATIONS.map((x, i) => (
        <g key={labels[i]}>
          <circle
            cx={x}
            cy={ys[i]}
            r={set[i] ? 2.4 : 1.5}
            fill="currentColor"
            stroke="none"
            opacity={set[i] ? 0.95 : 0.3}
            style={EASE}
          />
          <text
            x={x}
            y={H - 10}
            textAnchor="middle"
            fontSize="7"
            letterSpacing={7 * 0.2}
            className="uppercase"
            fill="currentColor"
            stroke="none"
            opacity={set[i] ? 0.7 : 0.3}
            style={EASE}
          >
            {labels[i]}
          </text>
          {/* the drop from the station to its own name, so a mark high on the
              spine is still attached to the thing it is a reading of */}
          <path
            d={arcSegment(x, ys[i] + 5, x, H - 20, 2.6)}
            strokeWidth="0.35"
            opacity={set[i] ? 0.3 : 0.12}
            style={EASE}
          />
        </g>
      ))}
    </svg>
  );
};
