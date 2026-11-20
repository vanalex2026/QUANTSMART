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
let calls = 0;
globalThis.fetch = async (input) => {
  calls++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 30 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  // A missing marker after a known marker is ambiguous clock provenance and
  // must be handled like an explicit timezone change.
  const server_timezone = calls === 1 ? "UTC" : undefined;
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, ...(server_timezone ? { server_timezone } : {}), timestamp_basis: "UTC", bars }) };
};

const result = await adapter.mt5ThreeYearHistory("XAUUSD", "M30", Date.parse("2026-01-01T00:30:00Z"));
assert.ok(calls > 1, "fixture must span multiple M30 chunks");
assert.equal(result.complete, false);
assert.equal(result.reason, "HISTORY_SERVER_TIMEZONE_MISMATCH");
assert.equal(result.cachePersisted, false);
assert.equal(values.size, 0, "mixed server clocks must never seed a cache");
console.log("MT5 HISTORY TIMEZONE PASS: mixed chunk clock provenance fails closed and invalidates cache.");

values.clear();
calls = 0;
globalThis.fetch = async (input) => {
  calls++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 30 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "Mars/Nowhere", timestamp_basis: "UTC", bars }) };
};
const invalid = await adapter.mt5ThreeYearHistory("XAUUSD", "M30", Date.parse("2026-01-01T00:30:00Z"));
assert.equal(invalid.complete, false);
assert.equal(invalid.reason, "HISTORY_SERVER_TIMEZONE_MISMATCH");
assert.equal(invalid.cachePersisted, false);
assert.equal(values.size, 0, "invalid fresh timezone provenance must never seed a cache");
console.log("MT5 HISTORY FRESH TIMEZONE PASS: invalid bridge timezone markers fail closed and remain uncached.");

