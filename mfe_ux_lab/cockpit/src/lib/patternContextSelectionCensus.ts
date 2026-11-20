import type { M5PriceBar, PriceActionOccurrence } from "./priceActionDetector.ts";
import { patternMarketContext } from "./patternMarketContext.ts";
import { patternSetupSelection, type PatternSetupSelection } from "./patternSetupSelection.ts";

export type PatternContextSelectionBucket = PatternSetupSelection["lens"];
export type PatternContextSelectionRow = {
  occurrenceTime: string;
  direction: "UP" | "DOWN" | "NEUTRAL";
  score: number | null;
  nextBar: "UP" | "DOWN" | "FLAT" | null;
  selection: PatternSetupSelection;
  reason: string | null;
};
export type PatternContextSelectionBucketStats = {
  occurrences: number;
  outcomes: { up: number; down: number; flat: number };
  wins: number;
  denominator: number;
  hitRate: number | null;
  interval95: { lower: number; upper: number } | null;
};
export type PatternContextSelectionCensus = {
  version: "pattern-context-selection-census/1";
  state: "MEASURED" | "WITHHELD";
  reason: string;
  conceptId: string;
  totalOccurrences: number;
  measuredOccurrences: number;
  evaluatedOccurrences: number;
  skippedOccurrences: number;
  unavailableOccurrences: number;
  buckets: Record<PatternContextSelectionBucket, PatternContextSelectionBucketStats>;
  rows: readonly PatternContextSelectionRow[];
  authority: "SHADOW_ONLY / NO_DECISION";
  live_apply_allowed: false;
};

const BUCKETS: readonly PatternContextSelectionBucket[] = ["ALIGNED_STRONG_REVIEW", "ALIGNED_REVIEW", "COUNTER_DOMINANCE_REVIEW", "RANGE_EDGE_REVIEW", "PRESSURE_CONFLICT_REVIEW", "MIXED_CONTEXT_REVIEW", "UNAVAILABLE"];
const emptyBucket = (): PatternContextSelectionBucketStats => ({ occurrences: 0, outcomes: { up: 0, down: 0, flat: 0 }, wins: 0, denominator: 0, hitRate: null, interval95: null });
const emptyBuckets = (): PatternContextSelectionCensus["buckets"] => Object.fromEntries(BUCKETS.map(bucket => [bucket, emptyBucket()])) as PatternContextSelectionCensus["buckets"];
const M5 = 300_000;
const utcM5 = (value: unknown): number | null => {
  // Match the focused closed-bar identity contract: broker tapes may omit
  // the redundant millisecond field, but both forms represent the same
  // canonical UTC instant and are normalized to .000Z on output.
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return null;
  const instant = Date.parse(value);
  const canonical = Number.isFinite(instant) ? new Date(instant).toISOString() : "";
  return Number.isFinite(instant) && instant % M5 === 0 && canonical === (value.endsWith(".000Z") ? value : value.replace("Z", ".000Z")) ? instant : null;
};
const validOhlc = (bar: M5PriceBar | undefined): boolean => !!bar && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite) && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;
const expectedKind = (conceptId: string): string | null => ({ pattern_break: "PATTERN_BREAK", pattern_break_combi: "PATTERN_BREAK_COMBI", pattern_break_pullback: "PATTERN_BREAK_PULLBACK", pullback_reversal: "PULLBACK_REVERSAL" } as Record<string, string>)[conceptId] ?? null;
const interval95 = (wins: number, denominator: number): { lower: number; upper: number } | null => {
  if (!denominator) return null;
  const p = wins / denominator, z = 1.96, d = 1 + z * z / denominator;
  const centre = (p + z * z / (2 * denominator)) / d;
  const spread = z * Math.sqrt((p * (1 - p) + z * z / (4 * denominator)) / denominator) / d;
  return { lower: Math.max(0, centre - spread), upper: Math.min(1, centre + spread) };
};
const unavailableSelection = (reason: string, score: number | null): PatternSetupSelection => ({ ...patternSetupSelection(undefined, score, undefined, true), reason });

/** Descriptive census: one identity index; at most 96 causal bars and H+1 OHLC per occurrence. */
export function patternContextSelectionCensus(bars: readonly M5PriceBar[], occurrences: readonly PriceActionOccurrence[], conceptId: string, enabled = true, nowMs = Date.now()): PatternContextSelectionCensus {
  const totalOccurrences = Array.isArray(occurrences) ? occurrences.length : 0;
  const base = (extra: Partial<PatternContextSelectionCensus> = {}): PatternContextSelectionCensus => ({ version: "pattern-context-selection-census/1", state: "WITHHELD", reason: "CONTEXT_SELECTION_CENSUS_WITHHELD", conceptId, totalOccurrences, measuredOccurrences: 0, evaluatedOccurrences: 0, skippedOccurrences: totalOccurrences, unavailableOccurrences: totalOccurrences, buckets: { ...emptyBuckets(), UNAVAILABLE: { ...emptyBucket(), occurrences: totalOccurrences } }, rows: [], authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false, ...extra });
  if (!enabled) return base({ reason: "UNVERIFIED_CURRENT_EVIDENCE" });
  if (!Array.isArray(bars) || !bars.length || !Array.isArray(occurrences) || !occurrences.length) return base({ reason: "EMPTY_RETAINED_OCCURRENCES" });
  if (!Number.isFinite(nowMs) || nowMs < 0) return base({ reason: "INVALID_CLOCK" });

  // Full-tape identity checks deliberately do not inspect future OHLC.
  const index = new Map<number, number>(); let previous = -Infinity;
  for (let i = 0; i < bars.length; i++) {
    const instant = utcM5(bars[i]?.t);
    if (instant == null || instant + M5 > nowMs || instant <= previous || bars[i]?.closed === false) return base({ reason: "INVALID_TAPE_IDENTITY" });
    previous = instant; index.set(instant, i);
  }
  previous = -Infinity; const occurrenceInstants: number[] = [];
  for (const occurrence of occurrences) {
    const instant = utcM5(occurrence?.time);
    if (instant == null || instant + M5 > nowMs || instant <= previous) return base({ reason: "INVALID_OCCURRENCE_IDENTITY" });
    previous = instant; occurrenceInstants.push(instant);
  }
  const rows: PatternContextSelectionRow[] = [], buckets = emptyBuckets();
  let measuredOccurrences = 0, unavailableOccurrences = 0;
  const pushUnavailable = (occurrence: PriceActionOccurrence, instant: number, reason: string, nextBar: PatternContextSelectionRow["nextBar"] = null) => {
    const score = typeof occurrence.score === "number" && Number.isFinite(occurrence.score) && occurrence.score >= 0 && occurrence.score <= 1 ? occurrence.score : null;
    const direction = occurrence.direction === "UP" || occurrence.direction === "DOWN" ? occurrence.direction : "NEUTRAL";
    rows.push({ occurrenceTime: new Date(instant).toISOString(), direction, score, nextBar, selection: unavailableSelection(reason, score), reason });
    unavailableOccurrences++; buckets.UNAVAILABLE.occurrences++;
  };
  for (let oi = 0; oi < occurrences.length; oi++) {
    const occurrence = occurrences[oi], instant = occurrenceInstants[oi];
    if (occurrence.direction !== "UP" && occurrence.direction !== "DOWN") { pushUnavailable(occurrence, instant, "NEUTRAL_OR_INVALID_DIRECTION"); continue; }
    const currentIndex = index.get(instant);
    if (currentIndex == null || !validOhlc(bars[currentIndex])) { pushUnavailable(occurrence, instant, "MISSING_OR_INVALID_SETUP_CANDLE"); continue; }
    const next = bars[currentIndex + 1];
    if (!next || utcM5(next.t) !== instant + M5 || !validOhlc(next)) { pushUnavailable(occurrence, instant, "MISSING_OR_INVALID_H1_CANDLE"); continue; }
    const nextDirection = next.c > bars[currentIndex].c ? "UP" : next.c < bars[currentIndex].c ? "DOWN" : "FLAT";
    if (occurrence.nextBar !== nextDirection) { pushUnavailable(occurrence, instant, "MISMATCHED_NEXT_BAR_IDENTITY", nextDirection); continue; }
    const setup = occurrence.setup;
    const score = typeof occurrence.score === "number" && Number.isFinite(occurrence.score) && occurrence.score >= 0 && occurrence.score <= 1 ? occurrence.score : null;
    if (!setup) { pushUnavailable(occurrence, instant, "MISSING_SETUP_RECEIPT", nextDirection); continue; }
    const kind = expectedKind(conceptId);
    if (!kind || setup.kind !== kind || utcM5(setup.confirmationTime) !== instant || setup.direction !== occurrence.direction) { pushUnavailable(occurrence, instant, "MISMATCHED_SETUP_IDENTITY", nextDirection); continue; }
    if (score == null) { pushUnavailable(occurrence, instant, "MISSING_DETECTOR_SCORE", nextDirection); continue; }
    const from = Math.max(0, currentIndex - 95), prefix = bars.slice(from, currentIndex + 1);
    let contiguous = true;
    for (let i = 1; i < prefix.length; i++) if (utcM5(prefix[i].t)! - utcM5(prefix[i - 1].t)! !== M5) { contiguous = false; break; }
    if (!contiguous || prefix.some(bar => !validOhlc(bar))) { pushUnavailable(occurrence, instant, "MISSING_OR_INVALID_CONTEXT", nextDirection); continue; }
    const selection = patternSetupSelection(setup, score, patternMarketContext(prefix, occurrence.time, occurrence.direction, true), true);
    rows.push({ occurrenceTime: new Date(instant).toISOString(), direction: occurrence.direction, score, nextBar: nextDirection, selection, reason: selection.state === "MEASURED" ? null : selection.reason });
    const bucket = buckets[selection.lens]; bucket.occurrences++;
    if (selection.state !== "MEASURED") { unavailableOccurrences++; continue; }
    measuredOccurrences++;
    if (nextDirection === "UP") bucket.outcomes.up++; else if (nextDirection === "DOWN") bucket.outcomes.down++; else bucket.outcomes.flat++;
    bucket.denominator++;
    if (nextDirection === occurrence.direction) bucket.wins++;
  }
  for (const bucket of Object.values(buckets)) { bucket.hitRate = bucket.denominator ? bucket.wins / bucket.denominator : null; bucket.interval95 = interval95(bucket.wins, bucket.denominator); }
  return base({ state: "MEASURED", reason: "CAUSAL_CONTEXT_SELECTION_CENSUS", measuredOccurrences, evaluatedOccurrences: rows.length, skippedOccurrences: unavailableOccurrences, unavailableOccurrences, buckets, rows });
}
