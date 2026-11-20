import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import { candleWindowGeometry } from "./candleWindowGeometry.ts";
import { finiteMinMax } from "./finiteMinMax.ts";
import { BARRIER_HORIZON, patternBarrierOutcome } from "./patternBarrierOutcomes.ts";
import type { PriceActionSetup } from "./priceActionSetup.ts";
import { patternRoomContext } from "./patternRoomContext.ts";
import { patternPullbackPressure } from "./patternPullbackPressure.ts";
import { patternMarketContext } from "./patternMarketContext.ts";
import { TECHNICAL_OBSTACLE_HORIZON, patternTechnicalObstacleOutcome, type TechnicalObstacleResult } from "./patternTechnicalObstacleOutcomes.ts";

export type PatternInspectionMode = "setup" | "outcome" | "context";
type InspectionBar = OhlcBar & { closed?: boolean };
const M5_MS = 300_000;
const barTime = (bar: InspectionBar | undefined): string | null => {
  try {
    const value = bar?.t;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
};
const unavailableBar = (bar: InspectionBar | undefined): InspectionBar => ({
  i: 0, r: "N", t: barTime(bar) ?? "", o: NaN, h: NaN, l: NaN, c: NaN, closed: false,
});
// Date.parse alone normalizes impossible dates and accepts local-time aliases.
// Both supported UTC spellings must round-trip to the same real M5 candle.
const utcM5 = (value: unknown): number | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return null;
  const instant = Date.parse(value);
  const canonical = value.endsWith(".000Z") ? value : value.replace("Z", ".000Z");
  return Number.isFinite(instant) && instant % M5_MS === 0 && new Date(instant).toISOString() === canonical ? instant : null;
};
const closedIdentity = (bar: InspectionBar | undefined, nowMs: number): boolean => {
  try {
    const instant = utcM5(barTime(bar));
    return !!bar && (bar.closed === undefined || bar.closed === true) && instant != null && instant + M5_MS <= nowMs;
  } catch {
    return false;
  }
};
const usable = (bar: InspectionBar | undefined, nowMs: number): bar is InspectionBar => {
  try {
    return !!bar && closedIdentity(bar, nowMs)
      && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
      && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c);
  } catch {
    return false;
  }
};
const consecutive = (a: InspectionBar, b: InspectionBar) => {
  const previous = utcM5(barTime(a)), next = utcM5(barTime(b));
  return previous != null && next != null && next - previous === M5_MS;
};

/** Timestamp identity wins over chart ordinals after retention shifts. */
export function patternInspectionWindow(bars: InspectionBar[], time: string, reads: string, allowGeometry: boolean, requestedMode: PatternInspectionMode = "setup", setup?: PriceActionSetup, nowMs = Date.now()) {
  const instant = utcM5(time);
  if (instant == null || !Number.isFinite(nowMs)) return null;
  const canonicalTime = new Date(instant).toISOString(), secondsTime = canonicalTime.replace(".000Z", "Z");
  // Search the retained tape for this identity without parsing every calendar
  // date. A second spelling/row is ambiguous even outside the visible prefix.
  let index = -1;
  for (let i = 0; i < bars.length; i++) {
    const timestamp = barTime(bars[i]);
    if (timestamp !== canonicalTime && timestamp !== secondsTime) continue;
    if (index >= 0) return null;
    index = i;
  }
  if (index < 0) return null;
  const anchor = bars[index];
  if (!usable(anchor, nowMs)) return null;
  // Keep validation bounded to evidence these selected studies can consume.
  // Mark invalid identities/closed flags as unavailable for the existing
  // helpers; preserve OHLC validation and all aggregate receipt semantics.
  const causalFrom = Math.max(0, index - 95), localIndex = index - causalFrom;
  // Setup geometry is causal by timestamp, not by array ordinal. A malformed
  // retained tape can place a later closed candle before the selected row (or
  // duplicate an identity), which would otherwise let its OHLC values enter
  // the prefix ATR calculation. Reject that bounded prefix rather than
  // silently reordering or dropping evidence.
  let previousCausalInstant: number | null = null;
  let causalPrefixValid = true;
  for (let i = causalFrom; i <= index; i++) {
    const causalInstant = utcM5(barTime(bars[i]));
    if (causalInstant == null || causalInstant > instant || (previousCausalInstant != null && causalInstant <= previousCausalInstant)) causalPrefixValid = false;
    if (causalInstant != null) previousCausalInstant = causalInstant;
  }
  const evidence = Array.from(bars.slice(causalFrom, index + Math.max(BARRIER_HORIZON, TECHNICAL_OBSTACLE_HORIZON) + 1), (bar, offset): InspectionBar => causalPrefixValid && offset <= localIndex && closedIdentity(bar, nowMs)
      ? bar
      : offset <= localIndex
        ? unavailableBar(bar)
        : closedIdentity(bar, nowMs)
          ? bar
          : unavailableBar(bar));
  const direction = reads === "bullish" ? "UP" : reads === "bearish" ? "DOWN" : "NEUTRAL";
  const localStudy = allowGeometry ? patternBarrierOutcome(evidence, localIndex, direction) : null;
  const study = localStudy ? { ...localStudy, exitIndex: localStudy.exitIndex == null ? null : localStudy.exitIndex + causalFrom } : null;
  const directionalStudy = study && study.state !== "INVALID_SETUP" && study.state !== "NEUTRAL" ? study : null;
  const geometry = candleWindowGeometry(evidence, { i: localIndex, price: anchor.c, direction: directionalStudy ? direction : "NEUTRAL" });
  const sameSetup = setup && utcM5(setup.confirmationTime) === instant;
  // Technical protection and nearest-obstacle levels are receipt fields at the
  // confirmation close.  Never infer them for a differently anchored candle
  // or when current geometry is withheld.
  const localTechnicalStudy = allowGeometry && sameSetup
    ? patternTechnicalObstacleOutcome(evidence, localIndex, direction, setup)
    : null;
  const technicalStudy: TechnicalObstacleResult | null = localTechnicalStudy
    ? { ...localTechnicalStudy, exitIndex: localTechnicalStudy.exitIndex == null ? null : localTechnicalStudy.exitIndex + causalFrom }
    : null;
  // Room and market context are causal-prefix studies. Limit their input to
  // the same 96 closed bars used by the source context rules so opening an
  // inspector never scans the full retained tape.
  const causalPrefix = evidence.slice(0, localIndex + 1);
  const room = patternRoomContext(causalPrefix, time, direction, sameSetup ? setup.protectionReference : undefined, allowGeometry);
  const marketContext = patternMarketContext(causalPrefix, time, direction, allowGeometry);
  const pullbackPressure = setup?.kind === "PATTERN_BREAK_PULLBACK" ? patternPullbackPressure(causalPrefix, time, sameSetup ? setup : undefined, allowGeometry) : null;
  const mode = requestedMode === "context" && room.state !== "WITHHELD" ? "context" : requestedMode === "outcome" && directionalStudy ? "outcome" : "setup";
  // Include the whole detector context, within its bounded prefix. Never cross a
  // missing/invalid candle merely because a structural receipt requests it.
  const contextTime = sameSetup ? utcM5(setup.contextStart) ?? NaN : NaN;
  let first = Math.max(0, index - 8);
  const maxContext = setup?.kind === "PULLBACK_REVERSAL" ? 24 : 13;
  while (first > Math.max(0, index - maxContext) && (utcM5(barTime(bars[first])) ?? -Infinity) > contextTime) first--;
  let from = index;
  while (from > first && usable(bars[from - 1], nowMs) && consecutive(bars[from - 1], bars[from])) from--;
  if (mode === "context") from = index - room.bars + 1;
  let to = index;
  if (mode === "outcome") to += Math.max(directionalStudy!.observedBars, technicalStudy?.observedBars ?? 0);
  else if (mode === "setup") while (to < index + 4 && usable(bars[to + 1], nowMs) && consecutive(bars[to], bars[to + 1])) to++;
  // Materialize sparse/malformed display rows as unavailable sentinels so
  // range aggregation and rendering fail closed without reading bad OHLC.
  const rows = Array.from(bars.slice(from, to + 1), (bar) => usable(bar, nowMs) ? bar : unavailableBar(bar));
  const bounds = finiteMinMax((function* () {
    for (const row of rows) { yield row.l; yield row.h; }
    yield geometry.entry;
    if (geometry.target != null) yield geometry.target;
    if (geometry.invalidation != null) yield geometry.invalidation;
    if (sameSetup) {
      if (Number.isFinite(setup.breakoutLevel)) yield setup.breakoutLevel;
      if (Number.isFinite(setup.protectionReference)) yield setup.protectionReference;
      if (setup.kind === "PATTERN_BREAK_PULLBACK") {
        if (Number.isFinite(setup.contextBoundary)) yield setup.contextBoundary;
        if (Number.isFinite(setup.emaAtSignal)) yield setup.emaAtSignal;
      }
      if (setup.kind === "PULLBACK_REVERSAL") {
        yield setup.originPrice; yield setup.peakPrice; yield setup.emaAtSignal;
        if (setup.technicalTest) yield setup.technicalTest.price;
      }
    }
    if (technicalStudy?.protection != null) yield technicalStudy.protection;
    if (technicalStudy?.obstacle != null) yield technicalStudy.obstacle;
  })()) ?? [anchor.c - 1, anchor.c + 1];
  const pad = Math.max((bounds[1] - bounds[0]) * 0.12, 0.01);
  const next = bars[index + 1];
  // A gap is not an observed next M5 bar. Never infer a result across it.
  const outcome = usable(next, nowMs) && consecutive(anchor, next)
    ? next.c > anchor.c ? "UP" : next.c < anchor.c ? "DOWN" : "FLAT"
    : null;
  return { index, anchor, direction, from, to, rows, geometry, outcome, mode, study: directionalStudy, technicalStudy, room, marketContext, pullbackPressure, low: bounds[0] - pad, high: bounds[1] + pad };
}

export type PatternInspectionView = NonNullable<ReturnType<typeof patternInspectionWindow>>;
