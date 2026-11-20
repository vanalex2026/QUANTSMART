import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const app = fileURLToPath(new URL('../mfe_ux_lab/cockpit/', import.meta.url));
const require = createRequire(app + 'package.json'), { build } = require('esbuild');
const bundled = await build({ stdin: { contents: "export * from './src/lib/patternSetupTimeline.ts';", resolveDir: app }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { patternSetupTimeline } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const epoch = Date.parse('2026-01-05T00:00:00Z'), step = 300000;
const time = i => new Date(epoch + i * step).toISOString();
const bar = (i, o, h, l, c) => ({ t: time(i), o, h, l, c, closed: true });
const tape = () => [bar(0, 99, 100, 98, 99.5), bar(1, 99.5, 100, 99, 99.8), bar(2, 99.8, 100.4, 99.5, 99.9), bar(3, 99.9, 100.6, 99.6, 100.5)];
const setup = (kind = 'PATTERN_BREAK', direction = 'UP') => ({ kind, direction, signalBarTime: time(0), insideBarTimes: [time(-1), time(0)], confirmationTime: time(3), breakoutLevel: 100 });
const measure = (receipt = setup(), rows = tape(), selected = time(3), enabled = true, now = epoch + 20 * step) => patternSetupTimeline(receipt, rows, selected, enabled, now);
const mirror = rows => rows.map(b => ({ ...b, o: 200 - b.o, h: 200 - b.l, l: 200 - b.h, c: 200 - b.c }));

test('all four setup kinds preserve distinct signal, break observation, close and outcome origin', () => {
  for (const kind of ['PATTERN_BREAK_COMBI', 'PATTERN_BREAK', 'PATTERN_BREAK_PULLBACK', 'PULLBACK_REVERSAL']) {
    for (const direction of ['UP', 'DOWN']) {
      const result = measure(setup(kind, direction), direction === 'DOWN' ? mirror(tape()) : tape());
      assert.equal(result.state, 'AVAILABLE');
      assert.equal(result.authority, 'SHADOW_ONLY / NO_DECISION');
      assert.equal(result.breakObservation, 'RANGE_BREAK');
      assert.deepEqual(result.milestones.map(m => m.kind), ['SIGNAL', 'ENTRY_BREAK', 'CLOSE_CONFIRMATION', 'OUTCOME_MEASUREMENT_START']);
      assert.deepEqual(result.milestones.map(m => m.time), [time(0), time(2), time(4), time(4)]);
      assert.deepEqual(result.milestones.map(m => m.candleTime), [time(0), time(2), time(3), time(3)]);
      assert.match(result.milestones[1].detail, /intrabar break time and fill are unknown/);
      if (kind === 'PATTERN_BREAK_COMBI') assert.match(result.milestones[0].label, /Last inside-bar signal reference/);
    }
  }
});

test('touches do not break; signal extremes cannot stand in for a strictly later candle', () => {
  for (const direction of ['UP', 'DOWN']) {
    const rows = tape();
    // Signal touches its own directional reference; it is never an entry observation.
    rows[2].h = 100; rows[2].c = 99.9;
    const result = measure(setup('PATTERN_BREAK', direction), direction === 'DOWN' ? mirror(rows) : rows);
    assert.equal(result.state, 'AVAILABLE');
    assert.equal(result.milestones[1].time, time(3));
    const onlyTouches = rows.map((b, i) => i === 3 ? { ...b, h: 100, c: 100 } : b);
    assert.equal(measure(setup('PATTERN_BREAK', direction), direction === 'DOWN' ? mirror(onlyTouches) : onlyTouches).state, 'WITHHELD');
  }
});

test('open beyond level is separately labelled without inventing a crossing or fill', () => {
  for (const direction of ['UP', 'DOWN']) {
    const rows = tape(); rows[2] = bar(2, 100.2, 100.4, 100.1, 100.3);
    const result = measure(setup('PATTERN_BREAK', direction), direction === 'DOWN' ? mirror(rows) : rows);
    assert.equal(result.state, 'AVAILABLE');
    assert.equal(result.breakObservation, 'OPEN_GAP_BEYOND_LEVEL');
    assert.match(result.milestones[1].detail, /no crossing time, trade or fill is inferred/);
    const startsAtLevel = tape(); startsAtLevel[2].o = 100;
    assert.equal(measure(setup('PATTERN_BREAK', direction), direction === 'DOWN' ? mirror(startsAtLevel) : startsAtLevel).breakObservation, 'RANGE_BREAK');
  }
});

test('retained candle ordinals are irrelevant and future OHLC never changes the receipt', () => {
  const expected = measure();
  const prior = bar(-1, 98, 99, 97, 98);
  assert.deepEqual(measure(setup(), [prior, ...tape()].map((b, i) => ({ ...b, i: 1000 + i }))), expected);
  for (const future of [bar(4, 1, 2, 0, 1), { ...bar(4, 10000, 10001, 9999, 10000), closed: false }, { ...bar(4, 0, 1, 0, 1), c: NaN }]) {
    assert.deepEqual(measure(setup(), [...tape(), future]), expected);
  }
  const failed = tape(); failed[3].c = 99.9;
  assert.equal(measure(setup(), [...failed, bar(4, 99, 102, 98, 101)]).state, 'WITHHELD');
});

test('missing, duplicate, reversed, forming and malformed interval evidence fails closed', () => {
  const rows = tape();
  const cases = [
    rows.slice(1), rows.slice(0, -1), [rows[0], ...rows.slice(2)],
    [rows[0], rows[1], rows[1], rows[2], rows[3]],
    [rows[0], rows[2], rows[1], rows[3]],
    [...rows, { ...rows[3], t: time(3).replace('.000Z', 'Z') }],
    rows.map((b, i) => i === 1 ? { ...b, closed: false } : b),
    rows.map((b, i) => i === 1 ? { ...b, closed: 'true' } : b),
    rows.map((b, i) => i === 1 ? { ...b, h: b.l - 1 } : b),
    rows.map((b, i) => i === 1 ? { ...b, c: NaN } : b),
    rows.map((b, i) => i === 1 ? { ...b, t: '2026-01-05T00:05:01Z' } : b),
    rows.map((b, i) => i === 1 ? { ...b, t: '2026-01-05 00:05:00' } : b),
    rows.map((b, i) => i === 1 ? { ...b, t: '2026-01-05T08:05:00+08:00' } : b),
    rows.map((b, i) => i === 1 ? { ...b, t: '2026-02-30T00:05:00Z' } : b),
  ];
  for (const input of cases) {
    const result = measure(setup(), input);
    assert.equal(result.state, 'WITHHELD');
    assert.deepEqual(result.milestones, []);
    assert.equal(result.authority, 'SHADOW_ONLY / NO_DECISION');
  }
});

test('selection identity and setup chronology cannot be relabelled', () => {
  for (const receipt of [undefined, { ...setup(), direction: 'NEUTRAL' }, { ...setup(), kind: 'UNKNOWN' }, { ...setup(), breakoutLevel: Infinity }, { ...setup(), breakoutLevel: 99.9 }, { ...setup(), signalBarTime: time(3) }, { ...setup(), signalBarTime: time(4) }, { ...setup(), signalBarTime: 'bad' }, { ...setup('PATTERN_BREAK_COMBI'), insideBarTimes: undefined }, { ...setup('PATTERN_BREAK_COMBI'), insideBarTimes: [] }, { ...setup('PATTERN_BREAK_COMBI'), insideBarTimes: [time(0), time(-1)] }]) {
    assert.equal(patternSetupTimeline(receipt, tape(), time(3), true, epoch + 20 * step).state, 'WITHHELD');
  }
  for (const selected of [time(2), time(4), 'bad', '2026-01-05T08:15:00+08:00']) assert.equal(measure(setup(), tape(), selected).state, 'WITHHELD');
  assert.equal(measure(setup(), tape(), time(3), false).state, 'WITHHELD');
  assert.equal(measure(setup(), tape(), time(3), true, epoch + 4 * step - 1).state, 'WITHHELD');
  assert.equal(measure(setup(), tape(), time(3), true, epoch + 4 * step).state, 'AVAILABLE');
});

test('fast UTC validation agrees with canonical UTC across a complete Gregorian cycle, including years 0000-0099', () => {
  for (let year = 0; year < 400; year++) {
    for (let month = 1; month <= 12; month++) {
      const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      const day = month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
      const stamp = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${day}T12:00:00Z`;
      const start = Date.parse(stamp);
      const at = i => new Date(start + i * step).toISOString();
      const receipt = { ...setup(), signalBarTime: at(0), confirmationTime: at(3) };
      // Both accepted canonical spellings identify the same UTC instant.
      const rows = tape().map((b, i) => ({ ...b, t: i % 2 ? at(i) : at(i).replace('.000Z', 'Z') }));
      const result = patternSetupTimeline(receipt, rows, at(3), true, start + 4 * step);
      assert.equal(result.state, 'AVAILABLE', stamp);
      assert.deepEqual(result.milestones.map(m => m.time), [at(0), at(2), at(4), at(4)], stamp);
      const impossible = stamp.replace(`-${day}T`, `-${day + 1}T`);
      const malformed = [...rows, { t: impossible }];
      assert.equal(patternSetupTimeline(receipt, malformed, at(3), true, start + 4 * step).reason,
        'INVALID_RETAINED_UTC_M5_IDENTITY', impossible);
    }
  }
});

test('large future extensions never read future prices or hide malformed/duplicate historical identities', () => {
  const expected = measure();
  const future = Array.from({ length: 5000 }, (_, i) => ({
    t: time(i + 4),
    get o() { throw new Error('future open was read'); },
    get h() { throw new Error('future high was read'); },
    get l() { throw new Error('future low was read'); },
    get c() { throw new Error('future close was read'); },
    get closed() { throw new Error('future closed flag was read'); },
  }));
  const extended = [...tape(), ...future];
  assert.deepEqual(measure(setup(), extended), expected);
  assert.equal(measure(setup(), [...extended, tape()[1]]).reason, 'DUPLICATE_OR_REVERSED_RETAINED_IDENTITY');
  for (const t of [
    '2026-00-05T00:00:00Z', '2026-13-05T00:00:00Z', '2026-01-00T00:00:00Z',
    '2026-01-05T24:00:00Z', '2026-01-05T00:60:00Z', '2026-01-05T00:01:00Z',
    '2026-01-05T00:00:01Z', '2026-01-05T00:00:00.001Z', '2026-01-05t00:00:00z',
    '1900-02-29T00:00:00Z', '2100-02-29T00:00:00Z',
  ]) assert.equal(measure(setup(), [...extended, { t }]).reason, 'INVALID_RETAINED_UTC_M5_IDENTITY', t);
});
