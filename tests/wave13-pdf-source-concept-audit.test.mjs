import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const readJson = (path) => JSON.parse(read(path));
const audit = readJson("artifacts/wave13-pdf-source-concept-audit.json");
const map = readJson("docs/price_action_knowledge_map.json");
const authority = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false";

assert.equal(audit.result, "PASS");
assert.equal(audit.surface.symbol, "XAUUSD");
assert.equal(audit.surface.timeframe, "M5");
assert.equal(audit.boundaries.authority, authority);
assert.equal(audit.boundaries.source_status, "SOURCE_REVIEW_ONLY");
assert.equal(audit.boundaries.outcome_status, "WITHHELD");
assert.equal(audit.boundaries.future_rows, "WITHHELD");
assert.equal(audit.boundaries.pdf_examples_are_xauusd_ohlc, false);
assert.equal(audit.boundaries.source_labels_inferred, false);
assert.equal(audit.boundaries.measured_outcomes_claimed, false);
assert.equal(audit.boundaries.fills_orders_or_execution_authority, false);
assert.equal(audit.implementation_change, false);
assert.equal(audit.detector_change, false);

assert.equal(map.authority, authority);
assert.equal(map.concepts.length, 23);
const conceptIds = map.concepts.map((concept) => concept.id);
assert.equal(new Set(conceptIds).size, 23);
for (const concept of map.concepts) {
  assert.ok(concept.name && concept.definition, `${concept.id} needs a label and definition`);
  assert.ok(Array.isArray(concept.pages) && concept.pages.length > 0, `${concept.id} needs PDF anchors`);
  assert.ok(concept.pages.every((page, index) => Number.isInteger(page) && page >= 1 && page <= map.source.pdf_pages && (index === 0 || page > concept.pages[index - 1])), `${concept.id} has invalid anchor ordering`);
}

const geometryIds = map.concepts.filter((concept) => concept.implementation === "GEOMETRY_PROXY").map((concept) => concept.id);
const sourceIds = map.concepts.filter((concept) => concept.implementation === "SOURCE_NOTES").map((concept) => concept.id);
assert.equal(geometryIds.length, 13);
assert.equal(sourceIds.length, 10);
assert.deepEqual(new Set([...geometryIds, ...sourceIds]), new Set(conceptIds));
assert.equal(map.source_lenses.length, 36);
assert.equal(map.held_out_source_fixtures.length, 36);
assert.equal(map.relationships.length, 30);

const lenses = new Map(map.source_lenses.map((lens) => [lens.id, lens]));
for (const conceptId of sourceIds) {
  const linked = map.source_lenses.filter((lens) => lens.concept_ids.includes(conceptId));
  assert.ok(linked.length, `${conceptId} needs a source lens`);
  for (const lens of linked) {
    assert.equal(lens.implementation, "SOURCE_NOTES");
    const linkedPages = new Set(map.concepts.filter((concept) => lens.concept_ids.includes(concept.id)).flatMap((concept) => concept.pages));
    assert.ok(lens.pages.length && lens.pages.every((page) => linkedPages.has(page)), `${lens.id} needs linked concept anchors`);
    const fixtures = map.held_out_source_fixtures.filter((fixture) => fixture.lens_id === lens.id);
    assert.ok(fixtures.length, `${lens.id} needs a held-out provenance fixture`);
    for (const fixture of fixtures) {
      assert.equal(fixture.status, "SOURCE_REVIEW_ONLY");
      assert.equal(fixture.data_status, "UNAVAILABLE");
      assert.equal(fixture.outcome_status, "WITHHELD");
      assert.ok(lenses.has(fixture.lens_id));
    }
  }
}

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const localizationBundle = await build({ stdin: { contents: 'export * from "./src/lib/sourceNotesLocalization.ts";', resolveDir: app }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const localization = await import(`data:text/javascript;base64,${Buffer.from(localizationBundle.outputFiles[0].text).toString("base64")}`);
for (const concept of map.concepts.filter((row) => row.implementation === "SOURCE_NOTES")) {
  const english = localization.getSourceNotesCopy(concept, "en");
  const vietnamese = localization.getSourceNotesCopy(concept, "vi");
  assert.equal(english.definition, concept.definition);
  assert.ok(vietnamese.name && vietnamese.definition && vietnamese.definition !== english.definition, `${concept.id} needs distinct Vietnamese source wording`);
  assert.equal(vietnamese.cues.length, concept.cues.length);
  assert.equal(vietnamese.abstain.length, concept.abstain.length);
}
assert.equal(localization.sourceNotesStatus("en"), "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD");
assert.equal(localization.sourceNotesStatus("vi"), "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD");
assert.equal(localization.sourceNotesUi("en").authority, authority);
assert.equal(localization.sourceNotesUi("vi").authority, authority);

const detectorBundle = await build({ stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts";', resolveDir: app }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const detector = await import(`data:text/javascript;base64,${Buffer.from(detectorBundle.outputFiles[0].text).toString("base64")}`);
assert.deepEqual([...detector.ALL_PDF_SIGNAL_CONCEPT_IDS], conceptIds);
const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 100 }, (_, index) => ({ t: new Date(epoch + index * 300000).toISOString(), o: 2000 + index * 0.02, h: 2001 + index * 0.02, l: 1999 + index * 0.02, c: 2000.5 + index * 0.02, closed: true }));
const result = detector.detectAllPdfSignals({ bars, selectedTime: bars.at(-1).t, direction: "UP", protection: 1998, nowMs: epoch + 101 * 300000 });
assert.equal(result.observations.length, 23);
assert.equal(Object.keys(result.sourceNoteDescriptors).length, 10);
for (const descriptor of Object.values(result.sourceNoteDescriptors)) {
  assert.equal(descriptor.sourceStatus, "SOURCE_REVIEW_ONLY");
  assert.equal(descriptor.outcomeStatus, "WITHHELD");
  assert.equal(descriptor.causalPrefix.futureRows, "WITHHELD");
  assert.equal(descriptor.live_apply_allowed, false);
}

console.log("WAVE 13 PDF SOURCE CONCEPT AUDIT PASS: 23 concepts, anchored provenance, bilingual source notes and explicit research-only authority are reconciled.");
