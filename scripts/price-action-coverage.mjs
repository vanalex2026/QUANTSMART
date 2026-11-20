// Source-review backlog derived from the same attested page index as retrieval.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchPriceActionSource } from './price-action-source-index.mjs';

function ranges(pages) {
  const result = [];
  for (const page of pages) {
    const previous = result.at(-1);
    if (previous && previous[1] + 1 === page) previous[1] = page;
    else result.push([page, page]);
  }
  return result;
}

export function priceActionReviewCoverage(index, extraction, map, chapter) {
  // Reuse strict source/hash/OCR/metadata attestation before reporting coverage.
  // Metadata alone is not proof that the local OCR still matches the source.
  searchPriceActionSource(index, extraction, map, { limit: 1, ...(chapter === undefined ? {} : { chapter }) });
  const chapters = map.book_index.filter(row => chapter === undefined || row.number === chapter).map(row => {
    const pages = index.pages.filter(page => page.chapter === row.number);
    const reviewed = pages.filter(page => page.review_status === 'CURATED_NOTES');
    const remaining = pages.filter(page => page.review_status !== 'CURATED_NOTES');
    return {
      chapter: row.number, title: row.title, printed_range: row.printed_range,
      pages: pages.length, reviewed_pages: reviewed.length, remaining_pages: remaining.length,
      remaining_printed_ranges: ranges(remaining.map(page => page.printed_page)),
      remaining_with_ocr: remaining.filter(page => page.has_ocr).length,
      remaining_without_ocr_printed_pages: remaining.filter(page => !page.has_ocr).map(page => page.printed_page),
      next_review: remaining[0] ? { printed_page: remaining[0].printed_page, pdf_page: remaining[0].pdf_page, has_ocr: remaining[0].has_ocr } : null,
    };
  });
  const total = key => chapters.reduce((sum, row) => sum + row[key], 0);
  return {
    schema: 'quantsmart.price-action-review-coverage/1', source: index.source,
    scope: 'Indexed chapter intervals only; front/back matter is excluded.',
    review_policy: 'Curated notes attest page review only. They do not prove complete method implementation, verified figure OHLC, detector accuracy or profitability.',
    ordering: 'Chapter and printed-page order; next_review is a navigation aid, not a priority or strategy recommendation.',
    totals: { pages: total('pages'), reviewed_pages: total('reviewed_pages'), remaining_pages: total('remaining_pages') },
    chapters,
  };
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--help') {
      console.log('node scripts/price-action-coverage.mjs [--chapter 1..12] [--index path] [--map path] [--extraction path]\nReports attested page-review coverage and remaining ranges using existing local OCR. It never extracts the PDF or writes files.');
      return;
    }
    if (!['--chapter', '--index', '--map', '--extraction'].includes(flag) || !args[i + 1] || args[i + 1].startsWith('--')) throw Error(`Unknown option or missing value: ${flag}`);
    options[flag] = args[++i];
  }
  const read = (flag, fallback) => JSON.parse(readFileSync(resolve(root, options[flag] || fallback), 'utf8').replace(/^\uFEFF/, ''));
  const chapter = options['--chapter'] === undefined ? undefined : Number(options['--chapter']);
  console.log(JSON.stringify(priceActionReviewCoverage(read('--index', 'docs/price_action_page_index.json'), read('--extraction', 'artifacts/price_action_pages_audit.json'), read('--map', 'docs/price_action_knowledge_map.json'), chapter), null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
