import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("Microscope.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const effects = [], functions = new Map();
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect") effects.push(node.arguments[0].getText(ast));
  if (ts.isVariableDeclaration(node) && node.initializer && ts.isArrowFunction(node.initializer)) functions.set(node.name.getText(ast), node.initializer.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const analogueEffect = effects.find(effect => effect.includes("const focusedTime = analogueFocusTimeRef.current"));
const conceptEffect = effects.find(effect => effect.includes("previewOccurrenceConceptRef.current = selectedKnowledgePattern"));
const pdfEffect = effects.find(effect => effect.includes("const priorTime = previewOccurrenceTimeRef.current"));
assert.ok(analogueEffect && pdfEffect, "exercise both actual UTC focus reconciliation effects");
const guard = /if\s*\(analogueFocusTimeRef\.current\)\s*return\s*;/;
assert.match(pdfEffect, guard, "PDF reconciliation must defer while an explicit analogue owns chart focus");
const compile = expression => new Function("env", `with (env) { ${ts.transpileModule(`const callback = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return callback; }`);
const bars = Array.from({ length: 7 }, (_, i) => ({ i, t: new Date(Date.UTC(2026, 10, 4, 0, i * 5)).toISOString() }));
function host(mixed = true) {
  const state = { historicalChartFocus: 4, previewOccurrenceIndex: 0, analoguePreviewIndex: 0, analoguePatternFilter: null, analogueFamilyFilter: null, candleAtlasStatus: "ready" };
  const refs = { analogueFocusTimeRef: { current: bars[4].t }, previewOccurrenceTimeRef: { current: mixed ? bars[1].t : null }, previewOccurrenceConceptRef: { current: "test_concept" }, pendingOccurrenceSelection: { current: null } };
  const history = [{ i: 1, time: bars[1].t }];
  let changed = false;
  const setters = Object.fromEntries(Object.keys(state).map(key => [`set${key[0].toUpperCase()}${key.slice(1)}`, value => { if (!Object.is(state[key], value)) changed = true; state[key] = value; }]));
  const environment = () => ({ ...state, ...refs, ...setters, setNamedHistoryChartSelection() {}, setChartFocusRequest() {}, detectorBars: bars, m5AtlasBars: bars, selectedKnowledgePattern: "test_concept", selectedPriceActionEvidence: { history }, previewHistory: history, previewOccurrence: state.previewOccurrenceIndex >= 0 ? history[state.previewOccurrenceIndex] : undefined, knowledgePattern: undefined, m5Atlas: state.candleAtlasStatus === "ready" ? { matches: [{ time: bars[4].t, patterns: ["HAMMER"] }] } : null, nearestAnalogue: { endIndex: 4 }, focusedSnapshotTimestampsEqual: (a, b) => Date.parse(a) === Date.parse(b), getNamedCandleKnowledge: () => ({ family: "SINGLE_CANDLE" }) });
  return {
    state, refs,
    reconcileDefaultConcept(overrides = {}) { compile(conceptEffect)({ ...environment(), ...overrides })(); },
    action(name, ...args) { return compile(functions.get(name))(environment())(...args); },
    settle(pdf = pdfEffect, limit = 12) {
      const trace = [];
      for (let render = 0; render < limit; render++) {
        changed = false;
        // Both effects observe the same render snapshot, like React passive
        // effects; setters commit only to the following render's snapshot.
        const env = environment();
        compile(analogueEffect)(env)(); compile(pdf)(env)();
        trace.push(state.historicalChartFocus);
        if (!changed) return { settled: true, trace };
      }
      return { settled: false, trace };
    },
  };
}

const old = host().settle(pdfEffect.replace(guard, ""));
assert.equal(old.settled, false, "without ownership arbitration the original effects oscillate indefinitely");
assert.deepEqual(old.trace.slice(0, 6), [1, 4, 1, 4, 1, 4], "reproduce the exact competing-ref focus alternation behind maximum-update-depth warnings");
const fixed = host();
assert.equal(fixed.settle().settled, true, "mixed restored identities must converge under the current source effects");
assert.equal(fixed.state.historicalChartFocus, 4);
for (const status of ["idle", "loading", "error"]) {
  const pending = host(false);
  pending.state.candleAtlasStatus = status;
  pending.reconcileDefaultConcept();
  assert.equal(pending.settle().settled, true);
  assert.equal(pending.refs.analogueFocusTimeRef.current, bars[4].t,
    "an unfinished/failed background job cannot erase the selected analogue UTC identity");
  assert.equal(pending.state.historicalChartFocus, 4);
}

const importing = host(false);
importing.refs.pendingOccurrenceSelection.current = { index: -1, focusIndex: 4 };
importing.reconcileDefaultConcept({ knowledgePattern: null });
assert.equal(importing.refs.analogueFocusTimeRef.current, bars[4].t,
  "a source-lens change during snapshot import must preserve its explicitly restored analogue focus");
const switching = host();
switching.action("resetAnalogueSelection", null, null);
assert.equal(switching.refs.previewOccurrenceTimeRef.current, null, "switching to analogue context clears PDF identity");
switching.action("showAnalogueOnChart");
assert.equal(switching.settle().settled, true);
assert.equal(switching.state.historicalChartFocus, 4);
switching.action("selectPreviewOccurrenceIndex", 0);
assert.equal(switching.refs.analogueFocusTimeRef.current, null, "selecting a PDF occurrence clears analogue identity");
assert.equal(switching.settle().settled, true);
assert.equal(switching.state.historicalChartFocus, 1);
console.log("FOCUSED HISTORY FOCUS OWNERSHIP PASS: extracted source effects reproduce old focus oscillation, while current arbitration and context switches converge.");
