import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);

const start = source.indexOf("export function microChartToolShortcut");
assert.ok(start >= 0, "canvas tool shortcut helper must remain exported for focused regression coverage");
let open = source.indexOf("{", start), depth = 0, end = -1;
for (let i = open; i < source.length; i += 1) {
  if (source[i] === "{") depth += 1;
  if (source[i] === "}") {
    depth -= 1;
    if (depth === 0) { end = i + 1; break; }
  }
}
assert.ok(end > open, "canvas tool shortcut helper must have a complete body");
const helperSource = source.slice(start, end)
  .replace("export function", "function")
  .replace(/: Tool \| null/g, "")
  .replace(/: string/g, "");
const helper = new Function(`const MICROCHART_TOOL_SHORTCUTS = [
  { id: "cursor", t: "Cursor / drag-pan", shortcut: "C" },
  { id: "trend", t: "Trend line", shortcut: "T" },
  { id: "hline", t: "Horizontal line", shortcut: "H" },
  { id: "fib", t: "Fib retracement", shortcut: "F" },
  { id: "rect", t: "Rectangle box", shortcut: "R" },
  { id: "brush", t: "Brush (freehand)", shortcut: "B" },
  { id: "text", t: "Text label", shortcut: "X" },
  { id: "measure", t: "Measure", shortcut: "M" },
];
${helperSource}; return microChartToolShortcut;`)();
for (const [key, expected] of [["c", "cursor"], ["T", "trend"], ["h", "hline"], ["F", "fib"], ["r", "rect"], ["B", "brush"], ["x", "text"], ["M", "measure"]]) {
  assert.equal(helper(key), expected, `${key} should select the ${expected} tool from canvas focus`);
}
assert.equal(helper("ArrowLeft"), null, "navigation keys must not select a drawing tool");
assert.match(source, /const modifier = event\.ctrlKey \|\| event\.metaKey;\s*\/\/ The canvas is the primary drawing surface\./,
  "canvas key handling must gate shortcuts after modifier detection");
assert.match(source, /if \(!modifier && !event\.altKey\) \{[\s\S]*const shortcutTool = microChartToolShortcut\(event\.key\);/,
  "canvas shortcuts must avoid stealing modified browser/system combinations");
assert.match(source, /setChartKeyStatus\(`\$\{MICROCHART_TOOL_SHORTCUTS\[shortcutIndex\]\.t\} selected; SHADOW_ONLY; NO_DECISION\.`\);/,
  "canvas tool selection must announce the read-only authority boundary");
assert.match(source, /aria-keyshortcuts="Escape Home (?:End )?PageUp PageDown ArrowLeft ArrowRight ArrowUp ArrowDown \+ - C T H F R B X M"/,
  "canvas accessibility metadata must advertise letter tool shortcuts");
assert.match(source, /if \(event\.key === "ArrowUp" \|\| event\.key === "ArrowDown"\) \{[\s\S]*const zoomIn = event\.key === "ArrowUp";[\s\S]*setView\(\[Math\.max\(0, nextEnd - nextWidth \+ 1\), nextEnd\]\);[\s\S]*setChartKeyStatus\(`\$\{zoomIn \? "Zoomed in" : "Zoomed out"\};/,
  "ArrowUp/ArrowDown must provide keyboard zoom with a readout");
assert.match(source, /aria-keyshortcuts="Escape Home (?:End )?PageUp PageDown ArrowLeft ArrowRight ArrowUp ArrowDown \+ - C T H F R B X M"/,
  "canvas accessibility metadata must advertise vertical zoom shortcuts");
assert.match(source, /Left and Right move through the closed-bar window; Up and Down or plus and minus zoom;/,
  "keyboard help must explain vertical zoom shortcuts");
assert.match(source, /Home jumps to the earliest retained bars at the current zoom and End jumps to the latest bars/,
  "keyboard help must distinguish earliest and latest retained tape navigation");
assert.match(source, /if \(event\.key === "End"\) \{[\s\S]*const \[latestStart, latestEnd\] = microChartLatestViewport\(n, width\);[\s\S]*setView\(\[latestStart, latestEnd\]\);[\s\S]*Latest bars shown:/,
  "End must jump the canvas viewport to the latest retained bars while preserving its zoom width");
assert.match(source, /aria-keyshortcuts="Escape Home End PageUp PageDown ArrowLeft ArrowRight ArrowUp ArrowDown \+ - C T H F R B X M"/,
  "canvas accessibility metadata must advertise End latest-bars navigation");
assert.match(source, /if \(event\.key === "PageUp" \|\| event\.key === "PageDown"\) \{[\s\S]*const delta = event\.key === "PageUp" \? -width : width;[\s\S]*setChartKeyStatus\(`\$\{event\.key === "PageUp" \? "Earlier" : "Later"\} page shown:/,
  "PageUp/PageDown must move one full viewport and announce the retained range");
assert.match(source, /Page Up and Page Down move one full viewport earlier or later;/,
  "keyboard help must explain full-viewport page navigation");

console.log("MICROCHART CANVAS SHORTCUTS PASS: letter tool shortcuts work from chart focus with modifier-safe status announcements.");
