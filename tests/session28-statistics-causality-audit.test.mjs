import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const output = await build({
  stdin: {
    contents: `
      export { detectM5PriceAction, measurePriceActionEvidence } from './src/lib/priceActionDetector.ts';
      export { patternContextSelectionCensus } from './src/lib/patternContextSelectionCensus.ts';
      export { measurePatternTechnicalObstacleOutcomes } from './src/lib/patternTechnicalObstacleOutcomes.ts';
      export { resolvePatternReplayBookmark } from './src/lib/patternReplayBookmarkResolution.ts';
    `,
    resolveDir: app,
  },
  bundle: true, platform: "node", format: "esm", jsx: "automatic", write: false,
  logLevel: "silent", external: ["react", "react/jsx-runtime"],
});
const api = await import("data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64"));

const M5 = 300_000;
const epoch = Date.parse("2026-11-17T00:00:00.000Z");
const time = i => new Date(epoch + i * M5).toISOString();
const bar = (i, fields = {}) => ({ t: time(i), o: 2000 + i * .2, h: 2001 + i * .2, l: 1999 + i * .2, c: 2000.4 + i * .2, closed: true, ...fields });

// A zero-range retained row is invalid historical OHLC. It must not become a
// detector endpoint or silently alter the evaluated/H+1 denominator.
const detectorBars = Array.from({ length: 80 }, (_, i) => bar(i));
detectorBars[40] = bar(40, { o: detectorBars[40].c, h: detectorBars[40].c, l: detectorBars[40].c });
const zeroRangeEvidence = api.measurePriceActionEvidence(detectorBars, { symbol: "XAUUSD" });
assert.ok(Object.values(zeroRangeEvidence).every(e => e.evaluated === 0 && e.occurrences === 0 && e.history.length === 0));
const zeroRangeResult = api.detectM5PriceAction(detectorBars, { symbol: "XAUUSD" });
assert.equal(zeroRangeResult.ok, false);
assert.equal(zeroRangeResult.reason, "INVALID_OR_FORMING_BAR_INPUT");

// Selected-occurrence census keeps the observed close-to-close FLAT outcome in
// its denominator and never reads OHLC after the H+1 boundary.
const censusBars = Array.from({ length: 140 }, (_, i) => ({ t: time(i), o: 2000 + i * .2, h: 2001 + i * .2, l: 1999 + i * .2, c: 2000.4 + i * .2, closed: true }));
const setup = i => ({ kind: "PATTERN_BREAK", version: "pattern-break/1", direction: "UP", signalBarTime: time(i - 1), confirmationTime: time(i), contextStart: time(i - 20), contextBoundary: 2000, breakoutLevel: 2001, protectionReference: 1999, buildupTimes: [time(i - 4), time(i - 3), time(i - 2)], boundaryTouchTimes: [time(i - 4), time(i - 3), time(i - 2)], originalBreakTime: time(i - 1) });
const occurrences = [
  { i: 100, time: time(100), direction: "UP", nextBar: "UP", score: .8, setup: setup(100) },
  { i: 120, time: time(120), direction: "UP", nextBar: "FLAT", score: .8, setup: setup(120) },
];
censusBars[121] = { ...censusBars[121], o: censusBars[120].c + 2, h: censusBars[120].c + 2.1, l: censusBars[120].c - .1, c: censusBars[120].c };
const nowMs = epoch + 140 * M5;
const census = api.patternContextSelectionCensus(censusBars, occurrences, "pattern_break", true, nowMs);
assert.equal(census.state, "MEASURED");
assert.equal(census.measuredOccurrences, 2);
assert.deepEqual(census.rows.map(row => row.nextBar), ["UP", "FLAT"]);
for (const bucket of Object.values(census.buckets)) assert.equal(bucket.denominator, bucket.outcomes.up + bucket.outcomes.down + bucket.outcomes.flat);
const guarded = censusBars.map((value, i) => {
  if (i <= 121) return Object.freeze({ ...value });
  const future = { t: value.t, closed: true };
  for (const key of ["o", "h", "l", "c"]) Object.defineProperty(future, key, { enumerable: true, get() { throw new Error(`future OHLC read: ${key}`); } });
  return Object.freeze(future);
});
assert.deepEqual(api.patternContextSelectionCensus(Object.freeze(guarded), occurrences, "pattern_break", true, nowMs), census);

// Technical obstacle outcomes classify every row, while only known first
// touches enter the resolved obstacle/protection denominator.
const obstacleBars = Array.from({ length: 100 }, (_, i) => ({ t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString(), o: 100, h: 101, l: 99, c: 100, closed: true }));
obstacleBars[70] = { ...obstacleBars[70], h: 105 };
const obstacleSetup = { kind: "PATTERN_BREAK", direction: "UP", confirmationTime: obstacleBars[99].t, protectionReference: 95 };
const obstacleFuture = [...obstacleBars, { t: new Date(Date.parse(obstacleBars.at(-1).t) + M5).toISOString(), o: 100, h: 106, l: 99, c: 104, closed: true }];
const obstacleRows = [
  { i: 99, time: obstacleBars[99].t, direction: "UP", nextBar: "UP", score: 1, setup: obstacleSetup },
  { i: 99, time: obstacleBars[99].t, direction: "UP", nextBar: "UP", score: 1, setup: { ...obstacleSetup, confirmationTime: obstacleBars[98].t } },
];
const obstacleSummary = api.measurePatternTechnicalObstacleOutcomes(obstacleFuture, obstacleRows);
assert.equal(obstacleSummary.total, 2);
assert.equal(obstacleSummary.resolved, 1);
assert.equal(obstacleSummary.excluded, 1);
assert.equal(obstacleSummary.obstacleFirstRate, 1);

// Replay restores only the exact retained occurrence and causal prefix. It
// never carries retrospective evidence or unrevealed future OHLC.
const replayBars = Array.from({ length: 70 }, (_, i) => ({ t: time(i), o: 100, h: 101, l: 99, c: 100, closed: true }));
const replayIndex = 45;
const signal = { time: replayBars[replayIndex].t, reads: "bullish", label: "Synthetic pattern", conceptId: "pattern_break", annotationKind: "pattern", measures: "Synthetic UI test" };
const bookmark = { version: "pattern-replay-bookmark/1", occurrenceTime: signal.time, conceptId: signal.conceptId, reads: signal.reads, mode: "outcome", revealedTime: replayBars[replayIndex + 1].t, authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false };
const restored = api.resolvePatternReplayBookmark(bookmark, signal, replayBars, true, epoch + 71 * M5);
assert.equal(restored.state, "AVAILABLE");
assert.equal("evidence" in restored, false);
assert.equal("statistics" in restored.replay, false);
assert.equal(restored.replay.futureWithheld, true);

console.log("SESSION 28 STATISTICS CAUSALITY AUDIT PASS: zero-range detector rows fail closed, selected H+1 denominators remain FLAT-inclusive and future-isolated, obstacle rates exclude unresolved rows, and replay restores identity-only causal evidence.");
