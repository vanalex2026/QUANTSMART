import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.doesNotMatch(
  source,
  /^import\s+\{?\s*explainResearchError[^\n]*\}\s+from\s+["']\.\.\/lib\/researchErrors\.ts["'];/m,
  "focused Microscope must not eagerly import the legacy research-error mapper",
);
assert.match(
  source,
  /if \(focused \|\| !csvErr\).*?import\(["']\.\.\/lib\/researchErrors\.ts["']\)/s,
  "research-error copy must load only for a legacy CSV error",
);
assert.match(source, /csvErrDisplay \|\| csvErr/, "CSV error surface must retain a synchronous fallback copy");
assert.match(source, /SHADOW_ONLY.*NO_DECISION.*live_apply_allowed=false/, "lazy loading must preserve read-only authority");

console.log("FOCUSED RESEARCH ERROR LAZY PASS: legacy error mapper stays out of the focused XAUUSD M5 graph.");
