import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const microChart = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const skin = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url), "utf8");
assert.match(microChart, /researchPattern\?: string/);
assert.match(microChart, /className="micro-pattern-status"[\s\S]*patternStatusAria/);
assert.match(microscope, /researchPattern=\{focused \? currentPatternExplanation : undefined\}/);
assert.match(microscope, /researchPatternSignals=\{focused \? currentPatternSignals : \[\]\}/);
assert.match(microscope, /researchPatternLabel=\{focused \? currentPatternSignalLabel : undefined\}/);
assert.match(microscope, /namedPatternEvidenceLabel\(pattern, prediction\)/);
assert.match(microscope, /m5Atlas\?\.namedPatternPredictions\?\.find/);
assert.match(skin, /micro-pattern-status[\s\S]*border-left: 3px solid var\(--accent-cyan\)/);
assert.match(microChart, /micro-pattern-status-button[\s\S]*onClick=\{\(\) => onSignalSelect\?\.\(signal\)\}/);
assert.match(microChart, /micro-pattern-status-explanation/);
assert.match(microChart, /micro-pattern-status-authority/);
assert.match(microChart, /patternStatusAria/);
assert.match(microChart, /patternAuthority/);
assert.match(microChart, /const inspect = locale === "vi"[\s\S]*Inspect current pattern/);
assert.match(microChart, /Current pattern/);
// Execute the actual JSX from MicroChart: a current chip must deliver the
// exact UTC/concept marker to the inspector, without mixing in history.
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript"), React = require("react");
const ast = ts.createSourceFile("MicroChart.tsx", microChart, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let statusJsx;
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(prop =>
    ts.isJsxAttribute(prop) && prop.name.getText(ast) === "className" && prop.initializer?.text === "micro-pattern-status")) statusJsx = node.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(statusJsx);
const compiled = ts.transpileModule(`function renderStatus(researchPatternSignals, onSignalSelect, researchPatternLabel, locale = "en") { const researchPattern = "PDF reason"; const shortTime = t => t; const patternAuthority = locale === "vi" ? "CHỈ QUAN SÁT; KHÔNG QUYẾT ĐỊNH; không có quyền đặt lệnh" : "SHADOW_ONLY; NO_DECISION; no order authority"; const authority = patternAuthority; const patternStatusAria = locale === "vi" ? \`Mô hình nến đóng hiện tại: \${researchPattern}; \${patternAuthority}\` : \`Current closed-bar pattern: \${researchPattern}; \${patternAuthority}\`; return (${statusJsx}); }`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
const renderStatus = new Function("React", `${compiled}; return renderStatus;`)(React);
const signals = [
  { conceptId: "pattern_break", label: "PATTERN BREAK", time: "2026-11-16T09:30:00Z", reads: "bullish" },
  { conceptId: "false_break", label: "FALSE BREAK", time: "2026-11-16T09:30:00Z", reads: "bearish" },
  { conceptId: "named_candle:doji", annotationKind: "named_candle", label: "DOJI", time: "2026-11-16T09:30:00Z", reads: "neutral" },
];
const collect = (node, type) => !node || typeof node !== "object" ? [] : [
  ...(node.type === type ? [node] : []), ...React.Children.toArray(node.props?.children).flatMap(child => collect(child, type)),
];
let selected;
const tree = renderStatus(signals, value => { selected = value; }, signal => signal.annotationKind === "named_candle" ? signal.label : `${signal.label} Ãƒâ€šÃ‚Â· 55% H+1 n=100`);
const chips = collect(tree, "button");
assert.equal(chips.length, 3);
assert.equal(chips[0].props.children, "PATTERN BREAK Ãƒâ€šÃ‚Â· 55% H+1 n=100");
assert.equal(chips[2].props.children, "DOJI");
assert.match(chips[0].props['aria-label'], /SHADOW_ONLY; NO_DECISION; no order authority/);
assert.match(chips[0].props.title, /SHADOW_ONLY; NO_DECISION; no order authority/);
chips[1].props.onClick();
assert.equal(selected, signals[1], "chip retains exact concept and closed-bar UTC identity");
chips[2].props.onClick();
assert.equal(selected, signals[2], "named-candle chip retains the exact Atlas marker identity");
assert.equal(collect(tree, "details").length, 1);
assert.equal(collect(tree, "details")[0].props.open, undefined, "long explanation starts collapsed");
assert.equal(collect(renderStatus([], undefined), "button").length, 0, "abstention has no phantom inspection action");
// Execute the actual page callback: the chip's denominator is observed H+1
// analogue outcomes, not total pattern assignments or a smoothed prior.
const pageAst = ts.createSourceFile("Microscope.tsx", microscope, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let labelCallback;
function findLabel(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(pageAst) === "currentPatternSignalLabel") labelCallback = node.initializer.arguments[0].getText(pageAst);
  ts.forEachChild(node, findLabel);
}
findLabel(pageAst);
assert.ok(labelCallback);
const labelCode = ts.transpileModule(`const callback = ${labelCallback}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const labelFor = (rows) => new Function("m5Atlas", "priceAction", `${labelCode};return callback;`)({ namedPatternPredictions: rows }, undefined);
const named = { conceptId: "named_candle:DOJI", annotationKind: "named_candle", label: "CANDLE Ãƒâ€šÃ‚Â· DOJI" };
const row = { pattern: "DOJI", sampleN: 100, support: "SPARSE", predictions: [{ horizon: 1, sampleN: 8, up: 0.5, flat: 0.125, down: 0.375 }] };
const namedLabel = labelFor([row])(named);
assert.match(namedLabel, /UP 50% \/ FLAT 13% \/ DOWN 38%/);
assert.match(namedLabel, /SPARSE n=8 \u00b7 posterior/);
assert.doesNotMatch(namedLabel, /win|100/, "neutral posterior cannot claim directional wins or total assignment denominator");
assert.match(labelFor([{ ...row, support: "UNSEEN", predictions: [{ ...row.predictions[0], sampleN: 0 }] }])(named), /UNSEEN \u00b7 H\+1 unavailable/);
assert.doesNotMatch(labelFor([{ ...row, predictions: [{ ...row.predictions[0], horizon: 2 }] }])(named), /50%/, "H+2 cannot silently substitute for H+1");
assert.match(labelFor([])(named), /H\+1 unavailable/);
console.log("FOCUSED CURRENT PATTERN CHART STATUS PASS: clickable current concepts, source explanation and read-only inspector wiring.");
