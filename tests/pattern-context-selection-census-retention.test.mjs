import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: {
    contents: "export * from './src/lib/patternContextSelectionCensus.ts'; export * from './src/lib/m5Retention.ts';",
    resolveDir: app,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const { patternContextSelectionCensus: census, capM5DisplayWindow: retain } = api;

const M5 = 300_000;
const epoch = Date.parse("2026-11-10T00:00:00.000Z");
const time = i => new Date(epoch + i * M5).toISOString();
const bars = Array.from({ length: 150 }, (_, i) => ({
  t: time(i),
  o: 100 + i * .05,
  h: 101 + i * .05,
  l: 99 + i * .05,
  c: 100.4 + i * .05,
  closed: true,
}));
const setup = (i, direction = "UP") => ({
  kind: "PATTERN_BREAK",
  version: "pattern-break/1",
  direction,
  signalBarTime: time(i - 1),
  confirmationTime: time(i),
  contextStart: time(i - 20),
  contextBoundary: 100,
  breakoutLevel: 101,
  protectionReference: 99,
  buildupTimes: [time(i - 4), time(i - 3), time(i - 2)],
  boundaryTouchTimes: [time(i - 4), time(i - 3), time(i - 2)],
  originalBreakTime: time(i - 1),
});
const occurrence = (i, nextBar = "UP") => ({
  i,
  time: time(i),
  direction: "UP",
  nextBar,
  score: .8,
  setup: setup(i),
});
const clock = epoch + 151 * M5;

const measured = (tape = bars, rows = [occurrence(110), occurrence(111), occurrence(112)], nowMs = clock) =>
  census(tape, rows, "pattern_break", true, nowMs);

test("canonical UTC/M5 identities survive reindexing and retention without ordinal substitution", () => {
  const original = measured();
  assert.equal(original.state, "MEASURED");
  assert.equal(original.measuredOccurrences, 3);
  assert.equal(original.authority, "SHADOW_ONLY / NO_DECISION");
  assert.equal(original.live_apply_allowed, false);

  const reindexed = measured(bars.slice(20));
  assert.deepEqual(reindexed.rows, original.rows, "exact UTC identities remap after prefix retention");
  assert.equal(reindexed.measuredOccurrences, original.measuredOccurrences);

  const missing = measured(bars.slice(111), [occurrence(110)]);
  assert.equal(missing.rows[0].occurrenceTime, time(110));
  assert.equal(missing.rows[0].reason, "MISSING_OR_INVALID_SETUP_CANDLE", "expired UTC identity cannot select its old array ordinal");

  const aliasTape = bars.map((bar, i) => i === 110 ? { ...bar, t: time(i).replace(".000Z", "Z") } : bar);
  assert.deepEqual(measured(aliasTape).rows, original.rows, "focused M5 seconds aliases normalize to the same UTC identity");
  assert.deepEqual(measured(bars, [ { ...occurrence(110), time: time(110).replace(".000Z", "Z") } ]).rows, original.rows.slice(0, 1), "occurrence seconds aliases normalize to the same UTC identity");
});

test("two-year retention keeps the inclusive UTC cutoff and excludes the next M5", () => {
  const latest = "2028-11-10T00:00:00.000Z";
  const boundary = "2026-11-10T00:00:00.000Z";
  const before = "2026-11-09T23:55:00.000Z";
  const retained = retain([
    { t: before, c: 1 },
    { t: boundary, c: 2 },
    { t: latest, c: 3 },
  ], "M5");
  assert.deepEqual(retained.map(row => row.t), [boundary, latest]);

  const futureTail = { ...bars.at(-1), t: "2028-11-10T09:10:00.000Z" };
  const atCutoff = retain([...bars, futureTail], "M5");
  assert.equal(atCutoff[0].t, time(110));
  const retentionClock = Date.parse(futureTail.t) + 2 * M5;
  const atResult = measured(atCutoff, [occurrence(110)], retentionClock);
  assert.equal(atResult.rows[0].occurrenceTime, time(110));
  assert.equal(atResult.rows[0].reason, "INSUFFICIENT_CLOSED_CONTEXT", "retaining the anchor alone does not invent causal context");
  const afterCutoff = retain([...bars, { ...futureTail, t: "2028-11-10T09:15:00.000Z" }], "M5");
  assert.equal(afterCutoff[0].t, time(111));
  const expiredResult = measured(afterCutoff, [occurrence(110)], retentionClock);
  assert.equal(expiredResult.rows[0].reason, "MISSING_OR_INVALID_SETUP_CANDLE");
  assert.equal(expiredResult.rows[0].occurrenceTime, time(110), "expired occurrence is explicit, never substituted");
});

test("gaps, session boundaries, forming bars, duplicates and invalid rows fail closed", () => {
  const gap = bars.filter((_, i) => i !== 90);
  const gapResult = measured(gap, [occurrence(110)]);
  assert.equal(gapResult.state, "MEASURED");
  assert.equal(gapResult.rows[0].selection.state, "WITHHELD");
  assert.equal(gapResult.rows[0].reason, "MISSING_OR_INVALID_CONTEXT");

  const forming = bars.map((bar, i) => i === 111 ? { ...bar, closed: false } : bar);
  assert.equal(measured(forming).reason, "INVALID_TAPE_IDENTITY", "forming bars cannot enter a closed census");

  const duplicateBar = [...bars.slice(0, 111), { ...bars[110] }, ...bars.slice(111)];
  assert.equal(measured(duplicateBar).reason, "INVALID_TAPE_IDENTITY");
  assert.equal(measured(bars, [occurrence(110), occurrence(110)]).reason, "INVALID_OCCURRENCE_IDENTITY");

  const offGrid = bars.map((bar, i) => i === 110 ? { ...bar, t: "2026-11-10T09:10:01.000Z" } : bar);
  assert.equal(measured(offGrid).reason, "INVALID_TAPE_IDENTITY");
  const malformed = bars.map((bar, i) => i === 110 ? { ...bar, t: "not-a-utc-time" } : bar);
  assert.equal(measured(malformed).reason, "INVALID_TAPE_IDENTITY");

  const invalidOhlc = bars.map((bar, i) => i === 110 ? { ...bar, h: 0 } : bar);
  const invalidOhlcResult = measured(invalidOhlc, [occurrence(110)]);
  assert.equal(invalidOhlcResult.state, "MEASURED");
  assert.equal(invalidOhlcResult.rows[0].reason, "MISSING_OR_INVALID_SETUP_CANDLE");
});

test("forming/current H+1 identity is distinct from a mismatched observed direction", () => {
  const mismatch = measured(bars, [occurrence(110, "DOWN")]);
  assert.equal(mismatch.rows[0].reason, "MISMATCHED_NEXT_BAR_IDENTITY");
  assert.equal(mismatch.rows[0].nextBar, "UP");

  const futureClock = epoch + 110 * M5;
  assert.equal(measured(bars, [occurrence(110)], futureClock).reason, "INVALID_TAPE_IDENTITY", "the current setup candle is not closed at the supplied clock");
});

test("future OHLC mutation cannot alter a causal census result", () => {
  const baseline = measured(bars, [occurrence(110)]);
  const mutatedFuture = bars.map((bar, i) => i > 111 ? { ...bar, o: Number.NaN, h: Number.NaN, l: Number.NaN, c: Number.NaN } : bar);
  const afterMutation = measured(mutatedFuture, [occurrence(110)]);
  assert.deepEqual(afterMutation, baseline, "only setup and its immediate H+1 OHLC are causal inputs");
  const guardedFuture = bars.map((bar, i) => i > 111 ? Object.defineProperties({ t: bar.t, closed: true },
    Object.fromEntries(["o", "h", "l", "c"].map(key => [key, { get() { throw new Error("future OHLC read"); } }]))) : Object.freeze({ ...bar }));
  assert.deepEqual(measured(Object.freeze(guardedFuture), [Object.freeze(occurrence(110))]), baseline,
    "future OHLC getters are never touched and frozen inputs remain read-only");
});

console.log("PATTERN CONTEXT CENSUS RETENTION PASS: canonical UTC identity, reindex/2Y retention, gap/session/forming/invalid fail-closed handling, H+1 mismatch and future-OHLC isolation.");
