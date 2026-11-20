// Shared read-only bundle polling. One in-flight request per key; no outcome/order operations.
import { useCallback, useSyncExternalStore } from "react";
import { MT5_API, useTerminalGeneration } from "./mt5Connection.ts";
import { isOffline, isVerifiedClosedBarWindow, type Mt5BarsResult, type Mt5LiveBundle, type Mt5ChartBar } from "./mt5DemoAdapter.ts";
type Snapshot = { data: Mt5LiveBundle | null; error: string | null; checkedAt: number };
const EMPTY: Snapshot = { data: null, error: null, checkedAt: 0 };
type Entry = { snapshot: Snapshot; listeners: Set<() => void>; controller?: AbortController; timer?: ReturnType<typeof setTimeout>; refresh?: () => void; bundleAt?: number };
const cache = new Map<string, Entry>();
const LIVE_BUNDLE_REFRESH_MS = 15_000;
/** Decide whether the advisory bundle clock is trustworthy enough to reuse. */
export function liveBundleRefreshDue(bundleAt: number | undefined, hasData: boolean, now = Date.now()): boolean {
  if (!hasData || bundleAt == null || !Number.isFinite(bundleAt)) return true;
  const age = now - bundleAt;
  // A wall-clock rollback can make a stale bundle appear negative-age fresh.
  // Refetch immediately so the prior account/advisory metadata cannot linger.
  return !Number.isFinite(age) || age < 0 || age >= LIVE_BUNDLE_REFRESH_MS;
}
export function freshWorkspaceBars(bars: Mt5ChartBar[] | undefined, tf: string, now = Date.now()) {
  if (!bars || bars.length < 2) return false;
  const time = bars[bars.length - 1].t;
  const age = now - Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(time) ? time : `${time.replace(" ", "T")}Z`);
  const minutes: Record<string, number> = { M1: 1, M5: 5, M15: 15, M30: 30, H1: 60, H4: 240, D1: 1440, W1: 10080 };
  return Number.isFinite(age) && age >= -60000 && age <= ((minutes[tf] || 1) * 2 + 3) * 60000;
}

/**
 * Merge a light-weight /bars refresh into a previously fetched bundle only
 * after the refresh carries its own closed-bar attestation.  Keeping the
 * previous bundle's symbol/timeframe/source markers while replacing only its
 * bars lets a wrong or unverified response inherit trusted metadata and pass
 * the chart promotion gate.  Such a response must clear the live surface.
 */
export function mergeVerifiedLiveBars(
  previous: Mt5LiveBundle | null | undefined,
  payload: Mt5BarsResult | { offline: true; error: string },
  symbol: string,
  timeframe: string,
  checkedAtMs = Date.now(),
): Mt5LiveBundle | null {
  if (!previous || isOffline(payload) || payload.symbol !== symbol || payload.timeframe !== timeframe) return null;
  if (!isVerifiedClosedBarWindow(payload, timeframe, checkedAtMs)) return null;
  return {
    ...previous,
    ok: payload.ok === true,
    bars: payload.bars,
    symbol: payload.symbol,
    broker_symbol: payload.broker_symbol,
    timeframe: payload.timeframe,
    source: payload.source,
    closed_bar_provenance: payload.closed_bar_provenance,
    forming_bar_included: payload.forming_bar_included,
    server_timezone: payload.server_timezone,
    timestamp_basis: payload.timestamp_basis,
    retrieved_at: payload.retrieved_at,
    latest_closed_bar_age_seconds: payload.latest_closed_bar_age_seconds,
  };
}

export function useLiveWorkspaceQuery(symbol: string, tf: string, tradeTf: string, direction: string, count: number, enabled: boolean) {
  // Focused M5 disables this legacy live bundle poller. Keep its hook order
  // stable while avoiding a terminal-generation subscription that cannot
  // affect the disabled query.
  const generation = useTerminalGeneration(enabled);
  const key = `${MT5_API}|${generation}|${symbol}|${tf}|${tradeTf}|${direction}|${count}`;
  const subscribe = useCallback((notify: () => void) => {
    if (!enabled) return () => {};
    let entry = cache.get(key);
    if (!entry) { if (cache.size > 12) for (const [oldKey, old] of cache) if (!old.listeners.size) cache.delete(oldKey); entry = { snapshot: EMPTY, listeners: new Set() }; cache.set(key, entry); }
    const slot = entry; slot.listeners.add(notify);
    if (slot.listeners.size === 1) {
      const pull = async () => {
        clearTimeout(slot.timer); if (document.hidden || !slot.listeners.size || slot.controller) return;
        const controller = new AbortController(); slot.controller = controller;
        const deadline = setTimeout(() => controller.abort(), 10000);
        try {
          // Preserve the chart's 5s bar cadence; heavier advisory/diagnostic bundle refreshes at 15s.
          const bundleDue = liveBundleRefreshDue(slot.bundleAt, Boolean(slot.snapshot.data));
          const params = new URLSearchParams({ symbol, tf, trade_tf: tradeTf, dir: direction, n: String(count) });
          const response = await fetch(`${MT5_API}/${bundleDue ? "live_bundle" : "bars"}?${params}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`HTTP_${response.status}`);
          const payload = await response.json();
          let data: Mt5LiveBundle;
          if (bundleDue) data = payload;
          else {
            const merged = mergeVerifiedLiveBars(slot.snapshot.data, payload, symbol, tf);
            if (!merged) throw new Error("UNVERIFIED_LIVE_BARS");
            data = merged;
          }
          if (bundleDue) slot.bundleAt = Date.now();
          if (slot.listeners.size && !controller.signal.aborted) { slot.snapshot = { data, error: null, checkedAt: Date.now() }; slot.listeners.forEach((listener) => listener()); }
        } catch (error) {
          if (slot.listeners.size && !document.hidden) { slot.snapshot = { data: null, error: String((error as Error).message || error), checkedAt: Date.now() }; slot.listeners.forEach((listener) => listener()); }
        } finally { clearTimeout(deadline); slot.controller = undefined; if (slot.listeners.size && !document.hidden) slot.timer = setTimeout(pull, slot.snapshot.error ? 30000 : 5000); }
      };
      slot.refresh = () => { if (document.hidden) { clearTimeout(slot.timer); slot.controller?.abort(); } else void pull(); };
      document.addEventListener("visibilitychange", slot.refresh); void pull();
    }
    return () => { slot.listeners.delete(notify); if (!slot.listeners.size) { clearTimeout(slot.timer); slot.controller?.abort(); if (slot.refresh) document.removeEventListener("visibilitychange", slot.refresh); } };
  }, [key, enabled]);
  const read = useCallback(() => enabled ? cache.get(key)?.snapshot || EMPTY : EMPTY, [key, enabled]);
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
