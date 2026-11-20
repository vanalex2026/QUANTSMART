import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url), "utf8");

assert.match(page, /Current and historical pattern inspection/, "focused chart must expose a shared current/historical inspection context");
assert.match(page, /Current closed bar[\s\S]*currentInspectionMeta/, "comparison must identify the selected current closed-bar lens");
assert.match(page, /Selected historical analogue[\s\S]*historicalInspectionMeta/, "comparison must identify the selected historical endpoint");
assert.match(page, /Preview only · use Show on chart to align the main chart/, "comparison must distinguish preview from main-chart focus");
assert.match(page, /PDF lens and geometry are descriptive; no order authority\./, "comparison must preserve the read-only authority boundary");
assert.match(css, /\.m5-inspection-compare[\s\S]*grid-template-columns/, "comparison strip must have a compact two-pane layout");
assert.match(css, /@media\(max-width:640px\)[\s\S]*\.m5-inspection-compare\{grid-template-columns:1fr/, "comparison strip must remain inspectable on narrow screens");

console.log("KNOWLEDGE PANEL COMPARE PASS: focused readout keeps current PDF lens and historical analogue inspection together.");
