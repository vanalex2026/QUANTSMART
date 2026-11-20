import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {priceActionReviewCoverage} from '../scripts/price-action-coverage.mjs';

const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const map=read('../docs/price_action_knowledge_map.json');
const index=read('../docs/price_action_page_index.json');
const extraction=read('../artifacts/price_action_pages_audit.json');
const receipt=read('../artifacts/chapter9-mid-may-source-review-303-312.json');
const chapter=map.book_index.find(row=>row.number===9);
const lens=map.source_lenses.find(row=>row.id==='chapter9_mid_may_patience_and_conditional_exits');
const fixture=map.held_out_source_fixtures.find(row=>row.id==='chapter-9-mid-may-review-303-312');
const reviewed=Array.from({length:10},(_,i)=>303+i);
assert.deepEqual(chapter.reviewed_printed_pages.filter(p=>p<=312),Array.from({length:68},(_,i)=>245+i));
assert.deepEqual(lens.pages,reviewed);
assert.deepEqual(fixture.pages,reviewed);
assert.equal(lens.implementation,'SOURCE_NOTES');
assert.equal(fixture.status,'SOURCE_REVIEW_ONLY');
assert.equal(fixture.data_status,'UNAVAILABLE');
assert.equal(fixture.outcome_status,'WITHHELD');
for(const expected of [/p\. 303:.*not a tradable break yet.*both quite aggressive/i,/p\. 304:.*too strong to short/i,/p\. 305:.*very shallow pullback.*delaying a reversal exit/i,/p\. 306:.*against immediate flag continuation.*only if still in/i,/p\. 307:.*jumpy action.*if warranted.*already in position/i,/p\. 308:.*below conservative requirements.*neither is pursued/i,/p\. 309:.*strong pullback.*former-high resistance exit.*let go/i,/p\. 310:.*first pullback.*normally not an exit candidate.*only if still in/i,/p\. 311:.*second attempt.*still a pretty aggressive trade/i,/p\. 312:.*does not align.*both entries are valid/i])assert.ok(lens.cues.some(cue=>expected.test(cue)),expected.source);
for(const expected of [/EUR\/USD.*XAUUSD/i,/Figure 9\.54-9\.63 OHLC.*UNAVAILABLE\/WITHHELD/i,/p\. 303.*p\. 304.*p\. 311.*not measured probabilities/i,/p\. 305.*not establish.*executable fill.*live economic-calendar/i,/p\. 306.*p\. 307.*p\. 308.*p\. 310.*existing accepted position.*qualifying entry/i,/p\. 308.*p\. 311.*not validate.*named-candle detector/i,/p\. 310.*p\. 312.*not universal XAUUSD thresholds/i,/SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/i])assert.ok(lens.abstain.some(cue=>expected.test(cue)),expected.source);
assert.equal(receipt.source_sha256,map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages,reviewed);
assert.deepEqual(receipt.newly_curated_printed_pages,reviewed);
assert.deepEqual(receipt.previously_curated_rechecked_printed_pages,[]);
assert.deepEqual(receipt.coverage,{curated_pages:349,remaining_pages:70,chapter9_reviewed_pages:68,source_lenses:29,held_out_source_fixtures:29});
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
  // Combi provenance stays restricted to the five explicit pbc labels.
  assert.equal(row.concept_ids.includes('pattern_break_combi'),[303,304,305,311,312].includes(p));
}
for(const id of lens.concept_ids){const concept=map.concepts.find(c=>c.id===id);assert.ok(concept.pages.some(p=>reviewed.includes(p)),`${id} needs a reviewed content anchor`);}
const coverage=priceActionReviewCoverage(index,extraction,map,9);
assert.equal(coverage.totals.pages,138);
assert.ok(coverage.totals.reviewed_pages>=68);
assert.equal(coverage.totals.remaining_pages,138-coverage.totals.reviewed_pages);
assert.ok(!coverage.chapters[0].next_review||coverage.chapters[0].next_review.printed_page>312);
assert.deepEqual(coverage.chapters[0].remaining_without_ocr_printed_pages,chapter.reviewed_printed_pages.includes(382)?[]:[382]);
const global=priceActionReviewCoverage(index,extraction,map).totals;
assert.equal(global.pages,419);
assert.ok(global.reviewed_pages>=349);
assert.equal(global.remaining_pages,419-global.reviewed_pages);
console.log('CHAPTER 9 MID MAY SOURCE REVIEW PASS: printed303-312 / PDF313-322; patience, aggressive entries and conditional exits remain source-only.');
