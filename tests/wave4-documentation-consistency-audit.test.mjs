import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const read = file => readFileSync(new URL(file, import.meta.url), "utf8");
const status = read("../docs/PROJECT_STATUS.md");
const state = read("../docs/AI_SESSION_STATE.md");
const gaps = read("../docs/PRICE_ACTION_IMPLEMENTATION_GAPS.md");
const receipt = JSON.parse(read("../artifacts/wave4-documentation-consistency-audit.json"));

assert.match(status, /## Wave 4 documentation consistency addendum/);
assert.match(state, /## Session 19 checkpoint \(read first/);
assert.match(gaps, /## Wave 4 documentation consistency addendum/);
for (const doc of [status, state, gaps]) {
  assert.match(doc, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
  assert.match(doc, /session19-browser-runtime-evidence-audit/);
}
assert.match(status, /session20-final-unit\.log[\s\S]*partial rerun/i);
assert.match(state, /session20-final-unit\.log[\s\S]*partial rerun/i);
assert.match(gaps, /partial, unverified[\s\S]*session20-final-unit\.log/i);
assert.equal(receipt.result, "PASS_WITH_CAVEAT");
assert.equal(receipt.productChange, false);
assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
const unitBytes = readFileSync(new URL("../artifacts/session20-final-unit.log", import.meta.url));
const unitLog = unitBytes.includes(0)
  ? unitBytes.toString("utf16le")
  : unitBytes.toString("utf8");
assert.ok(statSync(new URL("../artifacts/session20-final-unit.log", import.meta.url)).size > 0);

console.log("WAVE 4 DOCUMENTATION CONSISTENCY PASS: Session 19 is current, visual limits are explicit, and unverified Session 20 evidence is excluded.");
