import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.doesNotMatch(
  source,
  /^import\s+\{[^\n]*(?:readStrategyCards|subscribeArtifactChanges)[^\n]*\}\s+from\s+["']\.\.\/lib\/artifactRegistry\.ts["'];/m,
  "focused Microscope must not eagerly import the legacy strategy-card registry",
);
assert.match(source, /const \[library, setLibrary\] = useState<any\[\]>\(\[\]\)/,
  "focused route must start with an empty legacy card registry");
assert.match(source, /if \(focused\) \{ setLibrary\(\[\]\); return; \}/,
  "focused route must keep legacy card state empty");
assert.match(source, /import\(["']\.\.\/lib\/artifactRegistry\.ts["']\)\.then\(\(\{ readStrategyCards, subscribeArtifactChanges \}\)/,
  "legacy strategy cards must load dynamically");
assert.match(source, /SHADOW_ONLY.*NO_DECISION.*live_apply_allowed=false/,
  "artifact registry lazy loading must preserve read-only authority");

console.log("FOCUSED ARTIFACT REGISTRY LAZY PASS: legacy strategy-card registry stays out of the focused XAUUSD M5 graph.");
