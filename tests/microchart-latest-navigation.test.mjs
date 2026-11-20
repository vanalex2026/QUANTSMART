import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);
const start = source.indexOf("export function microChartLatestViewport");
assert.ok(start >= 0, "chart End viewport helper must remain exported for pure regression coverage");
let open = source.indexOf("{", start), depth = 0, end = -1;
for (let i = open; i < source.length; i += 1) {
  if (source[i] === "{") depth += 1;
  if (source[i] === "}") {
    depth -= 1;
    if (depth === 0) { end = i + 1; break; }
  }
}
assert.ok(end > open, "End viewport helper must have a complete body");
const helperSource = source.slice(start, end)
  .replace("export function", "function")
  .replace(/: number/g, "")
  .replace(/: \[number, number\]/g, "");
const helper = new Function(`${helperSource}; return microChartLatestViewport;`)();

assert.deepEqual(helper(1000, 220), [780, 999], "End must retain a 220-bar zoom while moving to the latest tape");
assert.deepEqual(helper(1000, 40), [960, 999], "End must retain a narrow historical zoom while moving to the latest tape");
assert.deepEqual(helper(50, 100), [0, 49], "End must clamp an oversized zoom width to the retained tape");
assert.deepEqual(helper(2, 1), [0, 1], "End must keep both bars when the tape is only two rows long");
assert.deepEqual(helper(1, 100), [0, 1], "End must remain bounded for an insufficient tape");
assert.deepEqual(helper(100, Number.NaN), [0, 99], "End must fail closed on a non-finite width");

assert.match(source, /if \(event\.key === "End"\) \{[\s\S]*const \[latestStart, latestEnd\] = microChartLatestViewport\(n, width\);[\s\S]*setView\(\[latestStart, latestEnd\]\);[\s\S]*Latest bars shown:/,
  "canvas End must use the width-preserving latest-window helper and announce its retained range");

console.log("MICROCHART LATEST NAVIGATION PASS: End reaches the latest retained window without discarding the current zoom.");
