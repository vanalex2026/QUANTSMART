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
const bars = Array.from({ length: 100 }, (_, i) => ({
  t: new Date(epoch + i * 300_000).toISOString(),
  o: 2000 + i * 0.02,
  h: 2001 + i * 0.02,
  l: 1999 + i * 0.02,
  c: 2000.5 + i * 0.02,
  closed: true,
}));
const selectedTime = bars.at(-1).t;
const baseInput = { bars, selectedTime, direction: "UP", nowMs: epoch + 101 * 300_000 };

const wrongSymbol = api.detectAllPdfSignals({ ...baseInput, symbol: "EURUSD" });
assert.equal(wrongSymbol.ok, false);
assert.equal(wrongSymbol.reason, "INVALID_XAUUSD_SYMBOL");
assert.equal(wrongSymbol.observations.length, 23);
assert.equal(wrongSymbol.counts.detected, 0);
assert.ok(wrongSymbol.observations.every((row) => row.state !== "DETECTED"));

const alias = selectedTime.replace(".000Z", "Z");
const duplicateAlias = api.detectAllPdfSignals({
  ...baseInput,
  bars: [...bars, { ...bars.at(-1) }],
  selectedTime: alias,
});
assert.equal(duplicateAlias.ok, false);
assert.equal(duplicateAlias.observations.length, 23);
assert.equal(duplicateAlias.counts.detected, 0);
assert.ok(duplicateAlias.observations.every((row) => row.state !== "DETECTED" || row.sourceStatus === "SOURCE_REVIEW_ONLY"));

console.log("WAVE 13 PDF DETECTOR CONTRACT PASS: wrong-symbol input and equivalent-timestamp duplicate identities fail closed across all 23 concepts.");
