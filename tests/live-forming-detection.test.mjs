import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: [new URL("../mfe_ux_lab/cockpit/src/lib/liveTickModel.ts", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")],
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const { liveFormingDetection, parseLiveTickFrame } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const closedTime = "2026-10-28T03:00:00.000Z";
const frame = parseLiveTickFrame({
  ok: true, cursor: "4:1793156400000:2", generation: 4, symbol: "XAUUSD", timeframe: "M5", broker_symbol: "GOLD",
  ticks: [{ time_msc: Date.parse("2026-10-28T03:06:03Z"), bid: 100, ask: 101, last: 100, flags: 2 }],
  bar: { time: "2026-10-28T03:05:00.000Z", open: 100, high: 103, low: 99, close: 102 },
  closed_bar: { time: closedTime, open: 99, high: 101, low: 98, close: 100 },
});
assert.ok(frame);
assert.equal(parseLiveTickFrame({
  ok: true, cursor: "3:1793156400000:2", generation: 4, symbol: "XAUUSD", timeframe: "M5", broker_symbol: "GOLD",
  ticks: [], bar: null, closed_bar: null,
}), null, "cursor generation must match the frame generation");
assert.equal(parseLiveTickFrame({
  ok: true, cursor: "4:1793156400000:2", generation: 4, symbol: "XAUUSD", timeframe: "M5", broker_symbol: "GOLD",
  ticks: [{ time_msc: 0, bid: 100, ask: 101, last: 100, flags: 2 }], bar: null, closed_bar: null,
}), null, "non-positive tick timestamps must fail closed");
assert.equal(parseLiveTickFrame({
  ok: true, cursor: "4:1793156400000:2", generation: 4, symbol: "XAUUSD", timeframe: "M5", broker_symbol: "GOLD",
  ticks: [{ time_msc: Date.parse("2026-10-28T03:01:03Z"), bid: 100, ask: 101, last: 100, flags: 2 }],
  bar: { time: "2026-10-28T03:05:00.000Z", open: 100, high: 103, low: 99, close: 102 },
  closed_bar: { time: "2026-10-28T03:00:00.000Z", open: 99, high: 101, low: 98, close: 100 },
}, { tf: "M5" }), null, "a forming candle from another M5 bucket must fail closed");
assert.equal(parseLiveTickFrame({
  ok: true, cursor: "4:1793156400000:2", generation: 4, symbol: "XAUUSD", timeframe: "M5", broker_symbol: "GOLD",
  ticks: [{ time_msc: Date.parse("2026-10-28T03:11:03Z"), bid: 100, ask: 101, last: 100, flags: 2 }],
  bar: { time: "2026-10-28T03:05:00.000Z", open: 100, high: 103, low: 99, close: 102 },
  closed_bar: { time: "2026-10-28T03:00:00.000Z", open: 99, high: 101, low: 98, close: 100 },
}, { tf: "M5" }), null, "a valid M5 tail with a future tick bucket must fail closed");
assert.equal(parseLiveTickFrame({
  ok: true, cursor: "4:1793156400000:2", generation: 4, symbol: "XAUUSD", timeframe: "M5", broker_symbol: "GOLD",
  ticks: [], bar: null,
  closed_bar: { time: "2026-10-28T03:01:00.000Z", open: 99, high: 101, low: 98, close: 100 },
}, { tf: "M5" }), null, "an off-grid closed M5 identity must fail closed even without a forming tail");
assert.ok(parseLiveTickFrame({
  ok: true, cursor: "4:1793156400000:2", generation: 4, symbol: "XAUUSD", timeframe: "M5", broker_symbol: "GOLD",
  ticks: [{ time_msc: Date.parse("2026-10-28T03:06:03Z"), bid: 100, ask: 101, last: 100, flags: 2 }],
  bar: { time: "2026-10-28T03:05:00.000Z", open: 100, high: 103, low: 99, close: 102 },
  closed_bar: { time: "2026-10-28T02:55:00.000Z", open: 99, high: 101, low: 98, close: 100 },
}, { tf: "M5" }), "an integral M5 session gap remains an ordered live tail");
assert.equal(parseLiveTickFrame({
  ok: true, cursor: "4:1793156400000:2", generation: 4, symbol: "EURUSD", timeframe: "M5", broker_symbol: "GOLD",
  ticks: [], bar: null, closed_bar: null,
}, { symbol: "XAUUSD", tf: "M5" }), null, "a late packet for another canonical symbol must fail closed");
const live = liveFormingDetection(frame, "live", closedTime);
assert.equal(live.state, "PROVISIONAL");
assert.equal(live.direction, "UP");
assert.equal(live.label, "PROVISIONAL CURRENT UP CANDLE");
assert.match(live.reason, /50%/);
assert.match(live.authority, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);

const stale = liveFormingDetection(frame, "stale", closedTime);
assert.equal(stale.state, "STALE");
assert.equal(stale.direction, "UP");

const reconnecting = liveFormingDetection(frame, "reconnecting", closedTime);
assert.equal(reconnecting.state, "WAIT");
assert.equal(reconnecting.direction, "WAIT");
assert.match(reconnecting.reason, /reconnecting or paused/);

const closedOnly = liveFormingDetection(frame, "live", "2026-10-28T03:05:00.000Z");
assert.equal(closedOnly.state, "WAIT");
assert.equal(closedOnly.timestamp, null);

assert.equal(liveFormingDetection(null, "live").state, "WAIT");
console.log("LIVE FORMING DETECTION PASS: tick-driven provisional readout, stale/reconnect withholding, closed-boundary guard and authority labels.");

