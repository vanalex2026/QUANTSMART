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

const valid = {
  ok: true, complete: true, bars: [{ i: 0, t: "2026-01-01T00:00:00Z", o: 1, h: 2, l: 0, c: 1 }],
  source: "MT5_HISTORY_3Y", symbol: "XAUUSD", timeframe: "M5", closed_bar_provenance: "MT5_CLOSED_BARS", closedBarProvenance: "MT5_CLOSED_BARS", forming_bar_included: false,
  timestamp_basis: "UTC", server_timezone: "UTC", contract_version: 2, authority: "SHADOW_ONLY", decision: "NO_DECISION", live_apply_allowed: false, read_only: true,
  namespaceChanged: false, cacheNamespace: "218692591|Exness-MT5Real29|612141294", activeCacheNamespace: "218692591|Exness-MT5Real29|612141294",
  coverageRanges: [{ complete: true, source: "MT5_HISTORY", closedBarProvenance: "MT5_CLOSED_BARS", timestampBasis: "UTC", serverTimezone: "UTC" }],
};

values.set("mfe_mt5_account_namespace", valid.cacheNamespace);
assert.equal(adapter.isVerifiedClosedBarHistory(valid, "XAUUSD", "M5"), true);
values.set("mfe_mt5_account_namespace", "other-account|Other-Server|99");
assert.equal(adapter.isVerifiedClosedBarHistory(valid, "XAUUSD", "M5"), false, "a reconnect after fetch completion must block promotion of the old namespace");
values.set("mfe_mt5_account_namespace", valid.cacheNamespace);
for (const [key, value] of [["contract_version", 1], ["timestamp_basis", "LOCAL"], ["server_timezone", "UTC+8"], ["authority", "LIVE"], ["decision", "BUY"], ["live_apply_allowed", true], ["activeCacheNamespace", "detached"], ["complete", false]]) {
  assert.equal(adapter.isVerifiedClosedBarHistory({ ...valid, [key]: value }, "XAUUSD", "M5"), false, `${key} must fail the focused promotion gate`);
}
assert.equal(adapter.isVerifiedClosedBarHistory({ ...valid, coverageRanges: [{ ...valid.coverageRanges[0], complete: false }] }, "XAUUSD", "M5"), false);
// A forged aggregate can carry individually valid IANA zones while mixing
// broker-local clocks across chunks. Promotion must require every range to
// match the top-level attestation (the fetch path rejects this combination).
assert.equal(adapter.isVerifiedClosedBarHistory({ ...valid, coverageRanges: [{ ...valid.coverageRanges[0], serverTimezone: "America/New_York" }] }, "XAUUSD", "M5"), false, "mixed per-range timezone provenance must fail the promotion gate");
for (const [label, bars] of [
  ["off-grid timestamp", [{ ...valid.bars[0], t: "2026-01-01T00:01:00Z" }]],
  ["duplicate UTC identity", [valid.bars[0], { ...valid.bars[0], i: 1 }]],
  ["malformed timestamp", [{ ...valid.bars[0], t: "2026-01-01T00:00:00+00:00" }]],
  ["invalid OHLC geometry", [{ ...valid.bars[0], h: 0 }]],
]) {
  assert.equal(adapter.isVerifiedClosedBarHistory({ ...valid, bars }, "XAUUSD", "M5"), false, `${label} must fail the public promotion gate`);
}
console.log("MT5 HISTORY PROMOTION GATE PASS: focused chart promotion requires complete, UTC, closed, shadow-only, account-scoped provenance.");
