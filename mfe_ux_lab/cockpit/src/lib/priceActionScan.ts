import type { M5PriceActionOptions, M5PriceActionResult, M5PriceBar } from "./priceActionDetector.ts";
import { startAnalysisWorker, type AnalysisWorker } from "./analysisWorkerTask.ts";

export type PriceActionScanReply = { result: M5PriceActionResult; error?: never } | { error: string; result?: never };
export type PriceActionScanWorker = AnalysisWorker;

/** A scan owns its worker. Cancelling invalidates even already queued replies. */
export function startPriceActionScan(
  bars: readonly M5PriceBar[], options: M5PriceActionOptions,
  createWorker: () => PriceActionScanWorker,
  onResult: (result: M5PriceActionResult) => void, onError: () => void,
): () => void {
  return startAnalysisWorker({ bars, options }, createWorker, onResult, onError);
}

/** Compare every detector input field; equal endpoints alone miss corrections. */
export function samePriceActionTape(a: readonly M5PriceBar[], b: readonly M5PriceBar[]): boolean {
  return a.length === b.length && a.every((bar, i) => {
    const other = b[i];
    return bar.t === other.t && Object.is(bar.o, other.o) && Object.is(bar.h, other.h)
      && Object.is(bar.l, other.l) && Object.is(bar.c, other.c) && bar.closed === other.closed;
  });
}
