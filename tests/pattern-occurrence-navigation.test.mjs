import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const ts = require("typescript");
const bundled = await build({ stdin: { contents: "export * from './src/lib/patternOccurrenceNavigation.ts'; export * from './src/lib/priceActionDetector.ts';", resolveDir: fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url)) }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { patternOccurrenceNavigation: navigate, detectM5PriceAction } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const time = (i) => new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString();
const rows = [1, 3, 5, 7].map((i) => ({ time: time(i) }));
assert.deepEqual(navigate(rows, time(1)), { selected: 0, earlier: -1, later: 1, total: 4 });
assert.deepEqual(navigate(rows, time(5)), { selected: 2, earlier: 1, later: 3, total: 4 });
assert.deepEqual(navigate(rows, time(7)), { selected: 3, earlier: 2, later: -1, total: 4 });
assert.deepEqual(navigate(rows, time(4)), { selected: -1, earlier: 1, later: 2, total: 4 });
assert.deepEqual(navigate(rows, time(9)), { selected: -1, earlier: 3, later: -1, total: 4 });
assert.deepEqual(navigate(rows, time(0)), { selected: -1, earlier: -1, later: 0, total: 4 });
assert.deepEqual(navigate([], time(1)), { selected: -1, earlier: -1, later: -1, total: 0 });
assert.deepEqual(navigate(rows, "invalid"), { selected: -1, earlier: -1, later: -1, total: 4 });
assert.equal(navigate(rows.slice(1), time(5)).selected, 1, "a retention shift re-resolves UTC identity, never reuses the old ordinal");
let reads = 0;
const largeIndex = new Proxy({ length: 500_000 }, { get(target, key) { if (key === "length") return target.length; reads++; return { time: time(Number(key)) }; } });
assert.equal(navigate(largeIndex, time(240_001)).selected, 240_001);
assert.ok(reads < 25, "navigation must not scan, copy or reverse the full occurrence index");

const bars = Array.from({ length: 1800 }, (_, i) => {
  const base = 100 + Math.floor(i / 9) * 0.02;
  const close = base + [0.5, 0.2, 0.9, 0.1, 1.1, 0.6, 1.3, 1.0, 1.6][i % 9];
  return { i, t: time(i), o: i % 9 === 0 ? base : close - 0.2, h: close + 0.2, l: Math.min(base - 0.1, close - 0.2), c: close, closed: true };
});
const result = detectM5PriceAction(bars, { symbol: "XAUUSD" });
const evidence = Object.values(result.evidence).find((e) => e.occurrences > 800);
assert.ok(evidence, "fixture must have enough occurrences to expose the old 80-window cap");
assert.equal(evidence.history.length, evidence.occurrences);
assert.ok(Date.parse(evidence.history[0].time) < Date.parse(evidence.history.at(-80).time));
for (const e of Object.values(result.evidence)) {
  assert.equal(e.history.length, e.occurrences);
  assert.ok(e.history.every((row, i) => i === 0 || row.i > e.history[i - 1].i));
  for (const ordinal of [0, Math.floor(e.history.length / 2), e.history.length - 1]) {
    const row = e.history[ordinal];
    if (!row) continue;
    const prefix = detectM5PriceAction(bars.slice(0, row.i + 1), { symbol: "XAUUSD" });
    const marker = prefix.markers.find((m) => m.conceptId === e.conceptId);
    assert.ok(marker, "even the oldest inspected occurrence agrees with its causal prefix");
    assert.equal(marker.time, row.time);
    assert.equal(marker.direction, row.direction);
    assert.equal(marker.score, row.score);
  }
}

// Exercise the actual UI adapters: full index identity is retained, but SVG
// signals are created only for the selected occurrence or bounded overlay.
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("Microscope.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbacks = new Map();
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name) callbacks.set(node.name.getText(ast), node.getText(ast));
  if (ts.isVariableDeclaration(node) && node.initializer) {
    if (ts.isArrowFunction(node.initializer)) callbacks.set(node.name.getText(ast), node.initializer.getText(ast));
    else if (ts.isCallExpression(node.initializer) && node.initializer.expression.getText(ast) === "useMemo") callbacks.set(node.name.getText(ast), node.initializer.arguments[0].getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const compile = (name, env) => new Function("env", `with (env) { ${ts.transpileModule(`const callback = ${callbacks.get(name)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return callback; }`)(env);
const convertSignal = compile("priceActionOccurrenceToSignal", {
  focusedSnapshotTimestampsEqual: (a, b) => Date.parse(a) === Date.parse(b),
  PRICE_ACTION_SOURCE: { [evidence.conceptId]: { pageAnchors: [] } },
  formatPriceActionSourcePages: () => "",
});
const shiftedBars = bars.slice(3);
const shiftedSignal = convertSignal({ ...evidence.history[5], i: 5, time: bars[5].t }, evidence.conceptId, shiftedBars);
assert.equal(shiftedSignal.i, 2, "historical PDF markers resolve their retained chart index by UTC timestamp");
assert.equal(shiftedSignal.price, shiftedBars[2].c, "historical PDF marker price comes from the UTC-matched retained candle");
assert.equal(convertSignal({ ...evidence.history[5], i: 5, time: bars[0].t }, evidence.conceptId, shiftedBars), null, "missing UTC identity fails closed instead of selecting a stale ordinal");
const selectionState = {};
const selectionEnv = {
  focused: true, selectedKnowledgePattern: evidence.conceptId,
  priceAction: { evidence: { [evidence.conceptId]: { history: [{ i: 5, time: bars[5].t }] } } },
  detectorBars: shiftedBars,
  focusedSnapshotTimestampsEqual: (a, b) => Date.parse(a) === Date.parse(b),
  analogueFocusTimeRef: { current: null }, previewOccurrenceTimeRef: { current: null }, pendingOccurrenceSelection: { current: null },
  setChartFocusRequest() {}, setInspectedSignal() {}, setNamedHistoryChartSelection() {}, setKnowledgePattern() {},
  setPreviewOccurrenceIndex(value) { selectionState.ordinal = value; },
  setHistoricalChartFocus(value) { selectionState.focus = value; },
};
const selectRetained = compile("selectPriceActionSignal", selectionEnv);
selectRetained({ conceptId: evidence.conceptId, label: "HIST", i: 99, time: bars[5].t });
assert.equal(selectionState.ordinal, 0, "Show on chart locates the measured occurrence by UTC rather than the signal's stale ordinal");
assert.equal(selectionState.focus, 2, "Show on chart and the inspector select the same retained UTC candle");
selectionEnv.selectedKnowledgePattern = "another concept";
selectRetained({ conceptId: evidence.conceptId, label: "HIST", i: 99, time: bars[5].t });
assert.equal(selectionEnv.pendingOccurrenceSelection.current.focusIndex, 2, "changing concepts preserves the resolved chart ordinal in the pending selection");
assert.equal(selectionEnv.pendingOccurrenceSelection.current.occurrenceTime, bars[5].t);
let conversions = 0, selected;
const env = { focused: true, showHistoricalTape: true, selectedKnowledgePattern: evidence.conceptId, selectedPriceActionEvidence: evidence, inspectedEvidence: evidence, inspectedSignal: { conceptId: evidence.conceptId }, inspectorOccurrences: evidence.history, detectorBars: bars, priceAction: { markers: [] }, priceActionOccurrenceToSignal(row) { conversions++; return { ...row, conceptId: evidence.conceptId }; }, setInspectedSignal(signal) { selected = signal; } };
assert.equal(compile("inspectorOccurrences", env)(), evidence.history, "opening an inspector must reuse the full measured index without converting every row into a signal");
const select = compile("navigateInspectorOccurrence", env);
for (const ordinal of [0, 400, evidence.history.length - 1]) {
  const before = conversions;
  select(ordinal);
  assert.equal(conversions, before + 1);
  assert.equal(selected.time, evidence.history[ordinal].time);
}
const before = conversions;
for (const invalid of [-1, 1.5, NaN, evidence.history.length]) select(invalid);
assert.equal(conversions, before, "invalid ordinals cannot select a different candle");
const overlay = compile("historicalPriceActionSignals", env)();
assert.equal(overlay.length, 80);
assert.equal(overlay[0].time, evidence.history.at(-80).time);
assert.equal(overlay.at(-1).time, evidence.history.at(-1).time);
const oldSignal = { ...evidence.history[0], conceptId: evidence.conceptId };
const combineEnv = { focusedNamedHistorySignal: null, currentPriceActionSignals: [], currentNamedCandleSignals: [], historicalNamedCandleSignals: [], historicalPriceActionSignals: [], focusedHistoricalSignal: oldSignal };
assert.deepEqual(compile("priceActionSignals", combineEnv)(), [oldSignal], "Show-on-chart keeps the selected old occurrence visible even with the historical tape disabled");
assert.equal(compile("priceActionSignals", { ...combineEnv, historicalPriceActionSignals: [oldSignal] })().length, 1, "an already visible selected marker must not be duplicated");
const inspector = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/ChartPatternInspector.tsx", import.meta.url), "utf8");
const inspectorAst = ts.createSourceFile("ChartPatternInspector.tsx", inspector, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let escapeEffect;
function inspect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(inspectorAst) === "useEffect" && node.arguments[0].getText(inspectorAst).includes('document.addEventListener("keydown"')) escapeEffect = node.arguments[0].getText(inspectorAst);
  ts.forEachChild(node, inspect);
}
inspect(inspectorAst);
assert.ok(escapeEffect);
const listeners = new Map();
let closed = 0;
const cleanup = new Function("document", "closeInspection", `${ts.transpileModule(`const effect = ${escapeEffect};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return effect();`)({ addEventListener: (key, callback) => listeners.set(key, callback), removeEventListener: (key, callback) => { if (listeners.get(key) === callback) listeners.delete(key); } }, { current: () => { closed++; } });
const event = (key, defaultPrevented = false) => ({ key, defaultPrevented, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} });
listeners.get("keydown")(event("Enter"));
listeners.get("keydown")(event("Escape", true));
assert.equal(closed, 0);
listeners.get("keydown")(event("Escape"));
assert.equal(closed, 1, "Escape still closes the inspector when First/Latest disabled the focused button and the event targets the document");
cleanup();
assert.equal(listeners.size, 0, "closing the inspector removes its global keyboard listener");
console.log("PATTERN OCCURRENCE NAVIGATION PASS: full measured history, causal oldest/middle/latest records, logarithmic UTC search, single-record signal conversion and bounded SVG overlay.");
