import { measurePdfSignalStatistics } from "./pdfSignalStatistics.ts";
import type { M5PriceBar } from "./priceActionDetector.ts";
import type { PdfSignalStatisticsProgress } from "./pdfSignalStatistics.ts";

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<{ bars: M5PriceBar[]; nowMs?: number }>) => void;
  postMessage: (reply: { result: ReturnType<typeof measurePdfSignalStatistics> } | { error: string } | { progress: PdfSignalStatisticsProgress }) => void;
};

scope.onmessage = ({ data }) => {
  try {
    // The statistics result carries the explicit warm-up, terminal and
    // denominator accounting fields through the worker boundary unchanged.
    const result = measurePdfSignalStatistics(data.bars, data.nowMs, {
      symbol: "XAUUSD",
      timeframe: "M5",
      onProgress: (progress) => scope.postMessage({ progress }),
    });
    scope.postMessage({ result });
  }
  catch { scope.postMessage({ error: "PDF_SIGNAL_STATISTICS_FAILED" }); }
};
