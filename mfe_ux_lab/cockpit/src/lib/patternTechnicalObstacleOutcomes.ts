import type { PriceActionOccurrence, M5PriceBar } from "./priceActionDetector.ts";
import type { PriceActionSetup } from "./priceActionSetup.ts";
import { patternRoomContext, type PatternRoomContext } from "./patternRoomContext.ts";

export type TechnicalObstacleOutcome = "OBSTACLE_FIRST" | "PROTECTION_FIRST" | "AMBIGUOUS" | "TIMEOUT" | "INCOMPLETE" | "DATA_GAP" | "INVALID_DATA" | "UNAVAILABLE" | "NEUTRAL" | "INVALID_SETUP";
export const TECHNICAL_OBSTACLE_HORIZON = 24;
export const TECHNICAL_OBSTACLE_SOURCE_PAGES = [13, 51, 107] as const;
export const TECHNICAL_OBSTACLE_OUTCOME_LABELS: Record<TechnicalObstacleOutcome, string> = {
  OBSTACLE_FIRST: "Confirmed obstacle touched first",
  PROTECTION_FIRST: "Technical protection touched first",
  AMBIGUOUS: "Obstacle and protection touched in one candle; order unknown",
  TIMEOUT: "Neither technical level touched within 24 bars",
  INCOMPLETE: "Waiting for more closed M5 bars",
  DATA_GAP: "Unobserved path across an M5 data gap",
  INVALID_DATA: "Invalid OHLC in the observed path",
  UNAVAILABLE: "Technical protection or confirmed obstacle unavailable",
  NEUTRAL: "Neutral setup; no directional levels",
  INVALID_SETUP: "Incomplete or invalid setup geometry",
};
export const TECHNICAL_SETUP_KINDS = ["PATTERN_BREAK_COMBI", "PATTERN_BREAK", "PATTERN_BREAK_PULLBACK", "PULLBACK_REVERSAL"] as const;
export type TechnicalSetupKind = typeof TECHNICAL_SETUP_KINDS[number];
export interface TechnicalObstacleResult {
  state: TechnicalObstacleOutcome;
  direction: "UP" | "DOWN" | "NEUTRAL";
  horizon: number;
  observedBars: number;
  exitIndex: number | null;
  resolvedAt: string | null;
  protection: number | null;
  obstacle: number | null;
  obstacleDistance: number | null;
  roomState: PatternRoomContext["state"] | null;
  setupKind: TechnicalSetupKind | null;
  sourcePages: readonly number[];
  authority: "SHADOW_ONLY / NO_DECISION";
}
export type TechnicalObstacleCounts = Record<TechnicalObstacleOutcome, number>;
export interface TechnicalObstacleFamilySummary {
  kind: TechnicalSetupKind;
  counts: TechnicalObstacleCounts;
  total: number;
  resolved: number;
  excluded: number;
  obstacleFirstRate: number | null;
}
export interface TechnicalObstacleSummary {
  counts: TechnicalObstacleCounts;
  total: number;
  resolved: number;
  excluded: number;
  obstacleFirstRate: number | null;
  horizon: number;
  families: Record<TechnicalSetupKind, TechnicalObstacleFamilySummary>;
}

const M5_MS = 300_000;
const valid = (bar: M5PriceBar | undefined): bar is M5PriceBar => {
  const instant = bar ? Date.parse(bar.t) : NaN;
  return !!bar && bar.closed !== false && Number.isFinite(instant) && instant % M5_MS === 0
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;
};
const isKind = (setup: PriceActionSetup | undefined): setup is PriceActionSetup & { kind: TechnicalSetupKind } => !!setup && (TECHNICAL_SETUP_KINDS as readonly string[]).includes(setup.kind);
const blankCounts = (): TechnicalObstacleCounts => ({ OBSTACLE_FIRST: 0, PROTECTION_FIRST: 0, AMBIGUOUS: 0, TIMEOUT: 0, INCOMPLETE: 0, DATA_GAP: 0, INVALID_DATA: 0, UNAVAILABLE: 0, NEUTRAL: 0, INVALID_SETUP: 0 });
const baseResult = (state: TechnicalObstacleOutcome, direction: "UP" | "DOWN" | "NEUTRAL", horizon: number, setupKind: TechnicalSetupKind | null, extra: Partial<TechnicalObstacleResult> = {}): TechnicalObstacleResult => ({ state, direction, horizon, observedBars: 0, exitIndex: null, resolvedAt: null, protection: null, obstacle: null, obstacleDistance: null, roomState: null, setupKind, sourcePages: TECHNICAL_OBSTACLE_SOURCE_PAGES, authority: "SHADOW_ONLY / NO_DECISION", ...extra });

/**
 * Measure the source-structure levels recorded at a setup confirmation close.
 * The nearest confirmed swing zone is the adverse obstacle; the setup receipt's
 * protectionReference is the opposing technical level. This is descriptive,
 * read-only evidence and never a qualification or execution rule.
 */
export function patternTechnicalObstacleOutcome(bars: readonly M5PriceBar[], index: number, direction: string, setup?: PriceActionSetup, horizon = TECHNICAL_OBSTACLE_HORIZON): TechnicalObstacleResult {
  const kind = isKind(setup) ? setup.kind : null;
  const dir = direction === "UP" || direction === "DOWN" ? direction : "NEUTRAL";
  if (dir === "NEUTRAL") return baseResult("NEUTRAL", dir, horizon, kind);
  if (!Number.isInteger(index) || index < 0 || index >= bars.length || !Number.isInteger(horizon) || horizon < 1 || horizon > 288 || !valid(bars[index])) return baseResult("INVALID_SETUP", dir, horizon, kind);
  if (!isKind(setup)) return baseResult("UNAVAILABLE", dir, horizon, kind);
  if (setup.direction !== dir) return baseResult("UNAVAILABLE", dir, horizon, kind);
  // A setup receipt is causal only for the confirmation candle that produced
  // it.  Reject stale or malformed receipts before using their saved
  // protection reference; otherwise a retention shift could price one bar
  // with another bar's technical level and inflate the resolved denominator.
  if (!Number.isFinite(Date.parse(setup.confirmationTime)) || Date.parse(setup.confirmationTime) !== Date.parse(bars[index].t)) {
    return baseResult("INVALID_SETUP", dir, horizon, kind);
  }
  const entry = bars[index].c, protection = setup.protectionReference;
  if (!Number.isFinite(protection) || (dir === "UP" ? protection >= entry : protection <= entry)) return baseResult("UNAVAILABLE", dir, horizon, kind);
  // Room context only needs the causal prefix ending at confirmation. Passing
  // the bounded prefix keeps selected inspection and historical summaries from
  // repeatedly scanning the full retained tape (which may span years).
  const causalFrom = Math.max(0, index - 95);
  const causalBars = bars.slice(causalFrom, index + 1);
  // Room lookup resolves by timestamp. An earlier duplicate confirmation in
  // this prefix would select a different candle than the outcome scan's
  // ordinal, potentially borrowing its obstacle from an unrelated segment.
  const confirmationInstant = Date.parse(bars[index].t);
  if (causalBars.slice(0, -1).some(bar => Date.parse(bar.t) === confirmationInstant)) {
    return baseResult("INVALID_SETUP", dir, horizon, kind);
  }
  const room = patternRoomContext(causalBars, bars[index].t, dir, protection, true);
  const nearest = room.structuralLevels[0];
  if (room.state === "WITHHELD" || !nearest) return baseResult("UNAVAILABLE", dir, horizon, kind, { protection, roomState: room.state, obstacleDistance: nearest?.distance ?? null });
  const obstacle = nearest.level;
  if (!Number.isFinite(obstacle) || (dir === "UP" ? obstacle <= entry : obstacle >= entry)) return baseResult("UNAVAILABLE", dir, horizon, kind, { protection, roomState: room.state, obstacle, obstacleDistance: nearest.distance });
  const result = (state: TechnicalObstacleOutcome, observedBars: number, exitIndex: number | null = null) => baseResult(state, dir, horizon, kind, { observedBars, exitIndex, resolvedAt: exitIndex == null ? null : bars[exitIndex].t, protection, obstacle, obstacleDistance: nearest.distance, roomState: room.state });
  for (let step = 1; step <= horizon; step++) {
    const i = index + step, bar = bars[i];
    if (!bar || bar.closed === false) return result("INCOMPLETE", step - 1);
    if (!valid(bar)) return result("INVALID_DATA", step - 1);
    if (Date.parse(bar.t) - Date.parse(bars[i - 1].t) !== M5_MS) return result("DATA_GAP", step - 1);
    const up = dir === "UP";
    const openObstacle = up ? bar.o >= obstacle : bar.o <= obstacle;
    const openProtection = up ? bar.o <= protection : bar.o >= protection;
    if (openObstacle && !openProtection) return result("OBSTACLE_FIRST", step, i);
    if (openProtection && !openObstacle) return result("PROTECTION_FIRST", step, i);
    const obstacleHit = up ? bar.h >= obstacle : bar.l <= obstacle;
    const protectionHit = up ? bar.l <= protection : bar.h >= protection;
    if (obstacleHit && protectionHit) return result("AMBIGUOUS", step, i);
    if (obstacleHit) return result("OBSTACLE_FIRST", step, i);
    if (protectionHit) return result("PROTECTION_FIRST", step, i);
  }
  return result("TIMEOUT", horizon);
}

/** Alias with the longer name used by read-only evidence consumers. */
export const patternTechnicalProtectionOutcome = patternTechnicalObstacleOutcome;
export const technicalProtectionOutcome = patternTechnicalObstacleOutcome;

const familySummary = (kind: TechnicalSetupKind): TechnicalObstacleFamilySummary => ({ kind, counts: blankCounts(), total: 0, resolved: 0, excluded: 0, obstacleFirstRate: null });

/**
 * Aggregate scans must not ask `patternRoomContext` to search the entire
 * two-year tape for every occurrence. Keep the selected confirmation bar and
 * its next horizon while limiting causal context to the same 96-bar room
 * contract used by the detector. Timestamp identity is checked before slicing
 * so a stale ordinal cannot silently study another candle.
 */
function boundedOccurrenceTape(bars: readonly M5PriceBar[], row: PriceActionOccurrence, horizon: number): { bars: M5PriceBar[]; index: number } | null {
  if (!Number.isInteger(row.i) || row.i < 0 || row.i >= bars.length) return null;
  if (Date.parse(bars[row.i].t) !== Date.parse(row.time)) return null;
  const from = Math.max(0, row.i - 95);
  const to = Math.min(bars.length, row.i + horizon + 1);
  return { bars: bars.slice(from, to), index: row.i - from };
}

/** Every supplied occurrence is classified; only known first touches enter the rate denominator. */
export function measurePatternTechnicalObstacleOutcomes(bars: readonly M5PriceBar[], history: readonly PriceActionOccurrence[], horizon = TECHNICAL_OBSTACLE_HORIZON): TechnicalObstacleSummary {
  const counts = blankCounts();
  const families = Object.fromEntries(TECHNICAL_SETUP_KINDS.map(kind => [kind, familySummary(kind)])) as Record<TechnicalSetupKind, TechnicalObstacleFamilySummary>;
  for (const row of history) {
    const setup = row.setup;
    const bounded = boundedOccurrenceTape(bars, row, horizon);
    const result = bounded
      ? patternTechnicalObstacleOutcome(bounded.bars, bounded.index, row.direction, setup, horizon)
      : baseResult("INVALID_SETUP", row.direction === "UP" || row.direction === "DOWN" ? row.direction : "NEUTRAL", horizon, isKind(setup) ? setup.kind : null);
    counts[result.state]++;
    const family = isKind(setup) ? families[setup.kind] : null;
    if (family) family.counts[result.state]++;
  }
  const finalize = (bucket: TechnicalObstacleCounts, total: number, kind: TechnicalSetupKind | null): TechnicalObstacleFamilySummary => {
    const resolved = bucket.OBSTACLE_FIRST + bucket.PROTECTION_FIRST;
    return { kind: kind ?? "PATTERN_BREAK", counts: bucket, total, resolved, excluded: total - resolved, obstacleFirstRate: resolved ? bucket.OBSTACLE_FIRST / resolved : null };
  };
  for (const kind of TECHNICAL_SETUP_KINDS) Object.assign(families[kind], finalize(families[kind].counts, Object.values(families[kind].counts).reduce((a, b) => a + b, 0), kind));
  const total = history.length, resolved = counts.OBSTACLE_FIRST + counts.PROTECTION_FIRST;
  return { counts, total, resolved, excluded: total - resolved, obstacleFirstRate: resolved ? counts.OBSTACLE_FIRST / resolved : null, horizon, families };
}
export const measurePatternTechnicalProtectionOutcomes = measurePatternTechnicalObstacleOutcomes;
export const measureTechnicalProtectionOutcomes = measurePatternTechnicalObstacleOutcomes;





