import { formatPriceActionSourcePages } from "../lib/priceActionSourcePages.ts";
// Microscope — refit to the MD spec (PAGE 02). Deep diagnostic view: big zone chart + session context +
// MTF minis + event timeline. Focused MicroChart is the sole chart renderer. Diagnostic/advisory ONLY | order_send FORBIDDEN.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { setActiveSymbol, getActiveSymbol } from "../lib/activeSymbolStore.ts";
import { useLiveWorkspaceQuery, freshWorkspaceBars } from "../lib/liveWorkspaceQuery.ts";
import { MicroChart, type MicroChartDrawing, type MicroChartFocusAnnotation, type MicroChartViewport, type SignalMarker, type TradeSeg } from "../components/MicroChart.tsx";
import type { CsvImportMetadata } from "../lib/csvImports.ts";

// (legacy gross simulateCard removed — replay now uses the SAME realistic engine of record as the result table)
import type { CChartZone, CChartLine } from "../components/chartPrimitives.tsx";
import type { M1Year } from "../adapters/loadSimOhlc.ts";
import type { TradeAdvice } from "../adapters/loadCotrade.ts";
import { isOffline, isVerifiedClosedBarHistory, isVerifiedClosedBarWindow, liveSymbol, mt5Bars, mt5ThreeYearHistory, type Mt5ThreeYearHistory } from "../lib/mt5DemoAdapter.ts";
import { isTerminalAttached, useTerminalGeneration } from "../lib/mt5Connection.ts";
import { finiteMinMax } from "../lib/finiteMinMax.ts";

import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import { TK, InfoTip } from "../components/ui/Ui.tsx";
import { Glyph } from "../components/ui/Glyph.tsx";
import { sliceForStage, STAGE_LABEL, STAGE_DAYS, STAGE_SOURCE, type Stage } from "../lib/stageWindow.ts";
import { replayLastIndex, compareCardSummary, type CompareCardSummary } from "../lib/microscopeComputed.ts";
import { getCardRuntimeConfig, TF_MINUTES } from "../lib/simTimeframe.ts";
import type { YearAllTf } from "../lib/m1MasterData.ts";
import type { BrokerCalibrationInput } from "../lib/simCalibration.ts";
import { getPriceActionKnowledge, PRICE_ACTION_KNOWLEDGE_PROVENANCE } from "../lib/priceActionKnowledgeLookup.ts";
import { getSourceNotesCopy } from "../lib/sourceNotesLocalization.ts";
import { PRICE_ACTION_SOURCE, PRICE_ACTION_DETECTOR_CONCEPT_COUNT, type PriceActionMarker, type PriceActionConceptEvidence } from "../lib/priceActionDetector.ts";
import { detectAllPdfSignals, type PdfSignalObservation } from "../lib/pdfSignalDetector.ts";
import { usePriceActionAnalysis } from "../lib/usePriceActionAnalysis.ts";
import { validateForecastSupportDenominators, type NamedCandlePattern, type NamedPatternPrediction, type PatternMatch } from "../lib/candlePatternAtlas.ts";
import { useCandleAtlas } from "../lib/useCandleAtlas.ts";
import { FOCUSED_SNAPSHOT_AUTHORITY, FOCUSED_SNAPSHOT_SCHEMA, focusedSnapshotTimestampsEqual, focusedBookmarkSnapshot, parseFocusedSnapshot } from "../lib/focusedSnapshot.ts";
import { closedBarsForFocusedResearch } from "../lib/focusedClosedBars.ts";
import { focusedForecastFreshness } from "../lib/focusedForecastFreshness.ts";
import { focusedCurrentBarReadout } from "../lib/focusedCurrentBarReadout.ts";
import { focusedM5CloseClock } from "../lib/focusedM5CloseClock.ts";
import { resolveFocusedPriceActionDirection } from "../lib/focusedPriceActionGeometry.ts";
import { candleWindowGeometry } from "../lib/candleWindowGeometry.ts";
import { analogueWindowGeometry } from "../lib/analogueWindowGeometry.ts";
import { focusedConnectionBadge } from "../lib/focusedConnectionBadge.ts";
import { ChartPatternInspector } from "../components/ChartPatternInspector.tsx";
import { PdfSignalCoverageShelf } from "../components/PdfSignalCoverageShelf.tsx";
import { HistoricalPdfStatistics } from "../components/PdfSignalStatisticsPanel.tsx";
import { PdfAssumptionsPanel, EMPTY_PDF_ASSUMPTIONS, type PdfAssumptionsValue } from "../components/PdfAssumptionsPanel.tsx";
import { usePdfSignalVerification } from "../lib/usePdfSignalVerification.ts";
import { canonicalPatternReplayBookmarkTime, type PatternReplayBookmark } from "../lib/patternReplayBookmark.ts";
import { patternRoomContext } from "../lib/patternRoomContext.ts";
import { patternMarketContext } from "../lib/patternMarketContext.ts";
import { patternPullbackPressure } from "../lib/patternPullbackPressure.ts";
import { namedCandleOccurrenceAt, resolveNamedCandleFocus, type NamedCandleOccurrence } from "../lib/namedCandleHistory.ts";
import { useNamedCandleHistory } from "../lib/useNamedCandleHistory.ts";
import { explainFocusedHistoryFailure as explainHistoryFailure, explainFocusedHistoryRefreshFailure } from "../lib/focusedHistoryFailure.ts";
import { refreshFocusedM5History } from "../lib/focusedM5Refresh.ts";
import { getNamedCandleFamilyKnowledge, getNamedCandleKnowledge, NAMED_CANDLE_FAMILIES, namedCandlePatternDirection, namedPatternDirectionalReadout, type NamedCandleFamily } from "../lib/namedCandleKnowledge.ts";
import { useLocale } from "../lib/locale.tsx";
import { capM5DisplayWindow as capCalendarM5DisplayWindow, calendarTwoYearsBefore as calendarTwoYearsBeforeUtc, latestCanonicalUtc } from "../lib/m5Retention.ts";
import { writePromptText } from "../lib/promptClipboard.ts";
import { readConfiguredEconomicCalendar } from "../lib/pdfExternalInputs.ts";
import type { BrokerEvidenceState } from "../components/LegacyBrokerEvidence.tsx";

const MON = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const viCopy = (encoded: string) => decodeURIComponent(encoded);

const DETECTOR_REASON_VI: Record<string, string> = {
  closed_bar_geometry_matched: "đã khớp hình học nến đã đóng",
  insufficient_m5_context: "thiếu ngữ cảnh M5 cần thiết",
  invalid_or_forming_bar_input: "dữ liệu có nến đang hình thành hoặc không hợp lệ",
  non_contiguous_m5_tape: "băng dữ liệu M5 không liên tục",
  no_concept_match: "không khớp khái niệm xác định",
  pdf_concepts_evaluated_on_closed_xauusd_m5: "đã đánh giá khái niệm PDF trên nến XAUUSD M5 đã đóng",
  invalid_xauusd_symbol: "mã không phải XAUUSD hợp lệ",
  invalid_xauusd_timeframe: "khung thời gian không phải M5 hợp lệ",
  neutral_setup: "thiết lập trung tính",
};

function localizedDetectorReason(reason: string, locale: "en" | "vi"): string {
  const readable = reason.replace(/_/g, " ").toLowerCase();
  return locale === "vi" ? DETECTOR_REASON_VI[readable.replace(/[ -]+/g, "_")] || `chi tiết quan sát: ${readable}` : readable;
}

function localizedNamedPattern(pattern: string, locale: "en" | "vi"): string {
  const readable = pattern.replace(/_/g, " ").toLowerCase();
  return locale === "vi" ? `mô hình ${readable}` : readable;
}

function localizedNamedCandleMeaning(pattern: string, locale: "en" | "vi"): string {
  if (locale !== "vi") return "";
  const direction = namedCandlePatternDirection(pattern);
  if (direction === "UP") return "quan sát áp lực hoặc từ chối hướng tăng trong băng nến đã đóng";
  if (direction === "DOWN") return "quan sát áp lực hoặc từ chối hướng giảm trong băng nến đã đóng";
  return "quan sát cân bằng, nén hoặc từ chối hai chiều; hướng vẫn chưa được xác định";
}
// CSV parsing and import storage are legacy-only concerns. Keep the focused
// XAUUSD M5 module graph free of the parser; the full Microscope surface
// loads csvImports.ts on demand when a CSV path is selected.
const CSV_SELECTED_KEY = "quantsmart-csv-selected";
const CSV_MINUTES: Record<string, number> = { M1: 1, M5: 5, M15: 15, M30: 30, H1: 60, H4: 240, D1: 1440 };
// Legacy diagnostic widgets stay out of the focused XAUUSD M5 module graph.
// They are loaded only when the full /microscope surface renders them.
const LegacyPreEventWarning = lazy(() => import("../components/PreEventWarning.tsx").then((m) => ({ default: m.PreEventWarning })));
const LegacyMt5ConnectPanel = lazy(() => import("../components/Mt5ConnectPanel.tsx").then((m) => ({ default: m.Mt5ConnectPanel })));
const LegacyCsvImportPanel = lazy(() => import("../components/CsvImportPanel.tsx").then((m) => ({ default: m.CsvImportPanel })));
const LegacyStrategyAttributionPanel = lazy(() => import("../components/StrategyAttributionPanel.tsx").then((m) => ({ default: m.StrategyAttributionPanel })));
const LegacyDecisionEvidencePanel = lazy(() => import("../components/DecisionEvidencePanel.tsx").then((m) => ({ default: m.DecisionEvidencePanel })));
const LegacyRealismPanel = lazy(() => import("../components/RealismPanel.tsx").then((m) => ({ default: m.RealismPanel })));
const LegacyCalibrationPanel = lazy(() => import("../components/CalibrationPanel.tsx").then((m) => ({ default: m.CalibrationPanel })));
const LegacyHonestyDashboard = lazy(() => import("../components/HonestyDashboard.tsx").then((m) => ({ default: m.HonestyDashboard })));
const LegacyFundingPanel = lazy(() => import("../components/FundingPanel.tsx").then((m) => ({ default: m.FundingPanel })));
const LegacyStageStepper = lazy(() => import("../components/StageStepper.tsx").then((m) => ({ default: m.StageStepper })));
const LegacyResearchJobStatus = lazy(() => import("../components/ResearchJobStatus.tsx").then((m) => ({ default: m.ResearchJobStatus })));
const LegacyResearchJobsController = lazy(() => import("../components/LegacyResearchJobsController.tsx").then((m) => ({ default: m.LegacyResearchJobsController })));
type LegacyResearchJobsSnapshot = import("../components/LegacyResearchJobsController.tsx").LegacyResearchJobsSnapshot;
const EMPTY_LEGACY_RESEARCH_JOBS: LegacyResearchJobsSnapshot = {
  primary: { result: null, error: null, pending: false },
  compare: { result: null, error: null, pending: false },
};
const LegacyBrokerEvidence = lazy(() => import("../components/LegacyBrokerEvidence.tsx").then((m) => ({ default: m.LegacyBrokerEvidence })));
const PriceActionKnowledgePanel = lazy(() => import("../components/PriceActionKnowledgePanel.tsx").then((m) => ({ default: m.PriceActionKnowledgePanel })));

const f = (v: any, d = 2) => (v == null || isNaN(+v) ? "—" : (+v).toFixed(d));
const fp = (v: any) => (v == null || isNaN(+v) ? "—" : (+v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const stamp = (iso?: string) => { const m = (iso || "").match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/); return m ? `${MON[+m[2]]} ${m[3]} ${m[4]}` : "—"; };
const TFS = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"] as const;
// Loading and empty tapes must retain their identity across renders. Effects
// depending on a freshly allocated [] can otherwise keep resetting overlay state.
const EMPTY_OHLC_BARS: OhlcBar[] = [];

function capM5DisplayWindow<T extends { t: string }>(rows: T[], timeframe: string): T[] { return capCalendarM5DisplayWindow(rows, timeframe); }
// Causal analogue matching is intentionally bounded for interactive latency;
// the full retained tape remains available to the deterministic pattern census.
const M5_FORECAST_TAPE_LIMIT = 6000;
const FOCUSED_CLOCK_REFRESH_MS = 30_000;
const FOCUSED_M5_REFRESH_MS = 60_000;
const FOCUSED_CHART_ONLY_KEY = "mfe_focused_chart_only_v1";
const CANONICAL_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/;
// Browser authority contract: SHADOW_ONLY | NO_DECISION | live_apply_allowed=false.
// Browser audit contract: focused ? <span className="pflag" data-focused-timeframe="true">M5 | FOCUSED</span>.
// ABSTAIN: no deterministic closed-bar concept match when the current tape has no marker.
// Source marker copy contract: {sourceName} · {marker.direction} · {evidenceScore} · measured {detectorReason} · {formatPriceActionSourcePages(marker.pageAnchors)}
// Overlay provenance contract: const chartOverlayProvenance = `closed ${latestClosedBarUtc || "unavailable"} UTC | source ${chartEvidenceSource}`;
// Focused copy contract: "🔴 LIVE · 1M Forward" and "📼 REPLAY · Historical".

// Keep the chart surface legible while a legacy lazy panel is loading. A null
// fallback makes a slow module fetch look like a broken/blank focused surface.
// Inline monochrome styling keeps this state chart-first before page CSS commits.
const microscopeSuspenseFallback = (
  <div
    role="status"
    aria-live="polite"
    aria-label="Loading chart surface"
    style={{
      minHeight: "calc(100dvh - 126px)",
      display: "grid",
      placeItems: "center",
      padding: 24,
      background: "#050505",
      color: "#f5f5f5",
      fontFamily: "var(--mfe-mono, ui-monospace, monospace)",
      fontSize: 12,
      letterSpacing: ".04em",
    }}
  >
    Loading chart surface…
  </div>
);

function readFocusedChartOnlyPreference(): boolean {
  try {
    // The focused route opens as a chart-first surface. Context remains
    // available through Alt+C, but stale preferences must not restore the
    // oversized status/header stack over the newest candles.
    return sessionStorage.getItem(FOCUSED_CHART_ONLY_KEY) !== "0";
  } catch {
    return true;
  }
}

function explainFocusedHistoryFailure(reason: string | null | undefined): string {
  return explainHistoryFailure(reason);
}

/** Read-only freshness derived from the displayed closed-bar tape. */
function closedBarFreshness(rows: Array<{ t: string }>, nowMs = Date.now()) {
  const latest = rows.length ? rows[rows.length - 1]?.t : undefined;
  if (!latest || !CANONICAL_UTC_TIMESTAMP.test(latest)) return { utc: null, latestMs: null, ageMs: null };
  const latestMs = Date.parse(latest);
  if (!Number.isFinite(latestMs) || latestMs > nowMs + 60_000) return { utc: null, latestMs: null, ageMs: null };
  return { utc: latest, latestMs, ageMs: Math.max(0, nowMs - latestMs) };
}

/** Human-readable age for the latest closed candle; null stays explicitly unavailable. */
function formatClosedBarAge(ageMs: number | null): string {
  if (ageMs == null || !Number.isFinite(ageMs)) return "unavailable";
  const ageSeconds = ageMs / 1000;
  if (ageSeconds < 60) return `${Math.round(ageSeconds)}s`;
  if (ageSeconds < 3600) return `${(ageSeconds / 60).toFixed(1)}m`;
  if (ageSeconds < 86400) return `${(ageSeconds / 3600).toFixed(1)}h`;
  return `${(ageSeconds / 86400).toFixed(1)}d`;
}

/** Conservative categorical interval used only for historical readouts. */
function wilson95(successes: number, total: number): { lower: number; upper: number } | null {
  if (!Number.isFinite(successes) || !Number.isFinite(total) || total <= 0) return null;
  const p = Math.max(0, Math.min(1, successes / total));
  const z = 1.959963984540054;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const half = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total) / denominator;
  return { lower: Math.max(0, center - half), upper: Math.min(1, center + half) };
}

/** Keep the forecast card's freshness decision legible without hiding its machine reason. */
function explainForecastFreshness(reason: string): string {
  switch (reason) {
    case "FRESH": return "fresh closed-bar evidence";
    case "STALE_CLOSED_BAR": return "latest closed bar is older than the 15m gate";
    case "NO_CLOSED_BAR": return "no closed bar available";
    case "INVALID_TIMESTAMP": return "latest bar has an invalid UTC timestamp";
    case "FUTURE_BAR": return "latest bar is future-dated or still forming";
    default: return "closed-bar freshness unavailable";
  }
}

function priceActionMarkerToSignal(marker: PriceActionMarker): SignalMarker {
  const direction = marker.direction === "UP" ? "bullish" : marker.direction === "DOWN" ? "bearish" : "neutral";
  return {
    i: marker.i,
    price: marker.price,
    score: marker.score,
    conceptId: marker.conceptId,
    ...(marker.setup ? { pdfSetup: marker.setup } : {}),
    side: marker.position === "below" ? "low" : marker.position === "above" ? "high" : "low",
    reads: direction,
    label: `PATTERN · ${marker.label}`,
    measures: `PDF concept ${marker.conceptId} · score ${(marker.score * 100).toFixed(0)}% · ${formatPriceActionSourcePages(marker.pageAnchors)}`,
    wick_atr: 0,
    wick_threshold_atr: null,
    wick_unusual: false,
    close_pos: null,
    verdict: "OBSERVATION | SHADOW_ONLY",
    base_rate: null,
    conditional_rate: null,
    lift: null,
    sample_n: null,
    outcome: "pending",
    time: marker.time,
    why_factors: ["Deterministic OHLC geometry matched the concept.", "Click the knowledge panel for the source explanation and abstain cues.", "This marker is descriptive and has no order authority."],
    context_assessment: "NEUTRAL",
  };
}

function pdfSourceObservationToSignal(observation: PdfSignalObservation, bars: OhlcBar[]): SignalMarker | null {
  if (observation.state !== "DETECTED" || observation.i == null || !observation.time) return null;
  const bar = bars[observation.i];
  if (!bar || bar.t !== observation.time) return null;
  const direction = observation.direction === "UP" ? "bullish" : observation.direction === "DOWN" ? "bearish" : "neutral";
  const knowledge = getPriceActionKnowledge(observation.conceptId);
  return {
    i: observation.i,
    price: bar.c,
    score: observation.score,
    conceptId: observation.conceptId,
    side: observation.direction === "DOWN" ? "high" : "low",
    reads: direction,
    label: `PDF PROXY · ${(knowledge?.name || observation.conceptId).toUpperCase()}`,
    measures: `XAUUSD M5 source translation · ${observation.reason.replace(/_/g, " ").toLowerCase()} · descriptive only`,
    wick_atr: 0,
    wick_threshold_atr: null,
    wick_unusual: false,
    close_pos: null,
    verdict: "OBSERVATION | SHADOW_ONLY",
    base_rate: null,
    conditional_rate: null,
    lift: null,
    sample_n: null,
    outcome: "pending",
    time: observation.time,
    why_factors: ["PDF concept translated into a bounded closed XAUUSD M5 observation.", "The source note remains descriptive and has no source label, outcome, fill or order authority.", "Inspect the PDF knowledge panel for source pages and abstain cues."],
    context_assessment: "NEUTRAL",
  };
}

function namedCandleFamilyLabel(family: NamedCandleFamily): string {
  return family.replace(/_/g, " ");
}

function namedCandlePatternToSignal(pattern: string, i: number, bar: OhlcBar): SignalMarker {
  const direction = namedCandlePatternDirection(pattern);
  return {
    i,
    price: bar.c,
    side: direction === "DOWN" ? "high" : "low",
    reads: direction === "UP" ? "bullish" : direction === "DOWN" ? "bearish" : "neutral",
    label: `CANDLE · ${pattern}`,
    measures: `Named closed-bar candle pattern · ${pattern} · click for full retained history · descriptive only`,
    conceptId: `named_candle:${pattern}`,
    annotationKind: "named_candle",
    wick_atr: 0,
    wick_threshold_atr: null,
    wick_unusual: false,
    close_pos: null,
    verdict: "OBSERVATION | SHADOW_ONLY",
    base_rate: null,
    conditional_rate: null,
    lift: null,
    sample_n: null,
    outcome: "pending",
    time: bar.t,
    why_factors: ["The named candle detector matched the current closed M5 bar.", "Select the pattern shortcut to inspect its causal historical tape.", "This marker is descriptive and has no decision or order authority."],
    context_assessment: "NEUTRAL",
  };
}

function namedCandleHistoricalToSignal(pattern: NamedCandlePattern, match: PatternMatch, i: number, bar: OhlcBar): SignalMarker {
  const direction = namedCandlePatternDirection(pattern);
  const nextBar = match.outcome?.[0];
  const outcome = nextBar === "FLAT" ? "flat" : direction === "NEUTRAL" ? "neutral" : nextBar === direction ? "correct" : "wrong";
  return {
    i,
    price: bar.c,
    side: direction === "DOWN" ? "high" : "low",
    reads: direction === "UP" ? "bullish" : direction === "DOWN" ? "bearish" : "neutral",
    label: `HIST CANDLE · ${pattern}`,
    measures: `Historical named closed-bar candle pattern · ${pattern} · next closed bar ${nextBar || "unavailable"} · descriptive only`,
    conceptId: `named_candle:${pattern}`,
    annotationKind: "named_candle",
    wick_atr: 0,
    wick_threshold_atr: null,
    wick_unusual: false,
    close_pos: null,
    verdict: "HISTORICAL | SHADOW_ONLY",
    base_rate: null,
    conditional_rate: null,
    lift: null,
    sample_n: null,
    outcome,
    nextBarOutcome: nextBar === "UP" || nextBar === "DOWN" || nextBar === "FLAT" ? nextBar : undefined,
    time: bar.t,
    why_factors: ["Historical causal analogue endpoint carrying the selected named candle pattern.", "Select the marker to align the mini analogue and inspect its measured next-bar outcome.", "Historical evidence has no decision or order authority."],
    context_assessment: "NEUTRAL",
  };
}

function namedCandleHistoryToSignal(pattern: NamedCandlePattern, occurrence: Pick<NamedCandleOccurrence, "time">, bars: OhlcBar[]): SignalMarker | null {
  const current = resolveNamedCandleFocus(bars, { pattern, time: occurrence.time });
  if (!current) return null;
  const i = current.i;
  const base = namedCandlePatternToSignal(pattern, i, bars[i]);
  const historical = i < bars.length - 1;
  const direction = namedCandlePatternDirection(pattern);
  const next = current.nextBar;
  return {
    ...base, label: historical ? `HIST CANDLE / ${pattern}` : base.label,
    measures: `Full retained named-candle history / ${pattern} / H+1 ${next || "unavailable"} / descriptive only`,
    nextBarOutcome: next || undefined,
    outcome: !next ? "pending" : next === "FLAT" ? "flat" : direction === "NEUTRAL" ? "neutral" : next === direction ? "correct" : "wrong",
    why_factors: ["Exhaustive evaluable named-candle occurrence, selected by UTC identity.", "H+1 uses the shared 0.12 ATR14 flat threshold; not a PDF setup or an order."],
  };
}

function namedPatternEvidenceLabel(pattern: NamedCandlePattern, prediction: NamedPatternPrediction, locale: "en" | "vi" = "en"): string {
  // The two-argument form `namedPatternEvidenceLabel(pattern, prediction)` remains the English contract.
  const isVi = locale === "vi";
  const h1 = prediction.predictions.find((item) => item.horizon === 1);
  if (!h1) return `${pattern} · ${prediction.support} ${isVi ? "hỗ trợ" : "support"} · n=${prediction.sampleN} · ${isVi ? "H+1 chưa khả dụng" : "H+1 unavailable"}`;
  const interval = h1.calibration?.interval95;
  const ci = interval
    ? ` / CI95 ${isVi ? "TĂNG" : "UP"} ${Math.round(interval.up.lower * 100)}-${Math.round(interval.up.upper * 100)}% / ${isVi ? "GIẢM" : "DOWN"} ${Math.round(interval.down.lower * 100)}-${Math.round(interval.down.upper * 100)}%`
    : "";
  const direction = namedCandlePatternDirection(pattern);
  const winRate = namedPatternDirectionalReadout(pattern, h1).rate;
  const winInterval = direction === "UP" ? interval?.up : direction === "DOWN" ? interval?.down : undefined;
  const winRateLabel = winRate == null
    ? `${isVi ? "tỷ lệ thắng theo hướng không khả dụng" : "directional win-rate N/A"} (${direction === "NEUTRAL" ? (isVi ? "thiết lập trung tính" : "neutral setup") : (isVi ? "chưa có H+1 quan sát" : "no observed H+1")})`
    : `${isVi ? "tỷ lệ thắng theo hướng" : "directional win-rate"} ${(winRate * 100).toFixed(0)}%${winInterval ? ` CI95 ${Math.round(winInterval.lower * 100)}–${Math.round(winInterval.upper * 100)}%` : ""}`;
  return `${pattern} · ${prediction.support} ${isVi ? "hỗ trợ" : "support"} · n=${prediction.sampleN} · ${winRateLabel} · H+1 ${isVi ? "TĂNG" : "UP"} ${(h1.up * 100).toFixed(0)}% · ${isVi ? "ĐI NGANG" : "FLAT"} ${(h1.flat * 100).toFixed(0)}% · ${isVi ? "GIẢM" : "DOWN"} ${(h1.down * 100).toFixed(0)}%${ci} · ${isVi ? "n hiệu dụng" : "effective n"}=${h1.effectiveN.toFixed(1)} · ${isVi ? "co rút" : "shrinkage"} ${(h1.shrinkage * 100).toFixed(0)}%`;
}

function priceActionOccurrenceToSignal(occurrence: NonNullable<PriceActionConceptEvidence["history"]>[number], conceptId: string, bars: OhlcBar[]): SignalMarker | null {
  // Occurrence ordinals are measured against the archive that produced the
  // evidence. Retention refreshes can shift that ordinal, while the UTC
  // timestamp remains the durable identity shared by the inspector and chart.
  const resolvedIndex = bars[occurrence.i] && focusedSnapshotTimestampsEqual(bars[occurrence.i].t, occurrence.time)
    ? occurrence.i
    : bars.findIndex((candidate) => focusedSnapshotTimestampsEqual(candidate.t, occurrence.time));
  const bar = resolvedIndex >= 0 ? bars[resolvedIndex] : undefined;
  if (!bar) return null;
  const direction = occurrence.direction === "UP" ? "bullish" : occurrence.direction === "DOWN" ? "bearish" : "neutral";
  // A neutral setup has no directional claim, so an UP/DOWN next bar is not a
  // miss. Keep its measured outcome visible while avoiding a false "wrong"
  // classification and a misleading LONG/SHORT implication.
  const outcome = occurrence.nextBar === "FLAT"
    ? "flat"
    : occurrence.direction === "NEUTRAL" ? "neutral" : occurrence.nextBar === occurrence.direction ? "correct" : "wrong";
  return {
    i: resolvedIndex,
    price: bar.c,
    score: occurrence.score,
    conceptId,
    ...(occurrence.setup ? { pdfSetup: occurrence.setup } : {}),
    side: occurrence.direction === "DOWN" ? "high" : "low",
    reads: direction,
    label: `HIST · ${conceptId.replace(/_/g, " ").toUpperCase()}`,
    measures: `Historical closed-bar occurrence · next bar ${occurrence.nextBar} · score ${(occurrence.score * 100).toFixed(0)}% · ${formatPriceActionSourcePages(PRICE_ACTION_SOURCE[conceptId as keyof typeof PRICE_ACTION_SOURCE]?.pageAnchors)}`,
    wick_atr: 0,
    wick_threshold_atr: null,
    wick_unusual: false,
    close_pos: null,
    verdict: "HISTORICAL | SHADOW_ONLY",
    base_rate: null,
    conditional_rate: null,
    lift: null,
    sample_n: null,
    outcome,
    nextBarOutcome: occurrence.nextBar,
    time: occurrence.time,
    why_factors: ["Closed-bar detector occurrence from the selected concept tape.", "The next-bar outcome is displayed separately from the setup label.", "Historical marker has no decision or order authority."],
    context_assessment: "NEUTRAL",
  };
}

// the 5 active zones + plain-language meaning (colors MATCH what the chart draws)
const ZONE_META = [
  { key: "observation", name: "Observation", color: "#D9B65A", desc: "Structural watch area around price — await confirmation." },
  { key: "risk", name: "Risk / Supply", color: TK.red, desc: "Overhead supply / invalidation side — avoid chasing." },
  { key: "demand", name: "Demand", color: TK.green, desc: "Underlying demand / target reaction zone." },
  { key: "sweep", name: "Sweep Band", color: TK.blue, desc: "Liquidity pool where stop sweeps frequently occur." },
  { key: "invalidation", name: "Invalidation", color: TK.purple, desc: "Structural invalidation level — thesis voids beyond this line." },
];
function Eye({ on, color }: { on: boolean; color: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={on ? color : "#3a4d61"} strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 10 C5 6,15 6,18 10 C15 14,5 14,2 10 Z" /><circle cx="10" cy="10" r="2" />
      {!on && <line x1="3.5" y1="3.5" x2="16.5" y2="16.5" stroke="#63758a" />}
    </svg>
  );
}

function Ring({ value, color, label, size = 88 }: { value: number; color: string; label: string; size?: number }) {
  const v = Math.max(0, Math.min(100, value)); const r = size / 2 - 8, c = 2 * Math.PI * r, off = c * (1 - v / 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TK.s3} strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" transform={`rotate(90 ${size / 2} ${size / 2})`} fontSize="21" fontWeight="800" fill={color} fontFamily="JetBrains Mono, monospace">{Math.round(v)}<tspan fontSize="11">%</tspan></text>
      </svg>
      {label && <div className="pmut" style={{ fontSize: 9, letterSpacing: ".5px", textTransform: "uppercase" }}>{label}</div>}
    </div>
  );
}
function AnalogueMiniChart({ bars, endpointIndex, setupPatterns, color, outcome, ariaLabel, locale }: { bars: OhlcBar[]; endpointIndex: number; setupPatterns: readonly string[]; color: string; outcome: "UP" | "DOWN" | "FLAT" | "UNAVAILABLE"; ariaLabel: string; locale: "en" | "vi" }) {
  if (!bars || bars.length < 2) return <div className="pmut psm">—</div>;
  const outcomeIndex = endpointIndex + 1;
  const { entry, target, invalidation, direction } = analogueWindowGeometry(bars, endpointIndex, setupPatterns);
  const landmarkPrices = [entry, target, invalidation].filter((price): price is number => price != null);
  const range = finiteMinMax((function* () {
    for (const bar of bars) { yield bar.l; yield bar.h; }
    yield* landmarkPrices;
  })()) ?? [0, 1];
  const [rangeLow, rangeHigh] = range;
  const span = rangeHigh - rangeLow || 1;
  const x = (index: number) => 6 + (index / Math.max(1, bars.length - 1)) * 194;
  const y = (price: number) => 8 + 50 * (1 - (price - rangeLow) / span);
  const outcomeColor = outcome === "UP" ? TK.green : outcome === "DOWN" ? TK.red : TK.text2;
  const positionLabel = direction === "UP" ? "OBS LONG" : direction === "DOWN" ? "OBS SHORT" : null;
  const geometryLabel = locale === "vi"
    ? positionLabel ? `; ${positionLabel} ${viCopy("v%C3%A0o%20l%E1%BB%87nh%2C%20m%E1%BB%A5c%20ti%C3%AAu%20v%C3%A0%20v%C3%B4%20hi%E1%BB%87u%20l%C3%A0%20h%C3%ACnh%20h%E1%BB%8Dc%20l%E1%BB%8Bch%20s%E1%BB%AD%20m%C3%B4%20t%E1%BA%A3")} ` : viCopy("%3B%20kh%C3%B4ng%20c%C3%B3%20h%C3%ACnh%20h%E1%BB%8Dc%20theo%20h%C6%B0%E1%BB%9Bng%20khi%20thi%E1%BA%BFu%20h%C6%B0%E1%BB%9Bng%20thi%E1%BA%BFt%20l%E1%BA%ADp%20r%C3%B5%20r%C3%A0ng")
    : positionLabel ? `; ${positionLabel} entry, target and invalidation are descriptive historical geometry` : "; no directional position geometry without an unambiguous setup direction";
  return <svg className="m5-analogue-window" viewBox="0 0 206 72" role="img" aria-label={`${ariaLabel}${geometryLabel}`}>
    <line x1="5" y1="60" x2="201" y2="60" stroke="var(--mfe-border)" />
    {bars.map((bar, index) => { const up = bar.c >= bar.o, cx = x(index), top = y(Math.max(bar.o, bar.c)), bottom = y(Math.min(bar.o, bar.c)); return <g key={`${bar.t}-${index}`} data-candle-state="closed"><line x1={cx} y1={y(bar.h)} x2={cx} y2={y(bar.l)} stroke={up ? "#26a69a" : "#ef5350"} strokeWidth="1" /><rect x={cx - 2.5} y={top} width="5" height={Math.max(1.8, bottom - top)} fill={up ? "#26a69a" : "#ef5350"} /></g>; })}
    <line x1={x(endpointIndex)} y1="4" x2={x(endpointIndex)} y2="62" stroke={color} strokeDasharray="3 2" opacity=".9" />
    <text x={Math.min(192, x(endpointIndex) + 3)} y="10" fill={color} fontSize="6.5" fontWeight="800">MATCH END</text>
    {positionLabel && entry != null && target != null && invalidation != null && <g opacity=".9"><line x1="6" y1={y(entry)} x2="200" y2={y(entry)} stroke="#f5f5f5" strokeWidth=".75" /><line x1="6" y1={y(target)} x2="200" y2={y(target)} stroke={TK.green} strokeWidth=".75" strokeDasharray="3 2" /><line x1="6" y1={y(invalidation)} x2="200" y2={y(invalidation)} stroke={TK.red} strokeWidth=".75" strokeDasharray="3 2" /><text x="8" y={Math.max(18, y(entry) - 2)} fill="#f5f5f5" fontSize="6" fontWeight="800">{positionLabel} ENTRY</text><text x="198" y={Math.max(18, y(target) - 2)} textAnchor="end" fill={TK.green} fontSize="6" fontWeight="800">TARGET</text><text x="198" y={Math.min(57, y(invalidation) + 7)} textAnchor="end" fill={TK.red} fontSize="6" fontWeight="800">INVALIDATION</text></g>}
    {outcome !== "UNAVAILABLE" && bars[outcomeIndex] && <g><line x1={x(outcomeIndex)} y1="49" x2={x(outcomeIndex)} y2="63" stroke={outcomeColor} strokeWidth="1.4" /><text x={x(outcomeIndex)} y="70" textAnchor="middle" fill={outcomeColor} fontSize="6.5" fontWeight="800">NEXT {outcome}</text></g>}
  </svg>;
}

function CandleWindow({ bars, center, marker, outcome, locale }: { bars: OhlcBar[]; center: number; marker?: PriceActionMarker; outcome?: "UP" | "DOWN" | "FLAT"; locale: "en" | "vi" }) {
  if (!marker) return <div className="pmut psm">No selected detector window; ABSTAIN.</div>;
  const from = Math.max(0, center - 6), rows = bars.slice(from, Math.min(bars.length, center + 7));
  if (rows.length < 2) return <div className="pmut psm">No detailed closed-bar window.</div>;
  const directional = marker.direction === "UP" || marker.direction === "DOWN";
  const { entry, target, invalidation } = candleWindowGeometry(bars, marker);
  const landmarkPrices = [entry, target, invalidation].filter((price): price is number => price != null);
  const range = finiteMinMax((function* () {
    for (const bar of rows) { yield bar.l; yield bar.h; }
    yield* landmarkPrices;
  })()) ?? [0, 1];
  const [lo, hi] = range, span = hi - lo || 1;
  const x = (i: number) => 8 + i * (184 / rows.length) + (92 / rows.length), y = (p: number) => 8 + 64 * (1 - (p - lo) / span);
  const outcomeIndex = marker.i + 1;
  const outcomeColor = outcome === "UP" ? TK.green : outcome === "DOWN" ? TK.red : TK.text2;
  const windowLabel = locale === "vi" ? "Cửa sổ mẫu nến đóng" : "Detailed closed-bar pattern window";
  const landmarkLabel = locale === "vi" ? "mốc nghiên cứu vào, mục tiêu và vô hiệu" : "entry, target and invalidation research landmarks";
  const nextLabel = locale === "vi" ? "nến đóng tiếp theo" : "next closed bar";
  const windowAriaLabel = `${windowLabel}${directional ? `; ${marker.direction === "UP" ? "LONG" : "SHORT"} ${locale === "vi" ? "vào lệnh, " : "entry, "}${landmarkLabel}` : ""}${outcome ? `; ${nextLabel} ${outcome}` : ""}`;
  return <svg className="m5-candle-window" viewBox="0 0 206 82" role="img" aria-label={windowAriaLabel}>
    <line x1="6" y1="72" x2="200" y2="72" stroke="var(--mfe-border)" />
    {rows.map((b, i) => { const up = b.c >= b.o, cx = x(i), top = y(Math.max(b.o, b.c)), bot = y(Math.min(b.o, b.c)); return <g key={`${b.t}-${i}`} data-candle-time={b.t} data-open={b.o} data-high={b.h} data-low={b.l} data-close={b.c}><title>{`${b.t} UTC · O ${b.o.toFixed(2)} · H ${b.h.toFixed(2)} · L ${b.l.toFixed(2)} · C ${b.c.toFixed(2)} · ${up ? "UP" : "DOWN"} closed candle`}</title><line x1={cx} y1={y(b.h)} x2={cx} y2={y(b.l)} stroke={up ? "#26a69a" : "#ef5350"} strokeWidth="1" /><rect x={cx - 3.2} y={top} width="6.4" height={Math.max(2, bot - top)} fill={up ? "#26a69a" : "#ef5350"} /></g>; })}
    {directional && target != null && invalidation != null && <g opacity=".9"><line x1="8" y1={y(entry)} x2="198" y2={y(entry)} stroke="#f5f5f5" strokeWidth=".8" /><line x1="8" y1={y(target)} x2="198" y2={y(target)} stroke={TK.green} strokeWidth=".8" strokeDasharray="3 2" /><line x1="8" y1={y(invalidation)} x2="198" y2={y(invalidation)} stroke={TK.red} strokeWidth=".8" strokeDasharray="3 2" /><text x="9" y={Math.max(9, y(entry) - 2)} fontSize="6" fontWeight="800" fill="#f5f5f5">{marker.direction === "UP" ? "LONG" : "SHORT"} ENTRY</text><text x="198" y={Math.max(9, y(target) - 2)} textAnchor="end" fontSize="6" fontWeight="800" fill={TK.green}>TARGET</text><text x="198" y={Math.min(69, y(invalidation) + 7)} textAnchor="end" fontSize="6" fontWeight="800" fill={TK.red}>INVALIDATION</text></g>}
    {marker && marker.i >= from && marker.i < from + rows.length && <g><line x1={x(marker.i - from)} y1="4" x2={x(marker.i - from)} y2="76" stroke={marker.direction === "DOWN" ? TK.red : marker.direction === "UP" ? TK.green : TK.text2} strokeDasharray="2 2" opacity=".8" /><rect x={marker.direction === "DOWN" ? 126 : 8} y="1" width="72" height="13" rx="3" fill="var(--bg-elevated)" stroke={marker.direction === "DOWN" ? TK.red : marker.direction === "UP" ? TK.green : TK.text2} /><text x={marker.direction === "DOWN" ? 162 : 44} y="10" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={marker.direction === "DOWN" ? TK.red : marker.direction === "UP" ? TK.green : TK.text2}>{marker.direction === "DOWN" ? "SHORT" : marker.direction === "UP" ? "LONG" : "PATTERN"} | OBS</text></g>}
    {outcome && outcomeIndex >= from && outcomeIndex < from + rows.length && <g><line x1={x(outcomeIndex - from)} y1="58" x2={x(outcomeIndex - from)} y2="76" stroke={outcomeColor} strokeWidth="1.4" opacity=".9" /><text x={x(outcomeIndex - from)} y="81" textAnchor="middle" fontSize="6.5" fontWeight="800" fill={outcomeColor}>NEXT {outcome}</text></g>}
  </svg>;
}

export function Microscope({ focused = false }: { focused?: boolean } = {}) {
  const { locale, t } = useLocale();
  const focusedCopy = locale === "vi" ? {
    retainedClosedBars: "nến đã đóng được lưu giữ",
    geometryAllowed: "Hình học nghiên cứu hiện được phép: hướng nhất quán trên lịch sử MT5 đã nâng cấp và còn mới.",
    geometryConflict: "Các hướng mới nhất xung đột; mốc vị trí LONG/SHORT được giữ lại.",
    geometryVerifying: "Đang tải dữ liệu MT5; hình học LONG/SHORT hiện tại chưa được hiển thị.",
    geometryFallback: "Dự phòng cục bộ chỉ mang tính mô tả; hình học LONG/SHORT hiện tại được giữ lại.",
    geometryStale: "Bằng chứng nến đã đóng mới nhất cũ hoặc không khả dụng; hình học LONG/SHORT hiện tại được giữ lại.",
    geometryNeutral: "Tập điểm đánh dấu mới nhất trung tính hoặc thiếu một hướng nhất quán; hình học LONG/SHORT hiện tại được giữ lại.",
    geometryReadoutWithheld: "Hình học nghiên cứu được giữ lại",
    geometryReady: "HÌNH HỌC NGHIÊN CỨU ĐÃ SẴN SÀNG",
    abstainPrefix: "TẠM DỪNG",
    ohlcUnavailable: "OHLC không khả dụng",
    closeTimingUnavailable: "Thời điểm đóng M5 không khả dụng | KHÔNG KHẢ DỤNG | dấu thời gian nến đóng được giữ lại",
    closePending: "Đang chờ đóng M5",
    nextClose: "Lần đóng M5 tiếp theo",
    forecastFreshness: "Độ mới dự báo",
    forecastNotEvaluated: "Độ mới dự báo: chưa đánh giá cho khung thời gian này",
    forecastCalibrationUnavailable: "Khoảng hiệu chuẩn H+1 không khả dụng",
    forecastH1Unavailable: "H+1 không khả dụng",
    allForecastGatesPass: "tất cả cổng đạt",
    forecastWithheld: "giữ lại: thiếu",
    evidenceContract: "hợp đồng bằng chứng",
    verifiedHistory: "lịch sử nến đóng MT5 đã xác minh",
    localFallbackUnverified: "dự phòng lịch sử cục bộ; lịch sử MT5 chưa xác minh",
    sourcePages: "trang nguồn",
    measured: "đã đo",
    inspectPdfLens: "mở lăng kính PDF",
    detectorReason: "lý do bộ phát hiện",
    currentPatternExplanation: "Giải thích mô hình hiện tại",
    noConceptMarkers: "Hiện không có điểm đánh dấu khái niệm trên nến đã đóng; điều hướng lăng kính nguồn được giữ lại.",
    abstainConcept: "TẠM DỪNG · không khớp khái niệm xác định; điều hướng lăng kính nguồn được giữ lại.",
    scanPending: "Đang quét lịch sử M5 đã lưu; thống kê mô hình đang chờ. Các điều khiển biểu đồ vẫn khả dụng.",
    scanFailed: "Quét lịch sử mô hình thất bại. Thống kê không khả dụng; hãy thử lại.",
    scanComplete: "Đã hoàn tất quét lịch sử mô hình.",
    waitingClosed: "Đang chờ nến M5 đã đóng.",
    atlasPending: "Đang so sánh các nến đã đóng; bằng chứng dự báo và bản xem trước đang chờ.",
    atlasFailed: "Phân tích nến tương đồng thất bại. Bằng chứng dự báo không khả dụng; hãy thử lại.",
    retryScan: "Thử lại quét lịch sử mô hình",
    retryAtlas: "Thử lại phân tích nến tương đồng",
    showContext: "Hiện ngữ cảnh",
    chartOnly: "Chỉ biểu đồ",
    chartOnlyTitle: "Chuyển chế độ chỉ biểu đồ (Alt+C)",
    patternScanning: "LỊCH SỬ MÔ HÌNH | ĐANG QUÉT",
    patternUnavailable: "LỊCH SỬ MÔ HÌNH | KHÔNG KHẢ DỤNG",
    conflicting: "HƯỚNG KHÁC NHAU · TẠM DỪNG",
    noPattern: "KHÔNG KHỚP MÔ HÌNH | TẠM DỪNG",
    observation: "QUAN SÁT HÀNH ĐỘNG GIÁ",
    refresh: "MT5 LÀM MỚI | GIỮ BẢN GHI ĐƯỢC XÁC MINH CUỐI",
    sourceCoverage: "Độ phủ nguồn",
    sourceCoverageStatus: "Trạng thái độ phủ nguồn",
    evidenceSource: "Nguồn bằng chứng",
    coverageWindow: "Cửa sổ độ phủ",
    retention: "Lưu giữ",
    latestClosedBar: "Nến đã đóng mới nhất (UTC)",
    closedBarAge: "Tuổi nến đã đóng",
    authority: "Quyền hạn",
    exportSnapshot: "Xuất JSON ảnh chụp nghiên cứu",
    copySnapshot: "Sao chép JSON ảnh chụp",
    importSnapshot: "Nhập / tiếp tục JSON ảnh chụp",
    retryHistory: "Thử lại lịch sử MT5",
    retryingHistory: "Đang thử lại lịch sử MT5...",
    bookmarks: "Dấu trang nghiên cứu",
    saveBookmark: "Lưu dấu trang hiện tại",
    noBookmarks: "Chưa có dấu trang nào được lưu trên trình duyệt này.",
    priceActionReadout: "Bản đọc hành động giá",
    currentClosedBar: "Nến đã đóng hiện tại",
    currentConcepts: "Khái niệm hiện tại",
    namedCandleEvidence: "Bằng chứng nến được đặt tên",
    nextBarObservation: "Quan sát nến tiếp theo",
    historicalValidation: "Xác thực lịch sử",
    miniAnaloguePreview: "Xem trước tương đồng thu nhỏ",
    selectedConceptEvidence: "Bằng chứng khái niệm đã chọn",
    pdfConceptLens: "Lăng kính khái niệm PDF",
    pdfSelectConcept: "Chọn một khái niệm",
    pdfClickMarker: "Chọn một điểm đánh dấu trên biểu đồ hoặc khái niệm để tải giải thích dựa trên nguồn.",
    pdfLookFor: "Cần xem",
    pdfAbstain: "Tạm dừng",
    pdfSourceNotesOnly: "chỉ ghi chú nguồn; chưa triển khai bộ phát hiện",
    pdfNotDetected: "hiện không được phát hiện",
    patternCensus: "Thống kê mô hình | dữ liệu M5 đã lưu",
    patternWindow: "Cửa sổ mô hình",
    evidenceReceipt: "Biên nhận bằng chứng",
    forecastStatusPrefix: "Trạng thái dự báo",
    sourceCoverageDisclosure: "Các khung thời gian khác không được suy ra từ biểu đồ này. Không tạo dòng sự kiện tổng hợp hoặc phần trăm hướng thay thế.",
    m5Cutoff: "Mốc cắt M5 (UTC)",
    fallbackReason: "Lý do dự phòng",
    mt5Refresh: "Làm mới MT5",
    mt5Assembly: "Ghép MT5",
    cacheChunks: "Bộ nhớ đệm / khối",
    accountScope: "Phạm vi tài khoản",
    actualUtcRange: "Khoảng UTC thực tế",
    runtimeAttestation: "Xác nhận thời gian chạy",
    barContract: "Hợp đồng nến",
    barContractValue: "UTC · chỉ nến đã đóng · không có nến đang hình thành",
    coverageAcceptance: "Lịch sử MT5 chỉ được chấp nhận khi có độ phủ đầy đủ, dấu thời gian UTC, nguồn gốc nến đã đóng, quyền chỉ đọc, trạng thái không áp dụng trực tiếp rõ ràng và bộ nhớ đệm theo tài khoản. Lịch sử môi giới chưa đầy đủ sẽ dùng ảnh chụp cục bộ đã gắn nhãn.",
    currentNamedCandleAria: "Bằng chứng nến được đặt tên hiện tại",
    currentNamedCandleUnavailable: "Nến đã đóng hiện tại không có mô hình nến được đặt tên hoặc băng dữ liệu nhân quả chưa sẵn sàng.",
    namedCandleConditionalNote: "Bằng chứng H+1 có điều kiện chỉ mang tính mô tả và có điều chỉnh co rút; không đi vào đồng thuận dự báo tổng hợp hoặc quyền đặt lệnh.",
    namedCandlePatternEndpoints: "điểm cuối mô hình nến được đặt tên trong lịch sử được chú thích trên biểu đồ.",
    namedCandleFamilyEndpoints: "điểm cuối nhóm nến được đặt tên trong lịch sử được chú thích trên biểu đồ.",
    namedCandleFilterPrompt: "Chọn bộ lọc mô hình hoặc nhóm để phủ các điểm cuối lịch sử lên biểu đồ.",
    namedCandleLens: "lăng kính nến được đặt tên",
    namedCandleFamilyLens: "lăng kính nhóm nến được đặt tên",
    descriptiveTaxonomy: "phân loại mô tả",
    familyAuthority: "Bằng chứng nhóm vẫn là SHADOW_ONLY / NO_DECISION; không thiết lập quyền LONG hoặc SHORT.",
    forecastGateChecks: "Kiểm tra cổng dự báo",
    verifiedHistoryGate: "Cổng lịch sử MT5 đã xác minh",
    freshnessGate: "Cổng độ mới của nến đã đóng gần nhất",
    walkForwardGate: "Cổng độ phủ walk-forward theo thứ tự thời gian",
    supportGate: "Cổng hỗ trợ nhân quả hiệu dụng",
    analogueGate: "Cổng độ phủ tương đồng độc lập",
    marginGate: "Cổng biên đồng thuận",
    causalMetaGate: "Cổng siêu dữ liệu hỗ trợ nhân quả",
    latestClosed: "đã đóng gần nhất",
    forecastEvidence: "Bằng chứng dự báo",
    forecastCompleteTape: "Dự báo dùng toàn bộ băng M5 được lưu giữ.",
    forecastOmittedBars: "nến được lưu giữ trước đó bị bỏ qua để giảm độ trễ dự báo tương tác.",
    forecastGates: "Các cổng dự báo",
    noForecastDistribution: "Chưa có phân phối tương đồng nhân quả.",
    noCausalAnalogueWindow: "Không có cửa sổ tương đồng lịch sử.",
    currentHistoricalInspection: "Kiểm tra mô hình hiện tại và lịch sử",
    currentPatternDescriptive: "Lăng kính PDF và hình học chỉ mang tính mô tả; không có quyền đặt lệnh.",
    patternCensusRegion: "Thống kê mô hình M5 được lưu giữ; cuộn để xem mọi khái niệm",
    patternCensusWaiting: "Đang chờ bằng chứng nến đã đóng đầy đủ.",
    patternCensusColumns: "Cột: số lần xuất hiện | tỷ lệ đúng nến tiếp theo | khoảng Wilson CI95 | tách LONG/SHORT | UP/DOWN/FLAT.",
    patternCensusCoverage: "Khoảng Wilson CI95 hiển thị theo từng hàng. Độ phủ bộ phát hiện được định lượng",
    patternCensusOther: "Các khái niệm PDF khác chỉ là quan sát mô tả có giới hạn; kết quả đủ điều kiện theo nguồn vẫn được giữ lại.",
    patternWindowAriaPrefix: "Kiểm tra cửa sổ mô hình",
    historicalOccurrence: "Lần xuất hiện lịch sử",
    historicalOccurrencePending: "đang chờ",
    currentSetupWindow: "Các nến đã đóng quanh thiết lập hiện tại; nhãn LONG/SHORT chỉ mô tả quan sát thiết lập.",
    noDetectorWindow: "Chưa chọn cửa sổ bộ phát hiện; hãy nhấp điểm đánh dấu trên biểu đồ hoặc chọn khái niệm đã phát hiện.",
    evidenceReceiptLatest: "đã đóng gần nhất",
    selectedHistoricalAnalogue: "Tương đồng lịch sử đã chọn",
    previewUnavailable: "Bản xem trước không khả dụng",
    mainChartEndpointFocused: "Đã lấy nét điểm cuối trên biểu đồ chính",
    previewOnlyAlign: "Chỉ xem trước · dùng Hiện trên biểu đồ để căn chỉnh biểu đồ chính",
    researchEvidenceOnly: "Chỉ bằng chứng nghiên cứu · SHADOW_ONLY · NO_DECISION · không có quyền đặt lệnh.",
    closedEvidence: "bằng chứng M5 đã đóng",
    forecastGateGroup: "Kiểm tra cổng dự báo",
    gateHistory: "LỊCH SỬ",
    gateFreshness: "ĐỘ MỚI",
    gateWalkForward: "WF",
    gateSupport: "HỖ TRỢ",
    gateAnalogues: "TƯƠNG ĐỒNG",
    gateMargin: "BIÊN",
    gateCausalMeta: "SIÊU DỮ LIỆU NHÂN QUẢ",
    gateReady: "SẴN SÀNG",
    gateWait: "CHỜ",
    gateFresh: "MỚI",
  } : {
    retainedClosedBars: "closed bars retained",
    geometryAllowed: "Current research geometry allowed: unanimous direction on fresh promoted MT5 history.",
    geometryConflict: "Conflicting latest directions; LONG/SHORT position landmarks are withheld.",
    geometryVerifying: "MT5 data is loading; current LONG/SHORT geometry is withheld.",
    geometryFallback: "Local fallback is descriptive only; current LONG/SHORT geometry is withheld.",
    geometryStale: "Latest closed-bar evidence is stale or unavailable; current LONG/SHORT geometry is withheld.",
    geometryNeutral: "Latest marker set is neutral or lacks one unanimous direction; current LONG/SHORT geometry is withheld.",
    geometryReadoutWithheld: "Research geometry withheld",
    geometryReady: "RESEARCH GEOMETRY READY",
    abstainPrefix: "ABSTAIN",
    ohlcUnavailable: "OHLC unavailable",
    closeTimingUnavailable: "M5 close timing unavailable | UNAVAILABLE | closed-bar timestamp withheld",
    closePending: "M5 close pending",
    nextClose: "Next M5 close",
    forecastFreshness: "Forecast freshness",
    forecastNotEvaluated: "Forecast freshness: not evaluated for this timeframe",
    forecastCalibrationUnavailable: "H+1 calibration intervals unavailable",
    forecastH1Unavailable: "H+1 unavailable",
    allForecastGatesPass: "all gates pass",
    forecastWithheld: "withheld: missing",
    evidenceContract: "evidence contract",
    verifiedHistory: "Verified MT5 closed-bar history",
    localFallbackUnverified: "Local historical fallback; MT5 history unverified",
    sourcePages: "source pages",
    measured: "measured",
    inspectPdfLens: "inspect PDF lens",
    detectorReason: "detector reason",
    currentPatternExplanation: "Current pattern explanation",
    noConceptMarkers: "No current closed-bar concept markers are available; source lens navigation is withheld.",
    abstainConcept: "ABSTAIN · no deterministic concept match; source lens navigation is withheld.",
    scanPending: "Scanning retained M5 history; pattern statistics are pending. Chart controls remain available.",
    scanFailed: "Pattern history scan failed. Statistics are unavailable; retry the scan.",
    scanComplete: "Pattern history scan complete.",
    waitingClosed: "Waiting for closed M5 candles.",
    atlasPending: "Comparing closed-candle analogues; forecast evidence and previews are pending.",
    atlasFailed: "Candle analogue analysis failed. Forecast evidence is unavailable; retry the analysis.",
    retryScan: "Retry pattern history scan",
    retryAtlas: "Retry candle analogue analysis",
    showContext: "Show context",
    chartOnly: "Chart only",
    chartOnlyTitle: "Toggle chart-only mode (Alt+C)",
    patternScanning: "PATTERN HISTORY | SCANNING",
    patternUnavailable: "PATTERN HISTORY | UNAVAILABLE",
    conflicting: "CONFLICTING DIRECTIONS · ABSTAIN",
    noPattern: "NO PATTERN MATCH | ABSTAIN",
    observation: "PRICE-ACTION OBSERVATION",
    refresh: "MT5 REFRESH | LAST VERIFIED TAPE RETAINED",
    sourceCoverage: "Source coverage",
    sourceCoverageStatus: "Source coverage status",
    evidenceSource: "Evidence source",
    coverageWindow: "Coverage window",
    retention: "Retention",
    latestClosedBar: "Latest closed bar (UTC)",
    closedBarAge: "Closed-bar age",
    authority: "Authority",
    exportSnapshot: "Export research snapshot JSON",
    copySnapshot: "Copy snapshot JSON",
    importSnapshot: "Import / resume snapshot JSON",
    retryHistory: "Retry MT5 history",
    retryingHistory: "Retrying MT5 history...",
    bookmarks: "Research bookmarks",
    saveBookmark: "Save current bookmark",
    noBookmarks: "No bookmarks saved on this browser.",
    priceActionReadout: "Price-action readout",
    currentClosedBar: "Current closed bar",
    currentConcepts: "Current concepts",
    namedCandleEvidence: "Named candle evidence",
    nextBarObservation: "Next-bar observation",
    historicalValidation: "Historical validation",
    miniAnaloguePreview: "Mini analogue preview",
    selectedConceptEvidence: "Selected concept evidence",
    pdfConceptLens: "PDF concept lens",
    pdfSelectConcept: "Select a concept",
    pdfClickMarker: "Click a chart marker or concept to load the source-grounded explanation.",
    pdfLookFor: "Look for",
    pdfAbstain: "ABSTAIN",
    pdfSourceNotesOnly: "source-note observation only; no source-qualified detector",
    pdfNotDetected: "not currently detected",
    patternCensus: "Pattern census | retained M5 tape",
    patternWindow: "Pattern window",
    evidenceReceipt: "Evidence receipt",
    sourceCoverageDisclosure: "Other timeframes are not inferred from this chart. No synthetic event timeline or placeholder directional percentage is generated.",
    m5Cutoff: "M5 cutoff (UTC)",
    fallbackReason: "Fallback reason",
    mt5Refresh: "MT5 refresh",
    mt5Assembly: "MT5 assembly",
    cacheChunks: "Cache / chunks",
    accountScope: "Account scope",
    actualUtcRange: "Actual UTC range",
    runtimeAttestation: "Runtime attestation",
    barContract: "Bar contract",
    barContractValue: "UTC · closed candles only · no forming bar",
    coverageAcceptance: "MT5 history is accepted only with complete coverage, UTC timestamps, closed-bar provenance, read-only authority, explicit no-live-apply status, and account-scoped cache validation. Incomplete broker history falls back to the labelled local snapshot.",
    currentNamedCandleAria: "Current named candle evidence",
    currentNamedCandleUnavailable: "Current closed bar has no named candle pattern, or the causal tape is not ready.",
    namedCandleConditionalNote: "Conditional H+1 evidence is descriptive and shrinkage-aware; it never enters the aggregate forecast consensus or order authority.",
    namedCandlePatternEndpoints: "historical named-pattern endpoints are annotated on the chart.",
    namedCandleFamilyEndpoints: "historical named-candle family endpoints are annotated on the chart.",
    namedCandleFilterPrompt: "Select a named-pattern or family filter to overlay retained historical endpoints on the chart.",
    namedCandleLens: "named candle lens",
    namedCandleFamilyLens: "named candle family lens",
    descriptiveTaxonomy: "descriptive taxonomy",
    familyAuthority: "Family evidence remains SHADOW_ONLY / NO_DECISION; it does not establish LONG or SHORT authority.",
    forecastGateChecks: "Forecast gate checks",
    verifiedHistoryGate: "Verified MT5 closed-bar history gate",
    freshnessGate: "Latest closed-bar freshness gate",
    walkForwardGate: "Chronological walk-forward coverage gate",
    supportGate: "Effective causal support gate",
    analogueGate: "Independent analogue coverage gate",
    marginGate: "Consensus margin gate",
    causalMetaGate: "Causal support metadata gate",
    latestClosed: "latest closed",
    forecastEvidence: "Forecast evidence",
    forecastCompleteTape: "Forecast uses the complete retained M5 tape.",
    forecastOmittedBars: "earlier retained bars omitted for interactive forecast latency.",
    forecastGates: "Forecast gates",
    noForecastDistribution: "No causal analogue distribution yet.",
    noCausalAnalogueWindow: "No historical analogue window available.",
    currentHistoricalInspection: "Current and historical pattern inspection",
    currentPatternDescriptive: "PDF lens and geometry are descriptive; no order authority.",
    patternCensusRegion: "Retained M5 pattern census; scroll for all concepts",
    patternCensusWaiting: "Waiting for complete closed-bar evidence.",
    patternCensusColumns: "Columns: occurrences | next-bar hit rate | CI95 Wilson interval | LONG/SHORT split | UP/DOWN/FLAT.",
    patternCensusCoverage: "CI95 Wilson interval shown per row. Quantified detector coverage",
    patternCensusOther: "Other PDF concepts are shown as bounded descriptive observations; source-qualified outcomes remain withheld.",
    patternWindowAriaPrefix: "Pattern window inspection",
    historicalOccurrence: "Historical",
    historicalOccurrencePending: "pending",
    currentSetupWindow: "Closed candles around the current setup; LONG/SHORT labels describe the setup observation only.",
    noDetectorWindow: "No selected detector window; click a chart marker or choose a detected concept.",
    evidenceReceiptLatest: "latest closed",
    selectedHistoricalAnalogue: "Selected historical analogue",
    previewUnavailable: "Preview unavailable",
    mainChartEndpointFocused: "Main chart endpoint focused",
    previewOnlyAlign: "Preview only · use Show on chart to align the main chart",
    researchEvidenceOnly: "Research evidence only · SHADOW_ONLY · NO_DECISION · no order authority.",
    closedEvidence: "closed M5 evidence",
    forecastGateGroup: "Forecast gate checks",
    gateHistory: "HISTORY",
    gateFreshness: "FRESHNESS",
    gateWalkForward: "WF",
    gateSupport: "SUPPORT",
    gateAnalogues: "ANALOGUES",
    gateMargin: "MARGIN",
    gateCausalMeta: "CAUSAL META",
    gateReady: "READY",
    gateWait: "WAIT",
    gateFresh: "FRESH",
  };
  const readOnlyLabel = t("readOnly");
  const requestedSymbol = focused ? "XAUUSD" : getActiveSymbol();
  // Chart-only is the default presentation for the focused home surface. Keep
  // the explicit context opt-out in sessionStorage so a reload preserves the
  // user's choice. It is intentionally outside snapshots.
  const [chartOnly, setChartOnly] = useState(() => focused ? readFocusedChartOnlyPreference() : false);
  useEffect(() => {
    if (!focused) { setChartOnly(false); return; }
    setChartOnly(readFocusedChartOnlyPreference());
  }, [focused]);
  useEffect(() => {
    if (!focused) return;
    try { sessionStorage.setItem(FOCUSED_CHART_ONLY_KEY, chartOnly ? "1" : "0"); } catch { /* storage unavailable */ }
  }, [focused, chartOnly]);
  useEffect(() => {
    if (!focused) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "c" || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target?.tagName || "")) return;
      event.preventDefault();
      setChartOnly((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focused]);
  const [liveAdv, setLiveAdv] = useState<TradeAdvice | null>(null);
  const [bars, setBars] = useState<OhlcBar[] | null>(null);
  // M5 is the canonical inspection frame for the XAUUSD microscope. Users
  // can still switch timeframe or load a CSV with an explicit frame.
  const [tf, setTf] = useState<string>("M5");
  const [source, setSource] = useState<"Live" | "CSV" | "Replay">("Live");
  const [verifiedM5History, setVerifiedM5History] = useState<Mt5ThreeYearHistory | null>(null);
  const [verifiedM5HistoryState, setVerifiedM5HistoryState] = useState<"idle" | "loading" | "ready" | "fallback">(() => focused ? "loading" : "idle");
  const [verifiedM5HistoryReason, setVerifiedM5HistoryReason] = useState<string | null>(null);
  const [verifiedM5RefreshReason, setVerifiedM5RefreshReason] = useState<string | null>(null);
  // Keep the read-only closed-bar age current while the focused chart is idle.
  // The timer is scoped to focused mode so legacy diagnostics do not gain a
  // background render loop.
  const [focusedClockNowMs, setFocusedClockNowMs] = useState(() => Date.now());
  const [calendarRevision, setCalendarRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setCalendarRevision((value) => value + 1);
    window.addEventListener("mfe-workspace-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("mfe-workspace-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const configuredEconomicCalendar = useMemo(
    () => readConfiguredEconomicCalendar(),
    [calendarRevision],
  );
  const [pdfAssumptions, setPdfAssumptions] = useState<PdfAssumptionsValue>(EMPTY_PDF_ASSUMPTIONS);
  const pdfDetectorInputs = useMemo(() => {
    const bracket = pdfAssumptions.bracket;
    const sizing = pdfAssumptions.sizing;
    const reversal = pdfAssumptions.reversal;
    const completeBracket = [bracket.entryPrice, bracket.stopPrice, bracket.targetPrice].every((value) => value != null)
      ? {
        entryPrice: bracket.entryPrice!, stopPrice: bracket.stopPrice!, targetPrice: bracket.targetPrice!,
        ...(bracket.spreadPrice != null ? { spreadPrice: bracket.spreadPrice } : {}),
        ...(bracket.slippagePrice != null ? { slippagePrice: bracket.slippagePrice } : {}),
        ...(bracket.commissionQuote != null ? { commissionQuote: bracket.commissionQuote } : {}),
        unit: bracket.unit, source: bracket.provenance,
      }
      : undefined;
    const completeSizing = [sizing.equity, sizing.riskPct, sizing.stopDistance, sizing.contractSize, sizing.lotStep, sizing.minLot].every((value) => value != null)
      ? {
        equity: sizing.equity!, riskPct: sizing.riskPct!, stopDistance: sizing.stopDistance!, contractSize: sizing.contractSize!, lotStep: sizing.lotStep!, minLot: sizing.minLot!,
      }
      : undefined;
    const reversalEvent = reversal.eventTime.trim() && reversal.identity.trim()
      ? { time: reversal.eventTime.trim(), identity: reversal.identity.trim() }
      : undefined;
    return {
      bracket: completeBracket,
      sizing: completeSizing,
      reversalLevel: reversal.level ?? undefined,
      reversalEvent,
    };
  }, [pdfAssumptions]);
  useEffect(() => {
    if (!focused) return;
    const timer = window.setInterval(() => setFocusedClockNowMs(Date.now()), FOCUSED_CLOCK_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [focused]);
  // A focused session can outlive the bridge/terminal startup. Keep retries
  // explicit so a fallback can be promoted without forcing a full page reload.
  const [historyRetryNonce, setHistoryRetryNonce] = useState(0);
  const focusedTerminalGeneration = useTerminalGeneration(focused);
  useEffect(() => { if (focused && getActiveSymbol() !== "XAUUSD") setActiveSymbol("XAUUSD"); }, [focused]);
  const [m1Years, setM1Years] = useState<M1Year[]>([]);          // available M1 yearly chunks (11y)
  const [m1Year, setM1Year] = useState("2025");                  // which M1 year to replay
  useEffect(() => {
    if (focused) return;
    let alive = true;
    import("../adapters/loadSimOhlc.ts").then(({ loadM1Years }) => loadM1Years()).then((ys) => {
      if (alive && ys.length) { setM1Years(ys); setM1Year(ys[ys.length - 1].year); }
    }).catch(() => { if (alive) setM1Years([]); });
    return () => { alive = false; };
  }, [focused]);
  useEffect(() => {
    if (!focused || source !== "Live" || tf !== "M5") {
      setVerifiedM5History(null);
      setVerifiedM5HistoryState("idle");
      setVerifiedM5HistoryReason(null);
      setVerifiedM5RefreshReason(null);
      return;
    }
    let alive = true;
    setVerifiedM5History(null);
    setVerifiedM5HistoryState("loading");
    setVerifiedM5HistoryReason(null);
    setVerifiedM5RefreshReason(null);
    mt5ThreeYearHistory(requestedSymbol, "M5").then((result) => {
      if (!alive) return;
      if (isVerifiedClosedBarHistory(result, requestedSymbol, "M5")) {
        setVerifiedM5History(result);
        setVerifiedM5HistoryState("ready");
        setVerifiedM5HistoryReason(null);
        setVerifiedM5RefreshReason(null);
      } else {
        setVerifiedM5HistoryState("fallback");
        // Keep the rejection reason actionable: a generic partial-history
        // reason alone hides whether the broker or the local terminal capped
        // retention. Preserve the explicit limit source in the user-facing
        // fallback state without promoting the rejected tape.
        setVerifiedM5HistoryReason(isOffline(result)
          ? (result.error || "MT5_HISTORY_REQUEST_OFFLINE")
          : (() => {
            const rejected = result as { reason?: string; detail?: string; retentionSource?: string; terminalMaxBars?: number };
            const reason = rejected.reason || rejected.detail || "MT5_HISTORY_PROMOTION_REJECTED";
            const source = rejected.retentionSource === "BROKER_RETENTION"
              ? "BROKER_RETENTION"
              : rejected.retentionSource === "TERMINAL_MAX_BARS"
                ? `TERMINAL_MAX_BARS${rejected.terminalMaxBars ? `(${rejected.terminalMaxBars})` : ""}`
                : null;
            return source ? `${reason} | ${source}` : reason;
          })());
      }
    }).catch(() => {
      if (!alive) return;
      setVerifiedM5HistoryState("fallback");
      setVerifiedM5HistoryReason("MT5_HISTORY_REQUEST_FAILED");
    });
    return () => { alive = false; };
  }, [focused, source, tf, requestedSymbol, historyRetryNonce, focusedTerminalGeneration]);
  // Once the two-year tape is promoted, keep its newest closed candle current
  // without re-running the heavy three-year assembly on every render. The
  // refresh probes two closed bars, then heals the exact gap through the
  // account-scoped catch-up contract. Forming bars never enter the chart.
  useEffect(() => {
    if (!focused || source !== "Live" || tf !== "M5" || verifiedM5HistoryState !== "ready" || !verifiedM5History) return;
    let alive = true;
    let controller: AbortController | null = null;
    const refresh = async () => {
      if (!alive || controller) return;
      controller = new AbortController();
      try {
        const result = await refreshFocusedM5History(verifiedM5History, requestedSymbol, controller.signal);
        if (!alive || controller.signal.aborted) return;
        if (!result.changed) {
          setVerifiedM5RefreshReason(result.reason || null);
          return;
        }
        setVerifiedM5History(result.history);
        setVerifiedM5HistoryReason(null);
        setVerifiedM5RefreshReason(null);
      } catch { if (alive) setVerifiedM5RefreshReason("MT5_REFRESH_REQUEST_FAILED"); }
      finally { controller = null; }
    };
    const timer = window.setInterval(refresh, FOCUSED_M5_REFRESH_MS);
    return () => { alive = false; window.clearInterval(timer); controller?.abort(); };
  }, [focused, source, tf, verifiedM5HistoryState, verifiedM5History, requestedSymbol]);
  const [zoneOn, setZoneOn] = useState<Record<string, boolean>>({ observation: true, risk: true, demand: true, sweep: true, invalidation: true });

  const [csvBars, setCsvBars] = useState<OhlcBar[] | null>(null); const [csvName, setCsvName] = useState(""); const [csvErr, setCsvErr] = useState(""); const [csvErrDisplay, setCsvErrDisplay] = useState(""); const [csvWarnings,setCsvWarnings]=useState<string[]>([]);
  const [csvMeta,setCsvMeta]=useState<CsvImportMetadata|null>(null);
  const [csvRange,setCsvRange]=useState<{from:string;to:string}|undefined>();
  // CSV error copy is legacy-only. Keep the focused XAUUSD M5 graph free of
  // the mapper and load it only when a legacy CSV error is actually visible.
  useEffect(() => {
    if (focused || !csvErr) { setCsvErrDisplay(""); return; }
    let alive = true;
    import("../lib/researchErrors.ts").then(({ explainResearchError }) => {
      if (alive) setCsvErrDisplay(explainResearchError(csvErr));
    }).catch(() => { if (alive) setCsvErrDisplay(csvErr); });
    return () => { alive = false; };
  }, [focused, csvErr]);
  function openCsv(meta:CsvImportMetadata){setActiveSymbol(meta.symbol);setCsvMeta(meta);setCsvRange(undefined);setSource('CSV');setStage('Y10');setMaxStage(0);import("../lib/artifactRegistry.ts").then(({ readStrategyCards }) => { setActiveId(current=>{const selected=readStrategyCards().find((card:any)=>card.id===current);return selected&&(selected.symbol||'XAUUSD')!==meta.symbol?null:current;}); }).catch(() => setActiveId(null));setTf(focused ? 'M5' : meta.tf);setRunning(false);setCursor(null);setAutoCascade(false);localStorage.setItem(CSV_SELECTED_KEY,meta.id);}

  useEffect(()=>{if(focused || localStorage.getItem('mfe_microscope_preselect'))return;const selected=localStorage.getItem(CSV_SELECTED_KEY);if(!selected)return;let alive=true;import("../lib/csvImports.ts").then(({listCsvImports})=>listCsvImports()).then(rows=>{const meta=rows.find(x=>x.id===selected);if(alive&&meta)openCsv(meta);}).catch(e=>{if(alive)setCsvErr(e.message);});return()=>{alive=false;};},[focused]);
  // -- Strategy Replay Runner: bring a packaged Strategy Card here and run it (Advisory auto / Paper suggest) --
  const [library, setLibrary] = useState<any[]>([]);
  useEffect(() => {
    if (focused) { setLibrary([]); return; }
    let alive = true;
    let cleanup = () => {};
    import("../lib/artifactRegistry.ts").then(({ readStrategyCards, subscribeArtifactChanges }) => {
      if (!alive) return;
      setLibrary(readStrategyCards());
      cleanup = subscribeArtifactChanges(() => setLibrary(readStrategyCards()));
    }).catch(() => { if (alive) setLibrary([]); });
    return () => { alive = false; cleanup(); };
  }, [focused]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [autoCascade, setAutoCascade] = useState(false);   // arriving via Lab "-> Ch¡º¡y ¡»Å¸ Microscope" → auto-run Y10→M6→M1 then return to Lab
  // arriving from Strategy Lab "-> Ch¡º¡y ¡»Å¸ Microscope": preselect the card + start in Replay (Y10 first) + auto-run the cascade
  useEffect(() => { if (focused) return; try { const pre = localStorage.getItem("mfe_microscope_preselect"); if (pre) { localStorage.removeItem("mfe_microscope_preselect"); setActiveId(pre); setSource("Replay"); setAutoCascade(true); } } catch { /* ignore */ } }, [focused]);   // eslint-disable-line
  const [running, setRunning] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [speed, setSpeed] = useState(2);
  // FORCED cascade: one realistic engine on Y10 → M6 → M1. maxStage = highest unlocked (0=only Y10). The user
  // must DUY¡»'¬ T each window before the next unlocks → can't judge a card on a lucky recent month. Resets per card.
  const [stage, setStage] = useState<Stage>("Y10");
  const [maxStage, setMaxStage] = useState(0);
  const [designBars, setDesignBars] = useState<OhlcBar[] | null>(null);
  const runTimer = useRef<number | null>(null);
  const activeCard = library.find((c: any) => c.id === activeId) || null;
  const [cmpId, setCmpId] = useState<string>("");   // COMPARE: card/Beast th¡»© 2 ch¡º¡y song song c¹ng c¡»­a s¡»'¬c
  const autoRR = !!(activeCard && Array.isArray(activeCard.modules) && activeCard.modules.includes("auto_rr"));
  // -- REALISTIC SIM (P0): card runs on its OWN design_tf (full sim history), next-open fill + costs --
  const designTf = activeCard ? getCardRuntimeConfig(activeCard).design_tf : "H1";
  // DOCTRINE: the CARD decides its entry TF (design_tf) — the Chart TF must NOT change which TF the
  // strategy trades on. So when a card is active, LOCK the chart to the card's design_tf (Chart TF = view
  // only / follows the card). The TF selector is free only when no card is loaded. Fixes "entries followed
  // my Chart TF instead of the card deciding".
  useEffect(() => { if (focused) setTf("M5"); else if (activeCard) setTf(designTf); }, [focused, activeId, designTf, csvMeta?.id, source]);   // eslint-disable-line
  useEffect(()=>{
    if(focused||source!=='CSV'||!csvMeta)return;const controller=new AbortController();setCsvBars(null);setBars(null);setCsvErr('');setCsvWarnings(['Loading imported data…']);
    import("../lib/csvImports.ts").then(({readCsvView})=>readCsvView(csvMeta.id,activeCard?designTf:tf,csvRange,controller.signal)).then(view=>{if(controller.signal.aborted)return;setCsvBars(view.bars);setBars(view.bars);setCsvName(`${csvMeta.symbol} | ${csvMeta.filename} | ${view.bars.length.toLocaleString()} bars (${activeCard?designTf:tf})`);setCsvErr('');setCsvWarnings(csvMeta.warnings);}).catch(e=>{if(!controller.signal.aborted){setCsvWarnings([]);setCsvErr(e.message);}});return()=>controller.abort();
  },[source,csvMeta?.id,tf,designTf,activeId,csvRange?.from,csvRange?.to]);
  const [calib, setCalib] = useState<BrokerCalibrationInput | null>(null);
  useEffect(() => {
    if (focused) { setCalib(null); return; }
    let alive = true;
    import("../lib/brokerCalibration.ts").then(({ loadBrokerCalibration }) => loadBrokerCalibration(getActiveSymbol())).then((value) => {
      if (alive) setCalib(value);
    }).catch(() => { if (alive) setCalib(null); });
    return () => { alive = false; };
  }, [focused]);
  const [capital, setCapital] = useState(10000);   // funding mode
  const [riskPct, setRiskPct] = useState(0.75);
  // Custom module definitions belong to the legacy replay surface. Keep the
  // focused XAUUSD M5 graph free of its registry and hydrate it only when a
  // legacy route actually needs to run a card.
  const [customMods, setCustomMods] = useState<any[]>([]);
  useEffect(() => {
    if (focused) { setCustomMods([]); return; }
    let alive = true;
    import("../lib/customModule.ts").then(({ loadCustomModules }) => {
      if (alive) setCustomMods(loadCustomModules());
    }).catch(() => { if (alive) setCustomMods([]); });
    return () => { alive = false; };
  }, [focused]);
  const [hardMode, setHardMode] = useState(false);   // HARD broker realism (xcost + min-stop floor) — replay stress test
  useEffect(() => { setStage(source === "Live" ? "M1" : "Y10"); setMaxStage(0); }, [activeId]);   // eslint-disable-line
  // Y10/M6 use the RAW static historical tape (includeExt=false) — NOT the live-backfilled one, so the live
  // feed can't contaminate the historical windows / shift their anchor. M1 (live) reads the live `bars` instead.
  useEffect(() => { if (focused || !activeCard) return; setDesignBars(null); import("../adapters/loadSimOhlc.ts").then(({ loadSimOhlc }) => loadSimOhlc(designTf, false)).then((d) => setDesignBars(d?.bars || null)); }, [focused, activeId, designTf]);
  // SOURCE-split windows (disjoint, time-ordered): Y10/M6 = historical REPLAY tape | M1 = LIVE last-month feed.
  // M1 slices the live bars (so it's the genuine forward month); Y10/M6 slice the historical designBars.
  const stageBars = useMemo(() => {
    if (source === "CSV") return csvBars || [];
    if (stage === "M1" && source === "Live" && bars && bars.length) return sliceForStage(bars, "M1");
    return sliceForStage(designBars, stage);
  }, [stage, source, bars, csvBars, designBars]);
  // -- P2 INTRABAR (execution_tf < design_tf): run the M1-master path so the card enters EARLY inside the design bar.
  // Only on a tractable REPLAY window (M1 €°Ë† designBars x TF_MINUTES[designTf] €°¤ cap). Y10 / live stay design-close (honest badge).
  const execTf = activeCard ? getCardRuntimeConfig(activeCard).allowed_execution_tf : designTf;
  const wantIntrabar = execTf !== designTf && TF_MINUTES[execTf] < TF_MINUTES[designTf];
  const INTRABAR_M1_CAP = 650_000;   // ~ up to a year of H1 at M1 resolution — keeps resample/group snappy in-browser
  const estM1 = stageBars.length * TF_MINUTES[designTf];
  const intrabarFeasible = wantIntrabar && source === "Replay" && stageBars.length > 60 && estM1 <= INTRABAR_M1_CAP;
  const [m1Win, setM1Win] = useState<OhlcBar[] | null | undefined>(null);   // undefined = loading ? null = not loaded/empty ? []>60 = ready
  const winFrom = stageBars.length ? String(stageBars[0].t) : "", winTo = stageBars.length ? String(stageBars[stageBars.length - 1].t) : "";
  useEffect(() => {
    if (!intrabarFeasible) { setM1Win(null); return; }
    let alive = true; setM1Win(undefined);
    import("../adapters/loadSimOhlc.ts").then(({ loadM1Range }) => loadM1Range(winFrom, winTo)).then((bs) => { if (alive) setM1Win(bs && bs.length > 60 ? bs : null); }).catch(() => { if (alive) setM1Win(null); });
    return () => { alive = false; };
  }, [intrabarFeasible, winFrom, winTo, execTf]);
  const useM1Job = source==="CSV" ? csvMeta?.tf==="M1" : intrabarFeasible && !!m1Win && m1Win.length > 60;
  const waitingForM1 = intrabarFeasible && m1Win === undefined;
  // Stable inputs let the lazy legacy controller publish results without
  // retriggering its effects. Focused home never mounts its backtest hooks.
  const researchOptions = useMemo(() => ({ symbol: requestedSymbol, chartTf: tf, withWalkForward: source!=="CSV"&&stage === "Y10", walkForwardFolds: 5, calibration: calib || undefined, capital, riskPct, customModules: customMods, hard: hardMode }), [requestedSymbol, tf, source, stage, calib, capital, riskPct, customMods, hardMode]);
  const csvReference = useMemo(() => source === "CSV" && csvMeta ? { id: csvMeta.id, windowTf: activeCard ? designTf : tf } : undefined, [source, csvMeta?.id, activeCard, designTf, tf]);
  const cmpCard = library.find((c: any) => c.id === cmpId) || null;
  const legacyResearchInputs = useMemo(() => ({
    primaryBars: waitingForM1 ? null : source !== "CSV" && useM1Job ? m1Win : stageBars,
    primaryCard: activeCard,
    compareBars: source === "CSV" ? null : stageBars,
    compareCard: cmpCard,
    options: researchOptions,
    primaryMode: useM1Job ? "m1" as const : "design" as const,
    primaryHistorical: source === "Replay",
    source,
    primaryStage: source === "CSV" ? undefined : stage,
    csvReference,
    compareStage: stage,
  }), [focused, waitingForM1, source, useM1Job, m1Win, stageBars, activeCard, cmpCard, researchOptions, stage, csvReference]);
  const [legacyResearchState, setLegacyResearchState] = useState<{ inputs: typeof legacyResearchInputs; jobs: LegacyResearchJobsSnapshot } | null>(null);
  const onLegacyResearchState = useCallback((jobs: LegacyResearchJobsSnapshot) => {
    setLegacyResearchState({ inputs: legacyResearchInputs, jobs });
  }, [legacyResearchInputs]);
  // Input identity gates every reported result immediately. A previous Card,
  // tape or options result cannot flash while the lazy child updates its hooks.
  const legacyResearchJobs = !focused && legacyResearchState?.inputs === legacyResearchInputs ? legacyResearchState.jobs : EMPTY_LEGACY_RESEARCH_JOBS;
  const primaryJob = legacyResearchJobs.primary;
  const compareJob = legacyResearchJobs.compare;
  const realisticBt = primaryJob.result;
  const cmpBt = compareJob.result;
  // honest intrabar status for the badge
  const intrabarStatus = !wantIntrabar ? "off"
    : realisticBt?.intrabar ? "on"
    : intrabarFeasible && m1Win === undefined ? "loading"
    : "blocked";   // wanted but window too large / live / load failed → design-close
  const panelBt = realisticBt;
  // lock the stages whose feed €°  current source (Y10/M6 need Replay, M1 needs Live) + keep stage in sync.
  const sourceLock = useMemo<Partial<Record<Stage, string>>>(() => ({
    Y10: source === "Live" ? "Long-history validation uses the historical Replay source" : undefined,
    M6: source === "Live" ? "Six-month OOS validation uses the historical Replay source" : undefined,
    M1: source !== "Live" ? "The one-month holdout can be historical Replay or an observed forward feed; the receipt identifies its source" : undefined,
  }), [source]);
  useEffect(() => { if (source === "Live") setStage("M1"); else if (stage === "M1") setStage("Y10"); }, [source]);   // eslint-disable-line
  const stageRange = useMemo(() => (stageBars.length ? { from: String(stageBars[0].t).replace("T", " ").slice(0, 16), to: String(stageBars[stageBars.length - 1].t).replace("T", " ").slice(0, 16) } : null), [stageBars]);
  const stageIdx = stage === "M1" ? 2 : stage === "M6" ? 1 : 0;   // M1 reachable only after Y10+M6 are DUY¡»€ T'd (maxStage€°¥2)
  // six-TF render context (visual only): when a Replay year is picked, resample all 6 TF from one M1 master.
  const [yearAllTf, setYearAllTf] = useState<YearAllTf | null>(null);
  useEffect(() => {
    if (focused || source !== "Replay" || !m1Year) return;
    let alive = true;
    setYearAllTf(null);
    import("../lib/m1MasterData.ts").then(({ loadYearAllTfFromM1 }) => loadYearAllTfFromM1(m1Year)).then((value) => {
      if (alive) setYearAllTf(value);
    }).catch(() => { if (alive) setYearAllTf(null); });
    return () => { alive = false; };
  }, [focused, source, m1Year]);
  // -- UNIFIED REPLAY -- the chart, cursor, markers and Trade Log all run on the SAME realistic engine + stage
  // window as the result table below (one engine of record). No more legacy gross sim over the full feed — so the
  // Trade Log count now EQUALS analytics.n (both = realisticBt.sim.trades.length) and the dates match the window.
  const replayBars = (activeCard && realisticBt) ? (realisticBt.designBars ?? stageBars) : (bars ?? EMPTY_OHLC_BARS);   // intrabar (M1-master) renders its OWN resampled designBars so markers index-align
  const detectorBars = useMemo(
    () => focused ? closedBarsForFocusedResearch(bars ?? [], tf) : replayBars,
    [focused, bars, tf, replayBars],
  );
  // The full retained tape remains the source for the asynchronous census and
  // replay navigation. Keep synchronous PDF inspection bounded to the recent
  // closed prefix so a two-year M5 load cannot freeze the focused surface.
  const focusedPdfAnalysisBars = useMemo(
    () => focused && tf === "M5" ? detectorBars.slice(-M5_FORECAST_TAPE_LIMIT) : detectorBars,
    [focused, tf, detectorBars],
  );
  // Focused chart geometry must use the same closed-bar tape as the detector;
  // the MicroChart itself may append a forming candle for visual context.
  const researchBars = focused && tf === "M5" ? detectorBars : (bars ?? []);
  const { result: priceAction, status: priceActionScanStatus, retry: retryPriceActionScan } = usePriceActionAnalysis(detectorBars, tf, requestedSymbol);
  const priceActionScanMessage = priceActionScanStatus === "loading" ? focusedCopy.scanPending
    : priceActionScanStatus === "error"
      ? focusedCopy.scanFailed
      : priceActionScanStatus === "idle" ? focusedCopy.waitingClosed : focusedCopy.scanComplete;
  const currentPriceActionSignals = useMemo<SignalMarker[]>(() => (priceAction?.markers || []).map(priceActionMarkerToSignal), [priceAction]);
  const allPdfSignalResult = useMemo(() => {
    if (!focused || tf !== "M5" || !detectorBars.length) return null;
    if (!focusedPdfAnalysisBars.length) return null;
    const latest = focusedPdfAnalysisBars[focusedPdfAnalysisBars.length - 1];
    return detectAllPdfSignals({
      bars: focusedPdfAnalysisBars,
      selectedTime: latest.t,
      enabled: verifiedM5HistoryState === "ready" || source !== "Live",
      calendar: configuredEconomicCalendar,
      ...pdfDetectorInputs,
      nowMs: focusedClockNowMs,
    });
  }, [focused, tf, focusedPdfAnalysisBars, verifiedM5HistoryState, source, focusedClockNowMs, configuredEconomicCalendar, pdfDetectorInputs]);
  const pdfSignalVerificationInput = useMemo(() => {
    if (!focused || tf !== "M5" || !detectorBars.length || !focusedPdfAnalysisBars.length) return null;
    const latest = focusedPdfAnalysisBars[focusedPdfAnalysisBars.length - 1];
    return {
      bars: focusedPdfAnalysisBars,
      selectedTime: latest.t,
      enabled: verifiedM5HistoryState === "ready" || source !== "Live",
      calendar: configuredEconomicCalendar,
      ...pdfDetectorInputs,
      nowMs: focusedClockNowMs,
    };
  }, [focused, tf, detectorBars.length, focusedPdfAnalysisBars, verifiedM5HistoryState, source, focusedClockNowMs, configuredEconomicCalendar, pdfDetectorInputs]);
  const pdfSignalVerificationSource = verifiedM5HistoryState === "ready" && source === "Live"
    ? "VERIFIED_MT5_CLOSED" as const
    : "LOCAL_SNAPSHOT" as const;
  const { result: pdfSignalVerification } = usePdfSignalVerification(
    pdfSignalVerificationInput,
    pdfSignalVerificationSource,
    !!pdfSignalVerificationInput,
  );
  const pdfSignalStatisticsEnabled = focused && tf === "M5" && detectorBars.length >= 2
    && (verifiedM5HistoryState === "ready" || verifiedM5HistoryState === "fallback" || source !== "Live");
  const currentPdfSourceSignals = useMemo<SignalMarker[]>(() => (allPdfSignalResult?.observations || [])
    .filter((observation) => observation.sourceStatus === "SOURCE_REVIEW_ONLY")
    .map((observation) => {
      const signal = pdfSourceObservationToSignal(observation, focusedPdfAnalysisBars);
      if (!signal) return null;
      const offset = detectorBars.length - focusedPdfAnalysisBars.length;
      return { ...signal, i: signal.i + offset };
    })
    .filter((signal): signal is SignalMarker => !!signal), [allPdfSignalResult, detectorBars, focusedPdfAnalysisBars]);
  // The bounded atlas tape is only consumed by the focused M5 evidence
  // surface. Legacy replay routes can carry a much larger design tape; keep
  // that tape out of a second 6,000-row allocation entirely.
  const m5AtlasBars = useMemo(() => focused ? detectorBars.slice(-M5_FORECAST_TAPE_LIMIT) : [], [focused, detectorBars]);
  const { result: m5Atlas, status: candleAtlasStatus, retry: retryCandleAtlas } = useCandleAtlas(m5AtlasBars, focused && tf === "M5", requestedSymbol);
  const candleAtlasMessage = candleAtlasStatus === "loading" ? focusedCopy.atlasPending : focusedCopy.atlasFailed;
  const currentNamedCandleSignals = useMemo<SignalMarker[]>(() => {
    if (!focused || tf !== "M5" || !m5Atlas?.currentPatterns?.length || !detectorBars.length) return [];
    const bar = detectorBars[detectorBars.length - 1];
    return m5Atlas.currentPatterns.map((pattern) => namedCandlePatternToSignal(pattern, detectorBars.length - 1, bar));
  }, [focused, tf, m5Atlas?.asOf, m5Atlas?.currentPatterns, detectorBars.length, detectorBars[detectorBars.length - 1]?.t]);
  const [analoguePreviewIndex, setAnaloguePreviewIndex] = useState(0);
  const [analoguePatternFilter, setAnaloguePatternFilter] = useState<NamedCandlePattern | null>(null);
  const [analogueFamilyFilter, setAnalogueFamilyFilter] = useState<NamedCandleFamily | null>(null);
  const [showHistoricalTape, setShowHistoricalTape] = useState(true);
  const historicalNamedCandleSignals = useMemo<SignalMarker[]>(() => {
    if (!focused || tf !== "M5" || !showHistoricalTape || (!analoguePatternFilter && !analogueFamilyFilter) || !m5Atlas?.matches?.length) return [];
    return m5Atlas.matches
      .filter((match) => (match.patterns ?? []).some((pattern) => analoguePatternFilter ? pattern === analoguePatternFilter : getNamedCandleKnowledge(pattern)?.family === analogueFamilyFilter))
      .flatMap((match) => (match.patterns ?? []).filter((pattern) => analoguePatternFilter ? pattern === analoguePatternFilter : getNamedCandleKnowledge(pattern)?.family === analogueFamilyFilter).map((pattern) => ({ match, pattern })))
      .map((match) => {
        const atlasIndex = detectorBars.length - m5AtlasBars.length + match.match.endIndex;
        const index = focusedSnapshotTimestampsEqual(detectorBars[atlasIndex]?.t, match.match.time)
          ? atlasIndex
          : detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, match.match.time));
        const bar = index >= 1 ? detectorBars[index] : undefined;
        return bar ? namedCandleHistoricalToSignal(match.pattern, match.match, index, bar) : null;
      })
      .filter((signal): signal is SignalMarker => !!signal);
  }, [focused, tf, showHistoricalTape, analoguePatternFilter, analogueFamilyFilter, m5Atlas?.asOf, m5Atlas?.matches, detectorBars, m5AtlasBars.length]);
  // Family overlays can emit several descriptive labels for one endpoint.
  // Keep the disclosure denominator at unique UTC endpoints so it agrees with
  // the family filter's endpoint statistics while retaining each marker.
  const historicalNamedCandleEndpointCount = useMemo(
    () => new Set(historicalNamedCandleSignals.map((signal) => signal.time)).size,
    [historicalNamedCandleSignals],
  );
  const pendingAnalogueMatchRef = useRef<{ index: number | null; time: string | null; patternFilter: NamedCandlePattern | null; familyFilter: NamedCandleFamily | null } | null>(null);
  useEffect(() => {
    // A symbol/timeframe change starts a new analogue context. A normal closed
    // bar refresh must preserve the user's selected filter and let the UTC
    // focus reconciliation below decide whether its endpoint still exists.
    resetAnalogueSelection(null, null);
  }, [requestedSymbol, tf]);
  useEffect(() => {
    const pending = pendingAnalogueMatchRef.current;
    const matches = (m5Atlas?.matches || []).filter((match) => (match.patterns ?? []).some((pattern) => (!pending?.patternFilter || pattern === pending.patternFilter) && (!pending?.familyFilter || getNamedCandleKnowledge(pattern)?.family === pending.familyFilter)));
    if (!pending) return;
    if (pending.patternFilter) setAnaloguePatternFilter(pending.patternFilter);
    if (pending.familyFilter) setAnalogueFamilyFilter(pending.familyFilter);
    if (!matches.length) {
      // Keep a restored filter from inheriting an ordinal selected in the
      // previous session, even when this bounded tape currently has no
      // matching endpoints.
      setAnaloguePreviewIndex(0);
      // Keep a pending restore while the Atlas is still loading, but discard
      // it once a computed tape is present and cannot satisfy the saved filter.
      if (m5Atlas) pendingAnalogueMatchRef.current = null;
      return;
    }
    const byTime = pending.time ? matches.findIndex((match) => focusedSnapshotTimestampsEqual(match.time, pending.time)) : -1;
    // An explicit UTC endpoint is authoritative. If retention removed it,
    // fail closed instead of reusing an ordinal that may now identify another
    // candle; ordinal compatibility applies only to older snapshots without
    // a saved timestamp.
    let resolved = byTime >= 0 ? byTime : pending.index != null && pending.index >= 0 && pending.index < matches.length ? pending.index : -1;
    if (pending.time != null && byTime < 0) resolved = -1;
    // A snapshot may intentionally retain only the named-pattern filter, or
    // its saved endpoint may have expired from the bounded tape. In either
    // case, clear any prior session ordinal instead of showing an unrelated
    // match under the restored filter.
    setAnaloguePreviewIndex(resolved >= 0 ? resolved : 0);
    pendingAnalogueMatchRef.current = null;
  }, [m5Atlas]);
  // `undefined` means no explicit lens has been chosen yet (so the first
  // detected marker can seed the panel). `null` is a deliberate empty lens
  // selection restored from a snapshot and must not fall back to that marker.
  const [knowledgePattern, setKnowledgePattern] = useState<string | null | undefined>(undefined);
  const [inspectedSignal, setInspectedSignal] = useState<SignalMarker | null>(null);
  const [namedHistoryChartSelection, setNamedHistoryChartSelection] = useState<{ pattern: NamedCandlePattern; occurrence: Pick<NamedCandleOccurrence, "time"> } | null>(null);
  const [previewOccurrenceIndex, setPreviewOccurrenceIndex] = useState(-1);
  const [historicalChartFocus, setHistoricalChartFocus] = useState<number | null>(null);
  const [chartFocusRequest, setChartFocusRequest] = useState(0);
  // Track analogue focus by UTC identity so tape refreshes cannot leave a stale bar selected.
  const analogueFocusTimeRef = useRef<string | null>(null);
  useEffect(() => {
    const focusedTime = analogueFocusTimeRef.current;
    if (!focusedTime) return;
    // A pending/failed job does not prove the chosen UTC endpoint disappeared.
    // The fresh result, not a temporary empty match list, owns reconciliation.
    if (candleAtlasStatus !== "ready") return;
    const focusIndex = detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, focusedTime));
    const retained = (m5Atlas?.matches || []).some((match) => focusedSnapshotTimestampsEqual(match.time, focusedTime)
      && (!analoguePatternFilter || (match.patterns ?? []).includes(analoguePatternFilter))
      && (!analogueFamilyFilter || (match.patterns ?? []).some((pattern) => getNamedCandleKnowledge(pattern)?.family === analogueFamilyFilter)));
    if (focusIndex >= 1 && retained) {
      if (focusIndex !== historicalChartFocus) setHistoricalChartFocus(focusIndex);
    } else if (historicalChartFocus != null) {
      analogueFocusTimeRef.current = null;
      setHistoricalChartFocus(null);
    }
  }, [detectorBars, m5Atlas?.asOf, m5Atlas?.matches, candleAtlasStatus, analoguePatternFilter, analogueFamilyFilter, historicalChartFocus]);
  const resetAnalogueSelection = (pattern: NamedCandlePattern | null, family: NamedCandleFamily | null) => {
    setNamedHistoryChartSelection(null);
    previewOccurrenceTimeRef.current = null;
    pendingOccurrenceSelection.current = null;
    setPreviewOccurrenceIndex(-1);
    setAnaloguePatternFilter(pattern);
    setAnalogueFamilyFilter(family);
    setAnaloguePreviewIndex(0);
    // A filter change invalidates the prior chart endpoint. Marker selection
    // may set a new UTC focus immediately after this reset.
    analogueFocusTimeRef.current = null;
    setHistoricalChartFocus(null);
  };
  const microChartViewport = useRef<MicroChartViewport | null>(null);
  const [snapshotViewportRestore, setSnapshotViewportRestore] = useState<(Partial<MicroChartViewport> & { nonce: number }) | null>(null);
  const [snapshotDrawingsRestore, setSnapshotDrawingsRestore] = useState<{ drawings: MicroChartDrawing[]; nonce: number } | null>(null);
  const [microChartDrawings, setMicroChartDrawings] = useState<MicroChartDrawing[]>([]);
  const [snapshotStatus, setSnapshotStatus] = useState("");
  const [researchBookmarks, setResearchBookmarks] = useState<Array<{ id: string; name: string; saved_at: string; snapshot: Record<string, unknown> }>>([]);
  const snapshotFileInput = useRef<HTMLInputElement | null>(null);
  const BOOKMARKS_KEY = "mfe_focused_research_bookmarks_v1";
  const BOOKMARK_LIMIT = 30;
  const BOOKMARK_MAX_BYTES = 2 * 1024 * 1024;
  const BOOKMARK_STORE_MAX_BYTES = 6 * 1024 * 1024;
  type ResearchBookmark = { id: string; name: string; saved_at: string; snapshot: Record<string, unknown> };
  const normalizeResearchBookmarks = (value: unknown, contextOnly = true): ResearchBookmark[] => {
    if (!Array.isArray(value)) return [] as Array<{ id: string; name: string; saved_at: string; snapshot: Record<string, unknown> }>;
    const valid = value.filter((item): item is { id: string; name: string; saved_at: string; snapshot: Record<string, unknown> } => {
      if (!item || typeof item.id !== "string" || !item.id.trim() || typeof item.name !== "string" || !item.name.trim() || typeof item.saved_at !== "string" || !Number.isFinite(Date.parse(item.saved_at)) || !item.snapshot || typeof item.snapshot !== "object" || Array.isArray(item.snapshot)) return false;
      try {
        if (JSON.stringify(item).length > BOOKMARK_MAX_BYTES) return false;
        const parsed = parseFocusedSnapshot(item.snapshot);
        return parsed.ok && (!contextOnly || (parsed.snapshot.symbol === requestedSymbol && parsed.snapshot.timeframe === tf));
      } catch { return false; }
    }).map((item) => ({ ...item, id: item.id.trim(), name: item.name.trim().slice(0, 120) })).slice(-BOOKMARK_LIMIT);
    let bounded = valid;
    while (bounded.length && JSON.stringify(bounded).length > BOOKMARK_STORE_MAX_BYTES) bounded = bounded.slice(1);
    return bounded;
  };
  useEffect(() => {
    if (!focused) return;
    try {
      const rawText = localStorage.getItem(BOOKMARKS_KEY) || "[]";
      const raw = JSON.parse(rawText);
      const shelf = normalizeResearchBookmarks(raw, false);
      const valid = shelf.filter((item) => {
        const parsed = parseFocusedSnapshot(item.snapshot);
        return parsed.ok && parsed.snapshot.symbol === requestedSymbol && parsed.snapshot.timeframe === tf;
      });
      setResearchBookmarks(valid);
      const encoded = JSON.stringify(shelf);
      if (encoded !== rawText) localStorage.setItem(BOOKMARKS_KEY, encoded);
    } catch { setResearchBookmarks([]); }
  }, [focused, requestedSymbol, tf]); // eslint-disable-line react-hooks/exhaustive-deps
  // Historical occurrence ordinals are not stable when the retained M5
  // window is refreshed (the two-year cutoff can drop a leading candle).
  // Keep the selected occurrence's UTC identity so its mini-chart can be
  // re-aligned after that refresh instead of silently moving to another bar.
  const previewOccurrenceTimeRef = useRef<string | null>(null);
  const previewOccurrenceConceptRef = useRef<string | null>(null);
  const pendingOccurrenceSelection = useRef<{ index: number; barIndex: number | null; focusIndex?: number | null; occurrenceTime?: string | null; focusTime?: string | null } | null>(null);
  const onMicroChartViewportChange = useCallback((viewport: MicroChartViewport) => {
    const prior = microChartViewport.current;
    if (!prior || prior.start !== viewport.start || prior.end !== viewport.end || prior.startTime !== viewport.startTime || prior.endTime !== viewport.endTime) {
      microChartViewport.current = viewport;
    }
  }, []);
  const onMicroChartDrawingsChange = useCallback((drawings: MicroChartDrawing[]) => {
    setMicroChartDrawings((prior) => prior === drawings || (prior.length === drawings.length && prior.every((drawing, index) => drawing === drawings[index])) ? prior : drawings);
  }, []);
  const selectedKnowledgePattern = knowledgePattern !== undefined ? knowledgePattern : priceAction?.markers[0]?.conceptId || null;
  const selectedPriceActionMarker = selectedKnowledgePattern
    ? priceAction?.markers.find((marker) => marker.conceptId === selectedKnowledgePattern)
    : undefined;
  const selectedPriceActionEvidence = selectedKnowledgePattern ? priceAction?.evidence?.[selectedKnowledgePattern as keyof NonNullable<typeof priceAction.evidence>] as PriceActionConceptEvidence | undefined : undefined;
  const selectedPriceActionKnowledge = getPriceActionKnowledge(selectedKnowledgePattern);
  const selectedPriceActionCopy = selectedPriceActionKnowledge
    ? getSourceNotesCopy(selectedPriceActionKnowledge, locale)
    : null;
  const selectedNamedPattern = selectedKnowledgePattern?.startsWith("named_candle:")
    ? selectedKnowledgePattern.slice("named_candle:".length)
    : null;
  const selectedNamedPrediction = selectedNamedPattern
    ? m5Atlas?.namedPatternPredictions?.find((prediction) => prediction.pattern === selectedNamedPattern)
    : undefined;
  const selectedNamedH1 = selectedNamedPrediction?.predictions.find((prediction) => prediction.horizon === 1);
  const selectedNamedDirectionalReadout = selectedNamedPattern && selectedNamedH1
    ? namedPatternDirectionalReadout(selectedNamedPattern, selectedNamedH1)
    : null;
  const selectedNamedWinRateReadout = selectedNamedDirectionalReadout?.reason === "NEUTRAL_SETUP"
    ? locale === "vi" ? viCopy("N/A%20-%20thi%E1%BA%BFt%20l%E1%BA%ADp%20trung%20t%C3%ADnh") : "N/A - neutral setup"
    : selectedNamedDirectionalReadout?.rate != null
      ? `${(selectedNamedDirectionalReadout.rate * 100).toFixed(1)}% ${selectedNamedDirectionalReadout.direction}`
      : "-";
  const selectedPriceActionAssessment = selectedKnowledgePattern ? priceAction?.assessments.find((assessment) => assessment.conceptId === selectedKnowledgePattern) : undefined;
  // A concept change is a new inspection context. Do not carry an occurrence
  // ordinal across concepts, because each concept has its own bounded history
  // and the same ordinal would silently preview an unrelated candle.
  useEffect(() => {
    // Automatic marker defaults may disappear while their independent scan
    // refreshes. They cannot take focus from an explicitly selected analogue.
    if (analogueFocusTimeRef.current && (knowledgePattern === undefined || pendingOccurrenceSelection.current)) return;
    previewOccurrenceConceptRef.current = selectedKnowledgePattern;
    previewOccurrenceTimeRef.current = null;
    analogueFocusTimeRef.current = null;
    setPreviewOccurrenceIndex(-1);
    setHistoricalChartFocus(null);
  }, [selectedKnowledgePattern]);
  const patternEvidenceRows = Object.entries(priceAction?.evidence || {})
    .map(([id, evidence]) => { const knowledge = getPriceActionKnowledge(id); return { id, evidence: evidence as PriceActionConceptEvidence, name: knowledge ? getSourceNotesCopy(knowledge, locale).name : id.replace(/_/g, " ") }; })
    .sort((a, b) => b.evidence.occurrences - a.evidence.occurrences);
  const currentConceptMarkers = useMemo(() => {
    const byConcept = new Map<string, PriceActionMarker>();
    for (const marker of priceAction?.markers || []) {
      const prior = byConcept.get(marker.conceptId);
      if (!prior || marker.i > prior.i) byConcept.set(marker.conceptId, marker);
    }
    return [...byConcept.values()].sort((left, right) => left.i - right.i);
  }, [priceAction?.markers]);
  const currentConceptProvenanceReadout = currentConceptMarkers.length
    ? locale === "vi"
      ? `Khái niệm hiện tại được neo vào nến đã đóng ${currentConceptMarkers[currentConceptMarkers.length - 1].time} UTC; trang PDF chỉ là tham chiếu nguồn mô tả; xác nhận nguồn ${PRICE_ACTION_KNOWLEDGE_PROVENANCE.schema} · ${PRICE_ACTION_KNOWLEDGE_PROVENANCE.sourceTitle} · SHA-256 ${PRICE_ACTION_KNOWLEDGE_PROVENANCE.sourceSha256}.`
      : `Current concepts are anchored to closed bar ${currentConceptMarkers[currentConceptMarkers.length - 1].time} UTC; PDF pages are descriptive source references only; source attestation ${PRICE_ACTION_KNOWLEDGE_PROVENANCE.schema} · ${PRICE_ACTION_KNOWLEDGE_PROVENANCE.sourceTitle} · SHA-256 ${PRICE_ACTION_KNOWLEDGE_PROVENANCE.sourceSha256}.`
    : locale === "vi"
      ? focusedCopy.noConceptMarkers
      : focusedCopy.noConceptMarkers;
  // Keep the compact current-pattern summary useful without requiring a
  // second click into the PDF panel. Each item combines the human-readable
  // source concept, the deterministic detector reason, and its printed page
  // anchors. This remains descriptive evidence and never grants authority.
  const currentConceptExplanation = currentConceptMarkers.length
    ? currentConceptMarkers.map((marker) => {
      const sourceLens = getPriceActionKnowledge(marker.conceptId);
      const assessment = priceAction?.assessments.find((candidate) => candidate.conceptId === marker.conceptId);
      const sourceName = sourceLens ? getSourceNotesCopy(sourceLens, locale).name : marker.label;
      const reason = assessment?.reason || "closed-bar geometry matched";
      return `${sourceName}: ${localizedDetectorReason(reason, locale)} · ${formatPriceActionSourcePages(marker.pageAnchors)}`;
    }).join(" · ")
    : focusedCopy.abstainConcept;
  const localizedConceptName = useCallback((conceptId: string, fallback: string) => {
    const knowledge = getPriceActionKnowledge(conceptId);
    return knowledge ? getSourceNotesCopy(knowledge, locale).name : fallback;
  }, [locale]);
  // Keep the chart's current-pattern shelf complete: deterministic PDF
  // concepts and named-candle Atlas matches are separate evidence families,
  // but both refer to the same latest closed M5 candle and can be inspected
  // through the same read-only marker path.
  const currentPatternSignals = useMemo<SignalMarker[]>(() => {
    const seen = new Set<string>();
    const sourceSignals = typeof currentPdfSourceSignals === "undefined" ? [] : currentPdfSourceSignals;
    return [...currentPriceActionSignals, ...sourceSignals, ...currentNamedCandleSignals].filter((signal) => {
      const key = `${signal.conceptId || signal.label}:${signal.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [currentPriceActionSignals, currentPdfSourceSignals, currentNamedCandleSignals]);
  const currentPatternExplanation = useMemo(() => {
    const named = currentNamedCandleSignals.map((signal) => {
      const pattern = signal.conceptId?.replace(/^named_candle:/, "");
      const knowledge = getNamedCandleKnowledge(pattern);
      const prediction = m5Atlas?.namedPatternPredictions?.find((item) => item.pattern === pattern);
      const evidence = prediction
        ? locale === "vi"
          ? ` · Hậu nghiệm tương đồng nhân quả: ${namedPatternEvidenceLabel(prediction.pattern, prediction, locale)}. Chọn mô hình để xem toàn bộ lịch sử được lưu giữ; phân phối có điều kiện này tách khỏi tỷ lệ toàn bộ lịch sử.`
          : ` · Causal analogue posterior: ${namedPatternEvidenceLabel(prediction.pattern, prediction)}. Click the pattern for exhaustive retained history; this conditional distribution is separate from the full-history hit rate.`
        : "";
      const structure = locale === "vi"
        ? `hình học nến OHLC đã đóng được nhận diện; ${localizedNamedCandleMeaning(pattern || "", locale)}`
        : knowledge?.structure || "named closed-candle geometry matched";
      const patternLabel = pattern
        ? locale === "vi" ? `mô hình ${pattern.replace(/_/g, " ").toLowerCase()}` : pattern.replace(/_/g, " ").toLowerCase()
        : signal.label;
      return `${patternLabel}: ${structure}${evidence}`;
    });
    const conceptSummary = currentConceptMarkers.length
      ? locale === "vi"
        ? currentConceptMarkers.map((marker) => {
          const sourceLens = getPriceActionKnowledge(marker.conceptId);
          const sourceName = sourceLens ? getSourceNotesCopy(sourceLens, locale).name : marker.label;
          return `${sourceName}: quan sát hình học nến đã đóng · ${formatPriceActionSourcePages(marker.pageAnchors)}`;
        }).join(" · ")
        : currentConceptExplanation
      : locale === "vi"
        ? "TẠM DỪNG · không khớp khái niệm xác định; điều hướng lăng kính nguồn bị giữ lại."
        : currentConceptExplanation;
    return [conceptSummary, ...named].filter(Boolean).join(" · ");
  }, [currentConceptExplanation, currentConceptMarkers, currentNamedCandleSignals, locale, m5Atlas?.namedPatternPredictions]);
  const currentPatternSignalLabel = useCallback((signal: SignalMarker) => {
    // The source-level callback is also exercised in isolation by the chart
    // contract tests, so keep a safe English default when no shell locale is
    // available in that isolated evaluation.
    const activeLocale: "en" | "vi" = typeof locale === "undefined" ? "en" : locale;
    if (signal.annotationKind === "named_candle") {
      const pattern = signal.conceptId?.replace(/^named_candle:/, "") as NamedCandlePattern | undefined;
      const prediction = pattern ? m5Atlas?.namedPatternPredictions?.find((item) => item.pattern === pattern) : undefined;
      // Keep the current chip useful without opening the inspector: expose the
      // observed H+1 distribution, support state and overlap-adjusted effective
      // support already computed by the Atlas. This remains descriptive and is
      // never folded into forecast consensus or order authority.
      const h1 = prediction?.predictions.find((item) => item.horizon === 1);
      const patternLabel = pattern
        ? activeLocale === "vi" ? `mô hình ${pattern.replace(/_/g, " ").toLowerCase()}` : pattern.replace(/_/g, " ").toLowerCase()
        : signal.label;
      const chipLabel = activeLocale === "vi" ? `NẾN · ${patternLabel}` : signal.label;
      if (!h1 || h1.sampleN <= 0) return activeLocale === "vi"
        ? `${chipLabel} · ${prediction?.support || "CHƯA THẤY"} · H+1 chưa khả dụng`
        : `${chipLabel} · ${prediction?.support || "UNSEEN"} · H+1 unavailable`;
      return activeLocale === "vi"
        ? `${chipLabel} · H+1 TĂNG ${(h1.up * 100).toFixed(0)}% / ĐI NGANG ${(h1.flat * 100).toFixed(0)}% / GIẢM ${(h1.down * 100).toFixed(0)}% · ${prediction!.support} n=${h1.sampleN} · hậu nghiệm`
        : `${chipLabel} · H+1 UP ${(h1.up * 100).toFixed(0)}% / FLAT ${(h1.flat * 100).toFixed(0)}% / DOWN ${(h1.down * 100).toFixed(0)}% · ${prediction!.support} n=${h1.sampleN} · posterior`;
    }
    const evidence = signal.conceptId ? priceAction?.evidence?.[signal.conceptId as keyof NonNullable<typeof priceAction.evidence>] : undefined;
    const side = signal.reads === "bullish" ? evidence?.long : signal.reads === "bearish" ? evidence?.short : undefined;
    const rate = side?.hitRate != null
      ? activeLocale === "vi" ? ` · ${(side.hitRate * 100).toFixed(0)}% H+1, n=${side.occurrences}` : ` · ${(side.hitRate * 100).toFixed(0)}% H+1 n=${side.occurrences}`
      : activeLocale === "vi" ? " · H+1 được giữ lại" : " · H+1 withheld";
    const conceptLabel = signal.conceptId ? localizedConceptName(signal.conceptId, signal.label.replace(/^PATTERN · /, "")) : signal.label;
    const displayLabel = signal.label.startsWith("PATTERN · ") ? `PATTERN · ${conceptLabel}` : conceptLabel;
    return `${displayLabel}${rate}`;
  }, [localizedConceptName, locale, m5Atlas?.namedPatternPredictions, priceAction]);
  const historicalPriceActionSignals = useMemo<SignalMarker[]>(() => {
    if (!focused || !showHistoricalTape || !selectedKnowledgePattern || !selectedPriceActionEvidence) return [];
    const currentConceptIndices = new Set((priceAction?.markers || []).map((marker) => `${marker.conceptId}:${marker.i}`));
    return selectedPriceActionEvidence.history.slice(-80)
      .filter((occurrence) => !currentConceptIndices.has(`${selectedKnowledgePattern}:${occurrence.i}`))
      .map((occurrence) => priceActionOccurrenceToSignal(occurrence, selectedKnowledgePattern, detectorBars))
      .filter((signal): signal is SignalMarker => !!signal);
  }, [focused, showHistoricalTape, selectedKnowledgePattern, selectedPriceActionEvidence, priceAction, detectorBars]);
  const inspectedEvidence = inspectedSignal?.conceptId
    ? priceAction?.evidence?.[inspectedSignal.conceptId as keyof NonNullable<typeof priceAction.evidence>]
    : undefined;
  const inspectedNamedPattern = inspectedSignal?.annotationKind === "named_candle" ? inspectedSignal.conceptId?.replace(/^named_candle:/, "") as NamedCandlePattern : null;
  const { result: inspectedNamedHistory, status: namedHistoryStatus, retry: retryNamedHistory } = useNamedCandleHistory(detectorBars, inspectedNamedPattern, focused && tf === "M5");
  const focusedNamedHistorySignal = useMemo(() => namedHistoryChartSelection ? namedCandleHistoryToSignal(namedHistoryChartSelection.pattern, namedHistoryChartSelection.occurrence, detectorBars) : null, [namedHistoryChartSelection, detectorBars]);
  useEffect(() => {
    if (!namedHistoryChartSelection || !detectorBars.length || focusedNamedHistorySignal) return;
    // A saved UTC identity must never fall back to a neighbouring ordinal or
    // retain a pattern label after its setup has disappeared from the tape.
    setNamedHistoryChartSelection(null);
    setSnapshotStatus("Named candle focus unavailable in the current retained tape; no substitute occurrence selected.");
  }, [namedHistoryChartSelection, detectorBars, focusedNamedHistorySignal]);
  const inspectorOccurrences = useMemo<readonly { time: string }[]>(() => {
    if (!inspectedSignal?.conceptId) return [];
    // Keep the complete occurrence index; create a chart signal only when the
    // user selects a row. Never allocate tens of thousands of SVG markers.
    if (inspectedEvidence) return inspectedEvidence.history;
    return inspectedNamedHistory?.history || [];
  }, [inspectedSignal?.conceptId, inspectedSignal?.annotationKind, inspectedEvidence, inspectedNamedHistory]);
  const navigateInspectorOccurrence = (ordinal: number) => {
    if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= inspectorOccurrences.length) return;
    const signal = inspectedEvidence && inspectedSignal?.conceptId
      ? priceActionOccurrenceToSignal(inspectedEvidence.history[ordinal], inspectedSignal.conceptId, detectorBars)
      : inspectedNamedPattern && inspectedNamedHistory
        ? namedCandleHistoryToSignal(inspectedNamedPattern, inspectedNamedHistory.history[ordinal], detectorBars)
        : null;
    if (signal) setInspectedSignal(signal);
  };
  const resolveReplayBookmarkSignal = (bookmark: PatternReplayBookmark): SignalMarker | null => {
    if (inspectedSignal?.conceptId === bookmark.conceptId && canonicalPatternReplayBookmarkTime(inspectedSignal.time) === bookmark.occurrenceTime && inspectedSignal.reads === bookmark.reads) return inspectedSignal;
    const evidence = priceAction?.evidence?.[bookmark.conceptId as keyof NonNullable<typeof priceAction.evidence>];
    const occurrence = evidence?.history.find(item => canonicalPatternReplayBookmarkTime(item.time) === bookmark.occurrenceTime);
    if (occurrence) return priceActionOccurrenceToSignal(occurrence, bookmark.conceptId, detectorBars);
    if (inspectedNamedPattern && `named_candle:${inspectedNamedPattern}` === bookmark.conceptId) {
      const named = inspectedNamedHistory?.history.find(item => canonicalPatternReplayBookmarkTime(item.time) === bookmark.occurrenceTime);
      if (named) return namedCandleHistoryToSignal(inspectedNamedPattern, named, detectorBars);
    }
    return null;
  };
  const previewHistory = selectedPriceActionEvidence?.history || [];
  const previewOccurrence = previewOccurrenceIndex >= 0 && previewHistory.length ? previewHistory[Math.min(previewOccurrenceIndex, previewHistory.length - 1)] : undefined;
  // Navigation is bounded to the retained chronological tape. Keep the
  // controls honest at both edges instead of allowing a no-op click that
  // silently re-selects the same occurrence.
  const previewNavigationIndex = previewOccurrence
    ? Math.max(0, Math.min(previewHistory.length - 1, previewOccurrenceIndex < 0 ? previewHistory.length - 1 : previewOccurrenceIndex))
    : -1;
  useEffect(() => {
    // A retention refresh can shift every occurrence index while preserving
    // the occurrence timestamp. Re-find the selected occurrence by UTC time
    // and move the main-chart focus to the corresponding current bar.
    const priorTime = previewOccurrenceTimeRef.current;
    const history = selectedPriceActionEvidence?.history || [];
    // An explicit analogue selection owns main-chart focus until a PDF
    // occurrence is selected. Two retained identities must never tug the same
    // state between different candles on successive renders.
    if (analogueFocusTimeRef.current) return;
    if (previewOccurrenceConceptRef.current === selectedKnowledgePattern && priorTime && history.length) {
      const nextIndex = history.findIndex((occurrence) => focusedSnapshotTimestampsEqual(occurrence.time, priorTime));
      if (nextIndex >= 0) {
        // Keep identity anchored to the timestamp actually matched. Before
        // React commits the shifted ordinal, previewOccurrence can name a
        // neighbouring row and must not overwrite this stable identity.
        previewOccurrenceTimeRef.current = history[nextIndex].time;
        if (nextIndex !== previewOccurrenceIndex) setPreviewOccurrenceIndex(nextIndex);
        const nextBarIndex = detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, history[nextIndex].time));
        if (nextBarIndex >= 1 && nextBarIndex !== historicalChartFocus) setHistoricalChartFocus(nextBarIndex);
      } else if (previewOccurrenceIndex >= 0) {
        // The selected candle fell outside the refreshed retention window.
        previewOccurrenceTimeRef.current = null;
        setPreviewOccurrenceIndex(-1);
        setHistoricalChartFocus(null);
      }
    } else if (!priorTime && previewOccurrence?.time) {
      // Initial render after an explicit selection; later refreshes use the
      // stable timestamp ref above rather than the transient ordinal.
      previewOccurrenceTimeRef.current = previewOccurrence.time;
    }
  }, [selectedKnowledgePattern, selectedPriceActionEvidence?.history, detectorBars, previewOccurrenceIndex, previewOccurrence?.time, historicalChartFocus]);
  const historicalPreviewBarIndex = previewOccurrence
    ? detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, previewOccurrence.time))
    : -1;
  const historicalPreviewBar = historicalPreviewBarIndex >= 1 ? detectorBars[historicalPreviewBarIndex] : undefined;
  const historicalPreviewMarker: PriceActionMarker | undefined = previewOccurrence && selectedKnowledgePattern && historicalPreviewBar
    ? { conceptId: selectedKnowledgePattern as PriceActionMarker["conceptId"], sourceConceptId: selectedKnowledgePattern as PriceActionMarker["sourceConceptId"], pageAnchors: PRICE_ACTION_SOURCE[selectedKnowledgePattern as keyof typeof PRICE_ACTION_SOURCE].pageAnchors, i: historicalPreviewBarIndex, time: historicalPreviewBar.t, price: historicalPreviewBar.c, position: previewOccurrence.direction === "UP" ? "below" : "above", direction: previewOccurrence.direction, label: selectedKnowledgePattern.replace(/_/g, " ").toUpperCase(), state: "DETECTED", score: previewOccurrence.score, ...(previewOccurrence.setup ? { setup: previewOccurrence.setup } : {}) }
    : undefined;
  // Keep the selected mini-chart inspectable without requiring browser SVG
  // tooling: expose the anchor candle and bounded window timestamps as plain
  // text. This is descriptive closed-bar evidence and carries no authority.
  const patternWindowMarker = historicalPreviewMarker ?? selectedPriceActionMarker;
  const pdfOccurrenceOwnsFocus = !!historicalPreviewMarker && historicalChartFocus === historicalPreviewMarker.i && !analogueFocusTimeRef.current;
  const focusedHistoricalSignal = useMemo(() => pdfOccurrenceOwnsFocus && previewOccurrence && selectedKnowledgePattern
    ? priceActionOccurrenceToSignal(previewOccurrence, selectedKnowledgePattern, detectorBars)
    : null, [pdfOccurrenceOwnsFocus, previewOccurrence, selectedKnowledgePattern, detectorBars]);
  const priceActionSignals = useMemo<SignalMarker[]>(() => {
    const sourceSignals = typeof currentPdfSourceSignals === "undefined" ? [] : currentPdfSourceSignals;
    const rows = [...currentPriceActionSignals, ...sourceSignals, ...currentNamedCandleSignals, ...historicalNamedCandleSignals, ...historicalPriceActionSignals];
    if (focusedHistoricalSignal && !rows.some((row) => row.conceptId === focusedHistoricalSignal.conceptId && row.time === focusedHistoricalSignal.time)) rows.push(focusedHistoricalSignal);
    if (focusedNamedHistorySignal && !rows.some((row) => row.conceptId === focusedNamedHistorySignal.conceptId && row.time === focusedNamedHistorySignal.time)) rows.push(focusedNamedHistorySignal);
    return rows;
  }, [currentPriceActionSignals, currentPdfSourceSignals, currentNamedCandleSignals, historicalNamedCandleSignals, historicalPriceActionSignals, focusedHistoricalSignal, focusedNamedHistorySignal]);
  const patternWindowBar = patternWindowMarker ? detectorBars[patternWindowMarker.i] : undefined;
  const patternWindowFrom = patternWindowMarker ? detectorBars[Math.max(0, patternWindowMarker.i - 6)]?.t : undefined;
  const patternWindowTo = patternWindowMarker ? detectorBars[Math.min(detectorBars.length - 1, patternWindowMarker.i + 6)]?.t : undefined;
  const patternWindowInspection = patternWindowBar
    ? `Anchor candle ${patternWindowBar.t} UTC · O ${f(patternWindowBar.o)} · H ${f(patternWindowBar.h)} · L ${f(patternWindowBar.l)} · C ${f(patternWindowBar.c)} · window ${patternWindowFrom || "unknown"} to ${patternWindowTo || "unknown"} UTC`
    : "No selected closed-bar anchor candle; choose a detected concept or retained occurrence.";
  useEffect(() => {
    const pending = pendingOccurrenceSelection.current;
    if (!pending) return;
    const timeFocus = pending.focusTime
      ? detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, pending.focusTime))
      : -1;
    // An empty tape is still loading; keep the UTC request pending so a later
    // retained-bar refresh can resolve it. Once bars exist, an absent explicit
    // UTC identity is treated as expired and fails closed below.
    if (pending.focusTime != null && detectorBars.length === 0) return;
    const indexFocus = pending.focusIndex !== undefined ? pending.focusIndex : pending.barIndex;
    const targetFocus = timeFocus >= 1 ? timeFocus : indexFocus;
    const resolvedTargetFocus = pending.focusTime != null && timeFocus < 1 ? null : targetFocus;
    if ((pending.index >= 0 || pending.occurrenceTime) && !selectedPriceActionEvidence) return;
    if (resolvedTargetFocus != null && detectorBars.length < 2) return;
    pendingOccurrenceSelection.current = null;
    const historyLength = selectedPriceActionEvidence?.history.length || 0;
    const occurrenceIndex = pending.occurrenceTime
      ? selectedPriceActionEvidence?.history.findIndex((occurrence) => focusedSnapshotTimestampsEqual(occurrence.time, pending.occurrenceTime)) ?? -1
      : (pending.index >= 0 && pending.index < historyLength ? pending.index : -1);
    const focusIndex = resolvedTargetFocus == null || detectorBars.length < 2
      ? null
      : Math.max(1, Math.min(detectorBars.length - 1, resolvedTargetFocus));
    previewOccurrenceTimeRef.current = occurrenceIndex >= 0 ? selectedPriceActionEvidence?.history[occurrenceIndex]?.time || null : null;
    setPreviewOccurrenceIndex(occurrenceIndex);
    setHistoricalChartFocus(focusIndex);
  }, [selectedKnowledgePattern, selectedPriceActionEvidence, detectorBars.length]);
  const selectPreviewOccurrenceIndex = (index: number) => {
    setChartFocusRequest(value => value + 1);
    setNamedHistoryChartSelection(null);
    analogueFocusTimeRef.current = null;
    const occurrence = previewHistory[index];
    previewOccurrenceTimeRef.current = occurrence?.time || null;
    setPreviewOccurrenceIndex(index);
    // Keep the main chart and the historical mini-chart on the same UTC
    // occurrence when Earlier/Later navigation changes the selected record.
    // The index is derived from the current closed tape so retention shifts
    // cannot move the main chart to an unrelated candle.
    const focus = occurrence
      ? detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, occurrence.time))
      : -1;
    setHistoricalChartFocus(focus >= 1 ? focus : null);
  };
  const showPatternWindowOnChart = () => {
    if (!historicalPreviewMarker) return;
    const focus = detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, historicalPreviewMarker.time));
    if (focus < 0) return;
    setNamedHistoryChartSelection(null);
    analogueFocusTimeRef.current = null;
    previewOccurrenceTimeRef.current = detectorBars[focus].t;
    setHistoricalChartFocus(focus);
    setChartFocusRequest(value => value + 1);
  };
  // Selecting a census row is an inspection action, so seed it with the most
  // recent retained occurrence when one exists.  This keeps the keyboard
  // accessible pattern census row and its mini-window/main-chart context in
  // one step, while the pending resolver still re-checks the UTC identity
  // after a concept/evidence refresh.
  const selectPatternEvidence = (conceptId: string, evidence: PriceActionConceptEvidence) => {
    setChartFocusRequest(value => value + 1);
    setNamedHistoryChartSelection(null);
    analogueFocusTimeRef.current = null;
    const latestIndex = evidence.history.length - 1;
    const latest = latestIndex >= 0 ? evidence.history[latestIndex] : undefined;
    if (focused && latest) setInspectedSignal(priceActionOccurrenceToSignal(latest, conceptId, detectorBars));
    const focusIndex = latest
      ? detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, latest.time))
      : -1;
    if (conceptId === selectedKnowledgePattern) {
      // Re-selecting the active row does not change the concept dependency,
      // so resolve it immediately instead of waiting for the pending effect.
      previewOccurrenceTimeRef.current = latest?.time || null;
      setPreviewOccurrenceIndex(latest ? latestIndex : -1);
      setHistoricalChartFocus(focusIndex >= 1 ? focusIndex : null);
    } else {
      pendingOccurrenceSelection.current = latest
        ? { index: latestIndex, barIndex: latest.i, focusIndex: focusIndex >= 1 ? focusIndex : null, occurrenceTime: latest.time }
        : null;
    }
    setKnowledgePattern(conceptId);
  };
  const selectPriceActionSignal = (signal: SignalMarker) => {
    setChartFocusRequest(value => value + 1);
    if (focused) setInspectedSignal(signal);
    if (signal.annotationKind === "named_candle" && signal.conceptId?.startsWith("named_candle:")) {
      const pattern = signal.conceptId.slice("named_candle:".length) as NamedCandlePattern;
      const filteredMatches = (m5Atlas?.matches || []).filter((match) => (match.patterns ?? []).includes(pattern));
      const historicalIndex = signal.label.startsWith("HIST CANDLE")
        ? filteredMatches.findIndex((match) => focusedSnapshotTimestampsEqual(match.time, signal.time))
        : -1;
      resetAnalogueSelection(pattern, null);
      // Keep the focused side panel aligned with the named marker while the
      // analogue filter remains a separate, read-only inspection state.
      if (typeof setKnowledgePattern === "function") setKnowledgePattern(signal.conceptId);
      setAnaloguePreviewIndex(historicalIndex >= 0 ? historicalIndex : 0);
      analogueFocusTimeRef.current = historicalIndex >= 0 ? signal.time : null;
      setHistoricalChartFocus(historicalIndex >= 0 ? signal.i : null);
      if (signal.label.startsWith("HIST CANDLE")) {
        const index = detectorBars.findIndex(bar => focusedSnapshotTimestampsEqual(bar.t, signal.time));
        const occurrence = namedCandleOccurrenceAt(detectorBars, index);
        if (occurrence) setNamedHistoryChartSelection({ pattern, occurrence });
      }
      return;
    }
    setNamedHistoryChartSelection(null);
    const conceptId = signal.conceptId || null;
    analogueFocusTimeRef.current = null;
    setKnowledgePattern(conceptId);
    if (!conceptId) return;
    const evidence = priceAction?.evidence?.[conceptId as keyof NonNullable<typeof priceAction.evidence>] as PriceActionConceptEvidence | undefined;
    // Current detector markers and historical tape markers can share a bar index.
    // Only an explicitly historical signal may open the historical occurrence preview.
    const isHistoricalSignal = signal.label.startsWith("HIST");
    const occurrenceIndex = isHistoricalSignal ? (evidence?.history.findIndex((occurrence) => focusedSnapshotTimestampsEqual(occurrence.time, signal.time)) ?? -1) : -1;
    const retainedIndex = isHistoricalSignal ? detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, signal.time)) : -1;
    if (occurrenceIndex >= 0) {
      if (conceptId !== selectedKnowledgePattern) pendingOccurrenceSelection.current = { index: occurrenceIndex, barIndex: retainedIndex >= 0 ? retainedIndex : null, focusIndex: retainedIndex >= 0 ? retainedIndex : null, occurrenceTime: signal.time };
      else {
        previewOccurrenceTimeRef.current = evidence?.history[occurrenceIndex]?.time || null;
        setPreviewOccurrenceIndex(occurrenceIndex);
        setHistoricalChartFocus(retainedIndex >= 0 ? retainedIndex : null);
      }
    } else {
      // Returning to a current marker must leave historical inspection mode;
      // otherwise an old occurrence remains centered while the detail pane
      // describes the live setup.
      analogueFocusTimeRef.current = null;
      previewOccurrenceTimeRef.current = null;
      setPreviewOccurrenceIndex(-1);
      setHistoricalChartFocus(null);
    }
  };
  const selectPdfCoverageConcept = useCallback((conceptId: string) => {
    const signal = currentPatternSignals.find((candidate) => candidate.conceptId === conceptId);
    // Source-only and non-detected concepts have no chart marker, but remain
    // inspectable through the shared knowledge panel.
    if (signal) selectPriceActionSignal(signal);
    else {
      setInspectedSignal(null);
      setKnowledgePattern(conceptId);
    }
  }, [currentPatternSignals, selectPriceActionSignal]);
  const applyFocusedSnapshot = (raw: string) => {
    const parsed = parseFocusedSnapshot(raw);
    if (!parsed.ok) { setSnapshotStatus(`Snapshot import failed | ${parsed.error}`); return; }
    const imported = parsed.snapshot;
    if (imported.symbol !== requestedSymbol || imported.timeframe !== tf) {
      setSnapshotStatus(`Snapshot context is ${imported.symbol} ${imported.timeframe}; focused view is ${requestedSymbol} ${tf}.`);
      return;
    }
    const inspection = imported.inspection || {};
    const concept = typeof imported.selected_concept === "string" && imported.selected_concept.trim() ? imported.selected_concept : null;
    if (concept && !getPriceActionKnowledge(concept)) {
      setSnapshotStatus(`Snapshot import failed | unknown price-action concept ${concept}.`);
      return;
    }
    setNamedHistoryChartSelection(inspection.named_candle_focus
      ? { pattern: inspection.named_candle_focus.pattern, occurrence: { time: inspection.named_candle_focus.time } }
      : null);
    setChartFocusRequest(value => value + 1);
    setInspectedSignal(null);
    setShowHistoricalTape(inspection.historical_tape_enabled ?? true);
    // The named UTC identity owns focus; legacy PDF/analogue ordinals must not
    // silently select a different candle if that identity is no longer retained.
    const rawFocus = inspection.named_candle_focus ? null : inspection.chart_focus_index;
    const focusTime = !inspection.named_candle_focus && typeof inspection.chart_focus_time === "string" ? inspection.chart_focus_time : null;
    const viewportStartTime = typeof inspection.viewport_start_time === "string" ? inspection.viewport_start_time : undefined;
    const viewportEndTime = typeof inspection.viewport_end_time === "string" ? inspection.viewport_end_time : undefined;
    const viewportStartIndex = typeof inspection.viewport_start_index === "number" && Number.isInteger(inspection.viewport_start_index) ? inspection.viewport_start_index : undefined;
    const viewportEndIndex = typeof inspection.viewport_end_index === "number" && Number.isInteger(inspection.viewport_end_index) ? inspection.viewport_end_index : undefined;
    const importedAnalogueIndex = typeof inspection.analogue_match_index === "number" && Number.isInteger(inspection.analogue_match_index) && inspection.analogue_match_index >= 0 ? inspection.analogue_match_index : null;
    const importedAnalogueTime = typeof inspection.analogue_match_time === "string" ? inspection.analogue_match_time : null;
    const importedAnaloguePatternFilter = typeof inspection.analogue_pattern_filter === "string" && inspection.analogue_pattern_filter.trim()
      ? inspection.analogue_pattern_filter as NamedCandlePattern
      : null;
    const importedAnalogueFamilyFilter = typeof inspection.analogue_family_filter === "string" && (NAMED_CANDLE_FAMILIES as readonly string[]).includes(inspection.analogue_family_filter)
      ? inspection.analogue_family_filter as NamedCandleFamily
      : null;
    const analogueMatchesForImport = (m5Atlas?.matches || []).filter((match) => {
      const patterns = match.patterns ?? [];
      const matchesPattern = !importedAnaloguePatternFilter || patterns.includes(importedAnaloguePatternFilter);
      const matchesFamily = !importedAnalogueFamilyFilter || patterns.some((pattern) => getNamedCandleKnowledge(pattern)?.family === importedAnalogueFamilyFilter);
      return matchesPattern && matchesFamily;
    });
    // Preserve a valid serialized filter even when the Atlas is still loading;
    // the pending resolver will apply it once causal matches are available.
    const restoredAnaloguePatternFilter = importedAnaloguePatternFilter;
    setAnalogueFamilyFilter(importedAnalogueFamilyFilter);
    setAnaloguePatternFilter(restoredAnaloguePatternFilter);
    pendingAnalogueMatchRef.current = importedAnalogueIndex != null || importedAnalogueTime || restoredAnaloguePatternFilter || importedAnalogueFamilyFilter
      ? { index: importedAnalogueIndex, time: importedAnalogueTime, patternFilter: restoredAnaloguePatternFilter, familyFilter: importedAnalogueFamilyFilter }
      : null;
    if (analogueMatchesForImport.length) {
      const byTime = importedAnalogueTime ? analogueMatchesForImport.findIndex((match) => focusedSnapshotTimestampsEqual(match.time, importedAnalogueTime)) : -1;
      let resolved = byTime >= 0 ? byTime : importedAnalogueIndex != null && importedAnalogueIndex < analogueMatchesForImport.length ? importedAnalogueIndex : -1;
      if (importedAnalogueTime != null && byTime < 0) resolved = -1;
      setAnaloguePreviewIndex(resolved >= 0 ? resolved : 0);
      pendingAnalogueMatchRef.current = null;
    }
    const timeFocus = focusTime ? detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, focusTime)) : -1;
    // A saved ordinal is only a safe fallback while it still points inside
    // the retained closed-bar tape.  Retention can shrink between sessions;
    // accepting an out-of-range index would restore an invalid chart focus
    // and leave the readout describing a candle that is not on screen.
    const indexFocus = typeof rawFocus === "number" && Number.isInteger(rawFocus) && rawFocus >= 1 && rawFocus < detectorBars.length ? rawFocus : null;
    // Prefer the stable UTC candle identity. A bounded ordinal is compatible
    // only with snapshots that carry no UTC identity; an expired explicit
    // timestamp must remain unfocused rather than selecting another candle.
    const focusIndex = timeFocus >= 1 ? timeFocus : indexFocus;
    const resolvedFocusIndex = focusTime != null && timeFocus < 1 ? null : focusIndex;
    // A snapshot only restores the analogue as a main-chart focus when its
    // saved chart endpoint is the same UTC candle as the selected analogue.
    // Preview-only snapshots still carry analogue_match_time for the mini
    // chart, so never promote that field alone into a chart focus identity.
    analogueFocusTimeRef.current = importedAnalogueTime && focusTime
      && focusedSnapshotTimestampsEqual(importedAnalogueTime, focusTime)
      && resolvedFocusIndex != null && resolvedFocusIndex >= 1
      ? importedAnalogueTime
      : null;
    if (viewportStartTime || viewportEndTime || viewportStartIndex !== undefined || viewportEndIndex !== undefined) {
      setSnapshotViewportRestore({ start: viewportStartIndex, end: viewportEndIndex, startTime: viewportStartTime || undefined, endTime: viewportEndTime || undefined, nonce: Date.now() });
    } else setSnapshotViewportRestore(null);
    if (Array.isArray(imported.drawings)) {
      setSnapshotDrawingsRestore({ drawings: imported.drawings as MicroChartDrawing[], nonce: Date.now() });
    } else setSnapshotDrawingsRestore(null);
    const occurrenceValue = inspection.named_candle_focus ? null : inspection.preview_occurrence_index;
    const nested = !inspection.named_candle_focus && inspection.preview_occurrence && typeof inspection.preview_occurrence === "object"
      ? inspection.preview_occurrence as { index?: unknown; time?: unknown; direction?: unknown; next_bar?: unknown }
      : null;
    const history = concept
      ? (priceAction?.evidence?.[concept as keyof NonNullable<typeof priceAction.evidence>] as PriceActionConceptEvidence | undefined)?.history || []
      : [];
    const rawOccurrenceIndex = typeof occurrenceValue === "number" && Number.isInteger(occurrenceValue) && occurrenceValue >= 0 ? occurrenceValue : -1;
    const nestedTime = typeof nested?.time === "string" ? nested.time : null;
    const timeOccurrenceIndex = nestedTime ? history.findIndex((occurrence) => focusedSnapshotTimestampsEqual(occurrence.time, nestedTime)) : -1;
    const candidateIndex = timeOccurrenceIndex >= 0 ? timeOccurrenceIndex : rawOccurrenceIndex;
    const candidate = candidateIndex >= 0 ? history[candidateIndex] : undefined;
    const occurrenceMatches = !!candidate && (nested?.index == null || nested.index === candidate.i || (nestedTime != null && focusedSnapshotTimestampsEqual(nestedTime, candidate.time)))
      && (nested?.time == null || focusedSnapshotTimestampsEqual(nested.time, candidate.time))
      && (nested?.direction == null || nested.direction === candidate.direction)
      && (nested?.next_bar == null || nested.next_bar === candidate.nextBar);
    const evidenceReady = !!priceAction?.evidence?.[concept as keyof NonNullable<typeof priceAction.evidence>];
    const occurrenceIndex = !evidenceReady ? candidateIndex : occurrenceMatches ? candidateIndex : -1;
    if (concept !== selectedKnowledgePattern || (concept && !evidenceReady)) {
      pendingOccurrenceSelection.current = { index: occurrenceIndex, barIndex: null, focusIndex: resolvedFocusIndex, occurrenceTime: nestedTime || candidate?.time || null, focusTime };
      setKnowledgePattern(concept);
    } else {
      previewOccurrenceTimeRef.current = occurrenceIndex >= 0 ? history[occurrenceIndex]?.time || null : null;
      setPreviewOccurrenceIndex(occurrenceIndex);
      setHistoricalChartFocus(resolvedFocusIndex);
    }
    setSnapshotStatus(`Snapshot resumed · ${inspection.named_candle_focus ? `${inspection.named_candle_focus.pattern} at ${inspection.named_candle_focus.time}` : concept || "no concept"} · read-only research context`);
  };
  const importFocusedSnapshotFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setSnapshotStatus("Snapshot import failed | file exceeds the 8 MiB limit."); return; }
    const reader = new FileReader();
    reader.onload = () => applyFocusedSnapshot(String(reader.result || ""));
    reader.onerror = () => setSnapshotStatus("Snapshot import failed | file could not be read.");
    reader.readAsText(file);
  };
  // CH Episode Lens overlay — only when the card carries ch_episode_lens (observer | no engine effect). Indices align: same replayBars array feeds the chart.
  // CH episode segmentation is a legacy card overlay. Keep its builder out of
  // the focused home graph and load it only when a legacy card requests it.
  const [msEpisodes, setMsEpisodes] = useState<any>(null);
  const hasEpisodeLens = !focused && !!activeCard?.modules?.includes("ch_episode_lens");
  useEffect(() => {
    if (!hasEpisodeLens || replayBars.length <= 30) { setMsEpisodes(null); return; }
    let alive = true;
    import("../lib/ch/chEpisodeSegments.ts").then(({ chEpisodeSegments }) => {
      if (alive) setMsEpisodes(chEpisodeSegments(replayBars, tf));
    }).catch(() => { if (alive) setMsEpisodes(null); });
    return () => { alive = false; };
  }, [hasEpisodeLens, replayBars, tf]);
  const replay = useMemo(() => {
    if (!activeCard || !realisticBt) return { trades: [] as TradeSeg[], markers: [] as { i: number; price: number; kind: string }[] };
    const trades: TradeSeg[] = realisticBt.sim.trades.map((t) => ({ entryI: t.entryI, entry: t.entry_effective, exitI: t.exitI, exit: t.exit_effective ?? t.entry_effective, dir: t.dir, outcome: t.outcome, R: Math.round(t.netR * 100) / 100, t: t.fill_time, why: t.why }));
    return { trades, markers: realisticBt.sim.markers.filter((m) => m.kind === "buy" || m.kind === "sell") };
  }, [activeCard, realisticBt]);
  const lastI = replayLastIndex(replayBars.length, source);
  const runDone = cursor != null && cursor >= lastI && replayBars.length > 0;
  const revealed = cursor == null ? [] : replay.trades.filter((t) => t.exitI <= cursor);
  // L6 ZONE modules → real chart geometry, anchored to current structure at the cursor (else last bar).
  // Card-zone geometry is a legacy replay overlay. Keep its indicator/value-area
  // dependencies out of the focused XAUUSD M5 graph and hydrate only when a
  // legacy card actually has a replay tape to render.
  const [cardZones, setCardZones] = useState<CChartZone[]>([]);
  useEffect(() => {
    if (focused || !activeCard || !replayBars.length) { setCardZones((prior) => prior.length ? [] : prior); return; }
    let alive = true;
    import("../lib/cardZones.ts").then(({ computeCardZones }) => {
      if (alive) setCardZones(computeCardZones(replayBars, Array.isArray(activeCard.modules) ? activeCard.modules : [], { atIndex: cursor ?? undefined }));
    }).catch(() => { if (alive) setCardZones([]); });
    return () => { alive = false; };
  }, [focused, activeCard, replayBars, cursor]);
  // SYNC: when this window's realistic result is shown, RECORD it so Strategy Lab reads the SAME numbers.
  useEffect(() => {
    if (source === "CSV" || !activeCard || !runDone || !realisticBt || stageIdx > maxStage || !stageRange) return;
    let alive = true;
    Promise.all([import("../lib/cardRunStore.ts"), import("../lib/simHonesty.ts")]).then(([{ recordWindow }, { honestyVerdict }]) => {
      if (!alive) return;
      const a = realisticBt.analytics;
      const verdict = stage === "Y10" ? honestyVerdict(a, realisticBt.walkForward, realisticBt.calibration?.level ?? "FULLY_PROVISIONAL").trust : "—";
      recordWindow({ ...activeCard, design_tf: designTf }, {
        stage, source, receipt: realisticBt.researchReceipt, config_hash: realisticBt.manifest.config_hash, execution_mode: realisticBt.m1Master ? "m1" : "design", from: stageRange.from, to: stageRange.to, n: stageBars.length,
        trades: a.n, netR: a.netNetR, netPF: a.netPF, winRate: a.netWinRate, maxDD: a.maxDDNetR, verdict,
        driftBlocked: realisticBt.sim.signals_blocked_by_drift_guard, ruined: realisticBt.sim.ruined || undefined, ruinTime: realisticBt.sim.ruined ? realisticBt.sim.ruin_time : undefined, asOf: new Date().toISOString(), hard: hardMode,
      });
    }).catch(() => { /* legacy persistence is best-effort; chart remains usable */ });
    return () => { alive = false; };
  }, [activeId, runDone, realisticBt, stage, maxStage, stageIdx, stageRange, designTf, hardMode]);   // eslint-disable-line
  // AUTO-CASCADE: arriving via the Lab "-> Ch¡º¡y ¡»Å¸ Microscope" button → run the WHOLE Y10→M6→M1 flow automatically
  // (jump straight to each window's realistic result, which records it), then auto-return to Strategy Lab for deep
  // analysis. Manual use is untouched (autoCascade stays false unless preselected). One engine, one flow, hands-free.
  useEffect(() => {
    if (source === "CSV" || !autoCascade || !activeCard) return;
    // (a) window loaded but not yet run → jump to its result instantly (records via the SYNC effect above)
    if (cursor == null && replayBars.length > 60 && realisticBt) { setCursor(lastI); return; }
    // (b) window finished → advance to the next stage, or finish + go back to the Lab
    if (runDone && realisticBt && stageIdx <= maxStage) {
      // reset cursor IN THE SAME batch as the stage change so the new window starts fresh (else the previous
      // window's large cursor makes runDone falsely true for the new, shorter window → skips a stage).
      if (stage === "Y10") { setMaxStage((m) => Math.max(m, 1)); setCursor(null); setStage("M6"); }
      // M1 runs in REPLAY too (last month of the clean tape) — deterministic, no live-feed race during the auto-flow.
      else if (stage === "M6") { setMaxStage((m) => Math.max(m, 2)); setCursor(null); setStage("M1"); }
      else if (stage === "M1") {
        setAutoCascade(false);
        // defer the return so React fully commits the M1 record (recordWindow → localStorage) BEFORE Microscope
        // unmounts — otherwise the Lab can mount and read the store a beat too early and miss the last window.
        const cid = activeCard.id;
        window.setTimeout(() => { try { localStorage.setItem("mfe_strategylab_preselect", cid); } catch { /* ignore */ } window.dispatchEvent(new CustomEvent("mfe-nav", { detail: "strategy-lab" })); }, 120);
      }
    }
  }, [autoCascade, activeCard, stage, runDone, realisticBt, replayBars.length, cursor, lastI, stageIdx, maxStage]);   // eslint-disable-line
  useEffect(() => {
    if (!running || !replayBars.length) return;
    const inc = speed; // bars per tick — watchable pace (use 8x to fast-forward, ­ to jump to the result)
    runTimer.current = window.setInterval(() => { setCursor((c) => { const next = (c == null ? 40 : c) + inc; if (next >= lastI) { setRunning(false); return lastI; } return next; }); }, 110);
    return () => { if (runTimer.current) window.clearInterval(runTimer.current); };
  }, [running, speed, replayBars, lastI]);
  useEffect(() => { setRunning(false); setCursor(null); }, [activeId]);
  // changing the cascade window (advance Y10→M6→M1, or click an unlocked stage) HIDES the result again —
  // the user must Play / K¡º¿t-qu¡º£ that window before its Honesty/Funding/Realism surface re-appears.
  useEffect(() => { setRunning(false); setCursor(null); }, [stage]);
  // LIVE SHADOW TEST: when source = Live + a card is chosen, the card runs FORWARD on the live GOLD.i# bars
  // (no replay, no orders) — cursor pinned to the latest bar so every resolved shadow trade + the live
  // performance show and auto-update as new live bars arrive.
  const liveShadow = source === "Live" && !!activeCard && !!liveAdv;
  useEffect(() => { if (liveShadow && replayBars.length > 2) setCursor(replayBars.length - 2); }, [liveShadow, replayBars]);
  function playRun() { if (running) { setRunning(false); return; } if (cursor == null || runDone) setCursor(40); setRunning(true); }
  function resetRun() { setRunning(false); setCursor(null); }

  const liveQuery = useLiveWorkspaceQuery(liveSymbol(getActiveSymbol()), tf, "H1", "", 600, source === "Live" && !focused);
  const liveClosedBarsVerified = !!liveQuery.data
    && liveQuery.data.authority === "SHADOW_ONLY"
    && liveQuery.data.decision === "NO_DECISION"
    && liveQuery.data.read_only === true
    && isVerifiedClosedBarWindow({
    ok: liveQuery.data.ok,
    bars: liveQuery.data.bars,
    symbol: liveQuery.data.symbol || getActiveSymbol(),
    broker_symbol: liveQuery.data.broker_symbol,
    timeframe: liveQuery.data.timeframe || tf,
    source: liveQuery.data.source,
    closed_bar_provenance: liveQuery.data.closed_bar_provenance,
    forming_bar_included: liveQuery.data.forming_bar_included,
    server_timezone: liveQuery.data.server_timezone,
    timestamp_basis: liveQuery.data.timestamp_basis,
    authority: liveQuery.data.authority,
    decision: liveQuery.data.decision,
    read_only: liveQuery.data.read_only,
  }, tf);
  useEffect(() => {
    // Focused M5 is read-only research and disables the legacy live-advice
    // poller. Do not derive or publish an advisory payload on that route.
    if (focused || source !== "Live") { setLiveAdv(null); return; }
    const bundle = liveQuery.data;
    setLiveAdv(bundle?.account?.connected && liveClosedBarsVerified && freshWorkspaceBars(bundle.bars, tf) && bundle.advice?.ok && bundle.advice.advice ? bundle.advice.advice as TradeAdvice : null);
  }, [focused, source, liveQuery, tf, liveClosedBarsVerified]);
  useEffect(() => {
    let alive = true;
    if (source === "CSV") { if (csvBars && csvBars.length) setBars(csvBars); return; }
    if (source === "Replay") {
      if (tf === "M1" && m1Years.length) { setBars(null); import("../adapters/loadSimOhlc.ts").then(({ loadSimM1Year }) => loadSimM1Year(m1Year)).then((d) => { if (alive) setBars(d?.bars || null); }); }
      else import("../adapters/loadSimOhlc.ts").then(({ loadSimOhlc }) => loadSimOhlc(tf)).then((d) => { if (alive) setBars(capM5DisplayWindow(d?.bars.slice(-70000) || [], tf)); });
    } else if (focused && tf === "M5" && verifiedM5HistoryState === "loading") {
      // Keep the chart interactive while broker promotion runs in the
      // background. This local closed-bar snapshot is descriptive only and
      // never unlocks forecast or order authority.
      import("../adapters/loadSimOhlc.ts")
        .then(({ loadSimOhlcTail }) => loadSimOhlcTail(tf, 2000, false, requestedSymbol))
        .then((local) => { if (alive && local?.bars?.length) setBars(capM5DisplayWindow(local.bars, tf)); })
        .catch(() => { if (alive) setBars(null); });
      mt5Bars(requestedSymbol, "M5", 600).then((broker) => {
        if (!alive) return;
        const brokerBars = isVerifiedClosedBarWindow(broker, "M5") ? (broker.bars ?? []) : [];
        if (brokerBars.length) setBars(capM5DisplayWindow(brokerBars, tf));
      }).catch(() => { /* the labelled local snapshot remains available */ });
    }
    else if (focused && tf === "M5" && verifiedM5HistoryState === "ready" && verifiedM5History?.bars?.length) setBars(capM5DisplayWindow(verifiedM5History.bars, tf));
    else if (liveQuery.data?.account?.connected && liveClosedBarsVerified && freshWorkspaceBars(liveQuery.data.bars, tf)) setBars(liveQuery.data.bars || null);
    else {
      // Do not leave a previously verified MT5 tail visible while an
      // unverified/fallback source is loading. The focused chart must fail
      // closed rather than briefly mislabeling old broker bars as local data.
      setBars(null);
      // The focused home needs the verified full tape. Keep the compact tail
      // loader out of its startup graph; only legacy Microscope fallback uses it.
      const fallback = focused
        ? import("../adapters/loadSimOhlc.ts").then(({ loadSimOhlc }) => loadSimOhlc(tf, false))
        : import("../adapters/loadSimOhlc.ts").then(({ loadSimOhlcTail }) => loadSimOhlcTail(tf, 2000, false));
      fallback.then((d) => { if (alive) setBars(capM5DisplayWindow(d?.bars || [], tf)); });
    }
    return () => { alive = false; };
  }, [tf, source, m1Year, m1Years.length, liveQuery, liveClosedBarsVerified, focused, verifiedM5HistoryState, verifiedM5History]);

  // KIDI is a legacy diagnostic scan. Keep its module and O(n) scan out of
  // the focused home graph; the full Microscope route loads it on demand.
  const [kidi, setKidi] = useState<any>(null);
  useEffect(() => {
    if (focused || !bars || bars.length <= 5) { setKidi(null); return; }
    let alive = true;
    import("../lib/kidiEvents.ts").then(({ kidiScan, kidiSummary }) => {
      if (alive) setKidi(kidiSummary(kidiScan(bars)));
    }).catch(() => { if (alive) setKidi(null); });
    return () => { alive = false; };
  }, [focused, bars]);
  const adv: TradeAdvice = (source === "Live" && liveAdv) ? liveAdv : {};
  const hasAssessment = source === "Live" && !!liveAdv;
  const isLive = source === "Live" && !!liveQuery.data?.account?.connected && liveClosedBarsVerified && freshWorkspaceBars(liveQuery.data.bars, tf);
  // Terminal attachment and promoted research history are separate states.
  // Keep the focused badge honest while the two-year M5 promotion is running,
  // so a connected terminal is never labelled offline merely because its
  // long-history gate has not completed yet.
  const focusedLiveBadge = focused && source === "Live" && tf === "M5"
    ? focusedConnectionBadge({ historyState: verifiedM5HistoryState, historyReason: verifiedM5HistoryReason, account: liveQuery.data?.account, terminalAttached: isTerminalAttached() })
    : null;
  const localizedFocusedLiveBadge = locale === "vi" && focusedLiveBadge
    ? focusedLiveBadge
      .replace("MT5 HISTORY · SYNCING", "BẢN GHI CỤC BỘ · KIỂM TRA NỀN")
      .replace("MT5 / 2Y CLOSED", "MT5 / 2 NĂM NẾN ĐÓNG")
      .replace("LOCAL SNAPSHOT · HISTORICAL MODE", "BẢN GHI CỤC BỘ · CHẾ ĐỘ LỊCH SỬ")
      .replace("MT5 CONNECTED · HISTORY FALLBACK", "MT5 ĐÃ KẾT NỐI · DỰ PHÒNG LỊCH SỬ")
      .replace("MT5 CONNECTED · HISTORY PENDING", "MT5 ĐÃ KẾT NỐI · DỮ LIỆU ĐANG CẬP NHẬT")
      .replace("LOCAL SNAPSHOT · MT5 CHECKING", "BẢN GHI CỤC BỘ · ĐANG KIỂM TRA NỀN")
      .replace("LOCAL SNAPSHOT · HISTORY UNAVAILABLE", "BẢN GHI CỤC BỘ · LỊCH SỬ CHƯA KHẢ DỤNG")
      .replace("MT5 · CONNECTION UNVERIFIED", "MT5 · KẾT NỐI CHƯA XÁC MINH")
    : focusedLiveBadge;
  const focusedSourceBadgePending = focused && source === "Live" && tf === "M5" && verifiedM5HistoryState === "loading";
  const focusedSourceBadgeReady = focused && source === "Live" && tf === "M5" && verifiedM5HistoryState === "ready";
  const bias: any = adv.bias || {}; const ind: any = adv.indicators || {};
  const liq: any = (adv.classic_family && adv.classic_family.liquidity) || {};
  const sellers = /SELL/i.test(bias.side || ""); const buyers = /BUY/i.test(bias.side || "");
  const danger = adv.danger_score != null ? (adv.danger_score <= 1 ? adv.danger_score * 100 : adv.danger_score) : 0;
  const price = researchBars.length ? researchBars[researchBars.length - 1].c : (adv.price || ind.price || 0);
  const atr = researchBars.length > 14 ? (() => { let s = 0, c = 0; for (let i = researchBars.length - 14; i < researchBars.length; i++) { s += Math.max(researchBars[i].h - researchBars[i].l, Math.abs(researchBars[i].h - researchBars[i - 1].c), Math.abs(researchBars[i].l - researchBars[i - 1].c)); c++; } return s / c; })() : (ind.atr14 || 0);   // primary ATR = real from bars; fallback = advisor/price estimate (no fake 6.7)
  // Several PDF concepts can fire on the same closed candle. Never turn an
  // unresolved clash into an arbitrary LONG/SHORT overlay: only a unanimous
  // directional set may create position landmarks.
  const latestPriceActionIndex = priceAction?.markers.reduce((latest, marker) => Math.max(latest, marker.i), -1) ?? -1;
  const latestPriceActionDirections = new Set(
    (priceAction?.markers || [])
      .filter((marker) => marker.i === latestPriceActionIndex)
      .map((marker) => marker.direction)
      .filter((direction): direction is "UP" | "DOWN" => direction === "UP" || direction === "DOWN"),
  );
  const priceActionFreshness = focused && tf === "M5"
    ? focusedForecastFreshness(detectorBars, tf, focusedClockNowMs)
    : null;
  const priceActionDirection = resolveFocusedPriceActionDirection(priceAction?.markers || [], {
    focused,
    timeframe: tf,
    historyState: verifiedM5HistoryState,
    freshnessOk: priceActionFreshness?.ok === true,
  });
  const priceActionDirectionConflict = latestPriceActionDirections.size > 1;
  const priceActionGeometryStatus = priceActionDirection
    ? locale === "vi" ? focusedCopy.geometryAllowed : "Current research geometry allowed: unanimous direction on fresh promoted MT5 history."
    : priceActionDirectionConflict
      ? locale === "vi" ? focusedCopy.geometryConflict : "Conflicting latest directions; LONG/SHORT position landmarks are withheld."
      : focused && tf === "M5" && verifiedM5HistoryState === "loading" ? locale === "vi" ? focusedCopy.geometryVerifying : "MT5 data is loading; current LONG/SHORT geometry is withheld."
        : focused && tf === "M5" && verifiedM5HistoryState !== "ready" ? locale === "vi" ? focusedCopy.geometryFallback : "Local fallback is descriptive only; current LONG/SHORT geometry is withheld."
          : focused && tf === "M5" && !priceActionFreshness?.ok
            ? locale === "vi" ? focusedCopy.geometryStale : "Latest closed-bar evidence is stale or unavailable; current LONG/SHORT geometry is withheld."
            : locale === "vi" ? focusedCopy.geometryNeutral : "Latest marker set is neutral or lacks one unanimous direction; current LONG/SHORT geometry is withheld.";
  const priceActionPositionZones: CChartZone[] = focused && priceActionDirection && atr > 0 && price > 0 ? (() => {
    const long = priceActionDirection === "UP";
    const signed = long ? 1 : -1;
    const Z = (a: number, b: number) => ({ lo: Math.min(price + a * atr, price + b * atr), hi: Math.max(price + a * atr, price + b * atr) });
    return [
      { role: "observation", ...Z(-0.12, 0.12), label: `${long ? "LONG" : "SHORT"} OBSERVATION`, color: "#e7e7e7", showLabel: false },
      { role: "target", ...Z(1.8 * signed, 2.2 * signed), label: "TARGET | RESEARCH", color: "#a9a9a9", showLabel: false },
      { role: "invalidation", ...Z(-1.2 * signed, -0.8 * signed), label: "INVALIDATION | RESEARCH", color: "#686868", showLabel: false },
    ] as CChartZone[];
  })() : [];
  const visZones = (cardZones.length ? cardZones : priceActionPositionZones).filter(zone => zoneOn[zone.role] !== false);
  const priceActionPositionLines: CChartLine[] = focused && priceActionDirection && atr > 0 && price > 0 ? (() => {
    const long = priceActionDirection === "UP";
    const side = long ? "BUY" : "SELL";
    const sideColor = long ? TK.green : TK.red;
    return [
      { price, label: `${side} ENTRY / RESEARCH`, color: sideColor },
      { price: price + (long ? 2.2 : -2.2) * atr, label: `${side} TARGET / RESEARCH`, color: sideColor, dash: true },
      { price: price - (long ? 1.0 : -1.0) * atr, label: `${side} INVALIDATION / RESEARCH`, color: TK.orange, dash: true },
    ];
  })() : [];
  const priceActionGeometryReadout = priceActionDirection && atr > 0 && price > 0
      ? locale === "vi"
        ? `${priceActionDirection === "UP" ? "LONG" : "SHORT"} hình học nghiên cứu · vào ${fp(price)} · mục tiêu ${fp(price + (priceActionDirection === "UP" ? 2.2 : -2.2) * atr)} (+2.2 ATR) · vô hiệu ${fp(price - (priceActionDirection === "UP" ? 1.0 : -1.0) * atr)} (bảo vệ 1.0 ATR) · giá đóng nến gần nhất · chỉ mô tả; không có quyền đặt lệnh`
        : `${priceActionDirection === "UP" ? "LONG" : "SHORT"} research geometry · entry ${fp(price)} · target ${fp(price + (priceActionDirection === "UP" ? 2.2 : -2.2) * atr)} (+2.2 ATR) · invalidation ${fp(price - (priceActionDirection === "UP" ? 1.0 : -1.0) * atr)} (1.0 ATR protection) · latest closed-bar close · descriptive only; no order authority`
    : `${focusedCopy.geometryReadoutWithheld} | ${priceActionGeometryStatus}`;
  // Keep the compact current-concepts readout explicit about abstention. The
  // marker labels remain useful descriptive evidence, but a screen-reader or
  // keyboard user must not infer a current direction from them when the latest
  // concepts conflict or the closed-bar provenance is stale/unavailable.
  const priceActionReadoutStatus = priceActionDirectionConflict
    ? locale === "vi" ? "HƯỚNG XUNG ĐỘT · TẠM DỪNG" : "CONFLICTING DIRECTIONS · ABSTAIN"
    : priceActionDirection
      ? `${priceActionDirection === "UP" ? (locale === "vi" ? "TĂNG" : "UP") : (locale === "vi" ? "GIẢM" : "DOWN")} ${focusedCopy.geometryReady}`
      : `${focusedCopy.abstainPrefix} | ${priceActionGeometryStatus}`;
  const forecastPrediction = m5Atlas?.predictions?.find((prediction) => prediction.horizon === 1);
  const forecastEffectiveN = forecastPrediction?.calibration?.effectiveN ?? 0;
  const forecastIndependentN = m5Atlas?.analogueCoverage?.independentSelectedSamples ?? 0;
  const forecastSupportDenominators = validateForecastSupportDenominators(forecastPrediction, m5Atlas?.analogueCoverage);
  // A local fallback may contain valid historical analogues while being too
  // old to describe the current next bar. Keep those distributions visible as
  // evidence, but fail closed for the focused directional readout/landmark.
  const forecastFreshness = focused && tf === "M5"
    ? focusedForecastFreshness(detectorBars, tf, focusedClockNowMs)
    : null;
  const forecastHistoryReady = !focused || tf !== "M5" || verifiedM5HistoryState === "ready";
  // Keep provenance promotion and closed-bar freshness as separate gates. A
  // locally retained bar can be fresh while still being ineligible for the
  // focused forecast because verified MT5 history has not been promoted. The
  // explanation must name only the gate that actually failed.
  const forecastFreshnessReady = !focused || tf !== "M5" || forecastFreshness?.ok === true;
  const currentBarReadout = focusedCurrentBarReadout(detectorBars[detectorBars.length - 1], {
    historyReady: forecastHistoryReady,
    freshnessOk: !focused || tf !== "M5" || forecastFreshness?.ok === true,
  });
  const currentBarOhlcReadout = currentBarReadout.ohlc
    ? `O ${fp(currentBarReadout.ohlc.open)} | H ${fp(currentBarReadout.ohlc.high)} | L ${fp(currentBarReadout.ohlc.low)} | C ${fp(currentBarReadout.ohlc.close)}`
    : focusedCopy.ohlcUnavailable;
  const currentBarCloseClock = focused && tf === "M5"
    ? focusedM5CloseClock(focusedClockNowMs, detectorBars[detectorBars.length - 1])
    : focusedM5CloseClock(Number.NaN, undefined);
  const currentBarCloseClockReadout = currentBarCloseClock.state === "UNAVAILABLE"
    ? focusedCopy.closeTimingUnavailable
    : currentBarCloseClock.state === "FRESHNESS_WAIT"
      ? `${focusedCopy.closePending} ${currentBarCloseClock.nextExpectedCloseUtc} UTC | ${currentBarCloseClock.remainingSeconds ?? 0}s ${locale === "vi" ? "còn lại" : "remaining"} | FRESHNESS_WAIT | ${locale === "vi" ? "OHLC đang hình thành được giữ lại" : "forming OHLC withheld"}`
      : `${focusedCopy.nextClose} ${currentBarCloseClock.nextExpectedCloseUtc} UTC | ${currentBarCloseClock.remainingSeconds ?? 0}s ${locale === "vi" ? "còn lại" : "remaining"} | CLOSED | ${locale === "vi" ? "chỉ OHLC nến đã đóng" : "closed-bar OHLC only"}`;
  // Keep every directional gate visible in the compact readout. The
  // distribution can remain inspectable while history, freshness, or its
  // causal support contract is still withheld.
  const forecastWalkForwardReady = (m5Atlas?.walkForward.evaluated ?? 0) >= 12;
  const forecastSupportReady = forecastEffectiveN >= 8;
  const forecastAnalogueReady = forecastIndependentN >= 4;
  const forecastMarginReady = (m5Atlas?.consensus.strength ?? 0) >= 0.05;
  const forecastEvidenceReady = !!m5Atlas?.ok
    && m5Atlas.consensus.direction !== "FLAT"
    && forecastMarginReady
    && forecastWalkForwardReady
    && forecastSupportReady
    && forecastAnalogueReady
    // Persisted/replayed Atlas payloads must agree with their causal endpoint
    // denominators before a current landmark can be exposed. The posterior
    // remains inspectable, but malformed support metadata is fail-closed.
    && forecastSupportDenominators.ok
    && forecastHistoryReady
    && forecastFreshnessReady;
  const forecastGateReasons = [
    !forecastHistoryReady ? "verified MT5 history" : null,
    !forecastFreshnessReady ? "fresh closed-bar evidence" : null,
    !forecastWalkForwardReady ? "walk-forward coverage" : null,
    !forecastSupportReady ? "effective causal support" : null,
    !forecastAnalogueReady ? "independent analogue coverage" : null,
    !forecastMarginReady ? "consensus margin" : null,
    !forecastSupportDenominators.ok ? "causal support metadata" : null,
    !m5Atlas || !m5Atlas.ok ? "causal Atlas evidence" : null,
    m5Atlas?.consensus.direction === "FLAT" ? "non-flat direction" : null,
  ].filter((reason): reason is string => !!reason);
  const forecastGateExplanation = forecastEvidenceReady
    ? locale === "vi" ? "Tất cả cổng dự báo đạt; mốc nến tiếp theo vẫn là bằng chứng nghiên cứu mô tả." : "All forecast gates pass; the next-bar landmark remains descriptive research evidence."
    : locale === "vi"
      ? `${focusedCopy.forecastWithheld} ${forecastGateReasons.join(", ") || focusedCopy.evidenceContract} sẵn sàng.`
      : `Forecast withheld until ${forecastGateReasons.join(", ") || "the causal evidence contract"} is ready.`;
  const forecastDirection = forecastEvidenceReady ? m5Atlas!.consensus.direction : null;
  // Keep the visible directional readout fail-closed with the chart landmark:
  // a raw consensus is still useful as research evidence, but it must not look
  // like a usable next-bar direction until every forecast gate passes.
  const forecastObservationDirection = forecastEvidenceReady ? forecastDirection : "WAIT";
  const forecastExpectedAtr = forecastPrediction?.expectedAtr;
  const forecastPrice = forecastDirection && Number.isFinite(forecastExpectedAtr) && atr > 0 && price > 0
    ? price + (forecastDirection === "UP" ? 1 : -1) * Math.max(0.25 * atr, Math.abs(forecastExpectedAtr!) * atr)
    : null;
  const forecastStatus = forecastEvidenceReady
    ? "RESEARCH LANDMARK READY"
    : candleAtlasStatus === "loading" ? "COMPARING CLOSED-CANDLE ANALOGUES"
    : candleAtlasStatus === "error"
      ? "CANDLE ANALOGUE ANALYSIS UNAVAILABLE"
    : !forecastHistoryReady
      ? "WAITING FOR VERIFIED MT5 HISTORY"
      : !forecastFreshnessReady
        ? "WAITING FOR FRESH CLOSED-BAR EVIDENCE"
      : !forecastSupportDenominators.ok
        ? "WAITING | INCONSISTENT CAUSAL SUPPORT"
    : !m5Atlas || !m5Atlas.ok
      ? "WAITING FOR CAUSAL CLOSED-BAR EVIDENCE"
      : m5Atlas.matches.length === 0
        ? "WAITING | NO CAUSAL ANALOGUES"
        : "LANDMARK WITHHELD | INSUFFICIENT SUPPORT";
  const forecastStatusLabel = locale === "vi"
      ? forecastEvidenceReady
      ? viCopy("S%E1%BA%B4N%20S%C3%80NG%20M%E1%BB%90C%20NGHI%C3%8AN%20C%E1%BB%A8U")
      : candleAtlasStatus === "loading" ? viCopy("%C4%90ANG%20SO%20S%C3%81NH%20N%E1%BA%BEN%20%C4%90%C3%83%20%C4%90%C3%93NG")
        : candleAtlasStatus === "error" ? viCopy("PH%C3%82N%20T%C3%8DCH%20T%C6%AF%C6%A0NG%20%C4%90%E1%BB%92NG%20N%E1%BA%BEN%20KH%C3%94NG%20KH%E1%BA%A2%20D%E1%BB%A4NG")
          : !forecastHistoryReady ? viCopy("%C4%90ANG%20CH%E1%BB%9C%20L%E1%BB%8ACH%20S%E1%BB%AC%20MT5%20%C4%90%C3%83%20X%C3%81C%20MINH")
            : !forecastFreshnessReady ? viCopy("%C4%90ANG%20CH%E1%BB%9C%20B%E1%BA%B0NG%20CH%E1%BB%A8NG%20N%E1%BA%BEN%20%C4%90%C3%93NG%20M%E1%BB%9AI")
              : !forecastSupportDenominators.ok ? viCopy("%C4%90ANG%20CH%E1%BB%9C%20%7C%20H%E1%BB%96%20TR%E1%BB%A2%20NH%C3%82N%20QU%E1%BA%A2%20KH%C3%94NG%20NH%E1%BA%A4T%20QU%C3%81N")
                : !m5Atlas || !m5Atlas.ok ? viCopy("%C4%90ANG%20CH%E1%BB%9C%20B%E1%BA%B0NG%20CH%E1%BB%A8NG%20N%E1%BA%BEN%20%C4%90%C3%93NG%20NH%C3%82N%20QU%E1%BA%A2")
                  : m5Atlas.matches.length === 0 ? viCopy("%C4%90ANG%20CH%E1%BB%9C%20%7C%20KH%C3%94NG%20C%C3%93%20T%C6%AF%C6%A0NG%20%C4%90%E1%BB%92NG%20NH%C3%82N%20QU%E1%BA%A2")
                    : viCopy("GI%E1%BB%AE%20M%E1%BB%90C%20NGHI%C3%8AN%20C%E1%BB%A8U%20%7C%20H%E1%BB%96%20TR%E1%BB%A2%20CH%C6%AFA%20%C4%90%E1%BB%A6")
    : forecastStatus;
  // The chart strip uses the same fail-closed direction as the card; gated evidence is explicitly WAIT.
  const forecastChartStatus = `${forecastStatusLabel} · ${forecastObservationDirection} · WF ${m5Atlas?.walkForward.evaluated ?? 0}/12 · ${locale === "vi" ? "hỗ trợ" : "support"} ${forecastEffectiveN}/8 · ${locale === "vi" ? "tương đồng" : "analogues"} ${forecastIndependentN}/4 · ${locale === "vi" ? "biên" : "margin"} ${((m5Atlas?.consensus.strength ?? 0) * 100).toFixed(1)}%/5.0%`;
  const forecastFreshnessReadout = forecastFreshness
    ? locale === "vi"
      ? `${focusedCopy.forecastFreshness}: ${forecastFreshness.ok ? "MỚI" : "GIỮ LẠI"} | ${explainForecastFreshness(forecastFreshness.reason)} | đóng gần nhất ${forecastFreshness.latestClosedBarUtc || "không khả dụng"} | tuổi ${formatClosedBarAge(forecastFreshness.ageMs)} | cổng 15 phút`
      : `Forecast freshness: ${forecastFreshness.ok ? "FRESH" : "WITHHELD"} | ${explainForecastFreshness(forecastFreshness.reason)} | latest close ${forecastFreshness.latestClosedBarUtc || "unavailable"} | age ${formatClosedBarAge(forecastFreshness.ageMs)} | gate 15m`
    : focusedCopy.forecastNotEvaluated;
  const forecastCalibrationReadout = forecastPrediction?.calibration
    ? locale === "vi"
      ? `Khoảng Wilson 95% H+1 | TĂNG ${Math.round(forecastPrediction.calibration.interval95.up.lower * 100)}–${Math.round(forecastPrediction.calibration.interval95.up.upper * 100)}% | ĐI NGANG ${Math.round(forecastPrediction.calibration.interval95.flat.lower * 100)}–${Math.round(forecastPrediction.calibration.interval95.flat.upper * 100)}% | GIẢM ${Math.round(forecastPrediction.calibration.interval95.down.lower * 100)}–${Math.round(forecastPrediction.calibration.interval95.down.upper * 100)}% | hỗ trợ hiệu dụng ${forecastPrediction.calibration.effectiveN.toFixed(1)}`
      : `H+1 Wilson 95% intervals | UP ${Math.round(forecastPrediction.calibration.interval95.up.lower * 100)}–${Math.round(forecastPrediction.calibration.interval95.up.upper * 100)}% | FLAT ${Math.round(forecastPrediction.calibration.interval95.flat.lower * 100)}–${Math.round(forecastPrediction.calibration.interval95.flat.upper * 100)}% | DOWN ${Math.round(forecastPrediction.calibration.interval95.down.lower * 100)}–${Math.round(forecastPrediction.calibration.interval95.down.upper * 100)}% | effective support ${forecastPrediction.calibration.effectiveN.toFixed(1)}`
    : focusedCopy.forecastCalibrationUnavailable;
  // Keep one compact, copyable receipt beside the detailed gate/status lines.
  // This gives a quick answer to what the chart is currently saying while
  // preserving the same fail-closed authority boundary as the landmark.
  const forecastReceiptDirection = forecastEvidenceReady ? (forecastDirection || "WAIT") : "WAIT";
  const forecastReceiptDistribution = forecastPrediction
    ? locale === "vi"
      ? `TĂNG ${(forecastPrediction.up * 100).toFixed(0)}% / ĐI NGANG ${(forecastPrediction.flat * 100).toFixed(0)}% / GIẢM ${(forecastPrediction.down * 100).toFixed(0)}%`
      : `UP ${(forecastPrediction.up * 100).toFixed(0)}% / FLAT ${(forecastPrediction.flat * 100).toFixed(0)}% / DOWN ${(forecastPrediction.down * 100).toFixed(0)}%`
    : focusedCopy.forecastH1Unavailable;
  const forecastReceiptLatestClosedUtc = forecastFreshness?.latestClosedBarUtc || "unavailable";
  const forecastReceiptGate = forecastEvidenceReady ? focusedCopy.allForecastGatesPass : `${focusedCopy.forecastWithheld} ${forecastGateReasons.join(", ") || focusedCopy.evidenceContract}`;
  const forecastReceiptSource = focusedSourceBadgeReady ? focusedCopy.verifiedHistory : focusedCopy.localFallbackUnverified;
  const forecastReceiptSummary = `${focusedCopy.evidenceReceipt} · ${forecastReceiptDirection} · ${forecastReceiptDistribution} · ${locale === "vi" ? "đóng gần nhất" : "latest closed"} ${forecastReceiptLatestClosedUtc} · ${forecastReceiptGate} · ${forecastReceiptSource} · SHADOW_ONLY / NO_DECISION`;
  const allAnalogueMatches = m5Atlas?.matches || [];
  const selectedNamedAnalogueMatches = selectedNamedPattern
    ? allAnalogueMatches.filter((match) => (match.patterns ?? []).includes(selectedNamedPattern as NamedCandlePattern))
    : [];
  const selectedNamedHistoryExamples = selectedNamedAnalogueMatches.slice(-6).reverse();
  const currentNamedPatterns = m5Atlas?.currentPatterns || [];
  const currentNamedPatternEvidence = currentNamedPatterns.map((pattern) => ({
    pattern,
    prediction: m5Atlas?.namedPatternPredictions?.find((item) => item.pattern === pattern),
  }));
  const selectedNamedCandleKnowledge = getNamedCandleKnowledge(analoguePatternFilter);
  const selectedNamedCandleFamilyKnowledge = getNamedCandleFamilyKnowledge(analogueFamilyFilter);
  const analoguePatternOptions = useMemo<Array<{ pattern: NamedCandlePattern; count: number }>>(
    () => {
      const counts = new Map<NamedCandlePattern, number>();
      for (const match of allAnalogueMatches) {
        for (const pattern of new Set(match.patterns ?? [])) counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([pattern, count]) => ({ pattern, count }))
        .sort((left, right) => right.count - left.count || left.pattern.localeCompare(right.pattern));
    },
    [allAnalogueMatches],
  );
  const analogueFamilyOptions = useMemo<Array<{ family: NamedCandleFamily; count: number }>>(() => {
    const counts = new Map<NamedCandleFamily, number>();
    for (const match of allAnalogueMatches) {
      const families = new Set((match.patterns ?? []).map((pattern) => getNamedCandleKnowledge(pattern)?.family).filter((family): family is NamedCandleFamily => !!family));
      for (const family of families) counts.set(family, (counts.get(family) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([family, count]) => ({ family, count }))
      .sort((left, right) => right.count - left.count || left.family.localeCompare(right.family));
  }, [allAnalogueMatches]);
  const analogueFamilyReadout = analogueFamilyOptions.length
    ? `Family coverage: ${analogueFamilyOptions.map(({ family, count }) => `${namedCandleFamilyLabel(family)} ${count}`).join(" · ")} | one contribution per endpoint`
    : "Family coverage: unavailable until named-pattern endpoints are retained";
  const analogueMatches = analoguePatternFilter
    ? allAnalogueMatches.filter((match) => (match.patterns ?? []).includes(analoguePatternFilter))
    : analogueFamilyFilter
      ? allAnalogueMatches.filter((match) => (match.patterns ?? []).some((pattern) => getNamedCandleKnowledge(pattern)?.family === analogueFamilyFilter))
    : allAnalogueMatches;
  const analogueIndex = analogueMatches.length ? Math.max(0, Math.min(analogueMatches.length - 1, analoguePreviewIndex)) : -1;
  const nearestAnalogue = analogueIndex >= 0 ? analogueMatches[analogueIndex] : undefined;
  const nearestAnalogueOutcome = nearestAnalogue?.outcome?.[0] || "UNAVAILABLE";
  const nearestAnalogueBars = nearestAnalogue
    ? m5AtlasBars.slice(Math.max(0, nearestAnalogue.endIndex - m5Atlas!.lookback), nearestAnalogue.endIndex + 2)
    : [];
  const nearestAnalogueLabel = nearestAnalogue
    ? `Causal analogue ${analogueIndex + 1} of ${analogueMatches.length} ending ${nearestAnalogue.time} UTC; observed next closed bar ${nearestAnalogueOutcome}; research evidence only; no decision or order authority`
    : "No causal analogue window available; research evidence only; no decision or order authority";
  const analogueMatchReadout = nearestAnalogue
    ? `Match quality: similarity ${(nearestAnalogue.similarity * 100).toFixed(1)}% | distance ${nearestAnalogue.distance.toFixed(3)} | ${nearestAnalogue.sameRegime ? "same regime" : "regime fallback"} | ${nearestAnalogue.sameSession ? "same UTC session" : "session fallback"}`
    : "Match quality unavailable";
  const analoguePatternReadout = nearestAnalogue?.patterns?.length
    ? `Named candle patterns: ${nearestAnalogue.patterns.join(" · ")}`
    : "Named candle patterns: none recorded";
  const analogueFilterReadout = analoguePatternFilter
    ? `Pattern filter: ${analoguePatternFilter} | ${analogueMatches.length} matching causal analogues`
    : analogueFamilyFilter
      ? `Family filter: ${namedCandleFamilyLabel(analogueFamilyFilter)} | ${analogueMatches.length} matching causal analogues`
    : `Pattern filter: all causal analogues - ${analogueMatches.length} causal analogues`;
  const analogueSelectionSummary = analoguePatternFilter
    ? `Active analogue filter: pattern ${analoguePatternFilter}; ${analogueMatches.length} retained endpoint${analogueMatches.length === 1 ? "" : "s"}; ${nearestAnalogue ? `showing ${analogueIndex + 1} of ${analogueMatches.length}` : "no endpoint selected"}.`
    : analogueFamilyFilter
      ? `Active analogue filter: family ${namedCandleFamilyLabel(analogueFamilyFilter)}; ${analogueMatches.length} retained endpoint${analogueMatches.length === 1 ? "" : "s"}; ${nearestAnalogue ? `showing ${analogueIndex + 1} of ${analogueMatches.length}` : "no endpoint selected"}.`
      : `Active analogue filter: all retained endpoints; ${analogueMatches.length} causal analogue${analogueMatches.length === 1 ? "" : "s"}.`;
  const countAnalogueOutcomes = (matches: typeof allAnalogueMatches) => matches.reduce((counts, match) => {
    const outcome = match.outcome?.[0];
    if (outcome === "UP" || outcome === "FLAT" || outcome === "DOWN") counts[outcome] += 1;
    return counts;
  }, { UP: 0, FLAT: 0, DOWN: 0 });
  const allAnalogueOutcomeCounts = countAnalogueOutcomes(allAnalogueMatches);
  const analogueOutcomeCounts = countAnalogueOutcomes(analogueMatches);
  const analogueObservedN = analogueOutcomeCounts.UP + analogueOutcomeCounts.FLAT + analogueOutcomeCounts.DOWN;
  const allAnalogueObservedN = allAnalogueOutcomeCounts.UP + allAnalogueOutcomeCounts.FLAT + allAnalogueOutcomeCounts.DOWN;
  const analogueRawDirectionalDistribution = analogueObservedN > 0
    ? {
      sampleN: analogueObservedN,
      up: analogueOutcomeCounts.UP / analogueObservedN,
      down: analogueOutcomeCounts.DOWN / analogueObservedN,
      flat: analogueOutcomeCounts.FLAT / analogueObservedN,
      calibration: {
        interval95: {
          up: wilson95(analogueOutcomeCounts.UP, analogueObservedN) || { lower: 0, upper: 1 },
          down: wilson95(analogueOutcomeCounts.DOWN, analogueObservedN) || { lower: 0, upper: 1 },
        },
      },
    }
    : null;
  const analogueDirectional = analoguePatternFilter
    ? namedPatternDirectionalReadout(analoguePatternFilter, analogueRawDirectionalDistribution)
    : { direction: "NEUTRAL" as const, rate: null, reason: "NEUTRAL_SETUP" as const };
  const analogueDirectionalWinRate = analogueDirectional.rate;
  const analogueDirectionalWinInterval = analogueDirectional.interval95 || null;
  const analogueWinRateReadout = analoguePatternFilter
    ? analogueDirectionalWinRate == null
      ? `Pattern ${analoguePatternFilter} directional win-rate N/A (neutral setup or no observed H+1 outcomes); inspect the UP / FLAT / DOWN distribution.`
      : `Pattern ${analoguePatternFilter} observed directional win-rate ${(analogueDirectionalWinRate * 100).toFixed(0)}%${analogueDirectionalWinInterval ? ` / CI95 ${Math.round(analogueDirectionalWinInterval.lower * 100)}-${Math.round(analogueDirectionalWinInterval.upper * 100)}%` : ""} / raw observed n=${analogueObservedN} / descriptive tape only`
    : analogueFamilyFilter
      ? `Family ${namedCandleFamilyLabel(analogueFamilyFilter)} has no single directional win-rate; inspect the UP / FLAT / DOWN family distribution and descriptive lens.`
      : "Select an exact named pattern to inspect its directional win-rate; family and neutral scopes remain distribution-only.";
  const analogueOutcomeReadout = analogueObservedN > 0
    ? (() => {
      const formatOutcome = (label: "UP" | "FLAT" | "DOWN") => {
        const count = analogueOutcomeCounts[label];
        const interval = wilson95(count, analogueObservedN);
        return `${label} ${count} (${((count / analogueObservedN) * 100).toFixed(0)}%; CI95 ${Math.round((interval?.lower ?? 0) * 100)}-${Math.round((interval?.upper ?? 0) * 100)}%)`;
      };
      return `Observed H+1 outcomes: ${formatOutcome("UP")} / ${formatOutcome("FLAT")} / ${formatOutcome("DOWN")} / n=${analogueObservedN} / descriptive tape only`;
    })()
    : "Observed H+1 outcomes: unavailable; no matching causal analogues";
  const analoguePatternLiftReadout = analoguePatternFilter && analogueObservedN > 0 && allAnalogueObservedN > 0
    ? `Pattern vs all-tape lift: UP ${(((analogueOutcomeCounts.UP / analogueObservedN) - (allAnalogueOutcomeCounts.UP / allAnalogueObservedN)) * 100).toFixed(1)}pp | DOWN ${(((analogueOutcomeCounts.DOWN / analogueObservedN) - (allAnalogueOutcomeCounts.DOWN / allAnalogueObservedN)) * 100).toFixed(1)}pp | descriptive comparison`
    : analogueFamilyFilter && analogueObservedN > 0 && allAnalogueObservedN > 0
      ? `Family ${namedCandleFamilyLabel(analogueFamilyFilter)} vs all-tape lift: UP ${(((analogueOutcomeCounts.UP / analogueObservedN) - (allAnalogueOutcomeCounts.UP / allAnalogueObservedN)) * 100).toFixed(1)}pp | DOWN ${(((analogueOutcomeCounts.DOWN / analogueObservedN) - (allAnalogueOutcomeCounts.DOWN / allAnalogueObservedN)) * 100).toFixed(1)}pp | descriptive comparison`
    : `${analoguePatternFilter ? "Pattern" : analogueFamilyFilter ? "Family" : "Pattern/family"} vs all-tape lift: unavailable until the selected filter has observed outcomes`;
  // Keep the current closed-bar lens and the historical endpoint in one
  // compact, read-only inspection context. The two panes intentionally use
  // separate labels so a historical outcome cannot be mistaken for the
  // current setup or for an execution instruction.
  const currentInspectionName = selectedPriceActionCopy?.name
    || selectedPriceActionMarker?.label
    || currentNamedPatterns.join(" · ")
    || (locale === "vi" ? viCopy("Ch%C6%B0a%20ch%E1%BB%8Dn%20kh%C3%A1i%20ni%E1%BB%87m%20x%C3%A1c%20%C4%91%E1%BB%8Bnh") : "No deterministic concept selected");
  const currentInspectionMeta = selectedPriceActionMarker
    ? `${selectedPriceActionMarker.direction} | ${(selectedPriceActionMarker.score * 100).toFixed(0)}% geometry | ${formatPriceActionSourcePages(selectedPriceActionMarker.pageAnchors)}`
    : selectedPriceActionKnowledge
      ? `${formatPriceActionSourcePages(selectedPriceActionKnowledge.pages)} | source lens only`
      : "Closed-bar setup lens unavailable";
  const historicalInspectionMeta = nearestAnalogue
    ? `${nearestAnalogue.time} UTC | H+1 ${nearestAnalogueOutcome} | similarity ${(nearestAnalogue.similarity * 100).toFixed(1)}%`
    : (locale === "vi" ? viCopy("Ch%C6%B0a%20ch%E1%BB%8Dn%20%C4%91i%E1%BB%83m%20cu%E1%BB%91i%20nh%C3%A2n%20qu%E1%BA%A3%20%C4%91%C3%A3%20l%C6%B0u") : "No retained causal endpoint selected");
  const currentNamedPatternGroupLabel = locale === "vi" ? viCopy("M%C3%B4%20h%C3%ACnh%20n%E1%BA%BFn%20%C4%91%C3%A3%20%C4%91%C3%B3ng%20hi%E1%BB%87n%20t%E1%BA%A1i") : "Current closed-bar named candle patterns";
  const currentNamedPatternFilterLabel = locale === "vi" ? viCopy("L%E1%BB%8Dc%20t%C6%B0%C6%A1ng%20%C4%91%E1%BB%93ng%20nh%C3%A2n%20qu%E1%BA%A3%20theo%20m%C3%B4%20h%C3%ACnh%20n%E1%BA%BFn%20hi%E1%BB%87n%20t%E1%BA%A1i") : "Filter causal analogues to the current named candle";
  const patternFilterLabel = locale === "vi" ? viCopy("B%E1%BB%99%20l%E1%BB%8Dc%20m%C3%B4%20h%C3%ACnh%20n%E1%BA%BFn") : "Pattern filter";
  const familyFilterLabel = locale === "vi" ? viCopy("B%E1%BB%99%20l%E1%BB%8Dc%20nh%C3%B3m%20n%E1%BA%BFn") : "Family filter";
  const showAllLabel = locale === "vi" ? viCopy("T%E1%BA%A5t%20c%E1%BA%A3") : "All";
  const showAllAriaLabel = locale === "vi" ? viCopy("Hi%E1%BB%87n%20t%E1%BA%A5t%20c%E1%BA%A3%20m%C3%B4%20h%C3%ACnh%20n%E1%BA%BFn%20nh%C3%A2n%20qu%E1%BA%A3") : "Show all causal analogue patterns";
  // Static surface contract retains the English fallback shape while runtime labels follow locale.
  // Filter causal analogues to ${pattern}; ${count} matching endpoints | analoguePatternFilter === pattern.
  // Filter causal analogues to current ${pattern}.
  const currentPatternControls = currentNamedPatterns.length
    ? <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginTop: 3 }} aria-label={currentNamedPatternGroupLabel}><span className="pmut psm">{focusedCopy.currentClosedBar}</span>{currentNamedPatterns.map((pattern) => <button key={pattern} type="button" className="ms-q" aria-label={`${currentNamedPatternFilterLabel}: ${pattern}`} aria-pressed={analoguePatternFilter === pattern} onClick={() => { resetAnalogueSelection(analoguePatternFilter === pattern ? null : pattern, null); }}>{pattern}</button>)}</div>
    : <small>{focusedCopy.currentNamedCandleUnavailable}</small>;
  const analogueFilterControls = <div><div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginTop: 3 }} aria-label={locale === "vi" ? viCopy("B%E1%BB%99%20l%E1%BB%8Dc%20m%C3%B4%20h%C3%ACnh%20n%E1%BA%BFn") : "Named candle pattern filter"}><span className="pmut psm">{patternFilterLabel}</span><button type="button" className="ms-q" aria-label={showAllAriaLabel} aria-pressed={analoguePatternFilter == null && analogueFamilyFilter == null} onClick={() => { resetAnalogueSelection(null, null); }}>{showAllLabel}</button>{analoguePatternOptions.map(({ pattern, count }) => <button key={pattern} type="button" className="ms-q" aria-label={`${locale === "vi" ? viCopy("L%E1%BB%8Dc%20t%C6%B0%C6%A1ng%20%C4%91%E1%BB%93ng%20theo") : "Filter causal analogues to"} ${pattern}; ${count} ${locale === "vi" ? viCopy("%C4%91i%E1%BB%83m%20cu%E1%BB%91i%20ph%C3%B9%20h%E1%BB%A3p") : "matching endpoints"}`} aria-pressed={analoguePatternFilter === pattern} onClick={() => { resetAnalogueSelection(analoguePatternFilter === pattern ? null : pattern, null); }}>{pattern} <span className="pmono">{count}</span></button>)}</div><div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginTop: 3 }} aria-label={locale === "vi" ? viCopy("B%E1%BB%99%20l%E1%BB%8Dc%20h%E1%BB%8D%20n%E1%BA%BFn") : "Named candle family filter"}><span className="pmut psm">{familyFilterLabel}</span>{analogueFamilyOptions.map(({ family, count }) => <button key={family} type="button" className="ms-q" aria-label={`${locale === "vi" ? viCopy("L%E1%BB%8Dc%20t%C6%B0%C6%A1ng%20%C4%91%E1%BB%93ng%20theo%20nh%C3%B3m") : "Filter causal analogues to"} ${namedCandleFamilyLabel(family)}; ${count} ${locale === "vi" ? viCopy("%C4%91i%E1%BB%83m%20cu%E1%BB%91i%20ph%C3%B9%20h%E1%BB%A3p") : "matching endpoints"}`} aria-pressed={analogueFamilyFilter === family} onClick={() => { resetAnalogueSelection(null, analogueFamilyFilter === family ? null : family); }}>{namedCandleFamilyLabel(family)} <span className="pmono">{count}</span></button>)}</div></div>;
  const showAnalogueOnChart = () => {
    if (!nearestAnalogue) return;
    const analogueEndpoint = m5AtlasBars[nearestAnalogue.endIndex];
    if (!analogueEndpoint) return;
    const focusIndex = detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, analogueEndpoint.t));
    if (focusIndex >= 1) {
      setChartFocusRequest(value => value + 1);
      setNamedHistoryChartSelection(null);
      previewOccurrenceTimeRef.current = null;
      pendingOccurrenceSelection.current = null;
      setPreviewOccurrenceIndex(-1);
      analogueFocusTimeRef.current = analogueEndpoint.t;
      setHistoricalChartFocus(focusIndex);
    }
  };
  const analogueEndpoint = nearestAnalogue ? m5AtlasBars[nearestAnalogue.endIndex] : undefined;
  const analogueOnChart = !!nearestAnalogue && !!analogueEndpoint && historicalChartFocus != null
    // A matching timestamp alone is insufficient: another read-only
    // inspection (for example a detector occurrence) may have focused the
    // same candle. Only an explicit analogue focus identity may mark this
    // control as active.
    && analogueFocusTimeRef.current != null
    && focusedSnapshotTimestampsEqual(analogueFocusTimeRef.current, analogueEndpoint.t)
    && focusedSnapshotTimestampsEqual(detectorBars[historicalChartFocus]?.t, analogueEndpoint.t);
  const selectAnaloguePreviewIndex = (nextIndex: number) => {
    const bounded = Math.max(0, Math.min(analogueMatches.length - 1, nextIndex));
    const nextMatch = analogueMatches[bounded];
    setAnaloguePreviewIndex(bounded);
    // Once the user chose Show on chart, Earlier/Later follows the same
    // endpoint so the mini chart and main chart remain one inspection context.
    if (!nextMatch || analogueFocusTimeRef.current == null) return;
    const endpoint = m5AtlasBars[nextMatch.endIndex];
    if (!endpoint) return;
    const focusIndex = detectorBars.findIndex((bar) => focusedSnapshotTimestampsEqual(bar.t, endpoint.t));
    if (focusIndex >= 1) {
      setChartFocusRequest(value => value + 1);
      analogueFocusTimeRef.current = endpoint.t;
      setHistoricalChartFocus(focusIndex);
    } else {
      analogueFocusTimeRef.current = null;
      setHistoricalChartFocus(null);
    }
  };
  const analogueFocusStatus = analogueOnChart
    ? `Main chart focused on causal analogue ${analogueIndex + 1}/${analogueMatches.length} at ${nearestAnalogue?.time} UTC.`
    : historicalChartFocus != null
      ? "Preview only; the previous chart focus does not match this selected filter. Select Show on chart to set the new UTC endpoint."
      : "Preview only; no main-chart endpoint is focused for this filter. Select Show on chart to focus its UTC endpoint.";
  const onAnaloguePreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Keep the mini analogue shelf usable when focus is on Earlier/Later or
    // Show on chart. Arrow keys and Home/End change the selected retained
    // endpoint without requiring a mouse click on the surrounding region.
    const target = event.target as HTMLElement | null;
    const targetIsControl = target?.tagName === "BUTTON";
    if (event.currentTarget !== event.target && !targetIsControl) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    if (!analogueMatches.length) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? analogueMatches.length - 1
        : analogueIndex + (event.key === "ArrowLeft" ? -1 : 1);
    selectAnaloguePreviewIndex(nextIndex);
  };
  const analogueFocusAnnotation: MicroChartFocusAnnotation | null = analogueOnChart && nearestAnalogue && analogueEndpoint && historicalChartFocus != null
    ? {
      i: historicalChartFocus,
      price: analogueEndpoint.c,
      time: analogueEndpoint.t,
      label: `ANALOGUE ${analogueIndex + 1}/${analogueMatches.length} | OBS`,
      detail: `Causal analogue ${analogueIndex + 1}/${analogueMatches.length}; observed next closed bar ${nearestAnalogueOutcome}`,
      color: nearestAnalogueOutcome === "DOWN" ? TK.red : nearestAnalogueOutcome === "UP" ? TK.green : TK.text2,
    }
    : null;
  const visLines: CChartLine[] = [
    ...priceActionPositionLines,
    ...(focused && forecastPrice != null ? [{ price: forecastPrice, label: `FORECAST / ${forecastDirection} / RESEARCH`, color: forecastDirection === "UP" ? TK.green : TK.red, dash: true }] : []),
  ];
  const fitScore = 100 - Math.round(danger); // "market-state fit" gauge (advisory)
  const fitStatus = !hasAssessment ? "NOT ASSESSED" : fitScore >= 75 ? "GOOD FIT" : fitScore >= 50 ? "CONDITIONAL FIT" : fitScore >= 30 ? "EARLY / WATCH" : "HOSTILE";
  const fitCol = fitScore >= 75 ? TK.green : fitScore >= 50 ? TK.teal : fitScore >= 30 ? TK.yellow : TK.red;
  const why = hasAssessment ? String(adv.headline || "See the current source assessment.") : "No current market assessment. The chart and historical research remain available.";
  const chartEvidenceSource = focused && verifiedM5HistoryState === "ready" ? locale === "vi"
    ? "MT5_HISTORY_3Y · nến đã đóng được xác minh · chỉ đọc · cửa sổ M5 hai năm gần nhất"
    : "MT5_HISTORY_3Y · verified closed bars · read-only · latest two-year M5 view"
    : focused && source === "Live" && tf === "M5"
      ? verifiedM5HistoryState === "loading"
        ? locale === "vi" ? "Đang tải dữ liệu nến MT5 - biểu đồ cục bộ vẫn được giữ" : "Loading MT5 candle data - local chart remains available"
        : locale === "vi" ? "Dự phòng lịch sử cục bộ - dữ liệu nến đóng nhiều năm của MT5 không khả dụng hoặc chưa xác minh" : "Local historical fallback - MT5 multi-year closed bars unavailable or unverified"
      : isLive
        ? locale === "vi" ? "Nến đã đóng MT5 | đã xác minh | chỉ đọc" : "MT5 closed bars | verified | read-only"
        : source === "Live"
          ? locale === "vi" ? "Dự phòng lịch sử cục bộ · nến đóng MT5 không khả dụng hoặc chưa xác minh" : "Local historical fallback · MT5 closed bars unavailable or unverified"
          : source === "CSV" ? locale === "vi" ? "CSV cục bộ | do người dùng cung cấp" : "Local CSV | user supplied" : locale === "vi" ? "Lịch sử phát lại cục bộ" : "Local replay history";
  const mt5FallbackReason = focused && source === "Live" && tf === "M5" && verifiedM5HistoryState === "fallback"
    ? explainFocusedHistoryFailure(verifiedM5HistoryReason)
    : null;
  const mt5RefreshStatus = focused && source === "Live" && tf === "M5" && verifiedM5RefreshReason
    ? explainFocusedHistoryRefreshFailure(verifiedM5RefreshReason)
    : null;
  const chartWindow = replayBars.length > 1
    ? `${replayBars[0].t} → ${replayBars[replayBars.length - 1].t}`
    : "Not available";
  // Keep the retention boundary inspectable next to the row count. The
  // boundary is calendar based, so a leap-day endpoint is clamped in UTC by
  // the same helper that filters the focused M5 tape.
  const chartLatestCanonicalUtc = tf === "M5" ? latestCanonicalUtc(replayBars) : null;
  const chartLatestValidMs = chartLatestCanonicalUtc ? Date.parse(chartLatestCanonicalUtc) : Number.NaN;
  const chartRetentionCutoffUtc = tf === "M5" && Number.isFinite(chartLatestValidMs)
    ? new Date(calendarTwoYearsBeforeUtc(chartLatestValidMs)).toISOString()
    : "Not applicable";
  const chartCoverage = tf === "M5"
    ? `M5 display window capped at two years | ${replayBars.length.toLocaleString()} bars`
    : `${replayBars.length.toLocaleString()} ${tf} bars`;
  const freshnessNowMs = focused ? focusedClockNowMs : Date.now();
  const freshness = closedBarFreshness(replayBars, freshnessNowMs);
  const latestClosedBarUtc = freshness.utc;
  const latestClosedBarAgeMs = freshness.ageMs;
  const latestClosedBarAge = formatClosedBarAge(latestClosedBarAgeMs);
  const latestClosedBarFresh = freshness.ageMs != null && freshness.ageMs <= 15 * 60_000;
  // Keep the focused header tied to the promoted MT5 tape. Local fallback
  // rows remain inspectable below, but cannot be presented as a verified
  // broker heartbeat.
  const verifiedM5Heartbeat = focused && source === "Live" && tf === "M5" && verifiedM5HistoryState === "ready" && verifiedM5History?.bars?.length
    ? focusedForecastFreshness(verifiedM5History.bars, "M5", focusedClockNowMs)
    : null;
  const verifiedM5HeartbeatState = verifiedM5Heartbeat?.reason === "FRESH"
    ? "FRESH"
    : verifiedM5Heartbeat?.reason === "STALE_CLOSED_BAR"
      ? "STALE"
      : "UNKNOWN";
  const verifiedM5HeartbeatUtc = verifiedM5Heartbeat?.latestClosedBarUtc || "UTC unavailable";
  const verifiedM5HeartbeatAge = verifiedM5Heartbeat?.ageMs == null ? "unknown" : formatClosedBarAge(verifiedM5Heartbeat.ageMs);
  const verifiedM5RefreshState = verifiedM5HistoryState === "loading"
    ? "LOADING"
    : verifiedM5HistoryState !== "ready"
      ? "UNAVAILABLE"
      : verifiedM5RefreshReason
        ? "RETRYING"
        : "OK";
  const verifiedM5HeartbeatLabel = `MT5 M5 CLOSED | ${verifiedM5HeartbeatUtc} | age ${verifiedM5HeartbeatAge} | ${verifiedM5HeartbeatState} | refresh ${verifiedM5RefreshState}`;
  // Keep the chart overlay itself source-auditable: the forecast landmark and
  // current price-action markers must point to the exact closed-bar endpoint.
  const chartOverlayProvenance = `closed ${latestClosedBarUtc || "unavailable"} UTC · source ${chartEvidenceSource} · ${forecastEvidenceReady ? "forecast gates pass" : "forecast withheld"} · WF ${m5Atlas?.walkForward.evaluated ?? 0}/12 · support ${forecastEffectiveN}/8 · analogues ${forecastIndependentN}/4 · margin ${((m5Atlas?.consensus.strength ?? 0) * 100).toFixed(1)}%/5.0%`;
  const localizedChartOverlayProvenance = locale === "vi"
    ? `đã đóng ${latestClosedBarUtc || "không khả dụng"} UTC | nguồn ${chartEvidenceSource} | ${forecastEvidenceReady ? "các cổng dự báo đạt" : "dự báo được giữ lại"} | WF ${m5Atlas?.walkForward.evaluated ?? 0}/12 | hỗ trợ ${forecastEffectiveN}/8 | tương đồng ${forecastIndependentN}/4 | biên ${((m5Atlas?.consensus.strength ?? 0) * 100).toFixed(1)}%/5.0%`
    : chartOverlayProvenance;
  // Keep the source card's state explicit for screen-reader and keyboard users.
  // A fallback tape can still contain useful research evidence, but it must
  // never look like a verified MT5 promotion or a current forecast source.
  const sourceCoverageStatus = focused && source === "Live" && tf === "M5"
    ? verifiedM5HistoryState === "loading" ? locale === "vi" ? "Đang tải dữ liệu nến MT5; biểu đồ cục bộ vẫn hiển thị và dự báo tạm giữ." : "MT5 candle data is loading; the local chart remains visible and the forecast is withheld."
      : verifiedM5HistoryState === "fallback" ? locale === "vi" ? "Lịch sử MT5 không khả dụng hoặc chưa đầy đủ; ảnh chụp cục bộ chỉ mang tính mô tả và dự báo được giữ lại." : "MT5 history is unavailable or incomplete; local snapshot is descriptive only and the forecast is withheld."
        : !latestClosedBarFresh
          ? locale === "vi" ? "Lịch sử MT5 đã xác minh nhưng bằng chứng nến đã đóng mới nhất cũ hoặc không khả dụng; dự báo được giữ lại." : "MT5 history is verified, but the latest closed-bar evidence is stale or unavailable; the forecast is withheld."
          : locale === "vi" ? "Lịch sử MT5 đã xác minh với bằng chứng nến đã đóng còn mới; các cổng dự báo vẫn áp dụng." : "MT5 history is verified with fresh closed-bar evidence; forecast gates still apply."
    : !latestClosedBarFresh
      ? locale === "vi" ? "Bằng chứng nến đã đóng mới nhất cũ hoặc không khả dụng; dự báo được giữ lại." : "Latest closed-bar evidence is stale or unavailable; forecast is withheld."
      : `${chartEvidenceSource} | ${locale === "vi" ? "các cổng dự báo vẫn áp dụng" : "forecast gates still apply."}`;
  const forecastEvidenceWindow = m5AtlasBars.length > 1
    ? `${m5AtlasBars[0].t} → ${m5AtlasBars[m5AtlasBars.length - 1].t}`
    : "Not available";
  const forecastRetainedBars = detectorBars.length;
  const forecastOmittedBars = Math.max(0, forecastRetainedBars - m5AtlasBars.length);
  const forecastTruncated = forecastOmittedBars > 0;
  const forecastEvidenceScope = `latest ${m5AtlasBars.length.toLocaleString()} of ${forecastRetainedBars.toLocaleString()} retained closed M5 bars${forecastTruncated ? ` | ${forecastOmittedBars.toLocaleString()} omitted by the ${M5_FORECAST_TAPE_LIMIT.toLocaleString()}-bar forecast cap` : ""}`;
  const verifiedHistoryDiagnostics = focused && verifiedM5HistoryState === "ready" && verifiedM5History
    ? {
      coverage: `${(verifiedM5History.coverageRatio * 100).toFixed(1)}% assembled coverage | ${verifiedM5History.returnedBarsTotal.toLocaleString()}/${verifiedM5History.requestedBarsTotal.toLocaleString()} bars`,
      chunks: `${verifiedM5History.chunks.toLocaleString()} chunks | ${verifiedM5History.cacheHits.toLocaleString()} cache hits | ${verifiedM5History.cacheMisses.toLocaleString()} misses`,
      scope: verifiedM5History.cacheScope || verifiedM5History.cacheNamespace || "account scope unavailable",
      range: `${verifiedM5History.actualFrom || "—"} → ${verifiedM5History.actualTo || "—"}`,
      runtime: `${verifiedM5History.closed_bar_provenance} / ${verifiedM5History.timestamp_basis} / server ${verifiedM5History.server_timezone} / forming bar excluded`
    }
    : null;
  // Broker promotion clears the focused tape while verification is in flight.
  // Keep that transient state distinct from a genuine empty-data failure.
  const focusedHistoryVerifying = focused && source === "Live" && tf === "M5" && verifiedM5HistoryState === "loading";
  const focusedM5RetryAvailable = focused && source === "Live" && tf === "M5";
  const buildFocusedSnapshot = () => {
    const roomAnchor = previewOccurrence || selectedPriceActionMarker;
    const marketContext = roomAnchor ? patternMarketContext(detectorBars, roomAnchor.time, roomAnchor.direction,
      Date.parse(roomAnchor.time) < Date.parse(detectorBars[detectorBars.length - 1]?.t || "") || (focusedSourceBadgeReady && priceActionFreshness?.ok === true)) : null;
    const roomContext = roomAnchor ? patternRoomContext(detectorBars, roomAnchor.time, roomAnchor.direction, roomAnchor.setup?.protectionReference,
      Date.parse(roomAnchor.time) < Date.parse(detectorBars[detectorBars.length - 1]?.t || "") || (focusedSourceBadgeReady && priceActionFreshness?.ok === true)) : null;
    const pullbackPressure = roomAnchor?.setup?.kind === "PATTERN_BREAK_PULLBACK" ? patternPullbackPressure(detectorBars, roomAnchor.time, roomAnchor.setup,
      Date.parse(roomAnchor.time) < Date.parse(detectorBars[detectorBars.length - 1]?.t || "") || (focusedSourceBadgeReady && priceActionFreshness?.ok === true)) : null;
    let savedViewport: { startTime?: string; endTime?: string } | null = null;
    try {
      const raw = localStorage.getItem(`mfe_chart_view_v1_${requestedSymbol}_${tf}`);
      const parsed = raw ? JSON.parse(raw) as { startTime?: unknown; endTime?: unknown } : null;
      if (parsed && typeof parsed === "object") savedViewport = {
        ...(typeof parsed.startTime === "string" ? { startTime: parsed.startTime } : {}),
        ...(typeof parsed.endTime === "string" ? { endTime: parsed.endTime } : {}),
      };
    } catch { savedViewport = null; }
    const snapshot = {
      schema: FOCUSED_SNAPSHOT_SCHEMA,
      exported_at: new Date().toISOString(),
      symbol: requestedSymbol,
      timeframe: tf,
      authority: FOCUSED_SNAPSHOT_AUTHORITY,
      source: chartEvidenceSource,
      coverage_window: chartWindow,
      retention: chartCoverage,
      mt5_history_diagnostics: verifiedM5History
        ? {
          state: verifiedM5HistoryState,
          complete: verifiedM5History.complete,
          coverage_ratio: verifiedM5History.coverageRatio,
          requested_bars: verifiedM5History.requestedBarsTotal,
          returned_bars: verifiedM5History.returnedBarsTotal,
          chunks: verifiedM5History.chunks,
          cache_hits: verifiedM5History.cacheHits,
          cache_misses: verifiedM5History.cacheMisses,
          cache_scope: verifiedM5History.cacheScope || verifiedM5History.cacheNamespace || null,
          actual_from: verifiedM5History.actualFrom || null,
          actual_to: verifiedM5History.actualTo || null,
          server_timezone: verifiedM5History.server_timezone,
          timestamp_basis: verifiedM5History.timestamp_basis,
          closed_bar_provenance: verifiedM5History.closed_bar_provenance,
          forming_bar_included: verifiedM5History.forming_bar_included,
        }
        : null,
      mt5_history_state: focused && source === "Live" && tf === "M5" ? verifiedM5HistoryState : "idle",
      mt5_history_reason: mt5FallbackReason,
      drawings: microChartDrawings,
      latest_closed_bar_time: latestClosedBarUtc,
      latest_closed_bar_age_ms: latestClosedBarAgeMs,
      forecast_evidence_limit: M5_FORECAST_TAPE_LIMIT,
      forecast_evidence_bars: m5AtlasBars.length,
      forecast_retained_bars: forecastRetainedBars,
      forecast_omitted_bars: forecastOmittedBars,
      forecast_evidence_truncated: forecastTruncated,
      forecast_evidence_scope: forecastEvidenceScope,
      forecast_evidence_window: forecastEvidenceWindow,
      forecast_truncated: forecastTruncated,
      forecast_freshness: forecastFreshness
        ? {
          ok: forecastFreshness.ok,
          latest_closed_bar_utc: forecastFreshness.latestClosedBarUtc,
          age_ms: forecastFreshness.ageMs,
          max_age_ms: 15 * 60_000,
          reason: forecastFreshness.reason,
        }
        : null,
      knowledge_map_provenance: {
        schema: PRICE_ACTION_KNOWLEDGE_PROVENANCE.schema,
        source_sha256: PRICE_ACTION_KNOWLEDGE_PROVENANCE.sourceSha256,
        source_title: PRICE_ACTION_KNOWLEDGE_PROVENANCE.sourceTitle,
        pdf_pages: PRICE_ACTION_KNOWLEDGE_PROVENANCE.pdfPages,
      },
      closed_bars: replayBars.length,
      selected_concept: selectedKnowledgePattern,
      selected_concept_assessment: selectedPriceActionAssessment || null,
      selected_concept_knowledge: selectedPriceActionKnowledge || null,
      selected_concept_evidence: selectedPriceActionEvidence || null,
      selected_setup_room_context: roomContext,
      selected_setup_market_context: marketContext,
      selected_setup_pullback_pressure: pullbackPressure,
      inspection: {
        named_candle_focus: focusedNamedHistorySignal && namedHistoryChartSelection
          ? { pattern: namedHistoryChartSelection.pattern, time: focusedNamedHistorySignal.time }
          : null,
        historical_tape_enabled: showHistoricalTape,
        chart_focus_index: historicalChartFocus != null && historicalChartFocus >= 1 ? historicalChartFocus : null,
        chart_focus_time: historicalChartFocus != null && historicalChartFocus >= 0 ? detectorBars[historicalChartFocus]?.t || null : null,
        viewport_start_index: microChartViewport.current?.start ?? null,
        viewport_end_index: microChartViewport.current?.end ?? null,
        viewport_start_time: microChartViewport.current?.startTime || savedViewport?.startTime || null,
        viewport_end_time: microChartViewport.current?.endTime || savedViewport?.endTime || null,
        preview_occurrence_index: previewOccurrence ? Math.max(0, previewOccurrenceIndex < 0 ? previewHistory.length - 1 : previewOccurrenceIndex) : null,
        preview_occurrence: previewOccurrence ? {
          index: previewOccurrence.i,
          time: previewOccurrence.time,
          direction: previewOccurrence.direction,
          next_bar: previewOccurrence.nextBar,
          score: previewOccurrence.score,
        } : null,
        analogue_match_index: nearestAnalogue ? analogueIndex : null,
        analogue_match_time: nearestAnalogue?.time || null,
        analogue_pattern_filter: analoguePatternFilter,
        analogue_family_filter: analogueFamilyFilter,
      },
      pattern_census: patternEvidenceRows.map(({ id, evidence, name }) => ({
        concept_id: id,
        name,
        occurrences: evidence.occurrences,
        evaluated: evidence.evaluated,
        hit_rate: evidence.hitRate,
        interval95: evidence.interval95,
        recurrence_rate: evidence.recurrenceRate,
        outcomes: evidence.outcomes,
        long: evidence.long,
        short: evidence.short,
      })),
      detector_markers: priceAction?.markers || [],
      forecast: {
        status: forecastStatus,
        direction: forecastDirection,
        gates: {
          walk_forward_evaluated: m5Atlas?.walkForward.evaluated ?? 0,
          walk_forward_required: 12,
          effective_support: forecastEffectiveN,
          effective_support_required: 8,
          independent_analogues: forecastIndependentN,
          independent_analogues_required: 4,
          consensus_margin: m5Atlas?.consensus.strength ?? 0,
          consensus_margin_required: 0.05,
        },
      },
      note: "Research snapshot only; no order instruction or execution authority.",
    };
    return snapshot;
  };
  const exportFocusedSnapshot = () => {
    const snapshot = buildFocusedSnapshot();
    // Keep all evidence rows without whitespace inflation: a two-year history
    // can otherwise export a file larger than the import limit.
    const blob = new Blob([JSON.stringify(snapshot)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quantsmart_${requestedSymbol}_${tf}_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSnapshotStatus(`Snapshot exported | ${replayBars.length.toLocaleString()} closed bars | ${patternEvidenceRows.length}/${PRICE_ACTION_DETECTOR_CONCEPT_COUNT} concepts`);
  };
  const copyFocusedSnapshot = async () => {
    const snapshot = buildFocusedSnapshot();
    try {
      await writePromptText(JSON.stringify(snapshot));
      setSnapshotStatus(`Snapshot copied | ${replayBars.length.toLocaleString()} closed bars | SHADOW_ONLY | NO_DECISION`);
    } catch {
      setSnapshotStatus("Snapshot copy failed | clipboard unavailable; use Export research snapshot JSON.");
    }
  };
  const saveResearchBookmark = () => {
    const fallbackName = `${selectedPriceActionKnowledge?.name || "M5 research"} | ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
    const name = window.prompt("Bookmark name:", fallbackName)?.trim();
    if (!name) return;
    const snapshot = buildFocusedSnapshot();
    const record = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: name.slice(0, 120), saved_at: new Date().toISOString(), snapshot: focusedBookmarkSnapshot(snapshot) };
    const encoded = JSON.stringify(record);
    if (encoded.length > BOOKMARK_MAX_BYTES) { setSnapshotStatus("Bookmark is too large; reduce freehand drawings before saving."); return; }
    let shelf: ResearchBookmark[] = [];
    try { shelf = normalizeResearchBookmarks(JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]"), false); } catch { shelf = []; }
    const nextShelf = normalizeResearchBookmarks([...shelf.filter((item) => item.id !== record.id), record], false);
    if (!nextShelf.some((item) => item.id === record.id)) { setSnapshotStatus("Bookmark could not be saved because the bounded local shelf is full."); return; }
    const next = nextShelf.filter((item) => {
      const parsed = parseFocusedSnapshot(item.snapshot);
      return parsed.ok && parsed.snapshot.symbol === requestedSymbol && parsed.snapshot.timeframe === tf;
    });
    try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(nextShelf)); setResearchBookmarks(next); setSnapshotStatus(`Bookmark saved | ${record.name}`); }
    catch { setSnapshotStatus("Bookmark could not be saved in this browser."); }
  };
  const restoreResearchBookmark = (record: { snapshot: Record<string, unknown> }) => applyFocusedSnapshot(JSON.stringify(record.snapshot));
  const deleteResearchBookmark = (id: string) => {
    let shelf: ResearchBookmark[] = [];
    try { shelf = normalizeResearchBookmarks(JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]"), false); } catch { shelf = []; }
    const nextShelf = normalizeResearchBookmarks(shelf.filter((record) => record.id !== id), false);
    const next = nextShelf.filter((item) => {
      const parsed = parseFocusedSnapshot(item.snapshot);
      return parsed.ok && parsed.snapshot.symbol === requestedSymbol && parsed.snapshot.timeframe === tf;
    });
    try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(nextShelf)); setResearchBookmarks(next); setSnapshotStatus("Bookmark deleted."); }
    catch { setSnapshotStatus("Bookmark could not be deleted from this browser."); }
  };

  const ctx = [
    ["Assessment", hasAssessment ? "Current source" : "Unavailable", TK.text2],
    ["Data source", source === "Live" && !isLive ? "Historical fallback" : source, TK.text2],
    ["As of", bars?.length ? bars[bars.length-1].t : "Unavailable", TK.text2],
    ["Path quality", String(ind.path_quality || "Not measured"), TK.text2],
    ["Session", String((adv.session_clock as {session?:string})?.session || "Not provided"), TK.text2],
    ["News window", "See imported calendar", TK.text2],
    ["Calibration", adv.final_probability?.calibration_status || "Not measured", TK.text2],
  ];
  const indicators = [
    ["EMA Trend", !hasAssessment ? "Not provided" : sellers ? "Down" : buyers ? "Up" : "Flat", sellers ? TK.red : buyers ? TK.green : TK.text2],
    ["RSI State", ind.rsi_state || "Not provided", TK.yellow],
    ["ATR(14)", f(atr), TK.text],
    ["ATR / close", price && atr ? f((atr / price) * 100, 2) + "%" : "Not measured", TK.text2],
    ["Sweep Risk", !hasAssessment ? "Not measured" : danger >= 50 ? "High" : "Moderate", danger >= 50 ? TK.red : TK.yellow],
  ];
  const chartTfs = focused ? (["M5"] as const) : TFS;

  return (
    <Suspense fallback={microscopeSuspenseFallback}>
      <div className={`ms ${focused ? "ms-focused" : ""}`} data-focus-mode={focused ? "m5-chart" : undefined} data-chart-only={focused && chartOnly ? "true" : undefined}>
      {!focused && <Suspense fallback={null}><LegacyResearchJobsController {...legacyResearchInputs} onState={onLegacyResearchState} /></Suspense>}
      {!focused && <LegacyResearchJobStatus pending={primaryJob.pending || compareJob.pending} error={primaryJob.error || compareJob.error} />}
      <style>{`
        .ms{font-size:13px}
        /* Focused home keeps the surrounding evidence chrome on the same
           black/white TradingView palette as the M5 canvas. Legacy diagnostic
           routes retain their semantic colours outside this scope. */
        .ms-focused{--mfe-bg:#050505;--mfe-s1:#0b0b0b;--mfe-s2:#0b0b0b;--mfe-s3:#151515;--mfe-border:rgba(255,255,255,.18);--mfe-text:#f5f5f5;--mfe-text2:#b6b6b6;--mfe-muted:#8f8f8f;--mfe-cyan:#d6e4ff;--mfe-blue:#9bbcff;--mfe-green:#26a69a;--mfe-yellow:#f5c542;--mfe-orange:#ff9800;--mfe-red:#ef5350;--mfe-purple:#8b7cff}
        .ms-focused .pc,.ms-focused .p-akp{background:#0b0b0b;border-color:rgba(255,255,255,.18);color:#f5f5f5}
        .ms-focused .pc-h::before{background:#f5f5f5}
        .ms-focused .p-akp-head{background:linear-gradient(100deg,rgba(255,255,255,.06),transparent);border-color:rgba(255,255,255,.18)}
        .ms-focused .p-akp-kicker,.ms-focused .p-akp-columns h4{color:#f5f5f5}
        .ms-focused .p-akp-authority{border-color:rgba(255,255,255,.35);color:#f5f5f5}
        .ms-focused .p-akp-concepts{border-color:rgba(255,255,255,.18)}
        .ms-focused .p-akp-concepts button:hover{border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.06)}
        .ms-focused .p-akp-concepts button.is-active{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.12);color:#fff}
        .ms-focused .p-akp-detail-title h3,.ms-focused .p-akp-detail-title span,.ms-focused .p-akp-source{color:#f5f5f5}
        .ms-focused .p-akp-definition,.ms-focused .p-akp-columns ul{color:#d0d0d0}
        .ms-focused .p-akp-abstain{border-color:#858585}.ms-focused .p-akp-abstain h4{color:#d0d0d0}
        .ms-focused .p-akp-families,.ms-focused .p-akp-footer{border-color:rgba(255,255,255,.18)}
        .ms-focused .p-akp-family-head h3{color:#f5f5f5}.ms-focused .p-akp-family-head select{background:#151515;border-color:rgba(255,255,255,.25);color:#f5f5f5}
        .ms-focused .p-akp-families li{color:#c0c0c0}.m5-empty-chart{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#050505;border:1px solid rgba(255,255,255,.18);border-radius:6px;min-height:320px}.m5-empty-chart:focus-visible{outline:2px solid #f5f5f5;outline-offset:2px}.m5-empty-chart::before{content:"";position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:48px 48px;opacity:.5}.m5-empty-chart::after{content:"";position:absolute;left:0;right:0;top:50%;border-top:1px dashed rgba(255,255,255,.18)}.m5-empty-content{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:7px;padding:24px;text-align:center;background:rgba(5,5,5,.88);border:1px solid rgba(255,255,255,.2);border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.35)}.m5-empty-content strong{font-size:13px;letter-spacing:.02em;color:#f5f5f5}.m5-empty-content small{max-width:360px;color:#aaa;line-height:1.45}.m5-empty-meta{font:10px var(--mfe-mono);letter-spacing:.04em;color:#999}.m5-empty-count{font:10px var(--mfe-mono);letter-spacing:.04em;color:#aaa}.m5-empty-retry{margin-top:4px;border:1px solid rgba(255,255,255,.35);border-radius:5px;background:#151515;color:#f5f5f5;padding:5px 9px;font:600 11px var(--mfe-mono);cursor:pointer}.m5-empty-retry:disabled{cursor:wait;opacity:.55}.m5-empty-spinner{width:16px;height:16px;border:2px solid #555;border-top-color:#f5f5f5;border-radius:50%;animation:m5-empty-spin 1s linear infinite}@keyframes m5-empty-spin{to{transform:rotate(360deg)}}.ms-focused .p-akp-families li:not(:last-child)::after{color:#777}.ms-focused .p-akp-families li::before{background:#2a2a2a;color:#f5f5f5}
        .ms-ctrl{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--mfe-s2);border:1px solid var(--mfe-border);border-radius:10px;padding:7px 10px;margin-bottom:12px;position:sticky;top:54px;z-index:30;box-shadow:0 4px 18px rgba(0,0,0,.35)}
        .m5-heartbeat{flex:1 1 280px;min-width:0;max-width:100%;overflow-wrap:anywhere;white-space:normal;line-height:1.35}
        @media(max-width:430px){.m5-heartbeat{flex-basis:100%;font-size:9px;padding-inline:6px}}
        .ms-seg{display:inline-flex;border:1px solid var(--mfe-border);border-radius:7px;overflow:hidden}
        .ms-seg button{background:transparent;border:none;border-left:1px solid var(--mfe-border);color:var(--mfe-text2);cursor:pointer;font-size:11px;font-weight:700;padding:4px 9px}
        .ms-seg button:first-child{border-left:none}.ms-seg button.on{background:rgba(37,183,255,.16);color:var(--mfe-cyan)}
        .ms-sel{background:var(--mfe-s3);border:1px solid var(--mfe-border);color:var(--mfe-text);border-radius:7px;padding:4px 8px;font-size:11.5px;font-weight:700}
        .ms-grid{display:grid;grid-template-columns:236px 1fr 290px;gap:12px}
        @media(max-width:1280px){.ms-grid{grid-template-columns:1fr}}
        .ms-col{display:flex;flex-direction:column;gap:12px}
        .ms-chart{display:flex;flex-direction:column;min-height:560px}
        .ms-focused .ms-grid{display:block}
        .ms-focused:not([data-chart-only="true"]) .ms-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);gap:12px;align-items:start}
        .m5-focused-sidepanel{display:grid;gap:10px;min-width:0;max-height:calc(100dvh - 76px);overflow:auto;overscroll-behavior:contain;padding-right:2px}
        .m5-focused-sidecard{display:grid;gap:7px;min-width:0;padding:10px;border:1px solid var(--mfe-border);border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));color:var(--mfe-text)}
        .m5-focused-sideheading{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;font-weight:800;letter-spacing:.02em}
        .m5-focused-sideauthority{color:var(--mfe-muted);font:700 9px var(--mfe-mono);white-space:nowrap}
        .m5-focused-pattern-list{display:flex;flex-wrap:wrap;gap:5px}
        .m5-focused-pattern-chip{max-width:100%;padding:5px 7px;border:1px solid rgba(255,255,255,.22);border-radius:5px;background:rgba(255,255,255,.05);color:var(--mfe-text);font:700 10px/1.35 var(--mfe-mono);text-align:left;cursor:pointer;overflow-wrap:anywhere}
        .m5-focused-pattern-chip:hover,.m5-focused-pattern-chip:focus-visible,.m5-focused-pattern-chip[aria-pressed="true"]{border-color:var(--mfe-cyan);background:rgba(214,228,255,.12);outline:none}
        .m5-focused-pattern-name{margin:0;color:var(--mfe-text);font-size:14px;font-weight:800;line-height:1.3}
        .m5-focused-explanation,.m5-focused-muted{margin:0;color:var(--mfe-muted);font-size:11px;line-height:1.5;overflow-wrap:anywhere}
        .m5-focused-winrate{color:var(--mfe-green);font:800 15px var(--mfe-mono)}
        .m5-focused-history-list{display:grid;gap:4px;margin:0;padding-left:18px;color:var(--mfe-muted);font:10px/1.45 var(--mfe-mono)}
        .m5-focused-history-list li{display:flex;justify-content:space-between;gap:8px;min-width:0}
        .m5-focused-history-list button{min-width:0;padding:0;border:0;background:none;color:var(--mfe-text);font:inherit;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-color:rgba(255,255,255,.28);text-underline-offset:2px}
        .m5-focused-history-list button:hover,.m5-focused-history-list button:focus-visible{color:var(--mfe-cyan);outline:none}
        .m5-focused-position-card{border-color:rgba(38,166,154,.45)}
        .ms-focused .m5-pdf-coverage-shelf,.ms-focused .m5-pdf-statistics,.ms-focused .pdf-assumptions-panel,.ms-focused .m5-focused-bookmarks,.ms-focused .p-akp{display:none !important}
        .ms-focused [data-price-action-scan],.ms-focused [data-candle-atlas-scan]{display:none !important}
        @media(max-width:900px){.ms-focused:not([data-chart-only="true"]) .ms-grid{grid-template-columns:minmax(0,1fr)}.m5-focused-sidepanel{max-height:none}}
        .ms-focused .ms-grid>.ms-col{display:none}
        .ms-focused .ms-chart{min-height:calc(100dvh - 190px);height:calc(100dvh - 190px)}
        .ms-focused .ms-chart .mfe-market-chart{min-height:0}
        /* The focused surface keeps the chart and model panel as the primary
           workspace. Legacy diagnostics remain available outside this route. */
        .ms-focused>.ms-ctrl{display:flex;position:absolute;top:calc(var(--focused-header-height,54px) + 8px);right:8px;z-index:40;margin:0;padding:0;background:transparent;border:0;box-shadow:none;pointer-events:none}
        .ms-focused>.ms-ctrl>*{display:none}
        .ms-focused>.ms-ctrl>.ms-chart-only-toggle{display:inline-flex;pointer-events:auto;margin:0;padding:5px 9px;background:rgba(8,8,8,.88);border:1px solid rgba(255,255,255,.32);border-radius:6px;color:#f5f5f5;font:700 10px var(--mfe-mono);cursor:pointer}
        .ms-focused>.ms-ctrl>.ms-chart-only-toggle:hover,.ms-focused>.ms-ctrl>.ms-chart-only-toggle:focus-visible{border-color:#f5f5f5;background:#151515;outline:2px solid rgba(255,255,255,.38);outline-offset:2px}
        .ms-focused>.pc[aria-label="Độ phủ nguồn"],.ms-focused>.pc[aria-label="Source coverage"],.ms-focused>.pc[aria-label="Dấu trang nghiên cứu"],.ms-focused>.pc[aria-label="Research bookmarks"],.ms-focused>.m5-price-action-readout{display:none !important}
        .ms-focused[data-chart-only="true"]> :not(.ms-ctrl):not(.ms-grid):not(style){display:none}
        .ms-focused[data-chart-only="true"]>.ms-ctrl{display:flex;position:absolute;top:calc(var(--focused-header-height,54px) + 8px);right:8px;z-index:40;margin:0;padding:0;background:transparent;border:0;box-shadow:none;pointer-events:none}
        .ms-focused[data-chart-only="true"]>.ms-ctrl>*{display:none}
        .ms-focused[data-chart-only="true"]>.ms-ctrl>.ms-chart-only-toggle{display:inline-flex;pointer-events:auto;margin:0;padding:5px 9px;background:rgba(8,8,8,.88);border:1px solid rgba(255,255,255,.32);border-radius:6px;color:#f5f5f5;font:700 10px var(--mfe-mono);cursor:pointer}
        .ms-focused[data-chart-only="true"]>.ms-ctrl>.ms-chart-only-toggle:hover,.ms-focused[data-chart-only="true"]>.ms-ctrl>.ms-chart-only-toggle:focus-visible{border-color:#f5f5f5;background:#151515;outline:2px solid rgba(255,255,255,.38);outline-offset:2px}
        .ms-focused[data-chart-only="true"]>[data-price-action-scan],.ms-focused[data-chart-only="true"]>[data-candle-atlas-scan]{display:none !important}
        .ms-focused[data-chart-only="true"] .ms-grid>.m5-pdf-coverage-shelf,.ms-focused[data-chart-only="true"] .ms-grid>.m5-pdf-statistics{display:none !important}
        .ms-focused[data-chart-only="true"] .ms-chart{min-height:calc(100dvh - 126px);height:calc(100dvh - 126px)}
        .m5-pa-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;overflow-wrap:anywhere;align-items:start}
        .m5-pa-grid>div{display:flex;flex-direction:column;gap:4px;min-width:0;padding:8px;border:1px solid var(--mfe-border);border-radius:6px;background:var(--mfe-s2)}
        .m5-pa-grid b{font-size:11px;line-height:1.35;color:var(--mfe-text)}
        .m5-pa-grid small{color:var(--mfe-muted);font-size:9.5px;line-height:1.4}
        .m5-current-bar-readout{display:grid;gap:2px;margin:-2px -2px 3px;padding:5px 6px;border:1px solid rgba(255,255,255,.22);border-radius:5px;background:rgba(255,255,255,.035)}
        .m5-current-bar-readout[data-current-bar-status="WAIT"]{border-color:rgba(255,255,255,.12);opacity:.82}
        .m5-close-clock-readout{font-variant-numeric:tabular-nums;color:#bdbdbd;overflow-wrap:anywhere}.m5-close-clock-readout[data-close-clock-state="UNAVAILABLE"]{color:#8e8e8e}
.m5-current-bar-readout[data-current-bar-direction="UP"] b{color:#f5f5f5}.m5-current-bar-readout[data-current-bar-direction="DOWN"] b{color:#c9c9c9}.m5-current-bar-readout[data-current-bar-direction="FLAT"] b,.m5-current-bar-readout[data-current-bar-direction="WAIT"] b{color:#a9a9a9}
        .m5-next-bar-card{grid-column:span 2;gap:6px!important;border-color:rgba(255,255,255,.3)!important;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025))!important}
        .m5-next-bar-heading{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.m5-next-bar-heading>.pmut{margin-right:auto}
        .m5-direction-badge,.m5-confidence-chip,.m5-gate-chip{display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:3px 7px;font:800 10px var(--mfe-mono);letter-spacing:.03em;white-space:nowrap}
        .m5-direction-badge.up{color:#f5f5f5;border-color:#f5f5f5;background:rgba(255,255,255,.13)}.m5-direction-badge.down{color:#d0d0d0;border-color:#aaa;background:rgba(170,170,170,.12)}.m5-direction-badge.wait{color:#c6c6c6;border-color:#777;background:rgba(120,120,120,.12)}
        .m5-confidence-chip{color:var(--mfe-text2);font-weight:700}.m5-probability-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.m5-probability-meter{display:grid;gap:2px;min-width:0}.m5-probability-label{display:flex;justify-content:space-between;gap:4px;font:700 9px var(--mfe-mono);color:var(--mfe-muted)}.m5-probability-track{height:5px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}.m5-probability-fill{display:block;height:100%;border-radius:inherit;background:#aaa}.m5-probability-meter.up .m5-probability-fill{background:#f5f5f5}.m5-probability-meter.down .m5-probability-fill{background:#858585}.m5-probability-meter.flat .m5-probability-fill{background:#555}
        .m5-gate-strip{display:flex;gap:4px;flex-wrap:wrap}.m5-gate-chip{font-size:9px;padding:2px 6px;color:#aaa;background:rgba(120,120,120,.08)}.m5-gate-chip.pass{color:#f5f5f5;border-color:#aaa;background:rgba(255,255,255,.1)}.m5-gate-chip.wait{color:#aaa}
        .m5-forecast-receipt{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:5px 7px;border:1px solid rgba(255,255,255,.22);border-radius:5px;background:rgba(255,255,255,.05);font:700 9px var(--mfe-mono);color:#d0d0d0;line-height:1.35}.m5-forecast-receipt>span{min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere}.m5-forecast-receipt-label{color:#f5f5f5;letter-spacing:.04em}.m5-forecast-receipt-label::after{content:" |";color:#777}
        .m5-pattern-census-list{display:grid;gap:3px;margin-top:2px;max-height:min(48dvh,380px);overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding:2px}
        .m5-pattern-census-list:focus-visible{outline:2px solid var(--mfe-text2);outline-offset:2px}
        .m5-pattern-census-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px;text-align:left;min-width:0}
        .m5-pattern-census-row>span{min-width:0}
        .m5-pattern-census-row>.pmono{white-space:normal;overflow-wrap:anywhere;text-align:right}
        .m5-pattern-census-name{white-space:normal;overflow-wrap:anywhere;line-height:1.4;color:var(--mfe-text)}
        .m5-pattern-census-row>.m5-pattern-census-detail{grid-column:1/-1;text-align:left;font-weight:400;line-height:1.5;color:var(--mfe-muted)}
         .m5-pdf-coverage-shelf{display:grid;gap:6px;margin:0 0 12px;padding:9px 10px;background:var(--mfe-s2);border:1px solid var(--mfe-border);border-radius:8px;min-width:0}.m5-pdf-coverage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap}.m5-pdf-coverage-head h2{margin:0;font-size:12px;letter-spacing:.02em;color:var(--mfe-text)}.m5-pdf-coverage-head p,.m5-pdf-coverage-note,.m5-pdf-coverage-authority{margin:2px 0 0;color:var(--mfe-muted);font-size:10px;line-height:1.4}.m5-pdf-coverage-head>span{font:700 9px var(--mfe-mono);color:var(--mfe-muted);white-space:nowrap}.m5-pdf-coverage-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;max-height:245px;overflow:auto;padding:1px}.m5-pdf-coverage-tile{display:grid;gap:2px;min-width:0;text-align:left;padding:6px;border:1px solid rgba(255,255,255,.16);border-radius:5px;background:rgba(255,255,255,.025);color:var(--mfe-text);font:inherit}.m5-pdf-coverage-tile:is(button){cursor:pointer}.m5-pdf-coverage-tile:is(button):hover,.m5-pdf-coverage-tile:is(button):focus-visible{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.08)}.m5-pdf-coverage-tile strong{font-size:10px;line-height:1.25;overflow-wrap:anywhere}.m5-pdf-coverage-tile small{font-size:9px;line-height:1.25;color:var(--mfe-muted);overflow-wrap:anywhere}.m5-pdf-coverage-state{font:700 9px var(--mfe-mono);letter-spacing:.03em}.m5-pdf-coverage-state.state-detected{color:var(--mfe-text)}.m5-pdf-coverage-state.state-abstain{color:var(--mfe-muted)}.m5-pdf-coverage-state.state-unavailable,.m5-pdf-coverage-state.state-withheld{color:#aaa}.m5-pdf-statistics{display:grid;gap:6px;margin:0 0 12px;padding:9px 10px;background:var(--mfe-s2);border:1px solid var(--mfe-border);border-radius:8px;min-width:0}.m5-pdf-statistics-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap}.m5-pdf-statistics-head h2{margin:0;font-size:12px;letter-spacing:.02em;color:var(--mfe-text)}.m5-pdf-statistics-head p,.m5-pdf-statistics-note,.m5-pdf-statistics-authority{margin:2px 0 0;color:var(--mfe-muted);font-size:10px;line-height:1.4;min-width:0;overflow-wrap:anywhere}.m5-pdf-statistics-head>span{font:700 9px var(--mfe-mono);color:var(--mfe-muted);white-space:normal;overflow-wrap:anywhere}.m5-pdf-statistics-table-wrap{overflow:auto}.m5-pdf-statistics-table{width:100%;min-width:720px;border-collapse:collapse;font-size:10px}.m5-pdf-statistics-table th,.m5-pdf-statistics-table td{padding:5px 6px;border-top:1px solid rgba(255,255,255,.1);text-align:right;white-space:nowrap}.m5-pdf-statistics-table th:first-child,.m5-pdf-statistics-table td:first-child{text-align:left}.m5-pdf-statistics-table tbody th{font-weight:700;color:var(--mfe-text)}.m5-pdf-statistics-table tbody th small{display:block;color:var(--mfe-muted);font:400 9px var(--mfe-mono);margin-top:1px;overflow-wrap:anywhere}.m5-pdf-stat-source{font:700 9px var(--mfe-mono);letter-spacing:.02em;overflow-wrap:anywhere}.m5-pdf-stat-source.source-notes{color:#d5b36a}.m5-pdf-stat-source.source-geometry{color:#83c4d8}.m5-pdf-statistics-caption{caption-side:top;text-align:left;color:var(--mfe-muted);font-size:9px;padding:0 0 4px}.m5-pdf-statistics-table-wrap{max-height:430px;overflow:auto;min-width:0}.m5-pdf-statistics-table th,.m5-pdf-statistics-table td{overflow-wrap:anywhere}@media(max-width:500px){.m5-pdf-statistics{padding:8px}.m5-pdf-statistics-table{min-width:0;font-size:10px}.m5-pdf-statistics-table th,.m5-pdf-statistics-table td{padding:5px 4px;white-space:normal}.m5-pdf-statistics-table th:nth-child(2),.m5-pdf-statistics-table td:nth-child(2){display:none}.m5-pdf-statistics-table th:nth-child(6),.m5-pdf-statistics-table td:nth-child(6){display:none}.m5-pdf-statistics-table th:first-child{width:42%}.m5-pdf-statistics-table-wrap{max-height:360px}}
         .ms-focused[data-chart-only="true"] .m5-pdf-coverage-shelf{display:none}
        @media(max-width:800px){.m5-pa-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:500px){.m5-pa-grid{grid-template-columns:1fr}.m5-next-bar-card{grid-column:span 1!important}.m5-pattern-census-row{grid-template-columns:1fr;gap:2px}.m5-pattern-census-row>.pmono{text-align:left}.m5-forecast-receipt{align-items:flex-start;flex-direction:column;gap:2px}.m5-forecast-receipt>span{white-space:normal}}
        .ms-q{flex:1;background:var(--mfe-s3);border:1px solid var(--mfe-border);color:var(--mfe-text2);border-radius:7px;padding:6px 0;font-size:10.5px;font-weight:700;cursor:pointer}
        .ms-q:hover{border-color:#3a4d61;color:var(--mfe-text)}
        .ms-bot{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:12px}
        @media(max-width:1280px){.ms-bot{grid-template-columns:1fr}}
        .ms-mtf{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .az-row{display:flex;align-items:flex-start;gap:9px;padding:7px 0;border-bottom:1px solid #14202c}
        .az-row:last-of-type{border-bottom:none}
        .az-dot{width:11px;height:11px;border-radius:3px;flex-shrink:0;margin-top:3px}
        .az-txt{flex:1;min-width:0}
        .az-name{font-size:11.5px;font-weight:800}
        .az-desc{font-size:10px;color:var(--mfe-muted);line-height:1.42;margin-top:1px}
        .az-eye{background:transparent;border:none;cursor:pointer;padding:3px;display:flex;align-items:center;border-radius:6px}
        .az-eye:hover{background:var(--mfe-s3)}
        .ms-csv{background:#1f6feb;border:none;color:#fff;border-radius:7px;padding:5px 12px;font-size:11.5px;font-weight:700;cursor:pointer}
        .ms-csv:hover{background:#2a7bff}
      `}</style>

      {focused && (priceActionScanStatus === "loading" || priceActionScanStatus === "error") && <div role="status" aria-live="polite" aria-atomic="true" data-price-action-scan={priceActionScanStatus} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8, color: TK.text2, fontSize: 12 }}>
        <span>{priceActionScanMessage}</span>
        {priceActionScanStatus === "error" && <button type="button" className="ms-q" style={{ flex: "none", padding: "5px 8px" }} onClick={retryPriceActionScan}>{focusedCopy.retryScan}</button>}
      </div>}

      {focused && (candleAtlasStatus === "loading" || candleAtlasStatus === "error") && <div role="status" aria-live="polite" aria-atomic="true" data-candle-atlas-scan={candleAtlasStatus} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8, color: TK.text2, fontSize: 12 }}>
        <span>{candleAtlasMessage}</span>
        {candleAtlasStatus === "error" && <button type="button" className="ms-q" style={{ flex: "none", padding: "5px 8px" }} onClick={retryCandleAtlas}>{focusedCopy.retryAtlas}</button>}
      </div>}

      {/* control bar */}
      <div className="ms-ctrl">
        <span className="ms-sel" style={{ fontWeight: 800, color: TK.text, cursor: "default" }}>{requestedSymbol}</span>
        {focused ? <span className="pflag" data-focused-timeframe="true" style={{ margin: 0 }} title="Focused home is fixed to the XAUUSD M5 closed-bar surface">M5 · FOCUSED</span> : <><span className="pmut psm" style={{ marginRight: 2 }}>Chart TF:</span><div className="ms-seg">{chartTfs.map((t) => <button key={t} className={tf === t ? "on" : ""} disabled={!!activeCard || source==="CSV"&&!!csvMeta&&CSV_MINUTES[t]<CSV_MINUTES[csvMeta.tf]} title={activeCard ? "Strategy Card locks Chart TF to its own design_tf. Clear card selection to switch TF freely." : "Select chart timeframe"} onClick={() => setTf(t)}>{t}</button>)}</div></>}
        {activeCard && <span className="pflag b" style={{ margin: 0 }} title="Entries evaluate on the card's design_tf"><Glyph name="lock" size={12} /> design_tf = {designTf} (locked by card)</span>}
        {!focused && <div className="ms-seg">{(["Live", "CSV", "Replay"] as const).map((s) => <button key={s} className={source === s ? "on" : ""} onClick={() => { setSource(s);  }}>{s}</button>)}</div>}
        {focused && <span className="pflag" style={{ margin: 0, color: priceActionDirectionConflict ? TK.orange : priceAction?.markers.length ? TK.yellow : TK.muted, borderColor: priceActionDirectionConflict ? TK.orange : priceAction?.markers.length ? TK.yellow : "var(--mfe-border)" }}>{priceActionScanStatus === "loading" ? focusedCopy.patternScanning : priceActionScanStatus === "error" ? focusedCopy.patternUnavailable : priceActionDirectionConflict ? focusedCopy.conflicting : priceAction?.markers.length ? `${priceAction.markers.length} ${focusedCopy.observation}${priceAction.markers.length === 1 ? "" : locale === "vi" ? "" : "S"}` : focusedCopy.noPattern}</span>}
        {/* The focused connection badge below already carries this history state.
            Keep the generic history chip only for a non-Live focused source so
            the normal Live surface does not show two competing fallback labels. */}
        {focused && !focusedLiveBadge && <span className="pflag" style={{ margin: 0, color: verifiedM5HistoryState === "ready" ? TK.green : verifiedM5HistoryState === "loading" ? TK.yellow : TK.orange, borderColor: verifiedM5HistoryState === "ready" ? TK.green : verifiedM5HistoryState === "loading" ? TK.yellow : TK.orange }} title={verifiedM5HistoryState === "ready" ? "Verified MT5 closed-bar history, capped to the latest two years for this surface." : "MT5 multi-year history is unavailable or incomplete; the local closed-bar snapshot is used."}>{verifiedM5HistoryState === "ready" ? "MT5 CLOSED | 2Y VIEW" : verifiedM5HistoryState === "loading" ? "MT5 HISTORY | LOADING" : "LOCAL SNAPSHOT | FALLBACK"}</span>}
        {focused && (<button type="button" className="ms-q ms-chart-only-toggle" aria-label={chartOnly ? focusedCopy.showContext : focusedCopy.chartOnly} aria-pressed={chartOnly} aria-keyshortcuts="Alt+C" title={focusedCopy.chartOnlyTitle} onClick={() => setChartOnly(!chartOnly)}>{chartOnly ? focusedCopy.showContext : focusedCopy.chartOnly}</button>)}
        {source === "Live" && <span className="pflag" style={{ margin: 0, background: (focused ? focusedSourceBadgeReady : isLive) ? "rgba(33,208,122,.14)" : "rgba(255,138,42,.12)", color: focusedSourceBadgePending ? TK.yellow : (focused ? focusedSourceBadgeReady : isLive) ? TK.green : TK.orange, border: "1px solid " + (focusedSourceBadgePending ? TK.yellow : (focused ? focusedSourceBadgeReady : isLive) ? TK.green : TK.orange) }}>{localizedFocusedLiveBadge || (isLive ? `LIVE ${liveSymbol(getActiveSymbol())}` : <><Glyph name="warning" size={12} /> SIM | MT5 offline</>)}</span>}
        {focused && mt5RefreshStatus && <span className="pflag" role="status" aria-live="polite" aria-atomic="true" style={{ margin: 0, color: TK.yellow, borderColor: TK.yellow }} title={mt5RefreshStatus}>{focusedCopy.refresh}</span>}
        {focused && source === "Live" && tf === "M5" && <span className={`pflag m5-heartbeat ${verifiedM5HeartbeatState === "FRESH" && verifiedM5RefreshState === "OK" ? "g" : "a"}`} role="status" aria-live="polite" aria-atomic="true" title={`${verifiedM5HeartbeatLabel} | SHADOW_ONLY | NO_DECISION`}>{verifiedM5HeartbeatLabel}</span>}
        {source === "Replay" && tf === "M1" && m1Years.length > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 10.5, color: TK.purple, fontWeight: 700 }}>M1 11y | Year</span>
            <select className="ms-sel" value={m1Year} onChange={(e) => setM1Year(e.target.value)}>{m1Years.map((y) => <option key={y.year} value={y.year}>{y.year} | {Math.round(y.n / 1000)}k bars</option>)}</select>
          </span>
        )}
        {!focused && <span className="pflag a">{source === "CSV" ? "VOLUME NOT USED AS EVIDENCE" : "SYNTHETIC VOLUME: NOT EVIDENCE"}</span>}
        {csvName && <span className="pmut psm" style={{ maxWidth: 230, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{csvName}</span>}
        {csvErr && <span className="pflag r" style={{ margin: 0 }}><Glyph name="warning" size={12} /> {csvErrDisplay || csvErr}</span>}
        {source==="CSV"&&csvWarnings.length>0&&<details style={{fontSize:11,color:TK.orange}}><summary>Import notes ({csvWarnings.length})</summary><ul>{csvWarnings.map(note=><li key={note}>{note}</li>)}</ul></details>}
      </div>

      {!focused && <><div style={{ marginBottom: 10 }}><LegacyMt5ConnectPanel /></div>
      <LegacyCsvImportPanel onOpen={openCsv}/>
      {source==="CSV"&&csvMeta&&activeCard&&stageBars.length>0&&<LegacyStrategyAttributionPanel importId={csvMeta.id} card={activeCard} from={stageBars[0].t} to={stageBars[stageBars.length-1].t} windowTf={designTf} options={researchOptions}/>}
      {source==="CSV"&&csvMeta&&activeCard&&stageBars.length>0&&<LegacyDecisionEvidencePanel importId={csvMeta.id} card={activeCard} from={stageBars[0].t} to={stageBars[stageBars.length-1].t} windowTf={designTf} barsCount={stageBars.length} options={researchOptions}/>}
      {source==='CSV'&&csvMeta&&<div className="pc" style={{padding:10}}><p>Imported interval | {csvMeta.symbol} | {csvMeta.from} → {csvMeta.to} UTC. This is a diagnostic run, not an automatic 10Y / OOS / forward holdout.</p>{csvMeta.quality.gapCount>0&&<button onClick={()=>setCsvRange({from:csvMeta.quality.longestContinuous.from,to:csvMeta.quality.longestContinuous.to})}>Use longest continuous interval ({csvMeta.quality.longestContinuous.bars.toLocaleString()} source bars)</button>}{csvRange&&<button onClick={()=>setCsvRange(undefined)}>Use full imported interval</button>}</div>}</>}
      <div className="ms-grid">
        {/* LEFT context */}
        {!focused && <div className="ms-col">
          <div className="pc" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div className="pc-h" style={{ alignSelf: "stretch" }}>Market State <span className="mut">now</span></div>
            {hasAssessment ? <Ring value={fitScore} color={fitCol} label="Source assessment" size={96} /> : <div className="product-muted" style={{padding:18}}>Not measured</div>}
            <div style={{ fontWeight: 800, fontSize: 11.5, color: fitCol, letterSpacing: ".6px", marginTop: -2 }}>{fitStatus}</div>
            <div className="pmut psm" style={{ textAlign: "center", lineHeight: 1.45, marginTop: 3 }}><b style={{ color: TK.text2 }}>Why:</b> {why}</div>
          </div>
          {!focused && <LegacyPreEventWarning cleanliness={Math.max(20, Math.round(100 - danger * 0.7))} />}
          <div className="pc"><div className={`pc-h ${kidi && kidi.frozen ? "red" : kidi && kidi.total ? "amber" : "green"}`}>KIDI Status <span className="mut">{isLive ? "live tape" : source === "Live" ? "historical fallback" : source.toLowerCase()}</span></div>
            <div className="pkv"><span>Integrity</span><b style={{ color: kidi && kidi.frozen ? TK.red : kidi && kidi.total ? TK.yellow : TK.green }}>{kidi ? (kidi.frozen ? "BLOCK | frozen feed" : kidi.total ? "WARN | " + kidi.total + " events" : "CLEAN") : "—"}</b></div>
            <div className="pkv"><span>Frozen / Range-0</span><b style={{ color: kidi && (kidi.frozen || kidi.rangeZero) ? TK.yellow : TK.muted }}>{kidi ? kidi.frozen + " / " + kidi.rangeZero : "—"}</b></div>
            <div className="pkv"><span>{source === "CSV" ? "Source gaps (full import)" : "Data gap"}</span><b style={{ color: TK.orange }}>{source === "CSV" && csvMeta ? csvMeta.quality.gapCount : kidi ? kidi.gap : "—"}</b></div>
          </div>
          <div className="pc"><div className="pc-h amber">Liquidity / Spread</div>
            <div className="pkv"><span>Spread</span><b>{(adv as any).spread != null ? f((adv as any).spread, 2) + " " : "—"}<span className="pmut">{(adv as any).spread != null ? "Normal" : "no data"}</span></b></div>
            <div className="pkv"><span>Pool above</span><b style={{ color: TK.red }}>{fp(liq.nearest_liquidity_above)}</b></div>
            <div className="pkv"><span>Pool below</span><b style={{ color: TK.blue }}>{fp(liq.nearest_liquidity_below)}</b></div>
          </div>
          <div className="pc">
            <div className="pc-h">
              Quick Actions | <InfoTip title="Chart Annotations" text="Marks are personal chart annotations only — never execution orders." />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className="ms-q">* Mark Obs</button><button className="ms-q"><Glyph name="x" size={12} /> Mark Inval</button>
              <button className="ms-q"><Glyph name="edit" size={12} /> Note</button><button className="ms-q">–£ Screenshot</button>
            </div>
          </div>
        </div>}

        {/* CENTER chart */}
        <div className="ms-chart">
          {replayBars.length >= 2
            ? (() => {
      const renderChart = (brokerEvidence: Pick<BrokerEvidenceState, "deals" | "lines">) => {
        // Focused M5 history is promoted through the stricter two-year contract
        // and disables the legacy bundle poller, but it still has an authorized
        // MT5 tick path. Let the chart subscribe once that focused history is
        // verified so the forming candle can update without contaminating the
        // closed-bar detector tape.
        const liveChart = isLive || focusedSourceBadgeReady;
        return <MicroChart bars={replayBars} zones={visZones} lines={[...visLines, ...brokerEvidence.lines]} symbol={liveChart ? liveSymbol(requestedSymbol) : requestedSymbol} tf={tf} live={liveChart} locale={locale} cursor={cursor} focusIndex={focused ? (focusedNamedHistorySignal?.i ?? historicalChartFocus) : null} focusRequestId={chartFocusRequest} focusTime={focused ? focusedNamedHistorySignal?.time || analogueFocusTimeRef.current || previewOccurrenceTimeRef.current : null} focusAnnotation={focused ? analogueFocusAnnotation : null} historicalSignal={focused ? (focusedNamedHistorySignal || focusedHistoricalSignal) : null} landmarksAtLatestOnly={focused} compactChrome={focused} startAtLatest={focused} viewportRestore={focused ? snapshotViewportRestore : null} drawingsRestore={focused ? snapshotDrawingsRestore : null} onViewportChange={onMicroChartViewportChange} onDrawingsChange={onMicroChartDrawingsChange} markers={replay.markers} signals={priceActionSignals} onSignalSelect={selectPriceActionSignal} researchStatus={focused ? forecastChartStatus : undefined} researchProvenance={focused ? localizedChartOverlayProvenance : undefined} researchPattern={focused ? currentPatternExplanation : undefined} researchPatternSignals={focused ? currentPatternSignals : []} researchPatternLabel={focused ? currentPatternSignalLabel : undefined} trades={revealed} brokerDeals={brokerEvidence.deals} brokerSymbol={requestedSymbol} episodes={msEpisodes?.bands} formingEpisode={msEpisodes?.forming} />;
      };
              if (focused || source !== "Live") return renderChart({ deals: [], lines: [] });
              return <LegacyBrokerEvidence symbol={getActiveSymbol()} enabled>{renderChart}</LegacyBrokerEvidence>;
            })()
            : <div className={focused ? "m5-empty-chart" : "mfe-empty"} role={focused ? "region" : "status"} tabIndex={focused ? 0 : undefined} aria-live={focused ? undefined : "polite"} aria-label={focused ? `M5 chart status: ${focusedHistoryVerifying ? locale === "vi" ? viCopy("%C4%90ang%20t%E1%BA%A3i%20d%E1%BB%AF%20li%E1%BB%87u%20bi%E1%BB%83u%20%C4%91%E1%BB%93") : "loading chart data" : replayBars.length === 0 ? locale === "vi" ? viCopy("Ch%C6%B0a%20c%C3%B3%20d%E1%BB%AF%20li%E1%BB%87u%20n%E1%BA%BFn%20%C4%91%C3%B3ng") : "no closed-bar data" : locale === "vi" ? viCopy("C%E1%BA%A7n%20%C3%ADt%20nh%E1%BA%A5t%20hai%20n%E1%BA%BFn%20%C4%91%C3%B3ng") : "insufficient closed-bar data"}` : replayBars.length === 0 ? locale === "vi" ? viCopy("Ch%C6%B0a%20c%C3%B3%20d%E1%BB%AF%20li%E1%BB%87u%20n%E1%BA%BFn%20%C4%91%C3%B3ng") + ` ${requestedSymbol} ${tf}` : `No closed-bar data available for ${requestedSymbol} ${tf}` : `Insufficient closed-bar data for ${requestedSymbol} ${tf}`} style={focused ? undefined : { flex: 1 }}>{focused ? <div className="m5-empty-content">{focusedHistoryVerifying && <span className="m5-empty-spinner" aria-hidden="true" />}<div role="status" aria-live="polite" aria-atomic="true"><strong>{focusedHistoryVerifying ? locale === "vi" ? viCopy("%C4%90ang%20t%E1%BA%A3i%20d%E1%BB%AF%20li%E1%BB%87u%20bi%E1%BB%83u%20%C4%91%E1%BB%93") : "Loading chart data" : replayBars.length === 0 ? locale === "vi" ? viCopy("Ch%C6%B0a%20c%C3%B3%20d%E1%BB%AF%20li%E1%BB%87u%20n%E1%BA%BFn%20%C4%91%C3%B3ng") + ` ${requestedSymbol} ${tf}` : `No closed-bar data available for ${requestedSymbol} ${tf}` : locale === "vi" ? viCopy("C%E1%BA%A7n%20%C3%ADt%20nh%E1%BA%A5t%20hai%20n%E1%BA%BFn%20%C4%91%C3%B3ng") + ` ${requestedSymbol} ${tf}` : `Need at least two closed bars for ${requestedSymbol} ${tf}`}</strong><small>{focusedHistoryVerifying ? locale === "vi" ? viCopy("%C4%90ang%20t%E1%BA%A3i%20d%E1%BB%AF%20li%E1%BB%87u%20bi%E1%BB%83u%20%C4%91%E1%BB%93.") : "The chart is loading a local closed-bar snapshot." : locale === "vi" ? viCopy("Ch%C6%B0a%20hi%E1%BB%83n%20th%E1%BB%8B%20n%E1%BA%BFn%20nghi%C3%AAn%20c%E1%BB%A9u%20cho%20%C4%91%E1%BA%BFn%20khi%20h%E1%BB%A3p%20%C4%91%E1%BB%93ng%20n%E1%BA%BFn%20%C4%91%C3%B3ng%20%C4%91%E1%BA%A1t%20y%C3%AAu%20c%E1%BA%A7u.") : "No research candles are displayed until the read-only closed-bar contract is satisfied."}</small><span className="m5-empty-count">{replayBars.length > 0 ? replayBars.length.toLocaleString() + " " + focusedCopy.retainedClosedBars : ""}</span></div>{focusedM5RetryAvailable && <button type="button" className="m5-empty-retry" disabled={verifiedM5HistoryState === "loading"} aria-label={locale === "vi" ? viCopy("Th%E1%BB%AD%20l%E1%BA%A1i%20x%C3%A1c%20minh%20l%E1%BB%8Bch%20s%E1%BB%AD%20n%E1%BA%BFn%20%C4%91%C3%B3ng%20MT5") : "Retry MT5 closed-bar history verification"} onClick={() => { setVerifiedM5HistoryState("loading"); setHistoryRetryNonce((value) => value + 1); }}>{verifiedM5HistoryState === "loading" ? focusedCopy.retryingHistory : focusedCopy.retryHistory}</button>}</div> : <><div className="ic" aria-hidden="true">?</div><div className="msg">{replayBars.length === 0 ? locale === "vi" ? viCopy("Ch%C6%B0a%20c%C3%B3%20d%E1%BB%AF%20li%E1%BB%87u%20n%E1%BA%BFn%20%C4%91%C3%B3ng") + ` ${requestedSymbol} ${tf}` : `No closed-bar data available for ${requestedSymbol} ${tf}` : locale === "vi" ? viCopy("C%E1%BA%A7n%20%C3%ADt%20nh%E1%BA%A5t%20hai%20n%E1%BA%BFn%20%C4%91%C3%B3ng") + ` ${requestedSymbol} ${tf}` : `Need at least two closed bars for ${requestedSymbol} ${tf}`}</div></>}</div>}
        </div>

        {focused && !chartOnly && <aside className="m5-focused-sidepanel" aria-label={locale === "vi" ? "Thông tin mô hình hiện tại" : "Current pattern information"}>
          <section className="m5-focused-sidecard">
            <div className="m5-focused-sideheading"><span>{locale === "vi" ? "Mô hình hiện tại" : "Current pattern"}</span><span className="m5-focused-sideauthority">SHADOW_ONLY</span></div>
            {currentPatternSignals.length ? <div className="m5-focused-pattern-list">{currentPatternSignals.slice(0, 8).map((signal) => <button key={`${signal.conceptId || signal.label}:${signal.time}`} type="button" className="m5-focused-pattern-chip" aria-pressed={selectedKnowledgePattern === signal.conceptId} onClick={() => selectPriceActionSignal(signal)}>{currentPatternSignalLabel(signal)}</button>)}</div> : <p className="m5-focused-muted">{locale === "vi" ? "Chưa có mô hình nến đóng nào được xác nhận." : "No confirmed closed-bar pattern is available."}</p>}
            <p className="m5-focused-pattern-name">{selectedPriceActionCopy?.name || (selectedNamedPattern ? selectedNamedPattern.replace(/_/g, " ") : currentPatternSignals[0]?.label || focusedCopy.noPattern)}</p>
            <p className="m5-focused-explanation">{selectedNamedPattern ? (getNamedCandleKnowledge(selectedNamedPattern)?.structure || currentPatternExplanation) : selectedPriceActionCopy?.definition || currentPatternExplanation}</p>
          </section>
          <section className="m5-focused-sidecard">
            <div className="m5-focused-sideheading"><span>{locale === "vi" ? "Win rate nến đóng tiếp theo" : "Next closed-bar win rate"}</span><span className="m5-focused-winrate">{selectedPriceActionEvidence?.hitRate != null ? `${(selectedPriceActionEvidence.hitRate * 100).toFixed(1)}%` : selectedNamedPattern ? selectedNamedWinRateReadout : "—"}</span></div>
            <p className="m5-focused-muted">{selectedPriceActionEvidence ? `${selectedPriceActionEvidence.occurrences.toLocaleString()} ${locale === "vi" ? "lần xuất hiện" : "occurrences"} · n=${selectedPriceActionEvidence.evaluated.toLocaleString()} · ${locale === "vi" ? "kết quả kế tiếp" : "next-bar outcomes"} UP ${selectedPriceActionEvidence.outcomes.up} / DOWN ${selectedPriceActionEvidence.outcomes.down} / FLAT ${selectedPriceActionEvidence.outcomes.flat}` : selectedNamedH1 ? `${locale === "vi" ? "Mẫu nhân quả" : "Causal sample"} n=${selectedNamedH1.sampleN.toLocaleString()} · UP ${(selectedNamedH1.up * 100).toFixed(0)}% · FLAT ${(selectedNamedH1.flat * 100).toFixed(0)}% · DOWN ${(selectedNamedH1.down * 100).toFixed(0)}%` : (locale === "vi" ? "Chưa đủ mẫu để tính win rate." : "Insufficient retained samples for a win rate.")}</p>
          </section>
          <section className="m5-focused-sidecard">
            <div className="m5-focused-sideheading"><span>{locale === "vi" ? "Các mẫu trong quá khứ" : "Historical examples"}</span><span className="m5-focused-sideauthority">{selectedPriceActionEvidence?.history.length || selectedNamedAnalogueMatches.length}</span></div>
            {selectedPriceActionEvidence?.history.length ? <ol className="m5-focused-history-list">{selectedPriceActionEvidence.history.slice(-6).reverse().map((occurrence) => <li key={`${occurrence.time}:${occurrence.i}`}><button type="button" onClick={() => { const signal = priceActionOccurrenceToSignal(occurrence, selectedPriceActionEvidence.conceptId, detectorBars); if (signal) selectPriceActionSignal(signal); }}>{occurrence.time.replace("T", " ").replace("Z", " UTC")}</button><span>{occurrence.direction} → {occurrence.nextBar}</span></li>)}</ol> : selectedNamedPattern && selectedNamedHistoryExamples.length ? <><ol className="m5-focused-history-list">{selectedNamedHistoryExamples.map((match) => <li key={`${match.time}:${match.endIndex}`}><button type="button" onClick={() => { const signal = namedCandleHistoryToSignal(selectedNamedPattern as NamedCandlePattern, { time: match.time }, detectorBars); if (signal) selectPriceActionSignal(signal); }}>{match.time.replace("T", " ").replace("Z", " UTC")}</button><span>{match.outcome[0] || "—"} · {locale === "vi" ? "tương đồng nhân quả" : "causal analogue"}</span></li>)}</ol><p className="m5-focused-muted">{locale === "vi" ? viCopy("V%C3%AD%20d%E1%BB%A5%20t%C6%B0%C6%A1ng%20%C4%91%E1%BB%93ng%20nh%C3%A2n%20qu%E1%BA%A3%20ch%E1%BB%89%20mang%20t%C3%ADnh%20m%C3%B4%20t%E1%BA%A3%3B%20kh%C3%B4ng%20c%C3%B3%20quy%E1%BB%81n%20quy%E1%BA%BFt%20%C4%91%E1%BB%8Bnh%20hay%20%C4%91%E1%BA%B7t%20l%E1%BB%87nh.") : "Causal analogue examples are descriptive only; no decision or order authority."}</p></> : <p className="m5-focused-muted">{locale === "vi" ? "Chọn một marker để xem các mẫu lịch sử tương ứng." : "Select a marker to inspect retained historical examples."}</p>}
          </section>
          <section className="m5-focused-sidecard m5-focused-position-card">
            <div className="m5-focused-sideheading"><span>{locale === "vi" ? "Vị thế mô tả trên biểu đồ" : "Descriptive chart position"}</span></div>
            <p className="m5-focused-muted">{priceActionDirection ? `${priceActionDirection === "UP" ? "BUY" : "SELL"} · ${priceActionGeometryReadout}` : priceActionGeometryStatus}</p>
          </section>
        </aside>}
        {focused && <PdfSignalCoverageShelf result={allPdfSignalResult} verification={pdfSignalVerification} locale={locale} onSelect={selectPdfCoverageConcept} />}
        {focused && <HistoricalPdfStatistics bars={detectorBars} enabled={pdfSignalStatisticsEnabled} locale={locale} />}
        {focused && !chartOnly && <PdfAssumptionsPanel value={pdfAssumptions} onChange={setPdfAssumptions} locale={locale} disabled={tf !== "M5"} />}

        {focused && inspectedSignal && <ChartPatternInspector
          key={verifiedM5HistoryState === "ready" ? `${verifiedM5History?.cacheScope || ""}:${requestedSymbol}:${liveSymbol(requestedSymbol)}` : `local:${requestedSymbol}`}
          signal={inspectedSignal} bars={detectorBars}
          locale={locale}
          bookmarkScope={verifiedM5HistoryState === "loading" ? "" : verifiedM5HistoryState === "ready" ? (verifiedM5History?.cacheScope ? `${verifiedM5History.cacheScope}:${requestedSymbol}:${liveSymbol(requestedSymbol)}` : "") : `local-snapshot:${requestedSymbol}:M5`}
          onResolveReplayBookmark={resolveReplayBookmarkSignal} onRestoreReplaySignal={setInspectedSignal}
          replayBookmarkGeometryAllowed={candidate => Date.parse(candidate.time) < Date.parse(detectorBars[detectorBars.length - 1]?.t || "") || (focusedSourceBadgeReady && priceActionFreshness?.ok === true)}
          knowledge={getPriceActionKnowledge(inspectedSignal.conceptId)}
          namedKnowledge={inspectedSignal.annotationKind === "named_candle" ? getNamedCandleKnowledge(inspectedSignal.conceptId?.replace(/^named_candle:/, "")) : null}
          namedHistoryStatus={namedHistoryStatus}
          onRetryNamedHistory={retryNamedHistory}
          evidence={inspectedEvidence} namedHistory={inspectedNamedHistory} occurrences={inspectorOccurrences}
          evidenceStatus={priceActionScanStatus} onRetryEvidence={retryPriceActionScan}
          sourceLabel={focusedSourceBadgeReady ? (locale === "vi" ? "Lịch sử nến đóng MT5 đã xác minh" : "Verified MT5 closed-bar history") : (locale === "vi" ? "Ảnh chụp lịch sử cục bộ · Tạm giữ dự báo trực tiếp" : "Local historical snapshot · Live forecast withheld")}
          allowGeometry={Date.parse(inspectedSignal.time) < Date.parse(detectorBars[detectorBars.length - 1]?.t || "") || (focusedSourceBadgeReady && priceActionFreshness?.ok === true)}
          onNavigate={navigateInspectorOccurrence} onShowOnChart={selectPriceActionSignal} onClose={() => setInspectedSignal(null)}
        />}

        {/* RIGHT context-now + indicators */}
        {!focused && <div className="ms-col">
          <div className="pc"><div className="pc-h">Context Now</div>
            {ctx.map(([k, v, c]) => <div key={k as string} className="pkv"><span>{k}</span><b style={{ color: c as string }}>{v}</b></div>)}
          </div>
          <div className="pc"><div className="pc-h violet">Indicator Snapshot</div>
            {indicators.map(([k, v, c]) => <div key={k as string} className="pkv"><span>{k}</span><b style={{ color: c as string }}>{v}</b></div>)}
          </div>
          <div className="pc">
            <div className="pc-h">
              Active Zones <span className="mut">toggle overlays</span>
              <InfoTip title="Zone-Only Overlays" text="Structural reference bands only — not exact order entry prices. Toggle individual zones to declutter the chart." align="right" />
            </div>
            {!cardZones.length && <p className="product-muted">No zone output from the selected Card. Add a supported L6 zone in Canvas.</p>}
            {ZONE_META.filter(meta=>cardZones.some(zone=>zone.role===meta.key)).map((z) => { const on = zoneOn[z.key]; return (
              <div key={z.key} className="az-row" style={{ opacity: on ? 1 : 0.5 }}>
                <span className="az-dot" style={{ background: z.color }} />
                <div className="az-txt"><div className="az-name" style={{ color: z.color }}>{z.name}</div><div className="az-desc">{z.desc}</div></div>
                <button className="az-eye" title={on ? "Visible — click to hide" : "Hidden — click to show"} onClick={() => setZoneOn((s) => ({ ...s, [z.key]: !s[z.key] }))}><Eye on={on} color={z.color} /></button>
              </div>
            ); })}
          </div>
        </div>}
      </div>

      <section className="pc" style={{ marginTop: 12, minWidth: 0, width: "100%", maxWidth: "100%", boxSizing: "border-box", overflow: "hidden" }} aria-label={focusedCopy.sourceCoverage}><div className="pc-h">{focusedCopy.sourceCoverage}</div><div className="source-coverage-status" role="status" aria-live="polite" aria-atomic="true" aria-label={`${focusedCopy.sourceCoverageStatus}: ${sourceCoverageStatus}`}>{sourceCoverageStatus}</div><p className="product-muted">{chartEvidenceSource}. {focusedCopy.sourceCoverageDisclosure}</p><div className="pkv"><span>{focusedCopy.evidenceSource}</span><b>{chartEvidenceSource}</b></div><div className="pkv"><span>{focusedCopy.coverageWindow}</span><b>{chartWindow}</b></div><div className="pkv"><span>{focusedCopy.retention}</span><b>{chartCoverage}</b></div><div className="pkv"><span>{focusedCopy.m5Cutoff}</span><b>{chartRetentionCutoffUtc}</b></div><div className="pkv"><span>{focusedCopy.latestClosedBar}</span><b>{latestClosedBarUtc || "Unavailable"}</b></div><div className="pkv"><span>{focusedCopy.closedBarAge}</span><b>{latestClosedBarAge}</b></div>{mt5FallbackReason && <div className="pkv"><span>{focusedCopy.fallbackReason}</span><b>{mt5FallbackReason}</b></div>}{mt5RefreshStatus && <div className="pkv" role="status" aria-live="polite" aria-atomic="true"><span>{focusedCopy.mt5Refresh}</span><b>{mt5RefreshStatus}</b></div>}{verifiedHistoryDiagnostics && <><div className="pkv"><span>{focusedCopy.mt5Assembly}</span><b>{verifiedHistoryDiagnostics.coverage}</b></div><div className="pkv"><span>{focusedCopy.cacheChunks}</span><b>{verifiedHistoryDiagnostics.chunks}</b></div><div className="pkv"><span>{focusedCopy.accountScope}</span><b>{verifiedHistoryDiagnostics.scope}</b></div><div className="pkv"><span>{focusedCopy.actualUtcRange}</span><b>{verifiedHistoryDiagnostics.range}</b></div><div className="pkv"><span>{focusedCopy.runtimeAttestation}</span><b>{verifiedHistoryDiagnostics.runtime}</b></div></>}<div className="pkv"><span>{focusedCopy.barContract}</span><b>{focusedCopy.barContractValue}</b></div><div className="pkv"><span>{focusedCopy.authority}</span><b>SHADOW_ONLY · NO_DECISION · live_apply_allowed=false</b></div>{focused && <><small className="product-muted">{focusedCopy.coverageAcceptance}</small><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}><button type="button" className="ms-q" style={{ flex: "none", padding: "5px 8px" }} onClick={exportFocusedSnapshot}>{focusedCopy.exportSnapshot}</button><button type="button" className="ms-q" style={{ flex: "none", padding: "5px 8px" }} onClick={copyFocusedSnapshot}>{focusedCopy.copySnapshot}</button><button type="button" className="ms-q" style={{ flex: "none", padding: "5px 8px" }} onClick={() => snapshotFileInput.current?.click()}>{focusedCopy.importSnapshot}</button>{source === "Live" && tf === "M5" && <button type="button" className="ms-q" style={{ flex: "none", padding: "5px 8px" }} disabled={verifiedM5HistoryState === "loading"} onClick={() => { setVerifiedM5HistoryState("loading"); setHistoryRetryNonce((value) => value + 1); }}>{verifiedM5HistoryState === "loading" ? focusedCopy.retryingHistory : focusedCopy.retryHistory}</button>}<input ref={snapshotFileInput} type="file" accept="application/json,.json" onChange={importFocusedSnapshotFile} style={{ display: "none" }} /></div>{snapshotStatus && <small role="status" aria-live="polite" className="product-muted" style={{ display: "block", minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", whiteSpace: "normal" }}>{snapshotStatus}</small>}</>}</section>

      {focused && <section className="pc" aria-label={focusedCopy.bookmarks} style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
        <div className="pc-h">{focusedCopy.bookmarks} <span className="mut">named chart context | local only | {readOnlyLabel}</span></div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", minWidth: 0 }}>
            <button type="button" className="ms-q" style={{ flex: "none", minHeight: 36, padding: "5px 8px" }} onClick={saveResearchBookmark}>{focusedCopy.saveBookmark}</button>
          {!researchBookmarks.length && <small className="product-muted">{focusedCopy.noBookmarks}</small>}
            {researchBookmarks.map((record) => <span key={record.id} style={{ display: "inline-flex", gap: 4, alignItems: "center", boxSizing: "border-box", minWidth: 0, maxWidth: "100%", border: "1px solid var(--mfe-border)", borderRadius: 6, padding: "2px 4px", background: "var(--mfe-s3)" }}><button type="button" className="ms-q" style={{ flex: "1 1 auto", minWidth: 0, maxWidth: "100%", minHeight: 36, padding: "3px 6px", textAlign: "left", whiteSpace: "normal", overflowWrap: "anywhere" }} onClick={() => restoreResearchBookmark(record)} title={`Restore ${record.name}`}>{record.name}</button><button type="button" className="ms-q" style={{ flex: "none", minWidth: 36, minHeight: 36, padding: "3px 6px", color: "var(--mfe-red)" }} onClick={() => deleteResearchBookmark(record.id)} aria-label={`Delete bookmark ${record.name}`}>x</button></span>)}
        </div>
        <small className="product-muted">Bookmarks retain the viewport, drawings, selected pattern UTC and evidence summary. History is recomputed from the current tape; full JSON exports include the historical rows. They never create orders or decision authority.</small>
      </section>}

      {focused && <section className="pc m5-price-action-readout" aria-label={focusedCopy.priceActionReadout}>
        <div className="pc-h">{focusedCopy.priceActionReadout} <span className="mut">{focusedCopy.closedEvidence} | SHADOW_ONLY | NO_DECISION</span></div>
        <div className="m5-pa-grid">
          <div><div className="m5-current-bar-readout" data-current-bar-direction={currentBarReadout.direction} data-current-bar-status={currentBarReadout.status} aria-label={`${locale === "vi" ? "Nến M5 đã đóng hiện tại" : "Current closed M5 bar"}: ${currentBarReadout.direction}; ${currentBarReadout.timestamp || (locale === "vi" ? "không có dấu thời gian" : "timestamp unavailable")}; ${currentBarOhlcReadout}; SHADOW_ONLY / NO_DECISION`}><span className="pmut psm">{focusedCopy.currentClosedBar}</span><b>{currentBarReadout.direction === "WAIT" ? "WAIT" : `${currentBarReadout.direction} ${locale === "vi" ? "nến" : "candle"}`} | {currentBarReadout.status}</b><small>{currentBarReadout.timestamp ? `${currentBarReadout.timestamp} UTC` : locale === "vi" ? "Không có dấu thời gian" : "Timestamp unavailable"} | {currentBarOhlcReadout} | {locale === "vi" ? "quan sát thân nến mang tính mô tả" : "descriptive body observation"} | SHADOW_ONLY / NO_DECISION</small><small className="m5-close-clock-readout" data-close-clock-state={currentBarCloseClock.state} role="status" aria-live="polite" aria-atomic="true" aria-label={`${locale === "vi" ? "Lịch đóng M5 tiếp theo" : "Next M5 close schedule"}: ${currentBarCloseClockReadout}; ${locale === "vi" ? "chỉ lịch UTC; không phải tín hiệu giao dịch hay quyền đặt lệnh" : "UTC schedule only; no trading signal or order authority"}`}>{currentBarCloseClockReadout} | {locale === "vi" ? "chỉ lịch UTC" : "UTC schedule only"} | SHADOW_ONLY / NO_DECISION | {locale === "vi" ? "không có tín hiệu giao dịch" : "no trading signal"}</small></div><span className="pmut psm">{focusedCopy.currentConcepts}</span><b>{priceAction?.markers.length ? priceAction.markers.map((marker) => localizedConceptName(marker.conceptId, marker.label)).join(" · ") : focusedCopy.abstainConcept}</b>{currentConceptMarkers.length > 0 && <div style={{ display: "grid", gap: 3, marginTop: 3 }}>{currentConceptMarkers.map((marker) => { const sourceLens = getPriceActionKnowledge(marker.conceptId); const sourceName = sourceLens ? getSourceNotesCopy(sourceLens, locale).name : marker.label; const assessment = priceAction?.assessments.find((candidate) => candidate.conceptId === marker.conceptId); const detectorReason = localizedDetectorReason(assessment?.reason || "closed-bar geometry matched", locale); const evidenceScore = `${(marker.score * 100).toFixed(0)}% ${locale === "vi" ? "điểm hình học" : "geometry score"}`; return <button key={`${marker.conceptId}:${marker.i}`} type="button" className="ms-q" aria-label={locale === "vi" ? `${sourceName}; ${marker.direction}; ${evidenceScore}; ${focusedCopy.sourcePages} ${formatPriceActionSourcePages(marker.pageAnchors)}; ${focusedCopy.detectorReason} ${detectorReason}; ${focusedCopy.inspectPdfLens}` : `${sourceName}; ${marker.direction}; ${evidenceScore}; source pages ${formatPriceActionSourcePages(marker.pageAnchors)}; detector reason ${detectorReason}; inspect source lens`} aria-pressed={selectedKnowledgePattern === marker.conceptId} onClick={() => selectPriceActionSignal(priceActionMarkerToSignal(marker))} style={{ display: "block", textAlign: "left", padding: "4px 6px", flex: "none" }}>{locale === "vi" ? `${sourceName} · ${marker.direction} · ${evidenceScore} · ${focusedCopy.measured} ${detectorReason} · ${formatPriceActionSourcePages(marker.pageAnchors)} · ${focusedCopy.inspectPdfLens}` : <>{sourceName} · {marker.direction} · {evidenceScore} · measured {detectorReason} · {formatPriceActionSourcePages(marker.pageAnchors)} · inspect PDF lens</>}</button>; })}</div>}<small className="m5-current-pattern-explanation" role="status" aria-live="polite" aria-label={`${focusedCopy.currentPatternExplanation}: ${currentConceptExplanation}`}>{currentConceptExplanation}</small><small role="status" aria-live="polite" aria-atomic="true" aria-label={currentConceptProvenanceReadout}>{currentConceptProvenanceReadout}</small><small>{priceActionGeometryStatus} {priceAction?.reason || (locale === "vi" ? "Hình học điểm đánh dấu chỉ được đánh giá sau khi kiểm tra nến đóng và tính liên tục." : "Marker geometry is evaluated only after closed-bar and continuity checks.")}</small><small role="status" aria-live="polite" aria-atomic="true" aria-label={priceActionReadoutStatus}>{priceActionReadoutStatus}</small><small role="status" aria-live="polite" aria-label={priceActionGeometryReadout}>{priceActionGeometryReadout}</small></div>
          {/* Source contract keeps the English fallback wording stable while locale copy serves Vietnamese. */}
          {/* ${historicalNamedCandleSignals.length} historical ${analoguePatternFilter} endpoints are annotated on the chart. */}
          {/* analogueFamilyFilter ? `${historicalNamedCandleEndpointCount} historical ${namedCandleFamilyLabel(analogueFamilyFilter)} endpoints are annotated on the chart.` */}
          <div aria-label={focusedCopy.currentNamedCandleAria} data-locale-label={focusedCopy.currentNamedCandleAria}>{/* namedPatternEvidenceLabel(pattern, prediction) */}<span className="pmut psm">{focusedCopy.namedCandleEvidence}</span>{currentNamedPatternEvidence.length ? <div style={{ display: "grid", gap: 3, marginTop: 2 }}>{currentNamedPatternEvidence.map(({ pattern, prediction }) => <button key={pattern} type="button" className="ms-q" aria-label={prediction ? namedPatternEvidenceLabel(pattern, prediction, locale) : `${pattern}; ${locale === "vi" ? "bằng chứng có điều kiện không khả dụng" : "conditional evidence unavailable"}`} aria-pressed={analoguePatternFilter === pattern} onClick={() => { resetAnalogueSelection(analoguePatternFilter === pattern ? null : pattern, null); }} style={{ display: "block", textAlign: "left", padding: "4px 6px", flex: "none" }}>{prediction ? namedPatternEvidenceLabel(pattern, prediction, locale) : `${pattern} - ${locale === "vi" ? "bằng chứng có điều kiện không khả dụng" : "conditional evidence unavailable"}`}</button>)}</div> : <small>{focusedCopy.currentNamedCandleUnavailable}</small>}<small>{focusedCopy.namedCandleConditionalNote}</small><small>{analoguePatternFilter ? locale === "vi" ? `${historicalNamedCandleSignals.length} ${focusedCopy.namedCandlePatternEndpoints}` : `${historicalNamedCandleSignals.length} historical ${analoguePatternFilter} endpoints are annotated on the chart.` : analogueFamilyFilter ? locale === "vi" ? `${historicalNamedCandleEndpointCount} ${focusedCopy.namedCandleFamilyEndpoints}` : `${historicalNamedCandleEndpointCount} historical ${namedCandleFamilyLabel(analogueFamilyFilter)} endpoints are annotated on the chart.` : focusedCopy.namedCandleFilterPrompt}</small>{selectedNamedCandleKnowledge && <div aria-label={`${selectedNamedCandleKnowledge.pattern} ${focusedCopy.namedCandleLens}`} style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--mfe-border)" }}><small><b>{selectedNamedCandleKnowledge.pattern} {focusedCopy.namedCandleLens}</b> | {selectedNamedCandleKnowledge.family}</small><small>{locale === "vi" ? "Cấu trúc" : "Structure"}: {selectedNamedCandleKnowledge.structure}</small><small>{locale === "vi" ? "Ý nghĩa" : "Meaning"}: {selectedNamedCandleKnowledge.meaning}</small><small>{locale === "vi" ? "TẠM DỪNG" : "ABSTAIN"}: {selectedNamedCandleKnowledge.abstain}</small></div>}{selectedNamedCandleFamilyKnowledge && <div aria-label={`${selectedNamedCandleFamilyKnowledge.family} ${focusedCopy.namedCandleFamilyLens}`} style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--mfe-border)" }}><small><b>{namedCandleFamilyLabel(selectedNamedCandleFamilyKnowledge.family)} {focusedCopy.namedCandleFamilyLens}</b> | {focusedCopy.descriptiveTaxonomy}</small><small>{locale === "vi" ? "Cấu trúc" : "Structure"}: {selectedNamedCandleFamilyKnowledge.structure}</small><small>{locale === "vi" ? "Ý nghĩa" : "Meaning"}: {selectedNamedCandleFamilyKnowledge.meaning}</small><small>{locale === "vi" ? "TẠM DỪNG" : "ABSTAIN"}: {selectedNamedCandleFamilyKnowledge.abstain}</small><small>{focusedCopy.familyAuthority}</small></div>}</div>
          <div className="m5-next-bar-card" data-forecast-direction={forecastObservationDirection} data-forecast-ready={forecastEvidenceReady ? "true" : "false"}>
            <div className="m5-next-bar-heading"><span className="pmut psm">{focusedCopy.nextBarObservation}</span><b className={`m5-direction-badge ${(forecastObservationDirection || "WAIT").toLowerCase()}`}>{forecastObservationDirection === "UP" ? "↑ UP" : forecastObservationDirection === "DOWN" ? "↓ DOWN" : "WAIT"}</b><span className="m5-confidence-chip">margin {((m5Atlas?.consensus.strength ?? 0) * 100).toFixed(1)}%</span></div>
            {forecastPrediction ? <div className="m5-probability-strip" role="img" aria-label={`H+1 distribution: UP ${(forecastPrediction.up * 100).toFixed(0)} percent, FLAT ${(forecastPrediction.flat * 100).toFixed(0)} percent, DOWN ${(forecastPrediction.down * 100).toFixed(0)} percent`}>
              <span className="m5-probability-meter up"><span className="m5-probability-label"><b>UP</b><em>{(forecastPrediction.up * 100).toFixed(0)}%</em></span><span className="m5-probability-track"><i className="m5-probability-fill" style={{ width: `${Math.max(0, Math.min(100, forecastPrediction.up * 100))}%` }} /></span></span>
              <span className="m5-probability-meter flat"><span className="m5-probability-label"><b>FLAT</b><em>{(forecastPrediction.flat * 100).toFixed(0)}%</em></span><span className="m5-probability-track"><i className="m5-probability-fill" style={{ width: `${Math.max(0, Math.min(100, forecastPrediction.flat * 100))}%` }} /></span></span>
              <span className="m5-probability-meter down"><span className="m5-probability-label"><b>DOWN</b><em>{(forecastPrediction.down * 100).toFixed(0)}%</em></span><span className="m5-probability-track"><i className="m5-probability-fill" style={{ width: `${Math.max(0, Math.min(100, forecastPrediction.down * 100))}%` }} /></span></span>
            </div> : <small>{focusedCopy.noForecastDistribution}</small>}
            <div className="m5-gate-strip" role="group" aria-label="Forecast gate checks"><span className={`m5-gate-chip ${forecastHistoryReady ? "pass" : "wait"}`} title="Verified MT5 closed-bar history gate" aria-label={`History gate: ${forecastHistoryReady ? "ready" : "waiting"}`}>{focusedCopy.gateHistory} {forecastHistoryReady ? focusedCopy.gateReady : focusedCopy.gateWait}</span><span className={`m5-gate-chip ${forecastFreshness?.ok === true ? "pass" : "wait"}`} title="Latest closed-bar freshness gate" aria-label={`Freshness gate: ${forecastFreshness?.ok === true ? "fresh" : "waiting"}`}>{focusedCopy.gateFreshness} {forecastFreshness?.ok === true ? focusedCopy.gateFresh : focusedCopy.gateWait}</span><span className={`m5-gate-chip ${forecastWalkForwardReady ? "pass" : "wait"}`} title="Chronological walk-forward coverage gate" aria-label={`Walk-forward coverage gate: ${m5Atlas?.walkForward.evaluated ?? 0} of 12 evaluations`}>{focusedCopy.gateWalkForward} {m5Atlas?.walkForward.evaluated ?? 0}/12</span><span className={`m5-gate-chip ${forecastSupportReady ? "pass" : "wait"}`} title="Effective causal support gate" aria-label={`Effective causal support gate: ${forecastEffectiveN} of 8`}>{focusedCopy.gateSupport} {forecastEffectiveN}/8</span><span className={`m5-gate-chip ${forecastAnalogueReady ? "pass" : "wait"}`} title="Independent analogue coverage gate" aria-label={`Independent analogue coverage gate: ${forecastIndependentN} of 4`}>{focusedCopy.gateAnalogues} {forecastIndependentN}/4</span><span className={`m5-gate-chip ${forecastMarginReady ? "pass" : "wait"}`} title="Consensus margin gate" aria-label={`Consensus margin gate: ${((m5Atlas?.consensus.strength ?? 0) * 100).toFixed(1)} percent of 5 percent`}>{focusedCopy.gateMargin} {((m5Atlas?.consensus.strength ?? 0) * 100).toFixed(1)}%/5%</span><span className={`m5-gate-chip ${forecastSupportDenominators.ok ? "pass" : "wait"}`} title="Causal support metadata gate" aria-label={`Causal support metadata gate: ${forecastSupportDenominators.ok ? "ready" : "waiting"}`}>{focusedCopy.gateCausalMeta} {forecastSupportDenominators.ok ? (locale === "vi" ? "ĐẠT" : "OK") : focusedCopy.gateWait}</span></div>
             <small>{forecastPrediction ? `UP ${(forecastPrediction.up * 100).toFixed(0)}% | FLAT ${(forecastPrediction.flat * 100).toFixed(0)}% | DOWN ${(forecastPrediction.down * 100).toFixed(0)}% | ${forecastStatus}` : `${focusedCopy.noForecastDistribution} | ${forecastStatus}`}</small><div className="m5-forecast-receipt" role="status" aria-live="polite" aria-atomic="true" aria-label={forecastReceiptSummary} data-forecast-receipt="true" data-forecast-receipt-direction={forecastReceiptDirection} data-forecast-receipt-latest-closed-utc={forecastReceiptLatestClosedUtc} data-forecast-receipt-authority="SHADOW_ONLY / NO_DECISION"><span className="m5-forecast-receipt-label">{focusedCopy.evidenceReceipt}</span><span>{forecastReceiptDirection} {"\u00b7"} {forecastReceiptDistribution}</span><span>latest closed {forecastReceiptLatestClosedUtc}</span><span>{forecastReceiptGate}</span><span>{forecastReceiptSource}</span><span>SHADOW_ONLY / NO_DECISION</span></div><small className="m5-forecast-status" role="status" aria-live="polite" aria-atomic="true" aria-label={`${focusedCopy.forecastStatusPrefix}: ${forecastChartStatus}`}>{focusedCopy.forecastStatusPrefix}: {forecastChartStatus}</small><small className="m5-forecast-gate-explanation" role="status" aria-live="polite" aria-atomic="true" aria-label={forecastGateExplanation}>{forecastGateExplanation}</small><small>{forecastCalibrationReadout}</small><small role="status" aria-live="polite" aria-atomic="true" aria-label={forecastFreshnessReadout}>{forecastFreshnessReadout}</small><small>{locale === "vi" ? `${focusedCopy.forecastEvidence}: latest` : "Forecast evidence: latest"} {m5AtlasBars.length.toLocaleString()} of {forecastRetainedBars.toLocaleString()} retained M5 bars | {forecastEvidenceWindow}</small><small>{forecastTruncated ? `${forecastOmittedBars.toLocaleString()} ${focusedCopy.forecastOmittedBars}` : "Forecast uses the complete retained M5 tape."}</small><small>{focusedCopy.forecastGates}: walk-forward {m5Atlas?.walkForward.evaluated ?? 0}/12 | effective support {forecastEffectiveN}/8 | independent analogues {forecastIndependentN}/4 | margin {((m5Atlas?.consensus.strength ?? 0) * 100).toFixed(1)}%/5.0%</small>
          </div>
          <div><span className="pmut psm">{focusedCopy.historicalValidation}</span><b>{m5Atlas?.walkForward.hitRate == null ? "—" : `${(m5Atlas.walkForward.hitRate * 100).toFixed(1)}% hit rate`}</b><small>{m5Atlas ? `${m5Atlas.walkForward.evaluated.toLocaleString()} chronological evaluations · ${m5Atlas.matches.length.toLocaleString()} retained analogues` : "Waiting for sufficient M5 history."}</small></div>
          <div role="region" aria-label={locale === "vi" ? viCopy("Xem%20tr%C6%B0%E1%BB%9Bc%20t%C6%B0%C6%A1ng%20%C4%91%E1%BB%93ng%20nh%E1%BB%8F") : "Mini analogue preview"} tabIndex={0} aria-keyshortcuts="ArrowLeft ArrowRight Home End" onKeyDown={onAnaloguePreviewKeyDown}><span className="pmut psm">{focusedCopy.miniAnaloguePreview}</span><small className="m5-analogue-selection-summary" role="status" aria-live="polite" aria-atomic="true" aria-label={analogueSelectionSummary}>{analogueSelectionSummary}</small><div className="m5-inspection-compare" aria-label={focusedCopy.currentHistoricalInspection}><div className="m5-inspection-pane"><span className="pmut psm">{focusedCopy.currentClosedBar}</span><b>{currentInspectionName}</b><small>{currentInspectionMeta}</small><small>{focusedCopy.currentPatternDescriptive}</small></div><div className="m5-inspection-divider" aria-hidden="true">→</div><div className="m5-inspection-pane"><span className="pmut psm">{focusedCopy.selectedHistoricalAnalogue}</span><b>{nearestAnalogue ? `${locale === "vi" ? viCopy("T%C6%B0%C6%A1ng%20%C4%91%E1%BB%93ng") : "Analogue"} ${analogueIndex + 1}/${analogueMatches.length}` : focusedCopy.previewUnavailable}</b><small>{historicalInspectionMeta}</small><small role="status" aria-live="polite">{analogueOnChart ? focusedCopy.mainChartEndpointFocused : focusedCopy.previewOnlyAlign}</small></div></div>{currentPatternControls}{analogueFilterControls}{nearestAnalogue ? <><AnalogueMiniChart locale={locale} bars={nearestAnalogueBars} endpointIndex={nearestAnalogue.endIndex - Math.max(0, nearestAnalogue.endIndex - m5Atlas!.lookback)} setupPatterns={analoguePatternFilter ? [analoguePatternFilter] : nearestAnalogue.patterns ?? []} color={nearestAnalogueOutcome === "UP" ? TK.green : nearestAnalogueOutcome === "DOWN" ? TK.red : TK.text2} outcome={nearestAnalogueOutcome as "UP" | "DOWN" | "FLAT" | "UNAVAILABLE"} ariaLabel={`${nearestAnalogueLabel}; ${analogueMatchReadout}; ${analoguePatternReadout}; ${analogueFilterReadout}; ${analogueOutcomeReadout}; ${analoguePatternLiftReadout}; ${analogueWinRateReadout}`} /><div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 3 }}><button type="button" className="ms-q" aria-label={locale === "vi" ? viCopy("Hi%E1%BB%87n%20t%C6%B0%C6%A1ng%20%C4%91%E1%BB%93ng%20nh%C3%A2n%20qu%E1%BA%A3%20tr%C6%B0%E1%BB%9Bc") : "Show earlier causal analogue"} disabled={analogueIndex <= 0} onClick={() => selectAnaloguePreviewIndex(analogueIndex - 1)}>{locale === "vi" ? viCopy("Tr%C6%B0%E1%BB%9Bc") : "Earlier"}</button><span className="pmut psm" aria-label={`Causal analogue ${analogueIndex + 1} of ${analogueMatches.length}`}>{analogueIndex + 1}/{analogueMatches.length}</span><button type="button" className="ms-q" aria-label={locale === "vi" ? viCopy("Hi%E1%BB%87n%20t%C6%B0%C6%A1ng%20%C4%91%E1%BB%93ng%20nh%C3%A2n%20qu%E1%BA%A3%20sau") : "Show later causal analogue"} disabled={analogueIndex >= analogueMatches.length - 1} onClick={() => selectAnaloguePreviewIndex(analogueIndex + 1)}>{locale === "vi" ? viCopy("Sau") : "Later"}</button><button type="button" className="ms-q" aria-label={locale === "vi" ? viCopy("Hi%E1%BB%87n%20t%C6%B0%E1%BB%A3ng%20%C4%91%E1%BB%93ng%20l%C3%AAn%20bi%E1%BB%83u%20%C4%91%E1%BB%93%20ch%C3%ADnh") : `Show causal analogue ${analogueIndex + 1} on the main chart`} aria-pressed={analogueOnChart} data-analogue-focus={analogueOnChart ? "active" : "preview-only"} onClick={showAnalogueOnChart}>{analogueOnChart ? (locale === "vi" ? viCopy("Tr%C3%AAn%20bi%E1%BB%83u%20%C4%91%E1%BB%93") : "On chart") : (locale === "vi" ? viCopy("Hi%E1%BB%87n%20tr%C3%AAn%20bi%E1%BB%83u%20%C4%91%E1%BB%93") : "Show on chart")}</button></div><small>{analoguePatternReadout}</small><small>{analogueFilterReadout}</small><small>{analogueFamilyReadout}</small><small>{analogueOutcomeReadout}</small><small>{analoguePatternLiftReadout}</small><small>{analogueWinRateReadout}</small><small>{analogueMatchReadout}</small><small role="status" aria-live="polite">{analogueFocusStatus}</small></> : <small role="status">{candleAtlasStatus === "loading" || candleAtlasStatus === "error" ? candleAtlasMessage : analoguePatternFilter || analogueFamilyFilter ? (locale === "vi" ? viCopy("Kh%C3%B4ng%20c%C3%B3%20c%E1%BB%ADa%20s%E1%BB%95%20t%C6%B0%C6%A1ng%20%C4%91%E1%BB%93ng%20nh%C3%A2n%20qu%E1%BA%A3%20cho%20b%E1%BB%99%20l%E1%BB%8Dc%20%C4%91%C3%A3%20ch%E1%BB%8Dn.%20H%C3%A3y%20ch%E1%BB%8Dn%20T%E1%BA%A5t%20c%E1%BA%A3%20ho%E1%BA%B7c%20m%E1%BB%99t%20b%E1%BB%99%20l%E1%BB%8Dc%20kh%C3%A1c%20%C4%91%E1%BB%83%20ti%E1%BA%BFp%20t%E1%BB%A5c.") : `No causal analogue windows carry the selected ${analoguePatternFilter || analogueFamilyFilter || ""} filter. Select All or another filter to continue.`) : (locale === "vi" ? viCopy("Kh%C3%B4ng%20c%C3%B3%20c%E1%BB%ADa%20s%E1%BB%95%20t%C6%B0%C6%A1ng%20%C4%91%E1%BB%93ng%20l%E1%BB%8Bch%20s%E1%BB%AD.") : focusedCopy.noCausalAnalogueWindow)}</small>}<small>{nearestAnalogue ? `Causal window ${analogueIndex + 1}/${analogueMatches.length} ending ${nearestAnalogue.time} UTC · observed next closed bar ${nearestAnalogueOutcome} · outcome is separate from the setup label.` : analogueFilterReadout}</small><small>{focusedCopy.researchEvidenceOnly}</small></div>
          <div><span className="pmut psm">{focusedCopy.selectedConceptEvidence}</span><b>{selectedPriceActionEvidence?.hitRate == null ? "INSUFFICIENT" : `${(selectedPriceActionEvidence.hitRate * 100).toFixed(1)}% next-bar hit rate`}</b><small>{selectedPriceActionEvidence ? `${selectedPriceActionEvidence.occurrences} occurrences / ${selectedPriceActionEvidence.evaluated} chronological evaluations · recurrence ${(selectedPriceActionEvidence.recurrenceRate * 100).toFixed(1)}% · 95% ${((selectedPriceActionEvidence.interval95?.lower ?? 0) * 100).toFixed(0)}–${((selectedPriceActionEvidence.interval95?.upper ?? 0) * 100).toFixed(0)}%` : "Select a detected marker to inspect its chronological outcome tape."}</small>{selectedPriceActionEvidence && <><small>Evaluation span: {selectedPriceActionEvidence.firstEvaluation || "—"} → {selectedPriceActionEvidence.lastEvaluation || "—"} | skipped continuity windows {selectedPriceActionEvidence.skipped}</small><small>Next-bar outcomes: UP {selectedPriceActionEvidence.outcomes.up} | DOWN {selectedPriceActionEvidence.outcomes.down} | FLAT {selectedPriceActionEvidence.outcomes.flat}</small><small>Historical tape overlay: {historicalPriceActionSignals.length} markers | <button type="button" className="ms-q" style={{ display: "inline-flex", flex: "none", padding: "2px 6px", marginLeft: 4 }} aria-pressed={showHistoricalTape} onClick={() => setShowHistoricalTape((visible) => !visible)}>{showHistoricalTape ? "HIST TAPE ON" : "HIST TAPE OFF"}</button></small><small>Last occurrence: {selectedPriceActionEvidence.lastOccurrence || "—"}</small><small>LONG {(selectedPriceActionEvidence.long.hitRate == null ? "—" : `${(selectedPriceActionEvidence.long.hitRate * 100).toFixed(0)}% (${selectedPriceActionEvidence.long.occurrences})`)} | SHORT {(selectedPriceActionEvidence.short.hitRate == null ? "—" : `${(selectedPriceActionEvidence.short.hitRate * 100).toFixed(0)}% (${selectedPriceActionEvidence.short.occurrences})`)}</small></>}</div>
          <div><span className="pmut psm">{focusedCopy.pdfConceptLens}</span><b>{selectedPriceActionCopy?.name || focusedCopy.pdfSelectConcept}</b><small>{selectedPriceActionCopy?.definition || focusedCopy.pdfClickMarker}</small>{selectedPriceActionCopy && <><small>{focusedCopy.pdfLookFor}: {selectedPriceActionCopy.cues.join(" · ")}</small><small>{focusedCopy.pdfAbstain}: {selectedPriceActionCopy.abstain.join(" · ")}</small><small>{formatPriceActionSourcePages(selectedPriceActionKnowledge!.pages)} | detector: {selectedPriceActionKnowledge!.implementation === "SOURCE_NOTES" ? focusedCopy.pdfSourceNotesOnly : selectedPriceActionAssessment?.reason || focusedCopy.pdfNotDetected}</small></>}</div>
          <div><span className="pmut psm">{focusedCopy.patternCensus}</span>{patternEvidenceRows.length ? <div className="m5-pattern-census-list" role="region" aria-label={focusedCopy.patternCensusRegion} tabIndex={0}>{patternEvidenceRows.map(({ id, evidence, name }) => <button key={id} type="button" className="ms-q m5-pattern-census-row" aria-pressed={id === selectedKnowledgePattern} aria-label={`${name}; ${evidence.occurrences} occurrences; ${evidence.hitRate == null ? "insufficient hit rate" : `${(evidence.hitRate * 100).toFixed(0)} percent next-bar hit rate`}; CI95 ${((evidence.interval95?.lower ?? 0) * 100).toFixed(0)} to ${((evidence.interval95?.upper ?? 0) * 100).toFixed(0)} percent; LONG ${evidence.long.hitRate == null ? "insufficient" : `${(evidence.long.hitRate * 100).toFixed(0)} percent`} (${evidence.long.occurrences}); SHORT ${evidence.short.hitRate == null ? "insufficient" : `${(evidence.short.hitRate * 100).toFixed(0)} percent`} (${evidence.short.occurrences}); UP ${evidence.outcomes.up}, DOWN ${evidence.outcomes.down}, FLAT ${evidence.outcomes.flat}; selecting opens the latest retained occurrence on the chart`} onClick={() => selectPatternEvidence(id, evidence)} style={{ padding: "4px 6px", flex: "none", borderColor: id === selectedKnowledgePattern ? "rgba(255,255,255,.55)" : undefined }}><span className="m5-pattern-census-name">{name}</span><span className="pmono">{evidence.occurrences.toLocaleString()} | {evidence.hitRate == null ? "—" : `${(evidence.hitRate * 100).toFixed(1)}%`}</span><span className="pmono m5-pattern-census-detail">CI95 {evidence.interval95 ? `${(evidence.interval95.lower * 100).toFixed(1)}–${(evidence.interval95.upper * 100).toFixed(1)}%` : "insufficient"} | LONG {evidence.long.hitRate == null ? "—" : `${(evidence.long.hitRate * 100).toFixed(1)}%`} ({evidence.long.occurrences.toLocaleString()}) | SHORT {evidence.short.hitRate == null ? "—" : `${(evidence.short.hitRate * 100).toFixed(1)}%`} ({evidence.short.occurrences.toLocaleString()})<br />UP {evidence.outcomes.up.toLocaleString()} | DOWN {evidence.outcomes.down.toLocaleString()} | FLAT {evidence.outcomes.flat.toLocaleString()}</span></button>)}</div> : <small>{focusedCopy.patternCensusWaiting}</small>}<small>{focusedCopy.patternCensusColumns}</small><small>{focusedCopy.patternCensusCoverage}: {patternEvidenceRows.length}/{PRICE_ACTION_DETECTOR_CONCEPT_COUNT} concepts. {focusedCopy.patternCensusOther}</small></div>
          <div><span className="pmut psm">{focusedCopy.patternWindow}</span><CandleWindow locale={locale} bars={detectorBars} center={historicalPreviewMarker?.i ?? selectedPriceActionMarker?.i ?? 0} marker={historicalPreviewMarker ?? selectedPriceActionMarker} outcome={previewOccurrence?.nextBar} /><small className="m5-pattern-window-inspection" role="status" aria-live="polite" aria-label={`${focusedCopy.patternWindowAriaPrefix}: ${patternWindowInspection}`}>{patternWindowInspection}</small><small>{historicalPreviewMarker ? `Historical ${historicalPreviewMarker.label} occurrence · ${historicalPreviewMarker.time} · next closed bar ${previewOccurrence?.nextBar || "pending"}` : selectedPriceActionMarker ? focusedCopy.currentSetupWindow : focusedCopy.noDetectorWindow}</small>{previewOccurrence && previewHistory.length > 1 && <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 3 }}><button className="ms-q" type="button" aria-label={locale === "vi" ? viCopy("Hi%E1%BB%87n%20l%E1%BA%A7n%20xu%E1%BA%A5t%20hi%E1%BB%87n%20l%E1%BB%8Bch%20s%E1%BB%AD%20tr%C6%B0%E1%BB%9Bc") : "Show earlier historical occurrence"} disabled={previewNavigationIndex <= 0} onClick={() => selectPreviewOccurrenceIndex(previewNavigationIndex - 1)}>{locale === "vi" ? viCopy("Tr%C6%B0%E1%BB%9Bc") : "Earlier"}</button><span className="pmut psm" aria-label={`Historical occurrence ${previewNavigationIndex + 1} of ${previewHistory.length}`}>{previewNavigationIndex + 1}/{previewHistory.length}</span><button className="ms-q" type="button" aria-label={locale === "vi" ? viCopy("Hi%E1%BB%87n%20l%E1%BA%A7n%20xu%E1%BA%A5t%20hi%E1%BB%87n%20l%E1%BB%8Bch%20s%E1%BB%AD%20sau") : "Show later historical occurrence"} disabled={previewNavigationIndex >= previewHistory.length - 1} onClick={() => selectPreviewOccurrenceIndex(previewNavigationIndex + 1)}>{locale === "vi" ? viCopy("Sau") : "Later"}</button>{historicalPreviewMarker && <button className="ms-q" type="button" onClick={showPatternWindowOnChart} title={locale === "vi" ? viCopy("Hi%E1%BB%87n%20l%E1%BA%A7n%20xu%E1%BA%A5t%20hi%E1%BB%87n%20l%E1%BB%8Bch%20s%E1%BB%AD%20tr%C3%AAn%20bi%E1%BB%83u%20%C4%91%E1%BB%93%20ch%C3%ADnh") : "Show this historical occurrence on the main chart"}>{locale === "vi" ? viCopy("Hi%E1%BB%87n%20tr%C3%AAn%20bi%E1%BB%83u%20%C4%91%E1%BB%93") : "Show on chart"}</button>}</div>}</div>
        </div>
      </section>}

      {!focused && <>{/* -- Strategy Replay Runner: bring a packaged Strategy Card here & run it -- */}
      <div className="pc" style={{ marginTop: 12, borderColor: liveShadow ? "#1c5b3c" : "#43306a" }}>
        <div className={`pc-h ${liveShadow ? "green" : "violet"}`}>
          {liveShadow ? <><Glyph name="satellite" size={13} /> LIVE SHADOW TEST</> : <><Glyph name="gamepad" size={13} /> Strategy Replay Runner</>}
          <span className="mut">{liveShadow ? "Live shadow tracking on " + liveSymbol(getActiveSymbol()) + " (no real orders)" : "Source: " + source}</span>
          <InfoTip
            title="Strategy Replay & Cascade Runner"
            text="Evaluates your Strategy Card through the One Engine of Record across Y10 → M6 → M1 windows. In Live mode, tracks forward shadow trades without sending broker orders."
          />
        </div>
        {autoCascade && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "7px 11px", borderRadius: 8, background: "rgba(124,92,255,.12)", border: "1px solid #5a4ab8" }}>
            <span style={{ color: "#b3a4ff", fontWeight: 700, fontSize: 12.5 }}> Running automated cascade — {STAGE_LABEL[stage]} | Y10 → M6 → M1 (returns to Strategy Lab upon completion)</span>
            <button className="ms-q" style={{ flex: "none", padding: "4px 10px", marginLeft: "auto" }} onClick={() => setAutoCascade(false)}> Pause Auto</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <span className="pmut psm">Strategy Card:</span>
          <select className="ms-sel" disabled={running} value={activeId || ""} onChange={(e) => setActiveId(e.target.value || null)}>
            <option value="">— Select Strategy Card —</option>
            {library.map((c: any) => <option key={c.id} value={c.id}>{c.name} | {c.archetype}</option>)}
          </select>
          {library.length === 0 && <span className="pmut psm">Library is empty — package a card in Strategy Canvas or load the Starter Card on Home.</span>}
          {library.length > 1 && (
            <select value={cmpId} onChange={(e) => setCmpId(e.target.value)} title="COMPARE: Run a second Card/Beast side-by-side on the exact same window and engine" style={{ background: "#0b141e", border: "1px solid #6b4fd8", borderRadius: 6, color: "var(--mfe-text)", padding: "3px 7px", fontSize: 11.5, marginLeft: 6 }}>
              <option value="">↔ Compare with… (Beast/Card)</option>
              {library.filter((c: any) => c.id !== activeId).map((c: any) => <option key={c.id} value={c.id}>{c.name} | {c.archetype}</option>)}
            </select>
          )}
          {cmpBt && realisticBt && (() => {
            const A = compareCardSummary(realisticBt), B = compareCardSummary(cmpBt);
            const isBeast = (c: any) => String(c?.archetype || "").includes("Beast");
            const pairs: { card: any; s: CompareCardSummary; other: CompareCardSummary; live: boolean }[] = [
              { card: activeCard, s: A, other: B, live: true }, { card: cmpCard, s: B, other: A, live: false },
            ];
            pairs.sort((x, y) => (isBeast(x.card) ? 1 : 0) - (isBeast(y.card) ? 1 : 0));
            const Mini = ({ title, kind, s, other, live, cardId }: { title: string; kind: string; s: CompareCardSummary; other: CompareCardSummary; live: boolean; cardId?: string }) => {
              const edge = s.edge;
              const better = (a: number, b: number, invert = false) => (invert ? a < b : a > b) ? "#21D07A" : "var(--mfe-text)";
              return (
                <div style={{ flex: "1 1 260px", minWidth: 0, border: `1px solid ${edge ? "#21D07A55" : "#FF4D4D55"}`, borderRadius: 8, padding: "8px 10px", background: "#0d1420" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: kind === "BEAST" ? "#a78bfa" : "#25B7FF", border: `1px solid ${kind === "BEAST" ? "#a78bfa" : "#25B7FF"}55`, borderRadius: 4, padding: "1px 6px" }}>{kind}</span>
                    <b style={{ fontSize: 12 }}>{title}</b>
                    {live ? <span style={{ fontSize: 9, fontWeight: 800, color: "#21D07A", marginLeft: "auto" }}>RUNNER</span>
                      : <button onClick={() => { if (cardId) { setCmpId(activeId || ""); setActiveId(cardId); } }} title="Make this card the primary runner on the chart"
                        style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--mfe-border)", borderRadius: 5, color: "var(--mfe-cyan, #25B7FF)", fontSize: 9.5, fontWeight: 700, padding: "2px 7px", cursor: "pointer" }}> Set Primary Runner</button>}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: edge ? "#21D07A" : "#FF4D4D", marginBottom: 5 }}>{edge ? "POSITIVE NET EDGE (this window)" : "NO NET EDGE AFTER COSTS"}<span className="pmut" style={{ fontWeight: 400, fontSize: 9.5 }}> | {hardMode ? "HARD" : "normal"} | modeled</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, fontSize: 11, fontFamily: "var(--mfe-mono)" }}>
                    <div><div className="pmut" style={{ fontSize: 8.5 }}>NET PF</div><b style={{ color: better(s.pf, other.pf) }}>{s.pf}</b></div>
                    <div><div className="pmut" style={{ fontSize: 8.5 }}>NET R</div><b style={{ color: better(s.netR, other.netR) }}>{s.netR}</b></div>
                    <div><div className="pmut" style={{ fontSize: 8.5 }}>EXP / TRADE</div><b style={{ color: better(s.exp != null ? s.exp : -9, other.exp != null ? other.exp : -9) }}>{s.exp ?? "—"}</b></div>
                    <div><div className="pmut" style={{ fontSize: 8.5 }}>WIN %</div><b style={{ color: better(s.win, other.win) }}>{s.win}%</b></div>
                    <div><div className="pmut" style={{ fontSize: 8.5 }}>MAX DD</div><b style={{ color: better(s.dd, other.dd, true) === "#21D07A" ? "#21D07A" : "var(--mfe-text)" }}>{s.dd}R</b></div>
                    <div><div className="pmut" style={{ fontSize: 8.5 }}>TRADES</div><b>{s.n}</b></div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    {[`GROSS PF ${s.grossPf}`, `Cost ${hardMode ? "xHARD" : "PROVISIONAL"}`, "Fill next-open", "advisory | no order"].map((c) => <span key={c} className="pmut" style={{ fontSize: 8.5, border: "1px solid var(--mfe-border)", borderRadius: 4, padding: "1px 5px" }}>{c}</span>)}
                  </div>
                </div>
              );
            };
            return (
              <div style={{ width: "100%", marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#a78bfa", marginBottom: 5 }}>↔ COMPARE — Dual Honesty Dashboard | Same Window &amp; Engine {intrabarFeasible ? "| ⚠ intrabar active" : "| design-close aligned"}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {pairs.map((p, idx) => <Mini key={idx} title={p.card?.name || "?"} kind={isBeast(p.card) ? "BEAST" : "STRATEGY CARD"} s={p.s} other={p.other} live={p.live} cardId={p.card?.id} />)}
                </div>
              </div>
            );
          })()}
          {activeCard && <span className="pflag b">{activeCard.verdict} | {activeCard.score}%</span>}
          {activeCard && (autoRR ? <span className="pflag g"><Glyph name="gear" size={12} /> Auto R:R</span> : <span className="pflag a">Fixed risk (1 ATR | TP-cap +4R)</span>)}
          {activeCard && <span className="pflag" style={{ margin: 0, background: "rgba(33,208,122,.12)", color: TK.green, border: "1px solid " + TK.green }}>Card TF {designTf} | realistic | next-open | cost ON</span>}
        </div>
        {/* FORCED cascade Y10 → M6 → M1 */}
        {activeCard && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8, padding: "7px 9px", borderRadius: 8, background: "var(--mfe-s2)", border: "1px solid var(--mfe-border)" }}>
            {source!=="CSV"&&<LegacyStageStepper stage={stage} maxStage={maxStage} onStage={setStage} ready={runDone && !!realisticBt} sourceLock={sourceLock}
              onAdvance={() => { setMaxStage((m) => Math.min(2, m + 1)); setStage((s) => (s === "Y10" ? "M6" : "M1")); }} />}
            {stage === "M1" && runDone && !!realisticBt && maxStage >= 2 && (
              <button className="ms-csv" style={{ flex: "none", padding: "5px 12px", background: "#1c6b48" }}
                onClick={() => { try { localStorage.setItem("mfe_strategylab_preselect", activeCard.id); } catch { /* ignore */ } window.dispatchEvent(new CustomEvent("mfe-nav", { detail: "strategy-lab" })); }}>
                <Glyph name="check" size={12} /> All 3 Windows Complete → Open Strategy Lab | </button>
            )}
            <span className="pmut psm" style={{ marginLeft: "auto" }}>
              <b style={{ color: STAGE_SOURCE[stage] === "Live" ? "#21D07A" : "#9fd0ff" }}>{source==="CSV" ? "CSV interval" : STAGE_SOURCE[stage] === "Live" ? <><Glyph name="dot" size={11} color={TK.red} /> LIVE</> : <><Glyph name="tape" size={12} /> REPLAY</>}</b>
              {stageRange ? <> | <b style={{ fontFamily: "var(--mfe-mono)" }}>{stageRange.from} → {stageRange.to}</b></> : ""} | {stageBars.length.toLocaleString()} bars ({designTf}) | </span>
          </div>
        )}

        {/* INTRABAR badge */}
        {activeCard && wantIntrabar && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 8, fontSize: 11.5, lineHeight: 1.45,
            background: intrabarStatus === "on" ? "rgba(255,138,42,.10)" : intrabarStatus === "loading" ? "rgba(88,166,255,.08)" : "rgba(110,118,129,.08)",
            border: "1px solid " + (intrabarStatus === "on" ? "#FF8A2A66" : intrabarStatus === "loading" ? "#58a6ff44" : "#3a4d6155"),
            color: intrabarStatus === "on" ? "#F4C542" : intrabarStatus === "loading" ? "#9fd0ff" : "var(--mfe-muted)" }}>
            <span style={{ fontSize: 14 }}>{intrabarStatus === "loading" ? "…" : "✓"}</span>
            {intrabarStatus === "on" ? <span><b>Intrabar {designTf} → {execTf} ON</b> | early entry on {execTf} close inside {designTf} | <b>{realisticBt?.intrabar?.entries ?? 0}</b> intrabar entries | M1-master ({(m1Win?.length ?? 0).toLocaleString()} M1 bars) | causal/no-repaint</span>
              : intrabarStatus === "loading" ? <span>Loading M1 tape for intrabar <b>{designTf} → {execTf}</b>…</span>
              : <span><b>Intrabar {designTf} → {execTf} OFF on this window</b> — {source !== "Replay" ? "LIVE source lacks full M1 history" : `M1 window exceeds cap (~${estM1.toLocaleString()} > ${INTRABAR_M1_CAP.toLocaleString()})`}. Running <b>design-close</b>.</span>}
          </div>
        )}

        {activeCard && (
          <>
            {liveShadow ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="pflag g">LIVE SHADOW | {liveSymbol(getActiveSymbol())} | {tf}</span>
                <span className="pflag a">SHADOW ONLY — No real orders</span>
                <span className="pmut psm pmono" style={{ marginLeft: "auto" }}>{bars && bars.length ? "Latest bar " + stamp(bars[bars.length - 1].t) + " · " + bars.length + " live bars" : "Loading live feed…"}</span>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="ms-csv" style={{ background: running ? "#6e40c9" : "#1f6feb" }} onClick={playRun}>{running ? "Pause replay" : cursor == null || runDone ? "Play replay" : "Resume replay"}</button>
                  <button className="ms-q" style={{ flex: "none", padding: "5px 11px" }} onClick={resetRun}>Restart replay</button>
                  <button className="ms-q" style={{ flex: "none", padding: "5px 11px" }} onClick={() => { setRunning(false); setCursor(lastI); }} disabled={!realisticBt || primaryJob.pending || stageIdx > maxStage}>Show results</button>
                  <div className="ms-seg">{[1, 2, 4, 8].map((s) => <button key={s} className={speed === s ? "on" : ""} onClick={() => setSpeed(s)}>{s}x</button>)}</div>
                  <span className="pmut psm" style={{ fontWeight: 700 }}>Broker Realism:</span>
                  <div className="ms-seg" title="HARD Mode multiplies spread/slippage/swap costs and enforces a 0.6|ATR minimum stop distance.">
                    <button className={!hardMode ? "on" : ""} onClick={() => setHardMode(false)}>Normal</button>
                    <button className={hardMode ? "on" : ""} onClick={() => setHardMode(true)} style={hardMode ? { background: "#f7768e", color: "#1a0d10", borderColor: "#f7768e" } : undefined}><Glyph name="fire" size={13} /> HARD</button>
                  </div>
                  <span className={"pflag " + (hardMode ? "r" : "g")}>{hardMode ? "HARD REPLAY (xCosts + Min Stop)" : "ADVISORY REPLAY (Paper Only)"}</span>
                  <span className="pmut psm pmono" style={{ marginLeft: "auto" }}>{cursor != null && replayBars.length ? `bar ${cursor}/${replayBars.length} | ${stamp(replayBars[Math.min(cursor, replayBars.length - 1)].t)}` : `ready ? from ${replayBars.length ? stamp(replayBars[0].t) : "—"}`}</span>
                </div>
                <div className="pbar" style={{ marginTop: 8, height: 9 }}><div style={{ width: cursor != null && replayBars.length ? `${cursor / replayBars.length * 100}%` : "0%", background: TK.purple }} /></div>
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <div className="pc-h" style={{ border: "none", padding: 0, marginBottom: 4 }}>
                {liveShadow ? <><Glyph name="satellite" size={12} /> Live Shadow Trades</> : "Trade Log"}
                <span className="mut">{revealed.length}{replay.trades.length !== revealed.length ? "/" + replay.trades.length : ""} trades{realisticBt && realisticBt.sim.signals_blocked_by_drift_guard > 0 ? " · drift_guard blocked " + realisticBt.sim.signals_blocked_by_drift_guard : ""}</span>
              </div>
              <div style={{ maxHeight: 130, overflowY: "auto" }}>
                {revealed.length ? revealed.slice().reverse().slice(0, 16).map((t, i) => (
                  <div key={i} className="pkv"><span style={{ color: t.dir === "BUY" ? TK.green : TK.red }}>{t.dir === "BUY" ? "▲" : "▼"} {t.dir} · {stamp(t.t)}</span><b style={{ color: t.outcome === "TP" ? TK.green : TK.red }}>{t.outcome} · {t.R > 0 ? "+" : ""}{t.R}R</b></div>
                )) : <div className="pmut psm">No trades revealed yet — use Play replay or Show results.</div>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* M1 (Live) is reachable only AFTER Y10 + M6 are cleared in Replay */}
      {activeCard && stageIdx > maxStage && (
        <div className="pc" style={{ marginTop: 12, borderColor: "#5a3a18" }}>
          <div className="pmut psm"><Glyph name="lock" size={12} /> <b style={{ color: TK.orange }}>{STAGE_LABEL[stage]} is locked.</b> {stage === "M1" ? <>Switch source to <b>Replay</b> and complete <b>Y10 + M6</b> first before unlocking <b>M1</b>.</> : <>Complete the preceding cascade window first.</>}</div>
        </div>
      )}

      {/* -- REALISTIC SIM truth surface -- */}
      {activeCard && runDone && stageIdx <= maxStage && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="pc" style={{ borderColor: STAGE_SOURCE[stage] === "Live" ? "#1c5b3c" : "#43306a" }}>
            <div className="pc-h violet">
              Window Results: {source === "CSV" ? "Selected CSV interval" : STAGE_LABEL[stage]}
              <span className="pflag" style={{ margin: "0 0 0 6px", background: STAGE_SOURCE[stage] === "Live" ? "rgba(33,208,122,.14)" : "rgba(159,208,255,.12)", color: STAGE_SOURCE[stage] === "Live" ? TK.green : "#9fd0ff", border: "1px solid " + (STAGE_SOURCE[stage] === "Live" ? "#1c5b3c" : "#27506e") }}>{STAGE_SOURCE[stage] === "Live" ? "🔴 LIVE · 1M Forward" : "📼 REPLAY | Historical"}</span>
              <span className="mut">{source !== "CSV" && stage === "Y10" ? "Walk-forward requested" : "Single descriptive window"}</span>
            </div>
            {stageRange && <div className="pmut psm pmono" style={{ marginTop: 2 }}><Glyph name="calendar" size={12} /> Range: <b style={{ color: TK.text2 }}>{stageRange.from} → {stageRange.to}</b> | {stageBars.length.toLocaleString()} bars ({designTf}{source==="CSV"?", selected CSV interval":`, ${STAGE_DAYS[stage]}d`})</div>}
            {realisticBt && realisticBt.sim.signals_blocked_by_drift_guard > 0 && (
              <div style={{ marginTop: 6, padding: "6px 9px", borderRadius: 7, background: "rgba(227,162,58,.10)", border: "1px solid #5a3a18", fontSize: 11.5, color: "#f0d68a" }}>
                <Glyph name="bolt" size={12} /> <b>drift_guard circuit-breaker blocked {realisticBt.sim.signals_blocked_by_drift_guard} signals</b> in this window (rolling 15-trade PF &lt; 0.6).
              </div>
            )}
          </div>
          {source === "Replay" && yearAllTf && (
            <div className="pc" style={{ borderColor: "#1c4a5b" }}>
              <div className="pc-h"><Glyph name="ruler" size={13} /> Six-TF Render <span className="mut">Year {yearAllTf.year} | resampled from one M1 master ({Math.round(yearAllTf.master.bars.length / 1000)}k M1)</span></div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["M1", "M5", "M15", "H1", "H4", "D1"] as const).map((t) => { const n = yearAllTf.tfBars[t]?.length || 0; const q = t === "M1" ? null : yearAllTf.resamples[t]; return (
                  <span key={t} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1, border: "1px solid var(--mfe-border)", borderRadius: 7, padding: "5px 11px", background: "var(--mfe-s2)" }}>
                    <b className="pmono" style={{ fontSize: 11, color: TK.cyan }}>{t}</b>
                    <span className="pmono" style={{ fontSize: 10, color: TK.text2 }}>{n.toLocaleString()} bars</span>
                    {q && <span className="pmut" style={{ fontSize: 8.5 }}>{q.gapBars ? q.gapBars + " gap" : "clean"}</span>}
                  </span>
                ); })}
              </div>
            </div>
          )}
          {panelBt ? (cmpBt ? (() => {
            const isBeastCol = (c: unknown) => String((c as { archetype?: string })?.archetype || "").includes("Beast");
            const cols = [{ card: activeCard, bt: panelBt, live: true }, { card: cmpCard, bt: cmpBt, live: false }];
            cols.sort((x, y) => (isBeastCol(x.card) ? 1 : 0) - (isBeastCol(y.card) ? 1 : 0));
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 12, alignItems: "start" }}>
                {cols.map((col, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 8, background: "#0d1420", border: `1px solid ${isBeastCol(col.card) ? "#a78bfa55" : "#25B7FF55"}` }}>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: isBeastCol(col.card) ? "#a78bfa" : "#25B7FF" }}>{isBeastCol(col.card) ? "BEAST" : "STRATEGY CARD"}</span>
                      <b style={{ fontSize: 12 }}>{(col.card as { name?: string })?.name || "?"}</b>
                      {col.live && <span style={{ fontSize: 9, fontWeight: 800, color: "#21D07A", marginLeft: "auto" }}>RUNNER</span>}
                    </div>
                    <LegacyHonestyDashboard bt={col.bt} />
                    <LegacyFundingPanel capital={capital} onCapital={setCapital} riskPct={riskPct} onRiskPct={setRiskPct} analytics={col.bt.analytics} calibrated={col.bt.calibration?.specCalibrated} />
                    <LegacyRealismPanel bt={col.bt} />
                  </div>
                ))}
              </div>
            );
          })() : <>
            <LegacyHonestyDashboard bt={panelBt} />
            <LegacyFundingPanel capital={capital} onCapital={setCapital} riskPct={riskPct} onRiskPct={setRiskPct} analytics={panelBt.analytics} calibrated={panelBt.calibration?.specCalibrated} />
            <LegacyRealismPanel bt={panelBt} />
          </>)
            : <div className="pc" style={{ borderColor: "#43306a" }}><div className="pc-h violet"><Glyph name="microscope" size={13} /> Realism | Truth Surface</div><div className="pmut psm">Loading {designTf} tape for {STAGE_LABEL[stage]} realistic backtest…</div></div>}
          <LegacyCalibrationPanel />
        </div>
      )}
      </>}

      {focused && !chartOnly && <Suspense fallback={<div role="status" aria-live="polite">Loading PDF source context…</div>}><PriceActionKnowledgePanel currentPattern={selectedKnowledgePattern} onPatternChange={setKnowledgePattern} /></Suspense>}

    </div>
    </Suspense>

  );
}
