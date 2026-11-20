import type { M5PriceBar } from "./priceActionDetector.ts";
import type { PriceActionSetup } from "./priceActionSetup.ts";

export type PatternSetupMilestone = {
  kind: "SIGNAL" | "ENTRY_BREAK" | "CLOSE_CONFIRMATION" | "OUTCOME_MEASUREMENT_START";
  label: string;
  /** Candle-open identity for observations; actual M5 close for close/origin. */
  time: string;
  /** Source candle-open identity, including for milestones at its close. */
  candleTime: string;
  detail: string;
};
export type PatternSetupTimeline = {
  version: "pattern-setup-timeline/1";
  state: "AVAILABLE" | "WITHHELD";
  reason: string;
  direction: "UP" | "DOWN" | null;
  breakoutLevel: number | null;
  breakObservation: "RANGE_BREAK" | "OPEN_GAP_BEYOND_LEVEL" | null;
  milestones: PatternSetupMilestone[];
  authority: "SHADOW_ONLY / NO_DECISION";
};

const M5_MS = 300_000;
/** Canonical UTC only, with explicit Gregorian validation (including year 0000). */
function utcM5(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return null;
  const pair = (at: number) => (value.charCodeAt(at) - 48) * 10 + value.charCodeAt(at + 1) - 48;
  const year = pair(0) * 100 + pair(2), month = pair(5), day = pair(8), hour = pair(11), minute = pair(14);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || minute % 5 !== 0 || pair(17) !== 0) return null;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
  if (day > daysInMonth) return null;
  // Gregorian civil date -> days since 1970-01-01, using 400-year eras.
  // Avoid Date.UTC's special treatment of years 0..99 and per-row Date/ISO
  // allocation when validating the entire retained tape on selection.
  const adjustedYear = year - (month <= 2 ? 1 : 0), era = Math.floor(adjustedYear / 400);
  const yearInEra = adjustedYear - era * 400;
  const dayInYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const days = era * 146097 + yearInEra * 365 + Math.floor(yearInEra / 4) - Math.floor(yearInEra / 100) + dayInYear - 719468;
  return (days * 1440 + hour * 60 + minute) * 60_000;
}
const validOhlc = (bar: M5PriceBar) => [bar.o, bar.h, bar.l, bar.c].every(value => typeof value === "number" && Number.isFinite(value))
  && bar.h >= Math.max(bar.o, bar.c, bar.l) && bar.l <= Math.min(bar.o, bar.c, bar.h);

/**
 * Describe one selected detector receipt, never an executable entry or fill.
 * The first strict directional OHLC break is an observed candle, not an
 * intrabar timestamp. Outcome measurement starts at confirmation close, not
 * at that earlier observation. No future OHLC is consulted.
 */
export function patternSetupTimeline(setup: PriceActionSetup | undefined, bars: readonly M5PriceBar[], selectedConfirmationTime: string, enabled = true, nowMs = Date.now()): PatternSetupTimeline {
  const withheld = (reason: string): PatternSetupTimeline => ({ version: "pattern-setup-timeline/1", state: "WITHHELD", reason, direction: null, breakoutLevel: null, breakObservation: null, milestones: [], authority: "SHADOW_ONLY / NO_DECISION" });
  if (!enabled) return withheld("UNVERIFIED_CURRENT_EVIDENCE");
  if (!setup) return withheld("MISSING_SETUP_RECEIPT");
  if (!["PATTERN_BREAK_COMBI", "PATTERN_BREAK", "PATTERN_BREAK_PULLBACK", "PULLBACK_REVERSAL"].includes(setup.kind)) return withheld("UNSUPPORTED_SETUP_KIND");
  if (setup.direction !== "UP" && setup.direction !== "DOWN") return withheld("INVALID_SETUP_DIRECTION");
  if (!Number.isFinite(setup.breakoutLevel)) return withheld("INVALID_BREAKOUT_LEVEL");
  const selected = utcM5(selectedConfirmationTime), confirmation = utcM5(setup.confirmationTime);
  if (selected == null || confirmation == null) return withheld("INVALID_CONFIRMATION_UTC_M5_IDENTITY");
  if (selected !== confirmation) return withheld("MISMATCHED_SELECTED_CONFIRMATION");
  if (!Number.isFinite(nowMs) || confirmation + M5_MS > nowMs) return withheld("CONFIRMATION_NOT_CLOSED");
  const inside = setup.kind === "PATTERN_BREAK_COMBI" ? setup.insideBarTimes : null;
  if (setup.kind === "PATTERN_BREAK_COMBI" && (!Array.isArray(inside) || inside.length === 0)) return withheld("MISSING_COMBI_SIGNAL_REFERENCE");
  if (inside && inside.some((time, i) => utcM5(time) == null || (i > 0 && utcM5(time)! - utcM5(inside[i - 1])! !== M5_MS))) return withheld("INVALID_COMBI_SIGNAL_CHRONOLOGY");
  const signal = utcM5(inside ? inside[inside.length - 1] : setup.kind !== "PATTERN_BREAK_COMBI" ? setup.signalBarTime : undefined);
  if (signal == null || signal >= confirmation) return withheld("INVALID_SIGNAL_CONFIRMATION_CHRONOLOGY");

  // Validate past identities without sorting or deduplicating. Future prices
  // cannot repair a missing signal, missing interval, or failed close break.
  // An unparseable tape identity cannot be safely classified as future and
  // withholds the receipt; valid future identities never expose their OHLC.
  const path: { bar: M5PriceBar; instant: number }[] = [];
  let previous: number | null = null;
  for (const bar of bars) {
    const instant = utcM5(bar?.t);
    if (instant == null) return withheld("INVALID_RETAINED_UTC_M5_IDENTITY");
    if (instant > confirmation) continue;
    if (previous != null && instant <= previous) return withheld("DUPLICATE_OR_REVERSED_RETAINED_IDENTITY");
    previous = instant;
    if (instant >= signal) path.push({ bar, instant });
  }
  if (path[0]?.instant !== signal || path[path.length - 1]?.instant !== confirmation) return withheld("MISSING_SIGNAL_OR_CONFIRMATION_CANDLE");
  if (path.some(({ bar, instant }, i) => (bar.closed !== undefined && bar.closed !== true) || instant + M5_MS > nowMs || !validOhlc(bar) || (i > 0 && instant - path[i - 1].instant !== M5_MS))) return withheld("REQUIRES_CONSECUTIVE_CLOSED_VALID_M5_CANDLES");
  const up = setup.direction === "UP", level = setup.breakoutLevel;
  const signalBar = path[0].bar;
  if (level !== (up ? signalBar.h : signalBar.l)) return withheld("BREAKOUT_LEVEL_DOES_NOT_MATCH_SIGNAL_EDGE");
  const confirmationBar = path[path.length - 1].bar;
  if (!(up ? confirmationBar.c > level : confirmationBar.c < level)) return withheld("CONFIRMATION_CLOSE_DOES_NOT_BREAK_LEVEL");
  const observed = path.slice(1).find(({ bar }) => up ? bar.h > level : bar.l < level);
  if (!observed) return withheld("NO_LATER_DIRECTIONAL_BREAK_OBSERVED");
  const gap = up ? observed.bar.o > level : observed.bar.o < level;
  const canonical = (instant: number) => new Date(instant).toISOString();
  const signalTime = canonical(signal), observedTime = canonical(observed.instant), confirmationTime = canonical(confirmation), closeTime = canonical(confirmation + M5_MS);
  return {
    version: "pattern-setup-timeline/1", state: "AVAILABLE", reason: "CAUSAL_CLOSED_M5_SETUP_TIMELINE", direction: setup.direction, breakoutLevel: level,
    breakObservation: gap ? "OPEN_GAP_BEYOND_LEVEL" : "RANGE_BREAK", authority: "SHADOW_ONLY / NO_DECISION",
    milestones: [
      { kind: "SIGNAL", label: inside ? "Last inside-bar signal reference" : "Signal candle", time: signalTime, candleTime: signalTime, detail: inside ? "Last inside bar is this combi receipt's signal reference; UTC is its candle open." : "Detector signal candle; UTC is its candle open, before the later directional break." },
      { kind: "ENTRY_BREAK", label: gap ? "First later break observation: open beyond level" : "First later directional OHLC break", time: observedTime, candleTime: observedTime, detail: gap ? "This later candle opens beyond the breakout level. A gap is observed; no crossing time, trade or fill is inferred." : `First later candle with ${up ? "high strictly above" : "low strictly below"} the breakout level. UTC identifies its open; intrabar break time and fill are unknown.` },
      { kind: "CLOSE_CONFIRMATION", label: "Close confirmation", time: closeTime, candleTime: confirmationTime, detail: `Directional close beyond the breakout level at the end of the M5 candle opened ${confirmationTime}. This is separate from the earlier OHLC break observation.` },
      { kind: "OUTCOME_MEASUREMENT_START", label: "Outcome measurement start", time: closeTime, candleTime: confirmationTime, detail: "Historical outcome measurement starts at confirmation close. This receipt does not measure a return or assert an entry fill." },
    ],
  };
}
