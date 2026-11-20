import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const bundled = await build({ stdin: { contents: "export * from './src/lib/candleWindowGeometry.ts'", resolveDir: app }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { candleWindowGeometry } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const bars = Array.from({ length: 15 }, (_, i) => ({ h: 102 + i, l: 98 + i, c: 100 + i }));
const mutatedFuture = bars.map((bar, i) => i <= 7 ? { ...bar } : { h: 50000 + i, l: -50000 - i, c: 40000 + i });

for (const direction of ["UP", "DOWN"]) {
  const marker = { i: 7, price: 107, direction };
  const actual = candleWindowGeometry(bars, marker);
  assert.deepEqual(actual, { entry: 107, localAtr: 4, target: direction === "UP" ? 115.8 : 98.2, invalidation: direction === "UP" ? 103 : 111 }, "landmarks use the six causal true ranges ending at the marker");
  assert.deepEqual(candleWindowGeometry(mutatedFuture, marker), actual, "changing every future candle must leave entry, target, invalidation and ATR unchanged");
  assert.deepEqual(candleWindowGeometry(bars.slice(0, marker.i + 1), marker), actual, "removing all future candles must preserve setup geometry");
  assert.deepEqual(candleWindowGeometry([...mutatedFuture, { h: 1e9, l: -1e9, c: 0 }], marker), actual, "appending future candles must preserve setup geometry");
}

const firstMarker = { i: 0, price: 100, direction: "UP" };
const insufficient = { entry: 100, localAtr: null, target: null, invalidation: null };
assert.deepEqual(candleWindowGeometry(bars, firstMarker), insufficient, "a first-bar anchor has no preceding close for a true range; future candles cannot supply it");
assert.deepEqual(candleWindowGeometry(mutatedFuture, firstMarker), insufficient);
assert.deepEqual(candleWindowGeometry(bars.slice(0, 1), firstMarker), insufficient);
assert.deepEqual(candleWindowGeometry(bars.slice(0, 2), { i: 1, price: 101, direction: "UP" }), { entry: 101, localAtr: 4, target: 109.8, invalidation: 97 }, "the shortest valid causal prefix uses its one available true range");
assert.equal(candleWindowGeometry(bars, { i: 7, price: 107, direction: "NEUTRAL" }).target, null);
assert.equal(candleWindowGeometry(bars, { i: 15, price: 107, direction: "UP" }).target, null, "missing anchors must withhold geometry");
const invalidPrefix = bars.map((bar, i) => i === 6 ? { ...bar, h: NaN } : bar);
assert.equal(candleWindowGeometry(invalidPrefix, { i: 7, price: 107, direction: "UP" }).target, null, "invalid setup evidence must withhold geometry");

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const candleWindow = source.slice(source.indexOf("function CandleWindow("), source.indexOf("export function Microscope("));
assert.match(candleWindow, /const \{ entry, target, invalidation \} = candleWindowGeometry\(bars, marker\)/, "the rendered pattern window must use the tested causal landmark helper");
assert.doesNotMatch(candleWindow, /rows\.slice\(1\)\.reduce/, "the future-inclusive display window must not price the setup");
assert.match(candleWindow, /NEXT \{outcome\}/, "future rows retain their separate observed outcome label");
const runner = readFileSync(new URL("../scripts/test.mjs", import.meta.url), "utf8");
assert.match(runner, /'candle-window-causality'/, "the default unit lane must execute the causality regression");
console.log("CANDLE WINDOW CAUSALITY PASS: future mutation/removal/appending cannot change setup prices; insufficient and invalid causal prefixes withhold target/invalidation.");
