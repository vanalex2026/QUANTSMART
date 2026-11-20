import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const ts = require("typescript");
const bundle = await build({ stdin: { contents: 'export * from "./src/lib/namedCandleHistory.ts"; export * from "./src/lib/candlePatternAtlas.ts"; export * from "./src/components/NamedCandleHistoryEvidence.tsx";', resolveDir: fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url)), loader: "tsx" }, jsx: "automatic", bundle: true, format: "cjs", platform: "node", external: ["react", "react/jsx-runtime"], write: false, logLevel: "silent" });
const mod = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(require, mod, mod.exports);
const { scanNamedCandleHistory: scan, namedCandleOccurrenceAt, resolveNamedCandleFocus, detectNamedCandlePatternsAt, NamedCandleHistoryEvidence } = mod.exports;
const bar = (i, extra = {}) => ({ i, r: "N", t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString(), o: 100, h: 101, l: 99, c: 100, closed: true, ...extra });
const bars = Array.from({ length: 500 }, (_, i) => bar(i));
const evidence = scan(bars, "DOJI");
assert.equal(evidence.ok, true); assert.equal(evidence.history.length, 500, "every occurrence is retained, including records beyond the old analogue cap");
assert.equal(evidence.evaluated, 500); assert.equal(evidence.observed, 499); assert.equal(evidence.unavailable.TAIL, 1);
assert.deepEqual(evidence.counts, { UP: 0, DOWN: 0, FLAT: 499 }); assert.equal(evidence.hitRate, null, "neutral taxonomy has no directional hit rate");
assert.equal(evidence.history[0].time, bars[0].t); assert.equal(evidence.history.at(-1).time, bars.at(-1).t);
const bullish = bars.map((b, i) => ({ ...b, o: 100 + 3 * i, l: 100 + 3 * i, h: 102 + 3 * i, c: 102 + 3 * i }));
const up = scan(bullish, "BULLISH_MARUBOZU");
assert.equal(up.occurrences, 500); assert.equal(up.counts.UP, 499); assert.equal(up.hitRate, 1);
assert.equal(up.observed + Object.values(up.unavailable).reduce((a, b) => a + b, 0), up.occurrences);
for (const ordinal of [0, 200, 499]) {
  const row = up.history[ordinal];
  assert.ok(detectNamedCandlePatternsAt(bullish.slice(0, row.i + 1), row.i).includes("BULLISH_MARUBOZU"), "oldest/middle/latest matches agree with causal prefixes");
}
const gap = scan(bars.filter((_, i) => i !== 100), "DOJI");
assert.equal(gap.excludedSetups, 14, "a missing transition excludes exactly the ATR context that crosses it");
assert.equal(gap.evaluated, 485); assert.equal(gap.unavailable.GAP, 1); assert.equal(gap.history.find(row => row.i === 99).nextBar, null);
for (const [extra, bucket] of [[{ h: NaN }, "INVALID"], [{ closed: false }, "FORMING"]]) {
  const invalid = scan(bars.map((b, i) => i === 100 ? { ...b, ...extra } : b), "DOJI");
  assert.equal(invalid.excludedSetups, 15); assert.equal(invalid.unavailable[bucket], 1);
  assert.equal(invalid.history.length + invalid.excludedSetups, bars.length);
}
assert.equal(namedCandleOccurrenceAt(bars.map((b, i) => i === 15 ? { ...b, t: "not-a-timestamp" } : b), 14)?.unavailable, "INVALID", "malformed next timestamps are invalid evidence, not gaps");
assert.equal(namedCandleOccurrenceAt(bars.map((b, i) => i === 15 ? { ...b, t: new Date(Date.parse(b.t) + 60_000).toISOString() } : b), 14)?.unavailable, "INVALID", "off-grid next timestamps are invalid evidence, not gaps");
assert.equal(namedCandleOccurrenceAt(bars.map((b, i) => i === 15 ? { ...b, t: "not-a-timestamp", closed: false } : b), 14)?.unavailable, "FORMING", "forming status remains explicit while a bar is mutable");
for (const tape of [bars.map((b, i) => i === 10 ? { ...b, t: bars[9].t } : b), bars.toReversed(), bars.map((b, i) => i === 10 ? { ...b, t: "2026-01-01T00:50:01Z" } : b)]) {
  const result = scan(tape, "DOJI"); assert.equal(result.ok, false); assert.equal(result.history.length, 0);
}
assert.equal(scan([], "DOJI").ok, true); assert.equal(scan(bars, "unknown").ok, false);
const thresholdTape = Array.from({ length: 16 }, (_, i) => bar(i, { o: 0, c: 0, h: 50, l: -50 }));
for (const [close, expected] of [[12, "FLAT"], [-12, "FLAT"], [12.0001, "UP"], [-12.0001, "DOWN"]]) {
  const tape = thresholdTape.map((b, i) => i === 15 ? { ...b, c: close } : b);
  assert.equal(namedCandleOccurrenceAt(tape, 14).nextBar, expected, "H+1 matches the Atlas's inclusive flat threshold without rounding");
}
const prefix = scan(bullish.slice(0, 201), "BULLISH_MARUBOZU");
assert.equal(prefix.history.at(-1).nextBar, null);
const future = bullish.map((b, i) => i > 200 ? { ...b, o: 1, h: 5, l: 0, c: 2 } : b);
assert.deepEqual(scan(future, "BULLISH_MARUBOZU").history.filter(row => row.i < 200), up.history.filter(row => row.i < 200), "future mutation never changes already observed earlier occurrences");

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("Microscope.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = new Map();
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node.getText(ast));
  if (ts.isVariableDeclaration(node) && node.initializer) {
    if (ts.isArrowFunction(node.initializer)) functions.set(node.name.getText(ast), `const ${node.name.getText(ast)} = ${node.initializer.getText(ast)};`);
    if (ts.isCallExpression(node.initializer) && node.initializer.expression.getText(ast) === "useMemo") functions.set(node.name.getText(ast), `const ${node.name.getText(ast)} = ${node.initializer.arguments[0].getText(ast)};`);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const compile = (name, env) => new Function("env", `with(env){${ts.transpileModule(functions.get(name), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return ${name};}`)(env);
const direction = pattern => pattern === "BULLISH_MARUBOZU" ? "UP" : "NEUTRAL";
const env = { detectorBars: bars, namedCandleOccurrenceAt, resolveNamedCandleFocus, namedCandlePatternDirection: direction, focusedSnapshotTimestampsEqual: (a, b) => Date.parse(a) === Date.parse(b) };
env.namedCandlePatternToSignal = compile("namedCandlePatternToSignal", env);
const convert = compile("namedCandleHistoryToSignal", env);
const old = convert("DOJI", evidence.history[0], bars);
assert.equal(old.i, 0); assert.equal(old.time, bars[0].t); assert.equal(old.annotationKind, "named_candle");
assert.equal(old.outcome, "flat"); assert.equal(old.nextBarOutcome, "FLAT");
assert.equal(convert("DOJI", evidence.history[200], bars.slice(3)).i, 197, "chart signal resolves UTC identity after retention shifts");
assert.equal(convert("DOJI", evidence.history[0], bars.slice(3)), null);
assert.equal(convert("DOJI", evidence.history.at(-1), bars).outcome, "pending");
let chartSelection, focus, preview;
const ui = { ...env, focused: true, setChartFocusRequest() {}, m5Atlas: { matches: [] }, setInspectedSignal(signal) { preview = signal; }, resetAnalogueSelection() { chartSelection = null; }, setAnaloguePreviewIndex() {}, analogueFocusTimeRef: { current: null }, setHistoricalChartFocus(value) { focus = value; }, setNamedHistoryChartSelection(value) { chartSelection = value; } };
compile("selectPriceActionSignal", ui)(old);
assert.equal(chartSelection.occurrence.time, bars[0].t);
assert.equal(ui.analogueFocusTimeRef.current, null); assert.equal(focus, null, "an old taxonomy occurrence cannot masquerade as a retained analogue");
let conversions = 0;
const nav = { ...env, inspectorOccurrences: evidence.history, inspectedEvidence: null, inspectedNamedPattern: "DOJI", inspectedNamedHistory: evidence, namedCandleHistoryToSignal(...args) { conversions++; return convert(...args); }, setInspectedSignal(signal) { preview = signal; } };
compile("navigateInspectorOccurrence", nav)(400);
assert.equal(conversions, 1); assert.equal(preview.time, bars[400].t, "navigation converts one chosen occurrence, never the whole history");
const { createElement } = require("react"); const { renderToStaticMarkup } = require("react-dom/server");
const html = renderToStaticMarkup(createElement(NamedCandleHistoryEvidence, { evidence }));
assert.match(html, /500 matching occurrences/); assert.match(html, /499/); assert.match(html, /no similarity filter or 60-match cap/);
const renderHistory = evidence => renderToStaticMarkup(createElement(NamedCandleHistoryEvidence, { evidence }));
assert.match(html, /Directional hit rate unavailable for neutral shapes or missing outcomes/);
assert.doesNotMatch(html, /Wilson 95% interval/, "neutral shapes must never acquire a directional confidence interval");
const allWins = renderHistory(up);
assert.match(allWins, /UP next-bar hit rate 100\.0% over 499 observed outcomes/);
assert.match(allWins, /Wilson 95% interval: 99\.2–100\.0% \(denominator 499\)/, "tail occurrences stay outside the interval denominator");
const oneOutcome = { ...up, counts: { UP: 1, DOWN: 0, FLAT: 0 }, observed: 1, occurrences: 9, hitRate: 0.1234 };
assert.match(renderHistory(oneOutcome), /UP next-bar hit rate 100\.0% over 1 observed outcomes/, "rendered rate uses raw directional counts, not a rounded or stale hitRate field");
assert.match(renderHistory(oneOutcome), /Wilson 95% interval: 20\.7–100\.0% \(denominator 1\)/, "a single win still has wide uncertainty");
const noWins = renderHistory({ ...oneOutcome, counts: { UP: 0, DOWN: 1, FLAT: 0 }, hitRate: 1 });
assert.match(noWins, /UP next-bar hit rate 0\.0% over 1 observed outcomes/);
assert.match(noWins, /Wilson 95% interval: 0\.0–79\.3% \(denominator 1\)/, "zero wins must not collapse uncertainty to zero");
const mixed = renderHistory({ ...oneOutcome, direction: "DOWN", counts: { UP: 1, DOWN: 1, FLAT: 2 }, observed: 4 });
assert.match(mixed, /DOWN next-bar hit rate 25\.0% over 4 observed outcomes/);
assert.match(mixed, /Wilson 95% interval: 4\.6–69\.9% \(denominator 4\)/, "all observed outcomes, including FLAT, belong in the rate and interval denominator");
const noOutcome = renderHistory(scan(bullish.slice(0, 1), "BULLISH_MARUBOZU"));
assert.match(noOutcome, /Directional hit rate unavailable for neutral shapes or missing outcomes/);
assert.doesNotMatch(noOutcome, /Wilson 95% interval/, "zero observed outcomes must not emit an interval");
assert.match(allWins, /Occurrences may overlap\. The raw-count interval is not adjusted for overlap and may understate uncertainty/);
console.log("NAMED CANDLE FULL HISTORY PASS: exhaustive causal occurrences, strict local gaps, observed H+1 denominators, UTC chart focus and lazy single-record navigation.");
