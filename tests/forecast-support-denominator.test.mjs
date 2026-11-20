import assert from "node:assert/strict";
import { createRequire } from "node:module";
const app = new URL("../mfe_ux_lab/cockpit", import.meta.url).pathname.replace(/^\/(.):/, "$1:");
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/candlePatternAtlas.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const atlas = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const prediction = (sampleN, effectiveN) => ({ sampleN, calibration: { effectiveN } });
const coverage = (selectedSamples, independentSelectedSamples = 4) => ({ causalCandidates: 20, rankedCandidates: 12, selectedSamples, independentSelectedSamples });
assert.equal(atlas.validateForecastSupportDenominators(prediction(8, 11), coverage(8)).ok, true,
  "coherent selected, independent, and calibrated support must pass");
for (const malformedCoverage of [null, false, true, 0, 8, "coverage", [], {}]) {
  assert.deepEqual(atlas.validateForecastSupportDenominators(prediction(8, 11), malformedCoverage),
    { ok: false, reason: "Analogue coverage denominator is malformed." },
    "null, nonobject, array, and incomplete coverage must fail closed without throwing");
}
assert.equal(atlas.validateForecastSupportDenominators(prediction(8, 11), coverage(3, 4)).ok, false,
  "independent analogue count above selected endpoint denominator must withhold");
assert.equal(atlas.validateForecastSupportDenominators(prediction(8, 12), coverage(8)).ok, false,
  "calibrated effective support above selected endpoints plus three priors must withhold");
assert.equal(atlas.validateForecastSupportDenominators(prediction(9, 11), coverage(8)).ok, false,
  "observed H+1 outcomes above selected endpoint denominator must withhold");
assert.equal(atlas.validateForecastSupportDenominators(prediction(2, 11), coverage(8)).ok, false,
  "selected endpoints without observed H+1 outcomes cannot inflate calibrated support");
assert.equal(atlas.validateForecastSupportDenominators(prediction(0, 8), coverage(8)).ok, false,
  "a zero-outcome posterior cannot reach the focused effective-support gate using endpoint metadata");
for (const sampleN of [undefined, null, NaN, Infinity, -1, 1.5, "8"]) {
  assert.equal(atlas.validateForecastSupportDenominators(prediction(sampleN, 11), coverage(8)).ok, false,
    `missing or malformed observed H+1 support (${String(sampleN)}) must not inherit selected endpoint support`);
}
assert.equal(atlas.validateForecastSupportDenominators({ calibration: { effectiveN: 11 } }, coverage(8)).ok, false,
  "a posterior with no observed sample count must not borrow selected endpoint support");
assert.equal(atlas.validateForecastSupportDenominators(undefined, coverage(8)).ok, false,
  "modern coverage without an H+1 prediction must withhold support");
assert.equal(atlas.validateForecastSupportDenominators(prediction(2, 5), coverage(8)).ok, true,
  "effective support may include the three smoothing priors beyond actually observed H+1 outcomes");
assert.equal(atlas.validateForecastSupportDenominators(prediction(0, 3), coverage(8)).ok, true,
  "a prior-only posterior stays inspectable while ordinary support gates withhold direction");
assert.equal(atlas.validateForecastSupportDenominators(prediction(8, 11), undefined).ok, true,
  "legacy analyses without coverage remain inspectable under ordinary gates");
assert.equal(atlas.validateForecastSupportDenominators({ calibration: { effectiveN: 11 } }, undefined).ok, true,
  "the explicit legacy no-coverage behavior remains inspectable when sample metadata is absent");
console.log("FORECAST SUPPORT DENOMINATOR PASS: focused support metadata fails closed when counts exceed causal denominators.");
