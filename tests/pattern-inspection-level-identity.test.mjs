import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const React = require("react"), { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: `export {PatternInspectionChart} from './src/components/PatternInspectionChart.tsx'; export {patternInspectionWindow} from './src/lib/patternInspectionWindow.ts';`, resolveDir: app },
  bundle: true, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react/jsx-runtime"], write: false, logLevel: "silent",
});
function load(react = React) {
  const module = { exports: {} };
  new Function("require", "module", "exports", bundled.outputFiles[0].text)(name => name === "react" ? react : require(name), module, module.exports);
  return module.exports;
}
const { patternInspectionWindow: inspect } = load();
// Synthetic identity stress inputs only; these are no source or market outcome fixture.
const epoch = Date.parse("2026-01-05T00:00:00Z");
const bars = Array.from({ length: 170 }, (_, i) => ({ t: new Date(epoch + i * 300_000).toISOString(), o: 100, h: 101, l: 99, c: 100, closed: true }));
bars[120] = { ...bars[120], h: 105 };
bars[131] = { ...bars[131], h: 106 };
const setup = { kind: "PATTERN_BREAK", direction: "UP", confirmationTime: bars[130].t, contextStart: bars[120].t,
  buildupTimes: [bars[126].t, bars[127].t, bars[129].t], boundaryTouchTimes: [bars[126].t], signalBarTime: bars[129].t,
  breakoutLevel: 101, protectionReference: 98, contextBoundary: 101 };
const propsFor = (tape = bars, receipt = setup) => ({ label: "Pattern break", setup: receipt,
  view: inspect(tape, receipt.confirmationTime, "bullish", true, "outcome", receipt, epoch + 170 * 300_000) });
const collect = node => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];
const find = (tree, attr, value) => collect(tree).find(node => node.props?.[attr] !== undefined && (value === undefined || node.props[attr] === value));
const selected = tree => collect(tree).filter(node => node.props?.["data-level-line"] && node.props["data-level-selected"]).map(node => node.props["data-level-line"]);
function mount(props) {
  let cursor = 0, effects = [];
  const cells = [];
  const { PatternInspectionChart } = load({ ...React,
    useEffect(effect, dependencies) { const i = cursor++, previous = cells[i]; if (!previous || dependencies.some((value, j) => !Object.is(value, previous[j]))) effects.push(effect); cells[i] = dependencies; },
    useId: () => `identity-readout-${cursor++}`, useMemo: fn => fn(),
    useRef: initial => { const i = cursor++; cells[i] ??= { current: initial }; return cells[i]; },
    useState: initial => { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], value => { cells[i] = typeof value === "function" ? value(cells[i]) : value; }]; },
  });
  const render = () => { cursor = 0; effects = []; const tree = PatternInspectionChart(props); for (const effect of effects) effect(); return tree; };
  return { render, update(next) { props = next; return render(); } };
}
function selectTechnical(mounted) {
  find(mounted.render(), "data-level-control", "technical-protection").props.onClick();
  assert.deepEqual(selected(mounted.render()), ["technical-protection"]);
}
const seconds = value => Array.isArray(value) ? value.map(seconds) : value && typeof value === "object"
  ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, seconds(item)]))
  : typeof value === "string" ? value.replace(/\.000Z$/, "Z") : value;

test("selected level retains UTC identity across removed and backfilled prefixes with reindexed exits", () => {
  const full = propsFor(), retained = propsFor(bars.slice(20));
  assert.equal(full.view.study.exitIndex, 131); assert.equal(retained.view.study.exitIndex, 111);
  assert.equal(full.view.technicalStudy.exitIndex, 131); assert.equal(retained.view.technicalStudy.exitIndex, 111);
  assert.deepEqual(full.view.geometry, retained.view.geometry);
  assert.equal(full.view.study.resolvedAt, retained.view.study.resolvedAt);
  for (const [initial, refreshed] of [[full, retained], [retained, full]]) {
    const mounted = mount(initial); selectTechnical(mounted);
    const tree = mounted.update(refreshed);
    assert.deepEqual(selected(tree), ["technical-protection"], "ordinal changes cannot clear the same evidence role");
    const line = find(tree, "data-level-line", "technical-protection");
    const exactY = 14 + (1 - (setup.protectionReference - refreshed.view.low) / (refreshed.view.high - refreshed.view.low)) * 164;
    assert.equal(line.props.y1, exactY); assert.equal(line.props.y2, exactY);
    assert.equal(find(tree, "data-inspected-level").props["data-inspected-level"], "technical-protection");
  }
});

test("supported UTC aliases preserve selected evidence while offset aliases remain withheld", () => {
  const original = propsFor(), aliased = propsFor(seconds(bars), seconds(setup));
  assert.ok(aliased.view); assert.equal(aliased.view.anchor.t, original.view.anchor.t.replace(".000Z", "Z"));
  assert.equal(aliased.view.study.resolvedAt, original.view.study.resolvedAt.replace(".000Z", "Z"));
  const mounted = mount(original); selectTechnical(mounted);
  assert.deepEqual(selected(mounted.update(aliased)), ["technical-protection"]);
  assert.deepEqual(selected(mounted.update(original)), ["technical-protection"]);
  const offset = { ...original, setup: { ...setup, confirmationTime: setup.confirmationTime.replace("Z", "+00:00") } };
  const withheld = mounted.update(offset);
  assert.deepEqual(selected(withheld), []);
  assert.equal(find(withheld, "data-level-control", "technical-protection"), undefined);
  assert.deepEqual(selected(mounted.update(original)), [], "returning valid aliases cannot resurrect an expired selection");
});

test("semantic receipt changes still clear immediately after ordinal normalization and never resurrect", () => {
  const original = propsFor();
  const cases = [
    { ...original, setup: { ...setup, boundaryTouchTimes: [bars[127].t] } },
    { ...original, view: { ...original.view, study: { ...original.view.study, state: "TIMEOUT" } } },
    { ...original, view: { ...original.view, technicalStudy: { ...original.view.technicalStudy, observedBars: 2 } } },
    { ...original, view: { ...original.view, technicalStudy: { ...original.view.technicalStudy, sourcePages: [13, 51] } } },
    { ...original, view: { ...original.view, technicalStudy: { ...original.view.technicalStudy, resolvedAt: bars[132].t } } },
  ];
  for (const changed of cases) {
    const mounted = mount(original); selectTechnical(mounted);
    assert.deepEqual(selected(mounted.update(changed)), [], "first changed render hides selection before effect cleanup");
    assert.deepEqual(selected(mounted.update(original)), [], "restoring original semantic receipt cannot revive selection");
  }
});
