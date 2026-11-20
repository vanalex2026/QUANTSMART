import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: "export { patternContextSelectionCensus } from './src/lib/patternContextSelectionCensus.ts';", resolveDir: app },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const { patternContextSelectionCensus: census } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

const M5 = 300_000;
const epoch = Date.parse("2026-11-10T00:00:00.000Z");
const time = i => new Date(epoch + i * M5).toISOString();
const bars = Array.from({ length: 320 }, (_, i) => ({
  t: time(i), o: 100 + i * .05, h: 101 + i * .05, l: 99 + i * .05, c: 100.4 + i * .05, closed: true,
})).map((bar, i, all) => i === 251 ? { ...bar, o: all[250].c + .04, h: all[250].c + .08, l: all[250].c - .08, c: all[250].c } : bar);
const setup = (i, direction = "UP") => ({
  kind: "PATTERN_BREAK", version: "pattern-break/1", direction,
  signalBarTime: time(i - 1), confirmationTime: time(i), contextStart: time(i - 20),
  contextBoundary: 100, breakoutLevel: 101, protectionReference: 99,
  buildupTimes: [time(i - 4), time(i - 3), time(i - 2)],
  boundaryTouchTimes: [time(i - 4), time(i - 3), time(i - 2)], originalBreakTime: time(i - 1),
});
const occurrences = Object.freeze([
  Object.freeze({ i: 110, time: time(110), direction: "UP", nextBar: "UP", score: .8, setup: setup(110) }),
  Object.freeze({ i: 250, time: time(250), direction: "UP", nextBar: "FLAT", score: .8, setup: setup(250) }),
]);
const nowMs = epoch + 320 * M5;
const deepFreeze = value => {
  if (value && typeof value === "object") {
    if (!Object.isFrozen(value)) Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};
deepFreeze(occurrences);

function run(tape = bars, rows = occurrences) {
  return census(tape, rows, "pattern_break", true, nowMs);
}

test("future bars after confirmation cannot change selection buckets or base detector receipts", () => {
  const beforeOccurrences = JSON.parse(JSON.stringify(occurrences));
  const baseline = run(bars, [occurrences[0]]);
  assert.equal(baseline.state, "MEASURED");
  assert.equal(baseline.measuredOccurrences, 1);
  assert.equal(baseline.unavailableOccurrences, 0);
  assert.equal(baseline.rows.length, 1);
  assert.equal(baseline.rows[0].selection.state, "MEASURED");
  const afterConfirmationPoison = bars.map((bar, i) => {
    if (i <= 111) return Object.freeze({ ...bar });
    const future = { t: bar.t, closed: true };
    for (const key of ["o", "h", "l", "c"]) Object.defineProperty(future, key, { enumerable: true, get() { throw new Error(`future OHLC read: ${key}`); } });
    return Object.freeze(future);
  });
  const after = run(afterConfirmationPoison, [occurrences[0]]);
  assert.deepEqual(after, baseline, "bars after confirmation/H+1 are outside selection and outcome inputs");
  assert.deepEqual(occurrences, beforeOccurrences, "census does not mutate detector evidence or occurrence receipts");
});

test("H+1 mutation changes only the observed H+1 outcome while preserving selection bucket", () => {
  const baseline = run();
  const alteredBars = bars.map((bar, i) => {
    if (i !== 111) return Object.freeze({ ...bar });
    const currentClose = bars[110].c;
    return Object.freeze({ ...bar, o: currentClose + .04, h: currentClose + .08, l: currentClose - .08, c: currentClose - .04 });
  });
  const alteredRows = [Object.freeze({ ...occurrences[0], nextBar: "DOWN" }), occurrences[1]];
  const altered = run(alteredBars, alteredRows);
  assert.equal(altered.state, "MEASURED");
  assert.equal(altered.measuredOccurrences, baseline.measuredOccurrences);
  assert.equal(altered.rows[0].nextBar, "DOWN");
  assert.equal(altered.rows[0].selection.lens, baseline.rows[0].selection.lens);
  assert.deepEqual(altered.rows[0].selection, baseline.rows[0].selection);
  const bucket = baseline.rows[0].selection.lens;
  assert.equal(altered.buckets[bucket].occurrences, baseline.buckets[bucket].occurrences);
  assert.equal(altered.buckets[bucket].denominator, baseline.buckets[bucket].denominator);
  assert.equal(altered.buckets[bucket].outcomes.up, baseline.buckets[bucket].outcomes.up - 1);
  assert.equal(altered.buckets[bucket].outcomes.down, baseline.buckets[bucket].outcomes.down + 1);
  assert.equal(altered.buckets[bucket].wins, baseline.buckets[bucket].wins - 1);
  assert.notEqual(altered.rows[0].nextBar, baseline.rows[0].nextBar);
});

test("FLAT outcomes stay in the aligned-direction denominator", () => {
  const result = run();
  const bucket = result.rows[1].selection.lens;
  const stats = result.buckets[bucket];
  assert.equal(result.rows[1].nextBar, "FLAT");
  assert.equal(stats.outcomes.flat, 1);
  assert.equal(stats.denominator, stats.outcomes.up + stats.outcomes.down + stats.outcomes.flat);
  assert.equal(stats.hitRate, stats.wins / stats.denominator);
  assert.equal(stats.denominator, 2);
});

test("context-selection census is absent while the causal replay inspector is active", async () => {
  const React = require("react");
  const output = await build({
    stdin: { contents: "export { ChartPatternInspector } from './src/components/ChartPatternInspector.tsx';", resolveDir: app },
    bundle: true, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react/jsx-runtime"],
    write: false, logLevel: "silent", loader: { ".css": "empty" },
  });
  let cursor = 0;
  const cells = [];
  const hooks = { ...React,
    useId() { return `statistics-${cursor++}`; },
    useMemo(fn) { return fn(); },
    useRef(initial) { const i = cursor++; return cells[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === "function" ? initial() : initial; return [cells[i], value => { cells[i] = typeof value === "function" ? value(cells[i]) : value; }]; },
    useEffect() { cursor++; },
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", output.outputFiles[0].text)(name => name === "react" ? hooks : require(name), module, module.exports);
  const input = {
    signal: { time: time(110), reads: "bullish", label: "Synthetic pattern", conceptId: "pattern_break", annotationKind: "pattern" },
    bars, knowledge: null, namedKnowledge: null, occurrences,
    sourceLabel: "Synthetic audit tape", allowGeometry: true, onNavigate() {}, onShowOnChart() {}, onClose() {},
    evidence: { conceptId: "pattern_break", hitRate: .5, occurrences: 2, evaluated: 40, skipped: 0, long: { occurrences: 2, hitRate: .5 }, short: { occurrences: 0, hitRate: null } },
  };
  const collect = node => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];
  const render = () => { cursor = 0; return module.exports.ChartPatternInspector(input); };
  let tree = render();
  let disclosure = collect(tree).find(node => node.type === "details");
  assert.ok(disclosure, "census disclosure is available outside replay");
  disclosure.props.onToggle({ currentTarget: { open: true } });
  tree = render();
  disclosure = collect(tree).find(node => node.type === "details");
  assert.equal(disclosure.props.open, true);
  const replay = collect(tree).find(node => node.type?.name === "PatternCausalReplayControls");
  replay.props.onToggle();
  input.evidence = new Proxy({}, { get(_object, key) { throw new Error(`retrospective census read: ${String(key)}`); } });
  tree = render();
  assert.equal(collect(tree).find(node => node.type === "details"), undefined, "expanded census is unmounted during replay");
  assert.equal(collect(tree).find(node => node.type?.name === "PatternCausalReplayControls").props.enabled, true);
});

console.log("PATTERN CONTEXT CENSUS STATISTICS PASS: future isolation, H+1-only mutation, FLAT-inclusive denominator, immutable detector evidence and replay withholding.");



