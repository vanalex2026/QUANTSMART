import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/xauusdM5HoldoutValidator.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const validator = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const hash = "a".repeat(64);
const bars = [
  { timestamp: "2026-01-01T00:00:00.000Z", open: 2000, high: 2002, low: 1999, close: 2001 },
  { timestamp: "2026-01-01T00:05:00.000Z", open: 2001, high: 2003, low: 2000, close: 2002 },
];
const manifest = {
  schema: validator.XAUUSD_M5_HOLDOUT_MANIFEST_SCHEMA,
  dataset_id: "xauusd-sealed-2026-01",
  symbol: "XAUUSD",
  timeframe: "M5",
  partition: "SEALED_HOLDOUT",
  source_uri: "broker://sealed/xauusd-m5-2026-01",
  source_sha256: hash,
  retrieved_at_utc: "2026-01-01T00:15:00.000Z",
  timezone: "UTC",
  price_basis: "BID",
  bars,
  bar_schema: ["timestamp", "open", "high", "low", "close"],
  outcome_definition: { id: "h1-direction-v1", horizon_bars: 1, label_rule: "next closed bar direction", frozen_before_access: true },
  partition_identity: {
    scheme: "TRAIN_VALIDATION_HOLDOUT",
    train: { dataset_id: "xauusd-train-2025", source_sha256: "b".repeat(64) },
    validation: { dataset_id: "xauusd-validation-2025", source_sha256: "c".repeat(64) },
    holdout: { dataset_id: "xauusd-sealed-2026-01", source_sha256: hash },
    locked_before_access: true,
  },
  selection_lock: { sealed_before_access: true, description: "Selection and thresholds were locked before holdout access." },
  execution_model: "UNAVAILABLE",
  fabricated_data: false,
  authority: "SHADOW_ONLY",
};
const labels = {
  schema: validator.XAUUSD_M5_HOLDOUT_LABELS_SCHEMA,
  dataset_id: manifest.dataset_id,
  symbol: "XAUUSD",
  timeframe: "M5",
  partition: "SEALED_HOLDOUT",
  source_sha256: hash,
  outcome_definition_id: "h1-direction-v1",
  label_provenance: {
    source_sha256: hash,
    event_time_basis: "CLOSED_M5_OHLC",
    derivation: "Independent event ledger keyed to each sealed closed M5 bar.",
    generated_at_utc: "2026-01-01T00:20:00.000Z",
    frozen_before_access: true,
    pdf_illustrations_used: false,
  },
  labels: {
    [bars[0].timestamp]: { status: "WIN" },
    [bars[1].timestamp]: { status: "UNAVAILABLE", reason: "No complete horizon in the sealed partition." },
  },
  authority: "SHADOW_ONLY",
};

const valid = await validator.validateXauusdM5Holdout({ manifest, labels, source_sha256: hash });
assert.equal(valid.ok, true, valid.errors.join("; "));
assert.equal(valid.source_hash_verified, true);
assert.equal(valid.bar_count, 2);

const offGrid = await validator.validateXauusdM5Holdout({ manifest: { ...manifest, bars: [{ ...bars[0], timestamp: "2026-01-01T00:01:00.000Z" }, bars[1]] }, labels, source_sha256: hash });
assert.equal(offGrid.ok, false);
assert.ok(offGrid.errors.some((error) => /strict closed UTC\/M5 identity/i.test(error)));

const missingLabel = await validator.validateXauusdM5Holdout({ manifest, labels: { ...labels, labels: { [bars[0].timestamp]: { status: "WIN" } } }, source_sha256: hash });
assert.equal(missingLabel.ok, false);
assert.ok(missingLabel.errors.some((error) => /exactly one key/i.test(error)));

const noHash = await validator.validateXauusdM5Holdout({ manifest, labels });
assert.equal(noHash.ok, false);
assert.ok(noHash.errors.some((error) => /source bytes or a verified/i.test(error)));

const authority = await validator.validateXauusdM5Holdout({ manifest: { ...manifest, authority: "LIVE" }, labels, source_sha256: hash });
assert.equal(authority.ok, false);
assert.ok(authority.errors.some((error) => /SHADOW_ONLY/i.test(error)));

const duplicate = await validator.validateXauusdM5Holdout({ manifest: { ...manifest, bars: [bars[0], bars[0]] }, labels: { ...labels, labels: { [bars[0].timestamp]: { status: "WIN" } } }, source_sha256: hash });
assert.equal(duplicate.ok, false);
assert.ok(duplicate.errors.some((error) => /duplicate timestamp/i.test(error)));

const missingBar = await validator.validateXauusdM5Holdout({ manifest: { ...manifest, bars: [bars[0], { ...bars[1], timestamp: "2026-01-01T00:10:00.000Z" }] }, labels: { ...labels, labels: { [bars[0].timestamp]: { status: "WIN" }, "2026-01-01T00:10:00.000Z": { status: "UNAVAILABLE", reason: "Missing horizon." } } }, source_sha256: hash });
assert.equal(missingBar.ok, false);
assert.ok(missingBar.errors.some((error) => /missing one or more UTC M5 rows/i.test(error)));

const forming = await validator.validateXauusdM5Holdout({ manifest: { ...manifest, bars: [{ ...bars[0], closed: false }, bars[1]] }, labels, source_sha256: hash });
assert.equal(forming.ok, false);
assert.ok(forming.errors.some((error) => /forming/i.test(error)));

const zeroRange = await validator.validateXauusdM5Holdout({
  manifest: { ...manifest, bars: [{ ...bars[0], open: 2001, high: 2001, low: 2001, close: 2001 }, bars[1]] },
  labels,
  source_sha256: hash,
});
assert.equal(zeroRange.ok, false);
assert.ok(zeroRange.errors.some((error) => /bar 0 is malformed/i.test(error)));

const future = await validator.validateXauusdM5Holdout({ manifest: { ...manifest, retrieved_at_utc: "2025-12-31T23:55:00.000Z" }, labels, source_sha256: hash });
assert.equal(future.ok, false);
assert.ok(future.errors.some((error) => /future\/forming/i.test(error)));

const missingPartitionIdentity = await validator.validateXauusdM5Holdout({ manifest: (() => { const copy = { ...manifest }; delete copy.partition_identity; return copy; })(), labels, source_sha256: hash });
assert.equal(missingPartitionIdentity.ok, false);
assert.ok(missingPartitionIdentity.errors.some((error) => /partition_identity/i.test(error)));

const missingLabelProvenance = await validator.validateXauusdM5Holdout({ manifest, labels: (() => { const copy = { ...labels }; delete copy.label_provenance; return copy; })(), source_sha256: hash });
assert.equal(missingLabelProvenance.ok, false);
assert.ok(missingLabelProvenance.errors.some((error) => /label_provenance/i.test(error)));

console.log("XAUUSD M5 HOLDOUT VALIDATOR PASS: sealed manifest identity, strict closed bars, keyed labels, source digest and authority fail closed.");
