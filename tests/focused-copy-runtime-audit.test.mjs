import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourcePath = `${root}/mfe_ux_lab/cockpit/src/pages/Microscope.tsx`;
const source = readFileSync(sourcePath, "utf8");
const focusedCopyEnd = source.indexOf("const readOnlyLabel");
assert.ok(focusedCopyEnd > 0, "focused copy boundary must be present");
const focusedRender = source.slice(focusedCopyEnd);

// These are focused-surface strings that are rendered as user-facing copy.
// Keep this list narrow so ternary operators and missing-value placeholders do
// not get mistaken for separator regressions.
const separatorRegressions = [
  /H\+1 Wilson 95% intervals \? UP/,
  /\? one contribution per endpoint/,
  /similarity .*? \? distance/,
  /Pattern filter: .*? \? .*? matching causal analogues/,
  /Family filter: .*? \? .*? matching causal analogues/,
  /pp \? DOWN/,
  /pages\)\} \? source lens only/,
  /H\+1 .*? \? similarity/,
  /ANALOGUE .*? \? OBS/,
  /Local CSV \? user supplied/,
];

for (const pattern of separatorRegressions) {
  assert.equal(
    pattern.test(focusedRender),
    false,
    `focused runtime copy must replace question-mark separator: ${pattern}`,
  );
}

// These labels are visible in the focused render tree without a locale guard.
// They should move behind the shared English/Vietnamese copy contract.
const untranslatedFocusedLabels = [
  />Evidence receipt<\/span>/,
  />Forecast status: /,
  />Selected historical analogue<\/span>/,
  /"Preview unavailable"/,
  /"Main chart endpoint focused"/,
  /"Preview only .*? use Show on chart to align the main chart"/,
  /"Research evidence only .*? SHADOW_ONLY .*? NO_DECISION .*? no order authority\."/,
];

for (const pattern of untranslatedFocusedLabels) {
  assert.equal(
    pattern.test(focusedRender),
    false,
    `focused runtime label must use locale-aware copy: ${pattern}`,
  );
}

// The authority boundary stays explicit while copy is localized.
assert.match(source, /SHADOW_ONLY/);
assert.match(source, /NO_DECISION/);
assert.match(source, /live_apply_allowed=false/);
assert.doesNotMatch(source, /live_apply_allowed\s*=\s*true/);

console.log("FOCUSED COPY RUNTIME AUDIT PASS: separators, locale labels, and read-only authority contract are clean.");
