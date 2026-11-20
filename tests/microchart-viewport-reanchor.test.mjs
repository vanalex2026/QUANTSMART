import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/microChartViewport.ts", import.meta.url))],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const source = bundled.outputFiles[0].text;
assert.match(source, /function reanchorViewport\(/, "viewport re-anchor helper must remain exported for contract coverage");

const bars = (times) => times.map((t, i) => ({ i, t, o: 1, h: 2, l: 0, c: 1, r: "N" }));
const oldTape = bars(["2026-01-01T00:00:00Z", "2026-01-01T00:05:00Z", "2026-01-01T00:10:00Z", "2026-01-01T00:15:00Z"]);
const shiftedTape = bars(["2026-01-01T00:05:00Z", "2026-01-01T00:10:00Z", "2026-01-01T00:15:00Z", "2026-01-01T00:20:00Z"]);
const viewport = { start: 1, end: 3, startTime: oldTape[1].t, endTime: oldTape[3].t };
const retained = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const reanchored = retained.reanchorViewport(viewport, oldTape, shiftedTape);
assert.deepEqual([reanchored.startTime, reanchored.endTime], [shiftedTape[0].t, shiftedTape[2].t], "retention refresh must preserve visible candle timestamps");
assert.deepEqual([reanchored.start, reanchored.end], [0, 2]);

const appended = bars([...oldTape.map((bar) => bar.t), "2026-01-01T00:20:00Z"]);
const pinned = retained.reanchorViewport(viewport, oldTape, appended, true);
assert.deepEqual([pinned.start, pinned.end], [2, 4], "live tail must follow a newly appended forming candle when already pinned to the edge");
assert.deepEqual([pinned.startTime, pinned.endTime], [oldTape[2].t, appended[4].t]);
const rollingPinned = retained.reanchorViewport(viewport, oldTape, shiftedTape, true);
assert.deepEqual([rollingPinned.start, rollingPinned.end], [1, 3], "latest-edge tracking must follow new closed bars even when retention keeps the row count unchanged");
assert.equal(rollingPinned.endTime, shiftedTape[3].t);
const historical = { start: 0, end: 2, startTime: oldTape[0].t, endTime: oldTape[2].t };
const preserved = retained.reanchorViewport(historical, oldTape, appended, true);
assert.equal(preserved.endTime, historical.endTime, "a historical viewport must never jump to the tail during refresh");
const corrected = retained.reanchorViewport(viewport, oldTape, oldTape.map(bar => ({ ...bar, c: 1.1 })), true);
assert.equal(corrected.endTime, viewport.endTime, "a price correction without a new UTC candle must preserve the viewport");
console.log("MICROCHART VIEWPORT REANCHOR PASS: retention shifts preserve timestamp identity and live edge follows appended context.");
