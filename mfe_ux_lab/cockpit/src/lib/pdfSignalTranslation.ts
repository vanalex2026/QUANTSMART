import type { M5PriceBar, PriceActionDirection } from "./priceActionDetector.ts";
import { patternFailureSelectionContext } from "./patternFailureSelectionContext.ts";
import { patternLowVolatilityContext } from "./patternLowVolatilityContext.ts";
import { patternRoomContext } from "./patternRoomContext.ts";

/**
 * Descriptive bridge for the ten PDF concepts that have no independently
 * labelled XAUUSD M5 detector. It measures only a supplied closed prefix and
 * never creates a source label, fill, order, rate, or outcome.
 */
export const PDF_SIGNAL_TRANSLATION_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;
export const PDF_SIGNAL_TRANSLATION_VERSION = "pdf-signal-translation/1" as const;

export const PDF_SOURCE_NOTE_CONCEPTS = [
  "signal_entry_bar",
  "bracket_costs",
  "news_exit",
  "resistance_exit",
  "reversal_exit",
  "trade_selection_failure",
  "consecutive_review",
  "position_sizing",
  "low_volatility",
  "obstacle_room",
] as const;
export type PdfSourceNoteConceptId = typeof PDF_SOURCE_NOTE_CONCEPTS[number];
export type PdfTranslationState = "DESCRIPTIVE" | "UNAVAILABLE" | "WITHHELD";

export type PdfSignalTranslationDescriptor = {
  conceptId: PdfSourceNoteConceptId;
  state: PdfTranslationState;
  reason: string;
  sourcePages: readonly number[];
  sourceStatus: "SOURCE_REVIEW_ONLY";
  dataStatus: "AVAILABLE" | "UNAVAILABLE";
  outcomeStatus: "WITHHELD";
  outcomeReason: "SOURCE_OUTCOME_NOT_LABELLED";
  causalPrefix: {
    state: "AVAILABLE" | "UNAVAILABLE" | "WITHHELD";
    start: string | null;
    end: string | null;
    bars: number;
    maxBars: number;
    closedOnly: boolean;
    futureRows: "WITHHELD";
  };
  geometry: Record<string, number | string | boolean | null>;
  authority: typeof PDF_SIGNAL_TRANSLATION_AUTHORITY;
  live_apply_allowed: false;
};

export type PdfSignalTranslationReceipt = {
  version: typeof PDF_SIGNAL_TRANSLATION_VERSION;
  symbol: "XAUUSD";
  timeframe: "M5";
  selectedTime: string;
  state: "DESCRIPTIVE" | "UNAVAILABLE" | "WITHHELD";
  reason: string;
  descriptors: Record<PdfSourceNoteConceptId, PdfSignalTranslationDescriptor>;
  authority: typeof PDF_SIGNAL_TRANSLATION_AUTHORITY;
  live_apply_allowed: false;
};

export type PdfSignalTranslationInput = {
  bars: readonly M5PriceBar[];
  selectedTime: string;
  direction?: PriceActionDirection;
  protection?: number;
  /** Optional user-supplied quote-price bracket assumptions. */
  bracket?: { entryPrice: number; stopPrice: number; targetPrice: number; spreadPrice?: number; slippagePrice?: number; commissionQuote?: number; unit?: string; source?: string };
  /** Optional validated calendar identity. Candle data never infers news. */
  newsEvent?: { atUtc: string; title: string; source: string };
  /** Optional user/broker sizing assumptions. No order or fill is created. */
  sizing?: { equity: number; riskPct: number; stopDistance: number; contractSize: number; lotStep: number; minLot: number };
  /** Optional externally labelled adverse event identity. */
  reversalEvent?: { time: string; identity: string };
  enabled?: boolean;
  nowMs?: number;
};

const M5_MS = 300_000;
const MAX_PREFIX_BARS = 96;
const SOURCE_PAGES: Record<PdfSourceNoteConceptId, readonly number[]> = {
  signal_entry_bar: [73, 74, 75, 80], bracket_costs: [67, 68, 69, 70],
  news_exit: [144, 145, 146, 147], resistance_exit: [148, 149, 150, 151],
  reversal_exit: [156, 157, 158, 159], trade_selection_failure: [177, 178, 179, 180],
  consecutive_review: [133, 245, 246, 247], position_sizing: [249, 383, 384, 385],
  low_volatility: [336, 339, 340, 341], obstacle_room: [13, 37, 40, 41],
};

const instantOf = (value: unknown): number | null => {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value) : null;
  if (!match) return null;
  const text = value as string;
  const [, year, month, day, hour, minute, second, millis = "000", zone] = match;
  const instant = Date.parse(text);
  const offset = zone === "Z" ? 0 : (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6))) * (zone[0] === "+" ? 1 : -1);
  const expected = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number(millis)) - offset * 60_000;
  return Number.isFinite(instant) && instant === expected && instant % M5_MS === 0 ? instant : null;
};
const canonical = (instant: number): string => new Date(instant).toISOString();
const validBar = (bar: M5PriceBar | undefined, instant: number, nowMs: number): boolean => {
  return !!bar && instant + M5_MS <= nowMs && bar.closed !== false
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    && bar.h > bar.l && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c);
};

const prefixStatus = (prefix: readonly M5PriceBar[], state: "AVAILABLE" | "UNAVAILABLE" | "WITHHELD" = "AVAILABLE") => ({
  state,
  start: prefix.length ? canonical(instantOf(prefix[0].t)!) : null,
  end: prefix.length ? canonical(instantOf(prefix[prefix.length - 1].t)!) : null,
  bars: prefix.length,
  maxBars: MAX_PREFIX_BARS,
  closedOnly: state === "AVAILABLE",
  futureRows: "WITHHELD" as const,
});

const descriptor = (conceptId: PdfSourceNoteConceptId, state: PdfTranslationState, reason: string, prefix: readonly M5PriceBar[], geometry: Record<string, number | string | boolean | null> = {}): PdfSignalTranslationDescriptor => ({
  conceptId, state, reason, sourcePages: SOURCE_PAGES[conceptId], sourceStatus: "SOURCE_REVIEW_ONLY",
  dataStatus: state === "DESCRIPTIVE" ? "AVAILABLE" : "UNAVAILABLE", outcomeStatus: "WITHHELD",
  outcomeReason: "SOURCE_OUTCOME_NOT_LABELLED", causalPrefix: prefixStatus(prefix, state === "WITHHELD" ? "WITHHELD" : prefix.length ? "AVAILABLE" : "UNAVAILABLE"),
  geometry, authority: PDF_SIGNAL_TRANSLATION_AUTHORITY, live_apply_allowed: false,
});

function emptyDescriptors(reason: string, state: PdfTranslationState = "UNAVAILABLE"): Record<PdfSourceNoteConceptId, PdfSignalTranslationDescriptor> {
  return Object.fromEntries(PDF_SOURCE_NOTE_CONCEPTS.map(id => [id, descriptor(id, state, reason, [])])) as Record<PdfSourceNoteConceptId, PdfSignalTranslationDescriptor>;
}

/** Translate source-note concepts into bounded local observations. */
export function translatePdfSignalConcepts(input: PdfSignalTranslationInput): PdfSignalTranslationReceipt {
  const base: PdfSignalTranslationReceipt = { version: PDF_SIGNAL_TRANSLATION_VERSION, symbol: "XAUUSD", timeframe: "M5", selectedTime: input?.selectedTime ?? "", state: "UNAVAILABLE", reason: "INVALID_CAUSAL_INPUT", descriptors: emptyDescriptors("INVALID_CAUSAL_INPUT"), authority: PDF_SIGNAL_TRANSLATION_AUTHORITY, live_apply_allowed: false };
  if (!input || input.enabled === false) return { ...base, reason: "UNVERIFIED_CURRENT_EVIDENCE", descriptors: emptyDescriptors("UNVERIFIED_CURRENT_EVIDENCE", "WITHHELD") };
  const selectedInstant = instantOf(input.selectedTime);
  const nowMs = input.nowMs ?? Date.now();
  if (selectedInstant == null || !Number.isFinite(nowMs) || !Array.isArray(input.bars)) return base;
  const selectedIndex = input.bars.findIndex(bar => instantOf(bar?.t) === selectedInstant);
  if (selectedIndex < 0) return { ...base, reason: "MISSING_SELECTED_CANDLE", descriptors: emptyDescriptors("MISSING_SELECTED_CANDLE") };
  // Rows after the selected candle are future evidence and must not alter a
  // causal translation. Keep the explicit duplicate-selected guard, then
  // validate duplicate identities only inside the revealed prefix.
  const selectedIdentityCount = input.bars.reduce((count, bar) => count + (instantOf(bar?.t) === selectedInstant ? 1 : 0), 0);
  if (selectedIdentityCount > 1) return { ...base, reason: "DUPLICATE_CAUSAL_IDENTITY", descriptors: emptyDescriptors("DUPLICATE_CAUSAL_IDENTITY") };
  const seen = new Set<number>();
  for (const bar of input.bars.slice(0, selectedIndex + 1)) {
    const instant = instantOf(bar?.t);
    if (instant != null) {
      if (seen.has(instant)) return { ...base, reason: "DUPLICATE_CAUSAL_IDENTITY", descriptors: emptyDescriptors("DUPLICATE_CAUSAL_IDENTITY") };
      seen.add(instant);
    }
  }
  const from = Math.max(0, selectedIndex - (MAX_PREFIX_BARS - 1));
  const prefix = input.bars.slice(from, selectedIndex + 1);
  let previous: number | null = null;
  for (const bar of prefix) {
    const instant = instantOf(bar?.t);
    if (instant == null || !validBar(bar, instant, nowMs) || (previous != null && instant - previous !== M5_MS)) {
      return { ...base, reason: "INVALID_CAUSAL_PREFIX", descriptors: emptyDescriptors("INVALID_CAUSAL_PREFIX") };
    }
    previous = instant;
  }
  const selected = prefix[prefix.length - 1];
  const direction = input.direction === "UP" || input.direction === "DOWN" ? input.direction : "NEUTRAL";
  const prior = prefix.slice(0, -1);
  const d = base.descriptors;
  d.signal_entry_bar = descriptor("signal_entry_bar", "DESCRIPTIVE", "CLOSED_M5_CANDLE_GEOMETRY_ONLY", prefix, { open: selected.o, high: selected.h, low: selected.l, close: selected.c, body: Math.abs(selected.c - selected.o), range: selected.h - selected.l, sourceEntryLabel: null });
  const bracket = input.bracket;
  const validBracket = bracket
    && (bracket.unit == null || bracket.unit === "QUOTE_PRICE_UNITS")
    && (bracket.source == null || bracket.source === "USER_SUPPLIED")
    && !Object.keys(bracket).some((key) => /pip/i.test(key))
    && [bracket.entryPrice, bracket.stopPrice, bracket.targetPrice].every(value => Number.isFinite(value) && value > 0)
    && [bracket.spreadPrice ?? 0, bracket.slippagePrice ?? 0, bracket.commissionQuote ?? 0].every(Number.isFinite)
    && (bracket.spreadPrice ?? 0) >= 0 && (bracket.slippagePrice ?? 0) >= 0 && (bracket.commissionQuote ?? 0) >= 0
    && bracket.stopPrice !== bracket.entryPrice && bracket.targetPrice !== bracket.entryPrice;
  d.bracket_costs = validBracket
    ? descriptor("bracket_costs", "DESCRIPTIVE", "USER_SUPPLIED_QUOTE_PRICE_BRACKET", prefix, {
      entryPrice: bracket.entryPrice, stopDistance: Math.abs(bracket.entryPrice - bracket.stopPrice), targetDistance: Math.abs(bracket.targetPrice - bracket.entryPrice), spreadPrice: bracket.spreadPrice ?? 0, slippagePrice: bracket.slippagePrice ?? 0, commissionQuote: bracket.commissionQuote ?? 0, pdfPipDistancesUsed: false,
    })
    : descriptor("bracket_costs", "UNAVAILABLE", "EXECUTION_MODEL_UNAVAILABLE", prefix);
  const eventTime = input.newsEvent?.atUtc ? instantOf(input.newsEvent.atUtc) : null;
  const prefixStart = instantOf(prefix[0]?.t);
  const newsEvent = input.newsEvent;
  const validNewsEvent = newsEvent
    && typeof newsEvent.title === "string" && newsEvent.title.length > 0 && newsEvent.title.trim() === newsEvent.title
    && typeof newsEvent.source === "string" && newsEvent.source.length > 0 && newsEvent.source.trim() === newsEvent.source;
  d.news_exit = validNewsEvent && newsEvent && eventTime != null && prefixStart != null && eventTime >= prefixStart && eventTime <= selectedInstant
    ? descriptor("news_exit", "DESCRIPTIVE", "VALIDATED_NEWS_EVENT_IDENTITY_ONLY", prefix, { eventTime: canonical(eventTime), title: newsEvent.title, source: newsEvent.source, exitDecision: null })
    : descriptor("news_exit", "UNAVAILABLE", "VALIDATED_NEWS_CALENDAR_UNAVAILABLE", prefix);
  if (direction === "NEUTRAL" || prior.length < 2) {
    d.resistance_exit = descriptor("resistance_exit", "WITHHELD", "DIRECTION_OR_PRIOR_CONTEXT_REQUIRED", prefix);
  } else {
    const adverseLevels = direction === "UP"
      ? prior.map(bar => bar.h).filter(level => level > selected.c)
      : prior.map(bar => bar.l).filter(level => level < selected.c);
    const nearestAdverseLevel = adverseLevels.length
      ? direction === "UP" ? Math.min(...adverseLevels) : Math.max(...adverseLevels)
      : null;
    d.resistance_exit = descriptor("resistance_exit", "DESCRIPTIVE", "LOCAL_ADVERSE_EXTREME_REFERENCE", prefix, {
      direction,
      nearestAdverseLevel,
      distanceFromClose: nearestAdverseLevel == null ? null : Math.abs(nearestAdverseLevel - selected.c),
      sourceExitDecision: null,
    });
  }
  const reversalTime = input.reversalEvent?.time ? instantOf(input.reversalEvent.time) : null;
  const reversalEvent = input.reversalEvent;
  const validReversalEvent = reversalEvent
    && typeof reversalEvent.identity === "string" && reversalEvent.identity.length > 0 && reversalEvent.identity.trim() === reversalEvent.identity;
  d.reversal_exit = validReversalEvent && reversalEvent && reversalTime != null && prefixStart != null && reversalTime >= prefixStart && reversalTime <= selectedInstant
    ? descriptor("reversal_exit", "DESCRIPTIVE", "VALIDATED_ADVERSE_EVENT_IDENTITY_ONLY", prefix, { eventTime: canonical(reversalTime), identity: reversalEvent.identity, exitDecision: null })
    : descriptor("reversal_exit", "WITHHELD", "ADVERSE_LEVEL_OR_EXECUTION_LABEL_REQUIRED", prefix);
  const failure = direction === "NEUTRAL" ? null : patternFailureSelectionContext(input.bars, input.selectedTime, direction, true, nowMs);
  d.trade_selection_failure = failure?.dataStatus === "AVAILABLE"
    ? descriptor("trade_selection_failure", "DESCRIPTIVE", "CAUSAL_PRIOR_RANGE_OBSERVED", prefix, { closeInsidePriorRange: failure.observations.closeInsidePriorRange, priorRangeLow: failure.observations.priorRange.low, priorRangeHigh: failure.observations.priorRange.high, priorRangeBars: failure.observations.priorRange.bars })
    : descriptor("trade_selection_failure", "WITHHELD", "DIRECTIONAL_FAILURE_LABEL_UNAVAILABLE", prefix);
  d.consecutive_review = descriptor("consecutive_review", "DESCRIPTIVE", "CLOSED_PREFIX_COVERAGE_ONLY", prefix, { sessionBars: prefix.length, sessionStart: canonical(instantOf(prefix[0].t)!), sessionEnd: canonical(instantOf(prefix[prefix.length - 1].t)!), sourceSetupLabels: null });
  const sizing = input.sizing;
  const validSizing = sizing && [sizing.equity, sizing.riskPct, sizing.stopDistance, sizing.contractSize, sizing.lotStep, sizing.minLot].every(Number.isFinite) && sizing.equity > 0 && sizing.riskPct > 0 && sizing.stopDistance > 0 && sizing.contractSize > 0 && sizing.lotStep > 0 && sizing.minLot > 0;
  if (validSizing) {
    const riskAmount = sizing.equity * sizing.riskPct / 100;
    const rawLots = riskAmount / (sizing.stopDistance * sizing.contractSize);
    const lots = Math.max(sizing.minLot, Math.floor(rawLots / sizing.lotStep) * sizing.lotStep);
    const finiteDerivedSizing = [riskAmount, rawLots, lots].every(Number.isFinite);
    d.position_sizing = finiteDerivedSizing
      ? descriptor("position_sizing", "DESCRIPTIVE", "USER_SUPPLIED_RISK_UNIT_OBSERVATION", prefix, { equity: sizing.equity, riskPct: sizing.riskPct, stopDistance: sizing.stopDistance, riskAmount, rawLots, roundedLots: lots, orders: null })
      : descriptor("position_sizing", "UNAVAILABLE", "USER_SIZING_AND_COST_ASSUMPTIONS_REQUIRED", prefix);
  } else d.position_sizing = descriptor("position_sizing", "UNAVAILABLE", "USER_SIZING_AND_COST_ASSUMPTIONS_REQUIRED", prefix);
  const low = patternLowVolatilityContext(input.bars, input.selectedTime, true);
  d.low_volatility = low.state === "WITHHELD" ? descriptor("low_volatility", "WITHHELD", low.reason, prefix) : descriptor("low_volatility", "DESCRIPTIVE", low.reason, prefix, { activityRatio: low.activityRatio, baselineRange: low.baselineRange, recentRange: low.recentRange, state: low.state });
  const room = direction === "NEUTRAL" ? null : patternRoomContext(input.bars, input.selectedTime, direction, input.protection, true);
  d.obstacle_room = room?.localDataStatus === "AVAILABLE" ? descriptor("obstacle_room", "DESCRIPTIVE", room.reason, prefix, { state: room.state, nearestDistance: room.structuralLevels[0]?.distance ?? null, technicalRisk: room.technicalRisk, structuralLevels: room.structuralLevels.length }) : descriptor("obstacle_room", "WITHHELD", room?.reason ?? "DIRECTIONAL_CONTEXT_REQUIRED", prefix);
  return { ...base, state: "DESCRIPTIVE", reason: "CAUSAL_PREFIX_DESCRIPTORS_AVAILABLE", descriptors: d };
}

export const buildPdfSignalTranslation = translatePdfSignalConcepts;
