import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)), "utf8");
assert.match(source, /const currentConceptExplanation = currentConceptMarkers\.length/, "current-pattern UI must build an explanation from the detected closed-bar markers");
assert.match(source, /getPriceActionKnowledge\(marker\.conceptId\)[\s\S]*const sourceName = sourceLens \? getSourceNotesCopy\(sourceLens, locale\)\.name : marker\.label/, "current-pattern explanation must use the locale-aware PDF concept name");
assert.match(source, /const assessment = priceAction\?\.assessments\.find\(\(candidate\) => candidate\.conceptId === marker\.conceptId\)/, "current-pattern explanation must expose the detector assessment");
assert.match(source, /reason\.replace\(\/_\/g, " "\)\.toLowerCase\(\)/, "detector reasons must be readable in the current-pattern explanation");
assert.match(source, /\$\{formatPriceActionSourcePages\(marker\.pageAnchors\)\}/, "source labels distinguish printed and PDF page anchors");
assert.match(source, /ABSTAIN[^\\n]*no deterministic closed-bar concept match/, "no current concept must explain the abstention state");
assert.match(source, /m5-current-pattern-explanation/, "current-pattern explanation must be rendered in the readout");
console.log("CURRENT PATTERN EXPLANATION PASS: current closed-bar concepts expose readable detector reasons and PDF provenance.");
