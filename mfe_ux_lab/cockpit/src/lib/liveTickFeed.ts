// One SSE subscription per asset/timeframe/account. No history or strategy recompute per tick.
import { useCallback, useSyncExternalStore } from "react";
import { MT5_API, getTerminalGeneration, invalidateTerminalData, useTerminalGeneration } from "./mt5Connection.ts";
import { liveTickFreshness, parseLiveTickFrame, type LiveTickFrame } from "./liveTickModel.ts";
type State = { frame: LiveTickFrame | null; status: "connecting" | "live" | "reconnecting" | "paused" | "stale"; received: number; checkedAt: number };
const EMPTY: State = { frame: null, status: "connecting", received: 0, checkedAt: 0 };
type Slot = { state: State; listeners: Set<() => void>; source?: EventSource; stop?: () => void };
const slots = new Map<string, Slot>();
export function useLiveTickFeed(symbol: string, tf: string, enabled: boolean) {
  // Disabled chart surfaces must stay detached from terminal invalidations.
  // This keeps legacy or offline views from rerendering when MT5 reconnects.
  const generation = useTerminalGeneration(enabled);
  const key = `${generation}|${symbol}|${tf}`;
  const subscribe = useCallback((notify: () => void) => {
    if (!enabled) return () => {};
    let slot = slots.get(key);
    if (!slot) { for (const [oldKey, old] of slots) if (!old.listeners.size) slots.delete(oldKey); slot = { state: EMPTY, listeners: new Set() }; slots.set(key, slot); }
    const entry = slot; entry.listeners.add(notify);
    const publish = (state: State) => { entry.state = state; entry.listeners.forEach(listener => listener()); };
    if (entry.listeners.size === 1) {
      const connect = () => {
        // Keep one source per slot. Visibility events can fire repeatedly
        // while the tab is hidden and must not consume another bridge slot.
        if (document.visibilityState === "hidden") return;
        if (entry.source && entry.source.readyState !== EventSource.CLOSED) return;
        entry.source?.close();
        entry.source = undefined;
        // Keep the read-only quote stream alive in background tabs so the
        // focused chart can resume with current BID/ASK and forming-bar state.
        // The bridge still bounds concurrent streams and subscription cleanup
        // closes the source when no chart owns this slot.
        const params = new URLSearchParams({ symbol, tf, ...(entry.state.frame ? { cursor: entry.state.frame.cursor } : {}) });
        const source = new EventSource(`${MT5_API}/stream?${params}`); entry.source = source;
        source.addEventListener("tick", event => {
          // EventSource.close() does not retract an already queued event.
          // Ignore packets from a source that has been replaced or retired.
          if (entry.source !== source || !entry.listeners.size || getTerminalGeneration() !== generation) return;
          if (!(event instanceof MessageEvent) || typeof event.data !== "string") return;
          let value: unknown; try { value = JSON.parse(event.data); } catch { return; }
          const frame = parseLiveTickFrame(value, { symbol, tf }); if (!frame) { publish({ ...entry.state, frame: null, status: "stale" }); return; }
          const priorGeneration = entry.state.frame?.generation;
          if (priorGeneration !== undefined && frame.generation !== priorGeneration) {
            // A bridge generation change invalidates the account/session scope.
            // Drop the packet before it can repaint the old symbol/timeframe.
            entry.source = undefined; source.close(); publish({ ...EMPTY, status: "reconnecting" }); invalidateTerminalData(); return;
          }
          const freshness = liveTickFreshness(frame);
          publish({ frame, status: freshness.status, received: entry.state.received + frame.ticks.length, checkedAt: Date.now() });
        });
        source.addEventListener("status", () => { if (entry.source === source) publish({ ...entry.state, frame: null, status: "reconnecting" }); });
        source.addEventListener("reset", () => {
          if (entry.source !== source) return;
          entry.source = undefined; source.close(); publish(EMPTY); invalidateTerminalData();
        });
        source.onerror = () => { if (entry.source === source) publish({ ...entry.state, frame: null, status: "reconnecting" }); };
      };
      const freshness = setInterval(() => { if (entry.state.status === "live" && Date.now() - entry.state.checkedAt > 5000) publish({ ...entry.state, status: "stale" }); }, 1000);
      document.addEventListener("visibilitychange", connect); connect();
      entry.stop = () => { clearInterval(freshness); const source = entry.source; entry.source = undefined; source?.close(); document.removeEventListener("visibilitychange", connect); };
    }
    return () => { entry.listeners.delete(notify); if (!entry.listeners.size) { entry.stop?.(); entry.state = EMPTY; } };
  }, [key, symbol, tf, enabled]);
  const read = useCallback(() => enabled ? slots.get(key)?.state || EMPTY : EMPTY, [key, enabled]);
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
