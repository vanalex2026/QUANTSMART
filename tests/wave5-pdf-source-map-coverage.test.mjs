import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const map = readJson("docs/price_action_knowledge_map.json");
const receipt = readJson("artifacts/wave5-pdf-source-map-coverage-audit.json");
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url))("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const detector = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const authority = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false";
const conceptIds = map.concepts.map((concept) => concept.id);
const conceptSet = new Set(conceptIds);
assert.equal(map.authority, authority);
assert.equal(conceptIds.length, 23);
assert.equal(conceptSet.size, conceptIds.length);
assert.equal(map.source_lenses.length, 36);
assert.equal(map.held_out_source_fixtures.length, 36);
assert.deepEqual([...detector.ALL_PDF_SIGNAL_CONCEPT_IDS].sort(), [...conceptIds].sort());

const sourcePages = Number(map.source.pdf_pages);
const lensesById = new Map(map.source_lenses.map((lens) => [lens.id, lens]));
const fixturesByLens = new Map();
for (const fixture of map.held_out_source_fixtures) {
  assert.ok(lensesById.has(fixture.lens_id), `${fixture.id} must reference an indexed lens`);
  assert.equal(fixture.status, "SOURCE_REVIEW_ONLY");
  assert.equal(fixture.data_status, "UNAVAILABLE");
  assert.equal(fixture.outcome_status, "WITHHELD");
  assert.ok(fixture.pages.length > 0 && fixture.pages.every((page) => Number.isInteger(page) && page >= 1 && page <= sourcePages));
  const rows = fixturesByLens.get(fixture.lens_id) || [];
  rows.push(fixture);
  fixturesByLens.set(fixture.lens_id, rows);
}

for (const concept of map.concepts) {
  assert.ok(concept.pages.length > 0, `${concept.id} needs PDF anchors`);
  assert.ok(concept.pages.every((page, index) => Number.isInteger(page) && page >= 1 && page <= sourcePages && (index === 0 || page > concept.pages[index - 1])), `${concept.id} anchors must be sorted and bounded`);
  const linkedLenses = map.source_lenses.filter((lens) => lens.concept_ids.includes(concept.id));
  assert.ok(linkedLenses.length > 0, `${concept.id} needs source-lens coverage`);
  for (const lens of linkedLenses) {
    assert.equal(lens.implementation, "SOURCE_NOTES");
    assert.ok(lens.pages.every((page) => concept.pages.includes(page) || lens.concept_ids.some((id) => map.concepts.find((row) => row.id === id)?.pages.includes(page))), `${lens.id} cites an unanchored page`);
  }
}

for (const lens of map.source_lenses) {
  const fixtures = fixturesByLens.get(lens.id) || [];
  assert.equal(fixtures.length, 1, `${lens.id} needs exactly one held-out fixture`);
  assert.ok(lens.concept_ids.length > 0 && lens.concept_ids.every((id) => conceptSet.has(id)), `${lens.id} needs indexed concepts`);
  assert.ok(lens.pages.length > 0 && lens.pages.every((page) => Number.isInteger(page) && page >= 1 && page <= sourcePages));
  assert.ok(fixtures[0].pages.every((page) => lens.pages.includes(page)), `${fixtures[0].id} must stay within its lens anchors`);
}

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 120 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const input = { bars, selectedTime: bars.at(-1).t, direction: "UP", protection: 1998, nowMs: epoch + 121 * 300_000 };
const result = detector.detectAllPdfSignals(input);
assert.equal(result.symbol, "XAUUSD");
assert.equal(result.timeframe, "M5");
assert.equal(result.authority, authority);
assert.equal(result.observations.length, 23);
assert.equal(new Set(result.observations.map((row) => row.conceptId)).size, 23);
for (const concept of map.concepts) {
  const observation = result.observations.find((row) => row.conceptId === concept.id);
  assert.ok(observation, `${concept.id} needs a unified observation`);
  if (concept.implementation === "GEOMETRY_PROXY") assert.equal(observation.sourceStatus, "DETECTOR_GEOMETRY");
  if (concept.implementation === "SOURCE_NOTES") assert.equal(observation.sourceStatus, "SOURCE_REVIEW_ONLY");
}

for (const identity of [{ symbol: "EURUSD" }, { timeframe: "H1" }]) {
  const rejected = detector.detectAllPdfSignals({ ...input, ...identity });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.symbol, "XAUUSD");
  assert.equal(rejected.timeframe, "M5");
  assert.equal(rejected.observations.length, 23);
  assert.equal(rejected.counts.detected, 0);
}

assert.equal(receipt.result, "PASS");
assert.equal(receipt.surface.symbol, "XAUUSD");
assert.equal(receipt.surface.timeframe, "M5");
assert.equal(receipt.surface.concept_count, 23);
assert.equal(receipt.surface.source_lens_count, 36);
assert.equal(receipt.surface.held_out_fixture_count, 36);
assert.equal(receipt.coverage.every_lens_has_one_held_out_fixture, true);
assert.equal(receipt.coverage.concept_implementation_matches_detector, true);
assert.equal(receipt.coverage.rejected_identity_labels_preserved, true);

console.log("WAVE 5 PDF SOURCE MAP COVERAGE PASS: 23 concepts, anchored lenses, one held-out fixture per lens and XAUUSD M5 detector labels reconcile.");
