import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const receipt = JSON.parse(readFileSync(new URL("../artifacts/session19-browser-runtime-evidence-audit.json", import.meta.url), "utf8"));
const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const connectionStatus = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/ConnectionStatus.tsx", import.meta.url), "utf8");
const mt5Connection = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/mt5Connection.ts", import.meta.url), "utf8");

assert.equal(receipt.scope, "Focused XAUUSD M5 layout, reconnect-state contracts and authority labels.");
assert.equal(receipt.browser.freshTabAttempted, true);
assert.equal(receipt.browser.result, "browser_host_unavailable");
assert.equal(receipt.runtime.appEndpointProbe, "unavailable");
assert.equal(receipt.sourceContracts.focusedSurface, "XAUUSD M5");
assert.equal(receipt.sourceContracts.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.deepEqual(receipt.sourceContracts.reconnectReasons, ["NOT_ATTACHED", "TERMINAL_DISCONNECTED", "ACCOUNT_UNAVAILABLE"]);

assert.match(microscope, /focused \? <span className="pflag" data-focused-timeframe="true"[^>]*>M5 \| FOCUSED<\/span>/,
  "focused home must retain an explicit fixed M5 identity");
assert.match(microscope, /SHADOW_ONLY \| NO_DECISION \| live_apply_allowed=false/,
  "focused evidence must retain the read-only authority label");
assert.match(connectionStatus, /TERMINAL_DISCONNECTED: "The terminal is attached but its broker connection is unavailable\./,
  "reconnect UI must explain a transient disconnected terminal");
assert.match(mt5Connection, /ACCOUNT_UNAVAILABLE/,
  "reconnect behavior must retain account-unavailable handling");

console.log("SESSION 19 BROWSER/RUNTIME EVIDENCE AUDIT PASS: focused M5 and authority contracts verified; fresh browser/runtime evidence explicitly marked unavailable.");
