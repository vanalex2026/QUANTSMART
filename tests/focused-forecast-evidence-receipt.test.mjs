import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)), "utf8");
assert.match(source, /const forecastReceiptSummary = `\$\{focusedCopy\.evidenceReceipt\}/, "locale-aware receipt summary");
assert.match(source, /className="m5-forecast-receipt" role="status" aria-live="polite" aria-atomic="true"/, "atomic status");
assert.match(source, /data-forecast-receipt-direction=\{forecastReceiptDirection\}/, "direction attribute");
assert.match(source, /data-forecast-receipt-latest-closed-utc=\{forecastReceiptLatestClosedUtc\}/, "timestamp attribute");
assert.match(source, /data-forecast-receipt-authority="SHADOW_ONLY \/ NO_DECISION"/, "authority boundary");
assert.match(source, /@media\(max-width:500px\)[\s\S]*m5-forecast-receipt\{align-items:flex-start/, "mobile stack");
assert.match(source, /\.m5-forecast-receipt>span\{min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere\}/,
  "the long pending forecast gate list must wrap at desktop widths too");
console.log("FOCUSED FORECAST EVIDENCE RECEIPT PASS");
