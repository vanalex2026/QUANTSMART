import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /const forecastGateReasons = \[/,
  "focused forecast must derive a machine-readable list of unmet evidence gates");
assert.match(source, /verified MT5 history[\s\S]*fresh closed-bar evidence[\s\S]*walk-forward coverage[\s\S]*effective causal support/,
  "forecast explanation must name the core history, freshness, validation, and support blockers");
assert.match(source, /const forecastGateExplanation = forecastEvidenceReady[\s\S]*Forecast withheld until/,
  "focused forecast must explain whether gates pass or why the landmark is withheld");
assert.match(source, /className="m5-forecast-gate-explanation" role="status" aria-live="polite" aria-atomic="true"/,
  "forecast gate explanation must be exposed as one atomic accessible status");
assert.match(source, /SHADOW_ONLY[\s\S]*NO_DECISION/,
  "forecast gate explanation must retain the read-only authority boundary");

console.log("FOCUSED FORECAST GATE EXPLANATION PASS: unmet gates are named in one atomic read-only status.");
