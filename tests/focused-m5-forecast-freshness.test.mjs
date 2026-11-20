import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: ["src/lib/focusedForecastFreshness.ts"], absWorkingDir: app,
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const freshness = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const helper = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/focusedForecastFreshness.ts", import.meta.url), "utf8");
const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

const bar = (t) => ({ t, o: 1, h: 2, l: 0, c: 1 });
const now = Date.parse("2026-01-01T01:00:00Z");
assert.equal(freshness.focusedForecastFreshness([bar("2026-01-01T00:55:00Z")], "M5", now).ok, true,
  "a just-closed M5 tape must pass the focused freshness gate");
assert.equal(freshness.focusedForecastFreshness([bar("2026-01-01T00:35:00Z")], "M5", now).reason, "STALE_CLOSED_BAR",
  "a local fallback older than the bounded closed-age window must abstain");
assert.equal(freshness.focusedForecastFreshness([bar("2026-01-01T01:00:00Z")], "M5", now).ok, false,
  "a future or still-forming latest candle must fail closed");
assert.equal(freshness.focusedForecastFreshness([bar("2026-01-01T00:55:00Z")], "M5", Date.parse("2026-01-01T00:59:59.500Z")).reason, "FUTURE_BAR",
  "a sub-second future close must fail closed rather than use the one-second skew tolerance");
for (const invalidClock of [NaN, Infinity, -Infinity]) {
  const result = freshness.focusedForecastFreshness([bar("2026-01-01T00:55:00Z")], "M5", invalidClock);
  assert.deepEqual(result, { ok: false, latestClosedBarUtc: null, ageMs: null, reason: "INVALID_CLOCK" },
    "an invalid observation clock cannot certify fresh evidence or expose a nonfinite age");
}
for (const timestamp of ["2026-02-30T00:55:00Z", "2026-01-01T24:00:00Z", "2026-01-01T00:56:00Z", "2026-01-01T00:55:01Z", "2026-01-01T00:55:00+00:00"]) {
  const result = freshness.focusedForecastFreshness([bar(timestamp)], "M5", now);
  assert.equal(result.ok, false, "calendar rollover, off-grid or noncanonical UTC identities cannot certify fresh M5 evidence");
  assert.equal(result.reason, "INVALID_TIMESTAMP");
  assert.equal(result.ageMs, null);
}
for (const timestamp of ["2026-01-01T00:55:00Z", "2026-01-01T00:55:00.000Z"]) {
  assert.equal(freshness.focusedForecastFreshness([bar(timestamp)], "M5", now).reason, "FRESH",
    "both canonical UTC precisions remain valid on the M5 grid");
  assert.equal(freshness.focusedForecastFreshness([bar(timestamp)], "M5", now + 15 * 60_000).ok, true,
    "the exact closed-age ceiling remains fresh");
  assert.equal(freshness.focusedForecastFreshness([bar(timestamp)], "M5", now + 15 * 60_000 + 1).reason, "STALE_CLOSED_BAR",
    "one millisecond beyond the closed-age ceiling must withhold freshness");
}

assert.match(helper, /FOCUSED_M5_FORECAST_MAX_AGE_MS = 3 \* 5 \* 60_000/,
  "focused forecast freshness must use a bounded three-bar closed-age window");
assert.match(helper, /closeMs = openedMs \+ frameMs/,
  "freshness must measure age from candle close rather than candle open");
assert.match(helper, /reason: \"STALE_CLOSED_BAR\"/,
  "stale focused tapes must fail closed with an explicit reason");
assert.match(microscope, /focusedForecastFreshness\(detectorBars, tf, focusedClockNowMs\)/,
  "focused forecast freshness must be derived from the same closed-only detector tape");
assert.match(microscope, /forecastIndependentN >= 4[\s\S]*forecastFreshnessReady/,
  "stale local fallback evidence must not pass the focused directional forecast gate");
assert.match(microscope, /const forecastHistoryReady = !focused \|\| tf !== "M5" \|\| verifiedM5HistoryState === "ready"/,
  "focused forecast geometry must require promoted MT5 history rather than local fallback alone");
assert.match(microscope, /const forecastFreshnessReady = !focused \|\| tf !== "M5" \|\| forecastFreshness\?\.ok === true/,
  "closed-bar freshness must remain an independent gate so a fresh local bar does not mask missing MT5 promotion");
assert.match(microscope, /&& forecastHistoryReady\s*&& forecastFreshnessReady;/,
  "the final forecast gate must still require both verified history and fresh closed-bar evidence");
assert.match(microscope, /WAITING FOR VERIFIED MT5 HISTORY/,
  "fallback forecast withholding must explain that broker history promotion is still required");
assert.match(microscope, /WAITING FOR FRESH CLOSED-BAR EVIDENCE/,
  "stale focused forecasts must explain their abstention while retaining evidence");
assert.ok(microscope.includes('role="status" aria-live="polite" aria-atomic="true" aria-label={forecastFreshnessReadout}>{forecastFreshnessReadout}</small>'),
  "focused forecast card must expose a freshness readout alongside the direction");
assert.match(microscope, /const forecastFreshnessReadout = forecastFreshness[\s\S]*explainForecastFreshness\(forecastFreshness\.reason\)/,
  "focused forecast freshness readout must name the machine-readable withholding reason");
assert.match(microscope, /forecastFreshnessReadout[\s\S]*latest close \$\{forecastFreshness\.latestClosedBarUtc \|\| "unavailable"\}[\s\S]*formatClosedBarAge\(forecastFreshness\.ageMs\)[\s\S]*gate 15m/,
  "focused forecast freshness readout must expose latest close, close age, and gate");
assert.match(microscope, /function formatClosedBarAge\(ageMs: number \| null\): string \{[\s\S]*if \(ageMs == null \|\| !Number\.isFinite\(ageMs\)\) return "unavailable";/,
  "missing or invalid closed-bar age must say unavailable instead of exposing a question mark");
assert.doesNotMatch(microscope, /function formatClosedBarAge[\s\S]*return "\?";/,
  "closed-bar age must not regress to a question-mark fallback");
console.log("FOCUSED M5 FORECAST FRESHNESS PASS: stale fallback evidence remains inspectable but cannot present a current forecast.");

