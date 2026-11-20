import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(`${app}/package.json`);
const ts = require("typescript");
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/sourceNotesLocalization.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function("require", "module", "exports", output)(require, module, module.exports);

const map = JSON.parse(readFileSync(new URL("../docs/price_action_knowledge_map.json", import.meta.url), "utf8"));
const geometry = map.concepts.filter((concept) => concept.implementation === "GEOMETRY_PROXY");
const authority = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false";
assert.equal(geometry.length, 13);
for (const concept of geometry) {
  const english = module.exports.getSourceNotesCopy(concept, "en");
  const vietnamese = module.exports.getSourceNotesCopy(concept, "vi");
  assert.deepEqual(english, { name: concept.name, definition: concept.definition, cues: concept.cues, abstain: concept.abstain }, `${concept.id} English source attestation changed`);
  assert.ok(vietnamese.name && vietnamese.definition, `${concept.id} needs Vietnamese presentation copy`);
  assert.notEqual(vietnamese.name, english.name, `${concept.id} needs a translated name`);
  assert.notEqual(vietnamese.definition, english.definition, `${concept.id} needs a translated definition`);
  assert.equal(vietnamese.cues.length, concept.cues.length, `${concept.id} cue count must match the source map`);
  assert.equal(vietnamese.abstain.length, concept.abstain.length, `${concept.id} abstain count must match the source map`);
}
assert.equal(module.exports.sourceNotesStatus("vi"), "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD");
assert.equal(module.exports.sourceNotesUi("vi").authority, authority);

const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
assert.match(microscope, /getSourceNotesCopy\(selectedPriceActionKnowledge, locale\)/, "selected concept surface must use locale-aware concept copy");
assert.match(microscope, /localizedConceptName\(marker\.conceptId, marker\.label\)/, "current marker summary must localize geometry-proxy names");
assert.match(microscope, /getSourceNotesCopy\(sourceLens, locale\)\.name/, "current marker controls must localize geometry-proxy names");
assert.match(microscope, /localizedConceptName\(signal\.conceptId[\s\S]*signal\.label\.startsWith\("PATTERN · "\)/, "chart marker labels must preserve their marker prefix while localizing concept names");
assert.match(microscope, /SHADOW_ONLY · NO_DECISION/, "focused surfaces must retain the read-only authority boundary");

console.log("GEOMETRY PROXY LOCALIZATION PASS: all 13 detector concepts have bilingual presentation copy while English attestation, detector identities and research-only authority remain stable.");
