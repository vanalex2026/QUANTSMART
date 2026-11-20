import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const map = read("../docs/price_action_knowledge_map.json");
const receipt = read("../artifacts/wave6-obstacle-room-source-audit.json");
const concept = map.concepts.find(row => row.id === receipt.concept_id);
const lenses = new Map(map.source_lenses.map(row => [row.id, row]));
const fixtures = new Map(map.held_out_source_fixtures.map(row => [row.id, row]));

assert.equal(receipt.source_sha256, map.source.sha256);
assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.implementation_change, false);
assert.equal(receipt.status, "SOURCE_REVIEW_ONLY");
assert.equal(receipt.data_status, "UNAVAILABLE");
assert.equal(receipt.outcome_status, "WITHHELD");
assert.ok(concept, "obstacle_room concept must exist");
assert.equal(concept.implementation, "SOURCE_NOTES");
assert.ok(concept.pages.length > 0);
assert.ok(concept.cues.length >= 3);
assert.ok(concept.abstain.some(cue => /no confirmed swing/i.test(cue)));
assert.ok(concept.abstain.some(cue => /filtered win-rate/i.test(cue)));

for (const lensId of receipt.lens_ids) {
  const lens = lenses.get(lensId);
  assert.ok(lens, `${lensId} lens must exist`);
  assert.equal(lens.implementation, "SOURCE_NOTES");
  assert.ok(lens.concept_ids.includes(receipt.concept_id));
  assert.ok(lens.pages.length > 0 && lens.cues.length >= 2 && lens.abstain.length >= 2);
}
for (const fixtureId of receipt.fixture_ids) {
  const fixture = fixtures.get(fixtureId);
  assert.ok(fixture, `${fixtureId} fixture must exist`);
  assert.equal(fixture.status, "SOURCE_REVIEW_ONLY");
  assert.equal(fixture.data_status, "UNAVAILABLE");
  assert.equal(fixture.outcome_status, "WITHHELD");
  assert.ok(receipt.lens_ids.includes(fixture.lens_id));
}

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const { build } = require("esbuild");
const bundle = await build({
  stdin: {
    contents: "export { patternRoomContext } from './src/lib/patternRoomContext.ts';",
    resolveDir: app,
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const epoch = Date.parse("2026-01-05T00:00:00Z");
const rows = Array.from({ length: 100 }, (_, i) => ({
  t: new Date(epoch + i * 300_000).toISOString(),
  o: 100,
  h: i === 70 ? 108 : 101,
  l: 99,
  c: 100,
  closed: true,
}));
const room = api.patternRoomContext(rows, rows.at(-1).t, "UP", 95);
const withFuture = api.patternRoomContext([
  ...rows,
  { t: new Date(epoch + 100 * 300_000).toISOString(), o: 100, h: 250, l: 90, c: 91, closed: true },
], rows.at(-1).t, "UP", 95);
assert.equal(room.authority, "SHADOW_ONLY / NO_DECISION");
assert.equal(room.contextEnd, rows.at(-1).t);
assert.equal(withFuture.contextEnd, room.contextEnd);
assert.deepEqual(withFuture.structuralLevels, room.structuralLevels);
assert.ok(["NO_CONFIRMED_SWING", "MEASURED_WITHOUT_RISK", "WITHIN_ONE_TECHNICAL_RISK", "BEYOND_ONE_TECHNICAL_RISK"].includes(room.state));

console.log("WAVE 6 OBSTACLE-ROOM SOURCE AUDIT PASS: source notes, withheld fixtures and bounded observational room context remain non-qualifying.");
