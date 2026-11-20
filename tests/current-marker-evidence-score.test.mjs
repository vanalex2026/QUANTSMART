import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)), "utf8");
assert.match(source, /const evidenceScore = `\$\{\(marker\.score \* 100\)\.toFixed\(0\)\}% \$\{locale === "vi" \? "điểm hình học" : "geometry score"\}`/, "current markers must expose their bounded locale-aware geometry evidence score");
assert.match(source, /\$\{evidenceScore\}[\s\S]{0,80}formatPriceActionSourcePages/, "marker score must be visible alongside source anchors");
assert.match(source, /\$\{sourceName\}; \$\{marker\.direction\}; \$\{evidenceScore\}; \$\{focusedCopy\.sourcePages\}/, "Vietnamese marker score must be announced with localized source anchors");
assert.match(source, /\$\{sourceName\}; \$\{marker\.direction\}; \$\{evidenceScore\}; source pages/, "English marker score must retain explicit source anchors");
console.log("CURRENT MARKER EVIDENCE SCORE PASS: pattern controls expose bounded geometry evidence with source anchors.");
