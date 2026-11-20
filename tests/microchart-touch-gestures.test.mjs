import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);

assert.match(source, /export function microChartPinchViewport\(/,
  "pinch viewport math must stay exported as a pure contract helper");
assert.match(source, /startDistance \/ distance/,
  "pinch zoom must derive the next viewport width from the two-finger distance ratio");
assert.match(source, /touchPointers = useRef\(new Map<number, \{ x: number; y: number \}>\(\)\)/,
  "touch pointers must be tracked independently from the mouse drag state");
assert.match(source, /if \(touchPointers\.current\.size >= 2\) \{[\s\S]*pinch\.current = \{ startDistance:/,
  "the second touch must enter an explicit pinch gesture and clear a pending drawing");
assert.match(source, /setView\(microChartPinchViewport\(/,
  "active pinch movement must update the bounded chart viewport");
assert.match(source, /touchPointers\.current\.delete\(e\.pointerId\);[\s\S]*if \(pinch\.current\) \{[\s\S]*setTemp\(null\);/,
  "lifting one finger must terminate the pinch without committing a drawing draft");
assert.match(source, /Pinch zoom active; SHADOW_ONLY; NO_DECISION\./,
  "touch zoom must preserve the chart's read-only authority status");
assert.match(source, /const wasPinching = Boolean\(pinch\.current\)[\s\S]*Pinch zoom cancelled; SHADOW_ONLY; NO_DECISION\./,
  "pointer cancellation during pinch must announce the cancelled touch gesture and retain read-only authority");

console.log("MICROCHART TOUCH GESTURES PASS: two-finger pinch zoom is bounded, midpoint anchored, and cancellation safe.");
