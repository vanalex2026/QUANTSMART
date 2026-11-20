import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: ["src/lib/focusedM5CloseClock.ts"], absWorkingDir: app,
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const helper = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const bar = { t: "2026-01-01T00:55:00Z", o: 10, h: 12, l: 9, c: 11 };
const at = (value) => Date.parse(value);

assert.deepEqual(helper.focusedM5CloseClock(at("2026-01-01T00:59:00Z"), bar), {
  state: "FRESHNESS_WAIT",
  nextExpectedCloseUtc: "2026-01-01T01:00:00.000Z",
  nextExpectedCloseMs: at("2026-01-01T01:00:00Z"),
  remainingSeconds: 60,
  latestClosedBarUtc: bar.t,
}, "a timestamp whose close is still ahead must remain a freshness wait");

const closed = helper.focusedM5CloseClock(at("2026-01-01T01:02:30.250Z"), bar);
assert.equal(closed.state, "CLOSED");
assert.equal(closed.nextExpectedCloseUtc, "2026-01-01T01:05:00.000Z");
assert.equal(closed.remainingSeconds, 150, "remaining seconds are rounded up and never negative");

assert.equal(helper.focusedM5CloseClock(at("2026-01-01T01:02:00Z"), { ...bar, closed: false }).state, "UNAVAILABLE",
  "an explicit forming row cannot be promoted as closed-bar timing evidence");
assert.equal(helper.focusedM5CloseClock(at("2026-01-01T01:02:00Z"), undefined).state, "UNAVAILABLE");
assert.equal(helper.focusedM5CloseClock(at("2026-01-01T01:02:00Z"), { ...bar, t: "2026-01-01T00:56:00Z" }).state, "UNAVAILABLE",
  "off-grid UTC identities fail closed");
assert.equal(helper.focusedM5CloseClock(Number.NaN, bar).state, "UNAVAILABLE",
  "an invalid observation clock cannot produce a countdown");

console.log("FOCUSED M5 CLOSE CLOCK PASS: canonical UTC scheduling, freshness wait, forming-bar refusal and bounded seconds.");

