import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const shelf = readFileSync(`${root}/mfe_ux_lab/cockpit/src/components/PdfSignalCoverageShelf.tsx`, "utf8");
const translation = readFileSync(`${root}/mfe_ux_lab/cockpit/src/components/PdfSignalTranslationEvidence.tsx`, "utf8");
const microscope = readFileSync(`${root}/mfe_ux_lab/cockpit/src/pages/Microscope.tsx`, "utf8");

assert.match(shelf, /data-pdf-coverage="23"/);
assert.match(shelf, /result\.counts\.total\}\/23/);
assert.match(shelf, /result\.counts\.total\}\/23/);
assert.match(shelf, /SHADOW_ONLY/);
assert.match(shelf, /result\.observations\.map/);
assert.match(shelf, /m5-pdf-coverage-grid" role="group"/,
  "coverage tiles must remain grouped without overriding native button semantics");
assert.doesNotMatch(shelf, /<button[^>]+role="listitem"/,
  "clickable coverage tiles must remain announced as buttons");
assert.doesNotMatch(shelf, /canInspect = observation\.state === "DETECTED"/);
assert.match(shelf, /data-pdf-state=\{observation\.state\}/);
assert.match(shelf, /L\\u00fd do quan s\\u00e1t/);
assert.match(shelf, /const REASON_LABELS: Record<string, \[string, string\]> =/);
for (const reason of [
  "EXECUTION_MODEL_UNAVAILABLE",
  "NEUTRAL_OR_INVALID_DIRECTION",
  "DIRECTIONAL_CONTEXT_REQUIRED",
  "QUOTE_PRICE_BRACKET_ASSUMPTIONS_UNAVAILABLE",
  "LOCAL_RECENT_RANGE_BELOW_BASELINE",
  "LOCAL_RECENT_RANGE_NOT_BELOW_BASELINE",
]) {
  assert.match(shelf, new RegExp(`${reason}: \\[\\"[^\\"]+\\", \\"(?!${reason})[^\\"]+\\"\\]`),
    `${reason} must have a human-readable Vietnamese label instead of echoing its uppercase code`);
}
for (const reason of [
  "NO_DIRECTIONAL_POWERBAR",
  "NO_ALIGNED_PATTERN_PRESSURE",
  "NO_UNRETIRED_CONFIRMED_SWING_AHEAD_IN_LOCAL_CONTEXT",
]) {
  assert.match(shelf, new RegExp(`${reason}: \\"[^\\"]+\\"`),
    `${reason} must remain readable in Vietnamese instead of falling back to English tokens`);
}
assert.match(shelf, /\^\(SUPPORT\|RESISTANCE\)_ROLE_TEST_/,
  "support/resistance touch reasons need locale-aware dynamic labels");
assert.match(shelf, /\^\(UP\|DOWN\)_SWING_STRUCTURE_/,
  "directional swing reasons need locale-aware dynamic labels");
for (const reason of [
  "USER_SUPPLIED_QUOTE_PRICE_BRACKET",
  "VALIDATED_NEWS_EVENT_IDENTITY_OBSERVED",
  "VALIDATED_STRUCTURAL_LEVEL_TOUCH_OBSERVED",
  "USER_SUPPLIED_RISK_UNIT_OBSERVATION",
]) {
  assert.match(translation, new RegExp(`${reason}: \\[\\"[^\\"]+\\", decodeURIComponent\\(`),
    `${reason} needs a localized source-note reason label`);
}
assert.match(shelf, /const reason = reasonLabel\(observation\.reason, locale\)/,
  "PDF shelf reason copy must use the active locale instead of exposing raw reason codes");
assert.doesNotMatch(shelf, /L\\u00fd do quan s\\u00e1t: \$\{observation\.reason\}/,
  "Vietnamese shelf output must not interpolate raw uppercase reason codes");
assert.match(microscope, /setKnowledgePattern\(conceptId\)/);
assert.match(microscope, /setInspectedSignal\(null\);/);
assert.match(microscope, /setKnowledgePattern\(conceptId\);/);
assert.match(microscope, /<PdfSignalCoverageShelf result=\{allPdfSignalResult\} verification=\{pdfSignalVerification\} locale=\{locale\}/);
assert.match(microscope, /selectPdfCoverageConcept/);
assert.match(translation, /const sourceDataPrefix = locale === "vi" \? "SOURCE_REVIEW_ONLY \/ d\\u1eef li\\u1ec7u"/,
  "Vietnamese descriptor status must translate the data label while retaining the stable source status identifier");
assert.match(translation, /const outcomeSuffix = locale === "vi" \? " \/ k\\u1ebft qu\\u1ea3 WITHHELD"/,
  "Vietnamese descriptor status must translate the outcome label while retaining the stable withheld identifier");
assert.doesNotMatch(translation, /Â·|Ã·/, "translation summary must not contain mojibake separators");

console.log("PDF SIGNAL COVERAGE SHELF PASS: all 23 observations have a visible EN/VI status surface with read-only authority.");
