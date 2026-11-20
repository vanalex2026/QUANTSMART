import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const receipt = JSON.parse(readFileSync(new URL("../artifacts/session46-browser-locale-pdf-receipt.json", import.meta.url), "utf8"));

assert.equal(receipt.schema, "quantsmart.session46-browser-locale-pdf-receipt/1");
assert.equal(receipt.surface, "focused XAUUSD M5 chart");
assert.equal(receipt.initial.document_language, "vi");
assert.equal(receipt.initial.locale_control_text, "EN · Tiếng Anh");
assert.equal(receipt.after_toggle.document_language, "en");
assert.equal(receipt.after_toggle.locale_control_text, "VI · Vietnamese");
assert.equal(receipt.after_toggle.pdf_tile_count, 23);
assert.match(receipt.after_toggle.chart_label, /^XAUUSD M5 research chart/);
assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.live_claim, false);
assert.equal(receipt.result, "PASS");

console.log("SESSION 46 BROWSER LOCALE/PDF RECEIPT PASS: EN/VI toggling changes visible copy and the focused PDF shelf keeps all 23 XAUUSD M5 concepts.");
