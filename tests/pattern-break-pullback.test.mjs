import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
const app=fileURLToPath(new URL('../mfe_ux_lab/cockpit/',import.meta.url));
const require=createRequire(app+'package.json'),{build}=require('esbuild');
const output=await build({stdin:{contents:"export * from './src/lib/patternBreakPullback.ts'; export * from './src/lib/priceActionDetector.ts';",resolveDir:app},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const epoch=Date.parse('2026-01-05T00:00:00Z');
const bar=(o,h,l,c)=>({t:'',o,h,l,c,closed:true});
const timed=rows=>rows.map((b,i)=>({...b,t:new Date(epoch+i*300000).toISOString()}));
const mirror=rows=>rows.map(b=>({...b,o:200-b.o,h:200-b.l,l:200-b.h,c:200-b.c}));
function fixture(variant='RETURN_TEST',count=2){
  const warm=Array.from({length:40-6-1-count-1},()=>bar(100.7,101.2,100.2,100.7));
  const context=Array.from({length:6},(_,i)=>bar(100.3,100.8,99.8,100.35+i*.06));
  const original=variant==='RETURN_TEST'?bar(100.6,101.8,100.5,101.5):bar(100.6,101.2,100.5,101.0);
  const pullback=Array.from({length:count},(_,i)=>i===count-1?bar(100.75,101.05,100.65,100.97):i%2===0?bar(101.05,101.15,100.75,100.85):bar(100.8,101.05,100.7,100.95));
  return timed([...warm,...context,original,...pullback,bar(100.99,101.5,100.8,101.35)]);
}
test('both post-break variants retain exact causal receipts in both directions',()=>{
  for(const variant of ['RETURN_TEST','HANGING'])for(const count of variant==='HANGING'?[2,4,6]:[1,2,4,6])for(const down of [false,true]){
    const rows=down?mirror(fixture(variant,count)):fixture(variant,count);
    const found=api.observePatternBreakPullback(rows);assert.equal(found.detected,true,`${variant}/${count}/${down}: ${found.reason}`);
    assert.equal(found.setup.variant,variant);assert.equal(found.setup.direction,down?'DOWN':'UP');
    assert.equal(found.setup.pullbackTimes.length,count);assert.equal(found.setup.originalBreakTime,rows.at(-count-2).t);
    assert.equal(found.setup.signalBarTime,rows.at(-2).t);assert.equal(found.setup.confirmationTime,rows.at(-1).t);
    const marker=api.detectM5PriceAction(rows).markers.find(m=>m.conceptId==='pattern_break_pullback');
    assert.ok(marker);assert.deepEqual(marker.setup,found.setup);assert.deepEqual(marker.pageAnchors,[97,99,100,101,102,104]);
  }
});
test('incomplete, unprepared, undone, untested, premature and ambiguous structures abstain',()=>{
  for(const mutate of [
    rows=>rows.pop(),
    rows=>{rows.at(-4).c=100.7;},
    rows=>{rows.at(-3).c=100.1;rows.at(-3).l=100;},
    rows=>{rows.at(-2).l=101;rows.at(-2).o=101.1;rows.at(-2).c=101.15;rows.at(-2).h=101.2;},
    rows=>{for(let i=0;i<25;i++){rows[i].o=110;rows[i].c=110;rows[i].h=111;rows[i].l=109;}},
    rows=>{rows.at(-2).c=100.7;},
    rows=>{rows.at(-1).c=101.04;},
    rows=>{rows.at(-1).o=101.1;},
    rows=>{rows.at(-1).l=100.6;},
    rows=>{rows[1].closed=false;},
    rows=>{rows[3].h=NaN;},
    rows=>{rows[1].t=rows[0].t;},
    rows=>{for(let i=4;i<rows.length;i++)rows[i].t=new Date(Date.parse(rows[i].t)+86400000).toISOString();},
  ]){const rows=fixture();mutate(rows);assert.equal(api.observePatternBreakPullback(rows).detected,false);}
});
test('prefix identity, bounded EMA seed and full retained history are independent of future outcomes',()=>{
  const setup=fixture(),expected=api.observePatternBreakPullback(setup);
  for(const close of [99,103]){
    const rows=timed([...setup,bar(101.35,Math.max(102,close),Math.min(101,close),close)]);
    const occurrence=api.measurePriceActionEvidence(rows).pattern_break_pullback.history.find(r=>r.time===setup.at(-1).t);
    assert.ok(occurrence);assert.deepEqual(occurrence.setup,expected.setup);assert.equal(occurrence.score,expected.score);
    assert.equal(occurrence.nextBar,close>101.35?'UP':'DOWN');
  }
  const tape=timed(Array.from({length:90},(_,i)=>i%2?mirror(fixture('HANGING',6)):fixture()).flat());
  const evidence=api.measurePriceActionEvidence(tape).pattern_break_pullback;
  assert.ok(evidence.occurrences>80);assert.equal(evidence.history.length,evidence.occurrences);
  for(const occurrence of evidence.history){
    const result=api.observePatternBreakPullback(tape.slice(0,occurrence.i+1));
    assert.ok(result.detected);assert.deepEqual(result.setup,occurrence.setup);
  }
  const prefix=timed([...Array.from({length:10},()=>bar(50,51,49,50)),...setup]);
  const result=api.observePatternBreakPullback(prefix);
  assert.equal(result.setup.emaAtSignal,expected.setup.emaAtSignal,'older prices are outside the explicit bounded EMA estimate');
});
test('actual mini chart preserves X/T/S/C, original boundary and EMA estimate separately from ATR',async()=>{
  const built=await build({stdin:{contents:"export {PatternInspectionChart} from './src/components/PatternInspectionChart.tsx'; export {patternInspectionWindow} from './src/lib/patternInspectionWindow.ts';",resolveDir:app},bundle:true,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],write:false,logLevel:'silent'});
  const mod={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,mod,mod.exports);
  const {createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const rows=fixture('HANGING',6),setup=api.observePatternBreakPullback(rows).setup;
  const view=mod.exports.patternInspectionWindow(rows,rows.at(-1).t,'bullish',true,'setup',setup);
  assert.equal(view.rows[0].t,setup.contextStart);
  const html=renderToStaticMarkup(createElement(mod.exports.PatternInspectionChart,{view,label:'Pattern break pullback',setup}));
  for(const part of ['Original boundary break','Post-break test bar 1','Signal bar','Close confirmation'])assert.ok(html.includes(`data-pullback-part="${part}"`));
  assert.match(html,/data-pullback-structure="HANGING"/);assert.match(html,/Broken pattern boundary/);assert.match(html,/Bounded EMA25 estimate/);
  assert.doesNotMatch(html,/data-combi-part|data-pattern-break-part/);
  assert.match(readFileSync(app+'src/components/ChartPatternInspector.tsx','utf8'),/Original-break trade quality, wider dominance/);
});
