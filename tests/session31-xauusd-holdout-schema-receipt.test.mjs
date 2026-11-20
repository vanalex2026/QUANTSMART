import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const receipt = JSON.parse(readFileSync(new URL("../artifacts/session31-xauusd-holdout-schema-receipt.json", import.meta.url), "utf8"));

assert.equal(receipt.schema, "quantsmart.session31.xauusd-holdout-schema-receipt/1");
assert.equal(receipt.status, "DESIGN_ONLY");
assert.equal(receipt.data_bundled, false);
assert.deepEqual(receipt.dataset_identity, {
  symbol: "XAUUSD",
  timeframe: "M5",
  timestamp_basis: "UTC",
  bar_identity: "canonical ISO-8601 UTC timestamps on the five-minute grid",
  bar_content: "closed OHLC only",
  partition_scheme: "TRAIN_VALIDATION_HOLDOUT",
  partition_lock: "all three partition references and selection thresholds are locked before holdout access",
});
for (const role of ["train", "validation", "holdout"]) {
  assert.equal(receipt.partitions[role].required, true);
  assert.ok(receipt.partitions[role].identity.includes("dataset_id"));
  assert.ok(receipt.partitions[role].identity.includes("source_sha256"));
}
for (const field of ["source_sha256", "event_time_basis", "derivation", "generated_at_utc", "frozen_before_access", "pdf_illustrations_used"]) {
  assert.ok(receipt.event_label_provenance.required_fields.includes(field), `missing label provenance field ${field}`);
}
assert.equal(receipt.event_label_provenance.pdf_illustrations_used, false);
for (const caseName of ["missing", "duplicate", "off_grid", "forming", "future"]) {
  assert.match(receipt.fail_closed_cases[caseName], /reject|never/i, `${caseName} must fail closed`);
}
assert.deepEqual(receipt.validation_authority, {
  focused_chart: "SHADOW_ONLY",
  decision: "NO_DECISION",
  live_apply_allowed: false,
});

console.log("SESSION 31 XAUUSD HOLDOUT SCHEMA RECEIPT PASS: train/validation/holdout identity, independent event-label provenance and missing/duplicate/off-grid/forming/future fail-closed cases are documented without bundled data.");
