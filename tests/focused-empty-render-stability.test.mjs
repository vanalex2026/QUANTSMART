import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("Microscope.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let replayExpression, emptyExpression, effectExpression, dependencies;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.initializer) {
    if (node.name.getText(ast) === "replayBars") replayExpression = node.initializer.getText(ast);
    if (node.name.getText(ast) === "EMPTY_OHLC_BARS") emptyExpression = node.initializer.getText(ast);
  }
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect" && node.arguments[0].getText(ast).includes("setCardZones")) {
    effectExpression = node.arguments[0].getText(ast);
    dependencies = node.arguments[1].getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(replayExpression && emptyExpression && effectExpression && dependencies);
const compile = expression => new Function("env", `with(env) { ${ts.transpileModule(`const value = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return value; }`);

function settle({ legacy = false, focused = true, initialZones = [] } = {}) {
  const empty = compile(emptyExpression)({});
  let zones = initialZones, priorDependencies, updates = 0;
  const replay = legacy ? replayExpression.replace("EMPTY_OHLC_BARS", "[]") : replayExpression;
  const effect = legacy ? effectExpression.replace("setCardZones((prior) => prior.length ? [] : prior)", "setCardZones([])") : effectExpression;
  for (let render = 0; render < 20; render++) {
    let changed = false;
    const env = { focused, activeCard: null, realisticBt: null, bars: null, stageBars: empty, EMPTY_OHLC_BARS: empty, cursor: null,
      setCardZones(value) { const next = typeof value === "function" ? value(zones) : value; if (!Object.is(next, zones)) { zones = next; changed = true; updates++; } },
    };
    env.replayBars = compile(replay)(env);
    const nextDependencies = compile(dependencies)(env);
    if (!priorDependencies || nextDependencies.some((value, i) => !Object.is(value, priorDependencies[i]))) compile(effect)(env)();
    priorDependencies = nextDependencies;
    if (!changed) return { settled: true, renders: render + 1, updates, zones };
  }
  return { settled: false, updates };
}
assert.equal(settle({ legacy: true }).settled, false, "the previous fresh-array effect continually rerenders while bars are null");
assert.deepEqual(settle(), { settled: true, renders: 1, updates: 0, zones: [] }, "focused loading must settle immediately without repeated empty-state writes");
assert.deepEqual(settle({ initialZones: [{ label: "stale legacy zone" }] }), { settled: true, renders: 2, updates: 1, zones: [] }, "switching to focused mode clears stale overlays exactly once");
assert.equal(settle({ focused: false }).settled, true, "a legacy route without a card must also settle on an empty tape");
console.log("FOCUSED EMPTY RENDER STABILITY PASS: actual null-tape/effect expressions reproduce the old loop and now converge with at most one overlay cleanup.");
