import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(`${app}/package.json`);
const ts = require("typescript");
const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/sourceNotesLocalization.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function("require", "module", "exports", output)(require, module, module.exports);
const { getSourceNotesCopy, sourceNotesStatus, sourceNotesUi } = module.exports;
const map = JSON.parse(readFileSync(new URL("../docs/price_action_knowledge_map.json", import.meta.url), "utf8"));
const audit = JSON.parse(readFileSync(new URL("../artifacts/wave25-source-notes-localization-audit.json", import.meta.url), "utf8"));
const sourceConcepts = map.concepts.filter((concept) => concept.implementation === "SOURCE_NOTES");
const expectedVietnameseNames = new Map([
  ["signal_entry_bar", "N%E1%BA%BFn%20t%C3%ADn%20hi%E1%BB%87u%20v%C3%A0%20n%E1%BA%BFn%20v%C3%A0o%20l%E1%BB%87nh"],
  ["bracket_costs", "L%E1%BB%87nh%20bracket%2C%20m%E1%BB%A5c%20ti%C3%AAu%2C%20d%E1%BB%ABng%20l%E1%BB%97%20v%C3%A0%20chi%20ph%C3%AD"],
  ["news_exit", "Tho%C3%A1t%20l%E1%BB%87nh%20tr%C6%B0%E1%BB%9Bc%20tin"],
  ["resistance_exit", "Tho%C3%A1t%20t%E1%BA%A1i%20kh%C3%A1ng%20c%E1%BB%B1%20v%C3%A0%20kho%E1%BA%A3ng%20tr%E1%BB%91ng%20%C4%91%E1%BA%BFn%20m%E1%BB%A5c%20ti%C3%AAu"],
  ["reversal_exit", "Tho%C3%A1t%20khi%20%C4%91%E1%BA%A3o%20chi%E1%BB%81u%20v%C3%A0%20h%C3%ACnh%20th%C3%A0nh%20%C3%A1p%20l%E1%BB%B1c%20ng%C6%B0%E1%BB%A3c%20chi%E1%BB%81u"],
  ["trade_selection_failure", "L%E1%BB%B1a%20ch%E1%BB%8Dn%20giao%20d%E1%BB%8Bch%20v%C3%A0%20giao%20d%E1%BB%8Bch%20ph%C3%A1%20v%E1%BB%A1%20th%E1%BA%A5t%20b%E1%BA%A1i"],
  ["consecutive_review", "R%C3%A0%20so%C3%A1t%20bi%E1%BB%83u%20%C4%91%E1%BB%93%20li%C3%AAn%20ti%E1%BA%BFp"],
  ["position_sizing", "Kh%E1%BB%91i%20l%C6%B0%E1%BB%A3ng%20giao%20d%E1%BB%8Bch%20v%C3%A0%20l%C3%A3i%20k%C3%A9p"],
  ["low_volatility", "Th%C3%ADch%20%E1%BB%A9ng%20v%E1%BB%9Bi%20bi%E1%BA%BFn%20%C4%91%E1%BB%99ng%20th%E1%BA%A5p"],
  ["obstacle_room", "V%E1%BA%ADt%20c%E1%BA%A3n%20v%C3%A0%20kho%E1%BA%A3ng%20tr%E1%BB%91ng%20ph%C3%ADa%20tr%C6%B0%E1%BB%9Bc"],
]);
const expectedFirstPdfAnchor = new Map([
  ["signal_entry_bar", 73],
  ["bracket_costs", 67],
  ["news_exit", 144],
  ["resistance_exit", 148],
  ["reversal_exit", 156],
  ["trade_selection_failure", 177],
  ["consecutive_review", 133],
  ["position_sizing", 249],
  ["low_volatility", 336],
  ["obstacle_room", 13],
]);
const expectedVietnameseReadingHash = new Map([
  ["signal_entry_bar", "698ef978eb56f6bec6162eef090aeae7c7deb4bb31026b3c60a9e4c1746cf1f2"],
  ["bracket_costs", "dd8a73361c108b04cd2faed11a3eb8430827457d69fc540cddc8a29b93703a9a"],
  ["news_exit", "6eb1dee7067c872cb4cad0d4bfc5a45714d066bf12fed2399377b00479bcf423"],
  ["resistance_exit", "8d439037b44edbd1be3371b24c4f67e428cb62fceda652620ab912ea93050695"],
  ["reversal_exit", "f665f1d78adb0177f9f5df54594142bc3688b6ef39fd6e902611c8932d6c225a"],
  ["trade_selection_failure", "04cd0ed11c2edada701b9c0e3efeb66d22dab9f8b41693c9d8864d39d3f0298c"],
  ["consecutive_review", "73f931ba07fa3f06a11cea035947d7d6641a97781ae1cfb017d8894a39be708e"],
  ["position_sizing", "b4cb52716ed833b41f8de7bbbd1783bd0ae6c4e30a0a2939accaddfba0b7341b"],
  ["low_volatility", "8a9ce29a82b8ad74678f4e7cb7eda49b8e9be51f8b2a1a939f0d0d9f71144dbf"],
  ["obstacle_room", "d6326e64a4ec556ff36bc9fdf54ee66f5dbc6bd1e7bf225c86d9ff593c3380e1"],
]);

assert.equal(sourceConcepts.length, 10);
assert.equal(audit.result, "PASS");
assert.equal(audit.source_notes, sourceConcepts.length);
assert.equal(audit.english_source_wording_preserved, true);
assert.equal(audit.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.deepEqual(audit.translated_fields, { definitions: 10, cues: 31, abstain: 28 });
assert.deepEqual(new Set(sourceConcepts.map((concept) => concept.id)), new Set(expectedVietnameseNames.keys()));
for (const concept of sourceConcepts) {
  const english = getSourceNotesCopy(concept, "en");
  const vietnamese = getSourceNotesCopy(concept, "vi");
  assert.deepEqual(english, { name: concept.name, definition: concept.definition, cues: concept.cues, abstain: concept.abstain });
  assert.equal(vietnamese.name, decodeURIComponent(expectedVietnameseNames.get(concept.id)), `${concept.id} needs the reviewed Vietnamese label`);
  assert.notEqual(vietnamese.definition, english.definition, `${concept.id} must have a translated Vietnamese definition`);
  assert.notDeepEqual(vietnamese.cues, english.cues, `${concept.id} must have translated Vietnamese cues`);
  assert.notDeepEqual(vietnamese.abstain, english.abstain, `${concept.id} must have translated Vietnamese abstain copy`);
  assert.ok(vietnamese.cues.every((cue, index) => cue !== english.cues[index]), `${concept.id} must translate every review cue`);
  assert.ok(vietnamese.abstain.every((cue, index) => cue !== english.abstain[index]), `${concept.id} must translate every abstain cue`);
  assert.equal(createHash("sha256").update(JSON.stringify(vietnamese)).digest("hex"), expectedVietnameseReadingHash.get(concept.id), `${concept.id} Vietnamese reading changed without review`);
  assert.equal(concept.pages[0], expectedFirstPdfAnchor.get(concept.id), `${concept.id} must retain its source anchor`);
  assert.ok(vietnamese.name && vietnamese.definition && vietnamese.cues.length === concept.cues.length && vietnamese.abstain.length === concept.abstain.length, `${concept.id} needs a complete Vietnamese source reading`);
  assert.doesNotMatch(JSON.stringify(vietnamese), /[�]|Ã|Â|ï¿½|[\u0000-\u0008]/, `${concept.id} contains corrupted Vietnamese copy`);
}
assert.equal(sourceNotesStatus("en"), "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD");
assert.equal(sourceNotesStatus("vi"), "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD");
assert.match(sourceNotesUi("vi").sourceOnly, /Chỉ rà soát nguồn/);
assert.match(sourceNotesUi("vi").authority, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
console.log("SOURCE NOTES LOCALIZATION PASS: all source-only concepts retain complete English and Vietnamese review copy with explicit status authority.");
