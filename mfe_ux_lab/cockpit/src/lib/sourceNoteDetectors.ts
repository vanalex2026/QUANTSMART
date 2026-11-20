import type { EconomicCalendar } from "./economicCalendar.ts";
import type { M5PriceBar, PriceActionDirection } from "./priceActionDetector.ts";
import { patternFailureSelectionContext } from "./patternFailureSelectionContext.ts";
import { patternLowVolatilityContext } from "./patternLowVolatilityContext.ts";
import {
  patternNewsExitEventIdentity,
  patternResistanceExitEventIdentity,
  patternReversalExitEventIdentity,
  type ExitEventIdentity,
} from "./patternExitEventIdentity.ts";
import { patternRoomContext } from "./patternRoomContext.ts";

/**
 * Bounded descriptive translations for the seven source-note concepts owned by
 * this module. These are local observations, not source labels or decisions.
 */
export const SOURCE_NOTE_DETECTOR_VERSION = "source-note-detectors/1" as const;
export const SOURCE_NOTE_DETECTOR_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;
export const SOURCE_NOTE_DETECTOR_CONCEPTS = [
  "news_exit",
  "resistance_exit",
  "reversal_exit",
  "trade_selection_failure",
  "obstacle_room",
  "low_volatility",
  "bracket_costs",
] as const;
export type SourceNoteDetectorConceptId = typeof SOURCE_NOTE_DETECTOR_CONCEPTS[number];
export type SourceNoteDetectorState = "DESCRIPTIVE" | "UNAVAILABLE" | "WITHHELD";

type QuoteBracket = {
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  spreadPrice?: number;
  slippagePrice?: number;
  commissionQuote?: number;
  unit?: "QUOTE_PRICE_UNITS" | string;
  source?: "USER_SUPPLIED" | string;
};

export type SourceNoteDetectorInput = {
  bars: readonly M5PriceBar[];
  selectedTime: string;
  /** Optional later closed boundary for an explicitly observed event identity. */
  observedThrough?: string;
  direction?: PriceActionDirection;
  protection?: number;
  resistanceLevel?: number;
  reversalLevel?: number;
  calendar?: EconomicCalendar | null;
  bracket?: QuoteBracket;
  enabled?: boolean;
  nowMs?: number;
};

export type SourceNoteDetectorDescriptor = {
  version: typeof SOURCE_NOTE_DETECTOR_VERSION;
  conceptId: SourceNoteDetectorConceptId;
  state: SourceNoteDetectorState;
  reason: string;
  sourcePages: readonly number[];
  causalPrefix: {
    state: "AVAILABLE" | "UNAVAILABLE" | "WITHHELD";
    start: string | null;
    end: string | null;
    bars: number;
    maxBars: 96;
    contiguous: boolean;
    closedOnly: boolean;
    futureRows: "WITHHELD";
  };
  observation: Record<string, number | string | boolean | null>;
  sourceStatus: "SOURCE_REVIEW_ONLY";
  dataStatus: "AVAILABLE" | "UNAVAILABLE";
  outcomeStatus: "WITHHELD";
  authority: typeof SOURCE_NOTE_DETECTOR_AUTHORITY;
  live_apply_allowed: false;
};

export type SourceNoteDetectorReceipt = {
  version: typeof SOURCE_NOTE_DETECTOR_VERSION;
  symbol: "XAUUSD";
  timeframe: "M5";
  selectedTime: string;
  state: "DESCRIPTIVE" | "UNAVAILABLE" | "WITHHELD";
  reason: string;
  descriptors: Record<SourceNoteDetectorConceptId, SourceNoteDetectorDescriptor>;
  authority: typeof SOURCE_NOTE_DETECTOR_AUTHORITY;
  live_apply_allowed: false;
};

const M5_MS = 300_000;
const MAX_PREFIX_BARS = 96;
const SOURCE_PAGES: Record<SourceNoteDetectorConceptId, readonly number[]> = {
  news_exit: [144, 145, 146, 147],
  resistance_exit: [148, 149, 150, 151],
  reversal_exit: [156, 157, 158, 159],
  trade_selection_failure: [177, 178, 179, 180],
  obstacle_room: [13, 37, 40, 41],
  low_volatility: [336, 339, 340, 341],
  bracket_costs: [67, 68, 69, 70],
};

function instantOf(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) && instant % M5_MS === 0 ? instant : null;
}

function canonical(instant: number): string {
  return new Date(instant).toISOString();
}

function validBar(bar: M5PriceBar | undefined, instant: number | null, nowMs: number): boolean {
  return !!bar && instant != null && instant + M5_MS <= nowMs && bar.closed !== false
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    && bar.h > bar.l && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c);
}

function prefixStatus(prefix: readonly M5PriceBar[], state: "AVAILABLE" | "UNAVAILABLE" | "WITHHELD" = "AVAILABLE"): SourceNoteDetectorDescriptor["causalPrefix"] {
  return {
    state,
    start: prefix.length ? canonical(instantOf(prefix[0].t)!) : null,
    end: prefix.length ? canonical(instantOf(prefix[prefix.length - 1].t)!) : null,
    bars: prefix.length,
    maxBars: 96,
    contiguous: state === "AVAILABLE",
    closedOnly: state === "AVAILABLE",
    futureRows: "WITHHELD" as const,
  };
}

function descriptor(
  conceptId: SourceNoteDetectorConceptId,
  state: SourceNoteDetectorState,
  reason: string,
  prefix: readonly M5PriceBar[],
  observation: Record<string, number | string | boolean | null> = {},
  prefixState: "AVAILABLE" | "UNAVAILABLE" | "WITHHELD" = prefix.length ? "AVAILABLE" : "UNAVAILABLE",
): SourceNoteDetectorDescriptor {
  return {
    version: SOURCE_NOTE_DETECTOR_VERSION,
    conceptId,
    state,
    reason,
    sourcePages: SOURCE_PAGES[conceptId],
    causalPrefix: prefixStatus(prefix, prefixState),
    observation,
    sourceStatus: "SOURCE_REVIEW_ONLY",
    dataStatus: state === "DESCRIPTIVE" ? "AVAILABLE" : "UNAVAILABLE",
    outcomeStatus: "WITHHELD",
    authority: SOURCE_NOTE_DETECTOR_AUTHORITY,
    live_apply_allowed: false,
  };
}

function emptyDescriptors(reason: string, state: SourceNoteDetectorState = "UNAVAILABLE"): Record<SourceNoteDetectorConceptId, SourceNoteDetectorDescriptor> {
  const prefixState = state === "WITHHELD" ? "WITHHELD" : "UNAVAILABLE";
  return Object.fromEntries(SOURCE_NOTE_DETECTOR_CONCEPTS.map((conceptId) => [conceptId, descriptor(conceptId, state, reason, [], {}, prefixState)])) as Record<SourceNoteDetectorConceptId, SourceNoteDetectorDescriptor>;
}

function mapExit(conceptId: "news_exit" | "resistance_exit" | "reversal_exit", receipt: ExitEventIdentity, prefix: readonly M5PriceBar[]): SourceNoteDetectorDescriptor {
  const state: SourceNoteDetectorState = receipt.state === "AVAILABLE" ? "DESCRIPTIVE" : receipt.state;
  return descriptor(conceptId, state, receipt.reason, prefix, {
    eventState: receipt.event.state,
    observation: receipt.event.observation,
    eventTime: receipt.event.time,
    eventIdentity: receipt.event.identity,
    level: receipt.event.level,
    title: receipt.event.title,
  });
}

function validBracket(bracket: QuoteBracket | undefined): bracket is QuoteBracket {
  if (!bracket) return false;
  if (bracket.unit != null && bracket.unit !== "QUOTE_PRICE_UNITS") return false;
  if (bracket.source != null && bracket.source !== "USER_SUPPLIED") return false;
  if (Object.keys(bracket).some((key) => /pip/i.test(key))) return false;
  return [bracket.entryPrice, bracket.stopPrice, bracket.targetPrice].every(value => Number.isFinite(value) && value > 0)
    && [bracket.spreadPrice ?? 0, bracket.slippagePrice ?? 0, bracket.commissionQuote ?? 0].every(Number.isFinite)
    && bracket.stopPrice !== bracket.entryPrice && bracket.targetPrice !== bracket.entryPrice
    && (bracket.spreadPrice ?? 0) >= 0 && (bracket.slippagePrice ?? 0) >= 0 && (bracket.commissionQuote ?? 0) >= 0;
}

function directionOf(direction: PriceActionDirection | undefined): "UP" | "DOWN" | "NEUTRAL" {
  return direction === "UP" || direction === "DOWN" ? direction : "NEUTRAL";
}

/**
 * Observe the seven assigned source-note concepts through one selected closed
 * XAUUSD M5 prefix. Local context ends at selectedTime. An optional
 * observedThrough boundary is allowed only for explicitly supplied event
 * identities.
 */
export function detectSourceNoteSubset(input: SourceNoteDetectorInput): SourceNoteDetectorReceipt {
  const selectedTime = input?.selectedTime ?? "";
  const base: SourceNoteDetectorReceipt = {
    version: SOURCE_NOTE_DETECTOR_VERSION,
    symbol: "XAUUSD",
    timeframe: "M5",
    selectedTime,
    state: "UNAVAILABLE",
    reason: "INVALID_CAUSAL_INPUT",
    descriptors: emptyDescriptors("INVALID_CAUSAL_INPUT"),
    authority: SOURCE_NOTE_DETECTOR_AUTHORITY,
    live_apply_allowed: false,
  };
  if (!input || input.enabled === false) return { ...base, reason: "UNVERIFIED_CURRENT_EVIDENCE", state: "WITHHELD", descriptors: emptyDescriptors("UNVERIFIED_CURRENT_EVIDENCE", "WITHHELD") };
  if (!Array.isArray(input.bars)) return base;
  const selectedInstant = instantOf(selectedTime);
  const observedThrough = input.observedThrough ?? selectedTime;
  const throughInstant = instantOf(observedThrough);
  const nowMs = input.nowMs ?? Date.now();
  if (selectedInstant == null || throughInstant == null || throughInstant < selectedInstant || !Number.isFinite(nowMs) || nowMs < 0) return base;
  let selectedIndex = -1;
  let throughIndex = -1;
  for (let i = 0; i < input.bars.length; i++) {
    const instant = instantOf(input.bars[i]?.t);
    if (instant === selectedInstant) {
      if (selectedIndex >= 0) return { ...base, reason: "DUPLICATE_SELECTED_IDENTITY", descriptors: emptyDescriptors("DUPLICATE_SELECTED_IDENTITY") };
      selectedIndex = i;
    }
    if (instant === throughInstant) {
      if (throughIndex >= 0) return { ...base, reason: "DUPLICATE_OBSERVED_THROUGH_IDENTITY", descriptors: emptyDescriptors("DUPLICATE_OBSERVED_THROUGH_IDENTITY") };
      throughIndex = i;
    }
  }
  if (selectedIndex < 0) return { ...base, reason: "MISSING_SELECTED_CANDLE", descriptors: emptyDescriptors("MISSING_SELECTED_CANDLE") };
  if (throughIndex < 0) return { ...base, reason: "MISSING_OBSERVED_THROUGH_CANDLE", descriptors: emptyDescriptors("MISSING_OBSERVED_THROUGH_CANDLE") };
  const selectedFrom = Math.max(0, selectedIndex - (MAX_PREFIX_BARS - 1));
  const throughFrom = Math.max(0, throughIndex - (MAX_PREFIX_BARS - 1));
  const prefix = input.bars.slice(selectedFrom, selectedIndex + 1);
  const observedPrefix = selectedIndex === throughIndex ? prefix : input.bars.slice(throughFrom, throughIndex + 1);
  const validatePrefix = (rows: readonly M5PriceBar[]): "OK" | "INVALID_CAUSAL_PREFIX" | "CAUSAL_PREFIX_GAP" => {
    let previous: number | null = null;
    for (const bar of rows) {
      const instant = instantOf(bar?.t);
      if (instant == null || !validBar(bar, instant, nowMs)) return "INVALID_CAUSAL_PREFIX";
      if (previous != null && instant - previous !== M5_MS) return "CAUSAL_PREFIX_GAP";
      previous = instant;
    }
    return "OK";
  };
  const prefixError = validatePrefix(prefix);
  if (prefixError !== "OK") return { ...base, reason: prefixError, descriptors: emptyDescriptors(prefixError) };
  const observedPrefixError = observedPrefix === prefix ? "OK" : validatePrefix(observedPrefix);
  if (observedPrefixError !== "OK") return { ...base, reason: observedPrefixError, descriptors: emptyDescriptors(observedPrefixError) };

  const direction = directionOf(input.direction);
  const common = { bars: observedPrefix, occurrenceTime: selectedTime, observedThrough, direction, nowMs };
  const d = {} as Record<SourceNoteDetectorConceptId, SourceNoteDetectorDescriptor>;
  d.news_exit = mapExit("news_exit", patternNewsExitEventIdentity({ ...common, calendar: input.calendar ?? null }), observedPrefix);
  d.resistance_exit = mapExit("resistance_exit", patternResistanceExitEventIdentity({ ...common, level: input.resistanceLevel ?? null }), observedPrefix);
  d.reversal_exit = mapExit("reversal_exit", patternReversalExitEventIdentity({ ...common, level: input.reversalLevel ?? null }), observedPrefix);

  if (direction === "NEUTRAL") {
    d.trade_selection_failure = descriptor("trade_selection_failure", "WITHHELD", "DIRECTIONAL_CONTEXT_REQUIRED", prefix);
    d.obstacle_room = descriptor("obstacle_room", "WITHHELD", "DIRECTIONAL_CONTEXT_REQUIRED", prefix);
  } else {
    const failure = patternFailureSelectionContext(prefix, selectedTime, direction, true, nowMs);
    d.trade_selection_failure = failure.state === "AVAILABLE"
      ? descriptor("trade_selection_failure", "DESCRIPTIVE", failure.reason, prefix, {
        closeInsidePriorRange: failure.observations.closeInsidePriorRange,
        priorRangeLow: failure.observations.priorRange.low,
        priorRangeHigh: failure.observations.priorRange.high,
        priorRangeBars: failure.observations.priorRange.bars,
      })
      : descriptor("trade_selection_failure", failure.state, failure.reason, prefix);
    const room = patternRoomContext(prefix, selectedTime, direction, input.protection, true);
    d.obstacle_room = room.localDataStatus === "AVAILABLE"
      ? descriptor("obstacle_room", "DESCRIPTIVE", room.reason, prefix, {
        roomState: room.state,
        nearestDistance: room.structuralLevels[0]?.distance ?? null,
        technicalRisk: room.technicalRisk,
        structuralLevels: room.structuralLevels.length,
      })
      : descriptor("obstacle_room", "WITHHELD", room.reason, prefix);
  }

  const low = patternLowVolatilityContext(prefix, selectedTime, true);
  d.low_volatility = low.state === "WITHHELD"
    ? descriptor("low_volatility", "WITHHELD", low.reason, prefix)
    : descriptor("low_volatility", "DESCRIPTIVE", low.reason, prefix, {
      activityRatio: low.activityRatio,
      baselineRange: low.baselineRange,
      recentRange: low.recentRange,
      activityState: low.state,
    });

  d.bracket_costs = validBracket(input.bracket)
    ? descriptor("bracket_costs", "DESCRIPTIVE", "USER_SUPPLIED_QUOTE_PRICE_BRACKET", prefix, {
      entryPrice: input.bracket.entryPrice,
      stopDistance: Math.abs(input.bracket.entryPrice - input.bracket.stopPrice),
      targetDistance: Math.abs(input.bracket.targetPrice - input.bracket.entryPrice),
      spreadPrice: input.bracket.spreadPrice ?? 0,
      slippagePrice: input.bracket.slippagePrice ?? 0,
      commissionQuote: input.bracket.commissionQuote ?? 0,
      quotePriceUnits: true,
      pdfPipDistancesUsed: false,
    })
    : descriptor("bracket_costs", "UNAVAILABLE", "QUOTE_PRICE_BRACKET_ASSUMPTIONS_UNAVAILABLE", prefix);

  return { ...base, state: "DESCRIPTIVE", reason: "CAUSAL_PREFIX_DESCRIPTORS_AVAILABLE", descriptors: d };
}

export const observeSourceNoteSubset = detectSourceNoteSubset;

/** Stable per-concept entry points for callers that do not need the full receipt. */
export const detectNewsExit = (input: SourceNoteDetectorInput) => detectSourceNoteSubset(input).descriptors.news_exit;
export const detectResistanceExit = (input: SourceNoteDetectorInput) => detectSourceNoteSubset(input).descriptors.resistance_exit;
export const detectReversalExit = (input: SourceNoteDetectorInput) => detectSourceNoteSubset(input).descriptors.reversal_exit;
export const detectTradeSelectionFailure = (input: SourceNoteDetectorInput) => detectSourceNoteSubset(input).descriptors.trade_selection_failure;
export const detectObstacleRoom = (input: SourceNoteDetectorInput) => detectSourceNoteSubset(input).descriptors.obstacle_room;
export const detectLowVolatility = (input: SourceNoteDetectorInput) => detectSourceNoteSubset(input).descriptors.low_volatility;
export const detectBracketCosts = (input: SourceNoteDetectorInput) => detectSourceNoteSubset(input).descriptors.bracket_costs;

