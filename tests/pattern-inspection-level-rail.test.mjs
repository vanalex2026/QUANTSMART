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
const module = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(require, module, module.exports);
const { PatternInspectionChart, patternInspectionWindow: inspect, patternSetupTimeline } = module.exports;
const epoch = Date.parse("2026-01-05T00:00:00Z");
const bars = Array.from({ length: 130 }, (_, i) => ({ t: new Date(epoch + i * 300_000).toISOString(), o: 4000, h: 4001, l: 3999, c: 4000, closed: true }));
bars[70] = { ...bars[70], h: 4050 };
bars[99] = { ...bars[99], h: 4003, c: 4002 };
const setup = { kind: "PATTERN_BREAK", direction: "UP", confirmationTime: bars[99].t, protectionReference: 3980, breakoutLevel: 4001,
  contextBoundary: 4001, contextStart: bars[86].t, buildupTimes: [bars[96].t, bars[97].t, bars[98].t], boundaryTouchTimes: [bars[96].t], signalBarTime: bars[98].t };
const format = value => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const render = (view, receipt = setup, timeline) => renderToStaticMarkup(React.createElement(PatternInspectionChart, { view, label: "Pattern break", setup: receipt, setupTimeline: timeline }));
const svgParts = html => {
  const plot = html.match(/<svg class="chart-pattern-inspector-chart"[\s\S]*?<\/svg>/)?.[0];
  const axis = html.match(/<svg class="pattern-inspection-price-axis[^\"]*"[\s\S]*?<\/svg>/)?.[0];
  assert.ok(plot && axis);
  return { plot, axis };
};
const railRows = axis => [...axis.matchAll(/<g data-inspection-level="([^"]+)" data-level-price="([^"]+)" data-level-price-y="([^"]+)" data-level-label-y="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g)]
  .map(([, id, level, priceY, labelY, body]) => ({ id, level: Number(level), priceY: Number(priceY), labelY: Number(labelY), body }));

test("all seven independent evidence roles fit the stationary rail, including coincident source prices", () => {
  for (const mode of ["setup", "outcome", "context"]) {
    const view = inspect(bars, setup.confirmationTime, "bullish", true, mode, setup);
    const before = JSON.stringify(view);
    const html = render(view);
    const { plot, axis } = svgParts(html);
    const rows = railRows(axis);
    assert.equal(rows.length, 7, mode);
    assert.deepEqual(rows.map(row => row.id), ["atr-entry", "atr-target", "atr-invalidation", "technical-protection", "technical-obstacle", "setup-break", "setup-protection"]);
    assert.equal(rows.find(row => row.id === "technical-protection").level, rows.find(row => row.id === "setup-protection").level);
    assert.notEqual(rows.find(row => row.id === "technical-protection").labelY, rows.find(row => row.id === "setup-protection").labelY);
    const ordered = [...rows].sort((a, b) => a.labelY - b.labelY);
    ordered.forEach((row, i) => {
      assert.ok(row.labelY >= 14 && row.labelY <= 178);
      if (i) assert.ok(row.labelY - ordered[i - 1].labelY >= 18, `${mode}: ${row.id} must have a distinct readable row`);
    });
    assert.ok(rows.some(row => Math.abs(row.priceY - row.labelY) > 10), "fixture forces genuine text collisions");
    for (const row of rows) {
      const actual = 14 + (1 - (row.level - view.low) / (view.high - view.low)) * 164;
      assert.equal(row.priceY, actual, `${row.id} retains its actual price geometry`);
      assert.ok(row.body.includes(`d="M 0 ${actual} H 7 L 17 ${row.labelY} H 21"`), "leader reaches actual price before displaced text");
      assert.ok(row.body.includes(format(row.level)));
      assert.ok(html.includes(`data-level-key="${row.id}"`));
    }
    assert.match(axis, /width="108"/);
    assert.doesNotMatch(plot, /data-inspection-level=/, "labels must remain outside the horizontal candle scroller");
    assert.doesNotMatch([...plot.matchAll(/<text\b[^>]*>(.*?)<\/text>/g)].map(match => match[1]).join(" "), /ENTRY|TARGET|INVALIDATION/, "long ATR captions cannot crowd candles");
    assert.equal((plot.match(/data-inspection-candle-time=/g) || []).length, view.rows.length);
    assert.equal(JSON.stringify(view), before, "rendering and layout cannot mutate retained evidence");
    assert.match(html, /Price level key/);
    assert.match(html, /ATR: illustrative research geometry/);
    assert.match(html, /TECHNICAL: causal protection \/ obstacle evidence/);
    assert.match(html, /SETUP: signal break \/ protection references/);
    assert.match(html, /no executable entry or fill/);
    assert.match(html, /SHADOW_ONLY \/ NO_DECISION/);
    assert.doesNotMatch(html, /NaN|Infinity/);
  }
});

test("rail preserves the ATR fills and exact horizontal technical/setup line geometry", () => {
  const view = inspect(bars, setup.confirmationTime, "bullish", true, "outcome", setup);
  const { plot } = svgParts(render(view));
  const width = Math.max(232, view.rows.length * 16 + 24), slot = (width - 24) / view.rows.length;
  const x = i => 12 + (i + .5) * slot;
  const y = value => 14 + (1 - (value - view.low) / (view.high - view.low)) * 164;
  const anchor = view.index - view.from;
  const studyEnd = Math.min(view.to, view.index + view.study.observedBars) - view.from;
  for (const [level, color] of [[view.study.entry, "#ddd"], [view.study.target, "#26a69a"], [view.study.invalidation, "#ef5350"]]) {
    assert.ok(plot.includes(`<line x1="${x(anchor)}" x2="${x(studyEnd) + slot / 2}" y1="${y(level)}" y2="${y(level)}" stroke="${color}" stroke-dasharray="4 3"`));
  }
  assert.equal((plot.match(/fill-opacity="0.13"/g) || []).length, 2, "ATR target/risk fills remain intact");
  for (const name of ["data-technical-protection", "data-technical-obstacle", "data-pattern-break-references"]) assert.ok(plot.includes(name));
  assert.match(plot, /not an executable fill or ATR study level/);
});

test("named candles keep only available ATR labels; withheld and neutral geometry keep the original axis", () => {
  const named = inspect(bars, setup.confirmationTime, "bullish", true, "setup");
  const namedHtml = render(named, null);
  assert.equal(railRows(svgParts(namedHtml).axis).length, 3);
  assert.doesNotMatch(namedHtml, /data-level-key="(?:setup|technical)-/);
  for (const view of [inspect(bars, setup.confirmationTime, "bullish", false, "setup", setup), inspect(bars, setup.confirmationTime, "neutral", true, "setup")]) {
    const html = render(view, null), { axis } = svgParts(html);
    assert.match(axis, /width="68"/);
    assert.equal((axis.match(/<text /g) || []).length, 4, "original three price ticks plus UTC/M5 remain");
    assert.doesNotMatch(html, /data-level-key=|data-inspection-level=|Price level key/);
  }
});

test("rail leaves setup/event lanes, heights and keyboard inspection intact", () => {
  const view = inspect(bars, setup.confirmationTime, "bullish", true, "context", setup);
  const timeline = patternSetupTimeline(setup, bars, setup.confirmationTime, true, epoch + 130 * 300_000);
  assert.equal(timeline.state, "AVAILABLE");
  const plain = render(view), events = render(view, setup, timeline);
  assert.match(svgParts(plain).plot, /height="216"/);
  assert.match(svgParts(events).plot, /height="236"/);
  assert.equal((events.match(/data-setup-event-control=/g) || []).length, 4);
  assert.match(events, /Left and Right select candles, Home and End/);
  assert.match(events, /role="region" tabindex="0"/);
  assert.match(events, /y="211"/);
  assert.match(svgParts(events).axis, /y="196"[^>]*>UTC \/ M5/);
  assert.match(events, /data-inspected-candle="2026-01-05T08:15:00.000Z"/);
  const css = readFileSync(app + "src/components/chart-pattern-inspector.css", "utf8");
  assert.match(css, /\.pattern-inspection-level-rail\{width:108px;box-sizing:border-box/);
  assert.match(css, /\.pattern-inspection-price-axis\{flex:none/);
  assert.match(css, /\.pattern-inspection-scroll\{flex:1;min-width:0;overflow-x:auto/);
});


test("malformed and stale receipt fields cannot disagree between rail, plot and captions", () => {
  const view = inspect(bars, setup.confirmationTime, "bullish", true, "outcome", setup);
  for (const changed of [
    { ...view, technicalStudy: { ...view.technicalStudy, direction: "DOWN" } },
    { ...view, technicalStudy: { ...view.technicalStudy, roomState: "WITHHELD" } },
    { ...view, technicalStudy: { ...view.technicalStudy, protection: setup.protectionReference - 1 } },
  ]) {
    const html = render(changed);
    assert.doesNotMatch(html, /data-technical-protection=|data-technical-obstacle=|data-technical-event=|data-level-key="technical-/);
    assert.doesNotMatch(html, /Levels are causal at the confirmation close/);
    assert.match(html, /Technical levels unavailable or withheld/);
  }
  for (const receipt of [{ ...setup, breakoutLevel: 4010 }, { ...setup, confirmationTime: bars[98].t }, { ...setup, signalBarTime: bars[99].t }]) {
    const html = render(view, receipt);
    assert.doesNotMatch(html, /data-pattern-break-references=|data-level-key="(?:setup|technical)-|Signal-bar break reference:|Technical protection reference:/);
    assert.doesNotMatch(html, /These references differ from the illustrative ATR position below/);
  }
  const partial = render(view, { ...setup, protectionReference: NaN });
  assert.match(partial, /data-level-key="setup-break"/);
  assert.doesNotMatch(partial, /NaN|data-level-key="setup-protection"|data-technical-protection=/);
  assert.match(partial, /technical protection reference unavailable/);
  const staleAtr = render({ ...view, study: { ...view.study, target: 9999 } });
  assert.doesNotMatch(staleAtr, /data-inspection-position=|data-inspection-level=/);
});

test("outside-domain prices have explicit labels without fictitious on-plot leaders", () => {
  const view = { ...inspect(bars, setup.confirmationTime, "bullish", true, "setup", setup), low: 3995, high: 4010 };
  const html = render(view), { axis } = svgParts(html);
  const rows = railRows(axis), outside = rows.filter(row => row.priceY < 14 || row.priceY > 178);
  assert.equal(outside.length, 3);
  for (const row of outside) {
    assert.match(row.body, /outside plotted price range/);
    assert.doesNotMatch(row.body, /<path/);
    assert.match(row.body, /\*<\/text>/);
    assert.ok(axis.includes(`data-level-outside-range="true"`));
  }
  for (const row of rows.filter(row => row.priceY >= 14 && row.priceY <= 178)) assert.match(row.body, /<path/);
  assert.match(html, /outside plotted price range \(\*\)/);
});
