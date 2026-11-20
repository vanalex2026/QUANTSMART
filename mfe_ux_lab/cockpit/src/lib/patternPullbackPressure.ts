import type { M5PriceBar } from "./priceActionDetector.ts";
import type { PriceActionSetup } from "./priceActionSetup.ts";
import { observePatternBreakPullback, PATTERN_BREAK_PULLBACK_CONTEXT } from "./patternBreakPullback.ts";

const M5_MS = 300_000;

export type PullbackPressure = {
  version: "pattern-pullback-pressure/1";
  time: string;
  state: "WITHHELD" | "MEASURED";
  reason: string;
  direction: "UP" | "DOWN" | null;
  baseline: number | null;
  originalBreakTime: string | null;
  signalTime: string | null;
  localLegStart: string | null;
  localLegOrigin: number | null;
  peakTime: string | null;
  peakPrice: number | null;
  localLegRange: number | null;
  returnExtremeTime: string | null;
  returnExtreme: number | null;
  retracement: number | null;
  retracementFraction: number | null;
  correctionTimes: string[];
  adverseBars: number;
  adversePowerBars: number;
  longestAdverseRun: number;
  largestAdverseBodyUnits: number | null;
  adverseCloseSpeed: number | null;
  adverseCloseEfficiency: number | null;
  terminalClusterTimes: string[];
  terminalInsideBars: number;
  terminalColorChanges: number;
  terminalSpanUnits: number | null;
  sourcePages: readonly number[];
  authority: "SHADOW_ONLY / NO_DECISION";
};

/** Printed100-102 motivates watching correction strength and fighting in the
 * turn. Numerical definitions below are local observations, never trade gates.
 * Rebuild the setup from its closed prefix instead of trusting a saved receipt. */
export function patternPullbackPressure(input: readonly M5PriceBar[], time: string, setup?: PriceActionSetup, enabled = true): PullbackPressure {
  const result: PullbackPressure = { version: "pattern-pullback-pressure/1", time, state: "WITHHELD", reason: "NO_PATTERN_BREAK_PULLBACK_SETUP", direction: null, baseline: null, originalBreakTime: null, signalTime: null, localLegStart: null, localLegOrigin: null, peakTime: null, peakPrice: null, localLegRange: null, returnExtremeTime: null, returnExtreme: null, retracement: null, retracementFraction: null, correctionTimes: [], adverseBars: 0, adversePowerBars: 0, longestAdverseRun: 0, largestAdverseBodyUnits: null, adverseCloseSpeed: null, adverseCloseEfficiency: null, terminalClusterTimes: [], terminalInsideBars: 0, terminalColorChanges: 0, terminalSpanUnits: null, sourcePages: [100, 101, 102], authority: "SHADOW_ONLY / NO_DECISION" };
  if (!enabled) return { ...result, reason: "UNVERIFIED_CURRENT_EVIDENCE" };
  if (setup?.kind !== "PATTERN_BREAK_PULLBACK") return result;
  const utc = Date.parse(time), end = Number.isFinite(utc) ? input.findIndex(bar => Date.parse(bar.t) === utc) : -1;
  if (end < 0 || Date.parse(setup.confirmationTime) !== utc) return { ...result, reason: "MISSING_OR_MISMATCHED_SETUP" };
  const bars = input.slice(Math.max(0, end - PATTERN_BREAK_PULLBACK_CONTEXT + 1), end + 1);
  // Consecutive five-minute deltas alone do not establish UTC M5 identity: a
  // uniformly shifted tape would otherwise produce measured pressure evidence
  // even though the focused research contract rejects that grid.
  if (bars.some(bar => { const instant = Date.parse(bar.t); return !Number.isFinite(instant) || instant % M5_MS !== 0; })) {
    return { ...result, reason: "PULLBACK_REQUIRES_UTC_M5_GRID" };
  }
  const observed = observePatternBreakPullback(bars);
  if (!observed.detected) return { ...result, reason: "SETUP_NOT_REPRODUCIBLE_FROM_CLOSED_PREFIX" };
  const canonical = observed.setup;
  if (canonical.direction !== setup.direction || Date.parse(canonical.originalBreakTime) !== Date.parse(setup.originalBreakTime) || Date.parse(canonical.signalBarTime) !== Date.parse(setup.signalBarTime)) return { ...result, reason: "MISMATCHED_SETUP_IDENTITY" };
  const original = bars.findIndex(bar => Date.parse(bar.t) === Date.parse(canonical.originalBreakTime));
  const signal = bars.length - 2, sign = canonical.direction === "UP" ? 1 : -1;
  const context = bars.slice(original - 6, original);
  const ranges = context.map(bar => bar.h - bar.l).sort((a, b) => a - b), baseline = (ranges[2] + ranges[3]) / 2;
  // Last equal peak wins: all correction bars then occur strictly after it.
  let peak = original;
  const trendEdge = (bar: M5PriceBar) => sign === 1 ? bar.h : bar.l;
  const returnEdge = (bar: M5PriceBar) => sign === 1 ? bar.l : bar.h;
  for (let i = original + 1; i < signal; i++) if (sign * (trendEdge(bars[i]) - trendEdge(bars[peak])) >= 0) peak = i;
  let origin = 0;
  for (let i = 1; i < context.length; i++) if (sign * (returnEdge(context[i]) - returnEdge(context[origin])) < 0) origin = i;
  const peakPrice = trendEdge(bars[peak]), originPrice = returnEdge(context[origin]);
  const legRange = sign * (peakPrice - originPrice);
  const correction = bars.slice(peak + 1, signal + 1);
  let extreme = 0;
  for (let i = 1; i < correction.length; i++) if (sign * (returnEdge(correction[i]) - returnEdge(correction[extreme])) <= 0) extreme = i;
  const retracement = Math.max(0, sign * (peakPrice - returnEdge(correction[extreme])));
  let run = 0, longest = 0, adverse = 0, power = 0, largest = 0, path = 0, previous = bars[peak].c;
  for (const bar of correction) {
    const body = sign * (bar.c - bar.o), range = bar.h - bar.l;
    if (body < 0) {
      adverse++; longest = Math.max(longest, ++run); largest = Math.max(largest, -body / baseline);
      const outerClose = sign === 1 ? bar.c <= bar.l + .25 * range : bar.c >= bar.h - .25 * range;
      if (range >= 1.25 * baseline && -body >= .6 * range && outerClose) power++;
    } else run = 0;
    path += Math.abs(bar.c - previous); previous = bar.c;
  }
  const adverseNet = Math.max(0, sign * (bars[peak].c - bars[signal].c));
  // A bounded compact overlapping suffix ending at signal; it can be absent.
  let start = signal + 1, high = -Infinity, low = Infinity;
  for (let i = signal; i > peak; i--) {
    const bar = bars[i], nextHigh = Math.max(high, bar.h), nextLow = Math.min(low, bar.l);
    if (nextHigh - nextLow > 1.3 * baseline) break;
    if (i < signal) {
      const right = bars[i + 1], overlap = Math.max(0, Math.min(bar.h, right.h) - Math.max(bar.l, right.l));
      if (overlap < .5 * Math.min(bar.h - bar.l, right.h - right.l)) break;
    }
    start = i; high = nextHigh; low = nextLow;
  }
  const cluster = bars.slice(start, signal + 1);
  let inside = 0, changes = 0;
  for (let i = 1; i < cluster.length; i++) {
    const a = cluster[i - 1], b = cluster[i];
    if (b.h <= a.h && b.l >= a.l) inside++;
    if ((a.c - a.o) * (b.c - b.o) < 0) changes++;
  }
  return { ...result, state: "MEASURED", reason: "CAUSAL_LOCAL_CORRECTION_AND_TERMINAL_CLUSTER", direction: canonical.direction, baseline, originalBreakTime: canonical.originalBreakTime, signalTime: canonical.signalBarTime, localLegStart: context[origin].t, localLegOrigin: originPrice, peakTime: bars[peak].t, peakPrice, localLegRange: legRange > 0 ? legRange : null, returnExtremeTime: correction[extreme].t, returnExtreme: returnEdge(correction[extreme]), retracement, retracementFraction: legRange > 0 ? retracement / legRange : null, correctionTimes: correction.map(bar => bar.t), adverseBars: adverse, adversePowerBars: power, longestAdverseRun: longest, largestAdverseBodyUnits: largest, adverseCloseSpeed: adverseNet / correction.length / baseline, adverseCloseEfficiency: path > 0 ? adverseNet / path : 0, terminalClusterTimes: cluster.map(bar => bar.t), terminalInsideBars: inside, terminalColorChanges: changes, terminalSpanUnits: cluster.length ? (high - low) / baseline : null };
}
