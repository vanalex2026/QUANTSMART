import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(`${root}/${path}`, "utf8"));
const receipt = readJson("artifacts/real-xauusd-m5-pdf-signal-verification.json");
const audit = readJson("artifacts/session47-pdf-concept-matrix-reconciliation-audit.json");
const map = readJson("docs/price_action_knowledge_map.json");
const authority = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false";
const directions = ["DOWN", "NEUTRAL", "UP"];
const stateValues = new Set(["DETECTED", "ABSTAIN", "UNAVAILABLE", "WITHHELD"]);
const conceptIds = map.concepts.map((concept) => concept.id);
const conceptSet = new Set(conceptIds);
const exactKeys = (value, expected) => assert.deepEqual(Object.keys(value).sort(), [...expected].sort());

assert.equal(audit.result, "PASS");
assert.match(receipt.retrieved_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
assert.equal(receipt.symbol, "XAUUSD");
assert.equal(receipt.timeframe, "M5");
assert.equal(receipt.authority, authority);
assert.equal(receipt.outcomes, "WITHHELD");
assert.equal(receipt.concept_count, conceptIds.length);
assert.equal(receipt.observation_count, conceptIds.length);
assert.equal(new Set(conceptIds).size, 23);
exactKeys(receipt.concept_state_matrix, conceptIds);
exactKeys(receipt.directional_cases, directions);

for (const direction of directions) {
  const row = receipt.directional_cases[direction];
  exactKeys(row.states, conceptIds);
  const sourceIds = map.concepts.filter((concept) => concept.implementation === "SOURCE_NOTES").map((concept) => concept.id);
  exactKeys(row.source_note_states, sourceIds);
  assert.equal(row.counts.total, conceptIds.length);
  assert.equal(row.counts.detected + row.counts.abstain + row.counts.unavailable + row.counts.withheld, conceptIds.length);
  assert.deepEqual(
    row.detected_concepts,
    conceptIds.filter((conceptId) => row.states[conceptId] === "DETECTED"),
    `${direction} detected_concepts must match its state rows`,
  );
  for (const conceptId of conceptIds) {
    assert.ok(stateValues.has(row.states[conceptId]), `${direction}/${conceptId} has an invalid state`);
    assert.equal(receipt.concept_state_matrix[conceptId][direction], row.states[conceptId]);
  }
  for (const conceptId of sourceIds) {
    const descriptor = row.source_note_states[conceptId];
    assert.ok(["DESCRIPTIVE", "UNAVAILABLE", "WITHHELD"].includes(descriptor.state), `${direction}/${conceptId} has an invalid source state`);
    const observationState = descriptor.state === "DESCRIPTIVE" ? "DETECTED" : descriptor.state;
    assert.equal(row.states[conceptId], observationState, `${direction}/${conceptId} source state must map to its observation state`);
  }
}

assert.deepEqual(receipt.counts, receipt.directional_cases.NEUTRAL.counts);
assert.deepEqual(receipt.detected_concepts, receipt.directional_cases.NEUTRAL.detected_concepts);
const sourceConceptIds = map.concepts.filter((concept) => concept.implementation === "SOURCE_NOTES").map((concept) => concept.id);
exactKeys(receipt.source_note_states, sourceConceptIds);

const app = `${root}/mfe_ux_lab/cockpit`;
const require = createRequire(`${app}/package.json`);
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: 'export { ALL_PDF_SIGNAL_CONCEPT_IDS } from "./src/lib/pdfSignalDetector.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const detector = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
assert.deepEqual([...detector.ALL_PDF_SIGNAL_CONCEPT_IDS], conceptIds);

console.log("SESSION 47 PDF CONCEPT MATRIX RECONCILIATION PASS: the real XAUUSD receipt, knowledge map, detector IDs, directional states and neutral summary reconcile across all 23 concepts.");
