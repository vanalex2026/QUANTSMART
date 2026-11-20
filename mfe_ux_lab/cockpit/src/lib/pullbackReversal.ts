import type { M5PriceBar } from "./priceActionDetector.ts";

export const PULLBACK_REVERSAL_CONTEXT = 40;
export type PullbackReversalSetup = {
  kind: "PULLBACK_REVERSAL";
  version: "pullback-reversal-close-confirmation/3";
  direction: "UP" | "DOWN";
  contextStart: string;
  contextEnd: string;
  dominantTimes: string[];
  originTime: string;
  originPrice: number;
  peakTime: string;
  peakPrice: number;
  correctionTimes: string[];
  turnTimes: string[];
  signalBarTime: string;
  confirmationTime: string;
  emaContextStart: string;
  emaAtSignal: number;
  emaAtPeak: number;
  baseline: number;
  retracementFraction: number;
  correctionRangeRatio: number;
  technicalTest: { time: string; price: number; edge: "HIGH" | "LOW"; distance: number } | null;
  breakoutLevel: number;
  protectionReference: number;
  breakSequence: {
    kind: "FIRST_CLOSE_BREAK" | "SECOND_CLOSE_BREAK";
    firstSignalTime: string | null;
    firstBreakTime: string | null;
    firstBreakLevel: number | null;
    firstProtection: number | null;
    firstEma: number | null;
    counterTime: string | null;
    counterPrice: number | null;
  };
};
type Result = { detected: false; reason: string } | { detected: true; reason: string; score: number; setup: PullbackReversalSetup };
const range = (bar: M5PriceBar) => bar.h - bar.l;
const valid = (bar: M5PriceBar) => bar && bar.closed !== false && Number.isFinite(Date.parse(bar.t)) && Date.parse(bar.t) % 300_000 === 0 && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite) && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;

/** Printed129: first reversal break, opposing return, then a second break.
 * This close-only local sequence does not infer intrabar order or double pressure. */
function secondBreak(bars: readonly M5PriceBar[], correctionStart: number, emas: number[], baseline: number, direction: "UP" | "DOWN"): PullbackReversalSetup["breakSequence"] | null {
  const signalIndex = bars.length - 2, signal = bars[signalIndex], sign = direction === "UP" ? 1 : -1;
  const edge = (b: M5PriceBar) => direction === "UP" ? b.h : b.l;
  const opposite = (b: M5PriceBar) => direction === "UP" ? b.l : b.h;
  // Prefer the latest qualifying first attempt. At least one distinct return
  // candle must lie between its confirmation and the final signal.
  for (let first = signalIndex - 3; first >= correctionStart; first--) {
    const a = bars[first], b = bars[first + 1], span = range(a);
    const priorExtreme = direction === "UP" ? Math.min(...bars.slice(correctionStart, first + 1).map(opposite)) : Math.max(...bars.slice(correctionStart, first + 1).map(opposite));
    if (span > 1.5 * baseline || sign * (a.c - a.o) < 0 || sign * (a.c - opposite(a)) < .55 * span) continue;
    if (emas[first] < a.l - .2 * baseline || emas[first] > a.h + .2 * baseline || Math.abs(opposite(a) - priorExtreme) > .35 * baseline) continue;
    if (sign * (b.o - edge(a)) > 0 || sign * (b.c - edge(a)) <= .05 * baseline || sign * (opposite(b) - priorExtreme) <= 0) continue;
    // A return must visibly oppose the first attempt and close back behind
    // its signal edge. A second continuation candle is not a second attempt.
    const returned = bars.slice(first + 2, signalIndex).filter(bar => sign * (bar.c - bar.o) < 0 && sign * (bar.c - b.c) <= -.1 * baseline && sign * (bar.c - edge(a)) <= 0);
    if (!returned.length || Math.abs(opposite(signal) - opposite(a)) > .75 * baseline || sign * (signal.c - b.c) > .1 * baseline) continue;
    const counter = returned.reduce((best, bar) => sign * (opposite(bar) - opposite(best)) <= 0 ? bar : best);
    return { kind: "SECOND_CLOSE_BREAK", firstSignalTime: a.t, firstBreakTime: b.t, firstBreakLevel: edge(a), firstProtection: priorExtreme, firstEma: emas[first], counterTime: counter.t, counterPrice: opposite(counter) };
  }
  return null;
}

/** Printed125-129: harmony of dominant leg/correction, EMA25 test, prepared
 * turnaround and subsequent signal-bar break. Exact bounds are local rules.
 * Replaces the earlier unversioned nine-bar retracement-only geometry. */
export function observePullbackReversal(input: readonly M5PriceBar[]): Result {
  if (input.length < PULLBACK_REVERSAL_CONTEXT) return { detected: false, reason: "INSUFFICIENT_REVERSAL_EMA_CONTEXT" };
  const bars = input.slice(-PULLBACK_REVERSAL_CONTEXT), end = bars.length - 1, signal = bars[end - 1], entry = bars[end];
  // A later close must break the directional signal. Most endpoints cannot
  // qualify; avoid rebuilding every possible leg when this necessary step fails.
  const upCandidate = valid(signal) && valid(entry) && signal.c >= signal.o && entry.o <= signal.h && entry.c > signal.h;
  const downCandidate = valid(signal) && valid(entry) && signal.c <= signal.o && entry.o >= signal.l && entry.c < signal.l;
  if (!upCandidate && !downCandidate) return { detected: false, reason: "REVERSAL_SIGNAL_BREAK_NOT_CLOSE_CONFIRMED" };
  if (bars.some(bar => !valid(bar)) || bars.some((bar, i) => i > 0 && Date.parse(bar.t) - Date.parse(bars[i - 1].t) !== 300_000)) return { detected: false, reason: "REVERSAL_REQUIRES_CONSECUTIVE_CLOSED_M5_BARS" };
  const emas: number[] = [];
  let ema = bars.slice(0, 25).reduce((sum, bar) => sum + bar.c, 0) / 25;
  emas[24] = ema;
  for (let i = 25; i < end; i++) { ema += (bars[i].c - ema) * (2 / 26); emas[i] = ema; }
  let failure = { rank: 0, reason: "NO_PREPARED_DOMINANT_LEG" };
  const fail = (rank: number, reason: string) => { if (rank > failure.rank) failure = { rank, reason }; };
  for (let count = 8; count >= 2; count--) for (let length = 8; length >= 5; length--) {
    const peakIndex = end - count - 1, first = peakIndex - length + 1;
    // EMA must already be seeded at the origin to measure its local slope.
    if (first < 24) continue;
    const dominant = bars.slice(first, peakIndex + 1), peak = bars[peakIndex];
    const direction = peak.c > dominant[0].o ? "UP" : peak.c < dominant[0].o ? "DOWN" : null;
    if (!direction) continue;
    if (direction === "UP" ? !upCandidate : !downCandidate) continue;
    const sign = direction === "UP" ? 1 : -1;
    const edge = (bar: M5PriceBar) => direction === "UP" ? bar.h : bar.l;
    const opposite = (bar: M5PriceBar) => direction === "UP" ? bar.l : bar.h;
    const ranges = dominant.map(range).sort((a, b) => a - b), baseline = ranges.length % 2 ? ranges[Math.floor(length / 2)] : (ranges[length / 2 - 1] + ranges[length / 2]) / 2;
    const aligned = dominant.filter(bar => sign * (bar.c - bar.o) > 0).length;
    const steps = dominant.slice(1).filter((bar, i) => sign * (bar.h - dominant[i].h) > 0 && sign * (bar.l - dominant[i].l) > 0).length;
    const net = sign * (peak.c - dominant[0].o), path = Math.abs(dominant[0].c - dominant[0].o) + dominant.slice(1).reduce((sum, bar, i) => sum + Math.abs(bar.c - dominant[i].c), 0);
    const efficiency = path > 0 ? net / path : 0;
    if (net < 2 * baseline || aligned < length - 2 || steps < Math.ceil(.6 * (length - 1)) || efficiency < .6 || dominant.some(bar => sign * (edge(bar) - edge(peak)) > 0)) continue;
    if (sign * (emas[peakIndex] - emas[first]) < .1 * baseline) { fail(1, "EMA25_NOT_ALIGNED_WITH_DOMINANT_LEG"); continue; }
    const origin = sign * (opposite(dominant[0]) - opposite(dominant[1])) <= 0 ? dominant[0] : dominant[1];
    if (dominant.some(bar => sign * (opposite(bar) - opposite(origin)) < 0)) continue;
    const leg = sign * (edge(peak) - opposite(origin));
    const correction = bars.slice(peakIndex + 1, end);
    if (correction.some(bar => sign * (edge(bar) - edge(peak)) > 0)) { fail(2, "CORRECTION_EXCEEDS_DOMINANT_EXTREME"); continue; }
    const extreme = direction === "UP" ? Math.min(...correction.map(bar => bar.l)) : Math.max(...correction.map(bar => bar.h));
    const retracement = sign * (edge(peak) - extreme) / leg;
    const strong = efficiency >= .8 && aligned >= Math.ceil(.8 * length);
    if (retracement < (strong ? .4 : .5) || retracement > .65) { fail(2, "CORRECTION_NOT_PROPORTIONATE_TO_DOMINANT_LEG"); continue; }
    const averageDominant = dominant.reduce((sum, bar) => sum + range(bar), 0) / length;
    const correctionRangeRatio = (correction.reduce((sum, bar) => sum + range(bar), 0) / count) / averageDominant;
    if (correctionRangeRatio > 1 || !correction.slice(0, -1).some((bar, i) => sign * (bar.c - bars[peakIndex + i].c) < 0)) { fail(3, "CORRECTION_NOT_RELUCTANT_OR_ALREADY_RESUMED"); continue; }
    const sequence = secondBreak(bars, peakIndex + 1, emas, baseline, direction);
    const signalEdge = opposite(signal);
    const emaTest = emas[end - 1] >= signal.l - .2 * baseline && emas[end - 1] <= signal.h + .2 * baseline;
    if ((!emaTest || Math.abs(signalEdge - extreme) > .35 * baseline) && !sequence) { fail(4, "NO_SIGNAL_AT_EMA25_AND_CORRECTION_EXTREME"); continue; }
    const signalReady = range(signal) <= 1.5 * baseline && sign * (signal.c - signal.o) >= 0 && (direction === "UP" ? signal.c >= signal.l + .55 * range(signal) : signal.c <= signal.l + .45 * range(signal));
    if (!signalReady) { fail(5, "NO_DIRECTIONAL_TURNAROUND_SIGNAL"); continue; }
    const level = edge(signal), protection = extreme;
    const confirmed = direction === "UP" ? entry.o <= level && entry.c > level + .05 * baseline : entry.o >= level && entry.c < level - .05 * baseline;
    if (!confirmed) { fail(6, "REVERSAL_SIGNAL_BREAK_NOT_CLOSE_CONFIRMED"); continue; }
    if (direction === "UP" ? entry.l <= protection : entry.h >= protection) { fail(7, "AMBIGUOUS_REVERSAL_CONFIRMATION_BAR"); continue; }
    // Longest compact overlapping turn (up to three bars), ending at signal.
    let turn = [signal];
    for (let size = Math.min(3, count); size >= 2; size--) {
      const candidate = correction.slice(-size), span = Math.max(...candidate.map(bar => bar.h)) - Math.min(...candidate.map(bar => bar.l));
      if (span > 1.5 * baseline) continue;
      if (candidate.slice(1).some((bar, i) => Math.min(bar.h, candidate[i].h) - Math.max(bar.l, candidate[i].l) < .4 * Math.min(range(bar), range(candidate[i])))) continue;
      turn = candidate; break;
    }
    const tests = dominant.slice(0, -1).flatMap(bar => ([{ time: bar.t, price: bar.h, edge: "HIGH" as const, distance: Math.abs(bar.h - extreme) }, { time: bar.t, price: bar.l, edge: "LOW" as const, distance: Math.abs(bar.l - extreme) }])).filter(test => test.distance <= .25 * baseline).sort((a, b) => a.distance - b.distance || Date.parse(b.time) - Date.parse(a.time));
    const score = Number(Math.min(1, .4 * Math.max(0, 1 - Math.abs(retracement - .55) / .55) + .3 * Math.min(1, efficiency) + .3 / Math.max(1, correctionRangeRatio)).toFixed(4));
    return { detected: true, reason: `${direction}_${length}_BAR_LEG_${count}_BAR_CORRECTION_${turn.length}_BAR_TURN_${sequence ? "SECOND" : "FIRST"}_CLOSE_BREAK`, score, setup: { kind: "PULLBACK_REVERSAL", version: "pullback-reversal-close-confirmation/3", direction, contextStart: dominant[0].t, contextEnd: peak.t, dominantTimes: dominant.map(bar => bar.t), originTime: origin.t, originPrice: opposite(origin), peakTime: peak.t, peakPrice: edge(peak), correctionTimes: correction.map(bar => bar.t), turnTimes: turn.map(bar => bar.t), signalBarTime: signal.t, confirmationTime: entry.t, emaContextStart: bars[0].t, emaAtSignal: emas[end - 1], emaAtPeak: emas[peakIndex], baseline, retracementFraction: retracement, correctionRangeRatio, technicalTest: tests[0] ?? null, breakoutLevel: level, protectionReference: protection, breakSequence: sequence ?? { kind: "FIRST_CLOSE_BREAK", firstSignalTime: null, firstBreakTime: null, firstBreakLevel: null, firstProtection: null, firstEma: null, counterTime: null, counterPrice: null } } };
  }
  return { detected: false, reason: failure.reason };
}
