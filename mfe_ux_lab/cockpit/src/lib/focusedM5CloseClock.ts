import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";

const M5_MS = 5 * 60_000;
const CANONICAL_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/;

export type FocusedM5CloseClockState = "CLOSED" | "FRESHNESS_WAIT" | "UNAVAILABLE";

export interface FocusedM5CloseClock {
  state: FocusedM5CloseClockState;
  /** The next M5 boundary at which a candle is expected to close. */
  nextExpectedCloseUtc: string | null;
  nextExpectedCloseMs: number | null;
  /** Whole seconds until nextExpectedCloseUtc, rounded up while pending. */
  remainingSeconds: number | null;
  latestClosedBarUtc: string | null;
}

const unavailable = (): FocusedM5CloseClock => ({
  state: "UNAVAILABLE",
  nextExpectedCloseUtc: null,
  nextExpectedCloseMs: null,
  remainingSeconds: null,
  latestClosedBarUtc: null,
});

/**
 * Return a read-only M5 close clock anchored to a UTC candle identity.
 *
 * `latestClosedBar` is intentionally read for its timestamp and explicit
 * closed marker only; its mutable OHLC values never participate in this
 * timing readout. A broker row marked `closed: false` therefore remains a
 * freshness wait and cannot be promoted as closed evidence.
 */
export function focusedM5CloseClock(
  nowMs: number,
  latestClosedBar: Pick<OhlcBar, "t"> & { closed?: boolean } | null | undefined,
): FocusedM5CloseClock {
  if (!Number.isFinite(nowMs) || !latestClosedBar || typeof latestClosedBar.t !== "string") return unavailable();
  const utc = latestClosedBar.t;
  if (!CANONICAL_UTC_TIMESTAMP.test(utc)) return unavailable();
  const openedMs = Date.parse(utc);
  const canonical = Number.isFinite(openedMs)
    && new Date(openedMs).toISOString() === (utc.endsWith(".000Z") ? utc : utc.replace("Z", ".000Z"));
  if (!canonical || openedMs % M5_MS !== 0) return unavailable();

  // An explicit forming row is useful chart context, but never qualifies as
  // the timing anchor for closed-bar evidence.
  const barCloseMs = openedMs + M5_MS;
  if (latestClosedBar.closed === false) return unavailable();
  if (nowMs < barCloseMs) {
    const remainingMs = barCloseMs - nowMs;
    return {
      state: "FRESHNESS_WAIT",
      nextExpectedCloseUtc: new Date(barCloseMs).toISOString(),
      nextExpectedCloseMs: barCloseMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      latestClosedBarUtc: utc,
    };
  }

  // Once the supplied candle has closed, anchor the countdown to the next
  // UTC M5 boundary after its close. Advance at equality so a boundary never
  // reports a zero-length interval or repeats the already reached close.
  const elapsedIntervals = Math.max(1, Math.floor((nowMs - barCloseMs) / M5_MS) + 1);
  const nextExpectedCloseMs = barCloseMs + elapsedIntervals * M5_MS;
  return {
    state: "CLOSED",
    nextExpectedCloseUtc: new Date(nextExpectedCloseMs).toISOString(),
    nextExpectedCloseMs,
    remainingSeconds: Math.max(0, Math.ceil((nextExpectedCloseMs - nowMs) / 1000)),
    latestClosedBarUtc: utc,
  };
}

// Alias kept descriptive for callers that refer to the display as a timing
// readout rather than a clock.
export const focusedM5CloseTiming = focusedM5CloseClock;

