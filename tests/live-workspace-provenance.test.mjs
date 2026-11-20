import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: ["src/lib/liveWorkspaceQuery.ts"], absWorkingDir: app,
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const clock = Date.parse("2026-01-01T01:00:00Z");
assert.equal(api.liveBundleRefreshDue(clock - 5_000, true, clock), false, "recent bundle may be reused");
assert.equal(api.liveBundleRefreshDue(clock - 15_000, true, clock), true, "expired bundle must refresh");
assert.equal(api.liveBundleRefreshDue(clock + 1, true, clock), true, "future-dated bundle must refresh after clock rollback");
assert.equal(api.liveBundleRefreshDue(undefined, true, clock), true, "un-timestamped bundle must refresh");

const checkedAt = Date.parse("2026-01-01T01:00:00Z");
const bar = (t, c = 1) => ({ i: 0, o: c, h: c + 1, l: c - 1, c, r: "N", t });
const previous = {
  ok: true, symbol: "XAUUSD", broker_symbol: "GOLD", timeframe: "M5",
  source: "MT5_CLOSED_BARS", closed_bar_provenance: "MT5_CLOSED_BARS",
  forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC",
  authority: "SHADOW_ONLY", decision: "NO_DECISION", live_apply_allowed: false, read_only: true,
  account: { connected: true, account_kind: "DEMO", trade_allowed: false },
  advice: { ok: false, source: "NONE" }, bars: [bar("2026-01-01T00:50:00Z")],
};
const valid = {
  ok: true, symbol: "XAUUSD", broker_symbol: "GOLD", timeframe: "M5",
  source: "MT5_CLOSED_BARS", closed_bar_provenance: "MT5_CLOSED_BARS",
  forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC",
  authority: "SHADOW_ONLY", decision: "NO_DECISION", live_apply_allowed: false, read_only: true,
  bars: [bar("2026-01-01T00:55:00Z", 2)], retrieved_at: "2026-01-01T01:00:00.000Z",
  latest_closed_bar_age_seconds: 0,
};

assert.equal(api.mergeVerifiedLiveBars(previous, { ...valid, symbol: "EURUSD" }, "XAUUSD", "M5", checkedAt), null,
  "a wrong-symbol /bars response must not inherit the previous bundle identity");
assert.equal(api.mergeVerifiedLiveBars(previous, { ...valid, timeframe: "H1" }, "XAUUSD", "M5", checkedAt), null,
  "a wrong-timeframe /bars response must not inherit the previous bundle identity");
assert.equal(api.mergeVerifiedLiveBars(previous, { ...valid, closed_bar_provenance: undefined }, "XAUUSD", "M5", checkedAt), null,
  "an unattested /bars response must clear the live surface");
const merged = api.mergeVerifiedLiveBars(previous, valid, "XAUUSD", "M5", checkedAt);
assert.ok(merged, "a self-attested closed-bar response should merge");
assert.equal(merged.bars[0].c, 2);
assert.equal(merged.symbol, "XAUUSD");
assert.equal(merged.timeframe, "M5");
assert.equal(merged.closed_bar_provenance, "MT5_CLOSED_BARS");
assert.equal(merged.advice.source, "NONE", "merge keeps the prior descriptive advisory bundle without creating execution authority");
console.log("LIVE WORKSPACE PROVENANCE PASS: /bars refreshes cannot inherit stale symbol/timeframe or closed-bar attestations.");
