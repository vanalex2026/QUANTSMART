import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const app = fileURLToPath(new URL('../mfe_ux_lab/cockpit/', import.meta.url));
const require = createRequire(app + 'package.json'), { build } = require('esbuild');
const bundled = await build({ stdin: { contents: "export * from './src/lib/patternSetupSelection.ts'; export * from './src/lib/patternMarketContext.ts'; export * from './src/lib/patternBreak.ts';", resolveDir: app }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const setup = direction => ({ kind: 'PATTERN_BREAK', direction, confirmationTime: '2026-01-01T00:00:00Z' });
const market = (direction = 'UP', concern = []) => ({ time: '2026-01-01T00:00:00.000Z', contextEnd: '2026-01-01T00:00:00.000Z', state: 'MEASURED', direction, concerns: concern, swingProgression: direction === 'UP' ? 'HIGHER_HIGHS_AND_LOWS' : 'LOWER_HIGHS_AND_LOWS', emaSlope12Units: direction === 'UP' ? 1 : -1, netCloseUnits: direction === 'UP' ? 4 : -4, closeEfficiency: .5, reason: 'CAUSAL_SWINGS_AND_REPEATED_RANGE_CONTEXT' });

test('strength-aware review buckets are causal and descriptive', () => {
  const result = api.patternSetupSelection(setup('UP'), .82, market());
  assert.equal(result.state, 'MEASURED');
  assert.equal(result.strength, 'STRONG_GEOMETRY');
  assert.equal(result.context, 'ALIGNED_WITH_SWINGS');
  assert.equal(result.lens, 'ALIGNED_STRONG_REVIEW');
  assert.equal(result.authority, 'SHADOW_ONLY / NO_DECISION');
});

test('opposing dominance and range-edge concerns take precedence over score', () => {
  assert.equal(api.patternSetupSelection(setup('UP'), .95, market('UP', ['OPPOSING_CONFIRMED_SWINGS'])).lens, 'COUNTER_DOMINANCE_REVIEW');
  assert.equal(api.patternSetupSelection(setup('UP'), .95, market('UP', ['UP_NEAR_REPEATED_CEILING'])).lens, 'RANGE_EDGE_REVIEW');
});

test('missing, disabled, neutral or unmeasured evidence fails closed', () => {
  for (const result of [
    api.patternSetupSelection(undefined, .8, market()),
    api.patternSetupSelection(setup('UP'), .8, market(), false),
    api.patternSetupSelection({ ...setup('UP'), direction: 'NEUTRAL' }, .8, market()),
    api.patternSetupSelection(setup('UP'), .8, { ...market(), state: 'WITHHELD', reason: 'MISSING_OR_INVALID_SETUP_CANDLE' }),
    api.patternSetupSelection(setup('UP'), Number.NaN, market()),
    api.patternSetupSelection(setup('UP'), 1.1, market()),
    api.patternSetupSelection(setup('UP'), .8, { ...market(), time: '2026-01-01T00:05:00Z' }),
    api.patternSetupSelection(setup('UP'), .8, { ...market(), contextEnd: '2026-01-01T00:05:00Z' }),
    api.patternSetupSelection(setup('UP'), .8, { ...market(), contextEnd: 'malformed' }),
    api.patternSetupSelection(setup('UP'), .8, market('DOWN')),
  ]) {
    assert.equal(result.state, 'WITHHELD');
    assert.equal(result.lens, 'UNAVAILABLE');
    assert.equal(result.authority, 'SHADOW_ONLY / NO_DECISION');
  }
});

test('mirrored setups share the same review lens and pressure requires agreement', () => {
  for (const direction of ['UP', 'DOWN']) {
    assert.equal(api.patternSetupSelection(setup(direction), .7, market(direction)).lens, 'ALIGNED_STRONG_REVIEW');
    assert.equal(api.patternSetupSelection(setup(direction), .45, market(direction)).strength, 'MODERATE_GEOMETRY');
    assert.equal(api.patternSetupSelection(setup(direction), .449, market(direction)).strength, 'WEAK_GEOMETRY');
    const conflicting = api.patternSetupSelection(setup(direction), .9, { ...market(direction), closeEfficiency: .19 });
    assert.equal(conflicting.pressureAgreement, 'CONFLICTING_OR_UNCLEAR');
    assert.equal(conflicting.lens, 'ALIGNED_REVIEW');
    const opposing = api.patternSetupSelection(setup(direction), .9, { ...market(direction), emaSlope12Units: direction === 'UP' ? -1 : 1, netCloseUnits: direction === 'UP' ? -4 : 4 });
    assert.equal(opposing.pressureAgreement, 'OPPOSING');
    assert.equal(opposing.lens, 'PRESSURE_CONFLICT_REVIEW');
  }
});

test('review requires a measured context endpoint at the setup confirmation UTC', () => {
  for (const contextEnd of [null, undefined, 'bad', '2025-12-31T23:55:00Z', '2026-01-01T00:05:00Z']) {
    const result = api.patternSetupSelection(setup('UP'), .9, { ...market(), contextEnd });
    assert.equal(result.state, 'WITHHELD');
    assert.equal(result.reason, 'MISMATCHED_SETUP_CONTEXT_IDENTITY');
    assert.equal(result.pressureAgreement, 'UNAVAILABLE');
    assert.equal(result.context, 'UNAVAILABLE');
    assert.equal(result.lens, 'UNAVAILABLE');
  }
  const expected = api.patternSetupSelection(setup('UP'), .9, market());
  assert.deepEqual(api.patternSetupSelection(setup('UP'), .9, { ...market(), contextEnd: '2026-01-01T08:00:00+08:00' }), expected, 'equivalent UTC instants preserve the endpoint identity');
});

test('actual causal context and detector receipts ignore future outcome mutations', () => {
  const epoch = Date.parse('2026-01-05T00:00:00Z');
  const bar = (o,h,l,c) => ({o,h,l,c,closed:true});
  const prelude = Array.from({length:87}, (_,i) => { const c=96 + 3*Math.sin(i*Math.PI/6) + i*.03; return bar(c-.1,c+.6,c-.6,c); });
  const local = [
    ...Array.from({length:4},(_,i)=>bar(99.6+i*.15,100.5+i*.1,99.5+i*.1,99.7+i*.15)),
    bar(100.7,100.8,100.2,100.4),bar(100.4,100.78,100.25,100.7),bar(100.7,100.8,100.2,100.4),bar(100.4,100.82,100.3,100.76),
    bar(100.7,101.3,100.5,101.1),
  ];
  const rows = [...prelude,...local].map((b,i)=>({...b,t:new Date(epoch+i*300000).toISOString()}));
  for(const mirrored of [false,true]) {
    const tape=mirrored?rows.map(b=>({...b,o:200-b.o,h:200-b.l,l:200-b.h,c:200-b.c})):rows;
    const found=api.observePatternBreak(tape), time=tape.at(-1).t;
    assert.equal(found.detected,true);
    const measured=input=>api.patternSetupSelection(found.setup,found.score,api.patternMarketContext(input,time,found.setup.direction));
    const expected=measured(tape);assert.equal(expected.state,'MEASURED');
    for(const close of [1,10000]) {
      const future={...bar(close,close+1,close-1,close),t:new Date(epoch+96*300000).toISOString()};
      assert.deepEqual(measured([...tape,future]),expected);
      assert.deepEqual(measured([...tape,future].slice(0,-1)),expected);
      const futureContext=api.patternMarketContext([...tape,future],future.t,found.setup.direction);
      assert.equal(futureContext.state,'MEASURED');
      const relabelled=api.patternSetupSelection(found.setup,found.score,{...futureContext,time});
      assert.equal(relabelled.state,'WITHHELD','relabelled future-context measurements cannot review the earlier setup');
      assert.equal(relabelled.reason,'MISMATCHED_SETUP_CONTEXT_IDENTITY');
    }
  }
});

test('actual evidence rendering exposes pressure conflict, boundaries and score provenance', async () => {
  const out=await build({stdin:{contents:"export {PatternMarketEvidence} from './src/components/PatternMarketEvidence.tsx';",resolveDir:app},bundle:true,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],write:false,logLevel:'silent'});
  const mod={exports:{}};new Function('require','module','exports',out.outputFiles[0].text)(require,mod,mod.exports);
  const {createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const context={...market(),bars:96,ema25:100,baseline:1,highStepUnits:null,repeatedRange:null,sourcePages:[9,10,11,130,131]};
  const selection=api.patternSetupSelection(setup('UP'),.9,{...context,emaSlope12Units:-1,netCloseUnits:-4});
  const html=renderToStaticMarkup(createElement(mod.exports.PatternMarketEvidence,{context,selection,onInspectContext(){}}));
  assert.match(html,/PRESSURE_CONFLICT_REVIEW/);assert.match(html,/pressure conflict/);
  assert.match(html,/not comparable probabilities/);assert.match(html,/does not filter history or authorize an entry/);assert.match(html,/SHADOW_ONLY \/ NO_DECISION/);
  const microscope=readFileSync(app+'src/pages/Microscope.tsx','utf8');
  assert.match(microscope,/i: marker\.i,[\s\S]*?score: marker\.score/);
  assert.match(microscope,/i: resolvedIndex,[\s\S]*?score: occurrence\.score/);
});

console.log('PATTERN SETUP SELECTION PASS: bounded strength/context review lens stays descriptive and fail-closed.');
