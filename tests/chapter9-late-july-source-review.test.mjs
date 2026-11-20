import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {priceActionReviewCoverage} from '../scripts/price-action-coverage.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const map = read('../docs/price_action_knowledge_map.json');
const index = read('../docs/price_action_page_index.json');
const extraction = read('../artifacts/price_action_pages_audit.json');
const receipt = read('../artifacts/chapter9-late-july-source-review-353-362.json');
const chapter = map.book_index.find(row => row.number === 9);
const lens = map.source_lenses.find(row => row.id === 'chapter9_late_july_context_and_timing');
const fixture = map.held_out_source_fixtures.find(row => row.id === 'chapter-9-late-july-review-353-362');
const reviewed = Array.from({length: 10}, (_, i) => 353 + i);

assert.deepEqual(chapter.reviewed_printed_pages.filter(page => page <= 362), Array.from({length: 118}, (_, i) => 245 + i));
assert.deepEqual(lens.pages, reviewed);
assert.deepEqual(fixture.pages, reviewed);
assert.equal(lens.implementation, 'SOURCE_NOTES');
assert.equal(fixture.status, 'SOURCE_REVIEW_ONLY');
assert.equal(fixture.data_status, 'UNAVAILABLE');
assert.equal(fixture.outcome_status, 'WITHHELD');
for (const expected of [
  /p\. 353:.*reversal exit.*00 magnet.*ceiling-test.*extra buildup/i,
  /p\. 354:.*shake.*slip a stop.*false low.*morning-star.*caution/i,
  /p\. 355:.*tall signal.*EMA25.*pattern-line.*news-induced/i,
  /p\. 356:.*shallow-pullback.*round-number.*ceiling-test.*aggressive/i,
  /p\. 357:.*tall weak signal.*diagonal-pullback.*fourth-arch.*Ww/i,
  /p\. 358:.*scalper.*insufficient.*EU-lunch.*unconvincing/i,
  /p\. 359:.*continuation.*1\.23.*round-number-support.*skipped/i,
  /p\. 360:.*premature.*tease breakout.*ECB.*stay out/i,
  /p\. 361:.*range breakout.*tall signal.*EMA25.*news/i,
  /p\. 362:.*bearish morning.*powerful pullback.*ranging market.*ceiling test/i,
]) assert.ok(lens.cues.some(cue => expected.test(cue)), expected.source);
for (const expected of [
  /EUR\/USD.*XAUUSD/i,
  /Figure 9\.104-9\.113 OHLC.*UNAVAILABLE\/WITHHELD/i,
  /p\. 354.*stop-slippage.*p\. 355.*intrabar/i,
  /p\. 353.*p\. 355-357.*existing accepted position/i,
  /actual combi-label provenance.*p\. 354/i,
  /p\. 357.*p\. 358.*p\. 359.*measured probability/i,
  /p\. 355.*p\. 360-361.*live economic-calendar/i,
  /p\. 361.*p\. 362.*qualitative source choices/i,
  /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/i,
]) assert.ok(lens.abstain.some(note => expected.test(note)), expected.source);

assert.equal(receipt.source_sha256, map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages, reviewed);
assert.deepEqual(receipt.newly_curated_printed_pages, reviewed);
assert.deepEqual(receipt.previously_curated_rechecked_printed_pages, []);
assert.deepEqual(receipt.coverage, {curated_pages: 399, remaining_pages: 20, chapter9_reviewed_pages: 118, source_lenses: 34, held_out_source_fixtures: 34});
assert.equal(receipt.status, 'SOURCE_REVIEW_ONLY');
assert.equal(receipt.data_status, 'UNAVAILABLE');
assert.equal(receipt.outcome_status, 'WITHHELD');
assert.equal(receipt.receipts.length, 10);
for (const printedPage of reviewed) {
  const row = index.pages.find(page => page.printed_page === printedPage);
  const attested = receipt.receipts.find(page => page.printed_page === printedPage);
  assert.equal(row.review_status, 'CURATED_NOTES');
  assert.equal(row.pdf_page, printedPage + 10);
  assert.equal(attested.pdf_page, printedPage + 10);
  assert.equal(attested.ocr_sha256, row.ocr_sha256);
  assert.equal(attested.has_ocr, row.has_ocr);
  assert.deepEqual(attested.concept_ids, row.concept_ids);
  assert.match(attested.render_sha256, /^[a-f0-9]{64}$/);
  assert.match(attested.visual_review, /Full page visually inspected/);
  assert.equal(createHash('sha256').update(extraction.pages[printedPage + 9].text, 'utf8').digest('hex'), attested.ocr_sha256);
  const renderPath = new URL('../' + attested.render_path, import.meta.url);
  assert.ok(existsSync(renderPath));
  assert.equal(createHash('sha256').update(readFileSync(renderPath)).digest('hex'), attested.render_sha256);
  assert.ok(row.concept_ids.includes('consecutive_review'));
  assert.equal(row.concept_ids.includes('pattern_break_combi'), printedPage === 354);
}
for (const id of lens.concept_ids) assert.ok(map.concepts.find(item => item.id === id).pages.some(page => reviewed.includes(page)), `${id} needs a reviewed content anchor`);
const coverage = priceActionReviewCoverage(index, extraction, map, 9);
assert.ok(coverage.totals.reviewed_pages >= 118);
assert.equal(coverage.totals.remaining_pages, 138 - coverage.totals.reviewed_pages);
assert.deepEqual(coverage.chapters[0].remaining_without_ocr_printed_pages, chapter.reviewed_printed_pages.includes(382) ? [] : [382]);
assert.ok(!coverage.chapters[0].next_review || coverage.chapters[0].next_review.printed_page > 362);
console.log('CHAPTER 9 LATE-JULY SOURCE REVIEW PASS: printed353-362 / PDF363-372; source-only timing, skips and conditional exits preserved.');
