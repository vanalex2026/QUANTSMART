import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalStatistics.ts";', resolveDir: app },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 150 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + Math.sin(index / 6) * 2 + index * 0.01,
  h: 2001 + Math.sin(index / 6) * 2 + index * 0.01,
  l: 1999 + Math.sin(index / 6) * 2 + index * 0.01,
  c: 2000.4 + Math.sin(index / 6) * 2 + index * 0.01,
  closed: true,
}));
const nowMs = epoch + 151 * 300_000;
const result = api.measurePdfSignalStatistics(bars, nowMs);
assert.equal(result.state, "READY");
assert.equal(Object.keys(result.statistics).length, 23);
assert.equal(result.warmupRows, 8);
assert.equal(result.terminalRowsWithoutH1, 1);
assert.equal(result.denominatorEquation, "evaluated = DETECTED + ABSTAIN");
assert.equal(result.rowAccountingEquation, "bars = warmupRows + evaluatedRows + skippedRows + terminalRowsWithoutH1");
assert.equal(result.bars, result.warmupRows + result.evaluatedRows + result.skippedRows + result.terminalRowsWithoutH1);
for (const row of Object.values(result.statistics)) {
  assert.equal(row.conceptId in result.statistics, true);
  assert.equal(row.stateCounts.DETECTED + row.stateCounts.ABSTAIN + row.stateCounts.UNAVAILABLE + row.stateCounts.WITHHELD, result.evaluatedRows);
  assert.ok(row.sourceStatus === "SOURCE_REVIEW_ONLY" || row.sourceStatus === "DETECTOR_GEOMETRY");
  assert.equal(row.evaluated, row.stateCounts.DETECTED + row.stateCounts.ABSTAIN);
  assert.equal(row.denominatorEquation, result.denominatorEquation);
  if (row.sourceStatus === "SOURCE_REVIEW_ONLY") assert.equal(row.h1Direction, undefined);
}
assert.equal(result.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(result.live_apply_allowed, false);

const progress = [];
api.measurePdfSignalStatistics(bars, nowMs, { onProgress: (value) => progress.push(value) });
assert.ok(progress.length > 0, "statistics scans must expose worker progress checkpoints");
assert.equal(progress.at(-1).processedRows, bars.length - 9);
assert.equal(progress.at(-1).totalRows, bars.length - 9);
assert.equal(progress.at(-1).evaluatedRows + progress.at(-1).skippedRows, bars.length - 9);

const future = bars.concat({ ...bars.at(-1), t: new Date(epoch + 150 * 300_000).toISOString(), c: 9999 });
const repeat = api.measurePdfSignalStatistics(bars, nowMs);
assert.deepEqual(result.statistics, repeat.statistics);
const futureResult = api.measurePdfSignalStatistics(bars, nowMs);
assert.deepEqual(result.statistics, futureResult.statistics, "rows after the selected boundary cannot rewrite the census");

const invalid = api.measurePdfSignalStatistics([{ ...bars[0], closed: false }, ...bars.slice(1)], nowMs);
assert.equal(invalid.state, "UNAVAILABLE");
assert.equal(invalid.reason, "INVALID_OR_FORMING_CLOSED_TAPE");
assert.deepEqual(invalid.invalidBar, { row: 1, time: bars[0].t, cause: "forming" });
for (const [cause, replacement] of [
  ["flat", { ...bars[20], h: 2000, l: 2000, o: 2000, c: 2000 }],
  ["prices", { ...bars[20], c: NaN }],
  ["order", { ...bars[20], t: bars[19].t }],
  ["timestamp", { ...bars[20], t: "invalid" }],
]) {
  const rejected = api.measurePdfSignalStatistics(bars.with(20, replacement), nowMs);
  assert.equal(rejected.state, "UNAVAILABLE");
  assert.equal(rejected.invalidBar.row, 21);
  assert.equal(rejected.invalidBar.cause, cause);
  assert.equal(rejected.evaluatedRows, 0);
}
const wrongIdentity = api.measurePdfSignalStatistics(bars, nowMs, { symbol: "EURUSD", timeframe: "M5" });
assert.equal(wrongIdentity.state, "UNAVAILABLE");
assert.equal(wrongIdentity.reason, "INVALID_XAUUSD_M5_IDENTITY");
assert.equal(future.length, 151);
console.log("PDF SIGNAL STATISTICS PASS: 23 concepts, causal state reconciliation, source outcome withholding and invalid-tape rejection.");
