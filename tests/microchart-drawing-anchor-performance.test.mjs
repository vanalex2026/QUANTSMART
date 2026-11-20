import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  entryPoints: ["src/lib/microChartDrawingAnchors.ts"],
  absWorkingDir: app,
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const nativeMap = globalThis.Map;
let mapAllocations = 0;
class CountingMap extends nativeMap {
  constructor(...args) { super(...args); mapAllocations += 1; }
}
globalThis.Map = CountingMap;
const { reanchorMicroChartDrawings } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const iso = (index) => new Date(Date.UTC(2025, 0, 1, 0, index * 5)).toISOString();
const bars = Array.from({ length: 141_000 }, (_, i) => ({ i, t: iso(i), o: 1, h: 2, l: 0, c: 1, r: "N" }));
const drawings = [{ kind: "trend", a: { i: 140_000, p: 1, t: bars[140_000].t }, b: { i: 140_500, p: 2, t: bars[140_500].t }, color: "white" }];
const anchored = reanchorMicroChartDrawings(drawings, bars.slice(500));
assert.equal(mapAllocations, 0, "drawing re-anchor must not allocate full-tape timestamp maps");
assert.deepEqual([anchored[0].a.i, anchored[0].b.i], [139_500, 140_000], "timestamp identities must survive retention shifts");
const expired = reanchorMicroChartDrawings(drawings, bars.slice(140_501));
assert.equal(expired.length, 0, "expired timestamped anchors must fail closed instead of attaching by stale index");
globalThis.Map = nativeMap;
console.log("MICROCHART DRAWING ANCHOR PERFORMANCE PASS: large retained tapes re-anchor by binary search without map allocation and preserve expired-anchor safety.");
