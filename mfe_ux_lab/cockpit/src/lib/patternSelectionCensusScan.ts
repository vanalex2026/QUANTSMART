import type { AnalysisWorker } from "./analysisWorkerTask.ts";
import type { M5PriceBar, PriceActionConceptEvidence, PriceActionOccurrence } from "./priceActionDetector.ts";
import type { PatternContextSelectionCensus } from "./patternContextSelectionCensus.ts";
import { startAnalysisWorker } from "./analysisWorkerTask.ts";

/** The small, structured request sent to the isolated context-selection scan. */
export type PatternSelectionCensusRequest = {
  bars: readonly M5PriceBar[];
  occurrences: readonly PriceActionOccurrence[];
  conceptId: PriceActionConceptEvidence["conceptId"];
  nowMs: number;
};

export type PatternSelectionCensusReply =
  | { result: PatternContextSelectionCensus; error?: never }
  | { error: string; result?: never };

/**
 * Start one census job.  The returned function owns cancellation of the
 * worker and makes any already queued reply inert through startAnalysisWorker.
 */
export function startPatternSelectionCensusScan(
  request: PatternSelectionCensusRequest,
  createWorker: () => AnalysisWorker,
  onResult: (result: PatternContextSelectionCensus) => void,
  onError: () => void,
): () => void {
  return startAnalysisWorker(request, createWorker, onResult, onError);
}

/** Compare the complete closed-bar tape before reusing a census result. */
export function samePatternSelectionCensusTape(
  a: readonly M5PriceBar[],
  b: readonly M5PriceBar[],
): boolean {
  return a.length === b.length && a.every((bar, i) => {
    const other = b[i];
    return bar.t === other.t && Object.is(bar.o, other.o) && Object.is(bar.h, other.h)
      && Object.is(bar.l, other.l) && Object.is(bar.c, other.c) && bar.closed === other.closed;
  });
}
