import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const parseJson = (url) => JSON.parse(readFileSync(url, "utf8").replace(/^\uFEFF/, ""));
const receipt = parseJson(new URL("../artifacts/session25-runtime-browser-evidence-audit.json", import.meta.url));
const baseline = parseJson(new URL("../artifacts/session18-browser-runtime-qa.json", import.meta.url));

assert.equal(receipt.schema, "quantsmart.session25.runtime-browser-evidence-audit/1");
assert.equal(receipt.browser.hostState, "unavailable");
assert.equal(receipt.browser.inventoryAttempted, true);
assert.equal(receipt.browser.freshTabAttempted, false);
assert.equal(receipt.browser.result, "browser_access_host_unavailable");
assert.equal(receipt.browser.baselineUse, "historical-layout-reference-only");
assert.equal(receipt.browser.staleBaselineLiveClaimAllowed, false);
assert.equal(receipt.runtime.appEndpointProbe, "unavailable");
assert.equal(receipt.runtime.bridgeEndpointProbe, "unavailable");
assert.deepEqual(receipt.runtime.listeners, { app: false, bridge: false });
assert.equal(receipt.runtime.liveMarketDataClaim, "none");
assert.equal(receipt.runtime.staleLiveClaimSuppressed, true);
assert.equal(receipt.sourceContracts.focusedSurface, "XAUUSD M5");
assert.equal(receipt.sourceContracts.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.startup.result, "PASS");
assert.equal(receipt.result, "PASS_CONTRACTS_ENDPOINTS_UNAVAILABLE");

assert.equal(baseline.browser.title, "QUANTSMART", "the retained visual baseline is historical evidence");
assert.notEqual(receipt.observedAt, baseline.observedAt, "a stale visual receipt must not masquerade as this audit");
assert.equal(receipt.runtime.liveMarketDataClaim, "none", "missing fresh runtime evidence cannot inherit a prior live claim");

console.log("SESSION 25 RUNTIME/BROWSER EVIDENCE AUDIT PASS: browser host and local endpoints unavailable; stale visual and live claims remain suppressed.");
