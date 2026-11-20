import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = async (entryPoint) => build({
  entryPoints: [entryPoint],
  absWorkingDir: app,
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});

// Bundle the two contracts separately so their exported identity helpers stay
// directly testable without mounting the focused React surface.
const snapshotBundle = await bundle("src/lib/focusedSnapshot.ts");
const retentionBundle = await bundle("src/lib/m5Retention.ts");
const snapshot = await import("data:text/javascript;base64," + Buffer.from(snapshotBundle.outputFiles[0].text).toString("base64"));
const retention = await import("data:text/javascript;base64," + Buffer.from(retentionBundle.outputFiles[0].text).toString("base64"));

const nowMs = Date.parse("2026-01-02T04:00:00.000Z");
const current = "2026-01-02T04:00:00.000Z";
const diagnose = (saved, live = current) => snapshot.diagnoseFocusedSnapshotStaleness(
  { latest_closed_bar_time: saved }, live, nowMs,
);

assert.equal(diagnose("2026-01-02T12:00:00+08:00").state, "CURRENT",
  "an equivalent positive-offset alias must retain the current closed-bar identity");
assert.equal(diagnose("2026-01-02T03:50:00+00:00").age_bars, 2,
  "a stale offset alias must preserve the two-bar M5 age");
assert.equal(diagnose("2026-01-02T12:05:00+08:00").reason, "SNAPSHOT_LATEST_BAR_FUTURE",
  "a future offset alias must fail closed before stale comparison");
assert.equal(diagnose("2026-01-02T11:59:00+08:00").reason, "SNAPSHOT_LATEST_BAR_OFF_GRID",
  "an off-grid offset alias must fail closed rather than select a nearby candle");
assert.equal(diagnose(current, "2026-01-02T11:59:00+08:00").reason, "CURRENT_LATEST_BAR_OFF_GRID",
  "an off-grid current-tape alias must fail closed");

const row = (t, i) => ({ i, t, o: 1, h: 2, l: 0, c: 1 });
const retained = retention.capM5DisplayWindow([
  row("2026-02-27T23:55:00Z", 0),
  row("2026-02-28T00:00:00Z", 1),
  row("2028-02-29T00:00:00Z", 2),
  row("not-a-timestamp", 3),
], "M5");
assert.deepEqual(retained.map((bar) => bar.t), ["2026-02-28T00:00:00Z", "2028-02-29T00:00:00Z"],
  "retention must keep the inclusive calendar cutoff and reject malformed tails");
assert.equal(retention.latestCanonicalUtc(retained), "2028-02-29T00:00:00.000Z",
  "retention provenance must report the retained canonical UTC identity");

const parsed = snapshot.parseFocusedSnapshot({
  schema: snapshot.FOCUSED_SNAPSHOT_SCHEMA,
  symbol: "XAUUSD",
  timeframe: "M5",
  authority: snapshot.FOCUSED_SNAPSHOT_AUTHORITY,
  latest_closed_bar_time: "2026-01-02T12:00:00+08:00",
});
assert.equal(parsed.ok, true, "snapshot aliases must remain readable when explicitly timezone-qualified");
assert.equal(parsed.ok && parsed.snapshot.authority, snapshot.FOCUSED_SNAPSHOT_AUTHORITY,
  "snapshot alias restore must preserve the research-only authority boundary");
assert.equal(snapshot.parseFocusedSnapshot({
  schema: snapshot.FOCUSED_SNAPSHOT_SCHEMA,
  symbol: "XAUUSD",
  timeframe: "M5",
  authority: "LIVE_APPLY",
  latest_closed_bar_time: current,
}).ok, false, "snapshot identity must not permit an execution authority escalation");

const holdout = JSON.parse(readFileSync(new URL("../artifacts/wave2-holdout-readiness-intake-audit.json", import.meta.url), "utf8"));
assert.equal(holdout.checks.ohlc_rows_generated, false, "holdout intake must remain dataset-free");
assert.equal(holdout.checks.outcome_labels_generated, false, "holdout intake must remain outcome-label-free");
assert.deepEqual(holdout.authority, { focused_chart: "SHADOW_ONLY", decision: "NO_DECISION", live_apply_allowed: false });

const browser = JSON.parse(readFileSync(new URL("../artifacts/session26-browser-runtime-receipt.json", import.meta.url), "utf8"));
assert.equal(browser.browser.liveMarketDataClaim, "none", "browser receipt must make no live-market claim");
assert.equal(browser.provenance.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(browser.provenance.historyStatus, "LOCAL SNAPSHOT · HISTORY UNAVAILABLE");

console.log("WAVE 8 RETENTION/SNAPSHOT IDENTITY PASS: offset aliases, stale/current/future/off-grid states, inclusive retention, holdout readiness and browser authority remain fail-closed.");
