import { patternBarrierOutcome, type BarrierBar } from "./patternBarrierOutcomes.ts";

export interface HistoricalPositionSignal { time: string; reads: string; label: string }

/** Resolve selected historical research by UTC, never a retained row ordinal.
 * Prices share the inspector's causal policy; extent stops at the last observed
 * closed candle or first barrier event, without bridging an unobserved gap.
 */
export function historicalPatternPosition(bars: readonly BarrierBar[], signal: HistoricalPositionSignal | null) {
  if (!signal) return null;
  const instant = Date.parse(signal.time);
  if (!Number.isFinite(instant)) return null;
  let lo = 0, hi = bars.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (Date.parse(bars[mid].t) < instant) lo = mid + 1;
    else hi = mid;
  }
  const index = lo;
  // The current retained tail uses the separate live-source/freshness gates.
  if (index < 1 || index >= bars.length - 1 || Date.parse(bars[index].t) !== instant) return null;
  const direction = signal.reads === "bullish" ? "UP" : signal.reads === "bearish" ? "DOWN" : "NEUTRAL";
  const study = patternBarrierOutcome(bars, index, direction);
  if (study.state === "INVALID_SETUP" || study.state === "NEUTRAL" || study.target == null || study.invalidation == null) return null;
  return {
    ...study, index, time: bars[index].t, label: signal.label,
    side: direction === "UP" ? "LONG" as const : "SHORT" as const,
    endIndex: index + study.observedBars,
    target: study.target, invalidation: study.invalidation,
  };
}

export type HistoricalPatternPosition = NonNullable<ReturnType<typeof historicalPatternPosition>>;

export function historicalPositionInViewport(position: HistoricalPatternPosition | null, start: number, end: number, cursor: number | null) {
  return position && position.index <= end && position.endIndex >= start && (cursor == null || position.endIndex <= cursor) ? position : null;
}

/** Current-source landmarks belong only to the visible, revealed retained tail. */
export function currentLandmarksInViewport(latestOnly: boolean, end: number, tail: number, positionVisible: boolean, cursor: number | null = null) {
  return !latestOnly || (end === tail && !positionVisible && (cursor == null || cursor >= tail));
}
