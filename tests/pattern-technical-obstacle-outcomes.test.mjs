import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({ entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/patternTechnicalObstacleOutcomes.ts", import.meta.url))], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { patternTechnicalObstacleOutcome: study, measurePatternTechnicalObstacleOutcomes: measure } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const bar = (i, fields = {}) => ({ t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString(), o: 100, h: 101, l: 99, c: 100, closed: true, ...fields });
// 96-bar causal room: a confirmed resistance at 105 (pivot with two known right bars).
const base = Array.from({ length: 100 }, (_, i) => bar(i));
base[70] = bar(70, { h: 105 }); base[71] = bar(71, { h: 101 }); base[72] = bar(72, { h: 101 });
const setup = { kind: "PATTERN_BREAK", direction: "UP", confirmationTime: base[99].t, protectionReference: 95 };
const tape = (...future) => [...base, ...future.map((fields, i) => bar(i + 100, fields))];
assert.equal(study(tape({ h: 106, c: 104 }), 99, "UP", setup).state, "OBSTACLE_FIRST");
assert.deepEqual(study(tape({ h: 106, c: 104 }), 99, "UP", setup).sourcePages, [13, 51, 107]);
assert.equal(study(tape({ h: 106, c: 104 }), 99, "UP", setup).authority, "SHADOW_ONLY / NO_DECISION");
assert.equal(study(tape({ l: 94, c: 96 }), 99, "UP", setup).state, "PROTECTION_FIRST");
assert.equal(study(tape({ h: 106, l: 94 }), 99, "UP", setup).state, "AMBIGUOUS");
assert.equal(study(tape({ h: 105, l: 99 }), 99, "UP", setup).state, "OBSTACLE_FIRST");
assert.equal(study(tape(...Array(23).fill({})), 99, "UP", setup).state, "INCOMPLETE");
assert.equal(study(tape({ t: bar(101).t, h: 106 }), 99, "UP", setup).state, "DATA_GAP");
const shiftedGrid = tape({ h: 106 }).map((row) => ({ ...row, t: new Date(Date.parse(row.t) + 60_000).toISOString() }));
assert.equal(study(shiftedGrid, 99, "UP", setup).state, "INVALID_SETUP", "a uniformly shifted five-minute tape cannot become UTC M5 evidence");
assert.equal(study(tape({ t: new Date(Date.parse(bar(100).t) + 60_000).toISOString(), h: 106 }), 99, "UP", setup).state, "INVALID_DATA", "an off-grid future candle cannot resolve the source-level study");
assert.equal(study(base, 99, "UP", setup).state, "INCOMPLETE");
assert.equal(study(base, 99, "UP", { ...setup, confirmationTime: base[98].t }).state, "INVALID_SETUP", "a protection receipt confirmed on another candle cannot price this setup");
assert.equal(study(base, 99, "UP", { ...setup, confirmationTime: "not-a-time" }).state, "INVALID_SETUP", "malformed confirmation identity fails closed");
assert.equal(study(base, 99, "UP", { ...setup, confirmationTime: undefined }).state, "INVALID_SETUP", "a receipt without confirmation identity fails closed");
assert.equal(study(tape({ h: 106 }), 99, "UP", { ...setup, confirmationTime: "2026-01-01T16:15:00+08:00" }).state, "OBSTACLE_FIRST", "equivalent UTC instants preserve valid receipt identity");
assert.equal(study(base, 99, "UP").state, "UNAVAILABLE");
assert.equal(study(base, 99, "UP", { kind: "PATTERN_BREAK", direction: "UP", confirmationTime: base[99].t, protectionReference: 100 }).state, "UNAVAILABLE");
assert.equal(study(base, 99, "NEUTRAL", setup).state, "NEUTRAL");
const row = (time = base[99].t, setupValue = setup) => ({ i: 99, time, direction: "UP", nextBar: "UP", score: 1, setup: setupValue });
const summary = measure(tape({ h: 106, c: 104 }), [row(), row(base[99].t, null), row(base[99].t, { kind: "PATTERN_BREAK_PULLBACK", direction: "UP", confirmationTime: base[99].t, protectionReference: 95 }), row(base[99].t, { ...setup, confirmationTime: base[98].t })]);
assert.equal(summary.counts.OBSTACLE_FIRST, 2); assert.equal(summary.counts.UNAVAILABLE, 1); assert.equal(summary.counts.INVALID_SETUP, 1); assert.equal(summary.total, 4); assert.equal(summary.resolved, 2); assert.equal(summary.families.PATTERN_BREAK.obstacleFirstRate, 1);
assert.equal(summary.excluded, 2, "stale confirmation receipts stay outside the resolved denominator");
assert.equal(summary.families.PATTERN_BREAK.counts.INVALID_SETUP, 1);
assert.equal(summary.families.PATTERN_BREAK.excluded, 1);
assert.equal(Object.values(summary.counts).reduce((sum, count) => sum + count, 0), summary.total);
const offGridSummary = measure(shiftedGrid, [row(shiftedGrid[99].t)]);
assert.equal(offGridSummary.counts.INVALID_SETUP, 1);
assert.equal(offGridSummary.resolved, 0);
assert.equal(offGridSummary.obstacleFirstRate, null, "off-grid setups stay outside the resolved rate denominator");
// A repeated confirmation timestamp in a malformed earlier segment must not
// let timestamp-based room lookup borrow that segment's obstacle while the
// outcome scan starts from the later ordinal.
const duplicateAnchorTape = tape({ h: 106 }).map((value, i) => i >= 50 && i <= 79
  ? { ...value, t: bar(i + 20).t }
  : value);
assert.equal(study(duplicateAnchorTape, 99, "UP", setup).state, "INVALID_SETUP", "duplicate confirmation identity cannot select another causal room anchor");
const duplicateAnchorSummary = measure(duplicateAnchorTape, [row()]);
assert.equal(duplicateAnchorSummary.counts.INVALID_SETUP, 1);
assert.equal(duplicateAnchorSummary.resolved, 0);
assert.equal(duplicateAnchorSummary.obstacleFirstRate, null, "duplicate confirmation identities stay outside the resolved denominator");
// Aggregate measurement uses a bounded causal room prefix plus the observed
// horizon, preserving the result without rescanning a large retained tape.
const longTape = Array.from({ length: 500 }, (_, i) => bar(i));
longTape[470] = bar(470, { h: 105 }); longTape[471] = bar(471, { h: 101 }); longTape[472] = bar(472, { h: 101 });
const longFuture = [...longTape, bar(500, { h: 106, c: 104 })];
const longRow = { i: 499, time: longTape[499].t, direction: "UP", nextBar: "UP", score: 1, setup: { kind: "PATTERN_BREAK", direction: "UP", confirmationTime: longTape[499].t, protectionReference: 95 } };
const fullResult = measure(longFuture, [longRow]);
const boundedResult = measure(longFuture.slice(404), [{ ...longRow, i: 95, time: longFuture[499].t }]);
assert.equal(fullResult.counts.OBSTACLE_FIRST, boundedResult.counts.OBSTACLE_FIRST, "bounded causal room preserves aggregate outcome");
assert.equal(fullResult.counts.PROTECTION_FIRST, boundedResult.counts.PROTECTION_FIRST, "bounded causal room preserves protection outcome");
console.log("PATTERN TECHNICAL OBSTACLE OUTCOMES PASS: source setup protection, bounded room obstacle, same-bar ambiguity, gap/incomplete/unavailable buckets and family summaries.");




