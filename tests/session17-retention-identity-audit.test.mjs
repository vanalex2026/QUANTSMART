import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
  key: index => [...values.keys()][index] ?? null,
  get length() { return values.size; },
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };

const bundle = await build({
  entryPoints: ["src/lib/mt5Connection.ts"], absWorkingDir: app,
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const connection = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const account = (id, server, generation) => ({ connected: true, supported: true, account_kind: "DEMO", account_id: id, server, generation, trade_allowed: false });
let resolveConnect;
globalThis.fetch = async input => {
  const path = new URL(String(input), "http://localhost").pathname;
  if (path.endsWith("/disconnect")) return { ok: true, json: async () => ({ connected: false, supported: true, account_kind: "UNKNOWN", reason: "NOT_ATTACHED", trade_allowed: false }) };
  return new Promise(resolve => { resolveConnect = () => resolve({ ok: true, json: async () => account("1", "Broker-A", 1) }); });
};

// An account transition while Auto-Attach is awaiting /connect must cancel
// the late response; otherwise it can overwrite the newer cache namespace.
const accountRace = connection.autoAttachTerminal();
await new Promise(resolve => setTimeout(resolve, 0));
connection.observeTerminalAccount(account("2", "Broker-B", 2));
resolveConnect();
await assert.rejects(accountRace, error => error?.name === "AbortError", "late Auto-Attach response must be rejected after account identity changes");
assert.equal(connection.terminalCacheScope(), "2|Broker-B|2");

// Explicit detach has the same late-response protection and clears the scope.
values.clear();
const detachRace = connection.autoAttachTerminal();
await new Promise(resolve => setTimeout(resolve, 0));
await connection.detachTerminal();
resolveConnect();
await assert.rejects(detachRace, error => error?.name === "AbortError", "late Auto-Attach response must be rejected after explicit detach");
assert.equal(connection.terminalCacheScope(), "detached");

console.log("SESSION 17 RETENTION/IDENTITY AUDIT PASS: account transitions and explicit detach reject late Auto-Attach responses and leave the cache scope detached or current.");
