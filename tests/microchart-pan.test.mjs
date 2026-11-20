import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({ entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/microChartPan.ts", import.meta.url))], bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent" });
const { microChartPan } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const slot = 7.3, initial = [100, 180];
// The same candle follows every fractional pointer pixel, including across
// the integer-index transition where the old implementation visibly jumped.
let lastX;
for (let displacement = -75; displacement <= 75; displacement += 0.25) {
  const { view, offset } = microChartPan(initial, displacement, slot, 300);
  assert.ok(view.every(Number.isInteger), "evidence bounds remain integer indices");
  assert.equal(view[1] - view[0], 80, "pan preserves zoom width");
  assert.ok(Math.abs(offset) <= slot / 2 + 1e-9);
  const candleX = (140 - view[0] + 0.5) * slot + offset;
  assert.ok(Math.abs(candleX - ((140 - initial[0] + 0.5) * slot + displacement)) < 1e-9);
  if (lastX !== undefined) assert.ok(Math.abs(candleX - lastX - 0.25) < 1e-9, "no whole-candle jumps at index boundaries");
  lastX = candleX;
}
assert.deepEqual(microChartPan([0, 80], 50, slot, 300), { view: [0, 80], offset: 0 }, "first retained bar clamps without rubber-band drift");
const latestOverscroll = microChartPan([219, 299], -50, slot, 300);
assert.deepEqual(latestOverscroll.view, [219, 299], "latest retained bars keep their integer evidence window");
assert.ok(Math.abs(latestOverscroll.offset + 50) < 1e-9, "latest candle can move left to reveal a TradingView-style empty rail");
assert.deepEqual(microChartPan(initial, NaN, slot, 300), { view: initial, offset: 0 });
assert.deepEqual(microChartPan(initial, 10, 0, 300), { view: initial, offset: 0 });
// Execute the actual pointer handler and frame callback with a controlled
// animation clock: many input events must produce one render of the latest
// pointer position, and cancellation must discard work from an ended gesture.
const ts = require("typescript");
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("MicroChart.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbacks = new Map();
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ["onMove", "onUp"].includes(node.name?.text)) callbacks.set(node.name.text, node.getText(ast));
  if (ts.isVariableDeclaration(node) && ["flushPan", "cancelPan", "setView"].includes(node.name.getText(ast))) callbacks.set(node.name.getText(ast), node.initializer.arguments[0].getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const compile = (name, env) => {
  const text = ["onMove", "onUp"].includes(name) ? callbacks.get(name) : `const ${name} = ${callbacks.get(name)};`;
  return new Function("env", `with(env){${ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText};return ${name};}`)(env);
};
let scheduled = 0, renders = 0, applied, offset, hover;
let frameState = { view: initial, offset: 0 };
const env = { xy: e => ({ x: e.clientX, y: e.clientY }), tool: "cursor", n: 300, microChartPan,
  touchPointers: { current: new Map() }, pinch: { current: null },
  drag: { current: { x: 100, view0: initial, pan0: 0, slot, moved: false, isPan: true } },
  drawingDrag: { current: null }, setDrawingPreview: () => {},
  pointerRect: { current: { left: 0, top: 0 } },
  pendingPan: { current: null }, panFrame: { current: null },
  requestAnimationFrame: () => ++scheduled, cancelAnimationFrame: () => {},
  setPanFrameState: updater => {
    const next = typeof updater === "function" ? updater(frameState) : updater;
    if (next !== frameState) { frameState = next; applied = next.view; offset = next.offset; renders++; }
  }, setHover: value => { hover = value; }, setPanActive: () => {} };
env.flushPan = compile("flushPan", env);
const move = compile("onMove", env);
for (let i = 1; i <= 100; i++) move({ clientX: 100 + i / 4, clientY: 50, pointerType: "mouse" });
assert.equal(scheduled, 1, "100 pointer events schedule one animation frame");
assert.equal(renders, 0, "input events cannot synchronously rerender the chart");
env.flushPan();
assert.equal(renders, 1);
assert.deepEqual({ view: applied, offset }, microChartPan(initial, 25, slot, 300));
assert.equal(hover, undefined, "pan frames do not rerender the crosshair; release restores hover once");
move({ clientX: 130, clientY: 50, pointerType: "mouse" });
compile("cancelPan", env)();
env.flushPan();
assert.equal(renders, 2, "cancelled input clears the fractional offset without applying the cancelled gesture");
// A keyboard/focus/reset request can arrive before the pending animation
// frame. The old gesture must release ownership and never undo that request.
env.cancelPan = compile("cancelPan", env);
move({ clientX: 140, clientY: 50, pointerType: "mouse" });
const jump = [200, 280];
compile("setView", env)(jump);
assert.equal(env.drag.current, null, "explicit navigation releases the active pan origin");
env.flushPan();
assert.deepEqual(applied, jump, "pending pointer work cannot overwrite Reset or Show on chart");
assert.equal(renders, 3);
// Pointer-up can carry a newer coordinate than the last delivered move.
env.drag.current = { x: 100, view0: initial, pan0: 1.5, slot, isPan: true };
env.temp = null;
move({ clientX: 122, clientY: 50, pointerType: "mouse" });
compile("onUp", env)({ clientX: 125, clientY: 50, pointerType: "mouse", currentTarget: {} });
assert.deepEqual(frameState, microChartPan(initial, 26.5, slot, 300), "release applies the actual final pointer coordinate");
assert.equal(env.drag.current, null);
assert.deepEqual(hover, { x: 125, y: 50 }, "release restores the crosshair at the final pointer coordinate");
// Closed-bar/tail refreshes must not re-anchor the viewport while the pointer
// is still down. That would cancel the RAF pan and reset the fractional offset
// mid-gesture; panActive in the effect dependencies retries the identity
// reconciliation once pointer-up releases ownership.
assert.match(source, /if \(drag\.current\?\.isPan \|\| pinch\.current\) return;/,
  "viewport identity refreshes defer while a pan or pinch gesture owns the chart");
assert.match(source, /\[viewportBarIdentity, bars\.length, bars\[bars\.length - 1\]\?\.t, live, landmarksAtLatestOnly, panActive, panFrameState\.offset\]/,
  "deferred viewport reconciliation retries after panActive or overscroll changes");
assert.match(source, /cancelPan\(\);\s*\/\/ Keep the gesture-active signal asserted[\s\S]*?setPanActive\(true\);/,
  "pinch ownership keeps the gesture-active signal asserted until pointer-up");
assert.match(source, /setView\(microChartPinchViewport\([\s\S]*?\);\s*\/\/ setView\(\) cancels queued mouse-pan work[\s\S]*?setPanActive\(true\);/,
  "each pinch frame restores gesture ownership after viewport updates");
assert.match(source, /const releasedPan = drag\.current;[\s\S]*?pendingPan\.current = microChartPan\(releasedPan\.view0, releasedPan\.pan0 \+ releasePoint\.x - releasedPan\.x, releasedPan\.slot, n\);\s*\}\s*flushPan\(\);/,
  "pointer-up commits the final release coordinate when the last move was coalesced");
// Exercise the actual data-refresh effect and the real UTC reanchor helper.
let refreshEffect;
function findRefresh(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect" && node.arguments[0].getText(ast).includes("const previous = viewportBarsRef.current")) refreshEffect = node.arguments[0].getText(ast);
  ts.forEachChild(node, findRefresh);
}
findRefresh(ast);
assert.ok(refreshEffect);
const viewportBundle = await build({ stdin: { contents: "export { reanchorViewport } from './src/lib/microChartViewport.ts'", resolveDir: fileURLToPath(new URL('../mfe_ux_lab/cockpit/', import.meta.url)) }, bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent" });
const { reanchorViewport } = await import("data:text/javascript;base64," + Buffer.from(viewportBundle.outputFiles[0].text).toString("base64"));
const tape = Array.from({ length: 300 }, (_, i) => ({ t: new Date(Date.UTC(2026, 0, 5, 0, i * 5)).toISOString() }));
let refreshedFrame = { view: [100, 180], offset: 2.25 }, refreshWrites = 0, refreshScans = 0;
const refreshEnv = {
  viewportBarsRef: { current: tape }, bars: tape.map(bar => ({ ...bar })),
  viewportIdentityRef: { current: { closed: "same-topology", count: tape.length, tail: tape[tape.length - 1].t } }, viewportBarIdentity: "same-topology",
  drag: { current: { isPan: true } }, pinch: { current: null }, live: false, landmarksAtLatestOnly: true,
  drawingDrag: { current: null },
  panFrameState: { offset: refreshedFrame.offset },
  reanchorViewport(...args) { refreshScans++; return reanchorViewport(...args); },
  setPanFrameState(update) { refreshedFrame = update(refreshedFrame); this.panFrameState = refreshedFrame; refreshWrites++; },
};
const refreshJs = ts.transpileModule(`const effect = ${refreshEffect};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const refresh = () => new Function("env", `with(env){${refreshJs}; return effect();}`)(refreshEnv);
refresh();
assert.equal(refreshWrites, 0, "active pan owns the frame during data refresh");
assert.equal(refreshEnv.viewportBarsRef.current, tape, "deferred refresh retains original UTC topology");
refreshEnv.drag.current = null;
refreshEnv.pinch.current = {};
refresh();
assert.equal(refreshWrites, 0, "pinch also defers refresh reconciliation");
refreshEnv.pinch.current = null;
const settledFrame = refreshedFrame;
refresh();
assert.equal(refreshedFrame, settledFrame, "quote-only copies preserve the same fractional frame on release");
assert.equal(refreshWrites, 0, "quote-only release skips the large UTC reanchor map");
assert.equal(refreshScans, 0, "quote-only copies never call the retained-tape reanchor scan");
refreshEnv.viewportIdentityRef.current = { closed: "old-topology", count: tape.length, tail: tape[tape.length - 1].t };
refreshEnv.viewportBarIdentity = "new-topology";
refreshEnv.bars = tape.slice(5);
refresh();
assert.deepEqual(refreshedFrame, { view: [95, 175], offset: 2.25 }, "retention shifts preserve UTC candles and fractional displacement atomically");
assert.equal(refreshScans, 1);
refreshEnv.bars = refreshEnv.bars.map(bar => ({ ...bar }));
refresh();
assert.equal(refreshScans, 1, "repeated quote copies still skip the timestamp scan");
refreshEnv.viewportBarIdentity = "interior-UTC-repair";
refreshEnv.bars = refreshEnv.bars.map(bar => ({ ...bar }));
refresh();
assert.equal(refreshScans, 2, "interior UTC identity changes reconcile even with unchanged length and tail");
refreshEnv.bars = [...refreshEnv.bars, { t: new Date(Date.UTC(2026, 0, 5, 0, 300 * 5)).toISOString() }];
refresh();
assert.equal(refreshScans, 3, "a new forming tail reconciles even when closed identity is unchanged");
console.log("MICROCHART PAN PASS: fractional pixel movement, continuous candle coordinates, bounded edges and integer evidence identities.");
