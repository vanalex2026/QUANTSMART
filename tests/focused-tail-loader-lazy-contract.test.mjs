import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.doesNotMatch(
  source,
  /^import\s+\{[^\n]*\bloadSimOhlcTail\b[^\n]*\}\s+from\s+["']\.\.\/adapters\/loadSimOhlc\.ts["'];/m,
  "focused Microscope must not eagerly import the legacy compact-tail loader",
);
assert.match(
  source,
  /loadSimOhlcTail\s*\}\)\s*=>\s*loadSimOhlcTail\(tf, 2000, false, requestedSymbol\)/,
  "focused loading uses a bounded local tail while MT5 promotion runs",
);
assert.match(
  source,
  /const fallback = focused\s*\n\s*\? import\(["\']\.\.\/adapters\/loadSimOhlc\.ts["\']\)\.then\(\(\{ loadSimOhlc \}\) => loadSimOhlc\(tf, false\)\)\s*\n\s*: import\(["']\.\.\/adapters\/loadSimOhlc\.ts["']\)\.then\(\(\{ loadSimOhlcTail \}\)/,
  "full focused fallback remains separate from the bounded legacy route",
);
assert.match(source, /SHADOW_ONLY.*NO_DECISION.*live_apply_allowed=false/, "lazy loading must preserve read-only authority");

console.log("FOCUSED TAIL LOADER LAZY PASS: legacy compact-tail loader stays out of the focused XAUUSD M5 startup graph.");
