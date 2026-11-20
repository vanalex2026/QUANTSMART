import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const receipt = JSON.parse(readFileSync(root + "artifacts/real-xauusd-m5-detector-verification.json", "utf8"));
const verifier = readFileSync(root + "scripts/verify-real-xauusd-detectors.mjs", "utf8");

assert.match(verifier, /payload\.symbol\s*!==\s*"XAUUSD"/);
assert.match(verifier, /payload\.timeframe\s*!==\s*"M5"/);

assert.equal(receipt.audit, "real-xauusd-m5-detector-verification");
assert.equal(receipt.source, "MT5_CLOSED_BARS");
assert.equal(receipt.symbol, "XAUUSD");
assert.equal(receipt.timeframe, "M5");
assert.ok(receipt.bars >= 100);
assert.equal(receipt.closed_bar_provenance, "MT5_CLOSED_BARS");
assert.equal(typeof receipt.server_timezone, "string");
assert.ok(receipt.server_timezone.length > 0);
assert.equal(receipt.read_only, true);
assert.equal(receipt.authority, "SHADOW_ONLY");
assert.equal(receipt.decision, "NO_DECISION");
assert.equal(receipt.live_apply_allowed, false);
assert.equal(receipt.forming_bar_included, false);
assert.equal(receipt.timestamp_basis, "UTC");
assert.equal(receipt.valid_closed_utc_grid, true);
assert.equal(receipt.strictly_ordered, true);
assert.equal(receipt.detector.ok, true);
assert.equal(receipt.detector.authority, "SHADOW_ONLY / NO_DECISION");
assert.equal(receipt.detector.deterministic_repeat, true);
assert.equal(receipt.detector.causal_prefix_stable_after_future_mutation, true);
assert.equal(receipt.detector.markers.length, receipt.detector.marker_count);
for (const marker of receipt.detector.markers) {
  assert.ok(marker.bar && marker.bar.t === marker.time);
  assert.equal(marker.priceWithinBar, true);
  assert.equal(marker.positionConsistent, true);
}
assert.equal(Object.keys(receipt.detector.concepts).length, 13);
for (const evidence of Object.values(receipt.detector.concepts)) {
  assert.equal(evidence.history, evidence.occurrences);
  assert.equal(evidence.authority, "SHADOW_ONLY / NO_DECISION");
}

console.log("REAL XAUUSD M5 DETECTOR VERIFICATION PASS: closed UTC MT5 tape, all 13 concepts, deterministic and causal checks.");
