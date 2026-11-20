import type { AnalysisWorker } from "./analysisWorkerTask.ts";
import type { NamedCandleHistory } from "./namedCandleHistory.ts";
import type { NamedCandlePattern, PatternBar } from "./candlePatternAtlas.ts";
import { startAnalysisWorker } from "./analysisWorkerTask.ts";

export type NamedCandleHistoryScanReply = { result: NamedCandleHistory; error?: never } | { error: string; result?: never };

/** A history scan owns its worker; cancelling invalidates queued replies. */
export function startNamedCandleHistoryScan(
  bars: readonly PatternBar[], pattern: NamedCandlePattern,
  createWorker: () => AnalysisWorker,
  onResult: (result: NamedCandleHistory) => void,
  onError: () => void,
): () => void {
  return startAnalysisWorker({ bars, pattern }, createWorker, onResult, onError);
}

/** Compare the full detector tape so corrections cannot reuse stale history. */
export function sameNamedCandleHistoryTape(a: readonly PatternBar[], b: readonly PatternBar[]): boolean {
  return a.length === b.length && a.every((bar, i) => {
    const other = b[i];
    return bar.t === other.t && Object.is(bar.o, other.o) && Object.is(bar.h, other.h)
      && Object.is(bar.l, other.l) && Object.is(bar.c, other.c) && bar.closed === other.closed;
  });
}
