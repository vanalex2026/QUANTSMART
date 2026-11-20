import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/mt5DemoAdapter.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const adapter = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const values = new Map();
globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
const now = Date.parse("2026-01-01T00:30:00Z");
const tfs = ["M5", "M15", "M30", "H1"];
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const step = 6 * 60 * 60 * 1000;
  const bars = [];
  for (let stamp = from; stamp < to; stamp += step) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
for (const tf of tfs) {
  const result = await adapter.mt5ThreeYearHistory("XAUUSD", tf, now);
  assert.equal(result.complete, true, `${tf} fixture should be complete`);
  assert.ok(result.coverageRanges?.every((chunk) => chunk.coverageRatio > 0 && chunk.coverageRatio <= 1));
  assert.equal(result.provenanceSummary.chunks, result.chunks);
  assert.equal(result.provenanceSummary.cacheHits, 0);
  assert.equal(result.provenanceSummary.cacheMisses, result.chunks);
  assert.equal(result.provenanceSummary.coverageRatio, Number((result.returnedBarsTotal / result.requestedBarsTotal).toFixed(6)));
  assert.deepEqual(result.provenanceSummary.sourceCounts, { MT5_HISTORY: result.chunks });
  assert.deepEqual(result.provenanceSummary.closedBarProvenanceCounts, { MT5_CLOSED_BARS: result.chunks });
  assert.deepEqual(result.provenanceSummary.serverTimezoneCounts, { UTC: result.chunks });
  assert.deepEqual(result.provenanceSummary.timestampBasisCounts, { UTC: result.chunks });
  assert.deepEqual(result.provenance_summary, result.provenanceSummary);
}
// A second pass reuses every persisted chunk and must expose that fact both per
// range and in the aggregate rollup, without another bridge call.
globalThis.fetch = async (input) => { throw new Error("validated cache should satisfy this pass"); };
const cached = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(cached.provenanceSummary.cachedChunks, cached.chunks);
assert.equal(cached.provenanceSummary.cacheHitRate, 1);
assert.ok(Number.isFinite(cached.provenanceSummary.oldestCacheAgeMs));
assert.ok(Number.isFinite(cached.provenanceSummary.newestCacheAgeMs));
assert.ok(cached.provenanceSummary.oldestCacheAgeMs >= cached.provenanceSummary.newestCacheAgeMs);
assert.ok(cached.coverageRanges.every((chunk) => chunk.cache === "HIT" && chunk.coverageRatio > 0));

// Failed chunks still belong in the aggregate denominator. A response that
// omits its source/closed-bar marker must be represented as UNATTESTED rather
// than disappearing from the summary and making a partial tape look cleaner.
values.clear();
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 6 * 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, contract_version: 2, forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const unattested = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(unattested.complete, false);
assert.equal(unattested.provenanceSummary.sourceCounts.UNATTESTED, unattested.chunks);
assert.equal(unattested.provenanceSummary.closedBarProvenanceCounts.UNATTESTED, unattested.chunks);
assert.equal(unattested.provenanceSummary.serverTimezoneCounts.UTC, unattested.chunks);
assert.equal(unattested.provenanceSummary.timestampBasisCounts.UTC, unattested.chunks);
console.log("MT5 HISTORY PROVENANCE AGGREGATE PASS: M5/M15/M30/H1 expose per-chunk coverage and cache/provenance rollups.");

