import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = async (entry) => {
  const output = await build({ entryPoints: [fileURLToPath(new URL(entry, import.meta.url))], bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent" });
  return import("data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64"));
};
const [{ CandleSeries, IndicatorSeries }, { MicroChartBrush }] = await Promise.all([
  bundle("../mfe_ux_lab/cockpit/src/components/MicroChartSeries.tsx"),
  bundle("../mfe_ux_lab/cockpit/src/components/MicroChartBrush.tsx"),
]);
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const seriesSource = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChartSeries.tsx", import.meta.url), "utf8");

assert.equal(CandleSeries.$$typeof, Symbol.for("react.memo"));
assert.equal(IndicatorSeries.$$typeof, Symbol.for("react.memo"));
assert.equal(MicroChartBrush.$$typeof, Symbol.for("react.memo"));
assert.doesNotMatch(seriesSource, /panOffset/, "series props keep fractional pan owned by the parent transform");
assert.match(source, /<g transform=\{`translate\(\$\{panOffset\},0\)`\} aria-hidden="true">[\s\S]*?<CandleSeries/, "candles render below one decorative parent pan transform");
assert.match(source, /<g transform=\{`translate\(\$\{panOffset\},0\)`\} aria-hidden="true">[\s\S]*?<IndicatorSeries/, "indicators render below one decorative parent pan transform");

const iso = (i) => new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString();
const bars = [
  { t: iso(0), o: 90, h: 100, l: 80, c: 95 },
  { t: iso(1), o: 95, h: 110, l: 90, c: 100 },
  { t: iso(2), o: 100, h: 115, l: 98, c: 105 },
  { t: iso(3), o: 105, h: 120, l: 100, c: 101 },
];
const candleElement = CandleSeries.type({ bars, start: 1, end: 3, cursor: 2, formingIndex: 2, left: 10, top: 5, height: 100, slot: 20, bodyWidth: 12, lo: 80, span: 40 });
const candleGroups = candleElement.props.children;
assert.equal(candleGroups.length, 2, "cursor excludes bars beyond the replay cursor");
assert.equal(candleGroups[0].props["data-candle-direction"], "up");
assert.equal(candleGroups[0].props["data-candle-state"], "closed");
assert.equal(candleGroups[1].props["data-candle-state"], "forming");
assert.equal(candleGroups[1].props.children[1].props.strokeDasharray, "3 2");
assert.equal(candleGroups[1].props.children[1].props.children.props.children, "Forming candle; context only; not closed-bar evidence");
assert.equal(candleGroups[0].props.children[0].props.x1, 20, "absolute index geometry uses the integer viewport start");
assert.equal(candleGroups[0].props.children[1].props.y, 55, "candle body preserves the chart y mapping");

const staticIndicator = IndicatorSeries.type({ series: [90, 100, 110, 120], start: 1, end: 3, barCount: 4, left: 10, top: 5, height: 100, slot: 20, lo: 80, span: 40, stroke: "cyan", strokeWidth: 1.4, opacity: 0.9 });
assert.equal(staticIndicator.props.points, "20.0,55.0 40.0,30.0 60.0,5.0", "indicator points retain one-decimal precision and chart y mapping");
const clamped = IndicatorSeries.type({ series: [80, 120], start: 0, end: 1, barCount: 2, left: 0, top: 10, height: 20, slot: 10, lo: 90, span: 10, stroke: "x", strokeWidth: 1, opacity: 1 });
assert.equal(clamped.props.points, "5.0,30.0 15.0,10.0", "indicator y coordinates clamp to the plot bounds");
const liveFallback = IndicatorSeries.type({ series: [1, 2, 3], start: 0, end: 2, barCount: 3, tail: 9, liveStart: 2, left: 0, top: 0, height: 10, slot: 10, lo: 0, span: 10, stroke: "x", strokeWidth: 1, opacity: 1 });
assert.equal(liveFallback.props.points, "5.0,9.0 15.0,8.0 25.0,1.0", "live-tail fallback uses tail only for the final forming bar");
const liveValues = IndicatorSeries.type({ series: [1, 2, 3], start: 0, end: 2, barCount: 3, tail: 9, liveStart: 2, liveValues: [7], left: 0, top: 0, height: 10, slot: 10, lo: 0, span: 10, stroke: "x", strokeWidth: 1, opacity: 1 });
assert.equal(liveValues.props.points, "5.0,9.0 15.0,8.0 25.0,3.0", "live values override the final series point while retaining exact fallback semantics");

const points = Array.from({ length: 10_000 }, (_, i) => ({ i: i % 200, p: i % 100 }));
const brushElement = MicroChartBrush.type({ points, color: "white", opacity: 1, start: 0, left: 0, top: 0, height: 100, slot: 5, lo: 0, span: 100 });
const brushCoordinates = brushElement.props.points.split(" ");
assert.equal(brushCoordinates.length, points.length, "long brushes preserve every persisted point");
assert.equal(brushCoordinates[0], "2.5,100.0");
assert.equal(brushCoordinates.at(-1), `${((points.at(-1).i + 0.5) * 5).toFixed(1)},${(100 - points.at(-1).p).toFixed(1)}`);
console.log("MICROCHART SERIES PASS: memoized candle/indicator geometry, transform ownership, cursor/forming parity, live-tail fallback and 10k-point brush output.");
