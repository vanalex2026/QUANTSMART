import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {priceActionReviewCoverage} from '../scripts/price-action-coverage.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const map = read('../docs/price_action_knowledge_map.json');
const index = read('../docs/price_action_page_index.json');
const extraction = read('../artifacts/price_action_pages_audit.json');
const receipt = read('../artifacts/chapter9-mid-july-source-review-343-352.json');
const chapter = map.book_index.find(row => row.number === 9);
const lens = map.source_lenses.find(row => row.id === 'chapter9_mid_july_context_and_selectivity');
const fixture = map.held_out_source_fixtures.find(row => row.id === 'chapter-9-mid-july-review-343-352');
const reviewed = Array.from({ length: 10 }, (_, i) => 343 + i);

assert.deepEqual(chapter.reviewed_printed_pages.filter(page => page <= 352), Array.from({ length: 108 }, (_, i) => 245 + i));
assert.deepEqual(lens.pages, reviewed);
assert.deepEqual(fixture.pages, reviewed);
assert.equal(lens.implementation, 'SOURCE_NOTES');
assert.equal(fixture.status, 'SOURCE_REVIEW_ONLY');
assert.equal(fixture.data_status, 'UNAVAILABLE');
assert.equal(fixture.outcome_status, 'WITHHELD');
for (const expected of [
  /p\. 343:.*pattern-line-first.*false low.*evening-star.*resistance exit/i,
  /p\. 344:.*triple-bottom.*contrarian.*care/i,
  /p\. 345:.*50 level.*adverse buildup.*conditionally.*reversal exit/i,
  /p\. 346:.*weak squeezes.*unclear.*double-bar.*skipped/i,
  /p\. 347:.*second 25EMA.*news.*not traded/i,
  /p\. 348:.*poorly.*thin buildup.*exited before/i,
  /p\. 349:.*demoralization.*only if still long.*too risky/i,
  /p\. 350:.*W\/SHS combi.*skips.*ceiling-test.*patience/i,
  /p\. 351:.*50-level magnet.*first pullback.*adverse/i,
  /p\. 352:.*Ww.*conditionally re-enters.*thin-buildup.*backfire.*skipped/i,
]) assert.ok(lens.cues.some(cue => expected.test(cue)), expected.source);
for (const expected of [
  /EUR\/USD.*XAUUSD/i,
  /Figure 9\.94-9\.103 OHLC.*UNAVAILABLE\/WITHHELD/i,
  /p\. 345.*p\. 349.*accepted position.*no prior fill/i,
  /p\. 346-348.*p\. 351-352.*not measured probability/i,
  /combi-label provenance.*p\. 344.*p\. 350/i,
  /p\. 352.*not recovered intrabar ordering.*executable fills/i,
  /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/i,
]) assert.ok(lens.abstain.some(note => expected.test(note)), expected.source);

assert.equal(receipt.source_sha256, map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages, reviewed);
assert.deepEqual(receipt.newly_curated_printed_pages, reviewed);
assert.deepEqual(receipt.previously_curated_rechecked_printed_pages, []);
assert.deepEqual(receipt.coverage, {
  curated_pages: 389,
  remaining_pages: 30,
  chapter9_reviewed_pages: 108,
  source_lenses: 33,
  held_out_source_fixtures: 33,
});
assert.equal(receipt.status, 'SOURCE_REVIEW_ONLY');
assert.equal(receipt.data_status, 'UNAVAILABLE');
assert.equal(receipt.outcome_status, 'WITHHELD');
assert.equal(receipt.receipts.length, 10);
for (const printedPage of reviewed) {
  const row = index.pages.find(page => page.printed_page === printedPage);
  const attested = receipt.receipts.find(page => page.printed_page === printedPage);
  assert.equal(row.review_status, 'CURATED_NOTES');
  assert.equal(row.pdf_page, printedPage + 10);
  assert.equal(row.case_month, '2012-07');
  assert.equal(attested.pdf_page, printedPage + 10);
  assert.equal(attested.ocr_sha256, row.ocr_sha256);
  assert.equal(attested.has_ocr, row.has_ocr);
  assert.deepEqual(attested.concept_ids, row.concept_ids);
  assert.match(attested.render_sha256, /^[a-f0-9]{64}$/);
  assert.match(attested.visual_review, /Full page visually inspected/);
  assert.equal(createHash('sha256').update(extraction.pages[printedPage + 9].text, 'utf8').digest('hex'), attested.ocr_sha256);
  const renderPath = new URL('../' + attested.render_path, import.meta.url);
  if (existsSync(renderPath)) assert.equal(createHash('sha256').update(readFileSync(renderPath)).digest('hex'), attested.render_sha256);
  assert.ok(row.concept_ids.includes('consecutive_review'));
  assert.equal(row.concept_ids.includes('pattern_break_combi'), [344, 350].includes(printedPage));
}
for (const id of lens.concept_ids) {
  const concept = map.concepts.find(item => item.id === id);
  assert.ok(concept.pages.some(page => reviewed.includes(page)), `${id} needs a reviewed content anchor`);
}
const chapterCoverage = priceActionReviewCoverage(index, extraction, map, 9);
assert.equal(chapterCoverage.totals.pages, 138);
assert.ok(chapterCoverage.totals.reviewed_pages >= 108);
assert.equal(chapterCoverage.totals.remaining_pages, 138 - chapterCoverage.totals.reviewed_pages);
assert.deepEqual(chapterCoverage.chapters[0].remaining_without_ocr_printed_pages, chapter.reviewed_printed_pages.includes(382) ? [] : [382]);
assert.ok(!chapterCoverage.chapters[0].next_review || chapterCoverage.chapters[0].next_review.printed_page > 352);
const globalCoverage = priceActionReviewCoverage(index, extraction, map).totals;
assert.equal(globalCoverage.pages, 419);
assert.ok(globalCoverage.reviewed_pages >= 389);
assert.equal(globalCoverage.remaining_pages, 419 - globalCoverage.reviewed_pages);

console.log('CHAPTER 9 MID-JULY SOURCE REVIEW PASS: printed343-352 / PDF353-362; source-only context, skips and conditional exits preserved.');
