import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /className=\{focused \? "m5-empty-chart" : "mfe-empty"\} role=\{focused \? "region" : "status"\} tabIndex=\{focused \? 0 : undefined\}/,
  "focused empty chart region must be keyboard reachable while legacy status remains unfocusable");
assert.match(source, /\.m5-empty-chart:focus-visible\{outline:2px solid #f5f5f5;outline-offset:2px\}/,
  "focused empty chart region must expose a visible keyboard focus ring");
assert.match(source, /M5 chart status: \$\{focusedHistoryVerifying/,
  "focused empty chart must retain a concise accessible status label");
assert.match(source, /SHADOW_ONLY \| NO_DECISION/,
  "focused empty chart must retain its read-only authority boundary");

console.log("FOCUSED EMPTY CHART FOCUS PASS: keyboard users can reach the fail-closed chart region with a visible focus indicator.");
