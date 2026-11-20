import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {priceActionReviewCoverage} from '../scripts/price-action-coverage.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const map = read('../docs/price_action_knowledge_map.json');
const index = read('../docs/price_action_page_index.json');
const extraction = read('../artifacts/price_action_pages_audit.json');
const receipt = read('../artifacts/chapter9-july-source-review-333-342.json');
const chapter = map.book_index.find(row => row.number === 9);
const lens = map.source_lenses.find(row => row.id === 'chapter9_july_context_and_exit_ambiguity');
const fixture = map.held_out_source_fixtures.find(row => row.id === 'chapter-9-july-review-333-342');
const reviewed = Array.from({ length: 10 }, (_, i) => 333 + i);

assert.deepEqual(chapter.reviewed_printed_pages.filter(page => page <= 342), Array.from({ length: 98 }, (_, i) => 245 + i));
assert.deepEqual(lens.pages, reviewed);
assert.deepEqual(fixture.pages, reviewed);
assert.equal(lens.implementation, 'SOURCE_NOTES');
assert.equal(fixture.status, 'SOURCE_REVIEW_ONLY');
assert.equal(fixture.data_status, 'UNAVAILABLE');
assert.equal(fixture.outcome_status, 'WITHHELD');
for (const expected of [
  /p\. 333:.*contrarian.*00-level magnet.*skipped/i,
  /p\. 334:.*stale Asian.*false high.*evening-star/i,
  /p\. 335:.*re-break.*no short.*25EMA.*untradable/i,
  /p\. 336:.*mega bull rally.*stay out/i,
  /p\. 337:.*safe base.*news.*skip/i,
  /p\. 338:.*tall signal.*adverse.*reversal exit/i,
  /p\. 339:.*backfire.*follow-up.*resistance exit/i,
  /p\. 340:.*thin Asian.*re-entry.*ECB.*skipped/i,
  /p\. 341:.*round-number.*skipped.*stay out/i,
  /p\. 342:.*unsafe.*M-pattern.*combi/i,
]) assert.ok(lens.cues.some(cue => expected.test(cue)), expected.source);
for (const expected of [
  /EUR\/USD.*XAUUSD/i,
  /Figure 9\.84-9\.93 OHLC.*UNAVAILABLE\/WITHHELD/i,
  /p\. 338 hypothetical.*intrabar/i,
  /p\. 333.*10 pip.*skipped/i,
  /p\. 338.*p\. 339-341.*existing accepted position/i,
  /actual combi-label provenance.*p\. 342/i,
  /p\. 337.*p\. 340-341.*live economic-calendar/i,
  /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/i,
]) assert.ok(lens.abstain.some(note => expected.test(note)), expected.source);

assert.equal(receipt.source_sha256, map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages, reviewed);
assert.deepEqual(receipt.newly_curated_printed_pages, reviewed);
assert.deepEqual(receipt.previously_curated_rechecked_printed_pages, []);
assert.deepEqual(receipt.coverage, {
  curated_pages: 379,
  remaining_pages: 40,
  chapter9_reviewed_pages: 98,
  source_lenses: 32,
  held_out_source_fixtures: 32,
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
  assert.equal(row.case_month, printedPage <= 336 ? '2012-06' : '2012-07');
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
  assert.equal(row.concept_ids.includes('pattern_break_combi'), printedPage === 342);
}
for (const id of lens.concept_ids) {
  const concept = map.concepts.find(item => item.id === id);
  assert.ok(concept.pages.some(page => reviewed.includes(page)), `${id} needs a reviewed content anchor`);
}
const chapterCoverage = priceActionReviewCoverage(index, extraction, map, 9);
assert.equal(chapterCoverage.totals.pages, 138);
assert.ok(chapterCoverage.totals.reviewed_pages >= 98);
assert.equal(chapterCoverage.totals.remaining_pages, 138 - chapterCoverage.totals.reviewed_pages);
assert.deepEqual(chapterCoverage.chapters[0].remaining_without_ocr_printed_pages, chapter.reviewed_printed_pages.includes(382) ? [] : [382]);
assert.ok(!chapterCoverage.chapters[0].next_review || chapterCoverage.chapters[0].next_review.printed_page > 342);
const globalCoverage = priceActionReviewCoverage(index, extraction, map).totals;
assert.equal(globalCoverage.pages, 419);
assert.ok(globalCoverage.reviewed_pages >= 379);
assert.equal(globalCoverage.remaining_pages, 419 - globalCoverage.reviewed_pages);

console.log('CHAPTER 9 JULY SOURCE REVIEW PASS: printed333-342 / PDF343-352; source-only context, skips and conditional exits preserved.');
