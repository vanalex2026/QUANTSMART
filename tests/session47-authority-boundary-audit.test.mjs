import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const microscope = read("mfe_ux_lab/cockpit/src/pages/Microscope.tsx");
const coverageShelf = read("mfe_ux_lab/cockpit/src/components/PdfSignalCoverageShelf.tsx");
const microChart = read("mfe_ux_lab/cockpit/src/components/MicroChart.tsx");
const translation = read("mfe_ux_lab/cockpit/src/components/PdfSignalTranslationEvidence.tsx");
const authority = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false";

// Source-note descriptors may be shown as descriptive review markers, but the
// UI must keep their source status and withheld outcome attached.
const sourceSignalBlock = microscope.match(
  /const currentPdfSourceSignals[\s\S]*?;\r?\n  \/\/ The bounded atlas tape/,
);
assert.ok(sourceSignalBlock, "focused PDF source-signal block must remain discoverable");
assert.match(
  sourceSignalBlock[0],
  /sourceStatus === "SOURCE_REVIEW_ONLY"/,
  "source-review markers must remain explicitly labelled as source review",
);

// Visible PDF and chart authority labels must carry the same machine-readable
// no-live-apply contract as detector and live-forming receipts.
assert.match(coverageShelf, /result\.authority/,
  "PDF coverage shelf must render the detector's exact authority contract");
assert.match(microChart, /liveDetection\.authority/,
  "MicroChart must render the live-forming detector's exact authority receipt");
assert.match(microChart, /data-live-detection=\{liveDetection\.state\}/,
  "MicroChart must expose the live-forming state alongside its authority receipt");

const app = new URL("../mfe_ux_lab/cockpit/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: [
    'export * from "./src/lib/pdfSignalDetector.ts";',
    'export * from "./src/lib/liveTickModel.ts";',
  ].join("\n"), resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const epoch = Date.parse("2026-11-01T00:00:00.000Z");
const bars = Array.from({ length: 100 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const selectedTime = bars.at(-1).t;
const baseline = api.detectAllPdfSignals({
  bars,
  selectedTime,
  direction: "UP",
  protection: 1998,
  nowMs: epoch + 101 * 300_000,
});
assert.equal(baseline.authority, authority);
assert.equal(baseline.live_apply_allowed, false);
assert.ok(baseline.observations
  .filter((observation) => observation.sourceStatus === "SOURCE_REVIEW_ONLY")
  .every((observation) => observation.outcomeStatus === "WITHHELD"));
assert.ok(baseline.observations
  .filter((observation) => observation.sourceStatus === "SOURCE_REVIEW_ONLY")
  .every((observation) => observation.i == null || observation.time === selectedTime));

// Adding a future or mutable tail must not change the official detector result.
const baselineInput = {
  bars,
  selectedTime,
  direction: "UP",
  protection: 1998,
  nowMs: epoch + 101 * 300_000,
};
const future = [...bars, { ...bars.at(-1), t: new Date(epoch + 100 * 300_000).toISOString(), closed: false, c: 9999 }];
assert.deepEqual(
  api.detectAllPdfSignals({ ...baselineInput, bars: future }),
  baseline,
  "future/forming rows must not enter the official detector result",
);
const disabled = api.detectAllPdfSignals({ bars, selectedTime, enabled: false, nowMs: epoch + 101 * 300_000 });
assert.equal(disabled.authority, authority);
assert.equal(disabled.live_apply_allowed, false);
assert.equal(disabled.counts.withheld, 23);
assert.ok(disabled.observations.every((observation) => observation.state === "WITHHELD"));

const closedTime = "2026-10-28T03:00:00.000Z";
const liveFrame = api.parseLiveTickFrame({
  ok: true,
  cursor: "4:1793156400000:2",
  generation: 4,
  symbol: "XAUUSD",
  timeframe: "M5",
  broker_symbol: "GOLD",
  ticks: [{ time_msc: Date.parse("2026-10-28T03:06:03Z"), bid: 100, ask: 101, last: 100, flags: 2 }],
  bar: { time: "2026-10-28T03:05:00.000Z", open: 100, high: 103, low: 99, close: 102 },
  closed_bar: { time: closedTime, open: 99, high: 101, low: 98, close: 100 },
}, { symbol: "XAUUSD", tf: "M5" });
assert.ok(liveFrame);
assert.equal(api.liveFormingDetection(liveFrame, "live", closedTime).authority, authority);
assert.equal(api.liveFormingDetection(liveFrame, "stale", closedTime).authority, authority);
assert.equal(api.liveFormingDetection(liveFrame, "reconnecting", closedTime).authority, authority);
assert.equal(api.liveFormingDetection(null, "live").authority, authority);

assert.match(coverageShelf, /No tile is an order, fill or forecast/);
assert.match(translation, /Outcomes, orders, fills and forecasts remain withheld/);
assert.match(microscope, /no source label, outcome, fill or order authority/);
assert.doesNotMatch(
  `${microscope}\n${coverageShelf}\n${microChart}`,
  /live_apply_allowed\s*=\s*true/,
  "focused PDF/live forming UI must not expose a positive live-apply flag",
);

console.log("SESSION 47 AUTHORITY BOUNDARY AUDIT PASS: source-only chart promotion, exact authority copy, closed/future withholding and live-forming readout boundaries are enforced.");
