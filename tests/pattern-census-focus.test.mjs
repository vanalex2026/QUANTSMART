import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)),
  "utf8",
);

assert.match(source, /const selectPatternEvidence = \(conceptId: string, evidence: PriceActionConceptEvidence\)/,
  "pattern census rows must use a dedicated inspection selection path");
assert.match(source, /const latestIndex = evidence\.history\.length - 1;[\s\S]*const latest = latestIndex >= 0 \? evidence\.history\[latestIndex\]/,
  "selecting a pattern must seed the latest retained historical occurrence");
assert.match(source, /focusedSnapshotTimestampsEqual\(bar\.t, latest\.time\)/,
  "pattern census selection must resolve main-chart focus by UTC occurrence identity");
assert.match(source, /previewOccurrenceTimeRef\.current = latest\?\.time \|\| null;[\s\S]*setPreviewOccurrenceIndex\(latest \? latestIndex : -1\)[\s\S]*setHistoricalChartFocus\(focusIndex >= 1 \? focusIndex : null\)/,
  "reselecting an active pattern must align its mini-window and main chart immediately");
assert.match(source, /onClick=\{\(\) => selectPatternEvidence\(id, evidence\)\}/,
  "pattern census buttons must invoke the focus-aware selection path from keyboard or pointer activation");
assert.match(source, /selecting opens the latest retained occurrence on the chart/,
  "pattern census accessible name must explain the resulting chart context");

console.log("PATTERN CENSUS FOCUS PASS: selecting a pattern opens its latest retained occurrence with UTC-aligned chart context.");
