import assert from "node:assert/strict";
import { summarizePanProbe, cancelPanProbe, panProbeTimeoutReason, panProbePageExpression, panProbeCancelExpression } from "../scripts/profile-chart-pan.mjs";
import vm from "node:vm";

const report = summarizePanProbe({
  state: "done", label: "XAUUSD M5 research chart", hidden: false,
  intervals: [16.6, 17.1, 18.2, 20.4, 31.0],
  actualDisplacement: 120.00001, expectedDisplacement: 120,
  maxYDrift: 0.02, updates: 4,
});
assert.equal(report.schema, "quantsmart.chart-pan-profile/1");
assert.equal(report.continuousGeometry, true);
assert.equal(report.timingStatus, "MEASURED");
assert.ok(report.geometry.displacementError < 0.25);
assert.equal(report.geometry.maxYDrift, 0.02);
assert.equal(report.frameTimeMs.over25, 1);
assert.throws(() => summarizePanProbe({ state: "done", intervals: [], actualDisplacement: 1, expectedDisplacement: 1, maxYDrift: 0, updates: 1 }), /invalid measurements/);
assert.throws(() => summarizePanProbe({ state: "done", intervals: [0, -1, 16], actualDisplacement: 1, expectedDisplacement: 1, maxYDrift: 0, updates: 1 }), /invalid measurements/);
assert.throws(() => summarizePanProbe({ state: "done", intervals: [16], actualDisplacement: 1, expectedDisplacement: 1, maxYDrift: 0, updates: 1, hidden: true }), /hidden/);
assert.equal(summarizePanProbe({ state: "done", intervals: [16, 16, 16], actualDisplacement: 90, expectedDisplacement: 120, maxYDrift: 0, updates: 1 }).continuousGeometry, false);
assert.equal(summarizePanProbe({ state: "done", intervals: [16, 16, 16], actualDisplacement: 120, expectedDisplacement: 120, maxYDrift: 1, updates: 1 }).continuousGeometry, false);
const stalledReport = summarizePanProbe({ state: "done", intervals: [0, 16, 1006, 16, 1006], actualDisplacement: 120, expectedDisplacement: 120, maxYDrift: 0, updates: 4 });
assert.equal(stalledReport.continuousGeometry, true, "scheduler delays must not erase separately measured displacement");
assert.equal(stalledReport.timingStatus, "INCONCLUSIVE_SCHEDULER_STALLS", "a completed but stalled probe cannot silently claim representative chart frame timing");
assert.equal(stalledReport.schedulerStalls, 2);
const runningProbe = { state: "running", cancelled: false };
assert.strictEqual(cancelPanProbe(runningProbe), runningProbe);
assert.equal(runningProbe.state, "cancelled");
assert.equal(runningProbe.cancelled, true, "cancelled probe is marked for the page-side RAF loop");
const completedProbe = { state: "done", cancelled: false };
cancelPanProbe(completedProbe);
assert.deepEqual(completedProbe, { state: "done", cancelled: false }, "completed probe result remains immutable");
assert.match(panProbeTimeoutReason({ intervals: [0, 1006, 16, 1007] }), /throttled/, "repeated one-second RAF gaps are inconclusive for chart performance");
assert.match(panProbeTimeoutReason({ intervals: [0, 16, 17] }), /did not complete/, "ordinary timeouts remain distinct from scheduler throttling");
const rafQueue = [];
let pointerMoves = 0;
const line = { isConnected: true, getAttribute: () => "10", getCTM: () => ({}) };
const candle = { querySelector: () => line };
const svg = {
  querySelector: () => svg,
  querySelectorAll: () => [candle, candle, candle],
  dispatchEvent: event => { if (event.type === "pointermove") pointerMoves += 1; },
};
const sandbox = {
  window: {}, document: { visibilityState: "visible", querySelector: () => svg },
  DOMPoint: class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return this; } },
  PointerEvent: class { constructor(type) { this.type = type; } },
  requestAnimationFrame: callback => { rafQueue.push(callback); return rafQueue.length; },
};
vm.runInNewContext(`(${panProbePageExpression({ x: 10, y: 20, label: "XAUUSD M5 research chart" }, 20, 2)})`, sandbox);
assert.equal(rafQueue.length, 1, "page probe schedules its first RAF callback");
vm.runInNewContext(panProbeCancelExpression(), sandbox);
rafQueue.shift()(16);
assert.equal(sandbox.window.__orcaChartPanProfile.state, "cancelled", "page cleanup uses the shared cancellation transition");
assert.equal(pointerMoves, 0, "cancelled RAF callback emits no synthetic pointer move");
vm.runInNewContext(`(${panProbePageExpression({ x: 10, y: 20, label: "XAUUSD M5 research chart; 180 visible bars" }, 20, 1)})`, sandbox);
rafQueue.shift()(16);
assert.equal(pointerMoves, 1, "active RAF callback emits the requested pointer move");
rafQueue.shift()(32);
vm.runInNewContext(panProbeCancelExpression(), sandbox);
rafQueue.shift()(48);
assert.equal(pointerMoves, 1, "cancellation also stops a queued finalization callback");
assert.equal(sandbox.window.__orcaChartPanProfile.state, "cancelled");
console.log("CHART PAN PROFILE PASS: live-diagnostic summaries reject hidden or invalid samples and preserve geometry/frame metrics.");
