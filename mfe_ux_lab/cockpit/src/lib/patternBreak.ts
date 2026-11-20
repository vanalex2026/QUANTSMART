import type { M5PriceBar } from "./priceActionDetector.ts";

export type PatternBreakSetup = {
  kind: "PATTERN_BREAK";
  version: "pattern-break-close-confirmation/1";
  direction: "UP" | "DOWN";
  contextStart: string;
  contextEnd: string;
  buildupTimes: string[];
  boundaryTouchTimes: string[];
  signalBarTime: string;
  confirmationTime: string;
  breakoutLevel: number;
  protectionReference: number;
  contextBoundary: number;
};
type Result = { detected: false; reason: string } | { detected: true; reason: string; score: number; setup: PatternBreakSetup };
const range = (bar: M5PriceBar) => bar.h - bar.l;
const valid = (bar: M5PriceBar) => bar && bar.closed !== false && Number.isFinite(Date.parse(bar.t)) && Date.parse(bar.t) % 300_000 === 0 && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite) && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;

/** Printed73-77: pressure, attacked boundary, alternating buildup, signal/entry
 * distinction. Thresholds below define this local closed-bar proxy only. */
export function observePatternBreak(bars: readonly M5PriceBar[]): Result {
  if (bars.length < 9) return { detected: false, reason: "INSUFFICIENT_PATTERN_BREAK_CONTEXT" };
  let failure = { rank: 0, reason: "NO_ALIGNED_PATTERN_PRESSURE" };
  const fail = (rank: number, reason: string) => { if (rank > failure.rank) failure = { rank, reason }; };
  const end = bars.length - 1;
  for (const count of [6, 5, 4]) {
    const begin = end - count;
    if (begin < 4) continue;
    const window = bars.slice(begin - 4, end + 1);
    if (window.some(bar => !valid(bar)) || window.some((bar, i) => i > 0 && Date.parse(bar.t) - Date.parse(window[i - 1].t) !== 300_000)) {
      fail(1, "PATTERN_BREAK_REQUIRES_CONSECUTIVE_CLOSED_M5_BARS"); continue;
    }
    const context = bars.slice(begin - 4, begin), buildup = bars.slice(begin, end), signal = buildup[count - 1], entry = bars[end];
    const ranges = context.map(range).sort((a, b) => a - b), baseline = (ranges[1] + ranges[2]) / 2;
    const net = context[3].c - context[0].c;
    const up = net >= .3 * baseline, down = net <= -.3 * baseline;
    if (!up && !down) continue;
    const boundary = up ? Math.max(...context.map(bar => bar.h)) : Math.min(...context.map(bar => bar.l));
    const high = Math.max(...buildup.map(bar => bar.h)), low = Math.min(...buildup.map(bar => bar.l));
    const near = buildup.filter(bar => Math.abs((up ? bar.h : bar.l) - boundary) <= .2 * baseline);
    const colors = buildup.map(bar => Math.sign(bar.c - bar.o));
    const changes = colors.slice(1).filter((color, i) => color !== 0 && colors[i] !== 0 && color !== colors[i]).length;
    const contained = up ? high <= boundary + .1 * baseline && low >= boundary - 1.2 * baseline : low >= boundary - .1 * baseline && high <= boundary + 1.2 * baseline;
    if (!(contained && high - low <= 1.2 * baseline && changes >= 2 && near.length >= 3)) {
      fail(2, "NO_COMPACT_ALTERNATING_BOUNDARY_BUILDUP"); continue;
    }
    const signalReady = up ? signal.c > signal.o && Math.abs(signal.c - boundary) <= .2 * baseline && near.includes(signal) : signal.c < signal.o && Math.abs(signal.c - boundary) <= .2 * baseline && near.includes(signal);
    if (!signalReady) { fail(3, "NO_DIRECTIONAL_SIGNAL_BAR_AT_BOUNDARY"); continue; }
    const level = up ? signal.h : signal.l, protection = up ? low : high;
    const confirms = up ? entry.o <= level && entry.c > Math.max(level, boundary) + .05 * baseline : entry.o >= level && entry.c < Math.min(level, boundary) - .05 * baseline;
    if (!confirms) { fail(4, "PATTERN_BREAK_NOT_CLOSE_CONFIRMED"); continue; }
    if (up ? entry.l <= protection : entry.h >= protection) { fail(5, "AMBIGUOUS_PATTERN_BREAK_CONFIRMATION_BAR"); continue; }
    const score = Number(Math.min(1, .4 * near.length / count + .3 * changes / (count - 1) + .3 * (1 - (high - low) / (1.2 * baseline))).toFixed(4));
    return { detected: true, reason: `${up ? "UP" : "DOWN"}_${count}_BAR_BOUNDARY_BUILDUP_CLOSE_BREAK`, score,
      setup: { kind: "PATTERN_BREAK", version: "pattern-break-close-confirmation/1", direction: up ? "UP" : "DOWN", contextStart: context[0].t, contextEnd: context[3].t, buildupTimes: buildup.map(bar => bar.t), boundaryTouchTimes: near.map(bar => bar.t), signalBarTime: signal.t, confirmationTime: entry.t, breakoutLevel: level, protectionReference: protection, contextBoundary: boundary } };
  }
  return { detected: false, reason: failure.reason };
}
