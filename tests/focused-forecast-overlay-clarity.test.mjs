import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /className="m5-next-bar-card" data-forecast-direction=\{forecastObservationDirection\}/,
  "focused forecast must expose a dedicated next-bar direction card");
assert.match(source, /m5-direction-badge[\s\S]*forecastObservationDirection === "UP"[\s\S]*forecastObservationDirection === "DOWN"/,
  "next-bar direction must be rendered as explicit UP, DOWN or WAIT text");
assert.match(source, /className="m5-probability-strip"[\s\S]*forecastPrediction\.up[\s\S]*forecastPrediction\.flat[\s\S]*forecastPrediction\.down/,
  "direction confidence must show all H+1 probability components");
assert.match(source, /className="m5-gate-strip"[\s\S]*focusedCopy\.gateWalkForward[\s\S]*focusedCopy\.gateSupport[\s\S]*focusedCopy\.gateAnalogues[\s\S]*focusedCopy\.gateMargin/,
  "forecast gate counts must remain individually scannable and locale-aware");
assert.match(source, /focusedCopy\.gateHistory\}\s*\{forecastHistoryReady \? focusedCopy\.gateReady : focusedCopy\.gateWait/,
  "focused forecast must expose verified-history readiness as an explicit locale-aware gate");
assert.match(source, /focusedCopy\.gateFreshness\}\s*\{forecastFreshness\?\.ok === true \? focusedCopy\.gateFresh : focusedCopy\.gateWait/,
  "focused forecast must expose closed-bar freshness as an explicit locale-aware gate");
assert.match(source, /focusedCopy\.gateCausalMeta\}[\s\S]*\{forecastSupportDenominators\.ok[\s\S]*focusedCopy\.gateWait/,
  "focused forecast must expose causal support metadata integrity as an explicit locale-aware gate");
assert.match(source, /SHADOW_ONLY[\s\S]*NO_DECISION/,
  "focused forecast overlay must retain the read-only authority boundary");

console.log("FOCUSED FORECAST OVERLAY CLARITY PASS: direction, confidence meters, and gate chips are explicit and read-only.");
