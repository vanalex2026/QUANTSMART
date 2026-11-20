import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/focusedM5Refresh.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const { refreshFocusedM5History } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const values = new Map();
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k), key: i => [...values.keys()][i] ?? null, get length() { return values.size; } };
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
const nativeNow = Date.now;
Date.now = () => Date.parse("2026-01-05T10:12:34Z");
// Exercise the refresh against the same read-only metadata emitted for a real
// terminal session.  The refresh is account scoped but must never require an
// execution-capable account to read closed research bars.
const account = { connected: true, account_id: "test-account", account_kind: "REAL", server: "Exness-test", generation: 1, trade_allowed: false, read_only: true };
const namespace = "test-account|Exness-test|1";
const bar = (minute, c = 100) => ({ i: minute / 5, t: `2026-01-05T10:${String(minute).padStart(2, "0")}:00Z`, o: 100, h: 102, l: 98, c, r: "N" });
const markers = { ok: true, source: "MT5_CLOSED_BARS", symbol: "XAUUSD", timeframe: "M5", closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, timestamp_basis: "UTC", server_timezone: "UTC", authority: "SHADOW_ONLY", decision: "NO_DECISION", live_apply_allowed: false, read_only: true };
const history = { ...markers, source: "MT5_HISTORY_3Y", complete: true, bars: [bar(0)], closedBarProvenance: "MT5_CLOSED_BARS", contract_version: 2, cacheNamespace: namespace, activeCacheNamespace: namespace, coverageRanges: [{ complete: true, source: "MT5_HISTORY", closedBarProvenance: "MT5_CLOSED_BARS", timestampBasis: "UTC", serverTimezone: "UTC" }], actualFrom: bar(0).t };
let nextAccount = account, probe, range, duringRange, calls;
const reset = () => {
  values.set("mfe_mt5_account_namespace", namespace);
  nextAccount = account; probe = { ...markers, bars: [bar(0), bar(5)] };
  range = { ...markers, source: "MT5_HISTORY", contract_version: 2, coverage_status: "COMPLETE", bars: [bar(0), bar(5)] };
  duringRange = null; calls = [];
};
globalThis.fetch = async input => {
  const url = new URL(String(input), "http://localhost"); calls.push(url);
  const data = url.pathname.endsWith("/account") ? nextAccount : url.pathname.endsWith("/bars") ? probe : range;
  if (url.pathname.endsWith("/history")) duringRange?.();
  return { ok: true, json: async () => data };
};
try {
  reset();
  const update = await refreshFocusedM5History(history, "XAUUSD");
  assert.equal(update.changed, true);
  assert.equal(update.checkedAt, Date.parse("2026-01-05T10:12:34Z"), "refresh evidence uses the fixed account-check clock");
  assert.deepEqual(update.history.bars.map(b => b.t), [bar(0).t, bar(5).t]);
  assert.match(calls[1].searchParams.get("refresh"), new RegExp(`^${Date.now()}-\\d+$`), "live probes must bypass browser/proxy caching so a newly closed M5 bar is observable");
  assert.equal(calls[2].searchParams.get("to"), "2026-01-05T10:10:00.000Z", "range ends at the latest proven close boundary, rather than inside the forming candle");
  assert.equal(update.history.refreshProvenance.receivedBars, 2);

  reset(); probe = { ...markers, bars: [bar(0)] };
  const unchanged = await refreshFocusedM5History(history, "XAUUSD");
  assert.equal(unchanged.history, history, "equal closed bars retain the original tape and worker input identity");
  assert.equal(unchanged.checkedAt, Date.parse("2026-01-05T10:12:34Z"), "unchanged evidence remains tied to the fixed check time");
  assert.equal(calls.length, 2, "unchanged probes avoid a full history scan/merge");

  reset();
  const uncachedFetch = globalThis.fetch;
  const probeCache = new Map();
  globalThis.fetch = async input => {
    const url = new URL(String(input), "http://localhost");
    if (!url.pathname.endsWith("/bars")) return uncachedFetch(input);
    if (!probeCache.has(url.href)) probeCache.set(url.href, await (await uncachedFetch(input)).json());
    return { ok: true, json: async () => probeCache.get(url.href) };
  };
  try {
    const first = await refreshFocusedM5History(history, "XAUUSD");
    Date.now = () => Date.parse("2026-01-05T10:17:34Z");
    probe = { ...markers, bars: [bar(5), bar(10)] };
    range = { ...range, bars: [bar(5), bar(10)] };
    const next = await refreshFocusedM5History(first.history, "XAUUSD");
    assert.equal(next.changed, true, "a cached earlier probe must not hide the next actual closed candle");
    assert.equal(next.history.bars.at(-1).t, bar(10).t);
    assert.equal(probeCache.size, 2, "successive automatic refreshes must use distinct transport-cache entries");
  } finally {
    globalThis.fetch = uncachedFetch;
    Date.now = () => Date.parse("2026-01-05T10:12:34Z");
  }

  for (const changes of [{ symbol: "EURUSD" }, { forming_bar_included: true }, { authority: "LIVE" }, { timestamp_basis: "LOCAL" }, { server_timezone: "Europe/London" }, { bars: [bar(10)] }]) {
    reset(); Object.assign(probe, changes);
    const rejected = await refreshFocusedM5History(history, "XAUUSD");
    assert.equal(rejected.changed, false);
    assert.equal(rejected.reason, "UNVERIFIED_M5_REFRESH");
    assert.equal(calls.length, 2, "unverified probes cannot reach range promotion");
  }
  for (const changes of [{ coverage_status: "PARTIAL" }, { live_apply_allowed: true }, { decision: "BUY" }]) {
    reset(); Object.assign(range, changes);
    const rejected = await refreshFocusedM5History(history, "XAUUSD");
    assert.equal(rejected.changed, false);
    assert.equal(rejected.history, history, "bad catch-up retains the prior closed tape");
  }
  // The catch-up `to` value is the first instant after the latest proven
  // close. A row opening exactly at that boundary is still forming and must
  // never enter the promoted closed tape.
  reset(); range = { ...range, bars: [bar(0), bar(5), bar(10)] };
  const boundaryForming = await refreshFocusedM5History(history, "XAUUSD");
  assert.equal(boundaryForming.changed, false);
  assert.equal(boundaryForming.reason, "INVALID_BAR_DATA", "a boundary-opening forming row must fail closed");
  assert.equal(boundaryForming.history, history, "forming boundary data must retain the prior closed tape");
  reset(); duringRange = () => values.set("mfe_mt5_account_namespace", "different|Exness-test|2");
  assert.equal((await refreshFocusedM5History(history, "XAUUSD")).reason, "HISTORY_ACCOUNT_CHANGED", "a reconnect during delivery cannot mix accounts");

  reset(); const abort = new AbortController(); duringRange = () => abort.abort();
  assert.equal((await refreshFocusedM5History(history, "XAUUSD", abort.signal)).reason, "REFRESH_CANCELLED");
  reset(); nextAccount = { ...account, connected: false, reason: "NOT_CONNECTED" };
  assert.equal((await refreshFocusedM5History(history, "XAUUSD")).reason, "NOT_CONNECTED");
  assert.equal(calls.length, 1, "disconnected accounts do not request bars");
} finally { Date.now = nativeNow; }
console.log("FOCUSED M5 REFRESH PASS: uncached live probes, closed-boundary catch-up, stable unchanged tape, bad provenance, forming bars, reconnects, aborts and disconnection.");
