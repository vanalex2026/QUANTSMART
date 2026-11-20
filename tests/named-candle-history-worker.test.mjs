import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const esbuild = require("esbuild");
async function bundle(contents, format = "esm") {
  const result = await esbuild.build({ stdin: { contents, resolveDir: app }, bundle: true, format, platform: "node", write: false, logLevel: "silent" });
  return result.outputFiles[0].text;
}
const api = await import("data:text/javascript;base64," + Buffer.from(await bundle("export * from './src/lib/namedCandleHistory.ts'; export * from './src/lib/namedCandleHistoryScan.ts';")).toString("base64"));
const workerCode = await bundle("import './src/lib/namedCandleHistory.worker.ts';", "cjs");
const createWorker = () => new Worker(`const {parentPort}=require('node:worker_threads');globalThis.postMessage=data=>parentPort.postMessage(data);${workerCode}\nparentPort.on('message',data=>globalThis.onmessage({data}));`, { eval: true });
const start = Date.parse("2026-01-01T00:00:00Z");
const tape = Array.from({ length: 1800 }, (_, i) => {
  const o = 2000 + i * 0.002 + 4 * Math.sin(i / 12);
  const c = o + 0.8 * Math.sin(i * 2.7);
  return { i, t: new Date(start + i * 300000).toISOString(), o, h: Math.max(o, c) + 0.2, l: Math.min(o, c) - 0.3, c, closed: true };
});

test("named-candle history worker preserves the exact full scan result", async () => {
  const worker = createWorker();
  try {
    for (const bars of [tape, tape.filter((_, i) => i !== 100), [...tape.slice(0, 200), { ...tape[200], closed: false }], [tape[1], tape[0]]]) {
    const reply = new Promise((resolve, reject) => { worker.once("message", resolve); worker.once("error", reject); });
    worker.postMessage({ bars, pattern: "DOJI" });
    const actual = await reply;
    assert.deepEqual(actual.result, api.scanNamedCandleHistory(bars, "DOJI"));
    assert.equal(actual.result.totalBars, bars.length);
    assert.ok(actual.result.history.every((item) => item.i < bars.length));
    }
  } finally { await worker.terminate(); }
});

test("superseded named-candle jobs cannot deliver queued completions or errors", () => {
  const fake = () => ({ onmessage: null, onerror: null, onmessageerror: null, postMessage() {}, terminate() { this.stopped = true; } });
  const old = fake(), next = fake(), results = [], errors = [];
  const cancel = api.startNamedCandleHistoryScan(tape, "DOJI", () => old, (r) => results.push(r), () => errors.push("old"));
  const late = old.onmessage, lateError = old.onerror;
  cancel();
  api.startNamedCandleHistoryScan(tape, "HAMMER", () => next, (r) => results.push(r), () => errors.push("new"));
  late({ data: { result: { pattern: "DOJI" } } });
  lateError({ preventDefault() {} });
  next.onmessage({ data: { result: { pattern: "HAMMER" } } });
  assert.deepEqual(results, [{ pattern: "HAMMER" }]);
  assert.deepEqual(errors, []);
  assert.ok(old.stopped && next.stopped);
});

test("worker failures fail closed and permit a fresh scan", () => {
  const fake = () => ({ onmessage: null, onerror: null, onmessageerror: null, postMessage() {}, terminate() { this.stopped = true; } });
  for (const mode of ["constructor", "post", "runtime", "decode", "reported"]) {
    const worker = fake(); let results = 0, errors = 0;
    if (mode === "post") worker.postMessage = () => { throw new Error("clone failure"); };
    const cancel = api.startNamedCandleHistoryScan(tape, "DOJI", () => { if (mode === "constructor") throw new Error("worker unsupported"); return worker; }, () => results++, () => errors++);
    if (mode === "runtime") worker.onerror({ preventDefault() {} });
    if (mode === "decode") worker.onmessageerror();
    if (mode === "reported") worker.onmessage({ data: { error: "NAMED_CANDLE_HISTORY_SCAN_FAILED" } });
    cancel();
    assert.equal(results, 0, mode);
    assert.equal(errors, 1, mode);
    if (mode !== "constructor") assert.ok(worker.stopped, mode);
  }
});

test("named history hook hides stale results and reuses equal closed tapes", async () => {
  const hook = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../mfe_ux_lab/cockpit/src/lib/useNamedCandleHistory.ts", import.meta.url), "utf8"));
  const ts = require("typescript");
  const ast = ts.createSourceFile("hook.ts", hook, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const fn = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "useNamedCandleHistory");
  const code = ts.transpileModule(fn.getText(ast).replace(/^export /, "").replaceAll("import.meta.url", '"file:///hook.ts"'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const slots = [], pending = [], workers = [];
  let index = 0;
  const sameDeps = (a, b) => a?.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const env = { ...api, URL, EMPTY_PATTERN_TAPE: [],
    Worker: function () { const worker = { onmessage: null, onerror: null, onmessageerror: null, postMessage() {}, terminate() { this.stopped = true; } }; workers.push(worker); return worker; },
    useRef(value) { const i = index++; return slots[i] ??= { current: value }; },
    useMemo(factory, deps) { const i = index++; if (!sameDeps(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() }; return slots[i].value; },
    useState(value) { const i = index++; if (!(i in slots)) slots[i] = value; return [slots[i], (next) => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useEffect(effect, deps) { const i = index++; if (!sameDeps(slots[i]?.deps, deps)) pending.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; }); },
  };
  const runHook = new Function("env", `with(env){${code};return useNamedCandleHistory;}`)(env);
  const render = (bars = tape, pattern = "DOJI", enabled = true) => { index = 0; return runHook(bars, pattern, enabled); };
  const commit = () => { while (pending.length) pending.shift()(); };
  const disabledTape = { get length() { throw new Error("disabled inspector cannot traverse retained tape"); }, map() { throw new Error("disabled inspector cannot clone retained tape"); } };
  assert.equal(render(disabledTape, "DOJI", false).status, "idle"); commit();
  assert.equal(workers.length, 0, "disabled history does not construct a worker");
  assert.equal(render().status, "loading"); commit();
  workers[0].onmessage({ data: { result: { pattern: "DOJI", totalBars: tape.length } } });
  assert.equal(render().result.pattern, "DOJI");
  render(tape.map((bar) => ({ ...bar }))); commit();
  assert.equal(workers.length, 1, "equal closed history must reuse the completed worker result");
  assert.equal(render(tape, "HAMMER").result, null, "pattern changes hide stale statistics before effect cleanup"); commit();
  const queued = workers[1].onmessage;
  const changed = tape.map((bar, i) => i === 100 ? { ...bar, c: bar.c + 0.01 } : bar);
  assert.equal(render(changed, "HAMMER").result, null); commit();
  queued({ data: { result: { pattern: "STALE" } } });
  assert.equal(render(changed, "HAMMER").result, null, "a queued superseded reply cannot publish history");
  workers[2].onmessage({ data: { result: { pattern: "HAMMER", totalBars: changed.length } } });
  assert.equal(render(changed, "HAMMER").result.pattern, "HAMMER");
  const retry = render(changed, "HAMMER").retry;
  retry();
  assert.equal(render(changed, "HAMMER").result, null, "retry hides previous history immediately"); commit();
  assert.equal(workers.length, 4);
  workers[3].onerror({ preventDefault() {} });
  assert.equal(render(changed, "HAMMER").status, "error");
  render(changed, "HAMMER").retry();
  assert.equal(render(changed, "HAMMER").status, "loading"); commit();
  assert.equal(workers.length, 5, "retry after failure starts a new owned worker");
  assert.equal(render(changed, "HAMMER", false).status, "idle"); commit();
  assert.ok(workers[4].stopped, "disabling the hook terminates pending work");
});

console.log("NAMED CANDLE HISTORY WORKER PASS: exact full scan, cancellation and stale-result suppression.");
