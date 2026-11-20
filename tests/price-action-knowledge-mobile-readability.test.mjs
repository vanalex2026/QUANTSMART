import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PriceActionKnowledgePanel.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/price-action-knowledge-panel.css", import.meta.url), "utf8");

assert.match(component, /locale === "vi" \? `\$\{concepts\.length\} tr\u00ean \$\{map\.concepts\.length\}/,
  "Vietnamese concept counts must use a localized connector instead of the English 'of'");
assert.ok(styles.includes("@media(max-width:700px){.p-akp-search-meta{font-size:11px;line-height:1.35"),
  "mobile knowledge search metadata must remain readable above the 9px desktop helper size");
assert.ok(styles.includes(".p-akp-concept-scope{font-size:10px!important;line-height:1.3;white-space:normal;overflow-wrap:anywhere}"),
  "mobile concept scope labels must be readable and wrap within the two-column list");

console.log("PRICE ACTION MOBILE READABILITY PASS: Vietnamese counts and mobile concept metadata remain localized, legible, and wrapped.");
