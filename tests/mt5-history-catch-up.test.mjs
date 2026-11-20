import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/mt5HistoryCatchUp.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const values = new Map([["mfe_mt5_account_namespace", "100|Broker-A|1"]]);
globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key), get length() { return values.size; }, key: (i) => [...values.keys()][i] ?? null };
const previous = [{ i: 0, t: "2026-01-01T00:00:00Z", o: 1, h: 2, l: 0, c: 1, r: "N" }];
const now = Date.parse("2026-01-01T03:00:00Z");
let requested;
let responseCoverage = "COMPLETE";
globalThis.fetch = async (input) => {
  requested = new URL(String(input), "http://localhost");
  return { json: async () => ({ ok: true, symbol: "XAUUSD", timeframe: "H1", source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", authority: "SHADOW_ONLY", decision: "NO_DECISION", live_apply_allowed: false, read_only: true, coverage_status: responseCoverage, bars: [
    { i: 0, t: "2026-01-01T01:00:00Z", o: 1, h: 2, l: 0, c: 1, r: "N" },
    { i: 1, t: "2026-01-01T02:00:00Z", o: 1, h: 2, l: 0, c: 1, r: "N" },
  ] }) };
};
const healed = await api.catchUpMt5History("XAUUSD", "H1", previous, { now });
assert.equal(healed.complete, true);
assert.equal(healed.bars.length, 3);
assert.equal(requested.searchParams.get("from"), "2026-01-01T00:00:00.000Z");
assert.equal(requested.searchParams.get("to"), "2026-01-01T03:00:00.000Z");
assert.equal(healed.provenance.coverageStatus, "COMPLETE");
responseCoverage = "PARTIAL";
const partial = await api.catchUpMt5History("XAUUSD", "H1", previous, { now });
assert.equal(partial.complete, false);
assert.equal(partial.reason, "HISTORY_PARTIAL_CHUNKS");
values.set("mfe_mt5_account_namespace", "200|Broker-B|2");
const switched = await api.catchUpMt5History("XAUUSD", "H1", previous, { now, namespace: "100|Broker-A|1" });
assert.equal(switched.complete, false);
assert.equal(switched.reason, "HISTORY_ACCOUNT_CHANGED");
console.log("MT5 HISTORY CATCH-UP PASS: saved gaps request the full closed range and reconnect scope fails closed.");
