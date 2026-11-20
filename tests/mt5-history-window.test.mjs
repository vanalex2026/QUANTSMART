import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/mt5DemoAdapter.ts", import.meta.url), "utf8");
const declaration = source.match(/export const BROKER_HISTORY_TIMEFRAMES[^;]+;/)?.[0] || "";
assert.match(declaration, /M5.*M15.*M30.*H1/);
assert.match(source, /BROKER_HISTORY_YEARS\s*=\s*3/);
assert.match(source, /mt5ThreeYearHistory/);
assert.doesNotMatch(declaration, /\bM1\b/);
assert.match(source, /HISTORY_MAX_BARS_PER_REQUEST\s*=\s*50_000/);
assert.match(source, /HISTORY_RETRY_ATTEMPTS\s*=\s*3/);
assert.match(source, /HISTORY_RETRY_BACKOFF_MS\s*=\s*250/);
assert.match(source, /waitForHistoryRetry/);
assert.match(source, /MT5_HISTORY_CONTRACT_VERSION\s*=\s*2/);
assert.match(source, /coverageRanges/);
assert.match(source, /failedChunks/);
assert.match(source, /mfe_mt5_history_v/);
assert.match(source, /cache:\s*"HIT"/);
assert.match(source, /INVALID_BAR_DATA/);
assert.match(source, /validHistoryCacheBar/);
assert.match(source, /fetchEndMs/);
assert.match(source, /HISTORY_MAX_INTERNAL_GAP_MS/);
console.log("MT5 HISTORY WINDOW PASS: three-year bounded closed-bar fetch is limited to M5/M15/M30/H1.");

// A malformed persisted chunk must be treated as a cache miss and fetched again.
// This exercises the adapter with a deterministic bridge stub rather than credentials.
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: ["src/lib/mt5DemoAdapter.ts"], absWorkingDir: app, bundle: true,
  platform: "node", format: "esm", write: false, logLevel: "silent",
});
const adapter = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
let fetches = 0;
globalThis.fetch = async (input) => {
  fetches++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = query.get("from");
  const to = query.get("to");
  const bars = [];
  for (let stamp = Date.parse(from) + 4 * 60 * 60 * 1000; stamp < Date.parse(to); stamp += 60 * 60 * 1000) {
    bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  }
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const now = Date.parse("2026-01-01T00:00:00Z");
// Runtime callers can bypass TypeScript's union (for example stale UI state or
// a direct JS integration). M1 must remain outside the Pattern Atlas
// three-year contract and must fail before any bridge request is attempted.
const unsupportedTimeframe = await adapter.mt5ThreeYearHistory("XAUUSD", "M1", now);
assert.deepEqual(unsupportedTimeframe, { offline: true, error: "UNSUPPORTED_HISTORY_TIMEFRAME" });
assert.equal(fetches, 0, "unsupported M1 history must not call the bridge");
console.log("MT5 HISTORY SCOPE PASS: runtime M1 requests fail closed before bridge access.");
const first = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(first.complete, true);
assert.equal(fetches, first.chunks);
const firstKey = values.keys().next().value;
const persisted = JSON.parse(values.get(firstKey));
assert.equal(persisted.contractVersion, 2, "history cache must record the range contract version");
persisted.bars[0][0] = persisted.bars[0][0].replace("Z", "+00:00");
values.set(firstKey, JSON.stringify(persisted));
fetches = 0;
const offsetCache = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(fetches, 1, "cache rows with equivalent offsets must be refetched, not normalized into provenance");
assert.equal(offsetCache.cachedChunks, first.chunks - 1);
const refreshed = JSON.parse(values.get(firstKey));
assert.match(refreshed.bars[0][0], /Z$/, "refetched history cache must retain canonical UTC timestamps");
persisted.contractVersion = 1;
values.set(firstKey, JSON.stringify(persisted));
fetches = 0;
const legacy = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(fetches, 1, "legacy contract cache must be refetched");
assert.equal(legacy.cachedChunks, first.chunks - 1);
const poisoned = JSON.parse(values.get(firstKey));
poisoned.bars = [["not-a-timestamp", 1, 2, 0, 1]];
values.set(firstKey, JSON.stringify(poisoned));
fetches = 0;
const second = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(fetches, 1);
assert.equal(second.cachedChunks, first.chunks - 1);
assert.equal(second.coverageRanges.filter((range) => range.cache === "MISS").length, 1);
console.log("MT5 HISTORY CACHE PASS: malformed persisted OHLC chunks are refetched instead of trusted.");

// A wall-clock request inside an open bucket must stop at the last closed
// timeframe boundary, so a forming bar cannot enter the three-year tape.
values.clear();
const intrabarNow = Date.parse("2026-01-01T00:30:00Z");
const requestedEnds = [];
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = query.get("from");
  const to = query.get("to");
  requestedEnds.push(to);
  const bars = [];
  for (let stamp = Date.parse(from); stamp < Date.parse(to); stamp += 60 * 60 * 1000) {
    bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  }
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const closed = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", intrabarNow);
assert.ok(closed.complete);
const closedBoundary = Date.parse("2026-01-01T00:00:00Z");
assert.ok(requestedEnds.length > 0);
assert.ok(requestedEnds.every((value) => Date.parse(value) <= closedBoundary));
assert.ok(closed.bars.every((bar) => Date.parse(bar.t) + 60 * 60 * 1000 <= intrabarNow));
console.log("MT5 HISTORY CAUSAL PASS: forming current timeframe bucket is excluded from range fetches.");

// Calendar-year subtraction must clamp 29 February to the last day of the
// target month. Native Date#setUTCFullYear otherwise normalizes 2028-02-29
// minus three years to 2025-03-01, silently dropping a day from the tape.
values.clear();
globalThis.fetch = async (input) => ({ json: async () => ({ ok: true, reason: "NO_MARKET_DATA", symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, bars: [] }) });
const leapWindow = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", Date.parse("2028-02-29T00:30:00Z"));
assert.equal(leapWindow.from, "2025-02-28T00:30:00.000Z");
console.log("MT5 HISTORY CALENDAR PASS: leap-day three-year windows clamp to the target month.");

// Transient bridge failures must not be retried in a tight loop. Verify the
// adapter waits with bounded exponential delays before recovering on attempt 3.
values.clear();
let retryFetches = 0;
const retryDelays = [];
const nativeSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (callback, delay, ...args) => {
  retryDelays.push(delay);
  callback(...args);
  return 0;
};
globalThis.fetch = async (input) => {
  retryFetches++;
  if (retryFetches < 3) return { json: async () => ({ ok: false, reason: "TIMEOUT", bars: [], symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2 }) };
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) {
    bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  }
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
let retried;
try {
  retried = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
} finally {
  globalThis.setTimeout = nativeSetTimeout;
}
assert.equal(retried.complete, true);
assert.equal(retryFetches, 3);
assert.deepEqual(retryDelays, [250, 500], "retry delays should grow exponentially");
console.log("MT5 HISTORY RETRY PASS: transient failures back off before a successful retry.");

// A real bridge 503 carries an error JSON body and must enter the same bounded
// retry path as a network timeout. It must not be interpreted as an unversioned
// history payload (which would stop retries on HISTORY_CONTRACT_MISMATCH).
values.clear();
let httpFailureFetches = 0;
const httpRetryDelays = [];
globalThis.setTimeout = (callback, delay, ...args) => {
  httpRetryDelays.push(delay);
  callback(...args);
  return 0;
};
globalThis.fetch = async (input) => {
  httpFailureFetches++;
  if (httpFailureFetches < 3) return { ok: false, status: 503, json: async () => ({ error: "MT5_BRIDGE_REQUEST_FAILED" }) };
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) {
    bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  }
  return { ok: true, json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
let httpRetried;
try {
  httpRetried = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
} finally {
  globalThis.setTimeout = nativeSetTimeout;
}
assert.equal(httpRetried.complete, true);
assert.equal(httpFailureFetches, 3);
assert.deepEqual(httpRetryDelays, [250, 500]);
console.log("MT5 HTTP RETRY PASS: bridge 503 responses normalize to Offline and recover with bounded backoff.");

// A broker can report ok=true while returning only a tiny oldest slice. Such a
// chunk must be marked incomplete and must not be cached as complete history.
values.clear();
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = query.get("from");
  const requestedStart = new Date(now);
  requestedStart.setUTCFullYear(requestedStart.getUTCFullYear() - 3);
  const oldest = new Date(Math.max(Date.parse(from), requestedStart.getTime())).toISOString();
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", n: 1, bars: [{ i: 0, t: oldest, o: 1, h: 2, l: 0, c: 1, r: "N" }] }) };
};
const sparse = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(sparse.complete, false);
assert.equal(sparse.reason, "HISTORY_PARTIAL_CHUNKS");
assert.equal(sparse.coverageRanges.some((range) => range.reason === "BROKER_MAX_BARS_LIMIT"), true);
assert.equal(sparse.cachePersisted, false);
assert.equal(values.size, 0, "underfilled chunks must not poison the persistent cache");
console.log("MT5 HISTORY COVERAGE PASS: underfilled ok responses remain partial and uncached.");

// Timeframes are UTC buckets. A syntactically valid OHLC row at an off-grid
// minute must fail closed, otherwise it can poison both the merged tape and its
// persistent chunk cache.
values.clear();
let misalignedFetches = 0;
globalThis.fetch = async (input) => {
  misalignedFetches++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, server_timezone: "UTC", timestamp_basis: "UTC", closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, bars: [{ i: 0, t: new Date(from + 60_000).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" }] }) };
};
const misaligned = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(misaligned.ok, false);
assert.equal(misaligned.reason, "INVALID_BAR_DATA");
assert.equal(misalignedFetches, misaligned.chunks);
assert.equal(misaligned.coverageRanges.every((range) => range.reason === "INVALID_BAR_DATA"), true);
assert.equal(misaligned.cachePersisted, false);
assert.equal(values.size, 0, "off-grid bars must never be persisted as history cache chunks");
console.log("MT5 HISTORY ALIGNMENT PASS: off-grid timeframe rows fail closed and remain uncached.");

// A stale bridge can return its newest cached row for an old range request.
// The adapter must expose the contract violation in chunk provenance and keep
// that row out of the research tape.
values.clear();
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const to = Date.parse(query.get("to"));
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, server_timezone: "UTC", timestamp_basis: "UTC", closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, bars: [{ i: 0, t: new Date(to + 60 * 60 * 1000).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" }] }) };
};
const outside = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(outside.reason, "OUTSIDE_REQUESTED_WINDOW");
assert.ok(outside.coverageRanges.every((range) => range.reason === "OUTSIDE_REQUESTED_WINDOW"));
assert.equal(outside.cachePersisted, false);
assert.equal(values.size, 0);
console.log("MT5 HISTORY WINDOW VIOLATION PASS: out-of-range broker rows are surfaced and discarded.");

// A response from an older bridge without the version marker is an incompatible
// range contract. It must never seed a multi-year cache.
values.clear();
globalThis.fetch = async (input) => ({ json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", bars: [] }) });
const missingProvenance = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(missingProvenance.reason, "HISTORY_CONTRACT_MISMATCH");
assert.ok(missingProvenance.coverageRanges.every((range) => range.reason === "HISTORY_CONTRACT_MISMATCH"));
assert.equal(missingProvenance.cachePersisted, false);
console.log("MT5 HISTORY CONTRACT PASS: missing version markers fail closed.");

// A versioned response with no source marker must still fail the provenance
// gate. This keeps source identity and contract version independently useful.
values.clear();
globalThis.fetch = async (input) => ({ json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), contract_version: 2, bars: [] }) });
const missingSource = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(missingSource.reason, "HISTORY_PROVENANCE_MISSING");
assert.ok(missingSource.coverageRanges.every((range) => range.reason === "HISTORY_PROVENANCE_MISSING"));
assert.equal(missingSource.cachePersisted, false);
console.log("MT5 HISTORY PROVENANCE PASS: missing source markers fail closed.");

// A report with one severe contract failure and several ordinary empty chunks
// must retain the severe reason at the top level for UI diagnostics.
values.clear();
let mixedCalls = 0;
globalThis.fetch = async (input) => {
  mixedCalls++;
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: mixedCalls === 1 ? 1 : 2, bars: [] }) };
};
const mixedFailure = await adapter.mt5ThreeYearHistory("XAUUSD", "M5", now);
assert.equal(mixedFailure.reason, "HISTORY_CONTRACT_MISMATCH");
assert.ok(mixedFailure.coverageRanges.some((range) => range.reason === "HISTORY_CONTRACT_MISMATCH"));
assert.equal(mixedFailure.cachePersisted, false);
console.log("MT5 HISTORY FAILURE PRIORITY PASS: severe contract failures remain visible.");

// A broker may return enough rows to pass a simple volume check while silently
// dropping a large interior section of a range. That chunk is unsafe to cache:
// the Atlas must surface a partial causal tape instead of calling coverage
// complete merely because the first row starts at the requested boundary.
values.clear();
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let i = 0; i < 500; i++) {
    const stamp = from + i * 60 * 60 * 1000;
    bars.push({ i, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  }
  for (let i = 0; i < 500; i++) {
    // Keep the second valid segment at the requested boundary so this fixture
    // isolates an unexplained interior gap from a boundary truncation signal.
    const stamp = to - (500 - i) * 60 * 60 * 1000;
    bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  }
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const internalGap = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(internalGap.complete, false);
assert.equal(internalGap.reason, "HISTORY_INTERNAL_GAP");
assert.ok(internalGap.coverageRanges.every((range) => range.reason === "HISTORY_INTERNAL_GAP"));
assert.notEqual(internalGap.retentionSource, "BROKER_RETENTION", "an unexplained interior gap must not be labeled broker retention");
assert.equal(internalGap.cachePersisted, false);
assert.equal(values.size, 0, "chunks with a large interior gap must never be cached as complete");
console.log("MT5 HISTORY GAP PASS: large internal omissions remain partial and uncached.");

// A persisted chunk can contain only valid OHLC rows and still be unsafe when
// an interior section was lost before it was written. Cache reads must apply
// the same coverage and holiday-gap guards as fresh bridge responses.
values.clear();
let cacheSeedFetches = 0;
globalThis.fetch = async (input) => {
  cacheSeedFetches++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) {
    bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  }
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const seeded = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(seeded.complete, true);
const identityKey = values.keys().next().value;
const identityPoison = JSON.parse(values.get(identityKey));
identityPoison.symbol = "EURUSD";
values.set(identityKey, JSON.stringify(identityPoison));
let identityFetches = 0;
globalThis.fetch = async (input) => {
  identityFetches++;
  cacheSeedFetches++;
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [];
  for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), timeframe: new URL(String(input), "http://localhost").searchParams.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const identityReread = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(identityFetches, 1, "cache payload with a different symbol must be refetched");
assert.equal(identityReread.complete, true);
const firstCacheKey = values.keys().next().value;
const interiorPoison = JSON.parse(values.get(firstCacheKey));
interiorPoison.bars = [interiorPoison.bars[0], interiorPoison.bars.at(-1)];
values.set(firstCacheKey, JSON.stringify(interiorPoison));
cacheSeedFetches = 0;
const interiorCacheMiss = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(cacheSeedFetches, 1, "cache with a large interior gap must be refetched");
assert.equal(interiorCacheMiss.cachedChunks, seeded.chunks - 1);
console.log("MT5 HISTORY CACHE GAP PASS: valid-but-incomplete persisted chunks are refetched.");

// A cache entry that falls below the conservative lower-bound coverage check
// is also a miss. This prevents a one-row persisted response from making a
// multi-year fetch look complete after a restart.
const sparseKey = values.keys().next().value;
const sparsePoison = JSON.parse(values.get(sparseKey));
sparsePoison.bars = [sparsePoison.bars[0]];
values.set(sparseKey, JSON.stringify(sparsePoison));
cacheSeedFetches = 0;
const sparseCacheMiss = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(cacheSeedFetches, 1, "underfilled persisted chunks must be refetched");
assert.equal(sparseCacheMiss.cachedChunks, seeded.chunks - 1);
console.log("MT5 HISTORY CACHE COVERAGE PASS: underfilled persisted chunks are refetched.");

// A restart must also reject a syntactically valid chunk with duplicate
// timestamps; merging it would otherwise silently overwrite one observation.
const duplicateKey = values.keys().next().value;
const duplicatePoison = JSON.parse(values.get(duplicateKey));
duplicatePoison.bars.push(duplicatePoison.bars[0]);
values.set(duplicateKey, JSON.stringify(duplicatePoison));
cacheSeedFetches = 0;
const duplicateCacheMiss = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(cacheSeedFetches, 1, "duplicate persisted timestamps must be refetched");
assert.equal(duplicateCacheMiss.cachedChunks, seeded.chunks - 1);
console.log("MT5 HISTORY CACHE DUPLICATE PASS: duplicate persisted timestamps are refetched.");

// A bridge response that identifies a different timeframe must never be
// merged into the requested tape. This protects saved M5/M15/M30/H1 chunks
// from a stale proxy or a mismatched terminal request.
values.clear();
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [{ i: 0, t: new Date(from).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" }];
  return { json: async () => ({ ok: true, symbol: new URL(String(input), "http://localhost").searchParams.get("symbol"), source: "MT5_HISTORY", contract_version: 2, timeframe: "M5", closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const timeframeMismatch = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(timeframeMismatch.complete, false);
assert.equal(timeframeMismatch.reason, "HISTORY_TIMEFRAME_MISMATCH");
assert.equal(timeframeMismatch.cachePersisted, false);
assert.equal(values.size, 0, "timeframe-mismatched responses must never seed saved history");
console.log("MT5 HISTORY TIMEFRAME PASS: mismatched bridge frames fail closed and remain uncached.");

values.clear();
globalThis.fetch = async (input) => {
  const query = new URL(String(input), "http://localhost").searchParams;
  const from = Date.parse(query.get("from"));
  const to = Date.parse(query.get("to"));
  const bars = [{ i: 0, t: new Date(from).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" }];
  return { json: async () => ({ ok: true, symbol: "EURUSD", source: "MT5_HISTORY", contract_version: 2, timeframe: "H1", closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars }) };
};
const symbolMismatch = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
assert.equal(symbolMismatch.complete, false);
assert.equal(symbolMismatch.reason, "HISTORY_SYMBOL_MISMATCH");
assert.equal(symbolMismatch.cachePersisted, false);
assert.equal(values.size, 0, "symbol-mismatched responses must never seed saved history");
console.log("MT5 HISTORY SYMBOL PASS: mismatched bridge symbols fail closed and remain uncached.");

// A response that omits either raw identity marker is not safely scoped after
// a restart. Full valid coverage must not mask the missing identity.
for (const [marker, reason] of [["symbol", "HISTORY_SYMBOL_MISMATCH"], ["timeframe", "HISTORY_TIMEFRAME_MISMATCH"]]) {
  values.clear();
  globalThis.fetch = async (input) => {
    const query = new URL(String(input), "http://localhost").searchParams;
    const from = Date.parse(query.get("from"));
    const to = Date.parse(query.get("to"));
    const bars = [];
    for (let stamp = from; stamp < to; stamp += 60 * 60 * 1000) bars.push({ i: bars.length, t: new Date(stamp).toISOString(), o: 1, h: 2, l: 0, c: 1, r: "N" });
    const result = { ok: true, symbol: query.get("symbol"), timeframe: query.get("tf"), source: "MT5_HISTORY", contract_version: 2, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: "UTC", timestamp_basis: "UTC", bars };
    delete result[marker];
    return { json: async () => result };
  };
  const omittedIdentity = await adapter.mt5ThreeYearHistory("XAUUSD", "H1", now);
  assert.equal(omittedIdentity.complete, false);
  assert.equal(omittedIdentity.reason, reason);
  assert.equal(omittedIdentity.bars.length, 0);
  assert.ok(omittedIdentity.coverageRanges.every((range) => range.reason === reason));
  assert.equal(omittedIdentity.cachePersisted, false);
  assert.equal(values.size, 0, `${marker}-omitted responses must never seed saved history`);
}
console.log("MT5 HISTORY IDENTITY PASS: omitted symbol/timeframe markers fail closed and remain uncached.");
