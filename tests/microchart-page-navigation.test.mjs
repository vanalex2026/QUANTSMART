import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);
const start = source.indexOf("export function microChartPageViewport");
assert.ok(start >= 0, "page viewport helper must remain exported for focused boundary coverage");
let open = source.indexOf("{", start), depth = 0, end = -1;
for (let i = open; i < source.length; i += 1) {
  if (source[i] === "{") depth += 1;
  if (source[i] === "}") {
    depth -= 1;
    if (depth === 0) { end = i + 1; break; }
  }
}
assert.ok(end > open, "page viewport helper must have a complete body");
const helperSource = source.slice(start, end)
  .replace("export function", "function")
  .replace(/: number/g, "")
  .replace(/: \[number, number\]/g, "")
  .replace(/: \"earlier\" \| \"later\"/g, "");
const pageViewport = new Function(`${helperSource}; return microChartPageViewport;`)();

// The mobile repro is a 40/41-bar viewport on a long retained tape. Paging at
// either edge must keep that width instead of collapsing to two bars.
assert.deepEqual(pageViewport(0, 40, 141178, "earlier"), [0, 40]);
assert.deepEqual(pageViewport(141137, 141177, 141178, "later"), [141137, 141177]);
assert.deepEqual(pageViewport(0, 40, 141178, "later"), [41, 81]);
assert.deepEqual(pageViewport(41, 81, 141178, "earlier"), [0, 40]);
assert.deepEqual(pageViewport(0, 0, 1, "earlier"), [0, 1]);

assert.match(source, /const \[nextStart, nextEnd\] = microChartPageViewport\(a, b, n, delta < 0 \? "earlier" : "later"\);/,
  "PageUp/PageDown must use the bounded width-preserving helper");
assert.match(source, /Page Up and Page Down move one full viewport earlier or later;/,
  "keyboard help must retain the full-viewport paging contract");

console.log("MICROCHART PAGE NAVIGATION PASS: edge paging preserves the visible width and read-only chart authority.");
