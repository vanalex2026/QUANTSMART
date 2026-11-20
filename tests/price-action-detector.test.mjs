import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const bundled = await build({ stdin: { contents: "export * from './src/lib/priceActionDetector.ts'", resolveDir: app }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const bar = (i, o, h, l, c) => ({ i, t: new Date(Date.parse("2026-01-01T00:00:00Z") + i * 300000).toISOString(), o, h, l, c, closed: true });
const tape = [
  bar(0, 100, 101, 99, 100.5), bar(1, 100.5, 101.1, 100.1, 100.2), bar(2, 100.2, 101.2, 99.9, 100.9),
  bar(3, 100.9, 101.3, 100.0, 100.1), bar(4, 100.1, 101.4, 100.0, 101.1), bar(5, 101.1, 101.5, 100.2, 100.6),
  bar(6, 100.6, 101.6, 100.5, 101.3), bar(7, 101.3, 101.7, 100.7, 101.0), bar(8, 101.0, 101.8, 100.8, 101.6),
];
const result = api.detectM5PriceAction(tape, { symbol: "XAUUSD", roundStep: 0.5 });
assert.equal(result.ok, true);
assert.equal(result.timeframe, "M5");
assert.equal(result.symbol, "XAUUSD");
assert.equal(result.assessments.length, 13);
assert.deepEqual(result.assessments.map((a) => a.conceptId), ["support_resistance", "dominant_pressure", "false_high_low", "double_pressure", "tease_break", "buildup", "false_break", "pullback_reversal", "ceiling_test", "round_number", "pattern_break_combi", "pattern_break", "pattern_break_pullback"]);
assert.ok(result.assessments.every((a) => a.sourceConceptId === a.conceptId && Array.isArray(a.pageAnchors) && a.pageAnchors.length > 0));
assert.ok(result.markers.every((m) => m.state === "DETECTED" && m.i >= 0 && m.i < tape.length));
assert.deepEqual(Object.keys(result.evidence).sort(), ["buildup", "ceiling_test", "dominant_pressure", "double_pressure", "false_break", "false_high_low", "pattern_break", "pattern_break_combi", "pattern_break_pullback", "pullback_reversal", "round_number", "support_resistance", "tease_break"]);
for (const evidence of Object.values(result.evidence)) {
  assert.equal(evidence.authority, "SHADOW_ONLY / NO_DECISION");
  assert.ok(Number.isInteger(evidence.skipped) && evidence.skipped >= 0, "evidence must expose rejected continuity windows");
  assert.ok(evidence.outcomes && evidence.outcomes.up + evidence.outcomes.down + evidence.outcomes.flat === evidence.occurrences, "outcome counts must reconcile to detected occurrences");
  assert.ok(evidence.firstEvaluation === null || typeof evidence.firstEvaluation === "string");
  assert.ok(evidence.lastEvaluation === null || typeof evidence.lastEvaluation === "string");
  assert.ok(evidence.occurrences <= evidence.evaluated);
  assert.ok(evidence.recurrenceRate >= 0 && evidence.recurrenceRate <= 1);
  assert.ok(evidence.interval95 === null || (evidence.interval95.lower >= 0 && evidence.interval95.upper <= 1));
  assert.ok(Array.isArray(evidence.history), "concept evidence must retain historical preview occurrences");
  assert.equal(evidence.history.length, evidence.occurrences, "every measured occurrence must be available for historical inspection");
  assert.ok(evidence.history.every((row) => ["UP", "DOWN"].includes(row.direction) && ["UP", "DOWN", "FLAT"].includes(row.nextBar)));
}
assert.deepEqual(api.detectM5PriceAction(tape, { symbol: "XAUUSD", roundStep: 0.5 }), result, "detector must be deterministic");
const supportTape = [
  bar(0, 100, 101, 99.0, 100.4), bar(1, 100.4, 101.2, 99.1, 100.7), bar(2, 100.7, 101.4, 98.9, 100.2),
  bar(3, 100.2, 101.3, 99.2, 100.8), bar(4, 100.8, 101.5, 99.0, 100.5), bar(5, 100.5, 101.6, 99.1, 100.9),
  bar(6, 100.9, 101.7, 99.0, 100.6), bar(7, 100.6, 101.8, 99.1, 101.7),
];
const supportResult = api.detectM5PriceAction(supportTape, { symbol: "XAUUSD", roundStep: 0.5 });
assert.equal(supportResult.assessments.find((a) => a.conceptId === "support_resistance")?.state, "DETECTED", "repeated support role-test must be detectable from closed bars");
assert.equal(supportResult.assessments.find((a) => a.conceptId === "support_resistance")?.direction, "UP");
const twoSidedLevelTape = Array.from({ length: 8 }, (_, i) => bar(i, 100, 101, 99, 100));
const twoSidedLevelResult = api.detectM5PriceAction(twoSidedLevelTape, { symbol: "XAUUSD" });
assert.equal(twoSidedLevelResult.assessments.find((a) => a.conceptId === "support_resistance")?.state, "ABSTAIN", "a candle testing repeated support and resistance together must not inherit support priority");
assert.equal(twoSidedLevelResult.assessments.find((a) => a.conceptId === "support_resistance")?.reason, "AMBIGUOUS_TWO_SIDED_LEVEL_TEST");
assert.equal(twoSidedLevelResult.assessments.find((a) => a.conceptId === "ceiling_test")?.state, "ABSTAIN", "a candle testing both internal levels must not inherit ceiling priority");
assert.equal(twoSidedLevelResult.assessments.find((a) => a.conceptId === "ceiling_test")?.reason, "AMBIGUOUS_TWO_SIDED_LEVEL_TEST");
const pressureTape = Array.from({ length: 8 }, (_, i) => bar(i, 100 + i * 0.4, 100.8 + i * 0.4, 99.7 + i * 0.4, 100.5 + i * 0.4));
const pressureResult = api.detectM5PriceAction(pressureTape, { symbol: "XAUUSD" });
assert.equal(pressureResult.assessments.find((a) => a.conceptId === "dominant_pressure")?.state, "DETECTED", "ordered swing structure must detect dominant pressure");
assert.equal(pressureResult.assessments.find((a) => a.conceptId === "dominant_pressure")?.direction, "UP");
const falseHighLowTape = [bar(0, 100, 101, 99.5, 100.2), bar(1, 100.2, 101.2, 99.8, 100.8), bar(2, 100.8, 101.8, 100.2, 100.7), bar(3, 100.7, 101.9, 100.4, 101.0), bar(4, 101.0, 102.1, 100.4, 101.0), bar(5, 101.0, 101.1, 98.8, 99.5)];
const falseHighLowResult = api.detectM5PriceAction(falseHighLowTape, { symbol: "XAUUSD" });
assert.equal(falseHighLowResult.assessments.find((a) => a.conceptId === "false_high_low")?.state, "DETECTED", "failed high followed by an opposite closed break must be detectable");
assert.equal(falseHighLowResult.assessments.find((a) => a.conceptId === "false_high_low")?.direction, "DOWN");
const doublePressureTape = [bar(0, 100, 100.8, 99.5, 100.2), bar(1, 100.2, 100.9, 99.7, 100.4), bar(2, 100.4, 101.0, 99.8, 100.6), bar(3, 100.6, 101.1, 99.9, 100.7), bar(4, 100.7, 101.2, 100.0, 100.9), bar(5, 100.9, 102.0, 100.8, 101.7), bar(6, 101.7, 102.4, 101.5, 102.2)];
const doublePressureResult = api.detectM5PriceAction(doublePressureTape, { symbol: "XAUUSD" });
assert.equal(doublePressureResult.assessments.find((a) => a.conceptId === "double_pressure")?.state, "DETECTED", "a boundary break followed by same-direction continuation must detect double pressure");
assert.equal(doublePressureResult.assessments.find((a) => a.conceptId === "double_pressure")?.direction, "UP");
const teaseBreakTape = [bar(0, 100, 101, 99.4, 100.4), bar(1, 100.4, 101.1, 99.6, 100.7), bar(2, 100.7, 101.2, 99.7, 100.8), bar(3, 100.8, 101.3, 99.8, 100.9), bar(4, 100.9, 101.2, 100.0, 101.0), bar(5, 101.0, 102.0, 100.5, 101.1), bar(6, 101.1, 101.5, 100.8, 101.2), bar(7, 101.2, 102.6, 101.0, 102.3)];
const teaseBreakResult = api.detectM5PriceAction(teaseBreakTape, { symbol: "XAUUSD" });
assert.equal(teaseBreakResult.assessments.find((a) => a.conceptId === "tease_break")?.state, "DETECTED", "premature break, retest and second break must detect tease break");
assert.equal(teaseBreakResult.assessments.find((a) => a.conceptId === "tease_break")?.direction, "UP");
const longTape = Array.from({ length: 2600 }, (_, i) => {
  const base = 100 + Math.floor(i / 9) * 0.02;
  const phase = i % 9;
  const close = phase === 0 ? base + 0.5 : phase === 1 ? base + 0.2 : phase === 2 ? base + 0.9 : phase === 3 ? base + 0.1 : phase === 4 ? base + 1.1 : phase === 5 ? base + 0.6 : phase === 6 ? base + 1.3 : phase === 7 ? base + 1.0 : base + 1.6;
  return bar(i, phase === 0 ? base : close - 0.2, close + 0.2, Math.min(base - 0.1, close - 0.2), close);
});
const longResult = api.detectM5PriceAction(longTape, { symbol: "XAUUSD", roundStep: 0.5 });
assert.ok(longResult.evidence && Object.values(longResult.evidence).some((e) => e.evaluated > 2400), "evidence must evaluate the complete retained M5 tape, not a recent 2400-bar slice");
const forming = api.detectM5PriceAction([...tape, { ...tape.at(-1), i: 9, t: new Date(Date.parse(tape.at(-1).t) + 300000).toISOString(), closed: false }]);
assert.equal(forming.ok, false);
assert.equal(forming.reason, "INVALID_OR_FORMING_BAR_INPUT");
assert.equal(forming.markers.length, 0);
const malformedEvidence = api.measurePriceActionEvidence([...tape.slice(0, 4), { ...tape[4], h: Number.NaN }, ...tape.slice(5)], { symbol: "XAUUSD" });
assert.ok(Object.values(malformedEvidence).every((e) => e.occurrences === 0 && e.evaluated === 0), "public evidence measurement must fail closed on malformed OHLC input");
const zeroRange = longTape.map((row, i) => i === 100 ? { ...row, o: row.c, h: row.c, l: row.c } : row);
const zeroRangeEvidence = api.measurePriceActionEvidence(zeroRange, { symbol: "XAUUSD" });
assert.ok(Object.values(zeroRangeEvidence).every((e) => e.occurrences === 0 && e.evaluated === 0 && e.history.length === 0), "zero-range OHLC rows must not enter detector occurrence or H+1 denominators");
const zeroRangeResult = api.detectM5PriceAction(zeroRange, { symbol: "XAUUSD" });
assert.equal(zeroRangeResult.ok, false, "the public detector must reject zero-range retained input before scanning statistics");
assert.equal(zeroRangeResult.reason, "INVALID_OR_FORMING_BAR_INPUT");
const gap = api.detectM5PriceAction(tape.filter((_, i) => i !== 5));
assert.equal(gap.ok, false);
assert.equal(gap.reason, "NON_CONTIGUOUS_M5_TAPE");
assert.equal(gap.assessments.every((a) => a.state === "ABSTAIN"), true);
const evidenceWithGap = api.measurePriceActionEvidence(longTape.filter((_, i) => i !== 100), { symbol: "XAUUSD" });
assert.ok(Object.values(evidenceWithGap).every((e) => e.skipped > 0), "evidence must report continuity windows skipped by the strict M5 contract");

const options = { symbol: "XAUUSD", roundStep: 0.5 };
const shiftedGrid = longTape.map((row) => ({ ...row, t: new Date(Date.parse(row.t) + 60_000).toISOString() }));
const shiftedEvidence = api.measurePriceActionEvidence(shiftedGrid, options);
assert.ok(Object.values(shiftedEvidence).every((e) => e.occurrences === 0 && e.evaluated === 0 && e.history.length === 0), "uniformly off-grid timestamps cannot acquire public M5 occurrence statistics");
const shiftedResult = api.detectM5PriceAction(shiftedGrid, options);
assert.equal(shiftedResult.ok, false, "five-minute deltas alone do not establish the UTC M5 grid");
assert.equal(shiftedResult.markers.length, 0);
const offsetAliases = longTape.map((row) => ({ ...row, t: row.t.replace("Z", "+00:00") }));
const aliasEvidence = api.measurePriceActionEvidence(offsetAliases, options);
for (const id of Object.keys(longResult.evidence)) {
  for (const key of ["occurrences", "evaluated", "skipped", "outcomes", "long", "short", "hitRate", "interval95", "recurrenceRate"]) {
    assert.deepEqual(aliasEvidence[id][key], longResult.evidence[id][key], "equivalent aligned UTC instants preserve the valid-tape counts and rates");
  }
}
const oldGapTape = longTape.filter((_, i) => i !== 100);
const oldGapResult = api.detectM5PriceAction(oldGapTape, options);
assert.equal(oldGapResult.ok, true, "an old gap outside the current setup cannot suppress a complete recent setup");
const withoutIndex = (row) => { const { i, ...rest } = row; return rest; };
assert.deepEqual(oldGapResult.assessments.map(withoutIndex), longResult.assessments.map(withoutIndex), "old archive gaps cannot change current geometry, direction or reasons");
assert.deepEqual(oldGapResult.markers.map(withoutIndex), longResult.markers.map(withoutIndex));
assert.deepEqual(oldGapResult.evidence, api.measurePriceActionEvidence(oldGapTape, options), "the main detector must expose the valid per-window history despite an old gap");
function checkAccounting(result, input, skipped) {
  assert.equal(Object.keys(result.evidence).length, 13);
  for (const e of Object.values(result.evidence)) {
    assert.equal(e.skipped, skipped, "skip only setups spanning a gap or whose outcome crosses it");
    assert.equal(e.evaluated + e.skipped, input.length - 9, "every eligible endpoint is evaluated or explicitly skipped");
    assert.equal(e.outcomes.up + e.outcomes.down + e.outcomes.flat, e.occurrences);
    assert.ok(e.long.occurrences + e.short.occurrences <= e.occurrences);
    assert.ok(e.occurrences <= e.evaluated && e.evaluated > 0);
  }
}
// One missing interior bar invalidates 13 setup transitions plus one outcome.
checkAccounting(oldGapResult, oldGapTape, 14);
const localGapTape = oldGapTape.slice(0, 160);
const localGapResult = api.detectM5PriceAction(localGapTape, options);
const localHistory = Object.values(localGapResult.evidence).flatMap((e) => e.history);
assert.ok(localHistory.some((row) => row.i < 99) && localHistory.some((row) => row.i >= 113), "the fixture must retain occurrences on both sides of the gap");
for (const e of Object.values(localGapResult.evidence)) {
  assert.ok(e.history.every((row) => row.i !== 99 && (row.i < 100 || row.i >= 113)), "no retained occurrence may bridge the missing candle");
}
for (let end = 100; end <= 113; end++) {
  const observedPrefix = api.detectM5PriceAction(localGapTape.slice(0, end + 1), options);
  assert.equal(observedPrefix.ok, end === 113, "each historical setup obeys the same causal continuity boundary as a current setup");
}
const recentGapTape = longTape.filter((_, i) => i !== longTape.length - 2);
const recentGapResult = api.detectM5PriceAction(recentGapTape, options);
assert.equal(recentGapResult.ok, false);
assert.equal(recentGapResult.reason, "NON_CONTIGUOUS_M5_TAPE");
assert.equal(recentGapResult.markers.length, 0);
assert.ok(recentGapResult.assessments.every((a) => a.state === "ABSTAIN"));
checkAccounting(recentGapResult, recentGapTape, 1);
assert.ok(Object.values(recentGapResult.evidence).some((e) => e.occurrences > 0), "a recent gap must withhold current markers while preserving older measured occurrences");

const gapBeforeContext = longTape.filter((_, i) => i !== longTape.length - 15);
const gapInsideContext = longTape.filter((_, i) => i !== longTape.length - 14);
assert.equal(api.detectM5PriceAction(gapBeforeContext, options).ok, true, "the transition entering the first of 14 setup bars is outside the setup");
assert.equal(api.detectM5PriceAction(gapInsideContext, options).ok, false, "the first internal setup transition must still reject a gap");
assert.equal(api.detectM5PriceAction(gapInsideContext.slice(-14), options).ok, false, "a bounded setup and the full tape use identical continuity rules");
assert.equal(api.detectM5PriceAction(gapBeforeContext.slice(-14), options).ok, true);

// A session closure is as unusable for M5 geometry/H+1 as a missing short bar.
// Keep the exact former two-hour exemption boundary and a weekend in coverage.
for (const gapMs of [2 * 60 * 60_000, 48 * 60 * 60_000]) {
  const sessionGapTape = longTape.slice(0, 160).map((row, i) => i < 100 ? row : {
    ...row, t: new Date(Date.parse(row.t) + gapMs - 300000).toISOString(),
  });
  const sessionGapResult = api.detectM5PriceAction(sessionGapTape, options);
  assert.equal(sessionGapResult.ok, true, "a completed recent setup survives an old session closure");
  checkAccounting(sessionGapResult, sessionGapTape, 14);
  const history = Object.values(sessionGapResult.evidence).flatMap((e) => e.history);
  assert.ok(history.some((row) => row.i < 99) && history.some((row) => row.i >= 113));
  assert.ok(history.every((row) => row.i < 99 || row.i >= 113), "session gaps cannot become setup context or H+1 labels");
  for (let end = 100; end <= 113; end++) {
    const observedPrefix = api.detectM5PriceAction(sessionGapTape.slice(0, end + 1), options);
    assert.equal(observedPrefix.ok, end === 113, "current geometry resumes only after 14 contiguous post-closure bars");
  }
  const beforeClosure = longTape.slice(0, 70);
  const afterClosure = { ...longTape[70], t: new Date(Date.parse(beforeClosure.at(-1).t) + gapMs).toISOString() };
  const closureEvidence = api.measurePriceActionEvidence([...beforeClosure, afterClosure], options);
  const beforeClosureEvidence = api.measurePriceActionEvidence(beforeClosure, options);
  for (const id of Object.keys(beforeClosureEvidence)) {
    assert.equal(closureEvidence[id].evaluated, beforeClosureEvidence[id].evaluated, "a closure does not count the cross-session H+1 as evaluated");
    assert.equal(closureEvidence[id].occurrences, beforeClosureEvidence[id].occurrences, "a closure does not label a cross-session occurrence");
    assert.equal(closureEvidence[id].skipped, beforeClosureEvidence[id].skipped + 1, "the cross-session H+1 window is explicitly skipped");
  }
}

const prefix = longTape.slice(0, 70);
const setup = api.detectM5PriceAction(prefix, options);
for (const close of [50, 500]) {
  const next = { ...longTape[70], o: close, h: close + 1, l: close - 1, c: close };
  const evidence = api.measurePriceActionEvidence([...prefix, next], options);
  for (const marker of setup.markers) {
    const measured = evidence[marker.conceptId].history.find((row) => row.time === marker.time);
    assert.ok(measured, "historical occurrence labels agree with the causal setup prefix");
    assert.equal(measured.direction, marker.direction);
    assert.equal(measured.score, marker.score, "mutating the future outcome cannot change a setup score");
    assert.equal(measured.nextBar, close > prefix.at(-1).c ? "UP" : "DOWN");
  }
}
for (const invalid of [
  [{ ...longTape[0], h: NaN }, ...longTape.slice(1)],
  longTape.map((row, i) => i === 100 ? { ...row, t: new Date(Date.parse(row.t) + 60_000).toISOString() } : row),
  [{ ...longTape[0], closed: false }, ...longTape.slice(1)],
  [longTape[0], longTape[0], ...longTape.slice(1)],
  [longTape[1], longTape[0], ...longTape.slice(2)],
]) {
  const rejected = api.detectM5PriceAction(invalid, options);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "INVALID_OR_FORMING_BAR_INPUT");
  assert.equal(rejected.markers.length, 0);
  assert.equal(rejected.evidence, undefined, "malformed/forming/reversed/duplicate input still rejects the whole archive");
  assert.ok(Object.values(api.measurePriceActionEvidence(invalid, options)).every((e) => e.occurrences === 0 && e.evaluated === 0), "public measurement never splices a rejected row into another setup or H+1 window");
}
console.log("PRICE ACTION DETECTOR PASS: deterministic M5 concepts, provenance, markers and fail-closed abstentions.");


