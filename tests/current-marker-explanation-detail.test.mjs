import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /const assessment = priceAction\?\.assessments\.find\(\(candidate\) => candidate\.conceptId === marker\.conceptId\)/,
  "current marker controls must resolve the detector assessment for explanation text");
assert.match(source, /detector reason \$\{detectorReason\}/,
  "current marker accessible labels must expose the deterministic detector reason");
assert.match(source, /measured \{detectorReason\}/,
  "current marker buttons must show the detector reason beside the PDF source anchor");
assert.match(source, /entry \$\{fp\(price\)\} · target/,
  "entry geometry must keep the price landmarks readable in sequence");
assert.match(source, /latest closed-bar close/,
  "entry geometry must identify the closed-bar price used for the descriptive landmark");
assert.match(source, /target \$\{fp\(price \+ \(priceActionDirection === "UP" \? 2\.2 : -2\.2\) \* atr\)\} \(\+2\.2 ATR\)/,
  "target geometry must expose its ATR basis");
assert.match(source, /invalidation \$\{fp\(price - \(priceActionDirection === "UP" \? 1\.0 : -1\.0\) \* atr\)\} \(1\.0 ATR protection\)/,
  "invalidation geometry must expose its ATR basis");
assert.match(source, /descriptive only; no order authority/,
  "entry geometry must retain the descriptive read-only boundary");

console.log("CURRENT MARKER EXPLANATION DETAIL PASS: detector reason and entry/target/invalidation bases are explicit and read-only.");
