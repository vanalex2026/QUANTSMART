import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const receipt = JSON.parse(readFileSync(new URL("artifacts/wave48-bilingual-runtime-surface-audit.json", root), "utf8"));
const microscope = readFileSync(new URL("mfe_ux_lab/cockpit/src/pages/Microscope.tsx", root), "utf8");
const microChart = readFileSync(new URL("mfe_ux_lab/cockpit/src/components/MicroChart.tsx", root), "utf8");

assert.equal(receipt.schema, "quantsmart.wave48-bilingual-runtime-surface-audit/1");
assert.equal(receipt.surface, "focused XAUUSD M5 chart");
assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.live_claim, false);
assert.equal(receipt.findings.length, 7);

// These are regression guards for copy that must be routed through the active locale.
assert.match(microscope, /function CandleWindow[\s\S]*?locale[\s\S]*?aria-label=\{windowAriaLabel\}/,
  "focused CandleWindow SVG aria-label must receive locale-aware copy");
assert.match(microscope, /function AnalogueMiniChart[\s\S]*?locale[\s\S]*?aria-label=\{`\$\{ariaLabel\}\$\{geometryLabel\}`\}/,
  "focused AnalogueMiniChart SVG aria-label must receive locale-aware copy");
assert.doesNotMatch(microscope, /aria-label="Named candle pattern filter"|aria-label="Named candle family filter"/,
  "focused mobile named-candle filter groups must use locale-aware labels");
assert.doesNotMatch(microscope, /aria-label="Retry MT5 history verification"/,
  "focused empty-history retry control must use locale-aware copy");
assert.doesNotMatch(microscope, /<strong>Verifying MT5 closed-bar history<\/strong>|<strong>No closed-bar data available for/,
  "focused empty-history live region must use locale-aware copy");
assert.doesNotMatch(microChart, /aria-label="Candle and EMA values"/,
  "mobile chart legend must use locale-aware aria copy");
assert.doesNotMatch(microChart, /aria-label="UTC sessions: Asia cyan, Europe green, US purple"/,
  "chart session legend must use locale-aware aria copy");
assert.doesNotMatch(microChart, /aria-label="Reset chart view to recent bars"|aria-label=\{`Visible bars \$\{start \+ 1\}/,
  "chart reset and visible-range controls must use locale-aware copy");
assert.doesNotMatch(microChart, /className="microchart-keyboard-help">Keyboard chart controls:/,
  "visually hidden keyboard help must use locale-aware copy");

console.log("WAVE 48 BILINGUAL RUNTIME SURFACE AUDIT PASS: focused SVG names, mobile filters, and empty-history states remain locale-routed.");
