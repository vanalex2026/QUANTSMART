import { candleWindowGeometry } from "./candleWindowGeometry.ts";
import type { PriceActionOccurrence } from "./priceActionDetector.ts";

export interface BarrierBar {
  t: string; o: number; h: number; l: number; c: number; closed?: boolean;
}
export type BarrierOutcome = "TARGET_FIRST" | "INVALIDATION_FIRST" | "AMBIGUOUS" | "TIMEOUT" | "INCOMPLETE" | "DATA_GAP" | "INVALID_DATA" | "NEUTRAL" | "INVALID_SETUP";
export const BARRIER_HORIZON = 24;
export const BARRIER_OUTCOME_LABELS: Record<BarrierOutcome, string> = {
  TARGET_FIRST: "Target touched first", INVALIDATION_FIRST: "Invalidation touched first",
  AMBIGUOUS: "Both touched in one candle; order unknown", TIMEOUT: "Neither touched within 24 bars",
  INCOMPLETE: "Waiting for more closed M5 bars", DATA_GAP: "Unobserved path across an M5 data gap",
  INVALID_DATA: "Invalid OHLC in the observed path", NEUTRAL: "Neutral setup; no directional barriers",
  INVALID_SETUP: "Incomplete or invalid setup geometry",
};
const M5_MS = 300_000;
const valid = (bar: BarrierBar | undefined): bar is BarrierBar => {
  const instant = bar ? Date.parse(bar.t) : NaN;
  // Five-minute deltas do not establish M5 alignment: a uniformly shifted tape
  // must not acquire outcome statistics merely because its rows are contiguous.
  return !!bar && Number.isFinite(instant) && instant % M5_MS === 0
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    // A zero-range row is not a verified OHLC candle for historical path
    // statistics. Keep the barrier scanner aligned with the other causal
    // outcome scanners so degenerate rows cannot enter a resolved denominator.
    && bar.h > bar.l
    && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c);
};

/** Hypothetical close entry, target 2.2 setup ATR, invalidation 1 setup ATR.
 * Uses only closed M5 OHLC. Same-bar double touches have unknown order unless
 * the open is already beyond a barrier. No fees, spread, fills or broker model.
 */
export function patternBarrierOutcome(bars: readonly BarrierBar[], index: number, direction: string, horizon = BARRIER_HORIZON) {
  const anchor = bars[index];
  const geometry = candleWindowGeometry(bars, { i: index, price: anchor?.c ?? NaN, direction });
  const result = (state: BarrierOutcome, observedBars = 0, exitIndex: number | null = null) => ({ state, ...geometry, horizon, observedBars, exitIndex, resolvedAt: exitIndex == null ? null : bars[exitIndex].t });
  if (!Number.isInteger(index) || index < 1 || index >= bars.length || !Number.isInteger(horizon) || horizon < 1 || horizon > 288 || !valid(anchor) || anchor.closed === false) return result("INVALID_SETUP");
  if (direction !== "UP" && direction !== "DOWN") return result("NEUTRAL");
  const first = Math.max(0, index - 6);
  for (let i = first; i <= index; i++) {
    if (!valid(bars[i]) || bars[i].closed === false || (i > first && Date.parse(bars[i].t) - Date.parse(bars[i - 1].t) !== M5_MS)) return result("INVALID_SETUP");
  }
  const { target, invalidation } = geometry;
  if (target == null || invalidation == null || !Number.isFinite(target) || !Number.isFinite(invalidation)) return result("INVALID_SETUP");
  const up = direction === "UP";
  for (let step = 1; step <= horizon; step++) {
    const i = index + step, bar = bars[i];
    if (!bar || bar.closed === false) return result("INCOMPLETE", step - 1);
    if (!valid(bar)) return result("INVALID_DATA", step - 1);
    if (Date.parse(bar.t) - Date.parse(bars[i - 1].t) !== M5_MS) return result("DATA_GAP", step - 1);
    // The next open precedes its high/low, even if both barriers are touched.
    if (up ? bar.o >= target : bar.o <= target) return result("TARGET_FIRST", step, i);
    if (up ? bar.o <= invalidation : bar.o >= invalidation) return result("INVALIDATION_FIRST", step, i);
    const targetHit = up ? bar.h >= target : bar.l <= target;
    const invalidationHit = up ? bar.l <= invalidation : bar.h >= invalidation;
    if (targetHit && invalidationHit) return result("AMBIGUOUS", step, i);
    if (targetHit) return result("TARGET_FIRST", step, i);
    if (invalidationHit) return result("INVALIDATION_FIRST", step, i);
  }
  return result("TIMEOUT", horizon);
}

/** Every supplied occurrence enters exactly one bucket. The denominator is
 * explicit: only paths with a known first touch enter the target-first rate.
 * Overlapping occurrences are descriptive observations, not independent trades.
 */
export function measurePatternBarrierOutcomes(bars: readonly BarrierBar[], history: readonly PriceActionOccurrence[], horizon = BARRIER_HORIZON) {
  const counts: Record<BarrierOutcome, number> = { TARGET_FIRST: 0, INVALIDATION_FIRST: 0, AMBIGUOUS: 0, TIMEOUT: 0, INCOMPLETE: 0, DATA_GAP: 0, INVALID_DATA: 0, NEUTRAL: 0, INVALID_SETUP: 0 };
  const sides = { long: { target: 0, invalidation: 0 }, short: { target: 0, invalidation: 0 } };
  for (const row of history) {
    // A stale bar ordinal must not silently price another timestamp's setup.
    const state = bars[row.i] && Date.parse(bars[row.i].t) === Date.parse(row.time)
      ? patternBarrierOutcome(bars, row.i, row.direction, horizon).state
      : "INVALID_SETUP";
    counts[state]++;
    if (state === "TARGET_FIRST" || state === "INVALIDATION_FIRST") {
      const side = row.direction === "UP" ? sides.long : sides.short;
      side[state === "TARGET_FIRST" ? "target" : "invalidation"]++;
    }
  }
  const resolved = counts.TARGET_FIRST + counts.INVALIDATION_FIRST;
  return { counts, sides, total: history.length, resolved, excluded: history.length - resolved, targetFirstRate: resolved ? counts.TARGET_FIRST / resolved : null, horizon };
}
