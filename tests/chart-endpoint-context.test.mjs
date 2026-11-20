import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");
function expressions(path) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const values = new Map();
  function visit(node) { if (ts.isVariableDeclaration(node) && node.initializer) values.set(node.name.getText(ast), node.initializer.getText(ast)); ts.forEachChild(node, visit); }
  visit(ast);
  return { source, get: (name, env) => new Function("env", `with (env) { return (${values.get(name)}); }`)(env) };
}
const chart = expressions("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx");
// A hovered historical candle must not display the endpoint candle's EMA.
// Exercise the component's actual legend expressions with distinct values at
// each index, including the optional forming-tail projection path.
for (const hover of [null, { x: 12 }]) {
  const env = {
    locale: "en",
    hover, end: 4, barAt: () => 1,
    displayEmaF: [100, 110, 120, 130, 140],
    displayEmaS: [200, 210, 220, 230, 240],
    formingEmaF: 145, formingEmaS: 245, liveTail: null,
    seriesValue: (values, index, tail) => index === 4 ? tail : values[index],
  };
  env.legendI = chart.get("legendI", env);
  assert.equal(chart.get("legendEmaF", env), hover ? 110 : 145, "fast EMA follows the same candle as OHLC");
  assert.equal(chart.get("legendEmaS", env), hover ? 210 : 245, "slow EMA follows the same candle as OHLC");
}
for (const [end, formingVisible, label] of [[4, true, "VIEW"], [4, false, "VIEW"], [9, false, "LAST"], [9, true, "LIVE"]]) {
  const env = { locale: "en", end, formingVisible, bars: Array(10), last: { c: 100, o: 99, h: 101, l: 98, t: "2026-01-01T00:00:00Z" }, closedTail: { c: 99 }, fp: String };
  env.endpointIsTail = chart.get("endpointIsTail", env);
  env.formingInViewport = chart.get("formingInViewport", env);
  assert.equal(chart.get("endpointLabel", env), label);
  const readout = chart.get("latestReadout", env);
  assert.equal(readout.includes("forming price"), label === "LIVE", "a forming tail outside the visible window cannot turn a historical candle into a live price");
  assert.equal(readout.includes("historical viewport"), label === "VIEW");
}
assert.match(chart.source, /data-chart-endpoint=\{endpointLabel\}/);
const page = expressions("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx");
for (const ready of [false, true]) {
  const env = {
    locale: "en",
    forecastEvidenceReady: ready,
    focusedSourceBadgeReady: ready,
    forecastGateReasons: ["verified MT5 history", "fresh closed-bar evidence"],
    forecastDirection: "UP",
    forecastReceiptDistribution: "UP 60% / DOWN 40%",
    forecastReceiptLatestClosedUtc: "2026-01-01T00:00:00Z",
    focusedCopy: {
      allForecastGatesPass: "all gates pass",
      forecastWithheld: "withheld",
      evidenceContract: "missing evidence",
      evidenceReceipt: "Forecast evidence receipt",
      forecastH1Unavailable: "H+1 unavailable",
      verifiedHistory: "Verified MT5 closed-bar history",
      localFallbackUnverified: "Local historical fallback; MT5 history unverified",
    },
  };
  env.forecastReceiptDirection = page.get("forecastReceiptDirection", env);
  env.forecastReceiptGate = page.get("forecastReceiptGate", env);
  env.forecastReceiptSource = page.get("forecastReceiptSource", env);
  const receipt = page.get("forecastReceiptSummary", env);
  assert.equal(env.forecastReceiptDirection, ready ? "UP" : "WAIT");
  if (!ready) {
    assert.match(receipt, /withheld verified MT5 history/);
    assert.match(receipt, /Local historical fallback; MT5 history unverified/);
  } else assert.match(receipt, /all gates pass.*Verified MT5 closed-bar history/);
}
console.log("CHART ENDPOINT CONTEXT PASS: historical VIEW, retained LAST and forming LIVE states; receipts disclose missing gates and fallback source.");
