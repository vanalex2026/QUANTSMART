import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /const forecastPrediction = m5Atlas\?\.predictions\?\.find\(\(prediction\) => prediction\.horizon === 1\)/,
  "focused forecast readout must identify the causal H+1 prediction by horizon");
assert.match(source, /Next-bar observation[\s\S]*forecastPrediction\.up[\s\S]*forecastPrediction\.flat[\s\S]*forecastPrediction\.down/,
  "next-bar distribution must use the same named H+1 prediction as its gates");
assert.doesNotMatch(source, /Next-bar observation[\s\S]*predictions\[0\]/,
  "next-bar readout must not depend on incidental prediction array ordering");
console.log("FOCUSED M5 FORECAST READOUT PASS: next-bar distribution is bound to the causal H+1 horizon.");
