import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  key: (index) => [...values.keys()][index] ?? null,
  get length() { return values.size; },
};
globalThis.window = { dispatchEvent() {} };

const connectionBundle = await build({ entryPoints: ["src/lib/mt5Connection.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const connection = await import("data:text/javascript;base64," + Buffer.from(connectionBundle.outputFiles[0].text).toString("base64"));
connection.observeTerminalAccount({ connected: true, account_id: "100", account_kind: "DEMO", server: "Broker-A", generation: 11, trade_allowed: false });
assert.equal(values.get("mfe_mt5_account_namespace"), "100|Broker-A|11");
assert.equal(values.get("mfe_mt5_account_kind"), "DEMO");
assert.equal(connection.terminalCacheScope(), "100|Broker-A|11", "complete terminal identity must provide a reusable cache scope");
// A terminal can switch Demo/Real mode without changing login, server or SDK
// generation. That mode transition is still a cache-identity boundary.
values.set("mfe_mt5_history_v5_mode_switch_XAUUSD_M5", "stale");
values.set("mfe_live_ext_mode_switch_XAUUSD_M5", "stale");
connection.observeTerminalAccount({ connected: true, account_id: "100", account_kind: "REAL", server: "Broker-A", generation: 11, trade_allowed: false });
assert.equal(values.get("mfe_mt5_account_namespace"), "100|Broker-A|11");
assert.equal(values.get("mfe_mt5_account_kind"), "REAL");
assert.equal(values.has("mfe_mt5_history_v5_mode_switch_XAUUSD_M5"), false, "Demo/Real mode transitions must purge persisted history");
assert.equal(values.has("mfe_live_ext_mode_switch_XAUUSD_M5"), false, "Demo/Real mode transitions must purge persisted live extensions");
values.set("mfe_mt5_history_v5_unknown_mode_XAUUSD_M5", "stale");
connection.observeTerminalAccount({ connected: true, account_id: "100", account_kind: "UNKNOWN", server: "Broker-A", generation: 11, trade_allowed: false });
assert.equal(values.has("mfe_mt5_history_v5_unknown_mode_XAUUSD_M5"), false, "known-to-unknown account transitions must purge persisted history");
assert.equal(values.get("mfe_mt5_account_kind"), "UNKNOWN", "unknown account kind must replace a stale Demo/Real marker");
// Persisted markers can be edited or copied with surrounding whitespace. The
// adapter should reuse the same normalized scope, while control characters
// remain fail-closed instead of becoming a second durable namespace.
values.set("mfe_mt5_account_namespace", " 100 | Broker-A | 011 ");
assert.equal(connection.terminalCacheScope(), "100|Broker-A|11", "equivalent persisted identity markers normalize to one cache scope");
values.set("mfe_mt5_account_namespace", "100|Broker-A\u000011");
assert.equal(connection.terminalCacheScope(), "detached", "control characters in persisted identity must collapse to detached scope");
values.set("mfe_mt5_account_namespace", "100|Broker-A|11");
values.set("mfe_mt5_history_v3_old_scope_XAUUSD_H1_1_2", "stale");
values.set("mfe_live_ext_old_scope_XAUUSD_H1", "stale");
// A fresh browser/runtime loses the in-memory accountKey but retains the
// persisted namespace. The first account observation after restart must still
// purge old terminal chunks before adopting the new identity.
const restartedConnection = await import("data:text/javascript;base64," + Buffer.from(connectionBundle.outputFiles[0].text).toString("base64") + "#runtime-restart");
restartedConnection.observeTerminalAccount({ connected: true, account_id: "200", account_kind: "DEMO", server: "Broker-B", generation: 22, trade_allowed: false });
assert.equal(values.get("mfe_mt5_account_namespace"), "200|Broker-B|22");
assert.equal(values.has("mfe_mt5_history_v3_old_scope_XAUUSD_H1_1_2"), false, "restart account transitions must purge orphaned serialized history chunks");
assert.equal(values.has("mfe_live_ext_old_scope_XAUUSD_H1"), false, "restart account transitions must purge orphaned live extensions");
connection.observeTerminalAccount({ connected: true, account_id: "200", account_kind: "DEMO", server: "Broker-B", generation: 22, trade_allowed: false });
assert.equal(values.get("mfe_mt5_account_namespace"), "200|Broker-B|22");
assert.equal(values.has("mfe_mt5_history_v3_old_scope_XAUUSD_H1_1_2"), false, "account transitions must purge obsolete serialized history chunks");
connection.observeTerminalAccount({ connected: false, account_kind: "UNKNOWN", trade_allowed: false });
assert.equal(values.has("mfe_mt5_account_namespace"), false, "detached terminals must clear the active cache namespace");
// A bridge response that claims connected without a complete identity must
// fail closed. Persisting an interpolated undefined account key could make a
// later reconnect reuse history from an unrelated terminal.
connection.observeTerminalAccount({ connected: true, account_kind: "DEMO", trade_allowed: false, generation: 23 });
assert.equal(values.has("mfe_mt5_account_namespace"), false, "incomplete connected identity must not create a cache namespace");
assert.equal(connection.terminalCacheScope(), "detached", "incomplete identity must collapse to detached cache scope");

const adapterBundle = await build({ entryPoints: ["src/lib/mt5DemoAdapter.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const adapter = await import("data:text/javascript;base64," + Buffer.from(adapterBundle.outputFiles[0].text).toString("base64"));
const now = Date.parse("2026-01-01T00:30:00Z");
let fetches = 0;
globalThis.fetch = async (input) => {
  fetches++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
values.set("mfe_mt5_account_namespace", "|Broker-A|11");
const malformedNamespace = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(malformedNamespace.cachedChunks, 0, "malformed persisted identity must never reuse history chunks");
for (const key of [...values.keys()]) if (key.startsWith("mfe_mt5_history_")) values.delete(key);
values.set("mfe_mt5_account_namespace", "100|Broker-A|11");
const first = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(first.complete, true);
assert.equal(first.cachedChunks, 0);
assert.equal(first.cacheNamespace, "100|Broker-A|11", "history diagnostics must expose the namespace captured for the fetch");
assert.equal(first.cacheScope, first.cacheNamespace, "history diagnostics must expose the normalized cache scope");
assert.equal(first.activeCacheScope, first.activeCacheNamespace);
assert.equal(first.activeCacheNamespace, first.cacheNamespace);
assert.equal(first.namespaceChanged, false);
const firstFetches = fetches;
values.set("mfe_mt5_account_namespace", "200|Broker-B|22");
const switched = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(switched.complete, true);
assert.equal(switched.cachedChunks, 0, "a different account/server/generation must not reuse another account's chunks");
assert.equal(fetches, firstFetches + 1);
values.delete("mfe_mt5_account_namespace");
const detached = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(detached.cachedChunks, 0, "detached namespace must not reuse account-scoped chunks");
assert.equal(fetches, firstFetches + 2);
assert.ok([...values.keys()].some((key) => key.includes("detached")), "detached fetch may persist only its own new scope");
assert.ok([...values.keys()].filter((key) => key.startsWith("mfe_mt5_history_")).length <= detached.chunks, "detached fetch must purge prior account-scoped ranges before writing");

// A reconnect can race an in-flight range request. The whole request must stay
// in its original scope and fail closed instead of writing mixed-account bars.
for (const key of [...values.keys()]) if (key.startsWith("mfe_mt5_history_")) values.delete(key);
values.set("mfe_mt5_account_namespace", "100|Broker-A|11");
let flipped = false;
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  if (!flipped) { flipped = true; values.set("mfe_mt5_account_namespace", "200|Broker-B|22"); }
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const raced = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(raced.complete, false);
assert.equal(raced.reason, "HISTORY_ACCOUNT_CHANGED");
assert.equal(raced.cachePersisted, false);
assert.equal(raced.cacheNamespace, "100|Broker-A|11");
assert.equal(raced.activeCacheNamespace, "200|Broker-B|22");
assert.equal(raced.namespaceChanged, true, "a namespace race must remain visible in the returned diagnostics");
assert.equal([...values.keys()].some((key) => key.startsWith("mfe_mt5_history_")), false, "mixed-account fetch must remove chunks written before the transition");

// The reverse transition is also unsafe: a detached request can reconnect to
// an account while its first range is in flight. No detached chunk may survive
// that race or be promoted on restart.
values.delete("mfe_mt5_account_namespace");
let detachedFlipped = false;
globalThis.fetch = async (input) => {
  if (!detachedFlipped) { detachedFlipped = true; values.set("mfe_mt5_account_namespace", "300|Broker-C|33"); }
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const detachedRace = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(detachedRace.complete, false);
assert.equal(detachedRace.reason, "HISTORY_ACCOUNT_CHANGED");
assert.equal(detachedRace.cachePersisted, false);
assert.equal([...values.keys()].some((key) => key.startsWith("mfe_mt5_history_")), false, "detached-to-account race must leave no chunks");

// Namespace changes can occur after several cached ranges were read. Those
// cache hits must be removed too; otherwise a later reconnect can reuse stale
// old-account ranges around the failed fetch.
values.set("mfe_mt5_account_namespace", "100|Broker-A|11");
let seedCalls = 0;
globalThis.fetch = async (input) => {
  seedCalls++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const seeded = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(seeded.complete, true);
const oneKey = [...values.keys()].find((key) => key.startsWith("mfe_mt5_history_"));
values.delete(oneKey);
globalThis.fetch = async (input) => {
  values.set("mfe_mt5_account_namespace", "200|Broker-B|22");
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const hitRace = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(hitRace.complete, false);
assert.equal(hitRace.reason, "HISTORY_ACCOUNT_CHANGED");
assert.equal([...values.keys()].some((key) => key.startsWith("mfe_mt5_history_")), false, "namespace race must remove cache-hit ranges too");
console.log("MT5 ACCOUNT CACHE ISOLATION PASS: observe/detach namespace transitions invalidate account-scoped history reuse.");
