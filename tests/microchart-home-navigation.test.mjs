import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);
const start = source.indexOf("export function microChartHomeViewport");
assert.ok(start >= 0, "chart Home viewport helper must remain exported for pure regression coverage");
let open = source.indexOf("{", start), depth = 0, end = -1;
for (let i = open; i < source.length; i += 1) {
  if (source[i] === "{") depth += 1;
  if (source[i] === "}") {
    depth -= 1;
    if (depth === 0) { end = i + 1; break; }
  }
}
assert.ok(end > open, "Home viewport helper must have a complete body");
const helperSource = source.slice(start, end)
  .replace("export function", "function")
  .replace(/: number/g, "")
  .replace(/: \[number, number\]/g, "");
const helper = new Function(`${helperSource}; return microChartHomeViewport;`)();

assert.deepEqual(helper(1000, 220), [0, 219], "Home must move to the earliest retained window at the current zoom");
assert.deepEqual(helper(50, 100), [0, 49], "Home must clamp an oversized zoom width to the retained tape");
assert.deepEqual(helper(1, 100), [0, 1], "Home must remain bounded for an insufficient tape");
assert.deepEqual(helper(100, Number.NaN), [0, 99], "Home must fail closed on a non-finite width");

assert.match(source, /if \(event\.key === "Home"\) \{[\s\S]*const \[homeStart, homeEnd\] = microChartHomeViewport\(n, width\);[\s\S]*Earliest bars shown:/,
  "canvas Home must use the earliest-window helper and announce its retained range");
assert.match(source, /Home jumps to the earliest retained bars at the current zoom and End jumps to the latest bars/,
  "keyboard help must document distinct earliest/latest navigation");

console.log("MICROCHART HOME NAVIGATION PASS: Home reaches the earliest retained window with bounded, read-only keyboard navigation.");
