import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");

const bracketStart = source.indexOf('if ((event.key === "[" || event.key === "]") && tool === "cursor")');
assert.ok(bracketStart >= 0, "cursor drawing selection branch must remain present");
const chartHandlerStart = source.indexOf("const onChartKeyDown =");
const chartGuard = source.slice(chartHandlerStart, source.indexOf("const [a, b]", chartHandlerStart));
assert.match(chartGuard, /if \(event\.altKey \|\| \(\(event\.ctrlKey \|\| event\.metaKey\) && !\["z", "y"\]\.includes\(event\.key\.toLowerCase\(\)\)\)\) return;/,
  "modified bracket/deletion shortcuts must leave the chart without mutating drawings");

const deleteStart = source.indexOf('if ((event.key === "Delete" || event.key === "Backspace") && selectedDrawingIndex !== null');
assert.ok(deleteStart >= 0, "saved drawing deletion branch must remain present");
assert.ok(deleteStart > chartHandlerStart, "saved drawing deletion remains inside the guarded chart handler");

const toolbarStart = source.indexOf("const onToolKeyDown =");
const toolbarGuard = source.slice(toolbarStart, source.indexOf("const shortcutIndex", toolbarStart));
assert.match(toolbarGuard, /if \(event\.ctrlKey \|\| event\.metaKey \|\| event\.altKey\) return;/,
  "modified toolbar letter shortcuts must remain browser/OS shortcuts");

// Execute the real handlers with bounded stubs, including selected drawings.
// This checks both the lack of mutation and that native defaults stay intact.
const ast = ts.createSourceFile("MicroChart.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ["onChartKeyDown", "onToolKeyDown"].includes(node.name.getText(ast))) {
    handlers.set(node.name.getText(ast), node.initializer.getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast);
let changes = [];
const env = {
  gRef: { current: { start: 0, end: 99 } }, tool: "cursor", hideDraws: false,
  draws: [{ kind: "trend" }], selectedDrawingIndex: 0, lock: false,
  microChartDrawingSelection: () => 0,
  setSelectedDrawingIndex: value => changes.push(["selection", value]),
  setChartKeyStatus: value => changes.push(["status", value]),
  setDraws: () => changes.push(["drawings"]),
  setUndoStack: () => changes.push(["history"]),
  setRedoStack: () => changes.push(["redo history"]),
  drawingDrag: { current: null }, setDrawingPreview: () => {},
  cancelInteractiveGesture: () => changes.push(["cancel"]),
  microChartToolShortcut: () => null,
  undoDrawing: () => changes.push(["undo"]), redoDrawing: () => changes.push(["redo"]),
  TOOLS: [{ id: "trend", shortcut: "T" }],
  selectTool: () => changes.push(["tool"]),
  toolButtonRefs: { current: [{ focus() {} }] },
};
const compile = name => new Function("env", `with(env){return (${ts.transpileModule(handlers.get(name), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText.replace(/;\s*$/, "")});}`)(env);
const chartKey = compile("onChartKeyDown"), toolbarKey = compile("onToolKeyDown");
const eventFor = (key, modifiers = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...modifiers,
  target: { closest: () => null }, preventDefault() { this.defaultPrevented = true; }, defaultPrevented: false });
for (const modifier of ["ctrlKey", "metaKey", "altKey"]) {
  for (const key of ["[", "]", "Delete", "Backspace", "Escape", "Home", "End", "PageUp", "PageDown", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-", "t"]) {
    changes = [];
    const event = eventFor(key, { [modifier]: true });
    chartKey(event);
    assert.deepEqual(changes, [], `${modifier}+${key} must not mutate chart state`);
    assert.equal(event.defaultPrevented, false, `${modifier}+${key} leaves the native default intact`);
  }
  changes = [];
  const event = eventFor("t", { [modifier]: true });
  toolbarKey(event, 0);
  assert.deepEqual(changes, [], `${modifier}+T must not select a toolbar tool`);
  assert.equal(event.defaultPrevented, false);
}
for (const [key, modifiers, action] of [["z", { ctrlKey: true }, "undo"], ["Z", { metaKey: true, shiftKey: true }, "redo"], ["y", { ctrlKey: true }, "redo"]]) {
  changes = [];
  const event = eventFor(key, modifiers);
  chartKey(event);
  assert.deepEqual(changes, [[action]], "documented history shortcuts remain active");
  assert.equal(event.defaultPrevented, true);
}
changes = [];
const plainBracket = eventFor("]");
chartKey(plainBracket);
assert.equal(changes[0][0], "selection", "plain brackets still select saved drawings");
assert.equal(plainBracket.defaultPrevented, true);
changes = [];
const plainDelete = eventFor("Delete");
chartKey(plainDelete);
assert.ok(changes.some(change => change[0] === "drawings"), "plain Delete still removes a selected drawing");
assert.equal(plainDelete.defaultPrevented, true);

console.log("MICROCHART MODIFIER SHORTCUTS PASS: browser/OS-modified bracket and deletion keys cannot mutate saved chart drawings.");
