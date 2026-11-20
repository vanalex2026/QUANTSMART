import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)),
  "utf8",
);

assert.match(source, /research geometry · entry \$\{fp\(price\)\} · target/,
  "focused geometry readout must use a readable separator between price landmarks");
assert.match(source, /join\(" · "\)/,
  "focused concept markers must use a readable separator");
assert.match(source, /ABSTAIN · no deterministic concept match/,
  "focused abstention copy must remain explicit and readable");
assert.doesNotMatch(source, /research geometry \? entry|ABSTAIN \? no deterministic concept match|join\(" \? "\)/,
  "focused visible copy must not regress to question-mark separators");
assert.match(source, /"🔴 LIVE · 1M Forward"/,
  "legacy live stage badge must retain a valid red-circle glyph");
assert.match(source, /"📼 REPLAY · Historical"/,
  "legacy replay stage badge must retain a valid tape glyph");

console.log("FOCUSED VISIBLE COPY PASS: chart geometry and source badges retain readable separators and glyphs.");
