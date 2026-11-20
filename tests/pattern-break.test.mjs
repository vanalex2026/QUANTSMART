import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
const app=fileURLToPath(new URL('../mfe_ux_lab/cockpit/',import.meta.url));
const require=createRequire(app+'package.json'),{build}=require('esbuild');
const output=await build({stdin:{contents:"export * from './src/lib/patternBreak.ts'; export * from './src/lib/priceActionDetector.ts';",resolveDir:app},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const epoch=Date.parse('2026-01-05T00:00:00Z');
const bar=(i,o,h,l,c)=>({t:new Date(epoch+i*300000).toISOString(),o,h,l,c,closed:true});
function fixture(count=4){
  const context=Array.from({length:4},(_,i)=>bar(i,99.6+i*.15,100.5+i*.1,99.5+i*.1,99.7+i*.15));
  const buildup=Array.from({length:count},(_,i)=>i===count-1?bar(4+i,100.4,100.82,100.3,100.76):i%2===0?bar(4+i,100.7,100.8,100.2,100.4):bar(4+i,100.4,100.78,100.25,100.7));
  return [...context,...buildup,bar(4+count,100.7,101.3,100.5,101.1)];
}
const mirror=rows=>rows.map(b=>({...b,o:200-b.o,h:200-b.l,l:200-b.h,c:200-b.c}));
test('boundary buildup retains exact structure in both directions and four-to-six bar variants',()=>{
  for(const count of [4,5,6])for(const down of [false,true]){
    const rows=down?mirror(fixture(count)):fixture(count);
    const observed=api.observePatternBreak(rows);assert.equal(observed.detected,true);
    assert.equal(observed.setup.direction,down?'DOWN':'UP');
    assert.equal(observed.setup.buildupTimes.length,count);
    assert.deepEqual(observed.setup.boundaryTouchTimes,rows.slice(4,-1).map(b=>b.t));
    assert.equal(observed.setup.signalBarTime,rows.at(-2).t);
    assert.equal(observed.setup.confirmationTime,rows.at(-1).t);
    assert.equal(observed.setup.contextBoundary,down?Math.min(...rows.slice(0,4).map(b=>b.l)):Math.max(...rows.slice(0,4).map(b=>b.h)));
    const result=api.detectM5PriceAction(rows),marker=result.markers.find(m=>m.conceptId==='pattern_break');
    assert.ok(marker);assert.deepEqual(marker.setup,observed.setup);assert.deepEqual(marker.pageAnchors,[73,74,75,76,77]);
    assert.equal(marker.i,rows.length-1);assert.equal(marker.time,observed.setup.confirmationTime);
  }
});
test('premature, opposing, detached, unprepared, wick-only and ambiguous breaks are excluded',()=>{
  for(const mutate of [
    rows=>{rows[3].c=99.5;},
    rows=>{rows[4].l=98;},
    rows=>{for(let i=4;i<rows.length-1;i++){rows[i].o=100.4;rows[i].c=100.7;}},
    rows=>{rows.at(-2).c=100.35;},
    rows=>{rows.at(-1).c=100.79;},
    rows=>{rows.at(-1).o=100.9;},
    rows=>{rows.at(-1).l=100.1;},
    rows=>{rows[5].closed=false;},
    rows=>{rows[5].h=NaN;},
    rows=>{for(let i=6;i<rows.length;i++)rows[i].t=new Date(Date.parse(rows[i].t)+86400000).toISOString();},
  ]){const rows=fixture();mutate(rows);assert.equal(api.observePatternBreak(rows).detected,false);}
  assert.equal(api.observePatternBreak(fixture().slice(0,-1)).detected,false);
});
test('future mutation changes outcomes but never past structure; full history agrees with prefix detector',()=>{
  const rows=fixture(),expected=api.observePatternBreak(rows);
  for(const close of [90,110]){
    const next=bar(rows.length,101,Math.max(101,close)+.1,Math.min(101,close)-.1,close);
    const evidence=api.measurePriceActionEvidence([...rows,next]).pattern_break;
    const occurrence=evidence.history.find(r=>r.time===rows.at(-1).t);
    assert.ok(occurrence);assert.deepEqual(occurrence.setup,expected.setup);assert.equal(occurrence.score,expected.score);
    assert.equal(occurrence.nextBar,close>rows.at(-1).c?'UP':'DOWN');
  }
  const tape=Array.from({length:100},(_,i)=>i%2?mirror(fixture(6)):fixture(4)).flat().map((b,i)=>({...b,t:new Date(epoch+i*300000).toISOString()}));
  const evidence=api.measurePriceActionEvidence(tape).pattern_break;
  assert.ok(evidence.occurrences>80);assert.equal(evidence.history.length,evidence.occurrences);
  assert.equal(evidence.outcomes.up+evidence.outcomes.down+evidence.outcomes.flat,evidence.occurrences);
  for(const occurrence of evidence.history){
    const current=api.observePatternBreak(tape.slice(Math.max(0,occurrence.i-13),occurrence.i+1));
    assert.ok(current.detected);assert.deepEqual(current.setup,occurrence.setup);
  }
});
test('actual mini chart renders buildup/signal/confirmation and distinct boundary references',async()=>{
  const built=await build({stdin:{contents:"export {PatternInspectionChart} from './src/components/PatternInspectionChart.tsx'; export {patternInspectionWindow} from './src/lib/patternInspectionWindow.ts';",resolveDir:app},bundle:true,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],write:false,logLevel:'silent'});
  const mod={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,mod,mod.exports);
  const {createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const rows=fixture(6),setup=api.observePatternBreak(rows).setup;
  const view=mod.exports.patternInspectionWindow(rows,rows.at(-1).t,'bullish',true,'setup',setup);
  assert.equal(view.from,0,'all four context and six buildup bars must remain visible');
  assert.equal(view.rows.length,11);
  assert.ok(view.low<setup.protectionReference && view.high>setup.breakoutLevel);
  const shifted=rows.map((b,i)=>i<3?{...b,t:new Date(Date.parse(b.t)-300000).toISOString()}:b);
  assert.equal(mod.exports.patternInspectionWindow(shifted,rows.at(-1).t,'bullish',true,'setup',setup).from,3,'structural context must stop at a data gap');
  assert.equal(mod.exports.patternInspectionWindow(rows,rows.at(-1).t,'bullish',true,'setup',{...setup,confirmationTime:rows[0].t}).from,2,'a receipt for another candle must not expand this window');
  const html=renderToStaticMarkup(createElement(mod.exports.PatternInspectionChart,{view,label:'Pattern break',setup}));
  assert.match(html,/data-pattern-break-part="Buildup bar 1"/);assert.match(html,/data-pattern-break-part="Signal bar"/);
  assert.match(html,/data-pattern-break-part="Close confirmation"/);assert.match(html,/data-pattern-break-references="true"/);
  assert.match(html,/Signal-bar break reference: 100\.82/);assert.match(html,/Technical protection reference: 100\.20/);
  assert.match(html,/B = buildup bar/);assert.doesNotMatch(html,/data-combi-part|data-combi-references/);
  const inspector=readFileSync(app+'src/components/ChartPatternInspector.tsx','utf8');
  assert.match(inspector,/Measured pattern-break structure/);assert.match(inspector,/Numerical thresholds and close confirmation are study choices/);
});
