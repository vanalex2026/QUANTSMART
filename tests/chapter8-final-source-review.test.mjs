import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { priceActionReviewCoverage } from '../scripts/price-action-coverage.mjs';

const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const map=read('../docs/price_action_knowledge_map.json');
const index=read('../docs/price_action_page_index.json');
const extraction=read('../artifacts/price_action_pages_audit.json');
const receipt=read('../artifacts/chapter8-recap-source-review-230-244.json');
const chapter=map.book_index.find(row=>row.number===8);
const lens=map.source_lenses.find(row=>row.id==='chapter8_recap_harmony_and_patience');
const fixture=map.held_out_source_fixtures.find(row=>row.id==='chapter-8-recap-review-230-241');
const reviewed=Array.from({length:15},(_,i)=>230+i);
const content=reviewed.filter(p=>p<=241);
assert.deepEqual(chapter.reviewed_printed_pages,Array.from({length:34},(_,i)=>211+i));
assert.deepEqual(lens.pages,content);
assert.deepEqual(fixture.pages,content);
assert.equal(lens.implementation,'SOURCE_NOTES');
assert.equal(fixture.status,'SOURCE_REVIEW_ONLY');
assert.equal(fixture.data_status,'UNAVAILABLE');
assert.equal(fixture.outcome_status,'WITHHELD');
for(const expected of [/p\. 230-231:.*weak continuation.*strong pole/i,/p\. 232-233:.*round-number.*resistance\/reversal/i,/p\. 234-235:.*second break.*intrabar.*uncertain/i,/p\. 236-237:.*harmonious.*vindication/i,/p\. 238-239:.*cannot determine.*stop/i,/p\. 240-241:.*anticipated, not predicted.*more buildup/i]) assert.ok(lens.cues.some(cue=>expected.test(cue)),expected.source);
for(const expected of [/EUR\/USD.*XAUUSD/i,/Figure 8\.9-8\.14 OHLC.*UNAVAILABLE\/WITHHELD/i,/uncertain intrabar.*stop event.*measured outcomes/i,/automatic detector rule/i,/242.*244.*blank.*243.*divider/i,/SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/i]) assert.ok(lens.abstain.some(cue=>expected.test(cue)),expected.source);
assert.equal(receipt.source_sha256,map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages,reviewed);
assert.deepEqual(receipt.newly_curated_printed_pages,reviewed);
assert.equal(receipt.receipts.length,15);
for(const p of reviewed){
  const row=index.pages.find(r=>r.printed_page===p);
  const attest=receipt.receipts.find(r=>r.printed_page===p);
  assert.equal(row.review_status,'CURATED_NOTES');
  assert.equal(row.pdf_page,p+10);
  assert.equal(attest.ocr_sha256,row.ocr_sha256);
  assert.equal(attest.has_ocr,row.has_ocr);
  assert.deepEqual([...attest.concept_ids].sort(),[...row.concept_ids].sort());
  assert.match(attest.render_sha256,/^[a-f0-9]{64}$/);
  const ocr=extraction.pages[p+9].text;
  assert.equal(createHash('sha256').update(ocr,'utf8').digest('hex'),attest.ocr_sha256);
  if(p>=242){assert.deepEqual(row.concept_ids,[]);assert.ok(!lens.pages.includes(p));}
  if(p===242||p===244){assert.equal(row.has_ocr,false);assert.match(attest.visual_review,/blank divider; OCR gap confirmed/);}
}
assert.match(receipt.receipts.find(r=>r.printed_page===243).visual_review,/Part 2 Evaluation and Management title divider/);
for(const id of lens.concept_ids){const concept=map.concepts.find(c=>c.id===id);assert.ok(concept.pages.some(p=>content.includes(p)),`${id} needs a reviewed content anchor`);}
const coverage=priceActionReviewCoverage(index,extraction,map,8);
assert.deepEqual(coverage.totals,{pages:34,reviewed_pages:34,remaining_pages:0});
assert.equal(coverage.chapters[0].next_review,null);
assert.deepEqual(coverage.chapters[0].remaining_without_ocr_printed_pages,[]);
assert.ok(priceActionReviewCoverage(index,extraction,map).totals.reviewed_pages>=319);
console.log('CHAPTER 8 FINAL SOURCE REVIEW PASS: printed 230-244 / PDF 240-254, blank OCR gaps and Part 2 divider attested; full interval reviewed with source-only authority.');
