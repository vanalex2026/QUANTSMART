import type { M5PriceBar } from "./priceActionDetector.ts";

export const PATTERN_BREAK_PULLBACK_CONTEXT = 40;
export type PatternBreakPullbackSetup = {
  kind: "PATTERN_BREAK_PULLBACK";
  version: "pattern-break-pullback-close-confirmation/1";
  variant: "HANGING" | "RETURN_TEST";
  direction: "UP" | "DOWN";
  contextStart: string;
  contextEnd: string;
  originalBreakTime: string;
  pullbackTimes: string[];
  signalBarTime: string;
  confirmationTime: string;
  emaContextStart: string;
  emaAtSignal: number;
  contextBoundary: number;
  breakoutLevel: number;
  protectionReference: number;
};
type Result = { detected: false; reason: string } | { detected: true; reason: string; score: number; setup: PatternBreakPullbackSetup };
const range = (bar: M5PriceBar) => bar.h - bar.l;
const valid = (bar: M5PriceBar) => bar && bar.closed !== false && Number.isFinite(Date.parse(bar.t)) && Date.parse(bar.t) % 300_000 === 0 && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite) && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;

/** Printed97,99,101-102,104: post-break barrier fight or return test, a new
 * signal at barrier/EMA25, then its subsequent break. Numbers are local rules.
 * EMA25 is explicitly a bounded estimate: seed SMA25 in the last40 closed bars. */
export function observePatternBreakPullback(input: readonly M5PriceBar[]): Result {
  if (input.length < PATTERN_BREAK_PULLBACK_CONTEXT) return { detected: false, reason: "INSUFFICIENT_PULLBACK_EMA_CONTEXT" };
  const bars = input.slice(-PATTERN_BREAK_PULLBACK_CONTEXT), end = bars.length - 1;
  if (bars.some(bar => !valid(bar)) || bars.some((bar, i) => i > 0 && Date.parse(bar.t) - Date.parse(bars[i - 1].t) !== 300_000)) return { detected: false, reason: "PULLBACK_REQUIRES_CONSECUTIVE_CLOSED_M5_BARS" };
  let ema = bars.slice(0, 25).reduce((sum, bar) => sum + bar.c, 0) / 25;
  for (let i = 25; i < end; i++) ema += (bars[i].c - ema) * (2 / 26);
  let failure = { rank: 0, reason: "NO_PRIOR_PATTERN_BOUNDARY_BREAK" };
  const fail = (rank: number, reason: string) => { if (rank > failure.rank) failure = { rank, reason }; };
  for (const count of [6, 5, 4, 3, 2, 1]) {
    const originalIndex = end - count - 1;
    const context = bars.slice(originalIndex - 6, originalIndex), original = bars[originalIndex];
    const ranges = context.map(range).sort((a, b) => a - b), baseline = (ranges[2] + ranges[3]) / 2;
    const up = original.c > original.o, down = original.c < original.o;
    if (!up && !down) continue;
    const boundary = up ? Math.max(...context.map(bar => bar.h)) : Math.min(...context.map(bar => bar.l));
    const touches = context.filter(bar => Math.abs((up ? bar.h : bar.l) - boundary) <= .2 * baseline).length;
    const net = context[5].c - context[0].c;
    const broke = up ? original.o <= boundary + .25 * baseline && original.c > boundary + .1 * baseline && net >= -.25 * baseline : original.o >= boundary - .25 * baseline && original.c < boundary - .1 * baseline && net <= .25 * baseline;
    if (touches < 2 || !broke) continue;
    const pullback = bars.slice(originalIndex + 1, end), signal = pullback[count - 1], entry = bars[end];
    const sustained = pullback.every(bar => up ? bar.c >= boundary - .2 * baseline && bar.l >= boundary - .6 * baseline : bar.c <= boundary + .2 * baseline && bar.h <= boundary + .6 * baseline);
    if (!sustained) { fail(1, "INITIAL_BREAK_UNDONE_BY_PULLBACK"); continue; }
    const signalEdge = up ? signal.l : signal.h;
    const nearBoundary = Math.abs(signalEdge - boundary) <= .35 * baseline;
    const signalReady = range(signal) <= 1.5 * baseline && (up ? signal.c >= signal.o && signal.c >= signal.l + .55 * range(signal) : signal.c <= signal.o && signal.c <= signal.l + .45 * range(signal));
    if (!nearBoundary || !signalReady) { fail(2, "NO_TURNAROUND_SIGNAL_AT_BROKEN_BARRIER"); continue; }
    if (ema < signal.l - .25 * baseline || ema > signal.h + .25 * baseline) { fail(3, "PULLBACK_SIGNAL_HAS_NOT_TESTED_EMA25_AREA"); continue; }
    const previous = [original, ...pullback.slice(0, -1)];
    const extreme = up ? Math.max(...previous.map(bar => bar.h)) : Math.min(...previous.map(bar => bar.l));
    const excursion = up ? extreme - boundary : boundary - extreme;
    const retracement = up ? extreme - signal.l : signal.h - extreme;
    const colors = pullback.map(bar => Math.sign(bar.c - bar.o));
    const alternating = colors.slice(1).some((color, i) => color !== 0 && colors[i] !== 0 && color !== colors[i]);
    const span = Math.max(...pullback.map(bar => bar.h)) - Math.min(...pullback.map(bar => bar.l));
    const variant = excursion >= .8 * baseline && retracement >= .35 * baseline ? "RETURN_TEST" : excursion < .8 * baseline && count >= 2 && alternating && span <= 1.3 * baseline ? "HANGING" : null;
    if (!variant) { fail(4, "NO_PREPARED_POST_BREAK_PULLBACK_VARIANT"); continue; }
    const level = up ? signal.h : signal.l, protection = up ? Math.min(...pullback.map(bar => bar.l)) : Math.max(...pullback.map(bar => bar.h));
    const confirmed = up ? entry.o <= level && entry.c > Math.max(level, boundary) + .05 * baseline : entry.o >= level && entry.c < Math.min(level, boundary) - .05 * baseline;
    if (!confirmed) { fail(5, "PULLBACK_SIGNAL_BREAK_NOT_CLOSE_CONFIRMED"); continue; }
    if (up ? entry.l <= protection : entry.h >= protection) { fail(6, "AMBIGUOUS_PULLBACK_CONFIRMATION_BAR"); continue; }
    const score = Number(Math.min(1, .35 * (1 - Math.abs(signalEdge - boundary) / (.35 * baseline)) + .35 * (1 - Math.min(1, Math.abs(signal.c - ema) / (1.5 * baseline))) + .3 * Math.abs(signal.c - signal.o) / range(signal)).toFixed(4));
    return { detected: true, reason: `${up ? "UP" : "DOWN"}_${variant}_${count}_BAR_PULLBACK_CLOSE_BREAK`, score,
      setup: { kind: "PATTERN_BREAK_PULLBACK", version: "pattern-break-pullback-close-confirmation/1", variant, direction: up ? "UP" : "DOWN", contextStart: context[0].t, contextEnd: context[5].t, originalBreakTime: original.t, pullbackTimes: pullback.map(bar => bar.t), signalBarTime: signal.t, confirmationTime: entry.t, emaContextStart: bars[0].t, emaAtSignal: ema, contextBoundary: boundary, breakoutLevel: level, protectionReference: protection } };
  }
  return { detected: false, reason: failure.reason };
}
