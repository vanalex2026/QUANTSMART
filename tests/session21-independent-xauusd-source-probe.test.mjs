import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../docs/independent_xauusd_source_probe.json", import.meta.url), "utf8"));

assert.equal(manifest.schema, "quantsmart.independent-xauusd-source-probe/1");
assert.equal(manifest.status, "SOURCE_VERIFIED_NO_HOLDOUT");
assert.equal(manifest.instrument, "XAUUSD");
assert.equal(manifest.derived_timeframe, "M5");
assert.match(manifest.source_uri, /datafeed\.dukascopy\.com\/datafeed\/XAUUSD\/2024\/01\/01\/00h_ticks\.bi5$/);
assert.match(manifest.source_sha256, /^[0-9a-f]{64}$/);
assert.equal(manifest.derivation.price_basis, "MID");
assert.equal(manifest.derivation.outcome_labels, false);
assert.equal(manifest.holdout_contract.partition, "CANDIDATE_ONLY");
assert.equal(manifest.holdout_contract.ready_for_evaluation, false);
assert.equal(manifest.authority.focused_chart, "SHADOW_ONLY");
assert.equal(manifest.authority.decision, "NO_DECISION");
assert.equal(manifest.authority.live_apply_allowed, false);
assert.ok(!Object.hasOwn(manifest, "bars"), "source probe must not bundle derived OHLC rows");
assert.ok(!Object.hasOwn(manifest, "outcomes"), "source probe must not invent outcome labels");

console.log("SESSION 21 INDEPENDENT XAUUSD SOURCE PROBE PASS: public Dukascopy source is verified as a candidate MID-derived M5 input, with holdout and outcome readiness withheld.");
