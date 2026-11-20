import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("mfe_ux_lab/cockpit/src/pages/Microscope.tsx", "utf8");
const snapshotContract = readFileSync("mfe_ux_lab/cockpit/src/lib/focusedSnapshot.ts", "utf8");

assert.match(snapshotContract, /FOCUSED_SNAPSHOT_SCHEMA = "quantsmart\.focused-m5-research-snapshot\/1"/,
  "focused export must declare a stable snapshot schema");
assert.match(source, /FOCUSED_SNAPSHOT_SCHEMA/,
  "focused export must use the shared snapshot schema contract");
assert.match(source, /forecast_freshness: forecastFreshness/,
  "focused snapshots must retain the freshness attestation used by the forecast gate");
for (const field of [
  "exported_at",
  "symbol",
  "timeframe",
  "source",
  "coverage_window",
  "retention",
  "mt5_history_diagnostics",
  "mt5_history_state",
  "mt5_history_reason",
  "latest_closed_bar_time",
  "latest_closed_bar_age_ms",
  "forecast_evidence_limit",
  "forecast_evidence_bars",
  "forecast_retained_bars",
  "forecast_omitted_bars",
  "forecast_evidence_truncated",
  "forecast_evidence_scope",
  "forecast_evidence_window",
  "forecast_evidence_limit",
  "forecast_retained_bars",
  "forecast_omitted_bars",
  "forecast_truncated",
  "forecast_freshness",
  "closed_bars",
  "selected_concept_evidence",
  "selected_concept_knowledge",
  "selected_setup_market_context",
  "inspection",
  "pattern_census",
  "detector_markers",
  "forecast",
  "knowledge_map_provenance",
  "drawings",
]) {
  assert.match(source, new RegExp(`\\b${field}\\s*:`), `snapshot must retain ${field}`);
}
assert.match(source, /FOCUSED_SNAPSHOT_AUTHORITY/,
  "snapshot export must use the shared research-only authority constant");
assert.match(source, /FOCUSED_SNAPSHOT_AUTHORITY/,
  "snapshot must preserve research-only authority");
assert.match(source, /Research snapshot only; no order instruction or execution authority/,
  "snapshot must state its no-order boundary");
for (const field of ["coverage_ratio", "requested_bars", "returned_bars", "cache_scope", "actual_from", "actual_to", "server_timezone", "timestamp_basis", "closed_bar_provenance", "forming_bar_included"]) {
  assert.match(source, new RegExp(`\\b${field}\\s*:`), `snapshot MT5 diagnostics must retain ${field}`);
}
assert.match(source, /anchor\.download\s*=\s*`quantsmart_/,
  "focused export must download a durable JSON artifact");
assert.match(source, /patternEvidenceRows\.map\(\(\{ id, evidence, name \}\) => \(\{/,
  "snapshot must export every measured pattern census row");
for (const field of ["concept_id", "hit_rate", "interval95", "recurrence_rate", "outcomes", "long", "short"]) {
  assert.match(source, new RegExp(`\\b${field}\\s*:`), `pattern census snapshot must retain ${field}`);
}
for (const field of ["historical_tape_enabled", "chart_focus_index", "chart_focus_time", "viewport_start_index", "viewport_end_index", "viewport_start_time", "viewport_end_time", "preview_occurrence_index", "preview_occurrence", "analogue_match_index", "analogue_match_time", "analogue_pattern_filter", "analogue_family_filter"]) {
  assert.match(source, new RegExp(`\\b${field}\\s*:`), `snapshot inspection state must retain ${field}`);
}

assert.match(snapshotContract, /chart_focus_time !== undefined/,
  "snapshot parser must validate chart focus time");
assert.match(snapshotContract, /analogue_match_time !== undefined/,
  "snapshot parser must validate causal analogue endpoint time");
assert.match(snapshotContract, /analogue_pattern_filter !== undefined/,
  "snapshot parser must validate the selected named-pattern filter");
assert.match(snapshotContract, /NAMED_CANDLE_PATTERNS/,
  "snapshot parser must bind named-pattern filters to the Atlas taxonomy");
assert.match(snapshotContract, /viewport_start_time/, "snapshot parser must validate viewport start timestamp");
assert.match(snapshotContract, /viewport_end_time/, "snapshot parser must validate viewport end timestamp");
assert.match(source, /chart_focus_time: historicalChartFocus/,
  "snapshot export must preserve the focus candle timestamp");
assert.match(source, /analogue_match_index: nearestAnalogue \? analogueIndex : null/,
  "snapshot export must preserve the selected causal analogue ordinal");
assert.match(source, /analogue_match_time: nearestAnalogue\?\.time \|\| null/,
  "snapshot export must preserve the selected causal analogue endpoint timestamp");
assert.match(source, /analogueFocusTimeRef\.current = importedAnalogueTime && focusTime[\s\S]*focusedSnapshotTimestampsEqual\(importedAnalogueTime, focusTime\)/,
  "snapshot restore must re-anchor an on-chart analogue by UTC identity only when chart focus matches its endpoint");
assert.match(source, /analogue_pattern_filter: analoguePatternFilter/,
  "snapshot export must preserve the selected named-pattern filter");
assert.match(source, /analogue_family_filter: analogueFamilyFilter/,
  "snapshot export must preserve the selected named-pattern family filter");
assert.match(snapshotContract, /analogue_family_filter !== undefined[\s\S]*NAMED_CANDLE_FAMILIES/,
  "snapshot parser must bind family filters to the named-candle taxonomy");
assert.match(source, /pendingAnalogueMatchRef\.current = importedAnalogueIndex != null \|\| importedAnalogueTime \|\| restoredAnaloguePatternFilter/, 
  "snapshot resume must defer a named-pattern filter even when no endpoint ordinal is saved");
assert.match(source, /if \(pending\.patternFilter\) setAnaloguePatternFilter\(pending\.patternFilter\)/,
  "deferred snapshot resume must restore the named-pattern filter independently of endpoint selection");
assert.match(source, /setAnaloguePreviewIndex\(resolved >= 0 \? resolved : 0\)/,
  "snapshot resume must reset the analogue ordinal when a saved endpoint is unavailable instead of showing stale evidence");
assert.match(source, /if \(!matches\.length\) \{[\s\S]*setAnaloguePreviewIndex\(0\)/,
  "restored named-pattern filters with no current matches must clear stale analogue selection");
assert.match(source, /onViewportChange={onMicroChartViewportChange}/,
  "focused MicroChart must report its mounted viewport for durable export");
assert.match(source, /viewportRestore={focused \? snapshotViewportRestore : null}/,
  "snapshot import must provide a mounted MicroChart restore request");
assert.match(source, /timeFocus = focusTime \? detectorBars\.findIndex/,
  "snapshot resume must prefer timestamp mapping over stale indices");
assert.match(source, /const indexFocus = typeof rawFocus === "number"[\s\S]*const focusIndex = timeFocus >= 1 \? timeFocus : indexFocus[\s\S]*const resolvedFocusIndex = focusTime != null && timeFocus < 1 \? null : focusIndex/,
  "snapshot resume must preserve ordinal compatibility only when no explicit focus timestamp is provided");
assert.match(snapshotContract, /candidate\.schema !== FOCUSED_SNAPSHOT_SCHEMA/,
  "snapshot parser must reject unsupported schemas");
assert.match(snapshotContract, /Snapshot forecast freshness fields are invalid/,
  "snapshot parser must validate forecast freshness metadata");
assert.match(snapshotContract, /FOCUSED_KNOWLEDGE_MAP_SCHEMA/,
  "snapshot parser must bind knowledge-map provenance to the indexed schema");
assert.match(source, /source_sha256:\s*PRICE_ACTION_KNOWLEDGE_PROVENANCE\.sourceSha256/,
  "snapshot export must retain the PDF source hash attestation");
assert.match(source, /selected_concept_knowledge:\s*selectedPriceActionKnowledge/,
  "snapshot export must retain selected concept PDF page anchors");
assert.match(source, /knowledgePattern !== undefined \? knowledgePattern : priceAction\?\.markers\[0\]\?\.conceptId \|\| null/,
  "snapshot restore must preserve an explicit empty concept lens instead of falling back to the first marker");
assert.match(source, /useState<string \| null \| undefined>\(undefined\)/,
  "concept lens selection must distinguish an uninitialized lens from an explicit null selection");
assert.match(snapshotContract, /input\.length > 8 \* 1024 \* 1024/,
  "snapshot parser must enforce the bounded import size");
assert.match(source, /pendingOccurrenceSelection\.current = \{ index: occurrenceIndex, barIndex: null, focusIndex: resolvedFocusIndex[,]/,
  "snapshot resume must preserve a missing historical bar index as null");
assert.match(source, /pending\.focusIndex !== undefined/, "snapshot resume must preserve chart focus independently of occurrence state");
assert.match(source, /Import \/ resume snapshot JSON/,
  "focused surface must expose snapshot resume");
assert.match(source, /chart_focus_index: historicalChartFocus != null && historicalChartFocus >= 1 \? historicalChartFocus : null/,
  "snapshot export must normalize MicroChart-incompatible focus index zero");
assert.match(source, /viewport_start_time: microChartViewport\.current\?\.startTime \|\| savedViewport\?\.startTime \|\| null/, "snapshot export must retain viewport start timestamp");
assert.match(source, /viewport_end_time: microChartViewport\.current\?\.endTime \|\| savedViewport\?\.endTime \|\| null/, "snapshot export must retain viewport end timestamp");
assert.match(source, /viewportRestore=\{focused \? snapshotViewportRestore : null\}/, "snapshot import must pass viewport restore to the focused chart");
assert.match(source, /drawingsRestore=\{focused \? snapshotDrawingsRestore : null\}/, "snapshot import must pass chart drawings to the focused chart");
assert.match(source, /onDrawingsChange=\{onMicroChartDrawingsChange\}/, "focused MicroChart must report drawings for durable export");
assert.match(source, /drawings: microChartDrawings/, "snapshot export must retain interactive chart drawings");
assert.match(source, /if \(Array\.isArray\(imported\.drawings\)\)[\s\S]*setSnapshotDrawingsRestore\(null\)/,
  "snapshot imports without drawings must clear a prior transient drawing restore request");
assert.match(source, /if \(viewportStartTime \|\| viewportEndTime \|\| viewportStartIndex !== undefined \|\| viewportEndIndex !== undefined\)[\s\S]*setSnapshotViewportRestore\(null\)/,
  "snapshot imports without viewport state must clear a prior transient viewport restore request");
assert.match(source, /const buildFocusedSnapshot = \(\) => \{/,
  "focused snapshot creation must be reusable by local research bookmarks");
assert.match(source, /const saveResearchBookmark = \(\) => \{/,
  "focused surface must save a named research bookmark from the same snapshot payload");
assert.match(source, /applyFocusedSnapshot\(JSON\.stringify\(record\.snapshot\)\)/,
  "bookmark restore must reuse the validated focused snapshot import path");

assert.match(source, /if \(\(pending\.index >= 0 \|\| pending\.occurrenceTime\) && !selectedPriceActionEvidence\) return;/,
  "snapshot resume must defer occurrence restoration until evidence is loaded");
assert.match(source, /concept !== selectedKnowledgePattern \|\| \(concept && !evidenceReady\)/,
  "same-concept imports during background scans must also queue UTC occurrence restoration");
assert.match(source, /if \(resolvedTargetFocus != null && detectorBars\.length < 2\) return;/,
  "snapshot resume must defer chart focus until bars are loaded");
assert.match(source, /const indexFocus = pending\.focusIndex !== undefined \? pending\.focusIndex : pending\.barIndex;[\s\S]*const targetFocus = timeFocus >= 1 \? timeFocus : indexFocus[\s\S]*pending\.focusTime != null && timeFocus < 1/,
  "deferred snapshot resume must preserve ordinal compatibility only when no explicit focus timestamp is provided");
assert.match(source, /Math\.max\(1, Math\.min\(detectorBars\.length - 1, resolvedTargetFocus\)\)/,
  "snapshot resume must clamp chart focus to the loaded closed-bar tape");

console.log("FOCUSED M5 SNAPSHOT CONTRACT PASS: schema, provenance, forecast evidence and no-order authority are exported.");
