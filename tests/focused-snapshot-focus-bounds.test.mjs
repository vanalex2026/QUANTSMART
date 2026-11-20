import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const source = fs.readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
assert.match(
  source,
  /const indexFocus = typeof rawFocus === "number" && Number\.isInteger\(rawFocus\) && rawFocus >= 1 && rawFocus < detectorBars\.length \? rawFocus : null;/,
  "snapshot resume must reject a saved chart ordinal that is outside the retained closed-bar tape",
);
assert.match(
  source,
  /const focusIndex = timeFocus >= 1 \? timeFocus : indexFocus;[\s\S]*const resolvedFocusIndex = focusTime != null && timeFocus < 1 \? null : focusIndex;/,
  "an explicit expired chart UTC must not fall back to a different saved ordinal during immediate restore",
);
assert.match(
  source,
  /const targetFocus = timeFocus >= 1 \? timeFocus : indexFocus;[\s\S]*const resolvedTargetFocus = pending\.focusTime != null && timeFocus < 1 \? null : targetFocus;/,
  "an explicit expired chart UTC must not fall back to a different saved ordinal during deferred restore",
);
console.log("FOCUSED SNAPSHOT FOCUS BOUNDS PASS: stale chart ordinals fail closed on resume.");

// Exercise the actual restore effect with a retained tape whose ordinals have
// shifted, rather than duplicating the UTC-selection logic in a test helper.
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");
const ast = ts.createSourceFile("Microscope.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let deferredEffect, immediate;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect" && node.arguments[0].getText(ast).includes("const pending = pendingOccurrenceSelection.current")) deferredEffect = node.arguments[0].getText(ast);
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "applyFocusedSnapshot") immediate = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
const callback = (expression, env) => new Function("env", `with(env){${ts.transpileModule(`const value = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return value;}`)(env);
const bars = Array.from({ length: 6 }, (_, i) => ({ t: new Date(Date.UTC(2026, 10, 17, 0, i * 5)).toISOString() }));
const equal = (a, b) => Date.parse(a) === Date.parse(b);
function deferred(focusTime, loadedBars = bars) {
  const ref = { current: { index: -1, barIndex: null, focusIndex: 3, focusTime } };
  let focused = "unchanged";
  const env = { pendingOccurrenceSelection: ref, detectorBars: loadedBars, selectedPriceActionEvidence: null, focusedSnapshotTimestampsEqual: equal,
    previewOccurrenceTimeRef: { current: null }, setPreviewOccurrenceIndex() {}, setHistoricalChartFocus(value) { focused = value; } };
  const run = () => callback(deferredEffect, env)();
  run();
  return { ref, env, run, get focus() { return focused; } };
}
const expiredTime = "2025-01-01T00:00:00Z";
assert.equal(deferred(expiredTime).focus, null, "deferred explicit expired UTC cannot reuse in-range ordinal 3");
assert.equal(deferred(bars[4].t).focus, 4, "deferred retained UTC overrides stale ordinal");
assert.equal(deferred(null).focus, 3, "deferred legacy ordinal-only restore remains compatible");
const loading = deferred(bars[4].t, []);
assert.ok(loading.ref.current, "deferred explicit UTC stays pending while bars load");
loading.env.detectorBars = bars; loading.run();
assert.equal(loading.focus, 4, "deferred UTC resolves once the tape loads");

function immediateFocus(chart_focus_time) {
  let focused;
  const inspection = { chart_focus_index: 3, chart_focus_time };
  const env = { parseFocusedSnapshot: () => ({ ok: true, snapshot: { symbol: "XAUUSD", timeframe: "M5", inspection } }), requestedSymbol: "XAUUSD", tf: "M5", detectorBars: bars, selectedKnowledgePattern: null, priceAction: null, m5Atlas: null,
    pendingAnalogueMatchRef: { current: null }, pendingOccurrenceSelection: { current: null }, analogueFocusTimeRef: { current: null }, previewOccurrenceTimeRef: { current: null }, NAMED_CANDLE_FAMILIES: [], focusedSnapshotTimestampsEqual: equal };
  for (const setter of ["SnapshotStatus", "NamedHistoryChartSelection", "ChartFocusRequest", "InspectedSignal", "ShowHistoricalTape", "AnalogueFamilyFilter", "AnaloguePatternFilter", "SnapshotViewportRestore", "SnapshotDrawingsRestore", "PreviewOccurrenceIndex"]) env[`set${setter}`] = () => {};
  env.setHistoricalChartFocus = value => { focused = value; };
  callback(immediate, env)("{}");
  return focused;
}
assert.equal(immediateFocus(expiredTime), null, "immediate explicit expired UTC cannot reuse in-range ordinal 3");
assert.equal(immediateFocus(bars[4].t), 4, "immediate retained UTC overrides stale ordinal");
assert.equal(immediateFocus(undefined), 3, "immediate legacy ordinal-only restore remains compatible");
console.log("FOCUSED UTC RESTORE PASS: actual immediate/deferred callbacks preserve UTC identity and loading compatibility.");
