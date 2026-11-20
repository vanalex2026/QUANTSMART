import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const audit = readJson("artifacts/realtime-pdf-causal-boundary-audit.json");
const receipt = readJson("artifacts/real-xauusd-m5-pdf-signal-verification.json");
const script = readFileSync(new URL("../scripts/verify-real-xauusd-pdf-signals.mjs", import.meta.url), "utf8");

assert.equal(audit.schema, "quantsmart.realtime-pdf-causal-boundary-audit/1");
assert.equal(audit.result, "PASS");
assert.equal(audit.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(audit.live_apply_allowed, false);
assert.equal(audit.outcomes, "WITHHELD");
// The live receipt is refreshed independently, so its selected ordinal may
// move as new closed candles arrive. Validate each receipt's own identity
// relationships instead of comparing mutable ordinals across refreshes.
assert.ok(Number.isInteger(audit.selected_index) && audit.selected_index >= 95);
assert.ok(Number.isInteger(audit.feed_last_index) && audit.feed_last_index >= audit.selected_index);
assert.equal(audit.rows_after_selected_boundary, audit.feed_last_index - audit.selected_index);
assert.equal(audit.first_excluded_row_mutation_exercised, true);
assert.ok(Number.isInteger(receipt.selected_index) && receipt.selected_index >= 95);
assert.equal(receipt.feed_last_bar != null, true);
assert.equal(receipt.future_row_index, receipt.selected_index + 1);
assert.ok(receipt.future_row_index <= receipt.bars || receipt.future_row_index === receipt.bars);
assert.equal(receipt.future_row_mutation, "FIRST_EXCLUDED_ROW_AFTER_SELECTED_CAUSAL_PREFIX");
assert.match(script, /firstExcludedIndex = selectedIndex \+ 1/);
assert.match(script, /FIRST_EXCLUDED_ROW_AFTER_SELECTED_CAUSAL_PREFIX/);
assert.match(script, /timestamps\[index\] \+ 300_000 <= nowMs/);

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 128 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const input = {
  bars,
  selectedTime: bars[96].t,
  direction: "UP",
  protection: 1998,
  nowMs: epoch + 130 * 300_000,
};
const baseline = api.detectAllPdfSignals(input);
const futureRows = bars.slice();
futureRows[97] = { ...futureRows[97], h: 10000, c: 9999 };
const mutated = api.detectAllPdfSignals({ ...input, bars: futureRows });
assert.deepEqual(mutated, baseline);
assert.equal(baseline.observations.length, 23);
assert.deepEqual(audit.synthetic_immediate_next_row_check, {
  selected_index: 96,
  mutated_index: 97,
  result_unchanged: true,
  observation_count: 23,
});

console.log("REALTIME PDF CAUSAL-BOUNDARY AUDIT PASS: the real receipt mutates the first excluded row and the selected 23-concept result remains unchanged.");
