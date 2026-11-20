import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)), "utf8");
const helperSourceFile = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/microChartDrawingSelection.ts", import.meta.url)), "utf8");
const start = helperSourceFile.indexOf("export function microChartDrawingSelection");
assert.ok(start >= 0, "drawing selection helper must remain exported from its utility module");
let open = helperSourceFile.indexOf("{", start), depth = 0, end = -1;
for (let i = open; i < helperSourceFile.length; i += 1) {
  if (helperSourceFile[i] === "{") depth += 1;
  if (helperSourceFile[i] === "}") {
    depth -= 1;
    if (depth === 0) { end = i + 1; break; }
  }
}
const helperSource = helperSourceFile.slice(start, end)
  .replace("export function", "function")
  .replace(/: number \| null/g, "")
  .replace(/: number/g, "")
  .replace(/: string/g, "");
const select = new Function(`${helperSource}; return microChartDrawingSelection;`)();
assert.equal(select(null, "]", 3), 0, "next selection starts at the first drawing");
assert.equal(select(null, "[", 3), 2, "previous selection starts at the last drawing");
assert.equal(select(0, "[", 3), 2, "previous selection wraps");
assert.equal(select(2, "]", 3), 0, "next selection wraps");
assert.equal(select(1, "ArrowRight", 3), null, "unrelated keys are ignored");
assert.equal(select(1, "]", 0), null, "empty drawing lists are ignored");
assert.match(source, /if \(\(event\.key === "\[" \|\| event\.key === "\]"\) && tool === "cursor"\)/,
  "bracket selection must be handled only by the cursor tool");
assert.match(source, /\[ and \] cycle saved drawings/,
  "keyboard help must disclose saved drawing selection");
console.log("MICROCHART DRAWING SELECTION PASS: bracket keys cycle saved drawings with bounded keyboard state.");
