import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import { terminalCacheScope, terminalRequest } from "./mt5Connection.ts";
import { BROKER_HISTORY_TIMEFRAMES, MT5_HISTORY_CONTRACT_VERSION, isOffline, isVerifiedClosedBarWindow, mt5History, type BrokerHistoryTimeframe, type Mt5BarsResult } from "./mt5DemoAdapter.ts";

const FRAME_MS: Record<BrokerHistoryTimeframe, number> = { M5: 300_000, M15: 900_000, M30: 1_800_000, H1: 3_600_000 };
const MAX_CATCH_UP_BARS = 45_000;
const MAX_SESSION_GAP_MS = 4 * 86_400_000;
export interface Mt5CatchUpOptions {
  now?: number;
  /** Scope that owns the saved/cache tape. Never carry a tape across reconnects. */
  namespace?: string;
  serverTimezone?: string;
  signal?: AbortSignal;
}
export interface Mt5CatchUpResult {
  bars: OhlcBar[];
  complete: boolean;
  reason?: string;
  namespace: string;
  receivedBars: number;
  provenance?: { source: "MT5_HISTORY"; closedBarProvenance: "MT5_CLOSED_BARS"; serverTimezone: string; timestampBasis: "UTC"; from: string; to: string; coverageStatus: string };
}

/** Heal the entire gap after a saved candle; a fixed-size tail can leave an enduring hole. */
export async function catchUpMt5History(symbol: string, tf: BrokerHistoryTimeframe, previous: OhlcBar[], options: Mt5CatchUpOptions = {}): Promise<Mt5CatchUpResult> {
  const namespace = terminalCacheScope();
  const fail = (reason: string): Mt5CatchUpResult => ({ bars: previous, complete: false, reason, namespace, receivedBars: 0 });
  if (namespace === "detached" || (options.namespace != null && options.namespace !== namespace)) return fail("HISTORY_ACCOUNT_CHANGED");
  if (!BROKER_HISTORY_TIMEFRAMES.includes(tf) || !previous.length) return fail("HISTORY_CATCH_UP_NO_ANCHOR");
  const now = options.now ?? Date.now();
  const step = FRAME_MS[tf];
  const lastMs = Math.max(...previous.slice(-100).map((bar) => Date.parse(bar.t)));
  if (!Number.isFinite(lastMs) || !Number.isFinite(now) || lastMs + step > now + 1_000) return fail("INVALID_BAR_DATA");
  if (Math.ceil((now - lastMs) / step) > MAX_CATCH_UP_BARS) return fail("HISTORY_CATCH_UP_LIMIT");
  const from = new Date(lastMs).toISOString();
  const to = new Date(now).toISOString();
  const result = options.signal
    ? await terminalRequest<import("./mt5DemoAdapter.ts").Mt5History>(`/history?symbol=${encodeURIComponent(symbol)}&tf=${tf}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, undefined, options.signal)
    : await mt5History(symbol, tf, from, to);
  if (options.signal?.aborted) return fail("REFRESH_CANCELLED");
  // Check after every await and before exposing data: a reconnect can happen
  // while the request is in flight, even if the response itself looks valid.
  if (terminalCacheScope() !== namespace) return fail("HISTORY_ACCOUNT_CHANGED");
  if (isOffline(result)) return fail(result.error || "BRIDGE_OFFLINE");
  if (result.symbol !== symbol || result.timeframe !== tf) return fail("HISTORY_IDENTITY_MISMATCH");
  if (result.source !== "MT5_HISTORY" || result.contract_version !== MT5_HISTORY_CONTRACT_VERSION || result.closed_bar_provenance !== "MT5_CLOSED_BARS" || result.forming_bar_included !== false || result.timestamp_basis !== "UTC" || result.authority !== "SHADOW_ONLY" || result.decision !== "NO_DECISION" || result.live_apply_allowed !== false || result.read_only !== true || !result.server_timezone || (options.serverTimezone != null && result.server_timezone !== options.serverTimezone)) return fail("HISTORY_PROVENANCE_MISMATCH");
  // A bounded catch-up is only safe when the broker confirms both requested
  // boundaries. PARTIAL is useful telemetry for the long-history fetch, but it
  // cannot heal a saved tape because it may hide retention or an unresolved
  // interior omission.
  if (!result.ok || result.history_limit || result.coverage_status !== "COMPLETE") return fail(result.reason || "HISTORY_PARTIAL_CHUNKS");
  if (!isVerifiedClosedBarWindow({ ...result, source: "MT5_CLOSED_BARS", read_only: true } as unknown as Mt5BarsResult, tf, now)) return fail("INVALID_BAR_DATA");
  const returned = result.bars!;
  const stamps = returned.map((bar) => Date.parse(bar.t)).sort((a, b) => a - b);
  if (stamps.some((stamp) => stamp < lastMs || stamp >= now)) return fail("OUTSIDE_REQUESTED_WINDOW");
  // Apply the same conservative market-closure allowance as the multi-year
  // adapter, while refusing obvious retention/sparse/interior failures.
  const expected = Math.ceil((now - lastMs) / step);
  const minimum = expected >= 3 ? Math.max(2, Math.floor(expected * 0.2)) : 1;
  if (stamps[0] > lastMs + MAX_SESSION_GAP_MS || stamps[stamps.length - 1] + step < now - MAX_SESSION_GAP_MS || stamps.some((stamp, index) => index > 0 && stamp - stamps[index - 1] > MAX_SESSION_GAP_MS) || stamps.length < minimum) return fail("HISTORY_PARTIAL_CHUNKS");
  const key = (t: string) => new Date(Date.parse(t)).toISOString().replace(".000Z", "Z");
  const merged = new Map(previous.map((bar) => [key(bar.t), { ...bar, t: key(bar.t) }]));
  for (const bar of returned) merged.set(key(bar.t), { ...bar, t: key(bar.t) });
  const bars = [...merged.values()].sort((a, b) => a.t.localeCompare(b.t)).map((bar, i) => ({ ...bar, i }));
  return { bars, complete: true, namespace, receivedBars: returned.length, provenance: { source: "MT5_HISTORY", closedBarProvenance: "MT5_CLOSED_BARS", serverTimezone: result.server_timezone, timestampBasis: "UTC", from, to, coverageStatus: result.coverage_status } };
}
