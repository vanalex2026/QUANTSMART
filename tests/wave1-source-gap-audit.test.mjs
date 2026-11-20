import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const map = read('../docs/price_action_knowledge_map.json');
const receipt = read('../artifacts/wave1-source-gap-audit.json');
const concept = map.concepts.find(row => row.id === receipt.selected_gap.concept_id);
const lenses = new Map(map.source_lenses.map(row => [row.id, row]));
const fixtures = new Map(map.held_out_source_fixtures.map(row => [row.lens_id, row]));

assert.equal(receipt.source_sha256, map.source.sha256);
assert.equal(receipt.authority, 'SHADOW_ONLY / NO_DECISION / live_apply_allowed=false');
assert.equal(receipt.implementation_change, false);
assert.equal(receipt.status, 'SOURCE_REVIEW_ONLY');
assert.equal(receipt.data_status, 'UNAVAILABLE');
assert.equal(receipt.outcome_status, 'WITHHELD');
assert.ok(concept, 'audited source concept must exist');
assert.equal(concept.implementation, 'SOURCE_NOTES');
assert.ok(concept.pages.length > 0);
assert.ok(concept.cues.length >= 2);
assert.ok(concept.abstain.length >= 2);

for (const lensId of receipt.selected_gap.lens_ids) {
  const lens = lenses.get(lensId);
  assert.ok(lens, `${lensId} lens must exist`);
  assert.equal(lens.implementation, 'SOURCE_NOTES');
  assert.ok(lens.concept_ids.includes(concept.id));
  const fixture = fixtures.get(lensId);
  assert.ok(fixture, `${lensId} must retain a held-out fixture`);
  assert.equal(fixture.status, 'SOURCE_REVIEW_ONLY');
  assert.equal(fixture.data_status, 'UNAVAILABLE');
  assert.equal(fixture.outcome_status, 'WITHHELD');
}

assert.match(receipt.selected_gap.reason_no_implementation, /future leakage/i);
console.log('WAVE 1 SOURCE GAP AUDIT PASS: trade-selection failure remains source-only.');
