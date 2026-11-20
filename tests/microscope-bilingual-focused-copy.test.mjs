import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sourcePath = fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url));
const sourceBytes = readFileSync(sourcePath);
const source = new TextDecoder("utf-8", { fatal: true }).decode(sourceBytes);

assert.deepEqual(
  Buffer.from(source, "utf8"),
  sourceBytes,
  "Microscope.tsx must round-trip through canonical UTF-8 bytes",
);

const focusedCopyStart = source.indexOf("const focusedCopy =");
const focusedCopyEnd = source.indexOf("const readOnlyLabel", focusedCopyStart);
assert.ok(focusedCopyStart >= 0 && focusedCopyEnd > focusedCopyStart, "focused copy block must be present");
const focusedCopy = source.slice(focusedCopyStart, focusedCopyEnd);
assert.doesNotMatch(focusedCopy, /\uFFFD/, "focused copy must not contain replacement characters");
assert.doesNotMatch(
  focusedCopy,
  /(?:Ã|Â|Ä|Å|Æ|Ð|Ñ|Ò|Ó|Ô|Õ|Ö|Ø|Ù|Ú|Ý|Þ|ß)[\u0080-\u00BF]/,
  "focused copy must not contain UTF-8 mojibake sequences",
);

assert.match(source, /const \{ locale, t \} = useLocale\(\)/, "focused Microscope copy must use the shared locale hook");
for (const key of [
  "sourceCoverage",
  "exportSnapshot",
  "retryHistory",
  "bookmarks",
  "priceActionReadout",
  "currentClosedBar",
  "nextBarObservation",
  "patternCensus",
]) {
  const definitions = focusedCopy.match(new RegExp(`\\b${key}:`, "g")) || [];
  assert.equal(definitions.length, 2, `focused copy must define ${key} once per locale`);
  assert.match(source, new RegExp(`focusedCopy\\.${key}`), `focused UI must render ${key} through locale-aware copy`);
}
assert.match(source, /readOnlyLabel = t\("readOnly"\)/, "shared read-only wording must come through useLocale");
assert.match(source, /SHADOW_ONLY · NO_DECISION · live_apply_allowed=false/, "authority labels must remain stable technical identifiers");
assert.match(focusedCopy, /locale === "vi" \? \{[\s\S]*?sourceCoverage: "Độ phủ nguồn"/, "Vietnamese focused source copy must be present");
assert.match(source, /sourceCoverage: "Source coverage"/, "English focused source copy must be present");

console.log("MICROSCOPE BILINGUAL FOCUSED COPY PASS: source, snapshot, bookmark and readout controls use locale-aware labels with stable authority tokens.");
