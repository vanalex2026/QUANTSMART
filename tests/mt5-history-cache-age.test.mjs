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
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};

const seeded = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(seeded.complete, true);
const seedFetches = fetches;
const warm = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(warm.cachedChunks, seeded.chunks, "a validated restart cache should be reused");
assert.ok(warm.coverageRanges?.filter((range) => range.cache === "HIT").every((range) => Number.isFinite(range.cacheAgeMs) && range.cacheAgeMs >= 0), "cache-hit provenance must expose a non-negative validated age");
assert.ok(Number.isFinite(warm.oldestCacheAgeMs) && warm.oldestCacheAgeMs >= 0, "assembled history must expose the oldest validated cache age");
assert.equal(seeded.oldestCacheAgeMs, undefined, "a bridge-only fetch has no cache age");
assert.equal(fetches, seedFetches, "a fresh cache hit must not call the bridge");
const firstKey = values.keys().next().value;
const stale = JSON.parse(values.get(firstKey));
stale.savedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
values.set(firstKey, JSON.stringify(stale));

const refreshed = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(refreshed.complete, true);
assert.equal(refreshed.cachedChunks, seeded.chunks - 1, "expired persisted chunks must be refetched");
assert.equal(fetches, seedFetches + 1, "cache age expiry must trigger one bridge request");

const future = JSON.parse(values.get(firstKey));
future.savedAt = new Date(Date.now() + 6 * 60 * 1000).toISOString();
values.set(firstKey, JSON.stringify(future));
const futureRefreshed = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(futureRefreshed.cachedChunks, seeded.chunks - 1, "future-dated cache metadata must fail closed");
console.log("MT5 HISTORY CACHE AGE PASS: stale and future-dated restart entries are refetched.");
