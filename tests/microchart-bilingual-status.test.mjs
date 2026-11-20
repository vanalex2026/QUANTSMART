import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");

assert.match(source, /const researchStatusLabel = locale === "vi" \? "Dự báo" : "Forecast"/,
  "focused chart forecast receipt must use the active locale");
assert.match(source, /const researchProvenanceLabel = locale === "vi" \? "Nguồn nến đóng" : "Closed-bar provenance"/,
  "focused chart provenance receipt must use the active locale");
assert.match(source, /aria-label=\{locale === "vi" \? `Trạng thái nghiên cứu dự báo:/,
  "Vietnamese forecast receipt must remain understandable to assistive technology");
assert.match(source, /aria-label=\{locale === "vi" \? `Nguồn dữ liệu nến đóng:/,
  "Vietnamese provenance receipt must remain understandable to assistive technology");
assert.match(source, /SHADOW_ONLY; NO_DECISION; no order authority/,
  "bilingual receipt work must preserve the focused chart authority boundary");
assert.match(source, /const chartCopy = locale === "vi"\s*\?/,
  "focused chart must provide a locale-specific copy map");
assert.match(source, /aria-label=\{chartCopy\.toolRail\}/,
  "drawing toolbar must expose a localized accessible name");
assert.match(source, /title=\{`\$\{toolLabel\(t\.id\)\} \(\$\{t\.shortcut\}\)`\}/,
  "drawing tools must expose localized labels and titles");
assert.match(source, /aria-label=\{n === 0 \? chartCopy\.noData : chartCopy\.insufficientData\}/,
  "empty chart status must use locale-aware copy");
assert.match(source, /aria-roledescription=\{locale === "vi" \? "biểu đồ nghiên cứu tương tác" : "interactive research chart"\}/,
  "chart role description must follow the active locale");
assert.match(source, /const chartDescription = locale === "vi"\s*\?/, 
  "chart summary must have a Vietnamese branch");

console.log("MICROCHART BILINGUAL STATUS PASS: forecast and closed-bar provenance receipts follow EN/VI locale state.");
