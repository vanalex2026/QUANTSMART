import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("MicroChart.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect, reset, resolver, safeTimestamp;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect" && node.arguments[0].getText(ast).includes("appliedFocusRequest.current === request")) effect = node.arguments[0].getText(ast);
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "reset") reset = node.initializer.getText(ast);
  if (ts.isFunctionDeclaration(node) && node.name?.text === "savedViewportIndex") resolver = node.getText(ast);
  if (ts.isFunctionDeclaration(node) && node.name?.text === "isSafeDrawingTimestamp") safeTimestamp = node.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(effect && reset && resolver && safeTimestamp);
const compile = (expression, env) => new Function("env", `with(env){${ts.transpileModule(`const callback = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return callback;}`)(env);
const savedViewportIndex = new Function(`${ts.transpileModule(`${safeTimestamp}\n${resolver}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return savedViewportIndex;`)();
const bars = Array.from({ length: 800 }, (_, i) => ({ t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString() }));
let view, writes = 0, status;
const env = { bars, n: bars.length, focusIndex: 300, focusTime: bars[300].t, focusRequestId: 1, symbol: "XAUUSD", tf: "M5", recentCount: 180, savedViewportIndex, appliedFocusRequest: { current: null }, shortTime: t => t,
  setView(value) { view = value; writes++; }, setChartKeyStatus(value) { status = value; } };
const run = () => compile(effect, env)();
run(); assert.deepEqual(view, [190, 410]);
compile(reset, env)(); assert.deepEqual(view, [620, 799]); assert.equal(status, "Recent bars shown.");
const before = writes;
env.bars = bars.map(row => ({ ...row })); run();
assert.equal(writes, before, "data-array refresh cannot undo Reset");
view = [50, 95]; run(); assert.deepEqual(view, [50, 95], "manual pan/zoom survives the same mounted focus");
env.bars = bars.slice(5); env.n = env.bars.length; run();
assert.equal(writes, before, "retention shift resolves the saved UTC before checking the request; stale numeric index cannot jump");
env.focusIndex = 295; run(); assert.equal(writes, before, "parent ordinal reconciliation cannot issue a second jump");
env.focusRequestId++; run(); assert.deepEqual(view, [185, 405], "explicit repeat Show jumps even to the same UTC candle");
env.focusIndex = null; run(); assert.equal(env.appliedFocusRequest.current, null);
env.focusIndex = 295; run(); assert.equal(writes, before + 2, "clearing and reselecting permits a fresh jump");
env.focusTime = bars[400].t; env.focusIndex = 395; run(); assert.deepEqual(view, [285, 505]);
env.focusTime = bars[0].t; env.focusIndex = 0; env.bars = bars; env.n = bars.length; run(); assert.deepEqual(view, [0, 220], "first retained index remains a valid target");
env.bars = bars.slice(5); env.n = env.bars.length; const missingWrites = writes; run(); assert.equal(writes, missingWrites, "expired UTC cannot fall back to another ordinal");
env.focusTime = bars[500].t; env.focusIndex = 495; env.bars = []; env.n = 0; const loadingWrites = writes; run(); assert.equal(writes, loadingWrites);
env.bars = bars; env.n = bars.length; run(); assert.deepEqual(view, [390, 610], "empty loading state does not consume the focus request");
const safeFocusWrites = writes;
for (const time of ["2026-02-30T00:00:00Z", bars[500].t.slice(0, -1), "", "2099-01-01T00:00:00Z"]) {
  env.focusTime = time; env.focusRequestId++; run();
  assert.equal(writes, safeFocusWrites, `explicit invalid focus timestamp ${JSON.stringify(time)} cannot jump to its stale ordinal`);
}
env.focusTime = "2026-02-30T00:00:00Z";
env.bars = [{ t: "2026-03-02T00:00:00Z" }, { t: "2026-03-02T00:05:00Z" }]; env.n = 2;
run(); assert.equal(writes, safeFocusWrites, "normalized impossible focus date cannot select a real candle");
const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
assert.match(microscope, /focusRequestId=\{chartFocusRequest\}/);
const microchart = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
assert.match(microchart, /cursor != null && cursor >= 1 && !drag\.current && !pinch\.current/,
  "replay cursor updates must not overwrite an active manual pan");
for (const callback of ["selectPriceActionSignal", "selectPreviewOccurrenceIndex", "selectPatternEvidence", "showPatternWindowOnChart", "showAnalogueOnChart", "selectAnaloguePreviewIndex", "applyFocusedSnapshot"]) {
  const start = microscope.indexOf(`const ${callback} =`);
  const end = microscope.indexOf("\n  };", start);
  assert.match(microscope.slice(start, end), /setChartFocusRequest\(value => value \+ 1\)/, `${callback} can explicitly repeat a user jump`);
}
const microscopeAst = ts.createSourceFile("Microscope.tsx", microscope, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let showPatternWindow;
function findShowPatternWindow(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(microscopeAst) === "showPatternWindowOnChart") showPatternWindow = node.initializer.getText(microscopeAst);
  ts.forEachChild(node, findShowPatternWindow);
}
findShowPatternWindow(microscopeAst);
assert.ok(showPatternWindow);
assert.match(microscope, /showPatternWindowOnChart/);
assert.match(microscope, /Show this historical occurrence on the main chart/);
let shownView, shownWrites = 0, namedSelection = "named";
const showEnv = {
  bars, detectorBars: bars, n: bars.length, recentCount: 180, symbol: "XAUUSD", tf: "M5", focusIndex: null, focusTime: null, focusRequestId: 0,
  historicalPreviewMarker: { i: 300, time: bars[300].t }, appliedFocusRequest: { current: null },
  analogueFocusTimeRef: { current: bars[600].t }, previewOccurrenceTimeRef: { current: null },
  focusedSnapshotTimestampsEqual: (a, b) => Date.parse(a) === Date.parse(b), savedViewportIndex, shortTime: t => t,
  setNamedHistoryChartSelection(value) { namedSelection = value; },
  setHistoricalChartFocus(value) { showEnv.focusIndex = value; },
  setChartFocusRequest(update) { showEnv.focusRequestId = update(showEnv.focusRequestId); },
  setView(value) { shownView = value; shownWrites++; }, setChartKeyStatus() {},
};
const show = () => {
  compile(showPatternWindow, showEnv)();
  showEnv.focusTime = showEnv.previewOccurrenceTimeRef.current;
  compile(effect, showEnv)();
};
show(); assert.deepEqual(shownView, [190, 410]);
assert.equal(namedSelection, null); assert.equal(showEnv.analogueFocusTimeRef.current, null);
compile(reset, showEnv)(); assert.deepEqual(shownView, [620, 799]);
show(); assert.deepEqual(shownView, [190, 410], "Show on chart returns to the same selected pattern after Reset");
assert.equal(showEnv.focusRequestId, 2, "every successful Show click creates a new focus request");
showEnv.bars = showEnv.detectorBars = bars.slice(5); showEnv.n = showEnv.bars.length;
show(); assert.equal(showEnv.focusIndex, 295, "Show resolves a stale marker ordinal against its retained UTC candle");
assert.deepEqual(shownView, [185, 405]);
const retainedRequest = showEnv.focusRequestId, retainedWrites = shownWrites;
showEnv.historicalPreviewMarker = { i: 0, time: bars[0].t };
show(); assert.equal(showEnv.focusRequestId, retainedRequest); assert.equal(shownWrites, retainedWrites, "an expired marker cannot focus an unrelated retained ordinal");
showEnv.historicalPreviewMarker = { i: 999, time: bars[5].t };
show(); assert.equal(showEnv.focusIndex, 0, "the first retained UTC candle is a valid explicit Show target");
assert.deepEqual(shownView, [0, 220]);
console.log("MICROCHART FOCUS REFRESH PASS: Reset/pan survive data refresh and retention, while explicit repeat selection and snapshot restore still jump.");
