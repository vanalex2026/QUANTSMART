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
const api = await import("data:text/javascript;base64," + Buffer.from(await bundle("export * from './src/lib/candlePatternAtlas.ts'; export * from './src/lib/analysisWorkerTask.ts';")).toString("base64"));
const workerCode = await bundle("import './src/lib/candleAtlas.worker.ts';", "cjs");
const createWorker = () => new Worker(`const {parentPort}=require('node:worker_threads');globalThis.postMessage=data=>parentPort.postMessage(data);${workerCode}\nparentPort.on('message',data=>globalThis.onmessage({data}));`, { eval: true });
const start = Date.parse("2026-01-01T00:00:00Z");
const tape = Array.from({ length: 1600 }, (_, i) => {
  const o = 2000 + i * 0.002 + 4 * Math.sin(i / 12);
  const c = o + 0.8 * Math.sin(i * 2.7);
  return { i, t: new Date(start + i * 300000).toISOString(), o, h: Math.max(o, c) + 0.2, l: Math.min(o, c) - 0.3, c, closed: true };
});
const now = start + tape.length * 300000;

test("real atlas worker preserves complete causal analysis and captured query clock", async () => {
  const worker = createWorker();
  try {
    for (const bars of [tape, [...tape.slice(0, 200), { ...tape[200], closed: false }], tape.filter((_, i) => i !== 100)]) {
      const reply = new Promise((resolve, reject) => { worker.once("message", resolve); worker.once("error", reject); });
      worker.postMessage({ bars, symbol: "XAUUSD", now });
      const actual = await reply;
      const expected = api.analyzeCandlePattern(bars, "M5", "XAUUSD", { adaptive: false, maxMatches: 60, now });
      assert.deepEqual(actual.result, expected);
      if (bars === tape) {
        assert.ok(actual.result.ok);
        assert.ok(actual.result.matches.length > 0);
        assert.ok(actual.result.walkForward.evaluated >= 12);
        assert.ok(actual.result.matches.every((m) => m.endIndex < bars.length - actual.result.lookback));
        assert.equal(actual.result.asOf, tape.at(-1).t);
      }
    }
  } finally { await worker.terminate(); }
});

test("walk-forward excludes historical query windows that cross a tape gap", () => {
  // A short tape makes every eligible query part of the validation schedule.
  // A gapped or rejected off-grid row must produce the same held-out support.
  const shortTape = tape.slice(0, 160);
  const complete = api.analyzeCandlePattern(shortTape, "M5", "XAUUSD", { adaptive: false, maxMatches: 60, now });
  const gappedBars = shortTape.filter((_, index) => index !== 100);
  const gapped = api.analyzeCandlePattern(gappedBars, "M5", "XAUUSD", { adaptive: false, maxMatches: 60, now });
  const offGrid = api.analyzeCandlePattern(shortTape.map((bar, index) => index === 100
    ? { ...bar, t: new Date(Date.parse(bar.t) + 60_000).toISOString() } : bar), "M5", "XAUUSD", { adaptive: false, maxMatches: 60, now });
  assert.ok(gapped.dataQuality.gaps > 0, "the removed closed bar must remain a quality defect");
  assert.equal(gapped.walkForward.evaluated, complete.walkForward.evaluated - 1 - gapped.lookback,
    "the removed row and every query-through-H+1 window crossing it stay outside the validation denominator");
  assert.equal(gapped.walkForward.sampleN, gapped.walkForward.evaluated,
    "held-out support denominator must match the contiguous query rows actually scored");
  assert.equal(gapped.walkForward.probabilistic.evaluated, gapped.walkForward.evaluated,
    "categorical and probabilistic validation must share the same observed labels");
  assert.equal(offGrid.dataQuality.invalidTimestamps, 1);
  assert.deepEqual(offGrid.walkForward, gapped.walkForward,
    "rejecting an off-grid historical row cannot silently restore a missing query or H+1 label");
});

test("superseding jobs invalidate both queued completion and queued errors", () => {
  const fake = () => ({ onmessage: null, onerror: null, onmessageerror: null, postMessage() {}, terminate() { this.stopped = true; } });
  const old = fake(), next = fake(), results = [], errors = [];
  const cancel = api.startAnalysisWorker({ symbol: "XAUUSD" }, () => old, (r) => results.push(r), () => errors.push("old"));
  const late = old.onmessage, lateError = old.onerror;
  cancel();
  api.startAnalysisWorker({ symbol: "EURUSD" }, () => next, (r) => results.push(r), () => errors.push("new"));
  late({ data: { result: { symbol: "XAUUSD" } } });
  lateError({ preventDefault() {} });
  next.onmessage({ data: { result: { symbol: "EURUSD" } } });
  assert.deepEqual(results, [{ symbol: "EURUSD" }]);
  assert.deepEqual(errors, []);
  assert.ok(old.stopped && next.stopped);
});

test("bare worker errors still fail the active scan and notify only once", () => {
  const fake = () => ({ onmessage: null, onerror: null, onmessageerror: null, postMessage() {}, terminate() { this.stopped = true; } });
  const worker = fake(); let errors = 0;
  const cancel = api.startAnalysisWorker({}, () => worker, () => assert.fail("unexpected result"), () => errors++);
  // Some host/test worker shims do not provide preventDefault on onerror.
  const lateError = worker.onerror;
  lateError(undefined);
  lateError(undefined);
  assert.equal(errors, 1);
  assert.ok(worker.stopped);
  cancel();
});

test("atlas render suppresses previous results and retains UTC focus while recomputing", () => {
  const hook = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/useCandleAtlas.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
  assert.match(hook, /scan\?\.tape === tape && scan.symbol === symbol && scan.attempt === attempt/);
  assert.match(hook, /result: current \? scan.result : null/);
  assert.match(hook, /samePriceActionTape\(previous.current, bars\)/);
  assert.match(hook, /now: Date.now\(\)/);
  assert.match(page, /if \(candleAtlasStatus !== "ready"\) return;/);
  assert.match(page, /data-candle-atlas-scan=\{candleAtlasStatus\}/);
  assert.doesNotMatch(page, /analyzeCandlePattern\(/);
});
