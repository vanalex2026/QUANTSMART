import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.doesNotMatch(
  source,
  /^import\s+\{[^\n]*\b(?:loadM1Years|loadSimM1Year|loadM1Range)\b[^\n]*\}\s+from\s+["']\.\.\/adapters\/loadSimOhlc\.ts["'];/m,
  "focused Microscope must not eagerly import legacy M1 archive loaders",
);
assert.match(source, /if \(focused\) return;[\s\S]*import\(["']\.\.\/adapters\/loadSimOhlc\.ts["']\)\.then\(\(\{ loadM1Years \}\)/,
  "M1 year index must load dynamically behind the legacy route guard");
assert.match(source, /import\(["']\.\.\/adapters\/loadSimOhlc\.ts["']\)\.then\(\(\{ loadM1Range \}\)/,
  "legacy intrabar M1 range must load dynamically");
assert.match(source, /import\(["']\.\.\/adapters\/loadSimOhlc\.ts["']\)\.then\(\(\{ loadSimM1Year \}\)/,
  "legacy M1 replay year must load dynamically");
assert.match(source, /SHADOW_ONLY.*NO_DECISION.*live_apply_allowed=false/,
  "M1 lazy loading must preserve the read-only authority boundary");

console.log("FOCUSED M1 LOADER LAZY PASS: legacy M1 archive loaders stay out of the focused XAUUSD M5 graph.");
