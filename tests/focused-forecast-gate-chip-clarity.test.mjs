import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)), "utf8");

assert.match(source, /m5-gate-chip[^>]*title="Verified MT5 closed-bar history gate"/, "history gate must explain its abbreviation");
assert.match(source, /m5-gate-chip[^>]*title="Latest closed-bar freshness gate"/, "freshness gate must explain its abbreviation");
assert.match(source, /m5-gate-chip[^>]*title="Chronological walk-forward coverage gate"/, "walk-forward gate must explain WF");
assert.match(source, /m5-gate-chip[^>]*title="Effective causal support gate"/, "support gate must explain its denominator");
assert.match(source, /m5-gate-chip[^>]*title="Independent analogue coverage gate"/, "analogue gate must explain its denominator");
assert.match(source, /m5-gate-chip[^>]*title="Consensus margin gate"/, "margin gate must explain its threshold");
assert.match(source, /m5-gate-chip[^>]*title="Causal support metadata gate"/, "causal metadata gate must explain its purpose");
assert.match(source, /aria-label=\{`History gate:/, "history gate must expose its state to assistive technology");
assert.match(source, /aria-label=\{`Walk-forward coverage gate:/, "walk-forward gate must expose its count to assistive technology");
assert.match(source, /aria-label=\{`Consensus margin gate:/, "margin gate must expose its threshold to assistive technology");
assert.match(source, /m5-gate-strip" role="group" aria-label="Forecast gate checks"/,
  "gate chips need a named semantic group so assistive technology exposes the forecast label");

console.log("FOCUSED FORECAST GATE CHIP CLARITY PASS");
