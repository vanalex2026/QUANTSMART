import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {priceActionReviewCoverage} from '../scripts/price-action-coverage.mjs';

const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const map=read('../docs/price_action_knowledge_map.json');
const index=read('../docs/price_action_page_index.json');
const extraction=read('../artifacts/price_action_pages_audit.json');
const receipt=read('../artifacts/chapter9-late-march-source-review-263-272.json');
const chapter=map.book_index.find(row=>row.number===9);
const lens=map.source_lenses.find(row=>row.id==='chapter9_late_march_risk_and_room');
const fixture=map.held_out_source_fixtures.find(row=>row.id==='chapter-9-late-march-review-263-272');
const reviewed=Array.from({length:10},(_,i)=>263+i);
assert.ok(Array.from({length:28},(_,i)=>245+i).every(p=>chapter.reviewed_printed_pages.includes(p)));
assert.deepEqual(lens.pages,reviewed);
assert.deepEqual(fixture.pages,reviewed);
assert.equal(lens.implementation,'SOURCE_NOTES');
assert.equal(fixture.status,'SOURCE_REVIEW_ONLY');
assert.equal(fixture.data_status,'UNAVAILABLE');
assert.equal(fixture.outcome_status,'WITHHELD');
for(const expected of [/p\. 263:.*failed W-reversal.*optional only if still in position/i,/p\. 264:.*very aggressive.*bull swing is too strong/i,/p\. 265:.*far from the pattern line.*tall bullish powerbar/i,/p\. 266:.*50 percent retracement.*let go/i,/p\. 267:.*too weak to exit.*not to short against the box/i,/p\. 268:.*combi inside bar.*ugly chop/i,/p\. 269:.*not fully resolved/i,/p\. 270:.*entry-bar shakeout conditional/i,/p\. 271:.*scalp.*insufficient room.*20-pip/i,/p\. 272:.*April 2.*March running header/i])assert.ok(lens.cues.some(cue=>expected.test(cue)),expected.source);
for(const expected of [/EUR\/USD.*XAUUSD/i,/Figure 9\.14-9\.23 OHLC.*UNAVAILABLE\/WITHHELD/i,/p\. 270.*intrabar sequence.*cannot resolve/i,/p\. 271.*not a measured profit/i,/automatic detector rule.*measured success\/failure/i,/SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/i])assert.ok(lens.abstain.some(cue=>expected.test(cue)),expected.source);
assert.equal(receipt.source_sha256,map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages,reviewed);
assert.deepEqual(receipt.newly_curated_printed_pages,reviewed);
assert.deepEqual(receipt.previously_curated_rechecked_printed_pages,[]);
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
  assert.ok(row.concept_ids.includes('consecutive_review'));
}
for(const id of lens.concept_ids){const concept=map.concepts.find(c=>c.id===id);assert.ok(concept.pages.some(p=>reviewed.includes(p)),`${id} needs a reviewed content anchor`);}
const coverage=priceActionReviewCoverage(index,extraction,map,9);
assert.equal(coverage.totals.pages,138);
assert.ok(coverage.totals.reviewed_pages>=38);
assert.equal(coverage.totals.reviewed_pages+coverage.totals.remaining_pages,138);
assert.ok(!coverage.chapters[0].next_review||coverage.chapters[0].next_review.printed_page>282);
assert.deepEqual(coverage.chapters[0].remaining_without_ocr_printed_pages,chapter.reviewed_printed_pages.includes(382)?[]:[382]);
assert.ok(priceActionReviewCoverage(index,extraction,map).totals.reviewed_pages>=319);
console.log('CHAPTER 9 LATE MARCH SOURCE REVIEW PASS: printed263-272 / PDF273-282; room, conditional shakeout and plate-date notes remain source-only.');
