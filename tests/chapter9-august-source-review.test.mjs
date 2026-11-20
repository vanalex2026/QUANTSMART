import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {priceActionReviewCoverage} from '../scripts/price-action-coverage.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const map = read('../docs/price_action_knowledge_map.json');
const index = read('../docs/price_action_page_index.json');
const extraction = read('../artifacts/price_action_pages_audit.json');
const receipt = read('../artifacts/chapter9-august-source-review-363-372.json');
const chapter = map.book_index.find(row => row.number === 9);
const lens = map.source_lenses.find(row => row.id === 'chapter9_august_context_and_selectivity');
const fixture = map.held_out_source_fixtures.find(row => row.id === 'chapter-9-august-review-363-372');
const reviewed = Array.from({length: 10}, (_, i) => 363 + i);

assert.deepEqual(chapter.reviewed_printed_pages.filter(page => page <= 372), Array.from({length: 128}, (_, i) => 245 + i));
assert.deepEqual(lens.pages, reviewed);
assert.deepEqual(fixture.pages, reviewed);
assert.equal(lens.implementation, 'SOURCE_NOTES');
assert.equal(fixture.status, 'SOURCE_REVIEW_ONLY');
assert.equal(fixture.data_status, 'UNAVAILABLE');
assert.equal(fixture.outcome_status, 'WITHHELD');
for (const expected of [
 /p\. 363:.*Ww.*trap.*round number.*EU lunch.*skipped/i,
 /p\. 364:.*London Open.*building.*reversal.*resistance.*skipped longs/i,
 /p\. 365:.*evening-star.*50-level.*continuation shorts.*skips/i,
 /p\. 366:.*UK Open.*tiny signal.*postponing.*reversal exit/i,
 /p\. 367:.*bullish breakout.*M-pattern.*adverse magnet.*skip/i,
 /p\. 368:.*weak pressure.*false high.*50 level.*range lows/i,
 /p\. 369:.*thin Asian range.*less forceful.*tiny signal.*skipped/i,
 /p\. 370:.*scalp.*20 pip.*resistance exit.*tease break/i,
 /p\. 371:.*bullish dominance.*50 level.*reversal exit.*skipped/i,
 /p\. 372:.*solid buildup.*adverse.*50-level.*reversal exit.*skips longs/i,
]) assert.ok(lens.cues.some(cue => expected.test(cue)), expected.source);
for (const expected of [
 /EUR\/USD.*XAUUSD/i,
 /Figures 9\.114-9\.123.*OHLC.*UNAVAILABLE\/WITHHELD/i,
 /p\. 363.*p\. 365.*measured probabilities.*p\. 369.*p\. 372.*qualitative/i,
 /p\. 364.*p\. 366.*p\. 367.*p\. 370.*p\. 372.*accepted position/i,
 /p\. 366.*one-to-two-pip.*intrabar.*p\. 369.*detector threshold/i,
 /p\. 365.*evening-star.*p\. 368.*false-high.*explicit skips remain skips/i,
 /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/i,
]) assert.ok(lens.abstain.some(note => expected.test(note)), expected.source);
assert.equal(receipt.source_sha256, map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages, reviewed);
assert.deepEqual(receipt.newly_curated_printed_pages, reviewed);
assert.deepEqual(receipt.previously_curated_rechecked_printed_pages, []);
assert.deepEqual(receipt.coverage, {curated_pages:409, remaining_pages:10, chapter9_reviewed_pages:128, source_lenses:35, held_out_source_fixtures:35});
assert.equal(receipt.status, 'SOURCE_REVIEW_ONLY');
assert.equal(receipt.data_status, 'UNAVAILABLE');
assert.equal(receipt.outcome_status, 'WITHHELD');
assert.equal(receipt.ocr_gap_handling.printed_page, 382);
assert.equal(receipt.ocr_gap_handling.pdf_page, 392);
assert.equal(receipt.ocr_gap_handling.has_ocr, false);
assert.equal(receipt.ocr_gap_handling.status, 'PENDING_VISUAL_REVIEW');
assert.equal(receipt.receipts.length, 10);
for (const page of reviewed) {
 const row = index.pages.find(item => item.printed_page === page);
 const attested = receipt.receipts.find(item => item.printed_page === page);
 assert.equal(row.review_status, 'CURATED_NOTES');
 assert.equal(row.pdf_page, page + 10);
 assert.equal(attested.pdf_page, page + 10);
 assert.equal(attested.ocr_sha256, row.ocr_sha256);
 assert.equal(attested.has_ocr, true);
 assert.deepEqual(attested.concept_ids, row.concept_ids);
 assert.match(attested.visual_review, /Full page visually inspected/);
 assert.equal(createHash('sha256').update(extraction.pages[page + 9].text, 'utf8').digest('hex'), attested.ocr_sha256);
 const render = new URL('../' + attested.render_path, import.meta.url);
 assert.ok(existsSync(render));
 assert.equal(createHash('sha256').update(readFileSync(render)).digest('hex'), attested.render_sha256);
 assert.ok(row.concept_ids.includes('consecutive_review'));
 assert.equal(row.concept_ids.includes('pattern_break_combi'), false);
}
for (const id of lens.concept_ids) assert.ok(map.concepts.find(item => item.id === id).pages.some(page => reviewed.includes(page)), `${id} needs an anchor`);
const coverage = priceActionReviewCoverage(index, extraction, map, 9);
assert.ok(coverage.totals.reviewed_pages >= 128);
assert.equal(coverage.totals.remaining_pages, 138 - coverage.totals.reviewed_pages);
assert.deepEqual(coverage.chapters[0].remaining_without_ocr_printed_pages, chapter.reviewed_printed_pages.includes(382) ? [] : [382]);
assert.ok(!coverage.chapters[0].next_review || coverage.chapters[0].next_review.printed_page > 372);
console.log('CHAPTER 9 AUGUST SOURCE REVIEW PASS: printed363-372 / PDF373-382; source-only context and selectivity preserved.');
