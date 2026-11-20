import {
  ALL_PDF_SIGNAL_CONCEPT_IDS,
  detectAllPdfSignals,
  type PdfSignalConceptId,
  type PdfSignalObservationState,
} from "./pdfSignalDetector.ts";
import { PDF_SOURCE_NOTE_CONCEPTS } from "./pdfSignalTranslation.ts";
import type { M5PriceBar } from "./priceActionDetector.ts";

export const PDF_SIGNAL_STATISTICS_VERSION = "pdf-signal-statistics/1" as const;
export const PDF_SIGNAL_STATISTICS_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;
export const PDF_SIGNAL_STATISTICS_DENOMINATOR_EQUATION = "evaluated = DETECTED + ABSTAIN" as const;
export const PDF_SIGNAL_STATISTICS_ROW_ACCOUNTING_EQUATION = "bars = warmupRows + evaluatedRows + skippedRows + terminalRowsWithoutH1" as const;

export type PdfSignalStatistic = {
  conceptId: PdfSignalConceptId;
  sourceStatus: "SOURCE_REVIEW_ONLY" | "DETECTOR_GEOMETRY";
  evaluated: number;
  occurrences: number;
  skipped: number;
  detectionRate: number | null;
  stateCounts: Record<PdfSignalObservationState, number>;
  directionCounts: { up: number; down: number; neutral: number };
  h1Direction?: { up: number; down: number; flat: number; evaluated: number };
  denominatorEquation: typeof PDF_SIGNAL_STATISTICS_DENOMINATOR_EQUATION;
  firstOccurrence: string | null;
  lastOccurrence: string | null;
  lastReason: string | null;
};

export type PdfSignalStatisticsResult = {
  version: typeof PDF_SIGNAL_STATISTICS_VERSION;
  symbol: "XAUUSD";
  timeframe: "M5";
  state: "READY" | "UNAVAILABLE" | "WITHHELD";
  reason: string;
  invalidBar?: { row: number; time: string | null; cause: TapeIssue };
  bars: number;
  evaluatedRows: number;
  skippedRows: number;
  warmupRows: number;
  terminalRowsWithoutH1: number;
  denominatorEquation: typeof PDF_SIGNAL_STATISTICS_DENOMINATOR_EQUATION;
  rowAccountingEquation: typeof PDF_SIGNAL_STATISTICS_ROW_ACCOUNTING_EQUATION;
  asOf: string | null;
  statistics: Record<PdfSignalConceptId, PdfSignalStatistic>;
  authority: typeof PDF_SIGNAL_STATISTICS_AUTHORITY;
  live_apply_allowed: false;
};
export type PdfSignalStatisticsProgress = {
  processedRows: number;
  totalRows: number;
  evaluatedRows: number;
  skippedRows: number;
};
export type PdfSignalStatisticsOptions = {
  symbol?: string;
  timeframe?: string;
  onProgress?: (progress: PdfSignalStatisticsProgress) => void;
};

type Mutable = Omit<PdfSignalStatistic, "detectionRate" | "h1Direction"> & {
  h1: { up: number; down: number; flat: number; evaluated: number };
};

const blank = (conceptId: PdfSignalConceptId): Mutable => ({
  conceptId,
  sourceStatus: PDF_SOURCE_NOTE_CONCEPTS.includes(conceptId as typeof PDF_SOURCE_NOTE_CONCEPTS[number]) ? "SOURCE_REVIEW_ONLY" : "DETECTOR_GEOMETRY",
  evaluated: 0,
  occurrences: 0,
  skipped: 0,
  stateCounts: { DETECTED: 0, ABSTAIN: 0, UNAVAILABLE: 0, WITHHELD: 0 },
  directionCounts: { up: 0, down: 0, neutral: 0 },
  h1: { up: 0, down: 0, flat: 0, evaluated: 0 },
  firstOccurrence: null,
  lastOccurrence: null,
  lastReason: null,
  denominatorEquation: PDF_SIGNAL_STATISTICS_DENOMINATOR_EQUATION,
});

function instant(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed % 300_000 === 0 ? parsed : null;
}

type TapeIssue = "timestamp" | "order" | "forming" | "prices" | "flat";

function tapeIssue(bar: M5PriceBar | undefined, time: number | null, previous: number, nowMs: number): TapeIssue | null {
  if (!bar || time == null) return "timestamp";
  if (time <= previous) return "order";
  if (time + 300_000 > nowMs || bar.closed === false) return "forming";
  if (![bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    || bar.h < Math.max(bar.o, bar.c) || bar.l > Math.min(bar.o, bar.c)) return "prices";
  return bar.h === bar.l ? "flat" : null;
}

function finalize(value: Mutable): PdfSignalStatistic {
  const denominator = value.evaluated;
  return {
    ...value,
    detectionRate: value.sourceStatus === "DETECTOR_GEOMETRY" && denominator
      ? Number((value.occurrences / denominator).toFixed(4))
      : null,
    h1Direction: value.sourceStatus === "DETECTOR_GEOMETRY" && value.h1.evaluated ? value.h1 : undefined,
    denominatorEquation: PDF_SIGNAL_STATISTICS_DENOMINATOR_EQUATION,
  };
}

function unavailable(
  statistics: Record<PdfSignalConceptId, Mutable>,
  reason: string,
  bars: number,
): PdfSignalStatisticsResult {
  return {
    version: PDF_SIGNAL_STATISTICS_VERSION,
    symbol: "XAUUSD",
    timeframe: "M5",
    state: "UNAVAILABLE",
    reason,
    bars,
    evaluatedRows: 0,
    skippedRows: 0,
    warmupRows: 0,
    terminalRowsWithoutH1: 0,
    denominatorEquation: PDF_SIGNAL_STATISTICS_DENOMINATOR_EQUATION,
    rowAccountingEquation: PDF_SIGNAL_STATISTICS_ROW_ACCOUNTING_EQUATION,
    asOf: null,
    statistics: Object.fromEntries(ALL_PDF_SIGNAL_CONCEPT_IDS.map((id) => [id, finalize(statistics[id])])) as Record<PdfSignalConceptId, PdfSignalStatistic>,
    authority: PDF_SIGNAL_STATISTICS_AUTHORITY,
    live_apply_allowed: false,
  };
}

/**
 * Count every PDF concept on a retained closed XAUUSD M5 tape. Each row is
 * evaluated only from its causal prefix. Source-note rows are descriptive
 * observations and never acquire source-qualified outcomes.
 */
export function measurePdfSignalStatistics(input: readonly M5PriceBar[], nowMs = Date.now(), options: PdfSignalStatisticsOptions = {}): PdfSignalStatisticsResult {
  const statistics = Object.fromEntries(ALL_PDF_SIGNAL_CONCEPT_IDS.map((id) => [id, blank(id)])) as Record<PdfSignalConceptId, Mutable>;
  if ((options.symbol != null && options.symbol !== "XAUUSD") || (options.timeframe != null && options.timeframe !== "M5")) {
    return unavailable(statistics, "INVALID_XAUUSD_M5_IDENTITY", input?.length ?? 0);
  }
  if (!Array.isArray(input) || !Number.isFinite(nowMs) || input.length < 2) {
    return unavailable(statistics, "INSUFFICIENT_CLOSED_XAUUSD_M5_TAPE", input?.length ?? 0);
  }
  const bars = input;
  let previous = -Infinity;
  for (let index = 0; index < bars.length; index++) {
    const bar = bars[index];
    const time = instant(bar?.t);
    const cause = tapeIssue(bar, time, previous, nowMs);
    if (cause || time == null) {
      return { ...unavailable(statistics, "INVALID_OR_FORMING_CLOSED_TAPE", bars.length),
        invalidBar: { row: index + 1, time: time == null ? null : new Date(time).toISOString(), cause: cause ?? "timestamp" } };
    }
    previous = time;
  }
  let evaluatedRows = 0;
  let skippedRows = 0;
  const totalRows = Math.max(0, bars.length - 9);
  const reportProgress = (processedRows: number) => {
    if (!options.onProgress || (processedRows < totalRows && processedRows % 256 !== 0)) return;
    options.onProgress({ processedRows, totalRows, evaluatedRows, skippedRows });
  };
  for (let i = 8; i < bars.length - 1; i++) {
    const current = bars[i];
    const next = bars[i + 1];
    const currentInstant = instant(current.t);
    const nextInstant = instant(next.t);
    if (currentInstant == null || nextInstant == null || nextInstant - currentInstant !== 300_000) {
      skippedRows++;
      ALL_PDF_SIGNAL_CONCEPT_IDS.forEach((id) => { statistics[id].skipped++; });
      reportProgress(i - 7);
      continue;
    }
    const prefix = bars.slice(Math.max(0, i - 95), i + 1);
    const result = detectAllPdfSignals({ bars: prefix, selectedTime: current.t, symbol: "XAUUSD", timeframe: "M5", enabled: true, nowMs });
    evaluatedRows++;
    const h1 = next.c > current.c ? "up" : next.c < current.c ? "down" : "flat";
    for (const observation of result.observations) {
      const row = statistics[observation.conceptId];
      row.sourceStatus = observation.sourceStatus;
      row.stateCounts[observation.state]++;
      row.lastReason = observation.reason;
      if (observation.state !== "DETECTED" && observation.state !== "ABSTAIN") continue;
      row.evaluated++;
      if (observation.state !== "DETECTED") continue;
      row.occurrences++;
      row.firstOccurrence ??= current.t;
      row.lastOccurrence = current.t;
      if (observation.direction === "UP") row.directionCounts.up++;
      else if (observation.direction === "DOWN") row.directionCounts.down++;
      else row.directionCounts.neutral++;
      if (row.sourceStatus === "DETECTOR_GEOMETRY") {
        row.h1.evaluated++;
        row.h1[h1]++;
      }
    }
    reportProgress(i - 7);
  }
  return {
    version: PDF_SIGNAL_STATISTICS_VERSION,
    symbol: "XAUUSD",
    timeframe: "M5",
    state: evaluatedRows ? "READY" : "UNAVAILABLE",
    reason: evaluatedRows ? "CAUSAL_ALL_CONCEPT_CENSUS_COMPLETE" : "NO_CONTIGUOUS_CLOSED_M5_ROWS",
    bars: bars.length,
    evaluatedRows,
    skippedRows,
    warmupRows: Math.min(8, bars.length),
    terminalRowsWithoutH1: bars.length > 8 ? 1 : 0,
    denominatorEquation: PDF_SIGNAL_STATISTICS_DENOMINATOR_EQUATION,
    rowAccountingEquation: PDF_SIGNAL_STATISTICS_ROW_ACCOUNTING_EQUATION,
    asOf: bars[bars.length - 1]?.t ?? null,
    statistics: Object.fromEntries(ALL_PDF_SIGNAL_CONCEPT_IDS.map((id) => [id, finalize(statistics[id])])) as Record<PdfSignalConceptId, PdfSignalStatistic>,
    authority: PDF_SIGNAL_STATISTICS_AUTHORITY,
    live_apply_allowed: false,
  };
}
