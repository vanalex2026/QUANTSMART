import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: ["src/lib/focusedSnapshot.ts"],
  absWorkingDir: app,
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const snapshot = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const nowMs = Date.parse("2026-01-02T04:00:00.000Z");
const current = "2026-01-02T04:00:00.000Z";

const currentResult = snapshot.diagnoseFocusedSnapshotStaleness(
  { latest_closed_bar_time: current },
  current,
  nowMs,
);
assert.deepEqual(currentResult, {
  state: "CURRENT",
  reason: "LATEST_CLOSED_BAR_MATCHES",
  snapshot_latest_bar_utc: current,
  current_latest_bar_utc: current,
  age_bars: 0,
}, "matching closed-bar identities should be reported as current");

const staleSnapshot = { latest_closed_bar_time: "2026-01-02T03:50:00.000Z" };
const before = structuredClone(staleSnapshot);
const staleResult = snapshot.diagnoseFocusedSnapshotStaleness(staleSnapshot, "2026-01-02T04:00:00+00:00", nowMs);
assert.equal(staleResult.state, "STALE", "an older retained tape identity should be reported as stale");
assert.equal(staleResult.reason, "SNAPSHOT_LAGS_CURRENT_TAPE");
assert.equal(staleResult.age_bars, 2, "staleness should be measured in closed M5 bars");
assert.deepEqual(staleSnapshot, before, "diagnostics must not mutate imported snapshot data");

for (const [label, value, reason] of [
  ["missing snapshot identity", undefined, "SNAPSHOT_LATEST_BAR_UNAVAILABLE"],
  ["missing current identity", current, "CURRENT_LATEST_BAR_UNAVAILABLE"],
]) {
  const result = label === "missing current identity"
    ? snapshot.diagnoseFocusedSnapshotStaleness({ latest_closed_bar_time: value }, undefined, nowMs)
    : snapshot.diagnoseFocusedSnapshotStaleness({}, current, nowMs);
  assert.equal(result.state, "UNAVAILABLE", `${label} should fail closed without a timestamp`);
  assert.equal(result.reason, reason);
}

for (const [label, saved, live, reason] of [
  ["malformed snapshot identity", "not-a-time", current, "SNAPSHOT_LATEST_BAR_INVALID"],
  ["future snapshot identity", "2026-01-02T04:05:00.000Z", current, "SNAPSHOT_LATEST_BAR_FUTURE"],
  ["off-grid snapshot identity", "2026-01-02T03:51:00.000Z", current, "SNAPSHOT_LATEST_BAR_OFF_GRID"],
  ["future current identity", current, "2026-01-02T04:05:00.000Z", "CURRENT_LATEST_BAR_FUTURE"],
  ["off-grid current identity", current, "2026-01-02T03:59:00.000Z", "CURRENT_LATEST_BAR_OFF_GRID"],
]) {
  const result = snapshot.diagnoseFocusedSnapshotStaleness({ latest_closed_bar_time: saved }, live, nowMs);
  assert.equal(result.state, "INVALID", `${label} should be rejected`);
  assert.equal(result.reason, reason);
}

const ahead = snapshot.diagnoseFocusedSnapshotStaleness(
  { latest_closed_bar_time: "2026-01-02T04:00:00.000Z" },
  "2026-01-01T04:00:00.000Z",
  nowMs,
);
assert.equal(ahead.state, "INVALID", "a snapshot newer than the current tape must not resume by ordinal");
assert.equal(ahead.reason, "SNAPSHOT_AHEAD_OF_CURRENT_TAPE");

console.log("FOCUSED SNAPSHOT STALENESS PASS: current, stale, unavailable and invalid tape identities fail closed without mutation.");
