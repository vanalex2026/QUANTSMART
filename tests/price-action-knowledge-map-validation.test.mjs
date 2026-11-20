import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const bundled = await build({ stdin: { contents: "export * from './src/lib/priceActionKnowledge.ts'", resolveDir: app }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const map = JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs", "price_action_knowledge_map.json"), "utf8"));

test("source knowledge map validates its anchored directed graph", () => {
  const result = api.validatePriceActionKnowledgeMap(map);
  assert.deepEqual(result, { ok: true, errors: [] });
  assert.ok(map.source_lenses.length>=30);
  assert.ok(map.held_out_source_fixtures.length>=30);
  for (const fixture of map.held_out_source_fixtures) {
    assert.equal(fixture.status, "SOURCE_REVIEW_ONLY");
    assert.equal(fixture.data_status, "UNAVAILABLE");
    assert.equal(fixture.outcome_status, "WITHHELD");
    const lens = map.source_lenses.find(row => row.id === fixture.lens_id);
    assert.ok(lens, `${fixture.id} must point to an indexed source lens`);
    assert.ok(fixture.pages.every(page => lens.pages.includes(page)), `${fixture.id} must stay inside its lens anchors`);
  }
  assert.equal(map.source_lenses[0].id, "trend_range_selection");
  assert.deepEqual(map.source_lenses[0].pages, [130, 131]);
  assert.deepEqual(map.source_lenses[0].concept_ids, ["dominant_pressure", "pullback_reversal", "obstacle_room"]);
  const failureLens = map.source_lenses.find(lens => lens.id === "trade_for_failure_selection");
  assert.deepEqual(failureLens.pages, [180, 184, 185, 186]);
  assert.deepEqual(failureLens.concept_ids, ["trade_selection_failure"]);
  assert.equal(failureLens.implementation, "SOURCE_NOTES");
  assert.ok(failureLens.cues.some(cue => /reclaim.*broken barrier/.test(cue)));
  assert.ok(failureLens.abstain.some(cue => /late barrier reclaim/.test(cue)));
  const marchLens = map.source_lenses.find(lens => lens.id === "march_session_context");
  assert.ok(marchLens, "March candidate pages must have a source-only curation lens");
  assert.deepEqual(marchLens.pages, [250, 251, 252, 253]);
  assert.deepEqual(marchLens.concept_ids, ["ceiling_test", "trade_selection_failure", "round_number", "false_high_low", "consecutive_review"]);
  assert.equal(marchLens.implementation, "SOURCE_NOTES");
  assert.ok(marchLens.cues.some(cue => /false high.*signal bar/i.test(cue)));
  assert.ok(marchLens.abstain.some(cue => /detector.*trade count.*win rate/i.test(cue)));
  const sizingLens = map.source_lenses.find(lens => lens.id === "compounding_sizing_cautions");
  assert.ok(sizingLens, "Chapter 10 sizing review must remain source-indexed");
  assert.deepEqual(sizingLens.pages, [387, 388, 389, 390]);
  assert.deepEqual(sizingLens.concept_ids, ["position_sizing"]);
  assert.ok(sizingLens.abstain.some(cue => /EUR\/USD.*XAUUSD/i.test(cue)));
  assert.ok(sizingLens.abstain.some(cue => /contract specifications/i.test(cue)));
  const lowVolLens = map.source_lenses.find(lens => lens.id === "low_volatility_box_context");
  assert.ok(lowVolLens, "Chapter 11 low-volatility review must remain source-indexed");
  assert.deepEqual(lowVolLens.pages, [395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420]);
  assert.deepEqual(lowVolLens.concept_ids, ["low_volatility"]);
  assert.equal(lowVolLens.implementation, "SOURCE_NOTES");
  assert.ok(lowVolLens.cues.some(cue => /lengthy box progression/i.test(cue)));
  assert.ok(lowVolLens.abstain.some(cue => /synthesize ticks/i.test(cue)));
  assert.ok(lowVolLens.abstain.some(cue => /XAUUSD/i.test(cue)));
  assert.ok(lowVolLens.cues.some(cue => /p\. 406:.*visible bullish dominance/i.test(cue)));
  assert.ok(lowVolLens.abstain.some(cue => /p\. 414.*continues on p\. 415/i.test(cue)));
  const falseBreakLens = map.source_lenses.find(lens => lens.id === 'false_break_participation_context');
  assert.ok(falseBreakLens, 'Chapter 2 false-break review must remain source-indexed');
  assert.deepEqual(falseBreakLens.pages, [12]);
  assert.deepEqual(falseBreakLens.concept_ids, ['false_break']);
  assert.ok(falseBreakLens.cues.some(cue => /poorly built break/i.test(cue)));
  assert.ok(falseBreakLens.abstain.some(cue => /every weak-looking break/i.test(cue)));
  const roundLens = map.source_lenses.find(lens => lens.id === 'round_number_magnet_selection');
  assert.ok(roundLens, 'Chapter 2 round-number review must remain source-indexed');
  assert.deepEqual(roundLens.pages, [31, 32]);
  assert.deepEqual(roundLens.concept_ids, ['round_number']);
  assert.ok(roundLens.cues.some(cue => /favorable.*adverse magnet/i.test(cue)));
  assert.ok(roundLens.abstain.some(cue => /automatic rejection|entry trigger/i.test(cue)));
  const teaseLens = map.source_lenses.find(lens => lens.id === 'tease_ceiling_test_selection');
  assert.ok(teaseLens, 'Chapter 2 tease/ceiling review must remain source-indexed');
  assert.deepEqual(teaseLens.pages, [26, 27, 28, 29]);
  assert.deepEqual(teaseLens.concept_ids, ['tease_break', 'ceiling_test']);
  assert.ok(teaseLens.cues.some(cue => /slightly premature/i.test(cue)));
  assert.ok(teaseLens.abstain.some(cue => /OHLC|outcome/i.test(cue)));
  const chapterEleven = map.book_index.find(chapter => chapter.number === 11);
  const chapterTwo = map.book_index.find(chapter => chapter.number === 2);
  assert.deepEqual(chapterTwo.reviewed_printed_pages, [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
  assert.deepEqual(chapterEleven.reviewed_printed_pages, [391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420]);
  const lowVolCosts = map.relationships.find(edge => edge.from === "low_volatility" && edge.to === "bracket_costs");
  assert.ok(lowVolCosts, "the graph must retain the source-specific cost and objective link");
  assert.equal(lowVolCosts.kind, "qualifies");
  assert.deepEqual(lowVolCosts.pages, [396, 397, 398, 399, 400, 401, 402]);
  assert.match(lowVolCosts.label, /specific instrument and pace/);
  const chapterNine = map.book_index.find(chapter => chapter.number === 9);
  assert.deepEqual(chapterNine.reviewed_printed_pages.filter(page => page <= 312), Array.from({ length: 68 }, (_, i) => 245 + i));
  for (const id of ["ceiling_test", "trade_selection_failure", "round_number", "false_high_low", "consecutive_review"]) {
    const concept = map.concepts.find(row => row.id === id);
    assert.ok(concept.pages.some(page => marchLens.pages.includes(page)), `${id} must retain a March source anchor`);
  }
  const conceptIds = new Set(map.concepts.map((concept) => concept.id));
  assert.ok(map.setup_families.every((family) => family.concept_ids?.length && family.concept_ids.every((id) => conceptIds.has(id))), "setup families must link to indexed source concepts");
  const legacy = structuredClone(map);
  delete legacy.held_out_source_fixtures;
  assert.equal(api.validatePriceActionKnowledgeMap(legacy).ok, true, "older source maps may omit the additive review registry");
});

test("buildup preserves the source-grounded protection constraint", () => {
  const buildup = map.concepts.find((concept) => concept.id === "buildup");
  assert.ok(buildup, "buildup concept must remain indexed");
  assert.ok(buildup.pages.includes(14) && buildup.pages.includes(15), "buildup protection guidance must retain printed pp. 14-15 anchors");
  assert.ok(buildup.cues.some((cue) => /last distinctive buildup high\/low/i.test(cue)), "buildup cues must record the source protection reference");
  assert.ok(buildup.abstain.some((cue) => /unusually wide stop/i.test(cue)), "buildup abstain cues must reject technically unjustified wide protection");
});

test("Chapter 3 practice review retains squeeze, retest and obstacle distinctions with source-only authority", () => {
  const chapter = map.book_index.find(row => row.number === 3);
  const lens = map.source_lenses.find(row => row.id === 'chapter3_practice_buildup_break_context');
  const fixture = map.held_out_source_fixtures.find(row => row.id === 'chapter-3-practice-buildup-review');
  assert.deepEqual(chapter.reviewed_printed_pages, Array.from({ length: 34 }, (_, i) => i + 33));
  assert.deepEqual(lens.pages, Array.from({ length: 30 }, (_, i) => i + 36));
  assert.deepEqual(fixture.pages, lens.pages);
  assert.equal(lens.implementation, 'SOURCE_NOTES');
  for (const cue of [/p\. 42:.*without buildup/i, /p\. 43:.*squeeze.*W\/M/i, /pp\. 44-45:.*tease.*modest retreat/i, /pp\. 46-47:.*technical-test.*false low/i, /pp\. 48-49:.*adverse magnet.*false high/i, /pp\. 50-51:.*EMA is an average, not support or resistance/i]) {
    assert.ok(lens.cues.some(value => cue.test(value)), cue.source);
  }
  assert.ok(lens.abstain.some(value => /session clocks.*standalone XAUUSD/i.test(value)));
  assert.ok(lens.abstain.some(value => /do not fade every/i.test(value)));
  assert.ok(lens.abstain.some(value => /guarantees.*target/i.test(value)));
  assert.equal(fixture.data_status, 'UNAVAILABLE');
  assert.equal(fixture.outcome_status, 'WITHHELD');
  const pagesFor = id => map.concepts.find(row => row.id === id).pages;
  for (const page of [43, 45, 46, 48]) assert.ok(pagesFor('buildup').includes(page));
  for (const page of [47, 50, 51]) assert.ok(pagesFor('pullback_reversal').includes(page));
  assert.ok(pagesFor('false_high_low').includes(48));
  assert.ok(pagesFor('ceiling_test').includes(49));
  assert.ok(pagesFor('obstacle_room').includes(51));
});

test("knowledge validation rejects drift that could make anchors or relationships misleading", () => {
  const unknownEndpoint = structuredClone(map);
  unknownEndpoint.relationships[0].to = "missing_concept";
  assert.equal(api.validatePriceActionKnowledgeMap(unknownEndpoint).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(unknownEndpoint).errors.join(" "), /unknown to concept/);

  const outOfRangePage = structuredClone(map);
  outOfRangePage.concepts[0].pages = [outOfRangePage.source.pdf_pages + 1];
  assert.equal(api.validatePriceActionKnowledgeMap(outOfRangePage).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(outOfRangePage).errors.join(" "), /invalid page anchors/);

  const unrelatedRelationshipPage = structuredClone(map);
  unrelatedRelationshipPage.relationships[0].pages = [map.source.pdf_pages];
  assert.equal(api.validatePriceActionKnowledgeMap(unrelatedRelationshipPage).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(unrelatedRelationshipPage).errors.join(" "), /no endpoint source-page overlap/);

  const mixedRelationshipPages = structuredClone(map);
  // Keep a valid endpoint page so an overlap-only validator would accept this,
  // then add a page belonging to neither endpoint concept.
  mixedRelationshipPages.relationships[0].pages = [6, map.source.pdf_pages];
  assert.equal(api.validatePriceActionKnowledgeMap(mixedRelationshipPages).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(mixedRelationshipPages).errors.join(" "), /outside endpoint source anchors/);

  const duplicateConceptPages = structuredClone(map);
  duplicateConceptPages.concepts[0].pages = [6, 6, 7];
  assert.equal(api.validatePriceActionKnowledgeMap(duplicateConceptPages).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(duplicateConceptPages).errors.join(" "), /invalid page anchors/);

  const descendingRelationshipPages = structuredClone(map);
  descendingRelationshipPages.relationships[0].pages = [9, 8, 7, 6];
  assert.equal(api.validatePriceActionKnowledgeMap(descendingRelationshipPages).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(descendingRelationshipPages).errors.join(" "), /invalid page anchors/);

  const impossibleOcrCoverage = structuredClone(map);
  impossibleOcrCoverage.source.ocr_text_pages = map.source.pdf_pages + 1;
  assert.equal(api.validatePriceActionKnowledgeMap(impossibleOcrCoverage).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(impossibleOcrCoverage).errors.join(" "), /ocr_text_pages/);

  const changedAuthority = structuredClone(map);
  changedAuthority.authority = "LIVE_TRADING";
  assert.equal(api.validatePriceActionKnowledgeMap(changedAuthority).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(changedAuthority).errors.join(" "), /authority boundary/);

  const missingTitle = structuredClone(map);
  delete missingTitle.title;
  assert.equal(api.validatePriceActionKnowledgeMap(missingTitle).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(missingTitle).errors.join(" "), /map title is required/);

  const unknownFamilyConcept = structuredClone(map);
  unknownFamilyConcept.setup_families[0].concept_ids = ["invented_concept"];
  assert.equal(api.validatePriceActionKnowledgeMap(unknownFamilyConcept).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(unknownFamilyConcept).errors.join(" "), /needs indexed concept ids/);

  const unknownLensConcept = structuredClone(map);
  unknownLensConcept.source_lenses[0].concept_ids = ["invented_concept"];
  assert.equal(api.validatePriceActionKnowledgeMap(unknownLensConcept).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(unknownLensConcept).errors.join(" "), /source lens .*needs indexed concept ids/);

  const detectorLens = structuredClone(map);
  detectorLens.source_lenses[0].implementation = "GEOMETRY_PROXY";
  assert.equal(api.validatePriceActionKnowledgeMap(detectorLens).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(detectorLens).errors.join(" "), /must remain SOURCE_NOTES/);

  const invalidLensPages = structuredClone(map);
  invalidLensPages.source_lenses[0].pages = [131, 130];
  assert.equal(api.validatePriceActionKnowledgeMap(invalidLensPages).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(invalidLensPages).errors.join(" "), /source lens .*invalid page anchors/);

  const unlinkedLensPage = structuredClone(map);
  unlinkedLensPage.source_lenses[0].pages = [130, 142];
  assert.equal(api.validatePriceActionKnowledgeMap(unlinkedLensPage).ok, false);
  assert.match(api.validatePriceActionKnowledgeMap(unlinkedLensPage).errors.join(" "), /source lens .*outside linked concept anchors/);
});

console.log("PRICE ACTION KNOWLEDGE VALIDATION PASS: anchored concepts, page bounds, graph endpoints and SHADOW_ONLY authority.");

test("book navigation rejects misleading coverage, missing scopes and malformed source ranges", () => {
  const mutations = [
    copy => { delete copy.concepts[0].implementation; },
    copy => { copy.book_index.pop(); },
    copy => { copy.book_index[1].pdf_range[0]++; },
    copy => { copy.book_index[2].reviewed_printed_pages = [999]; },
    copy => { copy.book_index[3] = null; },
    copy => { copy.book_index[4].concept_ids = ["invented"]; },
    copy => { copy.coverage.status = "COMPLETE"; },
    copy => { copy.case_study_months[0] = null; },
    copy => { copy.case_study_months[1].printed_range = null; },
    copy => { copy.case_study_months[2].month = "April"; },
    copy => { copy.case_study_months[3].pdf_range = [1, 2]; },
    copy => { copy.glossary = []; },
    copy => { copy.glossary[0] = null; },
    copy => { copy.held_out_source_fixtures[0].data_status = "AVAILABLE"; },
    copy => { copy.held_out_source_fixtures[0].lens_id = "invented_lens"; },
    copy => { copy.held_out_source_fixtures[0].pages = [131, 130]; },
    copy => { copy.held_out_source_fixtures[0].pages = [129]; },
    copy => { copy.held_out_source_fixtures[0].bars = []; },
    copy => { copy.held_out_source_fixtures[0].outcome_status = "WIN"; },
    copy => { copy.held_out_source_fixtures[0].status = "INDEPENDENT_OHLC_LABEL"; },
    copy => { copy.held_out_source_fixtures[1].id = copy.held_out_source_fixtures[0].id; },
    copy => { copy.held_out_source_fixtures[0] = null; },
    copy => { copy.held_out_source_fixtures = []; },
    copy => { copy.book_index[4].reviewed_printed_pages = copy.book_index[4].reviewed_printed_pages.filter(page => page !== 130); },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(map);
    mutate(copy);
    assert.equal(api.validatePriceActionKnowledgeMap(copy).ok, false);
  }
});


test("Chapter 3 final notes retain barrier, exit-entry and inside-bar distinctions", () => {
  const lens = map.source_lenses.find(row => row.id === 'chapter3_practice_buildup_break_context');
  for (const cue of [/p\. 52:.*doji alone does not establish reversal/i, /p\. 56:.*exit.*limited room/i, /p\. 58:.*exit without qualifying a countertrend entry/i, /p\. 60:.*EMA25 is flat/i, /p\. 61:.*before a false perforation.*only when later action aligns/i, /p\. 62:.*decline.*two-bar buildup/i, /p\. 64:.*technical-test triple.*weaker double/i, /p\. 65:.*slight protrusion.*detector remains stricter/i]) {
    assert.ok(lens.cues.some(value => cue.test(value)), cue.source);
  }
  assert.ok(lens.abstain.some(value => /changes no detector thresholds/i.test(value)));
  assert.ok(lens.abstain.some(value => /existing-position exit.*countertrend entry/i.test(value)));
  assert.ok(lens.concept_ids.includes('dominant_pressure'));
  assert.ok(lens.concept_ids.includes('ceiling_test'));
  assert.ok(!lens.pages.includes(66), 'blank divider adds no source-lens content');
  assert.ok(map.concepts.every(row => !row.pages.includes(66)), 'blank divider adds no invented concept anchor');
  const pagesFor = id => map.concepts.find(row => row.id === id).pages;
  for (const page of [56, 61, 64]) assert.ok(pagesFor('ceiling_test').includes(page));
  for (const page of [52, 59, 65]) assert.ok(pagesFor('dominant_pressure').includes(page));
});


test("Chapter 5 opening pattern-break review keeps signal and entry bars separate", () => {
  const chapter = map.book_index.find(row => row.number === 5);
  const lens = map.source_lenses.find(row => row.id === 'chapter5_pattern_break_entry_context');
  const fixture = map.held_out_source_fixtures.find(row => row.id === 'chapter-5-pattern-break-entry-review');
  assert.ok(chapter.reviewed_printed_pages.includes(78) && chapter.reviewed_printed_pages.includes(85));
  assert.deepEqual(lens.pages, Array.from({ length: 19 }, (_, i) => i + 78));
  assert.deepEqual(fixture.pages, lens.pages);
  assert.equal(lens.implementation, 'SOURCE_NOTES');
  for (const cue of [/p\. 78:.*flat 25EMA/i, /p\. 80:.*entry bar is distinct from the signal bar/i, /p\. 81:.*neutral dojis/i, /p\. 82:.*topping tails.*not a reversal/i, /p\. 84:.*potential obstacles/i, /p\. 85:.*pattern-line\/round-level squeeze/i, /p\. 86:.*relative size of successive arches/i, /p\. 88:.*squeeze.*thin/i, /p\. 90:.*adverse round magnet/i, /p\. 92:.*non-buildup turnaround/i, /p\. 94:.*false break.*good trade/i, /p\. 96:.*double-bar break/i]) assert.ok(lens.cues.some(value => cue.test(value)), cue.source);
  assert.ok(lens.abstain.some(value => /front-run an entry bar/i.test(value)));
  assert.ok(lens.abstain.some(value => /UNAVAILABLE\/WITHHELD/i.test(value)));
  assert.ok(lens.abstain.some(value => /number of arches.*universal XAUUSD thresholds/i.test(value)));
  assert.ok(lens.cues.some(value => /p\. 88:.*no fixed minimum bar count/i.test(value)));
  assert.ok(lens.cues.some(value => /p\. 96:.*extra buildup is not always required/i.test(value)));
  assert.ok(lens.abstain.some(value => /borderline skip\/trade/i.test(value)));
  assert.equal(fixture.data_status, 'UNAVAILABLE');
  assert.equal(fixture.outcome_status, 'WITHHELD');
});

test('Chapter 5 pullback review distinguishes correction geometry, timing and visual slope', () => {
  const lens = map.source_lenses.find(row => row.id === 'chapter5_pattern_break_pullback_context');
  const fixture = map.held_out_source_fixtures.find(row => row.id === 'chapter-5-pattern-break-pullback-review');
  assert.deepEqual(lens.pages, Array.from({ length: 11 }, (_, i) => 97 + i));
  assert.deepEqual(fixture.pages, lens.pages);
  assert.equal(lens.implementation, 'SOURCE_NOTES');
  for (const cue of [/p\. 97:.*second-instance/i, /p\. 99:.*50\/60-percent/i, /p\. 100:.*blocky.*gentle/i, /p\. 101:.*powerful V-shaped.*more buildup/i, /p\. 105:.*last-resort.*not.*cheaper fill/i, /p\. 106:.*aspect ratio.*no hard threshold/i, /p\. 107:.*invalid without buildup/i]) {
    assert.ok(lens.cues.some(value => cue.test(value)), cue.source);
  }
  assert.ok(lens.abstain.some(value => /screen-based.*angle.*aspect ratio/i.test(value)));
  assert.ok(lens.abstain.some(value => /UNAVAILABLE\/WITHHELD/.test(value)));
  for (const page of [98, 103, 105, 106, 107]) {
    assert.ok(map.concepts.find(row => row.id === 'pattern_break_pullback').pages.includes(page));
  }
  assert.equal(fixture.data_status, 'UNAVAILABLE');
  assert.equal(fixture.outcome_status, 'WITHHELD');
});

test('Chapter 5 combi review retains context and distinguishes source variants from local geometry', () => {
  const lens = map.source_lenses.find(row => row.id === 'chapter5_pattern_break_combi_context');
  const fixture = map.held_out_source_fixtures.find(row => row.id === 'chapter-5-pattern-break-combi-review');
  assert.deepEqual(lens.pages, Array.from({ length: 14 }, (_, i) => 111 + i));
  assert.deepEqual(fixture.pages, lens.pages);
  assert.equal(lens.implementation, 'SOURCE_NOTES');
  for (const cue of [/p\. 112:.*thin break.*skip/i, /p\. 114:.*dominant-pressure.*buildup/i, /p\. 119:.*untouched EMA25.*insufficient/i, /p\. 123:.*strict inside-bar.*exceeded/i, /p\. 124:.*slippage.*changed environment/i]) {
    assert.ok(lens.cues.some(value => cue.test(value)), cue.source);
  }
  assert.ok(lens.abstain.some(value => /news event without dated external evidence/i.test(value)));
  assert.equal(fixture.data_status, 'UNAVAILABLE');
  assert.equal(fixture.outcome_status, 'WITHHELD');
});
