import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

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
const now = Date.parse("2026-01-01T00:30:00Z");
let calls = 0;
globalThis.fetch = async (input) => {
  calls++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 6 * 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};

const seeded = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(seeded.complete, true);
const key = values.keys().next().value;
const poisoned = JSON.parse(values.get(key));
poisoned.server_timezone = { zone: "UTC" };
values.set(key, JSON.stringify(poisoned));
const before = calls;
const reread = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(reread.complete, true);
assert.equal(reread.cachedChunks, seeded.chunks - 1, "malformed timezone metadata must force a cache miss");
assert.equal(calls, before + 1, "the malformed chunk must be refetched");

// A non-empty but invalid IANA identifier is also poisoned provenance and must
// not survive a restart as a trusted cache marker.
const invalid = JSON.parse(values.get(key));
invalid.server_timezone = "Mars/Nowhere";
values.set(key, JSON.stringify(invalid));
const beforeInvalid = calls;
const invalidReread = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(invalidReread.complete, true);
assert.equal(invalidReread.cachedChunks, seeded.chunks - 1);
assert.equal(calls, beforeInvalid + 1, "invalid timezone identifiers must force a cache miss");
console.log("MT5 HISTORY CACHE TIMEZONE MARKER PASS: malformed persisted timezone provenance is refetched.");
