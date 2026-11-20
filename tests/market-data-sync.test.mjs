import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/marketDataSync.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const sync = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

assert.equal(sync.normT("2026-01-01T00:00:00+05:30"), "2025-12-31T18:30:00");
assert.equal(sync.normT("2025-12-31T18:30:00Z"), "2025-12-31T18:30:00");
const original = { i: 9, t: "2026-01-01T00:00:00Z", o: 1, h: 2, l: 0, c: 1, r: "N" };
const corrected = { i: 4, t: "2025-12-31T19:00:00-05:00", o: 10, h: 12, l: 9, c: 11, r: "N" };
const earlier = { i: 8, t: "2025-12-31T18:55:00Z", o: 3, h: 4, l: 2, c: 3.5, r: "N" };
const merged = sync.mergeBars([original], [corrected, earlier]);
assert.deepEqual(merged.map((bar) => bar.t), ["2025-12-31T18:55:00", "2026-01-01T00:00:00"]);
assert.equal(merged[1].c, 11, "a corrected row at the same instant must replace the prior observation");
assert.deepEqual(merged.map((bar) => bar.i), [0, 1]);

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  key: (index) => [...storage.keys()][index] ?? null,
  get length() { return storage.size; },
};
storage.set("mfe_mt5_account_namespace", "100|Broker-A|11");
storage.set("mfe_live_ext_100%7CBroker-A%7C11_XAUUSD_XAUUSD_M5", JSON.stringify([original]));
let observedRange;
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  observedRange = { from: query.get("from"), to: query.get("to") };
  return { json: async () => ({ ok: true, symbol: "XAUUSD", timeframe: "M5", source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, timestamp_basis: "UTC", authority: "SHADOW_ONLY", decision: "NO_DECISION", read_only: true, bars: [corrected, { ...earlier, t: "2025-12-31T19:05:00-05:00" }] }) };
};
const backfill = await sync.backfillFromMt5("XAUUSD", "M5", original.t);
console.log("BACKFILL",backfill); assert.equal(backfill.ok, true);
assert.equal(observedRange.from, "2026-01-01T00:00:00Z", "backfill range start must carry an explicit UTC marker");
assert.match(observedRange.to, /Z$/, "backfill range end must carry an explicit UTC marker");
const persisted = sync.getLiveExt("XAUUSD", "M5");
console.log("PERSISTED",persisted); assert.equal(persisted.find((bar) => bar.t === "2026-01-01T00:00:00")?.c, 11, "inclusive boundary fetch must preserve broker corrections");
assert.equal(new Set(persisted.map((bar) => bar.t)).size, persisted.length);

// A successful transport response without the closed-bar attestation must not
// be allowed to extend durable evidence.
globalThis.fetch = async () => ({ json: async () => ({ ok: true, symbol: "XAUUSD", timeframe: "M5", bars: [corrected] }) });
const rejected = await sync.backfillFromMt5("XAUUSD", "M5", original.t);
assert.equal(rejected.ok, false);
assert.equal(rejected.reason, "HISTORY_PROVENANCE_MISMATCH");

// Explicit execution markers must fail closed too.  The durable extension is
// read-only evidence; a response that opts into a decision or live apply may
// not be relabelled by the local merge and persisted under the closed-bar key.
for (const marker of [{ decision: "LONG" }, { live_apply_allowed: true }]) {
  globalThis.fetch = async () => ({ json: async () => ({ ok: true, symbol: "XAUUSD", timeframe: "M5", source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, timestamp_basis: "UTC", authority: "SHADOW_ONLY", read_only: true, ...marker, bars: [corrected] }) });
  const unsafe = await sync.backfillFromMt5("XAUUSD", "M5", original.t);
  assert.equal(unsafe.ok, false);
  assert.equal(unsafe.reason, "HISTORY_PROVENANCE_MISMATCH");
}

// Account transitions can happen after fetch begins but before its JSON body
// resolves. Old-account observations must never be written into the new scope,
// even if the response has valid closed-bar provenance.
const oldScopeKey = "mfe_live_ext_100%7CBroker-A%7C11_XAUUSD_XAUUSD_M5";
const newScopeKey = "mfe_live_ext_200%7CBroker-B%7C22_XAUUSD_XAUUSD_M5";
const oldScopeBefore = storage.get(oldScopeKey);
const newAccountBar = { ...original, c: 1.5 };
const newScopeBefore = JSON.stringify([newAccountBar]);
storage.set(newScopeKey, newScopeBefore);
globalThis.fetch = async () => ({ json: async () => {
  storage.set("mfe_mt5_account_namespace", "200|Broker-B|22");
  return { ok: true, symbol: "XAUUSD", timeframe: "M5", source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, timestamp_basis: "UTC", authority: "SHADOW_ONLY", decision: "NO_DECISION", read_only: true, bars: [corrected] };
} });
const raced = await sync.backfillFromMt5("XAUUSD", "M5", original.t);
assert.equal(raced.ok, false);
assert.equal(raced.reason, "HISTORY_ACCOUNT_CHANGED");
assert.equal(raced.added, 0);
assert.equal(storage.get(oldScopeKey), oldScopeBefore, "account race must not modify the original account extension");
assert.equal(storage.get(newScopeKey), newScopeBefore, "old-account bars must not replace observations belonging to the newly attached terminal");

// An unscoped request cannot prove ownership of a broker response. Refuse it
// before bridge access rather than creating reusable detached extensions.
storage.delete("mfe_mt5_account_namespace");
let detachedFetches = 0;
globalThis.fetch = async () => { detachedFetches++; throw Error("detached request must not fetch"); };
const detached = await sync.backfillFromMt5("XAUUSD", "M5", original.t);
assert.equal(detached.ok, false);
assert.equal(detached.reason, "HISTORY_ACCOUNT_CHANGED");
assert.equal(detachedFetches, 0);

// A valid closed-bar response for another frame or symbol must fail closed
// before it can extend the focused M5 extension.
storage.set("mfe_mt5_account_namespace", "100|Broker-A|11");
globalThis.fetch = async () => ({ json: async () => ({ ok: true, symbol: "XAUUSD", timeframe: "M15", source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, timestamp_basis: "UTC", authority: "SHADOW_ONLY", decision: "NO_DECISION", read_only: true, bars: [corrected] }) });
const wrongTimeframe = await sync.backfillFromMt5("XAUUSD", "M5", original.t);
assert.equal(wrongTimeframe.ok, false);
assert.equal(wrongTimeframe.reason, "HISTORY_PROVENANCE_MISMATCH");
globalThis.fetch = async () => ({ json: async () => ({ ok: true, symbol: "GOLD", timeframe: "M5", source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, timestamp_basis: "UTC", authority: "SHADOW_ONLY", decision: "NO_DECISION", read_only: true, bars: [corrected] }) });
const wrongSymbol = await sync.backfillFromMt5("XAUUSD", "M5", original.t);
assert.equal(wrongSymbol.ok, false);
assert.equal(wrongSymbol.reason, "HISTORY_PROVENANCE_MISMATCH");
assert.equal(storage.get(oldScopeKey), oldScopeBefore, "identity mismatches cannot change the durable extension");

// A configured broker symbol remains valid when the response attests that
// exact requested identity. Changing the override during delivery invalidates
// it instead of persisting observations from the old instrument.
storage.set("mfe_live_symbol", "GOLD.i#");
assert.deepEqual(sync.getLiveExt("XAUUSD", "M5"), [], "a new broker alias cannot reuse the previous instrument's persisted extension");
const aliasPayload = { ok: true, symbol: "GOLD.i#", timeframe: "M5", source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, timestamp_basis: "UTC", authority: "SHADOW_ONLY", decision: "NO_DECISION", read_only: true, bars: [corrected] };
globalThis.fetch = async input => {
  assert.equal(new URL(String(input), "http://localhost").searchParams.get("symbol"), "GOLD.i#");
  return { json: async () => aliasPayload };
};
assert.equal((await sync.backfillFromMt5("XAUUSD", "M5", original.t)).ok, true);
const aliasKey = "mfe_live_ext_100%7CBroker-A%7C11_XAUUSD_GOLD.i%23_M5";
assert.equal(sync.getLiveExt("XAUUSD", "M5").length, 1, "alias backfill must not merge rows from the previous broker instrument");
assert.equal(storage.get(oldScopeKey), oldScopeBefore, "a new alias must leave the prior instrument's extension untouched");
const aliasBefore = storage.get(aliasKey);
storage.set("mfe_live_symbol", "XAUUSD");
assert.equal(sync.getLiveExt("XAUUSD", "M5").length, 2, "returning to the original alias restores only that instrument's own extension");
storage.set("mfe_live_symbol", "GOLD.i#");
globalThis.fetch = async () => ({ json: async () => {
  storage.set("mfe_live_symbol", "XAUUSD");
  return aliasPayload;
} });
assert.equal((await sync.backfillFromMt5("XAUUSD", "M5", original.t)).reason, "HISTORY_PROVENANCE_MISMATCH");
assert.equal(storage.get(aliasKey), aliasBefore, "an alias race cannot modify the originally requested instrument's extension");
assert.equal(storage.get(oldScopeKey), oldScopeBefore, "an alias race cannot modify the newly selected instrument's extension");
storage.set("mfe_live_symbol", "GOLD.i#");
sync.clearLiveExt("XAUUSD", "M5");
assert.equal(storage.has(aliasKey), false, "clearLiveExt must target the active broker alias");
assert.equal(storage.get(oldScopeKey), oldScopeBefore, "clearing one broker alias cannot remove another instrument's extension");
storage.set("mfe_mt5_account_namespace", "300|Broker-C|33");
storage.set("mfe_live_ext_300%7CBroker-C%7C33_XAUUSD_M5", JSON.stringify([original]));
assert.deepEqual(sync.getLiveExt("XAUUSD", "M5"), [], "legacy alias-free extensions have no attested instrument identity and must be ignored");
console.log("MARKET DATA SYNC PASS: offset timestamps canonicalize to UTC, corrected bars replace by instant, and merged rows remain chronological.");
