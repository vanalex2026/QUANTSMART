import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({ entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/microChartLayout.ts", import.meta.url))], bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent" });
const { timeAxisTicks, defaultVisibleCandles } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

for (const width of [212, 282, 620, 1240, 1800]) {
  const count = defaultVisibleCandles(width);
  const slot = width / (count + Math.min(22, Math.max(4, Math.round(count * 0.07))));
  assert.ok(slot * 0.64 >= 3.8, `default candle bodies remain readable at ${width}px`);
  for (const n of [8, 24, 400, 2500]) {
    const slot = width / (n + Math.min(22, Math.max(4, Math.round(n * 0.07))));
    const ticks = timeAxisTicks(100, 100 + n - 1, slot, width);
    assert.ok(ticks.length > 0);
    ticks.forEach((i, k) => {
      const x = (i - 100 + 0.5) * slot;
      assert.ok(i >= 100 && i < 100 + n);
      assert.ok(x >= 36 && x <= width - 36, "date/time label stays inside plot");
      if (k) assert.ok((i - ticks[k - 1]) * slot >= 80, "date/time labels never overlap at any zoom");
    });
  }
}
// Adjacent pan frames must keep a tick attached to the same absolute candle;
// re-basing the first label from each viewport start makes the axis visibly
// jump at integer candle boundaries.
const anchoredA = timeAxisTicks(100, 280, 7.3, 1240);
const anchoredB = timeAxisTicks(101, 281, 7.3, 1240);
assert.ok(anchoredA.some((i) => anchoredB.includes(i)), "time ticks keep absolute candle identities across pan frames");
assert.deepEqual(timeAxisTicks(0, 400, 0, 282), []);
assert.deepEqual(timeAxisTicks(0, 400, 1, 40), []);
assert.deepEqual(timeAxisTicks(0, Infinity, 1, 282), []);
assert.equal(defaultVisibleCandles(NaN), 24);
console.log("MICROCHART LAYOUT PASS: readable initial candles and bounded, separated time labels across phone/desktop and zoom ranges.");
