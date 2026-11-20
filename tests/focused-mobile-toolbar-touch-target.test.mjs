import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const responsive = readFileSync(new URL("../mfe_ux_lab/cockpit/src/responsive.css", import.meta.url), "utf8");

assert.match(responsive, /@media\(max-width:639\.98px\)[\s\S]*?microchart-tool-rail\s*\{[\s\S]*?height:48px;[\s\S]*?flex:0 0 48px;/, "phone chart toolbar must reserve a 48px touch strip");
assert.match(responsive, /microchart-tool-rail > button\s*\{[\s\S]*?width:36px !important;[\s\S]*?height:36px !important;[\s\S]*?flex:0 0 36px !important;/, "phone chart tools must expose at least 36px square touch targets");
assert.match(responsive, /microchart-tool-rail\s*\{[\s\S]*?overflow-x:auto;[\s\S]*?overflow-y:hidden;/, "the larger touch targets must remain horizontally scrollable on narrow charts");
assert.match(responsive, /microchart-tool-rail\s*\{[\s\S]*?box-sizing:border-box;/, "phone toolbar padding must stay inside the plot width so the page does not gain horizontal scrolling");

console.log("FOCUSED MOBILE TOOLBAR TOUCH TARGET PASS: phone chart controls stay tappable and scrollable.");
