import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),"utf8"));
const map=read("../docs/price_action_knowledge_map.json");
const index=read("../docs/price_action_page_index.json");
const receipt=read("../artifacts/chapter8-recap-source-review-221-229.json");
const pages=Array.from({length:9},(_,i)=>221+i);
const chapter=map.book_index.find(row=>row.number===8);
const lens=map.source_lenses.find(row=>row.id==="chapter8_recap_session_examples_context");
const fixture=map.held_out_source_fixtures.find(row=>row.id==="chapter-8-recap-review-221-229");
assert.deepEqual(chapter.reviewed_printed_pages,Array.from({length:34},(_,i)=>211+i));
assert.deepEqual(lens.pages,pages);
assert.deepEqual(fixture.pages,pages);
assert.equal(lens.implementation,"SOURCE_NOTES");
assert.equal(fixture.status,"SOURCE_REVIEW_ONLY");
assert.equal(fixture.data_status,"UNAVAILABLE");
assert.equal(fixture.outcome_status,"WITHHELD");
for(const expected of [/p\. 221:.*blocky.*angular/i,/p\. 222-223:.*UK Open.*technical test/i,/p\. 224-225:.*false high.*50-level/i,/p\. 226-227:.*manual.*unproven failure/i,/p\. 228-229:.*technical test.*conservative/i]) assert.ok(lens.cues.some(cue=>expected.test(cue)),expected.source);
for(const expected of [/EUR\/USD.*15-pip/i,/Figure 8\.5-8\.8 OHLC/i,/automatic detector rule/i,/fresh opposing entry/i,/SHADOW_ONLY/i]) assert.ok(lens.abstain.some(cue=>expected.test(cue)),expected.source);
for(const page of pages){const row=index.pages.find(r=>r.printed_page===page);assert.equal(row.review_status,"CURATED_NOTES");assert.equal(row.pdf_page,page+10);assert.equal(row.has_ocr,true);}
assert.equal(receipt.source_sha256,map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages,pages);
assert.deepEqual(receipt.newly_curated_printed_pages,pages);
assert.equal(receipt.receipts.length,9);
assert.equal(receipt.receipts[0].printed_page,221);
assert.match(receipt.receipts[0].visual_review,/Continuation of Figure 8\.4/);
assert.match(receipt.receipts.at(-1).visual_review,/Figure 8\.8/);
for(const id of lens.concept_ids){const concept=map.concepts.find(c=>c.id===id);assert.ok(concept.pages.some(page=>pages.includes(page)),`${id} needs a Chapter 8 continuation page anchor`);}
console.log("CHAPTER 8 CONTINUATION SOURCE REVIEW PASS: printed pp. 221-229 / PDF pp. 231-239 curated source-only.");
