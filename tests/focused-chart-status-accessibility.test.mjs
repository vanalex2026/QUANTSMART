import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /className=\{focused \? "m5-empty-chart" : "mfe-empty"\} role=\{focused \? "region" : "status"\}/,
  "focused empty chart must expose a navigable region instead of making the entire chart a live status");
assert.match(source, /aria-live=\{focused \? undefined : "polite"\}/,
  "focused chart status must not announce the whole chart subtree");
assert.match(source, /<div role="status" aria-live="polite" aria-atomic="true"><strong>\{focusedHistoryVerifying/,
  "focused empty-state text must remain an atomic status announcement");
assert.match(source, /M5 chart status: \$\{focusedHistoryVerifying/,
  "focused chart region must provide a concise accessible status label");
assert.doesNotMatch(source, /className="m5-empty-meta">\{requestedSymbol\} \| M5 \| SHADOW_ONLY \| NO_DECISION/,
  "the empty chart must not expose the obsolete multi-line loading status");

console.log("FOCUSED CHART STATUS ACCESSIBILITY PASS: chart region is navigable and only concise status text is live.");
