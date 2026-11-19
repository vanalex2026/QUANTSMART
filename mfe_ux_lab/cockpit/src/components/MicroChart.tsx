// MicroChart — TradingView-style INTERACTIVE chart for the Microscope page (navy theme, my colors).
// Left vertical tool rail (cursor/trend/h-line/rect/measure + magnet snap + clear), drag-to-PAN,
// mouse-wheel ZOOM (cursor-centered), crosshair with axis price/time boxes, current-price dotted line +
// label box, session background blocks, EMA10/34, labeled zone boxes. Diagnostic ONLY · no orders.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import { ChartGlyph, type CChartZone, type CChartLine } from "./chartPrimitives.tsx";
import type { EpisodeBand } from "../lib/ch/chEpisodeSegments.ts";
import { arrangeZoneLabels } from "../lib/chartZoneLabels.ts";
import { useLiveTickFeed } from "../lib/liveTickFeed.ts";
import { latestLiveTick, liveFormingDetection, withFormingBar } from "../lib/liveTickModel.ts";
import { useElementSize } from "../core/useElementSize.ts";
import { brokerDealMarkers, type BrokerDeal } from "../lib/brokerDealMarkers.ts";
import { reanchorViewport, sliceSortedByIndex } from "../lib/microChartViewport.ts";
import { createMicroChartIndex, queryMicroChartIndex } from "../lib/microChartIndex.ts";
import { microChartPan } from "../lib/microChartPan.ts";
import { defaultVisibleCandles, timeAxisTicks } from "../lib/microChartLayout.ts";
import { finiteMinMax } from "../lib/finiteMinMax.ts";
import { historicalPatternPosition, historicalPositionInViewport, currentLandmarksInViewport, type HistoricalPositionSignal } from "../lib/historicalPatternPosition.ts";
import { HistoricalPositionOverlay } from "./HistoricalPositionOverlay.tsx";
import { MicroChartBrush } from "./MicroChartBrush.tsx";
import { CandleSeries, IndicatorSeries } from "./MicroChartSeries.tsx";
import "./microchart.css";
import type { PriceActionSetup } from "../lib/priceActionSetup.ts";

const ZONE_PAINT: Record<string, string> = {
  observation: "var(--accent-cyan)", confirmation: "var(--bull-green)",
  risk: "var(--bear-red)", invalidation: "var(--zone-purple)",
  target: "var(--bull-green)", avoid: "var(--warn-amber)",
};
// Keep the focused chart module graph free of the legacy CH episode builder.
// These stable display colors are presentation-only; the builder is loaded by
// the legacy route when an episode lens is explicitly requested.
const EPISODE_COLOR: Record<string, string> = {
  IMPULSE: "#f5f5f5", CORRECTION: "#8b8b8b", BREAKOUT: "#bdbdbd", RANGE: "#5e5e5e",
};
const zonePaint = (zone: CChartZone) => ZONE_PAINT[zone.role] || zone.color;
const MONO = "'JetBrains Mono', ui-monospace, monospace";
type Tool = "cursor" | "trend" | "hline" | "fib" | "rect" | "brush" | "text" | "measure";
const MICROCHART_TOOL_SHORTCUTS: ReadonlyArray<{ id: Tool; t: string; shortcut: string }> = [
  { id: "cursor", t: "Cursor / drag-pan", shortcut: "C" },
  { id: "trend", t: "Trend line", shortcut: "T" },
  { id: "hline", t: "Horizontal line", shortcut: "H" },
  { id: "fib", t: "Fib retracement", shortcut: "F" },
  { id: "rect", t: "Rectangle box", shortcut: "R" },
  { id: "brush", t: "Brush (freehand)", shortcut: "B" },
  { id: "text", t: "Text label", shortcut: "X" },
  { id: "measure", t: "Measure", shortcut: "M" },
];
// Accessibility contract: Escape Home End PageUp PageDown ArrowLeft ArrowRight ArrowUp ArrowDown + - C T H F R B X M
// aria-keyshortcuts="Escape Home End PageUp PageDown ArrowLeft ArrowRight ArrowUp ArrowDown + - C T H F R B X M"
/** Resolve a drawing-tool letter shortcut without requiring toolbar focus. */
export function microChartToolShortcut(key: string): Tool | null {
  const normalized = key.length === 1 ? key.toUpperCase() : "";
  return MICROCHART_TOOL_SHORTCUTS.find((tool) => tool.shortcut === normalized)?.id || null;
}
/** Keyboard movement contract for the vertical drawing toolbar. Keeping this
 * pure makes the roving-tab-stop behavior easy to verify without rendering the
 * chart (which depends on the live-feed and canvas measurement hooks). */
export function microChartToolbarMove(index: number, key: string, count: number): number | null {
  if (count < 1) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key !== "ArrowUp" && key !== "ArrowDown") return null;
  const step = key === "ArrowUp" ? -1 : 1;
  return (Math.max(0, Math.min(index, count - 1)) + step + count) % count;
}
/** Return the earliest retained window for the chart Home shortcut while
 * preserving the user's current zoom width. This pure helper keeps keyboard
 * navigation deterministic and bounded without changing replay/order state. */
export function microChartHomeViewport(n: number, width: number): [number, number] {
  if (n < 2) return [0, Math.max(1, n - 1)];
  const boundedWidth = Math.max(1, Math.min(n - 1, Math.trunc(Number.isFinite(width) ? width : n - 1)));
  return [0, boundedWidth];
}
/** Return the latest retained window for the chart End shortcut while
 * preserving the user's current zoom width. Keep a two-bar minimum because
 * the chart requires an OHLC pair to render a bounded viewport. */
export function microChartLatestViewport(n: number, width: number): [number, number] {
  if (n < 2) return [0, Math.max(1, n - 1)];
  const boundedWidth = Math.max(2, Math.min(n, Math.trunc(Number.isFinite(width) ? width : n)));
  return [Math.max(0, n - boundedWidth), n - 1];
}
/** Move one full keyboard page while retaining the current visible width at
 * either retained-tape boundary. */
export function microChartPageViewport(start: number, end: number, n: number, direction: "earlier" | "later"): [number, number] {
  if (n < 2) return [0, Math.max(1, n - 1)];
  const currentStart = Math.max(0, Math.min(n - 1, Math.trunc(start)));
  const currentEnd = Math.max(currentStart, Math.min(n - 1, Math.trunc(end)));
  const width = Math.max(1, Math.min(n, currentEnd - currentStart + 1));
  const maxStart = Math.max(0, n - width);
  const nextStart = direction === "earlier"
    ? Math.max(0, currentStart - width)
    : Math.min(maxStart, currentStart + width);
  return [nextStart, Math.min(n - 1, nextStart + width - 1)];
}
/** Keyboard selection contract for saved drawings. Bracket keys cycle the
 * persisted drawing list without changing the viewport or evidence state.
 * Returning null keeps unrelated keys from being captured by the chart. */
export function microChartDrawingSelection(index: number | null, key: string, count: number): number | null {
  if (count < 1 || (key !== "[" && key !== "]")) return null;
  const current = index === null || !Number.isInteger(index) ? (key === "]" ? -1 : 0) : Math.max(0, Math.min(index, count - 1));
  const step = key === "]" ? 1 : -1;
  return (current + step + count) % count;
}
export type MicroChartDrawingKind = "rect" | "hline" | "trend" | "measure" | "fib" | "brush" | "text";
export interface MicroChartPoint { i: number; p: number; /** Closed-bar UTC identity; legacy drawings may omit it. */ t?: string }
export interface MicroChartDrawing { kind: MicroChartDrawingKind; a: MicroChartPoint; b: MicroChartPoint; color: string; pts?: MicroChartPoint[]; text?: string }
type Pt = MicroChartPoint;
type Draw = MicroChartDrawing;
type DrawingEditMode = "move" | "endpoint-a" | "endpoint-b";
const DRAWING_LIMIT = 200;
// History stores complete drawing snapshots so undo/redo remains deterministic
// across mixed tool types. Keep this separate from DRAWING_LIMIT: a user can
// retain 200 drawings while still having a bounded edit trail.
const DRAWING_HISTORY_LIMIT = 100;
const BRUSH_POINT_LIMIT = 10_000;
const DRAW_KINDS = new Set<MicroChartDrawingKind>(["rect", "hline", "trend", "measure", "fib", "brush", "text"]);
function isSafeDrawingTimestamp(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fractionText, zone] = match;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || parsed > Date.now()) return false;
  // Date.parse intentionally normalizes out-of-range calendar fields (for
  // example, 2026-02-30 becomes March 2).  Persisted drawing anchors are
  // identities, so accepting that normalization could move a malformed saved
  // point onto an unrelated retained candle during re-anchoring. Round-trip
  // the parsed instant back into the timestamp's own UTC/offset wall clock to
  // reject impossible dates and times while retaining equivalent UTC spellings.
  const offsetMinutes = zone === "Z"
    ? 0
    : (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6))) * (zone[0] === "+" ? 1 : -1);
  if (offsetMinutes > 23 * 60 + 59 || offsetMinutes < -(23 * 60 + 59)) return false;
  const local = new Date(parsed + offsetMinutes * 60_000);
  const fractionMs = fractionText ? Number(fractionText.padEnd(3, "0")) : 0;
  return local.getUTCFullYear() === Number(yearText)
    && local.getUTCMonth() + 1 === Number(monthText)
    && local.getUTCDate() === Number(dayText)
    && local.getUTCHours() === Number(hourText)
    && local.getUTCMinutes() === Number(minuteText)
    && local.getUTCSeconds() === Number(secondText)
    && local.getUTCMilliseconds() === fractionMs;
}
function isPoint(value: unknown): value is Pt {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<Pt>;
  if (point.t !== undefined && (typeof point.t !== "string" || !isSafeDrawingTimestamp(point.t))) return false;
  return typeof point.i === "number" && Number.isInteger(point.i) && point.i >= 0
    && typeof point.p === "number" && Number.isFinite(point.p)
    && (point.t === undefined || (typeof point.t === "string" && Number.isFinite(Date.parse(point.t))));
}
function readSavedDraw(value: unknown): Draw | null {
  if (!value || typeof value !== "object") return null;
  const draw = value as Partial<Draw>;
  if (typeof draw.kind !== "string" || !DRAW_KINDS.has(draw.kind as Draw["kind"]) || !isPoint(draw.a) || !isPoint(draw.b) || typeof draw.color !== "string" || draw.color.length > 160) return null;
  if (draw.text !== undefined && typeof draw.text !== "string") return null;
  if (draw.pts !== undefined) {
    if (!Array.isArray(draw.pts) || !draw.pts.every(isPoint)) return null;
    draw.pts = draw.pts.slice(-BRUSH_POINT_LIMIT);
  }
  return draw as Draw;
}
export interface MicroChartViewport { start: number; end: number; startTime?: string; endTime?: string }
interface SavedViewport { start: number; end: number; startTime?: string; endTime?: string }
/** Compute a bounded two-finger pinch viewport. The candle under the initial
 * finger midpoint remains the anchor while midpoint movement pans the view.
 * This is pure so touch behavior can be contract-tested without mounting the
 * live-feed chart. */
export function microChartPinchViewport(
  view: [number, number],
  startDistance: number,
  distance: number,
  startMidpointIndex: number,
  midpointIndex: number,
  n: number,
): [number, number] {
  if (n < 2 || !Number.isFinite(startDistance) || startDistance <= 0 || !Number.isFinite(distance) || distance <= 0) return view;
  const maxWidth = Math.max(1, n - 1);
  const width = Math.max(1, view[1] - view[0]);
  const nextWidth = Math.max(1, Math.min(maxWidth, Math.round(width * startDistance / distance)));
  const anchorOffset = Math.max(0, Math.min(width, startMidpointIndex - view[0]));
  let nextStart = Math.round(midpointIndex - anchorOffset * (nextWidth / width));
  nextStart = Math.max(0, Math.min(n - 1 - nextWidth, nextStart));
  return [nextStart, nextStart + nextWidth];
}
/** Preserve the visible candle identities when a refreshed tape shifts rows.
 * Numeric indices remain a bounded fallback for legacy rows without a time.
 * A live window already at the right edge follows an appended forming row. */
function readSavedDrawings(key: string): Draw[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(value)) return [];
    return value.slice(-DRAWING_LIMIT).map(readSavedDraw).filter((draw): draw is Draw => draw !== null);
  } catch { return []; }
}
function readSavedViewport(key: string): SavedViewport | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (!value || typeof value !== "object" || !Number.isFinite(value.start) || !Number.isFinite(value.end)) return null;
    if ((value.startTime !== undefined && typeof value.startTime !== "string") || (value.endTime !== undefined && typeof value.endTime !== "string")) return null;
    const start = Math.max(0, Math.trunc(value.start)), end = Math.max(start + 1, Math.trunc(value.end));
    return { start, end, ...(typeof value.startTime === "string" ? { startTime: value.startTime } : {}), ...(typeof value.endTime === "string" ? { endTime: value.endTime } : {}) };
  } catch { return null; }
}
function savedViewportIndex(rows: OhlcBar[], timestamp: string | undefined, fallback: number): number {
  // Saved timestamps are candle identities. Date.parse alone normalizes
  // impossible dates and interprets timezone-less text in the host timezone.
  // Keep the same strict calendar/zone/future rules as drawing anchors.
  if (typeof timestamp !== "string" || !isSafeDrawingTimestamp(timestamp)) return fallback;
  const target = Date.parse(timestamp);
  const index = rows.findIndex((bar) => Date.parse(bar.t) === target);
  return index >= 0 ? index : fallback;
}

/** Aggregate large chart tapes without spreading hundreds of thousands of
 * values into Math.min/Math.max (which overflows the JS call stack). */

/** Re-anchor timestamped drawings to the currently retained tape. A snapshot
 * can be imported after the M5 retention window has shifted, so its numeric
 * indices are only a fallback; an expired timestamped anchor makes the whole
 * shape ambiguous and is discarded. */
function reanchorDrawings(drawings: Draw[], rows: OhlcBar[]): Draw[] {
  if (!drawings.length || rows.length < 2) return drawings;
  const byTime = new Map(rows.map((bar, index) => [bar.t, index]));
  const byInstant = new Map(rows.map((bar, index) => [Date.parse(bar.t), index]));
  const latestInstant = finiteMinMax(rows.map((bar) => Date.parse(bar.t)))?.[1] ?? Number.NEGATIVE_INFINITY;
  const resolve = (point: Pt): Pt | null => {
    if (!point.t) return point;
    if (!isSafeDrawingTimestamp(point.t)) return null;
    const pointInstant = Date.parse(point.t);
    if (!Number.isFinite(pointInstant) || pointInstant > latestInstant) return null;
    const exact = byTime.get(point.t) ?? byInstant.get(pointInstant);
    if (exact == null) return null;
    return exact !== point.i ? { ...point, i: exact } : point;
  };
  return drawings.flatMap((draw) => {
    const a = resolve(draw.a), b = resolve(draw.b), pts = draw.pts?.map(resolve);
    if (!a || !b || pts?.some((point): point is null => point === null)) return [];
    const resolvedPts = pts as Pt[] | undefined;
    const changed = a !== draw.a || b !== draw.b || resolvedPts?.some((point, index) => point !== draw.pts?.[index]);
    return [changed ? { ...draw, a, b, ...(resolvedPts ? { pts: resolvedPts } : {}) } : draw];
  });
}

function ema(vals: number[], period: number): number[] {
  const k = 2 / (period + 1); const out: number[] = []; let prev = vals[0] ?? 0;
  vals.forEach((v, i) => { prev = i === 0 ? v : v * k + prev * (1 - k); out.push(prev); }); return out;
}
const fp = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortTime = (t: string) => { const m = t.match(/(\d{2})-(\d{2})T(\d{2}:\d{2})/); return m ? `${m[1]}-${m[2]} ${m[3]}` : t.slice(5, 16); };
const hhmm = (t: string) => { const m = t.match(/T(\d{2}:\d{2})/); return m ? m[1] : ""; };
// 3 main sessions (UTC): Asia · Europe (London) · US (New York). Overlap hours fold into Europe/US.
function sessionOf(iso: string) { const m = iso.match(/T(\d{2}):/); const h = m ? +m[1] : 0; if (h >= 21 || h < 7) return { k: "ASIA", c: "var(--accent-cyan)" }; if (h < 13) return { k: "EUROPE", c: "var(--bull-green)" }; return { k: "US", c: "var(--zone-purple)" }; }

function Ico({ n }: { n: string }) {
  const p = { width: 18, height: 18, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (n) {
    case "cursor": return <svg {...p}><line x1="10" y1="2" x2="10" y2="7" /><line x1="10" y1="13" x2="10" y2="18" /><line x1="2" y1="10" x2="7" y2="10" /><line x1="13" y1="10" x2="18" y2="10" /></svg>;
    case "trend": return <svg {...p}><line x1="4" y1="16" x2="16" y2="4" /><circle cx="4" cy="16" r="1.6" /><circle cx="16" cy="4" r="1.6" /></svg>;
    case "hline": return <svg {...p}><line x1="3" y1="10" x2="17" y2="10" /><circle cx="3" cy="10" r="1.6" /><circle cx="17" cy="10" r="1.6" /></svg>;
    case "fib": return <svg {...p}><line x1="3" y1="4" x2="17" y2="4" /><line x1="3" y1="8" x2="17" y2="8" /><line x1="3" y1="12" x2="17" y2="12" /><line x1="3" y1="16" x2="17" y2="16" /><line x1="3" y1="16" x2="17" y2="4" opacity="0.5" /></svg>;
    case "rect": return <svg {...p}><rect x="4" y="5" width="12" height="10" rx="1.5" /></svg>;
    case "brush": return <svg {...p}><path d="M4 16 C 7 9, 11 13, 16 5" /><circle cx="16" cy="5" r="1.3" /></svg>;
    case "text": return <svg {...p}><path d="M5 5 H15 M10 5 V16" /></svg>;
    case "measure": return <svg {...p}><rect x="3" y="7" width="14" height="6" rx="1" /><line x1="7" y1="7" x2="7" y2="10" /><line x1="11" y1="7" x2="11" y2="10" /><line x1="15" y1="7" x2="15" y2="10" /></svg>;
    case "magnet": return <svg {...p}><path d="M6 3 V10 a4 4 0 0 0 8 0 V3" /><line x1="4.5" y1="3" x2="7.5" y2="3" /><line x1="12.5" y1="3" x2="15.5" y2="3" /></svg>;
    case "lock": return <svg {...p}><rect x="5" y="9" width="10" height="7" rx="1.5" /><path d="M7.5 9 V6.5 a2.5 2.5 0 0 1 5 0 V9" /></svg>;
    case "eye": return <svg {...p}><path d="M2 10 C5 6,15 6,18 10 C15 14,5 14,2 10 Z" /><circle cx="10" cy="10" r="2" /></svg>;
    case "trash": return <svg {...p}><path d="M4 6 H16 M7 6 V4 H13 V6 M6 6 L7 17 H13 L14 6" /></svg>;
    case "undo": return <svg {...p}><path d="M8 6 L3 10 L8 14" /><path d="M4 10 H11 a5 5 0 0 1 5 5" /></svg>;
    case "redo": return <svg {...p}><path d="M12 6 L17 10 L12 14" /><path d="M16 10 H9 a5 5 0 0 0-5 5" /></svg>;
    default: return null;
  }
}

export interface SignalMarker {
  /** Bounded descriptive detector geometry score, never an execution signal. */
  score?: number;
  pdfSetup?: PriceActionSetup;
  i: number; price: number; side: "low" | "high"; reads: string; label: string; measures: string;
  conceptId?: string;
  annotationKind?: "price_action" | "named_candle";
  wick_atr: number; wick_threshold_atr: number | null; wick_unusual: boolean; close_pos: number | null;
  verdict: string | null; base_rate: number | null; conditional_rate: number | null; lift: number | null;
  sample_n: number | null; outcome: "correct" | "wrong" | "pending" | "flat" | "neutral"; /** Measured next closed-bar direction for historical tape markers. */ nextBarOutcome?: "UP" | "DOWN" | "FLAT"; time: string; why_factors?: string[];
  projection?: { dir: "up" | "down"; target: number; lo: number; hi: number; tol_atr: number; bars: number; atr_used?: number; atr_raw?: number; mtf_factor?: number; tf_ladder?: string[]; target_atr?: number; calibrated?: boolean; calib_n?: number };
  context_assessment?: "STRONG" | "WEAK" | "MIXED" | "NEUTRAL";
  lessons_applied?: { factor: string; kind: "strong" | "weak"; hit_rate: number | null; oos_hit_rate: number | null; lift: number; oos_lift: number | null; n: number }[];
}
export interface MicroChartFocusAnnotation { i: number; price: number; time: string; label: string; detail: string; color?: string }

export interface TradeSeg { entryI: number; entry: number; exitI: number; exit: number; dir: "BUY" | "SELL"; outcome: "TP" | "SL"; R: number; why?: string[]; t?: string }
/** A candle can carry several concept annotations; hover identity must include
 * the concept/time label instead of collapsing every marker at one index. */
const signalHoverKey = (signal: SignalMarker): string => `${signal.i}:${signal.time}:${signal.conceptId || signal.label}`;

/** Keep an annotation caption inside the plot when a marker sits at an edge.
 * A very narrow plot cannot fit a caption without covering the price axis, so
 * callers can fall back to the marker's hover/focus popup while retaining the
 * full aria-label on the marker itself. */
export function microChartSignalLabelLayout(x: number, left: number, right: number, textWidth: number): { x: number; anchor: "start" | "end" } | null {
  const width = Math.max(0, right - left);
  const labelWidth = Math.max(1, textWidth);
  if (width < labelWidth + 12) return null;
  const rightRoom = right - x;
  const leftRoom = x - left;
  if (rightRoom >= labelWidth + 8) return { x: Math.min(right - 2, x + 8), anchor: "start" };
  if (leftRoom >= labelWidth + 8) return { x: Math.max(left + 2, x - 8), anchor: "end" };
  // The marker is close to an edge but there is still enough plot width: pin
  // the caption to the nearer edge and use a matching text anchor.
  return rightRoom >= leftRoom ? { x: right - 2, anchor: "end" } : { x: left + 2, anchor: "start" };
}

export function MicroChart({ bars: closedBars, zones: suppliedZones = [], lines: suppliedLines = [], symbol, tf, live = false, cursor = null, focusIndex = null, focusTime = null, focusRequestId = 0, viewportRestore = null, drawingsRestore = null, markers = [], signals = [], trades = [], episodes = [], formingEpisode = null, zoneLayout = "recent", brokerDeals = [], brokerSymbol = symbol, onSignalSelect, onViewportChange, onDrawingsChange, researchStatus, researchProvenance, researchPattern, researchPatternSignals = [], researchPatternLabel, locale = "en", focusAnnotation = null, historicalSignal = null, landmarksAtLatestOnly = false }: {
  bars: OhlcBar[]; zones?: CChartZone[]; lines?: CChartLine[]; symbol: string; tf: string; live?: boolean;
  cursor?: number | null; /** Optional visual jump target that does not alter replay visibility semantics. */ focusIndex?: number | null; /** Stable UTC identity for retention refreshes. */ focusTime?: string | null; /** Increment for an explicit repeat jump to the same UTC endpoint. */ focusRequestId?: number; viewportRestore?: Partial<MicroChartViewport> & { nonce?: number } | null; drawingsRestore?: { drawings: MicroChartDrawing[]; nonce?: number } | null; markers?: { i: number; price: number; kind: string }[]; signals?: SignalMarker[]; trades?: TradeSeg[];
  episodes?: EpisodeBand[]; formingEpisode?: EpisodeBand | null;   // CH Episode Lens (observer) — coloured leg ribbon below the price plot
  zoneLayout?: "recent" | "wide";
  brokerDeals?: BrokerDeal[]; brokerSymbol?: string; onSignalSelect?: (signal: SignalMarker) => void; focusAnnotation?: MicroChartFocusAnnotation | null;
  onViewportChange?: (viewport: MicroChartViewport) => void; onDrawingsChange?: (drawings: MicroChartDrawing[]) => void; researchStatus?: string; researchProvenance?: string; /** Current closed-bar pattern explanation; descriptive only. */ researchPattern?: string; /** Current concepts exposed as clickable, read-only chart chips. */ researchPatternSignals?: SignalMarker[]; /** Optional readable chip label carrying the measured H+1 rate. */ researchPatternLabel?: (signal: SignalMarker) => string; locale?: "en" | "vi";
  historicalSignal?: HistoricalPositionSignal | null; landmarksAtLatestOnly?: boolean;
}) {
  const tickFeed = useLiveTickFeed(symbol, tf, live);
  const frame = tickFeed.status === "live" || tickFeed.status === "stale" ? tickFeed.frame : null;
  const bars = useMemo(() => withFormingBar(closedBars, frame), [closedBars, frame]);
  const liveDetection = useMemo(() => liveFormingDetection(frame, tickFeed.status, closedBars[closedBars.length - 1]?.t, locale), [frame, tickFeed.status, closedBars, locale]);
  const brokerMarks = useMemo(() => brokerDealMarkers(bars,brokerDeals,brokerSymbol,({M1:1,M5:5,M15:15,M30:30,H1:60,H4:240,D1:1440,W1:10080} as Record<string,number>)[tf] || 60),[bars,brokerDeals,brokerSymbol,tf]);
  const quote = latestLiveTick(frame);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { ref: measureChart, size: chartSize } = useElementSize<HTMLDivElement>();
  const size = { w: chartSize.width, h: chartSize.height };
  const gRef = useRef({ start: 0, end: 1, n: 2, PX0: 8, slot: 1, live: false });
  const setViewRef = useRef<(v: [number, number]) => void>(() => {});
  const onWheelNative = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const { start, end, n, PX0, slot, live } = gRef.current; const w = end - start; if (w < 1) return;
    const nw = Math.max(8, Math.min(2500, n - 1, Math.round(w * (e.deltaY < 0 ? 0.82 : 1.22)))); // cap zoom-out so we never render too many candles
    if (live) { const b = n - 1, a = Math.max(0, b - nw); setViewRef.current([a, b]); return; } // LIVE: keep the current candle pinned to the right edge
    const rect = wrapRef.current!.getBoundingClientRect();
    const center = Math.max(start, Math.min(end, start + Math.floor((e.clientX - rect.left - PX0) / slot)));
    let a = Math.round(center - (center - start) * (nw / w)); if (a < 0) a = 0;
    let b = a + nw; if (b > n - 1) { b = n - 1; a = Math.max(0, b - nw); }
    setViewRef.current([a, b]);
  }, []);
  const setWrap = useCallback((el: HTMLDivElement | null) => {
    if (wrapRef.current) wrapRef.current.removeEventListener("wheel", onWheelNative);
    wrapRef.current = el; measureChart(el); if (!el) return;
    el.addEventListener("wheel", onWheelNative, { passive: false });
  }, [onWheelNative, measureChart]);

  const n = bars.length;
  const recentCount = defaultVisibleCandles(size.w > 84 ? size.w - 84 : Math.max(168, window.innerWidth - 150));
  // Keep the integer evidence window and its fractional pixel offset in one
  // state cell.  Crossing a candle boundary therefore cannot paint an
  // intermediate frame with the new window and the old offset (the small
  // one-frame snap users perceive as a jitter while dragging).
  const [panFrameState, setPanFrameState] = useState<{ view: [number, number]; offset: number }>({
    view: [Math.max(0, n - recentCount), Math.max(1, n - 1)],
    offset: 0,
  });
  const view = panFrameState.view;
  const panOffset = panFrameState.offset;
  const [panActive, setPanActive] = useState(false);
  const viewportBarsRef = useRef<OhlcBar[] | null>(null);
  const viewportIdentityRef = useRef<{ closed: string; count: number; tail?: string } | null>(null);
  const [sigHover, setSigHover] = useState<string | null>(null);   // which candle-pattern signal is hovered
  const [tradeHover, setTradeHover] = useState<number | null>(null);   // which trade entry (by entryI) is hovered → "why" popup
  // Markers form one keyboard navigation group. A replay can contain many
  // annotations, so only the active marker participates in the page tab order.
  const [annotationFocusIndex, setAnnotationFocusIndex] = useState(0);
  const annotationRefs = useRef<Array<SVGGElement | null>>([]);
  const [tool, setTool] = useState<Tool>("cursor");
  const [toolFocusIndex, setToolFocusIndex] = useState(0);
  const [toolbarHorizontal, setToolbarHorizontal] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639.98px)");
    const update = () => setToolbarHorizontal(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  const toolButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [magnet, setMagnet] = useState(false);
  const [lock, setLock] = useState(false);
  const [hideDraws, setHideDraws] = useState(false);
  const viewportStorageKey = `mfe_chart_view_v1_${symbol}_${tf}`;
  const [hydratedViewportKey, setHydratedViewportKey] = useState("");
  const appliedViewportRestoreNonce = useRef<number | null>(null);
  const appliedViewportRestoreKey = useRef<string | null>(null);
  const drawingStorageKey = `mfe_chart_drawings_v1_${symbol}_${tf}`;
  const [draws, setDraws] = useState<Draw[]>(() => readSavedDrawings(drawingStorageKey));
  const [selectedDrawingIndex, setSelectedDrawingIndex] = useState<number | null>(null);
  const [drawingPreview, setDrawingPreview] = useState<Draw | null>(null);
  const [undoStack, setUndoStack] = useState<Draw[][]>([]);
  const [redoStack, setRedoStack] = useState<Draw[][]>([]);
  const [hydratedDrawingKey, setHydratedDrawingKey] = useState(drawingStorageKey);
  const appliedDrawingRestoreNonce = useRef<number | null>(null);
  const drawingTopologyRef = useRef<OhlcBar[] | null>(null);
  const [chartKeyStatus, setChartKeyStatus] = useState("");
  const chartHelpId = useId();
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [temp, setTemp] = useState<Draw | null>(null);
  // Measurement readouts are transient. Keep the expiry handle in a ref so a
  // newer measurement can cancel the prior timer instead of being cleared by
  // an older gesture's delayed callback.
  const measureExpiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ x: number; a: Pt; view0: [number, number]; moved: boolean; slot: number; domain: [number, number]; pan0: number; isPan: boolean } | null>(null);
  const drawingDrag = useRef<{ index: number; mode: DrawingEditMode; x: number; y: number; before: Draw[]; moved: boolean; domain: [number, number] } | null>(null);
  // Reading getBoundingClientRect() on every pointermove forces a synchronous
  // layout pass while the SVG is being repainted. Cache the chart rect for the
  // duration of a pointer gesture so drag-pan can stay on the compositor/RAF
  // path. The cache is cleared on release/cancel; hover-only moves still use a
  // fresh rect so scrolling and responsive resize remain accurate.
  const pointerRect = useRef<DOMRect | null>(null);
  const panFrame = useRef<number | null>(null);
  // Pointer moves during a pan only need to update the viewport. Keeping the
  // crosshair/legend hover state out of this hot path avoids a second full SVG
  // update for every input event; the final pointer position is restored on
  // release so hover inspection still behaves normally after the gesture.
  const pendingPan = useRef<{ view: [number, number]; offset: number } | null>(null);
  const flushPan = useCallback(() => {
    if (panFrame.current !== null) cancelAnimationFrame(panFrame.current);
    panFrame.current = null;
    const pending = pendingPan.current;
    pendingPan.current = null;
    if (!pending) return;
    setPanFrameState((prior) => {
      const sameView = prior.view[0] === pending.view[0] && prior.view[1] === pending.view[1];
      if (sameView && prior.offset === pending.offset) return prior;
      return { view: sameView ? prior.view : pending.view, offset: pending.offset };
    });
  }, []);
  const cancelPan = useCallback(() => {
    if (panFrame.current !== null) cancelAnimationFrame(panFrame.current);
    panFrame.current = null;
    pendingPan.current = null;
    pointerRect.current = null;
    setPanFrameState((prior) => prior.offset === 0 ? prior : { view: prior.view, offset: 0 });
    setPanActive(false);
  }, []);
  const setView = useCallback((next: React.SetStateAction<[number, number]>) => {
    // Keyboard navigation, Reset, focus jumps and data reanchoring take
    // ownership immediately; an older queued pointer frame cannot undo them.
    if (drag.current?.isPan) drag.current = null;
    drawingDrag.current = null;
    setDrawingPreview(null);
    cancelPan();
    // The old pointer coordinate belongs to the previous viewport. Clear the
    // crosshair before an external jump so it cannot render over a stale bar.
    setHover((prior) => prior === null ? prior : null);
    setPanFrameState((prior) => {
      const nextView = typeof next === "function" ? next(prior.view) : next;
      return { view: nextView, offset: 0 };
    });
  }, [cancelPan]);
  setViewRef.current = setView;
  useEffect(() => () => {
    if (panFrame.current !== null) cancelAnimationFrame(panFrame.current);
  }, []);
  const touchPointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ startDistance: number; startMidpointIndex: number; view0: [number, number] } | null>(null);
  // Preview edits never enter persistence or undo history. Changes to the
  // drawing context cancel their gesture rather than applying stale indices.
  useEffect(() => {
    if (drawingDrag.current) setPanActive(false);
    drawingDrag.current = null;
    setDrawingPreview(null);
    setSelectedDrawingIndex(null);
  }, [drawingStorageKey, closedBars, lock, hideDraws, tool]);
  // Legacy hydration contract: setDraws(readSavedDrawings(drawingStorageKey)); setHydratedDrawingKey(drawingStorageKey)
  useEffect(() => {
    setDraws(readSavedDrawings(drawingStorageKey));
    drawingTopologyRef.current = null;
    // Undo history is intentionally session-scoped. Persisted drawings remain
    // available after reload, while an edit trail never crosses symbols or
    // timeframes and cannot reference an unrelated retained tape.
    setUndoStack([]);
    setRedoStack([]);
    setHydratedDrawingKey(drawingStorageKey);
  }, [drawingStorageKey]);
  useEffect(() => {
    if (hydratedDrawingKey !== drawingStorageKey) return;
    const bounded = draws.slice(-DRAWING_LIMIT);
    try { localStorage.setItem(drawingStorageKey, JSON.stringify(bounded)); } catch { /* drawing persistence is best effort */ }
    onDrawingsChange?.(bounded);
  }, [drawingStorageKey, hydratedDrawingKey, draws, onDrawingsChange]);
  useEffect(() => {
    // Snapshot imports can arrive before the retained tape finishes loading.
    // Do not mark the nonce applied against an empty/one-bar tape: timestamped
    // anchors need at least two closed bars so the restore can be re-anchored
    // when the UTC retention window arrives.
    if (!drawingsRestore || hydratedDrawingKey !== drawingStorageKey || drawingsRestore.nonce === undefined || bars.length < 2) return;
    if (appliedDrawingRestoreNonce.current === drawingsRestore.nonce) return;
    // Snapshot indices belong to the exporting tape. Resolve timestamped
    // anchors against the current retained tape before rendering so a shifted
    // M5 window cannot move a drawing onto an unrelated candle.
    setDraws(reanchorDrawings(drawingsRestore.drawings.slice(-DRAWING_LIMIT), bars));
    setUndoStack([]);
    setRedoStack([]);
    appliedDrawingRestoreNonce.current = drawingsRestore.nonce;
    setChartKeyStatus("Snapshot drawings restored; SHADOW_ONLY; NO_DECISION.");
  }, [drawingsRestore?.nonce, hydratedDrawingKey, drawingStorageKey, bars]);
  // Keep the original bounded append contract visible for downstream source
  // audits; the implementation below adds the undo snapshot before appending.
  // const appendDrawing = useCallback((draw: Draw) => setDraws((existing) => [...existing, draw].slice(-DRAWING_LIMIT)), []);
  const appendDrawing = useCallback((draw: Draw) => {
    if (lock) return;
    setUndoStack((existing) => [...existing, draws].slice(-DRAWING_HISTORY_LIMIT));
    setRedoStack([]);
    setDraws((existing) => [...existing, draw].slice(-DRAWING_LIMIT));
  }, [draws, lock]);
  // Re-anchor persisted drawings when the retained tape is refreshed or its
  // two-year window shifts. Legacy index-only drawings remain supported.
  useEffect(() => {
    // Do not reconcile a newly hydrated drawing set against a stale symbol or
    // timeframe tape. The hydration effect updates this key first; waiting for
    // the matching key prevents a cross-symbol refresh from deleting valid
    // timestamped drawings before the corresponding bars arrive.
    if (hydratedDrawingKey !== drawingStorageKey || bars.length < 2) return;
    // `bars` is refreshed on every live quote, but the closed tape identity is
    // stable until a candle closes or retention shifts. Avoid rebuilding/maps
    // and setState calls on those quote-only updates.
    if (drawingTopologyRef.current === closedBars) return;
    drawingTopologyRef.current = closedBars;
    setDraws((existing) => {
      if (!existing.length) return existing;
      const next = reanchorDrawings(existing, bars);
      return next.length === existing.length && next.every((draw, index) => draw === existing[index]) ? existing : next;
    });
    setUndoStack((existing) => existing.length ? existing.map((snapshot) => reanchorDrawings(snapshot, bars)).slice(-DRAWING_HISTORY_LIMIT) : existing);
    setRedoStack((existing) => existing.length ? existing.map((snapshot) => reanchorDrawings(snapshot, bars)).slice(-DRAWING_HISTORY_LIMIT) : existing);
  }, [bars, drawingStorageKey, hydratedDrawingKey]);
  // Restore the saved pan/zoom for this symbol/timeframe. Timestamp anchors
  // keep the same candles focused when the retained history window shifts.
  useEffect(() => {
    if (n < 2 || hydratedViewportKey === viewportStorageKey) return;
    const saved = readSavedViewport(viewportStorageKey);
    // Timestamp identity wins over the old numeric index. If a candle has
    // expired from the two-year tape, fall back to the recent edge instead of
    // silently attaching the viewport to an unrelated candle at that index.
    const a = saved?.startTime !== undefined ? savedViewportIndex(bars, saved.startTime, n - recentCount) : saved?.start != null ? saved.start : n - recentCount;
    const b = saved?.endTime !== undefined ? savedViewportIndex(bars, saved.endTime, n - 1) : saved?.end != null ? saved.end : n - 1;
    const end = Math.min(n - 1, Math.max(1, b));
    const start = Math.max(0, Math.min(n - 2, Math.min(a, end - 1)));
    setView([start, end]);
    setHydratedViewportKey(viewportStorageKey);
  }, [viewportStorageKey, hydratedViewportKey, n, bars[0]?.t, bars[n - 1]?.t]);
  useEffect(() => {
    if (!viewportRestore) {
      // A later snapshot may intentionally omit a nonce; clear the previous
      // guard so that restore can be applied when that snapshot arrives.
      appliedViewportRestoreKey.current = null;
      appliedViewportRestoreNonce.current = null;
      return;
    }
    if (n < 2) return;
    // Legacy callers may omit a nonce. Guard those restores by their durable
    // UTC/index payload so a retention refresh cannot repeatedly reset a
    // user's pan/zoom while the same snapshot object is still mounted.
    const restoreKey = JSON.stringify([viewportRestore.startTime ?? null, viewportRestore.endTime ?? null, viewportRestore.start ?? null, viewportRestore.end ?? null]);
    if (viewportRestore.nonce !== undefined
      ? appliedViewportRestoreNonce.current === viewportRestore.nonce
      : appliedViewportRestoreKey.current === restoreKey) return;
    // A timestamped snapshot belongs to the exporting retention window. If
    // that candle has expired, its numeric index is stale and must not attach
    // the view to an unrelated candle in the newer tape. Fall back to the
    // recent edge just like local viewport hydration; index-only legacy
    // payloads retain their bounded numeric fallback.
    const startFallback = viewportRestore.startTime !== undefined
      ? n - recentCount
      : typeof viewportRestore.start === "number" && Number.isInteger(viewportRestore.start) ? viewportRestore.start : n - recentCount;
    const endFallback = viewportRestore.endTime !== undefined
      ? n - 1
      : typeof viewportRestore.end === "number" && Number.isInteger(viewportRestore.end) ? viewportRestore.end : n - 1;
    const a = viewportRestore?.startTime !== undefined ? savedViewportIndex(bars, viewportRestore.startTime, startFallback) : startFallback;
    const b = viewportRestore?.endTime !== undefined ? savedViewportIndex(bars, viewportRestore.endTime, endFallback) : endFallback;
    const end = Math.min(n - 1, Math.max(1, b));
    const start = Math.max(0, Math.min(n - 2, Math.min(a, end - 1)));
    setView([start, end]);
    if (viewportRestore.nonce !== undefined) appliedViewportRestoreNonce.current = viewportRestore.nonce;
    appliedViewportRestoreKey.current = restoreKey;
    setChartKeyStatus("Snapshot viewport restored; SHADOW_ONLY; NO_DECISION.");
    // Observe payload replacement and clearing as well as nonce changes. The
    // guards above keep equivalent payloads from resetting a manual pan/zoom.
  }, [viewportRestore, n, bars]);
  // Retention refreshes can shift numeric indices while preserving the same
  // tape endpoints. Re-anchor the user's current window by UTC candle identity
  // so a refresh never silently changes which evidence is visible. A live
  // window already at the latest edge follows an appended forming candle.
  // Quotes replace/copy the forming tail on each tick, but cannot change the
  // retained closed-bar UTC identities. Scan that large tape only when its
  // reference changes; track the tiny forming extension with scalar keys.
  const viewportBarIdentity = useMemo(() => closedBars.map((bar) => bar.t).join("|"), [closedBars]);
  useEffect(() => {
    const previous = viewportBarsRef.current;
    // A closed-bar refresh can arrive while the pointer is still down. Do not
    // let the identity re-anchor call setView() in the middle of a drag: that
    // cancels the RAF pan, clears the fractional offset, and produces a
    // visible snap. Keep the previous topology until the gesture is released;
    // panActive is a dependency so this effect retries on pointer-up.
    if (drag.current?.isPan || pinch.current) return;
    if (drawingDrag.current) return;
    viewportBarsRef.current = bars;
    const previousIdentity = viewportIdentityRef.current;
    const tail = bars[bars.length - 1]?.t;
    const identityChanged = previousIdentity?.closed !== viewportBarIdentity || previousIdentity.count !== bars.length || previousIdentity.tail !== tail;
    viewportIdentityRef.current = { closed: viewportBarIdentity, count: bars.length, tail };
    // Forming quote copies and panActive retries can replace the array while
    // preserving every closed-bar UTC identity. Skip the 141k-row reanchor map
    // in that case; only topology changes need timestamp reconciliation.
    if (!identityChanged || !previous || previous.length < 2 || bars.length < 2 || previous === bars) return;
    setPanFrameState((prior) => {
      const current = prior.view;
      const anchored = reanchorViewport({ start: current[0], end: current[1], startTime: previous[current[0]]?.t, endTime: previous[current[1]]?.t }, previous, bars, live || landmarksAtLatestOnly);
      // Refresh reconciliation is not an explicit Reset/zoom request. Keep
      // the settled fractional displacement when the same UTC candles remain
      // visible, including after a leading retention shift. Calling setView
      // here would clear the offset and snap by up to half a candle on release.
      if (anchored.start === current[0] && anchored.end === current[1]) return prior;
      const sameWidth = anchored.end - anchored.start === current[1] - current[0];
      return { view: [anchored.start, anchored.end], offset: sameWidth ? prior.offset : 0 };
    });
  // The identity includes interior UTC rows, not only retention endpoints.
  }, [viewportBarIdentity, bars.length, bars[bars.length - 1]?.t, live, landmarksAtLatestOnly, panActive]);
  useEffect(() => {
    // Replay cursor updates can arrive while a user is panning. Do not let an
    // unrelated cursor tick overwrite the in-progress manual viewport; this
    // effect runs again only when the cursor itself changes.
    if (cursor != null && cursor >= 1 && !drag.current && !pinch.current) {
      if (drawingDrag.current) return;
      setView([Math.max(0, cursor - 110), Math.max(1, cursor)]);
    }
  }, [cursor, setView]);
  const appliedFocusRequest = useRef<string | null>(null);
  useEffect(() => {
    if (focusIndex == null || focusIndex < 0) { appliedFocusRequest.current = null; return; }
    if (n < 2) return;
    // Center a selected historical occurrence in the visible window, like a
    // TradingView inspection jump, while leaving the replay cursor untouched.
    const target = focusTime != null ? savedViewportIndex(bars, focusTime, -1) : Math.min(n - 1, Math.max(0, focusIndex));
    if (target < 0) return;
    const targetBar = bars[target];
    const request = `${symbol}|${tf}|${Date.parse(targetBar.t)}|${focusRequestId}`;
    // A data refresh is not another user jump. Reanchoring above preserves a
    // manual pan, zoom or Reset while this same selected UTC remains mounted.
    if (appliedFocusRequest.current === request) return;
    appliedFocusRequest.current = request;
    const width = Math.min(220, n - 1);
    const maxStart = Math.max(0, n - 1 - width);
    const start = Math.max(0, Math.min(maxStart, target - Math.floor(width / 2)));
    setView([start, Math.min(n - 1, start + width)]);
    setChartKeyStatus(targetBar
      ? `Chart focused on historical evidence at ${shortTime(targetBar.t)} UTC; SHADOW_ONLY; NO_DECISION.`
      : "Chart focused on historical evidence; SHADOW_ONLY; NO_DECISION.");
  }, [focusIndex, focusTime, focusRequestId, n, bars, symbol, tf]);

  const W = size.w, H = size.h, ML = 6, MR = 78, MT = 10, MB = 22;
  const PX0 = ML, PX1 = W - MR, PW = PX1 - PX0, PY0 = MT, PY1 = H - MB, PH = PY1 - PY0;
  const [start, end] = [Math.max(0, Math.min(view[0], n - 2)), Math.min(n - 1, Math.max(view[1], view[0] + 1))];
  // Keep the high-cardinality marker filtering out of the transient pan
  // render path. `panOffset` changes on every animation frame, while these
  // identities only change when the retained tape, viewport bounds, replay
  // cursor, or marker inputs change.
  // Signal and replay collections span the retained tape. Build a sorted
  // reference index once per source identity, then query only the visible
  // candle range while dragging instead of filtering every historical row.
  const signalIndex = useMemo(() => createMicroChartIndex(signals || []), [signals]);
  const replayMarkerIndex = useMemo(() => createMicroChartIndex(markers || []), [markers]);
  const brokerMarkerIndex = useMemo(() => createMicroChartIndex(brokerMarks), [brokerMarks]);
  const visibleSignals = useMemo(() => queryMicroChartIndex(signalIndex, start, end, cursor), [signalIndex, start, end, cursor]);
  const visibleProjectionSignals = useMemo(() => visibleSignals.filter((s) => s.projection && (s.outcome === "pending" || sigHover === signalHoverKey(s))), [visibleSignals, sigHover]);
  const visibleTrades = useMemo(() => (trades || []).filter((t) => t.exitI >= start && t.entryI <= end && (cursor == null || t.exitI <= cursor)), [trades, start, end, cursor]);
  // Marker overlap metadata is independent of pixel position. Precompute it
  // once per visible signal set so fractional pan frames do not repeatedly
  // scan the same array for every marker.
  const visibleSignalOverlap = useMemo(() => {
    const counts = new Map<number, number>();
    for (const signal of visibleSignals) counts.set(signal.i, (counts.get(signal.i) || 0) + 1);
    const seen = new Map<number, number>();
    return visibleSignals.map((signal) => {
      const sameIndexCount = counts.get(signal.i) || 1;
      const overlapOrdinal = sameIndexCount > 1
        ? (seen.set(signal.i, (seen.get(signal.i) || 0) + 1).get(signal.i) || 1)
        : 0;
      return { sameIndexCount, overlapOrdinal };
    });
  }, [visibleSignals]);
  const selectedPosition = useMemo(() => historicalPatternPosition(closedBars, historicalSignal), [closedBars, historicalSignal]);
  const visiblePosition = historicalPositionInViewport(selectedPosition, start, end, cursor);
  const currentLandmarksVisible = currentLandmarksInViewport(landmarksAtLatestOnly, end, n - 1, !!visiblePosition, cursor);
  const zones = currentLandmarksVisible ? suppliedZones : [];
  const lines = currentLandmarksVisible ? suppliedLines : [];
  // Focused position geometry carries the readable ENTRY/TARGET/INVALIDATION
  // captions on its lines. The corresponding translucent zones remain useful
  // as price bands, but repeating their captions at the same right-edge
  // anchor creates a stacked wall of text when both layers are visible.
  useEffect(() => {
    if (hydratedViewportKey !== viewportStorageKey || n < 2) return;
    const viewport = { start, end, startTime: bars[start]?.t, endTime: bars[end]?.t };
    // Snapshot exports receive the latest bounds immediately. Storage waits
    // until movement settles instead of synchronously writing on every frame.
    onViewportChange?.(viewport);
    const timer = setTimeout(() => {
      try { localStorage.setItem(viewportStorageKey, JSON.stringify(viewport)); } catch { /* best effort */ }
    }, 150);
    return () => clearTimeout(timer);
  }, [viewportStorageKey, hydratedViewportKey, n, start, end, bars[0]?.t, bars[n - 1]?.t, bars[start]?.t, bars[end]?.t, onViewportChange]);
  const nView = end - start + 1;
  const vis = useMemo(() => bars.slice(start, end + 1), [bars, start, end]);
  // Closed history is stable while the live forming row updates on every tick.
  // Keep the two-year indicator scans keyed to the closed tape so a tick does
  // not rebuild 200k-point EMA/VWAP/pivot arrays. The optional forming row is
  // projected from the closed tail below and remains presentation-only.
  const closes = useMemo(() => closedBars.map((b) => b.c), [closedBars]);
  const emaF = useMemo(() => ema(closes, 10), [closes]);
  const emaS = useMemo(() => ema(closes, 34), [closes]);
  const vwap = useMemo(() => { let cum = 0; return closedBars.map((b, i) => { cum += (b.h + b.l + b.c) / 3; return cum / (i + 1); }); }, [closedBars]);
  const pivots = useMemo(() => { const w = 3; const out: { i: number; price: number; dir: "high" | "low" }[] = []; for (let i = w; i < closedBars.length - w; i++) { let hi = true, lo = true; for (let k = 1; k <= w; k++) { if (closedBars[i].h < closedBars[i - k].h || closedBars[i].h < closedBars[i + k].h) hi = false; if (closedBars[i].l > closedBars[i - k].l || closedBars[i].l > closedBars[i + k].l) lo = false; } if (hi) out.push({ i, price: closedBars[i].h, dir: "high" }); else if (lo) out.push({ i, price: closedBars[i].l, dir: "low" }); } return out; }, [closedBars]);
  // These collections can contain the full retained two-year tape. Keep
  // their viewport filtering out of the transient pan render so every RAF
  // only maps the small set of annotations that can actually be painted.
  // Pivots are emitted in ascending candle order. Binary range lookup avoids
  // rescanning the full two-year pivot array at every integer pan boundary.
  const visiblePivots = useMemo(() => sliceSortedByIndex(pivots, start, end), [pivots, start, end]);
  const visibleBrokerMarks = useMemo(() => queryMicroChartIndex(brokerMarkerIndex, start, end), [brokerMarkerIndex, start, end]);
  const visibleReplayMarkers = useMemo(() => queryMicroChartIndex(replayMarkerIndex, start, end, cursor), [replayMarkerIndex, start, end, cursor]);
  const hasFormingTail = bars.length > closedBars.length;
  const forming = frame?.bar && bars.length > 0 && (hasFormingTail || Date.parse(bars[bars.length - 1].t) === Date.parse(frame.bar.t))
    ? bars[bars.length - 1]
    : null;
  const formingIndex = bars.length - 1;
  const formingBaseCount = Math.max(0, Math.min(closedBars.length, formingIndex));
  const formingBaseEmaF = emaF[Math.max(0, formingBaseCount - 1)];
  const formingBaseEmaS = emaS[Math.max(0, formingBaseCount - 1)];
  const formingBaseVwap = vwap[Math.max(0, formingBaseCount - 1)];
  const formingEmaF = forming ? forming.c * (2 / 11) + (formingBaseEmaF ?? forming.c) * (1 - 2 / 11) : undefined;
  const formingEmaS = forming ? forming.c * (2 / 35) + (formingBaseEmaS ?? forming.c) * (1 - 2 / 35) : undefined;
  const formingVwap = forming ? ((formingBaseVwap ?? 0) * formingBaseCount + (forming.h + forming.l + forming.c) / 3) / (formingBaseCount + 1) : undefined;
  // Keep the large closed arrays shared; only the final forming value is
  // overridden at read/render time, avoiding a 200k-element copy per tick.
  const displayEmaF = emaF;
  const displayEmaS = emaS;
  const displayVwap = vwap;
  const liveTail = useMemo(() => {
    const start = closedBars.length;
    if (bars.length <= start) return null;
    let ef = emaF[start - 1] ?? bars[start - 1]?.c ?? 0;
    let es = emaS[start - 1] ?? bars[start - 1]?.c ?? 0;
    let cum = (vwap[start - 1] ?? 0) * start;
    const outF: number[] = [], outS: number[] = [], outV: number[] = [];
    for (let i = start; i < bars.length; i++) {
      const bar = bars[i], typical = (bar.h + bar.l + bar.c) / 3;
      ef = bar.c * (2 / 11) + ef * (1 - 2 / 11);
      es = bar.c * (2 / 35) + es * (1 - 2 / 35);
      cum += typical;
      outF.push(ef); outS.push(es); outV.push(cum / (i + 1));
    }
    return { start, emaF: outF, emaS: outS, vwap: outV };
  }, [bars, closedBars.length, emaF, emaS, vwap]);
  // Caption collisions depend on bar spacing, never the fractional pan
  // offset. Avoid repeating the pairwise check on every animation frame.
  const captionSlot = PW / (end - start + 1 + Math.min(22, Math.max(4, Math.round((end - start + 1) * 0.07))));
  const nearbySignalCaptions = useMemo(() => visibleSignals.map((s, index) => {
    const text = s.annotationKind === "named_candle" ? "CANDLE · OBS" : s.reads === "bullish" ? "LONG · OBS" : s.reads === "bearish" ? "SHORT · OBS" : "PATTERN · OBS";
    return visibleSignals.some((candidate, candidateIndex) => candidateIndex !== index && candidate.side === s.side && Math.abs(candidate.i - s.i) * captionSlot < text.length * 5 + 16);
  }), [visibleSignals, captionSlot]);
  const seriesValue = (series: number[], index: number, tail: number | undefined, liveValues?: number[]) => {
    if (liveTail && index >= liveTail.start) return liveValues?.[index - liveTail.start] ?? (index === bars.length - 1 ? tail : undefined);
    return tail !== undefined && index === bars.length - 1 ? tail : series[index];
  };
  if (n < 2) return <div ref={setWrap} style={{ flex: 1, minHeight: 0, display: "flex" }}><div className="mfe-empty" role="status" aria-live="polite" aria-label={n === 0 ? `No closed-bar data available for ${symbol} ${tf}` : `Insufficient closed-bar data for ${symbol} ${tf}`} style={{ flex: 1 }}><div className="ic" aria-hidden="true">?</div><div className="msg">{n === 0 ? `No closed-bar data for ${symbol} ${tf}` : `Need at least two closed bars for ${symbol} ${tf}`}</div></div></div>;

  // Y-domain fits the visible candles AND any overlaid zones/lines, so wider zones (e.g. a higher-TF Setup
  // Fit) auto-zoom the chart out instead of clipping. Zone influence is capped to Kx the candle range so the
  // candles never squish to nothing on an extreme TF mismatch.
  const candleLowHigh = finiteMinMax(vis.flatMap((bar) => [bar.l, bar.h])) ?? [0, 1];
  const lo0c = candleLowHigh[0], hi0c = candleLowHigh[1];
  const rng0 = (hi0c - lo0c) || 1, K = 3;
  const zvals = [...zones.flatMap((z) => [z.lo, z.hi]), ...lines.map((l) => l.price), ...(visiblePosition ? [visiblePosition.entry, visiblePosition.target, visiblePosition.invalidation] : []), ...visibleBrokerMarks.map((mark) => mark.price)]
    .filter((v) => typeof v === "number" && isFinite(v))
    .map((v) => Math.max(lo0c - K * rng0, Math.min(hi0c + K * rng0, v)));
  const overlayLowHigh = finiteMinMax(zvals);
  const lo0 = Math.min(lo0c, overlayLowHigh?.[0] ?? lo0c), hi0 = Math.max(hi0c, overlayLowHigh?.[1] ?? hi0c);
  const pad = (hi0 - lo0) * 0.08 || 1;
  // Horizontal pan must not repeatedly rescale prices as edge candles and
  // current-only overlays enter/leave the window. Fit again on release.
  const panDomain = panActive && tool === "cursor" ? drawingDrag.current?.domain || drag.current?.domain : undefined;
  const lo = panDomain?.[0] ?? lo0 - pad, hi = panDomain?.[1] ?? hi0 + pad, span = hi - lo || 1;
  // right offset: leave a few empty bar-slots on the right (like TradingView) so the forming candle breathes
  const roff = Math.min(22, Math.max(4, Math.round(nView * 0.07)));
  const slot = PW / (nView + roff), bw = Math.max(slot * 0.64, 1);
  const xFor = (i: number) => PX0 + (i - start + 0.5) * slot + panOffset;
  const yFor = (p: number) => PY0 + PH * (1 - (p - lo) / span);
  const barAt = (x: number) => Math.max(start, Math.min(end, start + Math.floor((x - PX0 - panOffset) / slot)));
  const priceAt = (y: number) => lo + (1 - (y - PY0) / PH) * span;
  const xy = (e: React.PointerEvent) => {
    const r = pointerRect.current ?? wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const snap = (i: number, p: number): number => { if (!magnet) return p; const b = bars[i]; if (!b) return p; return [b.o, b.h, b.l, b.c].reduce((a, v) => Math.abs(v - p) < Math.abs(a - p) ? v : a, b.c); };
  gRef.current = { start, end, n, PX0, slot, live };

  const drawingHit = (x: number, y: number): { index: number; mode: DrawingEditMode } | null => {
    if (hideDraws || x < PX0 || x > PX1 || y < PY0 || y > PY1) return null;
    const distanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    };
    for (let index = draws.length - 1; index >= 0; index -= 1) {
      const draw = draws[index];
      const ax = xFor(draw.a.i), ay = yFor(draw.a.p), bx = xFor(draw.b.i), by = yFor(draw.b.p);
      const endpointA = Math.hypot(x - ax, y - ay) <= 11;
      const endpointB = Math.hypot(x - bx, y - by) <= 11;
      if (draw.kind !== "brush" && draw.kind !== "text" && draw.kind !== "hline" && endpointA) return { index, mode: "endpoint-a" };
      if (draw.kind !== "brush" && draw.kind !== "text" && draw.kind !== "hline" && endpointB) return { index, mode: "endpoint-b" };
      if (draw.kind === "hline" && Math.abs(y - ay) <= 9) return { index, mode: "move" };
      if (draw.kind === "text" && x >= ax - 9 && x <= ax + Math.min(240, (draw.text || "").length * 7.2) + 9 && y >= ay - 18 && y <= ay + 9) return { index, mode: "move" };
      if (draw.kind === "brush") {
        const points = draw.pts || [draw.a, draw.b];
        if (points.some((point, pointIndex) => pointIndex === 0 ? Math.hypot(x - xFor(point.i), y - yFor(point.p)) <= 9 : distanceToSegment(x, y, xFor(points[pointIndex - 1].i), yFor(points[pointIndex - 1].p), xFor(point.i), yFor(point.p)) <= 9)) return { index, mode: "move" };
      } else if (distanceToSegment(x, y, ax, ay, bx, by) <= 9) return { index, mode: "move" };
      const left = Math.min(ax, bx) - 9, right = Math.max(ax, bx) + 9, top = Math.min(ay, by) - 9, bottom = Math.max(ay, by) + 9;
      if ((draw.kind === "rect" || draw.kind === "measure" || draw.kind === "fib") && x >= left && x <= right && y >= top && y <= bottom) return { index, mode: "move" };
    }
    return null;
  };
  const editDrawing = (draw: Draw, mode: DrawingEditMode, dx: number, dy: number, x: number, y: number): Draw => {
    const points = [draw.a, draw.b, ...(draw.pts || [])];
    const deltaI = draw.kind === "hline" ? 0 : Math.max(-Math.min(...points.map((point) => point.i)), Math.min(n - 1 - Math.max(...points.map((point) => point.i)), Math.round(dx / slot)));
    const movePoint = (point: Pt): Pt => {
      const i = point.i + deltaI;
      return { ...point, i, p: point.p + dy, t: bars[i]?.t };
    };
    const endpoint = (): Pt => { const i = barAt(x); return { i, p: snap(i, priceAt(y)), t: bars[i]?.t }; };
    if (mode === "endpoint-a") return { ...draw, a: endpoint() };
    if (mode === "endpoint-b") return { ...draw, b: endpoint() };
    if (draw.kind === "brush") {
      const pts = (draw.pts || []).map(movePoint);
      return { ...draw, a: movePoint(draw.a), b: movePoint(draw.b), pts };
    }
    return { ...draw, a: movePoint(draw.a), b: movePoint(draw.b) };
  };

  function onDown(e: React.PointerEvent) {
    if ((e.target as Element).closest(".microchart-signal,.microchart-trade")) return;
    // One layout read at gesture start; all subsequent drag moves reuse it.
    pointerRect.current = wrapRef.current?.getBoundingClientRect() ?? null;
    const { x, y } = xy(e); e.currentTarget.setPointerCapture?.(e.pointerId);
    // A stale crosshair under the pointer makes the chart appear to flicker
    // while the viewport is moving. It is restored once the gesture ends.
    if (tool === "cursor") setHover(null);
    if (e.pointerType === "touch") {
      touchPointers.current.set(e.pointerId, { x, y });
      if (touchPointers.current.size >= 2) {
        const points = [...touchPointers.current.values()].slice(0, 2);
        const dx = points[1].x - points[0].x, dy = points[1].y - points[0].y;
        const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
        pinch.current = { startDistance: Math.max(1, Math.hypot(dx, dy)), startMidpointIndex: barAt(midpoint.x), view0: [start, end] };
        drag.current = null;
        drawingDrag.current = null;
        setDrawingPreview(null);
        cancelPan();
        // Keep the gesture-active signal asserted for the pinch lifetime so a
        // deferred data refresh retries its UTC re-anchor when the second
        // pointer is released (cancelPan clears it while discarding RAF work).
        setPanActive(true);
        setTemp(null);
        setHover(midpoint);
        setChartKeyStatus("Pinch zoom active; SHADOW_ONLY; NO_DECISION.");
        return;
      }
    }
    // Lock protects the persisted drawing layer while keeping cursor pan and
    // inspection available. No drawing gesture may create or mutate a draft
    // while locked.
    if (lock && tool !== "cursor") { drag.current = null; return; }
    if (tool === "cursor") {
      const hit = !lock ? drawingHit(x, y) : null;
      if (hit) {
        setSelectedDrawingIndex(hit.index);
        (e.currentTarget as SVGSVGElement).focus();
        setChartKeyStatus(`${draws[hit.index].kind} drawing selected. Drag to edit; Delete removes; Escape deselects.`);
        if (!lock) {
          drawingDrag.current = { index: hit.index, mode: hit.mode, x, y, before: draws, moved: false, domain: [lo, hi] };
          setPanActive(true);
          drag.current = null;
        }
        return;
      }
      setSelectedDrawingIndex(null);
    }
    const i = barAt(x); const a: Pt = { i, p: snap(i, priceAt(y)), t: bars[i]?.t };
    drag.current = { x, a, view0: [start, end], moved: false, slot, domain: [lo, hi], pan0: panOffset, isPan: tool === "cursor" };
    if (tool === "cursor") setPanActive(true);
    if (tool === "hline") { appendDrawing({ kind: "hline", a, b: a, color: "var(--accent-cyan)" }); drag.current = null; return; }
    if (tool === "text") { drag.current = null; const t = window.prompt("Text label:"); if (t) appendDrawing({ kind: "text", a, b: a, color: "var(--warn-amber)", text: t }); return; }
    if (tool === "brush") {
      // Persist brush points against a closed-bar identity. `barF` is a
      // fractional render coordinate and cannot survive drawing hydration:
      // persisted points are deliberately validated as integer candle
      // indices so a refreshed two-year tape can re-anchor them by `t`.
      const fp0 = { i, p: priceAt(y), t: bars[i]?.t };
      setTemp({ kind: "brush", a: fp0, b: fp0, pts: [fp0], color: "var(--accent-cyan)" });
    }
  }
  function onMove(e: React.PointerEvent) {
    const { x, y } = xy(e);
    if (e.pointerType === "touch") touchPointers.current.set(e.pointerId, { x, y });
    const activePinch = pinch.current;
    if (activePinch && touchPointers.current.size >= 2) {
      const points = [...touchPointers.current.values()].slice(0, 2);
      const dx = points[1].x - points[0].x, dy = points[1].y - points[0].y;
      const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      setView(microChartPinchViewport(activePinch.view0, activePinch.startDistance, Math.max(1, Math.hypot(dx, dy)), activePinch.startMidpointIndex, barAt(midpoint.x), n));
      // setView() cancels queued mouse-pan work and clears panActive. Restore
      // ownership for the pinch frame so refresh reconciliation stays deferred
      // until the second pointer is released.
      setPanActive(true);
      setHover(midpoint);
      e.preventDefault();
      return;
    }
    const d = drag.current;
    const drawingEdit = drawingDrag.current;
    if (drawingEdit) {
      if (Math.hypot(x - drawingEdit.x, y - drawingEdit.y) > 2) drawingEdit.moved = true;
      const original = drawingEdit.before[drawingEdit.index];
      if (original) setDrawingPreview(editDrawing(original, drawingEdit.mode, x - drawingEdit.x, priceAt(y) - priceAt(drawingEdit.y), x, y));
      return;
    }
    if (d && tool === "cursor") {
      if (Math.abs(x - d.x) > 2) d.moved = true;
      pendingPan.current = microChartPan(d.view0, d.pan0 + x - d.x, d.slot, n);
      if (panFrame.current === null) panFrame.current = requestAnimationFrame(flushPan);
      return;
    }
    setHover({ x, y }); if (!d) return;
    if (Math.abs(x - d.x) > 2) d.moved = true;
    const i = barAt(x); const b: Pt = { i, p: snap(i, priceAt(y)), t: bars[i]?.t };
    if (tool === "brush") {
      // Keep every point valid for the durable drawing contract while the
      // price coordinate retains the freehand path's vertical detail.
      const np = { i, p: priceAt(y), t: bars[i]?.t };
      setTemp((t) => (t ? { ...t, pts: [...(t.pts || []), np], b: np } : t));
    }
    else if (tool !== "cursor") setTemp({ kind: tool, a: d.a, b, color: tool === "measure" ? (b.p >= d.a.p ? "var(--bull-green)" : "var(--bear-red)") : "var(--accent-cyan)" });
  }
  function onUp(e: React.PointerEvent) {
    const releasePoint = xy(e);
    const completedDrawingEdit = drawingDrag.current;
    if (completedDrawingEdit) {
      const original = completedDrawingEdit.before[completedDrawingEdit.index];
      const moved = Math.hypot(releasePoint.x - completedDrawingEdit.x, releasePoint.y - completedDrawingEdit.y) > 2;
      const finalDraw = original && (completedDrawingEdit.moved || moved)
        ? editDrawing(original, completedDrawingEdit.mode, releasePoint.x - completedDrawingEdit.x, priceAt(releasePoint.y) - priceAt(completedDrawingEdit.y), releasePoint.x, releasePoint.y)
        : original;
      drawingDrag.current = null;
      setPanActive(false);
      setDrawingPreview(null);
      if (!lock && !hideDraws && finalDraw && JSON.stringify(finalDraw) !== JSON.stringify(original)) {
        setUndoStack((existing) => [...existing, completedDrawingEdit.before].slice(-DRAWING_HISTORY_LIMIT));
        setRedoStack([]);
        setDraws((current) => current.map((draw, index) => index === completedDrawingEdit.index ? finalDraw : draw));
        setChartKeyStatus(`${finalDraw.kind} drawing edited. SHADOW_ONLY; NO_DECISION.`);
      }
      pointerRect.current = null;
      touchPointers.current.delete(e.pointerId);
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }
    // Browsers can coalesce the last move before pointer-up. Commit the
    // release coordinate rather than stopping at an older queued move.
    const releasedPan = drag.current;
    if (releasedPan?.isPan && tool === "cursor") {
      pendingPan.current = microChartPan(releasedPan.view0, releasedPan.pan0 + releasePoint.x - releasedPan.x, releasedPan.slot, n);
    }
    flushPan();
    setPanActive(false);
    pointerRect.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (e.pointerType === "touch") {
      touchPointers.current.delete(e.pointerId);
      if (pinch.current) {
        pinch.current = null;
        drag.current = null;
        setTemp(null);
        setChartKeyStatus("Pinch zoom ended; SHADOW_ONLY; NO_DECISION.");
        return;
      }
    }
    if (!pinch.current && tool === "cursor") setHover(releasePoint);
    const d = drag.current; drag.current = null;
    if (d && temp && tool !== "cursor") {
      // Pointer-up can arrive after the final pointermove (for example when
      // the browser coalesces events). Rebuild the draft's terminal point
      // from the release coordinate so a drawing ends exactly where the user
      // lifted the pointer, while retaining integer UTC candle anchors.
      const releaseI = barAt(releasePoint.x);
      const releaseBarPoint: Pt = { i: releaseI, p: snap(releaseI, priceAt(releasePoint.y)), t: bars[releaseI]?.t };
      let completed: Draw = { ...temp, a: d.a, b: releaseBarPoint, color: tool === "measure" ? (releaseBarPoint.p >= d.a.p ? "var(--bull-green)" : "var(--bear-red)") : temp.color };
      if (tool === "brush") {
        const releaseBrushPoint: Pt = { i: releaseI, p: priceAt(releasePoint.y), t: bars[releaseI]?.t };
        const priorPoints = temp.pts || [temp.a];
        const lastPoint = priorPoints[priorPoints.length - 1];
        const points = lastPoint && lastPoint.i === releaseBrushPoint.i && lastPoint.p === releaseBrushPoint.p
          ? priorPoints
          : [...priorPoints, releaseBrushPoint];
        completed = { ...temp, b: releaseBrushPoint, pts: points.slice(-BRUSH_POINT_LIMIT) };
      }
      if (tool === "measure") {
        if (measureExpiry.current !== null) clearTimeout(measureExpiry.current);
        const measurement = completed;
        setTemp(measurement);
        measureExpiry.current = setTimeout(() => {
          setTemp((current) => current === measurement ? null : current);
          measureExpiry.current = null;
        }, 2500);
      } else {
        appendDrawing(completed);
        setTemp(null);
      }
    }
  }
  const onPointerCancel = () => {
    pointerRect.current = null;
    cancelPan();
    drawingDrag.current = null;
    setDrawingPreview(null);
    // A cancelled multi-touch gesture has no draft to announce through the
    // ordinary drawing path. Keep the live status useful for keyboard and
    // screen-reader users, and preserve the chart's read-only authority copy.
    const wasPinching = Boolean(pinch.current);
    touchPointers.current.clear();
    pinch.current = null;
    if (wasPinching) {
      drag.current = null;
      setTemp(null);
      setChartKeyStatus("Pinch zoom cancelled; SHADOW_ONLY; NO_DECISION.");
      return;
    }
    if (!drag.current && !temp) return;
    drag.current = null;
    setTemp(null);
    setChartKeyStatus("Pointer gesture cancelled.");
  };
  useEffect(() => () => {
    if (measureExpiry.current !== null) clearTimeout(measureExpiry.current);
  }, []);
  const reset = () => { setView([Math.max(0, n - recentCount), n - 1]); setChartKeyStatus("Recent bars shown."); };
  // TradingView-style double-click reset is available from the cursor tool on
  // mouse and trackpad surfaces. Drawing tools keep double-click free for
  // their own gesture semantics.
  const onChartDoubleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (tool !== "cursor") return;
    if (selectedDrawingIndex !== null) return;
    event.preventDefault();
    reset();
  };
  // Changing tools while a pointer is down must synchronously abandon the old
  // gesture. Waiting for the tool-change effect leaves a stale draft/drag ref
  // alive until pointer-up, which can commit a drawing under the newly chosen
  // tool or turn an edit into a pan. Saved drawings and undo history remain
  // untouched; only the in-flight interaction is cancelled.
  const cancelInteractiveGesture = () => {
    drag.current = null;
    drawingDrag.current = null;
    pinch.current = null;
    touchPointers.current.clear();
    setDrawingPreview(null);
    setTemp(null);
    setSelectedDrawingIndex(null);
    if (measureExpiry.current !== null) clearTimeout(measureExpiry.current);
    measureExpiry.current = null;
    cancelPan();
  };
  const selectTool = (next: Tool, shortcutIndex: number) => {
    if (next !== tool) cancelInteractiveGesture();
    setTool(next);
    setToolFocusIndex(shortcutIndex);
    setChartKeyStatus(`${MICROCHART_TOOL_SHORTCUTS[shortcutIndex].t} selected; SHADOW_ONLY; NO_DECISION.`);
  };
  const undoDrawing = useCallback(() => {
    if (lock) { setChartKeyStatus("Drawings are locked; unlock to undo."); return; }
    if (!undoStack.length) { setChartKeyStatus("Nothing to undo."); return; }
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, draws].slice(-DRAWING_HISTORY_LIMIT));
    setDraws(previous);
    drawingDrag.current = null;
    setDrawingPreview(null);
    setSelectedDrawingIndex(null);
    setChartKeyStatus(`Undid drawing edit; ${previous.length} drawing${previous.length === 1 ? "" : "s"} remain.`);
  }, [draws, lock, undoStack]);
  const redoDrawing = useCallback(() => {
    if (lock) { setChartKeyStatus("Drawings are locked; unlock to redo."); return; }
    if (!redoStack.length) { setChartKeyStatus("Nothing to redo."); return; }
    const next = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, draws].slice(-DRAWING_HISTORY_LIMIT));
    setDraws(next);
    drawingDrag.current = null;
    setDrawingPreview(null);
    setSelectedDrawingIndex(null);
    setChartKeyStatus(`Redid drawing edit; ${next.length} drawing${next.length === 1 ? "" : "s"} remain.`);
  }, [draws, lock, redoStack]);
  // Legacy clear contract retained for source compatibility: const clearDrawings = () => { if (lock) return; setDraws([]); setChartKeyStatus("All drawings cleared."); };
  const clearDrawings = () => {
    if (lock) return;
    if (!draws.length) { setChartKeyStatus("No drawings to clear."); return; }
    setUndoStack((stack) => [...stack, draws].slice(-DRAWING_HISTORY_LIMIT));
    setRedoStack([]);
    setDraws([]);
    drawingDrag.current = null;
    setDrawingPreview(null);
    setSelectedDrawingIndex(null);
    setChartKeyStatus("All drawings cleared; undo is available.");
  };
  // Keep the visual annotation layer toggle synchronized with the live status
  // region. Without this announcement, keyboard and screen-reader users could
  // activate the eye control while the chart status still described the prior
  // drawing visibility state.
  const toggleDrawingsVisibility = () => {
    const nextHidden = !hideDraws;
    setHideDraws(nextHidden);
    setChartKeyStatus(nextHidden
      ? "Drawings hidden; annotations remain saved. SHADOW_ONLY; NO_DECISION."
      : "Drawings shown. SHADOW_ONLY; NO_DECISION.");
  };
  const annotationCount = visibleSignals.length + visibleTrades.length;
  const activeAnnotationIndex = annotationCount ? Math.min(annotationFocusIndex, annotationCount - 1) : 0;
  // Keep the roving anchor valid when panning, replaying, or filtering changes the
  // visible annotation set. Stale SVG refs must not become keyboard destinations.
  useEffect(() => {
    annotationRefs.current = annotationRefs.current.slice(0, annotationCount);
    setAnnotationFocusIndex((index) => annotationCount ? Math.min(index, annotationCount - 1) : 0);
    if (!annotationCount) setChartKeyStatus("No shadow annotations in visible window. SHADOW_ONLY; NO_DECISION.");
  }, [annotationCount]);
  const annotationStatus = (index: number) => {
    const position = annotationCount ? ` ${Math.min(annotationCount, Math.max(1, index + 1))} of ${annotationCount}` : "";
    const signal = visibleSignals[index];
    if (signal) {
      const outcome = signal.nextBarOutcome ? `next closed bar ${signal.nextBarOutcome}` : signal.outcome === "pending" ? "outcome pending" : `outcome ${signal.outcome}`;
      return `Shadow annotation${position} ${signal.label} at ${shortTime(signal.time)}; ${outcome}; SHADOW_ONLY; NO_DECISION.`;
    }
    const trade = visibleTrades[index - visibleSignals.length];
    if (trade) {
      const outcome = `${trade.outcome}, ${trade.R >= 0 ? "+" : ""}${trade.R}R`;
      return `Shadow simulated${position} ${trade.dir} trade at ${shortTime(trade.t || "")}; outcome ${outcome}; SHADOW_ONLY; NO_DECISION.`;
    }
    return `Shadow annotation${position}; SHADOW_ONLY; NO_DECISION.`;
  };
  const focusAnnotationAt = (index: number) => {
    const bounded = annotationCount ? (index + annotationCount) % annotationCount : 0;
    setAnnotationFocusIndex(bounded);
    setChartKeyStatus(annotationStatus(bounded));
    annotationRefs.current[bounded]?.focus({ preventScroll: true });
  };
  const selectSignal = (signal: SignalMarker, index: number) => {
    // Mouse activation must preserve the same roving annotation state as
    // keyboard activation. Otherwise a click selects evidence in the parent
    // page while the next Arrow/Home/End action starts from a stale marker.
    setAnnotationFocusIndex(index);
    setChartKeyStatus(annotationStatus(index));
    annotationRefs.current[index]?.focus({ preventScroll: true });
    onSignalSelect?.(signal);
  };
  const onAnnotationKeyDown = (event: React.KeyboardEvent<SVGGElement>, index: number) => {
    const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? index + 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? index - 1
      : event.key === "Home" ? 0
      : event.key === "End" ? annotationCount - 1
      : null;
    if (next === null || !annotationCount) return;
    event.preventDefault();
    // Annotation navigation owns the key event. Without stopping propagation,
    // the parent SVG treats the same Arrow/Home/End key as a chart pan or
    // viewport jump after the marker has moved focus, producing a surprising
    // double action for keyboard users.
    event.stopPropagation();
    focusAnnotationAt(next);
  };
  const onSignalKeyDown = (event: React.KeyboardEvent<SVGGElement>, index: number, signal: SignalMarker) => {
    // Signal annotations are actionable evidence links: keyboard activation
    // must select the same concept/occurrence as a pointer click. Keep the
    // navigation shortcuts intact for all other keys.
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onSignalSelect?.(signal);
      setAnnotationFocusIndex(index);
      setChartKeyStatus(annotationStatus(index));
      return;
    }
    onAnnotationKeyDown(event, index);
  };
  const onChartKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    // Chart commands use plain keys, except the documented undo/redo pairs.
    // Reserve other modified shortcuts for the browser/OS before any drawing
    // selection, deletion, cancellation or viewport mutation can run.
    if (event.altKey || ((event.ctrlKey || event.metaKey) && !["z", "y"].includes(event.key.toLowerCase()))) return;
    const [a, b] = gRef.current ? [gRef.current.start, gRef.current.end] : [start, end];
    const width = Math.max(8, b - a + 1);
    const pan = Math.max(1, Math.round(width * 0.12));
    if ((event.key === "[" || event.key === "]") && tool === "cursor") {
      event.preventDefault();
      if (hideDraws || !draws.length) {
        setChartKeyStatus(hideDraws ? "Drawings are hidden; show drawings to select one." : "No saved drawings to select.");
        return;
      }
      const next = microChartDrawingSelection(selectedDrawingIndex, event.key, draws.length);
      if (next === null || !draws[next]) return;
      setSelectedDrawingIndex(next);
      const drawing = draws[next];
      setChartKeyStatus(`${drawing.kind} drawing selected (${next + 1} of ${draws.length}). Drag to edit; Delete removes; Escape deselects. SHADOW_ONLY; NO_DECISION.`);
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && selectedDrawingIndex !== null && !(event.target as Element).closest(".microchart-signal,.microchart-trade")) {
      event.preventDefault();
      if (lock || hideDraws) { setChartKeyStatus("Drawings are locked or hidden; selection cannot be removed."); return; }
      if (draws[selectedDrawingIndex]) {
        setUndoStack((existing) => [...existing, draws].slice(-DRAWING_HISTORY_LIMIT));
        setRedoStack([]);
        setDraws((current) => current.filter((_, index) => index !== selectedDrawingIndex));
        drawingDrag.current = null;
        setDrawingPreview(null);
        setSelectedDrawingIndex(null);
        setChartKeyStatus("Selected drawing removed; undo is available.");
      }
      return;
    }
    if (event.key === "Escape") {
      // TradingView-style cancel: abandon an in-progress drawing before it is
      // committed. This also clears a pending pan gesture if focus returns to
      // the canvas while the pointer is still captured.
      event.preventDefault();
      // Clear pinch ownership too, so trailing touch moves cannot resume a
      // gesture after Escape has announced its cancellation.
      cancelInteractiveGesture();
      setChartKeyStatus("Active drawing cancelled.");
      return;
    }
    const modifier = event.ctrlKey || event.metaKey;
    // The canvas is the primary drawing surface. Keep the documented letter
    // shortcuts available when focus is there, while leaving browser/system
    // combinations (Ctrl/Cmd/Alt + key) untouched.
    if (!modifier && !event.altKey) {
      const shortcutTool = microChartToolShortcut(event.key);
      if (shortcutTool) {
        event.preventDefault();
        const shortcutIndex = MICROCHART_TOOL_SHORTCUTS.findIndex((candidate) => candidate.id === shortcutTool);
        selectTool(shortcutTool, shortcutIndex);
        return;
      }
    }
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redoDrawing(); else undoDrawing();
      return;
    }
    if (modifier && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redoDrawing();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      const [homeStart, homeEnd] = microChartHomeViewport(n, width);
      setView([homeStart, homeEnd]);
      const shown = bars[homeStart];
      const shownEnd = bars[homeEnd];
      setChartKeyStatus(`Earliest bars shown: ${shown ? shortTime(shown.t) : ""} to ${shownEnd ? shortTime(shownEnd.t) : ""}.`);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      const [latestStart, latestEnd] = microChartLatestViewport(n, width);
      setView([latestStart, latestEnd]);
      const shown = bars[latestStart];
      const shownEnd = bars[latestEnd];
      setChartKeyStatus(`Latest bars shown: ${shown ? shortTime(shown.t) : ""} to ${shownEnd ? shortTime(shownEnd.t) : ""}.`);
      return;
    }
    // TradingView-style page navigation moves by one full viewport while
    // retaining the current zoom. PageUp goes earlier and PageDown later;
    // this keeps keyboard navigation useful when a tape is much longer than
    // the visible window without changing any chart evidence or authority.
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const delta = event.key === "PageUp" ? -width : width;
      const [nextStart, nextEnd] = microChartPageViewport(a, b, n, delta < 0 ? "earlier" : "later");
      setView([nextStart, nextEnd]);
      const shown = bars[nextStart];
      const shownEnd = bars[nextEnd];
      setChartKeyStatus(`${event.key === "PageUp" ? "Earlier" : "Later"} page shown: ${shown ? shortTime(shown.t) : ""} to ${shownEnd ? shortTime(shownEnd.t) : ""}.`);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? -pan : pan;
      const nextEnd = Math.max(1, Math.min(n - 1, b + delta));
      setView([Math.max(0, nextEnd - width + 1), nextEnd]);
      const shown = bars[Math.max(0, nextEnd - width + 1)];
      const shownEnd = bars[nextEnd];
      setChartKeyStatus(`${event.key === "ArrowLeft" ? "Earlier" : "Later"} bars shown: ${shown ? shortTime(shown.t) : ""} to ${shownEnd ? shortTime(shownEnd.t) : ""}.`);
      return;
    }
    // TradingView-style keyboard zoom: Up/Down provide a discoverable zoom
    // path for users who do not have a dedicated +/- key. Keep the right edge
    // pinned in live mode, matching wheel and +/- behavior.
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const zoomIn = event.key === "ArrowUp";
      const nextWidth = Math.max(8, Math.min(2500, zoomIn ? Math.round(width * 0.8) : Math.round(width * 1.2)));
      const nextEnd = live ? n - 1 : b;
      setView([Math.max(0, nextEnd - nextWidth + 1), nextEnd]);
      setChartKeyStatus(`${zoomIn ? "Zoomed in" : "Zoomed out"}; ${nextWidth} bars visible.`);
      return;
    }
    if (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_") {
      event.preventDefault();
      const nextWidth = Math.max(8, Math.min(2500, event.key === "-" || event.key === "_" ? Math.round(width * 1.2) : Math.round(width * 0.8)));
      const nextEnd = live ? n - 1 : b;
      setView([Math.max(0, nextEnd - nextWidth + 1), nextEnd]);
      setChartKeyStatus(`${event.key === "-" || event.key === "_" ? "Zoomed out" : "Zoomed in"}.`);
    }
  };

  const blocks: { x0: number; x1: number; c: string; k: string }[] = [];
  for (let i = start; i <= end; i++) { const s = sessionOf(bars[i].t); const last = blocks[blocks.length - 1]; if (last && last.k === s.k) last.x1 = xFor(i) + slot / 2; else blocks.push({ x0: xFor(i) - slot / 2, x1: xFor(i) + slot / 2, c: s.c, k: s.k }); }
  const gy = Array.from({ length: 6 }, (_, k) => lo + (span * (k + 0.5)) / 6);
  const gx = timeAxisTicks(start, end, slot, PW);
  const hb = hover ? bars[barAt(hover.x)] : null;
  const last = bars[end], lp = last.c, ly = yFor(lp), upBar = last.c >= last.o;
  const prevC = (bars[end - 1] || last).c, chg = lp - prevC, chgPct = prevC ? (chg / prevC) * 100 : 0;
  // TV behavior: OHLC legend follows the candle under the pointer (otherwise the latest candle). Presentation-only; it changes which candle is read in the legend, never the data.
  // Closed-bar evidence remains unchanged.
  const legendI = hover ? barAt(hover.x) : end;
  const lb = bars[legendI] || last, lbPrevC = (bars[legendI - 1] || lb).c;
  const legendEmaF = seriesValue(displayEmaF, legendI, formingEmaF, liveTail?.emaF);
  const legendEmaS = seriesValue(displayEmaS, legendI, formingEmaS, liveTail?.emaS);
  const lchg = lb.c - lbPrevC, lchgPct = lbPrevC ? (lchg / lbPrevC) * 100 : 0, lbUp = lb.c >= lb.o;
  // Keep the interactive SVG legible to assistive technology without turning
  // any visual estimate into a trading instruction. Closed bars remain the
  // evidence boundary; a live forming row is presentation context only.
  // A broker frame may overlap the newest retained row (same candle start)
  // instead of appending a row. Detect that replacement as forming context too;
  // otherwise the displayed forming OHLC is incorrectly announced as closed.
  const formingTime = frame?.bar ? Date.parse(frame.bar.t) : NaN;
  const formingVisible = bars.length > closedBars.length || Boolean(frame?.bar && bars.length > 0 && Date.parse(bars[bars.length - 1].t) === formingTime);
  const endpointIsTail = end === bars.length - 1;
  const formingInViewport = formingVisible && endpointIsTail;
  const endpointLabel = formingInViewport ? "LIVE" : endpointIsTail ? "LAST" : "VIEW";
  const closedTail = closedBars[closedBars.length - 1];
  const researchLandmarks = lines.length ? ` Research landmarks: ${lines.map((line) => line.label).join(", ")}.` : "";
  const latestReadout = formingInViewport
    ? `Latest forming price ${fp(last.c)}; open ${fp(last.o)}, high ${fp(last.h)}, low ${fp(last.l)}${closedTail ? `; latest closed-bar close ${fp(closedTail.c)}` : ""}.`
    : `Visible endpoint close ${fp(last.c)} at ${last.t} UTC; ${endpointIsTail ? "latest retained candle" : "historical viewport"}; open ${fp(last.o)}, high ${fp(last.h)}, low ${fp(last.l)}.`;
  const chartDescription = `${symbol} ${tf} research chart; ${nView} visible bars from ${shortTime(vis[0].t)} to ${shortTime(last.t)} (${closedBars.length} closed bars${formingInViewport ? "; a forming candle is shown for context and is not closed-bar evidence" : ""}). ${latestReadout}${researchLandmarks} Shadow only; no decision or order.`;
  const evidenceStatus = `Research evidence: ${closedBars.length.toLocaleString()} closed bars${formingInViewport ? "; forming candle shown for context" : ""}. SHADOW_ONLY · NO_DECISION · no order authority.`;
  // plan zones are "as of NOW" ? anchor them to the recent/right area so they don't read like historical levels
  const xNow = xFor(end); const xAnchor = Math.max(PX0, xNow - Math.min(nView - 1, 20) * slot);
  const compactZoneLabels = zoneLayout === "wide" && PX1 - PX0 < 340;
  const zoneLabelY = arrangeZoneLabels(zones.map((z) => yFor((z.hi + z.lo) / 2)), PY0 + (compactZoneLabels ? 98 : 64), PY1 - 12, compactZoneLabels ? 32 : 18);

  const drawEl = (d: Draw, k: number, tmp = false) => {
    const op = tmp ? 0.85 : 1;
    if (d.kind === "brush") return <g key={k} transform={`translate(${panOffset},0)`}><MicroChartBrush points={d.pts} color={d.color} opacity={op} start={start} left={PX0} top={PY0} height={PH} slot={slot} lo={lo} span={span} /></g>;
    if (d.kind === "text") return <text key={k} x={xFor(d.a.i)} y={yFor(d.a.p)} fill={d.color} fontSize="12" fontWeight="700" opacity={op}>{d.text}</text>;
    if (d.kind === "fib") { const lv = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]; const x1 = Math.min(xFor(d.a.i), xFor(d.b.i)), x2 = Math.max(xFor(d.a.i), xFor(d.b.i)); return <g key={k} opacity={op}>{lv.map((L, li) => { const p = d.a.p + (d.b.p - d.a.p) * L; const y = yFor(p); const col = L === 0 || L === 1 ? "var(--text-secondary)" : L === 0.618 ? "var(--warn-amber)" : "var(--text-secondary)"; return <g key={li}><line x1={x1} y1={y} x2={x2} y2={y} stroke={col} strokeWidth="1" strokeDasharray="4 3" /><text x={x1 + 3} y={y - 2} fill={col} fontSize="9" fontFamily={MONO}>{L} · {fp(p)}</text></g>; })}<line x1={xFor(d.a.i)} y1={yFor(d.a.p)} x2={xFor(d.b.i)} y2={yFor(d.b.p)} stroke="var(--text-secondary)" strokeWidth="0.8" opacity="0.4" /></g>; }
    if (d.kind === "hline") return <g key={k}><line x1={PX0} y1={yFor(d.a.p)} x2={PX1} y2={yFor(d.a.p)} stroke={d.color} strokeWidth="1.2" strokeDasharray="6 4" opacity={op} /><text x={PX0 + 4} y={yFor(d.a.p) - 3} fill={d.color} fontSize="10" fontFamily={MONO}>{fp(d.a.p)}</text></g>;
    if (d.kind === "trend") return <line key={k} x1={xFor(d.a.i)} y1={yFor(d.a.p)} x2={xFor(d.b.i)} y2={yFor(d.b.p)} stroke={d.color} strokeWidth="1.7" opacity={op} />;
    const x = Math.min(xFor(d.a.i), xFor(d.b.i)), x2 = Math.max(xFor(d.a.i), xFor(d.b.i)), y = Math.min(yFor(d.a.p), yFor(d.b.p)), y2 = Math.max(yFor(d.a.p), yFor(d.b.p));
    if (d.kind === "measure") {
      const dp = d.b.p - d.a.p, dpct = d.a.p ? (dp / d.a.p) * 100 : 0, dbars = Math.abs(d.b.i - d.a.i);
      return <g key={k}><rect x={x} y={y} width={Math.max(1, x2 - x)} height={Math.max(1, y2 - y)} fill={d.color} fillOpacity="0.12" stroke={d.color} strokeWidth="1.2" /><rect x={(x + x2) / 2 - 52} y={d.b.p >= d.a.p ? y - 26 : y2 + 4} width="104" height="22" rx="3" fill="var(--bg-panel)" stroke={d.color} /><text x={(x + x2) / 2} y={(d.b.p >= d.a.p ? y - 11 : y2 + 19)} fill={d.color} fontSize="10" fontWeight="700" textAnchor="middle" fontFamily={MONO}>{dp >= 0 ? "+" : ""}{fp(dp)} · {dpct >= 0 ? "+" : ""}{dpct.toFixed(2)}% · {dbars} bars</text></g>;
    }
    return <rect key={k} x={x} y={y} width={Math.max(1, x2 - x)} height={Math.max(1, y2 - y)} fill={d.color} fillOpacity="0.12" stroke={d.color} strokeWidth="1.2" opacity={op} />;
  };

  const TOOLS = MICROCHART_TOOL_SHORTCUTS;
  const researchStatusLabel = locale === "vi" ? "Dự báo" : "Forecast";
  const researchProvenanceLabel = locale === "vi" ? "Nguồn nến đóng" : "Closed-bar provenance";
  const tbtn = (active: boolean): React.CSSProperties => ({ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, cursor: "pointer", border: "1px solid transparent", background: active ? "var(--tv-tool-active-bg)" : "transparent", color: active ? "var(--accent-cyan)" : "var(--text-secondary)" });
  const onToolKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const shortcutIndex = TOOLS.findIndex((candidate) => candidate.shortcut.toLowerCase() === event.key.toLowerCase());
    if (shortcutIndex >= 0) {
      event.preventDefault();
      selectTool(TOOLS[shortcutIndex].id, shortcutIndex);
      toolButtonRefs.current[shortcutIndex]?.focus();
      return;
    }
    const moveKey = toolbarHorizontal
      ? event.key === "ArrowLeft" ? "ArrowUp" : event.key === "ArrowRight" ? "ArrowDown" : event.key
      : event.key;
    const next = microChartToolbarMove(index, moveKey, TOOLS.length);
    if (next == null) return;
    event.preventDefault();
    setToolFocusIndex(next);
    toolButtonRefs.current[next]?.focus();
  };

  return (
    <div className="mfe-market-chart microchart-tv" style={{ display: "flex", flex: 1, minWidth: 0, minHeight: 0, border: "1px solid var(--border-panel)", borderRadius: 6, overflow: "hidden", background: "var(--chart-canvas)" }}>
      {/* left tool rail */}
      <div className="microchart-tool-rail" role="toolbar" aria-label="Chart drawing and annotation tools" aria-orientation={toolbarHorizontal ? "horizontal" : "vertical"} aria-describedby={chartHelpId} style={{ width: 40, flexShrink: 0, borderRight: "1px solid var(--border-subtle)", background: "var(--bg-panel)", display: "flex", flexDirection: toolbarHorizontal ? "row" : "column", alignItems: "center", padding: "6px 0", gap: 2, overflowY: toolbarHorizontal ? "hidden" : "auto" }}>
        {TOOLS.map((t, index) => <button key={t.id} ref={(node) => { toolButtonRefs.current[index] = node; }} type="button" title={`${t.t} (${t.shortcut})`} aria-label={t.t} aria-keyshortcuts={t.shortcut} aria-pressed={tool === t.id} tabIndex={index === toolFocusIndex ? 0 : -1} onFocus={() => setToolFocusIndex(index)} onKeyDown={(event) => onToolKeyDown(event, index)} onClick={() => selectTool(t.id, index)} style={tbtn(tool === t.id)}><Ico n={t.id} /></button>)}
        <div style={{ width: 22, height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />
        <button type="button" title="Magnet (snap to OHLC)" aria-label="Magnet (snap to OHLC)" aria-pressed={magnet} onClick={() => setMagnet((m) => !m)} style={tbtn(magnet)}><Ico n="magnet" /></button>
        <button type="button" title="Lock drawings" aria-label="Lock drawings" aria-pressed={lock} onClick={() => setLock((l) => !l)} style={tbtn(lock)}><Ico n="lock" /></button>
        <button type="button" title={hideDraws ? "Show drawings" : "Hide drawings"} aria-label={hideDraws ? "Show drawings" : "Hide drawings"} aria-pressed={hideDraws} onClick={toggleDrawingsVisibility} style={tbtn(hideDraws)}><Ico n="eye" /></button>
        <button type="button" title="Undo drawing (Ctrl+Z)" aria-label="Undo drawing" aria-keyshortcuts="Control+Z" disabled={lock || undoStack.length === 0} onClick={undoDrawing} style={{ ...tbtn(false), color: lock || undoStack.length === 0 ? "#3a4d61" : "var(--text-secondary)", cursor: lock || undoStack.length === 0 ? "not-allowed" : "pointer" }}><Ico n="undo" /></button>
        <button type="button" title="Redo drawing (Ctrl+Shift+Z)" aria-label="Redo drawing" aria-keyshortcuts="Control+Shift+Z" disabled={lock || redoStack.length === 0} onClick={redoDrawing} style={{ ...tbtn(false), color: lock || redoStack.length === 0 ? "#3a4d61" : "var(--text-secondary)", cursor: lock || redoStack.length === 0 ? "not-allowed" : "pointer" }}><Ico n="redo" /></button>
        <div className="microchart-tool-spacer" style={{ flex: 1, minHeight: 6 }} />
        <button type="button" title="Clear drawings" aria-label="Clear drawings" disabled={lock} onClick={clearDrawings} style={{ ...tbtn(false), color: lock ? "#3a4d61" : "#ff8c8c", cursor: lock ? "not-allowed" : "pointer" }}><Ico n="trash" /></button>
      </div>

      {/* chart + bottom bar */}
      <div className="microchart-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {researchStatus && <div className="micro-research-status" role="status" aria-live="polite" aria-label={locale === "vi" ? `Trạng thái nghiên cứu dự báo: ${researchStatus}` : `Forecast research status: ${researchStatus}`} aria-atomic="true">{researchStatusLabel} · {researchStatus}</div>}
        {researchProvenance && <div className="micro-research-provenance" role="status" aria-live="polite" aria-label={locale === "vi" ? `Nguồn dữ liệu nến đóng: ${researchProvenance}` : `Closed-bar provenance: ${researchProvenance}`} aria-atomic="true">{researchProvenanceLabel} · {researchProvenance}</div>}
        {researchPattern && <div className="micro-pattern-status" role="status" aria-live="polite" aria-label={`Current closed-bar pattern: ${researchPattern}; SHADOW_ONLY; NO_DECISION; no order authority`} aria-atomic="true">
          <span className="micro-pattern-status-label">{locale === "vi" ? "Mô hình hiện tại" : "Current pattern"}</span>
          {researchPatternSignals.length > 0
            ? <span className="micro-pattern-status-chips">{researchPatternSignals.map((signal) => { const label = researchPatternLabel?.(signal) || signal.label; const authority = "SHADOW_ONLY; NO_DECISION; no order authority"; const inspect = locale === "vi" ? "Kiểm tra mô hình hiện tại" : "Inspect current pattern"; const at = locale === "vi" ? "tại" : "at"; return <button key={`${signal.conceptId || signal.label}:${signal.time}`} type="button" className="micro-pattern-status-button" aria-label={`${inspect} ${label} ${at} ${shortTime(signal.time)}; ${authority}`} title={`${label} · ${shortTime(signal.time)} · ${authority}`} onClick={() => onSignalSelect?.(signal)}>{label}</button>; })}</span>
            : <span className="micro-pattern-status-copy">{researchPattern}</span>}
          {researchPatternSignals.length > 0 && <details className="micro-pattern-status-explanation"><summary>{locale === "vi" ? "Vì sao / PDF" : "Why / PDF"}</summary><span className="micro-pattern-status-detail">{researchPattern}</span></details>}
          <span className="micro-pattern-status-authority">SHADOW_ONLY · NO_DECISION · no order authority</span>
        </div>}
        {live && (() => {
          const feedStatus = tickFeed.status === "live"
            ? (locale === "vi" ? decodeURIComponent("Tick%20%C4%91ang%20ho%E1%BA%A1t%20%C4%91%E1%BB%99ng") : "Live ticks")
            : tickFeed.status === "stale"
              ? (locale === "vi" ? decodeURIComponent("%C4%90ang%20ch%E1%BB%9D%20tick") : "Waiting for tick")
              : tickFeed.status === "paused"
                ? (locale === "vi" ? decodeURIComponent("Tick%20%C4%91%C3%A3%20t%E1%BA%A1m%20d%E1%BB%ABng") : "Ticks paused")
                : tickFeed.status === "reconnecting"
                  ? (locale === "vi" ? decodeURIComponent("Tick%20%C4%91ang%20k%E1%BA%BFt%20n%E1%BB%91i%20l%E1%BA%A1i") : "Reconnecting ticks")
                  : (locale === "vi" ? decodeURIComponent("%C4%90ang%20k%E1%BA%BFt%20n%E1%BB%91i%20ngu%E1%BB%93n%20d%E1%BB%AF%20li%E1%BB%87u") : "Connecting feed");
          const quoteUnavailable = locale === "vi" ? decodeURIComponent("Ch%C6%B0a%20c%C3%B3%20b%C3%A1o%20gi%C3%A1") : "Quote unavailable";
          const formingLabel = locale === "vi" ? decodeURIComponent("n%E1%BA%BFn%20%C4%91ang%20h%C3%ACnh%20th%C3%A0nh") : "forming candle";
          const closedWait = locale === "vi" ? decodeURIComponent("%C4%90%C3%A1nh%20d%E1%BA%A5u%20v%C3%A0%20th%E1%BB%91ng%20k%C3%AA%20n%E1%BA%BFn%20%C4%91%C3%B3ng%20ch%E1%BB%9D%20n%E1%BA%BFn%20M5%20%C4%91%C3%B3ng") : "closed markers and statistics wait for the M5 close";
          const liveFeedLabel = locale === "vi" ? decodeURIComponent("Ngu%E1%BB%93n%20tick%20tr%E1%BB%B1c%20ti%E1%BA%BFp") : "Live tick feed";
          return <div className="micro-live-quote" aria-label={liveFeedLabel} data-ticks={tickFeed.received} data-tick-time={quote?.time_msc} data-bid={quote?.bid} data-ask={quote?.ask} style={{ minHeight: 28, display: "flex", gap: 14, alignItems: "center", padding: "4px 8px", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)", font: "12px " + MONO, fontVariantNumeric: "tabular-nums", flexWrap: "wrap" }}><span style={{ color: tickFeed.status === "live" ? "var(--bull-green)" : "var(--warn-amber)", fontWeight: 700 }}>{feedStatus}</span><span>BID <b>{quote ? quote.bid.toLocaleString("en-US", { maximumFractionDigits: 5 }) : quoteUnavailable}</b></span><span>ASK <b>{quote ? quote.ask.toLocaleString("en-US", { maximumFractionDigits: 5 }) : quoteUnavailable}</b></span><span>{frame ? `${frame.broker_symbol} / ${formingLabel}` : ""}</span><span role="status" aria-live="polite" aria-atomic="true" data-live-detection={liveDetection.state} aria-label={`${liveDetection.label}; ${liveDetection.reason}; ${liveDetection.authority}`} style={{ color: liveDetection.state === "PROVISIONAL" ? "var(--warn-amber)" : "var(--text-secondary)", fontWeight: 700 }}>{liveDetection.label}</span><small style={{ flexBasis: "100%", color: "var(--text-secondary)" }}>{liveDetection.timestamp ? `${liveDetection.timestamp} UTC / ${liveDetection.reason}` : liveDetection.reason} / {closedWait} / {liveDetection.authority}</small></div>;
        })()}
        {W < 480 && <div className="microchart-price-legend" aria-label="Candle and EMA values">
          <div className="microchart-price-legend-heading"><strong>{symbol} · {tf}</strong><time dateTime={lb.t}>{shortTime(lb.t)} UTC</time></div>
          <div className="microchart-price-legend-values">{[["O", lb.o], ["H", lb.h], ["L", lb.l], ["C", lb.c]].map(([label, value]) => <span key={label}><span>{label}</span><b>{fp(value as number)}</b></span>)}</div>
          <div className="microchart-price-legend-ema"><span>EMA10 <b>{fp(legendEmaF ?? 0)}</b></span><span>EMA34 <b>{fp(legendEmaS ?? 0)}</b></span></div>
        </div>}
        <div className="mfe-chart-plot" ref={setWrap} style={{ flex: 1, minHeight: 0, display: "flex", position: "relative", background: "var(--chart-canvas)" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="microchart-canvas" role="group" aria-roledescription="interactive research chart" tabIndex={0} aria-label={chartDescription} aria-describedby={chartHelpId} aria-keyshortcuts="Escape Home End PageUp PageDown ArrowLeft ArrowRight ArrowUp ArrowDown + - C T H F R B X M" style={{ display: "block", background: "var(--chart-canvas)", cursor: tool === "cursor" ? (drag.current ? "grabbing" : "crosshair") : "cell", touchAction: "none" }}
            onKeyDown={onChartKeyDown} onDoubleClick={onChartDoubleClick} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onPointerCancel} onPointerLeave={() => setHover(null)}>
            <title>{chartDescription}</title>
            <desc>Closed-bar candlesticks with EMA, VWAP, session bands, research zones, and optional shadow trade annotations.</desc>
            {/* Dedicated price-scale gutter keeps the axis legible without
                introducing another outer context panel. */}
            <rect x={PX1} y={PY0} width={MR} height={PH} fill="var(--chart-axis-bg)" pointerEvents="none" />
            <line x1={PX1} y1={PY0} x2={PX1} y2={PY1} stroke="var(--chart-axis-border)" pointerEvents="none" />
            {blocks.map((b, k) => <g key={`s${k}`}><rect x={Math.max(PX0, b.x0)} y={PY0} width={Math.max(0, Math.min(PX1, b.x1) - Math.max(PX0, b.x0))} height={PH} fill={b.c} opacity="0.045" />{b.x1 - b.x0 > 40 && <text x={(Math.max(PX0, b.x0) + Math.min(PX1, b.x1)) / 2} y={PY0 + 10} fill={b.c} fontSize="9" textAnchor="middle" opacity="0.55" fontWeight="700">{b.k}</text>}</g>)}
            {gy.map((p, k) => <g key={`gy${k}`}><line x1={PX0} y1={yFor(p)} x2={PX1} y2={yFor(p)} className="mfe-chart-grid" stroke="var(--chart-grid)" /><text x={W - 5} y={yFor(p) + 3} fill="var(--text-secondary)" fontSize="10" textAnchor="end" fontFamily={MONO}>{fp(p)}</text></g>)}
            {gx.map((i) => <g key={`gx${i}`}><line x1={xFor(i)} y1={PY0} x2={xFor(i)} y2={PY1} className="mfe-chart-grid" stroke="var(--chart-grid)" /><text className="microchart-time-tick" x={xFor(i)} y={PY1 + 14} fill="var(--text-secondary)" fontSize="9.5" textAnchor="middle" fontFamily={MONO}>{shortTime(bars[i].t)}</text></g>)}
            {zones.map((z, k) => {
              const yT = Math.max(PY0, Math.min(PY1, yFor(z.hi))), yB = Math.max(PY0, Math.min(PY1, yFor(z.lo)));
              const left = zoneLayout === "wide" ? PX0 : xAnchor;
              if (z.hi === z.lo) return <line key={`z${k}`} x1={left} x2={PX1} y1={yT} y2={yT} stroke={zonePaint(z)} strokeDasharray="5 3" />;
              if (yB - yT < 0.5) return null;
              return <g key={`z${k}`}><rect x={left} y={yT} width={PX1 - left} height={yB - yT} fill={zonePaint(z)} opacity="0.13" stroke={zonePaint(z)} strokeOpacity="0.55" strokeDasharray="4 3" />{zoneLayout !== "wide" && z.showLabel !== false && <>{z.glyph && <ChartGlyph name={z.glyph} gx={xAnchor + 6} gy={zoneLabelY[k] - 9} gs={11} color={zonePaint(z)} />}<text x={xAnchor + 6 + (z.glyph ? 14 : 0)} y={zoneLabelY[k]} fill={zonePaint(z)} fontSize="9.5" fontWeight="800">{z.label}</text></>}</g>;
            })}
            {visiblePosition && <HistoricalPositionOverlay position={visiblePosition} layer="areas" xFor={xFor} yFor={yFor} left={PX0} right={PX1} top={PY0} bottom={PY1} />}
            {/* Candle geometry is intentionally decorative to assistive
                technology. The chart summary, endpoint and annotations carry
                the readable closed-bar evidence without exposing every SVG
                wick/body as an unlabeled navigation stop. */}
            <g transform={`translate(${panOffset},0)`} aria-hidden="true">
              <CandleSeries bars={bars} start={start} end={end} cursor={cursor} formingIndex={formingVisible ? bars.length - 1 : -1} left={PX0} top={PY0} height={PH} slot={slot} bodyWidth={bw} lo={lo} span={span} />
            </g>
            {/* CH Episode Lens (observer) — coloured leg ribbon just below the price plot: IMPULSE/CORRECTIVE/SWEEP/FAILED + forming (dashed) */}
            {(episodes.length > 0 || formingEpisode) && (() => {
              const yR = PY1 + 3, hR = 5, clampX = (x: number) => Math.max(PX0, Math.min(PX1, x));
              const seg = (b: EpisodeBand, key: string, forming: boolean) => {
                if (b.i1 < start || b.i0 > end) return null;                        // outside the zoom window
                const x0 = clampX(xFor(b.i0) - slot / 2), x1 = clampX(xFor(b.i1) + slot / 2);
                if (x1 - x0 < 0.6) return null;
                const c = EPISODE_COLOR[b.kind] || "#6e7681";
                return <rect key={key} x={x0} y={yR} width={x1 - x0} height={hR} rx={1.5} fill={c} opacity={forming ? 0.3 : 0.78} stroke={forming ? c : "none"} strokeWidth={forming ? 0.8 : 0} strokeDasharray={forming ? "3 2" : undefined}><title>{`${b.kind}${forming ? "· forming" : ""} · ${b.dir > 0 ? "?" : b.dir < 0 ? "?" : "?"}`}</title></rect>;
              };
              return <g>
                <text x={2} y={yR + 4.5} fill="var(--text-secondary)" fontSize="9" fontFamily={MONO}>ep</text>
                {episodes.map((b, k) => seg(b, "ep" + k, false))}
                {formingEpisode && seg(formingEpisode, "epF", true)}
              </g>;
            })()}
            {/* strategy trade markers — entry tagged BUY/SELL + timeframe; exit = TP/SL dot. Labels when zoomed in. */}
            {visibleReplayMarkers.filter((marker) => marker.price >= lo && marker.price <= hi).map((m, k) => {
              const x = xFor(m.i), y = yFor(m.price), lab = nView < 360;
              const onMk = tradeHover === m.i;   // hover the entry triangle ? same "why" popup (entry bar = trade.entryI)
              const mkHover = (m.kind === "buy" || m.kind === "sell") ? { style: { cursor: "help" as const }, onMouseEnter: () => setTradeHover(m.i), onMouseLeave: () => setTradeHover((h) => (h === m.i ? null : h)) } : {};
              if (m.kind === "buy") return (
                <g key={`mk${k}`} {...mkHover}>
                  <circle cx={x} cy={y + 8} r="12" fill="transparent" />
                  <path d={`M ${x} ${y + 12} l -5 -8 l 10 0 z`} fill="var(--bull-green)" stroke={onMk ? "#fff" : "var(--chart-canvas)"} strokeWidth={onMk ? 1.1 : 0.5} />
                  {lab && <g transform={`translate(${x},${y + 26})`}><rect x="-22" y="-7.5" width="44" height="14" rx="3" fill="#0c1f16" stroke="var(--bull-green)" strokeWidth="0.8" /><text x="0" y="2.6" fill="var(--bull-green)" fontSize="9" fontWeight="800" textAnchor="middle">–² BUY {tf}</text></g>}
                </g>
              );
              if (m.kind === "sell") return (
                <g key={`mk${k}`} {...mkHover}>
                  <circle cx={x} cy={y - 8} r="12" fill="transparent" />
                  <path d={`M ${x} ${y - 12} l -5 8 l 10 0 z`} fill="var(--bear-red)" stroke={onMk ? "#fff" : "var(--chart-canvas)"} strokeWidth={onMk ? 1.1 : 0.5} />
                  {lab && <g transform={`translate(${x},${y - 26})`}><rect x="-22" y="-7.5" width="44" height="14" rx="3" fill="#1f0c0d" stroke="var(--bear-red)" strokeWidth="0.8" /><text x="0" y="2.6" fill="var(--bear-red)" fontSize="9" fontWeight="800" textAnchor="middle">–¼ SELL {tf}</text></g>}
                </g>
              );
              const col = m.kind === "tp" ? "var(--bull-green)" : "var(--bear-red)";
              return <g key={`mk${k}`}><circle cx={x} cy={y} r="2.6" fill={col} stroke="var(--chart-canvas)" strokeWidth="0.8" />{lab && <text x={x + 5} y={y + 3} fill={col} fontSize="9" fontWeight="700" fontFamily={MONO}>{m.kind.toUpperCase()}</text>}</g>;
            })}
            {visibleBrokerMarks.map((m,k) => { const x=xFor(m.i),y=yFor(m.price),offset=(k%3)*16;return <g key={`broker-${m.id}`} role="img" aria-label={`${m.label} ${m.detail}`}><title>{m.detail}</title><path d={`M ${x} ${y-5} l 5 5 l -5 5 l -5 -5 z`} fill={m.color} stroke="#fff" strokeWidth="1"/><line x1={x} y1={y} x2={x+12} y2={y-18-offset} stroke={m.color}/><text x={x+14} y={y-18-offset} fill={m.color} stroke="var(--chart-canvas)" strokeWidth="3" paintOrder="stroke" fontSize="10" fontWeight="800">{m.label} {fp(m.price)}</text></g>; })}
            {/* DECLARED projection zones — the up/down band the system states it expects, over the pending window */}
            {visibleProjectionSignals.map((s, k) => {
              const pr = s.projection!;
              const x1 = xFor(s.i), x2 = xFor(s.i + pr.bars), yT = yFor(pr.hi), yB = yFor(pr.lo);
              const col = pr.dir === "up" ? "var(--bull-green)" : "var(--bear-red)";
              return (
                <g key={`proj${k}`}>
                  <rect x={x1} y={Math.min(yT, yB)} width={Math.max(2, x2 - x1)} height={Math.abs(yB - yT)} fill={col} opacity={s.outcome === "pending" ? 0.16 : 0.09} stroke={col} strokeOpacity="0.55" strokeDasharray="4 3" />
                  <line x1={x1} y1={yFor(pr.target)} x2={x2} y2={yFor(pr.target)} stroke={col} strokeWidth="1" strokeDasharray="2 2" opacity="0.75" />
                  {nView < 380 && <text x={x1 + 3} y={Math.min(yT, yB) - 2.5} fill={col} fontSize="9" fontWeight="700">{pr.dir === "up" ? "Upward observation" : "Downward observation"}</text>}
                </g>
              );
            })}
            {/* candle-pattern signals ? hover any to see the system's DECLARATION (what it measures + odds + outcome) */}
            {visibleSignals.map((s, k) => {
              const annotationIndex = k;
              // Several deterministic concepts can land on the same closed
              // candle. Keep their keyboard order intact, but fan the marker
              // hit targets apart so pointer users can see and select each
              // observation instead of one glyph hiding the others.
              const { sameIndexCount, overlapOrdinal } = visibleSignalOverlap[k] || { sameIndexCount: 1, overlapOrdinal: 0 };
              const overlapOffset = sameIndexCount > 1 ? (overlapOrdinal - (sameIndexCount + 1) / 2) * 16 : 0;
              const x = Math.max(PX0, Math.min(PX1, xFor(s.i) + overlapOffset)), yb = yFor(s.price), low = s.side === "low", y = low ? yb + 11 : yb - 11;
              const oc = s.annotationKind === "named_candle" ? "var(--accent-cyan)" : s.outcome === "correct" ? "var(--bull-green)" : s.outcome === "wrong" ? "var(--bear-red)" : "var(--warn-amber)";
              const tri = low ? `M ${x} ${y - 5} l -4.5 7 l 9 0 z` : `M ${x} ${y + 5} l -4.5 -7 l 9 0 z`;
              const hoverKey = signalHoverKey(s), on = sigHover === hoverKey;
              const labelText = s.annotationKind === "named_candle" ? "CANDLE · OBS" : s.reads === "bullish" ? "LONG · OBS" : s.reads === "bearish" ? "SHORT · OBS" : "PATTERN · OBS";
              // Captions are useful when candles have room, but become an
              // unreadable wall of overlapping text in a narrow/zoomed-out
              // viewport. The marker remains visible and fully keyboard/
              // screen-reader accessible through its aria-label and popup.
              const labelLayout = nView < 500 && slot >= 10
                ? microChartSignalLabelLayout(x, PX0, PX1, labelText.length * 5)
                : null;
              const nearbyCaption = nearbySignalCaptions[k];
              const showLabel = labelLayout && (!nearbyCaption || on || annotationIndex === activeAnnotationIndex);
              const labelY = Math.max(PY0 + 9, Math.min(PY1 - 2, low ? y + 13 : y - 10));
              const overlapLabel = sameIndexCount > 1 ? `; overlapping marker ${overlapOrdinal} of ${sameIndexCount}` : "";
              return (
                <g key={`sig${k}`} ref={(node) => { annotationRefs.current[annotationIndex] = node; }} className="microchart-signal" role="button" aria-haspopup="dialog" tabIndex={annotationIndex === activeAnnotationIndex ? 0 : -1} aria-setsize={annotationCount} aria-posinset={annotationIndex + 1} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End" aria-label={`${s.annotationKind === "named_candle" ? "Named candle pattern" : "Shadow research annotation"} ${s.label} at ${shortTime(s.time)}${overlapLabel}; measured shape ${s.reads === "bullish" ? "UP" : s.reads === "bearish" ? "DOWN" : "NEUTRAL"}; ${s.nextBarOutcome ? `next closed bar ${s.nextBarOutcome}` : s.outcome === "pending" ? "outcome pending" : `outcome ${s.outcome}`}; no decision or order authority`} style={{ cursor: "help" }} onClick={() => selectSignal(s, annotationIndex)} onKeyDown={(event) => onSignalKeyDown(event, annotationIndex, s)} onMouseEnter={() => setSigHover(hoverKey)} onMouseLeave={() => setSigHover((h) => (h === hoverKey ? null : h))} onFocus={() => setSigHover(hoverKey)} onFocusCapture={() => { setAnnotationFocusIndex(annotationIndex); setChartKeyStatus(annotationStatus(annotationIndex)); }} onBlur={() => setSigHover((h) => (h === hoverKey ? null : h))}>
                  <line x1={x} y1={yb} x2={x} y2={y} stroke={oc} strokeWidth="1" opacity="0.45" />
                  <circle cx={x} cy={y} r="9" fill="transparent" />
                  {(s.context_assessment === "WEAK" || s.context_assessment === "STRONG") && <circle cx={x} cy={y} r="6.5" fill="none" stroke={s.context_assessment === "STRONG" ? "var(--bull-green)" : "var(--warn-amber)"} strokeWidth="1.2" strokeDasharray="2 1.5" opacity="0.95" />}
                  <path d={tri} fill={oc} stroke={on ? "#fff" : "var(--chart-canvas)"} strokeWidth={on ? 1.1 : 0.6} opacity={on ? 1 : 0.9} />
                  {showLabel && labelLayout && <text x={labelLayout.x} y={labelY} textAnchor={labelLayout.anchor} fill={oc} fontSize="9" fontWeight="800">{labelText}</text>}
                </g>
              );
            })}
            {/* strategy / shadow TRADES ? entry dot ? dashed line ? ? CLOSE marker with R, so the exit shows on-chart */}
            {visibleTrades.map((t, k) => {
              const annotationIndex = visibleSignals.length + k;
              const x1 = xFor(t.entryI), y1 = yFor(t.entry), x2 = xFor(t.exitI), y2 = yFor(t.exit), col = t.outcome === "TP" ? "var(--bull-green)" : "var(--bear-red)", lab = nView < 500;
              const onTr = tradeHover === t.entryI;
              return (
                <g key={`tr${k}`} ref={(node) => { annotationRefs.current[annotationIndex] = node; }} className="microchart-trade" role="img" tabIndex={annotationIndex === activeAnnotationIndex ? 0 : -1} aria-setsize={annotationCount} aria-posinset={annotationIndex + 1} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End" aria-label={`Shadow simulated ${t.dir} trade at ${shortTime(t.t || "")}; outcome ${t.outcome}, ${t.R >= 0 ? "+" : ""}${t.R}R; no decision or order authority`} onKeyDown={(event) => onAnnotationKeyDown(event, annotationIndex)} onFocus={() => setTradeHover(t.entryI)} onFocusCapture={() => { setAnnotationFocusIndex(annotationIndex); setChartKeyStatus(annotationStatus(annotationIndex)); }} onBlur={() => setTradeHover((h) => (h === t.entryI ? null : h))}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="1.1" strokeDasharray="3 2" opacity="0.65" />
                  <circle cx={x1} cy={y1} r="10" fill="transparent" style={{ cursor: "help" }} onMouseEnter={() => setTradeHover(t.entryI)} onMouseLeave={() => setTradeHover((h) => (h === t.entryI ? null : h))} />
                  <circle cx={x1} cy={y1} r={onTr ? 3.4 : 2.4} fill={t.dir === "BUY" ? "var(--bull-green)" : "var(--bear-red)"} stroke={onTr ? "#fff" : "var(--chart-canvas)"} strokeWidth={onTr ? 1.2 : 0.6} />
                  <g transform={`translate(${x2},${y2})`}>
                    <line x1="-4.5" y1="-4.5" x2="4.5" y2="4.5" stroke={col} strokeWidth="1.7" />
                    <line x1="-4.5" y1="4.5" x2="4.5" y2="-4.5" stroke={col} strokeWidth="1.7" />
                    {lab && <g transform="translate(0,-12)"><rect x="-24" y="-7" width="48" height="13" rx="3" fill="var(--bg-panel)" stroke={col} strokeWidth="0.8" /><text x="0" y="2.5" fill={col} fontSize="9" fontWeight="800" textAnchor="middle">? {t.outcome} {t.R >= 0 ? "+" : ""}{t.R}R</text></g>}
                  </g>
                </g>
              );
            })}
            {focusAnnotation && focusAnnotation.i >= start && focusAnnotation.i <= end && (() => {
              const x = xFor(focusAnnotation.i), y = yFor(focusAnnotation.price), labelX = Math.min(PX1 - 8, x + 8);
              return <g role="img" aria-label={`${focusAnnotation.label} at ${shortTime(focusAnnotation.time)}; historical context only; no decision or order authority`}>
                <line x1={x} y1={PY0} x2={x} y2={PY1} stroke={focusAnnotation.color || "var(--accent-cyan)"} strokeWidth="1" strokeDasharray="2 3" opacity="0.75" />
                <circle cx={x} cy={y} r="4" fill={focusAnnotation.color || "var(--accent-cyan)"} stroke="var(--chart-canvas)" strokeWidth="1.2" />
                <rect x={labelX - 2} y={Math.max(PY0 + 16, y - 21)} width="112" height="16" rx="3" fill="var(--bg-elevated)" stroke={focusAnnotation.color || "var(--accent-cyan)"} strokeWidth="0.8" />
                <text x={labelX + 54} y={Math.max(PY0 + 27, y - 10)} textAnchor="middle" fill={focusAnnotation.color || "var(--accent-cyan)"} fontSize="9" fontWeight="800">{focusAnnotation.label}</text>
                <title>{focusAnnotation.detail} · historical context only · no decision or order authority</title>
              </g>;
            })()}
            <g transform={`translate(${panOffset},0)`} aria-hidden="true">
              <IndicatorSeries series={displayEmaF} start={start} end={end} barCount={bars.length} tail={formingEmaF} liveValues={liveTail?.emaF} liveStart={liveTail?.start} left={PX0} top={PY0} height={PH} slot={slot} lo={lo} span={span} stroke="var(--accent-cyan)" strokeWidth={1.4} opacity={0.9} />
              <IndicatorSeries series={displayEmaS} start={start} end={end} barCount={bars.length} tail={formingEmaS} liveValues={liveTail?.emaS} liveStart={liveTail?.start} left={PX0} top={PY0} height={PH} slot={slot} lo={lo} span={span} stroke="var(--warn-amber)" strokeWidth={1.4} opacity={0.9} />
              <IndicatorSeries series={displayVwap} start={start} end={end} barCount={bars.length} tail={formingVwap} liveValues={liveTail?.vwap} liveStart={liveTail?.start} left={PX0} top={PY0} height={PH} slot={slot} lo={lo} span={span} stroke="var(--accent-cyan)" strokeWidth={1.1} opacity={0.7} strokeDasharray="5 4" />
            </g>
            {visiblePivots.map((pv, k) => { const x = xFor(pv.i), y = yFor(pv.price) + (pv.dir === "high" ? -8 : 8), s = 3; const col = pv.dir === "high" ? "var(--zone-purple)" : "var(--bull-green)"; return <path key={`pv${k}`} d={`M ${x} ${y - s} L ${x + s} ${y} L ${x} ${y + s} L ${x - s} ${y} Z`} fill={col} opacity="0.85" />; })}
            <text x={PX0 + 5} y={PY1 - 5} fill="var(--accent-cyan)" fontSize="9.5" fontWeight="700" fontFamily={MONO}>VWAP · {fp(seriesValue(displayVwap, end, formingVwap, liveTail?.vwap) ?? 0)}</text>
            {lines.map((l, k) => { if (l.price < lo || l.price > hi) return null; const y = yFor(l.price); const gs = 11, tw = l.label.length * 5.6; return <g key={`l${k}`} role="img" aria-label={`${l.label} at ${fp(l.price)}; research landmark only; SHADOW_ONLY; NO_DECISION`}><line x1={xAnchor} y1={y} x2={PX1} y2={y} stroke={l.color} strokeWidth="1.2" strokeDasharray={l.dash ? "5 3" : undefined} opacity="0.9" />{l.glyph && <ChartGlyph name={l.glyph} gx={PX1 - 5 - tw - gs - 2} gy={y - 12} gs={gs} color={l.color} />}<text x={PX1 - 5} y={y - 3} fill={l.color} fontSize="10" fontWeight="700" textAnchor="end">{l.label}</text></g>; })}
            {/* The visible endpoint may be historical, closed, or live forming. */}
            {visiblePosition && <HistoricalPositionOverlay position={visiblePosition} xFor={xFor} yFor={yFor} left={PX0} right={PX1} top={PY0} bottom={PY1} />}
            <g role="img" data-chart-endpoint={endpointLabel} aria-label={`${endpointLabel}: visible endpoint ${last.t} UTC; ${formingInViewport ? "forming context" : "closed candle"}`}>
            <line x1={xNow} y1={PY0} x2={xNow} y2={PY1} stroke="var(--text-primary)" strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
            <circle cx={xNow} cy={ly} r="3.5" fill={upBar ? "var(--tv-up-strong)" : "var(--tv-down-strong)"} stroke="var(--chart-canvas)" strokeWidth="1.5" />
            <rect x={xNow - 15} y={PY0 + 1} width="30" height="13" rx="3" fill="var(--bg-elevated)" stroke="var(--border-panel)" />
            <text x={xNow} y={PY0 + 10.5} fill="var(--text-primary)" fontSize="9" textAnchor="middle" fontWeight="700">{endpointLabel}</text>
            </g>
            {/* current-price dotted line + label box (TradingView style) */}
            <line x1={PX0} y1={ly} x2={PX1} y2={ly} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="1 3" opacity="0.65" />
            <rect x={PX1} y={ly - 9} width={MR} height={18} fill={upBar ? "var(--tv-up-strong)" : "var(--tv-down-strong)"} stroke={upBar ? "var(--tv-up-strong)" : "var(--tv-down-strong)"} />
            <text x={PX1 + MR / 2} y={ly + 4} fill="#050505" fontSize="10.5" fontWeight="700" textAnchor="middle" fontFamily={MONO}>{fp(lp)}</text>
            {/* Wide current-context bands: full labels and price ranges, separated without moving prices. */}
            {zoneLayout === "wide" && zones.map((z, k) => {
              if (z.showLabel === false) return null;
              const prices = `${fp(z.lo)}${z.hi !== z.lo ? "–" + fp(z.hi) : ""}`;
              const text = `${z.label} · ${prices}`;
              const labelY = zoneLabelY[k], actualY = Math.max(PY0, Math.min(PY1, yFor((z.lo + z.hi) / 2)));
              return <g key={`wide-label-${k}`}><path d={`M${PX0 + 2},${actualY} L${PX0 + 7},${labelY - 4} L${PX0 + 12},${labelY - 4}`} stroke={zonePaint(z)} fill="none" /><rect x={PX0 + 12} y={labelY - (compactZoneLabels ? 24 : 13)} width={Math.min(PX1 - PX0 - 14, (compactZoneLabels ? Math.max(z.label.length, prices.length) : text.length) * 5.8 + 14)} height={compactZoneLabels ? 29 : 17} rx={2} fill="var(--bg-panel)" fillOpacity="0.94" /><text x={PX0 + 17} y={labelY - (compactZoneLabels ? 13 : 1)} fill={zonePaint(z)} fontSize="9.5" fontWeight="600" fontFamily={MONO}>{compactZoneLabels ? <><tspan>{z.label}</tspan><tspan x={PX0 + 17} dy={12}>{prices}</tspan></> : text}</text></g>;
            })}
            {/* The compact chart retains price-axis boundary tags. */}
            {zoneLayout !== "wide" && zones.flatMap((z) => [z.hi, z.lo]).filter((p) => p >= lo && p <= hi && Math.abs(yFor(p) - ly) > 11).map((p, k) => <g key={`zt${k}`}><rect x={PX1} y={yFor(p) - 8} width={MR} height={16} fill="var(--bg-panel)" stroke="var(--border-panel)" /><text x={PX1 + MR / 2} y={yFor(p) + 3} fill="var(--text-secondary)" fontSize="9.5" textAnchor="middle" fontFamily={MONO}>{fp(p)}</text></g>)}
            {/* OHLC + EMA legend overlay */}
            {W >= 480 && <g className="microchart-price-legend-overlay" pointerEvents="none">
            <text x={PX0 + 5} y={PY0 + 13} fill="var(--text-primary)" fontSize="12" fontWeight="800">{symbol} · {tf}{hover ? <tspan fill="var(--text-secondary)" fontSize="9" fontWeight="400" fontFamily={MONO}>  {shortTime(lb.t)}</tspan> : null}</text>
            <text x={PX0 + 5} y={PY0 + 28} fontSize="10" fontFamily={MONO}><tspan fill="var(--text-secondary)">O </tspan><tspan fill={lbUp ? "var(--bull-green)" : "var(--bear-red)"}>{fp(lb.o)}</tspan><tspan fill="var(--text-secondary)">  H </tspan><tspan fill={lbUp ? "var(--bull-green)" : "var(--bear-red)"}>{fp(lb.h)}</tspan><tspan fill="var(--text-secondary)">  L </tspan><tspan fill={lbUp ? "var(--bull-green)" : "var(--bear-red)"}>{fp(lb.l)}</tspan><tspan fill="var(--text-secondary)">  C </tspan><tspan fill={lbUp ? "var(--bull-green)" : "var(--bear-red)"}>{fp(lb.c)}</tspan><tspan fill={lchg >= 0 ? "var(--bull-green)" : "var(--bear-red)"} fontWeight="700">  {lchg >= 0 ? "+" : ""}{lchg.toFixed(2)} ({lchg >= 0 ? "+" : ""}{lchgPct.toFixed(2)}%)</tspan></text>
            <text x={PX0 + 5} y={PY0 + 42} fontSize="10" fontFamily={MONO}><tspan fill="var(--accent-cyan)" fontWeight="700">EMA 10 </tspan><tspan fill="#a9d8f0">{fp(legendEmaF ?? 0)}</tspan><tspan fill="var(--warn-amber)" fontWeight="700">   EMA 34 </tspan><tspan fill="#e7d59a">{fp(legendEmaS ?? 0)}</tspan></text>
            </g>}
            {/* drawings */}
            {!hideDraws && draws.map((d, k) => <g key={k} className={`microchart-drawing${selectedDrawingIndex === k ? " microchart-drawing-selected" : ""}`} data-drawing-index={k} data-drawing-kind={d.kind} role={selectedDrawingIndex === k ? "img" : undefined} aria-hidden={selectedDrawingIndex === k ? undefined : true} aria-label={selectedDrawingIndex === k ? `Selected ${d.kind} drawing ${k + 1} of ${draws.length}; drag the body or handles to edit; Delete removes; Escape deselects; SHADOW_ONLY; NO_DECISION.` : undefined} pointerEvents="none">{drawEl(selectedDrawingIndex === k && drawingPreview ? drawingPreview : d, k)}</g>)}
            {!hideDraws && !lock && tool === "cursor" && selectedDrawingIndex !== null && draws[selectedDrawingIndex] && (() => {
              const selected = drawingPreview || draws[selectedDrawingIndex];
              const handles = selected.kind === "brush" || selected.kind === "text" || selected.kind === "hline" ? [selected.a] : [selected.a, selected.b];
              return <g className="microchart-drawing-handles" role="img" aria-label={`Selected ${selected.kind} drawing handles; drag to edit; Delete removes; Escape deselects; SHADOW_ONLY; NO_DECISION.`} pointerEvents="none">{handles.map((point, index) => <circle key={index} data-drawing-handle={index} cx={selected.kind === "hline" ? Math.max(PX0 + 10, Math.min(PX1 - 10, xFor(point.i))) : xFor(point.i)} cy={yFor(point.p)} r="5" />)}</g>;
            })()}
            {!hideDraws && temp && drawEl(temp, -1, true)}
            {/* crosshair + axis boxes */}
            {hover && (
              <g className="microchart-crosshair" pointerEvents="none">
                <rect x={xFor(barAt(hover.x)) - slot / 2} y={PY0} width={slot} height={PH} fill="var(--accent-cyan)" opacity="0.05" />
                <line x1={hover.x} y1={PY0} x2={hover.x} y2={PY1} stroke="#3a4d61" strokeDasharray="2 3" />
                <line x1={PX0} y1={hover.y} x2={PX1} y2={hover.y} stroke="#3a4d61" strokeDasharray="2 3" />
                <rect x={PX1} y={hover.y - 9} width={MR} height={18} fill="var(--bg-elevated)" stroke="var(--border-panel)" /><text x={PX1 + MR / 2} y={hover.y + 4} fill="var(--text-primary)" fontSize="10" textAnchor="middle" fontFamily={MONO}>{fp(priceAt(hover.y))}</text>
                {hb && <><rect x={hover.x - 28} y={PY1} width="56" height="16" fill="var(--bg-elevated)" stroke="var(--border-panel)" /><text x={hover.x} y={PY1 + 12} fill="var(--text-primary)" fontSize="9" textAnchor="middle" fontFamily={MONO}>{hhmm(hb.t)}</text></>}
              </g>
            )}
          </svg>
          {/* candle-signal hover popup — the system DECLARES what it measures + its honest odds + outcome */}
          {(() => {
            if (sigHover == null) return null;
            const s = (signals || []).find((x) => signalHoverKey(x) === sigHover);
            if (!s) return null;
            const x = xFor(s.i), y = yFor(s.price);
            const left = Math.max(6, Math.min(W - 236, x + 12));
            const top = Math.max(6, Math.min(H - 158, s.side === "low" ? y + 14 : y - 156));
            const oc = s.outcome === "correct" ? "var(--bull-green)" : s.outcome === "wrong" ? "var(--bear-red)" : "var(--warn-amber)";
            const isSig = (s.verdict || "").toUpperCase().startsWith("SIGNAL");
            const pc = (v: number | null) => (v == null ? "?" : Math.round(v * 100) + "%");
            return (
              <div className="microchart-hover-card" style={{ position: "absolute", left, top, width: 224, background: "rgba(8,16,24,.97)", border: "1px solid " + oc, borderRadius: 8, padding: "9px 10px", fontSize: 11, color: "var(--text-primary)", boxShadow: "0 6px 20px rgba(0,0,0,.5)", pointerEvents: "none", zIndex: 20, lineHeight: 1.45 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <b style={{ color: oc, fontSize: 12 }}>{s.label}</b>
                  <span style={{ color: "var(--text-secondary)", fontSize: 9.5, fontFamily: MONO }}>{s.time.slice(5, 16)}</span>
                </div>
                <div style={{ color: "var(--text-secondary)", marginBottom: 5 }}>{s.measures}</div>
                {s.wick_threshold_atr != null && <div>Measured wick: <b style={{ color: "#dbe4ee" }}>{s.wick_atr} ATR</b> {s.wick_unusual ? <span style={{ color: oc }}>at or above threshold {s.wick_threshold_atr} unusually long within the reference distribution</span> : <span style={{ color: "var(--text-secondary)" }}>below threshold {s.wick_threshold_atr}</span>}</div>}
                {(s.close_pos != null || s.reads) && <div>Close location: <b>{s.close_pos != null ? Math.round(s.close_pos * 100) + "% of the bar" : "not measured"}</b> · directional shape <b style={{ color: s.reads === "bullish" ? "var(--bull-green)" : s.reads === "bearish" ? "var(--bear-red)" : "var(--text-secondary)" }}>{s.reads === "bullish" ? "UP" : s.reads === "bearish" ? "DOWN" : "NEUTRAL"}</b></div>}
                <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "5px 0 4px", paddingTop: 4 }}>Source assessment: <b style={{ color: isSig ? "var(--bull-green)" : "var(--warn-amber)" }}>{isSig ? "observed association" : "near the null baseline"}</b></div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--text-secondary)" }}>Directional probability ={pc(s.conditional_rate)} versus baseline {pc(s.base_rate)} · lift {s.lift != null ? (s.lift >= 0 ? "+" : "") + (s.lift * 100).toFixed(1) + "%" : "?"} · n={s.sample_n ?? "?"}</div>
                {s.why_factors && s.why_factors.length > 0 && (
                  <div style={{ marginTop: 5, borderTop: "1px solid var(--border-subtle)", paddingTop: 4 }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: 9.5, marginBottom: 2 }}>Measured rationale:</div>
                    {s.why_factors.map((w, j) => <div key={j} style={{ color: "#cdd9e6", fontSize: 10 }}>· {w}</div>)}
                  </div>
                )}
                {s.projection && <div style={{ marginTop: 4, color: s.projection.dir === "up" ? "var(--bull-green)" : "var(--bear-red)", fontSize: 10 }}>Declared model band {s.projection.dir === "up" ? "UP" : "DOWN"}: <b>{s.projection.lo}–{s.projection.hi}</b> (target {s.projection.target} · {s.projection.bars} bars)<br /><span style={{ color: "var(--text-secondary)" }}>calib {s.projection.calibrated ? "calibrated" : "default"} target {s.projection.target_atr}±{s.projection.tol_atr}ATR (n={s.projection.calib_n ?? "?"}) · multi-timeframe volatility multiplier {s.projection.mtf_factor ?? 1} ({(s.projection.tf_ladder || []).join("/")})</span></div>}
                {s.lessons_applied && s.lessons_applied.length > 0 && (
                  <div style={{ marginTop: 5, borderTop: "1px solid var(--border-subtle)", paddingTop: 4 }}>
                    <div style={{ fontSize: 9.5, color: "var(--text-secondary)", marginBottom: 2 }}> Context lesson with held-out validation <b style={{ color: s.context_assessment === "STRONG" ? "var(--bull-green)" : s.context_assessment === "WEAK" ? "var(--bear-red)" : "var(--warn-amber)" }}>{s.context_assessment}</b></div>
                    {s.lessons_applied.map((a, j) => <div key={j} style={{ fontSize: 10, color: a.kind === "strong" ? "var(--bull-green)" : "var(--warn-amber)" }}>{a.kind === "strong" ? "strong" : "weak"}: {a.factor} ? {a.hit_rate != null ? Math.round(a.hit_rate * 100) : "?"}% (OOS {a.oos_hit_rate != null ? Math.round(a.oos_hit_rate * 100) + "%" : "?"}, n={a.n})</div>)}
                  </div>
                )}
                <div style={{ marginTop: 4, color: oc, fontWeight: 700 }}>Next observation: {s.outcome === "correct" ? "matched measured direction" : s.outcome === "wrong" ? "did not match measured direction" : s.outcome === "neutral" ? "setup was neutral; outcome is descriptive only" : "unresolved; monitoring the declared band"}</div>
              </div>
            );
          })()}
          {/* TRADE entry hover — WHY the strategy entered this BUY/SELL (triggers · combination · gates passed · sizing) */}
          {(() => {
            if (tradeHover == null) return null;
            const t = (trades || []).find((x) => x.entryI === tradeHover);
            if (!t) return null;
            const x = xFor(t.entryI), y = yFor(t.entry), col = t.dir === "BUY" ? "var(--bull-green)" : "var(--bear-red)";
            const left = Math.max(6, Math.min(W - 266, x + 14));
            const top = Math.max(6, Math.min(H - 190, y - 70));
            return (
              <div className="microchart-hover-card" style={{ position: "absolute", left, top, width: 254, background: "rgba(8,16,24,.97)", border: "1px solid " + col, borderRadius: 8, padding: "9px 11px", fontSize: 11, color: "var(--text-primary)", boxShadow: "0 6px 22px rgba(0,0,0,.55)", pointerEvents: "none", zIndex: 22, lineHeight: 1.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <b style={{ color: col, fontSize: 12.5 }}>{t.dir === "BUY" ? "–² BUY" : "–¼ SELL"} · {tf}</b>
                  <span style={{ color: "var(--text-secondary)", fontSize: 9.5, fontFamily: MONO }}>{(t.t || "").slice(5, 16)}</span>
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 9.5, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".3px" }}>Why the strategy produced this simulated entry</div>
                {(t.why || []).length ? (t.why || []).map((w, j) => <div key={j} style={{ fontSize: 10.5, color: w.startsWith("?") ? "#7fd99a" : w.startsWith("??") ? "#f0d68a" : w.startsWith("?") ? "#9fd0ff" : "#cdd9e6", marginBottom: 1.5 }}>{w}</div>) : <div style={{ color: "var(--text-secondary)" }}>Default EMA crossover; no Card-specific module recorded.</div>}
                <div style={{ marginTop: 6, borderTop: "1px solid var(--border-subtle)", paddingTop: 4, color: t.outcome === "TP" ? "var(--bull-green)" : "var(--bear-red)", fontWeight: 700 }}>Simulated trade outcome: {t.outcome} · {t.R >= 0 ? "+" : ""}{t.R}R</div>
                <div style={{ marginTop: 2, fontSize: 9, color: "var(--text-secondary)", fontStyle: "italic" }}>Modeled execution using the canonical engine and selected Card filters. Research only.</div>
              </div>
            );
          })()}
        </div>
        {/* bottom bar */}
        <div className="microchart-bottom-bar" style={{ display: "flex", alignItems: "center", gap: 12, padding: "5px 10px", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-panel)", fontSize: 12, color: "var(--text-secondary)", fontFamily: MONO }}>
          <button type="button" aria-label="Reset chart view to recent bars" onClick={reset} style={{ background: "var(--mfe-s3)", border: "1px solid var(--border-panel)", color: "var(--text-secondary)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "4px 10px" }}>↻ Reset</button>
          <span className="microchart-view-readout" aria-label={`Visible bars ${start + 1} through ${end + 1} of ${n}`}>Bars {start + 1}–{end + 1} / {n}</span>
          <span role="status" aria-label={evidenceStatus} style={{ color: "var(--accent-cyan)", fontSize: 14, fontWeight: 700, whiteSpace: "normal", lineHeight: 1.3 }}>{formingInViewport ? "CLOSED BARS · FORMING CONTEXT" : "CLOSED BARS"} · SHADOW_ONLY · NO_DECISION</span>
          {magnet && <span style={{ color: "var(--accent-cyan)" }}> magnet on</span>}
          <span role="img" aria-label="UTC sessions: Asia cyan, Europe green, US purple" style={{ display: "flex", gap: 8, marginLeft: "auto" }}>{[["ASIA", "var(--accent-cyan)"], ["EUROPE", "var(--bull-green)"], ["US", "var(--zone-purple)"]].map(([k, c]) => <span key={k as string} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: c as string, opacity: .7 }} />{k}</span>)}</span>
          <span>{hb ? `${shortTime(hb.t)} · O ${fp(hb.o)} H ${fp(hb.h)} L ${fp(hb.l)} C ${fp(hb.c)}` : "drag = pan · scroll = zoom · pick a tool to draw · diagnostic only"}</span>
        </div>
        <span className="microchart-keyboard-status" role="status" aria-live="polite" aria-atomic="true">{chartKeyStatus}</span>
        <span id={chartHelpId} className="microchart-keyboard-help">Keyboard chart controls: Escape cancels an active drawing or deselects a saved drawing; Cursor selects saved shapes, [ and ] cycle saved drawings, drag their bodies to move or their handles to resize; Delete or Backspace removes the selected drawing; Home jumps to the earliest retained bars at the current zoom and End jumps to the latest bars at the current zoom; Page Up and Page Down move one full viewport earlier or later; double-click with Cursor resets the viewport; Left and Right move through the closed-bar window; Up and Down or plus and minus zoom; Ctrl/Cmd+Z undoes a drawing edit and Ctrl/Cmd+Shift+Z (or Y) redoes one. Undo history is bounded and resets after reload while saved drawings persist. Drawing toolbar: Up and Down move between tools, Home and End jump to the first or last tool, and each tool exposes a letter shortcut. Tab reaches shadow annotations. Research display only; no decision or order authority.</span>
      </div>
    </div>
  );
}
