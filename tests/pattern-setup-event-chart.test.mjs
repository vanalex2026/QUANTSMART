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
const result = await build({
  stdin: { contents: `export {PatternInspectionChart} from './src/components/PatternInspectionChart.tsx'; export {patternInspectionWindow} from './src/lib/patternInspectionWindow.ts'; export {patternSetupTimeline} from './src/lib/patternSetupTimeline.ts';`, resolveDir: app },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic", external: ["react", "react/jsx-runtime"], write: false, logLevel: "silent",
});
function load(react = React) {
  const module = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(name => name === "react" ? react : require(name), module, module.exports);
  return module.exports;
}
const { PatternInspectionChart, patternInspectionWindow, patternSetupTimeline } = load();
const epoch = Date.parse("2026-01-05T00:00:00Z");
const bars = Array.from({ length: 80 }, (_, i) => ({ t: new Date(epoch + i * 300_000).toISOString(), o: 100, h: 101, l: 99, c: 100, closed: true }));
bars[49] = { ...bars[49], h: 101.8, c: 100.4 };
bars[51] = { ...bars[51], h: 103, c: 102 };
bars[52] = { ...bars[52], h: 105, c: 104 };
function setupFor(kind = "PATTERN_BREAK") {
  return { kind, version: "test/1", direction: "UP", signalBarTime: bars[48].t, confirmationTime: bars[51].t, breakoutLevel: 101, protectionReference: 99,
    buildupTimes: [bars[46].t, bars[47].t, bars[48].t], boundaryTouchTimes: [bars[46].t], contextBoundary: 100,
    powerbarTime: bars[45].t, insideBarTimes: [bars[47].t, bars[48].t], originalBreakTime: bars[45].t,
    pullbackTimes: [bars[46].t, bars[47].t, bars[48].t], variant: "HANGING", emaAtSignal: 100,
    originTime: bars[30].t, peakTime: bars[40].t, correctionTimes: bars.slice(41, 49).map(row => row.t), turnTimes: bars.slice(46, 49).map(row => row.t), breakSequence: { kind: "FIRST_CLOSE_BREAK" } };
}
function propsFor(kind, mode = "setup") {
  const setup = setupFor(kind);
  return { label: kind, setup, view: patternInspectionWindow(bars, setup.confirmationTime, "bullish", true, mode, setup), setupTimeline: patternSetupTimeline(setup, bars, setup.confirmationTime, true, epoch + 80 * 300_000) };
}
const collect = node => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];
const content = node => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : React.Children.toArray(node.props?.children).map(content).join("");
const controls = tree => collect(tree).filter(node => node.props?.["data-setup-event-control"]);
const find = (tree, name) => collect(tree).find(node => node.props?.[name]);
function mount(props) {
  let cursor = 0;
  const cells = [];
  let effects = [];
  const api = load({ ...React, useEffect(effect, dependencies) {
    const index = cursor++, previous = cells[index];
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) effects.push(effect);
    cells[index] = dependencies;
  }, useId: () => "event-readout", useMemo: fn => fn(),
    useRef: initial => { const index = cursor++; cells[index] ??= { current: initial }; return cells[index]; },
    useState: initial => { const index = cursor++; if (!(index in cells)) cells[index] = initial; return [cells[index], value => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }]; },
  });
  const render = () => { cursor = 0; effects = []; const tree = api.PatternInspectionChart(props); for (const effect of effects) effect(); return tree; };
  let tree = render();
  const viewport = { clientWidth: 160, scrollLeft: 0 };
  find(tree, "aria-describedby").ref.current = viewport;
  return { render, viewport, tree, update(next) { props = next; return render(); } };
}

test("all four setup kinds expose four exact event controls in every mini-chart mode", () => {
  for (const kind of ["PATTERN_BREAK", "PATTERN_BREAK_COMBI", "PATTERN_BREAK_PULLBACK", "PULLBACK_REVERSAL"]) for (const mode of ["setup", "outcome", "context"]) {
    const props = propsFor(kind, mode);
    assert.equal(props.setupTimeline.state, "AVAILABLE");
    const html = renderToStaticMarkup(React.createElement(PatternInspectionChart, props));
    assert.equal((html.match(/data-setup-event-control=/g) || []).length, 4, `${kind} ${mode}`);
    for (const phrase of ["Signal", "Break observed", "Confirmation close", "Outcome origin", "Candle opens", "Actual M5 close", "confirmation candle opens", "OHLC observation, no entry or fill"]) assert.ok(html.includes(phrase), phrase);
    assert.ok(html.includes(bars[51].t));
    assert.ok(html.includes(bars[52].t), "close instant is shown explicitly even when the next candle is absent in context mode");
    assert.match(html, /height="236"/);
    assert.doesNotMatch(html, /data-setup-event-highlight=/, "render does not auto-select or imply an event action");
  }
});

test("event handlers scroll to exact candle, update OHLC and announce close/origin on the confirmation candle", () => {
  const props = propsFor("PATTERN_BREAK", "outcome");
  const mounted = mount(props);
  const expected = [48, 49, 51, 51];
  let closeScroll;
  for (let ordinal = 0; ordinal < 4; ordinal++) {
    let tree = mounted.render();
    const button = controls(tree)[ordinal];
    button.props.onClick();
    tree = mounted.render();
    const row = bars[expected[ordinal]], readout = find(tree, "data-inspected-candle");
    assert.equal(readout.props["data-inspected-candle"], row.t);
    assert.ok(content(readout).includes(`O ${row.o.toFixed(2)} H ${row.h.toFixed(2)}`));
    assert.ok(content(readout).includes(`L ${row.l.toFixed(2)} C ${row.c.toFixed(2)}`));
    assert.equal(readout.props["aria-live"], "polite");
    assert.equal(readout.props["aria-atomic"], "true");
    assert.deepEqual(controls(tree).map(node => node.props["aria-pressed"]), [0, 1, 2, 3].map(i => i === ordinal));
    const local = expected[ordinal] - props.view.from, width = Math.max(232, props.view.rows.length * 16 + 24), slot = (width - 24) / props.view.rows.length;
    assert.equal(mounted.viewport.scrollLeft, Math.max(0, 12 + (local + .5) * slot - mounted.viewport.clientWidth / 2));
    const highlight = find(tree, "data-setup-event-highlight");
    assert.equal(highlight.props["data-setup-event-candle"], row.t);
    assert.equal(collect(highlight).find(node => node.type === "rect").props.fill, "none");
    assert.equal(collect(highlight).find(node => node.type === "text").props.y, "230", "tag has its own lane below S/C at y211");
    if (ordinal >= 2) {
      assert.ok(content(readout).includes(`Actual M5 close ${bars[52].t} UTC; confirmation candle opens ${bars[51].t} UTC`));
      assert.notEqual(readout.props["data-inspected-candle"], bars[52].t, "close instant must never select the following candle");
      if (ordinal === 2) closeScroll = mounted.viewport.scrollLeft;
      else assert.equal(mounted.viewport.scrollLeft, closeScroll, "close and outcome origin share one candle position");
    }
  }
});

test("manual candle and keyboard navigation retain behavior and clear selected event semantics", () => {
  const props = propsFor("PATTERN_BREAK", "outcome");
  const mounted = mount(props);
  controls(mounted.tree)[2].props.onClick();
  let tree = mounted.render();
  collect(tree).find(node => node.props?.["data-inspection-candle-time"] === bars[49].t).props.onPointerEnter();
  tree = mounted.render();
  assert.ok(controls(tree).every(node => node.props["aria-pressed"] === false));
  assert.equal(find(tree, "data-inspected-candle").props["data-inspected-candle"], bars[49].t);
  assert.equal(find(tree, "data-setup-event-highlight"), undefined);
  for (const [key, expected] of [["ArrowRight", bars[50].t], ["ArrowLeft", bars[49].t], ["Home", props.view.rows[0].t], ["End", props.view.rows.at(-1).t]]) {
    let prevented = 0, stopped = 0;
    find(tree, "aria-describedby").props.onKeyDown({ key, preventDefault() { prevented++; }, stopPropagation() { stopped++; } });
    tree = mounted.render();
    assert.equal(find(tree, "data-inspected-candle").props["data-inspected-candle"], expected);
    assert.equal(prevented, 1); assert.equal(stopped, 1);
  }
});

test("same occurrence refresh preserves selected event and manual candle identity across prefix and retention shifts", () => {
  const full = propsFor("PATTERN_BREAK", "context");
  const short = { ...full, view: patternInspectionWindow(bars.slice(20), full.setup.confirmationTime, "bullish", true, "context", full.setup) };
  assert.equal(short.view.mode, full.view.mode);
  assert.notEqual(short.view.index - short.view.from, full.view.index - full.view.from);
  const mounted = mount(short);
  controls(mounted.tree)[2].props.onClick();
  let tree = mounted.render();
  assert.equal(find(tree, "data-inspected-candle").props["data-inspected-candle"], bars[51].t);
  tree = mounted.update(full);
  assert.equal(find(tree, "data-inspected-candle").props["data-inspected-candle"], bars[51].t);
  assert.equal(find(tree, "data-setup-event-highlight").props["data-setup-event-highlight"], "CLOSE_CONFIRMATION");
  assert.deepEqual(controls(tree).map(node => node.props["aria-pressed"]), [false, false, true, false]);
  collect(tree).find(node => node.props?.["data-inspection-candle-time"] === bars[45].t).props.onClick();
  tree = mounted.render();
  tree = mounted.update(short);
  assert.equal(find(tree, "data-inspected-candle").props["data-inspected-candle"], bars[45].t);
  assert.ok(controls(tree).every(node => node.props["aria-pressed"] === false));
  const secondsRows = { ...full, view: { ...full.view, rows: full.view.rows.map(row => ({ ...row, t: row.t.replace(".000Z", "Z") })) } };
  tree = mounted.update(secondsRows);
  assert.equal(find(tree, "data-inspected-candle").props["data-inspected-candle"], bars[45].t.replace(".000Z", "Z"));
});

test("an expired selected candle falls back to the anchor and does not return when old history is restored", () => {
  const full = propsFor("PATTERN_BREAK", "context");
  const mounted = mount(full);
  collect(mounted.tree).find(node => node.props?.["data-inspection-candle-time"] === bars[10].t).props.onClick();
  let tree = mounted.render();
  assert.equal(find(tree, "data-inspected-candle").props["data-inspected-candle"], bars[10].t);
  const retained = { ...full, view: patternInspectionWindow(bars.slice(20), full.setup.confirmationTime, "bullish", true, "context", full.setup) };
  tree = mounted.update(retained);
  assert.equal(find(tree, "data-inspected-candle").props["data-inspected-candle"], bars[51].t, "first refreshed render uses the anchor rather than another ordinal");
  assert.equal(find(tree, "data-setup-event-highlight"), undefined);
  tree = mounted.update(full);
  assert.equal(find(tree, "data-inspected-candle").props["data-inspected-candle"], bars[51].t, "expired selection is cleared instead of unexpectedly restored");
});

test("withheld, stale, mismatched and named-candle receipts expose no event controls or highlight", () => {
  const props = propsFor("PATTERN_BREAK");
  const cases = [
    { ...props, setup: undefined },
    { ...props, setupTimeline: undefined },
    { ...props, setupTimeline: { ...props.setupTimeline, state: "WITHHELD" } },
    { ...props, setup: { ...props.setup, direction: "DOWN" } },
    { ...props, setup: { ...props.setup, signalBarTime: bars[47].t } },
    { ...props, setupTimeline: { ...props.setupTimeline, milestones: props.setupTimeline.milestones.map(item => ({ ...item, candleTime: bars[50].t })) } },
    { ...props, view: { ...props.view, anchor: bars[52] } },
  ];
  for (const entry of cases) {
    const html = renderToStaticMarkup(React.createElement(PatternInspectionChart, entry));
    assert.doesNotMatch(html, /data-setup-event-control|data-setup-event-highlight|Inspect setup event candles/);
    assert.match(html, /height="216"/);
  }
});

test("inspector passes its memoized receipt; controls remain bounded and wrap at phone width", () => {
  const inspector = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/ChartPatternInspector.tsx", import.meta.url), "utf8");
  assert.match(inspector, /<PatternInspectionChart[^>]+setupTimeline=\{setupTimeline\}/);
  const chart = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PatternInspectionChart.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(chart, /patternSetupTimeline\(/, "hover and selection must not rerun retained-tape attestation");
  const css = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/chart-pattern-inspector.css", import.meta.url), "utf8");
  assert.match(css, /\.pattern-inspection-events\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.pattern-inspection-events button\{[^}]*min-width:0;min-height:36px[^}]*white-space:normal;overflow-wrap:anywhere/);
});
