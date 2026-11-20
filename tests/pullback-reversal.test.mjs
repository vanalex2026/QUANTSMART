import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../mfe_ux_lab/cockpit/',import.meta.url));
const require=createRequire(app+'package.json'),{build}=require('esbuild');
const b=await build({stdin:{contents:"export * from './src/lib/pullbackReversal.ts'; export * from './src/lib/priceActionDetector.ts';",resolveDir:app},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const epoch=Date.parse('2026-01-05T00:00:00Z');
const bar=(o,h,l,c)=>({t:'',o,h,l,c,closed:true});
const timed=rows=>rows.map((b,i)=>({...b,t:new Date(epoch+i*300000).toISOString()}));
const mirror=rows=>rows.map(b=>({...b,o:200-b.o,h:200-b.l,l:200-b.h,c:200-b.c}));
function fixture(extra=0){
  const dominant=Array.from({length:6},(_,i)=>bar(100+i,101.1+i,99.9+i,100.9+i));
  const correction=[bar(105.9,106,104.9,105.1),bar(105.1,105.2,104.1,104.2),bar(104.2,104.3,103.1,103.2),...Array.from({length:extra},()=>bar(103.25,104,103.1,103.7)),bar(103.25,103.95,103.1,103.85)];
  return timed([...Array.from({length:40-dominant.length-correction.length-1},()=>bar(103,103.5,102.5,103)),...dominant,...correction,bar(103.9,104.4,103.4,104.2)]);
}
function secondFixture(){
  const dominant=Array.from({length:6},(_,i)=>bar(100+i,101.1+i,99.9+i,100.9+i));
  const correction=[bar(105.9,106,104.9,105.1),bar(105.1,105.2,104.1,104.2),bar(104.2,104.3,103.1,103.2),bar(103.25,103.95,103.1,103.85),bar(103.9,104.4,103.4,104.2),bar(104.1,104.2,103.2,103.5),bar(103.5,104.05,103.15,103.95)];
  return timed([...Array.from({length:26},()=>bar(103,103.5,102.5,103)),...dominant,...correction,bar(103.95,104.55,103.65,104.3)]);
}
test('separate EMA-tested first break, adverse return and second signal retain mirrored M/W chronology',()=>{
  for(const down of [false,true]){
    const rows=down?mirror(secondFixture()):secondFixture(),found=api.observePullbackReversal(rows);
    assert.ok(found.detected,found.reason);
    const sequence=found.setup.breakSequence;
    assert.equal(sequence.kind,'SECOND_CLOSE_BREAK');
    assert.equal(sequence.firstSignalTime,rows.at(-5).t);assert.equal(sequence.firstBreakTime,rows.at(-4).t);
    assert.equal(sequence.counterTime,rows.at(-3).t);assert.equal(found.setup.signalBarTime,rows.at(-2).t);
    assert.equal(found.setup.confirmationTime,rows.at(-1).t);
    assert.equal(api.observePullbackReversal(down?mirror(fixture()):fixture()).setup.breakSequence.kind,'FIRST_CLOSE_BREAK');
    for(const [index,mutate] of [
      r=>{r.at(-4).c=103.94;},r=>{r.at(-4).o=104;},r=>{r.at(-4).l=103;},
      r=>{r.at(-3).o=103.4;r.at(-3).c=103.7;},r=>{r.at(-3).c=104;r.at(-3).o=104.1;},
      r=>{r.at(-5).o=103.9;},
    ].entries()){
      const changed=secondFixture();mutate(changed);const result=api.observePullbackReversal(down?mirror(changed):changed);
      assert.ok(!result.detected||result.setup.breakSequence.kind==='FIRST_CLOSE_BREAK',`mutation ${index}, mirrored ${down}: no phantom second attempt when its first break or return is missing`);
    }
    const future=timed([...rows,bar(104.3,110,95,100)]);
    const evidence=api.measurePriceActionEvidence(future).pullback_reversal.history.find(h=>h.time===rows.at(-1).t);
    assert.deepEqual(evidence.setup,found.setup);
    const lifted=secondFixture();
    Object.assign(lifted.at(-2),{o:103.7,h:104.1,l:103.7,c:104.05});
    Object.assign(lifted.at(-1),{o:104.05,h:104.55,l:103.85,c:104.4});
    const extended=api.observePullbackReversal(down?mirror(lifted):lifted);
    assert.ok(extended.detected,extended.reason);
    assert.equal(extended.setup.breakSequence.kind,'SECOND_CLOSE_BREAK');
    assert.ok(Math.abs((down?200-103.7:103.7)-extended.setup.protectionReference)>.35*extended.setup.baseline,'second signal can sit beyond the original extreme tolerance after a tested first attempt');
    const missingFirst=structuredClone(lifted);missingFirst.at(-4).c=103.94;
    assert.equal(api.observePullbackReversal(down?mirror(missingFirst):missingFirst).detected,false,'extension requires the earlier confirmed break');
  }
});
test('EMA-tested proportionate correction retains dominant leg, turn, protection and close-confirmation identity in both directions',()=>{
  for(const extra of [0,1,2])for(const down of [false,true]){
    const rows=down?mirror(fixture(extra)):fixture(extra),found=api.observePullbackReversal(rows);
    assert.equal(found.detected,true,found.reason);assert.equal(found.setup.direction,down?'DOWN':'UP');
    assert.equal(found.setup.version,'pullback-reversal-close-confirmation/3');
    assert.equal(found.setup.dominantTimes.length,6);assert.equal(found.setup.correctionTimes.length,4+extra);
    assert.equal(found.setup.signalBarTime,rows.at(-2).t);assert.equal(found.setup.confirmationTime,rows.at(-1).t);
    assert.ok(found.setup.retracementFraction>=.4&&found.setup.retracementFraction<=.65);
    assert.ok(found.setup.correctionRangeRatio<=1);assert.ok(found.setup.technicalTest);
    assert.ok(found.setup.turnTimes.at(-1)===rows.at(-2).t);
    const marker=api.detectM5PriceAction(rows).markers.find(m=>m.conceptId==='pullback_reversal');
    assert.ok(marker);assert.deepEqual(marker.setup,found.setup);
  }
});
test('unprepared, premature, oversized, untested, ambiguous and noncausal inputs abstain',()=>{
  for(const mutate of [
    rows=>rows.pop(),rows=>{rows.at(-1).c=103.94;},rows=>{rows.at(-1).o=104;},rows=>{rows.at(-1).l=103;},
    rows=>{rows.at(-2).c=103.3;},rows=>{rows.at(-2).l=102;},rows=>{rows.at(-4).h=110;},
    rows=>{rows.at(-4).h=106.5;},
    rows=>{for(let i=0;i<25;i++)rows[i]=bar(110,111,109,110);},
    rows=>{rows[1].closed=false;},rows=>{rows[1].h=NaN;},rows=>{rows[1].t=rows[0].t;},
    rows=>{rows.splice(10,1);},
  ]){const rows=fixture();mutate(rows);assert.equal(api.observePullbackReversal(rows).detected,false);}
});
test('all historical occurrences reproduce their prefix; future outcomes cannot rewrite a setup',()=>{
  const rows=fixture(),expected=api.observePullbackReversal(rows).setup;
  for(const close of [50,150]){
    const tape=timed([...rows,bar(104.2,Math.max(105,close),Math.min(103,close),close)]);
    const h=api.measurePriceActionEvidence(tape).pullback_reversal.history.find(h=>h.time===rows.at(-1).t);
    assert.ok(h);assert.deepEqual(h.setup,expected);assert.equal(h.nextBar,close>104.2?'UP':'DOWN');
  }
  const tape=timed(Array.from({length:90},(_,i)=>i%2?mirror(fixture()):fixture()).flat());
  const evidence=api.measurePriceActionEvidence(tape).pullback_reversal;
  assert.ok(evidence.occurrences>80);assert.equal(evidence.history.length,evidence.occurrences);
  for(const h of evidence.history)assert.deepEqual(api.observePullbackReversal(tape.slice(0,h.i+1)).setup,h.setup);
});
test('actual chart includes entire dominant/correction structure and source references separately from ATR outcomes',async()=>{
  const output=await build({stdin:{contents:"export {PatternInspectionChart} from './src/components/PatternInspectionChart.tsx'; export {PullbackReversalEvidence} from './src/components/PullbackReversalEvidence.tsx'; export {patternInspectionWindow} from './src/lib/patternInspectionWindow.ts';",resolveDir:app},bundle:true,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],write:false,logLevel:'silent'});
  const mod={exports:{}};new Function('require','module','exports',output.outputFiles[0].text)(require,mod,mod.exports);
  const {createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const rows=fixture(2),setup=api.observePullbackReversal(rows).setup;
  const view=mod.exports.patternInspectionWindow(rows,rows.at(-1).t,'bullish',true,'setup',setup);
  assert.equal(view.rows[0].t,setup.contextStart);assert.equal(view.rows.at(-1).t,setup.confirmationTime);
  const html=renderToStaticMarkup(createElement(mod.exports.PatternInspectionChart,{view,label:'Pullback reversal',setup}));
  assert.match(html,/data-reversal-structure="true"/);assert.match(html,/Dominant leg origin/);assert.match(html,/Dominant directional extreme/);
  assert.match(html,/Bounded EMA25 at reversal signal/);assert.match(html,/A = leg origin/);assert.doesNotMatch(html,/data-pullback-structure=/);
  assert.match(html,/data-reversal-part="Dominant leg origin"/);assert.match(html,/data-reversal-part="Signal bar"/);
  const evidence=renderToStaticMarkup(createElement(mod.exports.PullbackReversalEvidence,{setup}));
  assert.match(evidence,/pullback-reversal-close-confirmation\/3/);assert.match(evidence,/Previous nine-bar retracement-only occurrences are replaced/);
  for(const down of [false,true]){
    const second=down?mirror(secondFixture()):secondFixture(),receipt=api.observePullbackReversal(second).setup;
    // Real view rows may use the equivalent ISO representation with milliseconds.
    const normalized=second.map(row=>({...row,t:new Date(row.t).toISOString().replace('.000Z','Z')}));
    const secondView=mod.exports.patternInspectionWindow(normalized,receipt.confirmationTime,down?'bearish':'bullish',true,'setup',receipt);
    const chart=renderToStaticMarkup(createElement(mod.exports.PatternInspectionChart,{view:secondView,label:'Pullback reversal',setup:receipt}));
    assert.match(chart,/data-second-reversal-break="true"/);
    for(const meaning of ['First reversal signal','First close break','Opposing return after first break'])assert.ok(chart.includes(`data-reversal-part="${meaning}"`));
    assert.match(chart,/S1 = first signal/);assert.match(chart,/C1 = first close break/);assert.match(chart,/R = opposing return/);
    const panel=renderToStaticMarkup(createElement(mod.exports.PullbackReversalEvidence,{setup:receipt}));
    assert.match(panel,/data-reversal-break-sequence="SECOND_CLOSE_BREAK"/);assert.match(panel,/bounded close-only M\/W proxy/);
  }
});
