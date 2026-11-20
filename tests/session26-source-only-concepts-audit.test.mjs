import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const map = read("../docs/price_action_knowledge_map.json");
const receipt = read("../artifacts/session26-source-only-concepts-audit.json");
const concepts = new Map(map.concepts.map(row => [row.id, row]));
const lenses = new Map(map.source_lenses.map(row => [row.id, row]));
const fixtures = new Map(map.held_out_source_fixtures.map(row => [row.id, row]));

assert.equal(receipt.source_sha256, map.source.sha256);
assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.implementation_change, false);
assert.equal(receipt.status, "SOURCE_REVIEW_ONLY");
assert.equal(receipt.data_status, "UNAVAILABLE");
assert.equal(receipt.outcome_status, "WITHHELD");

const requiredConcepts = {
  signal_entry_bar: [/boundary under attack/i, /subsequent break/i, /front-running the signal-bar break/i, /confusing a chart close/i],
  consecutive_review: [/whole session/i, /session timezone/i, /annotated historical examples.*win rate/i, /exact target\/stop touches/i],
  position_sizing: [/risk units/i, /reduce units/i, /smooth example growth/i, /minimum lot size/i]
};

for (const [id, patterns] of Object.entries(requiredConcepts)) {
  const concept = concepts.get(id);
  assert.ok(concept, `${id} concept must exist`);
  assert.equal(concept.implementation, "SOURCE_NOTES", `${id} must remain source-only`);
  assert.ok(concept.pages.length > 0, `${id} must retain page anchors`);
  assert.ok(concept.cues.length >= 2, `${id} needs review cues`);
  assert.ok(concept.abstain.length >= 2, `${id} needs abstentions`);
  const text = [...concept.cues, ...concept.abstain].join(" ");
  for (const pattern of patterns) assert.match(text, pattern, `${id}: missing ${pattern}`);
}

const requiredLensConcepts = {
  chapter5_pattern_break_entry_context: "signal_entry_bar",
  march_session_context: "consecutive_review",
  final_study_edge_discipline: "consecutive_review",
  compounding_sizing_cautions: "position_sizing"
};
for (const [lensId, conceptId] of Object.entries(requiredLensConcepts)) {
  const lens = lenses.get(lensId);
  assert.ok(lens, `${lensId} lens must exist`);
  assert.equal(lens.implementation, "SOURCE_NOTES");
  assert.ok(lens.concept_ids.includes(conceptId), `${lensId} must link ${conceptId}`);
  assert.ok(lens.pages.length > 0 && lens.cues.length >= 2 && lens.abstain.length >= 2);
  if (lensId === "compounding_sizing_cautions") {
    assert.ok(lens.abstain.some(cue => /contract specifications/i.test(cue)));
  }
  const fixtureId = receipt.fixture_ids.find(id => fixtures.get(id)?.lens_id === lensId);
  assert.ok(fixtureId, `${lensId} must have a held-out fixture`);
  const fixture = fixtures.get(fixtureId);
  assert.equal(fixture.status, "SOURCE_REVIEW_ONLY");
  assert.equal(fixture.data_status, "UNAVAILABLE");
  assert.equal(fixture.outcome_status, "WITHHELD");
  assert.ok(fixture.pages.length > 0 && fixture.pages.every(page => lens.pages.includes(page)));
}

for (const id of receipt.concept_ids) assert.ok(concepts.has(id), `${id} must be indexed`);
for (const id of receipt.lens_ids) assert.ok(lenses.has(id), `${id} must be indexed`);
for (const id of receipt.fixture_ids) assert.ok(fixtures.has(id), `${id} must be indexed`);

console.log("SESSION 26 SOURCE-ONLY CONCEPT AUDIT PASS: entry identity, consecutive review and sizing remain source notes with withheld fixtures.");
