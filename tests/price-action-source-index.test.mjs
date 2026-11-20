import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {buildPriceActionSourceIndex,searchPriceActionSource,formatPriceActionCompactLookupModule} from '../scripts/price-action-source-index.mjs';

const map=JSON.parse(readFileSync(new URL('../docs/price_action_knowledge_map.json',import.meta.url),'utf8'));
const committed=JSON.parse(readFileSync(new URL('../docs/price_action_page_index.json',import.meta.url),'utf8'));
function fixture(){
  const pages=Array.from({length:438},(_,i)=>({pdf_page:i+1,text:'',has_text:false}));
  for(const [page,text] of [[118,'Figure 5 . 10: POWERBAR with inside\nbar. Figure 5.10 also discussed.'],[119,'Figure 5.10 inside bar variants; OCR is not a rule.'],[140,'Figure 5.17: trend versus range and competing wider structure.'],[190,'Figure 7.1: reversal break into trending 25EMA; failure is a context review.'],[194,'Figure 7.2: mature reversal structure and reclaiming the broken barrier.'],[260,'March session notes. Ceiling test resistance exit missed by a few pips.'],[261,'March session: short for failure. Choppy round number skirmish.'],[262,'March session: false high in the signal bar.'],[263,'March session: sideways action despite a 00 level magnet.'],[431,'Final words.']])Object.assign(pages[page-1],{text,has_text:true});
  for(const [page,text] of [[397,'Compounding calculator arithmetic and chosen risk percentage.'],[398,'Uneven weekly results and compounding assumptions.'],[399,'EUR/USD account currency conversion and stop distance.'],[400,'Verify actual risk and broker order-ticket unit convention.'],[405,'Chapter 11 low volatility and provider tick context.'],[406,'Low volatility strategic adaptation and selective continuation.'],[407,'Lengthy box progression meaningful buildup and technical protection.'],[408,'Thin lunch hour continuation and 200 tick review.'],[409,'Lengthy box fight adverse round magnet tease second break.'],[410,'False premature break later squeeze limited room magnet.'],[411,'Adverse magnet slow continuation firm footing buildup.'],[412,'EMA25 squeeze adverse magnet reversal exit concern.'],[36,'Slightly premature tease break ceiling test.'],[37,'Figure 2.7 ceiling test pullback former support.'],[38,'Ceiling test bounce second attack persistence.'],[39,'Figure 2.8 bullish bearish ceiling test probability.'],[41,'Round number fight favorable adverse magnet dominant pressure.'],[42,'Low volatility 00 50 20 levels adaptation.'],[15,'Seven theory principles foundation overview.'],[22,'False break participation contrarian pressure reversal.']])Object.assign(pages[page-1],{text,has_text:true});
  return {schema:'quantsmart.price-action-pdf-extraction/1',source:{sha256:map.source.sha256,pdf_pages:438},text_pages:30,pages};
}
test('source index preserves every page, OCR gaps, curated scope and canonical chapter/figure metadata',()=>{
  const extraction=fixture(),index=buildPriceActionSourceIndex(extraction,map);
  assert.equal(index.pages.length,438);assert.equal(index.coverage.ocr_pages,30);
  assert.equal(index.pages[0].chapter,null);assert.equal(index.pages[0].printed_page,null);
  assert.equal(index.pages[12].chapter,1);assert.equal(index.pages[12].printed_page,3);
  assert.equal(index.pages[431].section,'Back matter');
  assert.equal(index.pages[117].review_status,'CURATED_NOTES');
  assert.deepEqual(index.pages[117].figure_mentions,['5.10']);
  assert.ok(index.pages[117].concept_ids.includes('pattern_break_combi'));
  assert.equal(index.pages[259].case_month,'2012-03');
  assert.equal(index.pages[259].review_status,'CURATED_NOTES');
  assert.deepEqual(index.pages[259].concept_ids,['ceiling_test','consecutive_review']);
  assert.equal(index.pages[260].review_status,'CURATED_NOTES');
  assert.deepEqual(index.pages[260].concept_ids,['round_number','trade_selection_failure','consecutive_review']);
  assert.equal(index.pages[261].review_status,'CURATED_NOTES');
  assert.deepEqual(index.pages[261].concept_ids,['false_high_low','consecutive_review']);
  assert.equal(index.pages[262].review_status,'CURATED_NOTES');
  assert.deepEqual(index.pages[262].concept_ids,['round_number','consecutive_review']);
  assert.equal(index.pages[258].case_month,null);
  assert.equal(index.pages[391].case_month,'2012-08');
  assert.equal(index.pages[392].case_month,null);
  assert.equal(index.coverage.curated_pages,map.book_index.reduce((n,c)=>n+c.reviewed_printed_pages.length,0));
  for (const printedPage of [387, 388, 389, 390]) {
    const page=index.pages.find(row=>row.printed_page===printedPage);
    assert.equal(page.review_status,'CURATED_NOTES');
    assert.ok(page.concept_ids.includes('position_sizing'));
  }
  for (const printedPage of [395, 396, 397, 398]) {
    const page=index.pages.find(row=>row.printed_page===printedPage);
    assert.equal(page.review_status,'CURATED_NOTES');
    assert.deepEqual(page.concept_ids,['low_volatility']);
  }
  assert.equal(index.pages[117].text,undefined,'full copyrighted OCR remains local');
});
test('printed anchors derive from attested chapter ranges instead of a fixed PDF offset',()=>{
  const extraction=fixture(), shifted=structuredClone(map);
  shifted.book_index[0].printed_range=[103,104];
  const index=buildPriceActionSourceIndex(extraction,shifted);
  assert.equal(index.pages[12].printed_page,103);
  assert.equal(index.pages[13].printed_page,104);
  const result=searchPriceActionSource(index,extraction,shifted,{chapter:1,printedPage:103});
  assert.equal(result.total,1);
  const malformed=structuredClone(shifted);
  malformed.book_index[0].printed_range=[103,105];
  assert.throws(()=>buildPriceActionSourceIndex(extraction,malformed),/invalid printed\/PDF ranges/i);
});
test('OCR queries are bounded and combine chapter, page, figure and all-term matching',()=>{
  const extraction=fixture(),index=buildPriceActionSourceIndex(extraction,map);
  const result=searchPriceActionSource(index,extraction,map,{query:'POWERBAR inside bar',chapter:5,figure:'5.10'});
  assert.equal(result.total,1);assert.equal(result.results[0].pdf_page,118);
  assert.equal(result.results[0].text,undefined);
  const full=searchPriceActionSource(index,extraction,map,{printedPage:108,includeText:true});
  assert.equal(full.results[0].text,extraction.pages[117].text);
  const limited=searchPriceActionSource(index,extraction,map,{figure:'5.10',limit:1});
  assert.equal(limited.total,2);assert.equal(limited.returned,1);
  const heldOut=searchPriceActionSource(index,extraction,map,{query:'trend range',chapter:5,figure:'5.17'});
  assert.equal(heldOut.total,1);
  assert.equal(heldOut.results[0].printed_page,130);
  assert.deepEqual(heldOut.results[0].figure_mentions,['5.17']);
  const failureCase=searchPriceActionSource(index,extraction,map,{query:'reversal barrier',chapter:7,figure:'7.2'});
  assert.equal(failureCase.total,1);
  assert.equal(failureCase.results[0].printed_page,184);
  assert.equal(failureCase.results[0].review_status,'CURATED_NOTES');
  assert.deepEqual(failureCase.results[0].concept_ids,['support_resistance','buildup','trade_selection_failure','obstacle_room']);
  const marchCase=searchPriceActionSource(index,extraction,map,{query:'short failure round number',chapter:9,printedPage:251});
  assert.equal(marchCase.total,1);
  assert.equal(marchCase.results[0].review_status,'CURATED_NOTES');
  assert.equal(marchCase.results[0].case_month,'2012-03');
  assert.deepEqual(marchCase.results[0].concept_ids,['round_number','trade_selection_failure','consecutive_review']);
  for(const [printedPage,query,conceptIds] of [[250,'ceiling test resistance exit',['ceiling_test','consecutive_review']],[252,'false high signal bar',['false_high_low','consecutive_review']],[253,'sideways 00 level magnet',['round_number','consecutive_review']]]) {
    const result=searchPriceActionSource(index,extraction,map,{query,chapter:9,printedPage});
    assert.equal(result.total,1);
    assert.deepEqual(result.results[0].concept_ids,conceptIds);
    assert.equal(result.results[0].case_month,'2012-03');
  }
  assert.equal(searchPriceActionSource(index,extraction,map,{query:'absent'}).total,0);
  for(const [printedPage,query] of [[387,'calculator risk'],[388,'uneven weekly'],[389,'account currency stop'],[390,'risk broker unit']]){
    const sizing=searchPriceActionSource(index,extraction,map,{chapter:10,printedPage,query});
    assert.equal(sizing.total,1);
    assert.deepEqual(sizing.results[0].concept_ids,['position_sizing']);
    assert.equal(sizing.results[0].review_status,'CURATED_NOTES');
    assert.equal(sizing.results[0].pdf_page,printedPage+10);
  }
  for(const [printedPage,query] of [[5,'theory principles foundation overview'],[12,'false break participation contrarian pressure reversal']]){
    const ch2=searchPriceActionSource(index,extraction,map,{chapter:2,printedPage,query});
    assert.equal(ch2.total,1);
    assert.equal(ch2.results[0].review_status,'CURATED_NOTES');
    assert.equal(ch2.results[0].pdf_page,printedPage+10);
  }
  assert.deepEqual(searchPriceActionSource(index,extraction,map,{chapter:2,printedPage:5}).results[0].concept_ids,[]);
  assert.deepEqual(searchPriceActionSource(index,extraction,map,{chapter:2,printedPage:12}).results[0].concept_ids,['false_break']);
  for(const [printedPage,query] of [[31,'round number fight favorable adverse magnet'],[32,'low volatility 00 50 20 levels adaptation']]){
    const ch2=searchPriceActionSource(index,extraction,map,{chapter:2,printedPage,query});
    assert.equal(ch2.total,1);
    assert.deepEqual(ch2.results[0].concept_ids,['round_number']);
    assert.equal(ch2.results[0].review_status,'CURATED_NOTES');
    assert.equal(ch2.results[0].pdf_page,printedPage+10);
  }
  for(const [printedPage,query] of [[26,'premature tease ceiling test'],[27,'ceiling test pullback former support'],[28,'ceiling test bounce second attack persistence'],[29,'bullish bearish ceiling test probability']]){
    const ch2=searchPriceActionSource(index,extraction,map,{chapter:2,printedPage,query});
    assert.equal(ch2.total,1);
    assert.deepEqual(ch2.results[0].concept_ids,['tease_break','ceiling_test']);
    assert.equal(ch2.results[0].review_status,'CURATED_NOTES');
    assert.equal(ch2.results[0].pdf_page,printedPage+10);
  }
  for(const [printedPage,query] of [[395,'low volatility provider tick'],[396,'strategic adaptation selective continuation'],[397,'box progression buildup protection'],[398,'lunch hour continuation tick review'],[399,'box fight adverse round magnet'],[400,'premature squeeze limited room magnet'],[401,'adverse magnet slow continuation footing'],[402,'EMA25 squeeze adverse magnet reversal exit']]){
    const lowVol=searchPriceActionSource(index,extraction,map,{chapter:11,printedPage,query});
    assert.equal(lowVol.total,1);
    assert.deepEqual(lowVol.results[0].concept_ids,['low_volatility']);
    assert.equal(lowVol.results[0].review_status,'CURATED_NOTES');
    assert.equal(lowVol.results[0].pdf_page,printedPage+10);
  }
  assert.equal(searchPriceActionSource(index,extraction,map,{pdfPage:1}).results[0].has_ocr,false);
  for(const options of [{limit:101},{chapter:13},{pdfPage:0},{printedPage:422},{figure:'bad'},{query:'x'.repeat(501)}])assert.throws(()=>searchPriceActionSource(index,extraction,map,options));
});
test('mismatched extraction, altered metadata, OCR drift and missing pages fail closed',()=>{
  const extraction=fixture(),index=buildPriceActionSourceIndex(extraction,map);
  for(const change of [copy=>{copy.pages[117].chapter=4;},copy=>{copy.pages[117].review_status='NOT_CURATED';},copy=>{copy.source.sha256='0'.repeat(64);},copy=>{copy.pages.pop();}]){
    const copy=structuredClone(index);change(copy);
    assert.throws(()=>searchPriceActionSource(copy,extraction,map),/stale|inconsistent/);
  }
  const changed=structuredClone(extraction);changed.pages[117].text+=' changed';
  assert.throws(()=>searchPriceActionSource(index,changed,map),/stale|inconsistent/);
  const wrong=structuredClone(extraction);wrong.source.sha256='0'.repeat(64);
  assert.throws(()=>buildPriceActionSourceIndex(wrong,map),/hash/);
  const missing=structuredClone(extraction);missing.pages.pop();
  assert.throws(()=>buildPriceActionSourceIndex(missing,map),/every source page/);
  const count=structuredClone(extraction);count.text_pages=0;
  assert.throws(()=>buildPriceActionSourceIndex(count,map),/count/);
});
test('committed index carries all metadata with no copied page prose',()=>{
  assert.equal(committed.pages.length,438);assert.equal(committed.coverage.ocr_pages,425);
  assert.equal(committed.source.sha256,map.source.sha256);
  assert.ok(committed.coverage.curated_pages>=359);
  for(const [i,page] of committed.pages.entries()){
    assert.equal(page.pdf_page,i+1);assert.match(page.ocr_sha256,/^[a-f0-9]{64}$/);
    assert.equal(page.text,undefined);assert.equal(page.excerpt,undefined);
    const chapter=map.book_index.find(row=>page.pdf_page>=row.pdf_range[0]&&page.pdf_page<=row.pdf_range[1]);
    assert.equal(page.chapter,chapter?.number??null);
    assert.equal(page.printed_page,chapter?i-9:null);
    assert.equal(page.review_status,chapter?.reviewed_printed_pages.includes(page.printed_page)?'CURATED_NOTES':'NOT_CURATED');
  }
});
test('held-out source review fixtures resolve to curated page metadata without outcome or market-data claims',()=>{
  for(const fixture of map.held_out_source_fixtures){
    const lens=map.source_lenses.find(row=>row.id===fixture.lens_id);
    assert.ok(lens,fixture.id);
    for(const printedPage of fixture.pages){
      const page=committed.pages.find(row=>row.printed_page===printedPage);
      assert.ok(page,`${fixture.id}: printed ${printedPage} must resolve in the committed source index`);
      assert.equal(page.review_status,'CURATED_NOTES');
      assert.ok(page.concept_ids.some(id=>lens.concept_ids.includes(id)),`${fixture.id}: source page must retain a linked concept`);
    }
    assert.deepEqual(Object.keys(fixture).sort(),['data_status','id','lens_id','outcome_status','pages','status']);
    assert.equal(fixture.data_status,'UNAVAILABLE');
    assert.equal(fixture.outcome_status,'WITHHELD');
  }
});
test('CLI builds and reads local OCR without the original PDF',()=>{
  const dir=mkdtempSync(join(tmpdir(),'price-action-index-'));
  try{
    const extraction=join(dir,'extraction.json'),index=join(dir,'index.json');
    writeFileSync(extraction,JSON.stringify(fixture()));
    const script=fileURLToPath(new URL('../scripts/price-action-source-index.mjs',import.meta.url));
    const call=(...args)=>spawnSync(process.execPath,[script,'--extraction',extraction,'--index',index,...args],{encoding:'utf8',windowsHide:true});
    const built=call('--build');assert.equal(built.status,0,built.stderr);
    const queried=call('--printed-page','108','--text');assert.equal(queried.status,0,queried.stderr);
    assert.equal(JSON.parse(queried.stdout).results[0].text,fixture().pages[117].text);
    const invalid=call('--limit','999');assert.notEqual(invalid.status,0);
  }finally{
    assert.equal(dirname(resolve(dir)),resolve(tmpdir()));
    assert.ok(resolve(dir).startsWith(join(resolve(tmpdir()),'price-action-index-')));
    rmSync(dir,{recursive:true,force:true});
  }
});

test('compact chart knowledge lookup is reproducible and stays aligned with the attested map',()=>{
  const generated = formatPriceActionCompactLookupModule(map);
  const committedLookup = readFileSync(new URL('../mfe_ux_lab/cockpit/src/lib/priceActionKnowledgeLookup.ts', import.meta.url), 'utf8');
  assert.equal(committedLookup, generated);
  const script=fileURLToPath(new URL('../scripts/price-action-source-index.mjs',import.meta.url));
  const checked=spawnSync(process.execPath,[script,'--check','--extraction','missing-local-OCR.json'],{encoding:'utf8',windowsHide:true});
  assert.equal(checked.status,0,checked.stderr);
  assert.throws(()=>formatPriceActionCompactLookupModule({...map,authority:'LIVE'}),/provenance/);
  const dir=mkdtempSync(join(tmpdir(),'price-action-compact-'));
  try {
    const output=join(dir,'lookup.ts');
    writeFileSync(output, generated.replace('source.concepts.find','source.concepts.filter'));
    const call=(...args)=>spawnSync(process.execPath,[script,'--output',output,'--extraction','missing-local-OCR.json',...args],{encoding:'utf8',windowsHide:true});
    const stale=call('--check');
    assert.notEqual(stale.status,0);
    assert.match(stale.stderr,/stale/);
    assert.equal(call('--compact-lookup').status,0);
    assert.equal(readFileSync(output,'utf8'),generated);
    assert.equal(call('--check').status,0);
    const before=readFileSync(output,'utf8');
    assert.notEqual(call('--check','--compact-lookup').status,0,'a check must never silently become a write');
    assert.equal(readFileSync(output,'utf8'),before);
  } finally {
    assert.equal(dirname(resolve(dir)),resolve(tmpdir()));
    assert.ok(resolve(dir).startsWith(join(resolve(tmpdir()),'price-action-compact-')));
    rmSync(dir,{recursive:true,force:true});
  }
});





test('reviewed Chapter 3 divider has no OCR or invented concept attribution', () => {
  const blank = committed.pages.find(row => row.printed_page === 66);
  assert.equal(blank.pdf_page, 76);
  assert.equal(blank.chapter, 3);
  assert.equal(blank.review_status, 'CURATED_NOTES');
  assert.equal(blank.has_ocr, false);
  assert.deepEqual(blank.concept_ids, []);
});


test('Chapter 4 blank divider is reviewed without adding source concepts', () => {
  const blank = committed.pages.find(row => row.printed_page === 72);
  assert.equal(blank.pdf_page, 82);
  assert.equal(blank.chapter, 4);
  assert.equal(blank.review_status, 'CURATED_NOTES');
  assert.equal(blank.has_ocr, false);
  assert.deepEqual(blank.concept_ids, []);
  for (const printedPage of [78,79,80,81,82,83,84,85]) {
    const page=committed.pages.find(row=>row.printed_page===printedPage);
    assert.equal(page.review_status,'CURATED_NOTES');
    assert.ok(page.concept_ids.includes('pattern_break'));
  }
});


test('Chapter 5 pages 86-96 retain source-only continuation and magnet cautions', () => {
  for (const printedPage of Array.from({length:11}, (_,i)=>i+86)) {
    const page=committed.pages.find(row=>row.printed_page===printedPage);
    assert.equal(page.review_status,'CURATED_NOTES');
    assert.ok(page.concept_ids.includes('pattern_break'));
  }
});
