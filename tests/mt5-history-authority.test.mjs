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
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, authority: "LIVE", read_only: false, bars }) };
};

const result = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", Date.parse("2026-01-01T00:30:00Z"));
assert.equal(result.complete, false);
assert.equal(result.reason, "HISTORY_AUTHORITY_MISMATCH");
assert.ok(result.failedChunks?.every((chunk) => chunk.reason === "HISTORY_AUTHORITY_MISMATCH"));
assert.equal(result.cachePersisted, false);
assert.equal(values.size, 0, "non-shadow history must never seed a cache");
console.log("MT5 HISTORY AUTHORITY PASS: explicit live authority fails closed and remains uncached.");

// Decision/live-apply markers are independent authority escalations.  They
// must be rejected even when the source still claims SHADOW_ONLY.
for (const marker of [{ decision: "LONG" }, { live_apply_allowed: true }]) {
  values.clear();
  globalThis.fetch = async (input) => {
    const query = new URL(String(input), "http://localhost").searchParams;
    const from = Date.parse(query.get("from"));
    const to = Date.parse(query.get("to"));
    const bars = [];
    for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
    return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", authority: "SHADOW_ONLY", read_only: true, ...marker, bars }) };
  };
  const unsafe = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", Date.parse("2026-01-01T00:30:00Z"));
  assert.equal(unsafe.complete, false);
  assert.equal(unsafe.reason, "HISTORY_AUTHORITY_MISMATCH");
  assert.equal(unsafe.cachePersisted, false);
  assert.equal(values.size, 0);
}
console.log("MT5 HISTORY ESCALATION PASS: decision/live-apply markers remain fail closed.");

// A valid first chunk followed by a live-authority response must remove the
// first chunk as well; otherwise a restart could stitch unsafe partial state.
values.clear();
let mixedCalls = 0;
globalThis.fetch = async (input) => {
  mixedCalls++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  const authority = mixedCalls === 1 ? { authority: "SHADOW_ONLY", read_only: true } : { authority: "LIVE", read_only: false };
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", ...authority, bars }) };
};
const mixed = await adapter.mt5ThreeYearHistory("XAUUSD", "M5", Date.parse("2026-01-01T00:30:00Z"));
assert.equal(mixed.complete, false);
assert.equal(mixed.reason, "HISTORY_AUTHORITY_MISMATCH");
assert.equal(mixed.cachePersisted, false);
assert.equal(values.size, 0, "earlier valid chunks must be removed after a later metadata failure");
console.log("MT5 HISTORY PARTIAL CLEANUP PASS: mixed authority fetches leave no persisted chunks.");
