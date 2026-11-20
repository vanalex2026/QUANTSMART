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
const { parseLiveTickFrame } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const expected = { symbol: "XAUUSD", tf: "M5", generation: 7 };
const base = {
  ok: true,
  cursor: "7:1793156400000:1",
  generation: 7,
  broker_symbol: "GOLD",
  ticks: [],
  bar: null,
  closed_bar: null,
};

// The focused stream is scoped to the canonical symbol/timeframe. Omitting
// either identity marker must not let an unscoped packet reach the chart.
assert.equal(parseLiveTickFrame(base, expected), null, "missing canonical symbol/timeframe identity must fail closed");
assert.equal(parseLiveTickFrame({ ...base, symbol: "XAUUSD" }, expected), null, "missing timeframe identity must fail closed");
assert.equal(parseLiveTickFrame({ ...base, timeframe: "M5" }, expected), null, "missing symbol identity must fail closed");
assert.equal(parseLiveTickFrame({ ...base, symbol: "EURUSD", timeframe: "M5" }, expected), null, "wrong canonical symbol must fail closed");
assert.equal(parseLiveTickFrame({ ...base, symbol: "XAUUSD", timeframe: "H1" }, expected), null, "wrong canonical timeframe must fail closed");
// Broker aliases are terminal-specific (for example GOLD or XAUUSDm) and are
// therefore allowed to differ while canonical symbol/timeframe identity stays
// fixed.

// Existing generation/cursor and malformed-frame boundaries remain covered by
// the dedicated live-forming tests. This receipt isolates route identity.
console.log("WAVE 27 REALTIME IDENTITY AUDIT PASS: canonical XAUUSD/M5 payload identity is required before forming presentation.");
