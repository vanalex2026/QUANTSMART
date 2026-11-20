import type { M5PriceBar } from "./priceActionDetector.ts";

export type PatternRoomLevel = {
  kind: "SWING_ZONE" | "ROUND_NUMBER";
  low: number;
  high: number;
  level: number;
  distance: number;
  technicalRiskUnits: number | null;
  pivotTimes: string[];
  confirmedAt: string | null;
};
export type PatternRoomObservability = {
  mode: "CAUSAL_PREFIX_ONLY" | "UNAVAILABLE" | "WITHHELD";
  maxBars: 96;
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
export type PatternRoomContext = {
  version: "pattern-room-context/1";
  time: string;
  direction: "UP" | "DOWN" | "NEUTRAL";
  state: "WITHHELD" | "WITHIN_ONE_TECHNICAL_RISK" | "BEYOND_ONE_TECHNICAL_RISK" | "MEASURED_WITHOUT_RISK" | "NO_CONFIRMED_SWING";
  reason: string;
  contextStart: string | null;
  contextEnd: string | null;
  bars: number;
  truncatedByGap: boolean;
  baseline: number | null;
  entry: number | null;
  protectionReference: number | null;
  technicalRisk: number | null;
  structuralLevels: PatternRoomLevel[];
  roundNumber: PatternRoomLevel | null;
  sourcePages: readonly number[];
  authority: "SHADOW_ONLY / NO_DECISION";
  sourceStatus: "SOURCE_REVIEW_ONLY";
  dataStatus: "UNAVAILABLE";
  localDataStatus: "AVAILABLE" | "UNAVAILABLE";
  outcomeStatus: "WITHHELD";
  causalPrefix: PatternRoomObservability;
  live_apply_allowed: false;
};
const M5_MS = 300_000;
const valid = (bar: M5PriceBar | undefined): bar is M5PriceBar => {
  const instant = bar ? Date.parse(bar.t) : NaN;
  return !!bar && bar.closed !== false && Number.isFinite(instant) && instant % M5_MS === 0
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;
};

/** Source printed13,51,107 motivates context examination, not these numerical
 * rules. Measure known swing zones within at most96 consecutive closed M5 bars;
 * two right-hand candles must already exist by the selected confirmation close.
 * A lack of measured resistance/support never means the path is clear. */
export function patternRoomContext(input: readonly M5PriceBar[], time: string, direction: "UP" | "DOWN" | "NEUTRAL", protection?: number, enabled = true): PatternRoomContext {
  const result: PatternRoomContext = { version: "pattern-room-context/1", time, direction, state: "WITHHELD", reason: "INSUFFICIENT_CLOSED_CONTEXT", contextStart: null, contextEnd: null, bars: 0, truncatedByGap: false, baseline: null, entry: null, protectionReference: null, technicalRisk: null, structuralLevels: [], roundNumber: null, sourcePages: [13, 51, 107], authority: "SHADOW_ONLY / NO_DECISION", sourceStatus: "SOURCE_REVIEW_ONLY", dataStatus: "UNAVAILABLE", localDataStatus: "UNAVAILABLE", outcomeStatus: "WITHHELD", causalPrefix: { mode: "UNAVAILABLE", maxBars: 96, bars: 0, start: null, end: null, truncatedByGap: false, futureRows: "WITHHELD", sourceStatus: "SOURCE_REVIEW_ONLY", dataStatus: "UNAVAILABLE", localDataStatus: "UNAVAILABLE", outcomeStatus: "WITHHELD", authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false }, live_apply_allowed: false };
  if (!enabled) return { ...result, reason: "UNVERIFIED_CURRENT_EVIDENCE", causalPrefix: { ...result.causalPrefix, mode: "WITHHELD" } };
  if (direction === "NEUTRAL") return { ...result, reason: "NEUTRAL_SETUP", causalPrefix: { ...result.causalPrefix, mode: "WITHHELD" } };
  const instant = Date.parse(time), end = Number.isFinite(instant) ? input.findIndex(bar => Date.parse(bar.t) === instant) : -1;
  if (end < 0 || !valid(input[end])) return { ...result, reason: "MISSING_OR_INVALID_SETUP_CANDLE" };
  let from = end;
  while (from > Math.max(0, end - 95)) {
    if (!valid(input[from - 1]) || Date.parse(input[from].t) - Date.parse(input[from - 1].t) !== M5_MS) { result.truncatedByGap = true; break; }
    from--;
  }
  const bars = input.slice(from, end + 1), entry = bars[bars.length - 1].c;
  const localDataStatus = bars.length >= 24 ? "AVAILABLE" : "UNAVAILABLE";
  Object.assign(result, { contextStart: bars[0].t, contextEnd: bars[bars.length - 1].t, bars: bars.length, entry, localDataStatus, dataStatus: localDataStatus, causalPrefix: { ...result.causalPrefix, mode: bars.length >= 24 ? "CAUSAL_PREFIX_ONLY" : "UNAVAILABLE", bars: bars.length, start: bars[0].t, end: bars[bars.length - 1].t, truncatedByGap: result.truncatedByGap, localDataStatus, dataStatus: localDataStatus } });
  if (bars.length < 24) return result;
  const ranges = bars.slice(-14).map(bar => bar.h - bar.l).sort((a, b) => a - b), baseline = (ranges[6] + ranges[7]) / 2, tolerance = .25 * baseline;
  const riskValid = Number.isFinite(protection) && (direction === "UP" ? protection! < entry : protection! > entry);
  const risk = riskValid ? Math.abs(entry - protection!) : null;
  Object.assign(result, { baseline, protectionReference: riskValid ? protection : null, technicalRisk: risk });
  const pivots: { level: number; index: number }[] = [];
  for (let i = 2; i < bars.length - 2; i++) {
    const value = direction === "UP" ? bars[i].h : bars[i].l;
    const neighbors = [i - 2, i - 1, i + 1, i + 2].map(j => direction === "UP" ? bars[j].h : bars[j].l);
    const pivot = direction === "UP" ? value > neighbors[0] && value > neighbors[1] && value >= neighbors[2] && value >= neighbors[3] : value < neighbors[0] && value < neighbors[1] && value <= neighbors[2] && value <= neighbors[3];
    if (pivot) pivots.push({ level: value, index: i });
  }
  pivots.sort((a, b) => a.level - b.level);
  const groups: typeof pivots[] = [];
  for (const pivot of pivots) {
    const group = groups[groups.length - 1];
    if (group && pivot.level - group[0].level <= tolerance) group.push(pivot);
    else groups.push([pivot]);
  }
  const units = (distance: number) => risk ? distance / risk : null;
  for (const group of groups) {
    const low = group[0].level, high = group[group.length - 1].level, level = direction === "UP" ? low : high;
    if (direction === "UP" ? high < entry : low > entry) continue;
    const last = Math.max(...group.map(pivot => pivot.index));
    // A decisive close through the far edge retires this old zone. A later
    // newly confirmed pivot can establish another zone, never future outcomes.
    if (bars.slice(last + 1).some(bar => direction === "UP" ? bar.c > high + tolerance : bar.c < low - tolerance)) continue;
    const distance = Math.max(0, direction === "UP" ? low - entry : entry - high);
    result.structuralLevels.push({ kind: "SWING_ZONE", low, high, level, distance, technicalRiskUnits: units(distance), pivotTimes: group.map(pivot => bars[pivot.index].t).sort(), confirmedAt: bars[last + 2].t });
  }
  result.structuralLevels.sort((a, b) => a.distance - b.distance);
  result.structuralLevels = result.structuralLevels.slice(0, 3);
  // Product is XAUUSD only. A 50-quote-unit round landmark is a local reference,
  // not a transferred EURUSD pip rule or an asserted support/resistance zone.
  const round = direction === "UP" ? (Math.floor(entry / 50) + 1) * 50 : (Math.ceil(entry / 50) - 1) * 50, distance = Math.abs(round - entry);
  result.roundNumber = { kind: "ROUND_NUMBER", low: round, high: round, level: round, distance, technicalRiskUnits: units(distance), pivotTimes: [], confirmedAt: null };
  const nearest = result.structuralLevels[0];
  result.state = !nearest ? "NO_CONFIRMED_SWING" : risk == null ? "MEASURED_WITHOUT_RISK" : nearest.distance <= risk ? "WITHIN_ONE_TECHNICAL_RISK" : "BEYOND_ONE_TECHNICAL_RISK";
  result.reason = !nearest ? "NO_UNRETIRED_CONFIRMED_SWING_AHEAD_IN_LOCAL_CONTEXT" : "CAUSAL_SWING_ZONE_DISTANCE_MEASURED";
  result.causalPrefix = { ...result.causalPrefix, mode: "CAUSAL_PREFIX_ONLY", truncatedByGap: result.truncatedByGap };
  return result;
}
