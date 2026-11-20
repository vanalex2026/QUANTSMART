import type { M5PriceBar } from "./priceActionDetector.ts";

export type ConfirmedContextSwing = { time: string; price: number; confirmedAt: string };
type ContextBand = { low: number; high: number; touches: ConfirmedContextSwing[] };
export type PatternMarketContext = {
  version: "pattern-market-context/1";
  time: string;
  direction: "UP" | "DOWN" | "NEUTRAL";
  state: "WITHHELD" | "MEASURED";
  reason: string;
  contextStart: string | null;
  contextEnd: string | null;
  bars: number;
  truncatedByGap: boolean;
  baseline: number | null;
  entry: number | null;
  swingProgression: "HIGHER_HIGHS_AND_LOWS" | "LOWER_HIGHS_AND_LOWS" | "MIXED" | "INSUFFICIENT_SWINGS";
  highs: ConfirmedContextSwing[];
  lows: ConfirmedContextSwing[];
  highStepUnits: number | null;
  lowStepUnits: number | null;
  ema25: number | null;
  emaSlope12Units: number | null;
  closeEfficiency: number | null;
  netCloseUnits: number | null;
  repeatedRange: { floor: ContextBand; ceiling: ContextBand; start: string; position: number; widthUnits: number } | null;
  concerns: ("OPPOSING_CONFIRMED_SWINGS" | "UP_NEAR_REPEATED_CEILING" | "DOWN_NEAR_REPEATED_FLOOR")[];
  sourcePages: readonly number[];
  authority: "SHADOW_ONLY / NO_DECISION";
};
const M5_MS = 300_000;
const valid = (bar: M5PriceBar | undefined): bar is M5PriceBar => {
  const instant = bar ? Date.parse(bar.t) : NaN;
  return !!bar && bar.closed !== false && Number.isFinite(instant) && instant % M5_MS === 0
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;
};
type Pivot = ConfirmedContextSwing & { index: number };
const receipt = ({ time, price, confirmedAt }: Pivot): ConfirmedContextSwing => ({ time, price, confirmedAt });

/** Printed9-11,130-131 motivate examining wider pressure and range context.
 * All thresholds are local measurements. This never changes the setup census,
 * assigns entry permission or uses outcomes after the selected close. */
export function patternMarketContext(input: readonly M5PriceBar[], time: string, direction: "UP" | "DOWN" | "NEUTRAL", enabled = true): PatternMarketContext {
  const result: PatternMarketContext = { version: "pattern-market-context/1", time, direction, state: "WITHHELD", reason: "INSUFFICIENT_CLOSED_CONTEXT", contextStart: null, contextEnd: null, bars: 0, truncatedByGap: false, baseline: null, entry: null, swingProgression: "INSUFFICIENT_SWINGS", highs: [], lows: [], highStepUnits: null, lowStepUnits: null, ema25: null, emaSlope12Units: null, closeEfficiency: null, netCloseUnits: null, repeatedRange: null, concerns: [], sourcePages: [9, 10, 11, 130, 131], authority: "SHADOW_ONLY / NO_DECISION" };
  if (!enabled) return { ...result, reason: "UNVERIFIED_CURRENT_EVIDENCE" };
  if (direction === "NEUTRAL") return { ...result, reason: "NEUTRAL_SETUP" };
  const instant = Date.parse(time), end = Number.isFinite(instant) ? input.findIndex(bar => Date.parse(bar.t) === instant) : -1;
  if (end < 0 || !valid(input[end])) return { ...result, reason: "MISSING_OR_INVALID_SETUP_CANDLE" };
  let from = end;
  while (from > Math.max(0, end - 95)) {
    if (!valid(input[from - 1]) || Date.parse(input[from].t) - Date.parse(input[from - 1].t) !== M5_MS) { result.truncatedByGap = true; break; }
    from--;
  }
  const bars = input.slice(from, end + 1), entry = bars[bars.length - 1].c;
  Object.assign(result, { contextStart: bars[0].t, contextEnd: bars[bars.length - 1].t, bars: bars.length, entry });
  if (bars.length < 40) return result;
  const ranges = bars.slice(-14).map(bar => bar.h - bar.l).sort((a, b) => a - b);
  const baseline = (ranges[6] + ranges[7]) / 2, tolerance = .25 * baseline;
  const highs: Pivot[] = [], lows: Pivot[] = [];
  for (let i = 2; i < bars.length - 2; i++) {
    const neighbors = [i - 2, i - 1, i + 1, i + 2];
    if (bars[i].h > bars[i - 2].h && bars[i].h > bars[i - 1].h && neighbors.slice(2).every(j => bars[i].h >= bars[j].h)) highs.push({ index: i, time: bars[i].t, price: bars[i].h, confirmedAt: bars[i + 2].t });
    if (bars[i].l < bars[i - 2].l && bars[i].l < bars[i - 1].l && neighbors.slice(2).every(j => bars[i].l <= bars[j].l)) lows.push({ index: i, time: bars[i].t, price: bars[i].l, confirmedAt: bars[i + 2].t });
  }
  result.highs = highs.slice(-2).map(receipt); result.lows = lows.slice(-2).map(receipt);
  if (highs.length >= 2 && lows.length >= 2) {
    const highStep = highs[highs.length - 1].price - highs[highs.length - 2].price, lowStep = lows[lows.length - 1].price - lows[lows.length - 2].price;
    result.highStepUnits = highStep / baseline; result.lowStepUnits = lowStep / baseline;
    result.swingProgression = highStep > tolerance && lowStep > tolerance ? "HIGHER_HIGHS_AND_LOWS" : highStep < -tolerance && lowStep < -tolerance ? "LOWER_HIGHS_AND_LOWS" : "MIXED";
    if ((direction === "UP" && result.swingProgression === "LOWER_HIGHS_AND_LOWS") || (direction === "DOWN" && result.swingProgression === "HIGHER_HIGHS_AND_LOWS")) result.concerns.push("OPPOSING_CONFIRMED_SWINGS");
  }
  const emas: number[] = [];
  let ema = bars.slice(0, 25).reduce((sum, bar) => sum + bar.c, 0) / 25;
  emas[24] = ema;
  for (let i = 25; i < bars.length; i++) { ema += (bars[i].c - ema) * (2 / 26); emas[i] = ema; }
  const net = entry - bars[0].c, path = bars.slice(1).reduce((sum, bar, i) => sum + Math.abs(bar.c - bars[i].c), 0);
  Object.assign(result, { state: "MEASURED", reason: "CAUSAL_SWINGS_AND_REPEATED_RANGE_CONTEXT", baseline, ema25: ema, emaSlope12Units: (ema - emas[bars.length - 13]) / baseline, closeEfficiency: path ? Math.abs(net) / path : 0, netCloseUnits: net / baseline });
  const groups = (pivots: Pivot[]) => {
    const bands: Pivot[][] = [];
    for (const pivot of [...pivots].sort((a, b) => a.price - b.price)) {
      const last = bands[bands.length - 1];
      if (last && pivot.price - last[0].price <= tolerance) last.push(pivot);
      else bands.push([pivot]);
    }
    return bands.filter(band => band.length >= 2 && Math.max(...band.map(p => p.index)) - Math.min(...band.map(p => p.index)) >= 8);
  };
  // Repeated boundaries must have contained every close since their first
  // observation; the widest surviving pair is deterministic. Absence is unknown.
  for (const floor of groups(lows)) for (const ceiling of groups(highs)) {
    const low = floor[0].price, high = ceiling[ceiling.length - 1].price, width = high - low;
    const first = Math.min(...[...floor, ...ceiling].map(pivot => pivot.index));
    if (width < 4 * baseline || floor[floor.length - 1].price >= ceiling[0].price || bars.length - 1 - first < 24 || entry < low || entry > high) continue;
    if (bars.slice(first).some(bar => bar.c < low - tolerance || bar.c > high + tolerance)) continue;
    const touches = [...floor.map(p => ({ index: p.index, side: "floor" })), ...ceiling.map(p => ({ index: p.index, side: "ceiling" }))].sort((a, b) => a.index - b.index);
    if (touches.some((touch, i) => i > 0 && touch.index === touches[i - 1].index)) continue;
    const turns = touches.reduce((count, touch, i) => count + (i === 0 || touch.side !== touches[i - 1].side ? 1 : 0), 0);
    if (turns < 4) continue;
    if (result.repeatedRange && width <= result.repeatedRange.widthUnits * baseline) continue;
    const band = (points: Pivot[]): ContextBand => ({ low: points[0].price, high: points[points.length - 1].price, touches: [...points].sort((a, b) => a.index - b.index).map(receipt) });
    result.repeatedRange = { floor: band(floor), ceiling: band(ceiling), start: bars[first].t, position: (entry - low) / width, widthUnits: width / baseline };
  }
  if (result.repeatedRange) {
    if (direction === "UP" && result.repeatedRange.position >= .75) result.concerns.push("UP_NEAR_REPEATED_CEILING");
    if (direction === "DOWN" && result.repeatedRange.position <= .25) result.concerns.push("DOWN_NEAR_REPEATED_FLOOR");
  }
  return result;
}
