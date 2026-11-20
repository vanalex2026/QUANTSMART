import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("MicroChart.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const definitions = new Map();
const wanted = ["drawingHit", "editDrawing", "onDown", "onMove", "onUp", "onPointerCancel", "onChartKeyDown", "onToolKeyDown", "undoDrawing", "redoDrawing", "cancelInteractiveGesture", "selectTool"];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && wanted.includes(node.name?.text)) definitions.set(node.name.text, node.getText(ast));
  if (ts.isVariableDeclaration(node) && wanted.includes(node.name.getText(ast))) {
    let init = node.initializer;
    if (ts.isCallExpression(init) && init.expression.getText(ast) === "useCallback") init = init.arguments[0];
    definitions.set(node.name.getText(ast), `const ${node.name.getText(ast)} = ${init.getText(ast)};`);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const compile = (name, env) => new Function("env", `with(env){${ts.transpileModule(definitions.get(name), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText};return ${name};}`)(env);
const bars = Array.from({ length: 100 }, (_, i) => ({ t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString() }));
const point = (i, p) => ({ i, p, t: bars[i].t });
const trend = { kind: "trend", a: point(20, 80), b: point(40, 60), color: "white" };
const env = {
  n: 100, bars, slot: 10, PX0: 0, PX1: 1000, PY0: 0, PY1: 200,
  start: 0, end: 99, lo: 0, hi: 200, panOffset: 0,
  xFor: i => i * 10, yFor: p => 200 - p,
  barAt: x => Math.max(0, Math.min(99, Math.round(x / 10))), priceAt: y => 200 - y, snap: (_, p) => p,
  xy: e => ({ x: e.clientX, y: e.clientY }), draws: [trend], lock: false, hideDraws: false, tool: "cursor",
  selectedDrawingIndex: null, drawingPreview: null, undoStack: [], redoStack: [], DRAWING_HISTORY_LIMIT: 100,
  drawingDrag: { current: null }, drag: { current: null }, pinch: { current: null },
  touchPointers: { current: new Map() }, pointerRect: { current: null },
  wrapRef: { current: { getBoundingClientRect: () => ({ left: 0, top: 0 }) } },
  temp: null, setHover() {}, setPanActive() {}, setChartKeyStatus() {}, cancelPan() {}, flushPan() {},
  gRef: { current: { start: 0, end: 99 } }, microChartToolShortcut: () => null,
  MICROCHART_TOOL_SHORTCUTS: [
    { id: "cursor", t: "Cursor / drag-pan", shortcut: "C" },
    { id: "trend", t: "Trend line", shortcut: "T" },
    { id: "hline", t: "Horizontal line", shortcut: "H" },
    { id: "fib", t: "Fib retracement", shortcut: "F" },
    { id: "rect", t: "Rectangle box", shortcut: "R" },
    { id: "brush", t: "Brush (freehand)", shortcut: "B" },
    { id: "text", t: "Text label", shortcut: "X" },
    { id: "measure", t: "Measure", shortcut: "M" },
  ],
};
env.appended = [];
env.appendDrawing = draw => { env.undoStack.push(env.draws); env.appended.push(draw); };
env.BRUSH_POINT_LIMIT = 10_000;
env.measureExpiry = { current: null };
const timers = new Map();
let timerId = 0;
env.setTimeout = callback => { timers.set(++timerId, callback); return timerId; };
env.clearTimeout = id => timers.delete(id);
env.setTool = value => { env.tool = value; };
env.setToolFocusIndex = value => { env.toolFocusIndex = value; };
env.toolFocusIndex = 0;
env.TOOLS = env.MICROCHART_TOOL_SHORTCUTS;
env.microChartToolShortcut = key => env.TOOLS.find(candidate => candidate.shortcut.toLowerCase() === key.toLowerCase())?.id || null;
env.toolButtonRefs = { current: env.TOOLS.map(() => ({ focus() {} })) };
env.toolbarHorizontal = false;
let status = "", cancellations = 0;
env.setChartKeyStatus = value => { status = value; };
env.cancelPan = () => { cancellations += 1; };
for (const [setter, key] of [["setDraws", "draws"], ["setDrawingPreview", "drawingPreview"], ["setSelectedDrawingIndex", "selectedDrawingIndex"], ["setUndoStack", "undoStack"], ["setRedoStack", "redoStack"], ["setTemp", "temp"]]) env[setter] = update => { env[key] = typeof update === "function" ? update(env[key]) : update; };
for (const name of wanted) env[name] = compile(name, env);
const event = (x, y, pointerType = "mouse") => ({ clientX: x, clientY: y, pointerType, pointerId: 1, target: { closest: () => null }, currentTarget: { setPointerCapture() {}, hasPointerCapture: () => false, focus() {} }, preventDefault() {} });
assert.deepEqual(env.drawingHit(200, 120), { index: 0, mode: "endpoint-a" });
assert.deepEqual(env.drawingHit(300, 130), { index: 0, mode: "move" });
assert.equal(env.drawingHit(750, 50), null, "empty chart remains available to pan");
env.onDown(event(300, 130));
assert.equal(env.selectedDrawingIndex, 0);
assert.equal(env.drag.current, null, "selecting an existing shape does not start a chart pan");
for (let x = 301; x <= 330; x++) env.onMove(event(x, 120));
assert.equal(env.undoStack.length, 0, "pointer moves never add undo entries");
assert.deepEqual(env.draws, [trend], "pointer previews never persist a partial edit");
env.onUp(event(340, 120));
assert.equal(env.undoStack.length, 1, "completed drag adds exactly one undo entry");
assert.deepEqual(env.draws[0].a, point(24, 90));
assert.deepEqual(env.draws[0].b, point(44, 70));
const moved = env.draws[0];
env.undoDrawing();
assert.deepEqual(env.draws[0], trend);
env.redoDrawing();
assert.deepEqual(env.draws[0], moved);
env.onDown(event(240, 110));
env.onMove(event(280, 100));
env.onUp(event(280, 100));
assert.deepEqual(env.draws[0].a, point(28, 100), "endpoint handles edit a timestamped integer anchor");
assert.deepEqual(env.draws[0].b, moved.b, "editing one endpoint preserves the other");
const committed = env.draws[0], historyLength = env.undoStack.length;
env.onDown(event(280, 100));
env.onMove(event(350, 80));
env.onPointerCancel();
assert.deepEqual(env.draws[0], committed, "pointer cancellation discards the preview");
assert.equal(env.undoStack.length, historyLength);
env.onDown(event(280, 100));
env.onUp(event(280, 100));
assert.equal(env.undoStack.length, historyLength, "selection without movement creates no history entry");
env.selectedDrawingIndex = 0;
env.onChartKeyDown({ key: "Delete", target: { closest: () => null }, preventDefault() {} });
assert.equal(env.draws.length, 0);
env.undoDrawing();
assert.deepEqual(env.draws[0], committed, "deletion is undoable");
env.selectedDrawingIndex = 0;
env.lock = true;
env.onChartKeyDown({ key: "Backspace", target: { closest: () => null }, preventDefault() {} });
assert.equal(env.draws.length, 1, "locked selections cannot be deleted");
env.lock = false; env.hideDraws = true;
assert.equal(env.drawingHit(280, 100), null, "hidden shapes do not intercept pan gestures");
env.hideDraws = false;
env.onDown(event(280, 100));
env.onChartKeyDown({ key: "Escape", preventDefault() {} });
assert.equal(env.selectedDrawingIndex, null);
assert.equal(env.drawingDrag.current, null);
assert.equal(env.drawingPreview, null);

// Escape must cancel the complete gesture, including multi-touch ownership.
// Before this regression a trailing touch move could zoom again immediately
// after the chart had announced that the active gesture was cancelled.
env.pinch.current = { startDistance: 100, startMidpointIndex: 20, view0: [0, 99] };
env.touchPointers.current.set(1, { x: 100, y: 100 });
env.touchPointers.current.set(2, { x: 200, y: 100 });
env.measureExpiry.current = env.setTimeout(() => {}, 2500);
const escapedTimer = env.measureExpiry.current;
const escapedSaved = JSON.stringify(env.draws), escapedHistory = env.undoStack.length;
let resumedZooms = 0;
env.setView = () => { resumedZooms += 1; };
env.microChartPinchViewport = () => [0, 49];
env.onChartKeyDown({ key: "Escape", preventDefault() {} });
assert.equal(env.pinch.current, null, "Escape releases active pinch ownership");
assert.equal(env.touchPointers.current.size, 0, "Escape clears held touch identities");
assert.equal(env.measureExpiry.current, null, "Escape clears pending measurement expiry");
assert.equal(timers.has(escapedTimer), false);
env.onMove(event(250, 100, "touch"));
env.onUp(event(260, 100, "touch"));
assert.equal(resumedZooms, 0, "trailing touch events cannot resume a cancelled pinch");
assert.equal(JSON.stringify(env.draws), escapedSaved, "Escape preserves saved drawings");
assert.equal(env.undoStack.length, escapedHistory, "Escape does not add undo history");

// A drawing can receive pointer-up before the final pointermove when the
// browser coalesces events. Finalization must use the release coordinate so
// the persisted endpoint lands under the pointer, rather than the last move.
for (const kind of ["trend", "rect", "fib"]) {
  env.tool = kind;
  env.temp = null;
  const priorAppends = env.appended.length, priorHistory = env.undoStack.length;
  env.onDown(event(100, 100));
  env.onMove(event(200, 120));
  env.onUp(event(250, 140));
  assert.equal(env.appended.length, priorAppends + 1, `${kind} is appended once`);
  assert.equal(env.undoStack.length, priorHistory + 1, `${kind} creates one undo snapshot`);
  assert.deepEqual(env.appended.at(-1).a, point(10, 100));
  assert.deepEqual(env.appended.at(-1).b, point(25, 60), `${kind} ends at pointer-up even without a final move`);
}
env.snap = (_, p) => Math.round(p / 10) * 10;
env.tool = "trend";
env.onDown(event(100, 100));
env.onMove(event(200, 120));
env.onUp(event(250, 143));
assert.deepEqual(env.appended.at(-1).b, point(25, 60), "release endpoint still uses magnet snapping");
env.tool = "brush";
env.onDown(event(100, 101));
env.onMove(event(200, 122));
env.onUp(event(250, 143));
assert.deepEqual(env.appended.at(-1).pts, [point(10, 99), point(20, 78), point(25, 57)], "brush retains its unsnapped path and includes the exact release");
assert.deepEqual(env.appended.at(-1).b, point(25, 57));
env.onDown(event(100, 101));
env.onMove(event(200, 122));
env.onUp(event(200, 122));
assert.equal(env.appended.at(-1).pts.length, 2, "a delivered final brush move is not duplicated on release");
env.tool = "measure";
const beforeMeasure = env.appended.length;
env.onDown(event(100, 100));
env.onMove(event(200, 80));
env.onUp(event(250, 143));
assert.deepEqual(env.temp.b, point(25, 60), "transient measurement ends at the snapped release point");
assert.equal(env.temp.color, "var(--bear-red)", "measurement direction follows release rather than the older preview");
assert.equal(env.appended.length, beforeMeasure, "measurement remains transient");
timers.get(env.measureExpiry.current)();
assert.equal(env.temp, null, "finalized measurement still expires");
env.snap = (_, p) => p;
// Switching tools during a held-pointer gesture cancels it immediately. The
// trailing move/up must never commit the old draft with the new tool selected.
const savedBeforeSwitch = JSON.stringify(env.draws), historyBeforeSwitch = env.undoStack.length, appendsBeforeSwitch = env.appended.length;
env.tool = "trend";
env.onDown(event(100, 100));
env.onMove(event(200, 120));
assert.ok(env.temp && env.drag.current);
env.onChartKeyDown({ key: "r", preventDefault() {} });
assert.equal(env.tool, "rect", "tool selection changes to the requested drawing tool");
assert.equal(env.toolFocusIndex, 4, "keyboard tool selection keeps the toolbar focus index synchronized");
assert.equal(env.drag.current, null, "switching tools cancels an active pan/drawing drag");
assert.equal(env.temp, null, "switching tools discards the in-flight draft");
env.onMove(event(300, 140));
env.onUp(event(320, 145));
assert.equal(env.appended.length, appendsBeforeSwitch, "old pointer-up cannot save the cancelled draft");
assert.equal(env.undoStack.length, historyBeforeSwitch, "cancelling a draft does not create history");
assert.match(status, /Rectangle box selected; SHADOW_ONLY; NO_DECISION/);
env.selectTool("cursor", 0);
env.onDown(event(280, 100));
env.onMove(event(300, 90));
assert.ok(env.drawingPreview && env.drawingDrag.current, "a saved-shape edit is active before switching");
env.onToolKeyDown({ key: "b", preventDefault() {} }, 0);
assert.equal(env.tool, "brush", "toolbar letter shortcuts use the same cancellation path");
assert.equal(env.drawingDrag.current, null, "switching tools cancels an active shape edit");
assert.equal(env.drawingPreview, null, "switching tools clears preview geometry");
assert.equal(env.selectedDrawingIndex, null, "switching tools clears stale shape selection");
env.onUp(event(350, 80));
assert.equal(JSON.stringify(env.draws), savedBeforeSwitch, "cancelled edit leaves saved UTC shapes unchanged");
assert.equal(env.undoStack.length, historyBeforeSwitch, "cancelled edit leaves history unchanged");
env.pinch.current = { view0: [0, 99] };
env.touchPointers.current.set(1, { x: 100, y: 100 });
env.measureExpiry.current = env.setTimeout(() => {}, 2500);
const cancelledTimer = env.measureExpiry.current, priorCancellations = cancellations;
env.selectTool("cursor", 0);
assert.equal(env.pinch.current, null, "tool changes release pinch ownership");
assert.equal(env.touchPointers.current.size, 0, "old touch identities cannot resume a cancelled pinch");
assert.equal(env.measureExpiry.current, null);
assert.equal(timers.has(cancelledTimer), false, "tool change clears a transient measure timer");
assert.equal(cancellations, priorCancellations + 1, "tool change discards queued pan work");
assert.match(source, /onClick=\{\(\) => selectTool\(t\.id, index\)\}/, "toolbar clicks use the same gesture-safe selection command");
// Evidence targets keep priority over saved shapes, while hidden/locked
// drawings leave the same coordinates available for ordinary chart panning.
env.drag.current = null;
const evidenceEvent = event(280, 100);
evidenceEvent.target.closest = () => ({});
env.onDown(evidenceEvent);
assert.equal(env.drag.current, null);
assert.equal(env.drawingDrag.current, null);
env.hideDraws = true;
env.onDown(event(280, 100));
assert.equal(env.drag.current.isPan, true);
assert.equal(env.drawingDrag.current, null);
env.hideDraws = false; env.lock = true; env.drag.current = null;
env.onDown(event(280, 100));
assert.equal(env.drag.current.isPan, true);
assert.equal(env.drawingDrag.current, null);
env.lock = false; env.drag.current = null;
env.onDown(event(280, 100, "touch"));
assert.ok(env.drawingDrag.current);
const secondTouch = event(400, 90, "touch"); secondTouch.pointerId = 2;
env.onDown(secondTouch);
assert.ok(env.pinch.current, "second touch enters pinch instead of moving a selected shape");
assert.equal(env.drawingDrag.current, null);
assert.equal(env.drawingPreview, null);
assert.deepEqual(env.draws[0], committed);
// All persisted drawing kinds retain bounded integer UTC points when translated.
for (const kind of ["trend", "rect", "measure", "fib", "brush", "text", "hline"]) {
  const original = { ...trend, kind, text: "Note", pts: kind === "brush" ? [trend.a, trend.b] : undefined };
  const result = env.editDrawing(original, "move", -10000, 3, 0, 0);
  for (const pt of [result.a, result.b, ...(result.pts || [])]) {
    assert.ok(Number.isInteger(pt.i) && pt.i >= 0 && pt.i < bars.length);
    assert.equal(pt.t, bars[pt.i].t);
  }
  assert.equal(result.b.i - result.a.i, original.b.i - original.a.i, "bounded movement preserves shape width");
}
assert.match(source, /data-drawing-handle=/, "selected shapes expose visible handles");
console.log("MICROCHART DRAWING EDIT PASS: cursor selection, bounded UTC moves/endpoints, one edit snapshot, undo/redo, delete and cancellation.");
