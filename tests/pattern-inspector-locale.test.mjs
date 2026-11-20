import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/ChartPatternInspector.tsx", import.meta.url), "utf8");
const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
assert.match(source, /locale = "en"/);
assert.match(source, /const copy = locale === "vi"/);
for (const key of ["pdf", "named", "details", "setup", "outcome", "context", "history", "earlier", "later", "first", "latest", "show"]) assert.match(source, new RegExp(`copy\.${key}`));
assert.match(microscope, /sourceLabel=\{focusedSourceBadgeReady \? \(locale === "vi"/);
const provenance = microscope.split("\n").find(line => line.includes("sourceLabel={focusedSourceBadgeReady"));
for (const text of [
  "L\u1ecbch s\u1eed n\u1ebfn \u0111\u00f3ng MT5 \u0111\u00e3 x\u00e1c minh",
  "Verified MT5 closed-bar history",
  "\u1ea2nh ch\u1ee5p l\u1ecbch s\u1eed c\u1ee5c b\u1ed9 \u00b7 T\u1ea1m gi\u1eef d\u1ef1 b\u00e1o tr\u1ef1c ti\u1ebfp",
  "Local historical snapshot \u00b7 Live forecast withheld",
]) assert.ok(provenance.includes(text), text);
console.log("PATTERN INSPECTOR LOCALE PASS: focused inspector labels and source provenance switch through the shared locale.");
