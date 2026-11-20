// Compatibility types for the local read-only MT5 data bridge.
// Demo and Real accounts may provide data; legacy mutation requests are rejected locally.
import { isOffline, type Offline } from "./signatureClient.ts";
import { MT5_API, terminalCacheScope } from "./mt5Connection.ts";
import { finiteMinMax } from "./finiteMinMax.ts";

export interface Mt5DemoAccountInfo {
  connected: boolean; account_id?: string; account_kind: "DEMO" | "REAL" | "UNKNOWN";
  server?: string; broker?: string; trade_allowed: boolean; reason?: string;
  balance?: number | null; equity?: number | null; currency?: string; max_bars?: number | null;
}
export interface Mt5LiveBar {
  symbol: string; timeframe: string; time: string;
  open: number; high: number; low: number; close: number;
  tick_volume?: number; spread?: number | null; real_volume?: number;
}
/** Read-only feed states used by surfaces that need to explain why no tape is shown. */
export const MT5_FEED_STATES = ["OFFLINE", "STALE", "SYMBOL_NOT_FOUND", "CONNECTED_CLOSED_BARS"] as const;
export type Mt5FeedState = typeof MT5_FEED_STATES[number];

export interface Mt5BarsResult {
  ok?: boolean;
  bars?: Mt5ChartBar[];
  symbol?: string;
  broker_symbol?: string;
  timeframe?: string;
  source?: "MT5_CLOSED_BARS" | "MT5_FORMING_BAR" | string;
  /** Explicit source state emitted by the bridge for closed-bar consumers. */
  closed_bar_provenance?: "MT5_CLOSED_BARS" | string;
  forming_bar_included?: boolean;
  timestamp_basis?: "UTC" | string;
  server_timezone?: string;
  /** Short-lived bridge cache and newest-candle freshness diagnostics. */
  cache_hit?: boolean;
  cache_age_seconds?: number | null;
  retrieved_at?: string | null;
  latest_closed_bar_age_seconds?: number | null;
  reason?: string | null;
  authority?: "SHADOW_ONLY" | string;
  decision?: "NO_DECISION" | string;
  live_apply_allowed?: false;
  read_only?: true;
}

export interface Mt5FeedHealth {
  state: Mt5FeedState;
  ok: boolean;
  connected: boolean;
  symbol: string;
  timeframe: string;
  checkedAt: string;
  bars: number;
  latestClosedBar?: string;
  ageMs?: number;
  staleAfterMs: number;
  brokerSymbol?: string;
  reason?: string;
  readOnly: true;
}

const TIMEFRAME_MS: Record<string, number> = {
  M1: 60_000, M5: 5 * 60_000, M15: 15 * 60_000, M30: 30 * 60_000,
  H1: 60 * 60_000, H4: 4 * 60 * 60_000, D1: 24 * 60 * 60_000, W1: 7 * 24 * 60 * 60_000,
};
export interface Mt5FeedHealthOptions { now?: number; staleAfterMs?: number }

function asTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
const isCanonicalUtcTimestamp = (value: unknown, parsed = typeof value === "string" ? Date.parse(value) : NaN): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value) && Number.isFinite(parsed) && new Date(parsed).toISOString() === (value.endsWith(".000Z") ? value : value.replace("Z", ".000Z"));

/** Validate a small live tail before it can extend a cached research tape. */
export function isVerifiedClosedBarWindow(result: Mt5BarsResult | Offline, timeframe: string, checkedAtMs = Date.now()): result is Mt5BarsResult {
  // The bridge can include diagnostic rows on an error response. Never let
  // those rows extend a cached research tape: only an explicitly successful
  // closed-bar response is eligible for live-tail merging.
  // Authority markers are part of the terminal provenance contract: this
  // helper is also used by connection health and lightweight /bars refreshes,
  // so a closed-bar label alone must never make an execution-capable payload
  // look like trusted research data.
  // A timezone marker is part of the terminal provenance contract when the
  // bridge supplies one.  Reject malformed IANA identifiers before a live
  // tail can be merged into a persisted tape; otherwise a typo such as
  // `UTC+8` would look like a trustworthy closed-bar source after restart.
  // Closed-bar research/live-tail consumers are intentionally bounded to the
  // four broker history frames.  Falling back to a one-minute step for an
  // unknown or out-of-scope frame would let an M1/H4 response masquerade as a
  // verified Pattern Atlas tail.
  if (!BROKER_HISTORY_TIMEFRAMES.includes(timeframe as BrokerHistoryTimeframe)) return false;
  // The bridge includes the requested frame in every response. A payload
  // labelled with another timeframe must never extend a cached tape, even if
  // its timestamps happen to land on the caller's grid.
  // A verified tail must carry the exact frame attestation. Unlike feed-health
  // diagnostics, this response is eligible to merge into durable research
  // history, so an omitted timeframe is as unsafe as a mismatched one.
  if (isOffline(result) || result.ok !== true || !Array.isArray(result.bars) || !result.bars.length || result.timeframe !== timeframe || result.source !== "MT5_CLOSED_BARS" || result.closed_bar_provenance !== "MT5_CLOSED_BARS" || result.authority !== "SHADOW_ONLY" || result.decision !== "NO_DECISION" || result.live_apply_allowed !== false || result.read_only !== true || (result.timestamp_basis != null && result.timestamp_basis !== "UTC") || (result.server_timezone != null && !validServerTimezone(result.server_timezone)) || result.forming_bar_included === true) return false;
   const timeframeMs = TIMEFRAME_MS[timeframe];
   const serverTimezone = validServerTimezone(result.server_timezone) ? result.server_timezone : "UTC";
   const verifiedBars = result.bars as Mt5ChartBar[];
   const stamps = verifiedBars.map((bar) => asTimestamp(bar?.t));
   if (stamps.some((stamp, index) => stamp == null || !isCanonicalUtcTimestamp(verifiedBars[index]?.t, stamp) || !alignedHistoryTimestamp(stamp, timeframeMs, serverTimezone) || stamp + timeframeMs > checkedAtMs + 1_000)) return false;
  if (new Set(stamps).size !== stamps.length) return false;
   return verifiedBars.every((bar) => {
    const values = [bar?.o, bar?.h, bar?.l, bar?.c];
    return values.every((value) => typeof value === "number" && Number.isFinite(value)) && bar.h >= Math.max(bar.o, bar.c, bar.l) && bar.l <= Math.min(bar.o, bar.c, bar.h);
  });
}

/**
 * Classify already-fetched read-only responses. Keeping this pure makes the
 * connection contract testable without a browser, bridge, or credentials.
 */
export function classifyMt5Feed(
  account: Mt5DemoAccountInfo | Offline,
  result: Mt5BarsResult | Offline,
  symbol: string,
  timeframe: string,
  options: Mt5FeedHealthOptions = {},
): Mt5FeedHealth {
  const checkedAtMs = options.now ?? Date.now();
  const checkedAt = new Date(checkedAtMs).toISOString();
  const staleAfterMs = options.staleAfterMs ?? (TIMEFRAME_MS[timeframe] || 60_000) * 2 + 3 * 60_000;
  const base = { state: "OFFLINE" as Mt5FeedState, ok: false, connected: false, symbol, timeframe, checkedAt, bars: 0, staleAfterMs, readOnly: true as const };
  if (isOffline(account)) return { ...base, reason: account.error || "BRIDGE_OFFLINE" };
  if (!account.connected) return { ...base, reason: account.reason || "NOT_CONNECTED" };
  if (isOffline(result)) return { ...base, connected: true, reason: result.error || "BRIDGE_OFFLINE" };
  const bars = Array.isArray(result.bars) ? result.bars : [];
  const common = { connected: true, bars: bars.length, brokerSymbol: result.broker_symbol };
  if (result.reason === "SYMBOL_NOT_FOUND") return { ...base, ...common, state: "SYMBOL_NOT_FOUND", reason: result.reason };
  const timeframeMs = TIMEFRAME_MS[timeframe] || 60_000;
  const serverTimezone = validServerTimezone(result.server_timezone) ? result.server_timezone : "UTC";
  // Feed health is displayed as verified closed-bar state, so the bridge must
  // attest the exact requested frame; an omitted marker is ambiguous too.
  const timeframeMismatch = result.timeframe !== timeframe;
  const timestampedBars = bars.filter((bar) => asTimestamp(bar?.t) != null);
  const duplicateTimestamp = new Set(timestampedBars.map((bar) => new Date(asTimestamp(bar.t)!).toISOString())).size !== timestampedBars.length;
  const malformedBar = duplicateTimestamp || bars.some((bar) => {
    const timeMs = asTimestamp(bar?.t);
    const values = [bar?.o, bar?.h, bar?.l, bar?.c];
    const [open, high, low, close] = values;
     return timeMs == null || !isCanonicalUtcTimestamp(bar?.t, timeMs) || !alignedHistoryTimestamp(timeMs, timeframeMs, serverTimezone)
      || timeMs + timeframeMs > checkedAtMs + 1_000
      || values.some((value) => typeof value !== "number" || !Number.isFinite(value))
      || (typeof high === "number" && high < Math.max(open as number, close as number, low as number))
      || (typeof low === "number" && low > Math.min(open as number, close as number, high as number));
  });
  const latestClosedBar = timestampedBars.length ? timestampedBars.reduce((latest, bar) => asTimestamp(bar.t)! > asTimestamp(latest.t)! ? bar : latest, timestampedBars[0]).t : undefined;
  const latestMs = asTimestamp(latestClosedBar);
  // Freshness is measured from the bar's close, not its open. An H1 candle at
  // 00:00 is current at 01:00 when it has just closed; using the open time
  // would double-count the timeframe and mark session-boundary data stale too
  // early.
  const ageMs = latestMs == null ? undefined : Math.max(0, checkedAtMs - (latestMs + timeframeMs));
  // Closed-bar provenance must be explicit. A missing or unknown source marker
  // can describe a legacy/malformed response and must not be promoted to a
  // healthy live feed by inference.
  const closedBars = result.source === "MT5_CLOSED_BARS" && result.closed_bar_provenance === "MT5_CLOSED_BARS";
  const timestampBasisMismatch = result.timestamp_basis != null && result.timestamp_basis !== "UTC";
  const invalidServerTimezone = result.server_timezone != null && !validServerTimezone(result.server_timezone);
  if (result.ok !== true || !bars.length || invalidServerTimezone || malformedBar || latestMs == null || !closedBars || timeframeMismatch || timestampBasisMismatch || result.forming_bar_included === true || ageMs == null || ageMs > staleAfterMs) {
    return { ...base, ...common, state: "STALE", latestClosedBar, ageMs, reason: result.reason || (result.ok !== true ? "HISTORY_UNAVAILABLE" : !bars.length ? "NO_MARKET_DATA" : invalidServerTimezone ? "SERVER_TIMEZONE_MISMATCH" : malformedBar ? "INVALID_CLOSED_BAR" : latestMs == null ? "INVALID_BAR_TIMESTAMP" : !closedBars ? "CLOSED_BARS_REQUIRED" : timeframeMismatch ? "TIMEFRAME_MISMATCH" : timestampBasisMismatch ? "TIMESTAMP_BASIS_MISMATCH" : result.forming_bar_included === true ? "FORMING_BAR_INCLUDED" : "STALE_CLOSED_BARS") };
  }
  return { ...base, ...common, state: "CONNECTED_CLOSED_BARS", ok: true, latestClosedBar, ageMs };
}
interface Mt5Position { broker_order_id: string; symbol: string; side: "LONG_SCENARIO" | "SHORT_SCENARIO"; lot: number; open_price: number; current_price: number; floating_pnl: number; sl?: number; tp?: number }

// cockpit symbol → live MT5 broker symbol. Alias mặc-định (XM spot gold thường là GOLD.i#) NHƯNG tên vàng khác nhau
// theo sàn/loại tài-khoản → cho OVERRIDE qua localStorage `mfe_live_symbol` (user nhập đúng tên trong Market Watch của mình).
const SYMBOL_ALIAS: Record<string, string> = {};
export const liveSymbol = (cockpitSymbol: string): string => {
  try { const o = localStorage.getItem("mfe_live_symbol"); if (o && o.trim()) return o.trim(); } catch { /* localStorage blocked */ }
  return SYMBOL_ALIAS[cockpitSymbol] || cockpitSymbol;
};
export function setLiveSymbolOverride(sym: string): void { try { if (sym.trim()) localStorage.setItem("mfe_live_symbol", sym.trim()); else localStorage.removeItem("mfe_live_symbol"); } catch { /* */ } }
export function getLiveSymbolOverride(): string { try { return localStorage.getItem("mfe_live_symbol") || ""; } catch { return ""; } }

const jh = (): Record<string, string> => ({ "Content-Type": "application/json" });   // /mt5/* needs no token (demo-only, real blocked)
async function req<T>(path: string, opts: RequestInit = {}): Promise<T | Offline> {
  // Only read requests are supported through this compatibility adapter. Account changes
  // use the separate typed connector; old execution/admin POST calls cannot reach a broker.
  if (opts.method && opts.method !== "GET") return { offline: true, error: "READ_ONLY_CONNECTOR" };
  if (!path.startsWith("/mt5/")) return { offline: true, error: "LOCAL_SOURCE_UNAVAILABLE" };
  try {
    const r = await fetch(MT5_API + path.slice(4), opts);
    const payload = await r.json() as T | { error?: unknown };
    // A bridge 5xx/4xx response is transport failure for the history retry
    // loop. Treating its JSON body as a history payload makes the caller stop
    // on a contract/provenance mismatch and skips bounded recovery attempts.
    // Keep test doubles that omit `ok` compatible with the browser Response API.
    if (r.ok === false) {
      const detail = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : `HTTP_${r.status || 500}`;
      return { offline: true, error: detail };
    }
    return payload as T;
  }
  catch (e) { return { offline: true, error: String((e as Error)?.message || e) }; }
}
export { isOffline };

export const mt5Account = () => req<Mt5DemoAccountInfo>("/mt5/account", { headers: jh() });
// P4: real broker contract spec (digits/tick value/contract size) → lifts cost/spec calibration when MT5 is connected
export interface Mt5SymbolSpec { ok: boolean; symbol?: string; digits?: number; point?: number; trade_tick_size?: number; trade_tick_value?: number; trade_contract_size?: number; volume_min?: number; volume_step?: number; volume_max?: number; swap_long?: number; swap_short?: number; utc_offset_hours?: number; reason?: string }
export const mt5SymbolSpec = (symbol = "XAUUSD") => req<Mt5SymbolSpec>("/mt5/symbol_spec?symbol=" + encodeURIComponent(symbol), { headers: jh() });
export const mt5Bar = (symbol = "XAUUSD", tf = "M15") => req<Mt5LiveBar | { bar: null; reason: string }>("/mt5/bar?symbol=" + encodeURIComponent(symbol) + "&tf=" + tf, { headers: jh() });
export interface Mt5ChartBar { i: number; o: number; h: number; l: number; c: number; r: "N"; t: string }
export const mt5Bars = (symbol = "XAUUSD", tf = "M15", n = 300) => req<Mt5BarsResult>("/mt5/bars?symbol=" + encodeURIComponent(symbol) + "&tf=" + tf + "&n=" + n, { headers: jh(), cache: "no-store" });
/** Read account status and a small closed-bar window, without sending credentials. */
export async function mt5FeedHealth(symbol = "XAUUSD", tf = "M15", n = 2, options: Mt5FeedHealthOptions = {}): Promise<Mt5FeedHealth> {
  const account = await mt5Account();
  if (isOffline(account) || !account.connected) {
    return classifyMt5Feed(account, { bars: [] }, symbol, tf, options);
  }
  const bars = await mt5Bars(symbol, tf, Math.max(2, Math.min(10, n)));
  return classifyMt5Feed(account, bars, symbol, tf, options);
}
// backfill OHLC over a date RANGE [from, to] — auto-feed the gap after the system was offline. Fail-closed.
export interface Mt5History {
  ok: boolean; bars?: Mt5ChartBar[]; n?: number; reason?: string; detail?: string; from?: string; to?: string; symbol?: string; timeframe?: string; max_bars?: number | null;
  requested_bars?: number; returned_bars?: number; coverage_ratio?: number; terminal_max_bars?: number | null;
  /** Bridge-side boundary/freshness provenance for a bounded range response. */
  coverage_start?: string | null; coverage_end?: string | null;
  coverage_status?: "EMPTY" | "PARTIAL" | "COMPLETE" | string;
  latest_closed_bar_age_seconds?: number | null;
  /** Distinguishes the local terminal chart cap from broker-side retention. */
  history_limit?: "TERMINAL_MAX_BARS" | "BROKER_RETENTION" | string | null;
  closed_bar_provenance?: "MT5_CLOSED_BARS" | string; forming_bar_included?: boolean;
  /** Runtime timestamp provenance from the attached MT5 terminal. */
  server_timezone?: string; timestamp_basis?: "UTC" | string;
  /** Range responses identify their source so a stale bridge cannot be treated as history. */
  source?: "MT5_HISTORY" | "MT5_CLOSED_BARS" | string; contract_version?: number; authority?: "SHADOW_ONLY" | string; decision?: "NO_DECISION" | string; live_apply_allowed?: false; read_only?: boolean;
}
export const mt5History = (symbol = "XAUUSD", tf = "H1", from = "", to = "") =>
  req<Mt5History>("/mt5/history?symbol=" + encodeURIComponent(symbol) + "&tf=" + tf + "&from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to), { headers: jh() });

export const BROKER_HISTORY_TIMEFRAMES = ["M5", "M15", "M30", "H1"] as const;
export type BrokerHistoryTimeframe = typeof BROKER_HISTORY_TIMEFRAMES[number];
export const BROKER_HISTORY_YEARS = 3;
/** Versioned range contract. Pattern Atlas rejects older bridge responses. */
export const MT5_HISTORY_CONTRACT_VERSION = 2;
const HISTORY_TIMEFRAME_MS: Record<BrokerHistoryTimeframe, number> = { M5: 5 * 60_000, M15: 15 * 60_000, M30: 30 * 60_000, H1: 60 * 60_000 };
/** Keep requests below the bridge's 50,000 bar guard (and leave room for broker-side limits). */
export const HISTORY_MAX_BARS_PER_REQUEST = 50_000;
const HISTORY_CHUNK_BARS = 45_000;
const HISTORY_RETRY_ATTEMPTS = 3;
/** Give a transient terminal/bridge failure time to recover before retrying. */
export const HISTORY_RETRY_BACKOFF_MS = 250;
// Bump the persisted cache namespace whenever the range contract changes. A
// cached OHLC chunk is only useful when it was produced by the same versioned
// bridge contract as the current request; otherwise an older bridge can make a
// stale tape look complete even after a reconnect.
// Version 3 adds runtime clock provenance to persisted chunks. A restart must
// not promote a v2 cache written before the bridge exposed that provenance.
// Version 5 invalidates v4 chunks, which predated the explicit decision/live
// apply authority checks. Those chunks intentionally did not retain the raw
// markers, so they cannot be audited after restart and must be refetched.
// Version 6 requires the bridge to attest the exact requested symbol and
// timeframe on every successful range response.  v5 chunks were written
// without those raw identity markers and therefore cannot be audited after a
// restart; force an authoritative refetch instead of promoting them.
const HISTORY_CACHE_VERSION = 6;
// A successful range response that contains only a handful of rows is usually
// a broker-side history cap (or an incomplete download), not a real market
// interval. Trading sessions and holidays make an exact count impossible, so
// use a deliberately conservative lower bound and fail closed below it.
const HISTORY_MIN_COVERAGE_RATIO = 0.01;
// XAUUSD can close for several calendar days around Christmas/New Year. Allow
// a full holiday week before treating an interior omission as a broken tape;
// a gap beyond that is unlikely to be a normal market closure and must not be
// cached as complete causal history.
const HISTORY_MAX_INTERNAL_GAP_MS = 7 * 24 * 60 * 60 * 1000;
// A persisted range is a restart optimisation, not an archive.  Reusing a
// chunk indefinitely can preserve a broker correction (or a terminal cache
// from a disconnected account) behind the same explicit request window.  Keep
// the window generous enough for normal offline/restart workflows while
// forcing an occasional authoritative refresh.
const HISTORY_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const HISTORY_CACHE_FUTURE_SKEW_MS = 5 * 60 * 1000;
type HistoryCacheBar = [string, number, number, number, number];
interface HistoryCacheChunk {
  symbol: string; timeframe: BrokerHistoryTimeframe; from: string; to: string; bars: HistoryCacheBar[]; complete: boolean; contractVersion: number; savedAt: string;
  source?: string; closed_bar_provenance?: string; forming_bar_included?: boolean; server_timezone?: string; timestamp_basis?: string;
  /** Runtime-only diagnostic added when a persisted chunk passes validation. */
  cacheAgeMs?: number;
}

/**
 * localStorage is user-writable and may retain a torn/legacy account marker.
 * Never let such a marker become a reusable history scope.  The bridge emits
 * `account|server|generation`; all three components are required and the
 * generation must be a positive safe integer so detached/unknown terminals
 * collapse into the purged `detached` scope.
 */
const activeHistoryNamespace = (): string => terminalCacheScope();

/** A chunk's provenance is retained even when the broker returns only part of it. */
export interface Mt5HistoryChunkProvenance {
  from: string; to: string; requestedBars: number; receivedBars: number;
  attempts: number; cache: "HIT" | "MISS"; complete: boolean; reason?: string;
  /** Received/requested rows for this bounded range (0..1). */
  coverageRatio: number;
  /** Source attestations retained for each range, including validated cache hits. */
  source?: string; closedBarProvenance?: string; serverTimezone?: string; timestampBasis?: string;
  /** Age of a validated persisted chunk at the time it was reused. */
  cacheAgeMs?: number;
  /** Diagnostic only; does not grant execution or decision authority. */
  limitSource?: "TERMINAL_MAX_BARS" | "BROKER_RETENTION" | "UNKNOWN";
}
export interface Mt5HistoryProvenanceSummary {
  chunks: number; completeChunks: number; failedChunks: number;
  cachedChunks: number; cacheHits: number; cacheMisses: number; cacheHitRate: number;
  /** Age bounds of validated persisted chunks reused in this fetch. */
  oldestCacheAgeMs?: number; newestCacheAgeMs?: number;
  requestedBars: number; returnedBars: number; coverageRatio: number;
  sourceCounts: Record<string, number>;
  closedBarProvenanceCounts: Record<string, number>;
  /** Per-range runtime clock attestations, including missing markers. */
  serverTimezoneCounts: Record<string, number>;
  timestampBasisCounts: Record<string, number>;
  failureReasonCounts: Record<string, number>;
  serverTimezones: string[]; timestampBases: string[];
}

export interface Mt5ThreeYearHistory extends Mt5History {
  timeframe: BrokerHistoryTimeframe;
  requestedYears: number;
  chunks: number;
  source: "MT5_HISTORY_3Y";
  bars: Mt5ChartBar[];
  read_only: true;
  live_apply_allowed: false;
  authority: "SHADOW_ONLY";
  actualFrom?: string;
  actualTo?: string;
  coverageYears?: number;
  refreshProvenance?: { source: "MT5_HISTORY"; closedBarProvenance: "MT5_CLOSED_BARS"; serverTimezone: string; timestampBasis: "UTC"; from: string; to: string; coverageStatus: string; checkedAt: string; receivedBars: number };
  complete: boolean;
  coverageRanges?: Mt5HistoryChunkProvenance[];
  failedChunks?: Mt5HistoryChunkProvenance[];
  cachedChunks?: number;
  /** Age of the oldest validated persisted chunk reused in this fetch. */
  oldestCacheAgeMs?: number;
  /** Age of the newest validated persisted chunk reused in this fetch. */
  newestCacheAgeMs?: number;
  cachePersisted?: boolean;
  requestedBarsTotal: number;
  returnedBarsTotal: number;
  maxBarsPerRequest: number;
  terminalMaxBars?: number;
  /** Aggregated diagnostics; a missing value means the source did not identify a limit. */
  retentionSource?: "TERMINAL_MAX_BARS" | "BROKER_RETENTION" | "UNKNOWN";
  /**
   * Cache namespace captured at the start and end of the fetch.  A terminal
   * reconnect can race a multi-chunk request; exposing both values lets a
   * caller explain an account-change failure without treating the partial
   * tape as belonging to the new account.
   */
  cacheNamespace?: string;
  activeCacheNamespace?: string;
  /** Alias used by UI diagnostics when describing the account-scoped cache. */
  cacheScope?: string;
  activeCacheScope?: string;
  namespaceChanged?: boolean;
  closedBarProvenance: "MT5_CLOSED_BARS";
  /** Snake-case bridge contract aliases kept for API/UI observability. */
  closed_bar_provenance: "MT5_CLOSED_BARS";
  forming_bar_included: false;
  contract_version: number;
  /** Cache diagnostics for the assembled timeframe tape. */
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  /** Aggregate received/requested rows across every attempted chunk (0..1). */
  coverageRatio: number;
  /** Stable, JSON-friendly provenance rollup for diagnostics and audit logs. */
  provenanceSummary: Mt5HistoryProvenanceSummary;
  /** Snake-case alias for bridge/UI consumers that use the range contract keys. */
  provenance_summary: Mt5HistoryProvenanceSummary;
}

/**
 * Promotion gate for the canonical focused chart. A complete row count is
 * insufficient: the assembled tape must retain every runtime provenance and
 * account-scope marker before it can replace the labelled local fallback.
 */
export function isVerifiedClosedBarHistory(result: Mt5ThreeYearHistory | Offline, symbol: string, timeframe: BrokerHistoryTimeframe): result is Mt5ThreeYearHistory {
  if (isOffline(result) || result.ok !== true || result.complete !== true || !result.bars?.length) return false;
  if (result.source !== "MT5_HISTORY_3Y" || result.symbol !== symbol || result.timeframe !== timeframe) return false;
  // Promotion is a durable provenance boundary.  A response carrying the
  // current source label can still come from an older bridge/cache contract;
  // accepting it here would bypass the version check performed while
  // assembling fresh chunks and make an obsolete tape look verified after a
  // restart or caller-provided result.
  if (result.contract_version !== MT5_HISTORY_CONTRACT_VERSION) return false;
  if (result.closed_bar_provenance !== "MT5_CLOSED_BARS" || result.closedBarProvenance !== "MT5_CLOSED_BARS" || result.forming_bar_included !== false) return false;
  if (result.timestamp_basis !== "UTC" || !validServerTimezone(result.server_timezone)) return false;
  if (result.authority !== "SHADOW_ONLY" || result.decision !== "NO_DECISION" || result.live_apply_allowed !== false || result.read_only !== true) return false;
  // The embedded pair proves that the assembled fetch did not observe a
  // namespace transition while it was running, but it can still become stale
  // in the tiny window between the adapter's final check and this promotion
  // call.  Compare against the live connector scope as well so an old
  // account/server/generation tape cannot be promoted after a reconnect.
  if (result.namespaceChanged === true || !result.cacheNamespace || result.cacheNamespace === "detached" || result.activeCacheNamespace !== result.cacheNamespace || activeHistoryNamespace() !== result.cacheNamespace) return false;
  // The aggregate clock marker must describe every bounded range.  Merely
  // accepting individually valid IANA zones would allow a mixed-timezone tape
  // to cross the promotion boundary when a caller supplies a forged result;
  // the fetch path itself rejects this via `serverTimezoneMismatch`.
  if (!Array.isArray(result.coverageRanges) || result.coverageRanges.length === 0 || !result.coverageRanges.every((range) => range.complete && range.source === "MT5_HISTORY" && range.closedBarProvenance === "MT5_CLOSED_BARS" && range.timestampBasis === "UTC" && range.serverTimezone === result.server_timezone && validServerTimezone(range.serverTimezone))) return false;
  // Keep the public promotion gate fail-closed even when a caller supplies a
  // forged or stale assembled result. The fetch path validates each range,
  // but promotion must also reject malformed, off-grid, duplicate, or
  // geometrically invalid rows before they can replace the local fallback.
  const timeframeMs = HISTORY_TIMEFRAME_MS[timeframe];
  const seen = new Set<number>();
  return result.bars.every((bar) => {
    const stamp = asTimestamp(bar?.t);
    if (stamp == null || !isCanonicalUtcTimestamp(bar.t, stamp) || !alignedHistoryTimestamp(stamp, timeframeMs, result.server_timezone) || seen.has(stamp)) return false;
    seen.add(stamp);
    const values = [bar.o, bar.h, bar.l, bar.c];
    return values.every((value) => typeof value === "number" && Number.isFinite(value)) && bar.h >= Math.max(bar.o, bar.c, bar.l) && bar.l <= Math.min(bar.o, bar.c, bar.h);
  });
}

const historyCacheKey = (symbol: string, tf: BrokerHistoryTimeframe, from: string, to: string, namespace = activeHistoryNamespace()) =>
  `mfe_mt5_history_v${HISTORY_CACHE_VERSION}_${encodeURIComponent(namespace || "detached")}_${encodeURIComponent(symbol)}_${tf}_${Date.parse(from)}_${Date.parse(to)}`;
/**
 * Validate a candle against the broker's local session grid. MT5 encodes
 * broker-wall-clock epochs; after conversion to UTC, zones such as
 * Australia/Adelaide legitimately produce :30 timestamps for hourly bars.
 * Treating every feed as a UTC grid would reject valid DST/half-hour sessions.
 */
const timezoneFormatters = new Map<string, Intl.DateTimeFormat>();
const timezoneWallEpochMs = (timeMs: number, timezone: string): number | null => {
  if (!Number.isFinite(timeMs) || !Number.isInteger(timeMs) || typeof timezone !== "string" || !timezone.trim()) return null;
  try {
    let formatter = timezoneFormatters.get(timezone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        calendar: "gregory",
        numberingSystem: "latn",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hourCycle: "h23",
      });
      timezoneFormatters.set(timezone, formatter);
    }
    const parts = formatter.formatToParts(new Date(timeMs));
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    if (![values.year, values.month, values.day, values.hour, values.minute, values.second].every(Number.isFinite)) return null;
    return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
  } catch { return null; }
};
const alignedHistoryTimestamp = (timeMs: number, timeframeMs: number, timezone = "UTC"): boolean => {
  const wallEpochMs = timezoneWallEpochMs(timeMs, timezone);
  return wallEpochMs != null && Number.isFinite(timeframeMs) && timeframeMs > 0 && wallEpochMs % timeframeMs === 0;
};
const validHistoryCacheBar = (bar: unknown, fromMs: number, toMs: number, timeframeMs: number, timezone = "UTC"): bar is HistoryCacheBar => {
  if (!Array.isArray(bar) || bar.length !== 5 || typeof bar[0] !== "string") return false;
  const timeMs = Date.parse(bar[0]);
  const values = bar.slice(1);
  // Persisted chunks are provenance artifacts. Equivalent offsets and naive
  // wall-clock values must not be silently rewritten into UTC on a cache hit;
  // force a refetch from the attested bridge instead.
  if (!alignedHistoryTimestamp(timeMs, timeframeMs, timezone) || canonicalHistoryTimestamp(bar[0]) !== bar[0] || timeMs < fromMs || timeMs >= toMs || !values.every((value) => typeof value === "number" && Number.isFinite(value))) return false;
  const [, open, high, low, close] = bar;
  return high >= Math.max(open, close, low) && low <= Math.min(open, close, high);
};
const canonicalHistoryTimestamp = (value: string): string => {
  const iso = new Date(Date.parse(value)).toISOString();
  return iso.endsWith(".000Z") ? iso.slice(0, -5) + "Z" : iso;
};
const validServerTimezone = (value: unknown): value is string => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    // Use the platform's IANA timezone database rather than a permissive
    // string check; cache metadata is provenance and must be trustworthy after
    // a browser restart.
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch { return false; }
};
/**
 * A persisted chunk is trusted only when it still has a plausible amount of
 * coverage.  Row-level validation alone cannot detect a cache entry that was
 * written after an interior download failure: every remaining row can be
 * syntactically valid while a large section of the requested interval is
 * silently missing.  Keep the same conservative holiday allowance and lower
 * bound used by live range responses so cache hits and fresh fetches share the
 * same fail-closed coverage contract.
 */
const validHistoryCacheCoverage = (bars: HistoryCacheBar[], fromMs: number, toMs: number, timeframeMs: number): boolean => {
  if (!bars.length) return false;
  const timestamps = bars.map(([time]) => Date.parse(time)).sort((a, b) => a - b);
  const requestedBars = Math.max(1, Math.ceil((toMs - fromMs) / timeframeMs));
  const minimumCoverageBars = requestedBars >= 200 ? Math.max(2, Math.floor(requestedBars * HISTORY_MIN_COVERAGE_RATIO)) : 1;
  if (timestamps.length < minimumCoverageBars) return false;
  if (timestamps[0] > fromMs + HISTORY_MAX_INTERNAL_GAP_MS) return false;
  if (timestamps[timestamps.length - 1] < toMs - HISTORY_MAX_INTERNAL_GAP_MS) return false;
  return timestamps.every((stamp, index) => index === 0 || stamp - timestamps[index - 1] <= HISTORY_MAX_INTERNAL_GAP_MS);
};
const readHistoryChunk = (symbol: string, tf: BrokerHistoryTimeframe, from: string, to: string, namespace = activeHistoryNamespace()): HistoryCacheChunk | null => {
  try {
    const storage = globalThis.localStorage;
    const value = JSON.parse(storage.getItem(historyCacheKey(symbol, tf, from, to, namespace)) || "null") as HistoryCacheChunk | null;
    if (!value || value.symbol !== symbol || value.timeframe !== tf || value.from !== from || value.to !== to || value.complete !== true || value.contractVersion !== MT5_HISTORY_CONTRACT_VERSION || value.source !== "MT5_HISTORY" || value.closed_bar_provenance !== "MT5_CLOSED_BARS" || value.forming_bar_included !== false || !Array.isArray(value.bars)) return null;
    // Restarted callers must not promote an indefinitely old or future-dated
    // localStorage entry.  A malformed savedAt is treated as an untrusted
    // cache miss so the bridge remains the source of truth.
    const savedAtMs = typeof value.savedAt === "string" ? Date.parse(value.savedAt) : NaN;
    const cacheAgeMs = Date.now() - savedAtMs;
    if (!Number.isFinite(savedAtMs) || cacheAgeMs > HISTORY_CACHE_MAX_AGE_MS || cacheAgeMs < -HISTORY_CACHE_FUTURE_SKEW_MS) return null;
    // Restarted chunks must carry the complete runtime clock attestation. A
    // missing marker is as unsafe as a contradictory one: without it we
    // cannot prove that broker-local epochs were normalized using the same
    // timezone as the rest of the tape. Older chunks remain addressable by
    // their versioned key but are deliberately refetched from the bridge.
    if (value.timestamp_basis !== "UTC") return null;
    // Keep runtime clock provenance typed and scalar. JSON can contain objects,
    // arrays, or empty strings under this field; allowing those through would
    // make a restarted cache report malformed terminal metadata (and could
    // hide a mixed-clock tape because Set comparisons use object identity).
    if (!validServerTimezone(value.server_timezone)) return null;
    const fromMs = Date.parse(from); const toMs = Date.parse(to);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs || value.bars.length === 0) return null;
    const bars = value.bars.filter((bar): bar is HistoryCacheBar => validHistoryCacheBar(bar, fromMs, toMs, HISTORY_TIMEFRAME_MS[tf], value.server_timezone)).map((bar) => [canonicalHistoryTimestamp(bar[0]), ...bar.slice(1)] as HistoryCacheBar);
    const timestamps = new Set(bars.map(([time]) => time));
    return bars.length === value.bars.length && timestamps.size === bars.length && validHistoryCacheCoverage(bars, fromMs, toMs, HISTORY_TIMEFRAME_MS[tf])
      ? { ...value, bars, cacheAgeMs: Math.max(0, cacheAgeMs) }
      : null;
  } catch { return null; }
};
const writeHistoryChunk = (symbol: string, tf: BrokerHistoryTimeframe, from: string, to: string, bars: Mt5ChartBar[], provenance: Pick<Mt5History, "symbol" | "timeframe" | "server_timezone" | "timestamp_basis"> = {}, namespace = activeHistoryNamespace()): boolean => {
  // Persisted history is only reusable after a restart when the bridge has
  // attested both the UTC timestamp basis and the exact broker timezone. A
  // successful response lacking either marker remains usable in-memory, but
  // must never seed localStorage with an unverifiable chunk.
  if (provenance.symbol !== symbol || provenance.timeframe !== tf || provenance.timestamp_basis !== "UTC" || !validServerTimezone(provenance.server_timezone)) return false;
  // Keep the writer strict even if a future caller bypasses the fetch-loop
  // validation above.  localStorage is a durable evidence boundary: one
  // malformed, off-grid, duplicated or out-of-window row must make the whole
  // write fail closed rather than leaving a partially trustworthy cache.
  const fromMs = Date.parse(from); const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs || !Array.isArray(bars) || !bars.length) return false;
  try {
    const storage = globalThis.localStorage;
    const compact: HistoryCacheBar[] = bars.map((bar) => [bar.t, bar.o, bar.h, bar.l, bar.c]);
    const timeframeMs = HISTORY_TIMEFRAME_MS[tf];
    if (compact.some((bar) => !validHistoryCacheBar(bar, fromMs, toMs, timeframeMs, provenance.server_timezone)) || new Set(compact.map(([time]) => canonicalHistoryTimestamp(time))).size !== compact.length || !validHistoryCacheCoverage(compact, fromMs, toMs, timeframeMs)) return false;
    storage.setItem(historyCacheKey(symbol, tf, from, to, namespace), JSON.stringify({ symbol: provenance.symbol, timeframe: tf, from, to, bars: compact, complete: true, contractVersion: MT5_HISTORY_CONTRACT_VERSION, savedAt: new Date().toISOString(), source: "MT5_HISTORY", closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: provenance.server_timezone, timestamp_basis: provenance.timestamp_basis } satisfies HistoryCacheChunk));
    return true;
  } catch { return false; }
};
const removeHistoryChunk = (symbol: string, tf: BrokerHistoryTimeframe, from: string, to: string, namespace = activeHistoryNamespace()): void => {
  try { globalThis.localStorage.removeItem(historyCacheKey(symbol, tf, from, to, namespace)); } catch { /* storage is optional */ }
};
const purgeDetachedHistoryCaches = (): void => {
  try {
    const storage = globalThis.localStorage;
    const stale: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith("mfe_mt5_history_v")) stale.push(key);
    }
    for (const key of stale) storage.removeItem(key);
  } catch { /* storage is optional or restricted */ }
};
const unpackHistoryChunk = (value: HistoryCacheChunk): Mt5ChartBar[] => value.bars.map(([t, o, h, l, c], i) => ({ t, o, h, l, c, r: "N", i }));
const retryableHistoryReason = (reason: string | undefined): boolean => {
  if (!reason) return true;
  // An empty range is often the first response while MT5 is downloading an
  // old symbol slice. Retry it with the same bounded backoff as transport
  // failures; malformed/provenance failures remain terminal and fail closed.
  return /OFFLINE|TIMEOUT|UNAVAILABLE|FAILED|NOT_CONNECTED|RETRY|HTTP_5\d\d|HTTP_(?:408|429)|MAX.?BARS|EXCESSIVE|NO_MARKET_DATA|HISTORY_UNAVAILABLE|BROKER_RETENTION/i.test(reason);
};
const waitForHistoryRetry = async (attempt: number): Promise<void> => {
  const delay = HISTORY_RETRY_BACKOFF_MS * (2 ** Math.max(0, attempt - 1));
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
};
const HISTORY_FAILURE_PRIORITY = [
  "HISTORY_ACCOUNT_CHANGED",
  "HISTORY_CONTRACT_MISMATCH",
  "HISTORY_SYMBOL_MISMATCH",
  "HISTORY_TIMEFRAME_MISMATCH",
  "HISTORY_PROVENANCE_MISSING",
  "HISTORY_AUTHORITY_MISMATCH",
  "HISTORY_TIMESTAMP_BASIS_MISMATCH",
  "HISTORY_SERVER_TIMEZONE_MISMATCH",
  "OUTSIDE_REQUESTED_WINDOW",
  "INVALID_BAR_DATA",
  "HISTORY_INTERNAL_GAP",
] as const;
const dominantHistoryFailure = (failedChunks: Mt5HistoryChunkProvenance[]): string | undefined => {
  for (const reason of HISTORY_FAILURE_PRIORITY) {
    if (failedChunks.some((chunk) => chunk.reason === reason)) return reason;
  }
  return undefined;
};
const ratio = (received: number, requested: number): number => requested > 0 ? Number(Math.max(0, Math.min(1, received / requested)).toFixed(6)) : 0;

/** Subtract calendar years without allowing leap-day overflow into March. */
const subtractUtcYears = (value: Date, years: number): Date => {
  const result = new Date(value.getTime());
  const month = result.getUTCMonth();
  const day = result.getUTCDate();
  // Move to the first of the month before changing the year. Date's native
  // setter otherwise normalizes 29 February in a non-leap target year to 1
  // March, silently shortening a requested multi-year history window.
  result.setUTCDate(1);
  result.setUTCFullYear(result.getUTCFullYear() - years);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), month + 1, 0)).getUTCDate();
  result.setUTCMonth(month, Math.min(day, lastDay));
  return result;
};

/** Fetch a multi-year closed-bar tape in bounded, retryable range requests (no M1). */
export async function mt5ThreeYearHistory(symbol = "XAUUSD", tf: BrokerHistoryTimeframe = "M15", now = Date.now()): Promise<Mt5ThreeYearHistory | Offline> {
  // Keep the three-year Pattern Atlas contract fail-closed at runtime as well
  // as in TypeScript. Browser callers and persisted UI state can still pass a
  // stale/forged timeframe string; allowing M1 (or an unknown value) through
  // would produce an invalid step size and could silently look like an empty
  // tape. M1 remains intentionally outside the Atlas health/history scope.
  if (!BROKER_HISTORY_TIMEFRAMES.includes(tf as BrokerHistoryTimeframe)) {
    return { offline: true, error: "UNSUPPORTED_HISTORY_TIMEFRAME" };
  }
  const end = new Date(now);
  const start = subtractUtcYears(end, BROKER_HISTORY_YEARS);
  const timeframeMs = HISTORY_TIMEFRAME_MS[tf];
  // Only request fully closed buckets. A range ending at wall-clock `now` can
  // include the currently forming bar (its open is before `now`), violating
  // the closed-bar history contract and poisoning the persisted chunk cache.
  const fetchEndMs = Math.floor(end.getTime() / timeframeMs) * timeframeMs;
  const stepMs = timeframeMs * HISTORY_CHUNK_BARS;
  // Keep one account/server/generation scope for the entire fetch. Reading
  // the live namespace per chunk could combine rows from two terminals when a
  // reconnect races an in-flight range request.
  const cacheNamespace = activeHistoryNamespace();
  // A detached fetch must never leave old account-scoped ranges available for
  // a later reconnect race. The connector normally purges these on detach;
  // this protects direct adapter callers and partial lifecycle transitions.
  if (cacheNamespace === "detached") purgeDetachedHistoryCaches();
  let namespaceChanged = false;
  const merged = new Map<string, Mt5ChartBar>();
  // Align chunk boundaries so a reload can reuse completed chunks while the moving
  // three-year window only invalidates the first/last chunk.
  let cursor = Math.floor(start.getTime() / stepMs) * stepMs;
  let chunks = 0;
  let cachedChunks = 0;
  const cacheAgesMs: number[] = [];
  let terminalMaxBars: number | undefined;
  let serverTimezone: string | undefined;
  const serverTimezones = new Set<string>();
  let missingServerTimezone = false;
  let invalidServerTimezoneSeen = false;
  let timestampBasis: string | undefined;
  const timestampBases = new Set<string>();
  let missingTimestampBasis = false;
  const retentionSources = new Set<"TERMINAL_MAX_BARS" | "BROKER_RETENTION" | "UNKNOWN">();
  let cachePersisted = false;
  let unsafeMetadataSeen = false;
  const coverageRanges: Mt5HistoryChunkProvenance[] = [];
  const failedChunks: Mt5HistoryChunkProvenance[] = [];
  const persistedRanges: Array<{ from: string; to: string }> = [];
  while (cursor < fetchEndMs) {
    if (activeHistoryNamespace() !== cacheNamespace) { namespaceChanged = true; break; }
    const chunkEnd = Math.min(fetchEndMs, cursor + stepMs);
    const chunkFrom = new Date(cursor).toISOString();
    const chunkTo = new Date(chunkEnd).toISOString();
    const requestedBars = Math.max(1, Math.ceil((chunkEnd - cursor) / timeframeMs));
    chunks++;
    const cached = readHistoryChunk(symbol, tf, chunkFrom, chunkTo, cacheNamespace);
    if (cached) {
      cachedChunks++;
      if (Number.isFinite(cached.cacheAgeMs)) cacheAgesMs.push(cached.cacheAgeMs!);
      serverTimezone ||= cached.server_timezone;
      if (cached.server_timezone) serverTimezones.add(cached.server_timezone);
      else missingServerTimezone = true;
      timestampBasis ||= cached.timestamp_basis;
      if (cached.timestamp_basis) timestampBases.add(cached.timestamp_basis);
      else missingTimestampBasis = true;
      for (const bar of unpackHistoryChunk(cached)) merged.set(bar.t, bar);
      coverageRanges.push({ from: chunkFrom, to: chunkTo, requestedBars, receivedBars: cached.bars.length, coverageRatio: ratio(cached.bars.length, requestedBars), attempts: 0, cache: "HIT", complete: true, cacheAgeMs: cached.cacheAgeMs, source: cached.source, closedBarProvenance: cached.closed_bar_provenance, serverTimezone: cached.server_timezone, timestampBasis: cached.timestamp_basis });
      cursor = chunkEnd;
      continue;
    }
    let result: Mt5History | Offline = { offline: true, error: "HISTORY_NOT_REQUESTED" };
    let attempts = 0;
    for (; attempts < HISTORY_RETRY_ATTEMPTS;) {
      attempts++;
      result = await mt5History(symbol, tf, chunkFrom, chunkTo);
      if (isOffline(result)) {
        if (!retryableHistoryReason(result.error) || attempts >= HISTORY_RETRY_ATTEMPTS) break;
        await waitForHistoryRetry(attempts);
        continue;
      }
      const explicitLimit = result.history_limit === "TERMINAL_MAX_BARS" || result.history_limit === "BROKER_RETENTION"
        || /BROKER_RETENTION|BROKER_MAX_BARS_LIMIT|TERMINAL_MAX_BARS_LIMIT/i.test(result.reason || "");
      // A broker/terminal limit is deterministic. Retrying an empty capped
      // range only adds latency during a multi-chunk three-year pull and cannot
      // reveal rows that the source has already said it does not retain.
      if (result.ok || explicitLimit || !retryableHistoryReason(result.reason) || attempts >= HISTORY_RETRY_ATTEMPTS) break;
      await waitForHistoryRetry(attempts);
    }
    if (isOffline(result)) {
      const failed = { from: chunkFrom, to: chunkTo, requestedBars, receivedBars: 0, coverageRatio: 0, attempts, cache: "MISS" as const, complete: false, reason: result.error || "BRIDGE_OFFLINE" };
      failedChunks.push(failed); coverageRanges.push(failed); cursor = chunkEnd; continue;
    }
    const reportedMaxBars = typeof result.terminal_max_bars === "number" && Number.isFinite(result.terminal_max_bars) && result.terminal_max_bars > 0
      ? result.terminal_max_bars
      : typeof result.max_bars === "number" && Number.isFinite(result.max_bars) && result.max_bars > 0 ? result.max_bars : undefined;
    if (reportedMaxBars != null) terminalMaxBars = reportedMaxBars;
    const rawBars = Array.isArray(result.bars) ? result.bars : [];
    const invalidServerTimezone = result.server_timezone != null && !validServerTimezone(result.server_timezone);
    const missingServerTimezoneMarker = result.server_timezone == null;
    if (invalidServerTimezone) invalidServerTimezoneSeen = true;
    if (validServerTimezone(result.server_timezone)) {
      serverTimezone ||= result.server_timezone;
      serverTimezones.add(result.server_timezone);
    } else if (result.server_timezone == null) missingServerTimezone = true;
    timestampBasis ||= result.timestamp_basis;
    if (result.timestamp_basis) timestampBases.add(result.timestamp_basis);
    else missingTimestampBasis = true;
    // Version 2's MT5_HISTORY source is itself a closed-bar contract. Newer
    // bridges also emit the explicit marker; accepting the versioned source
    // keeps rolling upgrades safe while still rejecting unknown sources.
    const closedProvenance = result.closed_bar_provenance || (result.source === "MT5_HISTORY" ? "MT5_CLOSED_BARS" : "");
    const provenanceMissing = result.source !== "MT5_HISTORY" || closedProvenance !== "MT5_CLOSED_BARS";
    // An explicit live/order authority marker is incompatible with the
    // read-only history contract and must not be cached as research data.
    // Treat explicit authority escalations as unsafe metadata.  Omitted
    // markers remain compatible with older bridge fixtures, but a response
    // that says it can apply live decisions must never seed a read-only
    // history cache and then be relabelled by the assembled result below.
    const authorityMismatch = (result.authority != null && result.authority !== "SHADOW_ONLY")
      || (result.decision != null && result.decision !== "NO_DECISION")
      || (result.live_apply_allowed != null && result.live_apply_allowed !== false)
      || result.read_only === false;
    const timestampBasisMismatch = result.timestamp_basis != null && result.timestamp_basis !== "UTC";
    const missingTimestampBasisMarker = result.timestamp_basis == null;
    const formingIncluded = result.forming_bar_included === true;
    // Identity is part of the range provenance contract.  A response that
    // omits either marker is as unsafe as one naming another tape: the
    // assembled result must never relabel an unscoped payload as XAUUSD M5.
    const symbolMismatch = result.symbol !== symbol;
    const timeframeMismatch = result.timeframe !== tf;
    const contractMismatch = result.contract_version !== MT5_HISTORY_CONTRACT_VERSION;
    // Do not silently drop a malformed row from an otherwise populated range:
    // an old/stale bridge can return valid rows alongside an invalid timestamp,
    // and accepting the remainder would make the cached tape ambiguous.
    const malformedTimestamp = rawBars.some((bar) => !isCanonicalUtcTimestamp(bar?.t));
    const explicitHistoryLimit = result.history_limit === "TERMINAL_MAX_BARS" || result.history_limit === "BROKER_RETENTION" ? result.history_limit : undefined;
    const rawTimestamps = rawBars.map((bar) => Date.parse(bar?.t)).filter(Number.isFinite);
    const windowViolation = rawTimestamps.some((ms) => ms < cursor || ms >= chunkEnd);
    if (contractMismatch || symbolMismatch || timeframeMismatch || provenanceMissing || authorityMismatch || invalidServerTimezone || missingServerTimezoneMarker || timestampBasisMismatch || missingTimestampBasisMarker || formingIncluded || windowViolation) unsafeMetadataSeen = true;
    const inWindow = rawBars.filter((bar) => {
      const ms = Date.parse(bar?.t); return Number.isFinite(ms) && ms >= cursor && ms < chunkEnd;
    });
    const returned = inWindow.filter((bar): bar is Mt5ChartBar =>
      alignedHistoryTimestamp(Date.parse(bar?.t), timeframeMs, result.server_timezone || "UTC") &&
      typeof bar.o === "number" && Number.isFinite(bar.o) &&
      typeof bar.h === "number" && Number.isFinite(bar.h) &&
      typeof bar.l === "number" && Number.isFinite(bar.l) &&
      typeof bar.c === "number" && Number.isFinite(bar.c) &&
      bar.h >= Math.max(bar.o, bar.c, bar.l) && bar.l <= Math.min(bar.o, bar.c, bar.h));
    const normalizedReturned = returned.map((bar) => ({ ...bar, t: canonicalHistoryTimestamp(bar.t) }));
    const duplicateBars = new Set(normalizedReturned.map((bar) => bar.t)).size !== normalizedReturned.length;
    const invalidBars = malformedTimestamp || returned.length !== inWindow.length || duplicateBars;
    const uniqueReturned = [...new Map(normalizedReturned.map((bar) => [bar.t, bar])).values()];
    const returnedRange = finiteMinMax(uniqueReturned.map((bar) => Date.parse(bar.t)));
    const firstMs = returnedRange?.[0] ?? null;
    // The first tradable bar after a requested boundary can be many candles
    // later because XAUUSD closes overnight and across holidays. Only treat a
    // boundary delay longer than the holiday allowance as broker truncation.
    // The first aligned chunk can begin before the requested rolling window.
    // Compare its first returned bar with the real request boundary so a
    // healthy three-year H1 tape is not mislabeled as broker-truncated merely
    // because the chunk grid starts several days earlier.
    const lowerCoverageBoundary = Math.max(cursor, start.getTime());
    const lastMs = returnedRange?.[1] ?? null;
    const limited = (firstMs != null && firstMs > lowerCoverageBoundary + HISTORY_MAX_INTERNAL_GAP_MS)
      || (lastMs != null && lastMs < chunkEnd - HISTORY_MAX_INTERNAL_GAP_MS)
      || explicitHistoryLimit != null;
    const orderedMs = uniqueReturned.map((bar) => Date.parse(bar.t)).sort((a, b) => a - b);
    const internalGap = orderedMs.some((stamp, index) => index > 0 && stamp - orderedMs[index - 1] > HISTORY_MAX_INTERNAL_GAP_MS);
    // Keep genuinely tiny range requests valid (for example a one-bar tail
    // after a boundary rollover); apply the lower-bound heuristic to the
    // large chunks used by the three-year fetch.
    const minimumCoverageBars = requestedBars >= 200 ? Math.max(2, Math.floor(requestedBars * HISTORY_MIN_COVERAGE_RATIO)) : 1;
    const sparse = uniqueReturned.length < minimumCoverageBars;
    const terminalLimit = reportedMaxBars != null && requestedBars > reportedMaxBars && rawBars.length <= reportedMaxBars;
    const limitSource: "TERMINAL_MAX_BARS" | "BROKER_RETENTION" | "UNKNOWN" = terminalLimit
      ? "TERMINAL_MAX_BARS"
      : explicitHistoryLimit
      ? explicitHistoryLimit
      // An interior gap is a coverage failure, but it does not identify its
      // cause. It may be a broker omission, a terminal download interruption,
      // or source corruption. Keep the chunk partial while leaving the limit
      // source unknown unless the bridge explicitly reports a cap/retention
      // condition or the boundary/sparsity checks indicate truncation.
      : (limited || sparse || (!result.ok && (result.reason === "NO_MARKET_DATA" || result.reason === "HISTORY_UNAVAILABLE" || result.reason === "BROKER_RETENTION")))
        ? "BROKER_RETENTION" : "UNKNOWN";
    if (limitSource !== "UNKNOWN") retentionSources.add(limitSource);
    const chunkReason = contractMismatch
      ? "HISTORY_CONTRACT_MISMATCH"
      : symbolMismatch
      ? "HISTORY_SYMBOL_MISMATCH"
      : timeframeMismatch
      ? "HISTORY_TIMEFRAME_MISMATCH"
      : provenanceMissing
      ? "HISTORY_PROVENANCE_MISSING"
      : authorityMismatch
      ? "HISTORY_AUTHORITY_MISMATCH"
      : invalidServerTimezone || missingServerTimezoneMarker
      ? "HISTORY_SERVER_TIMEZONE_MISMATCH"
      : timestampBasisMismatch || missingTimestampBasisMarker
      ? "HISTORY_TIMESTAMP_BASIS_MISMATCH"
      : formingIncluded
      ? "FORMING_BAR_INCLUDED"
      : windowViolation
        ? "OUTSIDE_REQUESTED_WINDOW"
        : invalidBars
          ? "INVALID_BAR_DATA"
            : internalGap
              ? "HISTORY_INTERNAL_GAP"
            : limited || sparse
            ? "BROKER_MAX_BARS_LIMIT"
            : result.reason;
    const provenance: Mt5HistoryChunkProvenance = { from: chunkFrom, to: chunkTo, requestedBars, receivedBars: uniqueReturned.length, coverageRatio: ratio(uniqueReturned.length, requestedBars), attempts, cache: "MISS", complete: !!result.ok && !contractMismatch && !symbolMismatch && !timeframeMismatch && !provenanceMissing && !authorityMismatch && !invalidServerTimezone && !missingServerTimezoneMarker && !timestampBasisMismatch && !missingTimestampBasisMarker && !formingIncluded && !windowViolation && !limited && !invalidBars && !sparse && !internalGap, reason: chunkReason, limitSource, source: result.source, closedBarProvenance: result.closed_bar_provenance, serverTimezone: result.server_timezone, timestampBasis: result.timestamp_basis };
    coverageRanges.push(provenance);
    if (!result.ok || !uniqueReturned.length || contractMismatch || symbolMismatch || timeframeMismatch || provenanceMissing || authorityMismatch || invalidServerTimezone || missingServerTimezoneMarker || timestampBasisMismatch || missingTimestampBasisMarker || formingIncluded || windowViolation) { failedChunks.push({ ...provenance, complete: false, reason: chunkReason || "NO_MARKET_DATA" }); cursor = chunkEnd; continue; }
    if (invalidBars || sparse || internalGap) failedChunks.push({ ...provenance, complete: false, reason: chunkReason || "BROKER_MAX_BARS_LIMIT" });
    for (const bar of uniqueReturned) merged.set(bar.t, bar);
    if (!limited && !invalidBars && !sparse && !internalGap) {
      const wrote = writeHistoryChunk(symbol, tf, chunkFrom, chunkTo, uniqueReturned, result, cacheNamespace);
      cachePersisted = wrote || cachePersisted;
      if (wrote) persistedRanges.push({ from: chunkFrom, to: chunkTo });
    }
    cursor = chunkEnd;
  }
  const bars = [...merged.values()].filter((bar) => { const ms = Date.parse(bar.t); return Number.isFinite(ms) && ms >= start.getTime() && ms < fetchEndMs; }).sort((a, b) => a.t.localeCompare(b.t)).map((bar, i) => ({ ...bar, i }));
  const actualFrom = bars[0]?.t;
  const actualTo = bars.length ? bars[bars.length - 1].t : undefined;
  const coverageYears = actualFrom && actualTo ? Math.max(0, (Date.parse(actualTo) - Date.parse(actualFrom)) / (365.25 * 86_400_000)) : 0;
  // Chunk-level boundary checks cannot see a gap that straddles two chunks:
  // the last row of one chunk and the first row of the next can each be within
  // the holiday allowance while their combined gap is not. Validate the
  // merged tape as a whole before promoting it to complete history.
  const orderedMergedMs = bars.map((bar) => Date.parse(bar.t));
  const globalInternalGap = orderedMergedMs.some((stamp, index) => index > 0 && stamp - orderedMergedMs[index - 1] > HISTORY_MAX_INTERNAL_GAP_MS);
  // A known clock mixed with an unmarked chunk is just as unsafe as two
  // different clocks: the missing marker cannot prove that its timestamps use
  // the same broker wall-clock basis. Preserve legacy all-unmarked fixtures,
  // but fail closed when an otherwise identified tape becomes ambiguous.
  const serverTimezoneMismatch = invalidServerTimezoneSeen || serverTimezones.size > 1 || missingServerTimezone;
  const timestampBasisMismatchAcrossChunks = timestampBases.size > 1 || missingTimestampBasis;
  namespaceChanged ||= activeHistoryNamespace() !== cacheNamespace;
  // A boundary gap can be assembled from individually valid chunks. Remove
  // every chunk participating in that failed tape so a restart can retry the
  // bridge instead of replaying the same incomplete cache forever.
  // A later contract/provenance failure can otherwise leave earlier valid
  // chunks persisted. Remove every chunk touched by this fetch so a restart
  // cannot assemble a stale partial tape around the unsafe response.
  if (globalInternalGap || serverTimezoneMismatch || timestampBasisMismatchAcrossChunks || unsafeMetadataSeen) {
    for (const range of coverageRanges) removeHistoryChunk(symbol, tf, range.from, range.to, cacheNamespace);
    for (const range of persistedRanges) removeHistoryChunk(symbol, tf, range.from, range.to, cacheNamespace);
    cachePersisted = false;
  }
  if (namespaceChanged) {
    // Any chunks read or written before the transition belong to the old
    // scope and must not be replayed as a complete tape after this mixed
    // fetch. Include cache hits as well as fresh writes: a namespace race can
    // otherwise leave stale ranges behind for a later reconnect to reuse.
    for (const range of coverageRanges) removeHistoryChunk(symbol, tf, range.from, range.to, cacheNamespace);
    for (const range of persistedRanges) removeHistoryChunk(symbol, tf, range.from, range.to, cacheNamespace);
    cachePersisted = false;
  }
  // The first available tradable bar can begin after an overnight or holiday
  // closure. Treat that boundary delay like the range guard; interior gaps are
  // still checked separately and remain fail-closed.
  const complete = !!actualFrom && Date.parse(actualFrom) <= start.getTime() + HISTORY_MAX_INTERNAL_GAP_MS && !globalInternalGap && !serverTimezoneMismatch && !timestampBasisMismatchAcrossChunks && !namespaceChanged && failedChunks.length === 0 && coverageRanges.every((range) => range.complete);
  const dominantFailure = (timestampBasisMismatchAcrossChunks && timestampBases.size > 0)
    ? "HISTORY_TIMESTAMP_BASIS_MISMATCH"
    : dominantHistoryFailure(failedChunks);
  const reason = bars.length
    ? complete ? undefined : dominantFailure || (failedChunks.length ? "HISTORY_PARTIAL_CHUNKS" : namespaceChanged ? "HISTORY_ACCOUNT_CHANGED" : globalInternalGap ? "HISTORY_INTERNAL_GAP" : timestampBasisMismatchAcrossChunks ? "HISTORY_TIMESTAMP_BASIS_MISMATCH" : serverTimezoneMismatch ? "HISTORY_SERVER_TIMEZONE_MISMATCH" : "BROKER_HISTORY_TRUNCATED")
    : dominantFailure || (failedChunks.length ? "HISTORY_UNAVAILABLE" : "NO_MARKET_DATA");
  const retentionSource = retentionSources.size === 1 ? [...retentionSources][0] : retentionSources.size > 1 ? "UNKNOWN" : undefined;
  const requestedBarsTotal = coverageRanges.reduce((sum, range) => sum + range.requestedBars, 0);
  const returnedBarsTotal = coverageRanges.reduce((sum, range) => sum + range.receivedBars, 0);
  const activeCacheNamespace = activeHistoryNamespace();
  const cacheAgeRange = finiteMinMax(cacheAgesMs);
  const oldestCacheAgeMs = cacheAgeRange?.[1];
  const newestCacheAgeMs = cacheAgeRange?.[0];
  const cacheMisses = Math.max(0, chunks - cachedChunks);
  const cacheHitRate = chunks ? ratio(cachedChunks, chunks) : 0;
  const coverageRatio = ratio(returnedBarsTotal, requestedBarsTotal);
  // Keep missing attestations visible in the aggregate instead of silently
  // dropping failed/offline ranges from the source denominator. Successful
  // chunks retain their exact broker markers; an explicit bucket makes a
  // partial tape's provenance readout add up to the requested chunk count.
  const countValues = (values: Array<string | undefined>, missing = ""): Record<string, number> => values.reduce<Record<string, number>>((counts, value) => {
    const key = value || missing;
    if (key) counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const provenanceSummary: Mt5HistoryProvenanceSummary = {
    chunks, completeChunks: coverageRanges.filter((range) => range.complete).length, failedChunks: failedChunks.length,
    cachedChunks, cacheHits: cachedChunks, cacheMisses, cacheHitRate, oldestCacheAgeMs, newestCacheAgeMs,
    requestedBars: requestedBarsTotal, returnedBars: returnedBarsTotal, coverageRatio,
    // Only accepted attestations belong in a provenance bucket. Unknown or
    // malformed markers are intentionally collapsed into UNATTESTED so the
    // summary cannot make an unsafe partial tape look broker-verified.
    sourceCounts: countValues(coverageRanges.map((range) => range.source === "MT5_HISTORY" ? range.source : undefined), "UNATTESTED"),
    closedBarProvenanceCounts: countValues(coverageRanges.map((range) => range.closedBarProvenance === "MT5_CLOSED_BARS" ? range.closedBarProvenance : undefined), "UNATTESTED"),
    serverTimezoneCounts: countValues(coverageRanges.map((range) => validServerTimezone(range.serverTimezone) ? range.serverTimezone : undefined), "UNATTESTED"),
    timestampBasisCounts: countValues(coverageRanges.map((range) => range.timestampBasis === "UTC" ? range.timestampBasis : undefined), "UNATTESTED"),
    failureReasonCounts: countValues(coverageRanges.filter((range) => !range.complete).map((range) => range.reason)),
    serverTimezones: [...serverTimezones].sort(), timestampBases: [...timestampBases].sort(),
  };
  return { ok: bars.length > 0, bars, n: bars.length, symbol, timeframe: tf, requestedYears: BROKER_HISTORY_YEARS, chunks, source: "MT5_HISTORY_3Y", read_only: true, live_apply_allowed: false, authority: "SHADOW_ONLY", decision: "NO_DECISION", from: start.toISOString(), to: end.toISOString(), actualFrom, actualTo, coverageYears: Number(coverageYears.toFixed(2)), complete, reason, coverageRanges, failedChunks, cachedChunks, cacheHits: cachedChunks, cacheMisses, cacheHitRate, coverageRatio, provenanceSummary, provenance_summary: provenanceSummary, oldestCacheAgeMs, cachePersisted, requestedBarsTotal, returnedBarsTotal, maxBarsPerRequest: HISTORY_MAX_BARS_PER_REQUEST, terminalMaxBars, retentionSource, cacheNamespace, activeCacheNamespace, cacheScope: cacheNamespace, activeCacheScope: activeCacheNamespace, namespaceChanged, closedBarProvenance: "MT5_CLOSED_BARS", closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, contract_version: MT5_HISTORY_CONTRACT_VERSION, newestCacheAgeMs, server_timezone: serverTimezone, timestamp_basis: timestampBasis };
}
// LIVE advisory — the REAL Co-Trade Advisor run on live MT5 bars (read-only). `advice` is a TradeAdvice dict.
export interface Mt5AdviceResult {
  ok: boolean;
  reason?: string;
  detail?: string;
  /** Explicitly identifies whether a forecast provider supplied this payload. */
  source?: string;
  source_disclosure?: string;
  advice?: Record<string, unknown>;
}
export const mt5Advice = (symbol = "XAUUSD", tradeTf = "H1", dir = "") => req<Mt5AdviceResult>("/mt5/advice?symbol=" + encodeURIComponent(symbol) + "&trade_tf=" + tradeTf + "&dir=" + encodeURIComponent(dir), { headers: jh() });
export interface Mt5WeekHistory { ok: boolean; trades?: number; wins?: number; win_rate?: number | null; net_profit?: number; best?: number; worst?: number; currency?: string; reason?: string }
export const mt5WeekHistory = (symbol = "XAUUSD") => req<Mt5WeekHistory>("/mt5/week_history?symbol=" + encodeURIComponent(symbol), { headers: jh() });

export interface Mt5LiveBundle {
  ok: boolean;
  account?: Mt5DemoAccountInfo;
  positions?: Mt5Position[];
  live_bar?: Mt5LiveBar | { bar: null; reason: string };
  bars?: Mt5ChartBar[];
  /** Closed-bar attestation forwarded by /mt5/live_bundle for chart consumers. */
  symbol?: string; broker_symbol?: string; timeframe?: string;
  source?: "MT5_CLOSED_BARS" | "MT5_FORMING_BAR" | string;
  closed_bar_provenance?: "MT5_CLOSED_BARS" | string;
  forming_bar_included?: boolean;
  server_timezone?: string; timestamp_basis?: "UTC" | string;
  retrieved_at?: string | null; latest_closed_bar_age_seconds?: number | null;
  authority?: "SHADOW_ONLY" | string; decision?: "NO_DECISION" | string; read_only?: true;
  advice?: Mt5AdviceResult;
  week_history?: Mt5WeekHistory;
  observations?: { as_of: string; indicators: { ema10: number; ema34: number; atr14: number }; indicator_lookback: number };
  observations_by_tf?: Record<string, { as_of: string; indicators: { ema10: number; ema34: number; atr14: number }; indicator_lookback: number }>;
}
export interface SimTailResult {
  ok: boolean;
  symbol: string;
  timeframe: string;
  source?: string;
  n: number;
  total_n?: number;
  bars: Mt5ChartBar[];
}
export const simTailOhlc = async (symbol = "XAUUSD", tf = "M15", n = 700): Promise<SimTailResult | Offline> => {
  try {
    const { runResearchJob } = await import("./researchJobs.ts");
    const result = await runResearchJob<{ bars: Mt5ChartBar[]; total_bars: number }>({ kind: "market", dataset: { symbol, tf }, count: n, storage: {} });
    return { ok: true, symbol, timeframe: tf, source: "HISTORICAL_OHLC", n: result.bars.length, total_n: result.total_bars, bars: result.bars };
  } catch { return { offline: true, error: "HISTORICAL_DATA_UNAVAILABLE" }; }
};
