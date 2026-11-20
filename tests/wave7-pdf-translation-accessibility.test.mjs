import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const component = readFileSync(new URL("mfe_ux_lab/cockpit/src/components/PdfSignalTranslationEvidence.tsx", root), "utf8");
const css = readFileSync(new URL("mfe_ux_lab/cockpit/src/components/chart-pattern-inspector.css", root), "utf8");
const artifact = JSON.parse(readFileSync(new URL("artifacts/wave7-pdf-translation-accessibility.json", root), "utf8"));

assert.equal(artifact.result, "PASS");
assert.equal(artifact.concept_count, 10);
assert.equal(artifact.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(artifact.boundaries.pdf_ohlc_translation, false);
assert.equal(artifact.boundaries.outcome_status, "WITHHELD");
assert.equal(artifact.boundaries.fills_orders_rates, "UNAVAILABLE");
assert.match(component, /aria-labelledby="pdf-signal-translation-title"/);
assert.match(component, /aria-describedby=\{introId\}/);
assert.match(component, /role="list"/);
assert.match(component, /role="listitem"/);
assert.match(component, /live_apply_allowed=false/);
assert.match(component, /SOURCE_REVIEW_ONLY/);
assert.match(component, /reasonLabel\(descriptor\.reason, locale\)/);
for (const conceptId of [
  "signal_entry_bar", "bracket_costs", "news_exit", "resistance_exit", "reversal_exit",
  "trade_selection_failure", "consecutive_review", "position_sizing", "low_volatility", "obstacle_room",
]) assert.match(component, new RegExp(`${conceptId}:`), `${conceptId} has a visible bilingual label`);
assert.match(component, /decodeURIComponent\("N%E1%BA%BFn%20t%C3%ADn%20hi%E1%BB%87u/);
assert.match(component, /decodeURIComponent\("M%C3%B4%20t%E1%BA%A3"\)/);
assert.doesNotMatch(component, /\{descriptor\.reason\}/);
assert.match(css, /@media \(max-width:700px\).*grid-template-columns:1fr/s);
assert.match(css, /overflow-wrap:anywhere/);
assert.match(css, /pdf-signal-translation-card-status/);
assert.match(css, /font-size:10px/);

console.log("WAVE 7 PDF TRANSLATION ACCESSIBILITY PASS: semantic, bilingual, compact and source-only contracts are explicit.");
