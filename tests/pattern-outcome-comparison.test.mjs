import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { build } = require("esbuild");
const result = await build({ stdin: { contents: `export {patternOutcomeComparison} from './src/lib/patternOutcomeComparison.ts'; export {PatternOutcomeComparison} from './src/components/PatternOutcomeComparison.tsx'; export {patternInspectionWindow} from './src/lib/patternInspectionWindow.ts';`, resolveDir: app }, bundle: true, format: "cjs", platform: "node", jsx: "automatic", external: ["react", "react/jsx-runtime"], write: false, logLevel: "silent" });
const module = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(require, module, module.exports);
const { patternOutcomeComparison: compare, PatternOutcomeComparison, patternInspectionWindow: inspect } = module.exports;
const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const base = Array.from({ length: 100 }, (_, i) => ({ t: new Date(epoch + i * 300_000).toISOString(), o: 100, h: 101, l: 99, c: 100, closed: true }));
const tape = (...future) => [...base, ...future.map((fields, i) => ({ ...base[0], t: new Date(epoch + (100 + i) * 300_000).toISOString(), ...fields }))];
const view = (bars, reads = "bullish", geometry = true, mode = "setup") => inspect(bars, base[99].t, reads, geometry, mode, undefined, epoch + 200 * 300_000);
const render = selected => renderToStaticMarkup(React.createElement(PatternOutcomeComparison, { view: selected }));

test("an agreeing next close can coexist with invalidation first", () => {
  const selected = view(tape({ h: 102, l: 97, c: 101 }));
  const receipt = compare(selected);
  assert.equal(receipt.state, "BOTH_AVAILABLE"); assert.equal(receipt.nextBar, "UP"); assert.equal(receipt.nextBarAgreement, "MATCH"); assert.equal(receipt.barrierState, "INVALIDATION_FIRST"); assert.equal(receipt.barrierResolution, "RESOLVED");
  assert.match(receipt.explanation, /agrees.*yet invalidation was touched first/); assert.match(render(selected), /data-next-bar-agreement="MATCH"/); assert.match(render(selected), /data-barrier-outcome="INVALIDATION_FIRST"/);
});

test("an opposing next close can coexist with target first", () => {
  const selected = view(tape({ h: 105, l: 99, c: 99.5 })); const receipt = compare(selected);
  assert.equal(receipt.nextBarAgreement, "OPPOSED"); assert.equal(receipt.barrierState, "TARGET_FIRST"); assert.equal(receipt.observedBars, 1); assert.equal(receipt.horizon, 24); assert.equal(receipt.resolvedAt, selected.study.resolvedAt); assert.match(receipt.explanation, /opposes.*yet the target was touched first/);
});

test("same-candle touches, incomplete paths and timeout never acquire a known first touch", () => {
  for (const [bars, state] of [[tape({ h: 105, l: 97, c: 101 }), "AMBIGUOUS"], [tape({ h: 102, l: 99, c: 101 }), "INCOMPLETE"], [tape(...Array.from({ length: 24 }, () => ({ h: 102, l: 99, c: 101 }))), "TIMEOUT"]]) {
    const receipt = compare(view(bars)); assert.equal(receipt.nextBarAgreement, "MATCH"); assert.equal(receipt.barrierState, state); assert.equal(receipt.barrierResolution, "UNRESOLVED"); assert.match(receipt.explanation, /remains unresolved/);
  }
});

test("short, flat and neutral setup identities retain their own meaning", () => {
  assert.equal(compare(view(tape({ c: 99.5 }), "bearish")).nextBarAgreement, "MATCH"); assert.equal(compare(view(tape({ c: 100 }))).nextBarAgreement, "FLAT"); const neutral = compare(view(tape({ c: 100.5 }), "neutral")); assert.equal(neutral.nextBarAgreement, "NEUTRAL"); assert.equal(neutral.barrierResolution, "WITHHELD"); assert.match(neutral.nextBarAgreementLabel, /no directional hit claim/);
});

test("unverified geometry and missing, forming, invalid or gapped H+1 remain explicit", () => {
  const nextOnly = compare(view(tape({ c: 100.5 }), "bullish", false)); assert.equal(nextOnly.state, "NEXT_BAR_ONLY"); assert.equal(nextOnly.barrierState, null); assert.equal(nextOnly.barrierResolution, "WITHHELD");
  for (const bars of [base, tape({ closed: false }), tape({ h: NaN }), tape({ t: new Date(epoch + 101 * 300_000).toISOString() })]) { const receipt = compare(view(bars, "bullish", false)); assert.equal(receipt.state, "UNAVAILABLE"); assert.equal(receipt.nextBar, null); assert.equal(receipt.barrierState, null); assert.match(receipt.explanation, /No next-bar direction.*is inferred/); }
});

test("context mode hides precomputed future observations without reading them", () => {
  const selected = view(tape({ h: 105, c: 101 }), "bullish", true, "context"); assert.equal(selected.mode, "context"); assert.equal(selected.outcome, "UP"); assert.equal(selected.study.state, "TARGET_FIRST"); const receipt = compare(selected);
  assert.equal(receipt.state, "WITHHELD_CONTEXT"); assert.equal(receipt.nextBar, null); assert.equal(receipt.barrierState, null); assert.equal(receipt.resolvedAt, null); assert.equal(receipt.observedBars, null); const html = render(selected); assert.match(html, /hidden in context mode/); assert.match(html, /switch to setup or outcome path/); assert.doesNotMatch(html, /Target touched first|Agrees with setup direction|bars observed/); assert.ok(!html.includes(selected.study.resolvedAt));
  const contextOnly = { mode: "context", get outcome() { throw Error("future H+1 read"); }, get study() { throw Error("future barrier read"); } }; assert.equal(compare(contextOnly).state, "WITHHELD_CONTEXT");
});

test("comparison renders authority and taxonomy limits without changing any receipt", () => {
  const selected = view(tape({ h: 105, c: 101 })); const before = JSON.stringify(selected); const html = render(selected); assert.equal(JSON.stringify(selected), before); assert.match(html, /Selected occurrence outcome comparison/); assert.match(html, /Raw H\+1 direction/); assert.match(html, /separate ATR flat band/); assert.match(html, /local descriptive policy/); assert.match(html, /SHADOW_ONLY \/ NO_DECISION/); assert.match(html, /live_apply_allowed=false/); assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/); assert.doesNotMatch(html, /NaN|Infinity/); const inspector = readFileSync(app + "src/components/ChartPatternInspector.tsx", "utf8"); assert.match(inspector, /<PatternOutcomeComparison view=\{view\}/);
});
