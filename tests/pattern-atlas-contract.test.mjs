import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/candlePatternAtlas.ts"], absWorkingDir: root, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const atlas = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const knowledge = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/namedCandleKnowledge.ts", import.meta.url), "utf8");
const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
assert.match(microscope, /const analogueObservedN = analogueOutcomeCounts\.UP/, "Microscope raw filtered-tape denominator must stay explicit");
assert.match(microscope, /const analogueMatches = analoguePatternFilter[\s\S]*allAnalogueMatches\.filter/, "selected pattern readout must use the filtered analogue distribution");
assert.match(microscope, /namedPatternDirectionalReadout\(/, "focused named-pattern readout must use the shared orientation helper");
assert.match(microscope, /directional win-rate N\/A/);
assert.match(microscope, /descriptive tape only/);
assert.match(knowledge, /pattern\.startsWith\(\"BULLISH_\"\)/, "bullish named patterns must map to UP orientation");
assert.match(knowledge, /pattern\.startsWith\(\"BEARISH_\"\)/, "bearish named patterns must map to DOWN orientation");
assert.match(knowledge, /return \"NEUTRAL\"/, "unoriented named patterns must remain neutral");
assert.match(knowledge, /export function namedCandlePatternDirection/);
const knowledgeBundle = await build({ entryPoints: ["src/lib/namedCandleKnowledge.ts"], absWorkingDir: root, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const knowledgeModule = await import("data:text/javascript;base64," + Buffer.from(knowledgeBundle.outputFiles[0].text).toString("base64"));
const directionalRate = (pattern, counts) => {
  const direction = knowledgeModule.namedCandlePatternDirection(pattern);
  const observed = counts.UP + counts.FLAT + counts.DOWN;
  return direction === "UP" ? (observed ? counts.UP / observed : null) : direction === "DOWN" ? (observed ? counts.DOWN / observed : null) : null;
};
assert.equal(directionalRate("BULLISH_MARUBOZU", { UP: 3, FLAT: 1, DOWN: 1 }), 0.6, "bullish named patterns must use the UP denominator");
assert.equal(directionalRate("BEARISH_MARUBOZU", { UP: 1, FLAT: 1, DOWN: 3 }), 0.6, "bearish named patterns must use the DOWN denominator");
assert.equal(directionalRate("DOJI", { UP: 3, FLAT: 1, DOWN: 1 }), null, "neutral named patterns must not expose a directional win-rate");
const historicalOnly = { UP: 2, FLAT: 1, DOWN: 1 };
assert.equal(directionalRate("BULLISH_MARUBOZU", historicalOnly), 0.5, "historical-only pattern filters must fall back to their filtered tape distribution");
const fixture = Array.from({ length: 80 }, (_, i) => ({ i, t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString(), o: 2000 + i, h: 2001 + i, l: 1999 + i, c: 2000.5 + i }));
const result = atlas.analyzeMultiTimeframe({ M5: fixture, M15: fixture, M30: fixture }, "XAUUSD", { nowMs: Date.now(), symbol: "XAUUSD" });
assert.ok(result && result.timeframes && result.timeframes.M5, "Atlas must return M5 analysis for a valid closed tape");
console.log("FOCUSED CANDLE EVIDENCE CONTRACT PASS: evidence gating and directional named-pattern readout are present.");



