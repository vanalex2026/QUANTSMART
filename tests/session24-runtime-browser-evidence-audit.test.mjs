import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const parseJson = (url) => JSON.parse(readFileSync(url, "utf8").replace(/^\uFEFF/, ""));
const receipt = parseJson(new URL("../artifacts/session24-runtime-browser-evidence-audit.json", import.meta.url));
const baseline = parseJson(new URL("../artifacts/session18-browser-runtime-qa.json", import.meta.url));

assert.equal(receipt.schema, "quantsmart.session24.runtime-browser-evidence-audit/1");
assert.equal(receipt.browser.hostState, "available");
assert.equal(receipt.browser.freshTabAttempted, true);
assert.equal(receipt.browser.result, "app_endpoint_unavailable");
assert.equal(receipt.browser.origin, "chrome-error://chromewebdata/");
assert.equal(receipt.browser.baselineUse, "historical-layout-reference-only");
assert.equal(receipt.browser.staleBaselineLiveClaimAllowed, false);
assert.equal(receipt.runtime.appEndpointProbe, "unavailable");
assert.equal(receipt.runtime.liveMarketDataClaim, "none");
assert.equal(receipt.runtime.staleLiveClaimSuppressed, true);
assert.equal(receipt.sourceContracts.focusedSurface, "XAUUSD M5");
assert.equal(receipt.sourceContracts.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.startup.result, "PASS");
assert.equal(receipt.result, "PASS_CONTRACTS_APP_ENDPOINT_UNAVAILABLE");

assert.equal(baseline.browser.title, "QUANTSMART", "the retained visual baseline is a historical page receipt");
assert.notEqual(receipt.observedAt, baseline.observedAt, "a stale visual receipt must not masquerade as this audit");
assert.equal(receipt.runtime.liveMarketDataClaim, "none", "missing fresh runtime evidence cannot inherit a prior live claim");

console.log("SESSION 24 RUNTIME/BROWSER EVIDENCE AUDIT PASS: endpoint unavailable is explicit and stale live claims remain suppressed.");
