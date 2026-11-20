import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("MicroChart.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(["hoverCopy", "localizedMarkerLabel", "signalHoverKey"]);
const declarations = new Map();
let signalHover;
function visit(node) {
  if (ts.isVariableDeclaration(node) && names.has(node.name.getText(ast))) {
    declarations.set(node.name.getText(ast), `const ${node.getText(ast)};`);
  }
  if (ts.isJsxExpression(node) && node.expression && ts.isCallExpression(node.expression)) {
    const expression = node.expression.getText(ast);
    if (expression.includes("if (sigHover == null) return null;")) signalHover = expression;
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(declarations.size, names.size);
assert.ok(signalHover);
const script = `${[...declarations.values()].join("\n")}\nreturn ${signalHover};`;
const renderHover = new Function("React", "locale", "cursor", "visibleSignals", "sigHover", "xFor", "yFor", "W", "H", "MONO",
  ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText);

const signal = {
  i: 5, time: "2026-11-19T12:00:00Z", price: 2600, side: "low", reads: "neutral",
  label: "CANDLE · INSIDE_BAR", conceptId: "named_candle:INSIDE_BAR", annotationKind: "named_candle",
  outcome: "flat", nextBarOutcome: "FLAT", conditional_rate: null, base_rate: null, sample_n: null,
};
function render(locale, marker = signal, cursor = null, visible = [marker]) {
  const sigHover = `${marker.i}:${marker.time}:${marker.conceptId}`;
  return renderToStaticMarkup(renderHover(React, locale, cursor, visible, sigHover, () => 100, () => 70, 600, 340, "monospace"));
}

const vi = render("vi");
assert.match(vi, /font-size:13px/);
assert.match(vi, /Nến trong/);
assert.match(vi, /Nến đóng tiếp theo: <b>Đi ngang/);
assert.match(vi, /Trung tính/);
assert.doesNotMatch(vi, /null baseline|monitoring|Xác suất hướng/);
const en = render("en");
assert.match(en, /Next closed bar: <b>FLAT/);
assert.match(en, /Observation only/);
assert.match(render("en", { ...signal, nextBarOutcome: undefined, outcome: "wrong" }), /Next closed bar: <b>unavailable/);
assert.match(render("en", signal, signal.i), /Next closed bar: <b>unavailable/);
assert.equal(render("en", signal, null, []), "");

console.log("MICROCHART MARKER HOVER PASS: EN/VI hover details retain readable labels and explicit missing observations.");
