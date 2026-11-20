import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const probePath = join(root, "docs/independent_xauusd_source_probe.json");
const receipt = JSON.parse(readFileSync(join(root, "artifacts/session25-independent-source-probe-identity-audit.json"), "utf8"));

assert.equal(receipt.schema, "quantsmart.session25.independent-xauusd-source-probe-identity/1");
assert.equal(receipt.status, "SOURCE_VERIFIED_NO_HOLDOUT");
assert.equal(receipt.source_data_bundled, false);
assert.equal(receipt.retained_source_checked, true);
assert.equal(receipt.checks.instrument, "XAUUSD");
assert.equal(receipt.checks.timeframe, "M5");
assert.equal(receipt.checks.retained_bytes_digest, true);
assert.equal(receipt.checks.source_hour_boundary, true);
assert.equal(receipt.checks.candidate_partition, true);
assert.equal(receipt.checks.outcome_labels_present, false);
assert.deepEqual(receipt.authority, {
  focused_chart: "SHADOW_ONLY",
  decision: "NO_DECISION",
  live_apply_allowed: false,
});

const tempDir = mkdtempSync(join(tmpdir(), "quantsmart-source-probe-"));
try {
  const probe = JSON.parse(readFileSync(probePath, "utf8"));
  probe.source_tick_window_utc = { first: "2024-01-01T00:00:00.080Z", last: "2024-01-01T01:00:00.000Z" };
  const tampered = join(tempDir, "probe.json");
  writeFileSync(tampered, JSON.stringify(probe));
  const result = spawnSync(process.execPath, ["scripts/validate-independent-xauusd-source-probe.mjs", "--probe", tampered], { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 1, "a source window crossing its declared hour must fail closed");
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "NOT_READY");
  assert.ok(report.errors.some((error) => /inside the declared source hour/i.test(error)));
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log("SESSION 25 SOURCE PROBE IDENTITY PASS: retained bytes, XAUUSD hour bounds and candidate-only authority are verified without bundling OHLC or labels.");
