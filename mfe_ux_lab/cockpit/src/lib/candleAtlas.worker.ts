import { analyzeCandlePattern, type PatternBar, type PatternAnalysis } from "./candlePatternAtlas.ts";

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<{ bars: PatternBar[]; symbol: string; now: number }>) => void;
  postMessage: (reply: { result: PatternAnalysis } | { error: string }) => void;
};
scope.onmessage = ({ data }) => {
  try {
    scope.postMessage({ result: analyzeCandlePattern(data.bars, "M5", data.symbol, {
      adaptive: false, maxMatches: 60, now: data.now,
    }) });
  } catch { scope.postMessage({ error: "CANDLE_ATLAS_SCAN_FAILED" }); }
};
