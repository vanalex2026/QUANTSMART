import type { M5PriceBar } from "./priceActionDetector.ts";

/** A deliberately narrow, causal OHLC proxy, not all of Volman's combi variants.
 * Source printed108-110 describes context + powerbar + inside-bar timing. The
 * numerical thresholds and close confirmation below are this app's study rule. */
export type PatternBreakCombiSetup = {
  kind: "PATTERN_BREAK_COMBI";
  version: "combi-close-confirmation/1";
  direction: "UP" | "DOWN";
  contextStart: string;
  contextEnd: string;
  powerbarTime: string;
  insideBarTimes: string[];
  confirmationTime: string;
  breakoutLevel: number;
  protectionReference: number;
  contextBoundary: number;
};
type Result = { detected: false; reason: string } | { detected: true; reason: string; score: number; setup: PatternBreakCombiSetup };
const range = (bar: M5PriceBar) => bar.h - bar.l;
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return (sorted[2] + sorted[3]) / 2; };
const valid = (bar: M5PriceBar) => bar && bar.closed !== false && Number.isFinite(Date.parse(bar.t)) && Date.parse(bar.t) % 300_000 === 0 && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite) && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;

export function observePatternBreakCombi(bars: readonly M5PriceBar[]): Result {
  const end = bars.length - 1;
  if (bars.length < 9) return { detected: false, reason: "INSUFFICIENT_COMBI_CONTEXT" };
  let failure = { rank: 0, reason: "NO_DIRECTIONAL_POWERBAR" };
  const fail = (rank: number, reason: string) => { if (rank > failure.rank) failure = { rank, reason }; };
  // Prefer the longer nested variant. A second bar must stay inside the first,
  // preventing an earlier directional break from being labelled again later.
  for (const insideCount of [2, 1]) {
    const powerIndex = end - insideCount - 1;
    if (powerIndex < 6) continue;
    const window = bars.slice(powerIndex - 6, end + 1);
    if (window.some(bar => !valid(bar)) || window.some((bar, i) => i > 0 && Date.parse(bar.t) - Date.parse(window[i - 1].t) !== 300_000)) {
      fail(1, "COMBI_REQUIRES_CONSECUTIVE_CLOSED_M5_BARS"); continue;
    }
    const context = bars.slice(powerIndex - 6, powerIndex), power = bars[powerIndex], entry = bars[end];
    const base = median(context.map(range)), powerRange = range(power), body = Math.abs(power.c - power.o);
    const up = power.c > power.o, down = power.c < power.o;
    if (!(base > 0 && powerRange >= 1.25 * base && body >= .6 * powerRange && (up ? power.c >= power.l + .75 * powerRange : down && power.c <= power.l + .25 * powerRange))) continue;
    const boundary = up ? Math.max(...context.map(bar => bar.h)) : Math.min(...context.map(bar => bar.l));
    const net = context[5].c - context[0].c;
    const breaksContext = up ? power.c > boundary + .05 * base && power.o <= boundary + .5 * base && net >= -.25 * base : power.c < boundary - .05 * base && power.o >= boundary - .5 * base && net <= .25 * base;
    if (!breaksContext) { fail(2, "POWERBAR_LACKS_ALIGNED_CONTEXT_BREAK"); continue; }
    const inside = bars.slice(powerIndex + 1, end);
    const fits = inside.every((bar, i) => {
      const parent = i ? inside[i - 1] : power;
      const centre = (bar.h + bar.l) / 2;
      return bar.h <= parent.h && bar.l >= parent.l && range(bar) <= .7 * powerRange && (up ? centre >= power.l + .55 * powerRange : centre <= power.l + .45 * powerRange);
    });
    if (!fits) { fail(3, "NO_DIRECTIONAL_END_INSIDE_BAR_TENSION"); continue; }
    const signal = inside[inside.length - 1], level = up ? signal.h : signal.l;
    const protection = up ? Math.min(...inside.map(bar => bar.l)) : Math.max(...inside.map(bar => bar.h));
    const confirmed = up ? entry.c > level && entry.o <= level : entry.c < level && entry.o >= level;
    if (!confirmed) { fail(4, "INSIDE_BAR_BREAK_NOT_CLOSE_CONFIRMED"); continue; }
    // If the confirmation bar also reaches the opposite inside-bar reference,
    // OHLC cannot establish trigger/invalidation order. Do not invent a fill.
    if (up ? entry.l <= protection : entry.h >= protection) { fail(5, "AMBIGUOUS_COMBI_CONFIRMATION_BAR"); continue; }
    const contraction = 1 - range(signal) / powerRange;
    const score = Number(Math.min(1, .6 * body / powerRange + .4 * contraction).toFixed(4));
    return { detected: true, reason: `${up ? "UP" : "DOWN"}_CONTEXT_POWERBAR_${insideCount}_INSIDE_CLOSE_BREAK`, score,
      setup: { kind: "PATTERN_BREAK_COMBI", version: "combi-close-confirmation/1", direction: up ? "UP" : "DOWN", contextStart: context[0].t, contextEnd: context[5].t, powerbarTime: power.t, insideBarTimes: inside.map(bar => bar.t), confirmationTime: entry.t, breakoutLevel: level, protectionReference: protection, contextBoundary: boundary } };
  }
  return { detected: false, reason: failure.reason };
}
