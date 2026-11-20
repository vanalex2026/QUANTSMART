import { observePatternBreakPullback, PATTERN_BREAK_PULLBACK_CONTEXT } from "./patternBreakPullback.ts";
import { observePatternBreak } from "./patternBreak.ts";
import { observePullbackReversal, PULLBACK_REVERSAL_CONTEXT } from "./pullbackReversal.ts";
import type { PriceActionSetup } from "./priceActionSetup.ts";
import { observePatternBreakCombi } from "./patternBreakCombi.ts";
/**
 * Deterministic, read-only M5 price-action detector adapter.
 *
 * This module labels completed OHLC bars for chart annotation. It has no
 * broker/order dependencies and deliberately exposes ABSTAIN states whenever
 * a setup is not sufficiently observable from the supplied tape.
 */

export type PriceActionConceptId =
  | "support_resistance"
  | "dominant_pressure"
  | "false_high_low"
  | "double_pressure"
  | "tease_break"
  | "buildup"
  | "false_break"
  | "pullback_reversal"
  | "ceiling_test"
  | "round_number"
  | "pattern_break_combi"
  | "pattern_break"
  | "pattern_break_pullback";
export type PriceActionState = "DETECTED" | "ABSTAIN";
export type PriceActionDirection = "UP" | "DOWN" | "NEUTRAL";
export type MarkerPosition = "above" | "below" | "at";

export interface M5PriceBar {
  i?: number;
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  /** A false value explicitly identifies a forming candle and is rejected. */
  closed?: boolean;
}

export interface PriceActionSourceRef {
  sourceConceptId: PriceActionConceptId;
  /** Printed page anchors from docs/price_action_knowledge_map.json. */
  pageAnchors: readonly number[];
  sourceTitle: string;
}

export interface PriceActionMarker {
  conceptId: PriceActionConceptId;
  sourceConceptId: PriceActionConceptId;
  pageAnchors: readonly number[];
  i: number;
  time: string;
  price: number;
  position: MarkerPosition;
  direction: PriceActionDirection;
  label: string;
  state: "DETECTED";
  /** Stable, bounded geometry score; descriptive only, never a signal. */
  score: number;
  setup?: PriceActionSetup;
}

export interface PriceActionAssessment {
  conceptId: PriceActionConceptId;
  sourceConceptId: PriceActionConceptId;
  pageAnchors: readonly number[];
  state: PriceActionState;
  direction: PriceActionDirection;
  /** Index of the bar that explains this assessment, when available. */
  i: number | null;
  time: string | null;
  reason: string;
  score: number;
  setup?: PriceActionSetup;
}

export interface M5PriceActionOptions {
  /** Instrument is used only to choose a sensible round-number increment. */
  symbol?: string;
  /** Explicit round-number increment in quote units (for example 0.005 or 50). */
  roundStep?: number;
  /** Relative tolerance around levels; defaults to 0.2 of median bar range. */
  levelTolerance?: number;
}

export interface M5PriceActionResult {
  ok: boolean;
  timeframe: "M5";
  symbol: string;
  asOf: string | null;
  state: "READY" | "ABSTAIN";
  reason?: string;
  assessments: PriceActionAssessment[];
  markers: PriceActionMarker[];
  source: { title: string; authority: "SHADOW_ONLY / NO_DECISION"; concepts: Record<PriceActionConceptId, PriceActionSourceRef> };
  /** Chronological, descriptive outcomes for each detector concept. */
  evidence?: Partial<Record<PriceActionConceptId, PriceActionConceptEvidence>>;
}

export interface PriceActionConceptEvidence {
  conceptId: PriceActionConceptId;
  occurrences: number;
  evaluated: number;
  /** Candidate windows rejected before detector geometry was measured. */
  skipped: number;
  firstEvaluation: string | null;
  lastEvaluation: string | null;
  /** Next closed-bar outcomes for detected occurrences only. */
  outcomes: { up: number; down: number; flat: number };
  /** Directional observations split by the setup's measured LONG/SHORT side. */
  long: { occurrences: number; wins: number; hitRate: number | null; interval95: { lower: number; upper: number } | null };
  short: { occurrences: number; wins: number; hitRate: number | null; interval95: { lower: number; upper: number } | null };
  /** All directional occurrences, preserving the setup label separately from outcome. */
  hitRate: number | null;
  interval95: { lower: number; upper: number } | null;
  recurrenceRate: number;
  lastOccurrence: string | null;
  /** Every measured occurrence in retained history, in chronological order.
   * Renderers must bound their chart markers rather than truncate this index. */
  history: PriceActionOccurrence[];
  authority: "SHADOW_ONLY / NO_DECISION";
}

export interface PriceActionOccurrence {
  i: number;
  time: string;
  direction: PriceActionDirection;
  nextBar: "UP" | "DOWN" | "FLAT";
  score: number;
  setup?: PriceActionSetup;
}

const SOURCE_TITLE = "Understanding Price Action: Practical Analysis of the 5-Minute Time Frame (2014)";
const SOURCE: Record<PriceActionConceptId, PriceActionSourceRef> = {
  support_resistance: { sourceConceptId: "support_resistance", pageAnchors: [8, 9, 10], sourceTitle: SOURCE_TITLE },
  dominant_pressure: { sourceConceptId: "dominant_pressure", pageAnchors: [9, 10, 11], sourceTitle: SOURCE_TITLE },
  false_high_low: { sourceConceptId: "false_high_low", pageAnchors: [16, 17, 18, 19, 20], sourceTitle: SOURCE_TITLE },
  double_pressure: { sourceConceptId: "double_pressure", pageAnchors: [6, 7, 8], sourceTitle: SOURCE_TITLE },
  tease_break: { sourceConceptId: "tease_break", pageAnchors: [13, 14, 15, 26, 27, 28, 29], sourceTitle: SOURCE_TITLE },
  buildup: { sourceConceptId: "buildup", pageAnchors: [7, 8, 13, 14, 15, 16], sourceTitle: SOURCE_TITLE },
  false_break: { sourceConceptId: "false_break", pageAnchors: [11, 12, 13, 14, 15, 16], sourceTitle: SOURCE_TITLE },
  pullback_reversal: { sourceConceptId: "pullback_reversal", pageAnchors: [20, 21, 22, 23, 24, 25, 125, 126, 127, 128, 129, 130, 131], sourceTitle: SOURCE_TITLE },
  ceiling_test: { sourceConceptId: "ceiling_test", pageAnchors: [25, 26, 27, 28, 29, 30], sourceTitle: SOURCE_TITLE },
  pattern_break_pullback: { sourceConceptId: "pattern_break_pullback", pageAnchors: [97, 99, 100, 101, 102, 104], sourceTitle: SOURCE_TITLE },
  pattern_break: { sourceConceptId: "pattern_break", pageAnchors: [73, 74, 75, 76, 77], sourceTitle: SOURCE_TITLE },
  pattern_break_combi: { sourceConceptId: "pattern_break_combi", pageAnchors: [108, 109, 110], sourceTitle: SOURCE_TITLE },
  round_number: { sourceConceptId: "round_number", pageAnchors: [30, 31, 32], sourceTitle: SOURCE_TITLE },
};
const CONCEPTS: readonly PriceActionConceptId[] = ["support_resistance", "dominant_pressure", "false_high_low", "double_pressure", "tease_break", "buildup", "false_break", "pullback_reversal", "ceiling_test", "round_number", "pattern_break_combi", "pattern_break", "pattern_break_pullback"];
export const PRICE_ACTION_DETECTOR_CONCEPT_IDS = CONCEPTS;
export const PRICE_ACTION_DETECTOR_CONCEPT_COUNT = CONCEPTS.length;

function finiteBar(bar: M5PriceBar): boolean {
  const instant = bar && typeof bar.t === "string" ? Date.parse(bar.t) : NaN;
  // Equal five-minute deltas do not attest the UTC M5 grid. Reject shifted
  // input at the public detector boundary as well as in the focused caller.
  // A zero-range row is not a verified OHLC candle for outcome statistics.
  return !!bar && Number.isFinite(instant) && instant % 300_000 === 0 &&
    [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite) && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;
}
function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function clamp(value: number, lo = 0, hi = 1): number { return Math.max(lo, Math.min(hi, value)); }
function dir(bar: M5PriceBar): PriceActionDirection { return bar.c > bar.o ? "UP" : bar.c < bar.o ? "DOWN" : "NEUTRAL"; }
function body(bar: M5PriceBar): number { return Math.abs(bar.c - bar.o); }
function range(bar: M5PriceBar): number { return Math.max(0, bar.h - bar.l); }
function sourceFor(id: PriceActionConceptId): PriceActionSourceRef { return SOURCE[id]; }

function assessment(id: PriceActionConceptId, state: PriceActionState, direction: PriceActionDirection, i: number | null, bars: M5PriceBar[], reason: string, score: number): PriceActionAssessment {
  const ref = sourceFor(id);
  return { conceptId: id, sourceConceptId: ref.sourceConceptId, pageAnchors: ref.pageAnchors, state, direction, i, time: i == null ? null : bars[i]?.t ?? null, reason, score: Number(clamp(score).toFixed(4)) };
}

function detectBuildup(bars: M5PriceBar[], atr: number): PriceActionAssessment {
  const i = bars.length - 1;
  if (bars.length < 5 || atr <= 0) return assessment("buildup", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, "INSUFFICIENT_M5_CONTEXT", 0);
  const window = bars.slice(-5), hi = Math.max(...window.map((b) => b.h)), lo = Math.min(...window.map((b) => b.l));
  const span = hi - lo, changes = window.slice(1).reduce((n, b, j) => n + (dir(b) !== dir(window[j]) ? 1 : 0), 0);
  const compact = span <= atr * 2.4, alternating = changes >= 2, edge = Math.min(Math.abs(bars[i].c - hi), Math.abs(bars[i].c - lo)) <= Math.max(atr * 0.45, span * 0.28);
  if (!(compact && alternating && edge)) return assessment("buildup", "ABSTAIN", "NEUTRAL", i, bars, compact ? "NO_BOUNDARY_FIGHT" : "RANGE_NOT_COMPACT", 0);
  const direction = bars[i].c >= (hi + lo) / 2 ? "UP" : "DOWN";
  return assessment("buildup", "DETECTED", direction, i, bars, "COMPACT_ALTERNATING_BOUNDARY_FIGHT", clamp((2.4 * atr - span) / (2.4 * atr) * 0.6 + changes / 4 * 0.4));
}

function detectFalseBreak(bars: M5PriceBar[], atr: number): PriceActionAssessment {
  const i = bars.length - 1;
  if (bars.length < 4 || atr <= 0) return assessment("false_break", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, "INSUFFICIENT_M5_CONTEXT", 0);
  const prior = bars.slice(-4, -1), b = bars[i], hi = Math.max(...prior.map((x) => x.h)), lo = Math.min(...prior.map((x) => x.l)), tol = atr * 0.05;
  const failedHigh = b.h > hi + tol && b.c <= hi + tol, failedLow = b.l < lo - tol && b.c >= lo - tol;
  // A two-sided sweep has no determinable failed edge from OHLC alone.
  if (failedHigh && failedLow) return assessment("false_break", "ABSTAIN", "NEUTRAL", i, bars, "AMBIGUOUS_TWO_SIDED_BOUNDARY_SWEEP", 0);
  if (!failedHigh && !failedLow) return assessment("false_break", "ABSTAIN", "NEUTRAL", i, bars, "NO_UNDONE_BOUNDARY_BREAK", 0);
  const direction: PriceActionDirection = failedHigh ? "DOWN" : "UP";
  const excursion = failedHigh ? b.h - hi : lo - b.l;
  return assessment("false_break", "DETECTED", direction, i, bars, "BREAK_RETURNED_INSIDE_PRIOR_RANGE", clamp(excursion / Math.max(atr, 1e-12)));
}

function detectSupportResistance(bars: M5PriceBar[], atr: number): PriceActionAssessment {
  const i = bars.length - 1;
  if (bars.length < 8 || atr <= 0) return assessment("support_resistance", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, "INSUFFICIENT_M5_CONTEXT", 0);
  const prior = bars.slice(-7, -1), current = bars[i], tolerance = Math.max(atr * 0.35, median(prior.map(range)) * 0.5);
  const cluster = (values: number[]) => {
    let best = { count: 0, level: values[0] ?? 0 };
    values.forEach((value) => {
      const members = values.filter((other) => Math.abs(other - value) <= tolerance);
      if (members.length > best.count) best = { count: members.length, level: members.reduce((sum, member) => sum + member, 0) / members.length };
    });
    return best;
  };
  const support = cluster(prior.map((bar) => bar.l)), resistance = cluster(prior.map((bar) => bar.h));
  const supportTest = support.count >= 2 && Math.abs(current.l - support.level) <= tolerance && current.c > support.level;
  const resistanceTest = resistance.count >= 2 && Math.abs(current.h - resistance.level) <= tolerance && current.c < resistance.level;
  if (supportTest && resistanceTest) return assessment("support_resistance", "ABSTAIN", "NEUTRAL", i, bars, "AMBIGUOUS_TWO_SIDED_LEVEL_TEST", 0);
  if (!supportTest && !resistanceTest) return assessment("support_resistance", "ABSTAIN", "NEUTRAL", i, bars, "NO_REPEATED_LEVEL_ROLE_TEST", 0);
  const direction = supportTest ? "UP" : "DOWN";
  const touches = supportTest ? support.count : resistance.count;
  return assessment("support_resistance", "DETECTED", direction, i, bars, `${supportTest ? "SUPPORT" : "RESISTANCE"}_ROLE_TEST_${touches}_TOUCHES`, clamp((touches - 1) / 4));
}

function detectDominantPressure(bars: M5PriceBar[], atr: number): PriceActionAssessment {
  const i = bars.length - 1;
  if (bars.length < 8 || atr <= 0) return assessment("dominant_pressure", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, "INSUFFICIENT_M5_CONTEXT", 0);
  const prior = bars.slice(-7, -1);
  let upSteps = 0, downSteps = 0;
  for (let j = 1; j < prior.length; j++) {
    if (prior[j].h > prior[j - 1].h && prior[j].l > prior[j - 1].l) upSteps++;
    if (prior[j].h < prior[j - 1].h && prior[j].l < prior[j - 1].l) downSteps++;
  }
  const current = bars[i], upStructure = upSteps >= 3 && upSteps >= downSteps + 2, downStructure = downSteps >= 3 && downSteps >= upSteps + 2;
  const continuationUp = current.c > current.o && current.c >= prior[prior.length - 1].c - atr * 0.15;
  const continuationDown = current.c < current.o && current.c <= prior[prior.length - 1].c + atr * 0.15;
  if (!((upStructure && continuationUp) || (downStructure && continuationDown))) return assessment("dominant_pressure", "ABSTAIN", "NEUTRAL", i, bars, upStructure || downStructure ? "COUNTER_SWING_NOT_RESOLVED" : "NO_DOMINANT_SWING_STRUCTURE", 0);
  const direction = upStructure ? "UP" : "DOWN";
  return assessment("dominant_pressure", "DETECTED", direction, i, bars, `${direction}_SWING_STRUCTURE_${Math.max(upSteps, downSteps)}_STEPS`, clamp((Math.max(upSteps, downSteps) - 2) / 4));
}

function detectFalseHighLow(bars: M5PriceBar[], atr: number): PriceActionAssessment {
  const i = bars.length - 1;
  if (bars.length < 6 || atr <= 0) return assessment("false_high_low", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, "INSUFFICIENT_M5_CONTEXT", 0);
  const failed = bars[i - 1], current = bars[i], context = bars.slice(i - 4, i - 1), tolerance = atr * 0.05;
  const priorHigh = Math.max(...context.map((bar) => bar.h)), priorLow = Math.min(...context.map((bar) => bar.l));
  const failedHigh = failed.h > priorHigh + tolerance && failed.c <= priorHigh + tolerance;
  const failedLow = failed.l < priorLow - tolerance && failed.c >= priorLow - tolerance;
  const oppositeDown = failedHigh && current.c < failed.l && current.c < current.o;
  const oppositeUp = failedLow && current.c > failed.h && current.c > current.o;
  if (!oppositeDown && !oppositeUp) return assessment("false_high_low", "ABSTAIN", "NEUTRAL", i, bars, failedHigh || failedLow ? "FAILED_BREAK_LACKS_OPPOSITE_CONFIRMATION" : "NO_FAILED_NEIGHBOR_BREAK", 0);
  const direction = oppositeDown ? "DOWN" : "UP";
  return assessment("false_high_low", "DETECTED", direction, i, bars, `${direction}_OPPOSITE_BREAK_AFTER_FAILED_NEIGHBOR`, clamp(Math.abs(current.c - failed.c) / Math.max(atr, 1e-12)));
}

function detectDoublePressure(bars: M5PriceBar[], atr: number): PriceActionAssessment {
  const i = bars.length - 1;
  if (bars.length < 7 || atr <= 0) return assessment("double_pressure", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, "INSUFFICIENT_M5_CONTEXT", 0);
  const breakBar = bars[i - 1], current = bars[i], context = bars.slice(i - 5, i - 1), tolerance = atr * 0.05;
  const ceiling = Math.max(...context.map((bar) => bar.h)), floor = Math.min(...context.map((bar) => bar.l));
  const breakUp = breakBar.c > ceiling + tolerance && breakBar.c > breakBar.o;
  const breakDown = breakBar.c < floor - tolerance && breakBar.c < breakBar.o;
  const followUp = breakUp && current.c >= breakBar.c - atr * 0.2 && current.c > current.o;
  const followDown = breakDown && current.c <= breakBar.c + atr * 0.2 && current.c < current.o;
  if (!followUp && !followDown) return assessment("double_pressure", "ABSTAIN", "NEUTRAL", i, bars, breakUp || breakDown ? "BREAK_LACKS_FOLLOW_THROUGH" : "NO_PREPARED_BOUNDARY_BREAK", 0);
  const direction = followUp ? "UP" : "DOWN";
  return assessment("double_pressure", "DETECTED", direction, i, bars, `${direction}_BREAK_AND_FOLLOW_THROUGH`, clamp(Math.abs(current.c - breakBar.c) / Math.max(atr, 1e-12)));
}

function detectTeaseBreak(bars: M5PriceBar[], atr: number): PriceActionAssessment {
  const i = bars.length - 1;
  if (bars.length < 8 || atr <= 0) return assessment("tease_break", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, "INSUFFICIENT_M5_CONTEXT", 0);
  const initial = bars[i - 2], retest = bars[i - 1], current = bars[i], context = bars.slice(i - 6, i - 2), tolerance = atr * 0.1;
  const ceiling = Math.max(...context.map((bar) => bar.h)), floor = Math.min(...context.map((bar) => bar.l));
  const teaseUp = initial.h > ceiling + tolerance && initial.c <= ceiling + tolerance;
  const teaseDown = initial.l < floor - tolerance && initial.c >= floor - tolerance;
  const retestUp = teaseUp && retest.l <= ceiling + tolerance && retest.c >= ceiling - tolerance;
  const retestDown = teaseDown && retest.h >= floor - tolerance && retest.c <= floor + tolerance;
  const rebrokeUp = retestUp && current.c > initial.h && current.c > current.o;
  const rebrokeDown = retestDown && current.c < initial.l && current.c < current.o;
  if (!rebrokeUp && !rebrokeDown) return assessment("tease_break", "ABSTAIN", "NEUTRAL", i, bars, teaseUp || teaseDown ? "PREMATURE_BREAK_RETEST_WITHOUT_SECOND_BREAK" : "NO_PREMATURE_BREAK", 0);
  const direction = rebrokeUp ? "UP" : "DOWN";
  return assessment("tease_break", "DETECTED", direction, i, bars, `${direction}_TEASE_RETEST_SECOND_BREAK`, clamp(Math.abs(current.c - (direction === "UP" ? initial.h : initial.l)) / Math.max(atr, 1e-12)));
}

function detectPullbackReversal(bars: M5PriceBar[]): PriceActionAssessment {
  const i = bars.length - 1;
  const observed = observePullbackReversal(bars);
  if (!observed.detected) return assessment("pullback_reversal", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, observed.reason, 0);
  return { ...assessment("pullback_reversal", "DETECTED", observed.setup.direction, i, bars, observed.reason, observed.score), setup: observed.setup };
}

function detectCeilingTest(bars: M5PriceBar[], atr: number): PriceActionAssessment {
  const i = bars.length - 1;
  if (bars.length < 7 || atr <= 0) return assessment("ceiling_test", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, "INSUFFICIENT_M5_CONTEXT", 0);
  const prior = bars.slice(i - 6, i - 1), level = Math.max(...prior.map((b) => b.h)), floor = Math.min(...prior.map((b) => b.l)), b = bars[i], tol = atr * 0.3;
  const testsCeiling = Math.abs(b.h - level) <= tol && b.c < level, testsFloor = Math.abs(b.l - floor) <= tol && b.c > floor;
  if (testsCeiling && testsFloor) return assessment("ceiling_test", "ABSTAIN", "NEUTRAL", i, bars, "AMBIGUOUS_TWO_SIDED_LEVEL_TEST", 0);
  if (!testsCeiling && !testsFloor) return assessment("ceiling_test", "ABSTAIN", "NEUTRAL", i, bars, "NO_INTERNAL_LEVEL_TEST", 0);
  return assessment("ceiling_test", "DETECTED", testsCeiling ? "DOWN" : "UP", i, bars, testsCeiling ? "INTERNAL_CEILING_TEST" : "INTERNAL_FLOOR_TEST", clamp(1 - Math.min(tol, Math.abs((testsCeiling ? b.h : b.l) - (testsCeiling ? level : floor))) / Math.max(tol, 1e-12)));
}

function detectRoundNumber(bars: M5PriceBar[], atr: number, options: M5PriceActionOptions): PriceActionAssessment {
  const i = bars.length - 1;
  if (!bars.length || atr <= 0) return assessment("round_number", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, "INSUFFICIENT_M5_CONTEXT", 0);
  const price = bars[i].c, step = options.roundStep && options.roundStep > 0 ? options.roundStep : Math.abs(price) >= 100 ? 50 : 0.005;
  const level = Math.round(price / step) * step, distance = Math.abs(price - level), tolerance = Math.max(atr * 0.35, step * 0.02);
  if (distance > tolerance) return assessment("round_number", "ABSTAIN", "NEUTRAL", i, bars, "PRICE_AWAY_FROM_ROUND_NUMBER", 0);
  const direction: PriceActionDirection = bars[i].c > bars[i].o ? "UP" : bars[i].c < bars[i].o ? "DOWN" : "NEUTRAL";
  return assessment("round_number", "DETECTED", direction, i, bars, `ROUND_LEVEL_CONTEXT:${level.toFixed(8)}`, clamp(1 - distance / tolerance));
}

function detectPatternBreakCombi(bars: M5PriceBar[]): PriceActionAssessment {
  const observed = observePatternBreakCombi(bars.slice(-14));
  const i = bars.length - 1;
  if (!observed.detected) return assessment("pattern_break_combi", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, observed.reason, 0);
  return { ...assessment("pattern_break_combi", "DETECTED", observed.setup.direction, i, bars, observed.reason, observed.score), setup: observed.setup };
}

function detectPatternBreak(bars: M5PriceBar[]): PriceActionAssessment {
  const observed = observePatternBreak(bars.slice(-14)), i = bars.length - 1;
  if (!observed.detected) return assessment("pattern_break", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, observed.reason, 0);
  return { ...assessment("pattern_break", "DETECTED", observed.setup.direction, i, bars, observed.reason, observed.score), setup: observed.setup };
}

function detectPatternBreakPullback(bars: M5PriceBar[]): PriceActionAssessment {
  const observed = observePatternBreakPullback(bars), i = bars.length - 1;
  if (!observed.detected) return assessment("pattern_break_pullback", "ABSTAIN", "NEUTRAL", i >= 0 ? i : null, bars, observed.reason, 0);
  return { ...assessment("pattern_break_pullback", "DETECTED", observed.setup.direction, i, bars, observed.reason, observed.score), setup: observed.setup };
}

function markerFor(a: PriceActionAssessment, bars: M5PriceBar[]): PriceActionMarker | null {
  if (a.state !== "DETECTED" || a.i == null || !bars[a.i]) return null;
  const b = bars[a.i], ref = sourceFor(a.conceptId);
  return { conceptId: a.conceptId, sourceConceptId: ref.sourceConceptId, pageAnchors: ref.pageAnchors, i: a.i, time: b.t, price: a.conceptId === "false_break" ? (a.direction === "DOWN" ? b.h : b.l) : b.c, position: a.direction === "UP" ? "below" : a.direction === "DOWN" ? "above" : "at", direction: a.direction, label: a.conceptId.replace(/_/g, " ").toUpperCase(), state: "DETECTED", score: a.score, ...(a.setup ? { setup: a.setup } : {}) };
}

// Original geometry and median range use14 bars. Pullback EMA25 uses its own
// bounded40-bar prefix, preserving the original detector definitions.
// Only transitions between these setup bars affect the current observation.
const SETUP_CONTEXT_BARS = 14;

function contiguousEvidenceWindow(bars: M5PriceBar[], end: number): boolean {
  const start = Math.max(1, end - SETUP_CONTEXT_BARS + 2);
  for (let i = start; i <= end; i++) {
    const delta = Date.parse(bars[i].t) - Date.parse(bars[i - 1].t);
    // Session closures are still missing M5 transitions for setup geometry.
    if (delta !== 5 * 60_000) return false;
  }
  return true;
}

function wilson(successes: number, n: number): { lower: number; upper: number } | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  const z = 1.959963984540054;
  const p = successes / n, z2 = z * z, den = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / den;
  const radius = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / den;
  return { lower: Number(clamp(centre - radius).toFixed(4)), upper: Number(clamp(centre + radius).toFixed(4)) };
}

/**
 * Measure setup recurrence and next-closed-bar directional outcomes in strict
 * chronological order. Setup labels are computed at bar i; the outcome is
 * read only from i+1, and is never fed back into the label. This is a
 * descriptive research tape, not a signal or execution input.
 */
export function measurePriceActionEvidence(input: readonly M5PriceBar[], options: M5PriceActionOptions = {}): Partial<Record<PriceActionConceptId, PriceActionConceptEvidence>> {
  const ids = CONCEPTS;
  const emptyEvidence = (id: PriceActionConceptId): PriceActionConceptEvidence => ({ conceptId: id, occurrences: 0, evaluated: 0, skipped: 0, firstEvaluation: null, lastEvaluation: null, outcomes: { up: 0, down: 0, flat: 0 }, long: { occurrences: 0, wins: 0, hitRate: null, interval95: null }, short: { occurrences: 0, wins: 0, hitRate: null, interval95: null }, hitRate: null, interval95: null, recurrenceRate: 0, lastOccurrence: null, history: [], authority: "SHADOW_ONLY / NO_DECISION" });
  const invalid = input.some((bar) => !finiteBar(bar) || bar.closed === false) || input.some((bar, index) => index > 0 && Date.parse(bar.t) <= Date.parse(input[index - 1].t));
  if (invalid) return Object.fromEntries(ids.map((id) => [id, emptyEvidence(id)])) as Partial<Record<PriceActionConceptId, PriceActionConceptEvidence>>;
  const bars = input.slice();
  const state = new Map<PriceActionConceptId, { occurrences: number; evaluated: number; skipped: number; first: string | null; lastEvaluated: string | null; long: [number, number]; short: [number, number]; outcomes: [number, number, number]; last: string | null; history: PriceActionOccurrence[] }>();
  ids.forEach((id) => state.set(id, { occurrences: 0, evaluated: 0, skipped: 0, first: null, lastEvaluated: null, long: [0, 0], short: [0, 0], outcomes: [0, 0, 0], last: null, history: [] }));
  const start = 8;
  // The caller already enforces the product's two-year M5 retention window.
  // Scan that complete retained tape so recurrence and hit-rate evidence mean
  // “all observed occurrences in the available history”, not a short recent
  // sample. The per-row prefix remains bounded to 14 bars, keeping work linear
  // in the retained history while preserving closed-bar chronology.
  const first = start;
  for (let i = first; i < bars.length - 1; i++) {
    const step = Date.parse(bars[i + 1].t) - Date.parse(bars[i].t);
    // H+1 is the immediately following five-minute bar, including at a session
    // boundary: the next available row after a closure is not an M5 outcome.
    if (step !== 5 * 60_000 || !contiguousEvidenceWindow(bars, i)) {
      ids.forEach((id) => { state.get(id)!.skipped++; });
      continue;
    }
    // Every detector only reads the immediately preceding setup geometry;
    // keeping this local prefix makes refresh cost linear in the retained tape.
    const prefix = bars.slice(Math.max(0, i - SETUP_CONTEXT_BARS + 1), i + 1);
    const atr = median(prefix.map(range));
    const assessments = [detectSupportResistance(prefix, atr), detectDominantPressure(prefix, atr), detectFalseHighLow(prefix, atr), detectDoublePressure(prefix, atr), detectTeaseBreak(prefix, atr), detectBuildup(prefix, atr), detectFalseBreak(prefix, atr), detectPullbackReversal(bars.slice(Math.max(0, i - PULLBACK_REVERSAL_CONTEXT + 1), i + 1)), detectCeilingTest(prefix, atr), detectRoundNumber(prefix, atr, options), detectPatternBreakCombi(prefix), detectPatternBreak(prefix), detectPatternBreakPullback(bars.slice(Math.max(0, i - PATTERN_BREAK_PULLBACK_CONTEXT + 1), i + 1))];
    const next = bars[i + 1].c - bars[i].c;
    const outcome: PriceActionDirection = next > 0 ? "UP" : next < 0 ? "DOWN" : "NEUTRAL";
    for (const a of assessments) {
      const s = state.get(a.conceptId)!;
      s.evaluated++;
      if (!s.first) s.first = bars[i].t;
      s.lastEvaluated = bars[i].t;
      if (a.state !== "DETECTED") continue;
      s.occurrences++;
      s.last = bars[i].t;
      s.outcomes[outcome === "UP" ? 0 : outcome === "DOWN" ? 1 : 2]++;
      if (a.direction === "UP" || a.direction === "DOWN") {
        const bucket = a.direction === "UP" ? s.long : s.short;
        bucket[0]++;
        if (a.direction === outcome) bucket[1]++;
      }
      s.history.push({ i, time: bars[i].t, direction: a.direction, nextBar: outcome === "NEUTRAL" ? "FLAT" : outcome, score: a.score, ...(a.setup ? { setup: a.setup } : {}) });
    }
  }
  const out: Partial<Record<PriceActionConceptId, PriceActionConceptEvidence>> = {};
  for (const id of ids) {
    const s = state.get(id)!;
    const total = s.long[0] + s.short[0], wins = s.long[1] + s.short[1];
    const side = (pair: [number, number]) => ({ occurrences: pair[0], wins: pair[1], hitRate: pair[0] ? Number((pair[1] / pair[0]).toFixed(4)) : null, interval95: wilson(pair[1], pair[0]) });
    out[id] = { conceptId: id, occurrences: s.occurrences, evaluated: s.evaluated, skipped: s.skipped, firstEvaluation: s.first, lastEvaluation: s.lastEvaluated, outcomes: { up: s.outcomes[0], down: s.outcomes[1], flat: s.outcomes[2] }, long: side(s.long), short: side(s.short), hitRate: total ? Number((wins / total).toFixed(4)) : null, interval95: wilson(wins, total), recurrenceRate: Number((s.occurrences / Math.max(1, s.evaluated)).toFixed(4)), lastOccurrence: s.last, history: s.history, authority: "SHADOW_ONLY / NO_DECISION" };
  }
  return out;
}

export function detectM5PriceAction(input: readonly M5PriceBar[], options: M5PriceActionOptions = {}): M5PriceActionResult {
  const symbol = options.symbol ?? "UNKNOWN";
  const candidateBars = input.filter((bar) => finiteBar(bar) && bar.closed !== false).slice();
  const orderedInput = candidateBars.every((bar, i) => i === 0 || Date.parse(bar.t) > Date.parse(candidateBars[i - 1].t));
  const bars = candidateBars.slice().sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  const source = { title: SOURCE_TITLE, authority: "SHADOW_ONLY / NO_DECISION" as const, concepts: SOURCE };
  if (!bars.length) {
    const assessments = CONCEPTS.map((id) => assessment(id, "ABSTAIN", "NEUTRAL", null, bars, "INSUFFICIENT_M5_CONTEXT", 0));
    return { ok: false, timeframe: "M5", symbol, asOf: null, state: "ABSTAIN", reason: "INSUFFICIENT_M5_CONTEXT", assessments, markers: [], source };
  }
  if (input.length !== bars.length || !orderedInput || bars.some((b, i) => i > 0 && Date.parse(b.t) === Date.parse(bars[i - 1].t))) {
    const assessments = CONCEPTS.map((id) => assessment(id, "ABSTAIN", "NEUTRAL", bars.length ? bars.length - 1 : null, bars, "INVALID_OR_FORMING_BAR_INPUT", 0));
    return { ok: false, timeframe: "M5", symbol, asOf: bars.length ? bars[bars.length - 1].t : null, state: "ABSTAIN", reason: "INVALID_OR_FORMING_BAR_INPUT", assessments, markers: [], source };
  }
  // Historical windows validate their own setup and next-bar boundary. An old
  // archive gap must not erase unrelated valid evidence or a complete new setup.
  const evidence = measurePriceActionEvidence(bars, options);
  if (!contiguousEvidenceWindow(bars, bars.length - 1)) {
    const assessments = CONCEPTS.map((id) => assessment(id, "ABSTAIN", "NEUTRAL", bars.length - 1, bars, "NON_CONTIGUOUS_M5_TAPE", 0));
    return { ok: false, timeframe: "M5", symbol, asOf: bars[bars.length - 1].t, state: "ABSTAIN", reason: "NON_CONTIGUOUS_M5_TAPE", assessments, markers: [], source, evidence };
  }
  const atr = median(bars.slice(-SETUP_CONTEXT_BARS).map(range));
  const assessments = [detectSupportResistance(bars, atr), detectDominantPressure(bars, atr), detectFalseHighLow(bars, atr), detectDoublePressure(bars, atr), detectTeaseBreak(bars, atr), detectBuildup(bars, atr), detectFalseBreak(bars, atr), detectPullbackReversal(bars), detectCeilingTest(bars, atr), detectRoundNumber(bars, atr, options), detectPatternBreakCombi(bars), detectPatternBreak(bars), detectPatternBreakPullback(bars)];
  const markers = assessments.map((a) => markerFor(a, bars)).filter((m): m is PriceActionMarker => !!m);
  return { ok: true, timeframe: "M5", symbol, asOf: bars.length ? bars[bars.length - 1].t : null, state: markers.length ? "READY" : "ABSTAIN", ...(markers.length ? {} : { reason: "NO_CONCEPT_MATCH" }), assessments, markers, source, evidence };
}

/** Short alias for callers that do not need to spell out the timeframe. */
export const detectPriceAction = detectM5PriceAction;
export const PRICE_ACTION_SOURCE = SOURCE;




