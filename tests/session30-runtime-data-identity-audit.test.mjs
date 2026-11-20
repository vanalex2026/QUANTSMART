import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const receipt = JSON.parse(readFileSync(new URL("artifacts/session30-runtime-data-identity-audit.json", root), "utf8"));
const connection = readFileSync(new URL("mfe_ux_lab/cockpit/src/lib/mt5Connection.ts", root), "utf8");
const status = readFileSync(new URL("mfe_ux_lab/cockpit/src/shell/ConnectionStatus.tsx", root), "utf8");
const proxy = readFileSync(new URL("mfe_ux_lab/cockpit/tools/mt5BridgeProxy.mjs", root), "utf8");
const bootstrap = readFileSync(new URL("scripts/bootstrap.mjs", root), "utf8");
const bridge = readFileSync(new URL("bridge/mt5_bridge.py", root), "utf8");

assert.equal(receipt.runtime.bridgeProbe.httpStatus, 200);
assert.equal(receipt.runtime.bridgeProbe.service, "mfe-mt5-readonly");
assert.equal(receipt.runtime.bridgeProbe.authority, "SHADOW_ONLY");
assert.equal(receipt.runtime.bridgeProbe.decision, "NO_DECISION");
assert.equal(receipt.runtime.bridgeProbe.live_apply_allowed, false);
assert.equal(receipt.runtime.appProbe.reason, "APP_ENDPOINT_UNAVAILABLE");
assert.equal(receipt.runtime.appProbe.available, false);
assert.equal(receipt.runtime.priorAppProbe.reason, "LOCAL_BRIDGE_NOT_STARTED");
assert.equal(receipt.runtime.priorAppProbe.live_apply_allowed, false);
assert.equal(receipt.startup.bridgeStartsBeforeFrontend, true);
assert.equal(receipt.startup.sameRuntimeTokenPassedToBridgeAndFrontend, true);
assert.equal(receipt.startup.credentialsPersisted, false);
assert.equal(receipt.startup.ordersEnabled, false);
assert.equal(receipt.background.processFeasible, true);

assert.match(connection, /autoAttachTerminal[\s\S]*terminalRequest[^\n]+\/connect.*\{\}/);
assert.match(connection, /accountNamespace[\s\S]*account_id[\s\S]*server[\s\S]*generation/);
assert.match(connection, /terminalCacheScope|HISTORY_CACHE_PREFIX/);
assert.match(status, /document\.hidden/);
assert.match(status, /tf=\$\{CONNECTION_HEALTH_TF\}/);
assert.match(proxy, /MFE_BRIDGE_TOKEN/);
assert.match(proxy, /LOCAL_BRIDGE_NOT_STARTED/);
assert.match(proxy, /LOCAL_BRIDGE_ONLY/);
assert.match(bootstrap, /MFE_BRIDGE_TOKEN:bridgeEnabled\?randomBytes\(32\)\.toString\('hex'\):''/);
assert.match(bootstrap, /run\(venvPython,[\s\S]*['"]bridge['"][\s\S]*['"]mt5_bridge\.py['"]/);
assert.match(bootstrap, /windowsHide:true/);
assert.match(bridge, /AUTHORITY\s*=\s*\{\s*"authority"\s*:\s*"SHADOW_ONLY"/);
assert.match(bridge, /self\.account_identity/);
assert.match(bridge, /self\.generation/);
assert.match(bridge, /HISTORY_CLOSED_BAR_PROVENANCE = "MT5_CLOSED_BARS"/);

console.log("SESSION 30 RUNTIME/DATA IDENTITY AUDIT PASS: loopback bridge authority, launcher token wiring, bounded background attach, and account/symbol/timeframe identity contracts are intact; unmatched frontend runtime is recorded fail-closed.");
