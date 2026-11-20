import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = fileURLToPath(new URL("../", import.meta.url));
const audit = JSON.parse(readFileSync(root + "artifacts/wave6-real-detector-quality.json", "utf8"));
const receipt = JSON.parse(readFileSync(root + "artifacts/real-xauusd-m5-detector-verification.json", "utf8"));

assert.equal(audit.audit, "wave6-real-detector-quality");
assert.equal(audit.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(audit.receipt_identity.source, "MT5_CLOSED_BARS");
assert.equal(audit.receipt_identity.symbol, "XAUUSD");
assert.equal(audit.receipt_identity.timeframe, "M5");
assert.ok(receipt.bars >= 100);
assert.equal(audit.receipt_identity.valid_closed_utc_grid, true);
assert.equal(audit.receipt_identity.strictly_ordered, true);
assert.equal(audit.receipt_identity.forming_bar_included, false);
assert.equal(audit.receipt_identity.non_contiguous_transitions, 18);

const denominator = audit.denominator_accounting;
assert.equal(denominator.eligible_endpoints, audit.receipt_identity.bars - 9);
assert.equal(denominator.evaluated_endpoints + denominator.skipped_endpoints, denominator.eligible_endpoints);
// The historical quality artifact is retained, while the live receipt may
// advance between refreshes. Validate the current per-concept accounting
// from the receipt instead of pinning an old bar count.
const currentConcepts = Object.values(receipt.detector.concepts);
assert.ok(currentConcepts.length > 0);
const currentEvaluated = currentConcepts[0].evaluated;
const currentSkipped = currentConcepts[0].skipped;
assert.equal(currentEvaluated + currentSkipped, receipt.bars - 9);
assert.ok(currentConcepts.every((evidence) => evidence.evaluated === currentEvaluated && evidence.skipped === currentSkipped));
assert.equal(denominator.reconciles, true);
assert.equal(denominator.per_concept_history_reconciles, true);
assert.equal(denominator.per_concept_outcomes_reconcile_occurrences, true);
assert.equal(denominator.duplicate_or_gap_inflation_observed, false);

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const { build } = require("esbuild");
const bundle = await build({
  stdin: {
    contents: [
      "export * from './src/lib/priceActionDetector.ts';",
      "export * from './src/lib/patternBreak.ts';",
      "export * from './src/lib/patternBreakCombi.ts';",
      "export * from './src/lib/patternBreakPullback.ts';",
      "export * from './src/lib/pullbackReversal.ts';",
    ].join("\n"),
    resolveDir: app,
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const epoch = Date.parse("2026-01-05T00:00:00Z");
const bar = (i, overrides = {}) => ({
  t: new Date(epoch + i * 300_000).toISOString(),
  o: 100,
  h: 101,
  l: 99,
  c: 100.5,
  closed: true,
  ...overrides,
});
const controlledTape = Array.from({ length: 20 }, (_, i) => bar(i));
const duplicate = [...controlledTape.slice(0, 10), controlledTape[9], ...controlledTape.slice(10)];
const recentGap = controlledTape.slice(0, -2).concat(controlledTape.at(-1));
const forming = controlledTape.map((row, i) => i === controlledTape.length - 1 ? { ...row, closed: false } : row);
assert.equal(api.detectM5PriceAction(duplicate, { symbol: "XAUUSD" }).reason, "INVALID_OR_FORMING_BAR_INPUT");
assert.equal(api.detectM5PriceAction(recentGap, { symbol: "XAUUSD" }).reason, "NON_CONTIGUOUS_M5_TAPE");
assert.ok(Object.values(api.measurePriceActionEvidence(recentGap, { symbol: "XAUUSD" })).every(e => e.skipped > 0));
assert.equal(api.detectM5PriceAction(forming, { symbol: "XAUUSD" }).reason, "INVALID_OR_FORMING_BAR_INPUT");
for (const observe of [api.observePatternBreak, api.observePatternBreakCombi, api.observePatternBreakPullback, api.observePullbackReversal]) {
  assert.equal(observe(recentGap).detected, false, "direct observers must abstain on a recent gap");
}
assert.deepEqual(audit.controlled_boundary_checks, {
  public_duplicate_input: "REJECTED_INVALID_OR_FORMING_BAR_INPUT",
  public_recent_gap_input: "REJECTED_NON_CONTIGUOUS_M5_TAPE",
  evidence_gap_windows: "SKIPPED_WITHOUT_OCCURRENCE_OR_H+1_LABEL",
  direct_observers_gap_input: "ABSTAIN",
  forming_bar_input: "REJECTED_INVALID_OR_FORMING_BAR_INPUT",
});

for (const evidence of Object.values(receipt.detector.concepts)) {
  assert.equal(evidence.evaluated + evidence.skipped, receipt.bars - 9);
  assert.equal(evidence.history, evidence.occurrences);
  assert.equal(evidence.outcomes.up + evidence.outcomes.down + evidence.outcomes.flat, evidence.occurrences);
}

assert.equal(audit.marker_geometry.status, "VERIFIED_FROM_PERSISTED_RECEIPT");
assert.ok(audit.marker_geometry.receipt_persists.includes("markers"));
assert.deepEqual(audit.marker_geometry.receipt_omits, []);
for (const marker of receipt.detector.markers) {
  assert.equal(marker.priceWithinBar, true);
  assert.equal(marker.positionConsistent, true);
  assert.ok(marker.bar && marker.bar.t === marker.time);
}
assert.equal(audit.marker_geometry.detector_logic_changed, false);
assert.equal(audit.findings.find(row => row.id === "REAL_RECEIPT_MARKER_GEOMETRY")?.status, "fixed");
const markerProbe = audit.marker_geometry.independent_runtime_probe;
assert.equal(markerProbe.checks.all_time_matches_bar, true);
assert.equal(markerProbe.checks.all_prices_in_bar_range, true);
assert.equal(markerProbe.checks.all_direction_position_pairs_consistent, true);
assert.ok(markerProbe.bars >= 100);
assert.ok(markerProbe.marker_count > 0);
assert.equal(markerProbe.markers.length, markerProbe.marker_count);
for (const marker of markerProbe.markers) {
  assert.equal(marker.time_matches_bar, true);
  assert.equal(marker.in_bar_range, true);
  assert.equal(marker.side_anchor_consistent, true);
  assert.ok(marker.price >= marker.ohlc.l && marker.price <= marker.ohlc.h);
  assert.equal(marker.time, markerProbe.last_bar);
}

const highRecurrence = new Map(audit.recurrence_observations.map(row => [row.concept_id, row]));
for (const conceptId of ["support_resistance", "ceiling_test", "false_break"]) {
  const row = highRecurrence.get(conceptId);
  assert.ok(row, `${conceptId} must be recorded as a recurrence observation`);
  assert.ok(row.occurrences <= row.evaluated);
  assert.equal(Number((row.occurrences / row.evaluated).toFixed(4)), row.recurrence_rate);
  assert.equal(row.classification, "HIGH_RECURRENCE_OBSERVATION");
  assert.ok(row.recurrence_rate >= 0.29);
  assert.match(row.interpretation, /not an accuracy, win-rate, or trading-quality claim/i);
}
assert.equal(audit.findings.find(row => row.id === "HIGH_RECURRENCE_PROXY_LABELS")?.severity, "observation");

console.log("WAVE 6 REAL DETECTOR QUALITY PASS: closed-bar identity, denominators and persisted marker geometry reconcile; recurrence observations stay non-qualifying.");
