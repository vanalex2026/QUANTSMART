import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.doesNotMatch(
  source,
  /^import\s+\{[^\n]*\bloadSimOhlc\b[^\n]*\}\s+from\s+["']\.\.\/adapters\/loadSimOhlc\.ts["'];/m,
  "focused Microscope must not eagerly import the legacy replay tape loader",
);
assert.match(
  source,
  /import\(["']\.\.\/adapters\/loadSimOhlc\.ts["']\)\.then\(\(\{ loadSimOhlc \}\) => loadSimOhlc\(/,
  "full replay loading must remain an on-demand adapter import",
);
assert.match(
  source,
  /const fallback = focused\s*\n\s*\? import\(["']\.\.\/adapters\/loadSimOhlc\.ts["']\)\.then\(\(\{ loadSimOhlc \}\)/,
  "focused fallback must load replay data through the same lazy adapter boundary",
);
assert.match(source, /SHADOW_ONLY.*NO_DECISION.*live_apply_allowed=false/, "lazy replay loading must preserve read-only authority");

console.log("FOCUSED REPLAY LOADER LAZY PASS: legacy replay tape code stays out of the focused XAUUSD M5 startup graph.");
