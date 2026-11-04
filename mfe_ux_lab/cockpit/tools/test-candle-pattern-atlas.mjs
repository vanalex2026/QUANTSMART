import assert from "node:assert/strict";
import { build } from "esbuild";

async function directModule(entry) {
  const output = await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
}

function fixture(count = 360, stepMinutes = 5) {
  const bars = [];
  let price = 1900;
  const shape = [
    [0.25, 0.42, 0.12, 0.08], [-0.18, 0.34, 0.06, 0.16], [0.06, 0.27, 0.10, 0.10],
    [0.31, 0.48, 0.07, 0.05], [-0.09, 0.22, 0.05, 0.11],
  ];
  for (let i = 0; i < count; i++) {
    const [body, range, upper, lower] = shape[i % shape.length];
    const direction = i > count * 0.62 ? -1 : 1;
    const o = price;
    const c = o + body * direction;
    const h = Math.max(o, c) + upper;
    const l = Math.min(o, c) - lower;
    bars.push({ i, t: new Date(Date.UTC(2026, 0, 1, 0, i * stepMinutes)).toISOString(), o, h, l, c });
    price = c + (i % 19 === 0 ? 0.03 : 0);
  }
  return bars;
}

// Every move is intentionally below the Atlas's 0.12 ATR outcome threshold.
// The walk-forward vote must therefore remain FLAT; using a raw close-change
// sign would incorrectly turn this quiet XAUUSD tape into directional evidence.
function subThresholdFixture(count = 140, stepMinutes = 5) {
  const bars = [];
  let price = 1900;
  for (let i = 0; i < count; i++) {
    const o = price;
    const c = o + 0.01;
    bars.push({
      i,
      t: new Date(Date.UTC(2026, 0, 1, 0, i * stepMinutes)).toISOString(),
      o,
      h: c + 0.5,
      l: o - 0.5,
      c,
    });
    price = c;
  }
  return bars;
}

// Deterministic tape with one sparse confidence bin. It protects the
// reliability gate from declaring calibration on a bin backed by only two
// held-out labels, even when the aggregate sample is otherwise large.
// Keep the held-out slice small enough that the causal posterior produces a
// genuinely sparse confidence bin. This protects the reliability gate from
// declaring calibration on a bin backed by only a handful of labels.
function sparseCalibrationFixture(count = 88, stepMinutes = 5) {
  const bars = [];
  let state = 3;
  let price = 100;
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const o = price;
    const c = o + (random() - 0.5) * 2;
    const h = Math.max(o, c) + 0.1 + random() * 0.8;
    const l = Math.min(o, c) - 0.1 - random() * 0.8;
    bars.push({ i, t: new Date(Date.UTC(2026, 0, 1, 0, i * stepMinutes)).toISOString(), o, h, l, c });
    price = c;
  }
  return bars;
}

function namedFixture(target) {
  const bars = [];
  let price = 100;
  for (let i = 0; i < 120; i++) {
    const o = price, c = o + 0.04, h = c + 0.12, l = o - 0.12;
    bars.push({ i, t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString(), o, h, l, c });
    price = c;
  }
  const add = (o, c, h, l) => bars.push({ i: bars.length, t: new Date(Date.UTC(2026, 0, 1, 0, bars.length * 5)).toISOString(), o, h, l, c });
  const append = (rows) => rows.forEach((row) => add(...row));
  const shapes = {
    BULLISH_ENGULFING: [[100.2, 99.2, 100.4, 99.0], [99.0, 100.7, 100.9, 98.8]],
    BEARISH_ENGULFING: [[99.0, 100.0, 100.2, 98.8], [100.2, 98.5, 100.4, 98.3]],
    HAMMER: [[100.0, 99.5, 100.1, 99.4], [99.5, 99.0, 99.6, 98.9], [99.0, 98.5, 99.1, 98.4], [98.3, 98.45, 98.55, 96.5]],
    SHOOTING_STAR: [[100.0, 100.5, 100.6, 99.9], [100.5, 101.0, 101.1, 100.4], [101.0, 101.5, 101.6, 100.9], [102.2, 102.05, 104.0, 102.0]],
    MORNING_STAR: [[103.0, 101.0, 103.1, 100.9], [100.9, 100.95, 101.1, 100.75], [101.0, 102.2, 102.3, 100.9]],
    EVENING_STAR: [[101.0, 103.0, 103.1, 100.9], [103.1, 103.05, 103.2, 102.9], [103.0, 101.8, 103.1, 101.7]],
    THREE_WHITE_SOLDIERS: [[100.0, 100.8, 100.9, 99.9], [100.7, 101.5, 101.6, 100.6], [101.4, 102.2, 102.3, 101.3]],
    THREE_BLACK_CROWS: [[102.2, 101.4, 102.3, 101.3], [101.5, 100.7, 101.6, 100.6], [100.8, 100.0, 100.9, 99.9]],
    INSIDE_BAR: [[100.0, 99.0, 100.5, 98.5], [99.5, 99.7, 100.0, 99.2]],
    OUTSIDE_BAR: [[100.0, 100.1, 100.3, 99.7], [100.1, 99.9, 100.8, 99.2]],
    DRAGONFLY_DOJI: [[100.0, 100.05, 100.1, 98.0]],
    GRAVESTONE_DOJI: [[100.0, 100.05, 102.0, 99.95]],
    LONG_LEGGED_DOJI: [[100.0, 100.05, 101.4, 98.6]],
    BULLISH_BELT_HOLD: [[100.0, 101.8, 101.9, 100.0]],
    BEARISH_BELT_HOLD: [[101.8, 100.0, 101.8, 99.9]],
    THREE_INSIDE_UP: [[103.0, 100.0, 103.1, 99.9], [101.4, 101.0, 101.6, 100.8], [101.0, 103.5, 103.6, 100.9]],
    THREE_INSIDE_DOWN: [[100.0, 103.0, 103.1, 99.9], [101.6, 102.0, 102.2, 101.4], [102.0, 99.5, 102.1, 99.3]],
    THREE_OUTSIDE_UP: [[103.0, 100.0, 103.1, 99.9], [99.8, 103.5, 103.7, 99.6], [103.5, 104.5, 104.6, 103.4]],
    THREE_OUTSIDE_DOWN: [[100.0, 103.0, 103.1, 99.9], [103.2, 99.5, 103.4, 99.3], [99.5, 98.5, 99.6, 98.3]],
    ABANDONED_BABY_BULLISH: [[103.0, 100.0, 103.1, 99.9], [99.0, 99.01, 99.1, 98.95], [100.5, 102.0, 102.1, 100.4]],
    ABANDONED_BABY_BEARISH: [[100.0, 103.0, 103.1, 99.9], [104.0, 104.01, 104.1, 103.95], [102.5, 101.0, 102.6, 100.9]],
    BULLISH_KICKER: [[101.0, 100.0, 101.2, 99.8], [102.0, 104.0, 104.2, 101.9]],
    BEARISH_KICKER: [[100.0, 101.0, 101.2, 99.8], [98.0, 96.0, 98.1, 95.8]],
    RISING_THREE_METHODS: [[100.0, 103.0, 103.2, 99.8], [102.5, 102.0, 102.7, 101.8], [102.4, 101.9, 102.6, 101.7], [102.3, 101.8, 102.5, 101.6], [102.0, 104.0, 104.2, 101.9]],
    FALLING_THREE_METHODS: [[103.0, 100.0, 103.2, 99.8], [100.5, 101.0, 101.2, 100.3], [100.6, 101.1, 101.3, 100.4], [100.7, 101.2, 101.4, 100.5], [101.0, 98.0, 101.2, 97.8]],
    MATCHING_LOW: [[100.0, 98.5, 100.1, 98.3], [99.2, 98.5, 99.3, 98.3]],
    MATCHING_HIGH: [[98.5, 100.0, 100.2, 98.4], [99.2, 100.0, 100.2, 99.0]],
    BULLISH_COUNTERATTACK: [[101.5, 99.0, 101.7, 98.8], [98.5, 99.0, 99.2, 98.3]],
    BEARISH_COUNTERATTACK: [[98.5, 101.0, 101.2, 98.3], [101.5, 101.0, 101.6, 100.7]],
    BULLISH_STICK_SANDWICH: [[100.0, 98.5, 100.2, 98.3], [98.7, 100.0, 100.2, 98.5], [100.0, 98.5, 100.1, 98.2]],
    BULLISH_TASUKI_GAP: [[100.0, 101.0, 101.2, 99.9], [101.5, 102.5, 102.7, 101.4], [102.4, 102.0, 102.6, 101.2]],
    BEARISH_TASUKI_GAP: [[102.0, 101.0, 102.1, 100.8], [100.5, 99.5, 100.6, 99.3], [99.6, 100.0, 100.2, 99.4]],
    BULLISH_MAT_HOLD: [[100.0, 103.0, 103.2, 99.8], [103.5, 103.0, 103.6, 102.7], [102.9, 102.5, 103.0, 102.2], [102.7, 102.2, 102.8, 101.9], [102.1, 104.0, 104.2, 102.0]],
    BEARISH_MAT_HOLD: [[103.0, 100.0, 103.2, 99.8], [99.5, 100.0, 100.2, 99.2], [100.1, 100.5, 100.6, 99.9], [100.3, 100.8, 100.9, 100.0], [100.7, 98.0, 100.9, 97.8]],
    THREE_STARS_IN_SOUTH: [[103.0, 100.0, 103.2, 98.8], [100.0, 99.4, 100.1, 99.0], [99.4, 99.2, 99.5, 99.1]],
    THREE_STARS_IN_NORTH: [[100.0, 103.0, 104.5, 99.8], [103.0, 103.6, 104.3, 102.9], [103.6, 104.0, 104.2, 103.4]],
  };
  append(shapes[target]);
  return bars;
}

// A current named pattern with no historical occurrences. The conditional
// posterior must remain exactly on the aggregate prior and expose full
// shrinkage instead of turning one unseen shape into a directional claim.
function sparseNamedFixture() {
  const bars = [];
  let price = 100;
  for (let i = 0; i < 180; i++) {
    const o = price, c = o + 0.03, h = c + 0.08, l = o - 0.08;
    bars.push({ i, t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString(), o, h, l, c });
    price = c;
  }
  const i = bars.length;
  bars.push({ i, t: new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString(), o: 101, h: 103.2, l: 100.8, c: 103 });
  return bars;
}

const { analyzeCandlePattern, analyzeMultiTimeframe, assessContribution, patternSessionAt, chronologicalIndependentCount, causalCandidateEffectiveN, decomposeNovelty } = await directModule("src/lib/candlePatternAtlas.ts");
// Independent support is a chronological packing claim, not a distance-rank
// claim. It must be invariant to candidate order and monotonic for subsets.
const packedTape = [40, 5, 25, 10, 55, 25, 90];
assert.equal(chronologicalIndependentCount(packedTape, 20), 4, "chronological packing must deduplicate and greedily retain the earliest valid endpoints");
assert.equal(chronologicalIndependentCount([...packedTape].reverse(), 20), 4, "independent support must not depend on distance/ranking order");
assert.ok(chronologicalIndependentCount([25, 55, 90], 20) <= chronologicalIndependentCount(packedTape, 20), "a selected endpoint subset cannot exceed full chronological support");
assert.equal(chronologicalIndependentCount([Number.NaN, 3.9, 4.1], 1), 2, "non-finite endpoints must be ignored while valid endpoints are normalized");
assert.equal(chronologicalIndependentCount([0, 1, 2], 0), 3, "non-positive purge spacing must remain bounded to one bar");
assert.equal(chronologicalIndependentCount([0, 1, 2], Number.NaN), 3, "invalid purge spacing must not collapse chronological support");
// Causal candidate support uses scale-invariant Kish weighting, then applies
// the chronological feature+outcome purge as a hard upper bound.  This keeps
// equally weighted distant analogues from collapsing to the 0.05 similarity
// floor while preserving the same posterior weights used by callers.
const lowMassCausalRows = [0, 10, 20].map((end) => ({ d: 1, end, similarity: 0.1, sameRegime: true, sameSession: true }));
assert.equal(causalCandidateEffectiveN(lowMassCausalRows, 1, 1), 3, "equal low-mass causal candidates should retain Kish support");
assert.equal(causalCandidateEffectiveN([...lowMassCausalRows].reverse(), 1, 1), 3, "causal effective support must be invariant to ranking order");
assert.equal(causalCandidateEffectiveN([{ d: 0, end: 0 }, { d: 0, end: 2 }, { d: 0, end: 4 }], 2, 1), 2, "feature and H+1 spans must cap causal support chronologically");
assert.equal(causalCandidateEffectiveN([{ d: Number.NaN, end: 0 }, { d: 0, end: 2 }], 1, 1), 1, "malformed candidate weights must not poison valid causal support");
const noveltyProbe = decomposeNovelty([
  { distance: 0.1, endIndex: 10 },
  { distance: 0.2, endIndex: 11 },
  { distance: 0.3, endIndex: 12 },
  { distance: 0.8, endIndex: 40 },
], 3);
assert.equal(noveltyProbe.causalCandidates, 4, "novelty decomposition should count finite causal candidates");
assert.equal(noveltyProbe.nearbyCandidates, 3, "novelty decomposition should retain the known-distance neighbourhood");
assert.equal(noveltyProbe.nearbyIndependentCandidates, 1, "novelty decomposition should purge overlapping nearby endpoints");
assert.equal(noveltyProbe.label, "SUPPORT_LIMITED", "a close but heavily overlapping neighbourhood should be support-limited");
assert.equal(noveltyProbe.distanceScore, 0.143, "distance contribution should use the same causal known-distance scale");
assert.equal(noveltyProbe.overlapGap, 0.5, "novelty decomposition should expose overlap-driven support inflation");
assert.equal(decomposeNovelty([
  { distance: 0.1, endIndex: 10 },
  { distance: 0.2, endIndex: 20 },
  { distance: 0.3, endIndex: 30 },
], 3).label, "REPEATABLE", "close, independently supported analogues should be labelled repeatable");
assert.equal(decomposeNovelty([{ distance: 0.9, endIndex: 10 }], 3).label, "DISTANCE_LIMITED", "distant geometry should be distinguished from sparse nearby support");
assert.equal(decomposeNovelty([{ distance: 0.1, endIndex: 10 }], 3).label, "SUPPORT_LIMITED", "one close analogue without independent support should be support-limited");
assert.equal(decomposeNovelty([], 3).label, "INSUFFICIENT", "empty causal support should fail closed as insufficient");
assert.equal(patternSessionAt("2026-01-01T07:59:00.000Z"), "ASIA");
assert.equal(patternSessionAt("2026-01-01T08:00:00.000Z"), "LONDON");
assert.equal(patternSessionAt("2026-01-01T12:00:00.000Z"), "LONDON_NY_OVERLAP");
assert.equal(patternSessionAt("2026-01-01T16:00:00.000Z"), "NEW_YORK");
assert.equal(patternSessionAt("2026-01-01T21:00:00.000Z"), "OFF_HOURS");
assert.equal(patternSessionAt("2026-01-01 08:00:00"), "LONDON", "timezone-less feed timestamps are interpreted as UTC");
assert.equal(patternSessionAt("2026-01-01T08:00:00+0000"), "LONDON", "compact ISO offsets remain usable session timestamps");
assert.equal(patternSessionAt("not-a-time"), "UNKNOWN");
const bars = fixture();
const result = analyzeCandlePattern(bars, "M5");
assert.equal(result.ok, true, "fixture should be analyzable");
assert.ok(["UP", "DOWN", "FLAT"].includes(result.consensus.direction));
if (result.consensus.strength < 0.05) assert.equal(result.consensus.direction, "FLAT", "near-tied single-timeframe posteriors must remain FLAT");
if (result.consensus.direction === "FLAT") assert.equal(result.consensus.strength, 0, "FLAT local forecasts must not expose directional strength");
// Novelty is one causal support claim at the persisted snapshot boundary:
// a forged score/label pair must abstain even when the posterior is otherwise
// complete. A producer-generated novelty triple remains eligible.
const validNoveltyContribution = assessContribution(structuredClone(result), "M5", null, 3);
assert.equal(validNoveltyContribution.gate, "PASS", "producer-generated novelty metadata should remain usable");
assert.ok(Number.isInteger(result.novelty.nearbyCandidates) && result.novelty.nearbyCandidates >= 0, "novelty should expose purged nearby support count");
assert.ok(result.novelty.nearbyRate >= 0 && result.novelty.nearbyRate <= 1, "novelty nearby support rate must be bounded");
assert.ok(result.novelty.nearbyCandidates >= result.matches.filter((match) => match.distance <= 0.35).length, "nearby support must include the full causal candidate tape");
assert.equal(result.novelty.nearbyRate, Number((result.novelty.nearbyCandidates / Math.max(1, result.analogueCoverage.causalCandidates)).toFixed(4)), "nearby support rate must use causal candidates as denominator");
assert.ok(Number.isInteger(result.novelty.nearbyIndependentCandidates) && result.novelty.nearbyIndependentCandidates >= 0, "novelty should expose overlap-adjusted nearby support count");
assert.ok(result.novelty.nearbyIndependentCandidates <= result.novelty.nearbyCandidates, "independent nearby support cannot exceed raw nearby support");
assert.equal(result.novelty.nearbyIndependentRate, Number((result.novelty.nearbyIndependentCandidates / Math.max(1, result.analogueCoverage.causalCandidates)).toFixed(4)), "independent nearby support rate must use causal candidates as denominator");
assert.ok(result.novelty.nearbyIndependentRate >= 0 && result.novelty.nearbyIndependentRate <= result.novelty.nearbyRate, "overlap-adjusted novelty density must remain bounded by raw density");
const contradictoryNovelty = structuredClone(result);
contradictoryNovelty.novelty = { nearestDistance: 0.1, score: 1, label: "UNSEEN" };
const contradictoryContribution = assessContribution(contradictoryNovelty, "M5", null, 3);
assert.equal(contradictoryContribution.gate, "BLOCKED", "contradictory novelty metadata must fail closed");
assert.match(contradictoryContribution.reason, /novelty support metadata is malformed/i);
const malformedNoveltySupport = structuredClone(result);
malformedNoveltySupport.novelty.nearbyRate = 2;
assert.equal(assessContribution(malformedNoveltySupport, "M5", null, 3).gate, "BLOCKED", "malformed novelty neighbourhood diagnostics must fail closed");
const inconsistentNoveltySupport = structuredClone(result);
inconsistentNoveltySupport.novelty.nearbyRate = inconsistentNoveltySupport.novelty.nearbyRate > 0 ? 0 : 1;
assert.equal(assessContribution(inconsistentNoveltySupport, "M5", null, 3).gate, "BLOCKED", "inconsistent novelty count/rate support must fail closed");
const overclaimedNoveltySupport = structuredClone(result);
overclaimedNoveltySupport.novelty.nearbyCandidates = overclaimedNoveltySupport.analogueCoverage.causalCandidates + 1;
assert.equal(assessContribution(overclaimedNoveltySupport, "M5", null, 3).gate, "BLOCKED", "novelty support cannot exceed causal analogue coverage");
const malformedIndependentNoveltySupport = structuredClone(result);
malformedIndependentNoveltySupport.novelty.nearbyIndependentRate = malformedIndependentNoveltySupport.novelty.nearbyIndependentRate > 0 ? 0 : 1;
assert.equal(assessContribution(malformedIndependentNoveltySupport, "M5", null, 3).gate, "BLOCKED", "inconsistent independent novelty density must fail closed");
const overclaimedIndependentNoveltySupport = structuredClone(result);
overclaimedIndependentNoveltySupport.novelty.nearbyIndependentCandidates = overclaimedIndependentNoveltySupport.novelty.nearbyCandidates + 1;
assert.equal(assessContribution(overclaimedIndependentNoveltySupport, "M5", null, 3).gate, "BLOCKED", "independent novelty support cannot exceed nearby support");
const malformedIndependentCoverage = structuredClone(result);
malformedIndependentCoverage.analogueCoverage.independentRate = malformedIndependentCoverage.analogueCoverage.independentRate > 0 ? 0 : 1;
assert.equal(assessContribution(malformedIndependentCoverage, "M5", null, 3).gate, "BLOCKED", "inconsistent independent analogue coverage must fail closed");
const overclaimedIndependentCoverage = structuredClone(result);
overclaimedIndependentCoverage.analogueCoverage.independentSelectedSamples = overclaimedIndependentCoverage.analogueCoverage.independentCandidates + 1;
assert.equal(assessContribution(overclaimedIndependentCoverage, "M5", null, 3).gate, "BLOCKED", "independent selected support cannot exceed full causal support");
const overclaimedSelectedCoverage = structuredClone(result);
overclaimedSelectedCoverage.analogueCoverage.independentSelectedSamples = overclaimedSelectedCoverage.analogueCoverage.selectedSamples + 1;
assert.equal(assessContribution(overclaimedSelectedCoverage, "M5", null, 3).gate, "BLOCKED", "independent selected support cannot exceed selected posterior rows");
const malformedRankedCoverage = structuredClone(result);
malformedRankedCoverage.analogueCoverage.independentRankedRate = malformedRankedCoverage.analogueCoverage.independentRankedRate > 0 ? 0 : 1;
assert.equal(assessContribution(malformedRankedCoverage, "M5", null, 3).gate, "BLOCKED", "inconsistent rank-capped independent coverage must fail closed");
const overclaimedRankedCoverage = structuredClone(result);
overclaimedRankedCoverage.analogueCoverage.independentRankedCandidates = overclaimedRankedCoverage.analogueCoverage.independentCandidates + 1;
assert.equal(assessContribution(overclaimedRankedCoverage, "M5", null, 3).gate, "BLOCKED", "rank-capped independent support cannot exceed full causal support");
// Rank-aware coverage remains one causal claim even for legacy snapshots that
// omit the optional independent-rank fields. Reject a forged retained/selected
// chain instead of allowing it to pass through the novelty validator.
const overclaimedLegacyRankedCoverage = structuredClone(result);
delete overclaimedLegacyRankedCoverage.analogueCoverage.independentRankedCandidates;
delete overclaimedLegacyRankedCoverage.analogueCoverage.independentRankedRate;
overclaimedLegacyRankedCoverage.analogueCoverage.rankedCandidates = overclaimedLegacyRankedCoverage.analogueCoverage.causalCandidates + 1;
assert.equal(assessContribution(overclaimedLegacyRankedCoverage, "M5", null, 3).gate, "BLOCKED", "ranked support cannot exceed causal support when independent rank metadata is absent");
const overselectedLegacyRankedCoverage = structuredClone(result);
delete overselectedLegacyRankedCoverage.analogueCoverage.independentRankedCandidates;
delete overselectedLegacyRankedCoverage.analogueCoverage.independentRankedRate;
overselectedLegacyRankedCoverage.analogueCoverage.selectedSamples = overselectedLegacyRankedCoverage.analogueCoverage.rankedCandidates + 1;
assert.equal(assessContribution(overselectedLegacyRankedCoverage, "M5", null, 3).gate, "BLOCKED", "selected support cannot exceed retained ranked support");
// The selected context is a subset of the distance-ranked retained tape. Its
// purged independent support therefore cannot exceed the rank-capped support;
// validate that final retained → selected link explicitly.
const overselectedIndependentCoverage = structuredClone(result);
overselectedIndependentCoverage.analogueCoverage.independentSelectedSamples = overselectedIndependentCoverage.analogueCoverage.independentRankedCandidates + 1;
overselectedIndependentCoverage.analogueCoverage.independentSelectedRate = Number((overselectedIndependentCoverage.analogueCoverage.independentSelectedSamples / Math.max(1, overselectedIndependentCoverage.analogueCoverage.causalCandidates)).toFixed(4));
assert.equal(assessContribution(overselectedIndependentCoverage, "M5", null, 3).gate, "BLOCKED", "selected independent support cannot exceed rank-capped support");
const forgedRetentionRate = structuredClone(result);
forgedRetentionRate.analogueCoverage.retainedRate = forgedRetentionRate.analogueCoverage.retainedRate > 0 ? 0 : 1;
assert.equal(assessContribution(forgedRetentionRate, "M5", null, 3).gate, "BLOCKED", "ranked retention rate must match the retained/causal support chain");
const forgedSelectionRate = structuredClone(result);
forgedSelectionRate.analogueCoverage.selectedRate = forgedSelectionRate.analogueCoverage.selectedRate > 0 ? 0 : 1;
assert.equal(assessContribution(forgedSelectionRate, "M5", null, 3).gate, "BLOCKED", "selected retention rate must match the selected/causal support chain");
const quiet = analyzeCandlePattern(subThresholdFixture(), "M5", "XAUUSD", { adaptive: false, lookback: 5 });
assert.equal(quiet.ok, true, "sub-threshold fixture should be analyzable");
assert.equal(quiet.walkForward.hitRate, 1, "walk-forward should classify sub-threshold ATR moves as FLAT, matching live outcomes");
assert.equal(quiet.walkForward.baseline, 1, "quiet tape baseline should remain FLAT");
// H+1 held-out support overlaps across both the lookback feature window and
// the forward label bar.  With lookback=5 and one-bar query spacing, 109
// labels therefore have at most 109 / 6 independent support.  This guards
// against walk-forward uncertainty reverting to a lookback-only overlap cap.
assert.ok(quiet.walkForward.effectiveN <= quiet.walkForward.evaluated / 6 + 0.01,
  "walk-forward effective support must include the H+1 outcome span");
assert.ok(quiet.walkForward.probabilistic.reliability.effectiveN <= quiet.walkForward.evaluated / 6 + 0.01,
  "probability reliability effective support must use the same H+1 overlap span");
const stability = result.walkForward.stability;
assert.ok(stability, "walk-forward should expose chronological out-of-sample stability");
assert.equal(stability.evaluated, result.walkForward.evaluated);
assert.equal(result.walkForward.sampleN, result.walkForward.evaluated, "walk-forward sampleN must report all held-out labels");
assert.ok(Number.isFinite(result.walkForward.effectiveN), "walk-forward should report overlap-adjusted effective support");
assert.ok(result.walkForward.effectiveN >= 1 && result.walkForward.effectiveN <= result.walkForward.evaluated, "effective support must not exceed held-out rows");
assert.ok(result.walkForward.hitRateInterval95 && result.walkForward.hitRateInterval95.lower >= 0 && result.walkForward.hitRateInterval95.lower <= result.walkForward.hitRateInterval95.upper && result.walkForward.hitRateInterval95.upper <= 1, "walk-forward hit-rate should expose a bounded Wilson interval");
assert.ok(result.walkForward.hitRateInterval95.lower <= result.walkForward.hitRate + 0.001 && result.walkForward.hitRate <= result.walkForward.hitRateInterval95.upper + 0.001, "Wilson interval should contain the observed hit-rate");
assert.equal(stability.folds.length, 3, "sufficient fixture should produce three chronological folds");
assert.equal(stability.folds.reduce((sum, fold) => sum + fold.evaluated, 0), stability.evaluated);
assert.ok(stability.folds.every((fold) => fold.evaluated >= 4 && fold.hitRate != null && fold.baseline != null && fold.lift != null));
assert.ok(stability.folds.every((fold) => fold.firstQueryIndex != null && fold.lastQueryIndex != null && fold.firstQueryIndex <= fold.lastQueryIndex));
assert.ok(stability.folds.slice(1).every((fold, index) => fold.firstQueryIndex > stability.folds[index].lastQueryIndex), "OOS folds must remain chronological and non-overlapping");
assert.ok(stability.positiveLiftFolds >= 0 && stability.positiveLiftFolds <= stability.folds.length);
assert.ok(stability.hitRateStdDev != null && stability.hitRateStdDev >= 0);
assert.ok(stability.liftStdDev != null && stability.liftStdDev >= 0);
assert.ok(stability.liftRange != null && stability.liftRange >= 0 && stability.liftRange <= 2);
assert.ok(["STABLE", "MIXED", "UNSTABLE", "INSUFFICIENT"].includes(stability.label));
const probabilistic = result.walkForward.probabilistic;
assert.ok(probabilistic, "walk-forward should expose causal H+1 probabilistic validation");
assert.equal(probabilistic.horizon, 1);
assert.equal(probabilistic.evaluated, result.walkForward.evaluated);
assert.ok(probabilistic.brierScore != null && probabilistic.brierScore >= 0 && probabilistic.brierScore <= 2);
assert.ok(probabilistic.logLoss != null && probabilistic.logLoss >= 0);
const accuracyInterval = probabilistic.reliability.topClassAccuracyInterval95;
assert.ok(accuracyInterval && accuracyInterval.lower >= 0 && accuracyInterval.lower <= accuracyInterval.upper && accuracyInterval.upper <= 1, "top-class accuracy should carry a bounded Wilson interval");
assert.ok(probabilistic.reliability.majorityClassBaseline != null && probabilistic.reliability.majorityClassBaseline >= 0 && probabilistic.reliability.majorityClassBaseline <= 1);
assert.ok(probabilistic.reliability.topClassLiftVsBaseline != null && probabilistic.reliability.topClassLiftVsBaseline >= -1 && probabilistic.reliability.topClassLiftVsBaseline <= 1);
assert.ok(probabilistic.reliability.effectiveN >= 1 && probabilistic.reliability.effectiveN <= probabilistic.evaluated, "probability reliability must expose overlap-adjusted effective support");
assert.ok(accuracyInterval.lower <= probabilistic.reliability.topClassAccuracy + 0.001 && probabilistic.reliability.topClassAccuracy <= accuracyInterval.upper + 0.001, "top-class Wilson interval must contain the observed accuracy");
assert.equal(probabilistic.calibrationBins.reduce((sum, bin) => sum + bin.count, 0), probabilistic.evaluated);
assert.ok(probabilistic.calibrationBins.every((bin) => bin.lower >= 0 && bin.upper <= 1 && bin.lower < bin.upper));
assert.equal(probabilistic.reliability.minimumBinCount, 4);
assert.equal(probabilistic.reliability.supportedBins, probabilistic.calibrationBins.filter((bin) => bin.count >= probabilistic.reliability.minimumBinCount).length);
assert.ok(probabilistic.reliability.supportedSampleRate >= 0 && probabilistic.reliability.supportedSampleRate <= 1);

const sparseCalibration = analyzeCandlePattern(sparseCalibrationFixture(), "M5", "XAUUSD", { adaptive: false, lookback: 5 });
const sparseReliability = sparseCalibration.walkForward.probabilistic.reliability;
assert.ok(sparseReliability.populatedBins >= 2, "sparse calibration fixture should populate multiple confidence bins");
assert.ok(sparseReliability.supportedBins < sparseReliability.populatedBins, "at least one confidence bin should be below the support floor");
assert.equal(sparseReliability.status, "INSUFFICIENT", "sparse confidence bins must remain insufficient for calibration claims");
for (const horizon of result.predictions) {
  const calibration = horizon.calibration;
  assert.ok(calibration, "aggregate horizons should expose uncertainty calibration");
  assert.equal(calibration.method, "WILSON_95_EFFECTIVE_N");
  assert.equal(calibration.horizon, horizon.horizon, "calibration support must remain bound to its outcome horizon");
  assert.ok(calibration.overlapFactor != null && calibration.overlapFactor >= 0.1 && calibration.overlapFactor <= 1, "aggregate calibration should expose bounded analogue-overlap support");
  assert.ok(calibration.effectiveN >= 3, "the aggregate smoothing prior contributes to effective support");
  assert.ok(calibration.entropy >= 0 && calibration.entropy <= 1);
  assert.ok(calibration.reliability >= 0 && calibration.reliability <= 1);
  for (const direction of ["up", "down", "flat"]) {
    const interval = calibration.interval95[direction];
    assert.ok(interval.lower >= 0 && interval.lower <= interval.upper && interval.upper <= 1);
    assert.ok(interval.lower <= horizon[direction] + 0.001 && horizon[direction] <= interval.upper + 0.001, `${direction} probability should lie in its Wilson interval`);
  }
}
// Horizon-specific uncertainty must account for the full causal evidence span
// (feature lookback plus forward outcome). Longer horizons therefore cannot
// claim equal independent support when endpoint spacing is held fixed.
for (let index = 1; index < result.predictions.length; index++) {
  const previous = result.predictions[index - 1].calibration;
  const current = result.predictions[index].calibration;
  assert.ok(current.overlapFactor <= previous.overlapFactor + 0.001, "longer outcome horizons must not claim less endpoint overlap");
  assert.ok(current.effectiveN <= previous.effectiveN + 0.001, "longer outcome horizons must not claim more independent support");
}
assert.ok(
  result.predictions[2].calibration.overlapFactor < result.predictions[0].calibration.overlapFactor,
  "H+3 uncertainty must discount the shared feature/outcome tape beyond H+1",
);
assert.ok(result.adaptive, "default analysis should expose adaptive lookback evidence");
assert.deepEqual(result.adaptive.candidates.map((item) => item.lookback), [3, 4, 5, 6, 7], "adaptive candidates should cover the configured context ladder");
assert.ok(result.adaptive.candidates.some((item) => item.evaluated > 0), "adaptive validation should evaluate at least one candidate");
assert.ok(result.lookback >= 3 && result.lookback <= 7, "selected adaptive lookback must be inside the candidate ladder");
assert.equal(result.adaptive.selectedLookback, result.lookback, "selected lookback must match the reported analysis context");
assert.equal(result.adaptive.regime, result.regime.label, "adaptive selection must report the query regime");
assert.equal(typeof result.adaptive.fallback, "boolean", "adaptive selection must disclose regime fallback");
for (const candidate of result.adaptive.candidates) {
  assert.equal(typeof candidate.fallback, "boolean");
  assert.ok(candidate.evaluated >= 0 && candidate.regimeQueries >= 0 && candidate.sameRegimeCandidates >= 0);
}
assert.ok(result.matches.length > 0, "historical analogue search should return matches");
assert.ok(result.analogueCoverage, "analysis should expose causal analogue coverage");
assert.equal(result.analogueCoverage.causalCandidates >= result.analogueCoverage.rankedCandidates, true);
assert.equal(result.analogueCoverage.rankedCandidates, result.matches.length);
assert.equal(result.analogueCoverage.selectedSamples, result.predictions[0].sampleN);
assert.equal(result.analogueCoverage.selectedRate, Number((result.predictions[0].sampleN / result.analogueCoverage.causalCandidates).toFixed(4)));
assert.equal(result.analogueCoverage.retainedRate, Number((result.matches.length / result.analogueCoverage.causalCandidates).toFixed(4)));
assert.equal(result.analogueCoverage.maxMatches, 48);
assert.ok(Number.isInteger(result.analogueCoverage.independentCandidates));
assert.ok(result.analogueCoverage.independentCandidates >= 0 && result.analogueCoverage.independentCandidates <= result.analogueCoverage.causalCandidates);
assert.equal(result.analogueCoverage.independentRate, Number((result.analogueCoverage.independentCandidates / Math.max(1, result.analogueCoverage.causalCandidates)).toFixed(4)));
assert.ok(Number.isInteger(result.analogueCoverage.independentRankedCandidates), "rank-capped analogue support should expose independent endpoints");
assert.ok(result.analogueCoverage.independentRankedCandidates >= 0 && result.analogueCoverage.independentRankedCandidates <= result.analogueCoverage.independentCandidates, "rank-capped independent support cannot exceed full causal support");
assert.equal(result.analogueCoverage.independentRankedRate, Number((result.analogueCoverage.independentRankedCandidates / Math.max(1, result.analogueCoverage.rankedCandidates)).toFixed(4)));
assert.ok(Number.isInteger(result.analogueCoverage.independentSelectedSamples));
assert.ok(result.analogueCoverage.independentSelectedSamples <= result.analogueCoverage.independentCandidates);
assert.ok(result.analogueCoverage.independentSelectedSamples <= result.analogueCoverage.independentRankedCandidates, "context-selected support cannot exceed rank-capped support");
assert.equal(result.analogueCoverage.independentSelectedRate, Number((result.analogueCoverage.independentSelectedSamples / Math.max(1, result.analogueCoverage.causalCandidates)).toFixed(4)));
assert.ok(result.analogueCoverage.independentSelectedSamples <= result.analogueCoverage.selectedSamples);
// Posterior concentration is a causal, shadow-only fragility diagnostic. It
// must describe the same selected rows as H+1 support, stay bounded, and keep
// chronological independence separate from similarity-weight concentration.
const concentration = result.analogueConcentration;
assert.ok(concentration, "analysis should expose causal analogue concentration");
assert.equal(concentration.samples, result.analogueCoverage.selectedSamples, "concentration must use the selected posterior tape");
assert.ok(concentration.totalWeight >= 0 && Number.isFinite(concentration.totalWeight));
assert.ok(concentration.topShare >= 0 && concentration.topShare <= 1);
assert.ok(concentration.hhi >= 0 && concentration.hhi <= 1);
assert.ok(concentration.effectiveN >= 0 && concentration.effectiveN <= concentration.samples);
assert.ok(Number.isInteger(concentration.independentSamples) && concentration.independentSamples <= concentration.samples);
assert.ok(concentration.independentRate >= 0 && concentration.independentRate <= 1);
assert.ok(["INSUFFICIENT", "BALANCED", "CONCENTRATED"].includes(concentration.label));
const noveltyDecomposition = result.novelty.decomposition;
assert.ok(noveltyDecomposition, "analysis should expose causal novelty decomposition");
assert.equal(noveltyDecomposition.causalCandidates, result.analogueCoverage.causalCandidates, "novelty decomposition must use the full causal candidate tape");
assert.equal(noveltyDecomposition.nearbyCandidates, result.novelty.nearbyCandidates, "novelty decomposition must reconcile nearby support counts");
assert.equal(noveltyDecomposition.nearbyIndependentCandidates, result.novelty.nearbyIndependentCandidates, "novelty decomposition must reconcile purged nearby support");
assert.equal(noveltyDecomposition.distanceScore, result.novelty.score, "distance decomposition must preserve the existing novelty score");
assert.ok(noveltyDecomposition.densityScore >= 0 && noveltyDecomposition.densityScore <= 1);
assert.ok(noveltyDecomposition.independentDensityScore >= 0 && noveltyDecomposition.independentDensityScore <= 1);
assert.ok(noveltyDecomposition.overlapGap >= 0 && noveltyDecomposition.overlapGap <= 1);
assert.ok(["INSUFFICIENT", "DISTANCE_LIMITED", "SUPPORT_LIMITED", "REPEATABLE", "MIXED"].includes(noveltyDecomposition.label));
const formingRow = {
  ...bars[bars.length - 1],
  i: bars.length,
  t: new Date(Date.parse(bars[bars.length - 1].t) + 5 * 60_000).toISOString(),
  closed: false,
};
const withFormingRow = analyzeCandlePattern([...bars, formingRow], "M5");
assert.deepEqual(withFormingRow.analogueConcentration, concentration, "forming/future rows must not change causal concentration support");
assert.deepEqual(withFormingRow.novelty.decomposition, noveltyDecomposition, "forming/future rows must not change causal novelty decomposition");
assert.deepEqual(withFormingRow.walkForward.probabilistic.drift, result.walkForward.probabilistic.drift, "forming/future rows must not change chronological drift evidence");
assert.ok(result.predictions.some((prediction) => (prediction.calibration?.overlapFactor ?? 1) < 1), "repeating analogue windows should expose clustered-support adjustment");
// Hierarchical context backoff may select a different causal subset, so the
// exact median spacing is data-dependent; the bounded factor above is the
// contract while the implementation remains median-gap based.
assert.ok(result.predictions[0].calibration?.overlapFactor != null, "clustered analogue uncertainty should expose median-gap support");
assert.ok(result.sessionCalibration, "analysis should expose causal session calibration evidence");
assert.equal(result.sessionCalibration.current, patternSessionAt(result.asOf));
assert.ok(result.sessionCalibration.totalSamples >= result.matches.length);
assert.ok(result.sessionCalibration.selectedSamples <= result.matches.length);
assert.ok(result.sessionCalibration.sameSessionEffectiveN >= 0);
assert.ok(result.sessionCalibration.uncertainty, "session calibration should expose overlap-adjusted uncertainty");
const sessionUncertainty = result.sessionCalibration.uncertainty;
assert.ok(sessionUncertainty.aggregateEffectiveN >= 0 && sessionUncertainty.aggregateEffectiveN <= result.sessionCalibration.totalSamples);
assert.ok(sessionUncertainty.currentSessionEffectiveN >= 0 && sessionUncertainty.currentSessionEffectiveN <= result.sessionCalibration.currentSessionSamples);
assert.ok(sessionUncertainty.selectedEffectiveN >= 0 && sessionUncertainty.selectedEffectiveN <= result.sessionCalibration.selectedSamples);
assert.ok(sessionUncertainty.selectedEffectiveN <= result.sessionCalibration.selectedSamples, "selected session uncertainty must use the posterior slice");
for (const intervalSet of [sessionUncertainty.aggregateInterval95, sessionUncertainty.currentSessionInterval95, sessionUncertainty.selectedInterval95]) {
  for (const interval of [intervalSet.up, intervalSet.down, intervalSet.flat]) {
    assert.ok(interval.lower >= 0 && interval.lower <= interval.upper && interval.upper <= 1, "session calibration Wilson intervals must be bounded");
  }
}
assert.equal(result.sessionCalibration.minimumEffectiveN, 3);
assert.equal(result.sessionCalibration.selectedSamples, result.predictions[0].sampleN);
assert.ok(result.matches.every((match) => match.session && typeof match.sameSession === "boolean"));
// Context-mismatched analogues remain available for sparse-tape fallback, but
// their outcome contribution is reduced so a session/regime shift cannot vote
// as strongly as a like-for-like causal analogue.
assert.ok(result.matches.every((match) => typeof match.contextWeight === "number" && match.contextWeight >= 0 && match.contextWeight <= 1));
assert.ok(result.matches.filter((match) => match.sameRegime && match.sameSession).every((match) => match.contextWeight === 1));
assert.ok(result.matches.some((match) => !match.sameRegime || !match.sameSession), "fixture should include a context-mismatched analogue");
assert.ok(result.matches.filter((match) => !match.sameRegime || !match.sameSession).every((match) => match.contextWeight < 1));
const predictionRows = result.matches.filter((match) => match.sameSession);
const predictionMatches = predictionRows.length >= 8 ? predictionRows : result.matches;
const weightedCounts = { UP: 1, DOWN: 1, FLAT: 1 };
for (const match of predictionMatches) {
  const weight = Math.max(0.05, match.similarity ** 2) * match.contextWeight;
  weightedCounts[match.outcome[0]] += weight;
}
const weightedTotal = weightedCounts.UP + weightedCounts.DOWN + weightedCounts.FLAT;
assert.deepEqual(
  { up: result.predictions[0].up, down: result.predictions[0].down, flat: result.predictions[0].flat },
  { up: Number((weightedCounts.UP / weightedTotal).toFixed(3)), down: Number((weightedCounts.DOWN / weightedTotal).toFixed(3)), flat: Number((weightedCounts.FLAT / weightedTotal).toFixed(3)) },
  "H+1 posterior must apply the causal regime/session context multiplier",
);
// Session calibration must use the same similarity/context weights as the
// posterior. This prevents a distant or mismatched endpoint from counting as
// a full calibration observation merely because it shares the UTC session.
const sessionBucket = result.sessionCalibration.buckets.find((bucket) => bucket.session === result.sessionCalibration.current);
assert.ok(sessionBucket, "current session must expose a calibration bucket");
const sessionRows = result.matches.filter((match) => match.session === result.sessionCalibration.current);
const sessionCounts = { UP: 0, DOWN: 0, FLAT: 0 };
let sessionTotalWeight = 0;
for (const match of sessionRows) {
  const weight = Math.max(0.05, match.similarity ** 2) * match.contextWeight;
  sessionCounts[match.outcome[0]] += weight;
  sessionTotalWeight += weight;
}
assert.equal(sessionBucket.upRate, Number((sessionCounts.UP / sessionTotalWeight).toFixed(3)), "session calibration UP rate must use causal posterior weights");
assert.equal(sessionBucket.downRate, Number((sessionCounts.DOWN / sessionTotalWeight).toFixed(3)), "session calibration DOWN rate must use causal posterior weights");
assert.equal(sessionBucket.flatRate, Number((sessionCounts.FLAT / sessionTotalWeight).toFixed(3)), "session calibration FLAT rate must use causal posterior weights");
assert.ok(result.regimeCalibration, "analysis should expose causal regime calibration evidence");
assert.equal(result.regimeCalibration.current, result.regime.label);
assert.equal(result.regimeCalibration.totalSamples, result.matches.length);
assert.ok(result.regimeCalibration.sameRegimeSamples <= result.regimeCalibration.totalSamples);
assert.ok(result.regimeCalibration.sameRegimeEffectiveN >= 0);
assert.equal(result.regimeCalibration.minimumEffectiveN, 3);
assert.equal(result.regimeCalibration.selectedSamples, result.regimeCalibration.fallback ? result.regimeCalibration.totalSamples : result.regimeCalibration.sameRegimeSamples);
assert.equal(result.regimeCalibration.mode, result.regimeCalibration.fallback ? "ALL_REGIMES" : "SAME_REGIME");
assert.ok(result.regimeCalibration.distributionShift >= 0 && result.regimeCalibration.distributionShift <= 1);
assert.ok(result.regimeCalibration.stability >= 0 && result.regimeCalibration.stability <= 1);
const regimeUncertainty = result.regimeCalibration.uncertainty;
assert.ok(regimeUncertainty, "regime calibration should expose overlap-adjusted uncertainty");
assert.ok(regimeUncertainty.aggregateEffectiveN >= 0 && regimeUncertainty.aggregateEffectiveN <= result.regimeCalibration.totalSamples);
assert.ok(regimeUncertainty.sameRegimeEffectiveN >= 0 && regimeUncertainty.sameRegimeEffectiveN <= result.regimeCalibration.sameRegimeSamples);
assert.ok(regimeUncertainty.selectedEffectiveN >= 0 && regimeUncertainty.selectedEffectiveN <= result.regimeCalibration.selectedSamples);
for (const intervalSet of [regimeUncertainty.aggregateInterval95, regimeUncertainty.sameRegimeInterval95, regimeUncertainty.selectedInterval95]) {
  for (const interval of [intervalSet.up, intervalSet.down, intervalSet.flat]) {
    assert.ok(interval.lower >= 0 && interval.lower <= interval.upper && interval.upper <= 1, "regime calibration Wilson intervals must be bounded");
  }
}
assert.equal(regimeUncertainty.selectedEffectiveN, result.regimeCalibration.fallback ? regimeUncertainty.aggregateEffectiveN : regimeUncertainty.sameRegimeEffectiveN,
  "selected regime uncertainty must follow the same causal fallback slice as selected rates");
for (const rates of [result.regimeCalibration.aggregate, result.regimeCalibration.sameRegime]) {
  assert.ok(Math.abs(rates.upRate + rates.downRate + rates.flatRate - 1) <= 0.002 || rates.meanReturnAtr === 0, "regime outcome rates should conserve probability mass");
}
const selectedRates = result.regimeCalibration.selected;
assert.ok(Math.abs(selectedRates.upRate + selectedRates.downRate + selectedRates.flatRate - 1) <= 0.002 || selectedRates.meanReturnAtr === 0, "selected regime rates should conserve probability mass");
assert.deepEqual(selectedRates, result.regimeCalibration.fallback ? result.regimeCalibration.aggregate : result.regimeCalibration.sameRegime, "selected rates must match the causal fallback slice");
assert.ok(result.recurrence.appeared, "repeating fixture should have an exact sequence recurrence");
assert.ok(result.recurrence.exactMatches > 0, "exact recurrence count should be positive");
// Recurrence uses the same causal endpoint purge as analogue matching: an
// endpoint and its full H+1/H+2/H+3 horizon must precede the query window.
const recurrenceEndpointCount = result.bars - result.lookback * 2 - 2;
assert.equal(result.recurrence.rate, Number((result.recurrence.exactMatches / recurrenceEndpointCount).toFixed(4)), "recurrence rate must use the exact eligible endpoint count");
assert.ok(result.recurrence.independentMatches >= 0 && result.recurrence.independentMatches <= result.recurrence.exactMatches);
assert.equal(result.recurrence.independentRate, Number((result.recurrence.independentMatches / recurrenceEndpointCount).toFixed(4)), "independent recurrence rate must use the same causal endpoint support");
assert.ok(Number.isFinite(result.recurrence.recencyWeightedRate) && result.recurrence.recencyWeightedRate >= 0 && result.recurrence.recencyWeightedRate <= 1, "recency recurrence rate must remain bounded");
assert.ok(Number.isFinite(result.recurrence.sameRegimeRecencyWeightedRate) && result.recurrence.sameRegimeRecencyWeightedRate >= 0 && result.recurrence.sameRegimeRecencyWeightedRate <= result.recurrence.recencyWeightedRate + 0.0001, "same-regime recency rate must remain bounded by aggregate support");
assert.equal(result.recurrence.recencyHalfLifeBars, Math.max(20, result.lookback * 8), "recency half-life must scale with the causal feature window");
assert.ok(result.recurrence.eligibleEndpoints >= result.recurrence.exactMatches, "recurrence denominator must cover every exact endpoint");
assert.ok(result.recurrence.potentialEndpoints >= result.recurrence.eligibleEndpoints, "potential recurrence capacity must bound contiguous support");
assert.equal(result.recurrence.gapExcludedEndpoints, result.recurrence.potentialEndpoints - result.recurrence.eligibleEndpoints, "gap exclusion count must reconcile arithmetic and contiguous endpoint support");
assert.ok(result.recurrence.supportCoverage >= 0 && result.recurrence.supportCoverage <= 1, "recurrence support coverage must be bounded");
assert.equal(result.recurrence.calibration.method, "WILSON_95_INDEPENDENT_ENDPOINTS", "recurrence calibration must identify independent causal endpoint support");
assert.ok(result.recurrence.calibration.independentOpportunities >= result.recurrence.calibration.effectiveN);
assert.equal(result.recurrence.calibration.independentRate, Number((result.recurrence.independentMatches / Math.max(1, result.recurrence.calibration.independentOpportunities)).toFixed(4)), "recurrence calibration must use purged independent opportunities");
assert.ok(result.recurrence.calibration.interval95.lower >= 0 && result.recurrence.calibration.interval95.upper <= 1);
// Missing historical bars must be removed from both recurrence support and its
// recency/uncertainty calibration; sparse tapes cannot become causal misses.
const gappyBars = bars.filter((_, index) => index !== 120);
const gappy = analyzeCandlePattern(gappyBars, "M5", "XAUUSD", { adaptive: false, lookback: result.lookback });
assert.ok(gappy.ok && gappy.recurrence.eligibleEndpoints < result.recurrence.eligibleEndpoints, "gaps must reduce causal recurrence opportunities");
assert.ok(gappy.recurrence.gapExcludedEndpoints > result.recurrence.gapExcludedEndpoints, "gaps must be visible as excluded recurrence endpoints");
assert.ok(gappy.recurrence.supportCoverage < result.recurrence.supportCoverage, "gaps must reduce recurrence support coverage");
assert.ok(gappy.recurrence.calibration.independentOpportunities <= gappy.recurrence.eligibleEndpoints, "gappy calibration support must remain bounded by contiguous endpoints");
// Independent recurrence support must purge the complete analogue evidence
// span (feature window + H+1..H+3 outcomes). A lookback-only purge would count
// adjacent exact windows whose historical labels still overlap.
assert.equal(chronologicalIndependentCount([10, 15, 18, 26], 8), 3, "chronological packing must include the outcome horizon spacing");
assert.equal(chronologicalIndependentCount([10, 15, 18, 26], 3), 4, "packing helper should remain spacing-parametric");
assert.ok(result.recurrence.lastSeen < result.asOf, "last exact recurrence must precede the query as-of time");
assert.ok(result.recurrence.nearMatches >= result.recurrence.exactMatches || result.recurrence.exactMatches === 0);
assert.ok(result.patternCoverage, "analysis should expose causal pattern inventory coverage");
assert.equal(result.patternCoverage.registrySize, 48, "coverage denominator should include the full named-pattern registry");
assert.ok(result.patternCoverage.observedUnique > 0 && result.patternCoverage.observedUnique <= result.patternCoverage.registrySize);
assert.equal(result.patternCoverage.observedRate, Number((result.patternCoverage.observedUnique / result.patternCoverage.registrySize).toFixed(4)));
assert.ok(result.patternCoverage.current.every((row) => ["UNSEEN", "RARE", "OCCASIONAL", "COMMON"].includes(row.rarity)));

// Re-running the same frozen tape must produce the same model evidence. This
// guards against accidental random sampling or mutation of the caller's bars.
const repeat = analyzeCandlePattern(bars, "M5");
assert.deepEqual(repeat, result, "analysis should be deterministic for an identical tape");
// Adaptive tuning and its chronological calibration must stay deterministic
// even after the causal ATR/regime caches are warm. This catches accidental
// dependence on cache insertion order or mutable candidate arrays.
assert.deepEqual(repeat.adaptive, result.adaptive, "adaptive causal posterior selection should be deterministic");
assert.deepEqual(repeat.walkForward.probabilistic, result.walkForward.probabilistic, "walk-forward calibration should be deterministic after cache warm-up");
const stableLookback = analyzeCandlePattern(bars, "M5", "XAUUSD", { adaptive: false, lookback: 5 });
const stableLookbackAgain = analyzeCandlePattern(bars, "M5", "XAUUSD", { adaptive: false, lookback: 5 });
assert.equal(stableLookback.adaptive, undefined, "explicit fixed lookback should disable adaptive selection");
assert.deepEqual(stableLookbackAgain, stableLookback, "fixed-lookback analysis should be deterministic");
assert.deepEqual(stableLookback.walkForward.hitRateInterval95, stableLookbackAgain.walkForward.hitRateInterval95, "effective-support confidence should be deterministic");

// Named candlestick registry fixtures. Each detector must identify the latest
// closed sequence and still emit the standard next-outcome distribution.
const namedTargets = [
  "BULLISH_ENGULFING", "BEARISH_ENGULFING", "HAMMER", "SHOOTING_STAR",
  "MORNING_STAR", "EVENING_STAR", "THREE_WHITE_SOLDIERS", "THREE_BLACK_CROWS",
  "INSIDE_BAR", "OUTSIDE_BAR",
  "DRAGONFLY_DOJI", "GRAVESTONE_DOJI", "LONG_LEGGED_DOJI", "BULLISH_BELT_HOLD", "BEARISH_BELT_HOLD",
  "THREE_INSIDE_UP", "THREE_INSIDE_DOWN", "THREE_OUTSIDE_UP", "THREE_OUTSIDE_DOWN",
  "ABANDONED_BABY_BULLISH", "ABANDONED_BABY_BEARISH", "BULLISH_KICKER", "BEARISH_KICKER",
  "RISING_THREE_METHODS", "FALLING_THREE_METHODS",
  "MATCHING_LOW", "MATCHING_HIGH", "BULLISH_COUNTERATTACK", "BEARISH_COUNTERATTACK",
  "BULLISH_STICK_SANDWICH", "BULLISH_TASUKI_GAP", "BEARISH_TASUKI_GAP",
  "BULLISH_MAT_HOLD", "BEARISH_MAT_HOLD", "THREE_STARS_IN_SOUTH", "THREE_STARS_IN_NORTH",
];
for (const target of namedTargets) {
  const named = analyzeCandlePattern(namedFixture(target), "M5", "XAUUSD", { adaptive: false, lookback: 5 });
  assert.equal(named.ok, true, `${target} fixture should be analyzable`);
  assert.ok(named.currentPatterns?.includes(target), `${target} should be detected on the latest closed sequence`);
  assert.equal(named.predictions.length, 3, `${target} should expose H+1/H+2/H+3 stats`);
  assert.ok(named.predictions.every((prediction) => prediction.sampleN >= 0 && prediction.sampleN <= named.matches.length));
  assert.ok(named.currentPatterns.length > 0, `${target} should expose at least one named pattern`);
  assert.ok(named.patternCounts?.every((row) => row.count >= 0 && row.rate >= 0 && row.rate <= 1), `${target} pattern counts must be normalized`);
  const coverageRow = named.patternCoverage?.current.find((row) => row.pattern === target);
  assert.ok(coverageRow, `${target} should expose causal coverage/rarity`);
  assert.equal(coverageRow.rarity, coverageRow.sampleN === 0 ? "UNSEEN" : coverageRow.sampleN < 3 || coverageRow.rate < 0.05 ? "RARE" : coverageRow.rate < 0.15 ? "OCCASIONAL" : "COMMON");
  assert.ok(named.patternCoverage.observedRate >= 0 && named.patternCoverage.observedRate <= 1);
  assert.ok(Array.isArray(named.namedPatternPredictions), `${target} should expose per-pattern horizon distributions`);
  for (const currentPattern of named.currentPatterns) {
    const row = named.namedPatternPredictions.find((item) => item.pattern === currentPattern);
    assert.ok(row, `${target} should report ${currentPattern} conditional evidence`);
    assert.ok(row.sampleN >= 0 && row.sampleN <= named.matches.length);
    assert.ok(row.rate >= 0 && row.rate <= 1);
    assert.ok(["UNSEEN", "SPARSE", "SUPPORTED"].includes(row.support));
    assert.equal(row.support, row.sampleN === 0 ? "UNSEEN" : row.support);
    assert.equal(row.predictions.length, 3);
    for (const horizon of row.predictions) {
      assert.ok(horizon.sampleN === row.sampleN);
      assert.ok(horizon.effectiveN >= 0);
      assert.ok(horizon.shrinkage >= 0 && horizon.shrinkage <= 1);
      assert.ok(Math.abs(horizon.up + horizon.down + horizon.flat - 1) <= 0.002, `${target} posterior must sum to one`);
      assert.ok(horizon.liftVsAggregate, `${target} posterior should expose conditional lift`);
      const lift = horizon.liftVsAggregate;
      for (const direction of ["up", "down", "flat"]) {
        assert.ok(Number.isFinite(lift[direction]) && lift[direction] >= -1 && lift[direction] <= 1, `${target} ${direction} lift must be bounded`);
      }
      assert.ok(Math.abs(lift.up + lift.down + lift.flat) <= 0.002, `${target} conditional lift must conserve probability mass`);
      assert.ok(horizon.calibration, `${target} posterior should expose uncertainty calibration`);
      assert.equal(horizon.calibration.method, "WILSON_95_EFFECTIVE_N");
      assert.ok(horizon.calibration.overlapFactor != null && horizon.calibration.overlapFactor >= 0.1 && horizon.calibration.overlapFactor <= 1, `${target} posterior should expose bounded analogue-overlap support`);
      assert.ok(horizon.calibration.effectiveN >= horizon.effectiveN + 5.9);
      assert.ok(horizon.calibration.entropy >= 0 && horizon.calibration.entropy <= 1);
      assert.ok(horizon.calibration.reliability >= 0 && horizon.calibration.reliability <= 1);
      for (const direction of ["up", "down", "flat"]) {
        const interval = horizon.calibration.interval95[direction];
        assert.ok(interval.lower <= horizon[direction] + 0.001 && horizon[direction] <= interval.upper + 0.001, `${target} ${direction} probability should lie in its Wilson interval`);
      }
    }
  }
  assert.ok(named.matches.every((match) => Array.isArray(match.patterns) && match.endIndex < named.bars - named.lookback - 1), `${target} match patterns must be causal`);
  assert.ok(named.matches.every((match) => match.endIndex < named.bars - named.lookback - 1), `${target} matches must remain before current window`);
}

const sparseNamed = analyzeCandlePattern(sparseNamedFixture(), "M5", "XAUUSD", { adaptive: false, lookback: 5 });
assert.equal(sparseNamed.ok, true, "sparse named fixture should be analyzable");
for (const pattern of ["BULLISH_MARUBOZU", "BULLISH_BELT_HOLD"]) {
  const row = sparseNamed.namedPatternPredictions.find((item) => item.pattern === pattern);
  assert.ok(row && row.sampleN === 0, `${pattern} should have no causal historical support`);
  assert.equal(row.support, "UNSEEN", `${pattern} should expose explicit unseen support state`);
  const posterior = row.predictions[0], aggregate = sparseNamed.predictions[0];
  assert.equal(posterior.shrinkage, 1, `${pattern} should be fully shrunk to aggregate prior when unseen`);
  assert.equal(posterior.up, aggregate.up, `${pattern} unseen UP posterior should equal aggregate`);
  assert.equal(posterior.down, aggregate.down, `${pattern} unseen DOWN posterior should equal aggregate`);
  assert.equal(posterior.flat, aggregate.flat, `${pattern} unseen FLAT posterior should equal aggregate`);
}

// Causal guard: every analogue ends far enough before the current lookback
// window that its entire H+1/H+2/H+3 outcome horizon is outside the query
// features. This purges overlapping labels from the current tape.
const queryStart = result.bars - result.lookback;
for (const match of result.matches) {
  assert.ok(match.endIndex + 3 < queryStart, "analogue outcome horizon may not overlap the current query window");
  assert.ok(match.endIndex + 3 < result.bars, "outcome horizon must be fully observed");
}

// A missing closed bar must invalidate a query window rather than letting the matcher bridge two non-adjacent candles.
const queryGapBars = fixture(120).filter((_, index) => index !== 116);
const queryGap = analyzeCandlePattern(queryGapBars, "M5", "XAUUSD", { adaptive: false, lookback: 5 });
assert.equal(queryGap.ok, false, "a discontinuous current query window must fail closed");
assert.equal(queryGap.reason, "NON_CONTIGUOUS_QUERY_WINDOW");
assert.ok(queryGap.dataQuality.gaps >= 1, "missing bars must be surfaced as data-quality gaps");

const invalid = [...bars, { i: 9999, t: "2026-01-03T00:00:00.000Z", o: 1, h: 0, l: 2, c: 1 }];
const invalidResult = analyzeCandlePattern(invalid, "M5");
assert.ok(invalidResult.dataQuality.invalidBars >= 1, "invalid OHLC rows should be counted");
assert.equal(invalidResult.bars, bars.length, "invalid rows must not enter the feature tape");

// Tape hygiene is fail-closed: a duplicate, an out-of-order row and an
// explicitly forming candle must not become analogue features. The fixed
// `now` keeps this regression deterministic while still exercising the
// timeframe close boundary; malformed timestamps are reported separately.
const hygiene = bars.slice();
// Use an aligned timestamp outside the original tape so the row is uniquely
// out-of-order rather than also being counted as a duplicate.
const outOfOrderTime = new Date(Date.parse(bars[0].t) - 5 * 60_000).toISOString();
hygiene.splice(120, 0, { ...bars[120], i: 9001, t: outOfOrderTime });
hygiene.push({ ...bars[40], i: 9002 }); // duplicate timestamp
hygiene.push({ ...bars[40], i: 9007, t: bars[40].t.replace(".000Z", "+0000") }); // same instant, compact offset
hygiene.push({ ...bars.at(-1), i: 9003, t: new Date(Date.parse(bars.at(-1).t) + 5 * 60_000).toISOString(), closed: false });
hygiene.push({ ...bars.at(-1), i: 9004, t: new Date(Date.parse(bars.at(-1).t) + 10 * 60_000).toISOString(), h: 0, l: 2, o: 1, c: 1 });
hygiene.push({ ...bars.at(-1), i: 9005, t: "not-a-timestamp" });
hygiene.push({ ...bars.at(-1), i: 9006, t: "2026-02-01T00:00:00.000Z" }); // open by timeframe boundary
const hygieneResult = analyzeCandlePattern(hygiene, "M5", "XAUUSD", { adaptive: false, lookback: 5, now: "2026-02-01T00:00:00Z" });
assert.equal(hygieneResult.ok, true, "valid closed tape should remain analyzable after hygiene filtering");
assert.equal(hygieneResult.bars, bars.length, "rejected rows must not enter the feature tape");
assert.ok(hygieneResult.dataQuality.outOfOrderBars >= 1, "out-of-order rows should be counted and dropped");
assert.ok(hygieneResult.dataQuality.duplicateTimestamps >= 2, "equivalent duplicate timestamps should be counted and dropped");
assert.ok(hygieneResult.dataQuality.formingBars >= 2, "forming bars should be counted and dropped");
assert.ok(hygieneResult.dataQuality.invalidBars >= 1, "invalid OHLC rows should be counted and dropped");
assert.ok(hygieneResult.dataQuality.invalidTimestamps >= 1, "invalid timestamps should be counted and dropped");
assert.ok(hygieneResult.asOf < "2026-02-01T00:00:00.000Z", "as-of must remain on a closed bar");

const multiTapes = { M5: fixture(360, 5), M15: fixture(360, 15), M30: fixture(360, 30) };
const multi = analyzeMultiTimeframe(multiTapes, "XAUUSD");
assert.deepEqual([...multi.consensus.contributing].sort(), ["M15", "M30", "M5"].sort());
assert.ok(["UP", "DOWN", "FLAT"].includes(multi.consensus.direction));
for (const tf of ["M5", "M15", "M30"]) assert.equal(multi.timeframes[tf].engine.causal, true);
for (const contribution of multi.consensus.contributions) {
  const effectiveN = multi.timeframes[contribution.timeframe].predictions[0].calibration.effectiveN;
  assert.equal(multi.timeframes[contribution.timeframe].predictions[0].calibration.horizon, 1, "consensus must use H+1 calibration");
  assert.equal(contribution.effectiveN, effectiveN, "timeframe contribution must carry the calibrated effective support");
  const independentEffectiveN = Math.max(0, effectiveN - 3);
  assert.equal(contribution.uncertaintyWeight, Number((independentEffectiveN / (independentEffectiveN + 6)).toFixed(4)), "timeframe vote must discount clustered support after removing the smoothing prior");
  if (multi.timeframes[contribution.timeframe].walkForward.probabilistic.drift.label === "BREAK") {
    assert.equal(contribution.gate, "BLOCKED", "broken calibration drift must abstain from consensus");
  }
}
const multiRepeat = analyzeMultiTimeframe(multiTapes, "XAUUSD");
assert.deepEqual({ ...multiRepeat, generatedAt: "" }, { ...multi, generatedAt: "" }, "multi-timeframe evidence must be deterministic apart from generation time");

const large = fixture(1800);
const started = performance.now();
const largeResult = analyzeCandlePattern(large, "M5");
const elapsed = performance.now() - started;
assert.equal(largeResult.ok, true);
assert.ok(elapsed < 8000, `1800-bar analysis took ${elapsed.toFixed(0)}ms`);
console.log(`PATTERN ATLAS PASS: recurrence=${result.recurrence.exactMatches}, matches=${result.matches.length}, causal-horizon-guards=ok, 1800-bar-runtime=${elapsed.toFixed(0)}ms`);

