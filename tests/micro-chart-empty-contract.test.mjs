import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chartSource = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const theme = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url), "utf8");
const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const source = chartSource + "\n" + readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChartSeries.tsx", import.meta.url), "utf8");
assert.match(source, /const chartCopy = locale === "vi"\s*\?\s*\{[\s\S]*noData:\s*`[^`]+`[\s\S]*insufficientData:\s*`[^`]+`[\s\S]*\}\s*:\s*\{[\s\S]*noData:\s*`No closed-bar data available for \$\{symbol\} \$\{tf\}`[\s\S]*insufficientData:\s*`Need at least two closed bars for \$\{symbol\} \$\{tf\}`/, "Empty MicroChart tapes must provide locale-aware no-data and one-bar copy");
assert.match(source, /if \(n < 2\)[\s\S]*aria-label=\{n === 0 \? chartCopy\.noData : chartCopy\.insufficientData\}[\s\S]*\{n === 0 \? chartCopy\.noData : chartCopy\.insufficientData\}/, "Empty and one-bar MicroChart tapes must select distinct locale-aware states");
assert.match(source, /className="mfe-market-chart microchart-tv"/, "the chart must opt into the scoped TradingView dark skin");
assert.match(source, /data-candle-direction=\{up \? "up" : "down"\}/, "candles must expose direction for the directional up/down treatment");
assert.match(theme, /--chart-canvas:\s*#050505/, "the chart skin must use a near-black canvas");
assert.match(theme, /--tv-up-strong:\s*#26a69a/, "the chart skin must define a visible teal up-candle tone");
assert.match(theme, /--tv-down-strong:\s*#ef5350/, "the chart skin must define a visible red down-candle tone");
assert.match(theme, /--tv-tool-active-bg:\s*rgba\(255, 255, 255, 0\.14\)/, "selected chart tools must use a neutral monochrome highlight");
assert.match(source, /background: active \? "var\(--tv-tool-active-bg\)"/, "selected chart tools must consume the scoped monochrome highlight token");
assert.doesNotMatch(source, /background: active \? "rgba\(0,229,255,\.16\)"/, "selected chart tools must not reintroduce a saturated cyan fill");
assert.match(microscope, /useState<string>\("M5"\)/, "Microscope must open on the canonical M5 timeframe");
console.log("MICRO CHART EMPTY/THEME CONTRACT PASS: no-data states and scoped dark M5 chart are explicit.");
