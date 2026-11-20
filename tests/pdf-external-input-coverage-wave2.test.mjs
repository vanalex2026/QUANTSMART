import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(app + "package.json")("esbuild");
const bundled = await build({
  stdin: {
    contents: [
      'export * from "./src/lib/pdfExternalInputs.ts";',
      'export * from "./src/lib/pdfSignalDetector.ts";',
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
const bars = Array.from({ length: 100 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const selectedTime = bars.at(-1).t;
const calendar = {
  status: "CONFIGURED",
  source: "imported-calendar",
  updated_at: bars[0].t,
  events: [{ title: "CPI", at_utc: selectedTime }],
};

test("stored calendar is parsed and wired as explicit news identity", () => {
  const storage = { getItem: (key) => key === "mfe_calendar_events" ? JSON.stringify(calendar) : null };
  assert.deepEqual(api.readConfiguredEconomicCalendar(storage), calendar);
  const result = api.detectAllPdfSignals({ bars, selectedTime, direction: "UP", calendar, nowMs: epoch + 101 * 300_000 });
  const descriptor = result.sourceNoteDescriptors.news_exit;
  assert.equal(descriptor.state, "DESCRIPTIVE");
  assert.equal(descriptor.reason, "VALIDATED_NEWS_EVENT_IDENTITY_OBSERVED");
  assert.equal(descriptor.geometry.eventIdentity, `${selectedTime}\u0000CPI`);
  assert.equal(descriptor.live_apply_allowed, false);
});

test("missing or malformed stored calendar remains unavailable", () => {
  assert.equal(api.readConfiguredEconomicCalendar({ getItem: () => null }), null);
  assert.equal(api.readConfiguredEconomicCalendar({ getItem: () => "{bad" }), null);
  const result = api.detectAllPdfSignals({ bars, selectedTime, direction: "UP", nowMs: epoch + 101 * 300_000 });
  assert.equal(result.sourceNoteDescriptors.news_exit.state, "UNAVAILABLE");
  assert.equal(result.sourceNoteDescriptors.news_exit.reason, "VALIDATED_NEWS_CALENDAR_UNAVAILABLE");
});

test("external concepts without authoritative runtime inputs stay fail-closed", () => {
  const result = api.detectAllPdfSignals({ bars, selectedTime, direction: "UP", nowMs: epoch + 101 * 300_000 });
  assert.equal(result.sourceNoteDescriptors.bracket_costs.state, "UNAVAILABLE");
  assert.equal(result.sourceNoteDescriptors.position_sizing.state, "UNAVAILABLE");
  assert.ok(["UNAVAILABLE", "WITHHELD"].includes(result.sourceNoteDescriptors.reversal_exit.state));
  for (const id of ["bracket_costs", "position_sizing", "reversal_exit"]) {
    assert.equal(result.sourceNoteDescriptors[id].outcomeStatus, "WITHHELD");
    assert.equal(result.sourceNoteDescriptors[id].live_apply_allowed, false);
  }
});

console.log("PDF EXTERNAL INPUT COVERAGE WAVE 2 PASS: imported calendar wiring is explicit and bracket, reversal, and sizing inputs remain fail-closed without authoritative evidence.");
