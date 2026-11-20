import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /const patternWindowInspection = patternWindowBar[\s\S]*Anchor candle/,
  "focused pattern windows must expose a plain-text anchor candle inspection summary");
assert.match(source, /m5-pattern-window-inspection/,
  "focused pattern windows must render the inspection summary in the readout");
assert.match(source, /data-candle-time=\{b\.t\} data-open=\{b\.o\} data-high=\{b\.h\} data-low=\{b\.l\} data-close=\{b\.c\}/,
  "inspection summary must remain backed by the exact closed-bar OHLC candle metadata");
assert.match(source, /Research evidence only[\s\S]*SHADOW_ONLY[\s\S]*NO_DECISION[\s\S]*no order authority\./,
  "pattern inspection must retain the read-only authority boundary");

console.log("FOCUSED PATTERN WINDOW INSPECTION PASS: selected windows expose anchor OHLC and UTC bounds without granting authority.");
