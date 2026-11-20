import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const audit = JSON.parse(readFileSync(`${root}/artifacts/session45-pdf-detector-surface-audit.json`, "utf8"));
const { build } = createRequire(`${app}/package.json`)("esbuild");
const bundled = await build({
  stdin: { contents: [
    'export * from "./src/lib/pdfSignalDetector.ts";',
    'export * from "./src/lib/patternExitEventIdentity.ts";',
  ].join("\n"), resolveDir: app },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const epoch = Date.parse("2026-11-01T00:00:00.000Z");
const bars = Array.from({ length: 180 }, (_, index) => {
  const open = 2000 + (index % 11) * 0.1;
  const close = open + ((index % 5) - 2) * 0.06;
  return {
    t: new Date(epoch + index * 300_000).toISOString(),
    o: open,
    h: Math.max(open, close) + 0.4,
    l: Math.min(open, close) - 0.4,
    c: close,
    closed: true,
  };
});
const selectedTime = bars.at(-1).t;
const input = { bars, selectedTime, direction: "UP", protection: 1998, nowMs: epoch + 181 * 300_000 };
const baseline = api.detectAllPdfSignals(input);
const ids = new Set(baseline.observations.map((observation) => observation.conceptId));
assert.equal(audit.result, "PASS");
assert.equal(audit.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(api.ALL_PDF_SIGNAL_CONCEPT_IDS.length, 23);
assert.equal(ids.size, 23);
assert.equal(baseline.observations.length, 23);
assert.deepEqual(baseline.counts, {
  total: 23,
  detected: baseline.counts.detected,
  abstain: baseline.counts.abstain,
  unavailable: baseline.counts.unavailable,
  withheld: baseline.counts.withheld,
});
assert.equal(baseline.counts.detected + baseline.counts.abstain + baseline.counts.unavailable + baseline.counts.withheld, 23);
assert.ok(baseline.observations.every((observation) => observation.outcomeStatus === "WITHHELD"));
assert.ok(baseline.observations.filter((observation) => observation.sourceStatus === "SOURCE_REVIEW_ONLY").every((observation) => !baseline.markers.some((marker) => marker.conceptId === observation.conceptId)));
assert.ok(baseline.markers.every((marker) => marker.conceptId && baseline.observations.find((observation) => observation.conceptId === marker.conceptId)?.sourceStatus === "DETECTOR_GEOMETRY"));

const future = [...bars, { t: new Date(epoch + 180 * 300_000).toISOString(), o: 9000, h: 9001, l: 8999, c: 9000.5, closed: true }];
assert.deepEqual(api.detectAllPdfSignals({ ...input, bars: future }), baseline, "future rows cannot rewrite the selected observation surface");
assert.equal(api.detectAllPdfSignals({ ...input, symbol: "EURUSD" }).reason, "INVALID_XAUUSD_SYMBOL");
const disabled = api.detectAllPdfSignals({ ...input, enabled: false });
assert.equal(disabled.counts.withheld, 23);
assert.equal(disabled.counts.detected, 0);

const calendar = {
  status: "CONFIGURED",
  source: "validated-calendar-feed",
  updated_at: new Date(epoch).toISOString(),
  events: [{ title: "CPI", at_utc: new Date(epoch + 180 * 300_000).toISOString() }],
};
const defaultNews = api.patternExitEventIdentity({ kind: "NEWS", bars, occurrenceTime: selectedTime, direction: "UP", calendar, nowMs: epoch + 182 * 300_000 });
assert.equal(defaultNews.state, "WITHHELD", "a later event needs an explicit observed-through boundary");
const observedTape = [...bars, { t: new Date(epoch + 180 * 300_000).toISOString(), o: 2000, h: 2001, l: 1999, c: 2000.5, closed: true }];
const observedThrough = api.patternExitEventIdentity({ kind: "NEWS", bars: observedTape, occurrenceTime: bars[178].t, observedThrough: observedTape[180].t, direction: "UP", calendar, nowMs: epoch + 182 * 300_000 });
assert.equal(observedThrough.state, "AVAILABLE");
assert.equal(observedThrough.event.observation, "NEWS_EVENT_IDENTITY");
assert.equal(observedThrough.outcomeStatus, "WITHHELD");

console.log("SESSION 45 PDF DETECTOR SURFACE AUDIT PASS: all 23 concepts preserve identity, causal future-row withholding, source/geometry separation and the fixed NEWS boundary.");
