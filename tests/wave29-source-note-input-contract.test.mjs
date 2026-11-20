import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(`${app}/package.json`)("esbuild");
const bundled = await build({
  stdin: {
    contents: [
      'export * from "./src/lib/sourceNoteDetectors.ts";',
      'export * from "./src/lib/pdfSignalTranslation.ts";',
    ].join("\n"),
    resolveDir: app,
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const artifact = JSON.parse(readFileSync(`${root}/artifacts/wave29-source-note-input-contract-audit.json`, "utf8"));

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 40 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const selectedTime = bars.at(-1).t;
const base = { bars, selectedTime, direction: "UP", nowMs: epoch + 41 * 300_000 };
const validBracket = { entryPrice: 2000, stopPrice: 1998, targetPrice: 2004, unit: "QUOTE_PRICE_UNITS", source: "USER_SUPPLIED" };

assert.equal(api.detectSourceNoteSubset({ ...base, bracket: validBracket }).descriptors.bracket_costs.state, "DESCRIPTIVE");
for (const field of ["entryPrice", "stopPrice", "targetPrice"]) {
  const malformed = { ...validBracket, [field]: 0 };
  assert.equal(api.detectSourceNoteSubset({ ...base, bracket: malformed }).descriptors.bracket_costs.state, "UNAVAILABLE", `${field}=0 must fail closed`);
  assert.equal(api.detectSourceNoteSubset({ ...base, bracket: { ...malformed, [field]: -1 } }).descriptors.bracket_costs.state, "UNAVAILABLE", `${field}<0 must fail closed`);
}

const extremeSizing = api.translatePdfSignalConcepts({
  ...base,
  sizing: {
    equity: Number.MAX_VALUE,
    riskPct: Number.MAX_VALUE,
    stopDistance: Number.MAX_VALUE,
    contractSize: Number.MAX_VALUE,
    lotStep: 1,
    minLot: 1,
  },
});
assert.equal(extremeSizing.descriptors.position_sizing.state, "UNAVAILABLE");
assert.equal(extremeSizing.descriptors.position_sizing.reason, "USER_SIZING_AND_COST_ASSUMPTIONS_REQUIRED");

const futureReversal = api.translatePdfSignalConcepts({
  ...base,
  reversalEvent: { time: new Date(epoch + 41 * 300_000).toISOString(), identity: "validated-adverse-break" },
});
assert.equal(futureReversal.descriptors.reversal_exit.state, "WITHHELD");

const invalidReversalLevel = api.detectSourceNoteSubset({ ...base, observedThrough: selectedTime, reversalLevel: Number.NaN });
assert.equal(invalidReversalLevel.descriptors.reversal_exit.state, "UNAVAILABLE");
assert.equal(invalidReversalLevel.descriptors.reversal_exit.reason, "VALIDATED_REVERSAL_LEVEL_UNAVAILABLE");

assert.equal(artifact.schema, "quantsmart.wave29.source-note-input-contract-audit/1");
assert.equal(artifact.result, "PASS");
assert.deepEqual(artifact.checks, {
  bracket_quote_prices_positive: true,
  sizing_derived_values_finite: true,
  reversal_identity_and_level_fail_closed: true,
  authority: "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false",
});

console.log("WAVE 29 SOURCE-NOTE INPUT CONTRACT PASS: bracket, sizing and reversal values fail closed without changing source-only authority.");
