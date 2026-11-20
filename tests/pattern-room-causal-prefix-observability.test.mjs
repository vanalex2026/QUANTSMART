import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const { build } = require("esbuild");
const bundle = await build({
  stdin: {
    contents: "export { patternRoomContext } from './src/lib/patternRoomContext.ts'; export { PatternRoomEvidence } from './src/components/PatternRoomEvidence.tsx';",
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
const { patternRoomContext, PatternRoomEvidence } = mod.exports;
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const epoch = Date.parse("2026-01-05T00:00:00Z");
const bars = Array.from({ length: 100 }, (_, i) => ({
  t: new Date(epoch + i * 300_000).toISOString(),
  o: 100,
  h: i === 70 ? 108 : 101,
  l: 99,
  c: 100,
  closed: true,
}));

test("room receipt exposes only the selected closed causal prefix", () => {
  const room = patternRoomContext(bars, bars.at(-1).t, "UP", 95);
  assert.equal(room.causalPrefix.mode, "CAUSAL_PREFIX_ONLY");
  assert.equal(room.causalPrefix.maxBars, 96);
  assert.equal(room.causalPrefix.bars, 96);
  assert.equal(room.causalPrefix.start, bars[4].t);
  assert.equal(room.causalPrefix.end, bars.at(-1).t);
  assert.equal(room.causalPrefix.futureRows, "WITHHELD");
  assert.equal(room.causalPrefix.sourceStatus, "SOURCE_REVIEW_ONLY");
  assert.equal(room.causalPrefix.dataStatus, "AVAILABLE");
  assert.equal(room.causalPrefix.outcomeStatus, "WITHHELD");
  assert.equal(room.causalPrefix.authority, "SHADOW_ONLY / NO_DECISION");
  assert.equal(room.causalPrefix.live_apply_allowed, false);

  const withFuture = patternRoomContext([
    ...bars,
    { ...bars.at(-1), t: new Date(epoch + 100 * 300_000).toISOString(), h: 250, l: 90, c: 91 },
  ], bars.at(-1).t, "UP", 95);
  assert.deepEqual(withFuture.causalPrefix, room.causalPrefix);
  assert.deepEqual(withFuture.structuralLevels, room.structuralLevels);
});

test("invalid or unverified room prefixes fail closed with explicit status", () => {
  const short = patternRoomContext(bars.slice(-20), bars.at(-1).t, "UP", 95);
  assert.equal(short.causalPrefix.mode, "UNAVAILABLE");
  assert.equal(short.causalPrefix.dataStatus, "UNAVAILABLE");
  assert.equal(short.causalPrefix.outcomeStatus, "WITHHELD");

  const unverified = patternRoomContext(bars, bars.at(-1).t, "UP", 95, false);
  assert.equal(unverified.causalPrefix.mode, "WITHHELD");
  assert.equal(unverified.causalPrefix.dataStatus, "UNAVAILABLE");
  assert.equal(unverified.causalPrefix.sourceStatus, "SOURCE_REVIEW_ONLY");

  const room = patternRoomContext(bars, bars.at(-1).t, "UP", 95);
  const html = renderToStaticMarkup(createElement(PatternRoomEvidence, { room, onInspectContext() {} }));
  assert.match(html, /data-room-causal-prefix="true"/);
  assert.match(html, /SOURCE_REVIEW_ONLY \/ data AVAILABLE \/ outcome WITHHELD/);
  assert.match(html, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
});

console.log("PATTERN ROOM CAUSAL PREFIX OBSERVABILITY PASS: bounded prefix identity, future withholding and source/data/outcome status remain descriptive.");
