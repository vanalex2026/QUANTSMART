import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";

const FRAME_MS: Record<string, number> = {
  M5: 5 * 60_000,
  M15: 15 * 60_000,
  M30: 30 * 60_000,
  H1: 60 * 60_000,
};

/** Validate the canonical UTC timestamp used by the focused MT5 tape. */
const canonicalUtcMs = (value: unknown): number | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== (value.endsWith(".000Z") ? value : value.replace("Z", ".000Z"))) return null;
  return parsed;
};

/**
 * Keep focused research consumers on completed candles. The chart may still
 * display a forming candle as presentation context, but detector markers and
 * forecast geometry must never read its mutable OHLC values.
 */
export function closedBarsForFocusedResearch(rows: readonly OhlcBar[], timeframe: string, nowMs = Date.now()): OhlcBar[] {
  const frameMs = FRAME_MS[timeframe];
  if (!frameMs) return rows.slice();
  if (!Number.isFinite(nowMs)) return [];
  const closed: OhlcBar[] = [];
  // Preserve the broker's chronological identity before applying the
  // current-clock cutoff.  A duplicate or reversed row must invalidate the
  // focused tape rather than being silently sorted/deduplicated: doing so
  // would change indicator windows and could splice a historical sequence
  // around an unknown candle.  Forming rows are explicitly excluded first,
  // so a mutable presentation tail does not participate in this identity.
  let previousOpenedMs: number | null = null;
  for (const bar of rows) {
    if ((bar as OhlcBar & { closed?: boolean }).closed === false) continue;
    const openedMs = canonicalUtcMs(bar.t);
    // Keep the research tape strictly causal.  A one-second tolerance here
    // can admit the current forming candle when the focused clock is between
    // timestamp ticks, contaminating markers, ATR and forecast geometry.
    // A malformed or shifted closed row cannot be dropped: that would splice
    // indicators and analogue windows across an unknown interval. Focused M5
    // studies require the UTC grid; higher broker frames can legitimately use
    // a different UTC offset for their local session opening (for example H1
    // in a half-hour zone).
    if (openedMs == null || (timeframe === "M5" && openedMs % frameMs !== 0)) return [];
    if (previousOpenedMs != null && openedMs <= previousOpenedMs) return [];
    previousOpenedMs = openedMs;
    if (openedMs + frameMs > nowMs) continue;
    // A malformed candle must invalidate the focused tape as a whole. Dropping
    // one row would splice indicators and analogue windows across unknown OHLC.
    const values = [bar.o, bar.h, bar.l, bar.c];
    if (!values.every((value) => typeof value === "number" && Number.isFinite(value))
      || bar.h < Math.max(bar.o, bar.c, bar.l)
      || bar.l > Math.min(bar.o, bar.c, bar.h)) return [];
    closed.push(bar);
  }
  return closed.map((bar, i) => ({ ...bar, i }));
}
