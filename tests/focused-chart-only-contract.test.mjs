import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const responsive = readFileSync(new URL("../mfe_ux_lab/cockpit/src/responsive.css", import.meta.url), "utf8");

assert.match(source, /FOCUSED_CHART_ONLY_KEY\s*=\s*["']mfe_focused_chart_only_v1["']/, "chart-only mode must use a versioned session key");
assert.match(source, /sessionStorage\.getItem\(FOCUSED_CHART_ONLY_KEY\) !== ["']0["']/, "focused home must default to chart-only unless the user explicitly restores context");
assert.doesNotMatch(source, /sessionStorage\.removeItem\(FOCUSED_CHART_ONLY_KEY\)/, "reading the chart-only preference must not erase an explicit context choice");
assert.match(source, /useState\(\(\) => focused \? readFocusedChartOnlyPreference\(\) : false\)/, "focused home must start in chart-only mode on its first render");
assert.match(source, /sessionStorage\.setItem\(FOCUSED_CHART_ONLY_KEY, chartOnly \? ["']1["'] : ["']0["']\)/, "chart-only mode must persist reversibly in session storage");
assert.match(source, /event\.key\.toLowerCase\(\) !== ["']c["'].*event\.altKey/, "chart-only mode must expose an Alt+C keyboard shortcut");
assert.match(source, /data-chart-only=\{focused && chartOnly \? ["']true["'] : undefined\}/, "chart-only state must be scoped to the focused surface");
assert.match(source, /aria-pressed=\{chartOnly\}/, "chart-only toggle must expose its pressed state");
assert.match(source, /aria-keyshortcuts=["']Alt\+C["']/, "chart-only toggle must advertise its keyboard shortcut");
assert.match(source, /className="ms-q ms-chart-only-toggle" aria-label=\{chartOnly \? focusedCopy\.showContext : focusedCopy\.chartOnly\} aria-pressed=\{chartOnly\}/, "chart-only toggle must expose a localized accessible label and dedicated responsive class");
assert.match(source, /\.ms-focused\[data-chart-only="true"\]>\.ms-ctrl>\.ms-chart-only-toggle\{display:inline-flex;/, "chart-only mode must keep a compact context toggle visible");
assert.match(source, /showContext: "Show context"/);
assert.match(source, /showContext: "Hiện ngữ cảnh"/);
assert.match(responsive, /\.ms-chart-only-toggle\s*\{[\s\S]*?min-width:0;[\s\S]*?white-space:nowrap;/, "chart-only toggle must size to its label instead of reserving an oversized desktop width");
assert.match(responsive, /@media \(max-width:640px\)\s*\{[\s\S]*?\.ms-focused \.ms-chart-only-toggle\s*\{[\s\S]*?flex:1 1 100%;[\s\S]*?min-height:36px;/, "chart-only toggle must become a full-width touch target on narrow focused layouts");
assert.match(responsive, /\.ms-chart-only-toggle:focus-visible\s*\{[\s\S]*?outline:2px solid/, "chart-only toggle must retain a visible keyboard focus ring");
assert.match(responsive, /\.ms-focused \.ms-chart\s*\{[\s\S]*?flex:0 0 auto;[\s\S]*?contain:layout;/, "focused chart viewport must stay stable while signal and readout panels expand below it");
assert.match(responsive, /\.ms-focused\[data-chart-only="true"\]\s*\{\s*display:flex;\s*flex-direction:column;\s*height:calc\(100dvh - var\(--focused-header-height\)/, "chart-only workspace must size the whole control/chart column to the viewport");
assert.match(responsive, /\.ms-focused\[data-chart-only="true"\] > \.ms-ctrl \{ flex:none; \}/, "wrapped controls must take their real height");
assert.match(responsive, /\.ms-focused\[data-chart-only="true"\] > \.ms-grid \{ flex:1; min-height:0; \}/, "chart must receive the remaining height after controls");
assert.match(responsive, /\.ms-focused\[data-chart-only="true"\] \.ms-chart\s*\{\s*height:100%;\s*min-height:0;/, "chart footer must fit inside the remaining viewport");
assert.match(responsive, /@media \(max-width:640px\)[\s\S]*?data-focus-surface="m5-chart"\] \.ms-focused \.ms-chart\s*\{[\s\S]*?height:calc\(100dvh - 94px\)/, "phone chart layout must retain its dedicated header/control gutter");
assert.match(source, /\.ms-focused\[data-chart-only=["']true["']\][^\n]*:not\(\.ms-ctrl\):not\(\.ms-grid\)/, "chart-only mode must collapse non-chart focused panels while retaining controls and chart");
assert.match(source, /data-price-action-scan.*display:none !important/, "chart-only mode must hide the asynchronous detector notice");
assert.match(source, /data-candle-atlas-scan.*display:none !important/, "chart-only mode must hide the asynchronous candle-atlas notice");
assert.match(source, /\.ms-grid>\.m5-pdf-coverage-shelf.*display:none !important/, "chart-only mode must hide the PDF coverage shelf");
assert.match(source, /\.ms-grid>\.m5-pdf-statistics.*display:none !important/, "chart-only mode must hide the statistics shelf");
assert.match(source, /SHADOW_ONLY.*NO_DECISION.*live_apply_allowed=false/, "chart-only mode must leave research authority labels intact");

console.log("focused chart-only contract: ok");
