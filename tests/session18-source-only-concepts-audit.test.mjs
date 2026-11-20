import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const map = read('../docs/price_action_knowledge_map.json');
const receipt = read('../artifacts/session18-source-only-concepts-audit.json');
const ids = receipt.concept_ids;
const byId = new Map(map.concepts.map(concept => [concept.id, concept]));
const lenses = new Map(map.source_lenses.map(lens => [lens.id, lens]));
const fixtures = new Map(map.held_out_source_fixtures.map(fixture => [fixture.lens_id, fixture]));

assert.equal(receipt.source_sha256, map.source.sha256);
assert.deepEqual(receipt.authority, 'SHADOW_ONLY / NO_DECISION / live_apply_allowed=false');
assert.equal(receipt.implementation_change, false);
assert.equal(receipt.status, 'SOURCE_REVIEW_ONLY');
assert.equal(receipt.data_status, 'UNAVAILABLE');
assert.equal(receipt.outcome_status, 'WITHHELD');

const required = {
  trade_selection_failure: [/fading every failed breakout/i, /no room/i, /aggressive pullback/i],
  low_volatility: [/synthesizing ticks/i, /shortening targets/i, /stale environment/i],
  obstacle_room: [/neat signal bar.*immediately/i, /wide technical stop/i, /no confirmed swing/i],
  news_exit: [/scheduled release.*candles/i, /universal countdown/i],
  resistance_exit: [/lowering the target after entry/i, /insufficient room/i, /every touched resistance/i],
  reversal_exit: [/any counter-colored bar/i, /failed breakout.*profitable trade/i, /intrabar order/i]
};
for (const id of ids) {
  const concept = byId.get(id);
  assert.ok(concept, `concept ${id} must exist`);
  assert.equal(concept.implementation, 'SOURCE_NOTES', `${id} must remain source-only`);
  assert.ok(concept.pages.length > 0, `${id} must retain page anchors`);
  assert.ok(concept.cues.length >= 2, `${id} needs review cues`);
  assert.ok(concept.abstain.length >= 2, `${id} needs abstain cues`);
  for (const pattern of required[id]) assert.ok(concept.abstain.some(cue => pattern.test(cue)), `${id}: missing ${pattern}`);
}

const expectedLenses = [
  'trade_for_failure_selection', 'chapter7_skip_failure_conditions',
  'low_volatility_box_context', 'trend_range_selection',
  'chapter6_manual_exit_context', 'chapter6_resistance_reversal_transition',
  'chapter6_reversal_exit_examples'
];
for (const id of expectedLenses) {
  const lens = lenses.get(id);
  assert.ok(lens, `lens ${id} must exist`);
  assert.equal(lens.implementation, 'SOURCE_NOTES');
  assert.ok(lens.pages.length > 0, `${id} must retain anchors`);
  assert.ok(lens.cues.length >= 2 && lens.abstain.length >= 2, `${id} must retain cues and abstentions`);
  const fixture = fixtures.get(id);
  assert.ok(fixture, `${id} must have a held-out fixture`);
  assert.equal(fixture.status, 'SOURCE_REVIEW_ONLY');
  assert.equal(fixture.data_status, 'UNAVAILABLE');
  assert.equal(fixture.outcome_status, 'WITHHELD');
  // A held-out fixture may cover a bounded subset of a broader lens anchor.
  assert.ok(fixture.pages.length > 0 && fixture.pages.every(page => lens.pages.includes(page)), `${id} fixture pages must be lens anchors`);
}

const linked = new Set(map.source_lenses.filter(lens => lens.concept_ids.some(id => ids.includes(id))).map(lens => lens.id));
for (const id of expectedLenses) assert.ok(linked.has(id), `${id} must be linked to an audited concept`);
console.log('SESSION 18 SOURCE-ONLY CONCEPT AUDIT PASS: anchors, abstentions and withheld fixtures remain source-only.');
