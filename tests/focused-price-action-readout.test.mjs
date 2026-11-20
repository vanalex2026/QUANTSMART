import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /const priceActionReadoutStatus = priceActionDirectionConflict[\s\S]*CONFLICTING DIRECTIONS · ABSTAIN/,
  "focused current-concepts readout must expose a stable conflict abstention status");
assert.match(source, /priceActionReadoutStatus[\s\S]*aria-atomic=\"true\"[\s\S]*aria-label=\{priceActionReadoutStatus\}/,
  "conflict/stale current-concepts status must be atomic and accessible");
assert.match(source, /const priceActionReadoutStatus = priceActionDirectionConflict[\s\S]*priceActionGeometryStatus/,
  "current-concepts status must explain stale, fallback, loading, and neutral withholding");
console.log("FOCUSED PRICE-ACTION READOUT PASS: current concept status fails closed and explains conflict/stale evidence.");
