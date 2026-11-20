import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

for (const moduleName of ["cardZones", "cardRunStore", "simHonesty"]) {
  assert.doesNotMatch(
    source,
    new RegExp(`^import\\s+.*from\\s+["']\\.\\./lib/${moduleName}\\.ts["'];`, "m"),
    `${moduleName} must stay out of the focused Microscope startup graph`,
  );
  assert.match(source, new RegExp(`import\\(["']\\.\\./lib/${moduleName}\\.ts["']\\)`),
    `${moduleName} must remain available through a guarded legacy import`,
  );
}
assert.match(source, /if \(focused \|\| !activeCard \|\| !replayBars\.length\) \{ setCardZones\(\(prior\) => prior\.length \? \[\] : prior\); return; \}/,
  "focused route must clear card-zone state without importing legacy geometry");
assert.match(source, /if \(source === "CSV" \|\| !activeCard \|\| !runDone \|\| !realisticBt \|\| stageIdx > maxStage \|\| !stageRange\) return;/,
  "legacy result persistence must remain guarded before lazy imports");
assert.match(source, /Promise\.all\(\[import\("\.\.\/lib\/cardRunStore\.ts"\), import\("\.\.\/lib\/simHonesty\.ts"\)\]\)/,
  "legacy result persistence dependencies must load together on demand");
assert.match(source, /SHADOW_ONLY.*NO_DECISION.*live_apply_allowed=false/,
  "lazy legacy overlays must preserve read-only authority");

console.log("FOCUSED LEGACY OVERLAY LAZY PASS: card geometry and replay persistence stay out of the focused XAUUSD M5 startup graph.");
