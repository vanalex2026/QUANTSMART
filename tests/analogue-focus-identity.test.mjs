import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const block = source.match(/const analogueOnChart = !!nearestAnalogue[\s\S]*?focusedSnapshotTimestampsEqual\(detectorBars\[historicalChartFocus\]\?\.t, analogueEndpoint\.t\);/);
assert.ok(block, "analogue chart state must remain endpoint/timestamp based");
assert.match(block[0], /analogueFocusTimeRef\.current != null/, "analogue chart state must require an explicit analogue focus identity");
assert.match(block[0], /focusedSnapshotTimestampsEqual\(analogueFocusTimeRef\.current, analogueEndpoint\.t\)/, "analogue chart state must match the explicit focus identity to the selected endpoint");
assert.match(source, /let resolved = byTime >= 0 \? byTime : importedAnalogueIndex != null[\s\S]*if \(importedAnalogueTime != null && byTime < 0\) resolved = -1;/,
  "an expired explicit analogue UTC must not restore a different endpoint by ordinal during immediate import");
assert.match(source, /let resolved = byTime >= 0 \? byTime : pending\.index != null[\s\S]*if \(pending\.time != null && byTime < 0\) resolved = -1;/,
  "an expired explicit analogue UTC must not restore a different endpoint by ordinal during deferred atlas resolution");
console.log("ANALOGUE FOCUS IDENTITY PASS: coincident detector focus cannot masquerade as explicit analogue focus.");
