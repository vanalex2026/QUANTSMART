import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/patternExitEventIdentity.ts", import.meta.url))],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const { patternExitEventIdentity } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bar = (i, fields = {}) => ({
  t: new Date(epoch + i * 300_000).toISOString(), o: 100, h: 101, l: 99, c: 100, closed: true, ...fields,
});
const bars = Array.from({ length: 16 }, (_, i) => bar(i));
const anchor = bars[10].t;
const through = bars[12].t;
const base = { bars, occurrenceTime: anchor, observedThrough: through, direction: "UP", nowMs: epoch + 30 * 300_000 };

const newsCalendar = {
  status: "CONFIGURED",
  source: "validated-calendar-feed",
  updated_at: new Date(epoch - 300_000).toISOString(),
  events: [{ title: "CPI", at_utc: new Date(epoch + 11 * 300_000 + 120_000).toISOString() }],
};
const news = patternExitEventIdentity({ ...base, kind: "NEWS", calendar: newsCalendar });
assert.equal(news.state, "AVAILABLE");
assert.equal(news.reason, "VALIDATED_NEWS_EVENT_IDENTITY_OBSERVED");
assert.equal(news.event.observation, "NEWS_EVENT_IDENTITY");
assert.equal(news.event.title, "CPI");
assert.equal(news.outcomeStatus, "WITHHELD");
assert.equal(news.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");

const noCalendar = patternExitEventIdentity({ ...base, kind: "NEWS" });
assert.equal(noCalendar.state, "UNAVAILABLE");
assert.equal(noCalendar.reason, "VALIDATED_NEWS_CALENDAR_UNAVAILABLE");
const candleCalendar = patternExitEventIdentity({ ...base, kind: "NEWS", calendar: { ...newsCalendar, events: [{ title: "invented", at_utc: bars[11].t }] } });
assert.equal(candleCalendar.state, "AVAILABLE", "a supplied calendar identity is observational even when its time aligns to a candle");
const noCandlesCalendar = patternExitEventIdentity({ ...base, kind: "NEWS", calendar: { ...newsCalendar, events: [] } });
assert.equal(noCandlesCalendar.state, "WITHHELD", "absence of a calendar event does not infer absence of news");

const resistanceTape = bars.map((row, i) => i === 11 ? { ...row, h: 106 } : row);
const resistance = patternExitEventIdentity({ ...base, kind: "RESISTANCE", bars: resistanceTape, level: 105 });
assert.equal(resistance.state, "AVAILABLE");
assert.equal(resistance.event.observation, "STRUCTURAL_LEVEL_TOUCH");
assert.equal(resistance.event.time, resistanceTape[11].t);
assert.equal(resistance.event.level, 105);
const resistanceWithFutureMutation = patternExitEventIdentity({ ...base, kind: "RESISTANCE", bars: [...resistanceTape.slice(0, 13), { ...resistanceTape[13], h: 9999 }], level: 105 });
assert.deepEqual(resistanceWithFutureMutation.event, resistance.event, "rows after observedThrough cannot change the identity");
const resistanceWithheld = patternExitEventIdentity({ ...base, kind: "RESISTANCE", level: 105 });
assert.equal(resistanceWithheld.state, "WITHHELD");
assert.equal(resistanceWithheld.event.state, "WITHHELD");
const resistanceUnavailable = patternExitEventIdentity({ ...base, kind: "RESISTANCE" });
assert.equal(resistanceUnavailable.state, "UNAVAILABLE");
assert.equal(resistanceUnavailable.reason, "VALIDATED_RESISTANCE_LEVEL_UNAVAILABLE");

const reversalTape = bars.map((row, i) => i === 11 ? { ...row, c: 94, h: 101, l: 93 } : row);
const reversal = patternExitEventIdentity({ ...base, kind: "REVERSAL", bars: reversalTape, level: 95 });
assert.equal(reversal.state, "AVAILABLE");
assert.equal(reversal.event.observation, "ADVERSE_LEVEL_BREAK");
assert.equal(reversal.event.time, reversalTape[11].t);
const weakCounterBar = patternExitEventIdentity({ ...base, kind: "REVERSAL", bars: bars.map((row, i) => i === 11 ? { ...row, c: 99 } : row), level: 95 });
assert.equal(weakCounterBar.state, "WITHHELD", "a counter-colored candle alone is not a reversal event");
const malformedGap = patternExitEventIdentity({ ...base, kind: "REVERSAL", bars: reversalTape.map((row, i) => i === 11 ? { ...row, t: new Date(Date.parse(row.t) + 60_000).toISOString() } : row), level: 95 });
assert.equal(malformedGap.state, "UNAVAILABLE");
assert.equal(malformedGap.reason, "INVALID_CAUSAL_PREFIX");
const futureMutation = patternExitEventIdentity({ ...base, kind: "REVERSAL", bars: [...reversalTape.slice(0, 13), { ...reversalTape[13], c: 1, l: 0 }], level: 95 });
assert.deepEqual(futureMutation.event, reversal.event, "future rows remain outside the observed prefix");

for (const receipt of [news, noCalendar, resistance, resistanceWithheld, reversal]) {
  assert.equal(receipt.version, "pattern-exit-event-identity/1");
  assert.equal(receipt.sourceStatus, "SOURCE_REVIEW_ONLY");
  assert.equal(receipt.outcomeStatus, "WITHHELD");
  assert.equal(receipt.live_apply_allowed, false);
}

console.log("PATTERN EXIT EVENT IDENTITY PASS: validated news/calendar, structural touch and adverse close-break identities remain causal-prefix-only with explicit unavailable/withheld states.");
