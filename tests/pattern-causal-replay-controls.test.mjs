import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const React = require("react");
const { build } = require("esbuild");
const bundled = await build({
  stdin: {
    contents: "export { PatternCausalReplayControls } from './src/components/PatternCausalReplayControls.tsx'; export { ChartPatternInspector } from './src/components/ChartPatternInspector.tsx';",
    resolveDir: app,
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  external: ["react", "react/jsx-runtime"],
  write: false,
  logLevel: "silent",
  loader: { ".css": "empty" },
});
function load(react = React) {
  const module = { exports: {} };
  new Function("require", "module", "exports", bundled.outputFiles[0].text)(name => name === "react" ? react : require(name), module, module.exports);
  return module.exports;
}
const { PatternCausalReplayControls } = load();

const collect = node => !node || typeof node !== "object"
  ? []
  : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];
const text = node => node == null || typeof node === "boolean"
  ? ""
  : typeof node !== "object"
    ? String(node)
    : React.Children.toArray(node.props?.children).map(text).join("");
const buttons = tree => collect(tree).filter(node => node.type === "button");
const button = (tree, label) => buttons(tree).find(node => node.props["aria-label"] === label || text(node) === label);

const replay = {
  revealedIndex: 21,
  anchorIndex: 20,
  revealedTime: "2026-11-10T01:45:00.000Z",
  canStepBackward: true,
  canStepForward: true,
  view: { mode: "outcome" },
};

test("causal replay controls expose an accessible toggle and invoke every action", () => {
  const calls = { toggle: 0, previous: 0, next: 0, reset: 0 };
  const props = {
    enabled: true,
    replay,
    onToggle: () => calls.toggle++,
    onPrevious: () => calls.previous++,
    onNext: () => calls.next++,
    onReset: () => calls.reset++,
  };
  const tree = PatternCausalReplayControls(props);
  const toggle = button(tree, "Exit candle reveal");
  assert.equal(toggle.props.type, "button");
  assert.equal(toggle.props["aria-pressed"], true);
  button(tree, "Previous causal bar").props.onClick();
  button(tree, "Next causal bar").props.onClick();
  button(tree, "Reset to setup close").props.onClick();
  toggle.props.onClick();
  assert.deepEqual(calls, { toggle: 1, previous: 1, next: 1, reset: 1 });
  const status = collect(tree).find(node => node.props?.role === "status");
  assert.equal(status.props["aria-live"], "polite");
  assert.equal(status.props["aria-atomic"], "true");
  assert.match(text(status), /1 of at most 24 post-setup candles revealed/);
  assert.match(text(tree), /Later candles and retrospective statistics stay hidden/);
  assert.match(text(tree), /OHLC does not establish intrabar order or fills/);
});

test("unavailable and endpoint receipts disable only impossible navigation", () => {
  const unavailable = PatternCausalReplayControls({
    enabled: true, replay: null,
    onToggle() {}, onPrevious() {}, onNext() {}, onReset() {},
  });
  assert.equal(button(unavailable, "Previous causal bar").props.disabled, true);
  assert.equal(button(unavailable, "Next causal bar").props.disabled, true);
  assert.match(text(unavailable), /reveal unavailable/);

  const endpoint = PatternCausalReplayControls({
    enabled: true,
    replay: { ...replay, revealedIndex: 44, canStepBackward: true, canStepForward: false },
    onToggle() {}, onPrevious() {}, onNext() {}, onReset() {},
  });
  assert.equal(button(endpoint, "Previous causal bar").props.disabled, false);
  assert.equal(button(endpoint, "Next causal bar").props.disabled, true);
  const off = PatternCausalReplayControls({ enabled: false, replay: null, onToggle() {}, onPrevious() {}, onNext() {}, onReset() {} });
  assert.equal(button(off, "Reveal one bar at a time").props["aria-pressed"], false);
  assert.equal(buttons(off).length, 1, "future navigation is absent while replay is off");
});

test("Vietnamese reveal controls localize buttons, accessibility labels and the live status", () => {
  const props = {
    locale: "vi", enabled: false, replay: null,
    onToggle() {}, onPrevious() {}, onNext() {}, onReset() {},
  };
  const off = PatternCausalReplayControls(props);
  assert.equal(text(buttons(off)[0]), "Hi\u1ec7n t\u1eebng n\u1ebfn m\u1ed9t");
  assert.equal(off.props["aria-label"], "Ph\u00e1t l\u1ea1i t\u1eebng n\u1ebfn");

  const active = PatternCausalReplayControls({ ...props, enabled: true, replay });
  assert.deepEqual(buttons(active).map(text), ["Tho\u00e1t ch\u1ebf \u0111\u1ed9 ph\u00e1t l\u1ea1i", "N\u1ebfn tr\u01b0\u1edbc", "N\u1ebfn ti\u1ebfp theo", "V\u1ec1 n\u1ebfn thi\u1ebft l\u1eadp"]);
  assert.deepEqual(buttons(active).slice(1).map(node => node.props["aria-label"]), ["L\u00f9i v\u1ec1 n\u1ebfn tr\u01b0\u1edbc", "Ti\u1ebfn \u0111\u1ebfn n\u1ebfn ti\u1ebfp theo", "V\u1ec1 th\u1eddi \u0111i\u1ec3m \u0111\u00f3ng n\u1ebfn thi\u1ebft l\u1eadp"]);
  const status = collect(active).find(node => node.props?.role === "status");
  assert.match(text(status), /\u0110\u00e3 hi\u1ec7n 1 tr\u00ean t\u1ed1i \u0111a 24 n\u1ebfn/);
  assert.ok(text(status).includes(replay.revealedTime), "retains UTC candle identity");
});

const epoch = Date.UTC(2026, 0, 5);
const bars = Array.from({ length: 100 }, (_, i) => ({ t: new Date(epoch + i * 300_000).toISOString(), o: 100, h: 101, l: 99, c: 100 + (i % 3) / 10, closed: true }));
const propsFor = (index = 50) => ({
  signal: { time: bars[index].t, reads: "bullish", label: "engulfing", conceptId: "named_candle:engulfing", annotationKind: "named_candle", nextBarOutcome: "UP", measures: "Synthetic UI test only" },
  bars, knowledge: null, namedKnowledge: null,
  evidence: { hitRate: .6, occurrences: 5, evaluated: 10, skipped: 0, long: { hitRate: .6, occurrences: 5 }, short: { hitRate: null, occurrences: 0 } },
  occurrences: bars.slice(40, 60).map(bar => ({ time: bar.t })),
  sourceLabel: "Synthetic UI test tape", allowGeometry: true,
  onNavigate() {}, onShowOnChart() {}, onClose() {},
});
const child = (tree, name) => collect(tree).find(node => node.type?.name === name);
function mount(props) {
  let cursor = 0, pending = [];
  const cells = [];
  const { ChartPatternInspector } = load({ ...React,
    useId() { return `replay-ui-${cursor++}`; },
    useMemo(fn) { return fn(); },
    useRef(initial) { const i = cursor++; cells[i] ??= { current: initial }; return cells[i]; },
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === "function" ? initial() : initial; return [cells[i], value => { cells[i] = typeof value === "function" ? value(cells[i]) : value; }]; },
    useEffect(effect, deps) { const i = cursor++; const prior = cells[i]; if (!prior || deps.some((value, j) => !Object.is(value, prior[j]))) pending.push(effect); cells[i] = deps; },
  });
  const render = () => { cursor = 0; return ChartPatternInspector(props); };
  const flush = () => {
    const previous = globalThis.document;
    globalThis.document = { activeElement: null, addEventListener() {}, removeEventListener() {} };
    try { const effects = pending; pending = []; for (const effect of effects) effect(); }
    finally { globalThis.document = previous; }
    return render();
  };
  return { render, flush, update(next) { props = next; return render(); } };
}
const replayControl = tree => child(tree, "PatternCausalReplayControls");
const chart = tree => child(tree, "PatternInspectionChart");
const assertHidden = tree => {
  assert.doesNotMatch(text(tree), /Historical evidence|next-bar hit rate|This endpoint's observed H\+1 class/);
  assert.equal(child(tree, "PatternBarrierEvidence"), undefined);
  assert.equal(child(tree, "NamedCandleHistoryEvidence"), undefined);
};

test("inspector steps, rewinds and resets a causal prefix while hiding retrospective evidence", () => {
  const mounted = mount(propsFor());
  mounted.render(); let tree = mounted.flush();
  assert.equal(chart(tree).props.view.mode, "setup", "mounting preserves the default setup view");
  assert.match(text(tree), /Historical evidence/);
  replayControl(tree).props.onToggle(); tree = mounted.render();
  assert.equal(replayControl(tree).props.enabled, true);
  assert.equal(chart(tree).props.view.rows.at(-1).t, bars[50].t);
  assert.equal(chart(tree).props.view.outcome, null);
  assertHidden(tree);
  replayControl(tree).props.onNext(); tree = mounted.render();
  assert.equal(chart(tree).props.view.rows.at(-1).t, bars[51].t);
  assertHidden(tree);
  replayControl(tree).props.onPrevious(); tree = mounted.render();
  assert.equal(chart(tree).props.view.rows.at(-1).t, bars[50].t);
  replayControl(tree).props.onNext(); tree = mounted.render();
  replayControl(tree).props.onReset(); tree = mounted.render();
  assert.equal(chart(tree).props.view.rows.at(-1).t, bars[50].t);
  assert.equal(chart(tree).props.view.outcome, null);
  button(tree, "Setup").props.onClick(); tree = mounted.render();
  assert.equal(chart(tree).props.view.mode, "setup");
  assert.equal(chart(tree).props.view.outcome, null);
  assert.equal(replayControl(tree).props.replay.canStepForward, false);
  button(tree, "Outcome path").props.onClick(); tree = mounted.render();
  replayControl(tree).props.onToggle(); tree = mounted.render();
  assert.equal(replayControl(tree).props.enabled, false);
  assert.equal(chart(tree).props.view.mode, "setup", "exiting reveal returns to Setup");
  assert.match(text(tree), /Historical evidence/);
  assert.ok(child(tree, "PatternBarrierEvidence"));
});

test("occurrence changes outside reveal reset Outcome path to Setup before effects", () => {
  const mounted = mount(propsFor());
  let tree = mounted.render(); tree = mounted.flush();
  button(tree, "Outcome path").props.onClick(); tree = mounted.render();
  assert.equal(chart(tree).props.view.mode, "outcome");
  tree = mounted.update(propsFor(45));
  assert.equal(chart(tree).props.view.mode, "setup");
  tree = mounted.flush();
  assert.equal(chart(tree).props.view.mode, "setup");
});

test("switching occurrence or semantic receipt never exposes stale replay on the first render", () => {
  for (const nextProps of [
    propsFor(45), propsFor(55),
    { ...propsFor(), signal: { ...propsFor().signal, conceptId: "named_candle:hammer" } },
    { ...propsFor(), signal: { ...propsFor().signal, reads: "bearish" } },
    { ...propsFor(), signal: { ...propsFor().signal, score: .75 } },
    { ...propsFor(), allowGeometry: false },
  ]) {
    const mounted = mount(propsFor());
    mounted.render(); let tree = mounted.flush();
    replayControl(tree).props.onToggle(); tree = mounted.render();
    replayControl(tree).props.onNext(); tree = mounted.render();
    assert.equal(chart(tree).props.view.rows.at(-1).t, bars[51].t);
    tree = mounted.update(nextProps);
    assert.equal(replayControl(tree).props.enabled, true, "reveal stays enabled through identity changes");
    assert.equal(chart(tree).props.view.rows.at(-1).t, nextProps.signal.time, "first render uses the new anchor, before reset effects");
    assert.equal(chart(tree).props.view.outcome, null);
    assertHidden(tree);
    tree = mounted.flush();
    assert.equal(chart(tree).props.view.rows.at(-1).t, nextProps.signal.time);
    assertHidden(tree);
  }
});

test("replay controls remain usable at narrow inspector widths with visible focus", () => {
  const css = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/chart-pattern-inspector.css", import.meta.url), "utf8");
  assert.match(css, /\.pattern-causal-replay-actions\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.pattern-causal-replay-actions button\{min-width:0;min-height:34px/);
  assert.match(css, /\.chart-pattern-inspector button:focus-visible\{outline:2px solid #eee/);
  assert.match(css, /@media\(max-width:640px\)\{\.chart-pattern-inspector\{/);
});

test("inspector bookmarks save the current causal identity and restore exact reveal without aggregate evidence", () => {
  const props = { ...propsFor(), bookmarkScope: "test-account:alias" };
  const mounted = mount(props);
  mounted.render(); let tree = mounted.flush();
  const controls = tree => child(tree, "PatternReplayBookmarkControls");
  assert.equal(controls(tree).props.current, null);
  replayControl(tree).props.onToggle(); tree = mounted.render();
  replayControl(tree).props.onNext(); tree = mounted.render();
  const saved = controls(tree).props.current;
  assert.equal(saved.occurrenceTime, bars[50].t);
  assert.equal(saved.revealedTime, bars[51].t);
  assert.equal(saved.mode, "outcome");
  assert.deepEqual(Object.keys(saved), ["version", "occurrenceTime", "conceptId", "reads", "mode", "revealedTime", "authority", "live_apply_allowed"]);
  replayControl(tree).props.onToggle(); tree = mounted.render();
  controls(tree).props.onRestore(saved); tree = mounted.render();
  assert.equal(replayControl(tree).props.enabled, true);
  assert.equal(chart(tree).props.view.rows.at(-1).t, bars[51].t);
  assertHidden(tree);
  assert.match(text(tree), /Saved replay restored from the exact/);
  const vietnamese = mounted.update({ ...props, locale: "vi" });
  assert.equal(replayControl(vietnamese).props.locale, "vi");
  assert.equal(controls(vietnamese).props.locale, "vi");
  assert.match(text(vietnamese), /\u0110\u00e3 kh\u00f4i ph\u1ee5c phi\u00ean ph\u00e1t l\u1ea1i/);
  tree = mounted.update(props);
  controls(tree).props.onRestore({ ...saved, occurrenceTime: bars[49].t }); tree = mounted.render();
  assert.match(text(tree), /No substitute occurrence selected/);
  assert.equal(chart(tree).props.view.rows.at(-1).t, bars[51].t, "failed restore leaves current replay intact");
  button(tree, "Setup").props.onClick(); tree = mounted.render();
  assert.equal(controls(tree).props.current.revealedTime, bars[50].t);
});

test("bookmark restore can select an exact different retained occurrence without reset effects erasing the reveal", () => {
  const target = propsFor(45).signal;
  let selected = null;
  const props = { ...propsFor(), bookmarkScope: "test-account:alias", onResolveReplayBookmark: () => target, onRestoreReplaySignal: signal => { selected = signal; } };
  const mounted = mount(props);
  mounted.render(); let tree = mounted.flush();
  const bookmark = { version: "pattern-replay-bookmark/1", occurrenceTime: target.time, conceptId: target.conceptId, reads: target.reads, mode: "outcome", revealedTime: bars[47].t, authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false };
  child(tree, "PatternReplayBookmarkControls").props.onRestore(bookmark);
  assert.equal(selected, target);
  tree = mounted.update({ ...props, signal: selected });
  assert.equal(chart(tree).props.view.rows.at(-1).t, bars[47].t);
  assertHidden(tree);
  tree = mounted.flush();
  assert.equal(chart(tree).props.view.rows.at(-1).t, bars[47].t);
});

