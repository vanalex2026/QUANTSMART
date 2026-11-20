import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const bundled = await build({ stdin: { contents: "export * from './src/lib/analogueWindowGeometry.ts'", resolveDir: app }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { analogueSetupDirection, analogueWindowGeometry } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const prefix = [{ h: 102, l: 98, c: 100 }, { h: 104, l: 100, c: 102 }, { h: 106, l: 102, c: 104 }];
const upOutcome = { h: 2000, l: 104, c: 1900 };
const downOutcome = { h: 105, l: -2000, c: -1900 };
for (const [pattern, direction, target, invalidation] of [["HAMMER", "UP", 112.8, 100], ["SHOOTING_STAR", "DOWN", 95.2, 108]]) {
  const expected = { entry: 104, direction, localAtr: 4, target, invalidation };
  assert.deepEqual(analogueWindowGeometry([...prefix, upOutcome], 2, [pattern]), expected);
  assert.deepEqual(analogueWindowGeometry([...prefix, downOutcome], 2, [pattern]), expected, "flipping the observed outcome cannot flip the setup or resize its risk geometry");
  assert.deepEqual(analogueWindowGeometry(prefix, 2, [pattern]), expected, "no future bar is required to price the historical setup");
  assert.deepEqual(analogueWindowGeometry([...prefix, downOutcome, upOutcome, { h: NaN, l: NaN, c: NaN }], 2, [pattern]), expected, "appended or malformed future data cannot alter setup pricing");
}
for (const patterns of [undefined, [], ["DOJI"], ["UNKNOWN"], ["BULLISH_FAKE"], ["HAMMER", "SHOOTING_STAR"], ["HAMMER", "DOJI"]]) {
  assert.equal(analogueSetupDirection(patterns), "NEUTRAL");
  for (const future of [upOutcome, downOutcome]) {
    const result = analogueWindowGeometry([...prefix, future], 2, patterns);
    assert.equal(result.target, null, "unknown, neutral or conflicting setup evidence must withhold target even when an outcome is directional");
    assert.equal(result.invalidation, null);
  }
}
assert.equal(analogueSetupDirection(["HAMMER", "BULLISH_ENGULFING"]), "UP", "matching detected setup orientations may agree independently of outcome");
assert.deepEqual(analogueWindowGeometry([prefix[0], upOutcome], 0, ["HAMMER"]), { entry: 100, direction: "UP", localAtr: null, target: null, invalidation: null }, "a first-bar setup cannot use its future outcome as ATR evidence");
assert.equal(analogueWindowGeometry(prefix, 3, ["HAMMER"]).entry, null, "a missing endpoint must withhold geometry rather than shift to an outcome");
assert.equal(analogueWindowGeometry([{ h: NaN, l: 0, c: 0 }, ...prefix], 3, ["HAMMER"]).target, null);
console.log("ANALOGUE WINDOW CAUSALITY PASS: setup names determine direction; only endpoint prefix prices ATR; future direction, size, presence and validity cannot change setup geometry.");

const { readFileSync } = await import("node:fs");
const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const windowSource = microscope.slice(microscope.indexOf("function AnalogueMiniChart("), microscope.indexOf("function CandleWindow("));
assert.match(windowSource, /analogueWindowGeometry\(bars, endpointIndex, setupPatterns\)/, "rendered mini-chart must use the tested causal helper");
assert.doesNotMatch(windowSource, /const observedDirection|const localAtr|const positionLabel = outcome/, "outcomes cannot price or orient the rendered setup");
assert.match(microscope, /<AnalogueMiniChart[^\n]*endpointIndex=\{nearestAnalogue\.endIndex - Math\.max/, "the parent must pass the actual endpoint even without a future row");
