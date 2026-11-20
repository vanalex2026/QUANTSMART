import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.doesNotMatch(
  source,
  /^import\s+\{[^\n]*loadCustomModules[^\n]*\}\s+from\s+["']\.\.\/lib\/customModule\.ts["'];/m,
  "focused Microscope must not eagerly import the legacy custom-module registry",
);
assert.match(
  source,
  /if \(focused\) \{ setCustomMods\(\[\]\); return; \}/,
  "focused route must keep custom module state empty",
);
assert.match(
  source,
  /import\(["']\.\.\/lib\/customModule\.ts["']\)\.then\(\(\{ loadCustomModules \}\)/,
  "legacy custom modules must load dynamically",
);
assert.match(source, /SHADOW_ONLY.*NO_DECISION.*live_apply_allowed=false/, "lazy loading must preserve read-only authority");

console.log("FOCUSED CUSTOM MODULE LAZY PASS: legacy custom-module registry stays out of the focused XAUUSD M5 graph.");
