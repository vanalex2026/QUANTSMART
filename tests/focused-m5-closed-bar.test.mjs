import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: "export * from './src/lib/focusedClosedBars.ts'", resolveDir: app },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const base = Date.parse("2026-01-01T00:00:00.000Z");
const bar = (i, extra = {}) => ({ i, t: new Date(base + i * 300000).toISOString(), o: 100, h: 101, l: 99, c: 100.5, r: "N", ...extra });

const rows = [
  bar(0),
  bar(1),
  bar(2, { closed: false }),
  bar(3),
];
const now = base + 4 * 300000;
const filtered = api.closedBarsForFocusedResearch(rows, "M5", now);
assert.deepEqual(filtered.map((row) => row.t), [rows[0].t, rows[1].t, rows[3].t]);
assert.deepEqual(filtered.map((row) => row.i), [0, 1, 2], "survivors must be reindexed for detector/chart alignment");

const future = [bar(0), bar(1), bar(2)];
assert.deepEqual(api.closedBarsForFocusedResearch(future, "M5", base + 2 * 300000 + 1000), [future[0], future[1]],
  "a current M5 candle whose close is in the future must be excluded");
assert.deepEqual(api.closedBarsForFocusedResearch(future, "M5", base + 2 * 300000 - 500), [future[0]],
  "a sub-second future close must remain excluded from focused research geometry");
assert.deepEqual(api.closedBarsForFocusedResearch([
  bar(0),
  bar(1, { h: Number.NaN }),
  bar(2),
], "M5", now), [],
  "a malformed closed OHLC row must invalidate the focused geometry tape instead of being silently spliced out");
assert.deepEqual(api.closedBarsForFocusedResearch([
  bar(0),
  { ...bar(1), t: "not-a-timestamp" },
  bar(2),
], "M5", now), [],
  "a malformed closed timestamp must invalidate the focused geometry tape instead of being silently spliced out");
assert.deepEqual(api.closedBarsForFocusedResearch([
  { ...bar(0), t: "2026-01-01T00:01:00Z" },
  { ...bar(1), t: "2026-01-01T00:06:00Z" },
], "M5", now), [],
  "a shifted UTC M5 grid must not enter focused research geometry");
assert.deepEqual(api.closedBarsForFocusedResearch([
  { ...bar(0), t: "2026-01-01T00:00:00+00:00" },
  bar(1),
], "M5", now), [],
  "offset timestamps must not be normalized into a focused UTC research tape");
assert.deepEqual(api.closedBarsForFocusedResearch([bar(0)], "M5", Number.NaN), [],
  "an invalid clock cannot establish closed-bar availability");
assert.deepEqual(api.closedBarsForFocusedResearch([
  { ...bar(0), t: "2026-01-01T00:00:00Z" },
  bar(1),
], "M5", now).map((row) => row.t), ["2026-01-01T00:00:00Z", bar(1).t],
  "both canonical UTC serializations remain valid on the M5 grid");
assert.deepEqual(api.closedBarsForFocusedResearch([
  bar(0),
  { ...bar(1), t: bar(0).t },
  bar(2),
], "M5", now), [],
  "duplicate closed timestamps must invalidate the focused tape rather than silently deduplicating a candle");
assert.deepEqual(api.closedBarsForFocusedResearch([
  bar(0),
  { ...bar(1), t: "2026-01-01T00:00:00Z" },
], "M5", now), [],
  "canonical Z and .000Z serializations of the same closed UTC identity are still duplicates");
assert.deepEqual(api.closedBarsForFocusedResearch([
  bar(0),
  bar(2),
  bar(1),
], "M5", now), [],
  "reversed closed timestamps must invalidate the focused tape rather than changing chronological identity");
assert.deepEqual(api.closedBarsForFocusedResearch([
  bar(0),
  { ...bar(1), t: bar(0).t, closed: false },
  bar(2),
], "M5", now).map((row) => row.t), [bar(0).t, bar(2).t],
  "an explicitly forming duplicate tail is excluded before closed-tape chronology is checked");
assert.deepEqual(api.closedBarsForFocusedResearch([
  { ...bar(0), t: "2026-01-01T00:30:00Z" },
], "H1", base + 2 * 3600000).map((row) => row.t), ["2026-01-01T00:30:00Z"],
  "the focused M5 grid must not reject higher-frame broker half-hour sessions");
assert.equal(api.closedBarsForFocusedResearch(rows, "M1", now).length, rows.length,
  "out-of-scope frames must preserve the caller's existing tape contract");
console.log("FOCUSED M5 CLOSED-BAR PASS: canonical increasing UTC identity, forming/future exclusion and malformed tape refusal.");
