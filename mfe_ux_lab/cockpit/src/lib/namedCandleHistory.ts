import { detectNamedCandlePatternsAt, namedCandleAtrAt, namedCandleOutcomeDirection, NAMED_CANDLE_PATTERNS, type NamedCandlePattern, type PatternBar, type OutcomeDirection } from "./candlePatternAtlas.ts";
import { namedCandlePatternDirection } from "./namedCandleKnowledge.ts";

export interface NamedCandleOccurrence {
  i: number; time: string; nextBar: OutcomeDirection | null;
  unavailable: "TAIL" | "GAP" | "INVALID" | "FORMING" | null;
}
/** Durable identity; numeric ordinals and saved outcomes are never trusted. */
export interface NamedCandleFocus { pattern: NamedCandlePattern; time: string }

export function resolveNamedCandleFocus(bars: PatternBar[], focus: NamedCandleFocus): NamedCandleOccurrence | null {
  if (!NAMED_CANDLE_PATTERNS.includes(focus.pattern)) return null;
  const time = Date.parse(focus.time);
  if (!Number.isFinite(time)) return null;
  const i = bars.findIndex(bar => Date.parse(bar.t) === time);
  const occurrence = namedCandleOccurrenceAt(bars, i);
  return occurrence && detectNamedCandlePatternsAt(bars, i).includes(focus.pattern) ? occurrence : null;
}
const valid = (bar: PatternBar | undefined): bar is PatternBar => !!bar && bar.closed !== false && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite) && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c);

export function namedCandleOccurrenceAt(bars: PatternBar[], i: number): NamedCandleOccurrence | null {
  if (!Number.isInteger(i) || i < 0 || i >= bars.length) return null;
  const from = Math.max(0, i - 14);
  for (let j = from; j <= i; j++) {
    if (!valid(bars[j]) || !Number.isFinite(Date.parse(bars[j].t)) || Date.parse(bars[j].t) % 300_000 !== 0 || (j > from && Date.parse(bars[j].t) - Date.parse(bars[j - 1].t) !== 300_000)) return null;
  }
  const next = bars[i + 1];
  const nextMs = next ? Date.parse(next.t) : NaN;
  // Keep malformed/off-grid future rows distinct from a valid timestamp that
  // skips a transition. Forming status remains authoritative while the bar is
  // mutable, even if its timestamp is not yet usable.
  const unavailable = !next ? "TAIL"
    : next.closed === false ? "FORMING"
      : !valid(next) || !Number.isFinite(nextMs) || nextMs % 300_000 !== 0 ? "INVALID"
        : nextMs - Date.parse(bars[i].t) !== 300_000 ? "GAP"
          : null;
  return { i, time: bars[i].t, nextBar: unavailable ? null : namedCandleOutcomeDirection((next.c - bars[i].c) / namedCandleAtrAt(bars, i)), unavailable };
}

/** Every evaluable occurrence of one taxonomy shape, without similarity ranking
 * or sample truncation. Uses the Atlas detector and its exact +/-0.12 ATR H+1
 * rule. Missing future outcomes remain in history but outside the rate denominator.
 */
export function scanNamedCandleHistory(bars: PatternBar[], pattern: NamedCandlePattern) {
  const history: NamedCandleOccurrence[] = [];
  const counts = { UP: 0, DOWN: 0, FLAT: 0 };
  const unavailable = { TAIL: 0, GAP: 0, INVALID: 0, FORMING: 0 };
  const direction = namedCandlePatternDirection(pattern);
  let evaluated = 0, excludedSetups = 0;
  const result = (ok: boolean, reason: string | null = null) => {
    const observed = counts.UP + counts.DOWN + counts.FLAT;
    const wins = direction === "UP" ? counts.UP : direction === "DOWN" ? counts.DOWN : 0;
    return { ok, reason, pattern, direction, history, counts, unavailable, evaluated, excludedSetups, totalBars: bars.length, observed, occurrences: history.length, hitRate: direction !== "NEUTRAL" && observed ? wins / observed : null };
  };
  if (!NAMED_CANDLE_PATTERNS.includes(pattern)) return result(false, "UNKNOWN_PATTERN");
  const times = bars.map(bar => Date.parse(bar.t));
  if (times.some((time, i) => !Number.isFinite(time) || time % 300_000 !== 0 || (i > 0 && time <= times[i - 1]))) return result(false, "INVALID_M5_ORDER");
  let lastBad = -1, lastGap = -1;
  for (let i = 0; i < bars.length; i++) {
    if (!valid(bars[i])) lastBad = i;
    if (i > 0 && times[i] - times[i - 1] !== 300_000) lastGap = i;
    // ATR14 reads 14 true ranges, including the previous close of the first.
    // A short retained prefix uses the same partial ATR as the Atlas detector.
    const from = Math.max(0, i - 14);
    if (lastBad >= from || lastGap > from) { excludedSetups++; continue; }
    evaluated++;
    if (!detectNamedCandlePatternsAt(bars, i).includes(pattern)) continue;
    const occurrence = namedCandleOccurrenceAt(bars, i)!;
    if (occurrence.nextBar) counts[occurrence.nextBar]++; else unavailable[occurrence.unavailable!]++;
    history.push(occurrence);
  }
  return result(true);
}

export type NamedCandleHistory = ReturnType<typeof scanNamedCandleHistory>;
