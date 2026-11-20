import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 };
globalThis.window = { dispatchEvent() {} };
const bundled = await build({ entryPoints: ["src/lib/mt5Connection.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const connection = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

let requests = [];
globalThis.fetch = async (input, init) => {
  requests.push({ path: new URL(String(input), "http://localhost").pathname, init });
  return { ok: true, json: async () => ({ ok: true, connected: true, supported: true, account_kind: "DEMO", account_id: "1", server: "Broker", generation: 1, trade_allowed: false }) };
};
const controller = new AbortController();
const attached = await connection.autoAttachTerminal(controller.signal);
assert.equal(attached.connected, true);
assert.equal(requests.length, 1);
assert.equal(requests[0].path, "/api/mt5/connect");
assert.equal(requests[0].init.method, "POST");
assert.equal(requests[0].init.body, "{}", "automatic attach must never send credentials");
assert.equal(requests[0].init.headers["X-MFE-Request"], "1");

const canceled = new AbortController();
canceled.abort();
await assert.rejects(() => connection.autoAttachTerminal(canceled.signal), /canceled|aborted/i);
assert.equal(requests.length, 1, "an already-canceled auto-attach must not issue a request");

assert.equal(connection.canAutoAttachTerminal({ connected: false, supported: true, reason: "NOT_ATTACHED", account_kind: "UNKNOWN", trade_allowed: false }), true);
assert.equal(connection.canAutoAttachTerminal({ connected: false, supported: true, reason: "TERMINAL_DISCONNECTED", account_kind: "UNKNOWN", trade_allowed: false }), true, "a lost terminal session is eligible for bounded Auto-Attach");
assert.equal(connection.canAutoAttachTerminal({ connected: false, supported: true, reason: "ACCOUNT_UNAVAILABLE", account_kind: "UNKNOWN", trade_allowed: false }), true, "a transient account probe failure is eligible for bounded Auto-Attach");
assert.equal(connection.canAutoAttachTerminal({ connected: false, supported: true, reason: "MT5_AUTHORIZATION_FAILED", account_kind: "UNKNOWN", trade_allowed: false }), false, "authorization failures require explicit user action");
assert.equal(connection.canAutoAttachTerminal({ connected: false, supported: false, reason: "TERMINAL_DISCONNECTED", account_kind: "UNKNOWN", trade_allowed: false }), false, "unsupported MT5 environments never auto-attach");
assert.equal(connection.canAutoAttachTerminal({ connected: true, supported: true, reason: "TERMINAL_DISCONNECTED", account_kind: "DEMO", trade_allowed: false }), false, "a connected account never starts another Auto-Attach");
await connection.detachTerminal();
assert.equal(connection.canAutoAttachTerminal({ connected: false, supported: true, reason: "NOT_ATTACHED", account_kind: "UNKNOWN", trade_allowed: false }), false, "explicit detach pauses automatic retries");
assert.equal(connection.canAutoAttachTerminal({ connected: false, supported: true, reason: "TERMINAL_DISCONNECTED", account_kind: "UNKNOWN", trade_allowed: false }), false, "explicit detach also pauses transient-session reconnects");
console.log("MT5 AUTO-ATTACH PASS: empty-settings request, cancellation and explicit-detach pause are enforced.");
