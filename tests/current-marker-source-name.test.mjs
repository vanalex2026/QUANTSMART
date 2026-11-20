import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)), "utf8");
assert.match(source, /const sourceLens = getPriceActionKnowledge\(marker\.conceptId\)/, "current markers must resolve their source-grounded concept lens");
assert.match(source, /const sourceName = sourceLens \? getSourceNotesCopy\(sourceLens, locale\)\.name : marker\.label/, "current marker labels must prefer the locale-aware human-readable source concept name");
assert.match(source, /aria-label=\{locale === "vi" \? `\$\{sourceName\}; \$\{marker\.direction\}; \$\{evidenceScore\};/, "source concept name and anchors must be announced to assistive technology in the active locale");
assert.match(source, /\{sourceName\} · \{marker\.direction\} · \{evidenceScore\} · measured \{detectorReason\} · \{formatPriceActionSourcePages\(marker\.pageAnchors\)\}/, "current marker controls must visibly explain the source concept, detector reason, geometry score and source pages");
console.log("CURRENT MARKER SOURCE NAME PASS: chart markers expose human-readable source concepts and PDF anchors.");
