import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),"utf8"));
const map=read("../docs/price_action_knowledge_map.json");
const index=read("../docs/price_action_page_index.json");
const receipt=read("../artifacts/chapter8-recap-source-review-212-220.json");
const pages=Array.from({length:9},(_,i)=>212+i);
const chapter=map.book_index.find(row=>row.number===8);
const lens=map.source_lenses.find(row=>row.id==="chapter8_recap_conditions_and_reclaim");
const fixture=map.held_out_source_fixtures.find(row=>row.id==="chapter-8-recap-review-212-220");
assert.deepEqual(chapter.reviewed_printed_pages,Array.from({length:34},(_,i)=>211+i));
assert.deepEqual(lens.pages,pages);
assert.deepEqual(fixture.pages,pages);
assert.equal(lens.implementation,"SOURCE_NOTES");
assert.equal(fixture.status,"SOURCE_REVIEW_ONLY");
assert.equal(fixture.data_status,"UNAVAILABLE");
assert.equal(fixture.outcome_status,"WITHHELD");
for(const expected of [/p\. 212:.*five setup families/i,/p\. 213:.*seven common errors/i,/p\. 214-215:.*valid reversal exit/i,/p\. 216-217:.*spike without buildup/i,/p\. 218:.*reclaims it/i,/p\. 219:.*in line with dominance/i,/p\. 220:.*thick M-pattern/i]) assert.ok(lens.cues.some(cue=>expected.test(cue)),expected.source);
for(const expected of [/EUR\/USD.*20\/10-pip/i,/Figure 8\.1-8\.4 OHLC/i,/later printed follow-through/i,/reversal exit with a fresh opposing entry/i,/continues on p\. 221.*outside this review/i,/SHADOW_ONLY/i]) assert.ok(lens.abstain.some(cue=>expected.test(cue)),expected.source);
for(const page of pages){const row=index.pages.find(r=>r.printed_page===page);assert.equal(row.review_status,"CURATED_NOTES");assert.equal(row.pdf_page,page+10);assert.equal(row.has_ocr,true);}
assert.equal(receipt.source_sha256,map.source.sha256);
assert.deepEqual(receipt.reviewed_printed_pages,pages);
assert.deepEqual(receipt.newly_curated_printed_pages,pages);
assert.equal(receipt.receipts.length,9);
assert.equal(receipt.receipts.at(-1).printed_page,220);
assert.match(receipt.receipts.at(-1).visual_review,/continues on unreviewed/);
for(const id of lens.concept_ids){const concept=map.concepts.find(c=>c.id===id);assert.ok(concept.pages.some(page=>pages.includes(page)),`${id} needs a Chapter 8 page anchor`);}
console.log("CHAPTER 8 RECAP SOURCE REVIEW PASS: printed pp. 212-220 / PDF pp. 222-230 curated source-only; Figure 8.4 continuation boundary attested.");
