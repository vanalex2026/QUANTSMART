import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);
const styles = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url)),
  "utf8",
);
const start = source.indexOf("export function microChartToolbarMove");
assert.ok(start >= 0, "toolbar movement helper must remain exported for focused regression coverage");
let open = source.indexOf("{", start), depth = 0, end = -1;
for (let i = open; i < source.length; i += 1) {
  if (source[i] === "{") depth += 1;
  if (source[i] === "}") {
    depth -= 1;
    if (depth === 0) { end = i + 1; break; }
  }
}
assert.ok(end > open, "toolbar movement helper must have a complete body");
const helperSource = source.slice(start, end)
  .replace("export function", "function")
  .replace(/: number \| null/g, "")
  .replace(/: (number|string)/g, "");
const move = new Function(`${helperSource}; return microChartToolbarMove;`)();
const count = 8;
assert.equal(move(0, "ArrowUp", count), 7, "Up from the first tool wraps to the last tool");
assert.equal(move(7, "ArrowDown", count), 0, "Down from the last tool wraps to the first tool");
assert.equal(move(4, "Home", count), 0, "Home focuses the first tool");
assert.equal(move(4, "End", count), 7, "End focuses the last tool");
assert.equal(move(4, "PageDown", count), null, "unhandled keys do not steal browser behavior");
assert.equal(move(0, "ArrowDown", 0), null, "empty toolbars have no focus destination");
assert.match(source, /tabIndex=\{index === toolFocusIndex \? 0 : -1\}/, "toolbar uses a single roving tab stop");
assert.match(source, /aria-keyshortcuts=\{t\.shortcut\}/, "tools expose their keyboard shortcuts");
assert.match(source, /className="microchart-tool-rail"[^>]*aria-describedby=\{chartHelpId\}/, "toolbar points assistive technology at the shared keyboard help");
assert.match(styles, /microchart-tool-rail > button:focus-visible[\s\S]*outline: 2px solid var\(--accent-cyan\)/, "toolbar buttons keep a visible focus ring on the dark chart skin");
assert.match(styles, /microchart-tool-rail > button\[aria-pressed="true"\][\s\S]*border-color: var\(--accent-cyan\) !important[\s\S]*box-shadow: inset 0 -2px 0 var\(--accent-cyan\)/, "pressed chart tools keep a persistent monochrome selected-state edge after focus moves");
assert.match(source, /shortcutIndex = TOOLS\.findIndex/, "letter shortcuts resolve to a toolbar tool");
assert.match(source, /SHADOW_ONLY; NO_DECISION\./, "shortcut feedback preserves the read-only authority boundary");
assert.match(source, new RegExp(">\\u21bb \\{chartCopy\\.resetShort\\}</button>"), "reset control uses a readable chart glyph");
assert.doesNotMatch(source, /(?:\u00e2\u2020\u00bb|\u00e2\u20ac\u00a0\u00c2\u00bb) Reset/, "reset control must not expose mojibake glyphs");
console.log("MICROCHART TOOLBAR PASS: roving tab stop, wrapped arrows, Home/End, and empty-toolbar guard.");
