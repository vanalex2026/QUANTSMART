import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/patternCausalReplay.ts", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
});
const { patternCausalReplay } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

const start = Date.UTC(2026, 10, 10, 0, 0);
const bars = Array.from({ length: 45 }, (_, i) => ({
  i, t: new Date(start + i * 300_000).toISOString(), o: 100 + i * .1,
  h: 101 + i * .1, l: 99 + i * .1, c: 100.4 + i * .1, r: "N", closed: true,
}));
const selected = bars[20].t;
const nowMs = start + bars.length * 300_000 + 300_000;

const initial = patternCausalReplay(bars, selected, "bullish", true, { nowMs });
assert.equal(initial.version, "pattern-causal-replay/1");
assert.equal(initial.state, "AVAILABLE");
assert.equal(initial.mode, "setup");
assert.equal(initial.anchorIndex, 20);
assert.equal(initial.revealedIndex, 20, "default cursor reveals only the selected close");
assert.equal(initial.view.outcome, null, "setup replay withholds adjacent outcomes");
assert.equal(initial.view.study, null, "setup replay withholds barrier path");
assert.equal(initial.boundaries.context.endTime, new Date(start + 21 * 300_000).toISOString());
assert.equal(initial.boundaries.setup.endTime, initial.boundaries.context.endTime);
assert.equal(initial.boundaries.outcome.endTime, null);
assert.equal(initial.futureWithheld, true);
assert.equal(initial.authority, "SHADOW_ONLY / NO_DECISION");
assert.equal(initial.live_apply_allowed, false);

const atNext = patternCausalReplay(bars, selected, "bullish", true, {
  mode: "outcome", revealedTime: bars[21].t, nowMs,
});
assert.equal(atNext.state, "AVAILABLE");
assert.equal(atNext.revealedIndex, 21);
assert.equal(atNext.view.outcome, "UP");
assert.equal(atNext.view.study.state, "INCOMPLETE");
assert.equal(atNext.boundaries.outcome.endTime, bars[22].t, "outcome boundary is the revealed candle's actual close");
assert.equal(atNext.canStepBackward, true);

const atHorizon = patternCausalReplay(bars, selected, "bullish", true, {
  mode: "outcome", revealedTime: bars[44].t, nowMs,
});
assert.equal(atHorizon.state, "AVAILABLE");
assert.equal(atHorizon.view.outcome, "UP");
assert.ok(atHorizon.view.study, "bounded barrier study is exposed only in outcome mode");
assert.ok(atHorizon.view.study.observedBars <= 24, "replay does not scan beyond the causal horizon");

const context = patternCausalReplay(bars, selected, "bullish", true, {
  mode: "context", revealedTime: bars[44].t, nowMs,
});
assert.equal(context.state, "AVAILABLE");
assert.equal(context.view.mode, "context");
assert.equal(context.view.outcome, null);
assert.equal(context.view.study, null);
assert.equal(context.boundaries.outcome.endTime, null);
assert.equal(context.revealedIndex, 20, "context cursor stays at the confirmation boundary");
assert.equal(context.futureWithheld, true);

const rewound = patternCausalReplay(bars, selected, "bullish", true, {
  revealedTime: bars[18].t, nowMs,
});
assert.equal(rewound.state, "WITHHELD");
assert.equal(rewound.reason, "ANCHOR_NOT_REVEALED");
assert.equal(rewound.view, null);
assert.equal(rewound.revealedIndex, null, "an unrevealed selected occurrence exposes no priced view");

const beyondHorizon = patternCausalReplay(bars, selected, "bullish", true, {
  mode: "outcome", revealedTime: bars[44].t, nowMs,
});
assert.equal(beyondHorizon.revealedIndex, 44, "outcome cursor is capped at confirmation plus H+24");
assert.equal(beyondHorizon.canStepForward, false);

const changedFuture = bars.map((bar, i) => i > 20 ? { ...bar, o: 9_000, h: 9_100, l: 8_900, c: 9_050 } : bar);
const before = patternCausalReplay(changedFuture, selected, "bullish", true, { nowMs });
assert.deepEqual(before.view.geometry, initial.view.geometry, "future OHLC cannot reprice setup geometry");
assert.equal(before.view.outcome, null);

assert.equal(patternCausalReplay(bars, "2026-11-10T00:01:00Z", "bullish", true, { nowMs }).state, "UNAVAILABLE");
assert.equal(patternCausalReplay(bars, selected, "bullish", true, { revealedTime: "not-a-time", nowMs }).state, "UNAVAILABLE");
assert.equal(patternCausalReplay(bars, selected, "bullish", true, { nowMs: NaN }).reason, "INVALID_REPLAY_CLOCK");
console.log("PATTERN CAUSAL REPLAY PASS: bounded UTC-prefix cursor, withheld context/setup outcomes and read-only authority.");
