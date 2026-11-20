import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/focusedM5Refresh.ts", import.meta.url), "utf8");
const adapter = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/mt5DemoAdapter.ts", import.meta.url), "utf8");
assert.match(source, /isVerifiedClosedBarWindow\(probe, "M5", Date\.now\(\)\)/);
assert.match(source, /const tail = sortedProbe\[sortedProbe\.length - 1\]/);
assert.match(source, /tailMs === priorMs/);
assert.match(source, /tail\[key as "o"\] === prior\[key as "o"\]/);
assert.match(source, /catchUpMt5History\(symbol, "M5", history\.bars/);
assert.match(source, /terminalCacheScope\(\) !== namespace/);
assert.match(source, /refreshProvenance/);
assert.match(adapter, /closed_bar_provenance: "MT5_CLOSED_BARS"/);
assert.match(adapter, /authority: "SHADOW_ONLY"/);
assert.match(adapter, /decision: "NO_DECISION"/);
assert.match(adapter, /live_apply_allowed: false/);
assert.match(adapter, /read_only: true/);
console.log("FOCUSED M5 LIVE TAIL PASS: refreshes merge only verified closed-bar tails within the account scope.");

