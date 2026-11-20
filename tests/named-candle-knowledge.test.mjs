import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: ["src/lib/namedCandleKnowledge.ts"],
  absWorkingDir: app,
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const knowledge = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

assert.equal(Object.keys(knowledge.NAMED_CANDLE_KNOWLEDGE).length, 48, "every named Atlas pattern must have a lens entry");
for (const [pattern, lens] of Object.entries(knowledge.NAMED_CANDLE_KNOWLEDGE)) {
  assert.equal(lens.pattern, pattern);
  assert.ok(lens.structure.length >= 20);
  assert.ok(lens.meaning.length >= 20);
  assert.ok(lens.abstain.length >= 20);
}
assert.equal(knowledge.getNamedCandleKnowledge("MADE_UP_PATTERN"), null, "unknown pattern IDs must not produce a lens");
assert.deepEqual(knowledge.namedPatternDirectionalReadout("BULLISH_ENGULFING", { sampleN: 4, up: 0.625, down: 0.2 }), { direction: "UP", rate: 0.625, interval95: undefined, reason: "OBSERVED" }, "bullish rows must use UP as the directional numerator");
assert.deepEqual(knowledge.namedPatternDirectionalReadout("BEARISH_ENGULFING", { sampleN: 4, up: 0.2, down: 0.625 }), { direction: "DOWN", rate: 0.625, interval95: undefined, reason: "OBSERVED" }, "bearish rows must use DOWN as the directional numerator");
assert.deepEqual(knowledge.namedPatternDirectionalReadout("DOJI", { sampleN: 4, up: 0.2, down: 0.2 }), { direction: "NEUTRAL", rate: null, reason: "NEUTRAL_SETUP" }, "neutral rows must not fabricate a win-rate");
assert.deepEqual(knowledge.namedPatternDirectionalReadout("BULLISH_ENGULFING", { sampleN: 0, up: 0.45, down: 0.3 }), { direction: "UP", rate: null, reason: "NO_OBSERVED_H1" }, "unseen historical support must remain unavailable");
assert.deepEqual(knowledge.namedPatternDirectionalReadout("BEARISH_ENGULFING", { sampleN: 5, up: 0.2, down: 0.6, flat: 0.2, calibration: { interval95: { up: { lower: 0.05, upper: 0.4 }, down: { lower: 0.3, upper: 0.85 } } } }), { direction: "DOWN", rate: 0.6, interval95: { lower: 0.3, upper: 0.85 }, reason: "OBSERVED" }, "historical filtered-tape distributions must use the same DOWN orientation helper");

assert.match(knowledge.getNamedCandleKnowledge("HAMMER").abstain, /Abstain/i);
assert.equal(knowledge.getNamedCandleKnowledge("ABANDONED_BABY_BULLISH").family, "THREE_CANDLE");
assert.equal(knowledge.getNamedCandleKnowledge("BULLISH_STICK_SANDWICH").family, "THREE_CANDLE");
assert.equal(knowledge.getNamedCandleKnowledge("BULLISH_TASUKI_GAP").family, "THREE_CANDLE");
assert.deepEqual(Object.keys(knowledge.NAMED_CANDLE_FAMILY_KNOWLEDGE).sort(), ["MULTI_CANDLE", "SINGLE_CANDLE", "THREE_CANDLE", "TWO_CANDLE"],
  "every named-candle family must have a concise explanatory lens");
for (const family of knowledge.NAMED_CANDLE_FAMILIES) {
  const lens = knowledge.getNamedCandleFamilyKnowledge(family);
  assert.equal(lens.family, family);
  assert.ok(lens.structure.length >= 20);
  assert.ok(lens.meaning.length >= 20);
  assert.ok(lens.abstain.length >= 20);
  assert.match(lens.abstain, /abstain|no order authority|LONG|SHORT/i);
}
assert.equal(knowledge.getNamedCandleFamilyKnowledge("MADE_UP_FAMILY"), null, "unknown family IDs must not produce a lens");
console.log("NAMED CANDLE KNOWLEDGE PASS: complete descriptive taxonomy with fail-closed lookup.");
