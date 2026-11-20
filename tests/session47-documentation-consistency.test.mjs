import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const receipt = JSON.parse(read("artifacts/real-xauusd-m5-pdf-signal-verification.json"));
const projectStatus = read("docs/PROJECT_STATUS.md");
const sessionState = read("docs/AI_SESSION_STATE.md");

assert.equal(receipt.symbol, "XAUUSD");
assert.equal(receipt.timeframe, "M5");
assert.equal(receipt.bars, 5000, `unexpected current closed-bar receipt count: ${receipt.bars}`);
assert.equal(receipt.concept_count, 23);
assert.equal(receipt.observation_count, 23);
assert.deepEqual(receipt.counts, {
  total: 23,
  detected: 6,
  abstain: 10,
  unavailable: 5,
  withheld: 2,
});
assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.historical_census.warmup_rows, 8);
assert.equal(receipt.historical_census.evaluated_rows, 4973);
assert.equal(receipt.historical_census.skipped_rows, 18);
assert.equal(receipt.historical_census.terminal_rows_without_h1, 1);
assert.equal(receipt.historical_census.authority_label, receipt.authority);

assert.match(projectStatus, /Session 47 real XAUUSD all-concept verification/);
assert.match(projectStatus, /latest read-only verifier receipt contains 5,000 closed XAUUSD M5 bars/);
assert.match(sessionState, /latest read-only MT5 receipt evaluates 5,000\s+closed bars/);
assert.match(projectStatus, /Session 57[^\n]*[\s\S]*?neutral receipt records 6 detected, 10 abstain, 5 unavailable and 2 withheld/);
assert.match(sessionState, /Session 57[^\n]*[\s\S]*?neutral receipt records 6 detected, 10 abstain, 5 unavailable and 2 withheld/);
assert.match(projectStatus, /8 warm-up rows,\s+4,973\s+evaluated rows,\s+18 skipped session-gap rows and 1 terminal row/);

console.log("SESSION 47 DOCUMENTATION CONSISTENCY PASS: current receipt bar count, concept counts, state counts and authority wording match the read-first ledgers.");
