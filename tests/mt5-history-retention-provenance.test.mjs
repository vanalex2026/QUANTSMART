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
const nativeSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (callback, _delay, ...args) => { callback(...args); return 0; };
let retentionCalls = 0;
globalThis.fetch = async (input) => { retentionCalls++; return { json: async () => ({ ok: false, reason: "BROKER_RETENTION", symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars: [] }) }; };
let result;
try { result = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", Date.parse("2026-01-01T00:30:00Z")); }
finally { globalThis.setTimeout = nativeSetTimeout; }
assert.equal(result.complete, false);
assert.equal(retentionCalls, result.chunks, "explicit broker retention should skip futile retries per chunk");
assert.equal(result.retentionSource, "BROKER_RETENTION", "explicit broker retention must remain visible after an empty response");
assert.ok(result.failedChunks?.every((chunk) => chunk.limitSource === "BROKER_RETENTION"));
values.clear();
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, reason: null, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", history_limit: "BROKER_RETENTION", bars }) };
};
const explicit = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", Date.parse("2026-01-01T00:30:00Z"));
assert.equal(explicit.complete, false, "explicit retention must not promote a full-looking response");
assert.equal(explicit.retentionSource, "BROKER_RETENTION");
assert.equal(explicit.cachePersisted, false);
console.log("MT5 HISTORY RETENTION PASS: explicit broker-retention failures remain observable and uncached.");
