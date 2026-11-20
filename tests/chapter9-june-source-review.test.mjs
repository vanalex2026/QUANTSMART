import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {priceActionReviewCoverage} from '../scripts/price-action-coverage.mjs';
const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const map=read('../docs/price_action_knowledge_map.json');
const index=read('../docs/price_action_page_index.json');
const extraction=read('../artifacts/price_action_pages_audit.json');
const receipt=read('../artifacts/chapter9-june-source-review-323-332.json');
const chapter=map.book_index.find(row=>row.number===9);
const lens=map.source_lenses.find(row=>row.id==='chapter9_june_context_and_exit_ambiguity');
const fixture=map.held_out_source_fixtures.find(row=>row.id==='chapter-9-june-review-323-332');
const reviewed=Array.from({length:10},(_,i)=>323+i);
assert.deepEqual(chapter.reviewed_printed_pages.filter(p=>p<=332),Array.from({length:88},(_,i)=>245+i));
assert.deepEqual(lens.pages,reviewed); assert.deepEqual(fixture.pages,reviewed);
assert.equal(lens.implementation,'SOURCE_NOTES');
assert.equal(fixture.status,'SOURCE_REVIEW_ONLY'); assert.equal(fixture.data_status,'UNAVAILABLE'); assert.equal(fixture.outcome_status,'WITHHELD');
for(const expected of [/p\. 323:.*UK Open combi.*aggressive.*00-level opposition/i,/p\. 324:.*weak.*more buildup.*00-level magnet/i,/p\. 325:.*premature Ww.*adverse magnet/i,/p\. 326:.*thin price action.*classic false-break trap.*reversal-exit/i,/p\. 327:.*thin buildup.*conservative high-odds/i,/p\. 328:.*stronger.*ranging.*contrarian/i,/p\. 329:.*failure of the short.*bull-side opportunity.*conditional/i,/p\. 330:.*no entry.*bullish signal bar/i,/p\. 331:.*50-level tug-of-war.*stay out/i,/p\. 332:.*pressure.*explicitly.*no setup/i]) assert.ok(lens.cues.some(cue=>expected.test(cue)),expected.source);
for(const expected of [/EUR\/USD.*XAUUSD/i,/Figure 9\.74-9\.83 OHLC.*UNAVAILABLE\/WITHHELD/i,/p\. 326.*20 pip.*not.*target touch/i,/p\. 325.*p\. 326.*p\. 329.*existing accepted positions/i,/actual combi-label provenance.*pp\. 323 and 329/i,/p\. 328.*p\. 331.*p\. 332.*not entry authority/i,/dated US news.*not a live economic-calendar/i,/SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/i]) assert.ok(lens.abstain.some(cue=>expected.test(cue)),expected.source);
assert.equal(receipt.source_sha256,map.source.sha256); assert.deepEqual(receipt.reviewed_printed_pages,reviewed); assert.deepEqual(receipt.newly_curated_printed_pages,reviewed); assert.deepEqual(receipt.previously_curated_rechecked_printed_pages,[]);
assert.deepEqual(receipt.coverage,{curated_pages:369,remaining_pages:50,chapter9_reviewed_pages:88,source_lenses:31,held_out_source_fixtures:31}); assert.equal(receipt.receipts.length,10);
for(const p of reviewed){ const row=index.pages.find(r=>r.printed_page===p),attest=receipt.receipts.find(r=>r.printed_page===p); assert.equal(row.review_status,'CURATED_NOTES'); assert.equal(row.pdf_page,p+10); assert.equal(attest.pdf_page,p+10); assert.equal(attest.ocr_sha256,row.ocr_sha256); assert.equal(attest.has_ocr,row.has_ocr); assert.deepEqual(attest.concept_ids,row.concept_ids); assert.match(attest.render_sha256,/^[a-f0-9]{64}$/); assert.match(attest.visual_review,/Full page visually inspected/); assert.equal(createHash('sha256').update(extraction.pages[p+9].text,'utf8').digest('hex'),attest.ocr_sha256); const render=new URL('../'+attest.render_path,import.meta.url); if(existsSync(render)) assert.equal(createHash('sha256').update(readFileSync(render)).digest('hex'),attest.render_sha256); assert.ok(row.concept_ids.includes('consecutive_review')); assert.equal(row.concept_ids.includes('pattern_break_combi'),[323,329].includes(p)); assert.equal(row.case_month,'2012-06'); }
for(const id of lens.concept_ids){const concept=map.concepts.find(c=>c.id===id); assert.ok(concept.pages.some(p=>reviewed.includes(p)),`${id} needs a reviewed content anchor`);}
const coverage=priceActionReviewCoverage(index,extraction,map,9); assert.equal(coverage.totals.pages,138); assert.ok(coverage.totals.reviewed_pages>=88); assert.equal(coverage.totals.remaining_pages,138-coverage.totals.reviewed_pages); assert.ok(!coverage.chapters[0].next_review||coverage.chapters[0].next_review.printed_page>332); assert.deepEqual(coverage.chapters[0].remaining_without_ocr_printed_pages,chapter.reviewed_printed_pages.includes(382)?[]:[382]); const global=priceActionReviewCoverage(index,extraction,map).totals; assert.equal(global.pages,419); assert.ok(global.reviewed_pages>=369); assert.equal(global.remaining_pages,419-global.reviewed_pages);
console.log('CHAPTER 9 JUNE SOURCE REVIEW PASS: printed323-332 / PDF333-342; context, abstention and exit ambiguity remain source-only.');

