import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const component = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)), "utf8");
const skin = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url)), "utf8");

assert.match(component, /className="micro-research-status" role="status" aria-live="polite" aria-label=\{locale === "vi" \? `Trạng thái nghiên cứu dự báo: \$\{researchStatus\}` : `Forecast research status: \$\{researchStatus\}`\} aria-atomic="true">\{researchStatusLabel\} · \{researchStatus\}<\/div>/, "forecast status must remain one atomic accessible chart readout");
assert.doesNotMatch(component, /className="micro-research-status"[^>]*style=\{/, "forecast status layout must use the chart skin for responsive hierarchy");
assert.match(skin, /\.mfe-market-chart\.microchart-tv \.micro-research-status\s*\{[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?border-left:\s*3px solid var\(--accent-cyan\);[\s\S]*?overflow-wrap:\s*anywhere;/, "forecast status must wrap and carry a visible hierarchy accent");
assert.match(skin, /@media \(max-width: 639\.98px\)[\s\S]*?\.micro-research-status\s*\{[\s\S]*?font-size:\s*14px;/, "forecast status must retain the 14px primary size on narrow chart surfaces");

console.log("MICROCHART STATUS HIERARCHY PASS: wrapped forecast readout preserves atomic accessibility and chart authority.");
