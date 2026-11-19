import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
export interface LiveTick { time_msc: number; bid: number; ask: number; last: number; flags: number }
export interface LiveTickBar extends OhlcBar { tick_volume?: number; spread?: number }
export interface LiveTickFrame { cursor: string; generation: number; broker_symbol: string; ticks: LiveTick[]; bar: LiveTickBar | null; closed_bar: LiveTickBar | null; catching_up: boolean }
export type LiveFormingDetectionState = "PROVISIONAL" | "STALE" | "WAIT";
export type LiveFormingDirection = "UP" | "DOWN" | "FLAT" | "WAIT";
export interface LiveFormingDetection {
  state: LiveFormingDetectionState;
  direction: LiveFormingDirection;
  timestamp: string | null;
  ohlc: { open: number; high: number; low: number; close: number } | null;
  label: string;
  reason: string;
  authority: "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false";
}
export type LiveTickFreshness = "live" | "stale";
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const timeframeMinutes: Record<string, number> = { M1: 1, M5: 5, M15: 15, M30: 30, H1: 60, H4: 240, D1: 1440, W1: 10080 };
function bar(v: unknown): LiveTickBar | null {
  if (!object(v) || typeof v.time !== "string" || !Number.isFinite(Date.parse(v.time)) || !finite(v.open) || !finite(v.high) || !finite(v.low) || !finite(v.close) || v.low > Math.min(v.open, v.close) || v.high < Math.max(v.open, v.close)) return null;
  return { i: 0, t: v.time, o: v.open, h: v.high, l: v.low, c: v.close, r: "N", ...(finite(v.tick_volume) ? { tick_volume: v.tick_volume } : {}), ...(finite(v.spread) ? { spread: v.spread } : {}) };
}
export function parseLiveTickFrame(value: unknown, expected: { symbol?: string; tf?: string; generation?: number } = {}): LiveTickFrame | null {
  if (!object(value) || value.ok !== true || typeof value.cursor !== "string" || !finite(value.generation) || typeof value.broker_symbol !== "string" || !value.broker_symbol.trim() || !Array.isArray(value.ticks) || value.ticks.length > 8192) return null;
  // The bridge includes canonical identity when available. Keep older test or
  // proxy payloads compatible while rejecting a late packet for another route.
  if (expected.generation !== undefined && value.generation !== expected.generation) return null;
  if (typeof value.symbol === "string" && expected.symbol && value.symbol !== expected.symbol) return null;
  if (typeof value.timeframe === "string" && expected.tf && value.timeframe !== expected.tf) return null;
  const cursor = /^(\d{1,12}):(\d{1,16}):(\d{1,8})$/.exec(value.cursor);
  if (!cursor || Number(cursor[1]) !== value.generation) return null;
  if (value.authority !== undefined && value.authority !== "SHADOW_ONLY") return null;
  if (value.decision !== undefined && value.decision !== "NO_DECISION") return null;
  if (value.live_apply_allowed !== undefined && value.live_apply_allowed !== false) return null;
  const ticks: LiveTick[] = [];
  for (const tick of value.ticks) {
    if (!object(tick) || !finite(tick.time_msc) || tick.time_msc <= 0 || !finite(tick.bid) || !finite(tick.ask) || !finite(tick.last) || !finite(tick.flags) || tick.bid <= 0 || tick.ask < tick.bid) return null;
    ticks.push({ time_msc: tick.time_msc, bid: tick.bid, ask: tick.ask, last: tick.last, flags: tick.flags });
  }
  const forming = bar(value.bar), closed = bar(value.closed_bar);
  if (value.bar && !forming || value.closed_bar && !closed) return null;
  const tf = expected.tf ?? (typeof value.timeframe === "string" ? value.timeframe : undefined);
  const periodMs = tf && timeframeMinutes[tf] ? timeframeMinutes[tf] * 60_000 : null;
  if (periodMs) {
    const formingTs = forming ? Date.parse(forming.t) : null;
    const closedTs = closed ? Date.parse(closed.t) : null;
    // Validate closed-bar identity even when the mutable forming tail is
    // unavailable. A closed M5 row must still land on the canonical UTC grid.
    if (closedTs !== null && closedTs % periodMs !== 0) return null;
    // The prior closed bar may be separated by a broker session gap (for
    // example, the weekend), so require ordered/grid-aligned identities while
    // allowing an integral multi-period gap.
    if (formingTs !== null && (formingTs % periodMs !== 0 || (closedTs !== null && (closedTs % periodMs !== 0 || closedTs >= formingTs || (formingTs - closedTs) % periodMs !== 0)))) return null;
    if (formingTs !== null && ticks.length) {
      const latestTick = ticks.reduce((latest, tick) => Math.max(latest, tick.time_msc), -Infinity);
      if (Math.floor(latestTick / periodMs) * periodMs !== formingTs) return null;
    }
  }
  return { cursor: value.cursor, generation: value.generation, broker_symbol: value.broker_symbol, ticks, bar: forming, closed_bar: closed, catching_up: value.catching_up === true };
}

/**
 * Classify a verified tick frame from its newest tick, rather than relying on
 * transport order.  The bridge normally emits ordered batches, but SSE
 * reconnects/proxies may deliver a valid batch with an older tick last.  This
 * readout is feed observability only; it never changes the closed-bar tape.
 */
export function liveTickFreshness(frame: LiveTickFrame | null, nowMs = Date.now()): { status: LiveTickFreshness; latestTimeMs: number | null; ageMs: number | null } {
  const latestTimeMs = latestLiveTick(frame)?.time_msc ?? null;
  if (latestTimeMs === null || !Number.isFinite(nowMs)) return { status: "stale", latestTimeMs, ageMs: null };
  const ageMs = nowMs - latestTimeMs;
  return { status: ageMs >= -60_000 && ageMs < 180_000 ? "live" : "stale", latestTimeMs, ageMs };
}

/** Select the newest verified quote when a transport batch arrives out of order. */
export function latestLiveTick(frame: LiveTickFrame | null): LiveTick | null {
  return frame?.ticks.reduce<LiveTick | null>((latest, tick) => latest === null || tick.time_msc > latest.time_msc ? tick : latest, null) ?? null;
}
// Presentation only. Never mutate the closed-bar tape consumed by research jobs.
export function withFormingBar(closed: OhlcBar[], frame: LiveTickFrame | null): OhlcBar[] {
  if (!frame?.bar || !closed.length) return closed;
  const result = closed.slice();
  for (const next of [frame.closed_bar, frame.bar]) {
    if (!next) continue;
    const tail = result[result.length - 1];
    const t = Date.parse(next.t), end = Date.parse(tail.t);
    if (t > end) result.push({ ...next, i: tail.i + 1 });
    else if (t === end && next === frame.bar) result[result.length - 1] = { ...next, i: tail.i };
  }
  return result;
}

/**
 * Describe only the mutable candle supplied by the tick stream. This is a
 * presentation readout and intentionally does not call the closed-bar
 * detector, create a marker, or contribute to statistics.
 */
export function liveFormingDetection(
  frame: LiveTickFrame | null,
  status: "connecting" | "live" | "reconnecting" | "paused" | "stale",
  latestClosedTime?: string | null,
  locale: "en" | "vi" = "en",
): LiveFormingDetection {
  const authority = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;
  const forming = frame?.bar;
  const formingTs = forming ? Date.parse(forming.t) : NaN;
  const closedTs = latestClosedTime ? Date.parse(latestClosedTime) : NaN;
  const vi = locale === "vi";
  if (!forming || !Number.isFinite(formingTs) || (Number.isFinite(closedTs) && formingTs <= closedTs)) {
    return {
      state: "WAIT",
      direction: "WAIT",
      timestamp: null,
      ohlc: null,
      label: vi ? "WAIT · PHÁT HIỆN HIỆN TẠI" : "CURRENT DETECTION WAIT",
      reason: vi ? "Không có nến M5 đang hình thành đã được xác minh." : "No verified forming M5 candle is available.",
      authority,
    };
  }
  const direction: LiveFormingDirection = forming.c > forming.o ? "UP" : forming.c < forming.o ? "DOWN" : "FLAT";
  const directionLabel = vi ? ({ UP: "TĂNG", DOWN: "GIẢM", FLAT: "ĐI NGANG" } as const)[direction] : direction;
  const range = Math.max(0, forming.h - forming.l);
  const body = Math.abs(forming.c - forming.o);
  const bodyShare = range > 0 ? Math.round((body / range) * 100) : 0;
  const state: LiveFormingDetectionState = status === "live" ? "PROVISIONAL" : status === "stale" ? "STALE" : "WAIT";
  if (state === "WAIT") {
    return {
      state,
      direction: "WAIT",
      timestamp: forming.t,
      ohlc: { open: forming.o, high: forming.h, low: forming.l, close: forming.c },
      label: vi ? "WAIT · PHÁT HIỆN HIỆN TẠI" : "CURRENT DETECTION WAIT",
      reason: vi ? "Luồng tick đang kết nối lại hoặc tạm dừng; hình học biến động được giữ lại." : "Tick stream is reconnecting or paused; mutable geometry is withheld.",
      authority,
    };
  }
  return {
    state,
    direction,
    timestamp: forming.t,
    ohlc: { open: forming.o, high: forming.h, low: forming.l, close: forming.c },
    label: vi ? `${state} · NẾN ${directionLabel} HIỆN TẠI` : `${state} CURRENT ${direction} CANDLE`,
    reason: vi ? `Thân nến ${directionLabel.toLowerCase()} chiếm ${bodyShare}% biên độ nến đang hình thành; còn thay đổi cho đến khi nến M5 đóng.` : `${direction} body is ${bodyShare}% of the forming range; mutable until the M5 close.`,
    authority,
  };
}
