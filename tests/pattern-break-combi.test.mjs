import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../mfe_ux_lab/cockpit/',import.meta.url));
const require=createRequire(app+'package.json'),{build}=require('esbuild');
const bundled=await build({stdin:{contents:"export * from './src/lib/patternBreakCombi.ts'; export * from './src/lib/priceActionDetector.ts';",resolveDir:app},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const start=Date.parse('2026-01-05T00:00:00Z');
const bar=(i,o,h,l,c)=>({t:new Date(start+i*300000).toISOString(),o,h,l,c,closed:true});
function fixture(two=false){
  const context=Array.from({length:6},(_,i)=>bar(i,99.9+i*.1,100.6+i*.1,99.6+i*.1,100+i*.1));
  const setup=[...context,bar(6,100.5,102.6,100.4,102.4),bar(7,102.2,102.5,101.8,102.0)];
  if(two)setup.push(bar(8,102.1,102.4,101.9,102.3));
  setup.push(bar(setup.length,102.2,103,102.1,102.8));
  return setup;
}
const mirror=rows=>rows.map(b=>({...b,o:200-b.o,h:200-b.l,l:200-b.h,c:200-b.c}));
test('directional context + powerbar + one/two inside bars yields exact causal structure',()=>{
  for(const two of [false,true])for(const down of [false,true]){
    const rows=down?mirror(fixture(two)):fixture(two),result=api.detectM5PriceAction(rows);
    const observed=result.assessments.find(row=>row.conceptId==='pattern_break_combi');
    assert.equal(observed.state,'DETECTED');assert.equal(observed.direction,down?'DOWN':'UP');
    assert.equal(observed.setup.powerbarTime,rows[6].t);
    assert.deepEqual(observed.setup.insideBarTimes,rows.slice(7,-1).map(b=>b.t));
    assert.equal(observed.setup.confirmationTime,rows.at(-1).t);
    assert.equal(observed.setup.breakoutLevel,down?rows.at(-2).l:rows.at(-2).h);
    assert.equal(observed.setup.protectionReference,down?Math.max(...rows.slice(7,-1).map(b=>b.h)):Math.min(...rows.slice(7,-1).map(b=>b.l)));
    const marker=result.markers.find(row=>row.conceptId==='pattern_break_combi');
    assert.deepEqual(marker.setup,observed.setup);assert.deepEqual(marker.pageAnchors,[108,109,110]);
    assert.equal(marker.i,rows.length-1);assert.equal(marker.time,rows.at(-1).t);
  }
});
test('candle color is optional; no context, weak power, wrong-end inside, wick-only and double-touch are withheld',()=>{
  const bullish=fixture();assert.ok(bullish[7].c<bullish[7].o,'source permits red inside bar after green powerbar');
  const mutations=[
    rows=>{rows[0].h=103;},
    rows=>{rows[6].o=102;},
    rows=>{rows[7]={...rows[7],o:100.9,h:101.2,l:100.6,c:101.0};},
    rows=>{rows.at(-1).c=102.4;},
    rows=>{rows.at(-1).l=101.7;},
    rows=>{rows.at(-1).o=102.6;},
    rows=>{rows[7].closed=false;},
    rows=>{rows[7].t=new Date(Date.parse(rows[7].t)+300000).toISOString();},
  ];
  for(const mutate of mutations){const rows=fixture();mutate(rows);assert.equal(api.observePatternBreakCombi(rows).detected,false);}
  assert.equal(api.observePatternBreakCombi(fixture().slice(0,-1)).detected,false,'unbroken inside bar is not a confirmed occurrence');
  const gap=fixture();for(let i=7;i<gap.length;i++)gap[i].t=new Date(Date.parse(gap[i].t)+86400000).toISOString();
  assert.equal(api.observePatternBreakCombi(gap).detected,false,'session gaps cannot join different combi parts');
});
test('all historical rows share causal prefix classification; future outcomes cannot backfill geometry',()=>{
  const setup=fixture(true),baseline=api.observePatternBreakCombi(setup);
  for(const c of [90,110]){
    const next=bar(setup.length,103,Math.max(103,c)+.1,Math.min(103,c)-.1,c);
    const evidence=api.measurePriceActionEvidence([...setup,next]).pattern_break_combi;
    const occurrence=evidence.history.find(row=>row.time===setup.at(-1).t);
    assert.ok(occurrence);assert.deepEqual(occurrence.setup,baseline.setup);
    assert.equal(occurrence.score,baseline.score);assert.equal(occurrence.direction,'UP');
    assert.equal(occurrence.nextBar,c>setup.at(-1).c?'UP':'DOWN');
    assert.equal(evidence.outcomes.up+evidence.outcomes.down+evidence.outcomes.flat,evidence.occurrences);
  }
  // Exercise retained history beyond marker/analogue caps using separate real
  // timestamps. Repeated candles provide independent fixture windows, not claims
  // of independent financial trades.
  const rows=Array.from({length:90},(_,n)=>fixture(n%2===0)).flat().map((b,i)=>({...b,t:new Date(start+i*300000).toISOString()}));
  const evidence=api.measurePriceActionEvidence(rows).pattern_break_combi;
  assert.ok(evidence.occurrences>80);assert.equal(evidence.history.length,evidence.occurrences);
  for(const occurrence of evidence.history){
    const prefix=api.observePatternBreakCombi(rows.slice(Math.max(0,occurrence.i-13),occurrence.i+1));
    assert.equal(prefix.detected,true);assert.deepEqual(prefix.setup,occurrence.setup);
  }
});
test('mini chart and inspector retain measured structure separately from ATR study geometry',()=>{
  const chart=readFileSync(app+'src/components/PatternInspectionChart.tsx','utf8');
  const inspector=readFileSync(app+'src/components/ChartPatternInspector.tsx','utf8');
  const host=readFileSync(app+'src/pages/Microscope.tsx','utf8');
  assert.match(chart,/data-combi-part/);
  assert.match(inspector,/Measured combi setup structure/);
  assert.match(inspector,/numerical thresholds and close confirmation are local study rules/);
  assert.match(host,/marker.setup \? \{ pdfSetup: marker.setup \}/);
  assert.match(host,/occurrence.setup \? \{ pdfSetup: occurrence.setup \}/);
});
test('actual mini chart renders P/I1/I2/C identities and distinct source reference lines',async()=>{
  const output=await build({stdin:{contents:"export {PatternInspectionChart} from './src/components/PatternInspectionChart.tsx'; export {patternInspectionWindow} from './src/lib/patternInspectionWindow.ts';",resolveDir:app},bundle:true,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],write:false,logLevel:'silent'});
  const mod={exports:{}};
  new Function('require','module','exports',output.outputFiles[0].text)(require,mod,mod.exports);
  const {PatternInspectionChart,patternInspectionWindow}=mod.exports;
  const {createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  for(const two of [false,true]){
    const rows=fixture(two),setup=api.observePatternBreakCombi(rows).setup;
    const view=patternInspectionWindow(rows,rows.at(-1).t,'bullish',true);
    const html=renderToStaticMarkup(createElement(PatternInspectionChart,{view,label:'Combi',setup}));
    assert.match(html,/data-combi-part="Powerbar"/);assert.match(html,/data-combi-part="Inside bar 1"/);
    assert.match(html,/P = powerbar/);
    assert.equal(html.includes('data-combi-part="Inside bar 2"'),two);
    assert.match(html,/data-combi-part="Close confirmation"/);
    assert.ok(html.includes(setup.powerbarTime));assert.ok(html.includes(setup.confirmationTime));
    assert.match(html,/data-combi-references="true"/);
    assert.match(html,/Inside-bar break reference: 102\./);assert.match(html,/Technical protection reference: 101\.80/);
    assert.match(html,/not an executable fill or ATR study level/);
    const ordinary=renderToStaticMarkup(createElement(PatternInspectionChart,{view,label:'Ordinary'}));
    assert.doesNotMatch(ordinary,/data-combi-part|data-combi-references/);
    assert.match(ordinary,/>SETUP<\/text>/);
  }
});
