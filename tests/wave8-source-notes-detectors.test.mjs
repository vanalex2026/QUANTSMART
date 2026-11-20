import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url))("esbuild");
const bundle = await build({
  stdin: { contents: 'export * from "./src/lib/sourceNotesDetectors.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 110 }, (_, i) => ({
  t: new Date(epoch + i * 300_000).toISOString(),
  o: 2000 + i * 0.2,
  h: 2001 + i * 0.2,
  l: 1999 + i * 0.2,
  c: 2000.5 + i * 0.2,
  closed: true,
}));
const selectedTime = bars.at(-1).t;
const nowMs = epoch + 111 * 300_000;
const result = api.detectSourceNoteConcepts({ bars, selectedTime, nowMs });

assert.deepEqual([...api.SOURCE_NOTE_DETECTOR_CONCEPTS], ["signal_entry_bar", "consecutive_review", "position_sizing"]);
assert.equal(result.state, "DESCRIPTIVE");
assert.equal(result.symbol, "XAUUSD");
assert.equal(result.timeframe, "M5");
assert.equal(result.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(result.live_apply_allowed, false);
assert.equal(api.detectSignalEntryBar({ bars, selectedTime, nowMs }).conceptId, "signal_entry_bar");
assert.equal(api.detectConsecutiveReview({ bars, selectedTime, nowMs }).conceptId, "consecutive_review");
assert.equal(api.detectPositionSizing({ bars, selectedTime, nowMs }).conceptId, "position_sizing");

const signal = result.descriptors.signal_entry_bar;
assert.equal(signal.state, "DESCRIPTIVE");
assert.equal(signal.geometry.body, 0.5);
assert.equal(signal.geometry.range, 2);
assert.equal(signal.geometry.candleDirection, "UP");
assert.equal(signal.geometry.sourceEntryLabel, null);
assert.equal(signal.geometry.subsequentBreak, null);

const review = result.descriptors.consecutive_review;
assert.equal(review.geometry.reviewBars, 96);
assert.equal(review.geometry.sourceSetupLabels, null);
assert.equal(review.geometry.annotatedOutcomes, null);
assert.equal(review.causalPrefix.futureRows, "WITHHELD");

const sizing = result.descriptors.position_sizing;
assert.equal(sizing.geometry.selectedRange, 2);
assert.equal(sizing.geometry.riskUnit, "SELECTED_M5_RANGE_QUOTE_PRICE");
assert.equal(sizing.geometry.orders, null);
assert.equal(sizing.geometry.currencyAccounting, null);
assert.equal(sizing.geometry.executionCosts, null);
for (const descriptor of Object.values(result.descriptors)) {
  assert.equal(descriptor.sourceStatus, "SOURCE_REVIEW_ONLY");
  assert.equal(descriptor.outcomeStatus, "WITHHELD");
  assert.equal(descriptor.live_apply_allowed, false);
  assert.equal(descriptor.causalPrefix.futureRows, "WITHHELD");
  assert.equal(Object.hasOwn(descriptor, "outcome"), false);
}

const withFuture = api.detectSourceNoteConcepts({
  bars: [...bars, { ...bars.at(-1), t: new Date(epoch + 110 * 300_000).toISOString(), h: 999999, closed: false }],
  selectedTime,
  nowMs,
});
assert.deepEqual(withFuture, result, "future rows cannot rewrite a selected receipt");

const malformed = api.detectSourceNoteConcepts({ bars: bars.map((bar, i) => i === 100 ? { ...bar, h: bar.l } : bar), selectedTime, nowMs });
assert.equal(malformed.state, "UNAVAILABLE");
assert.equal(malformed.reason, "INVALID_CAUSAL_PREFIX");
for (const descriptor of Object.values(malformed.descriptors)) assert.equal(descriptor.dataStatus, "UNAVAILABLE");

const forming = api.detectSourceNoteConcepts({ bars: bars.map((bar, i) => i === 100 ? { ...bar, closed: false } : bar), selectedTime, nowMs });
assert.equal(forming.state, "UNAVAILABLE");
const gapped = api.detectSourceNoteConcepts({ bars: bars.map((bar, i) => i === 100 ? { ...bar, t: new Date(Date.parse(bar.t) + 60_000).toISOString() } : bar), selectedTime, nowMs });
assert.equal(gapped.state, "UNAVAILABLE");

const disabled = api.detectSourceNoteConcepts({ bars, selectedTime, enabled: false, nowMs });
assert.equal(disabled.state, "WITHHELD");
assert.equal(disabled.reason, "UNVERIFIED_CURRENT_EVIDENCE");
assert.equal(disabled.descriptors.signal_entry_bar.causalPrefix.state, "WITHHELD");

console.log("WAVE 8 SOURCE-NOTES DETECTORS PASS: three bounded closed-prefix descriptors preserve source-only authority and future-row withholding.");
