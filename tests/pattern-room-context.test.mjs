import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../mfe_ux_lab/cockpit/',import.meta.url));
const require=createRequire(app+'package.json'),{build}=require('esbuild');
const bundle=await build({stdin:{contents:"export * from './src/lib/patternRoomContext.ts'; export * from './src/lib/patternInspectionWindow.ts';",resolveDir:app},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const epoch=Date.parse('2026-01-05T00:00:00Z');
const timed=rows=>rows.map((bar,i)=>({...bar,t:new Date(epoch+i*300000).toISOString()}));
const base=()=>timed(Array.from({length:100},()=>({o:100,h:101,l:99,c:100,closed:true})));
function fixture(){const rows=base();rows[30]={...rows[30],h:103};rows[50]={...rows[50],h:103.2};rows[70]={...rows[70],h:108};return rows;}
const mirror=rows=>rows.map(b=>({...b,o:200-b.o,h:200-b.l,l:200-b.h,c:200-b.c}));
test('causal zones retain pivot confirmation identities, clustering, direction and technical-risk distance',()=>{
  for(const down of [false,true]){
    const rows=down?mirror(fixture()):fixture(),result=api.patternRoomContext(rows,rows[99].t,down?'DOWN':'UP',down?105:95);
    assert.equal(result.bars,96);assert.equal(result.state,'WITHIN_ONE_TECHNICAL_RISK');
    assert.equal(result.structuralLevels.length,2);const near=result.structuralLevels[0];
    assert.deepEqual(near.pivotTimes,[rows[30].t,rows[50].t]);assert.equal(near.confirmedAt,rows[52].t);
    assert.ok(Math.abs(near.distance-(down?3:3))<1e-8);assert.ok(Math.abs(near.technicalRiskUnits-.6)<1e-8);
    assert.equal(result.roundNumber.level,down?50:150);
    assert.equal(result.authority,'SHADOW_ONLY / NO_DECISION');
    const farther=api.patternRoomContext(rows,rows[99].t,down?'DOWN':'UP',down?101:99);
    assert.equal(farther.state,'BEYOND_ONE_TECHNICAL_RISK');
  }
});
test('unconfirmed future pivots, stale zones and absent evidence do not imply a clear path',()=>{
  const rows=fixture();rows[98].h=110;
  const expected=api.patternRoomContext(rows,rows[99].t,'UP',95);
  assert.ok(!expected.structuralLevels.some(level=>level.pivotTimes.includes(rows[98].t)));
  const future=timed([...rows,...Array.from({length:20},()=>({o:200,h:250,l:150,c:200}))]);
  assert.deepEqual(api.patternRoomContext(future,rows[99].t,'UP',95),expected,'future closes and newly confirmable pivots cannot rewrite the snapshot');
  const retired=fixture();retired[60]={...retired[60],o:104,h:105,l:103,c:104};
  const result=api.patternRoomContext(retired,retired[99].t,'UP',95);
  assert.ok(!result.structuralLevels.some(zone=>zone.pivotTimes.includes(retired[30].t)),'decisive historical close retires the broken zone');
  const empty=api.patternRoomContext(base(),rows[99].t,'UP',95);
  assert.equal(empty.state,'NO_CONFIRMED_SWING');assert.equal(empty.structuralLevels.length,0);
  assert.ok(empty.roundNumber,'round landmarks remain separate from structural barrier evidence');
});
test('neutral, missing, unverified and insufficient contexts withhold; gaps truncate known context',()=>{
  const rows=fixture(),time=rows[99].t;
  assert.equal(api.patternRoomContext(rows,time,'NEUTRAL').reason,'NEUTRAL_SETUP');
  assert.equal(api.patternRoomContext(rows,'invalid','UP').state,'WITHHELD');
  assert.equal(api.patternRoomContext(rows,time,'UP',95,false).reason,'UNVERIFIED_CURRENT_EVIDENCE');
  assert.equal(api.patternRoomContext(rows.slice(-20),time,'UP').state,'WITHHELD');
  const gap=rows.filter((_,i)=>i!==40),result=api.patternRoomContext(gap,time,'UP',95);
  assert.equal(result.truncatedByGap,true);assert.equal(result.contextStart,rows[41].t);
  assert.ok(!result.structuralLevels.some(zone=>zone.pivotTimes.includes(rows[30].t)));
  assert.equal(api.patternRoomContext(rows.map((b,i)=>i===99?{...b,closed:false}:b),time,'UP').state,'WITHHELD');
  assert.equal(api.patternRoomContext(rows,time,'UP',101).technicalRisk,null);
  assert.equal(api.patternRoomContext(rows,time,'UP').state,'MEASURED_WITHOUT_RISK');
});
test('context chart ends at setup close, exposes known zones and does not show future outcomes',async()=>{
  const rows=fixture(),time=rows[99].t,future=timed([...rows,{o:100,h:105,l:90,c:91}]);
  const view=api.patternInspectionWindow(future,time,'bullish',true,'context');
  assert.equal(view.mode,'context');assert.equal(view.rows.length,96);assert.equal(view.rows.at(-1).t,time);
  const output=await build({stdin:{contents:"export {PatternInspectionChart} from './src/components/PatternInspectionChart.tsx'; export {PatternRoomEvidence} from './src/components/PatternRoomEvidence.tsx'; export {PatternMarketEvidence} from './src/components/PatternMarketEvidence.tsx';",resolveDir:app},bundle:true,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],write:false,logLevel:'silent'});
  const mod={exports:{}};new Function('require','module','exports',output.outputFiles[0].text)(require,mod,mod.exports);
  const {createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const html=renderToStaticMarkup(createElement(mod.exports.PatternInspectionChart,{view,label:'Pattern break'}));
  assert.match(html,/data-room-zone="1"/);assert.match(html,/confirmed .* UTC; not a price forecast/);
  assert.match(html,/data-inspection-path-bars="0"/,'context mode never reports future path candles');
  assert.doesNotMatch(html,/Invalidation touched first|Target touched first|data-inspection-event/);
  assert.ok(!html.includes(future.at(-1).t));
  const room=api.patternRoomContext(rows,time,'UP',95),copy=renderToStaticMarkup(createElement(mod.exports.PatternRoomEvidence,{room,onInspectContext(){}}));
  assert.match(copy,/0\.60 technical-risk units/);assert.match(copy,/separate from the ATR study risk/);
  assert.match(copy,/Printed pp\. 13, 51, 107/);assert.match(copy,/PDF pp\. 23, 61, 117/);
  const insufficient=renderToStaticMarkup(createElement(mod.exports.PatternRoomEvidence,{room:api.patternRoomContext(base(),time,'UP'),onInspectContext(){}}));
  assert.match(insufficient,/does not establish a clear path/);
  const withheld=api.patternInspectionWindow(rows,time,'bullish',false,'context');
  assert.equal(withheld.mode,'setup');assert.equal(withheld.room.state,'WITHHELD');
});
test('off-grid M5 contexts withhold while equivalent UTC instants preserve valid evidence',()=>{
  const rows=fixture(),time=rows[99].t;
  const shifted=rows.map(bar=>({...bar,t:new Date(Date.parse(bar.t)+60000).toISOString()}));
  const withheld=api.patternRoomContext(shifted,shifted[99].t,'UP',95);
  assert.equal(withheld.state,'WITHHELD');
  assert.equal(withheld.reason,'MISSING_OR_INVALID_SETUP_CANDLE');
  assert.deepEqual(withheld.structuralLevels,[]);assert.equal(withheld.roundNumber,null);
  const expected=api.patternRoomContext(rows,time,'UP',95),alternate=time.replace('.000Z','Z');
  assert.deepEqual(api.patternRoomContext(rows,alternate,'UP',95),{...expected,time:alternate});
});
