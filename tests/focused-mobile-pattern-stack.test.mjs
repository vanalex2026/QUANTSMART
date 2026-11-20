import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const responsive = readFileSync(new URL("../mfe_ux_lab/cockpit/src/responsive.css", import.meta.url), "utf8");
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const phone = responsive.slice(responsive.indexOf("@media (max-width:430px)"));

assert.ok(phone.length > 0, "390px phones need a pattern shelf bound independent of viewport height");
assert.match(phone, /\.workspace-shell \.ms-focused \.mfe-market-chart\.microchart-tv \.micro-pattern-status \{\s*flex:0 0 auto;\s*max-height:112px;\s*overflow-x:hidden;\s*overflow-y:auto;/,
  "eight wrapped chips and an expanded source explanation must share one focused, vertically scrollable 112px shelf");
assert.match(phone, /overscroll-behavior:contain;[\s\S]*scroll-padding-block:4px;/,
  "phone shelf scrolling must stay local and leave space around keyboard-focused controls");
assert.match(phone, /\.micro-pattern-status-chips \{\s*max-width:100%;\s*padding:2px;/,
  "chip focus outlines need breathing room inside the scrolling shelf");
assert.match(phone, /\.micro-pattern-status-button \{\s*box-sizing:border-box;\s*max-width:100%;\s*white-space:normal;\s*overflow-wrap:anywhere;\s*flex-shrink:0;/,
  "long evidence labels must wrap inside the phone width without shrinking keyboard controls");
assert.match(phone, /\.micro-pattern-status-authority \{\s*order:-1;\s*position:sticky;\s*top:0;[\s\S]*?flex-basis:100%;/,
  "the focused mobile shelf must keep its SHADOW_ONLY / NO_DECISION authority line visible while chips and Why / PDF scroll");
assert.doesNotMatch(phone, /display:\s*none|line-clamp|visibility:\s*hidden|text-overflow:\s*ellipsis/,
  "the phone shelf must retain all evidence and controls");
assert.match(source, /className="micro-pattern-status" role="status" aria-live="polite"[\s\S]*aria-atomic="true"/,
  "the complete current-pattern explanation must retain live status semantics");
assert.match(source, /researchPatternSignals\.map\([\s\S]*type="button" className="micro-pattern-status-button"[\s\S]*onClick=\{\(\) => onSignalSelect\?\.\(signal\)\}/,
  "every current pattern must retain its native keyboard inspection action");
assert.match(source, /<details className="micro-pattern-status-explanation"><summary>\{locale === "vi" \? .* : "Why \/ PDF"\}<\/summary>/,
  "full source explanation must remain available through a native details control");

console.log("FOCUSED MOBILE PATTERN STACK PASS: phone evidence remains complete in a bounded scrolling shelf.");

