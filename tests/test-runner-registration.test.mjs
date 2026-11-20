import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const runner = readFileSync(new URL("../scripts/test.mjs", import.meta.url), "utf8");

assert.match(
  runner,
  /'workspace-error-boundary'/,
  "the default unit lane must execute the route-aware workspace error boundary regression",
);

assert.match(
  runner,
  /'focused-knowledge-panel-lazy-contract'/,
  "the default unit lane must verify compact source parity and exclude full knowledge data from chart startup",
);

// Session16's focused-surface regressions must stay in the general unit lane;
// this catches a new test being added without wiring it into scripts/test.mjs.
for (const file of [
  "focused-command-palette-guard",
  "focused-m5-surface",
  "microchart-drawing-selection",
  "navigation-compat",
]) {
  assert.match(runner, new RegExp(`['"]${file}['"]`), `${file} must be registered in the default unit lane`);
}

// Read the actual unit-lane lists, so an unrelated mention or a public-only
// registration cannot satisfy a required default-lane regression.
const unitLanes = [...runner.matchAll(/for\s*\(const file of \[([^\]]+)\]\)\s*run\(\['tests\/'\+file\+'\.test\.mjs'\]\)/g)]
  .map(([, entries]) => [...entries.matchAll(/['"]([^'"]+)['"]/g)].map(([, file]) => file));
assert.ok(unitLanes.length > 0, "the deterministic unit-lane lists must be discoverable");
const unitRegistrations = unitLanes.flat();
const pdfRegressionFiles = readdirSync(new URL(".", import.meta.url))
  .filter(file => file.includes("pdf") && file.endsWith(".test.mjs"))
  .map(file => file.slice(0, -9));
for (const file of pdfRegressionFiles) {
  assert.equal(unitRegistrations.filter(registered => registered === file).length, 1,
    `${file} must be registered exactly once in the default unit lane`);
}
for (const file of [
  "legacy-beast-deck-cleanup",
  "microchart-modifier-shortcuts",
  "mt5-auto-attach",
  "session17-retention-identity-audit",
  "connection-status-accessibility",
  "focused-mobile-pattern-stack",
  "focused-m5-refresh-status",
  "microchart-typography",
  "microchart-latest-navigation",
  "pattern-low-volatility-evidence",
  "pattern-low-volatility-inspector",
  "microchart-viewport-performance",
  "session18-source-only-concepts-audit",
  "wave6-obstacle-room-source-audit",
  "session18-statistics-denominator-audit",
  "named-candle-history-worker",
  "focused-snapshot-staleness",
  "session25-independent-source-probe-identity",
  "session25-runtime-browser-evidence-audit",
  "session25-statistics-denominator-audit",
  "legacy-first-run-reachability",
  "session26-source-only-concepts-audit",
  "session27-legacy-release-manifest-audit",
  "session26-browser-runtime-receipt",
  "microchart-page-navigation",
  "session28-statistics-causality-audit",
  "session30-pdf-feature-coverage-audit",
  "pdf-chart-reliability-audit",
  "wave8-retention-snapshot-identity-audit",
  "wave9-knowledge-navigation-source-label-audit",
  "session30-runtime-data-identity-audit",
  "pattern-room-causal-prefix-observability",
  "pattern-failure-selection-context",
  "live-forming-detection",
  "focused-live-tick-chart",
  "session32-browser-realtime-receipt",
  "pattern-low-volatility-causal-prefix-observability",
  "phase3-sizing-cost-assumptions-receipt",
  "pattern-exit-event-identity",
  "wave10-pdf-all-signal-concept-parity",
  "wave10-pdf-all-signal-performance-boundary",
  "wave12-source-note-ui-parity",
  "real-xauusd-pdf-signal-verification",
  "pdf-assumptions-panel",
  "focused-pdf-assumptions-integration",
  "session47-pdf-concept-matrix-reconciliation",
  "wave23-pdf-detector-contract-audit",
]) {
  assert.equal(unitRegistrations.filter(registered => registered === file).length, 1,
    `${file} must be registered exactly once in the default unit lane`);
}

// A test belongs to one deterministic lane only. Check every registration,
// rather than protecting just one worker from accidental duplicate execution.
const duplicateRegistrations = [...new Set(unitRegistrations.filter((file, index) => unitRegistrations.indexOf(file) !== index))];
assert.deepEqual(duplicateRegistrations, [], "unit regressions must not be duplicated across focused/general lanes");

console.log("TEST RUNNER REGISTRATION PASS: focused startup, Session25 regressions, legacy reachability and single-lane ownership are wired into the unit runner.");

