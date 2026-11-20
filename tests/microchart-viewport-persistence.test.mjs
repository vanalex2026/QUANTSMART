import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);
const ast = ts.createSourceFile("MicroChart.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let resolver, safeTimestamp, savedReader, hydrate, restore, restoreDependencies;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "savedViewportIndex") resolver = node.getText(ast);
  if (ts.isFunctionDeclaration(node) && node.name?.text === "isSafeDrawingTimestamp") safeTimestamp = node.getText(ast);
  if (ts.isFunctionDeclaration(node) && node.name?.text === "readSavedViewport") savedReader = node.getText(ast);
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect") {
    const callback = node.arguments[0].getText(ast);
    if (callback.includes("const saved = readSavedViewport(viewportStorageKey)")) hydrate = callback;
    if (callback.includes("const startFallback = viewportRestore.startTime")) {
      restore = callback;
      restoreDependencies = node.arguments[1].getText(ast);
    }
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(resolver && safeTimestamp, "viewport timestamp resolver and strict validator must remain testable");
const savedViewportIndex = new Function(`${ts.transpileModule(`${safeTimestamp}\n${resolver}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return savedViewportIndex;`)();
const bars = [
  { t: "2026-03-02T00:00:00.000Z" },
  { t: "2026-03-02T00:05:00.000Z" },
  { t: "2026-03-02T00:10:00.000Z" },
];
assert.equal(savedViewportIndex(bars, bars[1].t, 0), 1, "canonical UTC timestamp resolves its retained candle");
assert.equal(savedViewportIndex(bars, "2026-03-02T01:05:00+01:00", 0), 1, "equivalent explicit UTC offset preserves candle identity");
for (const timestamp of ["2026-02-30T00:00:00Z", "2026-03-02T00:05:00", "2099-01-01T00:00:00Z"]) {
  assert.equal(savedViewportIndex(bars, timestamp, 2), 2, `unsafe explicit timestamp ${timestamp} must use the safe edge fallback`);
}
assert.equal(savedViewportIndex([{ t: "2099-01-01T00:00:00Z" }], "2099-01-01T00:00:00Z", -1), -1,
  "future identity cannot focus even when a matching row is supplied");
assert.ok(savedReader && hydrate && restore);
const compile = (expression, env) => new Function("env", `with(env){${ts.transpileModule(`const callback = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return callback;}`)(env);
const readSavedViewport = new Function("localStorage", `${ts.transpileModule(savedReader, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText} return readSavedViewport;`)({ getItem: () => JSON.stringify({ start: 1, end: 4, startTime: 123 }) });
assert.equal(readSavedViewport("chart"), null, "invalid explicit timestamp types cannot become legacy ordinal-only viewports");
const tape = Array.from({ length: 300 }, (_, i) => ({ t: new Date(Date.UTC(2026, 2, 2, 0, i * 5)).toISOString() }));
for (const callback of [hydrate, restore]) {
  for (const timestamp of ["2026-02-30T00:00:00Z", tape[1].t.slice(0, -1), "", "2099-01-01T00:00:00Z"]) {
    let view;
    const payload = { start: 1, end: 4, startTime: timestamp, endTime: timestamp };
    const env = { n: tape.length, bars: tape, recentCount: 180, hydratedViewportKey: null, viewportStorageKey: "chart", viewportRestore: payload,
      startAtLatest: false, live: false, landmarksAtLatestOnly: false,
      savedViewportIndex, readSavedViewport: () => payload, appliedViewportRestoreNonce: { current: null }, appliedViewportRestoreKey: { current: null },
      setView: value => { view = value; }, setHydratedViewportKey() {}, setChartKeyStatus() {} };
    compile(callback, env)();
    assert.deepEqual(view, [120, 299], "invalid explicit viewport identity restores the recent window rather than stale indices");
    env.viewportRestore = { start: 1, end: 4 };
    env.readSavedViewport = () => env.viewportRestore;
    compile(callback, env)();
    assert.deepEqual(view, [1, 4], "legacy ordinal-only viewport retains bounded compatibility");
  }
}

// Apply React's Object.is dependency comparison so this regression observes
// effect scheduling, rather than calling the callback unconditionally.
assert.ok(restoreDependencies);
let restoredView, restoreWrites = 0, previousDependencies;
const reactiveEnv = { n: tape.length, bars: tape, recentCount: 180, viewportRestore: { start: 1, end: 4 },
  savedViewportIndex, appliedViewportRestoreNonce: { current: null }, appliedViewportRestoreKey: { current: null },
  setView(value) { restoredView = value; restoreWrites++; }, setChartKeyStatus() {} };
const renderRestore = () => {
  const dependencies = compile(restoreDependencies, reactiveEnv);
  const changed = !previousDependencies || dependencies.some((value, index) => !Object.is(value, previousDependencies[index]));
  previousDependencies = dependencies;
  if (changed) compile(restore, reactiveEnv)();
};
renderRestore();
assert.deepEqual(restoredView, [1, 4]);
reactiveEnv.viewportRestore = { start: 20, end: 30 };
renderRestore();
assert.deepEqual(restoredView, [20, 30], "nonce-less numeric payload changes restore with stable bars");
reactiveEnv.viewportRestore = { start: 20, end: 30, startTime: tape[40].t, endTime: tape[50].t };
renderRestore();
assert.deepEqual(restoredView, [40, 50], "nonce-less UTC payload changes restore with stable bars");
restoredView = [70, 90];
const writesBeforeEquivalent = restoreWrites;
reactiveEnv.viewportRestore = { ...reactiveEnv.viewportRestore };
renderRestore();
assert.equal(restoreWrites, writesBeforeEquivalent, "an equivalent payload replacement preserves manual pan/zoom");
assert.deepEqual(restoredView, [70, 90]);
reactiveEnv.bars = [...tape];
renderRestore();
assert.equal(restoreWrites, writesBeforeEquivalent, "a tape refresh cannot reapply the same snapshot");
const repeatedPayload = reactiveEnv.viewportRestore;
reactiveEnv.viewportRestore = null;
renderRestore();
reactiveEnv.viewportRestore = repeatedPayload;
renderRestore();
assert.deepEqual(restoredView, [40, 50], "clearing a nonce-less restore permits intentional reuse of its payload");
reactiveEnv.viewportRestore = { start: 10, end: 15, nonce: 7 };
renderRestore();
const writesBeforeSameNonce = restoreWrites;
reactiveEnv.viewportRestore = { start: 12, end: 18, nonce: 7 };
renderRestore();
assert.equal(restoreWrites, writesBeforeSameNonce, "payload replacement with an applied nonce remains guarded");
reactiveEnv.viewportRestore = { start: 12, end: 18, nonce: 8 };
renderRestore();
assert.deepEqual(restoredView, [12, 18], "a fresh nonce still requests an explicit restore");

assert.match(source, /mfe_chart_view_v1_\$\{symbol\}_\$\{tf\}/,
  "viewport must be namespaced by symbol and timeframe");
assert.match(source, /interface SavedViewport \{ start: number; end: number; startTime\?: string; endTime\?: string \}/,
  "viewport persistence must retain timestamp identity as well as bounded indices");
assert.match(source, /function readSavedViewport\(key: string\): SavedViewport \| null/,
  "viewport storage must fail closed for malformed local state");
assert.match(source, /const a = saved\?\.startTime !== undefined \? savedViewportIndex\(bars, saved\.startTime, n - recentCount\)/,
  "viewport restore must prefer the retained start candle timestamp");
assert.match(source, /const b = saved\?\.endTime !== undefined \? savedViewportIndex\(bars, saved\.endTime, n - 1\)/,
  "viewport restore must prefer the retained end candle timestamp");
assert.match(source, /if \(hydratedViewportKey !== viewportStorageKey \|\| n < 2\) return;/,
  "viewport writes must wait until the matching symbol/timeframe tape is hydrated");
assert.match(source, /const viewport = \{ start, end, startTime: bars\[start\]\?\.t, endTime: bars\[end\]\?\.t \}/,
  "viewport writes must persist both bounded indices and candle timestamps");
assert.match(source, /localStorage\.setItem\(viewportStorageKey, JSON\.stringify\(viewport\)\)/);
assert.match(source, /onViewportChange\?\.\(viewport\)/,
  "mounted MicroChart must report its durable viewport to the focused snapshot exporter");
assert.match(source, /if \(n < 2 \|\| hydratedViewportKey === viewportStorageKey\) return;/,
  "hydration must not double-apply a retention shift after reanchoring an already mounted chart");
assert.match(source, /viewportRestore\?\.startTime !== undefined \? savedViewportIndex\(bars, viewportRestore\.startTime, startFallback\)/,
  "snapshot viewport restore must prefer timestamp identity before its bounded index fallback");
assert.match(source, /const startFallback = viewportRestore\.startTime !== undefined\s*\?\s*n - recentCount/,
  "expired timestamped snapshot starts must fall back to the recent edge instead of stale numeric indices");
assert.match(source, /const endFallback = viewportRestore\.endTime !== undefined\s*\?\s*n - 1/,
  "expired timestamped snapshot ends must fall back to the latest retained candle instead of stale numeric indices");
assert.match(source, /const reset = \(\) => \{ setView\(\[Math\.max\(0, n - recentCount\), n - 1\]\); setChartKeyStatus\("Recent bars shown\."\); \};/,
  "reset must remain the explicit recent-window escape hatch");
assert.match(source, /bars\[start\]\?\.t, bars\[end\]\?\.t, onViewportChange/,
  "viewport reporting must react when retained interior candles are refreshed even if tape endpoints are unchanged");
assert.match(source, /const restoreKey = JSON\.stringify\(\[viewportRestore\.startTime \?\? null, viewportRestore\.endTime \?\? null, viewportRestore\.start \?\? null, viewportRestore\.end \?\? null\]\)/,
  "nonce-less snapshot restores must be guarded by their durable UTC/index payload");
assert.match(source, /appliedViewportRestoreKey\.current === restoreKey/,
  "nonce-less restores must not reset pan/zoom on every retention refresh");
console.log("MICROCHART VIEWPORT PERSISTENCE PASS: timestamp-anchored pan/zoom resumes per symbol/timeframe without cross-context writes.");
