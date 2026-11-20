import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const adapter = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/mt5DemoAdapter.ts", import.meta.url), "utf8");

// The compact history diagnostics must expose every provenance dimension. In
// particular, an omitted bridge marker is represented as UNATTESTED by the
// adapter and must remain visible to operators instead of being hidden behind
// a healthy-looking source count.
assert.match(adapter, /closedBarProvenanceCounts/);
assert.match(adapter, /timestampBasisCounts/);
assert.match(adapter, /serverTimezoneCounts/);
assert.match(adapter, /sourceCounts/);
assert.match(adapter, /UNATTESTED/);
assert.match(adapter, /oldestCacheAgeMs/);
assert.match(adapter, /newestCacheAgeMs/);
assert.match(source, /verifiedHistoryDiagnostics\.coverage/);
assert.match(source, /verifiedHistoryDiagnostics\.chunks/);
assert.match(source, /verifiedHistoryDiagnostics\.runtime/);
assert.match(source, /MT5 assembly/);
assert.match(source, /Cache \/ chunks/);
assert.match(source, /Runtime attestation/);
assert.match(source, /Bar contract/);
assert.match(source, /SHADOW_ONLY[^\\n]*NO_DECISION[^\\n]*live_apply_allowed=false/);

console.log("FOCUSED MT5 PROVENANCE UI PASS: closed-bar and timestamp attestations, including UNATTESTED buckets, remain observable.");



