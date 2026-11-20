import { scanNamedCandleHistory } from "./namedCandleHistory.ts";
import type { NamedCandlePattern, PatternBar } from "./candlePatternAtlas.ts";

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<{ bars: PatternBar[]; pattern: NamedCandlePattern }>) => void;
  postMessage: (reply: { result: ReturnType<typeof scanNamedCandleHistory> } | { error: string }) => void;
};

scope.onmessage = ({ data }) => {
  try {
    scope.postMessage({ result: scanNamedCandleHistory(data.bars, data.pattern) });
  } catch {
    scope.postMessage({ error: "NAMED_CANDLE_HISTORY_SCAN_FAILED" });
  }
};
