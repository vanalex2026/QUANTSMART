import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const chartSource = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);

const source = chartSource + "\n" + readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChartSeries.tsx", import.meta.url), "utf8");
const chartCss = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url), "utf8");
assert.match(source, /const chartDescription = locale === "vi"\s*\?[\s\S]*?\$\{latestReadout\}\$\{researchLandmarks\} Shadow only; no decision or order\./,
  "chart accessibility copy must preserve the read-only shadow/no-decision boundary");
assert.match(source, /const researchLandmarks = lines\.length[\s\S]*?Research landmarks/,
  "chart accessibility copy must announce forecast and research line landmarks");
assert.match(source, /researchStatus\?: string/,
  "chart must accept an explicit causal forecast status");
assert.match(source, /Forecast research status: \$\{researchStatus\}/,
  "chart must expose forecast readiness or abstention to assistive technology");
assert.match(source, /\{researchStatusLabel\} · \{researchStatus\}/,
  "chart must show forecast readiness or abstention in the visible chart chrome");
assert.match(source, /const formingVisible = bars\.length > closedBars\.length/,
  "chart accessibility copy must distinguish a forming context candle from closed-bar evidence");
assert.match(source, /Date\.parse\(bars\[bars\.length - 1\]\.t\) === formingTime/,
  "overlapping live frames must still be identified as forming context when they replace the latest row");
assert.match(source, /data-candle-state=\{forming \? "forming" : "closed"\}/,
  "forming and closed candles must expose distinct semantic states");
assert.match(source, /<g transform=\{`translate\(\$\{panOffset\},0\)`\} aria-hidden="true">\s*<CandleSeries/, 
  "dense candle geometry must stay out of the accessibility tree while the chart summary remains available");
assert.match(source, /<g transform=\{`translate\(\$\{panOffset\},0\)`\} aria-hidden="true">\s*<IndicatorSeries/, 
  "dense indicator geometry must stay out of the accessibility tree while semantic chart controls remain available");
assert.match(source, /Forming candle; context only; not closed-bar evidence/,
  "forming candle tooltip must state that it is not closed-bar evidence");
assert.match(source, /Latest forming price"\} \$\{fp\(last\.c\)\}/,
  "accessible chart summary must call the displayed forming value a price rather than a close");
assert.match(source, /W < 480 && !compactChrome && <div className="microchart-price-legend"/,
  "focused compact charts must avoid rendering a duplicate mobile OHLC header outside the SVG");
assert.match(source, /const evidenceStatus = locale === "vi"[\s\S]*?Research evidence: \$\{closedBars\.length\.toLocaleString\(\)\} closed bars/,
  "chart footer must expose the closed-bar evidence count to assistive technology");
assert.match(source, /<svg width=\{W\} height=\{H\} viewBox=\{`0 0 \$\{W\} \$\{H\}`\}[^>]*role=\"group\"[^>]*aria-label=\{chartDescription\}/,
  "the TradingView-style chart must expose a concise semantic description");
assert.match(chartSource, /className="microchart-canvas" role="group"/,
  "interactive evidence controls must remain exposed instead of flattened by an image parent role");
assert.match(chartCss, /microchart-canvas:focus-visible/,
  "keyboard chart focus must have a visible focus indicator on the monochrome canvas");
assert.match(source, /<title>\{chartDescription\}<\/title>/,
  "the chart must provide a native SVG title for screen readers and browser tooltips");
assert.match(source, /aria-pressed=\{tool === t\.id\}/,
  "the selected drawing tool must expose its pressed state");
assert.match(source, /role="toolbar" aria-label=\{chartCopy\.toolRail\}[\s\S]*?aria-orientation=\{toolbarHorizontal \? "horizontal" : "vertical"\}/,
  "the chart tool rail must expose its responsive orientation to keyboard and screen-reader navigation");
assert.match(source, /window\.matchMedia\("\(max-width: 639\.98px\)"\)/,
  "the chart toolbar orientation must track the same narrow breakpoint as its horizontal layout");
assert.match(source, /aria-pressed=\{magnet\}/,
  "the OHLC magnet toggle must expose its pressed state");
assert.match(source, /aria-pressed=\{lock\}/,
  "the drawing lock toggle must expose its pressed state");
assert.match(source, /aria-label=\{hideDraws \? chartCopy\.showDrawings : chartCopy\.hideDrawings\}/,
  "the drawing visibility toggle must have a state-aware accessible name");
assert.match(source, /<span role="status" aria-label=\{evidenceStatus\}[^>]*>\{locale === "vi" \? \(formingInViewport \?[\s\S]*?SHADOW_ONLY[\s\S]*?<\/span>/,
  "the chart footer must keep evidence scope and authority visible as a live status");
assert.match(source, /<span role="img" aria-label=\{accessibilityCopy\.sessions\}/,
  "session legend must expose color meanings without relying on color alone");
assert.match(source, /aria-label=\{accessibilityCopy\.resetView\}/,
  "the chart reset control must have an explicit accessible name");
assert.match(source, /mfe_chart_drawings_v1_\$\{symbol\}_\$\{tf\}/,
  "interactive drawings must persist per symbol and timeframe");
assert.match(source, /focusIndex\?: number \| null/,
  "chart must support a visual focus index separate from replay cursor semantics");
assert.match(source, /Chart focused on historical evidence at \$\{shortTime\(targetBar\.t\)\} UTC/,
  "historical chart jumps must announce the focused closed-bar timestamp");
assert.match(source, /const width = Math\.min\(220, n - 1\)/,
  "historical chart jumps must center the selected occurrence in a bounded inspection window");
assert.match(source, /nextBarOutcome\?: "UP" \| "DOWN" \| "FLAT"/,
  "historical annotations must expose their measured next-bar outcome separately from pending state");
assert.match(source, /outcome: "correct" \| "wrong" \| "pending" \| "flat" \| "neutral"/,
  "historical FLAT and neutral setup outcomes must have distinct measured states");
assert.match(source, /next closed bar|next closed bar \$\\{signal\.nextBarOutcome\}|signal\.nextBarOutcome/,
  "keyboard annotation status must announce a measured historical FLAT/UP/DOWN outcome");
assert.match(source, /DRAWING_LIMIT = 200/,
  "persisted drawings must remain bounded");
assert.match(source, /role=\{selectedDrawingIndex === k \? "img" : undefined\}/,
  "the selected saved drawing must expose a semantic accessibility node");
assert.match(source, /Selected \$\{d\.kind\} drawing \$\{k \+ 1\} of \$\{draws\.length\}; drag the body or handles to edit; Delete removes; Escape deselects; SHADOW_ONLY; NO_DECISION\./,
  "selected drawing aria disclosure must name its position, edit keys and authority boundary");
assert.match(source, /diagnostic ONLY|diagnostic only/,
  "the chart must retain diagnostic-only framing");
assert.match(source, /Shadow research annotation/,
  "candle-pattern annotations must be keyboard focusable and explicitly shadow-only");
assert.match(source, /tabIndex=\{0\}/,
  "chart evidence annotations must expose keyboard focus targets");
assert.match(source, /const signalHoverKey = \(signal: SignalMarker\): string =>/,
  "signal hover identity must distinguish concepts sharing one candle");
assert.match(source, /onFocus=\{\(\) => setSigHover\(hoverKey\)\}/,
  "keyboard focus must expose the concept-scoped candle-pattern evidence popup");
assert.match(source, /Shadow simulated \$\{t\.dir\} trade/,
  "simulated trade annotations must be keyboard focusable and clearly non-authoritative");
assert.match(source, /onFocus=\{\(\) => setTradeHover\(t\.entryI\)\}/,
  "keyboard focus must expose the existing simulated-trade evidence popup");
assert.match(source, /\[annotationFocusIndex, setAnnotationFocusIndex\] = useState\(0\)/,
  "chart annotations must keep one roving keyboard anchor");
assert.match(source, /tabIndex=\{annotationIndex === activeAnnotationIndex \? 0 : -1\}/,
  "signal and trade annotations must use a roving tabindex");
assert.match(source, /onAnnotationKeyDown/,
  "annotation focus must support arrow, Home and End navigation");
assert.match(source, /const annotationStatus = \(index: number\) => \{/,
  "annotation focus must derive a concise live status for the selected evidence");
assert.match(source, /setChartKeyStatus\(annotationStatus\(bounded\)\)/,
  "roving annotation focus must announce the selected shadow evidence");
assert.match(source, /setChartKeyStatus\(annotationStatus\(annotationIndex\)\)/,
  "direct keyboard focus on an annotation must announce its shadow-only status");
assert.match(source, /aria-setsize=\{annotationCount\}/,
  "annotation focus targets must expose the current evidence-set size");
assert.match(source, /aria-posinset=\{annotationIndex \+ 1\}/,
  "annotation focus targets must expose their position in the roving evidence set");
assert.match(source, /No shadow annotations in visible window\. SHADOW_ONLY; NO_DECISION\./,
  "an empty filtered window must announce the read-only absence of shadow annotations");
assert.match(source, /SHADOW_ONLY; NO_DECISION\./,
  "annotation live status must preserve the read-only shadow/no-decision boundary");
assert.match(source, /aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"/,
  "annotation navigation shortcuts must be announced");
assert.match(source, /className="microchart-canvas"[^>]*role="group"[^>]*tabIndex=\{0\}[^>]*aria-describedby=\{chartHelpId\}[^>]*aria-keyshortcuts="Escape Home (?:End )?PageUp PageDown ArrowLeft ArrowRight(?: ArrowUp ArrowDown)? \+ -(?: C T H F R B X M)?"/,
  "the chart canvas must expose a keyboard focus target and its navigation shortcuts");
assert.match(source, /aria-roledescription=\{locale === "vi" \? "biểu đồ nghiên cứu tương tác" : "interactive research chart"\}/, 
  "the chart canvas must identify its interactive research semantics");
assert.match(source, /onKeyDown=\{onChartKeyDown\}/,
  "the chart canvas must handle keyboard pan, zoom and reset controls");
assert.match(source, /className="microchart-keyboard-help"[^>]*>\{accessibilityCopy\.keyboardHelp\}/,
  "keyboard chart shortcuts must have an assistive-technology hint");
assert.match(source, /keyboardHelp:[\s\S]*Tab reaches shadow annotations\.|keyboardHelp:[\s\S]*Tab%20%C4%91%E1%BA%BFn%20c%C3%A1c%20ch%C3%BA%20th%C3%ADch%20b%C3%B3ng/,
  "keyboard help must explain annotation navigation without weakening the shadow-only boundary");
assert.match(source, /className="microchart-keyboard-status" role="status" aria-live="polite"/,
  "keyboard chart changes must announce the updated view");
assert.match(source, /className=(?:"microchart-bottom-bar"|\{`microchart-bottom-bar)/,
  "the chart footer must expose a responsive readability hook");

console.log("MICROCHART ACCESSIBILITY PASS: semantic chart summary and stateful controls preserve shadow-only behavior.");

