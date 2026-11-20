import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = file => readFileSync(new URL(file, import.meta.url), "utf8");
const status = read("../docs/PROJECT_STATUS.md");
const state = read("../docs/AI_SESSION_STATE.md");
const gaps = read("../docs/PRICE_ACTION_IMPLEMENTATION_GAPS.md");
const runner = read("../scripts/test.mjs");
const receipt = JSON.parse(read("../artifacts/session24-documentation-consistency-audit.json"));
const intake = JSON.parse(read("../artifacts/session24-xauusd-holdout-intake-audit.json"));
const docs = [status, state, gaps];

for (const doc of docs) {
  assert.match(doc, /Session 24 documentation consistency addendum/);
  assert.match(doc, /session24-documentation-consistency-audit\.json/);
  assert.match(doc, /session24-documentation-consistency-audit\.test\.mjs/);
  assert.match(doc, /CANDIDATE_ONLY/);
  assert.match(doc, /NOT_READY/);
  assert.match(doc, /unavailable browser host/i);
  assert.match(doc, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
}

assert.doesNotMatch(
  status,
  /The unit receipt is `artifacts\/session20-final-unit\.log` and the build receipt is `artifacts\/session20-final-build\.log`/i,
  "the ledger must not cite the absent Session 20 build receipt as current evidence",
);
assert.equal(existsSync(new URL("../artifacts/session20-final-build.log", import.meta.url)), false);
assert.equal(intake.status, "NOT_READY");
assert.equal(intake.candidate_partition, "CANDIDATE_ONLY");
assert.deepEqual(intake.authority, {
  focused_chart: "SHADOW_ONLY",
  decision: "NO_DECISION",
  live_apply_allowed: false,
});

const registrations = [...runner.matchAll(/['"]session24-documentation-consistency-audit['"]/g)];
assert.equal(registrations.length, 1, "documentation consistency regression must be registered exactly once");
assert.equal(receipt.status, "PASS_WITH_CAVEAT");
assert.equal(receipt.runner.registration_count, 1);
assert.equal(receipt.productChange, false);
assert.deepEqual(receipt.authority, {
  focused_chart: "SHADOW_ONLY",
  decision: "NO_DECISION",
  live_apply_allowed: false,
});

console.log("SESSION 24 DOCUMENTATION CONSISTENCY PASS: ledgers, receipts, browser limits, runner registration and authority wording agree.");
