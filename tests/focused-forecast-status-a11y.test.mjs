import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)), "utf8");

assert.doesNotMatch(source, /(?:\u00c3(?:\u0192|\u201a|\u00a2)|\u00e2(?:\u20ac|\u201a)|\u00c2(?:\u00b7|\u2013|\u2026))/u, "focused Microscope user-facing strings must not contain UTF-8 mojibake markers");
assert.match(source, /className="m5-forecast-status" role="status" aria-live="polite" aria-atomic="true" aria-label=\{`\$\{focusedCopy\.forecastStatusPrefix\}: \$\{forecastChartStatus\}`\}>\{focusedCopy\.forecastStatusPrefix\}: \{forecastChartStatus\}/,
  "focused next-bar forecast must expose one atomic locale-aware status readout");
assert.match(source, /const forecastChartStatus = `\$\{(?:forecastStatus|forecastStatusLabel)\}[\s\S]*WF \$\{m5Atlas\?\.walkForward\.evaluated \?\? 0\}\/12[\s\S]*(?:support|hỗ trợ) \$\{forecastEffectiveN\}\/8/,
  "forecast status must retain fail-closed gate counts alongside the withholding reason");
console.log("FOCUSED FORECAST STATUS A11Y PASS: next-bar status exposes explicit reason and gate counts.");
