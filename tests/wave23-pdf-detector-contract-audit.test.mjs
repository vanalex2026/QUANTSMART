import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const audit = JSON.parse(readFileSync(`${root}/artifacts/wave23-pdf-detector-contract-audit.json`, "utf8"));
const { build } = createRequire(`${app}/package.json`)("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
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
assert.equal(api.ALL_PDF_SIGNAL_CONCEPT_IDS.length, 23);
assert.equal(baseline.observations.length, 23);
assert.equal(baseline.counts.total, 23);
assert.equal(baseline.counts.detected + baseline.counts.abstain + baseline.counts.unavailable + baseline.counts.withheld, 23);
assert.equal(baseline.symbol, "XAUUSD");
assert.equal(baseline.timeframe, "M5");
assert.equal(baseline.asOf, selectedTime);
assert.equal(baseline.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(baseline.live_apply_allowed, false);
assert.ok(baseline.observations.every((observation) => observation.outcomeStatus === "WITHHELD"));

const futureRows = [...bars, {
  t: new Date(Date.parse(selectedTime) + 300_000).toISOString(),
  o: 9000,
  h: 9001,
  l: 8999,
  c: 9000.5,
  closed: true,
}];
assert.deepEqual(api.detectAllPdfSignals({ ...input, bars: futureRows }), baseline);

const wrongSymbol = api.detectAllPdfSignals({ ...input, symbol: "EURUSD" });
assert.equal(wrongSymbol.ok, false);
assert.equal(wrongSymbol.reason, "INVALID_XAUUSD_SYMBOL");
assert.equal(wrongSymbol.counts.detected, 0);

const alias = selectedTime.replace(".000Z", "Z");
const duplicate = api.detectAllPdfSignals({ ...input, selectedTime: alias, bars: [...bars, { ...bars.at(-1) }] });
assert.equal(duplicate.ok, false);
assert.equal(duplicate.counts.detected, 0);

const disabled = api.detectAllPdfSignals({ ...input, enabled: false });
assert.equal(disabled.state, "WITHHELD");
assert.equal(disabled.reason, "UNVERIFIED_CURRENT_EVIDENCE");
const geometryLeak = disabled.observations.some((observation) =>
  observation.sourceStatus === "DETECTOR_GEOMETRY" && observation.state !== "WITHHELD");
assert.equal(geometryLeak, false);
assert.equal(disabled.counts.detected, 0);
assert.equal(disabled.counts.abstain, 0);
assert.equal(disabled.counts.unavailable, 0);
assert.equal(disabled.counts.withheld, 23);
assert.equal(audit.cases.disabled_mode.geometry_observations_withheld, true);
assert.equal(audit.result, "PASS");
assert.equal(audit.cases.authority.value, baseline.authority);
console.log("WAVE 23 PDF DETECTOR CONTRACT AUDIT PASS: all 23 concepts preserve identity, state counts, future-row invariance and research-only authority, including fully withheld disabled evidence.");
