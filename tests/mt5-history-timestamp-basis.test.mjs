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
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 5 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "BROKER_LOCAL", bars }) };
};

const result = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", Date.parse("2026-01-01T00:30:00Z"));
assert.equal(result.complete, false);
assert.equal(result.reason, "HISTORY_TIMESTAMP_BASIS_MISMATCH");
assert.ok(result.failedChunks?.every((chunk) => chunk.reason === "HISTORY_TIMESTAMP_BASIS_MISMATCH"));
assert.equal(result.cachePersisted, false);
assert.equal(values.size, 0, "non-UTC timestamp basis must never seed a cache");
let calls = 0;
globalThis.fetch = async (input) => {
  calls++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const seeded = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", Date.parse("2026-01-01T00:30:00Z"));
assert.equal(seeded.complete, true);
const cacheKey = values.keys().next().value;
const poisoned = JSON.parse(values.get(cacheKey));
poisoned.timestamp_basis = "BROKER_LOCAL";
values.set(cacheKey, JSON.stringify(poisoned));
calls = 0;
const restarted = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", Date.parse("2026-01-01T00:30:00Z"));
assert.equal(calls, 1, "cache with contradictory timestamp provenance must be refetched");
assert.equal(restarted.cachedChunks, 0);

// A known UTC marker mixed with an unmarked chunk is also ambiguous. It must
// invalidate the tape instead of treating the missing marker as UTC by
// inference.
values.clear();
let mixedCalls = 0;
globalThis.fetch = async (input) => {
  mixedCalls++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, ...(mixedCalls === 1 ? { timestamp_basis: "UTC" } : {}), bars }) };
};
const mixed = await adapter.mt5ThreeYearHistory("XAUUSD", "M5", Date.parse("2026-01-01T00:30:00Z"));
assert.equal(mixed.complete, false);
assert.equal(mixed.reason, "HISTORY_TIMESTAMP_BASIS_MISMATCH");
assert.equal(mixed.cachePersisted, false);
assert.equal(values.size, 0);
console.log("MT5 HISTORY TIMESTAMP PASS: non-UTC provenance fails closed and contradictory cache provenance is refetched.");
