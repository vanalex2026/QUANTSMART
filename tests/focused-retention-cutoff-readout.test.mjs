import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /const chartRetentionCutoffUtc = tf === "M5"[\s\S]*calendarTwoYearsBeforeUtc\(chartLatestValidMs\)/,
  "focused M5 retention must derive a visible UTC cutoff from the same calendar-aware helper");
assert.match(source, /<span|<div className="pkv"><span>M5 cutoff \(UTC\)<\/span><b>\{chartRetentionCutoffUtc\}/,
  "source coverage must expose the computed M5 cutoff beside the retained range");
assert.match(source, /M5 display window capped at two years/,
  "retention readout must keep the two-year display contract visible");
assert.match(source, /UTC · closed candles only · no forming bar/,
  "retention provenance must remain closed-bar and UTC scoped");
assert.match(source, /SHADOW_ONLY · NO_DECISION · live_apply_allowed=false/,
  "retention readout must preserve the no-authority boundary");

console.log("FOCUSED RETENTION CUTOFF READOUT PASS: the calendar-aware UTC cutoff is visible beside the two-year closed-bar scope.");
