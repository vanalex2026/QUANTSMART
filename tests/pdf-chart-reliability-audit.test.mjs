import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readText = file => readFileSync(new URL(file, import.meta.url), "utf8");
const readJson = file => JSON.parse(readText(file));

const readme = readText("../README.md");
const map = readJson("../docs/price_action_knowledge_map.json");
const currentReceipt = readJson("../artifacts/session29-feature-wave-audit.json");
const fallbackReceipt = readJson("../artifacts/session26-browser-runtime-receipt.json");
const unavailableReceipt = readJson("../artifacts/session25-runtime-browser-evidence-audit.json");

assert.match(readme, /historical verified read-only runtime captured all gates passing/,
  "README must date the all-gates-passing forecast evidence");
assert.match(readme, /not a current live-market claim/,
  "README must prevent a historical forecast receipt from reading as current evidence");
assert.match(readme, /Current runtime evidence must come from a fresh receipt/,
  "README must require fresh runtime evidence");
assert.match(readme, /unavailable or unverified MT5 history keeps the forecast at `WAIT`/,
  "README must preserve fail-closed forecast wording");

for (const receipt of [currentReceipt, fallbackReceipt, unavailableReceipt]) {
  assert.equal(receipt.authority ?? receipt.provenance?.authority ?? receipt.sourceContracts?.authority,
    "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
}
assert.equal(fallbackReceipt.browser.liveMarketDataClaim, "none");
assert.equal(fallbackReceipt.browser.staleLiveClaimSuppressed, true);
assert.equal(unavailableReceipt.runtime.liveMarketDataClaim, "none");
assert.equal(unavailableReceipt.runtime.staleLiveClaimSuppressed, true);

const sourceOnly = map.concepts.filter(concept => concept.implementation === "SOURCE_NOTES");
assert.ok(sourceOnly.length > 0, "the knowledge map must retain source-only concepts");
for (const concept of sourceOnly) {
  assert.ok(concept.pages.length > 0, `${concept.id} must retain PDF anchors`);
}
const sourceLenses = map.source_lenses.filter(lens => lens.implementation === "SOURCE_NOTES");
assert.ok(sourceLenses.length > 0, "the knowledge map must retain source-only lenses");
for (const lens of sourceLenses) {
  assert.ok(lens.pages.length > 0, `${lens.id} must retain PDF anchors`);
  const fixtures = map.held_out_source_fixtures.filter(fixture => fixture.lens_id === lens.id);
  assert.ok(fixtures.length > 0, `${lens.id} must retain a held-out fixture`);
  for (const fixture of fixtures) {
    assert.equal(fixture.status, "SOURCE_REVIEW_ONLY");
    assert.equal(fixture.data_status, "UNAVAILABLE");
    assert.equal(fixture.outcome_status, "WITHHELD");
  }
}

console.log("PDF-CHART RELIABILITY AUDIT PASS: historical forecast evidence is dated, current live claims are suppressed, and source-only PDF concepts retain withheld outcomes.");
