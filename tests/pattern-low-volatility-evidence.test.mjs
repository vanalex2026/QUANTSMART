import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const base = new URL("../mfe_ux_lab/cockpit/src/", import.meta.url);
const read = (path) => readFileSync(new URL(path, base), "utf8");
const skin = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/chart-pattern-inspector.css", import.meta.url), "utf8");
const load = (path, dependencies = {}) => {
  const code = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)((name) => dependencies[name] || require(name), module, module.exports);
  return module.exports;
};

const sourcePages = load("lib/priceActionSourcePages.ts");
const sourceConceptStatus = load("lib/sourceConceptStatus.ts");
const { PatternLowVolatilityEvidence } = load("components/PatternLowVolatilityEvidence.tsx", {
  "../lib/priceActionSourcePages.ts": sourcePages,
  "../lib/sourceConceptStatus.ts": sourceConceptStatus,
});
const context = {
  version: "pattern-low-volatility-context/1",
  time: "2026-01-05T04:55:00.000Z",
  state: "LOW_ACTIVITY_CONTEXT",
  reason: "LOCAL_RECENT_RANGE_BELOW_BASELINE",
  contextStart: "2026-01-05T00:00:00.000Z",
  contextEnd: "2026-01-05T04:55:00.000Z",
  bars: 60,
  baselineBars: 48,
  recentBars: 12,
  baselineRange: 10,
  recentRange: 2,
  activityRatio: 0.2,
  lowActivityThreshold: 0.65,
  recentDirectionalEfficiency: 0.4,
  truncatedByGap: false,
  causalPrefix: {
    mode: "CAUSAL_PREFIX_ONLY",
    maxBars: 60,
    bars: 60,
    start: "2026-01-05T00:00:00.000Z",
    end: "2026-01-05T04:55:00.000Z",
    truncatedByGap: false,
    futureRows: "WITHHELD",
    sourceStatus: "SOURCE_REVIEW_ONLY",
    dataStatus: "AVAILABLE",
    localDataStatus: "AVAILABLE",
    outcomeStatus: "WITHHELD",
    authority: "SHADOW_ONLY / NO_DECISION",
    live_apply_allowed: false,
  },
  sourcePages: [395, 396],
  authority: "SHADOW_ONLY / NO_DECISION",
};
const withheld = { ...context, state: "WITHHELD", reason: "INSUFFICIENT_CLOSED_CONTEXT", activityRatio: null, baselineRange: null, recentRange: null, recentDirectionalEfficiency: null, contextStart: null, contextEnd: null, bars: 0 };

const html = renderToStaticMarkup(React.createElement(PatternLowVolatilityEvidence, { context }));
assert.match(html, /Local activity context/);
assert.match(html, /Recent local activity is below its bounded baseline/);
assert.match(html, /20\.0%/);
assert.match(html, /40\.0%/);
assert.match(html, /SOURCE_REVIEW_ONLY \/ data UNAVAILABLE \/ outcome WITHHELD/);
assert.match(html, /data-low-volatility-causal-prefix="true"/);
assert.match(html, /CAUSAL PREFIX ONLY/);
assert.match(html, /SOURCE_REVIEW_ONLY \/ data AVAILABLE \/ outcome WITHHELD/);
assert.match(html, /future rows withheld/);
assert.match(html, /Narrative source examples provide no XAUUSD OHLC or measured win rate/);
assert.match(html, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
assert.match(html, /data-low-volatility-state="LOW_ACTIVITY_CONTEXT"/);

const withheldHtml = renderToStaticMarkup(React.createElement(PatternLowVolatilityEvidence, { context: withheld }));
assert.match(withheldHtml, /Activity context withheld: insufficient closed context/);
assert.doesNotMatch(withheldHtml, /Baseline median range/);
assert.match(withheldHtml, /SOURCE_REVIEW_ONLY \/ data UNAVAILABLE \/ outcome WITHHELD/);
assert.match(withheldHtml, /data-low-volatility-state="WITHHELD"/);
assert.match(withheldHtml, /data-low-volatility-causal-prefix="true"/);
assert.match(withheldHtml, /UNAVAILABLE/);

const source = read("components/PatternLowVolatilityEvidence.tsx");
assert.match(source, /do not classify a source setup, filter history, change targets, or authorize an entry/);
assert.doesNotMatch(source, /priceActionDetector/);
assert.match(skin, /\.pattern-low-volatility-evidence dl\{[\s\S]*?font:11px\/1\.5 ui-monospace,monospace/,
  "local activity metrics must use the inspector's readable monospace layout");
console.log("PATTERN LOW-VOLATILITY EVIDENCE PASS: local activity receipt is inspectable while source-only and authority boundaries remain explicit.");
