import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../mfe_ux_lab/cockpit/',import.meta.url));
const require=createRequire(app+'package.json'),{build}=require('esbuild');
const bundled=await build({stdin:{contents:"export * from './src/lib/patternLowVolatilityContext.ts';",resolveDir:app},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const epoch=Date.parse('2026-01-05T00:00:00Z');
const timed=rows=>rows.map((bar,index)=>({...bar,t:new Date(epoch+index*300000).toISOString()}));
const bar=(center,range=2)=>({o:center-range/4,h:center+range/2,l:center-range/2,c:center+range/4,closed:true});
const fixture=(recentRange=2)=>timed(Array.from({length:60},(_,index)=>bar(100+index*.05,index<48?10:recentRange)));

test('measures low recent pace from a causal closed prefix and keeps authority descriptive',()=>{
  const rows=fixture(2), result=api.patternLowVolatilityContext(rows,rows.at(-1).t);
  assert.equal(result.state,'LOW_ACTIVITY_CONTEXT');
  assert.equal(result.bars,60);
  assert.equal(result.lowActivityThreshold,.65);
  assert.ok(result.activityRatio < .65);
  assert.ok(result.recentDirectionalEfficiency >= 0 && result.recentDirectionalEfficiency <= 1);
  assert.equal(result.authority,'SHADOW_ONLY / NO_DECISION');
  assert.equal(result.causalPrefix.mode,'CAUSAL_PREFIX_ONLY');
  assert.equal(result.causalPrefix.maxBars,60);
  assert.equal(result.causalPrefix.bars,60);
  assert.equal(result.causalPrefix.start,rows[0].t);
  assert.equal(result.causalPrefix.end,rows.at(-1).t);
  assert.equal(result.causalPrefix.futureRows,'WITHHELD');
  assert.equal(result.causalPrefix.sourceStatus,'SOURCE_REVIEW_ONLY');
  assert.equal(result.causalPrefix.dataStatus,'AVAILABLE');
  assert.equal(result.causalPrefix.outcomeStatus,'WITHHELD');
  assert.equal(result.causalPrefix.live_apply_allowed,false);
});

test('future rows and older prefix rows cannot rewrite the selected descriptor',()=>{
  const rows=fixture(2), time=rows.at(-1).t, expected=api.patternLowVolatilityContext(rows,time);
  assert.deepEqual(api.patternLowVolatilityContext([...rows,{...bar(999,100),t:new Date(epoch+60*300000).toISOString()}],time),expected);
  const older=timed(Array.from({length:10},()=>bar(1,1))).map((row,index)=>({...row,t:new Date(epoch-(10-index)*300000).toISOString()}));
  assert.deepEqual(api.patternLowVolatilityContext([...older,...rows],time),expected);
});

test('gaps, forming rows, off-grid time and disabled evidence withhold',()=>{
  const rows=fixture(2), time=rows.at(-1).t;
  const gap=api.patternLowVolatilityContext(rows.filter((_,index)=>index!==20),time);
  assert.equal(gap.state,'WITHHELD');
  assert.equal(gap.causalPrefix.mode,'UNAVAILABLE');
  assert.equal(gap.causalPrefix.dataStatus,'UNAVAILABLE');
  assert.equal(api.patternLowVolatilityContext(rows.map((row,index)=>index===59?{...row,closed:false}:row),time).state,'WITHHELD');
  assert.equal(api.patternLowVolatilityContext(rows,time.replace('.000Z','Z')).state,'LOW_ACTIVITY_CONTEXT');
  const unverified=api.patternLowVolatilityContext(rows,time,false);
  assert.equal(unverified.reason,'UNVERIFIED_CURRENT_EVIDENCE');
  assert.equal(unverified.causalPrefix.mode,'WITHHELD');
  assert.equal(unverified.causalPrefix.futureRows,'WITHHELD');
  assert.equal(api.patternLowVolatilityContext(rows,new Date(epoch+59*300000+60000).toISOString()).reason,'MISSING_OR_INVALID_SELECTED_CANDLE');
});

test('typical pace is descriptive and does not create a detector signal',()=>{
  const rows=fixture(10), result=api.patternLowVolatilityContext(rows,rows.at(-1).t);
  assert.equal(result.state,'TYPICAL_ACTIVITY_CONTEXT');
  assert.equal(Object.hasOwn(result,'conceptId'),false);
  assert.equal(Object.hasOwn(result,'outcome'),false);
});

console.log('PATTERN LOW-VOLATILITY CONTEXT PASS: causal local pace measurement remains descriptive and withheld on invalid evidence.');
