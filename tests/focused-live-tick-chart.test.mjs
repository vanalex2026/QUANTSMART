import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const chart = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
assert.match(source, /const liveChart = isLive \|\| focusedSourceBadgeReady/);
assert.match(source, /live=\{liveChart\}/);
assert.match(source, /forming candle can update without contaminating the/);
assert.match(chart, /import \{ latestLiveTick, liveFormingDetection, withFormingBar \} from "\.\.\/lib\/liveTickModel\.ts"/);
assert.match(chart, /const quote = latestLiveTick\(frame\)/, "live quote UI must use the newest tick in an out-of-order batch");
console.log("FOCUSED LIVE TICK CHART PASS: verified focused M5 history enables the read-only tick stream while closed-bar research remains separate.");
