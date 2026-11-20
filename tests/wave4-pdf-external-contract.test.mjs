import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(app + "package.json")("esbuild");
const bundled = await build({
  stdin: {
    contents: [
      'export * from "./src/lib/economicCalendar.ts";',
      'export * from "./src/lib/patternExitEventIdentity.ts";',
      'export * from "./src/lib/pdfSignalTranslation.ts";',
    ].join("\n"),
    resolveDir: app,
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bar = (i, fields = {}) => ({
  t: new Date(epoch + i * 300_000).toISOString(),
  o: 100,
  h: 101,
  l: 99,
  c: 100.5,
  closed: true,
  ...fields,
});
const bars = Array.from({ length: 16 }, (_, i) => bar(i));
const occurrenceTime = bars[10].t;
const observedThrough = bars[12].t;
const base = { bars, occurrenceTime, observedThrough, direction: "UP", nowMs: epoch + 30 * 300_000 };

assert.throws(() => api.parseEconomicCalendar({
  status: "CONFIGURED",
  source: "feed",
  updated_at: "2026-02-30T00:00:00.000Z",
  events: [],
}), /CALENDAR_INVALID_UPDATED_AT/);
assert.throws(() => api.parseEconomicCalendar({
  status: "READY",
  source: "feed",
  updated_at: bars[0].t,
  events: [],
}), /CALENDAR_INVALID_STATUS/);
assert.throws(() => api.parseEconomicCalendar({
  status: "CONFIGURED",
  source: "feed",
  updated_at: bars[0].t,
  events: [{ title: "CPI", at_utc: bars[11].t }, { title: "CPI", at_utc: bars[11].t }],
}), /CALENDAR_DUPLICATE_EVENT_1/);

const offGridCalendar = {
  status: "CONFIGURED",
  source: "validated-feed",
  updated_at: bars[0].t,
  events: [{ title: "CPI", at_utc: "2026-01-05T00:56:00.123Z" }],
};
const offGrid = api.patternExitEventIdentity({ ...base, kind: "NEWS", calendar: offGridCalendar });
assert.equal(offGrid.state, "AVAILABLE", "validated news may occur between M5 candle boundaries");
assert.equal(offGrid.event.time, "2026-01-05T00:56:00.123Z");

const futureCalendar = { ...offGridCalendar, events: [{ title: "future", at_utc: "2026-01-05T02:00:00.000Z" }] };
assert.equal(api.patternExitEventIdentity({ ...base, kind: "NEWS", calendar: futureCalendar }).state, "WITHHELD");
const duplicateDirectCalendar = { ...offGridCalendar, events: [...offGridCalendar.events, ...offGridCalendar.events] };
assert.equal(api.patternExitEventIdentity({ ...base, kind: "NEWS", calendar: duplicateDirectCalendar }).reason, "INVALID_NEWS_CALENDAR");

const malformedBracket = api.translatePdfSignalConcepts({
  bars: bars.slice(0, 11), selectedTime: occurrenceTime, direction: "UP", nowMs: epoch + 30 * 300_000,
  bracket: { entryPrice: 0, stopPrice: -1, targetPrice: 2, unit: "QUOTE_PRICE_UNITS", source: "USER_SUPPLIED" },
});
assert.equal(malformedBracket.descriptors.bracket_costs.state, "UNAVAILABLE");

const malformedReversal = api.translatePdfSignalConcepts({
  bars: bars.slice(0, 11), selectedTime: occurrenceTime, direction: "UP", nowMs: epoch + 30 * 300_000,
  reversalEvent: { time: bars[9].t, identity: "  " },
});
assert.equal(malformedReversal.descriptors.reversal_exit.state, "WITHHELD");

console.log("WAVE 4 PDF EXTERNAL CONTRACT PASS: impossible, duplicate, malformed and future external identities fail closed while validated off-grid calendar events remain observational.");
