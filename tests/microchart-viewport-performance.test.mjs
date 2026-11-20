import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/microChartViewport.ts", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
});

const NativeMap = globalThis.Map;
let allocations = 0;
class CountingMap extends NativeMap {
  constructor(...args) { super(...args); allocations += 1; }
}
globalThis.Map = CountingMap;
const { reanchorViewport } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

const bars = Array.from({ length: 141_000 }, (_, i) => ({
  t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString(),
}));
const viewport = { start: 140_800, end: 140_980, startTime: bars[140_800].t, endTime: bars[140_980].t };

// Tail replacement keeps both visible UTC identities at the same indices.
const quoteCopy = bars.map((bar, i) => i === bars.length - 1 ? { ...bar, t: bar.t } : bar);
const before = allocations;
const unchanged = reanchorViewport(viewport, bars, quoteCopy);
assert.deepEqual([unchanged.start, unchanged.end], [viewport.start, viewport.end]);
assert.equal(allocations, before, "same-index quote refresh must not allocate a full retained-tape map");

const shifted = bars.slice(500);
const shiftedViewport = reanchorViewport(viewport, bars, shifted);
assert.deepEqual([shiftedViewport.start, shiftedViewport.end], [viewport.start - 500, viewport.end - 500]);
assert.equal(allocations, before + 1, "retention shift still allocates one lazy timestamp map for exact identity repair");
globalThis.Map = NativeMap;
console.log("MICROCHART VIEWPORT PERFORMANCE PASS: common same-index refreshes avoid full-tape map allocation; shifted retention remains exact.");
