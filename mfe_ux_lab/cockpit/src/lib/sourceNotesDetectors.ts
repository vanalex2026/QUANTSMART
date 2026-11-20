import type { M5PriceBar } from "./priceActionDetector.ts";
import type { PdfSignalTranslationDescriptor } from "./pdfSignalTranslation.ts";

/**
 * Deterministic observations for three source-note concepts. These helpers
 * deliberately stop at the selected closed M5 candle and do not label a
 * source setup, infer an order, or inspect an outcome.
 */
export const SOURCE_NOTE_DETECTOR_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;
export const SOURCE_NOTE_DETECTOR_VERSION = "source-notes-detectors/1" as const;
export const SOURCE_NOTE_DETECTOR_CONCEPTS = [
  "signal_entry_bar",
  "consecutive_review",
  "position_sizing",
] as const;
export type SourceNoteDetectorConceptId = typeof SOURCE_NOTE_DETECTOR_CONCEPTS[number];

export type SourceNoteDetectorInput = {
  bars: readonly M5PriceBar[];
  selectedTime: string;
  nowMs?: number;
  enabled?: boolean;
};

export type SourceNoteDetectorBundle = {
  version: typeof SOURCE_NOTE_DETECTOR_VERSION;
  symbol: "XAUUSD";
  timeframe: "M5";
  selectedTime: string;
  state: "DESCRIPTIVE" | "UNAVAILABLE" | "WITHHELD";
  reason: string;
  descriptors: Record<SourceNoteDetectorConceptId, PdfSignalTranslationDescriptor>;
  authority: typeof SOURCE_NOTE_DETECTOR_AUTHORITY;
  live_apply_allowed: false;
};

const M5_MS = 300_000;
const MAX_PREFIX_BARS = 96;
const SOURCE_PAGES: Record<SourceNoteDetectorConceptId, readonly number[]> = {
  signal_entry_bar: [73, 74, 75, 80],
  consecutive_review: [133, 245, 246, 247],
  position_sizing: [249, 383, 384, 385],
};

type CausalPrefix = PdfSignalTranslationDescriptor["causalPrefix"];
type PrefixResult = { prefix: readonly M5PriceBar[]; causalPrefix: CausalPrefix };

const instantOf = (value: unknown): number | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const instant = Date.parse(value);
  if (!Number.isFinite(instant) || instant % M5_MS !== 0) return null;
  return instant;
};

const canonical = (instant: number): string => new Date(instant).toISOString();

const validBar = (bar: M5PriceBar | undefined, instant: number, nowMs: number): boolean => {
  return !!bar && instant + M5_MS <= nowMs && bar.closed !== false
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    && bar.h > bar.l && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c);
};

const unavailablePrefix = (state: CausalPrefix["state"] = "UNAVAILABLE"): CausalPrefix => ({
  state,
  start: null,
  end: null,
  bars: 0,
  maxBars: MAX_PREFIX_BARS as 96,
  closedOnly: false,
  futureRows: "WITHHELD",
});

const resolvePrefix = (bars: readonly M5PriceBar[], selectedIndex: number, nowMs: number): PrefixResult | null => {
  const from = Math.max(0, selectedIndex - (MAX_PREFIX_BARS - 1));
  const prefix = bars.slice(from, selectedIndex + 1);
  let start: number | null = null;
  let previous: number | null = null;
  for (const bar of prefix) {
    const instant = instantOf(bar?.t);
    if (instant == null || !validBar(bar, instant, nowMs) || (previous != null && instant - previous !== M5_MS)) return null;
    start ??= instant;
    previous = instant;
  }
  if (start == null || previous == null) return null;
  return {
    prefix,
    causalPrefix: {
      state: "AVAILABLE",
      start: canonical(start),
      end: canonical(previous),
      bars: prefix.length,
      maxBars: MAX_PREFIX_BARS as 96,
      closedOnly: true,
      futureRows: "WITHHELD",
    },
  };
};

const descriptor = (
  conceptId: SourceNoteDetectorConceptId,
  state: PdfSignalTranslationDescriptor["state"],
  reason: string,
  causalPrefix: CausalPrefix,
  geometry: Record<string, number | string | boolean | null> = {},
): PdfSignalTranslationDescriptor => ({
  conceptId,
  state,
  reason,
  sourcePages: SOURCE_PAGES[conceptId],
  sourceStatus: "SOURCE_REVIEW_ONLY",
  dataStatus: state === "DESCRIPTIVE" ? "AVAILABLE" : "UNAVAILABLE",
  outcomeStatus: "WITHHELD",
  outcomeReason: "SOURCE_OUTCOME_NOT_LABELLED",
  causalPrefix,
  geometry,
  authority: SOURCE_NOTE_DETECTOR_AUTHORITY,
  live_apply_allowed: false,
});

const emptyDescriptors = (state: PdfSignalTranslationDescriptor["state"], reason: string): Record<SourceNoteDetectorConceptId, PdfSignalTranslationDescriptor> => {
  const causalPrefix = unavailablePrefix(state === "WITHHELD" ? "WITHHELD" : "UNAVAILABLE");
  return Object.fromEntries(SOURCE_NOTE_DETECTOR_CONCEPTS.map(conceptId => [conceptId, descriptor(conceptId, state, reason, causalPrefix)])) as Record<SourceNoteDetectorConceptId, PdfSignalTranslationDescriptor>;
};

const median = (values: readonly number[]): number | null => {
  if (!values.length || values.some(value => !Number.isFinite(value))) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Build bounded descriptive receipts for signal entry, review coverage and sizing context. */
export function detectSourceNoteConcepts(input: SourceNoteDetectorInput): SourceNoteDetectorBundle {
  const base = {
    version: SOURCE_NOTE_DETECTOR_VERSION,
    symbol: "XAUUSD" as const,
    timeframe: "M5" as const,
    selectedTime: input?.selectedTime ?? "",
    state: "UNAVAILABLE" as const,
    reason: "INVALID_CAUSAL_INPUT",
    descriptors: emptyDescriptors("UNAVAILABLE", "INVALID_CAUSAL_INPUT"),
    authority: SOURCE_NOTE_DETECTOR_AUTHORITY,
    live_apply_allowed: false as const,
  };
  if (!input || input.enabled === false) {
    return { ...base, state: "WITHHELD", reason: "UNVERIFIED_CURRENT_EVIDENCE", descriptors: emptyDescriptors("WITHHELD", "UNVERIFIED_CURRENT_EVIDENCE") };
  }
  const selectedInstant = instantOf(input.selectedTime);
  const nowMs = input.nowMs ?? Date.now();
  if (!Array.isArray(input.bars) || selectedInstant == null || !Number.isFinite(nowMs)) return base;
  const selectedIndex = input.bars.findIndex(bar => instantOf(bar?.t) === selectedInstant);
  if (selectedIndex < 0) return { ...base, reason: "MISSING_SELECTED_CANDLE", descriptors: emptyDescriptors("UNAVAILABLE", "MISSING_SELECTED_CANDLE") };
  const resolved = resolvePrefix(input.bars, selectedIndex, nowMs);
  if (!resolved) return { ...base, reason: "INVALID_CAUSAL_PREFIX", descriptors: emptyDescriptors("UNAVAILABLE", "INVALID_CAUSAL_PREFIX") };

  const { prefix, causalPrefix } = resolved;
  const selected = prefix[prefix.length - 1]!;
  const range = selected.h - selected.l;
  const body = Math.abs(selected.c - selected.o);
  const upperWick = selected.h - Math.max(selected.o, selected.c);
  const lowerWick = Math.min(selected.o, selected.c) - selected.l;
  const priorRanges = prefix.slice(0, -1).map(bar => bar.h - bar.l);
  const priorMedianRange = median(priorRanges);
  const utcCalendarDays = new Set(prefix.map(bar => bar.t.slice(0, 10))).size;
  const descriptors = {
    signal_entry_bar: descriptor("signal_entry_bar", "DESCRIPTIVE", "CLOSED_M5_CANDLE_GEOMETRY_ONLY", causalPrefix, {
      selectedTime: canonical(instantOf(selected.t)!),
      open: selected.o,
      high: selected.h,
      low: selected.l,
      close: selected.c,
      body,
      range,
      candleDirection: selected.c > selected.o ? "UP" : selected.c < selected.o ? "DOWN" : "NEUTRAL",
      upperWick,
      lowerWick,
      closeLocation: range > 0 ? (selected.c - selected.l) / range : null,
      sourceEntryLabel: null,
      subsequentBreak: null,
    }),
    consecutive_review: descriptor("consecutive_review", "DESCRIPTIVE", "CLOSED_PREFIX_COVERAGE_ONLY", causalPrefix, {
      reviewBars: prefix.length,
      reviewStart: causalPrefix.start,
      reviewEnd: causalPrefix.end,
      utcCalendarDays,
      sessionTimezone: null,
      sourceSetupLabels: null,
      annotatedOutcomes: null,
      skippedCases: null,
    }),
    position_sizing: descriptor("position_sizing", "DESCRIPTIVE", "CLOSED_OHLC_RANGE_RISK_UNIT_PROXY", causalPrefix, {
      selectedRange: range,
      priorMedianRange,
      rangeRatioToPriorMedian: priorMedianRange && priorMedianRange > 0 ? range / priorMedianRange : null,
      riskUnit: "SELECTED_M5_RANGE_QUOTE_PRICE",
      equity: null,
      riskPct: null,
      stopDistance: null,
      rawLots: null,
      roundedLots: null,
      orders: null,
      currencyAccounting: null,
      executionCosts: null,
    }),
  } as Record<SourceNoteDetectorConceptId, PdfSignalTranslationDescriptor>;
  return { ...base, state: "DESCRIPTIVE", reason: "CAUSAL_PREFIX_DESCRIPTORS_AVAILABLE", descriptors };
}

export const buildSourceNoteDetectors = detectSourceNoteConcepts;

export const detectSignalEntryBar = (input: SourceNoteDetectorInput): PdfSignalTranslationDescriptor =>
  detectSourceNoteConcepts(input).descriptors.signal_entry_bar;

export const detectConsecutiveReview = (input: SourceNoteDetectorInput): PdfSignalTranslationDescriptor =>
  detectSourceNoteConcepts(input).descriptors.consecutive_review;

export const detectPositionSizing = (input: SourceNoteDetectorInput): PdfSignalTranslationDescriptor =>
  detectSourceNoteConcepts(input).descriptors.position_sizing;
