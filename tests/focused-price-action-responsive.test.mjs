import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /m5-pattern-census-row\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/, "pattern census rows need a constrained layout");
assert.match(source, /m5-pattern-census-row>\.pmono\{[^}]*overflow-wrap:anywhere/, "pattern census metrics must wrap instead of forcing overflow");
assert.match(source, /m5-pattern-census-row>\.m5-pattern-census-detail\{[^}]*grid-column:1\/-1/, "long census details must occupy a separate row so they cannot squeeze the pattern name to zero width");
assert.match(source, /m5-pa-grid\{[^}]*overflow-wrap:anywhere/, "source SHA-256 and other unbroken provenance must wrap inside the phone readout");
assert.match(source, /@media\(max-width:500px\)[\s\S]*\.m5-pattern-census-row\{grid-template-columns:1fr;gap:2px\}[\s\S]*\.m5-pattern-census-row>\.pmono\{text-align:left\}/, "narrow readout must stack census labels and metrics");
assert.match(source, /className=\"ms-q m5-pattern-census-row\"/, "census controls must use the responsive row contract");
assert.match(source, /const forecastObservationDirection = forecastEvidenceReady \? forecastDirection : \"WAIT\"/, "responsive styling must preserve fail-closed forecast direction");

console.log("FOCUSED PRICE-ACTION RESPONSIVE PASS: census rows wrap and stack on narrow screens without changing forecast authority.");
