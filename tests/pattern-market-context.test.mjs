import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../mfe_ux_lab/cockpit/',import.meta.url));
const require=createRequire(app+'package.json'),{build}=require('esbuild');
const bundled=await build({stdin:{contents:"export * from './src/lib/patternMarketContext.ts'; export * from './src/lib/patternInspectionWindow.ts';",resolveDir:app},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const epoch=Date.parse('2026-01-05T00:00:00Z');
const timed=rows=>rows.map((b,i)=>({...b,t:new Date(epoch+i*300000).toISOString()}));
const bar=c=>({o:c-.1,h:c+.6,l:c-.6,c,closed:true});
const mirror=rows=>rows.map(b=>({...b,o:200-b.o,h:200-b.l,l:200-b.h,c:200-b.c}));
function fixture(slope=0){const rows=Array.from({length:96},(_,i)=>bar(100+5*Math.sin(i*Math.PI/6)+i*slope));rows[95]=bar(104.8+95*slope);return timed(rows);}
test('repeated alternating boundaries retain confirmed UTCs and expose symmetric range-edge concerns',()=>{
  for(const down of [false,true]){
    const rows=down?mirror(fixture()):fixture(),ctx=api.patternMarketContext(rows,rows.at(-1).t,down?'DOWN':'UP');
    assert.equal(ctx.state,'MEASURED');assert.ok(ctx.repeatedRange);assert.equal(ctx.bars,96);
    assert.equal(ctx.swingProgression,'MIXED');
    assert.ok(ctx.concerns.includes(down?'DOWN_NEAR_REPEATED_FLOOR':'UP_NEAR_REPEATED_CEILING'));
    assert.ok(ctx.repeatedRange.floor.touches.length>=2&&ctx.repeatedRange.ceiling.touches.length>=2);
    for(const swing of [...ctx.highs,...ctx.lows,...ctx.repeatedRange.floor.touches,...ctx.repeatedRange.ceiling.touches]){
      assert.equal(Date.parse(swing.confirmedAt)-Date.parse(swing.time),600000);
      assert.ok(Date.parse(swing.confirmedAt)<=Date.parse(ctx.time));
    }
    assert.ok(ctx.closeEfficiency>=0&&ctx.closeEfficiency<=1);assert.equal(ctx.authority,'SHADOW_ONLY / NO_DECISION');
  }
});
test('progressing swing pairs and EMA slope show the opposing-direction concern without inventing a range',()=>{
  for(const down of [false,true]){
    const rows=down?mirror(fixture(.2)):fixture(.2),ctx=api.patternMarketContext(rows,rows.at(-1).t,down?'UP':'DOWN');
    assert.equal(ctx.swingProgression,down?'LOWER_HIGHS_AND_LOWS':'HIGHER_HIGHS_AND_LOWS');
    assert.ok(ctx.concerns.includes('OPPOSING_CONFIRMED_SWINGS'));assert.equal(ctx.repeatedRange,null);
    assert.ok(down?ctx.emaSlope12Units<0:ctx.emaSlope12Units>0);
  }
});
test('future candles, older context and timestamp formatting cannot rewrite a selected close',()=>{
  const rows=fixture(),time=rows.at(-1).t,expected=api.patternMarketContext(rows,time,'UP');
  assert.deepEqual(api.patternMarketContext([...rows,{...bar(10000),t:new Date(epoch+96*300000).toISOString()}],time,'UP'),expected);
  const older=Array.from({length:10},(_,i)=>({...bar(1),t:new Date(epoch-(10-i)*300000).toISOString()}));
  assert.deepEqual(api.patternMarketContext([...older,...rows],time,'UP'),expected);
  assert.deepEqual(api.patternMarketContext(rows,time.replace('.000Z','Z'),'UP'),{...expected,time:time.replace('.000Z','Z')});
  const partial=rows.slice(0,94),ctx=api.patternMarketContext(partial,partial.at(-1).t,'UP');
  assert.ok(!ctx.highs.some(s=>s.time===rows[93].t),'last two bars never become confirmed swings');
});
test('missing/forming/invalid context fails closed, gaps truncate, and broken boundaries retire the range',()=>{
  const rows=fixture(),time=rows.at(-1).t;
  for(const [input,utc,dir,enabled] of [[rows,'bad','UP',true],[rows,time,'UP',false],[rows,time,'NEUTRAL',true],[rows.slice(-39),time,'UP',true],[rows.map((b,i)=>i===95?{...b,closed:false}:b),time,'UP',true]])assert.equal(api.patternMarketContext(input,utc,dir,enabled).state,'WITHHELD');
  const gap=rows.filter((_,i)=>i!==70),ctx=api.patternMarketContext(gap,time,'UP');assert.equal(ctx.state,'WITHHELD');assert.equal(ctx.bars,25);assert.equal(ctx.truncatedByGap,true);
  const broken=structuredClone(rows);broken[50]= {...bar(110),t:rows[50].t};assert.equal(api.patternMarketContext(broken,time,'UP').repeatedRange,null);
  const flat=timed(Array.from({length:96},()=>bar(100))),unknown=api.patternMarketContext(flat,flat.at(-1).t,'UP');
  assert.equal(unknown.swingProgression,'INSUFFICIENT_SWINGS');assert.equal(unknown.repeatedRange,null);
});
test('actual context chart draws causal range and H1/H2/L1/L2 without future outcome labels',async()=>{
  const rows=fixture(),time=rows.at(-1).t,view=api.patternInspectionWindow([...rows,{...bar(10000),t:new Date(epoch+96*300000).toISOString()}],time,'bullish',true,'context');
  assert.equal(view.rows.at(-1).t,time);assert.deepEqual(view.marketContext,api.patternMarketContext(rows,time,'UP'));
  const out=await build({stdin:{contents:"export {PatternInspectionChart} from './src/components/PatternInspectionChart.tsx'; export {PatternMarketEvidence} from './src/components/PatternMarketEvidence.tsx';",resolveDir:app},bundle:true,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],write:false,logLevel:'silent'});
  const mod={exports:{}};new Function('require','module','exports',out.outputFiles[0].text)(require,mod,mod.exports);
  const {createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const chart=renderToStaticMarkup(createElement(mod.exports.PatternInspectionChart,{view,label:'Pullback reversal'}));
  assert.match(chart,/data-market-range="true"/);assert.match(chart,/data-market-swing="HIGH"/);assert.match(chart,/data-market-swing="LOW"/);
  for(const label of ['H1','H2','L1','L2'])assert.ok(chart.includes('>'+label+'</text>'));
  assert.doesNotMatch(chart,/data-inspection-event/);
  const panel=renderToStaticMarkup(createElement(mod.exports.PatternMarketEvidence,{context:view.marketContext,onInspectContext(){}}));
  assert.match(panel,/upper quarter/);assert.match(panel,/Printed pp\. 9-11, 130-131/);assert.match(panel,/PDF pp\. 19-21, 140-141/);assert.match(panel,/does not filter history/);
});
test('uniformly shifted five-minute tapes cannot produce M5 market context',()=>{
  const rows=fixture().map(bar=>({...bar,t:new Date(Date.parse(bar.t)+60000).toISOString()}));
  const ctx=api.patternMarketContext(rows,rows.at(-1).t,'UP');
  assert.equal(ctx.state,'WITHHELD');assert.equal(ctx.reason,'MISSING_OR_INVALID_SETUP_CANDLE');
  assert.equal(ctx.repeatedRange,null);assert.deepEqual(ctx.highs,[]);assert.deepEqual(ctx.lows,[]);
  assert.equal(ctx.ema25,null);assert.deepEqual(ctx.concerns,[]);
});
