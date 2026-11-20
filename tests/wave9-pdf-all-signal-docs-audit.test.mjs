import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const readJson = (path) => JSON.parse(read(path));
const audit = readJson("artifacts/wave9-pdf-all-signal-docs-audit.json");
const projectStatus = read("docs/PROJECT_STATUS.md");
const sessionState = read("docs/AI_SESSION_STATE.md");
const map = readJson("docs/price_action_knowledge_map.json");
const runner = read("scripts/test.mjs");

const authority = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false";
const sessionHeading = "Session 36 PDF all-signal XAUUSD translation wave (2026-11-19)";
const boundaryPhrases = [
  "SOURCE_REVIEW_ONLY",
  "future-row withholding",
  "withheld outcomes",
  authority,
  "PDF narrative",
  "source label",
  "measured outcomes",
  "fills",
  "orders",
  "execution authority",
];

assert.equal(audit.result, "PASS");
assert.equal(audit.surface.symbol, "XAUUSD");
assert.equal(audit.surface.timeframe, "M5");
assert.equal(audit.surface.concept_count, 23);
assert.equal(audit.surface.detector_geometry_proxy_count, 13);
assert.equal(audit.surface.source_note_count, 10);
assert.equal(audit.boundaries.authority, authority);
assert.equal(audit.boundaries.source_status, "SOURCE_REVIEW_ONLY");
assert.equal(audit.boundaries.outcome_status, "WITHHELD");
assert.equal(audit.boundaries.future_rows, "WITHHELD");
assert.equal(audit.boundaries.pdf_ohlc_translation, false);
assert.equal(audit.boundaries.source_label_inference, false);
assert.equal(audit.boundaries.measured_rate_claim, false);
assert.equal(audit.boundaries.detector_promotion, false);
assert.equal(audit.implementation_change, false);
assert.equal(audit.detector_change, false);

assert.match(projectStatus, new RegExp(sessionHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(sessionState, new RegExp(sessionHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
for (const phrase of boundaryPhrases) {
  assert.ok(projectStatus.includes(phrase), `PROJECT_STATUS.md must retain ${phrase}`);
  assert.ok(sessionState.includes(phrase), `AI_SESSION_STATE.md must retain ${phrase}`);
}
assert.match(projectStatus, /all 23 PDF concepts/);
assert.match(sessionState, /all 23 PDF concepts/);
assert.match(projectStatus, /23-concept (?:status )?count/);
assert.match(sessionState, /23-concept (?:status )?count/);

const mapIds = map.concepts.map((concept) => concept.id);
const mapGeometry = map.concepts.filter((concept) => concept.implementation === "GEOMETRY_PROXY").map((concept) => concept.id);
const mapSourceNotes = map.concepts.filter((concept) => concept.implementation === "SOURCE_NOTES").map((concept) => concept.id);
assert.equal(mapIds.length, 23);
assert.equal(mapGeometry.length, 13);
assert.equal(mapSourceNotes.length, 10);
assert.deepEqual(new Set(audit.concepts.geometry_proxy_ids), new Set(mapGeometry));
assert.deepEqual(new Set(audit.concepts.source_note_ids), new Set(mapSourceNotes));
assert.equal(new Set([...audit.concepts.geometry_proxy_ids, ...audit.concepts.source_note_ids]).size, 23);

for (const path of [...audit.receipts.artifacts, ...audit.receipts.tests]) {
  assert.ok(existsSync(new URL(path, root)), `${path} must exist`);
}
for (const path of audit.receipts.artifacts) {
  const receipt = readJson(path);
  assert.equal(receipt.result, "PASS", `${path} must be a passing receipt`);
  assert.ok(receipt.authority === authority || receipt.boundaries?.authority === authority, `${path} must preserve authority`);
}

const registration = audit.receipts.unit_registration;
const registeredOnce = (name) => (runner.match(new RegExp("['\"]" + name + "['\"]", "g")) || []).length;
assert.equal(registeredOnce(registration), 1, `${registration} must be registered once`);
assert.equal(registeredOnce("wave8-pdf-all-signal-detector"), 1);
assert.equal(registeredOnce("wave8-pdf-all-signal-coverage-audit"), 1);

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url))("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
assert.deepEqual([...api.ALL_PDF_SIGNAL_CONCEPT_IDS], mapIds);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 100 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const result = api.detectAllPdfSignals({
  bars,
  selectedTime: bars.at(-1).t,
  direction: "UP",
  protection: 1998,
  nowMs: epoch + 101 * 300_000,
});
assert.equal(result.counts.total, 23);
assert.equal(result.observations.length, 23);
assert.equal(result.authority, authority);
assert.equal(result.live_apply_allowed, false);
for (const observation of result.observations) assert.equal(observation.outcomeStatus, "WITHHELD");
for (const descriptor of Object.values(result.sourceNoteDescriptors)) {
  assert.equal(descriptor.sourceStatus, "SOURCE_REVIEW_ONLY");
  assert.equal(descriptor.outcomeStatus, "WITHHELD");
  assert.equal(descriptor.causalPrefix.futureRows, "WITHHELD");
  assert.equal(descriptor.live_apply_allowed, false);
}

console.log("WAVE 9 PDF ALL-SIGNAL DOCS AUDIT PASS: Session 36 documentation, 23-concept reconciliation, receipts, authority boundaries and unit registration are verified.");
