import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adapter = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/mt5DemoAdapter.ts", import.meta.url), "utf8");
const focused = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
// The focused surface now owns the only reachable M5 history UI. Keep the
// coverage contract on the shared adapter and its focused diagnostics rather
// than pinning it to the removed standalone Pattern Atlas page.
assert.match(adapter, /failedChunks\?: Mt5HistoryChunkProvenance\[\]/);
assert.match(adapter, /failedChunks: failedChunks\.length/);
assert.match(adapter, /coverageRatio/);
assert.match(adapter, /provenanceSummary: Mt5HistoryProvenanceSummary/);
assert.match(adapter, /completeChunks: coverageRanges\.filter/);
assert.match(adapter, /returnedBarsTotal/);
assert.match(adapter, /cacheHits/);
assert.match(adapter, /cacheMisses/);
assert.match(adapter, /HISTORY_ACCOUNT_CHANGED/);
assert.match(adapter, /FORMING_BAR_INCLUDED/);
assert.match(adapter, /INVALID_CLOSED_BAR/);
assert.match(adapter, /BRIDGE_OFFLINE/);
assert.match(adapter, /HISTORY_PARTIAL_CHUNKS/);
assert.match(focused, /verifiedHistoryDiagnostics\.coverage/);
assert.match(focused, /verifiedHistoryDiagnostics\.chunks/);
assert.match(focused, /Incomplete broker history falls back to the labelled local snapshot/);
console.log("FOCUSED MT5 HISTORY COVERAGE PASS: failed chunks and assembled coverage remain observable.");

