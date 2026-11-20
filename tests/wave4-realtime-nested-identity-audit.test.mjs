import assert from "node:assert/strict";
import { createRequire } from "node:module";

const app = new URL("../mfe_ux_lab/cockpit", import.meta.url);
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: [new URL("../mfe_ux_lab/cockpit/src/lib/liveTickModel.ts", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")],
  absWorkingDir: app.pathname.replace(/^\/(\w:)/, "$1"),
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const { parseLiveTickFrame } = await import(
  "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"),
);

const frame = {
  ok: true,
  cursor: "7:1793156400000:1",
  generation: 7,
  symbol: "XAUUSD",
  timeframe: "M5",
  broker_symbol: "GOLD",
  ticks: [],
  bar: {
    symbol: "EURUSD",
    timeframe: "H1",
    time: "2026-10-28T03:05:00.000Z",
    open: 100,
    high: 103,
    low: 99,
    close: 102,
  },
  closed_bar: {
    symbol: "EURUSD",
    timeframe: "H1",
    time: "2026-10-28T03:00:00.000Z",
    open: 99,
    high: 101,
    low: 98,
    close: 100,
  },
};

const parsed = parseLiveTickFrame(frame, { symbol: "XAUUSD", tf: "M5" });
assert.equal(parsed, null, "nested symbol/timeframe metadata must match the expected XAUUSD/M5 scope");

const legacyFrame = structuredClone(frame);
delete legacyFrame.bar.symbol;
delete legacyFrame.bar.timeframe;
delete legacyFrame.closed_bar.symbol;
delete legacyFrame.closed_bar.timeframe;
assert.ok(parseLiveTickFrame(legacyFrame, { symbol: "XAUUSD", tf: "M5" }), "older payloads without nested metadata remain compatible");
console.log("WAVE 4 REALTIME NESTED IDENTITY AUDIT PASS: nested bar metadata is scope-checked while omitted legacy metadata remains compatible.");
