import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {priceActionReviewCoverage} from '../scripts/price-action-coverage.mjs';

const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const map=read('../docs/price_action_knowledge_map.json');
const index=read('../docs/price_action_page_index.json');
const extraction=read('../artifacts/price_action_pages_audit.json');
const receipt=read('../artifacts/chapter9-early-may-source-review-293-302.json');
const chapter=map.book_index.find(row=>row.number===9);
const lens=map.source_lenses.find(row=>row.id==='chapter9_early_may_selection_and_news_context');
const fixture=map.held_out_source_fixtures.find(row=>row.id==='chapter-9-early-may-review-293-302');
const reviewed=Array.from({length:10},(_,i)=>293+i);
assert.ok(Array.from({length:58},(_,i)=>245+i).every(p=>chapter.reviewed_printed_pages.includes(p)));
assert.deepEqual(lens.pages,reviewed);
assert.deepEqual(fixture.pages,reviewed);
assert.equal(lens.implementation,'SOURCE_NOTES');
assert.equal(fixture.status,'SOURCE_REVIEW_ONLY');
assert.equal(fixture.data_status,'UNAVAILABLE');
assert.equal(fixture.outcome_status,'WITHHELD');
for(const expected of [/p\. 293:.*very timid.*already in position/i,/p\. 294:.*first strong pullback.*adverse 50-level/i,/p\. 295:.*technically valid but skipped.*neither a continuation/i,/p\. 296:.*weak entry.*traps both sides/i,/p\. 297:.*acceptable only if reversal-exit tactics.*too aggressive/i,/p\. 298:.*waiting on both sides.*overhead obstruction/i,/p\. 299:.*jeopardize its stop.*personal call.*conditional/i,/p\. 300:.*resistance exit.*nontrending.*higher lows/i,/p\. 301:.*both long entries valid.*no trades/i,/p\. 302:.*only if.*conditional.*11:00/i])assert.ok(lens.cues.some(cue=>expected.test(cue)),expected.source);
for(const expected of [/EUR\/USD.*XAUUSD/i,/Figure 9\.44-9\.53 OHLC.*UNAVAILABLE\/WITHHELD/i,/p\. 293.*p\. 297.*p\. 299.*measured profit/i,/p\. 295.*technically valid but skipped.*live economic-calendar/i,/p\. 294.*p\. 296.*not measured probabilities/i,/p\. 299 and p\. 302.*earlier accepted trade.*not assert/i,/p\. 301.*not XAUUSD execution.*automatic detector rule/i,/SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/i])assert.ok(lens.abstain.some(cue=>expected.test(cue)),expected.source);
assert.equal(receipt.source_sha256,map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages,reviewed);
assert.deepEqual(receipt.newly_curated_printed_pages,reviewed);
assert.deepEqual(receipt.previously_curated_rechecked_printed_pages,[]);
assert.deepEqual(receipt.coverage,{curated_pages:339,remaining_pages:80,chapter9_reviewed_pages:58,source_lenses:28,held_out_source_fixtures:28});
assert.equal(receipt.receipts.length,10);
for(const p of reviewed){
  const row=index.pages.find(r=>r.printed_page===p),attest=receipt.receipts.find(r=>r.printed_page===p);
  assert.equal(row.review_status,'CURATED_NOTES');
  assert.equal(row.pdf_page,p+10);
  assert.equal(attest.ocr_sha256,row.ocr_sha256);
  assert.equal(attest.has_ocr,row.has_ocr);
  assert.deepEqual(attest.concept_ids,row.concept_ids);
  assert.match(attest.render_sha256,/^[a-f0-9]{64}$/);
  assert.match(attest.visual_review,/Full page visually inspected/);
  assert.equal(createHash('sha256').update(extraction.pages[p+9].text,'utf8').digest('hex'),attest.ocr_sha256);
  const render=new URL('../'+attest.render_path,import.meta.url);
  if(existsSync(render))assert.equal(createHash('sha256').update(readFileSync(render)).digest('hex'),attest.render_sha256);
  assert.ok(row.concept_ids.includes('consecutive_review'));
  // Combi provenance is restricted to the two explicit pbc annotations.
  assert.equal(row.concept_ids.includes('pattern_break_combi'),[297,301].includes(p));
}
for(const id of lens.concept_ids){const concept=map.concepts.find(c=>c.id===id);assert.ok(concept.pages.some(p=>reviewed.includes(p)),`${id} needs a reviewed content anchor`);}
const coverage=priceActionReviewCoverage(index,extraction,map,9);
assert.ok(coverage.totals.reviewed_pages>=58);
assert.equal(coverage.totals.reviewed_pages+coverage.totals.remaining_pages,138);
assert.ok(!coverage.chapters[0].next_review||coverage.chapters[0].next_review.printed_page>302);
assert.deepEqual(coverage.chapters[0].remaining_without_ocr_printed_pages,chapter.reviewed_printed_pages.includes(382)?[]:[382]);
assert.ok(priceActionReviewCoverage(index,extraction,map).totals.reviewed_pages>=339);
console.log('CHAPTER 9 EARLY MAY SOURCE REVIEW PASS: printed293-302 / PDF303-312; selection, news avoidance and conditional management remain source-only.');
