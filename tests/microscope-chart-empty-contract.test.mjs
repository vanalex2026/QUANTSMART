import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
assert.match(source, /replayBars\.length === 0 \?[\s\S]{0,320}?`No closed-bar data available/, "Microscope's parent chart slot must expose no-data instead of pretending to load indefinitely");
assert.match(source, /Need at least two closed bars/, "Microscope must explain its insufficient-bar chart state");
assert.match(source, /focusedHistoryVerifying[\s\S]*?(?:Loading chart data|Đang tải dữ liệu biểu đồ)[\s\S]*?No closed-bar data available for/, "Visible parent chart copy must distinguish chart snapshot loading from genuine empty data");
assert.doesNotMatch(source, /Loading \{getActiveSymbol\(\)\} \{tf\} candles/, "The empty chart must not visibly claim an ongoing load");
assert.match(source, /m5-empty-count[^\n]*retainedClosedBars/, "Focused empty chart must disclose the retained closed-bar count when present");
assert.match(source, /m5-empty-retry/, "Focused empty chart must offer an inline MT5 history retry");
assert.match(source, /focusedCopy\.retryHistory/, "Focused empty chart retry must use localized copy");
assert.match(source, /replayBars\.length >= 2\s*\n?\s*\?/, "Focused chart must remain renderable from a local snapshot while background history sync runs");
console.log("MICROSCOPE CHART EMPTY CONTRACT PASS: no-data and insufficient-bar states are explicit.");


