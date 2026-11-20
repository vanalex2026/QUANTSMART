import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url))("esbuild");
const bundle = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts";', resolveDir: app },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const artifact = JSON.parse(readFileSync(new URL("../artifacts/wave8-pdf-all-signal-detector.json", import.meta.url), "utf8"));

assert.equal(artifact.result, "PASS");
assert.equal(artifact.concepts.total, 23);
assert.equal(artifact.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(api.ALL_PDF_SIGNAL_CONCEPT_IDS.length, 23);

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
const result = api.detectAllPdfSignals({
  bars,
  selectedTime,
  direction: "UP",
  protection: 1998,
  nowMs: epoch + 101 * 300_000,
});
assert.equal(result.symbol, "XAUUSD");
assert.equal(result.timeframe, "M5");
assert.equal(result.counts.total, 23);
assert.equal(result.observations.length, 23);
assert.equal(result.authority, artifact.authority);
assert.equal(result.live_apply_allowed, false);
assert.ok(result.observations.some((row) => row.conceptId === "signal_entry_bar" && row.state === "DETECTED"));
for (const row of result.observations) {
  assert.ok(["DETECTED", "ABSTAIN", "UNAVAILABLE", "WITHHELD"].includes(row.state));
  assert.equal(row.outcomeStatus, "WITHHELD");
}

const disabled = api.detectAllPdfSignals({ bars, selectedTime, enabled: false });
assert.equal(disabled.state, "WITHHELD");
assert.equal(disabled.counts.total, 23);
assert.ok(disabled.counts.withheld >= 10);

const malformed = api.detectAllPdfSignals({
  bars: bars.map((bar, index) => index === 60 ? { ...bar, closed: false } : bar),
  selectedTime,
  direction: "UP",
  nowMs: epoch + 101 * 300_000,
});
assert.equal(malformed.ok, false);
assert.ok(malformed.observations.every((row) => row.state !== "DETECTED" || row.sourceStatus === "SOURCE_REVIEW_ONLY"));

console.log("WAVE 8 PDF ALL-SIGNAL DETECTOR PASS: all 23 PDF concepts resolve on XAUUSD M5 with explicit descriptive, abstain, unavailable and withheld states.");
