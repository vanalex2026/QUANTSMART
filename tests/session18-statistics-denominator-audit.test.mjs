import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");

const bundle = async (contents) => {
  const output = await build({ stdin: { contents, resolveDir: app }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
  return import("data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64"));
};
const { patternContextSelectionCensus } = await bundle("export { patternContextSelectionCensus } from './src/lib/patternContextSelectionCensus.ts';");
const atlas = await bundle("export { validateForecastSupportDenominators } from './src/lib/candlePatternAtlas.ts';");

const M5 = 300_000;
const epoch = Date.parse("2026-11-10T00:00:00.000Z");
const time = i => new Date(epoch + i * M5).toISOString();
const bars = Array.from({ length: 180 }, (_, i) => ({
  t: time(i), o: 100 + i * .05, h: 101 + i * .05, l: 99 + i * .05, c: 100.4 + i * .05, closed: true,
}));
// One ordinary UP endpoint and one exact FLAT endpoint.  The H+1 direction is
// close-to-close; a misleading next-bar open must not change its class.
bars[121] = { ...bars[121], o: bars[120].c + 5, h: bars[120].c + 5.1, l: bars[120].c - .1, c: bars[120].c };
const setup = i => ({ kind: "PATTERN_BREAK", version: "pattern-break/1", direction: "UP", signalBarTime: time(i - 1), confirmationTime: time(i), contextStart: time(i - 20), contextBoundary: 100, breakoutLevel: 101, protectionReference: 99, buildupTimes: [time(i - 4), time(i - 3), time(i - 2)], boundaryTouchTimes: [time(i - 4), time(i - 3), time(i - 2)], originalBreakTime: time(i - 1) });
const occurrences = [
  { i: 100, time: time(100), direction: "UP", nextBar: "UP", score: .8, setup: setup(100) },
  { i: 120, time: time(120), direction: "UP", nextBar: "FLAT", score: .8, setup: setup(120) },
];
const nowMs = epoch + 180 * M5;

const census = patternContextSelectionCensus(bars, occurrences, "pattern_break", true, nowMs);
assert.equal(census.state, "MEASURED");
assert.equal(census.measuredOccurrences, 2);
assert.equal(census.unavailableOccurrences, 0);
const measured = census.rows.filter(row => row.selection.state === "MEASURED");
assert.deepEqual(measured.map(row => row.nextBar), ["UP", "FLAT"], "H+1 direction is close-to-close and preserves FLAT");
for (const bucket of Object.values(census.buckets)) {
  assert.equal(bucket.denominator, bucket.outcomes.up + bucket.outcomes.down + bucket.outcomes.flat, "FLAT remains in every measured denominator");
  if (bucket.denominator) assert.equal(bucket.hitRate, bucket.wins / bucket.denominator);
}
assert.equal(census.rows[1].nextBar, "FLAT");

// Bars beyond confirmation/H+1 are outside the census's causal support.
const guarded = bars.map((bar, i) => {
  if (i <= 121) return Object.freeze({ ...bar });
  const future = { t: bar.t, closed: true };
  for (const key of ["o", "h", "l", "c"]) Object.defineProperty(future, key, { enumerable: true, get() { throw new Error(`future OHLC read: ${key}`); } });
  return Object.freeze(future);
});
assert.deepEqual(patternContextSelectionCensus(Object.freeze(guarded), occurrences, "pattern_break", true, nowMs), census, "future OHLC is never read by statistics");

const coverage = { causalCandidates: 20, rankedCandidates: 12, selectedSamples: 8, independentSelectedSamples: 4 };
assert.equal(atlas.validateForecastSupportDenominators({ sampleN: 8, calibration: { effectiveN: 11 } }, coverage).ok, true);
assert.equal(atlas.validateForecastSupportDenominators({ sampleN: 9, calibration: { effectiveN: 11 } }, coverage).ok, false, "H+1 support cannot exceed selected endpoints");
assert.equal(atlas.validateForecastSupportDenominators({ sampleN: 8, calibration: { horizon: 2, effectiveN: 11 } }, coverage).ok, true, "denominator validator does not turn H+2 into H+1 support");
assert.equal(atlas.validateForecastSupportDenominators({ sampleN: 2, calibration: { effectiveN: 12 } }, coverage).ok, false, "effective support cannot exceed observed H+1 outcomes plus priors");

console.log("SESSION 18 STATISTICS DENOMINATOR AUDIT PASS: H+1 close direction, FLAT-inclusive denominators, causal future isolation and forecast support bounds remain coherent.");
