import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/adapters/loadSimOhlc.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const loader = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const values = new Map([["mfe_live_ext_detached_XAUUSD_XAUUSD_H1", JSON.stringify([
  { i: 0, t: "2026-01-01T00:00:00+00:00", o: 10, h: 12, l: 9, c: 11, r: "N" },
  { i: 1, t: "2026-01-01T01:00:00Z", o: 11, h: 13, l: 10, c: 12, r: "N" },
])]]);
globalThis.localStorage = { getItem: (key) => values.get(key) ?? null };
const staticTape = { symbol: "XAUUSD", timeframe: "H1", source: "MT5_HISTORY", n: 1, bars: [{ i: 0, t: "2026-01-01T00:00:00Z", o: 1, h: 2, l: 0, c: 1, r: "N" }] };
const merged = loader.appendLiveExt(staticTape, "H1");
assert.equal(merged.bars.length, 2);
assert.equal(merged.bars[0].c, 11, "inclusive extension boundary must replace corrected static OHLC");
assert.deepEqual(merged.bars.map((bar) => bar.i), [0, 1]);
assert.deepEqual(merged.bars.map((bar) => bar.t), ["2026-01-01T00:00:00", "2026-01-01T01:00:00"]);

let staticFetches = 0;
globalThis.fetch = async () => {
  staticFetches++;
  return { ok: true, json: async () => ({ symbol: "XAUUSD", timeframe: "H1", n: 1, bars: [staticTape.bars[0]] }) };
};
values.set("mfe_mt5_account_namespace", "100|Broker-A|11");
await loader.loadSimOhlc("H1", true, "XAUUSD");
values.set("mfe_mt5_account_namespace", "200|Broker-B|22");
await loader.loadSimOhlc("H1", true, "XAUUSD");
assert.equal(staticFetches, 2, "terminal account transition must invalidate in-memory merged tape cache");
const aliasKey = "mfe_live_ext_200%7CBroker-B%7C22_XAUUSD_GOLD.i%23_H1";
values.set(aliasKey, JSON.stringify([{ ...staticTape.bars[0], c: 1.5 }]));
values.set("mfe_live_symbol", "GOLD.i#");
const aliasTape = await loader.loadSimOhlc("H1", true, "XAUUSD");
assert.equal(staticFetches, 3, "broker alias transition must invalidate the in-memory merged tape cache");
assert.equal(aliasTape.bars[0].c, 1.5, "alias cache must read only the active broker instrument's persisted extension");
values.set("mfe_live_symbol", "XAUUSD");
assert.equal((await loader.loadSimOhlc("H1", true, "XAUUSD")).bars[0].c, 1, "switching back cannot reuse the alternate broker alias's merged promise");

loader.clearSimCache();
globalThis.fetch = async () => ({ ok: true, json: async () => {
  values.set("mfe_live_symbol", "GOLD.i#");
  return { symbol: "XAUUSD", timeframe: "H1", n: 1, bars: [staticTape.bars[0]] };
} });
assert.equal(await loader.loadSimOhlc("H1", true, "XAUUSD"), null, "an alias change during loading cannot cache a mixed-scope extension");
values.delete("mfe_live_symbol");
loader.clearSimCache();
let tailFetches = 0;
globalThis.fetch = async input => {
  tailFetches++;
  return { ok: true, json: async () => String(input).endsWith("/result")
    ? { result: { bars: [staticTape.bars[0]], total_bars: 1 } }
    : { id: "tail-audit", status: "done" } };
};
assert.equal((await loader.loadSimOhlcTail("H1", 1, true, "XAUUSD")).bars[0].c, 1);
values.set("mfe_live_symbol", "GOLD.i#");
assert.equal((await loader.loadSimOhlcTail("H1", 1, true, "XAUUSD")).bars[0].c, 1.5);
assert.equal(tailFetches, 4, "tail promises must be independently scoped to the active broker alias");
loader.clearSimCache();
values.delete("mfe_live_symbol");
globalThis.fetch = async input => ({ ok: true, json: async () => {
  if (String(input).endsWith("/result")) {
    values.set("mfe_live_symbol", "GOLD.i#");
    return { result: { bars: [staticTape.bars[0]], total_bars: 1 } };
  }
  return { id: "tail-race", status: "done" };
} });
assert.equal(await loader.loadSimOhlcTail("H1", 1, true, "XAUUSD"), null, "a broker alias change during tail loading must fail closed");
values.delete("mfe_live_symbol");
const loaderSource = readFileSync(new URL("../mfe_ux_lab/cockpit/src/adapters/loadSimOhlc.ts", import.meta.url), "utf8");
assert.match(loaderSource, /_cache\.clear\(\); _tailCache\.clear\(\);/, "global cache invalidation must clear stale tail promises too");
assert.match(loaderSource, /_tailCache\.keys\(\)\]\) if \(k\.includes\(`::\$\{tf\}::tail`\)\)/, "timeframe invalidation must clear cached tails");

loader.clearSimCache();
globalThis.fetch = async () => ({ ok: true, json: async () => ({ symbol: "EURUSD", timeframe: "M5", n: 1, bars: [staticTape.bars[0]] }) });
assert.equal(await loader.loadSimOhlc("H1", false, "XAUUSD"), null, "a replay file with cross-symbol/timeframe metadata must fail closed");
globalThis.fetch = async () => ({ ok: true, json: async () => ({ ...staticTape, coverage_status: "EMPTY", coverage_chunks: 1 }) });
loader.clearSimCache();
assert.equal(await loader.loadSimOhlc("H1", false, "XAUUSD"), null, "empty snapshot coverage must fail closed");
console.log("SIM OHLC MERGE PASS: persisted live corrections replace the final static candle and remain chronological.");
