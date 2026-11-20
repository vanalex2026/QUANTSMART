import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";

/**
 * Focused M5 forecasts are observations about the next closed candle. Keep a
 * local fallback useful for historical inspection, but do not present its
 * directional result as current once the latest closed candle is too old.
 * The age is measured from candle close (open timestamp + frame), matching
 * the MT5 feed-health contract.
 */
export const FOCUSED_M5_FORECAST_MAX_AGE_MS = 3 * 5 * 60_000;

const CANONICAL_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/;

export interface FocusedForecastFreshness {
  ok: boolean;
  latestClosedBarUtc: string | null;
  ageMs: number | null;
  reason: "FRESH" | "NO_CLOSED_BAR" | "INVALID_CLOCK" | "INVALID_TIMESTAMP" | "FUTURE_BAR" | "STALE_CLOSED_BAR";
}

/** Pure, fail-closed freshness gate for the focused forecast surface. */
export function focusedForecastFreshness(
  rows: readonly OhlcBar[],
  timeframe = "M5",
  nowMs = Date.now(),
  maxAgeMs = FOCUSED_M5_FORECAST_MAX_AGE_MS,
): FocusedForecastFreshness {
  const frameMs = timeframe === "M5" ? 5 * 60_000 : 0;
  const latest = rows.length ? rows[rows.length - 1] : undefined;
  if (!latest) return { ok: false, latestClosedBarUtc: null, ageMs: null, reason: "NO_CLOSED_BAR" };
  // NaN makes both future and stale comparisons false, so validate the
  // observation clock before evaluating either boundary.
  if (!Number.isFinite(nowMs)) {
    return { ok: false, latestClosedBarUtc: null, ageMs: null, reason: "INVALID_CLOCK" };
  }
  if (!frameMs || typeof latest.t !== "string" || !CANONICAL_UTC_TIMESTAMP.test(latest.t)) {
    return { ok: false, latestClosedBarUtc: null, ageMs: null, reason: "INVALID_TIMESTAMP" };
  }
  if ((latest as OhlcBar & { closed?: boolean }).closed === false) {
    return { ok: false, latestClosedBarUtc: latest.t, ageMs: null, reason: "NO_CLOSED_BAR" };
  }
  const openedMs = Date.parse(latest.t);
  // Date.parse normalizes impossible dates such as February 30. Freshness
  // must attest the same canonical UTC M5 identity as the focused tape.
  if (!Number.isFinite(openedMs)
    || new Date(openedMs).toISOString() !== (latest.t.endsWith(".000Z") ? latest.t : latest.t.replace("Z", ".000Z"))
    || openedMs % frameMs !== 0) {
    return { ok: false, latestClosedBarUtc: null, ageMs: null, reason: "INVALID_TIMESTAMP" };
  }
  const closeMs = openedMs + frameMs;
  // A focused forecast must never consume a bar whose close is even
  // fractionally ahead of the observation clock.  The broker feed may only
  // print second-resolution timestamps, but the focused clock is millisecond
  // precision; allowing a skew window can therefore admit a still-forming bar.
  if (closeMs > nowMs) {
    return { ok: false, latestClosedBarUtc: latest.t, ageMs: null, reason: "FUTURE_BAR" };
  }
  const ageMs = Math.max(0, nowMs - closeMs);
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0 || ageMs > maxAgeMs) {
    return { ok: false, latestClosedBarUtc: latest.t, ageMs, reason: "STALE_CLOSED_BAR" };
  }
  return { ok: true, latestClosedBarUtc: latest.t, ageMs, reason: "FRESH" };
}
