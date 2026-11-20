import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: ["src/lib/focusedCurrentBarReadout.ts"], absWorkingDir: app,
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const helper = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

const bar = { i: 9, t: "2026-01-01T00:55:00Z", o: 10, h: 12, l: 9, c: 11, r: "P" };
assert.deepEqual(helper.focusedCurrentBarReadout(bar, { historyReady: true, freshnessOk: true }), {
  direction: "UP", timestamp: bar.t, ohlc: { open: 10, high: 12, low: 9, close: 11 }, status: "READY",
}, "a verified fresh closed candle must expose its body direction and OHLC");
assert.equal(helper.focusedCurrentBarReadout({ ...bar, c: 10 }, { historyReady: true, freshnessOk: true }).direction, "FLAT",
  "an equal open/close candle must remain neutral");
assert.equal(helper.focusedCurrentBarReadout(bar, { historyReady: false, freshnessOk: true }).direction, "WAIT",
  "unverified history must withhold the current-bar direction");
assert.equal(helper.focusedCurrentBarReadout(undefined, { historyReady: true, freshnessOk: true }).status, "WAIT",
  "an unavailable current bar must fail closed");
assert.match(source, /focusedCurrentBarReadout\(detectorBars\[detectorBars\.length - 1\]/,
  "focused chart must derive the readout from the same closed detector tape");
assert.match(source, /data-current-bar-direction=\{currentBarReadout\.direction\}/,
  "focused chart must expose the current-bar direction as a semantic data attribute");
assert.match(source, /SHADOW_ONLY \/ NO_DECISION/,
  "current-bar readout must retain the read-only authority boundary");
console.log("FOCUSED CURRENT BAR READOUT PASS: latest closed M5 candle direction and OHLC remain gated and descriptive.");
