import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const component = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);
const skin = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url)),
  "utf8",
);

assert.match(component, /className="micro-research-status" role="status" aria-live="polite" aria-label=\{locale === "vi" \? `Trạng thái nghiên cứu dự báo: \$\{researchStatus\}` : `Forecast research status: \$\{researchStatus\}`\} aria-atomic="true"/,
  "forecast strip must announce its complete state atomically while its text reflows");
assert.match(component, /className="micro-research-provenance" role="status" aria-live="polite" aria-label=\{locale === "vi" \? `Nguồn dữ liệu nến đóng: \$\{researchProvenance\}` : `Closed-bar provenance: \$\{researchProvenance\}`\} aria-atomic="true"/,
  "provenance strip must announce its complete source attestation atomically");
assert.match(skin, /\.micro-research-status\s*\{[\s\S]*?box-sizing:\s*border-box;[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?text-wrap:\s*pretty;/,
  "forecast strip must stay within the chart box while preserving readable wrapping");
assert.match(skin, /\.micro-research-provenance\s*\{[\s\S]*?box-sizing:\s*border-box;[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?text-wrap:\s*pretty;/,
  "provenance strip must stay within the chart box while preserving readable wrapping");
assert.match(skin, /\.micro-research-provenance\s*\{[\s\S]*?font:\s*12px\s+var\(--mfe-mono\);/, "provenance strips must use the 12px secondary reading size");
assert.match(skin, /@media \(max-width: 359\.98px\)[\s\S]*?\.micro-research-status,[\s\S]*?\.micro-research-provenance[\s\S]*?font-size:\s*12px;[\s\S]*?overflow-wrap:\s*anywhere;/,
  "very narrow phones must retain 12px audit text without clipping its complete copy");
assert.doesNotMatch(skin, /@media \(max-width: 359\.98px\)[\s\S]*?font-size:\s*8px;/, "very narrow phones must not use an 8px provenance fallback");
assert.match(skin, /allowed to grow vertically[\s\S]*?clipping a timestamp or gate count/,
  "phone strip contract must preserve complete provenance visibility");

console.log("MICROCHART PHONE PROVENANCE PASS: atomic audit strips reflow inside narrow monochrome charts.");
