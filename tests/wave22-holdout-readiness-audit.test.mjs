import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const receipt = JSON.parse(readFileSync(new URL("../artifacts/wave22-holdout-readiness-audit.json", import.meta.url), "utf8"));

assert.equal(receipt.schema, "quantsmart.wave22.xauusd-holdout-readiness-audit/1");
assert.equal(receipt.status, "NOT_READY");
assert.equal(receipt.finding.id, "zero-range-manifest-accepted");
assert.equal(receipt.finding.source_qualified_accuracy, false);
assert.equal(receipt.checks.zero_range_manifest_rejected, true);
assert.equal(receipt.checks.pdf_narrative_used_as_ohlc, false);
assert.equal(receipt.checks.outcome_rates_generated, false);
assert.equal(receipt.checks.source_data_bundled, false);
assert.equal(receipt.checks.authority_preserved, true);
assert.deepEqual(receipt.authority, {
  focused_chart: "SHADOW_ONLY",
  decision: "NO_DECISION",
  live_apply_allowed: false,
});
assert.equal(receipt.regression, "tests/xauusd-m5-holdout-validator.test.mjs");

console.log("WAVE 22 HOLDOUT READINESS PASS: zero-range sealed rows are rejected and PDF narrative remains outside source-qualified accuracy.");
