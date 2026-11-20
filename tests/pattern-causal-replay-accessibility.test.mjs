import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// This audit covers the replay receipt and the existing read-only comparison
// surface. Native toolbar action, endpoint and responsive checks live in
// pattern-causal-replay-controls.test.mjs.
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const React = require("react");
const { build } = require("esbuild");
const bundled = await build({
  stdin: {
    contents: "export { patternCausalReplay } from './src/lib/patternCausalReplay.ts'; export { PatternOutcomeComparison } from './src/components/PatternOutcomeComparison.tsx';",
    resolveDir: app,
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  external: ["react", "react/jsx-runtime"],
  write: false,
  logLevel: "silent",
});
const module = { exports: {} };
new Function("require", "module", "exports", bundled.outputFiles[0].text)(require, module, module.exports);
const { patternCausalReplay, PatternOutcomeComparison } = module.exports;
const collect = node => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];
const text = node => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : React.Children.toArray(node.props?.children).map(text).join("");

const start = Date.UTC(2026, 10, 10, 0, 0);
const bars = Array.from({ length: 45 }, (_, i) => ({
  t: new Date(start + i * 300_000).toISOString(),
  o: 100,
  h: 101,
  l: 99,
  c: i === 21 ? 101 : 100,
  closed: true,
}));
const selected = bars[20].t;
const nowMs = start + bars.length * 300_000 + 300_000;
const replay = (mode, revealedTime) => patternCausalReplay(bars, selected, "bullish", true, { mode, revealedTime, nowMs });

for (const [mode, revealedTime] of [["setup", bars[20].t], ["context", bars[44].t], ["outcome", bars[21].t]]) {
  const receipt = replay(mode, revealedTime);
  assert.equal(receipt.state, "AVAILABLE", `${mode} receipt is available`);
  assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION");
  assert.equal(receipt.live_apply_allowed, false);
  assert.ok(receipt.boundaries.context.endTime, `${mode} has a causal context boundary`);
  const tree = PatternOutcomeComparison({ view: receipt.view });
  const statuses = collect(tree).filter(node => node.props?.role === "status");
  assert.equal(statuses.length, 1, `${mode} exposes one atomic live summary`);
  assert.equal(statuses[0].props["aria-live"], "polite");
  assert.equal(statuses[0].props["aria-atomic"], "true");
  assert.ok(text(statuses[0]).length < 180, `${mode} live summary stays concise`);
  assert.equal(collect(tree).some(node => node.type === "button" || node.props?.onClick || node.props?.onSubmit), false,
    "the replay comparison remains an observation rather than a control");
  assert.match(text(tree), /SHADOW_ONLY \/ NO_DECISION.*live_apply_allowed=false/);
  if (mode === "setup" || mode === "context") {
    assert.equal(receipt.view.outcome, null, `${mode} hides adjacent future direction`);
    assert.equal(receipt.view.study, null, `${mode} hides future barrier study`);
    assert.doesNotMatch(text(tree), /UP|DOWN|TARGET_FIRST|INVALIDATION_FIRST/);
  } else {
    assert.equal(receipt.view.outcome, "UP", "outcome mode reveals only the next closed bar");
    assert.match(text(tree), /Raw H\+1 direction/);
  }
}

const setup = replay("setup", bars[20].t);
const outcomeStart = replay("outcome", bars[20].t);
const next = replay("outcome", bars[21].t);
assert.equal(setup.canStepForward, false, "setup mode remains frozen at the selected close");
assert.equal(setup.canStepBackward, false, "setup mode has no outcome cursor to rewind");
assert.equal(outcomeStart.canStepForward, true, "outcome cursor can advance one causal bar");
assert.equal(next.canStepBackward, true, "advanced cursor can step backward");
assert.equal(next.boundaries.outcome.endTime, new Date(Date.parse(bars[21].t) + 300_000).toISOString(), "outcome boundary ends at the revealed candle close");

console.log("PATTERN CAUSAL REPLAY ACCESSIBILITY PASS: receipt preserves read-only authority, setup and context withhold future observations, outcome status is concise and atomic. Native toolbar checks are separate.");
