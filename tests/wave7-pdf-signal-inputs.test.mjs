import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(app + "package.json")("esbuild");
const bundle = await build({ stdin: { contents: 'export * from "./src/lib/pdfSignalTranslation.ts";', resolveDir: app }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 100 }, (_, i) => ({ t: new Date(epoch + i * 300000).toISOString(), o: 100 + i * 0.02, h: 101 + i * 0.02, l: 99 + i * 0.02, c: 100.5 + i * 0.02, closed: true }));
const selectedTime = bars.at(-1).t;
const result = api.translatePdfSignalConcepts({
  bars, selectedTime, direction: "UP", protection: 98, nowMs: epoch + 101 * 300000,
  bracket: { entryPrice: 102, stopPrice: 100, targetPrice: 106, spreadPrice: 0.2, slippagePrice: 0.1, commissionQuote: 0.05 },
  newsEvent: { atUtc: selectedTime, title: "CPI", source: "calendar-test" },
  reversalEvent: { time: selectedTime, identity: "adverse-close-break:test" },
  sizing: { equity: 10000, riskPct: 1, stopDistance: 2, contractSize: 100, lotStep: 0.01, minLot: 0.01 },
});
assert.equal(result.descriptors.bracket_costs.state, "DESCRIPTIVE");
assert.equal(result.descriptors.bracket_costs.geometry.pdfPipDistancesUsed, false);
assert.equal(result.descriptors.news_exit.state, "DESCRIPTIVE");
assert.equal(result.descriptors.news_exit.geometry.exitDecision, null);
assert.equal(result.descriptors.reversal_exit.state, "DESCRIPTIVE");
assert.equal(result.descriptors.reversal_exit.geometry.exitDecision, null);
assert.equal(result.descriptors.position_sizing.state, "DESCRIPTIVE");
assert.equal(result.descriptors.position_sizing.geometry.orders, null);
for (const descriptor of Object.values(result.descriptors)) {
  assert.equal(descriptor.outcomeStatus, "WITHHELD");
  assert.equal(descriptor.live_apply_allowed, false);
}
console.log("WAVE 7 PDF SIGNAL INPUTS PASS: optional XAUUSD quote-price, calendar, event and sizing inputs produce descriptive receipts without execution authority.");
