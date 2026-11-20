import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: [new URL("../mfe_ux_lab/cockpit/src/lib/liveTickModel.ts", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")],
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const { liveTickFreshness, parseLiveTickFrame } = await import(
  "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"),
);

const now = Date.parse("2026-11-19T00:05:00.000Z");
const frame = parseLiveTickFrame({
  ok: true, cursor: "5:1:2", generation: 5, broker_symbol: "GOLD",
  // Deliberately out of transport order: freshness must use the newest tick.
  ticks: [
    { time_msc: now - 1_000, bid: 100, ask: 101, last: 100, flags: 2 },
    { time_msc: now - 30_000, bid: 100, ask: 101, last: 100, flags: 2 },
    { time_msc: now - 2_000, bid: 100, ask: 101, last: 100, flags: 2 },
  ],
  bar: null, closed_bar: null,
});
assert.ok(frame);
const fresh = liveTickFreshness(frame, now);
assert.equal(fresh.status, "live");
assert.equal(fresh.latestTimeMs, now - 1_000);
assert.equal(fresh.ageMs, 1_000);

assert.equal(liveTickFreshness(frame, now + 180_000).status, "stale", "the 180s upper bound remains fail-closed");
assert.equal(liveTickFreshness(null, now).status, "stale", "no verified frame is stale");
console.log("WAVE 5 LIVE TICK FRESHNESS PASS: newest verified tick wins over transport order; stale and empty bounds remain fail-closed.");
