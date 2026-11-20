import {
  detectM5PriceAction,
  type M5PriceActionOptions,
  type M5PriceBar,
  type PriceActionAssessment,
  type PriceActionDirection,
  type PriceActionMarker,
} from "./priceActionDetector.ts";
import {
  PDF_SOURCE_NOTE_CONCEPTS,
  translatePdfSignalConcepts,
  type PdfSignalTranslationInput,
  type PdfSignalTranslationDescriptor,
} from "./pdfSignalTranslation.ts";
import { detectSourceNoteSubset, type SourceNoteDetectorDescriptor } from "./sourceNoteDetectors.ts";
import { detectSourceNoteConcepts, type SourceNoteDetectorConceptId as PrefixConceptId } from "./sourceNotesDetectors.ts";

export const PDF_SIGNAL_DETECTOR_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;
export const PDF_SIGNAL_DETECTOR_VERSION = "pdf-signal-detector/1" as const;

export const ALL_PDF_SIGNAL_CONCEPT_IDS = [
  "double_pressure", "dominant_pressure", "support_resistance", "buildup",
  "false_break", "tease_break", "false_high_low", "pullback_reversal",
  "ceiling_test", "round_number", "signal_entry_bar", "pattern_break_combi",
  "bracket_costs", "news_exit", "resistance_exit", "reversal_exit",
  "trade_selection_failure", "consecutive_review", "position_sizing",
  "low_volatility", "pattern_break", "pattern_break_pullback", "obstacle_room",
] as const;
export type PdfSignalConceptId = typeof ALL_PDF_SIGNAL_CONCEPT_IDS[number];
export type PdfSignalObservationState = "DETECTED" | "ABSTAIN" | "UNAVAILABLE" | "WITHHELD";

export type PdfSignalObservation = {
  conceptId: PdfSignalConceptId;
  state: PdfSignalObservationState;
  direction: PriceActionDirection;
  i: number | null;
  time: string | null;
  reason: string;
  score: number;
  sourceStatus: "SOURCE_REVIEW_ONLY" | "DETECTOR_GEOMETRY";
  dataStatus: "AVAILABLE" | "UNAVAILABLE";
  outcomeStatus: "WITHHELD";
  geometry?: Record<string, number | string | boolean | null>;
};

export type PdfSignalDetectorInput = PdfSignalTranslationInput & {
  symbol?: string;
  timeframe?: string;
  /** Optional later closed boundary for identity-only exit observations. */
  observedThrough?: string;
  options?: M5PriceActionOptions;
  resistanceLevel?: number;
  reversalLevel?: number;
  calendar?: Parameters<typeof detectSourceNoteSubset>[0]["calendar"];
};

export type PdfSignalDetectorResult = {
  version: typeof PDF_SIGNAL_DETECTOR_VERSION;
  ok: boolean;
  symbol: "XAUUSD";
  timeframe: "M5";
  asOf: string | null;
  state: "READY" | "ABSTAIN" | "WITHHELD";
  reason: string;
  observations: PdfSignalObservation[];
  markers: PriceActionMarker[];
  sourceNoteDescriptors: Record<typeof PDF_SOURCE_NOTE_CONCEPTS[number], PdfSignalTranslationDescriptor>;
  counts: {
    total: number;
    detected: number;
    abstain: number;
    unavailable: number;
    withheld: number;
  };
  authority: typeof PDF_SIGNAL_DETECTOR_AUTHORITY;
  live_apply_allowed: false;
};

/** Match explicit UTC identities, including equivalent offset spellings. */
function m5Instant(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) && instant % 300_000 === 0 ? instant : null;
}

function canonicalBar(bar: M5PriceBar): M5PriceBar {
  const instant = m5Instant(bar?.t);
  return instant == null ? bar : { ...bar, t: new Date(instant).toISOString() };
}

function sourceNoteObservation(
  descriptor: PdfSignalTranslationDescriptor | SourceNoteDetectorDescriptor,
  selectedIndex: number,
  selectedTime: string | null,
): PdfSignalObservation {
  const geometry = "geometry" in descriptor ? descriptor.geometry : descriptor.observation;
  const direction = geometry.direction === "UP" || geometry.direction === "DOWN" ? geometry.direction : "NEUTRAL";
  const state: PdfSignalObservationState = descriptor.state === "DESCRIPTIVE" ? "DETECTED" : descriptor.state;
  return {
    conceptId: descriptor.conceptId,
    state,
    direction,
    i: selectedIndex >= 0 ? selectedIndex : null,
    time: selectedTime,
    reason: descriptor.reason,
    score: state === "DETECTED" ? 1 : 0,
    sourceStatus: "SOURCE_REVIEW_ONLY",
    dataStatus: descriptor.dataStatus,
    outcomeStatus: "WITHHELD",
    geometry,
  };
}

function geometryObservation(assessment: PriceActionAssessment, tapeAvailable: boolean): PdfSignalObservation {
  return {
    conceptId: assessment.conceptId,
    state: assessment.state,
    direction: assessment.direction,
    i: assessment.i,
    time: assessment.time,
    reason: assessment.reason,
    score: assessment.score,
    sourceStatus: "DETECTOR_GEOMETRY",
    // ABSTAIN means the valid closed tape had no qualifying geometry. It is
    // distinct from unavailable data caused by an invalid or insufficient tape.
    dataStatus: assessment.state === "DETECTED" || tapeAvailable ? "AVAILABLE" : "UNAVAILABLE",
    outcomeStatus: "WITHHELD",
  };
}

function sourceSubsetToTranslationDescriptor(
  descriptor: SourceNoteDetectorDescriptor,
): PdfSignalTranslationDescriptor {
  return {
    conceptId: descriptor.conceptId,
    state: descriptor.state,
    reason: descriptor.reason,
    sourcePages: descriptor.sourcePages,
    sourceStatus: descriptor.sourceStatus,
    dataStatus: descriptor.dataStatus,
    outcomeStatus: descriptor.outcomeStatus,
    outcomeReason: "SOURCE_OUTCOME_NOT_LABELLED",
    causalPrefix: {
      state: descriptor.causalPrefix.state,
      start: descriptor.causalPrefix.start,
      end: descriptor.causalPrefix.end,
      bars: descriptor.causalPrefix.bars,
      maxBars: descriptor.causalPrefix.maxBars,
      closedOnly: descriptor.causalPrefix.closedOnly,
      futureRows: descriptor.causalPrefix.futureRows,
    },
    geometry: descriptor.observation,
    authority: descriptor.authority,
    live_apply_allowed: descriptor.live_apply_allowed,
  };
}

/**
 * Evaluate every PDF concept against one closed XAUUSD M5 prefix.
 *
 * The existing detector owns the 13 local geometry concepts. The ten source
 * concepts are adapted through the bounded translation contract, so optional
 * calendar, bracket, sizing and event identities remain explicit inputs.
 */
export function detectAllPdfSignals(input: PdfSignalDetectorInput): PdfSignalDetectorResult {
  // The unified contract is specific to canonical XAUUSD M5 input. A caller
  // that supplies another symbol must not receive geometry from that tape.
  const invalidSymbol = input?.symbol !== undefined && input.symbol !== "XAUUSD";
  const invalidTimeframe = input?.timeframe !== undefined && input.timeframe !== "M5";
  const invalidIdentity = invalidSymbol || invalidTimeframe;
  const selectedTime = invalidIdentity ? "" : input?.selectedTime || "";
  const selectedInstant = m5Instant(selectedTime);
  const bars = invalidIdentity ? [] : Array.isArray(input?.bars) ? input.bars.map(canonicalBar) : [];
  const selectedMatches = selectedInstant == null
    ? []
    : bars.reduce<number[]>((matches, bar, index) => {
      if (m5Instant(bar?.t) === selectedInstant) matches.push(index);
      return matches;
    }, []);
  const selectedIndex = selectedMatches[0] ?? -1;
  const duplicateSelectedIdentity = selectedMatches.length > 1;
  // A detector result is always anchored to one selected closed candle. Do
  // not evaluate the tape's latest row when the requested identity is absent.
  const causalBars = selectedIndex >= 0 ? bars.slice(0, selectedIndex + 1) : [];
  const nowMs = input?.nowMs ?? Date.now();
  const geometryInput = causalBars.map((bar, index) => {
    const instant = Date.parse(bar.t);
    // Mark the selected prefix row as forming whenever its UTC identity is
    // duplicated, including equivalent `Z` and `.000Z` spellings.
    const duplicate = duplicateSelectedIdentity && index === causalBars.length - 1;
    return !duplicate && Number.isFinite(instant) && instant + 300_000 <= nowMs && bar.closed !== false
      ? bar
      : { ...bar, closed: false };
  });
  const geometry = detectM5PriceAction(geometryInput, { ...(input?.options || {}), symbol: "XAUUSD" });
  const translation = translatePdfSignalConcepts({
    ...input,
    bars: duplicateSelectedIdentity ? geometryInput : causalBars,
    selectedTime,
    enabled: input?.enabled,
  });
  const subset = detectSourceNoteSubset({
    bars: duplicateSelectedIdentity || input?.observedThrough ? bars : causalBars,
    selectedTime,
    observedThrough: input?.observedThrough,
    direction: input?.direction,
    protection: input?.protection,
    resistanceLevel: input?.resistanceLevel,
    reversalLevel: input?.reversalLevel,
    calendar: input?.calendar ?? (input?.newsEvent ? {
      status: "CONFIGURED" as const,
      source: input.newsEvent.source,
      updated_at: (() => { const instant = m5Instant(input.newsEvent.atUtc); return instant == null ? input.newsEvent.atUtc : new Date(instant).toISOString(); })(),
      events: [{ title: input.newsEvent.title, at_utc: (() => { const instant = m5Instant(input.newsEvent.atUtc); return instant == null ? input.newsEvent.atUtc : new Date(instant).toISOString(); })() }],
    } : undefined),
    bracket: input?.bracket,
    enabled: input?.enabled,
    nowMs,
  });
  const prefix = detectSourceNoteConcepts({
    bars: duplicateSelectedIdentity ? geometryInput : causalBars,
    selectedTime,
    enabled: input?.enabled,
    nowMs,
  });
  const observations: PdfSignalObservation[] = geometry.assessments.map((assessment) => geometryObservation(assessment, geometry.ok));
  const causalSelectedIndex = causalBars.length ? causalBars.length - 1 : -1;
  const selectedBarTime = causalSelectedIndex < 0 ? null : causalBars[causalSelectedIndex].t;
  const sourceNoteDescriptors = {} as Record<typeof PDF_SOURCE_NOTE_CONCEPTS[number], PdfSignalTranslationDescriptor>;
  for (const id of PDF_SOURCE_NOTE_CONCEPTS) {
    const translated = translation.descriptors[id];
    const subsetDescriptor = id !== "position_sizing" && id in subset.descriptors
      ? sourceSubsetToTranslationDescriptor(subset.descriptors[id as keyof typeof subset.descriptors])
      : null;
    // Prefer validated event/context identities when they are available. If
    // an optional identity is absent, retain a bounded local closed-OHLC
    // descriptor instead of hiding a safe translation behind UNAVAILABLE.
    const descriptor = id === "reversal_exit" && input?.reversalEvent
      ? translated
      : id === "signal_entry_bar" || id === "consecutive_review"
      ? prefix.descriptors[id as PrefixConceptId]
      : subsetDescriptor?.state === "DESCRIPTIVE" || translated.state !== "DESCRIPTIVE"
        ? subsetDescriptor || translated
        : translated;
    sourceNoteDescriptors[id] = descriptor;
    observations.push(sourceNoteObservation(descriptor, causalSelectedIndex, selectedBarTime));
  }
  // Disabled evaluation is an evidence boundary. Geometry must not leak a
  // DETECTED/ABSTAIN state while the unified result is WITHHELD.
  const finalObservations = input?.enabled === false
    ? observations.map((observation) => ({ ...observation, state: "WITHHELD" as const, i: null, time: null, score: 0, dataStatus: "UNAVAILABLE" as const }))
    : observations;
  const counts = finalObservations.reduce((result, observation) => {
    if (observation.state === "DETECTED") result.detected++;
    else if (observation.state === "ABSTAIN") result.abstain++;
    else if (observation.state === "UNAVAILABLE") result.unavailable++;
    else result.withheld++;
    return result;
  }, { total: observations.length, detected: 0, abstain: 0, unavailable: 0, withheld: 0 });
  const state = input?.enabled === false ? "WITHHELD" : counts.detected > 0 ? "READY" : "ABSTAIN";
  return {
    version: PDF_SIGNAL_DETECTOR_VERSION,
    ok: input?.enabled !== false && geometry.ok && translation.symbol === "XAUUSD",
    symbol: "XAUUSD",
    timeframe: "M5",
    asOf: geometry.asOf,
    state,
    reason: invalidSymbol ? "INVALID_XAUUSD_SYMBOL" : invalidTimeframe ? "INVALID_XAUUSD_TIMEFRAME" : state === "READY" ? "PDF_CONCEPTS_EVALUATED_ON_CLOSED_XAUUSD_M5" : translation.reason,
    observations: finalObservations,
    markers: geometry.markers,
    sourceNoteDescriptors,
    counts,
    authority: PDF_SIGNAL_DETECTOR_AUTHORITY,
    live_apply_allowed: false,
  };
}

export const detectPdfSignals = detectAllPdfSignals;
