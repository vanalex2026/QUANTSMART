import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/microChartIndex.ts", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const { createMicroChartIndex, queryMicroChartIndex } = api;

const a = { i: 5, id: "a" }, b = { i: 2, id: "b" }, c = { i: 5, id: "c" }, d = { i: 9, id: "d" }, e = { i: 1, id: "e" };
const source = [a, b, c, d, e];
const index = createMicroChartIndex(source);
assert.equal(index.length, source.length);
const query = (start, end, cursor) => queryMicroChartIndex(index, start, end, cursor);
assert.deepEqual(query(2, 5).map((row) => row.id), ["a", "b", "c"], "arbitrary source order and duplicate indices retain filter order");
assert.strictEqual(query(2, 5)[0], a, "query returns original row references");
assert.deepEqual(query(0, 99, 5).map((row) => row.id), ["a", "b", "c", "e"], "cursor caps the inclusive end while retaining lower rows");
assert.deepEqual(query(5, 5).map((row) => row.id), ["a", "c"], "duplicate boundary indices are inclusive");
assert.deepEqual(query(6, 8), [], "outside windows are empty");
assert.deepEqual(query(8, 6), [], "reversed windows are empty");
assert.deepEqual(queryMicroChartIndex(createMicroChartIndex([]), 0, 10), [], "empty source is safe");
assert.deepEqual(query(0, 99, null).map((row) => row.id), ["a", "b", "c", "d", "e"], "null cursor means uncapped");

// A query must not rescan the retained tape. The proxy counts numeric source
// reads after the one-time index build; a full filter would add 141,000 reads.
let numericReads = 0;
const largeRows = Array.from({ length: 141_000 }, (_, i) => ({ i, id: i }));
const proxiedRows = new Proxy(largeRows, {
  get(target, property, receiver) {
    if (typeof property === "string" && /^\d+$/.test(property)) numericReads += 1;
    return Reflect.get(target, property, receiver);
  },
});
const largeIndex = createMicroChartIndex(proxiedRows);
const buildReads = numericReads;
assert.equal(buildReads, largeRows.length, "index build reads each source row once");
let indexedReads = 0;
const proxiedIndex = new Proxy(largeIndex, {
  get(target, property, receiver) {
    if (typeof property === "string" && /^\d+$/.test(property)) indexedReads += 1;
    return Reflect.get(target, property, receiver);
  },
});
for (let i = 0; i < 100; i += 1) {
  const rows = queryMicroChartIndex(proxiedIndex, i * 1_000, i * 1_000 + 10, i * 1_000 + 5);
  assert.equal(rows.length, 6);
}
assert.equal(numericReads, buildReads, "viewport queries do not rescan the 141k source rows");
assert.ok(indexedReads < 50_000, `100 narrow queries use binary bounds plus visible results, not full scans (${indexedReads} indexed reads)`);
console.log("MICROCHART INDEX PASS: inclusive binary-bounded queries preserve arbitrary source order, duplicates and row identity without rescanning the retained tape.");

