import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getActiveSymbol } from "../lib/activeSymbolStore.ts";
import { useTerminalGeneration } from "../lib/mt5Connection.ts";
import { loadSimOhlc } from "../adapters/loadSimOhlc.ts";
import { liveSymbol, mt5Bars, mt5FeedHealth, mt5ThreeYearHistory, isOffline as mtOffline, type Mt5FeedHealth, type BrokerHistoryTimeframe } from "../lib/mt5DemoAdapter.ts";
import { parseCsvOhlc, CSV_MAX_BYTES, type CsvQuality } from "../lib/csvOhlc.ts";
import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import {
  analyzeMultiTimeframe,
  type MultiTimeframeAtlas,
  type OutcomeDirection,
  type PatternAnalysis,
  type PatternBar,
  type PatternTimeframe,
} from "../lib/candlePatternAtlas.ts";
import "./product.css";
import "./pattern-atlas.css";

type Source = "Live" | "Replay" | "CSV";
const TFS: PatternTimeframe[] = ["M5", "M15", "M30"];
const BROKER_TFS: BrokerHistoryTimeframe[] = ["M5", "M15", "M30", "H1"];
const LIVE_HISTORY_CACHE_TTL = 15 * 60_000;
const liveHistoryCache = new Map<string, {
  at: number;
  bars: OhlcBar[];
  coverageYears?: number;
  complete?: boolean;
  cachedChunks?: number;
  chunks?: number;
  failedChunks?: number;
  requestedBars?: number;
  returnedBars?: number;
  reason?: string;
  retentionSource?: string;
  terminalMaxBars?: number;
}>();
interface TimeframeFeedMeta { source: Source; fetchedAt: string; loadedBars: number; filename?: string; declaredTf?: string; warnings?: string[]; }
type FeedMeta = Partial<Record<PatternTimeframe, TimeframeFeedMeta>>;
type HistoryCoverage = Partial<Record<BrokerHistoryTimeframe, { years: number; complete: boolean; cachedChunks?: number; chunks?: number; failedChunks?: number; requestedBars?: number; returnedBars?: number; reason?: string; retentionSource?: string; terminalMaxBars?: number }>>;
type EvidenceState = "VERIFIED" | "PARTIAL" | "STALE" | "CONTRACT_INVALID" | "PENDING";
interface EvidenceStatus { state: EvidenceState; reason?: string; }
interface CsvTape { bars: OhlcBar[]; filename: string; tf: PatternTimeframe; quality: CsvQuality; warnings: string[]; }
type CsvTapes = Partial<Record<PatternTimeframe, CsvTape>>;
interface EvolutionPoint { at: string; novelty: number; lift: number | null; }
interface EvolutionLedger { loops: number; firstLoopAt: string; bestLift: number | null; lastNovelty: number; lastSignature: string; history: EvolutionPoint[]; }

function readEvolutionLedger(symbol: string): EvolutionLedger {
  const fallback: EvolutionLedger = { loops: 0, firstLoopAt: "", bestLift: null, lastNovelty: 1, lastSignature: "", history: [] };
  try {
    const value = JSON.parse(localStorage.getItem(`mfe_pattern_atlas_evolution_${symbol}`) || "null");
    return value && typeof value.loops === "number" ? { ...fallback, ...value } : fallback;
  } catch { return fallback; }
}

function toPatternBars(bars: OhlcBar[]): PatternBar[] {
  return bars.map((bar, index) => ({ i: index, t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c }));
}

function mergeLiveBars(previous: OhlcBar[], next: OhlcBar[]): OhlcBar[] {
  const byTime = new Map<string, OhlcBar>();
  for (const bar of [...previous, ...next]) byTime.set(bar.t, bar);
  return [...byTime.values()].sort((a, b) => a.t.localeCompare(b.t)).map((bar, index) => ({ ...bar, i: index }));
}

function percent(value: number): string { return `${(value * 100).toFixed(1)}%`; }
function signed(value: number): string { return `${value >= 0 ? "+" : ""}${value.toFixed(2)} ATR`; }
function asOfAge(asOf: string | null): string {
  if (!asOf) return "age unavailable";
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(asOf) ? asOf : `${asOf.replace(" ", "T")}Z`;
  const stamp = Date.parse(normalized);
  if (!Number.isFinite(stamp)) return "age unavailable";
  const seconds = Math.max(0, Math.floor((Date.now() - stamp) / 1000));
  if (seconds < 60) return `${seconds}s old`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m old`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h old`;
  return `${Math.floor(seconds / 86400)}d old`;
}
function asOfMillis(asOf: string | null): number | null {
  if (!asOf) return null;
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(asOf) ? asOf : `${asOf.replace(" ", "T")}Z`;
  const stamp = Date.parse(normalized);
  return Number.isFinite(stamp) ? stamp : null;
}
function staleAfterMillis(tf: PatternTimeframe): number {
  const timeframeMs = tf === "M5" ? 5 * 60_000 : tf === "M30" ? 30 * 60_000 : 15 * 60_000;
  return timeframeMs * 2 + 3 * 60_000;
}
function evidenceStatus(tf: PatternTimeframe, source: Source, analysis?: PatternAnalysis, coverage?: HistoryCoverage[PatternTimeframe], feedHealth?: Mt5FeedHealth | null): EvidenceStatus {
  if (!analysis) return { state: "PENDING", reason: "Waiting for a verified tape" };
  const qualityFlags = analysis.dataQuality.gaps + analysis.dataQuality.duplicateTimestamps + analysis.dataQuality.outOfOrderBars + analysis.dataQuality.formingBars + analysis.dataQuality.invalidBars + analysis.dataQuality.invalidTimestamps;
  if (source === "Live") {
    const reason = coverage?.reason || "";
    if (/CONTRACT|PROVENANCE/i.test(reason)) return { state: "CONTRACT_INVALID", reason: reason.replace(/_/g, " ") };
    if (tf === "M15" && feedHealth) {
      if (/CLOSED_BARS_REQUIRED|INVALID_BAR_TIMESTAMP|FORMING_BAR_INCLUDED|INVALID_CLOSED_BAR/i.test(feedHealth.reason || "")) return { state: "CONTRACT_INVALID", reason: feedHealth.reason!.replace(/_/g, " ") };
      if (["STALE", "SYMBOL_NOT_FOUND", "OFFLINE"].includes(feedHealth.state)) return { state: "STALE", reason: `MT5 ${feedHealth.reason?.replace(/_/g, " ") || feedHealth.state.toLowerCase()}` };
    }
    const stamp = asOfMillis(analysis.asOf);
    if (stamp != null && Date.now() - stamp > staleAfterMillis(tf)) return { state: "STALE", reason: `Latest closed bar ${asOfAge(analysis.asOf)}` };
    if (coverage && !coverage.complete) return { state: "PARTIAL", reason: historyReasonLabel(reason) || "Broker history coverage is incomplete" };
    if (qualityFlags > 0) return { state: "PARTIAL", reason: `${qualityFlags} tape quality flag${qualityFlags === 1 ? "" : "s"}` };
  } else if (qualityFlags > 0) {
    return { state: "PARTIAL", reason: `${qualityFlags} tape quality flag${qualityFlags === 1 ? "" : "s"}` };
  }
  return analysis.ok ? { state: "VERIFIED", reason: "Closed bars passed the Atlas evidence gates" } : { state: "PENDING", reason: analysis.reason?.replace(/_/g, " ") || "Insufficient closed-bar evidence" };
}
function evidenceStateLabel(state: EvidenceState): string {
  return state === "CONTRACT_INVALID" ? "CONTRACT INVALID" : state;
}
function directionColor(direction: OutcomeDirection): string {
  return direction === "UP" ? "var(--pa-positive)" : direction === "DOWN" ? "var(--pa-negative)" : "var(--pa-muted)";
}
function driftColor(label: "STABLE" | "WATCH" | "BREAK"): string { return label === "BREAK" ? "var(--pa-negative)" : label === "WATCH" ? "var(--pa-warning)" : "var(--pa-positive)"; }

function feedHealthLabel(health: Mt5FeedHealth | null): string {
  if (!health) return "Checking MT5 feed";
  if (health.state === "CONNECTED_CLOSED_BARS") return `MT5 connected · closed bars${health.brokerSymbol ? ` · ${health.brokerSymbol}` : ""}`;
  if (health.state === "STALE") return "MT5 connected · stale closed bars";
  if (health.state === "SYMBOL_NOT_FOUND") return "MT5 connected · symbol not found";
  return "MT5 offline";
}

function historyReasonLabel(reason?: string): string {
  switch (reason) {
    case "BROKER_MAX_BARS_LIMIT": return "Broker or terminal history limit";
    case "TERMINAL_MAX_BARS_LIMIT": return "MT5 terminal Max bars in chart limit";
    case "BROKER_RETENTION_LIMIT": return "Broker history retention limit";
    case "HISTORY_PARTIAL_CHUNKS": return "Some requested history chunks are unavailable";
    case "HISTORY_INTERNAL_GAP": return "Internal history gap exceeds the market-closure allowance";
    case "HISTORY_ACCOUNT_CHANGED": return "MT5 account changed while history was loading; retry the timeframe";
    case "BRIDGE_OFFLINE":
    case "SERVER_OFFLINE":
    case "NOT_CONNECTED": return "MT5 history request was unavailable; reconnect and retry";
    case "BROKER_HISTORY_TRUNCATED": return "Broker history starts later than the requested window";
    case "HISTORY_UNAVAILABLE": return "Broker history is unavailable";
    case "HISTORY_CONTRACT_MISMATCH": return "Bridge history contract is incompatible";
    case "HISTORY_PROVENANCE_MISSING": return "Bridge did not identify the history source";
    case "HISTORY_TIMESTAMP_BASIS_MISMATCH": return "Bridge timestamp basis is not UTC";
    case "HISTORY_SERVER_TIMEZONE_MISMATCH": return "MT5 chunks reported different server timezones";
    case "HISTORY_AUTHORITY_MISMATCH": return "Bridge history was not read-only shadow data";
    case "FORMING_BAR_INCLUDED": return "Bridge included a still-forming candle";
    case "INVALID_CLOSED_BAR": return "Live feed returned an invalid closed candle";
    case "OUTSIDE_REQUESTED_WINDOW": return "Bridge returned rows outside the requested window";
    case "INVALID_BAR_DATA": return "Broker returned invalid OHLC rows";
    default: return /OFFLINE|TIMEOUT|FAILED|UNAVAILABLE|NOT_CONNECTED/i.test(reason || "")
      ? "MT5 history request was unavailable; reconnect and retry"
      : reason ? reason.replace(/_/g, " ") : "";
  }
}

function historyLimitLabel(item?: { retentionSource?: string; terminalMaxBars?: number }): string {
  if (!item?.retentionSource) return "";
  if (item.retentionSource === "TERMINAL_MAX_BARS") {
    return `Terminal Max bars${item.terminalMaxBars ? ` ${item.terminalMaxBars.toLocaleString()}` : ""}`;
  }
  if (item.retentionSource === "BROKER_RETENTION") return "Broker retention";
  return "History limit source unknown";
}

function familyLabel(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/(^| )\S/g, (letter) => letter.toUpperCase());
}

function sessionLabel(value: string): string {
  return familyLabel(value).replace(/Ny/g, "NY");
}

function detectedNames(analysis: PatternAnalysis): string[] {
  const current = analysis.current;
  if (!current) return [];
  const named = (analysis.currentPatterns || []).map((pattern) => familyLabel(pattern));
  const names = [current.label, current.family ? familyLabel(current.family) : "", ...named];
  const body = Math.abs(current.bodyAtr);
  if (body <= 0.18) names.push("Doji");
  if (current.lowerWickAtr > Math.max(current.upperWickAtr * 1.5, body * 1.2) && current.closePosition >= 0.55) names.push("Hammer geometry");
  if (current.upperWickAtr > Math.max(current.lowerWickAtr * 1.5, body * 1.2) && current.closePosition <= 0.55) names.push("Shooting-star geometry");
  if (current.upperWickAtr < current.rangeAtr * 0.12 && current.lowerWickAtr < current.rangeAtr * 0.12 && body > current.rangeAtr * 0.65) names.push("Marubozu geometry");
  return [...new Set(names.filter(Boolean))];
}

function ProbabilityBar({ analysis }: { analysis: PatternAnalysis }) {
  const p = analysis.predictions[0];
  if (!p) return <div className="pa-empty-line">No forecast until enough historical analogues are available.</div>;
  const summary = `H+1 distribution: UP ${percent(p.up)}, FLAT ${percent(p.flat)}, DOWN ${percent(p.down)}`;
  return <div className="pa-probability" role="img" aria-label={summary}>
    <div className="pa-probability-track"><span style={{ width: `${p.up * 100}%`, background: "var(--pa-positive)" }} /><span style={{ width: `${p.flat * 100}%`, background: "var(--pa-muted)" }} /><span style={{ width: `${p.down * 100}%`, background: "var(--pa-negative)" }} /></div>
    <div className="pa-probability-legend"><span><i style={{ background: "var(--pa-positive)" }} />UP {percent(p.up)}</span><span><i style={{ background: "var(--pa-muted)" }} />FLAT {percent(p.flat)}</span><span><i style={{ background: "var(--pa-negative)" }} />DOWN {percent(p.down)}</span></div>
  </div>;
}

function EvidencePulse({ analysis }: { analysis: PatternAnalysis }) {
  const prediction = analysis.predictions[0];
  if (!prediction) return null;
  const calibration = prediction.calibration;
  const reliability = analysis.walkForward.probabilistic?.reliability;
  const qualityFlags = analysis.dataQuality.gaps + analysis.dataQuality.duplicateTimestamps + analysis.dataQuality.outOfOrderBars + analysis.dataQuality.formingBars + analysis.dataQuality.invalidBars + analysis.dataQuality.invalidTimestamps;
  const contextMatches = analysis.matches.filter((match) => typeof match.contextWeight === "number");
  const meanContextWeight = contextMatches.length
    ? contextMatches.reduce((sum, match) => sum + (match.contextWeight || 0), 0) / contextMatches.length
    : null;
  const sameRegimeMatches = contextMatches.filter((match) => match.sameRegime).length;
  const sameSessionMatches = contextMatches.filter((match) => match.sameSession).length;
  const interval = (value: { lower: number; upper: number } | undefined) => value ? `${percent(value.lower)}–${percent(value.upper)}` : "—";
  const confidenceClass = prediction.confidence.toLowerCase();
  return <section className="pa-evidence-pulse" aria-label="Evidence and uncertainty" aria-live="polite">
    <div className="pa-evidence-pulse-head"><span>Evidence &amp; uncertainty</span><div className="pa-evidence-pulse-status"><span className="pa-evidence-pulse-sample">H+1 · n={prediction.sampleN.toLocaleString()}</span><b className={`pa-confidence-${confidenceClass}`}>{prediction.confidence} confidence</b></div></div>
    <div className="pa-confidence-scale" aria-label={`Confidence scale: ${prediction.confidence}`}>
      <span className={confidenceClass === "low" ? "active" : ""}>low</span><i className={confidenceClass === "low" ? "active" : ""} /><i className={confidenceClass === "medium" ? "active" : ""} /><i className={confidenceClass === "high" ? "active" : ""} /><span className={confidenceClass === "high" ? "active" : ""}>high</span>
    </div>
    <div className="pa-evidence-pulse-grid">
      <div><small>H+1 sample</small><strong>n={prediction.sampleN.toLocaleString()}</strong><span>{analysis.matches.length.toLocaleString()} analogues</span></div>
      <div><small>Effective sample</small><strong>{calibration ? calibration.effectiveN.toFixed(1) : "—"}</strong><span>{calibration ? `reliability ${(calibration.reliability * 100).toFixed(0)}%` : "calibration unavailable"}</span></div>
      <div><small>Independent support</small><strong>{analysis.evidence ? percent(analysis.evidence.uncertaintyWeight) : "—"}</strong><span>vote weight after overlap adjustment</span></div>
      <div><small>Tape quality</small><strong className={qualityFlags ? "pa-quality-watch" : "pa-quality-clean"}>{qualityFlags ? `${qualityFlags} flags` : "clean"}</strong><span>{analysis.bars.toLocaleString()} usable bars</span></div>
      <div><small>OOS stability</small><strong className={`pa-stability-${analysis.walkForward.stability?.label?.toLowerCase() || "insufficient"}`}>{analysis.walkForward.stability?.label || "INSUFFICIENT"}</strong><span>{analysis.walkForward.stability ? `${analysis.walkForward.stability.positiveLiftFolds}/${analysis.walkForward.stability.folds.length} positive folds` : "not classified"}</span><span className="pa-oos-interval">95% hit-rate {analysis.walkForward.hitRateInterval95 ? `${percent(analysis.walkForward.hitRateInterval95.lower)}–${percent(analysis.walkForward.hitRateInterval95.upper)}` : "—"}</span></div>
    </div>
    <div className="pa-evidence-intervals"><span>95% probability bands</span><b>UP {interval(calibration?.interval95.up)}</b><b>FLAT {interval(calibration?.interval95.flat)}</b><b>DOWN {interval(calibration?.interval95.down)}</b>{calibration && <small>entropy {(calibration.entropy * 100).toFixed(0)}%</small>}{reliability && <small className={`pa-calibration-${reliability.status.toLowerCase()}`}>calibration {reliability.status} · ECE {reliability.expectedCalibrationError == null ? "—" : reliability.expectedCalibrationError.toFixed(3)}</small>}</div>
    {reliability && <div className="pa-calibration-support"><span>Calibration support</span><b>{reliability.supportedBins}/{reliability.populatedBins} bins supported</b><small>{(reliability.supportedSampleRate * 100).toFixed(0)}% held-out labels covered · minimum n={reliability.minimumBinCount}</small></div>}
    <div className="pa-context-weight" title="Context-matched analogues retain more influence; mismatched rows remain visible with a lower multiplier."><span>Context weighting</span><b>{meanContextWeight == null ? "—" : `${(meanContextWeight * 100).toFixed(0)}% mean multiplier`}</b><small>{contextMatches.length ? `${sameRegimeMatches}/${contextMatches.length} same regime · ${sameSessionMatches}/${contextMatches.length} same session` : "no context-weighted analogues"}</small></div>
    {analysis.analogueCoverage && <div className="pa-analogue-coverage" aria-label="Analogue selection coverage"><span>Analogue selection</span><b>{analysis.analogueCoverage.causalCandidates.toLocaleString()} → {analysis.analogueCoverage.rankedCandidates.toLocaleString()} → {analysis.analogueCoverage.selectedSamples.toLocaleString()}</b><small>candidate · retained · selected · {percent(analysis.analogueCoverage.retainedRate)} retained · {percent(analysis.analogueCoverage.selectedRate)} selected · {analysis.analogueCoverage.sessionFallback ? "all-session fallback" : "session filter applied"}</small></div>}
    {analysis.regimeCalibration && <div className="pa-regime-calibration"><span>Regime calibration <b>{analysis.regimeCalibration.mode === "SAME_REGIME" ? "same regime" : "all regimes"}</b></span><span>stability {(analysis.regimeCalibration.stability * 100).toFixed(0)}%</span><span>shift {(analysis.regimeCalibration.distributionShift * 100).toFixed(0)}pp</span><small>{analysis.regimeCalibration.sameRegimeSamples} same-regime / {analysis.regimeCalibration.totalSamples} analogue endpoints</small></div>}
  </section>;
}

function AdaptiveCandidates({ analysis }: { analysis: PatternAnalysis }) {
  const adaptive = analysis.adaptive;
  if (!adaptive) return null;
  const bestLift = Math.max(...adaptive.candidates.map((candidate) => candidate.lift ?? -1));
  return <details className="pa-adaptive">
    <summary>Adaptive context <b>{adaptive.selectedLookback} candles</b> · {adaptive.candidates.length} candidates</summary>
    <div className="pa-adaptive-head"><span>Lookback</span><span>Hit</span><span>Base</span><span>Lift</span><span>Evidence</span></div>
    <div className="pa-adaptive-grid">{adaptive.candidates.map((candidate) => {
      const selected = candidate.lookback === adaptive.selectedLookback;
      const valid = candidate.lift != null;
      return <div key={candidate.lookback} className={`pa-adaptive-row ${selected ? "selected" : ""}`}>
        <b>L{candidate.lookback}</b><span>{candidate.hitRate == null ? "—" : percent(candidate.hitRate)}</span><span>{candidate.baseline == null ? "—" : percent(candidate.baseline)}</span><span className={candidate.lift != null && candidate.lift >= 0 ? "positive" : "negative"}>{candidate.lift == null ? "—" : `${candidate.lift >= 0 ? "+" : ""}${(candidate.lift * 100).toFixed(1)}pp`}</span><small>{valid && candidate.lift === bestLift ? "best" : `${candidate.evaluated} q`}</small>
      </div>;
    })}</div>
    <p>{adaptive.reason}</p>
  </details>;
}

function RegimePulse({ analysis }: { analysis: PatternAnalysis }) {
  const trendStrength = Math.min(1, Math.abs(analysis.regime.trendAtr) / 3);
  const volatility = Math.min(1, Math.max(0, analysis.regime.volatilityRatio / 2));
  const adaptive = analysis.adaptive;
  return <div className="pa-regime-pulse"><div className="pa-regime-pulse-head"><span>Regime pulse</span><b>{analysis.regime.label}</b><small>{adaptive?.fallback ? "adaptive fallback" : "same-regime selection"}</small></div><div className="pa-regime-meter"><label>trend <i><em style={{ width: `${trendStrength * 100}%`, marginLeft: analysis.regime.trendAtr < 0 ? `${(1 - trendStrength) * 100}%` : "0%", background: analysis.regime.trendAtr < 0 ? "var(--pa-negative)" : "var(--pa-positive)" }} /></i><strong>{analysis.regime.trendAtr >= 0 ? "+" : "−"}{Math.abs(analysis.regime.trendAtr).toFixed(2)} ATR</strong></label><label>vol <i><em style={{ width: `${volatility * 100}%`, background: volatility > .72 ? "var(--pa-warning)" : "var(--pa-accent)" }} /></i><strong>{analysis.regime.volatilityRatio.toFixed(2)}x</strong></label></div><small className="pa-regime-pulse-note">{analysis.regime.matchingSamples} matched historical windows · {adaptive?.candidates.reduce((sum, candidate) => sum + candidate.sameRegimeCandidates, 0) || 0} regime candidates tested</small></div>;
}

function PatternFamilies({ analysis }: { analysis: PatternAnalysis }) {
  const cluster = analysis.cluster;
  if (!cluster) return null;
  const next = analysis.predictions[0];
  const names = detectedNames(analysis);
  const coverage = analysis.patternCoverage;
  const currentCoverage = coverage?.current.filter((row) => names.some((name) => name.toUpperCase().replace(/[^A-Z]+/g, "_") === row.pattern)) || [];
  return <details className="pa-families">
    <summary>Detected named patterns <b>{names.length}</b> · family recurrence</summary>
    <div className="pa-named-list">{names.map((name) => <span key={name} className={name === familyLabel(cluster.currentFamily) ? "current" : ""}>{name}</span>)}</div>
    {coverage && <div className="pa-pattern-coverage"><span>Inventory coverage <b>{coverage.observedUnique}/{coverage.registrySize}</b> <small>{percent(coverage.observedRate)} observed in causal analogues</small></span>{currentCoverage.slice(0, 4).map((row) => <i key={row.pattern} className={`rarity-${row.rarity.toLowerCase()}`}>{familyLabel(row.pattern)} · {row.rarity}</i>)}</div>}
    <div className="pa-family-current"><span>Current family <b>{familyLabel(cluster.currentFamily)}</b></span><span>{cluster.supportSamples} historical support · {percent(cluster.supportRate)} · {cluster.sameRegimeSupport} same-regime</span></div>
    <div className="pa-family-table">{cluster.families.slice(0, 6).map((family) => <div key={family.family} className={family.family === cluster.currentFamily ? "current" : ""}><b>{familyLabel(family.family)}</b><i><em style={{ width: `${Math.min(100, family.rate * 100)}%` }} /></i><span>{family.count} · {percent(family.rate)}</span></div>)}</div>
    {!!analysis.patternCounts?.length && <div className="pa-pattern-counts"><span>Named-pattern recurrence</span>{analysis.patternCounts.slice(0, 8).map((item) => <small key={item.pattern}>{familyLabel(item.pattern)} · {item.count} · {percent(item.rate)}</small>)}</div>}
    {next && <div className="pa-family-prob"><span>Next-direction probability for current family support</span><b><em style={{ width: `${next.up * 100}%`, background: "var(--pa-positive)" }} /><em style={{ width: `${next.flat * 100}%`, background: "var(--pa-muted)" }} /><em style={{ width: `${next.down * 100}%`, background: "var(--pa-negative)" }} /></b><small>UP {percent(next.up)} · FLAT {percent(next.flat)} · DOWN {percent(next.down)}</small></div>}
  </details>;
}

function PatternEvidence({ analysis }: { analysis: PatternAnalysis }) {
  const named = analysis.namedPatternPredictions || [];
  const calibration = analysis.sessionCalibration;
  const overlap = analysis.patternOverlap;
  const evidence = analysis.patternEvidence;
  const overlapFactor = analysis.predictions[0]?.calibration?.overlapFactor;
  if (!named.length && !calibration && !overlap && !evidence) return null;
  return <section className="pa-pattern-evidence" aria-label="Current pattern evidence">
    <div className="pa-pattern-evidence-head"><span>Current pattern evidence</span><small>{analysis.currentPatterns?.length ? analysis.currentPatterns.map(sessionLabel).join(" · ") : "No named detector match"}</small></div>
    {named.length ? <div className="pa-pattern-evidence-list">{named.slice(0, 4).map((item) => {
      const prediction = item.predictions.find((entry) => entry.horizon === 1) || item.predictions[0];
      const lift = prediction?.liftVsAggregate;
      const liftLabel = lift ? `UP ${lift.up >= 0 ? "+" : ""}${(lift.up * 100).toFixed(1)}pp · DOWN ${lift.down >= 0 ? "+" : ""}${(lift.down * 100).toFixed(1)}pp` : "aggregate lift unavailable";
      return <div className="pa-pattern-evidence-row" key={item.pattern}>
        <div className="pa-pattern-evidence-label"><b>{familyLabel(item.pattern)}</b><small>n={item.sampleN} · {percent(item.rate)} coverage</small><small className={`pa-pattern-support pa-pattern-support-${item.support.toLowerCase()}`}>{item.support.toLowerCase()} support</small></div>
        {prediction ? <><i className="pa-pattern-evidence-bar" aria-hidden="true"><em style={{ width: `${prediction.up * 100}%`, background: "var(--pa-positive)" }} /><em style={{ width: `${prediction.flat * 100}%`, background: "var(--pa-muted)" }} /><em style={{ width: `${prediction.down * 100}%`, background: "var(--pa-negative)" }} /></i><span>UP {percent(prediction.up)} · FLAT {percent(prediction.flat)} · DOWN {percent(prediction.down)}<small className="pa-pattern-evidence-lift">{liftLabel}</small></span></> : <span>No H+1 distribution</span>}
      </div>;
    })}</div> : <div className="pa-empty-line">No named-pattern analogue support in the selected sample.</div>}
    {calibration && <div className="pa-session-calibration"><span>Session calibration</span><b>{sessionLabel(calibration.current)}</b><small>{calibration.mode === "SAME_SESSION" ? "same-session selected" : "all sessions selected"} · {calibration.currentSessionSamples}/{calibration.totalSamples} current · {calibration.selectedSamples} used{calibration.fallback ? " · fallback" : ""}</small></div>}
    {evidence && <div className="pa-pattern-evidence-support" aria-label="Pattern evidence support accounting">
      <div><span>Union support</span><b>{evidence.uniqueEndpointSupport}/{evidence.selectedAnalogueSamples} endpoints</b></div>
      <small>{evidence.detectorAssignmentCount} detector associations · {percent(evidence.endpointCoverageRate)} endpoint coverage · {percent(evidence.assignmentOverlapRate)} assignment overlap</small>
      <small>Conditional descriptors only; named-pattern evidence is excluded from the timeframe vote.</small>
    </div>}
    {overlap && <div className="pa-overlap-observability" aria-label="Named detector overlap diagnostics">
      <div className="pa-overlap-head"><span>Detector overlap</span><b>{overlap.currentHasOverlap ? `${overlap.currentCount} current detectors` : "Single current detector"}</b></div>
      <small>{overlap.analogueSamples ? `${percent(overlap.analogueMultiPatternRate)} of causal analogues carry multiple detectors · mean ${overlap.analogueMeanPatterns.toFixed(1)} detectors` : "No causal analogue overlap in the selected sample"}</small>
      {overlapFactor != null && <small>Effective H+1 support retains {percent(overlapFactor)} after endpoint overlap adjustment</small>}
      {!!overlap.pairs.length && <div className="pa-overlap-pairs"><span>Common pairs</span>{overlap.pairs.slice(0, 3).map((pair) => <small key={`${pair.first}-${pair.second}`}>{familyLabel(pair.first)} + {familyLabel(pair.second)} · {percent(pair.rate)}</small>)}</div>}
    </div>}
  </section>;
}

function CandleMiniChart({ bars }: { bars?: OhlcBar[] }) {
  const chartDescriptionId = useId();
  if (!bars?.length) return null;
  const width = 360;
  const height = 156;
  const plot = { left: 9, right: 8, top: 12, bottom: 20 };
  const highs = bars.map((bar) => bar.h);
  const lows = bars.map((bar) => bar.l);
  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const pad = Math.max((high - low) * 0.06, Number.EPSILON);
  const top = high + pad;
  const bottom = low - pad;
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const xStep = plotWidth / Math.max(1, bars.length);
  const candleWidth = Math.max(1.5, Math.min(7, xStep * 0.64));
  const y = (price: number) => plot.top + ((top - price) / (top - bottom)) * plotHeight;
  const formatPrice = (price: number) => price >= 100 ? price.toFixed(2) : price.toFixed(4);
  const levels = [0, .5, 1].map((fraction) => ({ fraction, value: top - (top - bottom) * fraction }));
  const first = bars[0];
  const latest = bars[bars.length - 1];
  const netChange = latest.c - first.o;
  const changeLabel = `${netChange >= 0 ? "up" : "down"} ${Math.abs(netChange).toFixed(latest.c >= 100 ? 2 : 4)} from first open`;
  const latestLabel = `${latest.t.replace("T", " ").slice(0, 16)} UTC; open ${formatPrice(latest.o)}, high ${formatPrice(latest.h)}, low ${formatPrice(latest.l)}, close ${formatPrice(latest.c)}`;
  const chartDescription = `${bars.length} closed bars from ${bars[0].t.replace("T", " ").slice(0, 16)} UTC to ${latest.t.replace("T", " ").slice(0, 16)} UTC. Latest bar: ${latestLabel}; ${changeLabel}. Up closes are filled and down closes are outlined.`;
  return <figure className="pa-mini-chart" aria-label={`${bars.length} closed-bar candlestick chart`} aria-describedby={chartDescriptionId}>
    <div className="pa-mini-chart-head"><span>Closed-bar tape</span><b>{bars.length} bars</b></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Recent closed-bar candlesticks">
      <title>Recent closed-bar candlesticks</title>
      <desc>{chartDescription}</desc>
      {levels.map((level) => <g key={level.fraction}><line className="pa-chart-gridline" x1={plot.left} x2={width - plot.right} y1={y(level.value)} y2={y(level.value)} /><text className="pa-chart-axis" x={width - plot.right} y={y(level.value) - 3} textAnchor="end">{formatPrice(level.value)}</text></g>)}
      <text className="pa-chart-axis" x={plot.left} y={height - 5}>oldest</text><text className="pa-chart-axis" x={width - plot.right} y={height - 5} textAnchor="end">latest</text>
      {bars.map((bar, index) => {
        const x = plot.left + xStep * index + xStep / 2;
        const open = y(bar.o);
        const close = y(bar.c);
        const highY = y(bar.h);
        const lowY = y(bar.l);
        const up = bar.c >= bar.o;
        const current = index === bars.length - 1;
        return <g key={`${bar.t}-${index}`} className={up ? "pa-candle up" : "pa-candle down"}>
          {current && <rect className="pa-current-window" x={x - xStep / 2} y={plot.top} width={xStep} height={plotHeight} />}
          <line className="pa-candle-wick" x1={x} x2={x} y1={highY} y2={lowY} />
          <rect className="pa-candle-body" x={x - candleWidth / 2} y={Math.min(open, close)} width={candleWidth} height={Math.max(1.5, Math.abs(close - open))} />
        </g>;
      })}
    </svg>
    <p id={chartDescriptionId} className="pa-chart-a11y-summary">{chartDescription}</p>
    <figcaption><span><i className="pa-legend-swatch up" />up close</span><span><i className="pa-legend-swatch down" />down close</span><span className="pa-chart-current">current bar highlighted</span></figcaption>
  </figure>;
}

/** A compact, jumpable readout for the three timeframe cards. Keep the scan
 * row intentionally small so a researcher can compare direction, confidence,
 * and out-of-sample stability before opening the detailed evidence blocks. */
function TimeframeEvidenceMap({ atlas, source, historyCoverage, feedHealth, error }: { atlas: MultiTimeframeAtlas | null; source: Source; historyCoverage: HistoryCoverage; feedHealth: Mt5FeedHealth | null; error: string }) {
  const retrying = source === "Live" && Boolean(error);
  return <nav className="pa-timeframe-scan" aria-label={`Timeframe evidence map${retrying ? "; live feed retrying, showing last verified snapshot" : ""}`}>
    <div className="pa-timeframe-scan-title"><span>Evidence map</span><small className={retrying ? "is-error" : ""}>{retrying ? "Last verified snapshot · retrying MT5 feed" : "Jump to M5, M15 or M30"}</small></div>
    <div className="pa-timeframe-scan-items">
      {TFS.map((tf) => {
        const analysis = atlas?.timeframes[tf];
        const evidence = evidenceStatus(tf, source, analysis, historyCoverage[tf], feedHealth);
        const prediction = analysis?.predictions[0];
        const direction = analysis?.ok ? analysis.consensus.direction : "WAIT";
        const confidence = prediction?.confidence || "—";
        const stability = analysis?.walkForward.stability?.label || "INSUFFICIENT";
        const qualityFlags = analysis
          ? analysis.dataQuality.gaps + analysis.dataQuality.duplicateTimestamps + analysis.dataQuality.outOfOrderBars + analysis.dataQuality.formingBars + analysis.dataQuality.invalidBars + analysis.dataQuality.invalidTimestamps
          : 0;
        const sample = prediction?.sampleN;
        const probabilityLabel = prediction
          ? `UP ${percent(prediction.up)} · FLAT ${percent(prediction.flat)} · DOWN ${percent(prediction.down)}`
          : "No H+1 distribution";
        const coverage = source === "Live"
          ? historyCoverage[tf]
            ? `${historyCoverage[tf]!.years.toFixed(1)}y${historyCoverage[tf]!.complete ? " complete" : " partial"}${historyCoverage[tf]!.cachedChunks != null && historyCoverage[tf]!.chunks ? ` · cache ${historyCoverage[tf]!.cachedChunks}/${historyCoverage[tf]!.chunks}` : ""}${historyCoverage[tf]!.failedChunks ? ` · failed ${historyCoverage[tf]!.failedChunks}` : ""}`
            : "pending"
          : source === "Replay" ? "local replay" : "local CSV";
        const coverageAria = source === "Live" ? `MT5 coverage ${coverage}` : `Tape ${coverage}`;
        const closedBarAge = analysis?.asOf ? `${asOfAge(analysis.asOf)} old` : "age unavailable";
        return <a key={tf} href={`#pa-card-${tf}`} className={`pa-timeframe-scan-item pa-scan-${direction.toLowerCase()} pa-evidence-${evidence.state.toLowerCase().replace("_", "-")}`} aria-label={`${tf}: ${evidenceStateLabel(evidence.state)}; ${direction}; ${probabilityLabel}; ${confidence} confidence; OOS ${stability}; ${coverageAria}; latest closed bar ${closedBarAge}`}>
          <span className="pa-timeframe-scan-tf">{tf}</span>
          <b className="pa-timeframe-scan-direction">{direction}</b>
          <span className={`pa-timeframe-scan-confidence pa-confidence-${confidence.toLowerCase()}`}>{confidence === "—" ? "No forecast" : `${confidence} confidence`}</span>
          <span className={`pa-timeframe-scan-stability pa-stability-${stability.toLowerCase()}`}>OOS {stability}</span>
          <span className={`pa-timeframe-scan-probability ${prediction ? "" : "empty"}`} role="img" aria-label={`H+1 distribution: ${probabilityLabel}`}>
            {prediction ? <><i style={{ width: `${prediction.up * 100}%`, background: "var(--pa-positive)" }} /><i style={{ width: `${prediction.flat * 100}%`, background: "var(--pa-muted)" }} /><i style={{ width: `${prediction.down * 100}%`, background: "var(--pa-negative)" }} /></> : <i />}
          </span>
          <span className="pa-timeframe-scan-probability-text" aria-hidden="true">{prediction ? `U ${percent(prediction.up)} · F ${percent(prediction.flat)} · D ${percent(prediction.down)}` : "H+1 unavailable"}</span>
          <span className={`pa-timeframe-scan-coverage ${source === "Live" && coverage === "pending" ? "pending" : source === "Live" && coverage.includes("partial") ? "partial" : ""}`}>{source === "Live" ? `MT5 ${coverage}` : coverage}</span>
          <span className="pa-timeframe-scan-age">Closed {closedBarAge}</span>
          <small className={`pa-timeframe-scan-state pa-evidence-state-${evidence.state.toLowerCase().replace("_", "-")}`}><b>{evidenceStateLabel(evidence.state)}</b>{evidence.reason ? ` · ${evidence.reason}` : ""}</small>
          <small>{sample != null ? `n=${sample.toLocaleString()} · ` : ""}{qualityFlags ? `${qualityFlags} quality flags` : analysis ? "quality clean" : "waiting for closed bars"}</small>
        </a>;
      })}
    </div>
  </nav>;
}

function TimeframeCard({ tf, analysis, feed, bars, evidence }: { tf: PatternTimeframe; analysis: PatternAnalysis; feed?: TimeframeFeedMeta; bars?: OhlcBar[]; evidence: EvidenceStatus }) {
  const current = analysis.current;
  const sourceLabel = feed?.source === "Live" ? "MT5 closed bars (read-only)" : feed?.source === "Replay" ? "local replay" : feed?.source === "CSV" ? `local CSV${feed.filename ? ` · ${feed.filename}` : ""}` : "awaiting tape";
  const loadedBars = feed?.loadedBars ?? 0;
  return <section id={`pa-card-${tf}`} className="pa-card" tabIndex={-1} aria-labelledby={`pa-card-${tf}-tf pa-card-${tf}-title`}>
    <div className="pa-card-head"><div><span id={`pa-card-${tf}-tf`} className="pa-tf">{tf}</span><h2 id={`pa-card-${tf}-title`}>{current?.label || "Pattern unavailable"}</h2></div><div className="pa-card-asof">{analysis.asOf ? analysis.asOf.replace("T", " ").slice(0, 16) : "—"}<small>UTC · closed bar</small></div></div>
    <CandleMiniChart bars={bars} />
    <div className="pa-provenance" aria-label={`${tf} data provenance`}><span className={`pa-evidence-state pa-evidence-state-${evidence.state.toLowerCase().replace("_", "-")}`}><b>Evidence state</b>{evidenceStateLabel(evidence.state)}{evidence.reason && <small>{evidence.reason}</small>}</span><span><b>Source</b>{sourceLabel}</span><span><b>Usable bars</b>{analysis.bars.toLocaleString()} / {loadedBars.toLocaleString()} loaded</span><span><b>Closed-bar age</b>{asOfAge(analysis.asOf)}</span><span><b>Fetched</b>{feed?.fetchedAt ? feed.fetchedAt.replace("T", " ").slice(0, 19) : "-"} UTC</span></div>
    {!analysis.ok ? <div className="pa-empty"><span className="pa-empty-authority">SHADOW ONLY · NO DECISION</span><strong>Insufficient evidence</strong><span>{analysis.reason?.replace(/_/g, " ") || "No valid tape"}</span><small>Pattern Atlas does not invent data or use a forming candle.</small><div className="pa-quality">Feed checks · {analysis.dataQuality.gaps} gaps · {analysis.dataQuality.duplicateTimestamps} duplicates · {analysis.dataQuality.outOfOrderBars} out-of-order · {analysis.dataQuality.formingBars} forming excluded · {analysis.dataQuality.invalidBars} invalid OHLC · {analysis.dataQuality.invalidTimestamps} invalid timestamps</div></div> : <>
      <div className="pa-metrics"><div><small>Pattern signature</small><b>{current?.signature}</b></div><div><small>Range / ATR</small><b>{current?.rangeAtr.toFixed(2)}</b></div><div><small>Body / ATR</small><b>{current?.bodyAtr.toFixed(2)}</b></div><div><small>Matches</small><b>{analysis.matches.length}</b></div></div>
      <div className="pa-regime"><span>Regime <b>{analysis.regime.label}</b> · trend {analysis.regime.trendAtr >= 0 ? "+" : ""}{analysis.regime.trendAtr.toFixed(2)} ATR · volatility {analysis.regime.volatilityRatio.toFixed(2)}x</span><span>Novelty <b className={analysis.novelty.label === "UNSEEN" ? "is-new" : ""}>{analysis.novelty.label}</b> · {analysis.regime.matchingSamples} same-regime analogues</span></div>
      <RegimePulse analysis={analysis} />
      <EvidencePulse analysis={analysis} />
      <PatternFamilies analysis={analysis} />
      <PatternEvidence analysis={analysis} />
      {analysis.drift && <div className="pa-drift"><span>Historical support drift</span><b style={{ color: driftColor(analysis.drift.label) }}>{analysis.drift.label}</b><small>score {analysis.drift.score.toFixed(2)} · {analysis.drift.supportSamples} family samples</small><em>{analysis.drift.note}</em></div>}
      <div className={`pa-recurrence ${analysis.recurrence.appeared ? "seen" : "new"}`}><b>{analysis.recurrence.appeared ? "Exact sequence seen" : "Exact sequence not seen"}</b><span>{analysis.recurrence.exactMatches} exact matches · {percent(analysis.recurrence.rate)} of historical windows</span><span>{analysis.recurrence.lastSeen ? `last ${analysis.recurrence.lastSeen.replace("T", " ").slice(0, 16)} UTC` : "No exact historical occurrence"}{analysis.recurrence.medianGapBars ? ` · median gap ${analysis.recurrence.medianGapBars} bars` : ""}</span></div>
      <AdaptiveCandidates analysis={analysis} />
      <div className="pa-forecast"><div className="pa-forecast-title"><span>Next closed bar distribution</span><strong style={{ color: directionColor(analysis.consensus.direction) }}>{analysis.consensus.direction} · {percent(analysis.consensus.agreement)}</strong></div><ProbabilityBar analysis={analysis} /></div>
      <div className="pa-horizon-grid">{analysis.predictions.map((p) => <div key={p.horizon} className="pa-horizon"><small>H +{p.horizon}</small><b style={{ color: directionColor(p.up >= p.down && p.up >= p.flat ? "UP" : p.down >= p.up && p.down >= p.flat ? "DOWN" : "FLAT") }}>{p.up >= p.down && p.up >= p.flat ? "UP" : p.down >= p.up && p.down >= p.flat ? "DOWN" : "FLAT"}</b><span>↑ {percent(p.up)} · FLAT {percent(p.flat)} · ↓ {percent(p.down)}</span><em>{signed(p.expectedAtr)} · {p.sampleN} samples · {p.confidence}</em></div>)}</div>
      <div className="pa-validation"><div><small>Walk-forward hit rate</small><b>{analysis.walkForward.hitRate == null ? "—" : percent(analysis.walkForward.hitRate)}</b></div><div><small>Majority baseline</small><b>{analysis.walkForward.baseline == null ? "—" : percent(analysis.walkForward.baseline)}</b></div><div><small>Lift</small><b>{analysis.walkForward.lift == null ? "—" : `${analysis.walkForward.lift >= 0 ? "+" : ""}${(analysis.walkForward.lift * 100).toFixed(1)} pp`}</b></div><div><small>Queries</small><b>{analysis.walkForward.evaluated}</b></div>{analysis.walkForward.probabilistic && <><div><small>Brier H+1</small><b>{analysis.walkForward.probabilistic.brierScore == null ? "—" : analysis.walkForward.probabilistic.brierScore.toFixed(3)}</b></div><div><small>Log loss H+1</small><b>{analysis.walkForward.probabilistic.logLoss == null ? "—" : analysis.walkForward.probabilistic.logLoss.toFixed(3)}</b></div></>}</div>
      <div className="pa-quality">Feed checks · {analysis.dataQuality.gaps} gaps · {analysis.dataQuality.duplicateTimestamps} duplicates · {analysis.dataQuality.outOfOrderBars} out-of-order · {analysis.dataQuality.formingBars} forming excluded · {analysis.dataQuality.invalidBars} invalid OHLC · {analysis.dataQuality.invalidTimestamps} invalid timestamps</div>
      <details className="pa-matches"><summary>Historical analogues · nearest {analysis.matches.length}</summary><div className="pa-table-wrap"><table><thead><tr><th>UTC</th><th>Similarity</th><th>Regime</th><th>H+1</th><th>H+2</th><th>H+3</th></tr></thead><tbody>{analysis.matches.slice(0, 12).map((m) => <tr key={`${m.endIndex}-${m.time}`}><td>{m.time.replace("T", " ").slice(0, 16)}</td><td>{percent(m.similarity)}</td><td className={m.sameRegime ? "pa-regime-same" : "pa-regime-other"}>{m.sameRegime ? "same" : "other"}</td>{m.outcome.map((o, i) => <td key={i} style={{ color: directionColor(o), fontWeight: 700 }}>{o}</td>)}</tr>)}</tbody></table></div></details>
    </>}
  </section>;
}

export function PatternAtlas() {
  const [source, setSource] = useState<Source>("Live");
  const [csvTapes, setCsvTapes] = useState<CsvTapes>({});
  const [csvTimeframes, setCsvTimeframes] = useState<Record<PatternTimeframe, "AUTO" | PatternTimeframe>>({ M5: "AUTO", M15: "AUTO", M30: "AUTO" });
  const [csvError, setCsvError] = useState("");
  const [atlas, setAtlas] = useState<MultiTimeframeAtlas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cycle, setCycle] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [feedMeta, setFeedMeta] = useState<FeedMeta>({});
  const [historyCoverage, setHistoryCoverage] = useState<HistoryCoverage>({});
  const [newBars, setNewBars] = useState(0);
  const [feedHealth, setFeedHealth] = useState<Mt5FeedHealth | null>(null);
  const [displayBars, setDisplayBars] = useState<Partial<Record<PatternTimeframe, OhlcBar[]>>>({});
  const symbol = getActiveSymbol();
  // A reconnect can point the same broker symbol at a different account or
  // terminal server. Namespace the in-memory tape by that generation so a
  // prior account's history cannot survive the handoff for the 15-minute TTL.
  const terminalGeneration = useTerminalGeneration();
  const [ledger, setLedger] = useState(() => readEvolutionLedger(symbol));
  const ledgerRef = useRef(ledger);
  const previousTail = useRef<Record<string, string>>({});

  const importCsv = async (tfSlot: PatternTimeframe, file: File | undefined) => {
    if (!file) return;
    setCsvError("");
    if (file.size > CSV_MAX_BYTES) {
      setCsvError(`${file.name}: CSV exceeds 32 MB; split the file.`);
      return;
    }
    try {
      const text = await file.text();
      const requested = csvTimeframes[tfSlot];
      // Infer from the observed interval first. Passing a declared M5 into the
      // shared parser would allow a coarser multiple (for example M15) through
      // its gap-tolerant checks and silently relabel the tape.
      const parsed = parseCsvOhlc(text);
      if ("error" in parsed) throw new Error(parsed.error);
      if (!(TFS as string[]).includes(parsed.tf)) throw new Error(`Detected unsupported timeframe ${parsed.tf}; Pattern Atlas accepts M5, M15 or M30.`);
      if (requested !== "AUTO" && parsed.tf !== requested) throw new Error(`Selected ${requested}, but the file contains ${parsed.tf} intervals.`);
      const resolved = parsed.tf as PatternTimeframe;
      setCsvTapes((current) => ({ ...current, [resolved]: { bars: parsed.bars, filename: file.name, tf: resolved, quality: parsed.quality, warnings: parsed.warnings } }));
      setSource("CSV");
    } catch (reason) {
      setCsvError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  // Source and symbol changes start a new research session. Clear the previous
  // snapshot so the cards cannot briefly show Live results under a Replay
  // label (or carry the previous symbol's evolution ledger into this one).
  useEffect(() => {
    const nextLedger = readEvolutionLedger(symbol);
    ledgerRef.current = nextLedger;
    setLedger(nextLedger);
    setLoading(true);
    setAtlas(null);
    setLastUpdate(null);
    setNewBars(0);
    setCycle(0);
    setError("");
    setFeedMeta({});
    setHistoryCoverage({});
    setFeedHealth(null);
    setDisplayBars({});
    previousTail.current = {};
  }, [source, symbol, terminalGeneration]);

  useEffect(() => {
    let alive = true;
    let pullSequence = 0;
    const pull = async () => {
      const sequence = ++pullSequence;
      setLoading(true);
      try {
        const healthPromise = source === "Live"
          ? mt5FeedHealth(liveSymbol(symbol), "M15", 2).catch(() => null)
          : Promise.resolve(null);
        // H1 is fetched as a closed-bar context tape. It is passed to the
        // causal Atlas engine but intentionally has no card or vote of its own.
        const tapes: Partial<Record<PatternTimeframe | "H1", PatternBar[]>> = {};
        const nextFeedMeta: FeedMeta = {};
        const nextDisplayBars: Partial<Record<PatternTimeframe, OhlcBar[]>> = {};
        const nextTails: Record<string, string> = {};
        let nextBars = 0;
        const nextCoverage: HistoryCoverage = {};
        const fetchTfs = source === "Live" ? BROKER_TFS : TFS;
        for (const tf of fetchTfs) {
          const patternTf = tf as PatternTimeframe;
          let bars: OhlcBar[] = [];
          if (source === "Live") {
            const cacheKey = `${terminalGeneration}:${liveSymbol(symbol)}:${tf}`;
            const cached = liveHistoryCache.get(cacheKey);
            if (cached && Date.now() - cached.at < LIVE_HISTORY_CACHE_TTL) {
              const tail = await mt5Bars(liveSymbol(symbol), tf, 10);
              const closedTail = !mtOffline(tail) && Array.isArray(tail.bars)
                && tail.source === "MT5_CLOSED_BARS"
                && tail.closed_bar_provenance === "MT5_CLOSED_BARS"
                && tail.forming_bar_included !== true;
              const verifiedTailBars = closedTail && !mtOffline(tail) && Array.isArray(tail.bars) ? tail.bars : null;
              // A TTL cache refresh must not promote a forming/legacy tail into
              // the closed-bar research tape. Keep the verified cached tape
              // until a versioned closed response arrives.
              bars = verifiedTailBars ? mergeLiveBars(cached.bars, verifiedTailBars) : cached.bars;
              if (cached.coverageYears != null) nextCoverage[tf] = {
                years: cached.coverageYears,
                complete: cached.complete !== false,
                cachedChunks: cached.cachedChunks,
                chunks: cached.chunks,
                failedChunks: cached.failedChunks,
                requestedBars: cached.requestedBars,
                returnedBars: cached.returnedBars,
                reason: cached.reason,
                retentionSource: cached.retentionSource,
                terminalMaxBars: cached.terminalMaxBars,
              };
            } else {
              const result = await mt5ThreeYearHistory(liveSymbol(symbol), tf);
              if (!mtOffline(result) && Array.isArray(result.bars)) {
                bars = result.bars;
                nextCoverage[tf] = { years: result.coverageYears || 0, complete: result.complete, cachedChunks: result.cachedChunks, chunks: result.chunks, failedChunks: result.failedChunks?.length, requestedBars: result.requestedBarsTotal, returnedBars: result.returnedBarsTotal, reason: result.reason, retentionSource: result.retentionSource, terminalMaxBars: result.terminalMaxBars };
                liveHistoryCache.set(cacheKey, {
                  at: Date.now(),
                  bars,
                  coverageYears: result.coverageYears,
                  complete: result.complete,
                  cachedChunks: result.cachedChunks,
                  chunks: result.chunks,
                  failedChunks: result.failedChunks?.length,
                  requestedBars: result.requestedBarsTotal,
                  returnedBars: result.returnedBarsTotal,
                  reason: result.reason,
                  retentionSource: result.retentionSource,
                  terminalMaxBars: result.terminalMaxBars,
                });
              } else if (mtOffline(result)) {
                // Preserve an explicit partial state when the bridge is down;
                // dropping the timeframe hides the failed recovery opportunity.
                nextCoverage[tf] = { years: 0, complete: false, reason: result.error || "BRIDGE_OFFLINE" };
              }
            }
            if (bars.length) {
              const metadata = nextCoverage[tf] || (cached ? {
                years: cached.coverageYears || 0,
                complete: cached.complete !== false,
                cachedChunks: cached.cachedChunks,
                chunks: cached.chunks,
                failedChunks: cached.failedChunks,
                reason: cached.reason,
                retentionSource: cached.retentionSource,
                terminalMaxBars: cached.terminalMaxBars,
              } : undefined);
              liveHistoryCache.set(cacheKey, {
                at: Date.now(),
                bars,
                coverageYears: metadata?.years,
                complete: metadata?.complete,
                cachedChunks: metadata?.cachedChunks,
                chunks: metadata?.chunks,
                failedChunks: metadata?.failedChunks,
                requestedBars: metadata?.requestedBars,
                returnedBars: metadata?.returnedBars,
                reason: metadata?.reason,
                retentionSource: metadata?.retentionSource,
                terminalMaxBars: metadata?.terminalMaxBars,
              });
            }
          } else if (source === "Replay") {
            const result = await loadSimOhlc(patternTf, false, symbol);
            // Keep the analogue scan responsive while retaining several thousand closed bars.
            bars = result?.bars.slice(-6000) || [];
          } else {
            // CSV is a browser-local, read-only tape. Each timeframe is independently
            // selected so a single file cannot silently be reused at another cadence.
            bars = csvTapes[patternTf]?.bars || [];
          }
          if (tf === "H1") {
            if (bars.length) tapes.H1 = toPatternBars(bars);
            continue;
          }
          if (bars.length) tapes[patternTf] = toPatternBars(bars);
          if (bars.length) nextDisplayBars[patternTf] = bars.slice(-60);
          const tail = bars.length ? bars[bars.length - 1].t : "";
          if (tail && previousTail.current[patternTf] && previousTail.current[patternTf] !== tail) nextBars += 1;
          if (tail) nextTails[patternTf] = tail;
          const csv = source === "CSV" ? csvTapes[patternTf] : undefined;
          nextFeedMeta[patternTf] = { source, fetchedAt: new Date().toISOString(), loadedBars: bars.length, ...(csv ? { filename: csv.filename, declaredTf: csv.tf, warnings: csv.warnings } : {}) };
        }
        const health = await healthPromise;
        if (!alive || sequence !== pullSequence) return;
        if (source === "Live") setFeedHealth(health);
        if (source === "Live") setHistoryCoverage(nextCoverage);
        // A broker response can be valid OHLC while covering only part of the
        // requested three-year interval. Keep that tape visible for research,
        // but prevent it from voting as if its coverage were complete. This
        // gate is passed only for MT5 history; replay/CSV retain their existing
        // evidence semantics.
        const blockedTimeframes = source === "Live"
          ? TFS.filter((tf) => nextCoverage[tf] && !nextCoverage[tf]!.complete)
          : [];
        const result = analyzeMultiTimeframe(tapes, symbol, {
          now: source === "Live" ? new Date().toISOString() : undefined,
          blockedTimeframes,
        });
        const now = new Date().toISOString();
        const signatures = TFS.map((tf) => result.timeframes[tf].current?.signature || "").filter(Boolean).join("|");
        const liftValues = TFS.map((tf) => result.timeframes[tf].walkForward.lift).filter((value): value is number => value != null);
        const previousLedger = ledgerRef.current;
        const loopNovelty = TFS.length ? Math.max(...TFS.map((tf) => result.timeframes[tf].novelty.score)) : previousLedger.lastNovelty;
        const loopLift = liftValues.length ? liftValues.reduce((sum, value) => sum + value, 0) / liftValues.length : null;
        const nextLedger: EvolutionLedger = { loops: previousLedger.loops + 1, firstLoopAt: previousLedger.firstLoopAt || now, bestLift: liftValues.length ? Math.max(previousLedger.bestLift ?? -1, ...liftValues) : previousLedger.bestLift, lastNovelty: loopNovelty, lastSignature: signatures, history: [...(previousLedger.history || []), { at: now, novelty: loopNovelty, lift: loopLift }].slice(-24) };
        if (!alive || sequence !== pullSequence) return;
        try { localStorage.setItem(`mfe_pattern_atlas_evolution_${symbol}`, JSON.stringify(nextLedger)); } catch { /* local persistence is optional */ }
        ledgerRef.current = nextLedger;
        if (!alive || sequence !== pullSequence) return;
        previousTail.current = { ...previousTail.current, ...nextTails };
        setNewBars((value) => value + nextBars);
        setFeedMeta(nextFeedMeta);
        setDisplayBars(nextDisplayBars);
        setLedger(nextLedger);
        setAtlas(result); setCycle((value) => value + 1); setLastUpdate(now); setError("");
      } catch (reason) {
        if (alive && sequence === pullSequence) setError(reason instanceof Error ? reason.message : "PATTERN_ATLAS_UNAVAILABLE");
      } finally { if (alive && sequence === pullSequence) setLoading(false); }
    };
    pull();
    const timer = source === "CSV" ? undefined : window.setInterval(pull, source === "Live" ? 30_000 : 120_000);
    return () => { alive = false; if (timer) window.clearInterval(timer); };
  }, [source, symbol, csvTapes, terminalGeneration]);

  const available = useMemo(() => TFS.filter((tf) => atlas?.timeframes[tf]?.ok).length, [atlas]);
  const historyLabel = source === "Live" && Object.keys(historyCoverage).length
    ? BROKER_TFS.map((tf) => { const item = historyCoverage[tf]; if (!item) return `${tf} —`; const cache = item.cachedChunks != null && item.chunks ? ` · cache ${item.cachedChunks}/${item.chunks}` : ""; const rows = item.requestedBars ? ` · rows ${(item.returnedBars || 0).toLocaleString()}/${item.requestedBars.toLocaleString()}` : ""; const failed = item.failedChunks ? ` · failed ${item.failedChunks}` : ""; const limit = item.retentionSource ? ` · ${item.retentionSource === "TERMINAL_MAX_BARS" ? `terminal cap${item.terminalMaxBars ? ` ${item.terminalMaxBars.toLocaleString()}` : ""}` : item.retentionSource === "BROKER_RETENTION" ? "broker retention" : "limit unknown"}` : ""; return `${tf} ${item.years.toFixed(1)}y${rows}${cache}${failed}${limit}`; }).join(" · ")
    : "";
  const partialHistory = source === "Live" && BROKER_TFS.some((tf) => historyCoverage[tf] && !historyCoverage[tf]!.complete);
  const coverageSuffix = partialHistory ? " (* partial)" : "";
  const partialHistoryDetails = source === "Live"
    ? BROKER_TFS.map((tf) => {
      const item = historyCoverage[tf];
      if (!item || item.complete) return "";
      const reason = item.reason ? ` · ${historyReasonLabel(item.reason)}` : "";
       const limit = historyLimitLabel(item) ? ` · ${historyLimitLabel(item)}` : "";
       const failed = item.failedChunks ? ` · failed chunks ${item.failedChunks}` : "";
       const rows = item.requestedBars ? ` · rows ${(item.returnedBars || 0).toLocaleString()}/${item.requestedBars.toLocaleString()}` : "";
       return `${tf} ${item.years.toFixed(1)}y / 3.0y${rows}${reason}${failed}${limit}`;
    }).filter(Boolean).join(" · ")
    : "";
  const historyDiagnostics = source === "Live"
    ? BROKER_TFS.map((tf) => {
      const reason = historyCoverage[tf]?.reason;
      return reason && reason !== "HISTORY_PARTIAL_CHUNKS" ? `${tf}: ${historyReasonLabel(reason)}` : "";
    }).filter(Boolean).join(" · ")
    : "";
  const partialHistoryAction = Object.values(historyCoverage).some((item) => /OFFLINE|TIMEOUT|FAILED|UNAVAILABLE|NOT_CONNECTED|HISTORY_ACCOUNT_CHANGED/i.test(item?.reason || ""))
    ? "Reconnect MT5 and retry the live history pull."
    : Object.values(historyCoverage).some((item) => item?.retentionSource === "TERMINAL_MAX_BARS")
    ? "Increase MT5 Max bars in chart, then reconnect."
    : Object.values(historyCoverage).some((item) => item?.retentionSource === "BROKER_RETENTION")
      ? "The broker does not expose the full requested interval; keep this timeframe exploratory or provide a local CSV archive."
      : "Keep the timeframe out of consensus until its requested interval is verified.";
  const feedWarning = source === "Live" && feedHealth && feedHealth.state !== "CONNECTED_CLOSED_BARS"
    ? `MT5 ${feedHealth.state.replace(/_/g, " ").toLowerCase()} · ${feedHealth.reason || "no verified closed-bar response"}${feedHealth.latestClosedBar ? ` · latest ${feedHealth.latestClosedBar.replace("T", " ").slice(0, 19)}Z (${asOfAge(feedHealth.latestClosedBar)})` : ""}. Atlas blocks consensus until a fresh, versioned closed-bar response arrives.`
    : "";
  // The analysis engine uses FLAT as its neutral aggregate when no tape passes
  // the freshness / quality gates. Keep that internal sentinel out of the
  // headline: a researcher should see WAIT until at least one timeframe has
  // contributed verified evidence, rather than mistaking missing data for a
  // measured flat outcome.
  const consensusReady = Boolean(atlas?.consensus.contributing.length);
  const consensusDirection = consensusReady ? atlas!.consensus.direction : "WAIT";
  const consensusColor = consensusReady ? directionColor(atlas!.consensus.direction) : "var(--pa-muted)";
  const partialConsensusFrames = consensusReady && atlas
    ? atlas.consensus.contributing.filter((tf) => evidenceStatus(tf, source, atlas.timeframes[tf], historyCoverage[tf], feedHealth).state !== "VERIFIED")
    : [];
  const consensusScope = partialConsensusFrames.length
    ? `Partial history in ${partialConsensusFrames.join(" + ")}; treat this vote as provisional.`
    : "All contributing timeframes passed the evidence state gate.";
  return <div className="product-workspace pattern-atlas" data-cycle={cycle}>
    <header className="product-page-header"><div className="pa-page-heading"><div className="pa-market-context" aria-label="Research instrument context"><span className="pa-market-symbol">{symbol}</span><span className="pa-market-name">Pattern Atlas</span><span className="pa-market-mode">{source === "Live" ? "MT5 · read-only" : source === "Replay" ? "Historical replay" : "Local CSV"}</span></div><h1>Pattern Atlas</h1><p>Compare candle geometry with similar historical windows, then measure the distribution of the next candles on M5 · M15 · M30.</p></div><div className="pa-page-readout" aria-label="Current evidence readout"><span>H1 context</span><b>{atlas?.h1Context.trend || "WAIT"}</b><small>{atlas?.h1Context.bars?.toLocaleString() || 0} closed bars</small></div></header>
    <div className="pa-pillbar"><span className="auth lock">SHADOW / NO DECISION</span><span className="auth">CAUSAL + REGIME MATCHING</span><span className="auth">{source === "Live" ? `MT5 CLOSED BARS · ${liveSymbol(symbol)} · READ-ONLY` : source === "Replay" ? "REPLAY · LOCAL HISTORY" : "CSV · LOCAL FILE · READ-ONLY"}</span>{source === "Live" && <span className={`auth pa-feed-state ${feedHealth?.state || "checking"}`} aria-label="MT5 feed health">{feedHealthLabel(feedHealth)}</span>}</div>
    <section className="pa-controls" aria-label="Pattern Atlas controls"><div className="pa-source" role="group" aria-label="Input tape source"><span>Input tape</span>{(["Live", "Replay", "CSV"] as Source[]).map((item) => <button key={item} type="button" className={source === item ? "active" : ""} aria-pressed={source === item} onClick={() => setSource(item)}>{item === "Live" ? "MT5 closed bars" : item === "Replay" ? "Historical replay" : "Local CSV"}</button>)}</div><div className="pa-loop"><span>{loading ? "Updating…" : `${available}/3 timeframes measured`}</span><small>{historyLabel ? `3Y broker coverage · ${historyLabel}${coverageSuffix}` : ""}{lastUpdate ? ` · last loop ${lastUpdate.replace("T", " ").slice(0, 19)}Z` : "waiting for first loop"}{newBars ? ` · ${newBars} new closed-bar updates` : ""}</small></div></section>
    {feedWarning && <div className="pa-history-warning pa-feed-warning" role="status" aria-live="polite">{feedWarning}</div>}
    {partialHistory && <div className="pa-history-warning" role="status" aria-live="polite">Broker coverage is partial: <b>{partialHistoryDetails}</b>.<span className="pa-history-next-step"><b>Next step:</b> {partialHistoryAction}</span> The Atlas keeps measured coverage visible and does not fill the gap. <button className="pa-history-csv-action" type="button" aria-controls="pa-csv-import" onClick={() => setSource("CSV")}>Restore via local CSV</button>{historyDiagnostics && <small>Bridge diagnostics: {historyDiagnostics}</small>}</div>}
    {source === "CSV" && <section id="pa-csv-import" className="pa-csv-import" aria-label="Local CSV OHLC import"><div><b>Local XAUUSD OHLC files</b><small>Files stay in this browser. No upload, broker credential, or order path is used. Choose one file per timeframe; Auto detects M5/M15/M30.</small></div><div className="pa-csv-grid">{TFS.map((tf) => <label key={tf}><span>{tf}</span><select value={csvTimeframes[tf]} onChange={(event) => setCsvTimeframes((current) => ({ ...current, [tf]: event.target.value as "AUTO" | PatternTimeframe }))}><option value="AUTO">Auto detect</option>{TFS.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}</select><input type="file" accept=".csv,text/csv" onChange={(event) => { void importCsv(tf, event.target.files?.[0]); event.currentTarget.value = ""; }} /><small>{csvTapes[tf] ? `${csvTapes[tf]!.filename} · ${csvTapes[tf]!.bars.length.toLocaleString()} bars · ${csvTapes[tf]!.quality.priceBasis}` : "No file selected"}</small></label>)}</div>{csvError && <div className="product-message error">{csvError}</div>}{Object.values(csvTapes).some(Boolean) && <small className="pa-csv-provenance">Provenance: local CSV parsed by strict OHLC validator; timestamps normalized to UTC, gaps are reported and never filled. Evidence remains shadow-only.</small>}</section>}
    {error && <div className="product-message error">{error}. Check the read-only MT5 bars connection or load the XAUUSD historical dataset.</div>}
    <section className={`pa-consensus ${partialConsensusFrames.length ? "pa-consensus-partial" : ""}`} aria-live="polite"><div className="pa-consensus-summary"><small>Multi-timeframe research consensus</small><strong className={`pa-consensus-direction pa-consensus-${consensusDirection.toLowerCase()}`} style={{ color: consensusColor }}>{consensusDirection}</strong><span>{consensusReady ? `${atlas!.consensus.contributing.join(" + ")} · strength ${percent(atlas!.consensus.strength)}` : "No verified timeframe contribution yet"}</span></div><p>{atlas?.consensus.note || "Waiting for verified timeframe evidence."}{consensusReady && <><br /><span className="pa-consensus-scope">{consensusScope}</span></>}</p>{atlas?.consensus.contributions?.length ? <div className="pa-consensus-reasons" aria-label="Consensus evidence gates">{atlas.consensus.contributions.map((item) => <span key={item.timeframe} className={item.gate === "PASS" ? "pass" : "blocked"}><b>{item.timeframe}</b> {item.gate === "PASS" ? `contributed · weight ${item.weight.toFixed(2)}` : "blocked"} · {item.reason}</span>)}</div> : null}</section>
    <div className="pa-evolution"><b>Evolution loop {ledger.loops || 0}</b><span>{ledger.lastSignature ? "Signature tracked" : "Waiting for first signature"}</span><span>Best walk-forward lift: {ledger.bestLift == null ? "—" : `${ledger.bestLift >= 0 ? "+" : ""}${(ledger.bestLift * 100).toFixed(1)} pp`}</span><span>Novelty: {ledger.lastNovelty >= 0.7 ? "new territory" : ledger.lastNovelty >= 0.35 ? "emerging" : "known"}</span><div className="pa-evolution-history" aria-label="Recent evolution loops">{ledger.history.map((point, index) => <i key={`${point.at}-${index}`} title={`${point.at.replace("T", " ").slice(0, 19)} · novelty ${(point.novelty * 100).toFixed(0)}%`} style={{ height: `${Math.max(4, Math.round(point.novelty * 22))}px`, opacity: 0.45 + index / Math.max(1, ledger.history.length) / 2 }} />)}</div></div>
    <TimeframeEvidenceMap atlas={atlas} source={source} historyCoverage={historyCoverage} feedHealth={feedHealth} error={error} />
    <div className="pa-grid">{TFS.map((tf) => { const analysis = atlas?.timeframes[tf] || { ok: false, reason: "WAITING_FOR_TAPE", symbol, timeframe: tf, asOf: null, bars: 0, lookback: 5, current: null, matches: [], predictions: [], consensus: { direction: "FLAT", strength: 0, agreement: 0 }, walkForward: { evaluated: 0, sampleN: 0, hitRate: null, baseline: null, lift: null, note: "" }, dataQuality: { gaps: 0, duplicateTimestamps: 0, outOfOrderBars: 0, invalidTimestamps: 0, formingBars: 0, invalidBars: 0 }, regime: { label: "TRANSITION", trendAtr: 0, volatilityRatio: 1, matchingSamples: 0 }, novelty: { score: 1, label: "UNSEEN", nearestDistance: null }, recurrence: { signature: "", appeared: false, exactMatches: 0, rate: 0, independentMatches: 0, independentRate: 0, lastSeen: null, medianGapBars: null, nearMatches: 0 }, adaptive: undefined, cluster: undefined, drift: undefined, currentPatterns: [], patternCounts: [], engine: { id: "candle-analogue-atlas", version: "1.10.0", causal: true, thresholdAtr: 0.12 } }; return <TimeframeCard key={tf} tf={tf} bars={displayBars[tf]} feed={feedMeta[tf]} evidence={evidenceStatus(tf, source, analysis, historyCoverage[tf], feedHealth)} analysis={analysis} />; })}</div>
    <details className="pa-method"><summary>Method &amp; validation <small>How each loop develops</small></summary><div className="pa-method-grid"><div><b>01 · Normalize</b><span>Body, range, wick, close-location and return are normalized by ATR without absolute prices.</span></div><div><b>02 · Search past</b><span>Only windows closed before the current window are searched; overlapping windows are excluded.</span></div><div><b>03 · Measure next</b><span>Each analogue contributes H+1/H+2/H+3 outcomes with Laplace smoothing and similarity weighting.</span></div><div><b>04 · Challenge</b><span>Walk-forward validation runs through time against a majority baseline; the next loop updates when a new candle closes.</span></div><div><b>05 · Evolve</b><span>Regime and novelty are recorded in a local ledger so familiar, transitional and entirely new shapes remain visible.</span></div></div></details>
  </div>;
}

