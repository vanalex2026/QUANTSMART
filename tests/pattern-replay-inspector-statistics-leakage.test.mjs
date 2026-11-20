import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// The replay inspector must remain usable when its retrospective evidence is
// unavailable or deliberately unreadable.  This catches accidental eager reads
// of aggregate statistics while a causal prefix is active.
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const React = require("react");
const { build } = require("esbuild");
const bundled = await build({
  stdin: {
    contents: "export { ChartPatternInspector } from './src/components/ChartPatternInspector.tsx';",
    resolveDir: app,
  }, bundle: true, platform: "node", format: "cjs", jsx: "automatic",
  external: ["react", "react/jsx-runtime"], write: false, logLevel: "silent",
  loader: { ".css": "empty" },
});
const collect = node => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];
const text = node => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : React.Children.toArray(node.props?.children).map(text).join("");
const child = (tree, name) => collect(tree).find(node => node.type?.name === name);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 70 }, (_, i) => ({
  t: new Date(epoch + i * 300_000).toISOString(), o: 100, h: 101, l: 99, c: 100, closed: true,
}));
const index = 45;
const baseProps = {
  signal: { time: bars[index].t, reads: "bullish", label: "Synthetic pattern", conceptId: "pattern_break", annotationKind: "pattern", measures: "Synthetic UI test" },
  bars, knowledge: null, namedKnowledge: null,
  occurrences: bars.slice(40, 50).map(bar => ({ time: bar.t })), sourceLabel: "Synthetic retained tape", allowGeometry: true,
  bookmarkScope: "audit-scope", onNavigate() {}, onShowOnChart() {}, onClose() {},
};

function throwingEvidence() {
  return new Proxy({}, { get(_target, key) { throw new Error(`retrospective evidence read: ${String(key)}`); } });
}

function mount(input) {
  let cursor = 0, pending = [], cells = [];
  const hooksReact = {
    ...React,
    useId: () => `leakage-${cursor++}`,
    useMemo: fn => fn(),
    useRef: initial => { const i = cursor++; cells[i] ??= { current: initial }; return cells[i]; },
    useState: initial => { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === "function" ? initial() : initial; return [cells[i], value => { cells[i] = typeof value === "function" ? value(cells[i]) : value; }]; },
    useEffect: (effect, deps) => { const i = cursor++, prior = cells[i]; if (!prior || deps.some((value, j) => !Object.is(value, prior[j]))) pending.push(effect); cells[i] = deps; },
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", bundled.outputFiles[0].text)(name => name === "react" ? hooksReact : require(name), module, module.exports);
  const Component = module.exports.ChartPatternInspector;
  const render = () => { cursor = 0; return Component(input); };
  const flush = () => {
    const previous = globalThis.document;
    globalThis.document = { activeElement: null, addEventListener() {}, removeEventListener() {} };
    try { const effects = pending; pending = []; for (const effect of effects) effect(); }
    finally { globalThis.document = previous; }
    return render();
  };
  return { render, flush };
}

test("causal replay hides retrospective statistics without reading their payload", () => {
  const input = { ...baseProps, evidence: undefined, namedHistory: undefined };
  const mounted = mount(input);
  let tree = mounted.render(); tree = mounted.flush();
  assert.match(text(tree), /Historical evidence/);
  input.evidence = throwingEvidence(); input.namedHistory = throwingEvidence();
  input.signal = { ...input.signal, annotationKind: "named_candle" };
  Object.defineProperty(input.signal, "nextBarOutcome", { get() { throw new Error("retrospective endpoint class read"); } });
  const controls = child(tree, "PatternCausalReplayControls");
  controls.props.onToggle();
  tree = mounted.render();
  assert.equal(controls.props.enabled, false, "the prior tree remains immutable after the callback");
  const active = child(tree, "PatternCausalReplayControls");
  assert.equal(active.props.enabled, true);
  assert.doesNotMatch(text(tree), /Historical evidence|next-bar hit rate|PatternBarrierEvidence|NamedCandleHistoryEvidence/);
  assert.equal(child(tree, "PatternBarrierEvidence"), undefined);
  assert.equal(child(tree, "NamedCandleHistoryEvidence"), undefined);
  active.props.onNext(); tree = mounted.render();
  assert.equal(child(tree, "PatternInspectionChart").props.view.rows.at(-1).t, bars[index + 1].t);
  assert.equal(child(tree, "PatternInspectionChart").props.view.outcome, "FLAT");
  assert.equal(child(tree, "PatternBarrierEvidence"), undefined);
});

test("saved outcome identity cannot carry statistics or future prices", async () => {
  const { build: bundle } = require("esbuild");
  const output = await bundle({ stdin: { contents: "export { resolvePatternReplayBookmark } from './src/lib/patternReplayBookmarkResolution.ts';", resolveDir: app }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
  const { resolvePatternReplayBookmark } = await import("data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64"));
  const nowMs = epoch + 70 * 300_000 + 300_000;
  const bookmark = { version: "pattern-replay-bookmark/1", occurrenceTime: bars[index].t, conceptId: "pattern_break", reads: "bullish", mode: "outcome", revealedTime: bars[index + 1].t, authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false };
  const resolved = resolvePatternReplayBookmark(bookmark, baseProps.signal, bars, true, nowMs);
  assert.equal(resolved.state, "AVAILABLE");
  assert.equal(resolved.replay.view.outcome, "FLAT");
  assert.equal("evidence" in resolved, false);
  assert.equal("outcomes" in resolved.replay, false);
  assert.equal("statistics" in resolved.replay, false);
  assert.equal(resolved.replay.futureWithheld, true);
  const poisonedFuture = bars.map((bar, i) => {
    if (i <= index + 1) return bar;
    const future = { t: bar.t, closed: true };
    for (const key of ["o", "h", "l", "c"]) Object.defineProperty(future, key, { get() { throw new Error(`unrevealed future ${key} read`); } });
    return future;
  });
  const withoutFuturePrices = resolvePatternReplayBookmark(bookmark, baseProps.signal, poisonedFuture, true, nowMs);
  assert.equal(withoutFuturePrices.state, "AVAILABLE");
  assert.deepEqual(withoutFuturePrices.replay.view, resolved.replay.view, "unrevealed prices cannot alter the restored selected occurrence");
  for (const key of ["outcome", "statistics", "hitRate", "occurrences", "evaluated", "skipped", "long", "short", "interval95", "study", "resolvedAt", "exitIndex", "fills", "orders"]) {
    const invalid = resolvePatternReplayBookmark({ ...bookmark, [key]: 1 }, baseProps.signal, bars, true, nowMs);
    assert.equal(invalid.state, "UNAVAILABLE", key);
    assert.equal(invalid.reason, "INVALID_BOOKMARK_FIELDS", key);
    assert.equal("replay" in invalid, false, key);
  }
});

