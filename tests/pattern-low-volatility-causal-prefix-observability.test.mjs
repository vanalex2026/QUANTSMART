import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const { build } = require("esbuild");
const bundle = await build({
  stdin: {
    contents: "export { patternLowVolatilityContext } from './src/lib/patternLowVolatilityContext.ts'; export { PatternLowVolatilityEvidence } from './src/components/PatternLowVolatilityEvidence.tsx';",
    resolveDir: app,
  },
  bundle: true,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  external: ["react", "react/jsx-runtime"],
  write: false,
  logLevel: "silent",
});
const mod = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(require, mod, mod.exports);
const { patternLowVolatilityContext, PatternLowVolatilityEvidence } = mod.exports;
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const epoch = Date.parse("2026-01-05T00:00:00Z");
const bars = Array.from({ length: 60 }, (_, i) => ({
  t: new Date(epoch + i * 300_000).toISOString(),
  o: 100,
  h: 100 + (i < 48 ? 5 : 1),
  l: 100 - (i < 48 ? 5 : 1),
  c: 100.2,
  closed: true,
}));

test("low-volatility receipt exposes only the selected closed prefix", () => {
  const context = patternLowVolatilityContext(bars, bars.at(-1).t);
  assert.equal(context.causalPrefix.mode, "CAUSAL_PREFIX_ONLY");
  assert.equal(context.causalPrefix.maxBars, 60);
  assert.equal(context.causalPrefix.bars, 60);
  assert.equal(context.causalPrefix.start, bars[0].t);
  assert.equal(context.causalPrefix.end, bars.at(-1).t);
  assert.equal(context.causalPrefix.futureRows, "WITHHELD");
  assert.equal(context.causalPrefix.sourceStatus, "SOURCE_REVIEW_ONLY");
  assert.equal(context.causalPrefix.dataStatus, "AVAILABLE");
  assert.equal(context.causalPrefix.outcomeStatus, "WITHHELD");
  assert.equal(context.causalPrefix.authority, "SHADOW_ONLY / NO_DECISION");
  assert.equal(context.causalPrefix.live_apply_allowed, false);

  const withFuture = patternLowVolatilityContext([
    ...bars,
    { ...bars.at(-1), t: new Date(epoch + 60 * 300_000).toISOString(), h: 250, l: 90, c: 91 },
  ], bars.at(-1).t);
  assert.deepEqual(withFuture.causalPrefix, context.causalPrefix);
  assert.deepEqual(withFuture.activityRatio, context.activityRatio);
});

test("invalid or unverified prefixes fail closed with explicit status", () => {
  const short = patternLowVolatilityContext(bars.slice(-20), bars.at(-1).t);
  assert.equal(short.causalPrefix.mode, "UNAVAILABLE");
  assert.equal(short.causalPrefix.dataStatus, "UNAVAILABLE");
  const unverified = patternLowVolatilityContext(bars, bars.at(-1).t, false);
  assert.equal(unverified.causalPrefix.mode, "WITHHELD");
  assert.equal(unverified.causalPrefix.sourceStatus, "SOURCE_REVIEW_ONLY");
  const html = renderToStaticMarkup(createElement(PatternLowVolatilityEvidence, { context: patternLowVolatilityContext(bars, bars.at(-1).t) }));
  assert.match(html, /data-low-volatility-causal-prefix="true"/);
  assert.match(html, /SOURCE_REVIEW_ONLY \/ data AVAILABLE \/ outcome WITHHELD/);
  assert.match(html, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
});

console.log("PATTERN LOW-VOLATILITY CAUSAL PREFIX PASS: bounded closed-prefix identity, future withholding and source/data/outcome status remain descriptive.");
