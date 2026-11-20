import { patternContextSelectionCensus } from "./patternContextSelectionCensus.ts";
import type { M5PriceBar, PriceActionOccurrence } from "./priceActionDetector.ts";

type Request = {
  bars: M5PriceBar[];
  occurrences: PriceActionOccurrence[];
  conceptId: string;
  nowMs: number;
};

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<Request>) => void;
  postMessage: (reply: { result: ReturnType<typeof patternContextSelectionCensus> } | { error: string }) => void;
};

scope.onmessage = ({ data }) => {
  try {
    // The worker is deliberately descriptive: it computes existing retained
    // occurrence evidence and never creates detector occurrences or orders.
    scope.postMessage({
      result: patternContextSelectionCensus(data.bars, data.occurrences, data.conceptId, true, data.nowMs),
    });
  } catch {
    scope.postMessage({ error: "PATTERN_SELECTION_CENSUS_SCAN_FAILED" });
  }
};
