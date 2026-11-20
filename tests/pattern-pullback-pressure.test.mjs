import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../mfe_ux_lab/cockpit/',import.meta.url));
const require=createRequire(app+'package.json'),{build}=require('esbuild');
const bundle=await build({stdin:{contents:"export * from './src/lib/patternPullbackPressure.ts'; export * from './src/lib/patternBreakPullback.ts'; export * from './src/lib/patternInspectionWindow.ts';",resolveDir:app},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const epoch=Date.parse('2026-01-05T00:00:00Z');
const bar=(o,h,l,c)=>({t:'',o,h,l,c,closed:true});
const timed=rows=>rows.map((b,i)=>({...b,t:new Date(epoch+i*300000).toISOString()}));
const mirror=rows=>rows.map(b=>({...b,o:200-b.o,h:200-b.l,l:200-b.h,c:200-b.c}));
function fixture(strong=false,inside=false){
  const context=Array.from({length:6},(_,i)=>bar(100.3,100.8,99.8,100.35+i*.06));
  const original=strong?bar(100.6,103.4,100.5,103):bar(100.6,101.8,100.5,101.5);
  const pullback=strong?[bar(103,103.1,101.65,101.8),bar(101.8,102.05,100.7,100.85)]:[bar(101.05,101.15,100.75,100.85)];
  if(inside)pullback.push(bar(100.75,101.25,100.5,101.05));
  pullback.push(bar(100.75,101.05,100.65,100.97));
  return timed([...Array.from({length:40-6-1-pullback.length-1},()=>bar(100.7,101.2,100.2,100.7)),...context,original,...pullback,bar(100.99,101.5,100.8,101.35)]);
}
function measure(rows){const found=api.observePatternBreakPullback(rows);assert.equal(found.detected,true,found.reason);return api.patternPullbackPressure(rows,rows.at(-1).t,found.setup);}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('strong correction has auditable normalized pressure while an extra inside bar extends the terminal turn',()=>{
  for(const down of [false,true]){
    const make=(strong,inside)=>down?mirror(fixture(strong,inside)):fixture(strong,inside);
    const mild=measure(make(false,false)),strong=measure(make(true,false)),built=measure(make(true,true));
    assert.equal(strong.state,'MEASURED');assert.equal(strong.direction,down?'DOWN':'UP');
    assert.equal(strong.adverseBars,2);assert.equal(strong.adversePowerBars,2);assert.equal(strong.longestAdverseRun,2);
    near(strong.baseline,1);near(strong.localLegRange,3.6);near(strong.retracement,2.75);near(strong.retracementFraction,2.75/3.6);
    assert.ok(strong.largestAdverseBodyUnits>mild.largestAdverseBodyUnits);assert.ok(strong.adverseCloseSpeed>mild.adverseCloseSpeed);
    assert.equal(strong.terminalClusterTimes.length,1);assert.equal(built.terminalClusterTimes.length,2);assert.equal(built.terminalInsideBars,1);
    assert.equal(built.terminalClusterTimes.at(-1),built.signalTime);
    assert.ok(!built.correctionTimes.includes(make(true,true).at(-1).t),'confirmation never changes pre-entry pressure');
    assert.equal(built.authority,'SHADOW_ONLY / NO_DECISION');
  }
});
test('future outcomes, older data and saved numerical receipts cannot rewrite the closed-prefix observation',()=>{
  const rows=fixture(true,true),setup=api.observePatternBreakPullback(rows).setup,time=rows.at(-1).t;
  const expected=api.patternPullbackPressure(rows,time,setup);
  const future=timed([...rows,bar(100,500,1,400)]);
  assert.deepEqual(api.patternPullbackPressure(future,time,setup),expected);
  const older=timed([...Array.from({length:10},()=>bar(50,80,30,70)),...rows]);
  const shiftedSetup=api.observePatternBreakPullback(older).setup;
  const shifted=api.patternPullbackPressure(older,older.at(-1).t,shiftedSetup);
  for(const key of ['baseline','retracement','retracementFraction','adversePowerBars','terminalInsideBars','adverseCloseEfficiency'])near(shifted[key],expected[key]);
  assert.deepEqual(api.patternPullbackPressure(rows,time,{...setup,contextBoundary:99999,emaAtSignal:1,protectionReference:99999}),expected,'saved measurements are ignored; canonical geometry is recomputed');
  assert.equal(api.patternPullbackPressure(rows,time,{...setup,direction:'DOWN'}).state,'WITHHELD');
});
test('missing, gapped, forming or unverified setup evidence withholds instead of inventing pressure',()=>{
  const rows=fixture(),setup=api.observePatternBreakPullback(rows).setup,time=rows.at(-1).t;
  assert.equal(api.patternPullbackPressure(rows,time).state,'WITHHELD');
  assert.equal(api.patternPullbackPressure(rows,time,setup,false).reason,'UNVERIFIED_CURRENT_EVIDENCE');
  assert.equal(api.patternPullbackPressure(rows,'bad',setup).state,'WITHHELD');
  for(const mutate of [r=>r.splice(2,1),r=>{r[4].closed=false;},r=>{r.at(-1).closed=false;},r=>{r[1].h=NaN;},r=>{r[1].t=r[0].t;}]){
    const changed=structuredClone(rows);mutate(changed);assert.equal(api.patternPullbackPressure(changed,time,setup).state,'WITHHELD');
  }
});
test('uniformly shifted five-minute pressure tapes withhold despite contiguous deltas',()=>{
  const rows=fixture(), shifted=rows.map(row=>({...row,t:new Date(Date.parse(row.t)+60_000).toISOString()}));
  const observed=api.observePatternBreakPullback(shifted);
  assert.equal(observed.detected,false,'direct pattern observers must enforce UTC grid identity');
  const shiftSetupTime=value=>new Date(Date.parse(value)+60_000).toISOString();
  const sourceSetup=api.observePatternBreakPullback(rows).setup;
  const shiftedSetup={...sourceSetup,confirmationTime:shiftSetupTime(sourceSetup.confirmationTime),originalBreakTime:shiftSetupTime(sourceSetup.originalBreakTime),signalBarTime:shiftSetupTime(sourceSetup.signalBarTime)};
  const pressure=api.patternPullbackPressure(shifted,shifted.at(-1).t,shiftedSetup);
  assert.equal(pressure.state,'WITHHELD');
  assert.equal(pressure.reason,'PULLBACK_REQUIRES_UTC_M5_GRID');
  assert.equal(pressure.correctionTimes.length,0);
});
test('hanging structures and broad signal bars do not fabricate compact buildup',()=>{
  const hanging=fixture();
  hanging.at(-4).h=101.2;hanging.at(-4).c=101;
  const h=api.observePatternBreakPullback(hanging);assert.equal(h.detected,true,h.reason);assert.equal(h.setup.variant,'HANGING');
  assert.equal(api.patternPullbackPressure(hanging,hanging.at(-1).t,h.setup).state,'MEASURED');
  const broad=fixture();broad.at(-2).h=101.99;broad.at(-2).c=101.8;
  broad.at(-1).o=101.85;broad.at(-1).h=102.3;broad.at(-1).c=102.2;
  const p=measure(broad);assert.equal(p.terminalClusterTimes.length,0);assert.equal(p.terminalSpanUnits,null);
  assert.equal(p.terminalInsideBars,0);assert.equal(p.terminalColorChanges,0);
});
test('rendered evidence and cluster outline preserve causal UTC and disclose local/source distinction',async()=>{
  const output=await build({stdin:{contents:"export {PatternInspectionChart} from './src/components/PatternInspectionChart.tsx'; export {PatternPullbackEvidence} from './src/components/PatternPullbackEvidence.tsx';",resolveDir:app},bundle:true,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],write:false,logLevel:'silent'});
  const mod={exports:{}};new Function('require','module','exports',output.outputFiles[0].text)(require,mod,mod.exports);
  const {createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const rows=fixture(true,true),setup=api.observePatternBreakPullback(rows).setup;
  const view=api.patternInspectionWindow(rows,rows.at(-1).t,'bullish',true,'setup',setup);
  const html=renderToStaticMarkup(createElement(mod.exports.PatternInspectionChart,{view,label:'Pullback',setup}));
  assert.match(html,/data-pullback-terminal-cluster="2"/);assert.match(html,/excludes confirmation and future outcomes/);
  const copy=renderToStaticMarkup(createElement(mod.exports.PatternPullbackEvidence,{pressure:view.pullbackPressure}));
  assert.match(copy,/2 opposing body \/ 2 opposing powerbar/);assert.match(copy,/Terminal compact cluster: 2 bar/);
  assert.match(copy,/Printed pp\. 100-102/);assert.match(copy,/PDF pp\. 110-112/);assert.match(copy,/not the full source-chart swing/);
  assert.match(copy,/do not rate a setup, filter history or establish an entry/);
  assert.equal(api.patternInspectionWindow(rows,rows.at(-1).t,'bullish',false,'context',setup).pullbackPressure.state,'WITHHELD');
});
