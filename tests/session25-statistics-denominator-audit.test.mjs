import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const output = await build({
  stdin: { contents: "export { noLookaheadDiagnostic, validateForecastSupportDenominators } from './src/lib/candlePatternAtlas.ts'; export { patternContextSelectionCensus } from './src/lib/patternContextSelectionCensus.ts';", resolveDir: app },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const atlas = await import("data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64"));

const M5 = 300_000;
const epoch = Date.parse("2026-11-17T00:00:00.000Z");
const time = i => new Date(epoch + i * M5).toISOString();
const bars = Array.from({ length: 140 }, (_, i) => ({
  t: time(i), o: 2000 + i * 0.2, h: 2001 + i * 0.2, l: 1999 + i * 0.2, c: 2000.4 + i * 0.2, closed: true,
}));

const setup = i => ({
  kind: "PATTERN_BREAK", version: "pattern-break/1", direction: "UP",
  signalBarTime: time(i - 1), confirmationTime: time(i), contextStart: time(i - 20),
  contextBoundary: 2000, breakoutLevel: 2001, protectionReference: 1999,
  buildupTimes: [time(i - 4), time(i - 3), time(i - 2)],
  boundaryTouchTimes: [time(i - 4), time(i - 3), time(i - 2)], originalBreakTime: time(i - 1),
});
const selectedOccurrences = [
  { i: 100, time: time(100), direction: "UP", nextBar: "UP", score: .8, setup: setup(100) },
  { i: 120, time: time(120), direction: "UP", nextBar: "FLAT", score: .8, setup: setup(120) },
];
bars[121] = { ...bars[121], o: bars[120].c + 2, h: bars[120].c + 2.1, l: bars[120].c - .1, c: bars[120].c };

const diagnostic = atlas.noLookaheadDiagnostic(bars, "M5", "XAUUSD", { lookback: 5, evaluationIndex: 100 });
assert.equal(diagnostic.ok, true, "future closed rows must be exercised without changing the fixed query");
assert.equal(diagnostic.unchanged, true);
assert.equal(diagnostic.recurrenceCausal, true);
assert.equal(diagnostic.matchesCausal, true);
assert.ok(diagnostic.futureRows > 0);
assert.ok(diagnostic.eligibleFutureRows > 0);
assert.equal(diagnostic.baselineAsOf, bars[100].t);
assert.equal(diagnostic.mutatedAsOf, bars[100].t);

const census = atlas.patternContextSelectionCensus(bars, selectedOccurrences, "pattern_break", true, epoch + 140 * M5);
assert.equal(census.state, "MEASURED");
assert.equal(census.measuredOccurrences, 2);
for (const bucket of Object.values(census.buckets)) {
  assert.equal(bucket.denominator, bucket.outcomes.up + bucket.outcomes.down + bucket.outcomes.flat, "FLAT remains in selected-occurrence denominators");
}

const coverage = { causalCandidates: 20, rankedCandidates: 12, selectedSamples: 8, independentSelectedSamples: 4 };
assert.equal(atlas.validateForecastSupportDenominators({ sampleN: 8, calibration: { effectiveN: 11 } }, coverage).ok, true);
assert.equal(atlas.validateForecastSupportDenominators({ sampleN: 8, calibration: { effectiveN: 11.02 } }, coverage).ok, false, "calibrated support cannot exceed observed H+1 support plus the three priors");
assert.equal(atlas.validateForecastSupportDenominators({ sampleN: 9, calibration: { effectiveN: 11 } }, coverage).ok, false, "observed H+1 support cannot exceed selected endpoints");
assert.equal(atlas.validateForecastSupportDenominators({ sampleN: 2, calibration: { effectiveN: 5 } }, coverage).ok, true, "sparse posterior remains inspectable while ordinary forecast gates withhold direction");

console.log("SESSION 25 STATISTICS DENOMINATOR AUDIT PASS: fixed-query future mutation, causal endpoint purge, selected support bounds and prior-aware H+1 denominators remain coherent.");
