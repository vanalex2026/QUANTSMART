import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const React = require("react"), { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: `export {PatternInspectionChart} from './src/components/PatternInspectionChart.tsx'; export {patternInspectionWindow} from './src/lib/patternInspectionWindow.ts'; export {patternSetupTimeline} from './src/lib/patternSetupTimeline.ts';`, resolveDir: app },
  bundle: true, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react/jsx-runtime"], write: false, logLevel: "silent",
});
function load(react = React) {
  const module = { exports: {} };
  new Function("require", "module", "exports", bundled.outputFiles[0].text)(name => name === "react" ? react : require(name), module, module.exports);
  return module.exports;
}
const { patternInspectionWindow: inspect, patternSetupTimeline } = load();
const epoch = Date.parse("2026-01-05T00:00:00Z");
const bars = Array.from({ length: 130 }, (_, i) => ({ t: new Date(epoch + i * 300_000).toISOString(), o: 4000, h: 4001, l: 3999, c: 4000, closed: true }));
bars[70] = { ...bars[70], h: 4050 };
bars[99] = { ...bars[99], h: 4003, c: 4002 };
const setup = { kind: "PATTERN_BREAK", direction: "UP", confirmationTime: bars[99].t, protectionReference: 3980, breakoutLevel: 4001,
  contextBoundary: 4001, contextStart: bars[86].t, buildupTimes: [bars[96].t, bars[97].t, bars[98].t], boundaryTouchTimes: [bars[96].t], signalBarTime: bars[98].t };
const propsFor = (mode = "outcome") => ({ label: "Pattern break", setup, view: inspect(bars, setup.confirmationTime, "bullish", true, mode, setup),
  setupTimeline: patternSetupTimeline(setup, bars, setup.confirmationTime, true, epoch + bars.length * 300_000) });
const collect = node => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];
const text = node => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : React.Children.toArray(node.props?.children).map(text).join("");
const nodes = (tree, attr) => collect(tree).filter(node => node.props?.[attr] !== undefined);
const node = (tree, attr, value) => nodes(tree, attr).find(item => value === undefined || item.props[attr] === value);
const pressed = (tree, attr) => nodes(tree, attr).filter(item => item.props["aria-pressed"]).map(item => item.props[attr]);
const selectedLines = tree => nodes(tree, "data-level-line").filter(item => item.props["data-level-selected"]).map(item => item.props["data-level-line"]);
function mount(props) {
  let cursor = 0, effects = [];
  const cells = [];
  const { PatternInspectionChart } = load({ ...React, useEffect(effect, dependencies) {
    const index = cursor++, previous = cells[index];
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) effects.push(effect);
    cells[index] = dependencies;
  }, useId: () => `level-readout-${cursor++}`, useMemo: fn => fn(),
    useRef: initial => { const index = cursor++; cells[index] ??= { current: initial }; return cells[index]; },
    useState: initial => { const index = cursor++; if (!(index in cells)) cells[index] = initial; return [cells[index], value => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }]; },
  });
  const render = () => { cursor = 0; effects = []; const tree = PatternInspectionChart(props); for (const effect of effects) effect(); return tree; };
  return { render, update(next) { props = next; return render(); } };
}

test("native legend and rail controls select exactly one evidence role even at coincident prices", () => {
  const ids = ["atr-entry", "atr-target", "atr-invalidation", "technical-protection", "technical-obstacle", "setup-break", "setup-protection"];
  for (const mode of ["setup", "outcome", "context"]) {
    const props = propsFor(mode), before = JSON.stringify(props), mounted = mount(props);
    let tree = mounted.render();
    assert.deepEqual(nodes(tree, "data-level-control").map(item => item.props["data-level-control"]), ids);
    assert.deepEqual(pressed(tree, "data-level-control"), []);
    const geometry = nodes(tree, "data-level-line").map(item => [item.props["data-level-line"], item.props.x1, item.props.x2, item.props.y1, item.props.y2]);
    for (const id of ids) {
      const control = node(tree, "data-level-control", id);
      assert.equal(control.type, "button"); assert.equal(control.props.type, "button");
      control.props.onClick(); tree = mounted.render();
      assert.deepEqual(pressed(tree, "data-level-control"), [id]);
      assert.deepEqual(pressed(tree, "data-level-rail-control"), [id]);
      assert.deepEqual(selectedLines(tree), [id]);
      const readout = node(tree, "data-inspected-level", id);
      assert.equal(readout.props["aria-live"], "polite"); assert.equal(readout.props["aria-atomic"], "true");
      assert.equal(control.props["aria-describedby"], readout.props.id);
      assert.match(text(readout), /no (?:executable |order or )?(?:entry or )?fill|not an executable fill/);
      assert.deepEqual(nodes(tree, "data-level-line").map(item => [item.props["data-level-line"], item.props.x1, item.props.x2, item.props.y1, item.props.y2]), geometry);
      const rail = node(tree, "data-level-rail-control", id);
      assert.equal(rail.type, "button"); assert.match(rail.props["aria-label"], /Inspect/);
      rail.props.onClick(); tree = mounted.render();
      assert.deepEqual(pressed(tree, "data-level-control"), [], "same role toggles off through either control");
      assert.deepEqual(selectedLines(tree), []);
    }
    const tp = node(tree, "data-inspection-level", "technical-protection"), sp = node(tree, "data-inspection-level", "setup-protection");
    assert.equal(tp.props["data-level-price"], sp.props["data-level-price"], "fixture exercises equal exact prices");
    node(tree, "data-level-rail-control", "technical-protection").props.onClick(); tree = mounted.render();
    assert.deepEqual(selectedLines(tree), ["technical-protection"]);
    assert.match(text(node(tree, "data-inspected-level")), /Causal technical-study protection/);
    node(tree, "data-level-control", "setup-protection").props.onClick(); tree = mounted.render();
    assert.deepEqual(selectedLines(tree), ["setup-protection"]);
    assert.match(text(node(tree, "data-inspected-level")), /Selected setup technical protection reference/);
    assert.equal(JSON.stringify(props), before, "selection cannot mutate any evidence or study");
  }
});

test("changed occurrence or evidence clears immediately and cannot resurrect a stale selection", () => {
  const original = propsFor();
  const cases = [
    { ...original, label: "Different concept" },
    { ...original, view: inspect(bars, bars[100].t, "bullish", true, "outcome", setup) },
    { ...original, view: { ...original.view, anchor: { ...original.view.anchor, o: 3999.5 } } },
    { ...original, setup: { ...setup, boundaryTouchTimes: [bars[97].t] } },
    { ...original, view: { ...original.view, technicalStudy: { ...original.view.technicalStudy, direction: "DOWN" } } },
    { ...original, view: { ...original.view, study: { ...original.view.study, target: 9999 } } },
  ];
  for (const changed of cases) {
    const mounted = mount(original);
    node(mounted.render(), "data-level-control", "technical-protection").props.onClick();
    assert.deepEqual(selectedLines(mounted.render()), ["technical-protection"]);
    let tree = mounted.update(changed);
    assert.deepEqual(selectedLines(tree), [], "first changed render must hide old highlight");
    assert.deepEqual(pressed(tree, "data-level-control"), []);
    assert.equal(nodes(tree, "data-inspected-level").length, 0);
    tree = mounted.update(original);
    assert.deepEqual(selectedLines(tree), [], "restoring old history cannot restore cleared selection");
  }
});

test("equal receipt refresh preserves selection; evidence gates also gate interactive controls", () => {
  const props = propsFor(), mounted = mount(props);
  node(mounted.render(), "data-level-control", "atr-target").props.onClick();
  mounted.render();
  assert.deepEqual(selectedLines(mounted.update(structuredClone(props))), ["atr-target"]);
  for (const changed of [
    { ...props, setup: undefined },
    { ...props, setup: { ...setup, breakoutLevel: 9999 } },
    { ...props, view: { ...props.view, technicalStudy: { ...props.view.technicalStudy, roomState: "WITHHELD" } } },
  ]) {
    const tree = mount(changed).render();
    assert.equal(nodes(tree, "data-level-control").some(item => item.props["data-level-control"].startsWith("technical-")), false);
    assert.equal(nodes(tree, "data-level-rail-control").some(item => item.props["data-level-rail-control"].startsWith("technical-")), false);
  }
  for (const direction of ["neutral", "bullish"]) {
    const withheld = { ...props, view: inspect(bars, setup.confirmationTime, direction, false, "setup", setup) };
    const tree = mount(withheld).render();
    assert.equal(nodes(tree, "data-level-control").length, 0);
    assert.equal(nodes(tree, "data-level-rail-control").length, 0);
  }
});

test("level selection leaves event controls, candle OHLC and plot keyboard behavior independent", () => {
  const props = propsFor(), mounted = mount(props);
  let tree = mounted.render();
  node(tree, "data-setup-event-control", "CLOSE_CONFIRMATION").props.onClick(); tree = mounted.render();
  node(tree, "data-level-control", "setup-break").props.onClick(); tree = mounted.render();
  assert.deepEqual(pressed(tree, "data-setup-event-control"), ["CLOSE_CONFIRMATION"]);
  assert.equal(node(tree, "data-inspected-candle").props["data-inspected-candle"], bars[99].t);
  let prevented = 0, stopped = 0;
  const region = collect(tree).find(item => item.props?.role === "region");
  region.props.onKeyDown({ key: "ArrowLeft", preventDefault() { prevented++; }, stopPropagation() { stopped++; } });
  tree = mounted.render();
  assert.equal(prevented, 1); assert.equal(stopped, 1);
  assert.equal(node(tree, "data-inspected-candle").props["data-inspected-candle"], bars[98].t);
  assert.deepEqual(pressed(tree, "data-setup-event-control"), []);
  assert.deepEqual(selectedLines(tree), ["setup-break"]);
  node(tree, "data-inspection-candle-time", bars[97].t).props.onPointerEnter(); tree = mounted.render();
  assert.equal(node(tree, "data-inspected-candle").props["data-inspected-candle"], bars[97].t);
  assert.deepEqual(selectedLines(tree), ["setup-break"]);
});

test("outside-range selection explains missing leader; rail width and wrapping/focus remain bounded", () => {
  const props = propsFor("setup"), mounted = mount({ ...props, view: { ...props.view, low: 3995, high: 4010 } });
  let tree = mounted.render();
  node(tree, "data-level-rail-control", "setup-protection").props.onClick(); tree = mounted.render();
  assert.match(text(node(tree, "data-inspected-level")), /Outside plotted price range; no on-plot leader/);
  const rail = node(tree, "data-inspection-level", "setup-protection");
  assert.equal(rail.props["data-level-outside-range"], true);
  assert.equal(collect(rail).some(item => item.type === "path"), false);
  const css = readFileSync(app + "src/components/chart-pattern-inspector.css", "utf8");
  assert.match(css, /\.pattern-inspection-level-rail\{width:108px;box-sizing:border-box/);
  assert.match(css, /\.pattern-inspection-axis-frame\{position:relative;flex:none/);
  assert.match(css, /\.pattern-inspection-level-key button\{[^}]*min-width:0[^}]*white-space:normal/);
  assert.match(css, /\.pattern-inspection-rail-control:focus-visible\{outline:2px solid #eee/);
  assert.match(css, /\.chart-pattern-inspector button:focus-visible\{outline:2px solid #eee/);
});
