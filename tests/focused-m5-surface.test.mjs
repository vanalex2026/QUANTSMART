import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../mfe_ux_lab/cockpit/src/App.tsx", import.meta.url), "utf8");
const nav = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/navigation.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/Layout.tsx", import.meta.url), "utf8");
const shellCss = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/workspace.css", import.meta.url), "utf8");
const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const microchart = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const snapshotContract = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/focusedSnapshot.ts", import.meta.url), "utf8");
const historyFailure = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/focusedHistoryFailure.ts", import.meta.url), "utf8");
const namedCandleKnowledge = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/namedCandleKnowledge.ts", import.meta.url), "utf8");
const focusedGeometry = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/focusedPriceActionGeometry.ts", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../bridge/mt5_bridge.py", import.meta.url), "utf8");
const errorBoundary = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/WorkspaceErrorBoundary.tsx", import.meta.url), "utf8");
const brokerEvidence = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/LegacyBrokerEvidence.tsx", import.meta.url), "utf8");

assert.match(app, /page === "home" && <Microscope focused \/>/);
assert.match(errorBoundary, /MFE_WORKSPACE_RENDER_FAILED/,
  "workspace render failures must retain a local diagnostic for chunk/import debugging");
assert.match(errorBoundary, /Technical details/,
  "workspace error fallback must expose bounded technical details instead of a context-free screenshot");
assert.match(layout, /data-focus-surface=\{current === "home" \? "m5-chart" : undefined\}/);
assert.match(layout, /disabled=\{current === "home"\}/);
assert.match(layout, /value=\{current === "home" \? "XAUUSD" : sym\}/);
assert.match(shellCss, /data-focus-surface="m5-chart"/);
assert.match(shellCss, /\.workspace-shell\[data-focus-surface="m5-chart"\] \.workspace-navigation \{ display: none; \}/,
  "focused home must hide legacy workspace navigation so the M5 chart gets the header width");
assert.match(shellCss, /\.workspace-shell\[data-focus-surface="m5-chart"\] \.theme-toggle \{ display: none; \}/,
  "focused home must hide the unrelated theme control so the header stays chart focused");
assert.match(shellCss, /\.workspace-shell\[data-focus-surface="m5-chart"\]\s*\{[\s\S]*?--workspace-canvas:\s*#050505;[\s\S]*?--workspace-surface:\s*#0b0b0b;[\s\S]*?--workspace-ink:\s*#f5f5f5;[\s\S]*?--workspace-accent:\s*#f5f5f5;/,
  "focused home shell must inherit the chart's black/white TradingView palette");
assert.match(shellCss, /\.workspace-shell\[data-focus-surface="m5-chart"\] \.workspace-header\s*\{[\s\S]*?background:\s*#0b0b0b;[\s\S]*?border-bottom-color:\s*rgba\(255, 255, 255, \.14\);/,
  "focused home header must remain continuous with the monochrome chart surface");
const responsive = readFileSync(new URL("../mfe_ux_lab/cockpit/src/responsive.css", import.meta.url), "utf8");
assert.match(responsive, /\.workspace-shell \.ms-focused \.ms-grid \{ display:block; width:100%; \}/,
  "focused home must collapse the shared three-column grid so the chart spans the viewport");
assert.match(responsive, /\.workspace-shell \.ms-focused \.ms-chart \{ width:100%; \}/,
  "focused chart must occupy the full available content width");
assert.match(responsive, /@media\s*\(max-width:640px\)[\s\S]*data-focus-surface="m5-chart"\] \.ms-focused \.ms-chart \{[\s\S]*height:calc\(100dvh - 94px\)/,
  "focused phone layout must reclaim the desktop gutter so the M5 plot keeps its chart-first height");
assert.match(microscope, /\.ms-focused\{--mfe-bg:#050505/);
assert.doesNotMatch(microscope, /\.ms-focused\{[^}]*filter:grayscale\(1\)/,
  "focused XAUUSD M5 must preserve directional candle colors without a grayscale filter");
assert.match(nav, /id: "home", label: "XAUUSD M5 Chart"/);
assert.match(microscope, /focused \? <span className="pflag"[^>]*>M5 · FOCUSED<\/span> : <><span className="pmut psm"[^>]*>Chart TF:/,
  "focused home must replace the one-option timeframe control with a fixed M5 badge while legacy routes retain timeframe selection");
assert.match(microscope, /focused \? <span className="pflag" data-focused-timeframe="true"[^>]*>M5 · FOCUSED<\/span>/,
  "focused timeframe identity must remain explicit in the source contract even when visually collapsed");
assert.match(shellCss, /data-focus-surface="m5-chart"\][\s\S]*?\.ms-focused \[data-focused-timeframe="true"\] \{ display: none; \}/,
  "focused home must hide the redundant fixed timeframe badge while retaining chart and feed controls");
assert.match(microscope, /capM5DisplayWindow as capCalendarM5DisplayWindow/,
  "focused retention must use the calendar-aware two-year helper instead of a fixed millisecond constant");
assert.match(microscope, /calendarTwoYearsBefore as calendarTwoYearsBeforeUtc/);
assert.match(microscope, /new Date\(calendarTwoYearsBeforeUtc\(chartLatestValidMs\)\)/,
  "focused cutoff must call the shared calendar retention helper");
assert.match(microscope, /const chartTfs = focused \? \(\["M5"\] as const\) : TFS/);
assert.match(microscope, /isVerifiedClosedBarHistory\(result, requestedSymbol, "M5"\)/);
assert.match(microscope, /mt5ThreeYearHistory\(requestedSymbol, "M5"\)/);
assert.match(microscope, /verifiedM5HistoryState === "ready"/);
assert.match(microscope, /focusedHistoryVerifying = focused && source === "Live" && tf === "M5" && verifiedM5HistoryState === "loading"/,
  "focused history promotion must expose a distinct transient verifying state");
assert.match(microscope, /const focusedLiveBadge = focused && source === "Live" && tf === "M5"/,
  "focused source badge must distinguish terminal connection from history promotion");
assert.match(microscope, /focusedConnectionBadge\(\{ historyState: verifiedM5HistoryState, historyReason: verifiedM5HistoryReason, account: liveQuery\.data\?\.account, terminalAttached: isTerminalAttached\(\)/,
  "focused fallback badge must use shared terminal attachment state when live workspace polling is disabled");
assert.match(microscope, /focusedSourceBadgePending/,
  "focused badge color must expose the pending history state");
assert.match(microscope, /verifiedM5HistoryState === "loading"[\s\S]{0,80}HISTORY/,
  "focused source badge must explicitly announce history verification");
assert.match(microscope, /verifiedM5HistoryState === "ready"[\s\S]{0,80}2Y/,
  "focused source badge must announce promoted two-year MT5 closed history");
assert.match(microscope, /Loading chart data/,
  "focused chart must explain the local snapshot while MT5 history syncs in the background");
assert.match(microscope, /className=\{focused \? "m5-empty-chart" : "mfe-empty"\}/,
  "focused verification must use a framed chart state instead of a blank generic empty panel");
assert.match(microscope, /m5-empty-content/);
assert.match(microscope, /No research candles are displayed until the read-only closed-bar contract is satisfied/,
  "focused empty state must explain the closed-bar contract without blocking the local chart snapshot");
assert.doesNotMatch(microscope, /m5-empty-meta">\{requestedSymbol\} \| M5 \| SHADOW_ONLY \| NO_DECISION/);
assert.match(microscope, /verifiedM5HistoryReason/);
assert.match(microscope, /Fallback reason/);
assert.match(microscope, /function explainFocusedHistoryFailure/,
  "focused MT5 fallback must explain raw failure codes with actionable guidance");
assert.match(historyFailure, /MT5_INITIALIZE_FAILED:.*Advanced connection/,
  "initialization failure must tell the user how to recover");
assert.match(historyFailure, /MT5_AUTHORIZATION_FAILED:.*Sign in to the broker account/,
  "authorization failure must tell the user how to recover without exposing credentials");
assert.match(historyFailure, /MT5_HISTORY_PROMOTION_REJECTED/);
assert.match(historyFailure, /MT5_HISTORY_REQUEST_FAILED/);
assert.match(microscope, /Retry MT5 history/,
  "focused fallback must expose an explicit retry so a bridge that starts later can be promoted without a page reload");
assert.match(microscope, /mfe_focused_research_bookmarks_v1/,
  "focused research context must have a durable local bookmark namespace");
assert.match(microscope, /Save current bookmark/,
  "focused surface must expose a named research bookmark action");
assert.match(microscope, /restoreResearchBookmark/,
  "focused surface must restore a bookmark through the validated snapshot path");
assert.match(microscope, /Delete bookmark \$\{record\.name\}/,
  "focused bookmarks must expose an accessible delete action");
assert.match(microscope, /const parsed = parseFocusedSnapshot\(item\.snapshot\)/,
  "bookmark hydration must validate stored snapshots before exposing them");
assert.match(microscope, /parsed\.snapshot\.symbol === requestedSymbol && parsed\.snapshot\.timeframe === tf/,
  "bookmark hydration must reject a snapshot from another focused context");
assert.match(microscope, /BOOKMARK_MAX_BYTES = 2 \* 1024 \* 1024/,
  "bookmark records must have a bounded payload size");
assert.match(microscope, /BOOKMARK_STORE_MAX_BYTES = 6 \* 1024 \* 1024/,
  "bookmark storage must have a bounded aggregate size");
assert.match(microscope, /const normalizeResearchBookmarks = \(value: unknown(?:, contextOnly = true)?\)/,
  "bookmark hydration and writes must share one fail-closed normalization path");
assert.match(microscope, /useEffect\(\(\) => \{\s*if \(!focused\) return;/,
  "legacy diagnostic routes must not rewrite the focused bookmark shelf");
assert.match(microscope, /Number\.isFinite\(Date\.parse\(item\.saved_at\)\)/,
  "bookmark records must carry a valid saved timestamp");
assert.match(microscope, /while \(bounded\.length && JSON\.stringify\(bounded\)\.length > BOOKMARK_STORE_MAX_BYTES\)/,
  "bookmark hydration must evict old records when an existing shelf exceeds aggregate storage");
assert.match(microscope, /historyRetryNonce/,
  "MT5 history retry must re-run the promotion effect rather than only changing the badge");
assert.match(microscope, /focused && source === "Live" && tf === "M5"/);
assert.match(microscope, /MT5 multi-year closed bars unavailable or unverified/);
assert.match(microscope, /rejected\.retentionSource === "BROKER_RETENTION"/,
  "focused fallback must disclose broker retention when MT5 history promotion is rejected");
assert.match(microscope, /rejected\.retentionSource === "TERMINAL_MAX_BARS"/,
  "focused fallback must disclose the terminal Max Bars cap separately from broker retention");
assert.match(microscope, /TERMINAL_MAX_BARS\$\{rejected\.terminalMaxBars/,
  "terminal retention fallback should include the reported Max Bars value when available");
assert.match(microscope, /MT5_HISTORY_3Y/);
assert.match(microscope, /SHADOW_ONLY.*NO_DECISION.*live_apply_allowed=false/);
assert.match(microscope, /M5 display window capped at two years/);
assert.match(microscope, /M5_FORECAST_TAPE_LIMIT = 6000/);
assert.match(microscope, /closedBarsForFocusedResearch.*focusedClosedBars\.ts/,
  "focused research must use a deterministic closed-bar boundary filter");
assert.match(microscope, /const detectorBars = useMemo\([\s\S]*focused \? closedBarsForFocusedResearch\(bars \?\? \[\], tf\) : replayBars[\s\S]*\[focused, bars, tf, replayBars\]/,
  "focused detector markers must consume a memoized closed-only tape");
assert.match(microscope, /const researchBars = focused && tf === "M5" \? detectorBars : \(bars \?\? \[\]\)/,
  "focused forecast price and ATR must consume the same closed-only tape");
assert.match(microscope, /Forecast evidence: latest/);
assert.match(microscope, /forecastRetainedBars/);
assert.match(microscope, /forecastOmittedBars/);
assert.match(microscope, /forecastTruncated/);
assert.match(microscope, /forecast_evidence_scope/);
assert.match(microscope, /forecast_evidence_window/);
assert.match(microscope, /forecastOmittedBars/);
assert.match(microscope, /earlier retained bars omitted/);
assert.match(microscope, /CANONICAL_UTC_TIMESTAMP/);
assert.match(microscope, /function closedBarFreshness/);
assert.match(microscope, /FOCUSED_CLOCK_REFRESH_MS = 30_000/,
  "focused closed-bar age must have an explicit bounded refresh interval");
assert.match(microscope, /setInterval\(\(\) => setFocusedClockNowMs\(Date\.now\(\)\), FOCUSED_CLOCK_REFRESH_MS\)/,
  "focused closed-bar age must refresh while the chart is idle");
assert.match(microscope, /const freshnessNowMs = focused \? focusedClockNowMs : Date\.now\(\);[\s\S]*closedBarFreshness\(replayBars, freshnessNowMs\)/,
  "closed-bar freshness must use the focused clock rather than a one-time render timestamp");
assert.match(microscope, /Latest closed bar \(UTC\)/);
assert.match(microscope, /Closed-bar age/);
assert.match(microscope, /formatClosedBarAge\(latestClosedBarAgeMs\)/);
assert.match(microscope, /verifiedHistoryDiagnostics/);
assert.match(microscope, /mt5_history_state/);
assert.match(microscope, /mt5_history_reason/);
assert.doesNotMatch(microscope, /^import\s+\{[^}]*loadBrokerCalibration/m, "broker calibration must not be a static focused-route dependency");
assert.doesNotMatch(microscope, /^import\s+\{[^}]*loadYearAllTfFromM1/m, "six-timeframe replay data must not be a static focused-route dependency");
for (const [name, path] of [["Mt5ConnectPanel", "Mt5ConnectPanel"], ["CsvImportPanel", "CsvImportPanel"], ["StrategyAttributionPanel", "StrategyAttributionPanel"], ["DecisionEvidencePanel", "DecisionEvidencePanel"], ["PreEventWarning", "PreEventWarning"], ["RealismPanel", "RealismPanel"], ["CalibrationPanel", "CalibrationPanel"], ["HonestyDashboard", "HonestyDashboard"], ["FundingPanel", "FundingPanel"], ["StageStepper", "StageStepper"]]) {
  assert.doesNotMatch(microscope, new RegExp(`^import .*${path}\\.tsx`, "m"), `${name} must not be a static focused-route dependency`);
  assert.ok(microscope.includes(`lazy(() => import("../components/${path}.tsx`), `${name} must remain available through a legacy-only lazy chunk`);
}
assert.doesNotMatch(microscope, /^import .*ResearchJobStatus\.tsx/m, "focused home must not statically load legacy research-job status UI");
assert.match(microscope, /const LegacyResearchJobStatus = lazy\(\(\) => import\("\.\.\/components\/ResearchJobStatus\.tsx"/,
  "research-job status must remain available through a legacy-only lazy chunk");
assert.match(microscope, /\{!focused && <LegacyResearchJobStatus /,
  "focused home must not render the legacy research-job status surface");
assert.match(microscope, /<Suspense fallback=\{microscopeSuspenseFallback\}>/, "legacy diagnostic widgets must render behind a visible suspense boundary");
assert.doesNotMatch(microscope, /^import .*useBrokerDeals/m, "focused home must not eagerly import broker deals polling");
assert.match(microscope, /const LegacyBrokerEvidence = lazy\(\(\) => import\("\.\.\/components\/LegacyBrokerEvidence\.tsx"\)/,
  "broker deals polling must remain behind a legacy-only lazy chunk");
assert.match(microscope, /if \(focused \|\| source !== "Live"\) return renderChart\(\{ deals: \[\], lines: \[\] \}\);[\s\S]*<LegacyBrokerEvidence symbol=\{getActiveSymbol\(\)\} enabled>/,
  "focused home must bypass broker overlays while legacy Live diagnostics retain them");
assert.match(brokerEvidence, /useBrokerDeals\(symbol, enabled\)/,
  "legacy broker wrapper must preserve the existing deals/positions hook contract");
assert.match(microscope, /Runtime attestation[\s\S]*verifiedHistoryDiagnostics\.runtime/, "focused provenance readout must expose closed-bar, timestamp-basis, server-timezone, and forming-bar attestations");
assert.match(microscope, /if \(focused\) \{ setCalib\(null\); return; \}[\s\S]*import\("\.\.\/lib\/brokerCalibration\.ts"\)/, "broker calibration must load only for the full diagnostic route");
assert.match(microscope, /if \(focused \|\| source !== "Replay" \|\| !m1Year\) return;[\s\S]*import\("\.\.\/lib\/m1MasterData\.ts"\)/, "six-timeframe replay data must load only for replay diagnostics");
assert.match(snapshotContract, /FOCUSED_SNAPSHOT_SCHEMA = "quantsmart\.focused-m5-research-snapshot\/1"/);
assert.match(microscope, /FOCUSED_SNAPSHOT_SCHEMA/);
assert.match(microscope, /Export research snapshot JSON/);
assert.match(microscope, /Copy snapshot JSON/, "focused surface must expose a shareable clipboard snapshot action");
assert.match(microscope, /writePromptText\(JSON\.stringify\(snapshot\)\)/, "clipboard handoff must use the full compact durable snapshot payload");
assert.match(microscope, /Snapshot copied/, "clipboard handoff must report successful copy through the snapshot status region");
assert.match(microscope, /Snapshot exported/);
assert.match(microscope, /Pattern census/);
assert.match(microscope, /CI95 Wilson interval/);
assert.match(microscope, /priceActionOccurrenceToSignal/);
assert.match(microscope, /HIST.*conceptId\.replace/);
assert.match(microscope, /Show on chart/);
assert.match(microscope, /researchStatus=\{focused \? forecastChartStatus : undefined\}/);
assert.match(microscope, /const forecastObservationDirection = forecastEvidenceReady \? forecastDirection : "WAIT"/, "forecast direction readout must fail closed until every gate passes");
assert.match(microscope, /forecastIndependentN >= 4[\s\S]*forecastSupportDenominators\.ok[\s\S]*forecastFreshnessReady/, "forecast landmark must fail closed when persisted support denominators are incoherent");
assert.match(microscope, /Next-bar observation[\s\S]*forecastObservationDirection/, "focused forecast UI must show WAIT when the directional landmark is withheld");
assert.match(microscope, /const forecastCalibrationReadout = forecastPrediction\?\.calibration[\s\S]*H\+1 Wilson 95% intervals/, "focused forecast UI must disclose calibrated H+1 uncertainty intervals");
assert.match(microscope, /forecastCalibrationReadout/, "focused forecast card must render the calibration interval disclosure");
assert.match(microscope, /latestPriceActionDirections = new Set/, "same-candle price-action concepts must be evaluated as one directional set");
assert.match(microscope, /latestPriceActionDirections = new Set[\s\S]*priceActionDirectionConflict/, "conflicting same-candle concepts must remain explicit for abstention copy");
assert.match(microscope, /const priceActionFreshness = focused && tf === "M5"[\s\S]*resolveFocusedPriceActionDirection\(priceAction\?\.markers \|\| \[\], \{[\s\S]*historyState: verifiedM5HistoryState[\s\S]*freshnessOk: priceActionFreshness\?\.ok === true/, "current PDF geometry must share promoted-history and freshness gates");
assert.match(microscope, /const priceActionGeometryStatus = priceActionDirection[\s\S]*Local fallback is descriptive only[\s\S]*Latest closed-bar evidence is stale or unavailable/, "current geometry withholding must explain fallback, loading, stale, conflict, and neutral states");
assert.match(microscope, /const priceActionGeometryReadout = priceActionDirection[\s\S]*entry[\s\S]*target[\s\S]*invalidation[\s\S]*descriptive only/, "research geometry must expose accessible entry, target, and invalidation references");
assert.match(microscope, /aria-label=\{priceActionGeometryReadout\}/, "research geometry summary must be available to assistive technology");
assert.match(microscope, /const currentConceptMarkers = useMemo\(\(\) =>[\s\S]*inspect PDF lens/, "current PDF concepts must have keyboard-accessible inspection controls");
assert.match(microscope, /onClick=\{\(\) => selectPriceActionSignal\(priceActionMarkerToSignal\(marker\)\)\}/, "concept inspection controls must reuse the chart marker selection path");
assert.match(focusedGeometry, /historyState !== "ready" \|\| !evidence\.freshnessOk/, "focused fallback or stale evidence must withhold current position geometry");
assert.match(bridge, /closed_bar_provenance/);
console.log("FOCUSED M5 SURFACE CONTRACT PASS: home is chart-first and M5 retention is explicit.");
assert.match(microscope, /selectedPriceActionEvidence\.history[\s\S]*historicalPreviewMarker/, "selected detector readout must derive its mini-chart from a historical occurrence tape");
assert.match(microscope, /<CandleWindow(?: locale=\{locale\})? bars=\{detectorBars\} center=\{historicalPreviewMarker\?\.i \?\? selectedPriceActionMarker\?\.i/, "pattern window must center on the selected historical occurrence before the current marker");
assert.match(microscope, /if \(!marker\) return <div className="pmut psm">No selected detector window; ABSTAIN\.<\/div>/, "ABSTAIN must be explicit when no detector window is selected");
assert.ok(microscope.includes('marker.direction === "DOWN" ? "SHORT" : marker.direction === "UP" ? "LONG" : "PATTERN"'), "neutral detector observations must not be labelled LONG");
assert.match(microscope, /occurrence\.direction === "NEUTRAL"[\s\S]*?\?\s*"neutral"/, "neutral historical setup outcomes must stay explicitly neutral");
assert.match(microscope, /occurrence\.nextBar === "FLAT"[\s\S]*?\?\s*"flat"/, "measured FLAT next-bar outcomes must remain distinct from pending");
assert.match(microscope, /outcomeColor = outcome === "UP" \? TK\.green : outcome === "DOWN" \? TK\.red : TK\.text2/, "CandleWindow must render FLAT and neutral outcomes with the neutral color");
assert.match(microchart, /s\.annotationKind === "named_candle" \? \(locale === "vi" \? .* : "CANDLE/, "named candle markers must stay descriptive instead of being rendered as LONG or SHORT");
assert.match(microchart, /measured shape \$\{s\.reads === "bullish" \? "UP" : s\.reads === "bearish" \? "DOWN" : "NEUTRAL"\}/, "named candle accessibility labels must expose measured shape without implying order direction");
assert.match(namedCandleKnowledge, /NAMED_CANDLE_KNOWLEDGE = Object\.fromEntries\(\s*NAMED_CANDLE_PATTERNS\.map/, "named candle lens must be generated for every runtime taxonomy value");
assert.match(namedCandleKnowledge, /structure: structureFor\(pattern\)[\s\S]*meaning: meaningFor\(pattern\)[\s\S]*abstain: abstainFor\(pattern\)/, "named candle lens must expose structure, meaning, and abstention wording");
assert.match(namedCandleKnowledge, /descriptive, not an execution rule|no order authority/, "named candle lens must remain descriptive and non-authoritative");
assert.doesNotMatch(microscope, /selectedPriceActionMarker\s*=.*\|\|\s*priceAction\?\.markers\[0\]/, "selected concept must not fall back to another concept marker");
assert.match(microscope, /isHistoricalSignal = signal\.label\.startsWith\("HIST"\)/, "current markers must not open historical previews when indices overlap");
assert.match(microscope, /Returning to a current marker must leave historical inspection mode[\s\S]*analogueFocusTimeRef\.current = null[\s\S]*setHistoricalChartFocus\(null\)/, "selecting a current marker must clear stale analogue chart focus identity");
assert.match(microscope, /currentConceptIndices = new Set\(\(priceAction\?\.markers \|\| \[\]\)\.map\(\(marker\) => `\$\{marker\.conceptId\}:\$\{marker\.i\}`\)\)/,
  "historical tape overlap must be scoped to the same concept, not every marker on the candle");
assert.ok(microscope.includes('const previewOccurrence = previewOccurrenceIndex >= 0 && previewHistory.length ? previewHistory[Math.min(previewOccurrenceIndex, previewHistory.length - 1)] : undefined;'), "historical mini-chart occurrence must require explicit tape selection");
assert.match(microscope, /const selectPreviewOccurrenceIndex = \(index: number\)[\s\S]*findIndex\(\(bar\) => focusedSnapshotTimestampsEqual\(bar\.t, occurrence\.time\)\)[\s\S]*setHistoricalChartFocus\(focus >= 1 \? focus : null\)/, "Earlier/Later navigation must keep the main chart aligned to the selected occurrence UTC timestamp");
assert.match(microscope, /const previewNavigationIndex = previewOccurrence[\s\S]*disabled=\{previewNavigationIndex <= 0\}[\s\S]*disabled=\{previewNavigationIndex >= previewHistory\.length - 1\}/, "historical occurrence navigation must disable Earlier/Later at retained-tape boundaries");
assert.match(microscope, /A concept change is a new inspection context[\s\S]*setPreviewOccurrenceIndex\(-1\)[\s\S]*setHistoricalChartFocus\(null\)/, "switching concepts must clear stale historical occurrence inspection");
assert.match(microscope, /retention refresh can shift every occurrence index[\s\S]*findIndex\(\(occurrence\) => focusedSnapshotTimestampsEqual\(occurrence\.time, priorTime\)\)/, "retention refresh must re-align the selected occurrence by UTC identity");
assert.match(microscope, /selected candle fell outside the refreshed retention window[\s\S]*setPreviewOccurrenceIndex\(-1\)/, "expired historical selection must clear instead of previewing an unrelated candle");
assert.match(microscope, /const allAnalogueMatches = m5Atlas\?\.matches \|\| \[\]/, "mini analogue preview must expose the bounded causal match tape");
assert.match(microscope, /analoguePatternFilter.*NamedCandlePattern|const analoguePatternOptions = useMemo<Array<\{ pattern: NamedCandlePattern; count: number \}>>/, "mini analogue preview must expose a named-pattern filter state");
assert.match(microscope, /Pattern filter: all causal analogues[ -·]+\$\{analogueMatches\.length\} causal analogues/, "unfiltered mini analogue readout must describe its denominator as all causal endpoints");
assert.doesNotMatch(microscope, /Pattern filter: all named patterns · \$\{analogueMatches\.length\}/, "unfiltered mini analogue readout must not claim every causal endpoint carries a named pattern");
assert.match(microscope, /analogueFamilyFilter.*NamedCandleFamily|aria-label="Named candle family filter"/, "mini analogue preview must expose a named-pattern family filter");
assert.match(microscope, /getNamedCandleKnowledge\(pattern\)\?\.family === analogueFamilyFilter/, "family filter must derive from named-candle knowledge taxonomy");
assert.match(microscope, /Filter causal analogues to \$\{pattern\}; \$\{count\} matching endpoints[\s\S]*analoguePatternFilter === pattern/, "mini analogue preview pattern filters must expose pressed state and support count");
assert.match(microscope, /const analogueFilterControls = <div[\s\S]*\{analogueFilterControls\}\{nearestAnalogue \?/, "mini analogue pattern filter controls must remain visible when the selected filter has no matches");
assert.match(microscope, /const currentNamedPatterns = m5Atlas\?\.currentPatterns \|\| \[\][\s\S]*Filter causal analogues to current \$\{pattern\}/, "mini analogue preview must expose current closed-bar named patterns as filter shortcuts");
assert.match(microscope, /function namedCandlePatternToSignal\([\s\S]*annotationKind: "named_candle"/, "focused chart must render current named candle detections as distinct descriptive annotations");
assert.match(microscope, /const currentNamedCandleSignals = useMemo<SignalMarker\[\]>/, "focused chart must derive named candle annotations from the current closed M5 bar");
assert.match(microscope, /signal\.annotationKind === "named_candle"[\s\S]*resetAnalogueSelection\(pattern, null\)/, "selecting a named candle chart annotation must open its historical analogue filter");
assert.match(microscope, /function namedCandleHistoricalToSignal\([\s\S]*label: `HIST CANDLE/, "filtered named-pattern history must render causal historical candle annotations");
assert.match(microscope, /historicalNamedCandleSignals = useMemo<SignalMarker\[\]>/, "focused chart must derive historical named-pattern markers from the selected filter");
assert.match(microscope, /if \(!focused \|\| tf !== "M5" \|\| !showHistoricalTape \|\| \(!analoguePatternFilter && !analogueFamilyFilter\)/, "historical named-pattern overlays must honor the shared HIST TAPE visibility toggle");
assert.match(microscope, /signal\.label\.startsWith\("HIST CANDLE"\)[\s\S]*filteredMatches\.findIndex\(\(match\) => focusedSnapshotTimestampsEqual\(match\.time, signal\.time\)\)/, "selecting a historical named-pattern marker must align the analogue by endpoint timestamp");
assert.match(microscope, /historicalNamedCandleSignals\.length\} historical \$\{analoguePatternFilter\} endpoints are annotated on the chart/, "focused readout must disclose the selected named-pattern historical overlay count");
assert.match(microscope, /const historicalNamedCandleEndpointCount = useMemo\([\s\S]*new Set\(historicalNamedCandleSignals\.map\(\(signal\) => signal\.time\)\)\.size/, "family historical overlay disclosure must count unique UTC endpoints rather than duplicate same-family labels");
assert.match(microscope, /analogueFamilyFilter \? `\$\{historicalNamedCandleEndpointCount\} historical/, "family historical overlay readout must use the unique endpoint count");
assert.match(microscope, /function namedPatternEvidenceLabel\([\s\S]*prediction\.predictions\.find\(\(item\) => item\.horizon === 1\)/, "focused surface must format per-pattern causal H+1 evidence");
assert.match(microscope, /directional win-rate[\s\S]*neutral setup/, "focused named-pattern evidence must disclose directional win-rate and preserve neutral abstention");
assert.match(microscope, /const analogueWinRateReadout[\s\S]*analogueDirectionalWinRate[\s\S]*analogueOutcomeCounts[\s\S]*AnalogueMiniChart[\s\S]*analogueWinRateReadout/, "mini analogue accessibility output must carry the selected filtered-tape win-rate context");
assert.match(microscope, /namedPatternDirectionalReadout\(analoguePatternFilter, analogueRawDirectionalDistribution\)/, "historical filtered-tape direction must use the shared named-pattern orientation helper");
assert.match(microscope, /currentNamedCandleAria[\s\S]*namedPatternEvidenceLabel\(pattern, prediction\)/, "focused readout must expose current named-pattern conditional evidence");
assert.match(microscope, /Conditional H\+1 evidence is descriptive and shrinkage-aware[\s\S]*never enters the aggregate forecast consensus or order authority/, "named-pattern conditional evidence must remain outside forecast and order authority");
assert.match(microscope, /getNamedCandleKnowledge\(analoguePatternFilter\)/, "focused surface must resolve a named-pattern explanation from the selected filter");
assert.match(microscope, /selectedNamedCandleKnowledge\.structure[\s\S]*selectedNamedCandleKnowledge\.meaning[\s\S]*selectedNamedCandleKnowledge\.abstain/, "focused surface must show named-pattern structure, meaning and abstain cues");
assert.match(microscope, /selectedNamedCandleFamilyKnowledge\.structure[\s\S]*selectedNamedCandleFamilyKnowledge\.meaning[\s\S]*selectedNamedCandleFamilyKnowledge\.abstain/, "focused surface must show family structure, meaning and abstain cues");
assert.match(namedCandleKnowledge, /NAMED_CANDLE_FAMILY_KNOWLEDGE[\s\S]*getNamedCandleFamilyKnowledge/, "named-candle family lens must use a fail-closed taxonomy registry");
assert.match(microscope, /No causal analogue windows carry the selected \$\{analoguePatternFilter \|\| analogueFamilyFilter/, "mini analogue preview must explain an empty named-pattern filter result");
assert.match(microscope, /const countAnalogueOutcomes = \(matches: typeof allAnalogueMatches\)[\s\S]*const analogueOutcomeCounts = countAnalogueOutcomes\(analogueMatches\)[\s\S]*const analogueObservedN[\s\S]*wilson95[\s\S]*Observed H\+1 outcomes[\s\S]*descriptive tape only/, "mini analogue preview must disclose uncertainty-aware observed outcomes for the active causal tape");
assert.match(microscope, /const allAnalogueOutcomeCounts = countAnalogueOutcomes\(allAnalogueMatches\)[\s\S]*Pattern vs all-tape lift: UP[\s\S]*DOWN[\s\S]*descriptive comparison/, "mini analogue preview must compare a named-pattern tape with the unfiltered causal tape");
assert.match(microscope, /analogueFamilyFilter[\s\S]*Family \$\{namedCandleFamilyLabel\(analogueFamilyFilter\)\} vs all-tape lift/, "family analogue preview must label its lift comparison with the selected family");
assert.match(microscope, /const analoguePatternLiftReadout = analoguePatternFilter &&[\s\S]*analogueFamilyFilter &&[\s\S]*Family .*vs all-tape lift/, "family-filtered outcomes must report family-versus-all-tape lift with the same selected scope");
assert.match(microscope, /const analogueIndex = analogueMatches\.length[\s\S]*analoguePreviewIndex/, "mini analogue preview selection must be bounded to the retained causal matches");
assert.match(microscope, /const resetAnalogueSelection = \(pattern: NamedCandlePattern \| null, family: NamedCandleFamily \| null\)[\s\S]*setHistoricalChartFocus\(null\)/, "changing analogue filters must clear the old chart endpoint");
assert.match(microscope, /resetAnalogueSelection\(null, null\);\r?\n  }, \[requestedSymbol, tf\]\);/, "closed-bar refreshes must preserve the selected analogue filter");
assert.match(microscope, /analogueFocusTimeRef\.current = null[\s\S]*setHistoricalChartFocus\(null\)/, "clearing a filter must invalidate the UTC focus identity");
assert.match(microscope, /Show earlier causal analogue[\s\S]*Show later causal analogue/, "mini analogue preview must support navigating retained causal matches");
assert.match(microscope, /const selectAnaloguePreviewIndex = \(nextIndex: number\)[\s\S]*analogueFocusTimeRef\.current == null[\s\S]*setHistoricalChartFocus\(focusIndex\)/, "Earlier\/Later must follow the focused analogue by UTC when chart focus is active");
assert.match(microscope, /const onAnaloguePreviewKeyDown = \(event: React\.KeyboardEvent<HTMLDivElement>\)[\s\S]*event\.currentTarget !== event\.target[\s\S]*selectAnaloguePreviewIndex\(analogueIndex/, "mini analogue preview arrows must be keyboard navigable without hijacking child controls");
assert.match(microscope, /const showAnalogueOnChart = \(\)[\s\S]*focusedSnapshotTimestampsEqual\(bar\.t, analogueEndpoint\.t\)[\s\S]*setHistoricalChartFocus\(focusIndex\)/, "causal analogue selection must map to the main chart by endpoint UTC timestamp");
assert.match(microscope, /Show causal analogue \$\{analogueIndex \+ 1\} on the main chart/, "causal analogue preview must expose a main-chart focus action");
assert.match(microscope, /analogueFocusTimeRef[\s\S]*retained = \(m5Atlas\?\.matches \|\| \[\]\)\.some[\s\S]*setHistoricalChartFocus\(null\)/, "analogue chart focus must clear when a bounded tape refresh drops the focused endpoint");
assert.match(microscope, /const analogueOnChart = !!nearestAnalogue[\s\S]*focusedSnapshotTimestampsEqual\(detectorBars\[historicalChartFocus\]\?\.t, analogueEndpoint\.t\)/, "causal analogue focus state must compare endpoint UTC timestamps");
assert.match(microscope, /const analogueOnChart = !!nearestAnalogue[\s\S]*analogueFocusTimeRef\.current != null[\s\S]*focusedSnapshotTimestampsEqual\(analogueFocusTimeRef\.current, analogueEndpoint\.t\)/, "causal analogue focus must require an explicit analogue UTC identity, not only a coincident chart timestamp");
assert.match(microscope, /aria-pressed=\{analogueOnChart\}[\s\S]*data-analogue-focus=\{analogueOnChart \? "active" : "preview-only"\}/, "causal analogue focus control must expose active versus preview-only state");
assert.match(microscope, /Main chart focused on causal analogue \$\{analogueIndex \+ 1\}/, "causal analogue focus must announce the selected endpoint");
assert.match(microscope, /const analogueFocusStatus = analogueOnChart[\s\S]*previous chart focus does not match this selected filter/, "filter changes must announce when the old chart focus was cleared");
assert.match(microchart, /export interface MicroChartFocusAnnotation/, "main chart must support a dedicated historical context annotation type");
assert.match(microchart, /focusAnnotation && focusAnnotation\.i >= start[\s\S]*historical context only/, "causal analogue focus must render a non-signal chart context marker");
assert.match(microscope, /const analogueFocusAnnotation: MicroChartFocusAnnotation \| null/, "focused page must derive the analogue context marker only after UTC focus matches");
assert.match(microscope, /focusAnnotation=\{focused \? analogueFocusAnnotation : null\}/, "focused chart must receive the causal analogue context annotation");
assert.match(microscope, /const analogueMatchReadout = nearestAnalogue[\s\S]*similarity \$\{\(nearestAnalogue\.similarity \* 100\)\.toFixed\(1\)\}%[\s\S]*same regime/, "causal analogue preview must disclose similarity, distance and regime context");
assert.match(microscope, /<small>\{analogueMatchReadout\}<\/small>/, "causal analogue quality disclosure must be visible beside the mini chart");
assert.match(microscope, /function AnalogueMiniChart\([\s\S]*data-candle-state=\"closed\"/, "mini analogue preview must render closed OHLC candles rather than an unlabeled line");
assert.match(microscope, /<AnalogueMiniChart(?: locale=\{locale\})? bars=\{nearestAnalogueBars\}[\s\S]*outcome=\{nearestAnalogueOutcome/, "mini analogue preview must pass the measured next-bar outcome into its candle window");
assert.match(microscope, /color=\{nearestAnalogueOutcome === "UP" \? TK\.green : nearestAnalogueOutcome === "DOWN" \? TK\.red : TK\.text2\}/, "mini analogue match marker must stay neutral for flat or unavailable outcomes");
assert.match(microscope, /MATCH END[\s\S]*NEXT \{outcome\}/, "mini analogue preview must distinguish the matched endpoint from the measured next candle");
assert.match(microscope, /const positionLabel = direction === "UP" \? "OBS LONG" : direction === "DOWN" \? "OBS SHORT" : null/, "historical mini geometry must label directional observations separately from current signals");
assert.match(microscope, /positionLabel && entry != null && target != null && invalidation != null[\s\S]*TARGET[\s\S]*INVALIDATION/, "historical directional analogue windows must show entry, target and invalidation geometry");
assert.match(microscope, /no directional position geometry without an unambiguous setup direction/, "neutral and ambiguous historical setups must not receive outcome-derived position geometry");
assert.match(microscope, /observed next closed bar \$\{nearestAnalogueOutcome\}/, "mini analogue preview must expose the observed next-bar outcome beside the sparkline");
assert.match(microscope, /ariaLabel=\{`\$\{nearestAnalogueLabel\}; \$\{analogueMatchReadout\}; \$\{analoguePatternReadout\}; \$\{analogueFilterReadout\}; \$\{analogueOutcomeReadout\}; \$\{analoguePatternLiftReadout\}; \$\{analogueWinRateReadout\}`\}/, "mini analogue preview must expose its timestamp, outcome, quality, patterns, filter, distribution, comparison, win-rate context and research boundary to assistive technology");
assert.match(microscope, /Research evidence only[\s\S]*SHADOW_ONLY[\s\S]*NO_DECISION[\s\S]*no order authority\./, "mini analogue preview must preserve the read-only authority boundary");



