import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalTranslation.ts";', resolveDir: app },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const artifact = JSON.parse(readFileSync(new URL("../artifacts/wave6-pdf-signal-translation.json", import.meta.url), "utf8"));

assert.equal(api.PDF_SOURCE_NOTE_CONCEPTS.length, 10);
assert.deepEqual([...api.PDF_SOURCE_NOTE_CONCEPTS], artifact.concepts);
assert.equal(artifact.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(artifact.boundaries.pdf_ohlc_translation, false);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const rows = Array.from({ length: 100 }, (_, i) => ({
  t: new Date(epoch + i * 300_000).toISOString(),
  o: 100 + i * 0.02,
  h: 101 + i * 0.02,
  l: 99 + i * 0.02,
  c: 100.5 + i * 0.02,
  closed: true,
}));
const selectedTime = rows.at(-1).t;
const result = api.translatePdfSignalConcepts({ bars: rows, selectedTime, direction: "UP", protection: 98, nowMs: epoch + 101 * 300_000 });
assert.equal(result.symbol, "XAUUSD");
assert.equal(result.timeframe, "M5");
assert.equal(result.state, "DESCRIPTIVE");
assert.equal(result.authority, artifact.authority);
for (const id of api.PDF_SOURCE_NOTE_CONCEPTS) {
  const descriptor = result.descriptors[id];
  assert.ok(descriptor, `${id} descriptor exists`);
  assert.equal(descriptor.sourceStatus, "SOURCE_REVIEW_ONLY");
  assert.equal(descriptor.outcomeStatus, "WITHHELD");
  assert.equal(descriptor.causalPrefix.futureRows, "WITHHELD");
  assert.equal(descriptor.live_apply_allowed, false);
  assert.equal(Object.hasOwn(descriptor, "outcome"), false);
}
for (const id of artifact.local_geometry_descriptors) assert.equal(result.descriptors[id].state, "DESCRIPTIVE", `${id} has local geometry`);
for (const id of artifact.unavailable_without_external_inputs) assert.equal(result.descriptors[id].state, "UNAVAILABLE", `${id} stays unavailable`);
for (const id of artifact.withheld_without_source_or_event_labels) assert.equal(result.descriptors[id].state, "WITHHELD", `${id} stays withheld`);

const withFuture = api.translatePdfSignalConcepts({ bars: [...rows, { ...rows.at(-1), t: new Date(epoch + 100 * 300_000).toISOString(), h: 9999 }], selectedTime, direction: "UP", protection: 98, nowMs: epoch + 101 * 300_000 });
assert.deepEqual(withFuture, result, "future rows cannot rewrite a selected descriptor");

const malformed = api.translatePdfSignalConcepts({ bars: rows.map((bar, i) => i === 50 ? { ...bar, closed: false } : bar), selectedTime, direction: "UP", nowMs: epoch + 101 * 300_000 });
assert.equal(malformed.reason, "INVALID_CAUSAL_PREFIX");
for (const id of api.PDF_SOURCE_NOTE_CONCEPTS) assert.equal(malformed.descriptors[id].dataStatus, "UNAVAILABLE");

const disabled = api.translatePdfSignalConcepts({ bars: rows, selectedTime, enabled: false });
assert.equal(disabled.reason, "UNVERIFIED_CURRENT_EVIDENCE");
assert.equal(disabled.descriptors.low_volatility.causalPrefix.state, "WITHHELD");

const duplicateSelected = api.translatePdfSignalConcepts({ bars: [...rows.slice(0, -1), { ...rows.at(-1) }, rows.at(-1)], selectedTime, direction: "UP", nowMs: epoch + 101 * 300_000 });
assert.equal(duplicateSelected.reason, "DUPLICATE_CAUSAL_IDENTITY");
const invalidBracket = api.translatePdfSignalConcepts({ bars: rows, selectedTime, direction: "UP", bracket: { entryPrice: 102, stopPrice: 100, targetPrice: 105, spreadPrice: -1, unit: "PIPS" }, nowMs: epoch + 101 * 300_000 });
assert.equal(invalidBracket.descriptors.bracket_costs.state, "UNAVAILABLE");

console.log("WAVE 6 PDF SIGNAL TRANSLATION PASS: ten source concepts expose bounded XAUUSD M5 descriptive or explicit withheld/unavailable contracts.");
