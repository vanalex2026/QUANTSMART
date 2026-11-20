import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const bundled = await build({ stdin: { contents: "export * from './src/lib/focusedConnectionBadge.ts'", resolveDir: app }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { focusedConnectionBadge } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

assert.equal(focusedConnectionBadge({ historyState: "loading" }), "MT5 HISTORY · SYNCING");
assert.equal(focusedConnectionBadge({ historyState: "ready", account: { connected: false } }), "MT5 / 2Y CLOSED", "promoted historical tape does not claim a current live feed");
assert.equal(focusedConnectionBadge({ historyState: "fallback", account: { connected: false, reason: "HISTORICAL_MODE" } }), "LOCAL SNAPSHOT · HISTORICAL MODE");
assert.equal(focusedConnectionBadge({ historyState: "fallback", historyReason: "HISTORICAL_MODE · unavailable history" }), "LOCAL SNAPSHOT · HISTORICAL MODE");
assert.equal(focusedConnectionBadge({ historyState: "fallback", account: { connected: true } }), "MT5 CONNECTED · HISTORY FALLBACK");
assert.equal(focusedConnectionBadge({ historyState: "fallback", terminalAttached: true }), "MT5 CONNECTED · HISTORY FALLBACK", "shared attachment proof works while the legacy live bundle poller is disabled");
assert.equal(focusedConnectionBadge({ historyState: "fallback", account: { connected: false }, terminalAttached: true }), "LOCAL SNAPSHOT · HISTORY UNAVAILABLE", "a known disconnected account overrides an older attachment flag");
assert.equal(focusedConnectionBadge({ historyState: "idle", terminalAttached: true }), "MT5 CONNECTED · HISTORY PENDING");
assert.equal(focusedConnectionBadge({ historyState: "idle", checking: true }), "LOCAL SNAPSHOT · MT5 CHECKING");
assert.equal(focusedConnectionBadge({ historyState: "idle" }), "MT5 · CONNECTION UNVERIFIED");
assert.equal(focusedConnectionBadge({ historyState: "fallback" }), "LOCAL SNAPSHOT · HISTORY UNAVAILABLE", "disabled account polling cannot be treated as evidence that MT5 is offline");
for (const historyState of ["idle", "fallback"]) {
  for (const account of [undefined, null, { connected: false }, { connected: false, reason: "LOCAL_BRIDGE_UNAVAILABLE" }]) {
    const label = focusedConnectionBadge({ historyState, account });
    assert.doesNotMatch(label, /offline|\bSIM\b/i, "unknown connectivity and unavailable history must not invent an offline state or simulated source");
  }
}
console.log("FOCUSED CONNECTION BADGE PASS: history verification, promoted tape, historical mode, attachment, checking and unknown/fallback provenance remain distinct.");
