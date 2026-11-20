import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)), "utf8");

assert.match(
  source,
  /currentConceptProvenanceReadout = currentConceptMarkers\.length[\s\S]*source attestation \$\{PRICE_ACTION_KNOWLEDGE_PROVENANCE\.schema\} · \$\{PRICE_ACTION_KNOWLEDGE_PROVENANCE\.sourceTitle\} · SHA-256 \$\{PRICE_ACTION_KNOWLEDGE_PROVENANCE\.sourceSha256\}/,
  "current concept provenance must expose the immutable knowledge-map schema, source title, and SHA-256 attestation",
);
assert.match(source, /PDF pages are descriptive source references only/, "attestation readout must preserve the descriptive PDF boundary");
assert.match(source, /currentConceptProvenanceReadout\}/, "attestation readout must be rendered in the focused surface");

console.log("CURRENT MARKER SOURCE ATTESTATION PASS: focused current-pattern provenance includes the indexed knowledge-map schema and SHA-256 while retaining SHADOW_ONLY language.");
