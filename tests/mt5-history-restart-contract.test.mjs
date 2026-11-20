import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// This is an endpoint-contract fixture, not a broker or network test. The
// six-hour cadence keeps the tape deterministic and comfortably above the
// adapter's conservative 1% per-chunk lower bound for all supported frames.
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/mt5DemoAdapter.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const moduleText = bundle.outputFiles[0].text;
const adapter = await import("data:text/javascript;base64," + Buffer.from(moduleText).toString("base64") + "#initial");
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};

const now = Date.parse("2026-01-01T00:30:00Z");
const timeframes = ["M5", "M15", "M30", "H1"];
let fetches = 0;
globalThis.fetch = async (input) => {
  fetches++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 6 * 60 * 60 * 1000) {
    bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  }
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", authority: "SHADOW_ONLY", read_only: true, bars }) };
};

const first = new Map();
for (const tf of timeframes) {
  const result = await adapter.mt5ThreeYearHistory("XAUUSD", tf, now);
  first.set(tf, result);
  assert.equal(result.complete, true, `${tf} should have complete three-year fixture coverage`);
  assert.equal(result.source, "MT5_HISTORY_3Y");
  assert.equal(result.read_only, true);
  assert.equal(result.authority, "SHADOW_ONLY");
  assert.equal(result.closedBarProvenance, "MT5_CLOSED_BARS");
  assert.equal(result.server_timezone, "UTC");
  assert.equal(result.timestamp_basis, "UTC");
  assert.ok(result.requestedBarsTotal > 0);
  assert.ok(result.returnedBarsTotal > 0);
  assert.ok(result.coverageRanges?.every((range) => range.complete));
}
assert.ok(values.size > 0, "successful ranges must persist cache chunks");
const persistedFetches = fetches;

// A fresh module instance represents a browser/runtime restart. Persistent
// localStorage is retained, while any network call would fail the contract.
const restarted = await import("data:text/javascript;base64," + Buffer.from(moduleText).toString("base64") + "#restart");
globalThis.fetch = async (input) => { throw new Error("restart should use persisted history chunks"); };
for (const tf of timeframes) {
  const result = await restarted.mt5ThreeYearHistory("XAUUSD", tf, now);
  assert.equal(result.complete, true, `${tf} should remain complete after restart`);
  assert.equal(result.cachedChunks, result.chunks);
  assert.equal(result.server_timezone, "UTC");
  assert.equal(result.timestamp_basis, "UTC");
  assert.equal(result.requestedBarsTotal, first.get(tf).requestedBarsTotal);
  assert.equal(result.returnedBarsTotal, first.get(tf).returnedBarsTotal);
  assert.equal(result.n, first.get(tf).n);
}
assert.equal(fetches, persistedFetches, "restart must not refetch complete persisted chunks");

// Partial endpoint responses remain visible and uncached for every supported
// timeframe. The final-row guard also catches a response that covers only the
// beginning of each chunk while claiming ok=true.
values.clear();
let partialCalls = 0;
globalThis.fetch = async (input) => {
  partialCalls++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  // Keep the one row inside the rolling window even when the first aligned
  // chunk begins before it (the H1 step is intentionally larger than 3 years).
  const firstInWindow = Date.parse("2023-01-01T01:00:00Z");
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", server_timezone: "UTC", timestamp_basis: "UTC", bars: [{ i: 0, t: new Date(Math.max(from, firstInWindow)).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" }] }) };
};
for (const tf of timeframes) {
  const result = await adapter.mt5ThreeYearHistory("XAUUSD", tf, now);
  assert.equal(result.complete, false, `${tf} partial endpoint response must fail closed`);
  assert.equal(result.reason, "HISTORY_PARTIAL_CHUNKS");
  assert.equal(result.cachePersisted, false);
  assert.ok(result.coverageRanges?.every((range) => range.reason === "BROKER_MAX_BARS_LIMIT"));
}
assert.equal(values.size, 0, "partial chunks must never seed persistent history cache");
assert.ok(partialCalls > 0);
console.log("MT5 HISTORY RESTART PASS: M5/M15/M30/H1 closed-bar provenance survives restart, and partial chunks remain uncached.");
