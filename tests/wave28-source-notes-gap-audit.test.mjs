import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const artifact = JSON.parse(readFileSync(new URL("../artifacts/wave28-source-notes-gap-audit.json", import.meta.url), "utf8"));
const map = JSON.parse(readFileSync(new URL("../docs/price_action_knowledge_map.json", import.meta.url), "utf8"));
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");

const bundle = async (source) => {
  const built = await build({ stdin: { contents: source, resolveDir: app }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
};
const [detector, localization] = await Promise.all([
  bundle('export * from "./src/lib/pdfSignalDetector.ts";'),
  bundle('export * from "./src/lib/sourceNotesLocalization.ts";'),
]);

const sourceConcepts = map.concepts.filter((concept) => concept.implementation === "SOURCE_NOTES");
const ids = sourceConcepts.map((concept) => concept.id);
const expectedIds = ["signal_entry_bar", "bracket_costs", "news_exit", "resistance_exit", "reversal_exit", "trade_selection_failure", "consecutive_review", "position_sizing", "low_volatility", "obstacle_room"];
assert.equal(artifact.result, "PASS");
assert.equal(artifact.surface.symbol, "XAUUSD");
assert.equal(artifact.surface.timeframe, "M5");
assert.equal(artifact.surface.max_causal_prefix_bars, 96);
assert.deepEqual(ids, expectedIds);
assert.deepEqual(artifact.concepts.map((concept) => concept.id), expectedIds);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 120 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const selectedTime = bars.at(-1).t;
const nowMs = epoch + 121 * 300_000;
const result = detector.detectAllPdfSignals({ bars, selectedTime, direction: "UP", nowMs });
assert.equal(result.observations.length, 23);
assert.equal(Object.keys(result.sourceNoteDescriptors).length, 10);
assert.equal(result.sourceNoteDescriptors.resistance_exit.state, "DESCRIPTIVE");
assert.equal(result.sourceNoteDescriptors.resistance_exit.reason, "LOCAL_ADVERSE_EXTREME_REFERENCE");

const baselineStates = Object.fromEntries(artifact.concepts.map((concept) => [concept.id, concept.baseline_state_without_optional_inputs]));
for (const concept of sourceConcepts) {
  const descriptor = result.sourceNoteDescriptors[concept.id];
  assert.ok(descriptor, `${concept.id} needs a descriptor`);
  assert.equal(descriptor.state, baselineStates[concept.id], `${concept.id} baseline state changed`);
  assert.equal(descriptor.sourceStatus, "SOURCE_REVIEW_ONLY");
  assert.equal(descriptor.outcomeStatus, "WITHHELD");
  assert.equal(descriptor.causalPrefix.maxBars, 96);
  assert.equal(descriptor.causalPrefix.futureRows, "WITHHELD");
  assert.ok(descriptor.sourcePages.length > 0, `${concept.id} needs source pages`);
  assert.equal(descriptor.sourcePages[0], concept.pages[0], `${concept.id} source anchor drifted`);
  assert.equal(descriptor.authority, artifact.surface.authority);
  assert.equal(descriptor.live_apply_allowed, false);

  const english = localization.getSourceNotesCopy(concept, "en");
  const vietnamese = localization.getSourceNotesCopy(concept, "vi");
  assert.equal(english.name, concept.name);
  assert.equal(english.definition, concept.definition);
  assert.ok(vietnamese.name && vietnamese.name !== english.name, `${concept.id} needs a distinct Vietnamese label`);
  assert.ok(vietnamese.definition && vietnamese.definition !== english.definition, `${concept.id} needs a Vietnamese definition`);
  assert.deepEqual(vietnamese.cues.map(() => true), concept.cues.map(() => true));
  assert.deepEqual(vietnamese.abstain.map(() => true), concept.abstain.map(() => true));
}

const disabled = detector.detectAllPdfSignals({ bars, selectedTime, direction: "UP", enabled: false, nowMs });
for (const descriptor of Object.values(disabled.sourceNoteDescriptors)) {
  assert.equal(descriptor.state, "WITHHELD");
  assert.equal(descriptor.causalPrefix.state, "WITHHELD");
  assert.equal(descriptor.outcomeStatus, "WITHHELD");
}
assert.equal(localization.sourceNotesStatus("en"), "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD");
assert.equal(localization.sourceNotesStatus("vi"), "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD");
assert.equal(artifact.label_and_boundary_checks.english_labels, 10);
assert.equal(artifact.label_and_boundary_checks.vietnamese_labels, 10);
assert.equal(artifact.label_and_boundary_checks.ordered_pdf_anchors, 10);
assert.equal(artifact.implementation_change, false);
assert.equal(artifact.detector_change, false);

console.log("WAVE 28 SOURCE-NOTES GAP AUDIT PASS: ten concepts retain bounded inputs, bilingual labels, anchors and explicit unavailable/withheld states.");
