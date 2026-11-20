import { isOffline, isVerifiedClosedBarHistory, isVerifiedClosedBarWindow, type Mt5BarsResult, type Mt5ThreeYearHistory } from "./mt5DemoAdapter.ts";
import { observeTerminalAccount, terminalCacheScope, terminalRequest, type TerminalAccount } from "./mt5Connection.ts";
import { catchUpMt5History } from "./mt5HistoryCatchUp.ts";

export interface FocusedM5RefreshResult {
  history: Mt5ThreeYearHistory;
  checkedAt: number;
  changed: boolean;
  reason?: string;
}

let refreshSequence = 0;

/** Update the closed research tape independently of the legacy advice poller.
 * A two-row probe discovers a new close; range catch-up then heals the entire
 * interval, including time spent offline. Equal probes retain tape identity. */
export async function refreshFocusedM5History(history: Mt5ThreeYearHistory, symbol: string, signal?: AbortSignal): Promise<FocusedM5RefreshResult> {
  const checkedAt = Date.now();
  const fail = (reason: string): FocusedM5RefreshResult => ({ history, checkedAt, changed: false, reason });
  if (!isVerifiedClosedBarHistory(history, symbol, "M5")) return fail("UNVERIFIED_HISTORY");
  const namespace = history.cacheNamespace;
  const account = await terminalRequest<TerminalAccount>("/account", undefined, signal);
  if (signal?.aborted) return fail("REFRESH_CANCELLED");
  if (typeof account.connected !== "boolean") return fail("INVALID_ACCOUNT_RESPONSE");
  observeTerminalAccount(account);
  if (!account.connected) return fail(account.reason || "NOT_CONNECTED");
  if (terminalCacheScope() !== namespace) return fail("HISTORY_ACCOUNT_CHANGED");
  // This probe is the live freshness boundary.  Keep every request URL
  // unique so a browser/proxy cannot replay an older `/bars` response while
  // the terminal has already closed another M5 candle.  The response still
  // has to pass the full UTC/closed-bar/SHADOW_ONLY attestation below; the
  // nonce only bypasses transport caching and grants no data authority.
  const refreshToken = `${checkedAt}-${++refreshSequence}`;
  const probe = await terminalRequest<Mt5BarsResult>(`/bars?symbol=${encodeURIComponent(symbol)}&tf=M5&n=2&refresh=${refreshToken}`, undefined, signal);
  if (signal?.aborted) return fail("REFRESH_CANCELLED");
  if (terminalCacheScope() !== namespace) return fail("HISTORY_ACCOUNT_CHANGED");
  if (isOffline(probe) || probe.symbol !== symbol || probe.server_timezone !== history.server_timezone || probe.timestamp_basis !== "UTC" || probe.forming_bar_included !== false || !isVerifiedClosedBarWindow(probe, "M5", Date.now())) return fail("UNVERIFIED_M5_REFRESH");
  const sortedProbe = [...probe.bars!].sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  const tail = sortedProbe[sortedProbe.length - 1]!;
  const prior = history.bars[history.bars.length - 1]!;
  const tailMs = Date.parse(tail.t), priorMs = Date.parse(prior.t);
  if (tailMs < priorMs) return fail("M5_REFRESH_BEHIND_HISTORY");
  if (tailMs === priorMs && ["o", "h", "l", "c"].every((key) => tail[key as "o"] === prior[key as "o"])) return { history, checkedAt, changed: false };
  // End at the latest proven closed boundary, not at a wall clock inside a
  // forming candle. Otherwise the bridge correctly reports PARTIAL forever.
  const closedBoundary = tailMs + 300_000;
  const update = await catchUpMt5History(symbol, "M5", history.bars, { now: closedBoundary, namespace, serverTimezone: history.server_timezone, signal });
  if (signal?.aborted) return fail("REFRESH_CANCELLED");
  if (!update.complete || !update.provenance) return fail(update.reason || "M5_REFRESH_INCOMPLETE");
  if (terminalCacheScope() !== namespace) return fail("HISTORY_ACCOUNT_CHANGED");
  const actualTo = update.bars[update.bars.length - 1]!.t;
  const closedBars = update.bars.map((bar, i) => ({ ...bar, i, r: "N" as const }));
  return {
    history: { ...history, bars: closedBars, actualTo,
      coverageYears: history.actualFrom ? (Date.parse(actualTo) - Date.parse(history.actualFrom)) / (365.25 * 86_400_000) : history.coverageYears,
      refreshProvenance: { ...update.provenance, checkedAt: new Date(checkedAt).toISOString(), receivedBars: update.receivedBars } },
    checkedAt, changed: true,
  };
}
