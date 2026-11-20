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

const epoch = Date.parse("2026-11-01T00:00:00.000Z");
const bars = Array.from({ length: 180 }, (_, index) => {
  const open = 2000 + (index % 11) * 0.1;
  const close = open + ((index % 5) - 2) * 0.06;
  return { t: new Date(epoch + index * 300_000).toISOString(), o: open, h: Math.max(open, close) + 0.4, l: Math.min(open, close) - 0.4, c: close, closed: true };
});
const selectedTime = bars.at(-1).t;
const input = { bars, selectedTime, direction: "UP", protection: 1998, nowMs: epoch + 181 * 300_000 };
const baseline = api.detectAllPdfSignals(input);
assert.equal(baseline.observations.length, 23);
assert.equal(baseline.counts.detected + baseline.counts.abstain + baseline.counts.unavailable + baseline.counts.withheld, 23);

const selectedAlias = selectedTime.replace(".000Z", "+00:00");
assert.deepEqual(api.detectAllPdfSignals({ ...input, selectedTime: selectedAlias }), baseline, "equivalent UTC selected aliases preserve one result");
const offsetBars = bars.map((bar) => ({ ...bar, t: new Date(Date.parse(bar.t) + 60 * 60 * 1000).toISOString().replace(".000Z", "+01:00") }));
assert.deepEqual(api.detectAllPdfSignals({ ...input, bars: offsetBars, selectedTime: offsetBars.at(-1).t }), baseline, "equivalent UTC bar aliases canonicalize before reconciliation");

const duplicate = api.detectAllPdfSignals({ ...input, selectedTime: selectedAlias, bars: [...bars, { ...bars.at(-1), t: selectedAlias }] });
assert.equal(duplicate.ok, false);
assert.equal(duplicate.counts.detected, 0);
assert.ok(duplicate.observations.every((row) => row.state !== "DETECTED" || row.sourceStatus === "SOURCE_REVIEW_ONLY"));

const gapBars = bars.map((bar, index) => index === 120 ? { ...bar, t: new Date(Date.parse(bar.t) + 300_000).toISOString() } : bar);
const gapped = api.detectAllPdfSignals({ ...input, bars: gapBars });
assert.equal(gapped.counts.detected, 0, "a causal M5 gap cannot produce geometry detections");
assert.ok(gapped.observations.filter((row) => row.sourceStatus === "DETECTOR_GEOMETRY").every((row) => row.state !== "DETECTED"));

const forming = api.detectAllPdfSignals({ ...input, bars: bars.map((bar, index) => index === bars.length - 1 ? { ...bar, closed: false } : bar) });
assert.equal(forming.counts.detected, 0, "a forming selected row cannot produce detections");

const future = [...bars, { ...bars.at(-1), t: new Date(Date.parse(selectedTime) + 300_000).toISOString(), o: 9000, h: 9001, l: 8999, c: 9000.5 }];
assert.deepEqual(api.detectAllPdfSignals({ ...input, bars: future }), baseline, "rows after selected identity remain withheld");

assert.equal(api.detectAllPdfSignals({ ...input, symbol: "EURUSD" }).reason, "INVALID_XAUUSD_SYMBOL");
const invalidTimeframe = api.detectAllPdfSignals({ ...input, timeframe: "M15" });
assert.equal(invalidTimeframe.ok, false);
assert.equal(invalidTimeframe.reason, "INVALID_XAUUSD_TIMEFRAME");
assert.equal(invalidTimeframe.counts.detected, 0);

const observedThrough = bars[175].t.replace(".000Z", "+00:00");
const observed = api.detectAllPdfSignals({ ...input, selectedTime: bars[170].t, observedThrough, direction: "UP", resistanceLevel: bars[172].h });
assert.equal(observed.sourceNoteDescriptors.resistance_exit.state, "DESCRIPTIVE");
const observedFuture = api.detectAllPdfSignals({ ...input, selectedTime: bars[170].t, observedThrough, direction: "UP", resistanceLevel: bars[172].h, bars: [...bars, { ...bars.at(-1), o: 9999, h: 10000, l: 9998, c: 9999.5 }] });
assert.deepEqual(observedFuture, observed, "rows after observedThrough cannot rewrite identity-only observations");

console.log("WAVE 4 PDF DETECTOR CONTRACT PASS: UTC aliases, duplicate identities, gaps, forming/future rows, symbol/timeframe scope and observedThrough reconcile across all 23 concepts.");
