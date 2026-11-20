import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)), "utf8");
assert.match(source, /currentConceptMarkers\.map\(\(marker\) => \{[\s\S]*formatPriceActionSourcePages\(marker\.pageAnchors\)/, "current chart concept markers must retain indexed PDF page anchors");
assert.match(source, /aria-label=\{locale === "vi" \? `\$\{sourceName\}; \$\{marker\.direction\}; \$\{evidenceScore\}; \$\{focusedCopy\.sourcePages\}/, "current marker provenance must be announced to assistive technology in the active locale");
assert.match(source, /: `\$\{sourceName\}; \$\{marker\.direction\}; \$\{evidenceScore\}; source pages/, "English marker provenance must retain explicit source-page wording");
assert.match(source, /\{formatPriceActionSourcePages\(marker\.pageAnchors\)\}/, "source labels distinguish printed and PDF page anchors");
assert.match(source, /verdict: "OBSERVATION/, "marker source anchors must remain descriptive-only");
console.log("CURRENT MARKER PROVENANCE PASS: chart concepts expose PDF anchors while retaining shadow-only authority.");
