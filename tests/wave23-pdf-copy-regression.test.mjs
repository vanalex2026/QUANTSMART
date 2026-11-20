import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const focusedCopyFiles = [
  "mfe_ux_lab/cockpit/src/components/ChartPatternSourceNotes.tsx",
  "mfe_ux_lab/cockpit/src/components/PdfSignalCoverageShelf.tsx",
  "mfe_ux_lab/cockpit/src/components/PdfSignalTranslationEvidence.tsx",
  "mfe_ux_lab/cockpit/src/components/PriceActionBookIndex.tsx",
  "mfe_ux_lab/cockpit/src/components/PriceActionKnowledgePanel.tsx",
  "mfe_ux_lab/cockpit/src/components/ReviewedSourceNotes.tsx",
  "mfe_ux_lab/cockpit/src/lib/locale.ts",
  "mfe_ux_lab/cockpit/src/lib/sourceNotesLocalization.ts",
];

// These byte sequences indicate a UTF-8/Windows-1252 round-trip rather than
// intentional Vietnamese copy. Keep the detector narrow because Vietnamese
// itself legitimately uses characters such as â.
const mojibake = /(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|â(?:€[\u0080-\u00BF]|[\u0080-\u00BF]{2})|ï¿½|�)/u;

for (const relative of focusedCopyFiles) {
  const source = readFileSync(`${root}/${relative}`, "utf8");
  assert.equal(source.includes("\uFFFD"), false, `${relative} must not contain replacement characters`);
  assert.doesNotMatch(source, mojibake, `${relative} must not contain UTF-8 mojibake`);
  assert.doesNotMatch(source, /\\\\u[0-9a-f]{4}/iu, `${relative} must not double-escape Unicode separators`);
  assert.doesNotMatch(source, /<(?:span|p|small|h[1-6])>[^<]*\\u[0-9a-f]{4}[^<]*<\/(?:span|p|small|h[1-6])>/iu, `${relative} must not expose an escaped separator as JSX text`);
}

const localization = readFileSync(`${root}/mfe_ux_lab/cockpit/src/lib/sourceNotesLocalization.ts`, "utf8");
assert.match(localization, /sourceOnly: vi\("Ch%E1%BB%89%20r%C3%A0%20so%C3%A1t%20ngu%E1%BB%93n"\)/,
  "Vietnamese source-note status must retain readable percent-encoded source text");

const panel = readFileSync(`${root}/mfe_ux_lab/cockpit/src/components/PriceActionKnowledgePanel.tsx`, "utf8");
assert.match(panel, /locale === "vi" \? "Bản đồ kiến thức hành động giá"/,
  "knowledge panel must keep readable Vietnamese shell copy");
assert.match(panel, /SOURCE_NOTES · chỉ từ nguồn/,
  "knowledge panel source-only scope must use a real middle-dot separator");

console.log("WAVE 23 PDF COPY REGRESSION PASS: focused knowledge and PDF copy is UTF-8, bilingual text is readable, and escaped separators are not exposed.");
