import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: ["src/lib/focusedSnapshot.ts"],
  absWorkingDir: app,
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const snapshot = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

assert.equal(snapshot.focusedSnapshotTimestampsEqual("2026-01-02T03:04:05Z", "2026-01-02T03:04:05+00:00"), true,
  "snapshot resume must treat equivalent UTC timestamp spellings as the same bar");
assert.equal(snapshot.focusedSnapshotTimestampsEqual("2026-01-02T03:04:05Z", "2026-01-02T03:04:06Z"), false,
  "snapshot resume must keep distinct historical instants separate");
assert.equal(snapshot.focusedSnapshotTimestampsEqual("not-a-time", "not-a-time"), true,
  "identical opaque strings remain equal for legacy occurrence records");
const valid = {
  schema: snapshot.FOCUSED_SNAPSHOT_SCHEMA,
  symbol: "XAUUSD",
  timeframe: "M5",
  knowledge_map_provenance: {
    schema: snapshot.FOCUSED_KNOWLEDGE_MAP_SCHEMA,
    source_sha256: snapshot.FOCUSED_KNOWLEDGE_SOURCE_SHA256,
  },
  inspection: {
    viewport_start_time: "2026-01-02T03:04:05Z",
    viewport_end_time: "2026-01-02T04:04:05Z",
    analogue_match_index: 2,
    analogue_match_time: "2026-01-02T05:04:05Z",
    analogue_pattern_filter: "HAMMER",
  },
  drawings: [{ kind: "hline", a: { i: 2, p: 2000, t: "2026-01-02T03:04:05Z" }, b: { i: 2, p: 2000, t: "2026-01-02T03:04:05Z" }, color: "#fff" }],
};
assert.equal(snapshot.parseFocusedSnapshot(valid).ok, true,
  "durable snapshots must accept the indexed PDF knowledge-map attestation");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, drawings: [{ kind: "hline", a: { i: 2, p: 2000, t: "2026-01-02T03:04:05" }, b: { i: 2, p: 2000, t: "2026-01-02T03:04:05" }, color: "#fff" }] }).ok, false,
  "drawing anchors must reject timezone-less timestamps whose meaning changes by machine");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, drawings: [{ kind: "hline", a: { i: 2, p: 2000, t: new Date(Date.now() + 86_400_000).toISOString() }, b: { i: 2, p: 2000, t: new Date(Date.now() + 86_400_000).toISOString() }, color: "#fff" }] }).ok, false,
  "drawing anchors must reject timestamps from the future");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, drawings: [{ kind: "hline", a: { i: 2, p: 2000, t: "2026-01-02T03:04:05+00:00" }, b: { i: 2, p: 2000, t: "2026-01-02T03:04:05+00:00" }, color: "#fff" }] }).ok, true,
  "schema-1 drawings must preserve equivalent offset timestamp spellings");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, authority: snapshot.FOCUSED_SNAPSHOT_AUTHORITY }).ok, true,
  "durable snapshots must preserve the explicit research-only authority attestation");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, authority: "LIVE_APPLY" }).ok, false,
  "durable snapshots must reject any authority that could grant live execution rights");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: "double_pressure", knowledge_map_provenance: { ...valid.knowledge_map_provenance, source_title: "Understanding Price Action: Practical Analysis of the 5-Minute Time Frame", pdf_pages: 438 } }).ok, true,
  "durable snapshots must accept a selected concept with complete indexed PDF provenance");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: "double_pressure", knowledge_map_provenance: { ...valid.knowledge_map_provenance, source_title: "Understanding Price Action: Practical Analysis of the 5-Minute Time Frame", pdf_pages: 438 }, selected_concept_knowledge: { id: "double_pressure", pages: [6, 7, 8] } }).ok, true,
  "durable snapshots must accept concept page anchors from the indexed PDF map");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: "double_pressure", knowledge_map_provenance: { ...valid.knowledge_map_provenance, source_title: "Understanding Price Action: Practical Analysis of the 5-Minute Time Frame", pdf_pages: 438 }, selected_concept_knowledge: { id: "double_pressure", pages: [6, 7, 8, 36, 38, 39] } }).ok, true,
  "durable snapshots must accept the complete current concept anchor set");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: "double_pressure", knowledge_map_provenance: { ...valid.knowledge_map_provenance, source_title: "Understanding Price Action: Practical Analysis of the 5-Minute Time Frame", pdf_pages: 438 }, selected_concept_knowledge: { id: "double_pressure", pages: [8, 7] } }).ok, false,
  "durable snapshots must reject unsorted concept page anchors");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: "double_pressure", selected_concept_knowledge: { id: "double_pressure", pages: [6, 7, 99] } }).ok, false,
  "durable snapshots must reject tampered selected-concept PDF page anchors");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: "double_pressure", selected_concept_knowledge: { id: "dominant_pressure", pages: [6, 7, 8] } }).ok, false,
  "durable snapshots must reject selected-concept knowledge from another concept");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: "double_pressure", knowledge_map_provenance: { ...valid.knowledge_map_provenance, source_title: "Understanding Price Action: Practical Analysis of the 5-Minute Time Frame", pdf_pages: 438 } }).ok, true,
  "legacy schema-1 snapshots without a selected-concept knowledge payload remain readable");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: "double_pressure", knowledge_map_provenance: { ...valid.knowledge_map_provenance, source_title: "Understanding Price Action: Practical Analysis of the 5-Minute Time Frame" } }).ok, false,
  "selected concepts must reject provenance that omits the indexed PDF page count");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: "double_pressure", knowledge_map_provenance: undefined }).ok, false,
  "durable snapshots must require provenance when restoring a selected knowledge concept");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: "made_up_concept" }).ok, false,
  "durable snapshots must reject a selected concept outside the indexed PDF map");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, selected_concept: 42 }).ok, false,
  "durable snapshots must reject malformed selected concept values");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, knowledge_map_provenance: { ...valid.knowledge_map_provenance, source_sha256: "0".repeat(64) } }).ok, false,
  "durable snapshots must reject a source hash from another PDF revision");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, knowledge_map_provenance: { ...valid.knowledge_map_provenance, schema: "quantsmart.price-action-knowledge-map/999" } }).ok, false,
  "durable snapshots must reject an unsupported knowledge-map schema");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, knowledge_map_provenance: { ...valid.knowledge_map_provenance, source_title: "A different source" } }).ok, false,
  "durable snapshots must reject provenance from a different source title");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, knowledge_map_provenance: { ...valid.knowledge_map_provenance, pdf_pages: 1 } }).ok, false,
  "durable snapshots must reject provenance with a mismatched PDF page count");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, inspection: { viewport_start_time: "not-a-time" } }).ok, false,
  "durable snapshots must reject an invalid viewport timestamp");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, inspection: { chart_focus_time: "2026-01-02T03:04:05" } }).ok, false,
  "durable snapshots must reject timezone-less chart focus identities");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, inspection: { viewport_start_time: "2026-02-30T03:04:05Z" } }).ok, false,
  "durable snapshots must reject impossible calendar dates instead of Date.parse normalization");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, latest_closed_bar_time: new Date(Date.now() + 86_400_000).toISOString() }).ok, false,
  "durable snapshots must reject future latest-bar identities");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, forecast_freshness: { ok: true, latest_closed_bar_utc: "2026-01-02T03:04:05", age_ms: 1, max_age_ms: 10, reason: "fresh" } }).ok, false,
  "durable snapshots must reject timezone-less forecast freshness identities");
const timestampReceipts = {
  chart_focus_time: (time) => ({ inspection: { chart_focus_time: time } }),
  viewport_start_time: (time) => ({ inspection: { viewport_start_time: time } }),
  viewport_end_time: (time) => ({ inspection: { viewport_end_time: time } }),
  analogue_match_time: (time) => ({ inspection: { analogue_match_time: time } }),
  latest_closed_bar_time: (time) => ({ latest_closed_bar_time: time }),
  forecast_freshness: (time) => ({ forecast_freshness: { ok: true, latest_closed_bar_utc: time, age_ms: 1, max_age_ms: 10, reason: "fresh" } }),
  named_candle_focus: (time) => ({ inspection: { named_candle_focus: { pattern: "HAMMER", time } } }),
  drawing_anchor: (time) => ({ drawings: [{ kind: "hline", a: { i: 2, p: 2000, t: time }, b: { i: 2, p: 2000, t: time }, color: "#fff" }] }),
};
for (const [field, receipt] of Object.entries(timestampReceipts)) {
  for (const time of ["2026-01-02T03:05:00", "2026-02-30T03:05:00Z", "2026-01-02T24:00:00Z", new Date(Date.now() + 86_400_000).toISOString()]) {
    assert.equal(snapshot.parseFocusedSnapshot({ ...valid, ...receipt(time) }).ok, false,
      `${field} must reject ambiguous, impossible or future candle identities: ${time}`);
  }
  for (const time of ["2026-01-02T03:05:00Z", "2026-01-02T03:05:00+00:00", "2026-01-02T11:05:00+08:00", "2024-02-29T03:05:00.000Z"]) {
    assert.equal(snapshot.parseFocusedSnapshot({ ...valid, ...receipt(time) }).ok, true,
      `${field} must preserve schema-1 explicit timezone and valid leap-day identities: ${time}`);
  }
}
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, inspection: { analogue_match_time: "not-a-time" } }).ok, false,
  "durable snapshots must reject an invalid causal analogue endpoint timestamp");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, inspection: { analogue_match_index: -1 } }).ok, false,
  "durable snapshots must reject a negative causal analogue ordinal");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, inspection: { analogue_pattern_filter: "   " } }).ok, false,
  "durable snapshots must reject an empty named-pattern filter");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, inspection: { analogue_pattern_filter: "HAMMER" } }).ok, true,
  "durable snapshots must preserve a named-pattern filter");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, inspection: { analogue_pattern_filter: "MADE_UP_PATTERN" } }).ok, false,
  "durable snapshots must reject a named-pattern filter outside the Atlas registry");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, inspection: { analogue_family_filter: "TWO_CANDLE" } }).ok, true,
  "durable snapshots must preserve a named-pattern family filter");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, inspection: { analogue_family_filter: "MADE_UP_FAMILY" } }).ok, false,
  "durable snapshots must reject a family filter outside the named-candle taxonomy");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, drawings: [{ kind: "unknown", a: { i: 1, p: 1 }, b: { i: 1, p: 1 }, color: "#fff" }] }).ok, false,
  "durable snapshots must reject unknown drawing kinds");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, drawings: [{ kind: "brush", a: { i: 1, p: 1 }, b: { i: 1, p: 1 }, color: "#fff", pts: "bad" }] }).ok, false,
  "durable snapshots must reject malformed brush point arrays");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, drawings: [{ kind: "hline", a: { i: -1, p: 1 }, b: { i: 1, p: 1 }, color: "#fff" }] }).ok, false,
  "durable snapshots must reject negative drawing indices");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, drawings: new Array(1) }).ok, false,
  "object imports must reject sparse drawing arrays before chart geometry sees a hole");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, drawings: [{ ...valid.drawings[0], kind: "brush", pts: new Array(1) }] }).ok, false,
  "object imports must reject sparse brush geometry");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, drawings: Array.from({ length: 201 }, () => valid.drawings[0]) }).ok, false,
  "object imports must enforce the drawing count before walking geometry");
assert.equal(snapshot.parseFocusedSnapshot({ ...valid, drawings: [{ ...valid.drawings[0], kind: "brush", pts: new Array(10_001).fill({ i: 1, p: 1 }) }] }).ok, false,
  "object imports must enforce the brush point limit");
assert.equal(snapshot.parseFocusedSnapshot(" ".repeat(8 * 1024 * 1024 + 1)).ok, false,
  "oversized JSON imports must fail before JSON parsing");
console.log("FOCUSED M5 SNAPSHOT INTEGRITY PASS: timestamp-equivalent focus and occurrence records resume correctly.");
