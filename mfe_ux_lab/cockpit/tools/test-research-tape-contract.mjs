import assert from "node:assert/strict";
import { hashCanonicalDetectorTape, validateCanonicalDetectorTape } from "./researchTapeContract.mjs";

const nowMs = Date.parse("2026-01-01T01:00:00.000Z");
const bars = [
  { i: 91, t: "2026-01-01T00:50:00Z", o: 10, h: 12, l: 9, c: 11, tick_volume: 2 },
  { i: 92, t: "2026-01-01T00:55:00.000Z", o: 11, h: 13, l: 10, c: 12 },
];
const base = {
  symbol: "XAUUSD",
  timeframe: "M5",
  account_scope: { account_id: "268115110", server: "Exness-MT5Real39", broker_symbol: "GOLDmicro", server_timezone: "UTC" },
  retrieved_at: "2026-01-01T01:00:00.123Z",
  bars,
};

const valid = validateCanonicalDetectorTape(base, { nowMs });
assert.equal(valid.ok, true);
assert.equal(valid.bars[0].t, "2026-01-01T00:50:00.000Z");
assert.match(valid.tape_hash, /^[a-f0-9]{64}$/);
assert.equal(validateCanonicalDetectorTape({ ...base, tape_hash: valid.tape_hash }, { nowMs }).ok, true);
assert.equal(validateCanonicalDetectorTape({ ...base, tape_hash: "0".repeat(64) }, { nowMs }).reason, "TAPE_HASH_MISMATCH");
assert.equal(hashCanonicalDetectorTape(base), valid.tape_hash);

for (const [name, mutation, reason] of [
  ["symbol", { symbol: "EURUSD" }, "INVALID_XAUUSD_M5_SCOPE"],
  ["timeframe", { timeframe: "M15" }, "INVALID_XAUUSD_M5_SCOPE"],
  ["retrieved_at", { retrieved_at: "2026-01-01T01:00:00+01:00" }, "RETRIEVED_AT_INVALID"],
  ["off-grid", { bars: [{ ...bars[0], t: "2026-01-01T00:51:00Z" }, bars[1]] }, "BAR_TIMESTAMP_NOT_ALIGNED"],
  ["duplicate", { bars: [bars[0], { ...bars[1], t: bars[0].t }] }, "BAR_TIMESTAMP_DUPLICATE"],
  ["out of order", { bars: [bars[1], bars[0]] }, "BAR_TIMESTAMP_NOT_ASCENDING"],
  ["forming flag", { bars: [bars[0], { ...bars[1], closed: false }] }, "BAR_FORMING"],
  ["future", { bars: [bars[0], { ...bars[1], t: "2026-01-01T01:00:00Z" }] }, "BAR_FORMING"],
  ["OHLC", { bars: [{ ...bars[0], h: 8 }, bars[1]] }, "BAR_OHLC_INVALID"],
  ["account scope", { account_scope: { unknown: "x" } }, "ACCOUNT_SCOPE_INVALID"],
]) {
  assert.equal(validateCanonicalDetectorTape({ ...base, ...mutation }, { nowMs }).reason, reason, name);
}

assert.notEqual(hashCanonicalDetectorTape(base), hashCanonicalDetectorTape({ ...base, account_scope: { ...base.account_scope, server: "other" } }));
assert.equal(validateCanonicalDetectorTape({ ...base, bars: [{ ...bars[0], i: 1, r: "N" }, { ...bars[1], i: 2 }] }, { nowMs }).tape_hash, valid.tape_hash, "presentation row metadata must not alter tape identity");
console.log("RESEARCH TAPE CONTRACT PASS: canonical XAUUSD M5 scope, closed UTC tape validation, account isolation and stable hash.");
