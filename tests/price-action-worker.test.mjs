import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
async function bundle(contents, format = "esm") {
  const result = await build({ stdin: { contents, resolveDir: app }, bundle: true, format, platform: "node", write: false, logLevel: "silent" });
  return result.outputFiles[0].text;
}
const api = await import("data:text/javascript;base64," + Buffer.from(await bundle("export * from './src/lib/priceActionScan.ts'; export * from './src/lib/priceActionDetector.ts';")).toString("base64"));
const workerCode = await bundle("import './src/lib/priceAction.worker.ts';", "cjs");
const createWorker = () => new Worker(`const {parentPort}=require('node:worker_threads'); globalThis.postMessage=(data)=>parentPort.postMessage(data); ${workerCode}\nparentPort.on('message',data=>globalThis.onmessage({data}));`, { eval: true });
const bar = (i) => {
  const base = 100 + Math.floor(i / 9) * 0.02;
  const c = base + [0.5, 0.2, 0.9, 0.1, 1.1, 0.6, 1.3, 1.0, 1.6][i % 9];
  return { i, t: new Date(Date.parse("2026-01-01T00:00:00Z") + i * 300000).toISOString(), o: c - 0.2, h: c + 0.2, l: base - 0.3, c, closed: true };
};
const tape = Array.from({ length: 2600 }, (_, i) => bar(i));

test("actual worker returns the entire unchanged detector evidence, including invalid/gapped input", async () => {
  const worker = createWorker();
  try {
    for (const bars of [tape, tape.filter((_, i) => i !== 100), [...tape.slice(0, 50), { ...tape[50], closed: false }]]) {
      const reply = new Promise((resolve, reject) => { worker.once("message", resolve); worker.once("error", reject); });
      worker.postMessage({ bars, options: { symbol: "XAUUSD", roundStep: 0.5 } });
      const actual = await reply;
      assert.deepEqual(actual.result, api.detectM5PriceAction(bars, { symbol: "XAUUSD", roundStep: 0.5 }));
      if (bars === tape) {
        assert.equal(Object.keys(actual.result.evidence).length, 13);
        assert.ok(Object.values(actual.result.evidence).some((e) => e.evaluated > 2400));
        assert.ok(Object.values(actual.result.evidence).every((e) => e.history.length === e.occurrences && e.authority === "SHADOW_ONLY / NO_DECISION"));
      }
    }
  } finally { await worker.terminate(); }
});

function fakeWorker() {
  return { onmessage: null, onerror: null, onmessageerror: null, stopped: 0, sent: [], postMessage(data) { this.sent.push(data); }, terminate() { this.stopped++; } };
}
test("cancelled and superseded scans cannot publish even an already queued result", () => {
  const old = fakeWorker(), next = fakeWorker(), results = [], errors = [];
  const cancel = api.startPriceActionScan(tape, { symbol: "XAUUSD" }, () => old, (r) => results.push(r), () => errors.push("old"));
  const late = old.onmessage, lateError = old.onmessageerror;
  cancel(); cancel();
  assert.equal(old.stopped, 1);
  api.startPriceActionScan(tape.slice(1), { symbol: "EURUSD" }, () => next, (r) => results.push(r), () => errors.push("new"));
  const accepted = { symbol: "EURUSD", evidence: { corrected: true } };
  next.onmessage({ data: { result: accepted } });
  late({ data: { result: { symbol: "XAUUSD" } } }); lateError();
  assert.deepEqual(results, [accepted]);
  assert.deepEqual(errors, []);
  assert.equal(next.stopped, 1);
  assert.equal(next.onmessage, null);
});

test("worker constructor, cloning, runtime, decode and reported failures fail closed and allow a new scan", () => {
  for (const mode of ["constructor", "post", "runtime", "decode", "reply"]) {
    const worker = fakeWorker(); let errors = 0, results = 0;
    if (mode === "post") worker.postMessage = () => { throw new Error("clone"); };
    const cancel = api.startPriceActionScan(tape, {}, () => { if (mode === "constructor") throw new Error("unsupported"); return worker; }, () => results++, () => errors++);
    if (mode === "runtime") worker.onerror({ preventDefault() {} });
    if (mode === "decode") worker.onmessageerror();
    if (mode === "reply") worker.onmessage({ data: { error: "PRICE_ACTION_SCAN_FAILED" } });
    cancel();
    assert.equal(errors, 1, mode); assert.equal(results, 0, mode);
    assert.equal(worker.stopped, mode === "constructor" ? 0 : 1, mode);
  }
  const worker = fakeWorker(); let result;
  api.startPriceActionScan([], {}, () => worker, (r) => { result = r; }, () => assert.fail());
  worker.onmessage({ data: { result: { ok: true } } });
  assert.deepEqual(result, { ok: true });
});

test("poll dedup compares all OHLC, closed flags, timestamps and retention length", () => {
  const copy = tape.map((b) => ({ ...b, irrelevantPresentationField: 9 }));
  assert.equal(api.samePriceActionTape(tape, copy), true);
  for (const [key, value] of [["o", 100.1], ["h", 109], ["l", 90], ["c", 100.1], ["closed", false], ["t", bar(100).t]]) {
    const changed = copy.map((b, i) => i === 20 ? { ...b, [key]: value } : b);
    assert.equal(api.samePriceActionTape(tape, changed), false, `interior ${key} change with identical endpoints`);
  }
  assert.equal(api.samePriceActionTape(tape, tape.slice(1)), false);
  const hook = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/usePriceActionAnalysis.ts", import.meta.url), "utf8");
  assert.match(hook, /scan\?\.tape === tape && scan.symbol === symbol && scan.attempt === attempt/, "render must suppress previous tape/symbol statistics before effect cleanup");
  assert.match(hook, /result: current \? scan.result : null/);
  const page = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /detectM5PriceAction\(/, "page must not run full detector on its render thread");
  assert.match(page, /data-price-action-scan=\{priceActionScanStatus\}/);
});

