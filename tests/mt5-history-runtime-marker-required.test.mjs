import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Endpoint-contract fixture: syntactically valid rows without runtime clock
// attestations must never become complete or durable history evidence.
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
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 6 * 60 * 60 * 1000) {
    bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  }
  // Source and closed-bar markers alone cannot prove broker-local epoch
  // normalization. Both runtime markers are intentionally omitted here.
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, bars }) };
};

const result = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", Date.parse("2026-01-01T00:30:00Z"));
assert.equal(result.complete, false);
assert.equal(result.reason, "HISTORY_SERVER_TIMEZONE_MISMATCH");
assert.ok(result.failedChunks?.length);
assert.ok(result.failedChunks.every((chunk) => chunk.reason === "HISTORY_SERVER_TIMEZONE_MISMATCH"));
assert.equal(result.provenanceSummary.serverTimezoneCounts.UNATTESTED, result.chunks);
assert.equal(result.provenanceSummary.timestampBasisCounts.UNATTESTED, result.chunks);
assert.equal(result.cachePersisted, false);
assert.equal(values.size, 0, "unattested runtime clocks must never seed a restart cache");
console.log("MT5 HISTORY RUNTIME MARKER PASS: missing timezone/timestamp attestations fail closed and remain uncached.");
