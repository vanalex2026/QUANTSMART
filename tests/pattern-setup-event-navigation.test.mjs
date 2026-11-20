import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../mfe_ux_lab/cockpit/', import.meta.url));
const require = createRequire(app + 'package.json'), { build } = require('esbuild');
const bundle = async contents => build({ stdin: { contents, resolveDir: app }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', metafile: true });
const bundled = await bundle("export * from './src/lib/patternSetupEventNavigation.ts'; export * from './src/lib/patternSetupTimeline.ts'; export * from './src/lib/patternInspectionWindow.ts';");
const { patternSetupEventNavigation: navigate, patternSetupTimeline: timeline, patternInspectionWindow: inspect } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const epoch = Date.parse('2026-12-31T23:45:00Z'), step = 300_000;
const time = i => new Date(epoch + i * step).toISOString();
const bar = (i, o = 99.5, h = 100, l = 99, c = 99.8) => ({ t: time(i), o, h, l, c, closed: true });
const tape = () => [bar(0, 99, 100, 98, 99.5), bar(1), bar(2, 99.8, 100.4, 99.5, 99.9), bar(3, 99.9, 100.6, 99.6, 100.5)];
const setup = (kind = 'PATTERN_BREAK', direction = 'UP') => ({ kind, direction, signalBarTime: time(0), insideBarTimes: [time(-1), time(0)], confirmationTime: time(3), breakoutLevel: 100 });
const measure = (kind = 'PATTERN_BREAK', rows = tape(), direction = 'UP') => timeline(setup(kind, direction), rows, time(3), true, epoch + 20 * step);
const view = (rows = tape(), from = 40) => ({ rows, from, index: from + rows.findIndex(row => Date.parse(row.t) === Date.parse(time(3))), anchor: { t: time(3) } });
const withheld = result => { assert.equal(result.state, 'WITHHELD'); assert.deepEqual(result.events, []); assert.deepEqual(result.groups, []); assert.equal(result.authority, 'SHADOW_ONLY / NO_DECISION'); };

test('four setup kinds map every attested event by candle identity with actual close time', () => {
  for (const kind of ['PATTERN_BREAK_COMBI', 'PATTERN_BREAK', 'PATTERN_BREAK_PULLBACK', 'PULLBACK_REVERSAL']) {
    for (const direction of ['UP', 'DOWN']) {
      const rows = direction === 'DOWN' ? tape().map(b => ({ ...b, o: 200 - b.o, h: 200 - b.l, l: 200 - b.h, c: 200 - b.c })) : tape();
      const receipt = measure(kind, rows, direction), result = navigate(receipt, view(rows));
      assert.equal(result.state, 'AVAILABLE');
      assert.equal(result.authority, 'SHADOW_ONLY / NO_DECISION');
      assert.deepEqual(result.events.map(event => event.kind), ['SIGNAL', 'ENTRY_BREAK', 'CLOSE_CONFIRMATION', 'OUTCOME_MEASUREMENT_START']);
      assert.deepEqual(result.events.map(event => event.index), [0, 2, 3, 3]);
      assert.deepEqual(result.events.map(event => event.absoluteIndex), [40, 42, 43, 43]);
      assert.deepEqual(result.events.map(event => event.time), [time(0), time(2), time(4), time(4)]);
      assert.deepEqual(result.events.map(event => event.candleTime), [time(0), time(2), time(3), time(3)]);
      assert.deepEqual(result.events.map(event => [event.label, event.detail]), receipt.milestones.map(event => [event.label, event.detail]));
      assert.equal(result.events[2].highlightKey, result.events[3].highlightKey);
      assert.deepEqual(result.groups.map(group => group.kinds), [['SIGNAL'], ['ENTRY_BREAK'], ['CLOSE_CONFIRMATION', 'OUTCOME_MEASUREMENT_START']]);
    }
  }
});

test('close/origin mark the confirmation candle across midnight and year boundary without consulting next prices', () => {
  const receipt = measure(), rows = tape();
  assert.equal(rows[3].t, '2027-01-01T00:00:00.000Z');
  const causal = navigate(receipt, view(rows));
  const future = { t: time(4) };
  for (const key of ['o', 'h', 'l', 'c', 'closed']) Object.defineProperty(future, key, { get() { throw new Error(`read future ${key}`); } });
  const withNext = navigate(receipt, view([...rows, future]));
  assert.deepEqual(withNext, causal);
  assert.equal(withNext.events[2].index, 3, 'close time is the next open but the highlighted source remains confirmation');
  assert.equal(withNext.events[2].time, future.t);
  const shifted = navigate(receipt, view([bar(-1), ...rows], 1000));
  assert.equal(shifted.events[2].index, 4);
  assert.equal(shifted.events[2].highlightKey, causal.events[2].highlightKey, 'retention and prefix shifts preserve grouped candle identity');
});

test('canonical UTC spellings are equivalent; timezone aliases, impossible dates and off-grid identities fail closed', () => {
  const receipt = measure();
  const rows = tape().map(b => ({ t: b.t.replace('.000Z', 'Z') }));
  assert.deepEqual(navigate(receipt, { ...view(rows), anchor: rows[3] }), navigate(receipt, view()));
  const invalid = ['2026-12-31 23:45:00', '2027-01-01T07:45:00+08:00', '2026-12-31T23:46:00Z', '2026-12-31T23:45:01Z', '2026-12-31T23:45:00.001Z', '2026-02-30T23:45:00Z', '2026-13-31T23:45:00Z'];
  for (const t of invalid) {
    withheld(navigate(receipt, view(tape().map((row, i) => i === 0 ? { t } : row))));
    withheld(navigate(receipt, { ...view(), anchor: { t } }));
    const changed = structuredClone(receipt); changed.milestones[0].candleTime = t;
    withheld(navigate(changed, view()));
  }
});

test('withheld and stale receipts cannot expose navigation; a different selected row cannot borrow confirmation', () => {
  const pending = timeline(undefined, [], time(3));
  const result = navigate(pending, view());
  withheld(result); assert.equal(result.reason, pending.reason);
  const receipt = measure();
  const rows = [bar(-1), ...tape(), bar(4)];
  withheld(navigate(receipt, { rows, from: 0, index: 5, anchor: rows[5] }));
  withheld(navigate(receipt, { ...view(), index: 42 }));
  withheld(navigate(receipt, { ...view(), index: 999 }));
  for (const from of [-1, 0.5, NaN]) withheld(navigate(receipt, { ...view(), from }));
  for (const change of [{ version: 'unknown' }, { authority: 'LIVE' }]) withheld(navigate({ ...receipt, ...change }, view()));
});

test('missing/duplicate/reversed visible identities and incomplete/retimed milestone receipts fail closed', () => {
  const receipt = measure(), rows = tape();
  for (const subset of [rows.slice(1), rows.filter((_, i) => i !== 2), rows.slice(0, 3), [rows[0], rows[1], rows[1], rows[2], rows[3]], [rows[0], { ...rows[0], t: rows[0].t.replace('.000Z', 'Z') }, ...rows.slice(1)], [rows[1], rows[0], ...rows.slice(2)]]) withheld(navigate(receipt, view(subset)));
  const mutations = [
    r => r.milestones.pop(),
    r => r.milestones.push(r.milestones[0]),
    r => r.milestones[1].kind = 'SIGNAL',
    r => r.milestones[1].candleTime = time(0),
    r => r.milestones[1].time = time(0),
    r => { r.milestones[1].time = time(0); r.milestones[1].candleTime = time(0); },
    r => r.milestones[2].candleTime = time(4),
    r => { r.milestones[2].time = time(5); r.milestones[2].candleTime = time(4); },
    r => r.milestones[3].time = time(3),
  ];
  for (const mutate of mutations) { const changed = structuredClone(receipt); mutate(changed); withheld(navigate(changed, view())); }
});

test('a break on confirmation shares one stable highlight with close and outcome origin', () => {
  const rows = tape(); rows[2].h = 100;
  const result = navigate(measure('PATTERN_BREAK', rows), view(rows));
  assert.equal(result.state, 'AVAILABLE');
  assert.deepEqual(result.events.map(event => event.index), [0, 3, 3, 3]);
  assert.deepEqual(result.groups[1].kinds, ['ENTRY_BREAK', 'CLOSE_CONFIRMATION', 'OUTCOME_MEASUREMENT_START']);
  assert.match(result.groups[1].label, /Close confirmation \/ Outcome measurement start/);
});

test('real setup/outcome/context display subsets map local indexes without rescanning or changing the timeline', () => {
  const rows = [...Array.from({ length: 30 }, (_, i) => bar(i - 30)), ...tape(), ...Array.from({ length: 12 }, (_, i) => bar(i + 4, 100.5, 101.5, 100.1, 101))];
  const receipt = measure('PATTERN_BREAK', rows), original = structuredClone(receipt);
  for (const mode of ['setup', 'outcome', 'context']) {
    const displayed = inspect(rows, time(3), 'bullish', true, mode, undefined, epoch + 20 * step);
    assert.equal(displayed.mode, mode);
    const result = navigate(receipt, displayed);
    assert.equal(result.state, 'AVAILABLE');
    assert.equal(displayed.rows[result.events[0].index].t, time(0));
    assert.equal(displayed.rows[result.events[2].index].t, time(3));
    assert.equal(result.events[2].absoluteIndex, displayed.index);
  }
  assert.deepEqual(receipt, original, 'navigation never mutates the attested timeline');
});

test('navigation has no runtime detector, tape calculation or full knowledge-map imports', async () => {
  const pure = await bundle("export * from './src/lib/patternSetupEventNavigation.ts';");
  assert.deepEqual(Object.keys(pure.metafile.inputs).filter(name => name !== '<stdin>').map(name => name.replaceAll('\\', '/').split('/').pop()), ['patternSetupEventNavigation.ts']);
});
