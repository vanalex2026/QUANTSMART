import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: "export { selectedLowVolatilityContext } from './src/components/ChartPatternInspector.tsx';", resolveDir: app },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent", loader: { ".css": "empty" },
});
const { selectedLowVolatilityContext } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

const M5 = 300_000;
const epoch = Date.parse("2026-11-10T00:00:00.000Z");
const time = i => new Date(epoch + i * M5).toISOString();
const bars = Array.from({ length: 80 }, (_, i) => {
  const range = i < 48 ? 10 : 2;
  return { t: time(i), o: 100, h: 100 + range / 2, l: 100 - range / 2, c: 100.2, closed: true };
});

test("selected activity context reads only the validated prefix", () => {
  const future = bars.slice(0, 60).concat(Array.from({ length: 20 }, (_, i) => {
    const row = {};
    for (const key of ["t", "o", "h", "l", "c", "closed"]) Object.defineProperty(row, key, { enumerable: true, get() { throw new Error(`future ${key} read at ${i}`); } });
    return row;
  }));
  const context = selectedLowVolatilityContext(future, 59, time(59), true, false);
  assert.equal(context.state, "LOW_ACTIVITY_CONTEXT");
  assert.equal(context.contextEnd, time(59));
  assert.equal(context.bars, 60);
});

test("replay, unavailable geometry and invalid indexes withhold without touching tape rows", () => {
  const guarded = new Proxy(bars, { get(target, property, receiver) {
    if (property === "0" || property === "length") return Reflect.get(target, property, receiver);
    throw new Error(`unexpected retained row read: ${String(property)}`);
  }});
  assert.equal(selectedLowVolatilityContext(guarded, 59, time(59), true, true).reason, "UNVERIFIED_CURRENT_EVIDENCE");
  assert.equal(selectedLowVolatilityContext(guarded, 59, time(59), false, false).reason, "UNVERIFIED_CURRENT_EVIDENCE");
  assert.equal(selectedLowVolatilityContext(guarded, -1, time(59), true, false).reason, "UNVERIFIED_CURRENT_EVIDENCE");
});

console.log("PATTERN LOW-VOLATILITY INSPECTOR PASS: selected inspection exposes bounded local activity without future OHLC/timestamp reads or replay authority changes.");
