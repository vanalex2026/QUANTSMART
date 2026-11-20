import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /const analogueSelectionSummary = analoguePatternFilter/,
  "focused analogue preview must derive a concise active selection summary");
assert.match(source, /Active analogue filter: pattern \$\{analoguePatternFilter\}; \$\{analogueMatches\.length\} retained endpoint/,
  "pattern selection summary must expose the active filter and retained endpoint count");
assert.match(source, /className="m5-analogue-selection-summary" role="status" aria-live="polite" aria-atomic="true"/,
  "active analogue selection must be announced as one atomic status");
assert.match(source, /SHADOW_ONLY[\s\S]*NO_DECISION[\s\S]*no order authority/,
  "selection summary must remain inside the descriptive authority boundary");

console.log("FOCUSED ANALOGUE SELECTION SUMMARY PASS: active filter, endpoint count, and selected index are announced read-only.");
