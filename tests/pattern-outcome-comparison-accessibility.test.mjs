import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const React = require("react");
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: "export {PatternOutcomeComparison} from './src/components/PatternOutcomeComparison.tsx';", resolveDir: app },
  bundle: true, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react/jsx-runtime"], write: false, logLevel: "silent",
});
const module = { exports: {} };
new Function("require", "module", "exports", bundled.outputFiles[0].text)(require, module, module.exports);
const { PatternOutcomeComparison } = module.exports;
const collect = node => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];
const text = node => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : React.Children.toArray(node.props?.children).map(text).join("");

const component = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PatternOutcomeComparison.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/chart-pattern-inspector.css", import.meta.url), "utf8");

assert.match(component, /<section className="pattern-outcome-comparison" aria-label="Selected occurrence outcome comparison"/,
  "comparison must expose a named section for assistive technology");
assert.match(component, /<dl className="chart-pattern-inspector-prices">[\s\S]*<dt>Raw H\+1 direction<\/dt>[\s\S]*<dt>Local ATR barrier path<\/dt>/,
  "the two observations must retain native definition-list semantics and distinct labels");
assert.match(component, /className="pattern-outcome-comparison-status" role="status" aria-live="polite" aria-atomic="true"/,
  "selected-occurrence changes must have one concise polite atomic status announcement");
assert.doesNotMatch(component, /<button|onClick|onSubmit/,
  "comparison is observational and must not introduce an actionable control");
for (const view of [
  { direction: "UP", outcome: "UP", study: { state: "INVALIDATION_FIRST", observedBars: 3, horizon: 24, resolvedAt: "2026-01-01T00:15:00.000Z" } },
  { direction: "UP", outcome: "DOWN", study: { state: "AMBIGUOUS", observedBars: 1, horizon: 24, resolvedAt: "2026-01-01T00:05:00.000Z" } },
  { direction: "NEUTRAL", outcome: null, study: null },
]) {
  const tree = PatternOutcomeComparison({ view }), nodes = collect(tree);
  const status = nodes.filter(node => node.props?.role === "status");
  assert.equal(status.length, 1, "comparison exposes exactly one concise live summary");
  assert.equal(status[0].props["aria-live"], "polite");
  assert.equal(status[0].props["aria-atomic"], "true");
  assert.ok(text(status[0]).length < 180, "the live summary does not reread every source caveat");
  assert.equal(nodes.filter(node => node.type === "dt").length, 2);
  assert.equal(nodes.filter(node => node.type === "dd").length, 2);
  assert.match(text(tree), /SHADOW_ONLY \/ NO_DECISION.*live_apply_allowed=false/,
    "all available and unavailable states retain authority");
  assert.match(text(tree), /separate from PDF source setup meaning/,
    "local barriers retain the source-meaning distinction");
}
assert.match(styles, /\.pattern-outcome-comparison[^{}]*\{min-width:0\}/,
  "comparison section must be shrinkable inside the mobile inspector");
assert.match(styles, /\.pattern-outcome-comparison dd\{min-width:0;overflow-wrap:anywhere\}/,
  "long timestamps and unavailable labels must wrap instead of overflowing");
assert.match(styles, /\.pattern-outcome-comparison-status\{[^}]*overflow-wrap:anywhere/,
  "the live status must wrap at narrow widths");

console.log("PATTERN OUTCOME COMPARISON ACCESSIBILITY PASS: named native observations, atomic live status, mobile wrapping and read-only authority are retained.");
