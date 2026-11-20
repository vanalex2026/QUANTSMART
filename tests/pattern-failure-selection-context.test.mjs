import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const { build } = require("esbuild");
const bundled = await build({
  stdin: {
    contents: "export { patternFailureSelectionContext } from './src/lib/patternFailureSelectionContext.ts';",
    resolveDir: app,
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  logLevel: "silent",
});
const module = { exports: {} };
new Function("require", "module", "exports", bundled.outputFiles[0].text)(require, module, module.exports);
const { patternFailureSelectionContext } = module.exports;

const epoch = Date.UTC(2026, 0, 5);
const bars = Array.from({ length: 110 }, (_, i) => ({
  t: new Date(epoch + i * 300_000).toISOString(),
  o: 100 + i * 0.01,
  h: 101 + i * 0.01,
  l: 99 + i * 0.01,
  c: 100.5 + i * 0.01,
  closed: true,
}));
const nowMs = epoch + 120 * 300_000;

test("failure-selection receipt exposes only the selected candle and causal prefix", () => {
  const receipt = patternFailureSelectionContext(bars, bars[100].t, "DOWN", true, nowMs);
  assert.equal(receipt.version, "pattern-failure-selection-context/1");
  assert.equal(receipt.state, "AVAILABLE");
  assert.equal(receipt.conceptId, "trade_selection_failure");
  assert.equal(receipt.sourceLens, "trade_for_failure_selection");
  assert.equal(receipt.causalPrefix.bars, 96);
  assert.equal(receipt.causalPrefix.start, bars[5].t);
  assert.equal(receipt.causalPrefix.end, bars[100].t);
  assert.equal(receipt.observations.selectedCandle.close, bars[100].c);
  assert.equal(receipt.observations.priorRange.bars, 95);
  assert.equal(receipt.observations.closeInsidePriorRange, "OBSERVED");
  assert.equal(receipt.sourceStatus, "SOURCE_REVIEW_ONLY");
  assert.equal(receipt.outcomeStatus, "WITHHELD");
  assert.equal(receipt.live_apply_allowed, false);
  assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
});

test("failure-selection receipt withholds malformed or non-causal evidence", () => {
  const gap = bars.map(bar => ({ ...bar }));
  gap[99].t = new Date(epoch + 98 * 300_000).toISOString();
  const unavailable = patternFailureSelectionContext(gap, bars[100].t, "UP", true, nowMs);
  assert.equal(unavailable.state, "UNAVAILABLE");
  assert.equal(unavailable.reason, "INVALID_CAUSAL_TAPE");
  assert.equal(unavailable.observations.selectedCandle.state, "UNAVAILABLE");

  const withheld = patternFailureSelectionContext(bars, bars[100].t, "UP", false, nowMs);
  assert.equal(withheld.state, "WITHHELD");
  assert.equal(withheld.reason, "UNVERIFIED_CURRENT_EVIDENCE");
  assert.equal(withheld.outcomeStatus, "WITHHELD");
});

test("future rows cannot alter an already selected causal receipt", () => {
  const original = patternFailureSelectionContext(bars, bars[100].t, "UP", true, nowMs);
  const mutated = bars.map((bar, index) => index > 100 ? { ...bar, h: Number.NaN, l: Number.NaN, c: Number.NaN, closed: false } : { ...bar });
  const futureChanged = patternFailureSelectionContext(mutated, bars[100].t, "UP", true, nowMs);
  assert.deepEqual(futureChanged, original);
});

test("only the bounded causal prefix is OHLC-validated and selected identity stays unique", () => {
  const olderMalformed = bars.map((bar, index) => index === 0 ? { ...bar, closed: false } : { ...bar });
  assert.equal(patternFailureSelectionContext(olderMalformed, bars[100].t, "UP", true, nowMs).state, "AVAILABLE");
  const duplicate = [...bars, { ...bars[100] }];
  const duplicateReceipt = patternFailureSelectionContext(duplicate, bars[100].t, "UP", true, nowMs);
  assert.equal(duplicateReceipt.state, "UNAVAILABLE");
  assert.equal(duplicateReceipt.reason, "DUPLICATE_OCCURRENCE_IDENTITY");
});

test("failure-selection receipt copy stays ASCII-readable", () => {
  const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PatternFailureSelectionEvidence.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /[ÂÃâ€™â€“]/, "receipt copy must not contain mojibake separators");
  assert.match(source, /closed M5 bars \|/);
  assert.match(source, /Prior causal range .* - /);
});

console.log("PATTERN FAILURE-SELECTION CONTEXT PASS: causal-prefix receipt, explicit unavailable/withheld states and source-only authority boundary.");
