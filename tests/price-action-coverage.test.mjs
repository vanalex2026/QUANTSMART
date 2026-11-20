import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPriceActionSourceIndex } from '../scripts/price-action-source-index.mjs';
import { priceActionReviewCoverage } from '../scripts/price-action-coverage.mjs';

const map = {
  source: { sha256: 'A'.repeat(64), pdf_pages: 20, title: 'Synthetic coverage fixture' }, concepts: [], case_study_months: [],
  book_index: [
    { number: 1, title: 'One', pdf_range: [11, 14], printed_range: [1, 4], reviewed_printed_pages: [1, 2, 4] },
    { number: 2, title: 'Two', pdf_range: [15, 18], printed_range: [5, 8], reviewed_printed_pages: [] },
  ],
};
const extraction = { schema: 'quantsmart.price-action-pdf-extraction/1', source: map.source, text_pages: 19,
  pages: Array.from({ length: 20 }, (_, i) => ({ pdf_page: i + 1, text: i === 15 ? '' : 'Synthetic text', has_text: i !== 15 })) };
const index = buildPriceActionSourceIndex(extraction, map);
const report = priceActionReviewCoverage(index, extraction, map);
assert.deepEqual(report.totals, { pages: 8, reviewed_pages: 3, remaining_pages: 5 });
assert.deepEqual(report.chapters[0].remaining_printed_ranges, [[3, 3]], 'reviewed gaps must split pending intervals');
assert.deepEqual(report.chapters[1].remaining_printed_ranges, [[5, 8]]);
assert.deepEqual(report.chapters[1].remaining_without_ocr_printed_pages, [6], 'OCR gaps stay explicit review work');
assert.equal(report.chapters[1].remaining_with_ocr, 3);
assert.deepEqual(report.chapters[0].next_review, { printed_page: 3, pdf_page: 13, has_ocr: true });
assert.deepEqual(priceActionReviewCoverage(index, extraction, map, 2).totals, { pages: 4, reviewed_pages: 0, remaining_pages: 4 });
for (const chapter of [0, 13, NaN, 1.5]) assert.throws(() => priceActionReviewCoverage(index, extraction, map, chapter), /Invalid chapter/);
const complete = structuredClone(map); complete.book_index[0].reviewed_printed_pages = [1, 2, 3, 4];
const done = priceActionReviewCoverage(buildPriceActionSourceIndex(extraction, complete), extraction, complete, 1).chapters[0];
assert.equal(done.next_review, null); assert.deepEqual(done.remaining_printed_ranges, []);
const altered = structuredClone(index); altered.pages[12].review_status = 'CURATED_NOTES';
assert.throws(() => priceActionReviewCoverage(altered, extraction, map), /stale|inconsistent/);
const drift = structuredClone(extraction); drift.pages[12].text += ' drift';
assert.throws(() => priceActionReviewCoverage(index, drift, map), /stale|inconsistent/);
const source = readFileSync(new URL('../scripts/price-action-coverage.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(source, /writeFile|writeFileSync|spawnSync|execSync/, 'coverage is a read-only report, with no PDF extraction');
assert.match(report.review_policy, /do not prove complete method implementation/);
console.log('PRICE ACTION COVERAGE PASS: attested review totals, pending ranges, OCR gaps, chapter scope and stale-source refusal.');
