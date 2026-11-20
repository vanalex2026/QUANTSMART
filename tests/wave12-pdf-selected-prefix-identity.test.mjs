import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url))("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts";', resolveDir: app },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 120 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const selectedTime = bars.at(-1).t;
const input = { bars, selectedTime, direction: "UP", nowMs: epoch + 121 * 300_000 };
const baseline = api.detectAllPdfSignals(input);
assert.equal(baseline.ok, true);
assert.equal(baseline.asOf, selectedTime);
assert.equal(baseline.counts.total, 23);

const missing = api.detectAllPdfSignals({ ...input, selectedTime: "2026-01-05T12:00:00Z" });
assert.equal(missing.ok, false, "a missing selected identity must fail closed");
assert.equal(missing.state, "ABSTAIN");
assert.equal(missing.asOf, null);
assert.equal(missing.markers.length, 0);
assert.ok(missing.observations.every((row) => row.state !== "DETECTED"));
assert.ok(missing.observations.every((row) => row.reason === "MISSING_SELECTED_CANDLE" || row.reason === "INSUFFICIENT_M5_CONTEXT"));

const alias = api.detectAllPdfSignals({ ...input, selectedTime: selectedTime.replace(".000Z", "Z") });
assert.deepEqual(alias, baseline, "equivalent canonical UTC spellings must retain one selected prefix");

const future = api.detectAllPdfSignals({
  ...input,
  bars: [...bars, { ...bars.at(-1), t: new Date(Date.parse(selectedTime) + 300_000).toISOString(), c: 9000 }],
});
assert.deepEqual(future, baseline, "rows after the selected identity cannot alter all-PDF output");

console.log("WAVE 12 PDF SELECTED PREFIX IDENTITY PASS: missing selections fail closed, canonical UTC aliases resolve consistently, and future rows remain withheld.");
