import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/mt5DemoAdapter.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const adapter = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const account = { connected: true, account_kind: "DEMO", trade_allowed: false };
const now = Date.parse("2026-01-01T01:00:00Z");
const closed = { ok: true, timeframe: "M5", source: "MT5_CLOSED_BARS", closed_bar_provenance: "MT5_CLOSED_BARS", authority: "SHADOW_ONLY", decision: "NO_DECISION", live_apply_allowed: false, read_only: true, bars: [{ i: 0, o: 1, h: 2, l: 0, c: 1, r: "N", t: "2026-01-01T00:55:00Z" }] };
assert.equal(adapter.isVerifiedClosedBarWindow(closed, "M5", now), true);
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, timeframe: undefined }, "M5", now), false);
// Broker-local session grids may be offset from UTC by 30 minutes. Adelaide's
// 11:00 local H1 candle is 00:30Z during DST and remains a valid closed bar.
const adelaide = { ...closed, timeframe: "H1", server_timezone: "Australia/Adelaide", bars: [{ ...closed.bars[0], t: "2026-01-01T00:30:00Z" }] };
assert.equal(adapter.isVerifiedClosedBarWindow(adelaide, "H1", Date.parse("2026-01-01T02:00:00Z")), true);
// A valid-looking tail from another timeframe must not be accepted merely
// because its timestamps happen to align with the requested grid.
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, timeframe: "M15" }, "M5", now), false);
// A source label alone is insufficient after a runtime/browser restart. The
// bridge must explicitly attest that every row came from the closed-bar tape;
// otherwise a legacy response could silently extend the research cache.
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, closed_bar_provenance: undefined }, "M5", now), false);
// The live-tail helper is also used by connection health and bundle refreshes;
// an omitted or contradictory authority marker must never inherit prior
// metadata and appear as a trusted read-only feed.
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, authority: undefined }, "M5", now), false);
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, decision: undefined }, "M5", now), false);
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, live_apply_allowed: true }, "M5", now), false);
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, read_only: false }, "M5", now), false);
// The provenance gate applies consistently to every Atlas timeframe, while
// retaining each timeframe's own closed-bucket alignment.
for (const [tf, step] of Object.entries({ M5: 5, M15: 15, M30: 30, H1: 60 })) {
  const stamp = new Date(Math.floor(now / (step * 60_000)) * step * 60_000 - step * 60_000).toISOString();
  const frame = { ...closed, timeframe: tf, bars: [{ ...closed.bars[0], t: stamp }] };
  assert.equal(adapter.isVerifiedClosedBarWindow(frame, tf, now), true, `${tf} closed marker should verify`);
  assert.equal(adapter.isVerifiedClosedBarWindow({ ...frame, closed_bar_provenance: undefined }, tf, now), false, `${tf} missing marker should fail closed`);
}
// A bridge error may carry diagnostic bars; an unsuccessful response must
// never be promoted into the cached closed-bar research tape.
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, ok: false, reason: "HISTORY_UNAVAILABLE" }, "M5", now), false);
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, forming_bar_included: true }, "M5", now), false);
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, timestamp_basis: "BROKER_LOCAL" }, "M5", now), false);
// A malformed terminal timezone is provenance corruption even when the rows
// are otherwise aligned and explicitly marked as closed bars. It must not be
// merged into the restart/live-tail tape.
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, server_timezone: "UTC+8" }, "M5", now), false);
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, bars: [{ ...closed.bars[0], t: "2026-01-01T00:56:00Z" }] }, "M5", now), false);
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, bars: [{ ...closed.bars[0], t: "2026-01-01T01:00:00Z" }] }, "M5", now), false);
assert.equal(adapter.isVerifiedClosedBarWindow({ ...closed, bars: [{ ...closed.bars[0], t: "2026-01-01T00:55:00+00:00" }] }, "M5", now), false);
// Pattern Atlas closed-bar tails are intentionally bounded to the broker
// history contract. An unknown frame must not fall back to a one-minute step
// and accidentally promote an M1/H4 payload into research evidence.
assert.equal(adapter.isVerifiedClosedBarWindow(closed, "M1", now), false);
assert.equal(adapter.isVerifiedClosedBarWindow(closed, "H4", now), false);
assert.equal(adapter.classifyMt5Feed(account, closed, "XAUUSD", "M5", { now }).state, "CONNECTED_CLOSED_BARS");
assert.equal(adapter.classifyMt5Feed(account, { ...closed, timeframe: "M15" }, "XAUUSD", "M5", { now }).reason, "TIMEFRAME_MISMATCH");
assert.equal(adapter.classifyMt5Feed(account, { ...closed, closed_bar_provenance: undefined }, "XAUUSD", "M5", { now }).reason, "CLOSED_BARS_REQUIRED");
assert.equal(adapter.classifyMt5Feed(account, { ...closed, forming_bar_included: true }, "XAUUSD", "M5", { now }).reason, "FORMING_BAR_INCLUDED");
assert.equal(adapter.classifyMt5Feed(account, { ...closed, timestamp_basis: "BROKER_LOCAL" }, "XAUUSD", "M5", { now }).reason, "TIMESTAMP_BASIS_MISMATCH");
assert.equal(adapter.classifyMt5Feed(account, { ...closed, server_timezone: "Mars/Nowhere" }, "XAUUSD", "M5", { now }).reason, "SERVER_TIMEZONE_MISMATCH");
assert.equal(adapter.classifyMt5Feed(account, { ...closed, bars: [{ ...closed.bars[0], t: "2026-01-01T00:56:00Z" }] }, "XAUUSD", "M5", { now }).reason, "INVALID_CLOSED_BAR");
assert.equal(adapter.classifyMt5Feed(account, { ...closed, bars: [{ ...closed.bars[0], t: "2026-01-01T01:00:00Z" }] }, "XAUUSD", "M5", { now }).reason, "INVALID_CLOSED_BAR");
assert.equal(adapter.classifyMt5Feed(account, { ...closed, bars: [null] }, "XAUUSD", "M5", { now }).reason, "INVALID_CLOSED_BAR");
assert.equal(adapter.classifyMt5Feed(account, { ...closed, bars: [closed.bars[0], { ...closed.bars[0], t: "2025-12-31T19:55:00-05:00" }] }, "XAUUSD", "M5", { now }).reason, "INVALID_CLOSED_BAR");

const values = new Map();
globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) {
    const iso = new Date(stamp).toISOString();
    bars.push({ i: bars.length, t: bars.length === 0 ? iso : iso.replace("Z", "+00:00"), o: 1, h: 2, l: 0, c: 1, r: "N" });
  }
  bars.splice(1, 0, { ...bars[0], i: 1, t: new Date(from).toISOString() });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const history = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", Date.parse("2026-01-01T00:30:00Z"));
assert.equal(history.reason, "INVALID_BAR_DATA");
assert.equal(history.cachePersisted, false);
assert.equal(values.size, 0);
console.log("MT5 CLOSED-BAR VALIDATION PASS: forming, future/off-grid, and equivalent-offset duplicate rows fail closed.");
