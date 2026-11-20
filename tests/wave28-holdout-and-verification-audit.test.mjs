import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const audit = read("artifacts/wave28-holdout-and-verification-audit.json");
const holdout = read("artifacts/wave22-holdout-readiness-audit.json");
const pdf = read("artifacts/real-xauusd-m5-pdf-signal-verification.json");
const detector = read("artifacts/real-xauusd-m5-detector-verification.json");

assert.equal(audit.schema, "quantsmart.wave28.holdout-verification-audit/1");
assert.equal(audit.result, "PASS_WITH_EVIDENCE_GAPS");
assert.equal(holdout.status, "NOT_READY");
assert.equal(holdout.checks.source_data_bundled, false);
assert.equal(holdout.authority.live_apply_allowed, false);

assert.equal(pdf.observation_count, pdf.concept_count);
const { total, detected, abstain, unavailable, withheld } = pdf.counts;
assert.equal(detected + abstain + unavailable + withheld, total);
assert.equal(Object.keys(pdf.source_note_states).length, 10);
assert.equal(pdf.deterministic_repeat, true);
assert.equal(pdf.future_row_invariant, true);
assert.equal(pdf.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");

assert.equal(detector.source, "MT5_CLOSED_BARS");
assert.equal(detector.symbol, "XAUUSD");
assert.equal(detector.timeframe, "M5");
assert.equal(detector.forming_bar_included, false);
assert.equal(detector.valid_closed_utc_grid, true);
assert.equal(detector.detector.deterministic_repeat, true);
assert.equal(detector.detector.causal_prefix_stable_after_future_mutation, true);
for (const evidence of Object.values(detector.detector.concepts)) {
  assert.equal(evidence.history, evidence.occurrences);
  assert.equal(evidence.outcomes.up + evidence.outcomes.down + evidence.outcomes.flat, evidence.occurrences);
}

assert.equal(audit.denominator_accounting.unaccounted_rows, 9);
assert.equal(audit.denominator_accounting.warmup_rows, 8);
assert.equal(audit.denominator_accounting.terminal_row_without_h1, 1);
assert.equal(audit.denominator_accounting.receipt_fields_explicit, false);
assert.equal(audit.causal_future_row_accounting.first_excluded_row_mutation_exercised, false);
assert.ok(audit.strongest_missing_evidence.includes("selected causal boundary"));
assert.ok(audit.measured_checks.pdf_receipt_freshness_age_seconds_at_audit >= 0);
assert.ok(audit.measured_checks.detector_receipt_freshness_age_seconds_at_audit >= 0);
assert.equal(audit.measured_checks.receipts_within_six_hours_at_audit, true);
assert.deepEqual(audit.authority, {
  focused_chart: "SHADOW_ONLY",
  decision: "NO_DECISION",
  live_apply_allowed: false,
});

console.log("WAVE 28 HOLDOUT/VERIFICATION AUDIT PASS: holdout remains NOT_READY, receipt counts and occurrence denominators reconcile, freshness is recorded, and the two missing evidence boundaries are explicit.");
