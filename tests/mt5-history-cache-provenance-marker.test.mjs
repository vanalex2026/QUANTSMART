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
// Use an attached namespace so the migration fixture is not purged by the
// detached-scope safeguard before the versioned cache key is checked.
values.set("mfe_mt5_account_namespace", "100|Broker-A|1");
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

const now = Date.parse("2026-01-01T00:30:00Z");
const seeded = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(seeded.complete, true);
const key = [...values.keys()].find((candidate) => candidate.startsWith("mfe_mt5_history_v6_"));
assert.ok(key, "seeded history must persist a v6 cache chunk");
// v5 chunks predate required raw symbol/timeframe attestation. They only
// retained the requested symbol, so v6 must refetch rather than promote them.
const legacyKey = key.replace("_v6_", "_v5_");
const legacyPayload = JSON.parse(values.get(key));
delete legacyPayload.timeframe;
values.set(legacyKey, JSON.stringify(legacyPayload));
values.delete(key);
const beforeMigration = calls;
const migrated = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(migrated.complete, true);
assert.equal(migrated.cachedChunks, seeded.chunks - 1, "a v5 chunk must not be promoted by the v6 reader");
assert.equal(calls, beforeMigration + 1, "a legacy v5 chunk must trigger an authoritative range request");
console.log("MT5 HISTORY CACHE VERSION PASS: v5 chunks are ignored after the identity-contract bump.");

// The current namespace also retains the exact timeframe in the payload, so
// moving a valid chunk under another key cannot grant a missing attestation.
for (const timeframe of [undefined, "M5"]) {
  const missingIdentity = JSON.parse(values.get(key));
  missingIdentity.timeframe = timeframe;
  values.set(key, JSON.stringify(missingIdentity));
  const beforeIdentity = calls;
  const identityRefetched = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
  assert.equal(identityRefetched.complete, true);
  assert.equal(identityRefetched.cachedChunks, seeded.chunks - 1);
  assert.equal(calls, beforeIdentity + 1, "missing or mismatched cached timeframe must trigger a range request");
  assert.equal(JSON.parse(values.get(key)).timeframe, "H1");
}
console.log("MT5 HISTORY CACHE IDENTITY PASS: missing/mismatched cached timeframe is refetched.");

const poisoned = JSON.parse(values.get(key));
assert.equal(poisoned.source, "MT5_HISTORY");
assert.equal(poisoned.closed_bar_provenance, "MT5_CLOSED_BARS");
assert.equal(poisoned.forming_bar_included, false);
poisoned.forming_bar_included = true;
values.set(key, JSON.stringify(poisoned));
const before = calls;
const refreshed = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(refreshed.complete, true);
assert.equal(refreshed.cachedChunks, seeded.chunks - 1, "a cache marker claiming a forming bar must be refetched");
assert.equal(calls, before + 1, "poisoned provenance must trigger an authoritative range request");
console.log("MT5 HISTORY CACHE PROVENANCE PASS: restart cache rejects forming-bar provenance markers.");

// A restart cache must carry the explicit closed-bar marker independently of
// its source label. Deleting only the provenance attestation must force an
// authoritative refetch instead of trusting a legacy/source-only chunk.
const missingMarker = JSON.parse(values.get(key));
delete missingMarker.closed_bar_provenance;
values.set(key, JSON.stringify(missingMarker));
const beforeMissingMarker = calls;
const missingMarkerReread = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(missingMarkerReread.complete, true);
assert.equal(missingMarkerReread.cachedChunks, seeded.chunks - 1, "missing closed-bar marker must force a cache miss");
assert.equal(calls, beforeMissingMarker + 1, "source-only restart chunks must be refetched");
console.log("MT5 HISTORY CACHE STRICT MARKER PASS: restart cache rejects source-only chunks without closed-bar attestation.");
