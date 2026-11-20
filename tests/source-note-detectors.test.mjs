import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(app + "package.json")("esbuild");
const bundled = await build({
  stdin: { contents: "export * from './src/lib/sourceNoteDetectors.ts';", resolveDir: app },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const artifact = JSON.parse(readFileSync(new URL("../artifacts/wave8-source-note-detectors.json", import.meta.url), "utf8"));

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 120 }, (_, i) => {
  const close = 100 + i * 0.02;
  const range = i >= 108 ? 0.08 : 1;
  const row = {
    t: new Date(epoch + i * 300_000).toISOString(),
    o: close - range / 4,
    h: close + range / 2,
    l: close - range / 2,
    c: close,
    closed: true,
  };
  return i === 111 ? { ...row, o: 101.9, h: 102.5, l: 101.7, c: 101.8 } : row;
});
const selectedTime = bars[110].t;
const nowMs = epoch + 130 * 300_000;
const input = {
  bars,
  selectedTime,
  observedThrough: bars[112].t,
  direction: "UP",
  resistanceLevel: 102.3,
  reversalLevel: 102,
  calendar: {
    status: "CONFIGURED",
    source: "validated-calendar-feed",
    updated_at: bars[109].t,
    events: [{ title: "CPI", at_utc: bars[111].t }],
  },
  bracket: { entryPrice: 102, stopPrice: 100, targetPrice: 105, spreadPrice: 0.2, slippagePrice: 0.1, commissionQuote: 0.05 },
  protection: 98,
  nowMs,
};

test("seven source-note descriptors remain bounded, descriptive and source-labeled", () => {
  const receipt = api.detectSourceNoteSubset(input);
  assert.equal(receipt.version, "source-note-detectors/1");
  assert.equal(receipt.symbol, "XAUUSD");
  assert.equal(receipt.timeframe, "M5");
  assert.deepEqual(Object.keys(receipt.descriptors).sort(), [
    "bracket_costs", "low_volatility", "news_exit", "obstacle_room",
    "resistance_exit", "reversal_exit", "trade_selection_failure",
  ]);
  assert.equal(receipt.descriptors.news_exit.state, "DESCRIPTIVE");
  assert.equal(receipt.descriptors.resistance_exit.state, "DESCRIPTIVE");
  assert.equal(receipt.descriptors.reversal_exit.state, "DESCRIPTIVE");
  assert.equal(receipt.descriptors.trade_selection_failure.state, "DESCRIPTIVE");
  assert.equal(receipt.descriptors.obstacle_room.state, "DESCRIPTIVE");
  assert.equal(receipt.descriptors.low_volatility.state, "DESCRIPTIVE");
  assert.equal(receipt.descriptors.bracket_costs.state, "DESCRIPTIVE");
  for (const descriptor of Object.values(receipt.descriptors)) {
    assert.equal(descriptor.sourceStatus, "SOURCE_REVIEW_ONLY");
    assert.equal(descriptor.outcomeStatus, "WITHHELD");
    assert.equal(descriptor.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
    assert.equal(descriptor.live_apply_allowed, false);
    const expectedEnd = ["news_exit", "resistance_exit", "reversal_exit"].includes(descriptor.conceptId) ? bars[112].t : selectedTime;
    assert.equal(descriptor.causalPrefix.end, expectedEnd);
    assert.equal(descriptor.causalPrefix.futureRows, "WITHHELD");
  }
  assert.equal(receipt.descriptors.bracket_costs.observation.pdfPipDistancesUsed, false);
  assert.equal(receipt.descriptors.news_exit.observation.title, "CPI");
});

test("future rows cannot alter a selected source-note receipt", () => {
  const original = api.detectSourceNoteSubset(input);
  const futureMutated = api.detectSourceNoteSubset({
    ...input,
    bars: bars.map((bar, index) => index > 112 ? { ...bar, h: Number.NaN, l: Number.NaN, c: Number.NaN, closed: false } : { ...bar }),
  });
  assert.deepEqual(futureMutated, original);
});

test("malformed prefixes fail closed and disabled evidence is withheld", () => {
  const gap = bars.map((bar) => ({ ...bar }));
  gap[109].t = new Date(Date.parse(gap[109].t) + 60_000).toISOString();
  const invalid = api.detectSourceNoteSubset({ ...input, bars: gap });
  assert.equal(invalid.state, "UNAVAILABLE");
  assert.equal(invalid.reason, "INVALID_CAUSAL_PREFIX");
  assert.equal(invalid.descriptors.news_exit.causalPrefix.state, "UNAVAILABLE");
  const withheld = api.detectSourceNoteSubset({ ...input, enabled: false });
  assert.equal(withheld.state, "WITHHELD");
  assert.equal(withheld.descriptors.bracket_costs.state, "WITHHELD");
  assert.equal(withheld.descriptors.bracket_costs.outcomeStatus, "WITHHELD");
});

test("direction and assumptions stay explicit", () => {
  const neutral = api.detectSourceNoteSubset({ ...input, direction: "NEUTRAL", bracket: undefined });
  assert.equal(neutral.descriptors.trade_selection_failure.state, "WITHHELD");
  assert.equal(neutral.descriptors.obstacle_room.state, "WITHHELD");
  assert.equal(neutral.descriptors.bracket_costs.state, "UNAVAILABLE");
  const negativeCost = api.detectSourceNoteSubset({ ...input, bracket: { ...input.bracket, spreadPrice: -1 } });
  assert.equal(negativeCost.descriptors.bracket_costs.state, "UNAVAILABLE");
  const pipBracket = api.detectSourceNoteSubset({ ...input, bracket: { ...input.bracket, unit: "PIPS" } });
  assert.equal(pipBracket.descriptors.bracket_costs.state, "UNAVAILABLE");
});

assert.equal(artifact.schema, "quantsmart.source-note-detectors/1");
assert.deepEqual(artifact.concepts, [
  "news_exit", "resistance_exit", "reversal_exit", "trade_selection_failure",
  "obstacle_room", "low_volatility", "bracket_costs",
]);
assert.equal(artifact.boundaries.source_status, "SOURCE_REVIEW_ONLY");
assert.equal(artifact.boundaries.outcome_status, "WITHHELD");
assert.equal(artifact.boundaries.future_rows, "WITHHELD");
assert.equal(artifact.boundaries.fills_orders, "UNAVAILABLE");
assert.equal(artifact.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");

console.log("SOURCE NOTE DETECTORS PASS: seven bounded XAUUSD M5 descriptors preserve causal-prefix, source-only and no-execution boundaries.");
