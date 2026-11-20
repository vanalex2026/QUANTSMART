import type { M5PriceBar } from "./priceActionDetector.ts";

export type LowVolatilityContext = {
  version: "pattern-low-volatility-context/1";
  time: string;
  state: "WITHHELD" | "LOW_ACTIVITY_CONTEXT" | "TYPICAL_ACTIVITY_CONTEXT";
  reason: string;
  contextStart: string | null;
  contextEnd: string | null;
  bars: number;
  baselineBars: number;
  recentBars: number;
  baselineRange: number | null;
  recentRange: number | null;
  activityRatio: number | null;
  lowActivityThreshold: number;
  recentDirectionalEfficiency: number | null;
  truncatedByGap: boolean;
  causalPrefix: {
    mode: "CAUSAL_PREFIX_ONLY" | "UNAVAILABLE" | "WITHHELD";
    maxBars: number;
    bars: number;
    start: string | null;
    end: string | null;
    truncatedByGap: boolean;
    futureRows: "WITHHELD";
    sourceStatus: "SOURCE_REVIEW_ONLY";
    dataStatus: "AVAILABLE" | "UNAVAILABLE";
    localDataStatus: "AVAILABLE" | "UNAVAILABLE";
    outcomeStatus: "WITHHELD";
    authority: "SHADOW_ONLY / NO_DECISION";
    live_apply_allowed: false;
  };
  sourcePages: readonly number[];
  authority: "SHADOW_ONLY / NO_DECISION";
};

const M5_MS = 300_000;
const BASELINE_BARS = 48;
const RECENT_BARS = 12;
const MIN_BARS = BASELINE_BARS + RECENT_BARS;
const valid = (bar: M5PriceBar | undefined): bar is M5PriceBar => {
  const instant = bar ? Date.parse(bar.t) : NaN;
  return !!bar && bar.closed !== false && Number.isFinite(instant) && instant % M5_MS === 0
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;
};

const median = (values: readonly number[]): number | null => {
  if (!values.length || values.some(value => !Number.isFinite(value))) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * Describes recent M5 pace using only the closed prefix ending at `time`.
 * The local ratio is a review measurement, not a source rule or setup filter.
 */
export function patternLowVolatilityContext(input: readonly M5PriceBar[], time: string, enabled = true): LowVolatilityContext {
  const result: LowVolatilityContext = {
    version: "pattern-low-volatility-context/1",
    time,
    state: "WITHHELD",
    reason: "INSUFFICIENT_CLOSED_CONTEXT",
    contextStart: null,
    contextEnd: null,
    bars: 0,
    baselineBars: BASELINE_BARS,
    recentBars: RECENT_BARS,
    baselineRange: null,
    recentRange: null,
    activityRatio: null,
    lowActivityThreshold: 0.65,
    recentDirectionalEfficiency: null,
    truncatedByGap: false,
    causalPrefix: {
      mode: "UNAVAILABLE",
      maxBars: MIN_BARS,
      bars: 0,
      start: null,
      end: null,
      truncatedByGap: false,
      futureRows: "WITHHELD",
      sourceStatus: "SOURCE_REVIEW_ONLY",
      dataStatus: "UNAVAILABLE",
      localDataStatus: "UNAVAILABLE",
      outcomeStatus: "WITHHELD",
      authority: "SHADOW_ONLY / NO_DECISION",
      live_apply_allowed: false,
    },
    sourcePages: [395, 396, 397, 398, 405, 406],
    authority: "SHADOW_ONLY / NO_DECISION"
  };
  if (!enabled) return { ...result, reason: "UNVERIFIED_CURRENT_EVIDENCE", causalPrefix: { ...result.causalPrefix, mode: "WITHHELD" } };
  const instant = Date.parse(time);
  const end = Number.isFinite(instant) ? input.findIndex(bar => Date.parse(bar.t) === instant) : -1;
  if (end < 0 || !valid(input[end])) return { ...result, reason: "MISSING_OR_INVALID_SELECTED_CANDLE" };

  let from = end;
  while (from > Math.max(0, end - (MIN_BARS - 1))) {
    const previous = input[from - 1];
    if (!valid(previous) || Date.parse(input[from].t) - Date.parse(previous.t) !== M5_MS) {
      result.truncatedByGap = true;
      break;
    }
    from--;
  }
  const bars = input.slice(from, end + 1);
  const contextStart = bars[0]?.t ?? null;
  const contextEnd = bars.length ? bars[bars.length - 1].t : null;
  const prefixAvailable = bars.length >= MIN_BARS;
  Object.assign(result, {
    contextStart,
    contextEnd,
    bars: bars.length,
    causalPrefix: {
      ...result.causalPrefix,
      mode: prefixAvailable ? "CAUSAL_PREFIX_ONLY" : "UNAVAILABLE",
      bars: bars.length,
      start: contextStart,
      end: contextEnd,
      truncatedByGap: result.truncatedByGap,
      dataStatus: prefixAvailable ? "AVAILABLE" : "UNAVAILABLE",
      localDataStatus: prefixAvailable ? "AVAILABLE" : "UNAVAILABLE",
    },
  });
  if (bars.length < MIN_BARS) return { ...result, reason: result.truncatedByGap ? "NONCONTIGUOUS_CLOSED_CONTEXT" : "INSUFFICIENT_CLOSED_CONTEXT" };

  const ranges = bars.map(bar => bar.h - bar.l);
  const baselineRange = median(ranges.slice(0, BASELINE_BARS));
  const recentRange = median(ranges.slice(BASELINE_BARS));
  if (baselineRange == null || recentRange == null || baselineRange <= 0) return { ...result, reason: "UNMEASURABLE_RANGE_BASELINE" };
  const closes = bars.slice(BASELINE_BARS).map(bar => bar.c);
  const path = closes.slice(1).reduce((sum, close, index) => sum + Math.abs(close - closes[index]), 0);
  const net = Math.abs(closes[closes.length - 1] - closes[0]);
  const activityRatio = recentRange / baselineRange;
  const recentDirectionalEfficiency = path ? net / path : 0;
  Object.assign(result, { baselineRange, recentRange, activityRatio, recentDirectionalEfficiency });
  result.state = activityRatio <= result.lowActivityThreshold ? "LOW_ACTIVITY_CONTEXT" : "TYPICAL_ACTIVITY_CONTEXT";
  result.reason = result.state === "LOW_ACTIVITY_CONTEXT" ? "LOCAL_RECENT_RANGE_BELOW_BASELINE" : "LOCAL_RECENT_RANGE_NOT_BELOW_BASELINE";
  return result;
}
