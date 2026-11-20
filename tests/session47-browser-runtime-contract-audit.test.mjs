import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shelf = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PdfSignalCoverageShelf.tsx", import.meta.url), "utf8");
const chart = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const responsive = readFileSync(new URL("../mfe_ux_lab/cockpit/src/responsive.css", import.meta.url), "utf8");
const feed = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/liveTickFeed.ts", import.meta.url), "utf8");
const receipt = JSON.parse(readFileSync(new URL("../artifacts/session47-browser-runtime-contract-audit.json", import.meta.url), "utf8"));

assert.equal(receipt.schema, "quantsmart.session47-browser-runtime-contract-audit/1");
assert.equal(receipt.browser_host_available, false);
assert.equal(receipt.live_market_claim, false);
assert.equal(receipt.pdf_signal_count, 23);
assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.match(shelf, /PDF_CONCEPTS_EVALUATED_ON_CLOSED_XAUUSD_M5/);
assert.match(shelf, /INVALID_XAUUSD_SYMBOL/);
assert.match(shelf, /const resultReason = reasonLabel\(result\.reason, locale\)/,
  "the 23-signal shelf footer must localize detector result reasons");
assert.match(shelf, /m5-pdf-coverage-authority">\{resultReason\}/,
  "the localized result reason must be rendered in the shelf footer");
assert.match(chart, /const quoteLocale = locale === "vi" \? "vi-VN" : "en-US"/);
assert.match(chart, /data-live-detection=\{liveDetection\.state\}/);
assert.match(feed, /parseLiveTickFrame\(value, \{ symbol, tf \}\)/);
assert.match(responsive, /\.mfe-market-chart\.microchart-tv \.microchart-tool-rail[\s\S]*box-sizing:border-box[\s\S]*overflow-x:auto/,
  "mobile chart controls must remain bounded and horizontally scrollable");
assert.match(responsive, /\.workspace-shell\[data-focus-surface="m5-chart"\] \.locale-toggle[\s\S]*min-width:36px[\s\S]*min-height:36px/,
  "the focused locale toggle must remain reachable on phones");

console.log("SESSION 47 BROWSER/RUNTIME CONTRACT AUDIT PASS: locale-aware 23-signal footer, mobile overflow guards, and scoped live-feed presentation are covered; no fresh browser host claim.");
