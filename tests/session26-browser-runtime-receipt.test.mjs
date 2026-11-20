import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const receipt = JSON.parse(readFileSync(new URL("../artifacts/session26-browser-runtime-receipt.json", import.meta.url), "utf8"));

assert.equal(receipt.schema, "quantsmart.session26.browser-runtime-receipt/1");
assert.equal(receipt.url, "http://127.0.0.1:5090/#home");
assert.equal(receipt.browser.hostState, "available");
assert.equal(receipt.browser.result, "PASS_FRESH_DESKTOP_MOBILE_EVIDENCE");
assert.equal(receipt.browser.liveMarketDataClaim, "none");

for (const viewport of [receipt.viewports.desktop, receipt.viewports.mobile]) {
  assert.equal(viewport.focusedSurface, "XAUUSD M5");
  assert.equal(viewport.horizontalOverflow, false);
  assert.equal(viewport.scrollWidth, viewport.clientWidth);
  assert.equal(viewport.plotEndpoint, "2026-11-11T07:35:00Z UTC");
  assert.equal(viewport.closedBars, 141178);
}
assert.equal(receipt.viewports.desktop.connectionBadge, "MT5 Offline");
assert.match(receipt.viewports.mobile.connectionControlAria, /^Connection: Start the local connector/);

assert.equal(receipt.mobileTargets.toolbarButtonCount, 14);
assert.deepEqual(receipt.mobileTargets.toolbarButtonSize, { width: 36, height: 36 });
assert.equal(receipt.mobileTargets.resetButtonSize.height, 36);
assert.equal(receipt.mobileTargets.inspectorActionMinimumHeight, 36);
assert.equal(receipt.mobileTargets.inspectorCloseSize.height, 36);
assert.equal(receipt.mobileTargets.allInspectorActionsMinimumHeight, true);

assert.equal(receipt.inspector.opened, true);
assert.equal(receipt.inspector.dialogTitle, "Double Pressure");
assert.equal(receipt.inspector.closed, true);
assert.equal(receipt.inspector.focusRestored, true);
assert.match(receipt.inspector.focusRestoredTo, /PATTERN .*DOUBLE PRESSURE/);
assert.equal(receipt.inspector.horizontalOverflowWhileOpen, false);

assert.equal(receipt.provenance.historyStatus, "LOCAL SNAPSHOT · HISTORY UNAVAILABLE");
assert.match(receipt.provenance.source, /^Local historical fallback/);
assert.match(receipt.provenance.closedBarStatus, /forecast withheld/);
assert.equal(receipt.provenance.forecastStatus, "FORECAST · WAITING FOR VERIFIED MT5 HISTORY · WAIT");
assert.equal(receipt.provenance.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.provenance.noOrderAuthority, true);

console.log("SESSION 26 BROWSER/RUNTIME RECEIPT PASS: desktop/mobile overflow, mobile targets, inspector focus restoration, local fallback provenance and authority labels are deterministic.");
