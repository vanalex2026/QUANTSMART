import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({ entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/patternInspectionWindow.ts", import.meta.url))], bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent" });
const { patternInspectionWindow: inspect } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const bars = Array.from({ length: 30 }, (_, i) => ({ i, t: new Date(Date.UTC(2026, 10, 4, 0, i * 5)).toISOString(), o: 100 + i, h: 103 + i, l: 98 + i, c: 101 + i, r: "N" }));
const time = bars[15].t;
const view = inspect(bars, time, "bullish", true);
assert.equal(view.index, 15);
assert.equal(view.anchor, bars[15]);
assert.equal(view.rows.length, 13);
assert.equal(view.from, 7);
assert.equal(view.geometry.entry, bars[15].c);
assert.equal(view.outcome, "UP");
assert.ok(view.geometry.target > view.geometry.entry);
assert.ok(view.geometry.invalidation < view.geometry.entry);
const shifted = inspect(bars.slice(3), time, "bullish", true);
assert.equal(shifted.index, 12, "retention reindexes the timestamped selection rather than selecting an unrelated ordinal");
assert.equal(shifted.anchor, view.anchor);
assert.deepEqual(shifted.geometry, view.geometry);

const future = bars.map((bar, i) => i <= 15 ? bar : { ...bar, o: 50, h: 1e7, l: 1, c: 2 });
const futureView = inspect(future, time, "bullish", true);
assert.deepEqual(futureView.geometry, view.geometry, "future prices may change the observed outcome and display range, never the setup prices");
assert.equal(futureView.outcome, "DOWN");
assert.deepEqual(inspect(bars.slice(0, 16), time, "bullish", true).geometry, view.geometry);
assert.equal(inspect(bars.slice(0, 16), time, "bullish", true).outcome, null);
const futureTimestampInPrefix = bars.map((bar, i) => i === 10
  ? { ...bar, t: bars[20].t, o: 50_000, h: 50_001, l: 49_999, c: 50_000 }
  : bar);
const futureTimestampView = inspect(futureTimestampInPrefix, time, "bullish", true);
assert.equal(futureTimestampView.geometry.localAtr, null,
  "a later closed timestamp in the causal prefix must not let future OHLC reprice setup geometry");
const malformedPrefix = bars.slice();
malformedPrefix[10] = null;
const malformedPrefixView = inspect(malformedPrefix, time, "bullish", true);
assert.equal(malformedPrefixView.geometry.target, null,
  "a null causal-prefix row fails closed instead of pricing setup geometry");
const sparsePrefix = bars.slice();
delete sparsePrefix[10];
const sparsePrefixView = inspect(sparsePrefix, time, "bullish", true);
assert.equal(sparsePrefixView.geometry.target, null,
  "a sparse causal-prefix row fails closed instead of throwing or pricing setup geometry");
const malformedFuture = bars.slice();
malformedFuture[16] = null;
const malformedFutureView = inspect(malformedFuture, time, "bullish", true, "outcome");
assert.equal(malformedFutureView.outcome, null,
  "a malformed next row cannot establish an observed H+1 result");
assert.equal(inspect(bars, time, "bullish", false).geometry.target, null, "unverified current data must withhold directional landmarks");
assert.equal(inspect(bars, time, "neutral", true).geometry.target, null);
assert.equal(inspect(bars, time, "bearish", true).geometry.target < view.geometry.entry, true);
assert.equal(inspect(bars, bars[0].t, "bullish", true).geometry.target, null);
const gap = bars.map((bar, i) => i === 16 ? { ...bar, t: new Date(Date.parse(time) + 3600_000).toISOString() } : bar);
assert.equal(inspect(gap, time, "bullish", true).outcome, null, "a discontinuous future row is not the next M5 result");
assert.equal(inspect([], time, "bullish", true), null);
assert.equal(inspect(bars, "invalid", "bullish", true), null);
assert.equal(inspect(bars.slice(16), time, "bullish", true), null, "an expired timestamp must withhold stale details");
assert.equal(inspect(bars.map((bar, i) => i === 15 ? { ...bar, c: NaN } : bar), time, "bullish", true), null);
const offGrid = bars.map(bar => ({ ...bar, t: new Date(Date.parse(bar.t) + 60_000).toISOString() }));
assert.equal(inspect(offGrid, offGrid[15].t, "bullish", true), null, "uniform five-minute spacing cannot certify an off-grid M5 selection");
assert.deepEqual(inspect(bars, time.replace(".000Z", "Z"), "bullish", true).geometry, view.geometry, "equivalent UTC formatting remains valid");

const march = bars.map((bar, i) => ({ ...bar, t: new Date(Date.UTC(2026, 2, 2, 0, i * 5)).toISOString() }));
const marchTime = march[15].t;
const impossible = marchTime.replace("03-02", "02-30");
assert.equal(Date.parse(impossible), Date.parse(marchTime), "the fixture reproduces Date.parse's impossible-calendar normalization");
assert.equal(inspect(march, impossible, "bullish", true), null, "an impossible selected date must not price the normalized March candle");
assert.equal(inspect(march.map((bar, i) => i === 15 ? { ...bar, t: impossible } : bar), marchTime, "bullish", true), null, "an impossible anchor must not masquerade as a real selected date");
const impossiblePrefix = inspect(march.map((bar, i) => i === 14 ? { ...bar, t: bar.t.replace("03-02", "02-30") } : bar), marchTime, "bullish", true);
assert.equal(impossiblePrefix.geometry.target, null, "normalized impossible prefix dates cannot establish setup geometry");
assert.equal(impossiblePrefix.from, 15);
for (const invalidTime of [time.replace("Z", ""), time.replace("Z", "+00:00"), time.replace(".000Z", ".001Z"), "2026-11-03T24:00:00Z"]) {
  assert.equal(inspect(bars, invalidTime, "bullish", true), null, `noncanonical selected UTC is rejected: ${invalidTime}`);
  assert.equal(inspect(bars.map((bar, i) => i === 15 ? { ...bar, t: invalidTime } : bar), time, "bullish", true), null, "noncanonical anchor cannot be priced through a UTC alias");
}
const duplicate = [...bars, { ...bars[15], t: time.replace(".000Z", "Z"), c: bars[15].c + 1 }];
assert.equal(inspect(duplicate, time, "bullish", true), null, "a duplicate confirmation anywhere in retention is ambiguous, including the equivalent UTC spelling");
assert.equal(inspect(duplicate.toReversed(), time, "bullish", true), null, "duplicate OHLC selection never depends on first-match order");
const noncanonicalFuture = inspect(bars.map((bar, i) => i === 16 ? { ...bar, t: bar.t.replace("Z", "+00:00") } : bar), time, "bullish", true, "outcome");
assert.equal(noncanonicalFuture.outcome, null); assert.equal(noncanonicalFuture.to, 15);
assert.equal(noncanonicalFuture.study.observedBars, 0, "a UTC-equivalent offset cannot enter the selected observed M5 path");

for (const closed of [null, 0, 1, "true", "false", false]) {
  assert.equal(inspect(bars.map((bar, i) => i === 15 ? { ...bar, closed } : bar), time, "bullish", true), null, "only absent or boolean true closed flags certify the selected candle");
  const prefix = inspect(bars.map((bar, i) => i === 14 ? { ...bar, closed } : bar), time, "bullish", true);
  assert.equal(prefix.study, null, "a malformed or forming prefix cannot establish setup prices");
  assert.equal(prefix.geometry.target, null);
  assert.equal(prefix.from, 15, "the displayed prefix stops at an uncertified closed flag");
  const next = inspect(bars.map((bar, i) => i === 16 ? { ...bar, closed } : bar), time, "bullish", true, "outcome");
  assert.equal(next.to, 15, "uncertified future rows cannot enter the observed path");
  assert.equal(next.outcome, null);
  assert.equal(next.study.state, "INCOMPLETE");
}
const closeMs = Date.parse(time) + 300_000;
assert.equal(inspect(bars, time, "bullish", true, "setup", undefined, closeMs - 1), null, "selected candles require the actual M5 close even with an absent/true flag");
assert.equal(inspect(bars.map(bar => ({ ...bar, closed: true })), time, "bullish", true, "setup", undefined, closeMs - 1), null);
for (const nowMs of [NaN, Infinity, -Infinity]) assert.equal(inspect(bars, time, "bullish", true, "setup", undefined, nowMs), null, "an invalid clock cannot certify closure");
const justClosed = inspect(bars, time, "bullish", true, "outcome", undefined, closeMs);
assert.deepEqual(justClosed.geometry, view.geometry, "closure cutoff never reprices the causal setup prefix");
assert.equal(justClosed.to, 15); assert.equal(justClosed.outcome, null); assert.equal(justClosed.study.observedBars, 0);
const nextClosed = inspect(bars, time, "bullish", true, "outcome", undefined, closeMs + 300_000);
assert.equal(nextClosed.to, 16); assert.equal(nextClosed.outcome, "UP"); assert.equal(nextClosed.study.observedBars, 1);
const unreadableOhlc = (bar, closed) => Object.defineProperties({ i: bar.i, r: bar.r, t: bar.t, closed }, Object.fromEntries(["o", "h", "l", "c"].map(key => [key, { get() { throw new Error("Unavailable OHLC must never be read"); } }])));
const formingFuture = bars.map((bar, i) => i === 16 ? unreadableOhlc(bar, true) : bar);
assert.equal(inspect(formingFuture, time, "bullish", true, "outcome", undefined, closeMs).outcome, null, "clock-unclosed rows stay unread even if their closed flag claims true");
const uncertifiedPrefix = bars.map((bar, i) => i === 14 ? unreadableOhlc(bar, "true") : bar);
assert.equal(inspect(uncertifiedPrefix, time, "bullish", true).geometry.target, null, "uncertified prefix OHLC is never consumed by fallback geometry");

// The selected helpers receive a bounded tape, but public event indices still
// refer to the retained tape used by the chart and survive retention shifts.
const longTape = Array.from({ length: 170 }, (_, i) => ({ i, r: "N", t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString(), o: 100, h: 101, l: 99, c: 100, closed: true }));
longTape[120] = { ...longTape[120], h: 105 };
longTape[131] = { ...longTape[131], h: 106 };
const receipt = { kind: "PATTERN_BREAK", direction: "UP", confirmationTime: longTape[130].t, contextStart: longTape[120].t, breakoutLevel: 101, protectionReference: 98 };
const technical = inspect(longTape, receipt.confirmationTime, "bullish", true, "outcome", receipt);
assert.equal(technical.technicalStudy.state, "OBSTACLE_FIRST");
assert.equal(technical.technicalStudy.exitIndex, 131); assert.equal(technical.study.exitIndex, 131);
assert.equal(technical.to, 131); assert.equal(technical.rows.at(-1), longTape[131]);
const retainedTechnical = inspect(longTape.slice(20), receipt.confirmationTime, "bullish", true, "outcome", receipt);
assert.equal(retainedTechnical.technicalStudy.exitIndex, 111); assert.equal(retainedTechnical.study.exitIndex, 111);
assert.equal(retainedTechnical.technicalStudy.resolvedAt, technical.technicalStudy.resolvedAt);
assert.deepEqual(retainedTechnical.geometry, technical.geometry);
assert.deepEqual(retainedTechnical.rows, technical.rows);
const invalidContext = inspect(longTape.map((bar, i) => i === 125 ? { ...bar, closed: "true" } : bar), receipt.confirmationTime, "bullish", true, "context", receipt);
assert.equal(invalidContext.marketContext.state, "WITHHELD");
assert.equal(invalidContext.room.state, "WITHHELD");
assert.equal(invalidContext.technicalStudy.state, "UNAVAILABLE");
assert.equal(invalidContext.geometry.target, null);
console.log("PATTERN INSPECTION WINDOW PASS: strict unique UTC identity, actual closed candles, bounded causal studies and retained event indices.");
