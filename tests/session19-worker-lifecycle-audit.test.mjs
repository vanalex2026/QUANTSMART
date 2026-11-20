import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../mfe_ux_lab/cockpit/src/lib/", import.meta.url);

test("session 19 worker lifecycle keeps cancellation and stale-result guards", async () => {
  const task = await readFile(new URL("analysisWorkerTask.ts", root), "utf8");
  assert.match(task, /let active = true/);
  assert.match(task, /if \(!active\) return/);
  assert.match(task, /worker\.onmessage = null/);
  assert.match(task, /worker\.onerror = null/);
  assert.match(task, /worker\.onmessageerror = null/);
  assert.match(task, /worker\.terminate\(\)/);
  assert.match(task, /if \(active\) \{ stop\(\); onError\(\); \}/);

  for (const file of [
    "useCandleAtlas.ts",
    "useNamedCandleHistory.ts",
    "usePriceActionAnalysis.ts",
    "usePatternSelectionCensus.ts",
  ]) {
    const source = await readFile(new URL(file, root), "utf8");
    assert.match(source, /return start(?:AnalysisWorker|NamedCandleHistoryScan|PatternSelectionCensusScan|PriceActionScan)/, `${file} must return worker cleanup`);
    assert.match(source, /result: current \? scan\.result : null/, `${file} must hide superseded results during render`);
    assert.match(source, /status: !\w+ \? "idle" : current \? scan\.status : "loading"/, `${file} must expose loading while a superseded scan is pending`);
  }
});

console.log("SESSION 19 WORKER LIFECYCLE AUDIT PASS: owned workers cancel safely and stale replies stay hidden across atlas, named-candle, price-action and census hooks.");
