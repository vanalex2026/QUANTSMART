import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const audit = readJson("artifacts/wave8-pdf-all-signal-coverage-audit.json");
const map = readJson("docs/price_action_knowledge_map.json");
const detectorSource = readFileSync(new URL("mfe_ux_lab/cockpit/src/lib/priceActionDetector.ts", root), "utf8");

const detectorBlock = detectorSource.match(/const CONCEPTS[\s\S]*?;\s*export const PRICE_ACTION_DETECTOR_CONCEPT_COUNT/);
assert.ok(detectorBlock, "detector concept registry must remain statically inspectable");
const detectorIds = [...detectorBlock[0].matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);
const mapIds = map.concepts.map((concept) => concept.id);
const sourceIds = map.concepts.filter((concept) => concept.implementation === "SOURCE_NOTES").map((concept) => concept.id);
const proxyIds = map.concepts.filter((concept) => concept.implementation === "GEOMETRY_PROXY").map((concept) => concept.id);

assert.equal(audit.result, "PASS");
assert.equal(audit.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(audit.implementation_change, false);
assert.equal(audit.detector_change, false);
assert.equal(audit.boundaries.pdf_ohlc_translation, false);
assert.equal(audit.boundaries.detector_promotion, false);
assert.equal(audit.boundaries.outcome_status, "WITHHELD");
assert.equal(audit.boundaries.future_rows, "WITHHELD");
assert.equal(audit.coverage.concept_count, 23);
assert.equal(mapIds.length, 23);
assert.deepEqual(new Set(audit.coverage.detector_geometry_proxy_ids), new Set(proxyIds));
assert.deepEqual(new Set(audit.coverage.source_note_ids), new Set(sourceIds));
assert.deepEqual(new Set(detectorIds), new Set(proxyIds));
assert.equal(new Set(detectorIds).size, detectorIds.length);

const safe = audit.safe_closed_ohlc_descriptors.map((entry) => entry.id);
const external = audit.externally_labelled_or_unavailable.map((entry) => entry.id);
assert.deepEqual(new Set(safe), new Set([
  "signal_entry_bar",
  "resistance_exit",
  "trade_selection_failure",
  "consecutive_review",
  "low_volatility",
  "obstacle_room",
]));
assert.deepEqual(new Set(external), new Set(["bracket_costs", "news_exit", "reversal_exit", "position_sizing"]));
assert.equal(new Set([...safe, ...external]).size, 10);
assert.deepEqual(new Set([...safe, ...external]), new Set(sourceIds));

for (const entry of [...audit.safe_closed_ohlc_descriptors, ...audit.externally_labelled_or_unavailable]) {
  assert.ok(entry.id && entry.name, "every source-note coverage row needs an identity");
}
for (const row of audit.concept_matrix) {
  assert.ok(mapIds.includes(row.id), `${row.id} must exist in the 23-concept map`);
  assert.equal(row.implementation, map.concepts.find((concept) => concept.id === row.id).implementation);
}
assert.equal(audit.concept_matrix.length, 23);

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalTranslation.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
assert.deepEqual([...api.PDF_SOURCE_NOTE_CONCEPTS], sourceIds);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 100 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 100 + index * 0.02,
  h: 101 + index * 0.02,
  l: 99 + index * 0.02,
  c: 100.5 + index * 0.02,
  closed: true,
}));
const selectedTime = bars.at(-1).t;
const result = api.translatePdfSignalConcepts({
  bars,
  selectedTime,
  direction: "UP",
  protection: 98,
  nowMs: epoch + 101 * 300_000,
});
assert.equal(result.symbol, "XAUUSD");
assert.equal(result.timeframe, "M5");
assert.equal(result.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
for (const id of safe) {
  assert.equal(result.descriptors[id].state, "DESCRIPTIVE", `${id} should be a local descriptive receipt`);
  assert.equal(result.descriptors[id].dataStatus, "AVAILABLE");
}
for (const id of external) {
  assert.ok(["UNAVAILABLE", "WITHHELD"].includes(result.descriptors[id].state), `${id} must fail closed without external input`);
  assert.equal(result.descriptors[id].dataStatus, "UNAVAILABLE");
}
for (const descriptor of Object.values(result.descriptors)) {
  assert.equal(descriptor.sourceStatus, "SOURCE_REVIEW_ONLY");
  assert.equal(descriptor.outcomeStatus, "WITHHELD");
  assert.equal(descriptor.causalPrefix.futureRows, "WITHHELD");
  assert.equal(descriptor.live_apply_allowed, false);
}

const malformed = api.translatePdfSignalConcepts({
  bars: bars.map((bar, index) => index === 50 ? { ...bar, closed: false } : bar),
  selectedTime,
  direction: "UP",
  nowMs: epoch + 101 * 300_000,
});
assert.equal(malformed.reason, "INVALID_CAUSAL_PREFIX");
for (const descriptor of Object.values(malformed.descriptors)) assert.equal(descriptor.dataStatus, "UNAVAILABLE");

console.log("WAVE 8 PDF ALL-SIGNAL COVERAGE PASS: 13 detector proxies and 10 source notes are reconciled, with six closed-OHLC descriptive receipts and four external-input gates.");
