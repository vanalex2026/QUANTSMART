import { detectM5PriceAction, type M5PriceActionOptions, type M5PriceBar } from "./priceActionDetector.ts";
import type { PriceActionScanReply } from "./priceActionScan.ts";

// Keep the same exhaustive detector and chronology as the synchronous API.
// Only its scheduling changes; no truncation, approximation or order authority.
const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<{ bars: M5PriceBar[]; options: M5PriceActionOptions }>) => void;
  postMessage: (reply: PriceActionScanReply) => void;
};
scope.onmessage = ({ data }) => {
  try { scope.postMessage({ result: detectM5PriceAction(data.bars, data.options) }); }
  catch { scope.postMessage({ error: "PRICE_ACTION_SCAN_FAILED" }); }
};
