import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const receipt = JSON.parse(readFileSync(new URL("../artifacts/session32-browser-realtime-receipt.json", import.meta.url), "utf8"));
assert.equal(receipt.symbol, "XAUUSD");
assert.equal(receipt.timeframe, "M5");
assert.equal(receipt.desktop.endpoint, "LIVE");
assert.equal(receipt.desktop.detection, "PROVISIONAL");
assert.equal(receipt.mobile.scrollWidth, receipt.mobile.clientWidth);
assert.equal(receipt.formingCandle.closedEvidence, "WITHHELD_UNTIL_M5_CLOSE");
assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
console.log("SESSION 32 BROWSER REALTIME RECEIPT PASS: live tick/forming-candle evidence is separate from closed-bar research and fits the mobile viewport.");
