import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {priceActionReviewCoverage} from '../scripts/price-action-coverage.mjs';

const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const map=read('../docs/price_action_knowledge_map.json');
const index=read('../docs/price_action_page_index.json');
const extraction=read('../artifacts/price_action_pages_audit.json');
const receipt=read('../artifacts/chapter9-late-may-source-review-313-322.json');
const chapter=map.book_index.find(row=>row.number===9);
const lens=map.source_lenses.find(row=>row.id==='chapter9_late_may_early_june_context_and_selectivity');
const fixture=map.held_out_source_fixtures.find(row=>row.id==='chapter-9-late-may-early-june-review-313-322');
const reviewed=Array.from({length:10},(_,i)=>313+i);
assert.deepEqual(chapter.reviewed_printed_pages.filter(p=>p<=322),Array.from({length:78},(_,i)=>245+i));
assert.deepEqual(lens.pages,reviewed);
assert.deepEqual(fixture.pages,reviewed);
assert.equal(lens.implementation,'SOURCE_NOTES');
assert.equal(fixture.status,'SOURCE_REVIEW_ONLY');
assert.equal(fixture.data_status,'UNAVAILABLE');
assert.equal(fixture.outcome_status,'WITHHELD');
for(const expected of [/p\. 313:.*no real trend.*slightly aggressive.*beyond the ceiling-test/i,/p\. 314:.*shallow.*not reached EMA25/i,/p\. 315:.*evening-star and morning-star.*too tall/i,/p\. 316:.*only if still short.*skipped despite a deep pullback/i,/p\. 317:.*two premature.*first barrier test.*bounce candidate/i,/p\. 318:.*skips the early short despite the later sell-off.*aggressive/i,/p\. 319:.*extra buildup bar.*actual label is a pattern break.*staying out/i,/p\. 320:.*false low.*absent from OCR/i,/p\. 321:.*debatable barriers.*explicitly hypothetical/i,/p\. 322:.*actual label remains a pattern break.*corrects 50 percent/i])assert.ok(lens.cues.some(cue=>expected.test(cue)),expected.source);
for(const expected of [/EUR\/USD.*XAUUSD/i,/Figure 9\.64-9\.73 OHLC.*UNAVAILABLE\/WITHHELD/i,/p\. 315.*do not validate.*named-candle detector/i,/p\. 316.*existing accepted short position/i,/p\. 321.*hypothetical rather than an observed event/i,/p\. 319.*p\. 322.*counterfactual combi wishes/i,/not a live economic-calendar feed/i,/hindsight does not override selection criteria/i,/SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/i])assert.ok(lens.abstain.some(cue=>expected.test(cue)),expected.source);
assert.equal(receipt.source_sha256,map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages,reviewed);
assert.deepEqual(receipt.newly_curated_printed_pages,reviewed);
assert.deepEqual(receipt.previously_curated_rechecked_printed_pages,[]);
assert.deepEqual(receipt.coverage,{curated_pages:359,remaining_pages:60,chapter9_reviewed_pages:78,source_lenses:30,held_out_source_fixtures:30});
assert.equal(receipt.receipts.length,10);
for(const p of reviewed){
 const row=index.pages.find(r=>r.printed_page===p),attest=receipt.receipts.find(r=>r.printed_page===p);
 assert.equal(row.review_status,'CURATED_NOTES');
 assert.equal(row.pdf_page,p+10);
 assert.equal(attest.pdf_page,p+10);
 assert.equal(attest.ocr_sha256,row.ocr_sha256);
 assert.equal(attest.has_ocr,row.has_ocr);
 assert.deepEqual(attest.concept_ids,row.concept_ids);
 assert.match(attest.render_sha256,/^[a-f0-9]{64}$/);
 assert.match(attest.visual_review,/Full page visually inspected/);
 assert.equal(createHash('sha256').update(extraction.pages[p+9].text,'utf8').digest('hex'),attest.ocr_sha256);
 const render=new URL('../'+attest.render_path,import.meta.url);
 if(existsSync(render))assert.equal(createHash('sha256').update(readFileSync(render)).digest('hex'),attest.render_sha256);
 assert.ok(row.concept_ids.includes('consecutive_review'));
 // Extra-bar wishes on pp.319/322 are not actual combi-label provenance.
 assert.equal(row.concept_ids.includes('pattern_break_combi'),[317,318,321].includes(p));
 assert.equal(row.case_month,p<=315?'2012-05':'2012-06');
}
for(const id of lens.concept_ids){const concept=map.concepts.find(c=>c.id===id);assert.ok(concept.pages.some(p=>reviewed.includes(p)),`${id} needs a reviewed content anchor`);}
const coverage=priceActionReviewCoverage(index,extraction,map,9);
assert.equal(coverage.totals.pages,138);
assert.ok(coverage.totals.reviewed_pages>=78);
assert.equal(coverage.totals.remaining_pages,138-coverage.totals.reviewed_pages);
assert.ok(!coverage.chapters[0].next_review||coverage.chapters[0].next_review.printed_page>322);
assert.deepEqual(coverage.chapters[0].remaining_without_ocr_printed_pages,chapter.reviewed_printed_pages.includes(382)?[]:[382]);
const global=priceActionReviewCoverage(index,extraction,map).totals;
assert.equal(global.pages,419);
assert.ok(global.reviewed_pages>=359);
assert.equal(global.remaining_pages,419-global.reviewed_pages);
console.log('CHAPTER 9 LATE MAY/EARLY JUNE SOURCE REVIEW PASS: printed313-322 / PDF323-332; contextual selectivity, combi wishes and conditional exits remain source-only.');
