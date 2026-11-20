import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
async function bundle(contents, format = "esm") {
  const result = await build({ stdin: { contents, resolveDir: app }, bundle: true, format, platform: "node", write: false, logLevel: "silent" });
  return result.outputFiles[0].text;
}
const api = await import("data:text/javascript;base64," + Buffer.from(await bundle("export * from './src/lib/patternContextSelectionCensus.ts'; export * from './src/lib/patternSelectionCensusScan.ts';")).toString("base64"));
const workerCode = await bundle("import './src/lib/patternSelectionCensus.worker.ts';", "cjs");
const createWorker = () => new Worker(`const {parentPort}=require('node:worker_threads');globalThis.postMessage=data=>parentPort.postMessage(data);${workerCode}\nparentPort.on('message',data=>globalThis.onmessage({data}));`, { eval: true });
const epoch = Date.parse("2026-11-10T00:00:00.000Z");
const time = i => new Date(epoch + i * 300000).toISOString();
const bars = Array.from({ length: 100 }, (_, i) => ({ t: time(i), o: 100 + i * .05, h: 101 + i * .05, l: 99 + i * .05, c: 100.4 + i * .05, closed: true }));
const setup = i => ({ kind: "PATTERN_BREAK", version: "pattern-break/1", direction: "UP", signalBarTime: time(i - 1), confirmationTime: time(i), contextStart: time(i - 20), contextBoundary: 100, breakoutLevel: 101, protectionReference: 99, buildupTimes: [time(i - 4), time(i - 3), time(i - 2)], boundaryTouchTimes: [time(i - 4), time(i - 3), time(i - 2)], originalBreakTime: time(i - 1) });
const occurrences = [60, 61, 62].map(i => ({ i, time: time(i), direction: "UP", nextBar: "UP", score: .8, setup: setup(i) }));
const request = { bars, occurrences, conceptId: "pattern_break", nowMs: epoch + 101 * 300000 };

test("pattern-selection census worker matches the deterministic model and owns termination", async () => {
  const worker = createWorker();
  try {
    for (const input of [request, { ...request, bars: bars.filter((_, i) => i !== 59) }, { ...request, bars: [...bars.slice(0, 99), { ...bars[99], closed: false }] }, { ...request, nowMs: epoch }]) {
      const actual = await new Promise((resolve, reject) => {
        worker.once("message", resolve); worker.once("error", reject); worker.postMessage(input);
      });
      assert.deepEqual(actual.result, api.patternContextSelectionCensus(input.bars, input.occurrences, input.conceptId, true, input.nowMs));
      assert.equal(actual.result.authority, "SHADOW_ONLY / NO_DECISION");
      assert.equal(actual.result.live_apply_allowed, false);
    }
  } finally { await worker.terminate(); }
});

test("census worker failures fail closed once and permit another owned job", () => {
  const fake = () => ({ onmessage: null, onerror: null, onmessageerror: null, postMessage() {}, terminate() { this.stopped = true; } });
  for (const mode of ["constructor", "post", "runtime", "decode", "reported", "malformed"]) {
    const worker = fake(); let results = 0, errors = 0;
    if (mode === "post") worker.postMessage = () => { throw new Error("clone failure"); };
    const cancel = api.startPatternSelectionCensusScan(request, () => { if (mode === "constructor") throw new Error("worker unavailable"); return worker; }, () => results++, () => errors++);
    if (mode === "runtime") worker.onerror({ preventDefault() {} });
    if (mode === "decode") worker.onmessageerror();
    if (mode === "reported") worker.onmessage({ data: { error: "PATTERN_SELECTION_CENSUS_SCAN_FAILED" } });
    if (mode === "malformed") worker.onmessage({ data: null });
    cancel();
    assert.equal(results, 0, mode); assert.equal(errors, 1, mode);
    if (mode !== "constructor") assert.ok(worker.stopped, mode);
  }
});

test("census hook limits startup work and hides superseded evidence synchronously", async () => {
  const hook = await import("node:fs/promises").then(fs => fs.readFile(new URL("../mfe_ux_lab/cockpit/src/lib/usePatternSelectionCensus.ts", import.meta.url), "utf8"));
  const ts = require("typescript");
  const ast = ts.createSourceFile("hook.ts", hook, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "usePatternSelectionCensus");
  const code = ts.transpileModule(fn.getText(ast).replace(/^export /, "").replaceAll("import.meta.url", '"file:///hook.ts"'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const slots = [], pending = [], workers = []; let index = 0;
  const sameDeps = (a, b) => a?.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const env = { ...api, URL, EMPTY_TAPE: [],
    Worker: function () { const worker = { onmessage: null, onerror: null, onmessageerror: null, postMessage(value) { this.request = value; }, terminate() { this.stopped = true; } }; workers.push(worker); return worker; },
    useRef(value) { const i = index++; return slots[i] ??= { current: value }; },
    useMemo(factory, deps) { const i = index++; if (!sameDeps(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() }; return slots[i].value; },
    useState(value) { const i = index++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useEffect(effect, deps) { const i = index++; if (!sameDeps(slots[i]?.deps, deps)) pending.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; }); },
  };
  const run = new Function("env", `with(env){${code};return usePatternSelectionCensus;}`)(env);
  const evidence = { conceptId: "pattern_break", history: occurrences };
  const render = (tape = bars, selected = evidence, symbol = "XAUUSD", enabled = true) => { index = 0; return run(tape, selected, symbol, enabled); };
  const commit = () => { while (pending.length) pending.shift()(); };
  const dormant = { get length() { throw new Error("disabled census must not traverse tape"); }, map() { throw new Error("disabled census must not clone tape"); } };
  assert.equal(render(dormant, evidence, "XAUUSD", false).status, "idle"); commit(); assert.equal(workers.length, 0);
  assert.equal(render().status, "loading"); commit(); assert.equal(workers.length, 1);
  assert.equal(workers[0].request.conceptId, "pattern_break"); assert.equal(typeof workers[0].request.nowMs, "number");
  workers[0].onmessage({ data: { result: { conceptId: "pattern_break" } } });
  assert.equal(render().result.conceptId, "pattern_break");
  render(bars.map(bar => ({ ...bar }))); commit(); assert.equal(workers.length, 1, "equal full tapes reuse scan result");
  const corrected = bars.map((bar, i) => i === 40 ? { ...bar, c: bar.c + .01 } : bar);
  assert.equal(render(corrected).result, null, "OHLC correction hides old result in render"); commit();
  const queued = workers[1].onmessage;
  assert.equal(render(corrected, evidence, "XAUUSD.a").result, null); commit(); assert.ok(workers[1].stopped);
  queued({ data: { result: { conceptId: "STALE" } } }); assert.equal(render(corrected, evidence, "XAUUSD.a").result, null);
  workers[2].onmessage({ data: { result: { conceptId: "pattern_break" } } });
  assert.equal(render(corrected, evidence, "XAUUSD.a").status, "ready");
  const nextEvidence = { ...evidence, history: occurrences.map(row => ({ ...row, score: .5 })) };
  assert.equal(render(corrected, nextEvidence, "XAUUSD.a").result, null, "same concept with changed evidence cannot reuse census"); commit();
  render(corrected, nextEvidence, "XAUUSD.a").retry();
  assert.equal(render(corrected, nextEvidence, "XAUUSD.a").result, null); commit(); assert.ok(workers[3].stopped);
  const failed = workers.at(-1); failed.onerror({ preventDefault() {} }); assert.equal(render(corrected, nextEvidence, "XAUUSD.a").status, "error");
  const workerCount = workers.length;
  render(corrected, nextEvidence, "XAUUSD.a").retry();
  assert.equal(render(corrected, nextEvidence, "XAUUSD.a").status, "loading"); commit();
  assert.equal(workers.length, workerCount + 1, "retry starts a fresh worker after failure");
  const pendingWorker = workers.at(-1);
  assert.equal(render(corrected, nextEvidence, "XAUUSD.a", false).status, "idle"); commit(); assert.ok(pendingWorker.stopped, "closing disclosure or replay activation stops active job");
  const other = { conceptId: "pullback_reversal", history: [] };
  assert.equal(render(corrected, other).result, null); commit(); assert.equal(workers.at(-1).request.conceptId, "pullback_reversal");
});

test("superseded census replies and worker failures are cancelled", () => {
  const fake = () => ({ onmessage: null, onerror: null, onmessageerror: null, postMessage() {}, terminate() { this.stopped = true; } });
  const old = fake(), next = fake(), results = [], errors = [];
  const cancel = api.startPatternSelectionCensusScan(request, () => old, r => results.push(r), () => errors.push("old"));
  const late = old.onmessage, lateError = old.onerror;
  cancel();
  api.startPatternSelectionCensusScan(request, () => next, r => results.push(r), () => errors.push("new"));
  late({ data: { result: { state: "MEASURED" } } }); lateError({ preventDefault() {} });
  next.onmessage({ data: { result: { state: "WITHHELD" } } });
  assert.deepEqual(results, [{ state: "WITHHELD" }]); assert.deepEqual(errors, []); assert.ok(old.stopped && next.stopped);
});

console.log("PATTERN SELECTION CENSUS WORKER PASS: model parity, cancellation and stale-result suppression.");
