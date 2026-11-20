import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const shelf = readFileSync(`${root}/mfe_ux_lab/cockpit/src/components/PdfSignalCoverageShelf.tsx`, "utf8");

assert.match(shelf, /const stateLabel = \(state: PdfSignalObservation\["state"\], locale: Locale\) => STATE_LABELS\[state\]\[locale === "vi" \? 1 : 0\];/);
assert.match(shelf, /stateLabel\(observation\.state, locale\)}`/);
assert.doesNotMatch(shelf, /const \[enState, localizedState\] = stateLabel\(observation\.state, locale\)/,
  "stateLabel returns one localized string and must not be destructured as a tuple");
assert.doesNotMatch(shelf, /stateLabel\(observation\.state, locale\)\[1\]/,
  "Vietnamese reason copy must not index a localized string by character");
for (const state of ["DETECTED", "ABSTAIN", "UNAVAILABLE", "WITHHELD"]) {
  assert.match(shelf, new RegExp(`${state}: \\["[^\\"]+", "[^\\"]+"\\]`), `${state} needs English and Vietnamese labels`);
}

console.log("WAVE 25 PDF SHELF RENDER CONTRACT PASS: localized status labels remain complete strings in tile text and accessible labels.");
