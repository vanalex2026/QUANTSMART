import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const map = readJson("../docs/price_action_knowledge_map.json");
const receipt = readJson("../artifacts/session30-pdf-feature-coverage-audit.json");
const detector = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/priceActionDetector.ts", import.meta.url), "utf8");
const concepts = new Map(map.concepts.map((concept) => [concept.id, concept]));
const detectorBlock = detector.match(/const CONCEPTS[\s\S]*?;\s*export const PRICE_ACTION_DETECTOR_CONCEPT_COUNT/);
assert.ok(detectorBlock, "detector concept registry must remain statically inspectable");
const detectorIds = [...detectorBlock[0].matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);
const proxyIds = map.concepts.filter((concept) => concept.implementation === "GEOMETRY_PROXY").map((concept) => concept.id);
const sourceOnlyIds = map.concepts.filter((concept) => concept.implementation === "SOURCE_NOTES").map((concept) => concept.id);

assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.implementation_change, false);
assert.equal(receipt.data_status, "UNAVAILABLE");
assert.equal(receipt.outcome_status, "WITHHELD");
assert.equal(map.concepts.length, 23);
assert.deepEqual(new Set(proxyIds), new Set(detectorIds));
assert.deepEqual(new Set(receipt.map.geometry_proxy), new Set(proxyIds));
assert.deepEqual(new Set(receipt.map.source_notes), new Set(sourceOnlyIds));
assert.equal(proxyIds.length + sourceOnlyIds.length, map.concepts.length);
assert.equal(new Set(detectorIds).size, detectorIds.length, "detector concepts must be unique");

for (const id of sourceOnlyIds) {
  const concept = concepts.get(id);
  assert.equal(concept.implementation, "SOURCE_NOTES", `${id} must remain source-only`);
  assert.ok(concept.pages.length && concept.cues.length && concept.abstain.length, `${id} must retain source evidence`);
  const lenses = map.source_lenses.filter((lens) => lens.concept_ids.includes(id));
  assert.ok(lenses.length, `${id} must retain linked source lenses`);
  for (const lens of lenses) {
    assert.equal(lens.implementation, "SOURCE_NOTES");
    const fixtures = map.held_out_source_fixtures.filter((fixture) => fixture.lens_id === lens.id);
    assert.ok(fixtures.length, `${lens.id} must retain a held-out provenance fixture`);
    for (const fixture of fixtures) {
      assert.equal(fixture.status, "SOURCE_REVIEW_ONLY");
      assert.equal(fixture.data_status, "UNAVAILABLE");
      assert.equal(fixture.outcome_status, "WITHHELD");
    }
  }
}

console.log("SESSION 30 PDF FEATURE COVERAGE PASS: 13 geometry proxies match the focused detector and 10 source-only concepts retain withheld provenance without promotion.");
