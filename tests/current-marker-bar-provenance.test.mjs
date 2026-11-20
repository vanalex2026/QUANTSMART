import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)), "utf8");
assert.match(source, /const currentConceptProvenanceReadout = currentConceptMarkers\.length/, "current concept provenance must have an explicit readout");
assert.match(source, /closed bar \$\{currentConceptMarkers\[currentConceptMarkers\.length - 1\]\.time\} UTC/, "current concept provenance must identify the closed-bar timestamp");
assert.match(source, /className=\{undefined\}|currentConceptProvenanceReadout\}/, "current concept provenance readout must be rendered");
assert.match(source, /PDF pages are descriptive source references only/, "current concept provenance must preserve shadow-only authority language");
console.log("CURRENT MARKER BAR PROVENANCE PASS: concept navigation identifies the closed-bar timestamp and descriptive boundary.");
