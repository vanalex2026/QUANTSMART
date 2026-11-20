import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);
const chartCss = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url)),
  "utf8",
);
const responsive = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/responsive.css", import.meta.url)),
  "utf8",
);

assert.match(source, /className="microchart-tool-rail"[^>]*role="toolbar"/, "focused chart toolbar needs a responsive rail hook");
assert.match(source, /className="microchart-main"/, "chart plot needs a flex child hook when the rail moves above it");
assert.match(source, /className="microchart-tool-spacer"/, "toolbar spacer needs an explicit responsive hook");
assert.match(source, /flexDirection: toolbarHorizontal \? "row" : "column"/, 
  "toolbar inline layout must follow the responsive orientation state");
assert.match(responsive, /@media\(max-width:639\.98px\)[\s\S]*\.mfe-market-chart\.microchart-tv \{ flex-direction:column; \}/,
  "narrow focused chart must stack the toolbar above the plot");
assert.match(responsive, /\.microchart-tool-rail[\s\S]*overflow-x:auto[\s\S]*border-right:0/,
  "narrow toolbar must scroll horizontally instead of squeezing the chart width");
assert.match(responsive, /\.microchart-tool-spacer \{ flex:1 0 6px;/,
  "narrow toolbar spacer must preserve access to trailing controls such as Clear");
assert.match(responsive, /\.microchart-bottom-bar > span\[role="status"\] \{ width:100%; flex:0 0 100%; order:2; min-width:0; \}/,
  "narrow chart footer must give the evidence status its own readable row");
assert.match(responsive, /\.workspace-shell\[data-focus-surface="m5-chart"\] \.locale-toggle \{[\s\S]*?display:inline-flex;[\s\S]*?min-width:36px;[\s\S]*?min-height:36px;/,
  "focused mobile chart must retain a keyboard/touch-accessible VI/EN language toggle");
assert.match(source, /className="microchart-hover-card"/, "hover evidence cards need a responsive chart-local hook");
assert.match(chartCss, /\.microchart-hover-card\s*\{[\s\S]*max-width:\s*calc\(100% - 12px\) !important;[\s\S]*overflow-wrap:\s*anywhere;/,
  "hover evidence cards must stay within narrow chart plots and wrap long research copy");
assert.match(chartCss, /\.microchart-hover-card\s*\{[\s\S]*max-height:\s*calc\(100% - 12px\) !important;[\s\S]*overflow-x:\s*hidden;[\s\S]*overflow-y:\s*auto;/,
  "hover evidence cards must cap their height and scroll long rationale inside short responsive plots");
assert.match(chartCss, /\.microchart-hover-card\s*\{[\s\S]*background:\s*var\(--bg-elevated\) !important;/,
  "hover evidence cards must use the chart's monochrome elevated surface");
const compactPhone = chartCss.slice(chartCss.indexOf("@media (max-width: 359.98px) and (max-height: 740px)"));
assert.ok(compactPhone.length > 0, "short ultra-narrow phones need a bounded evidence layout");
for (const [selector, maxHeight] of [["micro-research-status", 24], ["micro-research-provenance", 30], ["micro-pattern-status", 50]]) {
  assert.match(compactPhone, new RegExp(`\\.${selector} \\{ max-height: ${maxHeight}px; \\}`),
    `${selector} must leave plot space while keeping its full text in a scroll region`);
}
assert.match(compactPhone, /\.micro-pattern-status\s*\{\s*flex: 0 0 auto;\s*overflow-x: hidden;\s*overflow-y: auto;/,
  "bounded audit receipts must scroll vertically instead of clipping their full evidence text");
assert.match(compactPhone, /\.mfe-chart-plot\s*\{\s*flex: 1 0 200px !important;\s*min-height: 200px;/,
  "short ultra-narrow phones must retain an inspectable 200px plot");
assert.doesNotMatch(compactPhone, /display:\s*none|line-clamp|visibility:\s*hidden/,
  "compact evidence must retain full accessible statuses and controls");
console.log("MICROCHART RESPONSIVE PASS: narrow focused chart stacks a scrollable toolbar without changing chart authority.");
