import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const probe = "docs/independent_xauusd_source_probe.json";
const receipt = JSON.parse(readFileSync(new URL("../artifacts/session24-xauusd-holdout-intake-audit.json", import.meta.url), "utf8"));
assert.equal(receipt.status, "NOT_READY");
assert.equal(receipt.candidate_partition, "CANDIDATE_ONLY");
assert.equal(receipt.source_data_bundled, false);
assert.deepEqual(receipt.authority, {
  focused_chart: "SHADOW_ONLY",
  decision: "NO_DECISION",
  live_apply_allowed: false,
});
const result = spawnSync(process.execPath, [
  "scripts/validate-xauusd-m5-holdout.mjs",
  "--manifest", probe,
  "--labels", probe,
  "--source", probe,
], { cwd: root, encoding: "utf8", windowsHide: true });

assert.equal(result.status, 1, "candidate-only source probe must be rejected as a sealed holdout");
const report = JSON.parse(result.stdout);
assert.equal(report.schema, "quantsmart.xauusd-m5-holdout-intake/1");
assert.equal(report.status, "NOT_READY");
assert.equal(report.source_data_bundled, false);
assert.equal(report.validation.ok, false);
assert.ok(report.validation.errors.some((error) => /manifest schema is unsupported/i.test(error)));
assert.ok(report.validation.errors.some((error) => /manifest bars must be/i.test(error)));
assert.deepEqual(report.authority, {
  focused_chart: "SHADOW_ONLY",
  decision: "NO_DECISION",
  live_apply_allowed: false,
});
assert.equal(readFileSync(new URL(`../${probe}`, import.meta.url), "utf8").includes('"partition": "CANDIDATE_ONLY"'), true);

const missingDir = mkdtempSync(join(tmpdir(), "xauusd-holdout-intake-"));
const missingReportPath = join(missingDir, "missing-report.json");
const missing = spawnSync(process.execPath, [
  "scripts/validate-xauusd-m5-holdout.mjs",
  "--manifest", join(missingDir, "manifest.json"),
  "--labels", join(missingDir, "labels.json"),
  "--source", join(missingDir, "source.bi5"),
  "--report", missingReportPath,
], { cwd: root, encoding: "utf8", windowsHide: true });
assert.equal(missing.status, 1, "missing intake inputs must be a NOT_READY validation result");
const missingReport = JSON.parse(missing.stdout);
assert.equal(missingReport.status, "NOT_READY");
assert.equal(missingReport.validation.ok, false);
assert.ok(missingReport.validation.errors.some((error) => /ENOENT|no such file/i.test(error)));
assert.deepEqual(missingReport.authority, {
  focused_chart: "SHADOW_ONLY",
  decision: "NO_DECISION",
  live_apply_allowed: false,
});
assert.deepEqual(JSON.parse(readFileSync(missingReportPath, "utf8")), missingReport);
rmSync(missingDir, { recursive: true, force: true });

console.log("XAUUSD M5 HOLDOUT INTAKE PASS: candidate source probe remains NOT_READY and the intake CLI preserves fail-closed authority without bundling market data.");
