import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const receipt = JSON.parse(readFileSync(root + "artifacts/wave7-real-receipt-refresh.json", "utf8"));

assert.equal(receipt.audit, "wave7-real-receipt-refresh");
assert.equal(receipt.source_script, "scripts/verify-real-xauusd-detectors.mjs");
assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.run_count, 2);
assert.equal(receipt.runs.length, 2);
assert.equal(receipt.comparison.retrieved_timestamps_distinct, true);
assert.equal(receipt.comparison.retrieved_timestamps_ordered, true);
assert.ok(receipt.comparison.retrieval_delta_seconds > 0);
assert.equal(receipt.comparison.identity_stable, true);
for (const identity of Object.values(receipt.comparison.identity)) {
  assert.ok(Date.parse(identity.from_retrieved_at) > 0);
  assert.ok(Date.parse(identity.to_retrieved_at) > Date.parse(identity.from_retrieved_at));
}
assert.equal(receipt.comparison.marker_geometry.marker_signature_stable, true);
assert.ok(Date.parse(receipt.comparison.marker_geometry.from_retrieved_at) > 0);
assert.ok(Date.parse(receipt.comparison.marker_geometry.to_retrieved_at) > Date.parse(receipt.comparison.marker_geometry.from_retrieved_at));
assert.equal(receipt.comparison.marker_geometry.all_runs_pass_geometry_checks, true);
assert.equal(receipt.comparison.denominator_changes_timestamped, true);
assert.equal(receipt.comparison.denominator_stable, true);
assert.equal(receipt.comparison.detector_counts_reproducible, true);
assert.equal(receipt.comparison.all_runs_pass_denominator_checks, true);
assert.equal(receipt.comparison.stale_counts_assumed, false);
assert.equal(receipt.freshness.all_runs_within_max_age, true);

const identity = [
  ["source", "MT5_CLOSED_BARS"],
  ["symbol", "XAUUSD"],
  ["timeframe", "M5"],
  ["timestamp_basis", "UTC"],
  ["forming_bar_included", false],
  ["valid_closed_utc_grid", true],
  ["strictly_ordered", true],
];
for (const run of receipt.runs) {
  assert.ok(Date.parse(run.retrieved_at) > 0);
  assert.ok(run.bars >= 100);
  for (const [field, expected] of identity) assert.equal(run[field], expected);
  assert.equal(run.detector.authority, "SHADOW_ONLY / NO_DECISION");
  assert.equal(run.marker_geometry.retrieved_at, run.retrieved_at);
  assert.equal(run.denominator.retrieved_at, run.retrieved_at);
  assert.equal(run.detector.marker_count, run.detector.markers.length);
  for (const marker of run.detector.markers) {
    assert.ok(marker.bar && marker.bar.t === marker.time);
    assert.equal(marker.priceWithinBar, true);
    assert.equal(marker.positionConsistent, true);
    assert.ok(marker.i >= 0 && marker.i < run.bars);
  }
  assert.equal(run.denominator.eligible_endpoints, run.bars - 9);
  assert.equal(run.denominator.all_concepts_reconcile, true);
  assert.equal(run.denominator.all_histories_reconcile, true);
  assert.equal(run.denominator.all_outcomes_reconcile, true);
}

for (const change of receipt.comparison.denominator_changes) {
  assert.ok(Date.parse(change.from_retrieved_at) > 0);
  assert.ok(Date.parse(change.to_retrieved_at) > Date.parse(change.from_retrieved_at));
  assert.equal(change.changed, false);
}

console.log("WAVE 7 REAL RECEIPT REFRESH PASS: two timestamped live MT5 reads reconcile identity, marker geometry and per-concept denominators without stale-count assumptions.");
