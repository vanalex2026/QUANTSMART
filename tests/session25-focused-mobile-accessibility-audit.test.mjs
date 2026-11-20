import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const responsive = readFileSync(new URL("../mfe_ux_lab/cockpit/src/responsive.css", import.meta.url), "utf8");
const chartCss = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url), "utf8");
const inspectorCss = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/chart-pattern-inspector.css", import.meta.url), "utf8");
const inspector = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/ChartPatternInspector.tsx", import.meta.url), "utf8");

const phoneChart = chartCss.slice(chartCss.indexOf("@media (max-width: 639.98px)"));
assert.match(phoneChart, /\.microchart-bottom-bar > button\s*\{[^}]*min-height:\s*36px;[^}]*padding-block:\s*7px;/,
  "the phone chart reset control must retain a thumb-sized target after the footer wraps");
assert.match(phoneChart, /\.micro-pattern-status-explanation summary\s*\{[^}]*min-height:\s*36px;/,
  "the phone Why / PDF disclosure must retain a thumb-sized target");

const phoneInspector = inspectorCss.slice(inspectorCss.indexOf("@media(max-width:640px)"));
assert.match(phoneInspector, /\.chart-pattern-inspector button\{[^}]*min-height:36px;/,
  "mobile inspector actions must retain a minimum 36px target");
assert.match(phoneInspector, /\.chart-pattern-inspector details>summary\{[^}]*min-height:36px;/,
  "mobile inspector disclosure controls must retain a minimum 36px target");
assert.match(phoneInspector, /\.chart-pattern-inspector-body\{[^}]*padding:10px 12px\}/,
  "mobile inspector body keeps bounded horizontal padding");

assert.match(responsive, /microchart-tool-rail\s*\{[\s\S]*?box-sizing:border-box;[\s\S]*?overflow-x:auto;/,
  "phone chart tools remain inside the plot while scrolling horizontally");
assert.match(inspector, /previous\.isConnected[\s\S]*previous\.focus\(\{ preventScroll: true \}\)/,
  "closing the inspector restores focus to the invoking connected control");
assert.match(inspector, /document\.querySelector<HTMLElement>\("\.microchart-canvas"\)\?\.focus\(\{ preventScroll: true \}\)/,
  "closing the inspector falls back to the chart canvas when the invoking marker was removed");

console.log("SESSION 25 FOCUSED MOBILE ACCESSIBILITY PASS: phone chart and inspector controls retain thumb targets, local overflow bounds and focus restoration.");
