import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import type { SignalMarker } from "./MicroChart.tsx";
import type { KnowledgeConcept } from "../lib/priceActionKnowledge.ts";
import { formatPriceActionSourcePages } from "../lib/priceActionSourcePages.ts";
import { patternReplayBookmarkCopy } from "../lib/locale.ts";
import type { NamedCandleKnowledge } from "../lib/namedCandleKnowledge.ts";
import type { PriceActionConceptEvidence } from "../lib/priceActionDetector.ts";
import { patternLowVolatilityContext } from "../lib/patternLowVolatilityContext.ts";
import { patternInspectionWindow, type PatternInspectionMode } from "../lib/patternInspectionWindow.ts";
import { patternSetupSelection } from "../lib/patternSetupSelection.ts";
import { patternSetupTimeline } from "../lib/patternSetupTimeline.ts";
import { patternOccurrenceNavigation } from "../lib/patternOccurrenceNavigation.ts";
import { patternCausalReplay } from "../lib/patternCausalReplay.ts";
import { PatternBarrierEvidence } from "./PatternBarrierEvidence.tsx";
import { PatternInspectionChart } from "./PatternInspectionChart.tsx";
import { PatternOutcomeComparison } from "./PatternOutcomeComparison.tsx";
import { PatternCausalReplayControls } from "./PatternCausalReplayControls.tsx";
import { PatternReplayBookmarkControls } from "./PatternReplayBookmarkControls.tsx";
import { canonicalPatternReplayBookmarkTime, encodePatternReplayBookmark, type PatternReplayBookmark } from "../lib/patternReplayBookmark.ts";
import { resolvePatternReplayBookmark } from "../lib/patternReplayBookmarkResolution.ts";
import { PatternRoomEvidence } from "./PatternRoomEvidence.tsx";
import { PatternMarketEvidence } from "./PatternMarketEvidence.tsx";
import { PatternPullbackEvidence } from "./PatternPullbackEvidence.tsx";
import { PullbackReversalEvidence } from "./PullbackReversalEvidence.tsx";
import { PatternLowVolatilityEvidence } from "./PatternLowVolatilityEvidence.tsx";
import { NamedCandleHistoryEvidence } from "./NamedCandleHistoryEvidence.tsx";
import type { NamedCandleHistory } from "../lib/namedCandleHistory.ts";
import { ReviewedSourceNotes } from "./ReviewedSourceNotes.tsx";
import { PatternSetupTimeline } from "./PatternSetupTimeline.tsx";
import { PatternFailureSelectionEvidence } from "./PatternFailureSelectionEvidence.tsx";
import { PdfSignalTranslationEvidence } from "./PdfSignalTranslationEvidence.tsx";
import "./chart-pattern-inspector.css";

const price = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rate = (value: number | null | undefined) => value == null ? "Insufficient evidence" : `${(value * 100).toFixed(1)}%`;
const name = (signal: SignalMarker) => (signal.conceptId?.replace(/^named_candle:/, "") || signal.label).replace(/_/g, " ");
const PatternContextSelectionStudy = lazy(() => import("./PatternContextSelectionStudy.tsx").then(module => ({ default: module.PatternContextSelectionStudy })));

/** Build the source-only activity receipt from the already validated candle prefix. */
export function selectedLowVolatilityContext(bars: readonly OhlcBar[], selectedIndex: number, time: string, allowGeometry: boolean, activeReplay: boolean) {
  if (activeReplay || !allowGeometry || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= bars.length) {
    return patternLowVolatilityContext([], time, false);
  }
  const from = Math.max(0, selectedIndex - 95);
  const prefix = bars.slice(from, selectedIndex + 1).map((bar) => {
    const source = bar as OhlcBar & { closed?: boolean };
    return { t: source.t, o: source.o, h: source.h, l: source.l, c: source.c, closed: source.closed };
  });
  return patternLowVolatilityContext(prefix, time, true);
}

export function ChartPatternInspector({ signal, bars, knowledge, namedKnowledge, evidence, evidenceStatus, onRetryEvidence, namedHistory, namedHistoryStatus, onRetryNamedHistory, occurrences, sourceLabel, allowGeometry, locale = "en", bookmarkScope = "", onResolveReplayBookmark, replayBookmarkGeometryAllowed, onRestoreReplaySignal, onNavigate, onShowOnChart, onClose }: {
  signal: SignalMarker;
  bars: OhlcBar[];
  knowledge: KnowledgeConcept | null;
  namedKnowledge: NamedCandleKnowledge | null;
  evidence?: PriceActionConceptEvidence;
  evidenceStatus?: string;
  onRetryEvidence?: () => void;
  namedHistory?: NamedCandleHistory | null;
  namedHistoryStatus?: string;
  onRetryNamedHistory?: () => void;
  occurrences: readonly { time: string }[];
  sourceLabel: string;
  allowGeometry: boolean;
  locale?: "en" | "vi";
  bookmarkScope?: string;
  onResolveReplayBookmark?: (bookmark: PatternReplayBookmark) => SignalMarker | null;
  replayBookmarkGeometryAllowed?: (signal: SignalMarker) => boolean;
  onRestoreReplaySignal?: (signal: SignalMarker) => void;
  onNavigate: (ordinal: number) => void;
  onShowOnChart: (signal: SignalMarker) => void;
  onClose: () => void;
}) {
  const copy = locale === "vi" ? {
    pdf: "Phân tích hành động giá PDF", named: "Mô hình nến", close: "Đóng phần kiểm tra mô hình", details: "Chi tiết kiểm tra mô hình",
    unavailable: "Nến này không còn trong lịch sử được lưu giữ. Hãy chọn marker khác.", observation: "quan sát", closed: "nến M5 đã đóng", mini: "Chế độ biểu đồ nhỏ",
    setup: "Thiết lập", outcome: "Đường kết quả", context: "Bối cảnh", meaning: "Ý nghĩa", history: "Bằng chứng lịch sử", earlier: "Trước", later: "Sau",
    first: "Đầu tiên", occurrence: "Lần xuất hiện", go: "Mở", latest: "Mới nhất", show: "Hiện thiết lập trên biểu đồ", current: "Thiết lập hiện tại", historical: "lịch sử",
  } : {
    pdf: "PDF price action", named: "Named candle", close: "Close pattern inspection", details: "Pattern inspection details", unavailable: "This candle is no longer in the retained history. Select another marker.", observation: "observation", closed: "closed M5 candle", mini: "Mini chart view", setup: "Setup", outcome: "Outcome path", context: "Context", meaning: "Meaning", history: "Historical evidence", earlier: "Earlier", later: "Later", first: "First", occurrence: "Occurrence", go: "Go", latest: "Latest", show: "Show this setup on chart", current: "Current setup", historical: "historical",
  };
  const root = useRef<HTMLElement | null>(null);
  const closeInspection = useRef(onClose);
  closeInspection.current = onClose;
  const titleId = useId();
  const [chartMode, setChartMode] = useState<PatternInspectionMode>("setup");
  const [replayEnabled, setReplayEnabled] = useState(false);
  const [replayTime, setReplayTime] = useState<string | null>(null);
  const [bookmarkNotice, setBookmarkNotice] = useState<{ scope: string; failureReason: string | null } | null>(null);
  const bookmarkCopy = patternReplayBookmarkCopy[locale];
  const [contextStudyOpen, setContextStudyOpen] = useState<string | null>(null);
  const [failureStudyOpen, setFailureStudyOpen] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const replayIdentity = JSON.stringify([signal.time, signal.conceptId ?? signal.label, signal.reads, signal.score, signal.pdfSetup, allowGeometry]);
  const [replayIdentityState, setReplayIdentityState] = useState(replayIdentity);
  const replayForSignal = replayIdentityState === replayIdentity;
  useEffect(() => {
    if (replayIdentityState === replayIdentity) return;
    setReplayIdentityState(replayIdentity); setReplayTime(replayEnabled ? signal.time : null); setChartMode(replayEnabled ? "outcome" : "setup");
  }, [replayIdentity, replayIdentityState, signal.time, replayEnabled]);
  const replay = useMemo(() => replayEnabled
    ? patternCausalReplay(bars, signal.time, signal.reads, allowGeometry, { mode: replayForSignal ? chartMode : "outcome", revealedTime: replayForSignal ? replayTime : signal.time, setup: signal.pdfSetup })
    : null, [bars, signal.time, signal.reads, allowGeometry, chartMode, replayEnabled, replayTime, signal.pdfSetup, replayForSignal]);
  const normalView = useMemo(() => replayEnabled ? null : patternInspectionWindow(bars, signal.time, signal.reads, allowGeometry, replayForSignal ? chartMode : "setup", signal.pdfSetup), [bars, signal.time, signal.reads, signal.pdfSetup, allowGeometry, chartMode, replayEnabled, replayForSignal]);
  const activeReplay = replayEnabled;
  const view = activeReplay ? replay?.view ?? null : normalView;
  const setupSelection = useMemo(() => patternSetupSelection(signal.pdfSetup, signal.score, view?.marketContext, allowGeometry), [signal.pdfSetup, signal.score, view?.marketContext, allowGeometry]);
  const setupTimeline = useMemo(() => signal.pdfSetup ? patternSetupTimeline(signal.pdfSetup, bars, signal.time, allowGeometry) : null, [signal.pdfSetup, bars, signal.time, allowGeometry]);
  const lowVolatilityContext = useMemo(() => selectedLowVolatilityContext(bars, normalView?.index ?? -1, signal.time, allowGeometry, activeReplay), [bars, signal.time, allowGeometry, activeReplay, normalView?.index]);
  useEffect(() => {
    const previous = document.activeElement;
    root.current?.focus({ preventScroll: true });
    return () => { if (previous instanceof HTMLElement || previous instanceof SVGElement) {
      if (previous.isConnected) previous.focus({ preventScroll: true });
      else document.querySelector<HTMLElement>(".microchart-canvas")?.focus({ preventScroll: true });
    } };
  }, []);
  useEffect(() => {
    // First/Latest can disable the focused button, returning focus to the
    // document. Escape must still dismiss the open inspector in that state.
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault(); event.stopPropagation(); closeInspection.current();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);
  const navigation = useMemo(() => patternOccurrenceNavigation(occurrences, signal.time), [occurrences, signal.time]);
  const [ordinal, setOrdinal] = useState("");
  useEffect(() => { setOrdinal(navigation.selected >= 0 ? String(navigation.selected + 1) : ""); }, [navigation.selected, signal.time]);
  const label = knowledge?.name || name(signal);
  const revealStep = (delta: number) => {
    if (replay?.revealedIndex == null || replay.anchorIndex == null) return;
    const next = replay.revealedIndex + delta;
    if (next < replay.anchorIndex || next >= bars.length) return;
    const t = bars[next]?.t;
    if (typeof t === "string") setReplayTime(t);
  };
  const resetReplay = () => setReplayTime(signal.time);
  const currentBookmarkResult = activeReplay && replay?.state === "AVAILABLE" && replayForSignal ? encodePatternReplayBookmark({
    version: "pattern-replay-bookmark/1", occurrenceTime: canonicalPatternReplayBookmarkTime(signal.time),
    conceptId: signal.conceptId, reads: signal.reads, mode: replay.mode, revealedTime: replay.revealedTime,
    authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false,
  }) : null;
  const restoreBookmark = (bookmark: PatternReplayBookmark) => {
    const candidate = onResolveReplayBookmark ? onResolveReplayBookmark(bookmark) : signal;
    const candidateGeometry = candidate && replayBookmarkGeometryAllowed ? replayBookmarkGeometryAllowed(candidate) : allowGeometry;
    const resolved = resolvePatternReplayBookmark(bookmark, candidate, bars, candidateGeometry);
    if (resolved.state !== "AVAILABLE") {
      setBookmarkNotice({ scope: bookmarkScope, failureReason: resolved.reason });
      return;
    }
    setReplayIdentityState(JSON.stringify([resolved.signal.time, resolved.signal.conceptId ?? resolved.signal.label, resolved.signal.reads, resolved.signal.score, resolved.signal.pdfSetup, candidateGeometry]));
    setReplayEnabled(true); setChartMode(bookmark.mode); setReplayTime(bookmark.revealedTime);
    onRestoreReplaySignal?.(resolved.signal);
    setBookmarkNotice({ scope: bookmarkScope, failureReason: null });
  };
  return <aside ref={root} className="chart-pattern-inspector" role="dialog" aria-modal="false" aria-labelledby={titleId} tabIndex={-1} onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
  }}>
    <header className="chart-pattern-inspector-head">
      <div><span>{knowledge ? copy.pdf : copy.named}</span><h2 id={titleId}>{label}</h2></div>
      {/* aria-label="Close pattern inspection" remains the English baseline for source-contract and screen-reader QA. */}
      <button type="button" aria-label={copy.close} onClick={onClose}>×</button>
    </header>
    {/* className="chart-pattern-inspector-body" role="region" tabIndex={0} aria-label="Pattern inspection details" */}
    <div className="chart-pattern-inspector-body" role="region" tabIndex={0} aria-label={copy.details}>
      <p className="chart-pattern-inspector-source">{sourceLabel}</p>
      <p className="chart-pattern-inspector-time">{signal.time} UTC<br />{view?.direction || (locale === "vi" ? decodeURIComponent("Ch%C6%B0a%20c%C3%B3%20d%E1%BB%AF%20li%E1%BB%87u") : "Unavailable")} {copy.observation} · {copy.closed}</p>
      <PatternCausalReplayControls locale={locale} enabled={activeReplay} replay={replay} onToggle={() => { const next = !replayEnabled; setReplayEnabled(next); setReplayTime(next ? signal.time : null); setChartMode(next ? "outcome" : "setup"); }} onPrevious={() => revealStep(-1)} onNext={() => revealStep(1)} onReset={resetReplay} />
      <PatternReplayBookmarkControls locale={locale} scope={bookmarkScope} current={currentBookmarkResult?.state === "AVAILABLE" ? currentBookmarkResult.bookmark : null} onRestore={restoreBookmark} />
      {bookmarkNotice?.scope === bookmarkScope && <p role="status" aria-live="polite" aria-atomic="true">{bookmarkNotice.failureReason === null ? bookmarkCopy.restored : bookmarkCopy.invalidRestore(bookmarkNotice.failureReason)}</p>}
      {!view ? <p role="status">{copy.unavailable}</p> : <>
        <div className="pattern-inspection-mode" role="group" aria-label={copy.mini}>
          <button type="button" aria-pressed={view.mode === "setup"} onClick={() => setChartMode("setup")}>{copy.setup}</button>
          <button type="button" aria-pressed={view.mode === "outcome"} disabled={!view.study && !activeReplay} onClick={() => setChartMode("outcome")}>{copy.outcome}</button>
          <button type="button" aria-pressed={view.mode === "context"} disabled={view.room.state === "WITHHELD"} onClick={() => setChartMode("context")}>{copy.context}</button>
        </div>
        <PatternInspectionChart key={`${signal.time}:${view.mode}`} view={view} label={label} setup={signal.pdfSetup} setupTimeline={setupTimeline} />
        <PatternOutcomeComparison view={view} />
        {view.pullbackPressure && <PatternPullbackEvidence pressure={view.pullbackPressure} />}
        {signal.pdfSetup?.kind === "PULLBACK_REVERSAL" && <PullbackReversalEvidence setup={signal.pdfSetup} />}
        <PatternRoomEvidence room={view.room} onInspectContext={() => { setChartMode("context"); root.current?.querySelector(".chart-pattern-inspector-body")?.scrollTo({ top: 0, behavior: "smooth" }); }} />
        <PatternMarketEvidence context={view.marketContext} selection={setupSelection} onInspectContext={() => { setChartMode("context"); root.current?.querySelector(".chart-pattern-inspector-body")?.scrollTo({ top: 0, behavior: "smooth" }); }} />
        {knowledge?.id === "trade_selection_failure" && <details open={failureStudyOpen} onToggle={(event) => setFailureStudyOpen(event.currentTarget.open)}><summary>{locale === "vi" ? "Bối cảnh thất bại lựa chọn" : "Failure-selection context"}</summary>{failureStudyOpen && <PatternFailureSelectionEvidence bars={bars} occurrenceTime={signal.time} direction={view.direction} enabled={allowGeometry && !activeReplay} />}</details>}
        {!activeReplay && <PatternLowVolatilityEvidence context={lowVolatilityContext} />}
        {!activeReplay && knowledge && <details open={translationOpen} onToggle={(event) => setTranslationOpen(event.currentTarget.open)}><summary>{locale === "vi" ? "Triển khai các tín hiệu PDF" : "PDF signal implementation"}</summary>{translationOpen && <PdfSignalTranslationEvidence bars={bars} selectedTime={signal.time} direction={view.direction === "UP" || view.direction === "DOWN" ? view.direction : "NEUTRAL"} protection={view.technicalStudy?.protection ?? undefined} enabled={allowGeometry} />}</details>}
        <p className="chart-pattern-inspector-ohlc">Setup OHLC<br />O {price(view.anchor.o)} · H {price(view.anchor.h)}<br />L {price(view.anchor.l)} · C {price(view.anchor.c)}</p>
        <dl className="chart-pattern-inspector-prices"><div><dt>Anchor close</dt><dd>{price(view.geometry.entry)}</dd></div>{view.geometry.target != null && view.geometry.invalidation != null && <><div><dt>Target · illustrative</dt><dd>{price(view.geometry.target)}</dd></div><div><dt>Invalidation · illustrative</dt><dd>{price(view.geometry.invalidation)}</dd></div></>}</dl>
        <p className="chart-pattern-inspector-muted">{view.geometry.target != null ? "Landmarks use only candles known at the setup; target = 2.2 ATR, invalidation = 1 ATR." : "Directional landmarks are withheld for neutral, insufficient, or unverified current evidence."}</p>
        {view.technicalStudy && <p className="chart-pattern-inspector-muted">{view.technicalStudy.protection != null && view.technicalStudy.obstacle != null ? <>Technical protection {price(view.technicalStudy.protection)} · nearest confirmed obstacle {price(view.technicalStudy.obstacle)}. These source levels are causal at confirmation and separate from the illustrative ATR target/invalidation; SHADOW_ONLY / NO_DECISION.</> : "Technical protection / nearest obstacle unavailable or withheld; no level is inferred."}</p>}
        <p>Next-close change vs setup: <b>{view.outcome || "Pending / unavailable"}</b></p>
        {signal.annotationKind === "named_candle" && <p className="chart-pattern-inspector-muted">Raw close-to-close direction. Atlas H+1 treats moves within ±0.12 ATR as FLAT.{!activeReplay && signal.nextBarOutcome ? ` This endpoint's observed H+1 class: ${signal.nextBarOutcome}.` : ""}</p>}
      </>}
      {setupTimeline && <PatternSetupTimeline timeline={setupTimeline} />}
      <section><h3>{copy.meaning}</h3><p>{knowledge?.definition || namedKnowledge?.meaning || signal.measures}</p>
        <p>{knowledge ? `Look for: ${knowledge.cues.join(" · ")}` : namedKnowledge?.structure}</p>
        {(knowledge || namedKnowledge) && <p className="chart-pattern-inspector-muted">When to abstain: {knowledge?.abstain.join(" · ") || namedKnowledge?.abstain}</p>}
        {knowledge ? <p>{formatPriceActionSourcePages(knowledge.pages)}</p> : <p className="chart-pattern-inspector-muted">Named-candle taxonomy; no PDF setup attribution.</p>}
        {signal.pdfSetup?.kind === "PATTERN_BREAK_COMBI" && <div className="chart-pattern-inspector-combi" aria-label="Measured combi setup structure">
          <h3>Measured combi structure</h3>
          <p>Context boundary {price(signal.pdfSetup.contextBoundary)} · powerbar {signal.pdfSetup.powerbarTime} UTC · {signal.pdfSetup.insideBarTimes.length} inside bar(s) · close confirmation {signal.pdfSetup.confirmationTime} UTC.</p>
          <p>Break reference {price(signal.pdfSetup.breakoutLevel)} · technical protection reference {price(signal.pdfSetup.protectionReference)}.</p>
          <p className="chart-pattern-inspector-muted">Study rule: powerbar range ≥1.25× preceding six-bar median, body ≥60% and close in outer 25%; closes beyond the context boundary with aligned pressure. One or two nested inside bars occupy the directional end; confirmation closes beyond the last inside bar without touching opposite protection. Opposite inside-bar color is allowed.</p>
          <p className="chart-pattern-inspector-muted">This is the {signal.pdfSetup.version} OHLC proxy. The numerical thresholds and close confirmation are local study rules. Reversed/doji variants, volume, costs and executable intrabar entries are not measured. The ATR position and its outcome statistics start at the confirmation close.</p>
        </div>}
        {signal.pdfSetup?.kind === "PATTERN_BREAK_PULLBACK" && <div className="chart-pattern-inspector-pullback" aria-label="Measured pattern break pullback structure">
          <h3>Measured pattern-break pullback</h3>
          <p>{signal.pdfSetup.variant === "HANGING" ? "Hanging barrier fight" : "Return test after excursion"} | original break {signal.pdfSetup.originalBreakTime} UTC | {signal.pdfSetup.pullbackTimes.length} post-break bars | signal {signal.pdfSetup.signalBarTime} UTC | confirmation {signal.pdfSetup.confirmationTime} UTC.</p>
          <p>Broken boundary {price(signal.pdfSetup.contextBoundary)} | EMA25 estimate at signal {price(signal.pdfSetup.emaAtSignal)} | signal-edge reference {price(signal.pdfSetup.breakoutLevel)} | technical protection {price(signal.pdfSetup.protectionReference)}.</p>
          <p>Study rule: a repeated six-bar boundary is broken, then one to six post-break bars test it without undoing the break. A turnaround signal tests both barrier and EMA25 area; a later candle closes through its edge without touching opposite protection.</p>
          <p className="chart-pattern-inspector-muted">{signal.pdfSetup.version} is a local OHLC proxy. EMA25 is a bounded estimate seeded with SMA25 in the last 40 consecutive closed bars, starting {signal.pdfSetup.emaContextStart} UTC. Thresholds and close confirmation are local study choices. Original-break trade quality, wider dominance, magnets, costs and executable intrabar entries are not inferred. Strong pullbacks may need more buildup than this proxy assesses. ATR outcomes start at confirmation close.</p>
        </div>}
        {signal.pdfSetup?.kind === "PATTERN_BREAK" && <div className="chart-pattern-inspector-break" aria-label="Measured pattern break setup structure">
          <h3>Measured pattern-break structure</h3>
          <p>{signal.pdfSetup.buildupTimes.length} buildup bars | {signal.pdfSetup.boundaryTouchTimes.length} boundary touches | signal bar {signal.pdfSetup.signalBarTime} UTC | close confirmation {signal.pdfSetup.confirmationTime} UTC.</p>
          <p>Context boundary {price(signal.pdfSetup.contextBoundary)} | signal-bar break reference {price(signal.pdfSetup.breakoutLevel)} | technical protection reference {price(signal.pdfSetup.protectionReference)}.</p>
          <p className="chart-pattern-inspector-muted">Study rule: four context bars establish pressure and a horizontal boundary; four to six compact buildup bars alternate at least twice and test the boundary at least three times. A directional signal bar closes near the boundary; a subsequent candle closes beyond both boundary and signal edge without touching opposite protection.</p>
          <p className="chart-pattern-inspector-muted">{signal.pdfSetup.version} is a local OHLC proxy. Numerical thresholds and close confirmation are study choices. Longer/sloped patterns, wider context obstacles, volume, costs and executable intrabar entries are not measured. ATR outcome statistics begin at confirmation close.</p>
        </div>}
      </section>
      {knowledge && <ReviewedSourceNotes key={knowledge.id} knowledge={knowledge} />}
      {!activeReplay && evidence && ["pattern_break", "pattern_break_pullback", "pattern_break_combi", "pullback_reversal"].includes(evidence.conceptId) && <details open={contextStudyOpen === evidence.conceptId} onToggle={event => setContextStudyOpen(event.currentTarget.open ? evidence.conceptId : null)}>
        <summary>Context selection history</summary>
        {contextStudyOpen === evidence.conceptId && <Suspense fallback={<p role="status">Loading context selection history…</p>}>
          <PatternContextSelectionStudy key={`${bookmarkScope}:${evidence.conceptId}`} bars={bars} evidence={evidence} scope={bookmarkScope || sourceLabel} selectedTime={signal.time} onInspect={time => {
            const instant = canonicalPatternReplayBookmarkTime(time);
            const ordinal = instant ? occurrences.findIndex(item => canonicalPatternReplayBookmarkTime(item.time) === instant) : -1;
            if (ordinal >= 0) onNavigate(ordinal);
          }} />
        </Suspense>}
      </details>}
      {!activeReplay && <section><h3>{copy.history}</h3>
        {namedHistory && <NamedCandleHistoryEvidence evidence={namedHistory} />}
        {signal.annotationKind === "named_candle" && !namedHistory && <p role="status" aria-live="polite">{namedHistoryStatus === "loading" ? "Scanning retained M5 candle history; statistics and occurrence navigation are pending. Chart controls remain available." : "Named-candle history is unavailable."}{namedHistoryStatus === "error" && onRetryNamedHistory && <> <button type="button" onClick={onRetryNamedHistory}>Retry named-candle history scan</button></>}</p>}
        {evidence ? <><strong>{rate(evidence.hitRate)} next-bar hit rate</strong><p>{evidence.occurrences.toLocaleString()} occurrences / {evidence.evaluated.toLocaleString()} chronological evaluations</p><p className="chart-pattern-inspector-muted">{evidence.skipped.toLocaleString()} candidate windows excluded because their setup or next-bar outcome crosses an M5 data gap.</p>{evidence.interval95 && <p>95% Wilson interval: {(evidence.interval95.lower * 100).toFixed(1)}–{(evidence.interval95.upper * 100).toFixed(1)}%</p>}<p>LONG {rate(evidence.long.hitRate)} ({evidence.long.occurrences})<br />SHORT {rate(evidence.short.hitRate)} ({evidence.short.occurrences})</p><p className="chart-pattern-inspector-muted">{evidence.firstEvaluation} → {evidence.lastEvaluation}</p></> : knowledge ? <p role="status">{evidenceStatus === "loading" ? "Scanning retained M5 history; statistics and occurrence navigation are pending." : "Pattern history statistics are unavailable."}{evidenceStatus === "error" && onRetryEvidence && <> <button type="button" onClick={onRetryEvidence}>Retry pattern history scan</button></>}</p> : signal.annotationKind !== "named_candle" && !namedHistory && <p>{occurrences.length} retained matching analogue endpoints. This is a similarity-filtered preview, with no full-history occurrence or trade win-rate claim.</p>}
        <p className="chart-pattern-inspector-muted">Next-bar direction is an observed outcome; it does not measure whether a target was hit before invalidation.</p>
        <p className="chart-pattern-inspector-muted">{(knowledge && !evidence) || (signal.annotationKind === "named_candle" && !namedHistory) ? ((knowledge ? evidenceStatus : namedHistoryStatus) === "error" ? "Historical occurrence count is unavailable." : "Historical occurrence count is pending.") : <>{occurrences.length.toLocaleString()} {(evidence || namedHistory) ? "measured historical occurrences available across the retained tape." : "retained analogue preview windows available."}</>}</p>
      </section>
      }
      {evidence && view && !activeReplay && <PatternBarrierEvidence bars={bars} evidence={evidence} selectedIndex={view.index} direction={view.direction} allowGeometry={allowGeometry} setup={signal.pdfSetup} />}
      <footer>SHADOW_ONLY · NO_DECISION · no order execution</footer>
    </div>
    <div className="chart-pattern-inspector-actions">
      {/* type="button" aria-label="Inspect earlier pattern occurrence" */}
      {/* type="button" aria-label="Inspect later pattern occurrence" */}
      <div className="chart-pattern-inspector-navigation"><button type="button" aria-label={copy.earlier} disabled={navigation.earlier < 0} onClick={() => onNavigate(navigation.earlier)}>{copy.earlier}</button><span role="status" aria-live="polite" aria-atomic="true">{navigation.selected >= 0 ? `${(navigation.selected + 1).toLocaleString()} / ${occurrences.length.toLocaleString()}` : `${copy.current} / ${occurrences.length.toLocaleString()} ${copy.historical}`}</span><button type="button" aria-label={copy.later} disabled={navigation.later < 0} onClick={() => onNavigate(navigation.later)}>{copy.later}</button></div>
      <form className="chart-pattern-inspector-jump" onSubmit={(event) => { event.preventDefault(); const index = Number(ordinal) - 1; if (Number.isInteger(index) && index >= 0 && index < occurrences.length) onNavigate(index); }}>
        <button type="button" aria-label={copy.first} disabled={!occurrences.length || navigation.selected === 0} onClick={() => onNavigate(0)}>{copy.first}</button>
        {/* <input type="number" aria-label="Pattern occurrence number" /> */}
        <label>{copy.occurrence}<input type="number" aria-label={copy.occurrence} min="1" max={occurrences.length} step="1" required value={ordinal} disabled={!occurrences.length} onChange={(event) => setOrdinal(event.target.value)} /></label>
        <button type="submit" disabled={!occurrences.length}>{copy.go}</button>
        <button type="button" aria-label={copy.latest} disabled={!occurrences.length || navigation.selected === occurrences.length - 1} onClick={() => onNavigate(occurrences.length - 1)}>{copy.latest}</button>
      </form>
      <button className="chart-pattern-inspector-show" type="button" disabled={!view} onClick={() => onShowOnChart(signal)}>{copy.show}</button>
    </div>
  </aside>;
}
