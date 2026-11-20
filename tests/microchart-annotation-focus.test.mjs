import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)), "utf8");
const styles = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url)), "utf8");

assert.match(source, /className="microchart-signal"[^>]*tabIndex=\{annotationIndex === activeAnnotationIndex \? 0 : -1\}/,
  "signal evidence must remain in the roving keyboard focus set");
assert.match(source, /className="microchart-signal"[^>]*role="button"[^>]*aria-haspopup="dialog"/,
  "clickable signal evidence must expose button semantics and its inspection dialog target");
assert.match(source, /className="microchart-trade"[^>]*tabIndex=\{annotationIndex === activeAnnotationIndex \? 0 : -1\}/,
  "shadow trade evidence must remain in the roving keyboard focus set");
assert.match(styles, /\.microchart-signal:focus-visible,[\s\S]*?\.microchart-trade:focus-visible[\s\S]*?outline: 2px solid var\(--accent-cyan\)/,
  "focused SVG evidence markers must expose a visible monochrome focus ring");
assert.doesNotMatch(source, /className="microchart-signal"[\s\S]*?style=\{\{[^}]*outline:\s*["']none["']/,
  "signal marker focus must not be suppressed by an inline outline reset");
assert.match(source, /if \(next === null \|\| !annotationCount\) return;\s*event\.preventDefault\(\);\s*\/\/ Annotation navigation owns the key event\.[\s\S]*?event\.stopPropagation\(\);\s*focusAnnotationAt\(next\);/,
  "annotation arrow/Home/End navigation must stop before the parent SVG pans or jumps the viewport");
assert.doesNotMatch(source, /if \(next < 0 \|\| !annotationCount\) return;/,
  "annotation navigation must wrap backward from the first marker instead of dropping focus");
assert.match(source, /if \(event\.key === "Enter" \|\| event\.key === " "\) \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);/,
  "activating a focused signal must not bubble into the chart keyboard controller");
assert.match(source, /no decision or order authority/,
  "marker focus must retain the descriptive no-authority boundary");

// Exercise the real handlers: keyboard events dispatched on an SVG child
// bubble to the root SVG unless the annotation consumes navigation itself.
const require = createRequire(new URL('../mfe_ux_lab/cockpit/package.json', import.meta.url));
const ts = require('typescript');
const ast = ts.createSourceFile('MicroChart.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['onAnnotationKeyDown', 'onSignalKeyDown'].includes(node.name.getText(ast))) {
    handlers.set(node.name.getText(ast), `const ${node.name.getText(ast)} = ${node.initializer.getText(ast)};`);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const compile = (name, env) => new Function('env', `with(env){${ts.transpileModule(handlers.get(name), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText};return ${name};}`)(env);
let focused = null, parentActions = 0, selected = null;
const env = {
  annotationCount: 3,
  focusAnnotationAt(index) { focused = (index + env.annotationCount) % env.annotationCount; },
  onSignalSelect(signal) { selected = signal; },
  setAnnotationFocusIndex(index) { focused = index; },
  annotationStatus(index) { return `Annotation ${index}`; },
  setChartKeyStatus() {},
};
env.onAnnotationKeyDown = compile('onAnnotationKeyDown', env);
env.onSignalKeyDown = compile('onSignalKeyDown', env);
const event = key => ({ key, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
for (const [key, index, expected] of [['ArrowLeft', 0, 2], ['ArrowUp', 0, 2], ['ArrowRight', 2, 0], ['Home', 2, 0], ['End', 0, 2]]) {
  const e = event(key);
  env.onAnnotationKeyDown(e, index);
  if (!e.stopped) parentActions++;
  assert.equal(focused, expected, `${key} should move only the annotation focus`);
  assert.ok(e.prevented && e.stopped, `${key} is consumed before reaching chart navigation`);
}
assert.equal(parentActions, 0, 'annotation navigation must never also pan, zoom, or jump the chart');
const unrelated = event('Tab');
focused = null;
env.onAnnotationKeyDown(unrelated, 0);
assert.equal(focused, null, 'Tab leaves normal browser focus navigation available');
assert.ok(!unrelated.prevented && !unrelated.stopped);
const signal = { label: 'Historical setup' };
for (const key of ['Enter', ' ']) {
  const e = event(key);
  env.onSignalKeyDown(e, 1, signal);
  assert.equal(selected, signal);
  assert.ok(e.prevented && e.stopped, 'signal activation must remain isolated from chart shortcuts');
}

console.log("MICROCHART ANNOTATION FOCUS PASS: roving evidence markers remain keyboard reachable with a visible chart-skin focus ring.");
