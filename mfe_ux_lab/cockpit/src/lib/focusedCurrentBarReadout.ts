import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";

export type FocusedCurrentBarDirection = "UP" | "DOWN" | "FLAT" | "WAIT";

export interface FocusedCurrentBarReadout {
  direction: FocusedCurrentBarDirection;
  timestamp: string | null;
  ohlc: { open: number; high: number; low: number; close: number } | null;
  status: "READY" | "WAIT";
}

/**
 * Summarise only the latest closed candle for the focused M5 surface. The
 * direction is a descriptive candle-body observation; it is withheld until
 * the same promoted-history and freshness gates used by current landmarks
 * pass. This helper has no decision or execution authority.
 */
export function focusedCurrentBarReadout(
  bar: OhlcBar | undefined,
  evidence: { historyReady: boolean; freshnessOk: boolean },
): FocusedCurrentBarReadout {
  if (!bar || ![bar.o, bar.h, bar.l, bar.c].every(Number.isFinite) || typeof bar.t !== "string") {
    return { direction: "WAIT", timestamp: null, ohlc: null, status: "WAIT" };
  }
  const bodyDirection: Exclude<FocusedCurrentBarDirection, "WAIT"> = bar.c > bar.o ? "UP" : bar.c < bar.o ? "DOWN" : "FLAT";
  const ready = evidence.historyReady && evidence.freshnessOk;
  return {
    direction: ready ? bodyDirection : "WAIT",
    timestamp: bar.t,
    ohlc: { open: bar.o, high: bar.h, low: bar.l, close: bar.c },
    status: ready ? "READY" : "WAIT",
  };
}
