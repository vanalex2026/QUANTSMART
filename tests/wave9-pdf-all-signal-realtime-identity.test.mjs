import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const read = (path) => JSON.parse(readFileSync(root + path, "utf8"));
const audit = read("artifacts/wave9-pdf-all-signal-realtime-identity.json");
const refresh = read("artifacts/wave7-real-receipt-refresh.json");
const realtime = read("artifacts/session32-browser-realtime-receipt.json");
const detectorReceipt = read("artifacts/wave8-pdf-all-signal-detector.json");
const { build } = createRequire(app + "package.json")("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts";', resolveDir: app },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

assert.equal(audit.result, "PASS");
assert.equal(audit.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(detectorReceipt.concepts.total, api.ALL_PDF_SIGNAL_CONCEPT_IDS.length);
assert.equal(api.ALL_PDF_SIGNAL_CONCEPT_IDS.length, 23);
assert.equal(refresh.run_count, 2);
for (const run of refresh.runs) {
  assert.equal(run.source, "MT5_CLOSED_BARS");
  assert.equal(run.symbol, "XAUUSD");
  assert.equal(run.timeframe, "M5");
  assert.equal(run.timestamp_basis, "UTC");
  assert.equal(run.forming_bar_included, false);
  assert.equal(run.last_bar, "2026-11-18T19:20:00Z");
}
assert.equal(realtime.formingCandle.closedEvidence, "WITHHELD_UNTIL_M5_CLOSE");

const markerBar = refresh.runs[0].detector.markers.at(-1).bar;
const selectedTime = markerBar.t;
const selectedMs = Date.parse(selectedTime);
const canonicalSelectedTime = new Date(selectedMs).toISOString();
const nowMs = Date.parse(refresh.runs[0].retrieved_at);
const epoch = selectedMs - 99 * 300_000;
const bridgeBars = Array.from({ length: 100 }, (_, i) => ({
  t: new Date(epoch + i * 300_000).toISOString(),
  o: 100 + i,
  h: 102 + i,
  l: 99 + i,
  c: 101 + i,
  closed: true,
}));
// Keep the selected identity and OHLC tied to the existing bridge receipt.
bridgeBars[99] = { ...markerBar, closed: true };
const input = { bars: bridgeBars, selectedTime, direction: "UP", protection: markerBar.l - 2, nowMs };
const run = () => api.detectAllPdfSignals(input);
const baseline = run();
assert.equal(baseline.ok, true);
assert.equal(baseline.symbol, "XAUUSD");
assert.equal(baseline.timeframe, "M5");
assert.equal(baseline.asOf, canonicalSelectedTime);
assert.equal(baseline.counts.total, 23);
assert.equal(baseline.observations.length, 23);
assert.ok(baseline.observations.some((row) => row.conceptId === "signal_entry_bar" && row.state === "DETECTED" && row.time === canonicalSelectedTime));
assert.ok(baseline.observations.every((row) => row.outcomeStatus === "WITHHELD"));
assert.equal(baseline.authority, audit.authority);
assert.equal(baseline.live_apply_allowed, false);

const geometryDetected = (result) => result.observations.filter((row) => row.sourceStatus === "DETECTOR_GEOMETRY" && row.state === "DETECTED");
const sourceObservation = (result, id) => result.observations.find((row) => row.conceptId === id && row.sourceStatus === "SOURCE_REVIEW_ONLY");

const formingTail = {
  t: new Date(selectedMs + 300_000).toISOString(),
  o: realtime.formingCandle.open,
  h: realtime.formingCandle.high,
  l: realtime.formingCandle.low,
  c: realtime.formingCandle.close,
  closed: false,
};
const forming = api.detectAllPdfSignals({ ...input, bars: [...bridgeBars, formingTail] });
assert.equal(forming.ok, true);
assert.equal(forming.markers.length, 0);
assert.equal(geometryDetected(forming).length, geometryDetected(baseline).length);
assert.equal(sourceObservation(forming, "signal_entry_bar")?.time, canonicalSelectedTime);

const gapped = api.detectAllPdfSignals({ ...input, bars: bridgeBars.filter((_, index) => index !== 95) });
assert.equal(gapped.ok, false);
assert.equal(gapped.reason, "INVALID_CAUSAL_PREFIX");
assert.equal(geometryDetected(gapped).length, 0);
assert.ok(gapped.observations.filter((row) => row.sourceStatus === "SOURCE_REVIEW_ONLY").every((row) => row.dataStatus === "UNAVAILABLE"));

const duplicate = api.detectAllPdfSignals({ ...input, bars: [...bridgeBars, { ...bridgeBars.at(-1) }] });
assert.equal(duplicate.ok, false);
assert.equal(geometryDetected(duplicate).length, 0);
assert.equal(sourceObservation(duplicate, "bracket_costs")?.reason, "DUPLICATE_SELECTED_IDENTITY");

const futureRow = {
  t: new Date(selectedMs + 300_000).toISOString(),
  o: markerBar.o,
  h: markerBar.h,
  l: markerBar.l,
  c: markerBar.c,
  closed: true,
};
const future = api.detectAllPdfSignals({ ...input, bars: [...bridgeBars, futureRow] });
assert.equal(future.ok, true);
assert.equal(future.asOf, canonicalSelectedTime);
assert.equal(sourceObservation(future, "signal_entry_bar")?.time, canonicalSelectedTime);
assert.equal(sourceObservation(future, "signal_entry_bar")?.state, "DETECTED");
assert.ok(future.observations.filter((row) => row.sourceStatus === "DETECTOR_GEOMETRY").every((row) => row.time === canonicalSelectedTime));

const stale = api.detectAllPdfSignals({ ...input, nowMs: selectedMs + 300_000 - 1 });
assert.equal(stale.ok, false);
assert.equal(sourceObservation(stale, "signal_entry_bar")?.state, "UNAVAILABLE");
assert.equal(sourceObservation(stale, "signal_entry_bar")?.reason, "INVALID_CAUSAL_PREFIX");
assert.equal(stale.observations.filter((row) => row.sourceStatus === "DETECTOR_GEOMETRY" && row.state === "DETECTED").length, 0);

const disabled = api.detectAllPdfSignals({ ...input, enabled: false });
assert.equal(disabled.ok, false);
assert.equal(disabled.state, "WITHHELD");
assert.equal(disabled.reason, "UNVERIFIED_CURRENT_EVIDENCE");
assert.ok(disabled.observations.filter((row) => row.sourceStatus === "SOURCE_REVIEW_ONLY").every((row) => row.state === "WITHHELD"));
assert.equal(disabled.authority, audit.authority);

assert.deepEqual(run(), baseline);
assert.deepEqual(run(), baseline);
assert.equal(audit.cases.two_run_reproducibility.detector_outputs_equal, true);
assert.equal(audit.cases.future_closed_row.future_row_rejected_by_wrapper, true);
assert.equal(audit.cases.stale_selected_evidence.geometry_still_evaluated, false);

console.log("WAVE 9 PDF ALL-SIGNAL REALTIME IDENTITY PASS: closed M5 selection, forming/gap/duplicate boundaries, stale and disabled evidence, future-row limitation, receipt identity and deterministic repeat are recorded.");
