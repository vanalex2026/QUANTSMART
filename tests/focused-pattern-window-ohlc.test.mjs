import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /data-candle-time=\{b\.t\} data-open=\{b\.o\} data-high=\{b\.h\} data-low=\{b\.l\} data-close=\{b\.c\}/,
  "focused pattern windows must retain the exact closed-bar UTC and OHLC values on each candle");
assert.match(source, /<title>\{`\$\{b\.t\} UTC · O \$\{b\.o\.toFixed\(2\)\} · H \$\{b\.h\.toFixed\(2\)\} · L \$\{b\.l\.toFixed\(2\)\} · C \$\{b\.c\.toFixed\(2\)\}/,
  "focused pattern windows must expose a screen-reader and browser-inspection candle summary");
assert.match(source, /Detailed closed-bar pattern window/,
  "pattern mini-chart must remain explicitly scoped to closed-bar evidence");
assert.match(source, /SHADOW_ONLY · NO_DECISION/,
  "pattern window remains descriptive and read-only");

console.log("FOCUSED PATTERN WINDOW OHLC PASS: historical mini-chart candles expose UTC/OHLC inspection metadata while retaining read-only authority.");
