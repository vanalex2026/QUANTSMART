import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const receipt = read("../artifacts/session20-xauusd-holdout-readiness-audit.json");

assert.equal(receipt.schema, "quantsmart.session20.xauusd-holdout-readiness/1");
assert.equal(receipt.status, "NOT_READY");
assert.deepEqual(receipt.authority, {
  focused_chart: "SHADOW_ONLY",
  decision: "NO_DECISION",
  live_apply_allowed: false,
});
assert.equal(receipt.evidence_inventory.length, 4);
for (const evidence of receipt.evidence_inventory) {
  assert.equal(evidence.independent_holdout, false, evidence.id);
  assert.equal(evidence.outcome_labels, false, evidence.id);
  assert.ok(evidence.reason.length > 20, evidence.id);
}
const mt5 = receipt.evidence_inventory.find((row) => row.id === "mt5-history-snapshot");
assert.equal(mt5.symbol, "XAUUSD");
assert.equal(mt5.timeframe, "M5");
const btc = receipt.evidence_inventory.find((row) => row.id === "public-btc-csv");
assert.equal(btc.symbol, "BTCUSDT");
const contract = receipt.required_fixture_contract;
for (const key of [
  "dataset_id", "symbol", "timeframe", "partition", "source_uri", "source_sha256",
  "retrieved_at_utc", "timezone", "price_basis", "bars", "outcome_labels",
  "outcome_definition", "selection_lock", "execution_model", "authority",
]) assert.ok(Object.hasOwn(contract, key), `missing contract key ${key}`);
assert.deepEqual(contract.bar_schema, ["timestamp", "open", "high", "low", "close"]);
assert.equal(contract.symbol, "XAUUSD");
assert.equal(contract.timeframe, "M5");
assert.equal(contract.partition, "SEALED_HOLDOUT");
assert.equal(contract.fabricated_data, false);
assert.equal(contract.authority, "SHADOW_ONLY");
assert.ok(receipt.acceptance_gates.length >= 5);
assert.match(receipt.next_verifiable_artifact, /sealed XAUUSD M5 source manifest/i);

// The receipt must point at evidence that exists, without bundling or parsing
// a market-data row into this audit artifact.
assert.ok(existsSync(new URL("../artifacts/mt5-history/XAUUSD_M5_3y.json", import.meta.url)));
assert.ok(existsSync(new URL("../docs/CSV_RESEARCH_VALIDATION.md", import.meta.url)));
assert.equal(Object.hasOwn(receipt, "bars"), false);
assert.equal(Object.hasOwn(receipt, "outcomes"), false);

console.log("SESSION 20 XAUUSD HOLDOUT READINESS PASS: existing broker, CSV and PDF evidence remain non-independent; sealed OHLC plus keyed outcome labels are specified as the next verifiable artifact.");
