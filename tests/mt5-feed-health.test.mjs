import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: ["src/lib/mt5DemoAdapter.ts"], absWorkingDir: app, bundle: true,
  platform: "node", format: "esm", write: false, logLevel: "silent",
});
const adapter = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const account = { connected: true, account_kind: "DEMO", trade_allowed: false };
const now = Date.parse("2026-01-01T01:00:00Z");
const bars = (time = "2026-01-01T00:55:00Z") => ({
  ok: true, timeframe: "M5", source: "MT5_CLOSED_BARS", broker_symbol: "GOLD.i#",
  closed_bar_provenance: "MT5_CLOSED_BARS",
  bars: [{ i: 0, o: 1, h: 2, l: 0, c: 1, r: "N", t: time }],
});

assert.equal(adapter.classifyMt5Feed({ offline: true, error: "FETCH_FAILED" }, bars(), "XAUUSD", "M5", { now }).state, "OFFLINE");
assert.equal(adapter.classifyMt5Feed(account, { ...bars(), reason: "SYMBOL_NOT_FOUND", bars: [] }, "XAUUSD", "M5", { now }).state, "SYMBOL_NOT_FOUND");
assert.equal(adapter.classifyMt5Feed(account, bars("2025-12-31T00:00:00Z"), "XAUUSD", "M5", { now }).state, "STALE");
const healthy = adapter.classifyMt5Feed(account, bars(), "XAUUSD", "M5", { now });
assert.equal(healthy.state, "CONNECTED_CLOSED_BARS");
assert.equal(healthy.ok, true);
assert.equal(healthy.readOnly, true);
assert.equal(healthy.brokerSymbol, "GOLD.i#");
const missingProvenance = adapter.classifyMt5Feed(account, { ...bars(), source: undefined }, "XAUUSD", "M5", { now });
assert.equal(missingProvenance.state, "STALE");
assert.equal(missingProvenance.ok, false);
assert.equal(missingProvenance.reason, "CLOSED_BARS_REQUIRED");
const missingTimeframe = adapter.classifyMt5Feed(account, { ...bars(), timeframe: undefined }, "XAUUSD", "M5", { now });
assert.equal(missingTimeframe.state, "STALE");
assert.equal(missingTimeframe.reason, "TIMEFRAME_MISMATCH");
// Diagnostic rows on an unsuccessful bridge response are never a healthy
// feed. They may be useful for troubleshooting, but cannot extend a cached
// closed-bar tape after restart.
const failedWithRows = adapter.classifyMt5Feed(account, { ...bars(), ok: false, reason: "HISTORY_UNAVAILABLE" }, "XAUUSD", "M5", { now });
assert.equal(failedWithRows.state, "STALE");
assert.equal(failedWithRows.ok, false);
assert.equal(failedWithRows.reason, "HISTORY_UNAVAILABLE");
const h1Rollover = adapter.classifyMt5Feed(account, { ...bars("2026-01-01T00:00:00Z"), timeframe: "H1" }, "XAUUSD", "H1", { now });
assert.equal(h1Rollover.state, "CONNECTED_CLOSED_BARS", "a just-closed H1 candle must remain usable at the hour rollover");
assert.equal(h1Rollover.ageMs, 0, "freshness age must begin at candle close, not candle open");
const m30Rollover = adapter.classifyMt5Feed(account, { ...bars("2026-01-01T00:30:00Z"), timeframe: "M30" }, "XAUUSD", "M30", { now: Date.parse("2026-01-01T01:00:00Z") });
assert.equal(m30Rollover.state, "CONNECTED_CLOSED_BARS", "a just-closed M30 candle must remain usable at the half-hour rollover");
assert.equal(m30Rollover.ageMs, 0);
console.log("MT5 FEED HEALTH PASS: offline, stale, symbol-not-found, and connected closed bars are typed without credentials.");
