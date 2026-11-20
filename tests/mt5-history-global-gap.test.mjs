import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Endpoint-contract fixture: each chunk is individually inside the seven-day
// holiday allowance, but adjacent chunks leave a larger gap at their boundary.
// The merged-tape invariant must keep this response partial.
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/mt5DemoAdapter.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const adapter = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
const timeframeMs = 5 * 60 * 1000;
const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
const now = Date.parse("2026-01-01T00:30:00Z");
let requests = 0;
globalThis.fetch = async (input) => {
  requests++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const firstStart = from + sevenDaysMs;
  const lastStart = to - sevenDaysMs;
  const bars = [];
  const timestamps = new Set();
  const add = (stamp) => { if (timestamps.has(stamp)) return; timestamps.add(stamp); bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" }); };
  for (let stamp = firstStart; stamp < firstStart + 500 * timeframeMs; stamp += timeframeMs) add(stamp);
  for (let stamp = firstStart + 500 * timeframeMs + sixDaysMs; stamp + sixDaysMs < lastStart; stamp += sixDaysMs) add(stamp);
  add(lastStart - sixDaysMs);
  for (let stamp = lastStart; stamp < lastStart + 500 * timeframeMs; stamp += timeframeMs) add(stamp);
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};

const result = await adapter.mt5ThreeYearHistory("XAUUSD", "M5", now);
assert.ok(requests > 1, "fixture must span multiple M5 chunks");
assert.equal(result.ok, true, "partial history still returns its available bars");
assert.equal(result.complete, false, "cross-chunk gap must fail closed");
assert.equal(result.reason, "HISTORY_INTERNAL_GAP");
assert.equal(result.failedChunks?.length, 0, "each chunk is locally complete; global gap is the failure");
assert.ok(result.coverageRanges?.every((range) => range.complete), "local chunk coverage remains valid");
assert.equal(result.cachePersisted, false, "a globally incomplete tape must not leave chunks cached");
assert.equal(values.size, 0, "chunks from a globally incomplete tape must be invalidated");
console.log("MT5 HISTORY GLOBAL GAP PASS: cross-chunk omissions cannot be promoted to complete history.");
