import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const block = source.match(/const priorTime = previewOccurrenceTimeRef\.current;[\s\S]*?\n  \}, \[selectedKnowledgePattern, selectedPriceActionEvidence\?\.history, detectorBars, previewOccurrenceIndex, previewOccurrence\?\.time, historicalChartFocus\]\);/);
assert.ok(block, "historical occurrence alignment effect must remain present");
assert.match(block[0], /previewOccurrenceTimeRef\.current = history\[nextIndex\]\.time/, "retention re-alignment must preserve the matched UTC identity");
assert.doesNotMatch(block[0], /previewOccurrenceTimeRef\.current = previewOccurrence\?\.time \|\| null/, "transient ordinal must not overwrite the retained occurrence identity");
assert.match(block[0], /previewOccurrenceTimeRef\.current = null/, "expired historical occurrences must clear their identity");
assert.match(source, /const historicalPreviewBarIndex = previewOccurrence[\s\S]*findIndex\(\(bar\) => focusedSnapshotTimestampsEqual\(bar\.t, previewOccurrence\.time\)\)/, "historical pattern marker must resolve its retained bar by UTC identity");
assert.match(source, /i: historicalPreviewBarIndex, time: historicalPreviewBar\.t, price: historicalPreviewBar\.c/, "historical pattern marker must use the UTC-resolved bar index and OHLC");
assert.doesNotMatch(source, /historicalPreviewMarker[\s\S]*detectorBars\[previewOccurrence\.i\]/, "historical pattern marker must not read a stale ordinal after retention shifts");
console.log("HISTORICAL MINI-CHART ALIGNMENT PASS: retention shifts preserve UTC occurrence identity.");
