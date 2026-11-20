import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const map = read('../docs/price_action_knowledge_map.json');
const index = read('../docs/price_action_page_index.json');
const chapter = map.book_index.find(row => row.number === 5);
const lens = map.source_lenses.find(row => row.id === 'chapter5_pullback_reversal_selection_context');
const fixture = map.held_out_source_fixtures.find(row => row.id === 'chapter-5-final-pullback-reversal-review');

assert.deepEqual(chapter.reviewed_printed_pages, Array.from({ length: 70 }, (_, i) => 73 + i));
assert.deepEqual(lens.pages, Array.from({ length: 10 }, (_, i) => 132 + i));
assert.deepEqual(fixture.pages, lens.pages);
assert.equal(lens.implementation, 'SOURCE_NOTES');
assert.equal(fixture.status, 'SOURCE_REVIEW_ONLY');
assert.equal(fixture.data_status, 'UNAVAILABLE');
assert.equal(fixture.outcome_status, 'WITHHELD');
for (const expected of [
  /p\. 135:.*relative to pole strength, not an absolute count/i,
  /p\. 136:.*first-flag exception.*does not authorize later/i,
  /pp\. 136-137:.*adverse magnets.*obstacles.*distinct concerns/i,
  /p\. 139:.*insufficient without trend or buildup/i,
  /p\. 140:.*same price.*pressure, buildup and conditions/i,
  /p\. 141:.*bracket stop.*technical recheck/i,
]) assert.ok(lens.cues.some(cue => expected.test(cue)), expected.source);
assert.ok(lens.abstain.some(cue => /full detector implementation.*source review is complete/i.test(cue)));
assert.ok(lens.abstain.some(cue => /UNAVAILABLE\/WITHHELD/.test(cue)));

const blank = index.pages.find(row => row.printed_page === 142);
assert.equal(blank.pdf_page, 152);
assert.equal(blank.chapter, 5);
assert.equal(blank.review_status, 'CURATED_NOTES');
assert.equal(blank.has_ocr, false);
assert.deepEqual(blank.concept_ids, []);
assert.ok(map.concepts.every(row => !row.pages.includes(142)));
assert.ok(map.source_lenses.every(row => !row.pages.includes(142)));
console.log('CHAPTER 5 FINAL SOURCE REVIEW PASS: complete page metadata, contextual selection notes, withheld outcomes and blank-divider identity.');
