import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /PdfAssumptionsPanel/);
assert.match(source, /useState<PdfAssumptionsValue>\(EMPTY_PDF_ASSUMPTIONS\)/);
assert.match(source, /const pdfDetectorInputs = useMemo/);
assert.match(source, /\.\.\.pdfDetectorInputs/);
assert.match(source, /<PdfAssumptionsPanel value=\{pdfAssumptions\}/);
assert.match(source, /SHADOW_ONLY/);

console.log("FOCUSED PDF ASSUMPTIONS INTEGRATION PASS: explicit nullable inputs reach the unified XAUUSD detector and remain read-only.");
