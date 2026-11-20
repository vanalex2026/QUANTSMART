import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panel = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PriceActionKnowledgePanel.tsx", import.meta.url), "utf8");
const book = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PriceActionBookIndex.tsx", import.meta.url), "utf8");
const authority = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false";

assert.match(panel, /Source notes only · no detector or measured outcome statistics/);
assert.match(panel, /sourceNotesStatus\(locale\)/);
assert.match(panel, /selected\.implementation === "SOURCE_NOTES"/);
assert.ok(book.includes("SOURCE_NOTES") && book.includes("SHADOW_ONLY / NO_DECISION / live_apply_allowed=false"));
assert.doesNotMatch(panel, /SOURCE_NOTES[\s\S]{0,180}(win rate|win-rate|probability|fill|order)/i);
assert.doesNotMatch(book, /SOURCE_NOTES[\s\S]{0,180}(win rate|win-rate|probability|fill|order)/i);

console.log("KNOWLEDGE SOURCE LABEL AUDIT PASS: source-only notes remain explicitly labelled and read-only.");
