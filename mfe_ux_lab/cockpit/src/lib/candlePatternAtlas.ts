/**
 * A causal, scale-free candle analogue engine.
 *
 * The query candle is compared with windows that ended before the query window
 * started. Outcomes are then read from the following closed bars. This keeps
 * the result useful for research while avoiding the common "nearest candle"
 * look-ahead trap. Input normalization also excludes forming, duplicate,
 * malformed and out-of-order rows before any feature or outcome is computed.
 */

export type PatternTimeframe = "M5" | "M15" | "M30";
export type OutcomeDirection = "UP" | "DOWN" | "FLAT";
/** UTC session buckets used only as a causal analogue-context feature. */
export type PatternSession = "ASIA" | "LONDON" | "LONDON_NY_OVERLAP" | "NEW_YORK" | "OFF_HOURS" | "UNKNOWN";
export type MarketRegime = "TREND_UP" | "TREND_DOWN" | "RANGE" | "HIGH_VOL" | "LOW_VOL" | "TRANSITION";
export type PatternFamily = "BULL_IMPULSE" | "BULL_REJECTION" | "BULL_EXHAUSTION" | "BEAR_IMPULSE" | "BEAR_REJECTION" | "BEAR_EXHAUSTION" | "DOJI_BALANCE" | "DOJI_REJECTION";
export type NamedCandlePattern = "DOJI" | "SPINNING_TOP" | "DRAGONFLY_DOJI" | "GRAVESTONE_DOJI" | "LONG_LEGGED_DOJI" | "BULLISH_MARUBOZU" | "BEARISH_MARUBOZU" | "BULLISH_BELT_HOLD" | "BEARISH_BELT_HOLD" | "HAMMER" | "HANGING_MAN" | "SHOOTING_STAR" | "INVERTED_HAMMER" | "BULLISH_ENGULFING" | "BEARISH_ENGULFING" | "BULLISH_HARAMI" | "BEARISH_HARAMI" | "PIERCING_LINE" | "DARK_CLOUD_COVER" | "MORNING_STAR" | "EVENING_STAR" | "THREE_WHITE_SOLDIERS" | "THREE_BLACK_CROWS" | "THREE_INSIDE_UP" | "THREE_INSIDE_DOWN" | "THREE_OUTSIDE_UP" | "THREE_OUTSIDE_DOWN" | "TWEEZER_BOTTOM" | "TWEEZER_TOP" | "INSIDE_BAR" | "OUTSIDE_BAR" | "ABANDONED_BABY_BULLISH" | "ABANDONED_BABY_BEARISH" | "BULLISH_KICKER" | "BEARISH_KICKER" | "RISING_THREE_METHODS" | "FALLING_THREE_METHODS" | "MATCHING_LOW" | "MATCHING_HIGH" | "BULLISH_COUNTERATTACK" | "BEARISH_COUNTERATTACK" | "BULLISH_STICK_SANDWICH" | "BULLISH_TASUKI_GAP" | "BEARISH_TASUKI_GAP" | "BULLISH_MAT_HOLD" | "BEARISH_MAT_HOLD" | "THREE_STARS_IN_SOUTH" | "THREE_STARS_IN_NORTH";

export interface PatternBar {
  i: number;
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  /** Explicit broker/source status when available. A false value is never usable for Atlas. */
  closed?: boolean;
}

export interface PatternDescriptor {
  label: string;
  direction: OutcomeDirection;
  bodyAtr: number;
  rangeAtr: number;
  upperWickAtr: number;
  lowerWickAtr: number;
  closePosition: number;
  atr: number;
  signature: string;
  family?: PatternFamily;
}

export interface PatternMatch {
  endIndex: number;
  time: string;
  distance: number;
  similarity: number;
  /**
   * Soft context multiplier applied to outcome weights.  Context-mismatched
   * rows remain visible as causal fallbacks, but contribute less than rows
   * from the query's regime/session.
   */
  contextWeight?: number;
  outcome: OutcomeDirection[];
  forwardReturnsAtr: number[];
  sameRegime: boolean;
  session?: PatternSession;
  sameSession?: boolean;
  patterns?: NamedCandlePattern[];
}

export interface PredictionInterval {
  lower: number;
  upper: number;
}

/**
 * Robust uncertainty metadata for a categorical horizon distribution.
 * `effectiveN` includes the smoothing prior used by the corresponding
 * prediction, so sparse weighted matches keep appropriately wide intervals.
 */
export interface PredictionCalibration {
  method: "WILSON_95_EFFECTIVE_N";
  /** Outcome horizon this uncertainty estimate belongs to. */
  horizon: number;
  effectiveN: number;
  /**
   * Fraction of Kish support retained after endpoint-clustering adjustment.
   * Values below one indicate that nearby analogue windows were treated as
   * correlated observations for uncertainty, while posterior probabilities
   * remain unchanged.
   */
  overlapFactor?: number;
  entropy: number;
  reliability: number;
  /** Wilson 95% uncertainty intervals for the estimated category probabilities; not event-coverage guarantees. */
  interval95: { up: PredictionInterval; down: PredictionInterval; flat: PredictionInterval };
}

export interface HorizonPrediction {
  horizon: number;
  up: number;
  down: number;
  flat: number;
  expectedAtr: number;
  sampleN: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  /** Optional so persisted/legacy HorizonPrediction values remain valid. */
  calibration?: PredictionCalibration;
}

/** A horizon distribution conditioned on one named candlestick pattern. */
export interface NamedPatternHorizonPrediction extends HorizonPrediction {
  /** Effective (similarity-weighted) sample size. */
  effectiveN: number;
  /** Weight of the aggregate historical prior in this posterior. */
  shrinkage: number;
  /**
   * Empirical-Bayes conditional lift against the aggregate analogue prior.
   * Values are probability-point deltas for this horizon, after the sparse
   * pattern posterior has been shrunk toward the causal aggregate.
   */
  liftVsAggregate: { up: number; down: number; flat: number };
}

export interface NamedPatternPrediction {
  pattern: NamedCandlePattern;
  /** Number of causal analogue endpoints carrying this named pattern. */
  sampleN: number;
  /** Occurrence rate among the returned analogue set. */
  rate: number;
  /** Explicit support state so a shrunk posterior cannot look fully empirical. */
  support: "UNSEEN" | "SPARSE" | "SUPPORTED";
  predictions: NamedPatternHorizonPrediction[];
}

export type PatternRarity = "UNSEEN" | "RARE" | "OCCASIONAL" | "COMMON";

export interface PatternCoverage {
  /** Number of named detectors in the Atlas registry, including zero-support patterns. */
  registrySize: number;
  /** Distinct named patterns observed on causal analogue endpoints. */
  observedUnique: number;
  /** observedUnique / registrySize, useful for comparing inventory breadth across tapes. */
  observedRate: number;
  /** Rarity of each pattern on the current closed bar, measured against causal matches. */
  current: { pattern: NamedCandlePattern; sampleN: number; rate: number; rarity: PatternRarity }[];
}

/**
 * Descriptive detector-overlap diagnostics. Several named candle detectors
 * intentionally share geometry (for example DOJI and a more specific doji
 * variant). Exposing the overlap keeps that redundancy visible instead of
 * letting a crowded detector row look like independent evidence.
 */
export interface PatternOverlap {
  /** Number of distinct named detectors on the current closed bar. */
  currentCount: number;
  /** Whether at least two named detectors fired on the current bar. */
  currentHasOverlap: boolean;
  /** Number of causal analogue endpoints included in the diagnostic. */
  analogueSamples: number;
  /** Fraction of analogue endpoints carrying two or more named detectors. */
  analogueMultiPatternRate: number;
  /** Mean number of named detectors per causal analogue endpoint. */
  analogueMeanPatterns: number;
  /** Most frequent detector pairs, with rates over analogue endpoints. */
  pairs: { first: NamedCandlePattern; second: NamedCandlePattern; count: number; rate: number }[];
}

/**
 * Explains how much causal support is shared by the named detectors on the
 * current bar.  A detector assignment is not an independent observation: one
 * analogue endpoint can carry several detector labels.  The union count is
 * therefore the support denominator exposed to callers, while the assignment
 * count makes any double counting visible.  This is descriptive evidence only
 * and is deliberately excluded from the timeframe consensus vote.
 */
export interface PatternEvidenceSummary {
  currentPatterns: NamedCandlePattern[];
  selectedAnalogueSamples: number;
  /** Unique causal endpoints carrying at least one current detector. */
  uniqueEndpointSupport: number;
  /** Overlap-adjusted independent support for those endpoints. */
  uniqueEndpointEffectiveN: number;
  /** Sum of current-detector labels across endpoints (may double count rows). */
  detectorAssignmentCount: number;
  /** uniqueEndpointSupport / selectedAnalogueSamples. */
  endpointCoverageRate: number;
  /** 1 - uniqueEndpointSupport / detectorAssignmentCount. */
  assignmentOverlapRate: number;
  /** Fixed authority boundary: named patterns never add consensus votes. */
  role: "CONDITIONAL_DESCRIPTIVE_ONLY";
  includedInConsensus: false;
}

export interface WalkForwardReport {
  evaluated: number;
  sampleN: number;
  hitRate: number | null;
  /** Overlap-adjusted effective support for the held-out hit-rate estimate. */
  effectiveN?: number;
  /** Conservative Wilson interval using overlap-adjusted support. */
  hitRateInterval95?: PredictionInterval | null;
  baseline: number | null;
  lift: number | null;
  /** Number of held-out queries where the posterior margin was too small to expose a direction. */
  tieAbstentions?: number;
  note: string;
  /**
   * Chronological out-of-sample fold stability. Each fold is scored only on
   * validation queries whose analogue search was completed before that query.
   */
  stability?: WalkForwardStabilityReport;
  /**
   * Causal probabilistic validation of the H+1 distribution.  The
   * probabilities for each query are fitted from analogue endpoints that
   * ended before that query window; the realised H+1 bar is only used as the
   * validation label.
   */
  probabilistic?: WalkForwardProbabilisticReport;
}

export interface WalkForwardStabilityFold {
  fold: number;
  evaluated: number;
  /** Inclusive query-end indices, proving each fold is chronological. */
  firstQueryIndex: number | null;
  lastQueryIndex: number | null;
  hitRate: number | null;
  baseline: number | null;
  lift: number | null;
}

export interface WalkForwardStabilityReport {
  /** Number of chronological validation folds (three when support permits). */
  folds: WalkForwardStabilityFold[];
  evaluated: number;
  positiveLiftFolds: number;
  hitRateStdDev: number | null;
  liftStdDev: number | null;
  liftRange: number | null;
  label: "STABLE" | "MIXED" | "UNSTABLE" | "INSUFFICIENT";
  note: string;
}

export interface ProbabilisticCalibrationBin {
  lower: number;
  upper: number;
  count: number;
  meanPredicted: number | null;
  observedRate: number | null;
  calibrationError: number | null;
}

/**
 * Compact reliability summary for the chronological H+1 probability check.
 *
 * These values are descriptive diagnostics: every observed label comes from
 * a held-out query and every bin is built after the causal analogue search.
 * They must not be interpreted as a live confidence or execution permission.
 */
export interface ProbabilityReliabilitySummary {
  /** Expected calibration error, weighted by the number of rows in each bin. */
  expectedCalibrationError: number | null;
  /** Largest absolute calibration error among populated bins. */
  maxCalibrationError: number | null;
  /** Number of non-empty top-class reliability bins. */
  populatedBins: number;
  /** Number of populated bins meeting the minimum support requirement. */
  supportedBins: number;
  /** Fraction of held-out rows covered by sufficiently supported bins. */
  supportedSampleRate: number;
  /** Minimum held-out rows required for a bin to support a reliability claim. */
  minimumBinCount: number;
  /** Accuracy of the predicted top class over all evaluated queries. */
  topClassAccuracy: number | null;
  /**
   * Overlap-adjusted effective support for top-class accuracy. Adjacent
   * chronological queries share most of their feature window, so the raw
   * held-out row count overstates certainty in the Wilson interval.
   */
  effectiveN: number;
  /** Wilson 95% interval for top-class accuracy over held-out queries. */
  topClassAccuracyInterval95: PredictionInterval | null;
  /** Majority-class accuracy baseline computed from the held-out labels. */
  majorityClassBaseline: number | null;
  /** Top-class accuracy lift over that chronological held-out baseline. */
  topClassLiftVsBaseline: number | null;
  status: "CALIBRATED" | "WATCH" | "INSUFFICIENT";
  note: string;
}

export interface WalkForwardProbabilisticReport {
  horizon: 1;
  evaluated: number;
  brierScore: number | null;
  logLoss: number | null;
  calibrationBins: ProbabilisticCalibrationBin[];
  /** Aggregate reliability metrics for the causal top-class calibration bins. */
  reliability: ProbabilityReliabilitySummary;
  /** Chronological calibration drift diagnostic; this never changes predictions. */
  drift: ProbabilityCalibrationDrift;
  note: string;
}

export interface ProbabilityCalibrationDriftFold {
  fold: number;
  evaluated: number;
  /** Overlap-adjusted support for the fold's top-class accuracy. */
  effectiveN: number;
  /** Inclusive held-out query-end indices for this chronological fold. */
  firstQueryIndex: number | null;
  lastQueryIndex: number | null;
  brierScore: number | null;
  expectedCalibrationError: number | null;
  topClassAccuracy: number | null;
}

export interface ProbabilityCalibrationDrift {
  folds: ProbabilityCalibrationDriftFold[];
  evaluated: number;
  /** Positive values indicate worsening calibration from the first to last fold. */
  score: number | null;
  /** Uncertainty-free first/last-fold score, retained for auditability. */
  rawScore?: number | null;
  /** Multiplicative support factor applied to rawScore, bounded to [0, 1]. */
  supportFactor?: number | null;
  label: "STABLE" | "WATCH" | "BREAK" | "INSUFFICIENT";
  note: string;
}

export interface PatternAnalysis {
  ok: boolean;
  reason?: string;
  symbol: string;
  timeframe: PatternTimeframe;
  asOf: string | null;
  bars: number;
  lookback: number;
  current: PatternDescriptor | null;
  matches: PatternMatch[];
  predictions: HorizonPrediction[];
  consensus: { direction: OutcomeDirection; strength: number; agreement: number };
  walkForward: WalkForwardReport;
  dataQuality: {
    gaps: number;
    duplicateTimestamps: number;
    outOfOrderBars: number;
    invalidTimestamps: number;
    formingBars: number;
    invalidBars: number;
  };
  regime: { label: MarketRegime; trendAtr: number; volatilityRatio: number; matchingSamples: number };
  novelty: {
    score: number;
    label: "KNOWN" | "EMERGING" | "UNSEEN";
    nearestDistance: number | null;
    /** Number of purged causal candidates inside the KNOWN distance band. */
    nearbyCandidates?: number;
    /** nearbyCandidates / causal candidates, bounded to [0, 1]. */
    nearbyRate?: number;
    /** Number of non-overlapping causal endpoints inside the KNOWN band. */
    nearbyIndependentCandidates?: number;
    /** nearbyIndependentCandidates / causal candidates, bounded to [0, 1]. */
    nearbyIndependentRate?: number;
    /**
     * Shadow-only decomposition of novelty into geometry and historical
     * support.  A close analogue with no independent neighbours is a
     * different research condition from a genuinely distant query.
     */
    decomposition?: NoveltyDecomposition;
  };
  /** Causal analogue coverage and session-selection retention diagnostics. */
  analogueCoverage?: {
    causalCandidates: number;
    rankedCandidates: number;
    selectedSamples: number;
    /** Number of non-overlapping endpoints across the full causal candidate tape. */
    independentCandidates?: number;
    /** independentCandidates / causalCandidates, bounded to [0, 1]. */
    independentRate?: number;
    /** Number of non-overlapping endpoints in the distance-ranked retained set. */
    independentRankedCandidates?: number;
    /** independentRankedCandidates / rankedCandidates, bounded to [0, 1]. */
    independentRankedRate?: number;
    /** Number of non-overlapping endpoints in the context-selected subset. */
    independentSelectedSamples?: number;
    /** independentSelectedSamples / causalCandidates, bounded to [0, 1]. */
    independentSelectedRate?: number;
    /** selectedSamples / causalCandidates after session conditioning. */
    selectedRate: number;
    retainedRate: number;
    maxMatches: number;
    sessionFallback: boolean;
    /** Hierarchical context actually used by the posterior. */
    contextMode?: "SAME_SESSION_REGIME" | "SAME_SESSION" | "SAME_REGIME" | "ALL_CONTEXTS";
  };
  /**
   * Causal concentration of the selected analogue posterior.  This is a
   * shadow-only diagnostic: it describes whether the reported distribution
   * is dominated by one or two historical windows, without changing the
   * posterior or the consensus gate.
   */
  analogueConcentration?: {
    samples: number;
    totalWeight: number;
    topShare: number;
    hhi: number;
    effectiveN: number;
    independentSamples: number;
    independentRate: number;
    label: "INSUFFICIENT" | "BALANCED" | "CONCENTRATED";
  };
  recurrence: {
    signature: string;
    appeared: boolean;
    exactMatches: number;
    rate: number;
    independentMatches: number;
    independentRate: number;
    /** Exact recurrence restricted to historical endpoints in the query regime. */
    sameRegimeMatches?: number;
    sameRegimeRate?: number;
    sameRegimeIndependentMatches?: number;
    sameRegimeIndependentRate?: number;
    lastSeen: string | null;
    medianGapBars: number | null;
    nearMatches: number;
    /** Recency-decayed recurrence rate over the same causal endpoint set. */
    recencyWeightedRate?: number;
    sameRegimeRecencyWeightedRate?: number;
    recencyHalfLifeBars?: number;
    /** Number of contiguous, fully purged endpoints eligible for recurrence. */
    eligibleEndpoints?: number;
    /** Arithmetic endpoint capacity before timestamp-gap filtering. */
    potentialEndpoints?: number;
    /** Number of otherwise eligible endpoints removed by a missing/non-uniform bar. */
    gapExcludedEndpoints?: number;
    /** Fraction of the arithmetic endpoint capacity backed by contiguous bars. */
    supportCoverage?: number;
    /** Wilson uncertainty for the non-overlapping recurrence estimate. */
    calibration?: {
      method: "WILSON_95_INDEPENDENT_ENDPOINTS";
      effectiveN: number;
      independentOpportunities: number;
      independentRate: number;
      interval95: PredictionInterval;
    };
  };
  adaptive?: { selectedLookback: number; regime: MarketRegime; fallback: boolean; candidates: { lookback: number; hitRate: number | null; baseline: number | null; lift: number | null; evaluated: number; regimeQueries: number; sameRegimeCandidates: number; fallback: boolean }[]; reason: string };
  cluster?: { currentFamily: PatternFamily; supportSamples: number; supportRate: number; sameRegimeSupport: number; families: { family: PatternFamily; count: number; rate: number }[] };
  drift?: { score: number; label: "STABLE" | "WATCH" | "BREAK"; recentMedianDistance: number | null; historicalMedianDistance: number | null; supportSamples: number; note: string };
  /** Descriptive session support and the causal weighting fallback used for predictions. */
  sessionCalibration?: {
    current: PatternSession;
    totalSamples: number;
    currentSessionSamples: number;
    /** Overlap-adjusted independent support for the current-session slice. */
    sameSessionEffectiveN: number;
    /** Overlap-adjusted independent support for all same-regime endpoints. */
    sameRegimeEffectiveN: number;
    /** Minimum independent support required before session conditioning. */
    minimumEffectiveN: number;
    selectedSamples: number;
    fallback: boolean;
    mode: "SAME_SESSION_REGIME" | "SAME_SESSION" | "SAME_REGIME" | "ALL_CONTEXTS";
    buckets: { session: PatternSession; samples: number; upRate: number; downRate: number; flatRate: number; meanReturnAtr: number }[];
    /**
     * Overlap-adjusted Wilson intervals for the all-context, current-session
     * and actually selected causal slices.  These are uncertainty diagnostics
     * only; they never alter posterior weights or execution authority.
     */
    uncertainty: {
      aggregateEffectiveN: number;
      currentSessionEffectiveN: number;
      selectedEffectiveN: number;
      aggregateInterval95: { up: PredictionInterval; down: PredictionInterval; flat: PredictionInterval };
      currentSessionInterval95: { up: PredictionInterval; down: PredictionInterval; flat: PredictionInterval };
      selectedInterval95: { up: PredictionInterval; down: PredictionInterval; flat: PredictionInterval };
    };
  };
  /**
   * Regime-conditioned calibration of the causal H+1 analogue distribution.
   * The same-regime slice is selected only from endpoints before the query;
   * when support is sparse, the metric explicitly falls back to all regimes.
   */
  regimeCalibration?: {
    current: MarketRegime;
    totalSamples: number;
    sameRegimeSamples: number;
    /** Overlap-adjusted independent support for the same-regime slice. */
    sameRegimeEffectiveN: number;
    /** Minimum independent support required before regime conditioning. */
    minimumEffectiveN: number;
    selectedSamples: number;
    fallback: boolean;
    mode: "SAME_REGIME" | "ALL_REGIMES";
    aggregate: { upRate: number; downRate: number; flatRate: number; meanReturnAtr: number };
    sameRegime: { upRate: number; downRate: number; flatRate: number; meanReturnAtr: number };
    /** Outcome distribution actually used after the sparse-regime fallback. */
    selected: { upRate: number; downRate: number; flatRate: number; meanReturnAtr: number };
    /** Half-L1 distance between same-regime and aggregate outcome rates. */
    distributionShift: number;
    /** Support-adjusted stability score in [0, 1]. */
    stability: number;
    /**
     * Causal support and Wilson intervals for each regime slice.  The
     * endpoint purge is the same feature+H+1 spacing used by the posterior,
     * so a dense run of nearby windows cannot make regime calibration look
     * more certain than it is.
     */
    uncertainty: {
      aggregateEffectiveN: number;
      sameRegimeEffectiveN: number;
      selectedEffectiveN: number;
      aggregateInterval95: { up: PredictionInterval; down: PredictionInterval; flat: PredictionInterval };
      sameRegimeInterval95: { up: PredictionInterval; down: PredictionInterval; flat: PredictionInterval };
      selectedInterval95: { up: PredictionInterval; down: PredictionInterval; flat: PredictionInterval };
    };
  };
  currentPatterns?: NamedCandlePattern[];
  patternCounts?: { pattern: NamedCandlePattern; count: number; rate: number }[];
  /** Per-current-pattern H+1/H+2/H+3 distributions. */
  namedPatternPredictions?: NamedPatternPrediction[];
  /** Causal inventory breadth and current-pattern support/rarity. */
  patternCoverage?: PatternCoverage;
  /** Descriptive detector overlap on the current bar and causal analogue tape. */
  patternOverlap?: PatternOverlap;
  /** Union support for current named detectors; never an independent vote. */
  patternEvidence?: PatternEvidenceSummary;
  /**
   * The multi-timeframe evidence gate annotates each analysis before it is
   * allowed to vote.  This remains optional so direct single-timeframe users
   * and older persisted snapshots keep their existing shape.
   */
  freshness?: PatternFreshness;
  evidence?: PatternEvidence;
  /** Completed H1 context aligned to this lower-timeframe query. */
  h1Context?: PatternH1Context;
  engine: { id: string; version: string; causal: true; thresholdAtr: number };
}

export interface NoveltyDecomposition {
  /** Number of finite causal candidate endpoints used in this decomposition. */
  causalCandidates: number;
  /** Normalised nearest-distance contribution (0 = close, 1 = distant). */
  distanceScore: number;
  /** Normalised sparse-neighbourhood contribution using all nearby rows. */
  densityScore: number;
  /** Normalised sparse-neighbourhood contribution after endpoint purging. */
  independentDensityScore: number;
  nearbyCandidates: number;
  nearbyRate: number;
  nearbyIndependentCandidates: number;
  nearbyIndependentRate: number;
  /** Raw density lost to endpoint clustering; descriptive, never a vote. */
  overlapGap: number;
  label: "INSUFFICIENT" | "DISTANCE_LIMITED" | "SUPPORT_LIMITED" | "REPEATABLE" | "MIXED";
  note: string;
}

export type H1Trend = "UP" | "DOWN" | "FLAT" | "UNKNOWN";
export type H1Alignment = "ALIGNED" | "CONTRADICTED" | "NEUTRAL" | "UNAVAILABLE";
export interface PatternH1Context {
  trend: H1Trend;
  alignment: H1Alignment;
  /** Trend displacement in H1 ATR units, measured only on completed H1 bars. */
  trendAtr: number;
  strength: number;
  /** Bounded context weight; this never changes the research authority. */
  weight: number;
  bars: number;
  asOf: string | null;
  source: "H1_CLOSED_ONLY";
  causal: true;
  reason: string;
}

export type PatternFreshnessStatus = "FRESH" | "STALE" | "UNKNOWN";
export interface PatternFreshness {
  status: PatternFreshnessStatus;
  ageMs: number | null;
  maxAgeMs: number;
  referenceTime: string | null;
  reason: string;
}
export type PatternEvidenceGate = "PASS" | "BLOCKED";
export interface PatternEvidence {
  gate: PatternEvidenceGate;
  reason: string;
  quality: number;
  reliability: number | null;
  sampleN: number;
  /** Wilson support after overlap adjustment, including the 3-row prior. */
  effectiveN: number;
  /** Vote multiplier from independent analogue support after removing that prior. */
  uncertaintyWeight: number;
  weight: number;
}

const HORIZONS = [1, 2, 3];
/** The only horizon allowed to contribute to the cross-timeframe vote. */
const CONSENSUS_HORIZON = 1;
const MAX_OUTCOME_HORIZON = Math.max(...HORIZONS);
const DEFAULT_LOOKBACK = 5;
const MIN_HISTORY = 80;
const MAX_MATCHES = 48;
const OUTCOME_THRESHOLD_ATR = 0.12;
const MIN_SESSION_SAMPLES = 8;
const MIN_CONTEXT_EFFECTIVE_SUPPORT = 3;
const MIN_REGIME_SAMPLES = 8;
/** Minimum posterior margin required before exposing a directional label. */
const MIN_DIRECTION_MARGIN = 0.05;

/** Runtime counterpart of NamedCandlePattern. Keep this list explicit so the
 * coverage denominator includes detectors that are absent from one tape. */
const NAMED_PATTERN_REGISTRY: readonly NamedCandlePattern[] = [
  "DOJI", "SPINNING_TOP", "DRAGONFLY_DOJI", "GRAVESTONE_DOJI", "LONG_LEGGED_DOJI",
  "BULLISH_MARUBOZU", "BEARISH_MARUBOZU", "BULLISH_BELT_HOLD", "BEARISH_BELT_HOLD",
  "HAMMER", "HANGING_MAN", "SHOOTING_STAR", "INVERTED_HAMMER",
  "BULLISH_ENGULFING", "BEARISH_ENGULFING", "BULLISH_HARAMI", "BEARISH_HARAMI",
  "PIERCING_LINE", "DARK_CLOUD_COVER", "MORNING_STAR", "EVENING_STAR",
  "THREE_WHITE_SOLDIERS", "THREE_BLACK_CROWS", "THREE_INSIDE_UP", "THREE_INSIDE_DOWN",
  "THREE_OUTSIDE_UP", "THREE_OUTSIDE_DOWN", "TWEEZER_BOTTOM", "TWEEZER_TOP",
  "INSIDE_BAR", "OUTSIDE_BAR", "ABANDONED_BABY_BULLISH", "ABANDONED_BABY_BEARISH",
  "BULLISH_KICKER", "BEARISH_KICKER", "RISING_THREE_METHODS", "FALLING_THREE_METHODS",
  "MATCHING_LOW", "MATCHING_HIGH", "BULLISH_COUNTERATTACK", "BEARISH_COUNTERATTACK",
  "BULLISH_STICK_SANDWICH", "BULLISH_TASUKI_GAP", "BEARISH_TASUKI_GAP",
  "BULLISH_MAT_HOLD", "BEARISH_MAT_HOLD", "THREE_STARS_IN_SOUTH", "THREE_STARS_IN_NORTH",
];

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Runtime guard for persisted/hand-built snapshot records.  The TypeScript
 * interfaces describe trusted producer output, but Atlas snapshots cross a
 * storage/network boundary before they reach the H+1 consensus gate. */
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Runtime guard for arrays read from persisted snapshots.  Array#every skips
 * sparse holes, so a truncated JSON-ish artifact such as `[ , prediction ]`
 * could otherwise look structurally valid at the consensus boundary.  Require
 * every index to be present before validating the element itself.
 */
function denseRecords(value: unknown): value is Record<string, unknown>[] {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index++) {
    if (!Object.prototype.hasOwnProperty.call(value, index) || !record(value[index])) return false;
  }
  return true;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function round(value: number, digits = 4): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function wilsonInterval(probability: number, effectiveN: number): PredictionInterval {
  const n = Math.max(1, effectiveN);
  const p = clamp(probability, 0, 1);
  const z = 1.96;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n)) / denominator;
  return {
    lower: round(clamp(center - margin, 0, 1), 3),
    upper: round(clamp(center + margin, 0, 1), 3),
  };
}

/**
 * Estimate effective independent support from a chronological binary series.
 * Adjacent walk-forward queries can share most of their feature window, so a
 * raw row count overstates certainty. A lag-one ESS is intentionally modest:
 * it only discounts positive serial dependence and never increases support.
 */
function effectiveSampleSize(values: number[], queryIndices: number[] = [], lookback = 1, outcomeHorizon = 1): number {
  const n = values.length;
  if (n < 2) return n;
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n;
  let serialEss = n;
  if (variance > 1e-12) {
    let covariance = 0;
    for (let index = 1; index < n; index++) covariance += (values[index - 1] - mean) * (values[index] - mean);
    const rho = clamp(covariance / Math.max(1, n - 1) / variance, -0.95, 0.95);
    serialEss = n * (1 - Math.max(0, rho)) / (1 + Math.max(0, rho));
  }
  // Even a constant hit sequence is not fully independent when adjacent
  // query windows overlap. Use observed query spacing as a conservative cap.
  const gaps = queryIndices.slice(1).map((index, offset) => index - queryIndices[offset]).filter((gap) => gap > 0);
  const meanGap = gaps.length ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : lookback;
  // A held-out label depends on the complete feature window and its forward
  // outcome bar.  Using only `lookback` here made adjacent H+1 queries appear
  // slightly more independent than the production analogue posterior, whose
  // overlap span is `lookback + horizon`.
  const overlapWindow = Math.max(1, lookback + Math.max(0, outcomeHorizon));
  const overlapFactor = clamp(meanGap / overlapWindow, 0.1, 1);
  return clamp(Math.min(serialEss, n * overlapFactor), 1, n);
}

function predictionCalibration(
  probabilities: Pick<HorizonPrediction, "up" | "down" | "flat">,
  horizon: number,
  effectiveN: number,
  overlapFactor = 1,
): PredictionCalibration {
  const values = [probabilities.up, probabilities.down, probabilities.flat].map((value) => clamp(value, 0, 1));
  const entropy = -values.reduce((sum, value) => sum + (value > 0 ? value * Math.log(value) : 0), 0) / Math.log(3);
  const support = Math.max(0, effectiveN) / (Math.max(0, effectiveN) + 12);
  return {
    method: "WILSON_95_EFFECTIVE_N",
    horizon,
    effectiveN: round(Math.max(0, effectiveN), 3),
    overlapFactor: round(clamp(overlapFactor, 0, 1), 3),
    entropy: round(clamp(entropy, 0, 1), 3),
    reliability: round(clamp((1 - entropy) * support, 0, 1), 3),
    interval95: {
      up: wilsonInterval(values[0], effectiveN),
      down: wilsonInterval(values[1], effectiveN),
      flat: wilsonInterval(values[2], effectiveN),
    },
  };
}

function trueRange(bar: PatternBar, previousClose?: number): number {
  return Math.max(bar.h - bar.l, previousClose == null ? 0 : Math.max(Math.abs(bar.h - previousClose), Math.abs(bar.l - previousClose)));
}

// Analyses repeatedly request ATR/regime values for the same immutable,
// prepared tape (feature vectors, named detectors, analogue ranking and
// walk-forward validation). WeakMap keeps this acceleration scoped to the tape
// and allows old replay arrays to be reclaimed without an explicit cache clear.
const ATR_CACHE = new WeakMap<PatternBar[], Map<string, number>>();

function atrAt(bars: PatternBar[], index: number, period = 14): number {
  const key = `${index}:${period}`;
  let cache = ATR_CACHE.get(bars);
  if (!cache) { cache = new Map(); ATR_CACHE.set(bars, cache); }
  const cached = cache.get(key);
  if (cached != null) return cached;
  const from = Math.max(0, index - period + 1);
  let sum = 0;
  let count = 0;
  for (let i = from; i <= index; i++) {
    const tr = trueRange(bars[i], i ? bars[i - 1].c : undefined);
    if (finite(tr) && tr > 0) { sum += tr; count++; }
  }
  const value = count ? Math.max(sum / count, 1e-9) : 1e-9;
  cache.set(key, value);
  return value;
}

function candleFeatures(bars: PatternBar[], index: number): number[] {
  const bar = bars[index];
  const atr = atrAt(bars, index);
  const range = Math.max(bar.h - bar.l, 1e-9);
  const body = bar.c - bar.o;
  const upper = bar.h - Math.max(bar.o, bar.c);
  const lower = Math.min(bar.o, bar.c) - bar.l;
  const closePos = clamp((bar.c - bar.l) / range, 0, 1);
  const previous = index ? bars[index - 1].c : bar.o;
  const returnAtr = (bar.c - previous) / atr;
  return [
    clamp(body / atr, -4, 4) / 4,
    clamp(range / atr, 0, 5) / 5,
    clamp(upper / atr, 0, 4) / 4,
    clamp(lower / atr, 0, 4) / 4,
    closePos,
    clamp(returnAtr, -4, 4) / 4,
  ];
}

function windowVector(bars: PatternBar[], endIndex: number, lookback: number): number[] {
  const vector: number[] = [];
  for (let i = endIndex - lookback + 1; i <= endIndex; i++) vector.push(...candleFeatures(bars, i));
  return vector;
}

function distance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const weight = i % 6 === 4 ? 0.7 : 1; // close-location is useful, but less stable than geometry.
    const delta = a[i] - b[i];
    sum += weight * delta * delta;
  }
  return Math.sqrt(sum / Math.max(1, Math.min(a.length, b.length)));
}

function direction(value: number): OutcomeDirection {
  if (value > OUTCOME_THRESHOLD_ATR) return "UP";
  if (value < -OUTCOME_THRESHOLD_ATR) return "DOWN";
  return "FLAT";
}

function dominantDirection(probabilities: Pick<HorizonPrediction, "up" | "down" | "flat">): OutcomeDirection {
  const ordered: [OutcomeDirection, number][] = [["UP", probabilities.up], ["DOWN", probabilities.down], ["FLAT", probabilities.flat]];
  ordered.sort((a, b) => b[1] - a[1]);
  return ordered[0][1] - ordered[1][1] >= MIN_DIRECTION_MARGIN ? ordered[0][0] : "FLAT";
}

function descriptor(bars: PatternBar[], index: number): PatternDescriptor {
  const bar = bars[index];
  const atr = atrAt(bars, index);
  const range = Math.max(bar.h - bar.l, 1e-9);
  const body = bar.c - bar.o;
  const upper = bar.h - Math.max(bar.o, bar.c);
  const lower = Math.min(bar.o, bar.c) - bar.l;
  const closePosition = clamp((bar.c - bar.l) / range, 0, 1);
  const dir = direction(body / atr);
  const label = Math.abs(body) / atr < 0.18
    ? (upper > lower * 1.6 ? "doji / upper rejection" : lower > upper * 1.6 ? "doji / lower rejection" : "doji / balance")
    : body > 0
      ? (lower > Math.abs(body) * 1.4 ? "bullish lower rejection" : upper > Math.abs(body) * 1.4 ? "bullish upper wick" : "bullish impulse")
      : (upper > Math.abs(body) * 1.4 ? "bearish upper rejection" : lower > Math.abs(body) * 1.4 ? "bearish lower wick" : "bearish impulse");
  const quant = (v: number, step: number) => Math.round(v / step);
  const bodyAtr = body / atr;
  const family: PatternFamily = Math.abs(bodyAtr) < 0.18
    ? (upper > lower * 1.6 || lower > upper * 1.6 ? "DOJI_REJECTION" : "DOJI_BALANCE")
    : body > 0
      ? (lower > Math.abs(body) * 1.4 ? "BULL_REJECTION" : upper > Math.abs(body) * 1.4 ? "BULL_EXHAUSTION" : "BULL_IMPULSE")
      : (upper > Math.abs(body) * 1.4 ? "BEAR_REJECTION" : lower > Math.abs(body) * 1.4 ? "BEAR_EXHAUSTION" : "BEAR_IMPULSE");
  return {
    label, direction: dir,
    bodyAtr: round(bodyAtr, 3), rangeAtr: round(range / atr, 3),
    upperWickAtr: round(upper / atr, 3), lowerWickAtr: round(lower / atr, 3),
    closePosition: round(closePosition, 3), atr: round(atr, 5),
    signature: [dir, quant(body / atr, 0.2), quant(range / atr, 0.25), quant(upper / atr, 0.25), quant(lower / atr, 0.25), quant(closePosition, 0.1)].join(":"),
    family,
  };
}

function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
}

/** Detect named patterns using only bars up to `index`; no right-hand candle is read. */
function namedPatternsAt(bars: PatternBar[], index: number): NamedCandlePattern[] {
  if (index < 0 || !bars[index]) return [];
  const b = bars[index];
  const range = Math.max(b.h - b.l, 1e-9);
  const body = b.c - b.o;
  const bodyAbs = Math.abs(body);
  const upper = b.h - Math.max(b.o, b.c);
  const lower = Math.min(b.o, b.c) - b.l;
  const atr = atrAt(bars, index);
  const priorMove = index >= 3 ? b.c - bars[index - 3].c : 0;
  const upTrend = priorMove > atr * 0.45;
  const downTrend = priorMove < -atr * 0.45;
  const result: NamedCandlePattern[] = [];
  const add = (name: NamedCandlePattern, condition: boolean) => { if (condition) result.push(name); };
  add("DOJI", bodyAbs <= range * 0.1);
  add("SPINNING_TOP", bodyAbs > range * 0.1 && bodyAbs <= range * 0.3 && upper >= bodyAbs * 0.8 && lower >= bodyAbs * 0.8);
  add("DRAGONFLY_DOJI", bodyAbs <= range * 0.1 && upper <= range * 0.1 && lower >= range * 0.6);
  add("GRAVESTONE_DOJI", bodyAbs <= range * 0.1 && lower <= range * 0.1 && upper >= range * 0.6);
  add("LONG_LEGGED_DOJI", bodyAbs <= range * 0.1 && upper >= range * 0.25 && lower >= range * 0.25);
  add("BULLISH_MARUBOZU", body > 0 && bodyAbs / range >= 0.8);
  add("BEARISH_MARUBOZU", body < 0 && bodyAbs / range >= 0.8);
  add("BULLISH_BELT_HOLD", body > 0 && bodyAbs / range >= 0.65 && lower <= range * 0.1);
  add("BEARISH_BELT_HOLD", body < 0 && bodyAbs / range >= 0.65 && upper <= range * 0.1);
  const hammerShape = lower >= Math.max(bodyAbs * 2, range * 0.42) && upper <= range * 0.22 && Math.max(b.o, b.c) >= b.l + range * 0.55;
  const starShape = upper >= Math.max(bodyAbs * 2, range * 0.42) && lower <= range * 0.22 && Math.min(b.o, b.c) <= b.l + range * 0.55;
  add("HAMMER", hammerShape && downTrend && body >= 0);
  add("HANGING_MAN", hammerShape && upTrend && body <= 0);
  add("SHOOTING_STAR", starShape && upTrend && body <= 0);
  add("INVERTED_HAMMER", starShape && downTrend && body >= 0);
  if (index >= 1) {
    const p = bars[index - 1];
    const pBodyTop = Math.max(p.o, p.c), pBodyBottom = Math.min(p.o, p.c);
    const cBodyTop = Math.max(b.o, b.c), cBodyBottom = Math.min(b.o, b.c);
    add("BULLISH_ENGULFING", p.c < p.o && body > 0 && b.o <= p.c && b.c >= p.o);
    add("BEARISH_ENGULFING", p.c > p.o && body < 0 && b.o >= p.c && b.c <= p.o);
    add("BULLISH_HARAMI", p.c < p.o && body > 0 && bodyAbs < Math.abs(p.c - p.o) * 0.65 && cBodyBottom >= pBodyBottom && cBodyTop <= pBodyTop);
    add("BEARISH_HARAMI", p.c > p.o && body < 0 && bodyAbs < Math.abs(p.c - p.o) * 0.65 && cBodyBottom >= pBodyBottom && cBodyTop <= pBodyTop);
    const midpoint = (p.o + p.c) / 2;
    add("PIERCING_LINE", p.c < p.o && body > 0 && b.o <= p.c && b.c > midpoint && b.c < p.o);
    add("DARK_CLOUD_COVER", p.c > p.o && body < 0 && b.o >= p.c && b.c < midpoint && b.c > p.o);
    add("INSIDE_BAR", b.h <= p.h && b.l >= p.l);
    add("OUTSIDE_BAR", b.h >= p.h && b.l <= p.l);
    add("TWEEZER_BOTTOM", p.c < p.o && body > 0 && Math.abs(b.l - p.l) <= atr * 0.15);
    add("TWEEZER_TOP", p.c > p.o && body < 0 && Math.abs(b.h - p.h) <= atr * 0.15);
    add("BULLISH_KICKER", p.c < p.o && body > 0 && b.o > p.h && bodyAbs / range >= 0.45);
    add("BEARISH_KICKER", p.c > p.o && body < 0 && b.o < p.l && bodyAbs / range >= 0.45);
    // Matching highs/lows are two same-colour candles that finish at nearly
    // the same price. A small open-side displacement keeps the definition
    // causal and separates the setup from a simple repeated close.
    const pRange = Math.max(p.h - p.l, 1e-9);
    const sameClose = Math.abs(b.c - p.c) <= atr * 0.15;
    add("MATCHING_LOW", p.c < p.o && body < 0 && sameClose && bodyAbs >= pRange * 0.2);
    add("MATCHING_HIGH", p.c > p.o && body > 0 && sameClose && bodyAbs >= pRange * 0.2);
    // Counterattack candles are long, opposite-colour bars whose closes
    // return to the same level after an opening gap against the prior move.
    add("BULLISH_COUNTERATTACK", p.c < p.o && body > 0 && sameClose && b.o < p.c && Math.abs(p.c - p.o) >= pRange * 0.55 && bodyAbs >= range * 0.55);
    add("BEARISH_COUNTERATTACK", p.c > p.o && body < 0 && sameClose && b.o > p.c && Math.abs(p.c - p.o) >= pRange * 0.55 && bodyAbs >= range * 0.55);
  }
  if (index >= 2) {
    const a = bars[index - 2], p = bars[index - 1];
    const aBody = a.c - a.o, pBody = p.c - p.o;
    const aRange = Math.max(a.h - a.l, 1e-9), pRange = Math.max(p.h - p.l, 1e-9);
    const midSmall = Math.abs(pBody) <= pRange * 0.35;
    add("MORNING_STAR", aBody < 0 && Math.abs(aBody) >= aRange * 0.5 && midSmall && body > 0 && b.c > (a.o + a.c) / 2);
    add("EVENING_STAR", aBody > 0 && Math.abs(aBody) >= aRange * 0.5 && midSmall && body < 0 && b.c < (a.o + a.c) / 2);
    const firstBodyTop = Math.max(a.o, a.c), firstBodyBottom = Math.min(a.o, a.c);
    const insideFirst = pBody < 0 && p.h <= a.h && p.l >= a.l;
    const insideFirstDown = pBody > 0 && p.h <= a.h && p.l >= a.l;
    add("THREE_INSIDE_UP", aBody < 0 && Math.abs(aBody) >= aRange * 0.45 && insideFirst && body > 0 && b.c > firstBodyTop);
    add("THREE_INSIDE_DOWN", aBody > 0 && Math.abs(aBody) >= aRange * 0.45 && insideFirstDown && body < 0 && b.c < firstBodyBottom);
    const engulfUp = p.c > p.o && p.o <= a.c && p.c >= a.o && p.c - p.o >= pRange * 0.4;
    const engulfDown = p.c < p.o && p.o >= a.c && p.c <= a.o && p.o - p.c >= pRange * 0.4;
    add("THREE_OUTSIDE_UP", aBody < 0 && engulfUp && body > 0 && b.c > p.c);
    add("THREE_OUTSIDE_DOWN", aBody > 0 && engulfDown && body < 0 && b.c < p.c);
    const aMid = (a.o + a.c) / 2;
    const gapDown = p.h < a.l;
    const gapUp = p.l > a.h;
    add("ABANDONED_BABY_BULLISH", aBody < 0 && Math.abs(pBody) <= pRange * 0.12 && gapDown && b.l > p.h && body > 0 && b.c > aMid);
    add("ABANDONED_BABY_BEARISH", aBody > 0 && Math.abs(pBody) <= pRange * 0.12 && gapUp && b.h < p.l && body < 0 && b.c < aMid);
    // A stick sandwich brackets one opposite-colour candle with two candles
    // that close at essentially the same low. It is treated as bullish when
    // the middle candle recovers above the first close.
    add("BULLISH_STICK_SANDWICH", aBody < 0 && pBody > 0 && body < 0 && Math.abs(b.c - a.c) <= atr * 0.15 && p.c > a.c && Math.abs(aBody) >= aRange * 0.35 && bodyAbs >= range * 0.35);
    // Tasuki gaps are three-bar continuation structures: the third candle
    // retraces the gap without closing it.
    const upsideGap = a.c > a.o && p.c > p.o && p.l > a.h && body < 0 && b.c > a.h;
    const downsideGap = a.c < a.o && p.c < p.o && p.h < a.l && body > 0 && b.c < a.l;
    add("BULLISH_TASUKI_GAP", upsideGap);
    add("BEARISH_TASUKI_GAP", downsideGap);
  }
  if (index >= 3) {
    const a = bars[index - 2], p = bars[index - 1];
    const sameBull = [a, p, b].every((c) => c.c > c.o && c.c - c.o >= Math.max(c.h - c.l, 1e-9) * 0.45);
    const sameBear = [a, p, b].every((c) => c.c < c.o && c.o - c.c >= Math.max(c.h - c.l, 1e-9) * 0.45);
    add("THREE_WHITE_SOLDIERS", sameBull && a.c < p.c && p.c < b.c && p.o <= a.c && b.o <= p.c);
    add("THREE_BLACK_CROWS", sameBear && a.c > p.c && p.c > b.c && p.o >= a.c && b.o >= p.c);
  }
  if (index >= 4) {
    const first = bars[index - 4], second = bars[index - 3], third = bars[index - 2], fourth = bars[index - 1];
    const firstRange = Math.max(first.h - first.l, 1e-9);
    const inner = [second, third, fourth];
    const risingInner = inner.every((c) => c.c < c.o && c.h < first.h && c.l > first.l && Math.abs(c.c - c.o) <= firstRange * 0.45);
    const fallingInner = inner.every((c) => c.c > c.o && c.h < first.h && c.l > first.l && Math.abs(c.c - c.o) <= firstRange * 0.45);
    add("RISING_THREE_METHODS", first.c > first.o && first.c - first.o >= firstRange * 0.5 && risingInner && body > 0 && b.c > first.c);
    add("FALLING_THREE_METHODS", first.c < first.o && first.o - first.c >= firstRange * 0.5 && fallingInner && body < 0 && b.c < first.c);
    // Mat hold: a long impulse, three contained corrective candles, then a
    // resumption candle that clears the impulse extreme. The initial gap and
    // containment make it distinct from the looser three-methods pattern.
    const firstBody = first.c - first.o;
    const correction = [second, third, fourth];
    const bullishCorrection = second.c < second.o && second.l > first.o && [third, fourth].every((c) => c.c < c.o && c.h < first.h && c.l > first.o);
    const bearishCorrection = second.c > second.o && second.h < first.o && [third, fourth].every((c) => c.c > c.o && c.h < first.o && c.l > first.l);
    add("BULLISH_MAT_HOLD", firstBody > 0 && firstBody >= firstRange * 0.55 && second.o > first.h && bullishCorrection && body > 0 && body >= Math.max(b.h - b.l, 1e-9) * 0.45 && b.c > first.h);
    add("BEARISH_MAT_HOLD", firstBody < 0 && -firstBody >= firstRange * 0.55 && second.o < first.l && bearishCorrection && body < 0 && -body >= Math.max(b.h - b.l, 1e-9) * 0.45 && b.c < first.l);
    // Three stars in the south/north are exhaustion variants: three candles
    // of one colour, shrinking into the prior range with progressively
    // visible rejection wicks. All inputs are available at the current bar.
    const starA = third, starB = fourth, starC = b;
    const starARange = Math.max(starA.h - starA.l, 1e-9);
    const south = [starA, starB, starC].every((c) => c.c < c.o);
    const north = [starA, starB, starC].every((c) => c.c > c.o);
    const firstLower = Math.min(starA.o, starA.c) - starA.l;
    const secondLower = Math.min(starB.o, starB.c) - starB.l;
    const thirdLower = Math.min(starC.o, starC.c) - starC.l;
    const firstUpper = starA.h - Math.max(starA.o, starA.c);
    const secondUpper = starB.h - Math.max(starB.o, starB.c);
    const thirdUpper = starC.h - Math.max(starC.o, starC.c);
    const southStars = south && Math.abs(starA.c - starA.o) >= starARange * 0.45 && firstLower >= starARange * 0.15 && starB.h < starA.h && starB.l > starA.l && Math.abs(starB.c - starB.o) <= Math.abs(starA.c - starA.o) * 0.75 && secondLower >= (starB.h - starB.l) * 0.12 && starC.h < starB.h && starC.l > starB.l && Math.abs(starC.c - starC.o) <= Math.abs(starB.c - starB.o) * 0.8 && thirdLower >= (starC.h - starC.l) * 0.2;
    const northStars = north && Math.abs(starA.c - starA.o) >= starARange * 0.45 && firstUpper >= starARange * 0.15 && starB.h < starA.h && starB.l > starA.l && Math.abs(starB.c - starB.o) <= Math.abs(starA.c - starA.o) * 0.75 && secondUpper >= (starB.h - starB.l) * 0.12 && starC.h < starB.h && starC.l > starB.l && Math.abs(starC.c - starC.o) <= Math.abs(starB.c - starB.o) * 0.8 && thirdUpper >= (starC.h - starC.l) * 0.2;
    add("THREE_STARS_IN_SOUTH", southStars);
    add("THREE_STARS_IN_NORTH", northStars);
  }
  return result;
}

function averageAtr(bars: PatternBar[], index: number, period: number): number {
  const from = Math.max(0, index - period + 1);
  let sum = 0;
  let n = 0;
  for (let i = from; i <= index; i++) { const value = atrAt(bars, i); if (finite(value)) { sum += value; n++; } }
  return n ? sum / n : atrAt(bars, index);
}

const REGIME_CACHE = new WeakMap<PatternBar[], Map<number, { label: MarketRegime; trendAtr: number; volatilityRatio: number }>>();

function regimeAt(bars: PatternBar[], index: number): { label: MarketRegime; trendAtr: number; volatilityRatio: number } {
  let cache = REGIME_CACHE.get(bars);
  if (!cache) { cache = new Map(); REGIME_CACHE.set(bars, cache); }
  const cached = cache.get(index);
  if (cached) return cached;
  const atr = atrAt(bars, index);
  const anchor = bars[Math.max(0, index - 20)].c;
  const trendAtr = (bars[index].c - anchor) / Math.max(atr, 1e-9);
  const volatilityRatio = atr / Math.max(averageAtr(bars, index, 80), 1e-9);
  const label: MarketRegime = volatilityRatio > 1.45 ? "HIGH_VOL" : volatilityRatio < 0.68 ? "LOW_VOL" : trendAtr > 1.2 ? "TREND_UP" : trendAtr < -1.2 ? "TREND_DOWN" : Math.abs(trendAtr) < 0.35 ? "RANGE" : "TRANSITION";
  const value = { label, trendAtr: round(trendAtr, 3), volatilityRatio: round(volatilityRatio, 3) };
  cache.set(index, value);
  return value;
}

function windowSignature(descriptors: PatternDescriptor[], endIndex: number, lookback: number): string {
  return descriptors.slice(endIndex - lookback + 1, endIndex + 1).map((item) => item.signature).join("/");
}

function quality(bars: PatternBar[], gapLimitMs = 45 * 60 * 1000, expectedIntervalMs?: number) {
  let gaps = 0;
  let duplicateTimestamps = 0;
  let invalidBars = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (![b.o, b.h, b.l, b.c].every(finite) || b.h < Math.max(b.o, b.c) || b.l > Math.min(b.o, b.c) || b.h < b.l) invalidBars++;
    if (i && bars[i - 1].t === b.t) duplicateTimestamps++;
    if (i && Date.parse(b.t) - Date.parse(bars[i - 1].t) > (expectedIntervalMs ?? gapLimitMs)) gaps++;
  }
  return { gaps, duplicateTimestamps, invalidBars };
}

type AtlasInputTimeframe = PatternTimeframe | "H1";
const TIMEFRAME_MS: Record<AtlasInputTimeframe, number> = {
  M5: 5 * 60 * 1000,
  M15: 15 * 60 * 1000,
  M30: 30 * 60 * 1000,
  H1: 60 * 60 * 1000,
};

const ANALOGUE_GAP_LIMIT_MS = 45 * 60 * 1000;

function contiguousRange(bars: PatternBar[], start: number, end: number, expectedIntervalMs?: number, gapLimitMs = ANALOGUE_GAP_LIMIT_MS): boolean {
  if (start < 0 || end >= bars.length || start > end) return false;
  for (let index = start + 1; index <= end; index++) {
    const delta = timestampMs(bars[index].t) - timestampMs(bars[index - 1].t);
    if (!(delta > 0) || delta > gapLimitMs || (expectedIntervalMs != null && delta !== expectedIntervalMs)) return false;
  }
  return true;
}

function timestampMs(value: string): number {
  const normalized = /(?:Z|[+-]\d\d:?\d\d)$/.test(value) ? value.replace(" ", "T") : value.replace(" ", "T") + "Z";
  return Date.parse(normalized);
}

interface PreparedBars {
  bars: PatternBar[];
  quality: {
    gaps: number;
    duplicateTimestamps: number;
    outOfOrderBars: number;
    invalidTimestamps: number;
    formingBars: number;
    invalidBars: number;
  };
}

/**
 * Keep the Atlas tape causal and chronological. We deliberately reject bad
 * rows instead of sorting/filling them: reordering an out-of-order feed can
 * silently change the observed sequence, while a forming bar can later revise
 * its OHLC values. Duplicate timestamps are also excluded from features.
 */
function prepareBars(rawBars: PatternBar[], timeframe: AtlasInputTimeframe, nowMs: number): PreparedBars {
  const qualityCounts = { gaps: 0, duplicateTimestamps: 0, outOfOrderBars: 0, invalidTimestamps: 0, formingBars: 0, invalidBars: 0 };
  const bars: PatternBar[] = [];
  const seen = new Set<number>();
  let previousMs: number | null = null;
  for (const bar of rawBars) {
    const stamp = timestampMs(String(bar?.t ?? ""));
    if (!Number.isFinite(stamp)) { qualityCounts.invalidTimestamps++; continue; }
    // A bar that is not aligned to the declared timeframe cannot be safely
    // compared with its neighbours. Treat it as a timestamp defect and leave
    // the timestamp available for a later valid retry in the same feed.
    if (stamp % TIMEFRAME_MS[timeframe] !== 0) { qualityCounts.invalidTimestamps++; continue; }
    if (bar.closed === false || stamp + TIMEFRAME_MS[timeframe] > nowMs) { qualityCounts.formingBars++; continue; }
    if (![bar.o, bar.h, bar.l, bar.c].every(finite) || bar.h < Math.max(bar.o, bar.c) || bar.l > Math.min(bar.o, bar.c) || bar.h < bar.l) {
      qualityCounts.invalidBars++;
      continue;
    }
    // Only accepted closed/valid rows establish duplicate and chronology
    // state. A malformed or forming row must not poison a later valid retry.
    if (seen.has(stamp)) { qualityCounts.duplicateTimestamps++; continue; }
    if (previousMs != null && stamp < previousMs) { qualityCounts.outOfOrderBars++; continue; }
    seen.add(stamp);
    previousMs = stamp;
    bars.push({ ...bar, t: new Date(stamp).toISOString(), i: bars.length });
  }
  const measured = quality(bars, timeframe === "H1" ? 90 * 60 * 1000 : undefined, TIMEFRAME_MS[timeframe]);
  return { bars, quality: { ...qualityCounts, gaps: measured.gaps } };
}

/** Classify a bar by its UTC open time. Invalid timestamps stay UNKNOWN. */
export function patternSessionAt(iso: string): PatternSession {
  // Historical feeds often omit the timezone while documenting timestamps as
  // UTC. Normalize that form before parsing so a browser's local timezone
  // cannot move a bar across a session boundary.
  // Preserve both RFC-3339 offsets (`+08:00`) and compact ISO offsets
  // (`+0800`); appending `Z` to the latter would make the timestamp invalid
  // and silently classify an otherwise usable bar as UNKNOWN.
  const normalized = /(?:Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso.replace(" ", "T") : iso.replace(" ", "T") + "Z";
  const stamp = Date.parse(normalized);
  if (!Number.isFinite(stamp)) return "UNKNOWN";
  const hour = new Date(stamp).getUTCHours();
  if (hour < 8) return "ASIA";
  if (hour < 12) return "LONDON";
  if (hour < 16) return "LONDON_NY_OVERLAP";
  if (hour < 21) return "NEW_YORK";
  return "OFF_HOURS";
}

/**
 * Select analogue context with a causal, hierarchical backoff.  A session
 * slice is only preferred when it also has enough independent regime support;
 * otherwise a supported regime slice is safer than pretending that a sparse
 * session is representative.  The final all-context fallback remains
 * available for short or clustered tapes and is still softly context-weighted
 * by `analogueOutcomeWeight`.
 */
function contextEligible(matches: PatternMatch[], lookback = DEFAULT_LOOKBACK): {
  selected: PatternMatch[];
  fallback: boolean;
  sameSessionEffectiveN: number;
  sameRegimeEffectiveN: number;
  mode: "SAME_SESSION_REGIME" | "SAME_SESSION" | "SAME_REGIME" | "ALL_CONTEXTS";
} {
  const same = matches.filter((match) => match.sameSession);
  const sameSessionEffectiveN = overlapAdjustedEffectiveN(same, 1, lookback);
  const sameRegime = matches.filter((match) => match.sameRegime);
  const sameRegimeEffectiveN = overlapAdjustedEffectiveN(sameRegime, 1, lookback);
  const both = same.filter((match) => match.sameRegime);
  const bothEffectiveN = overlapAdjustedEffectiveN(both, 1, lookback);
  // A small session sample is too noisy to exclude the rest of the tape. The
  // fallback is decided from bars available before the query, so it cannot
  // inspect a future outcome. Raw rows must also retain three independent
  // analogues; otherwise a run of overlapping windows from one move can
  // masquerade as session-specific evidence.
  const sessionSupported = same.length >= MIN_SESSION_SAMPLES && sameSessionEffectiveN >= MIN_CONTEXT_EFFECTIVE_SUPPORT;
  const regimeSupported = sameRegime.length >= MIN_REGIME_SAMPLES && sameRegimeEffectiveN >= MIN_CONTEXT_EFFECTIVE_SUPPORT;
  const jointSupported = both.length >= MIN_SESSION_SAMPLES && bothEffectiveN >= MIN_CONTEXT_EFFECTIVE_SUPPORT;
  if (jointSupported) return { selected: both, fallback: false, sameSessionEffectiveN, sameRegimeEffectiveN, mode: "SAME_SESSION_REGIME" };
  if (sessionSupported) return { selected: same, fallback: false, sameSessionEffectiveN, sameRegimeEffectiveN, mode: "SAME_SESSION" };
  if (regimeSupported) return { selected: sameRegime, fallback: true, sameSessionEffectiveN, sameRegimeEffectiveN, mode: "SAME_REGIME" };
  return { selected: matches, fallback: true, sameSessionEffectiveN, sameRegimeEffectiveN, mode: "ALL_CONTEXTS" };
}

function sessionCalibration(
  matches: PatternMatch[],
  current: PatternSession,
  selected: PatternMatch[],
  fallback: boolean,
  sameSessionEffectiveN: number,
  sameRegimeEffectiveN: number,
  mode: "SAME_SESSION_REGIME" | "SAME_SESSION" | "SAME_REGIME" | "ALL_CONTEXTS",
  lookback = DEFAULT_LOOKBACK,
) {
  const sessions: PatternSession[] = ["ASIA", "LONDON", "LONDON_NY_OVERLAP", "NEW_YORK", "OFF_HOURS", "UNKNOWN"];
  const buckets = sessions.map((session) => {
    const rows = matches.filter((match) => match.session === session);
    const counts = { UP: 0, DOWN: 0, FLAT: 0 };
    // Keep context calibration on the same causal geometry as the posterior:
    // similarity and regime/session compatibility determine how much each
    // endpoint contributes. Raw row counts made a distant, mismatched row
    // look as informative as a close analogue and could misstate the
    // calibration of a selected session slice.
    let totalWeight = 0;
    let returnSum = 0;
    for (const row of rows) {
      const outcome = row.outcome[0];
      const weight = analogueOutcomeWeight(row);
      if (outcome) {
        counts[outcome] += weight;
        totalWeight += weight;
        returnSum += (row.forwardReturnsAtr[0] || 0) * weight;
      }
    }
    const total = totalWeight || 1;
    return {
      session, samples: rows.length,
      upRate: round(counts.UP / total, 3), downRate: round(counts.DOWN / total, 3), flatRate: round(counts.FLAT / total, 3),
      meanReturnAtr: round(totalWeight ? returnSum / totalWeight : 0, 3),
    };
  }).filter((row) => row.samples > 0);
  const aggregateRates = outcomeRates(matches);
  const currentSessionRows = matches.filter((match) => match.session === current);
  const currentSessionRates = outcomeRates(currentSessionRows);
  const selectedRates = outcomeRates(selected);
  const aggregateEffectiveN = overlapAdjustedEffectiveN(matches, 1, lookback);
  const currentSessionSupport = overlapAdjustedEffectiveN(currentSessionRows, 1, lookback);
  const selectedEffectiveN = overlapAdjustedEffectiveN(selected, 1, lookback);
  const intervalSet = (rates: ReturnType<typeof outcomeRates>, effectiveN: number) => ({
    up: wilsonInterval(rates.upRate, effectiveN),
    down: wilsonInterval(rates.downRate, effectiveN),
    flat: wilsonInterval(rates.flatRate, effectiveN),
  });
  return {
    current, totalSamples: matches.length,
    currentSessionSamples: matches.filter((match) => match.sameSession).length,
    sameSessionEffectiveN: round(sameSessionEffectiveN, 3),
    sameRegimeEffectiveN: round(sameRegimeEffectiveN, 3),
    minimumEffectiveN: MIN_CONTEXT_EFFECTIVE_SUPPORT,
    selectedSamples: selected.length, fallback,
    mode,
    buckets,
    uncertainty: {
      aggregateEffectiveN: round(aggregateEffectiveN, 3),
      currentSessionEffectiveN: round(currentSessionSupport, 3),
      selectedEffectiveN: round(selectedEffectiveN, 3),
      aggregateInterval95: intervalSet(aggregateRates, aggregateEffectiveN),
      currentSessionInterval95: intervalSet(currentSessionRates, currentSessionSupport),
      selectedInterval95: intervalSet(selectedRates, selectedEffectiveN),
    },
  };
}

/**
 * Keep sparse tapes usable while reducing the influence of context-mismatched
 * outcomes.  The analogue search already ranks regime/session matches first;
 * applying the same causal context softly during aggregation prevents a
 * fallback (for example, an under-supported Asia session) from treating all
 * sessions as equally informative.  Optional fields preserve compatibility
 * with persisted/legacy PatternMatch values.
 */
function analogueOutcomeWeight(match: PatternMatch): number {
  return causalCandidateWeight({ d: match.distance, end: 0, similarity: match.similarity, sameRegime: match.sameRegime, sameSession: match.sameSession });
}

/**
 * Quantify posterior concentration on the causal, context-selected tape.
 * Kish support alone can hide a nearest-neighbour monopoly when one analogue
 * carries most of the similarity mass.  HHI/top-share make that fragility
 * visible while leaving outcome probabilities and authority unchanged.
 */
function analogueConcentration(rows: PatternMatch[], lookback: number): PatternAnalysis["analogueConcentration"] {
  const weighted = rows
    .map((row) => ({ row, weight: analogueOutcomeWeight(row) }))
    .filter((item) => Number.isFinite(item.weight) && item.weight > 0);
  if (!weighted.length) {
    return { samples: 0, totalWeight: 0, topShare: 0, hhi: 0, effectiveN: 0, independentSamples: 0, independentRate: 0, label: "INSUFFICIENT" };
  }
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const shares = weighted.map((item) => item.weight / totalWeight);
  const hhi = shares.reduce((sum, share) => sum + share * share, 0);
  const effectiveN = hhi > 0 ? 1 / hhi : 0;
  const independentSamples = independentEndpointCount(weighted.map((item) => item.row), lookback + MAX_OUTCOME_HORIZON);
  const independentRate = independentSamples / Math.max(1, weighted.length);
  // A half-or-more top share is an explicit nearest-neighbour monopoly. The
  // HHI threshold catches less extreme concentration across a small tape.
  const label: "INSUFFICIENT" | "BALANCED" | "CONCENTRATED" = weighted.length < 2
    ? "INSUFFICIENT"
    : shares[0]! >= 0.5 || hhi >= 0.35
      ? "CONCENTRATED"
      : "BALANCED";
  return {
    samples: weighted.length,
    totalWeight: round(totalWeight, 4),
    topShare: round(Math.max(...shares), 4),
    hhi: round(clamp(hhi, 0, 1), 4),
    effectiveN: round(clamp(effectiveN, 0, weighted.length), 3),
    independentSamples,
    independentRate: round(clamp(independentRate, 0, 1), 4),
    label,
  };
}

/**
 * Separate geometric novelty from the amount of independent historical
 * support around the query.  The analogue tape is already purged before it
 * reaches this function, so this remains a causal, descriptive diagnostic;
 * it does not alter the posterior, consensus, or evidence gate.
 */
export function decomposeNovelty(
  rows: Array<Pick<PatternMatch, "distance" | "endIndex">>,
  lookback = DEFAULT_LOOKBACK,
): NoveltyDecomposition {
  const valid = rows.filter((row) => Number.isFinite(row.distance) && Number.isFinite(row.endIndex));
  const nearby = valid.filter((row) => row.distance <= 0.35);
  const nearestDistance = valid.length ? Math.min(...valid.map((row) => row.distance)) : null;
  const nearbyIndependentCandidates = chronologicalIndependentCount(
    nearby.map((row) => row.endIndex),
    lookback + MAX_OUTCOME_HORIZON,
  );
  const nearbyRate = nearby.length / Math.max(1, valid.length);
  const nearbyIndependentRate = nearbyIndependentCandidates / Math.max(1, valid.length);
  const distanceScore = nearestDistance == null ? 1 : clamp(nearestDistance / 0.7, 0, 1);
  const densityScore = 1 - clamp(nearbyRate, 0, 1);
  const independentDensityScore = 1 - clamp(nearbyIndependentRate, 0, 1);
  const overlapGap = clamp(nearbyRate - nearbyIndependentRate, 0, 1);
  let label: NoveltyDecomposition["label"];
  let note: string;
  if (!valid.length) {
    label = "INSUFFICIENT";
    note = "No finite causal analogue endpoints are available to decompose novelty.";
  } else if (nearestDistance == null || nearestDistance > 0.7) {
    label = "DISTANCE_LIMITED";
    note = "The query is outside the known distance band; support density cannot make the geometry familiar.";
  } else if (nearbyIndependentCandidates < 2) {
    label = "SUPPORT_LIMITED";
    note = "A nearby analogue exists, but the endpoint-purged neighbourhood has fewer than two independent supports.";
  } else if (nearestDistance <= 0.35 && nearbyIndependentRate >= 0.15) {
    label = "REPEATABLE";
    note = "The query has a close analogue neighbourhood with repeatable causal endpoint support.";
  } else {
    label = "MIXED";
    note = "Distance and causal neighbourhood support describe mixed novelty evidence.";
  }
  return {
    causalCandidates: valid.length,
    // Keep this component at the same precision as `novelty.score` so the
    // decomposition can be reconciled exactly with the legacy summary.
    distanceScore: round(clamp(distanceScore, 0, 1), 3),
    densityScore: round(clamp(densityScore, 0, 1), 4),
    independentDensityScore: round(clamp(independentDensityScore, 0, 1), 4),
    nearbyCandidates: nearby.length,
    nearbyRate: round(clamp(nearbyRate, 0, 1), 4),
    nearbyIndependentCandidates,
    nearbyIndependentRate: round(clamp(nearbyIndependentRate, 0, 1), 4),
    overlapGap: round(overlapGap, 4),
    label,
    note,
  };
}

function outcomeRates(rows: PatternMatch[]) {
  const counts = { UP: 0, DOWN: 0, FLAT: 0 };
  let totalWeight = 0;
  let weightedReturn = 0;
  for (const row of rows) {
    const outcome = row.outcome[0];
    if (!outcome) continue;
    const weight = analogueOutcomeWeight(row);
    counts[outcome] += weight;
    totalWeight += weight;
    weightedReturn += (row.forwardReturnsAtr[0] || 0) * weight;
  }
  const denominator = totalWeight || 1;
  return {
    upRate: round(counts.UP / denominator, 3),
    downRate: round(counts.DOWN / denominator, 3),
    flatRate: round(counts.FLAT / denominator, 3),
    meanReturnAtr: round(totalWeight ? weightedReturn / totalWeight : 0, 3),
  };
}

function regimeCalibration(matches: PatternMatch[], current: MarketRegime, lookback = DEFAULT_LOOKBACK) {
  const sameRegime = matches.filter((match) => match.sameRegime);
  const sameRegimeEffectiveN = overlapAdjustedEffectiveN(sameRegime, 1, lookback);
  const fallback = sameRegime.length < MIN_REGIME_SAMPLES || sameRegimeEffectiveN < MIN_CONTEXT_EFFECTIVE_SUPPORT;
  const selected = fallback ? matches : sameRegime;
  const aggregate = outcomeRates(matches);
  const same = outcomeRates(sameRegime);
  const selectedRates = outcomeRates(selected);
  const aggregateEffectiveN = overlapAdjustedEffectiveN(matches, 1, lookback);
  const selectedEffectiveN = overlapAdjustedEffectiveN(selected, 1, lookback);
  const intervals = (rates: ReturnType<typeof outcomeRates>, effectiveN: number) => ({
    up: wilsonInterval(rates.upRate, effectiveN),
    down: wilsonInterval(rates.downRate, effectiveN),
    flat: wilsonInterval(rates.flatRate, effectiveN),
  });
  const distributionShift = sameRegime.length
    ? 0.5 * (Math.abs(same.upRate - aggregate.upRate) + Math.abs(same.downRate - aggregate.downRate) + Math.abs(same.flatRate - aggregate.flatRate))
    : 0;
  const support = sameRegimeEffectiveN / (sameRegimeEffectiveN + MIN_REGIME_SAMPLES);
  return {
    current,
    totalSamples: matches.length,
    sameRegimeSamples: sameRegime.length,
    sameRegimeEffectiveN: round(sameRegimeEffectiveN, 3),
    minimumEffectiveN: MIN_CONTEXT_EFFECTIVE_SUPPORT,
    selectedSamples: selected.length,
    fallback,
    mode: fallback ? "ALL_REGIMES" as const : "SAME_REGIME" as const,
    aggregate,
    sameRegime: same,
    selected: selectedRates,
    distributionShift: round(clamp(distributionShift, 0, 1), 3),
    stability: round(clamp(support * (1 - distributionShift), 0, 1), 3),
    uncertainty: {
      aggregateEffectiveN: round(aggregateEffectiveN, 3),
      sameRegimeEffectiveN: round(sameRegimeEffectiveN, 3),
      selectedEffectiveN: round(selectedEffectiveN, 3),
      aggregateInterval95: intervals(aggregate, aggregateEffectiveN),
      sameRegimeInterval95: intervals(same, sameRegimeEffectiveN),
      selectedInterval95: intervals(selectedRates, selectedEffectiveN),
    },
  };
}

function classifyPatternRarity(sampleN: number, totalSamples: number): PatternRarity {
  if (sampleN <= 0 || totalSamples <= 0) return "UNSEEN";
  const rate = sampleN / totalSamples;
  // Keep the labels descriptive rather than inferential: these are occurrence
  // frequencies on the causal analogue tape, not a claim about edge quality.
  if (sampleN < 3 || rate < 0.05) return "RARE";
  if (rate < 0.15) return "OCCASIONAL";
  return "COMMON";
}

/**
 * Discount analogue support when the selected endpoints are clustered in
 * time.  The nearest-neighbour tape can contain several adjacent windows
 * from the same XAUUSD move; treating each as an independent observation
 * makes the Wilson intervals around H+1/H+2/H+3 too narrow.  Kish support
 * handles unequal similarity/context weights, then the median endpoint gap
 * applies a robust overlap cap tied to the feature window. Median spacing
 * avoids one distant analogue masking a dense cluster of nearby endpoints.
 * This only changes uncertainty metadata and confidence labels; posterior
 * probabilities and the research/shadow authority remain unchanged.
 */
function overlapSpacingFactor(rows: PatternMatch[], horizon: number, lookback: number): number {
  if (rows.length < 2) return 1;
  const endpoints = [...new Set(rows.map((row) => row.endIndex))].sort((a, b) => a - b);
  const gaps = endpoints.slice(1).map((index, offset) => index - endpoints[offset]!).filter((gap) => gap > 0);
  const medianGap = median(gaps) ?? Math.max(1, lookback);
  // An analogue observation spans both its feature window and every forward
  // bar used by the requested outcome.  Two endpoints can therefore share
  // evidence whenever their gap is shorter than the combined span.  Using
  // `max(lookback, horizon)` under-counted that shared tape (for example a
  // 5-bar feature window with H+3 still overlaps for gaps 5–7), overstating
  // independent support for the longer-horizon posterior.  Keep this causal
  // adjustment in uncertainty metadata only; posterior probabilities stay
  // unchanged.
  const overlapWindow = Math.max(1, lookback + Math.max(0, horizon));
  return clamp(medianGap / overlapWindow, 0.1, 1);
}

function overlapAdjustedEffectiveN(rows: PatternMatch[], horizon: number, lookback: number): number {
  if (!rows.length) return 0;
  let totalWeight = 0;
  let squaredWeight = 0;
  for (const row of rows) {
    const weight = analogueOutcomeWeight(row);
    totalWeight += weight;
    squaredWeight += weight * weight;
  }
  if (!(totalWeight > 0) || !(squaredWeight > 0)) return 0;
  const kish = (totalWeight * totalWeight) / squaredWeight;
  const spacingFactor = overlapSpacingFactor(rows, horizon, lookback);
  // Chronological packing is a causal upper bound. The weighted overlap
  // estimate remains the uncertainty diagnostic used by prediction cards.
  const packed = chronologicalIndependentCount(rows.map((row) => row.endIndex), lookback + Math.max(0, horizon));
  return clamp(Math.min(kish * spacingFactor, packed), 1, rows.length);
}

/**
 * Count distinct analogue support after removing endpoint clusters.  A
 * nearby tape can contain many adjacent windows from one move; those rows
 * are useful for ranking, but they are not independent novelty support.
 * The spacing covers the feature window and the longest forward outcome so
 * two retained endpoints do not share either side of the causal evidence.
 */
export function chronologicalIndependentCount(rawEndpoints: number[], spacing: number): number {
  if (!rawEndpoints.length) return 0;
  // Greedy earliest-endpoint packing is the maximum cardinality packing for a
  // one-dimensional minimum-spacing constraint. Sorting chronologically (and
  // deduplicating) makes the result independent of distance/ranking order and
  // monotonic for every subset of the same endpoint tape.
  const endpoints = [...new Set(rawEndpoints.filter((endpoint) => Number.isFinite(endpoint)).map((endpoint) => Math.trunc(endpoint)))].sort((a, b) => a - b);
  let count = 0;
  let last = Number.NEGATIVE_INFINITY;
  // Treat malformed spacing as the narrowest causal purge instead of letting
  // NaN make every comparison false (which would silently bypass packing).
  const minSpacing = Number.isFinite(spacing) ? Math.max(1, Math.trunc(spacing)) : 1;
  for (const endpoint of endpoints) {
    if (endpoint - last < minSpacing) continue;
    count++;
    last = endpoint;
  }
  return count;
}

function independentEndpointCount(rows: PatternMatch[], spacing: number): number {
  return chronologicalIndependentCount(rows.map((row) => row.endIndex), spacing);
}

/**
 * Measure detector redundancy without changing the detector output. Pair
 * counts are built only from causal analogue endpoints, so a high overlap
 * rate is a quality flag about the tape rather than an extra forecast vote.
 */
function patternOverlap(matches: PatternMatch[], currentPatterns: NamedCandlePattern[]): PatternOverlap {
  const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const rows = matches.map((match) => [...new Set(match.patterns ?? [])]);
  const analogueSamples = rows.length;
  const multiPatternRows = rows.filter((row) => row.length >= 2).length;
  const totalPatterns = rows.reduce((sum, row) => sum + row.length, 0);
  const pairCounts = new Map<string, { first: NamedCandlePattern; second: NamedCandlePattern; count: number }>();
  for (const row of rows) {
    const ordered = row.slice().sort(lexical);
    for (let i = 0; i < ordered.length; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        const first = ordered[i]!;
        const second = ordered[j]!;
        const key = `${first}|${second}`;
        const existing = pairCounts.get(key);
        if (existing) existing.count += 1;
        else pairCounts.set(key, { first, second, count: 1 });
      }
    }
  }
  const pairs = [...pairCounts.values()]
    .sort((a, b) => b.count - a.count || lexical(a.first, b.first) || lexical(a.second, b.second))
    .slice(0, 8)
    .map((pair) => ({ ...pair, rate: round(pair.count / Math.max(1, analogueSamples), 4) }));
  const current = [...new Set(currentPatterns)];
  return {
    currentCount: current.length,
    currentHasOverlap: current.length >= 2,
    analogueSamples,
    analogueMultiPatternRate: round(multiPatternRows / Math.max(1, analogueSamples), 4),
    analogueMeanPatterns: round(totalPatterns / Math.max(1, analogueSamples), 4),
    pairs,
  };
}

function patternEvidenceSummary(
  matches: PatternMatch[],
  currentPatterns: NamedCandlePattern[],
  lookback = DEFAULT_LOOKBACK,
): PatternEvidenceSummary {
  const current = [...new Set(currentPatterns)];
  const endpointAssignments = new Map<number, number>();
  const supportRows: PatternMatch[] = [];
  let detectorAssignmentCount = 0;
  for (const match of matches) {
    const count = current.reduce((sum, pattern) => sum + ((match.patterns ?? []).includes(pattern) ? 1 : 0), 0);
    if (count <= 0) continue;
    endpointAssignments.set(match.endIndex, count);
    supportRows.push(match);
    detectorAssignmentCount += count;
  }
  const uniqueEndpointSupport = endpointAssignments.size;
  return {
    currentPatterns: current,
    selectedAnalogueSamples: matches.length,
    uniqueEndpointSupport,
    uniqueEndpointEffectiveN: round(overlapAdjustedEffectiveN(supportRows, 1, lookback), 3),
    detectorAssignmentCount,
    endpointCoverageRate: round(uniqueEndpointSupport / Math.max(1, matches.length), 4),
    assignmentOverlapRate: round(
      detectorAssignmentCount > 0 ? 1 - uniqueEndpointSupport / detectorAssignmentCount : 0,
      4,
    ),
    role: "CONDITIONAL_DESCRIPTIVE_ONLY",
    includedInConsensus: false,
  };
}

function prediction(matches: PatternMatch[], horizon: number, lookback = 1): HorizonPrediction {
  const counts = { UP: 1, DOWN: 1, FLAT: 1 };
  let weightedReturn = 0;
  let totalWeight = 0;
  const supportRows: PatternMatch[] = [];
  for (const match of matches) {
    const outcome = match.outcome[horizon - 1];
    if (!outcome) continue;
    const weight = analogueOutcomeWeight(match);
    counts[outcome] += weight;
    weightedReturn += (match.forwardReturnsAtr[horizon - 1] || 0) * weight;
    totalWeight += weight;
    supportRows.push(match);
  }
  const total = counts.UP + counts.DOWN + counts.FLAT;
  const max = Math.max(counts.UP, counts.DOWN, counts.FLAT);
  const up = counts.UP / total;
  const down = counts.DOWN / total;
  const flat = counts.FLAT / total;
  const effectiveN = overlapAdjustedEffectiveN(supportRows, horizon, lookback);
  return {
    horizon,
    up: round(up, 3), down: round(down, 3), flat: round(flat, 3),
    expectedAtr: round(totalWeight ? weightedReturn / totalWeight : 0, 3),
    sampleN: matches.filter((m) => !!m.outcome[horizon - 1]).length,
    confidence: max / total >= 0.6 && effectiveN >= 20 ? "HIGH" : max / total >= 0.48 && effectiveN >= 10 ? "MEDIUM" : "LOW",
    // Three uniform pseudo-observations are part of the smoothed aggregate.
    calibration: predictionCalibration({ up, down, flat }, horizon, effectiveN + 3, overlapSpacingFactor(supportRows, horizon, lookback)),
  };
}

/**
 * Estimate one named-pattern distribution from causal analogue matches. The
 * aggregate prediction is an empirical-Bayes prior so sparse pattern
 * occurrences do not turn one or two matches into false certainty.
 */
function namedPatternPrediction(
  matches: PatternMatch[],
  horizon: number,
  pattern: NamedCandlePattern,
  prior: HorizonPrediction,
  lookback = 1,
): NamedPatternHorizonPrediction {
  const counts = { UP: 0, DOWN: 0, FLAT: 0 };
  let weightedReturn = 0;
  let totalWeight = 0;
  const supportRows: PatternMatch[] = [];
  let sampleN = 0;
  for (const match of matches) {
    if (!(match.patterns ?? []).includes(pattern)) continue;
    const outcome = match.outcome[horizon - 1];
    if (!outcome) continue;
    const weight = analogueOutcomeWeight(match);
    counts[outcome] += weight;
    const forwardReturn = match.forwardReturnsAtr[horizon - 1];
    if (finite(forwardReturn)) weightedReturn += forwardReturn * weight;
    totalWeight += weight;
    supportRows.push(match);
    sampleN++;
  }
  // Six pseudo-observations is deliberately modest: enough to stabilize an
  // unseen pattern, while allowing useful support to move the posterior.
  const priorStrength = 6;
  const denominator = totalWeight + priorStrength;
  const up = (counts.UP + prior.up * priorStrength) / denominator;
  const down = (counts.DOWN + prior.down * priorStrength) / denominator;
  const flat = (counts.FLAT + prior.flat * priorStrength) / denominator;
  const max = Math.max(up, down, flat);
  const effectiveN = overlapAdjustedEffectiveN(supportRows, horizon, lookback);
  const shrinkage = priorStrength / denominator;
  const confidence: HorizonPrediction["confidence"] = max >= 0.6 && effectiveN >= 20
    ? "HIGH"
    : max >= 0.48 && effectiveN >= 8
      ? "MEDIUM"
      : "LOW";
  const probabilities = { up, down, flat };
  return {
    horizon,
    up: round(up, 3), down: round(down, 3), flat: round(flat, 3),
    expectedAtr: round((weightedReturn + prior.expectedAtr * priorStrength) / denominator, 3),
    sampleN,
    confidence,
    effectiveN: round(effectiveN, 3),
    shrinkage: round(clamp(shrinkage, 0, 1), 3),
    liftVsAggregate: {
      up: round(up - prior.up, 3),
      down: round(down - prior.down, 3),
      flat: round(flat - prior.flat, 3),
    },
    calibration: predictionCalibration(probabilities, horizon, effectiveN + priorStrength, overlapSpacingFactor(supportRows, horizon, lookback)),
  };
}

const PROBABILITY_BIN_COUNT = 5;
/** A single held-out label must not decide a confidence-bin calibration claim. */
const MIN_CALIBRATION_BIN_COUNT = 4;
/** Require most held-out labels to be covered by supported bins. */
const MIN_CALIBRATION_SAMPLE_RATE = 0.8;

type ProbabilisticValidationRow = { queryEnd: number; probabilities: { up: number; down: number; flat: number }; actual: OutcomeDirection };

type ProbabilityFoldMetrics = {
  brierScore: number;
  expectedCalibrationError: number;
  topClassAccuracy: number;
};

function probabilityFoldMetrics(rows: ProbabilisticValidationRow[]): ProbabilityFoldMetrics | null {
  if (!rows.length) return null;
  let brier = 0;
  const bins = Array.from({ length: PROBABILITY_BIN_COUNT }, () => ({ predicted: 0, correct: 0, count: 0 }));
  for (const row of rows) {
    const actualIndex = row.actual === "UP" ? 0 : row.actual === "DOWN" ? 1 : 2;
    const actual = actualIndex === 0 ? [1, 0, 0] : actualIndex === 1 ? [0, 1, 0] : [0, 0, 1];
    const values = [row.probabilities.up, row.probabilities.down, row.probabilities.flat].map((value) => clamp(value, 0, 1));
    brier += values.reduce((sum, value, index) => sum + (value - actual[index]) ** 2, 0);
    const top = Math.max(...values);
    const binIndex = Math.min(PROBABILITY_BIN_COUNT - 1, Math.floor(top * PROBABILITY_BIN_COUNT));
    bins[binIndex].predicted += top;
    bins[binIndex].correct += values.indexOf(top) === actualIndex ? 1 : 0;
    bins[binIndex].count++;
  }
  const populated = bins.filter((bin) => bin.count > 0);
  const expectedCalibrationError = populated.reduce((sum, bin) => {
    const meanPredicted = bin.predicted / bin.count;
    const observedRate = bin.correct / bin.count;
    return sum + (bin.count / rows.length) * Math.abs(meanPredicted - observedRate);
  }, 0);
  const topClassAccuracy = bins.reduce((sum, bin) => sum + bin.correct, 0) / rows.length;
  return {
    brierScore: brier / rows.length,
    expectedCalibrationError,
    topClassAccuracy,
  };
}

function probabilityCalibrationDrift(rows: ProbabilisticValidationRow[], lookback = 1): ProbabilityCalibrationDrift {
  const foldCount = 3;
  const foldRows = Array.from({ length: foldCount }, () => [] as ProbabilisticValidationRow[]);
  rows.forEach((row, index) => {
    const fold = rows.length ? Math.min(foldCount - 1, Math.floor(index * foldCount / rows.length)) : 0;
    foldRows[fold].push(row);
  });
  const folds = foldRows.map((items, index) => {
    const metrics = probabilityFoldMetrics(items);
    const correctness = items.map((row) => {
      const values = [row.probabilities.up, row.probabilities.down, row.probabilities.flat].map((value) => clamp(value, 0, 1));
      const topIndex = values.indexOf(Math.max(...values));
      const actualIndex = row.actual === "UP" ? 0 : row.actual === "DOWN" ? 1 : 2;
      return topIndex === actualIndex ? 1 : 0;
    });
    // Fold support must respect the same feature + outcome overlap used by
    // the aggregate reliability interval. This is a diagnostic only: it
    // cannot change the causal posterior or emit a decision.
    const effectiveN = items.length
      ? round(effectiveSampleSize(correctness, items.map((row) => row.queryEnd), lookback, 1), 3)
      : 0;
    return {
      fold: index + 1,
      evaluated: items.length,
      effectiveN,
      firstQueryIndex: items.length ? items[0].queryEnd : null,
      lastQueryIndex: items.length ? items[items.length - 1].queryEnd : null,
      brierScore: metrics ? round(metrics.brierScore, 4) : null,
      expectedCalibrationError: metrics ? round(metrics.expectedCalibrationError, 4) : null,
      topClassAccuracy: metrics ? round(metrics.topClassAccuracy, 4) : null,
    };
  });
  const enoughSupport = rows.length >= 12 && folds.every((fold) => fold.evaluated >= 4);
  if (!enoughSupport) {
    return {
      folds,
      evaluated: rows.length,
      score: null,
      rawScore: null,
      supportFactor: null,
      label: "INSUFFICIENT",
      note: "Need at least 12 chronological probability labels (four per fold) before classifying calibration drift.",
    };
  }
  const first = folds[0];
  const last = folds[foldCount - 1];
  const eceDelta = (last.expectedCalibrationError ?? 0) - (first.expectedCalibrationError ?? 0);
  const brierDelta = (last.brierScore ?? 0) - (first.brierScore ?? 0);
  const accuracyDrop = (first.topClassAccuracy ?? 0) - (last.topClassAccuracy ?? 0);
  // ECE and Brier are calibration-loss measures; accuracy drop is a smaller
  // supporting term. The score is descriptive and bounded to keep labels
  // stable when one fold is noisy.
  const rawScore = clamp(0.5 * eceDelta + 0.35 * brierDelta + 0.15 * accuracyDrop, -1, 1);
  // A fold with densely overlapping queries can look like a sharp temporal
  // break even when it carries little independent evidence. Discount the
  // first→last drift score by the weaker endpoint's effective support. The
  // posterior and held-out labels remain untouched; this only makes the
  // shadow drift classification conservative under sparse/clustered support.
  const endpointEffectiveN = Math.min(first.effectiveN, last.effectiveN);
  const supportFactor = clamp(Math.sqrt(endpointEffectiveN / 12), 0, 1);
  const score = round(clamp(rawScore * supportFactor, -1, 1), 3);
  const label: ProbabilityCalibrationDrift["label"] = score >= 0.15
    ? "BREAK"
    : score >= 0.07 ? "WATCH" : "STABLE";
  return {
    folds,
    evaluated: rows.length,
    score,
    rawScore: round(rawScore, 3),
    supportFactor: round(supportFactor, 3),
    label,
    note: label === "BREAK"
      ? "Last chronological fold is materially less calibrated than the first; treat probabilities as exploratory until recalibrated."
      : label === "WATCH"
        ? "Calibration loss is widening across chronological folds; monitor subsequent closed-bar evidence."
        : "Calibration metrics remain broadly stable across the chronological folds; this is descriptive evidence only.",
  };
}

function emptyProbabilisticValidation(note: string): WalkForwardProbabilisticReport {
  const calibrationBins = Array.from({ length: PROBABILITY_BIN_COUNT }, (_, index) => ({
    lower: round(index / PROBABILITY_BIN_COUNT, 2),
    upper: round((index + 1) / PROBABILITY_BIN_COUNT, 2),
    count: 0,
    meanPredicted: null,
    observedRate: null,
    calibrationError: null,
  }));
  return {
    horizon: 1,
    evaluated: 0,
    brierScore: null,
    logLoss: null,
    calibrationBins,
    reliability: {
      expectedCalibrationError: null,
      maxCalibrationError: null,
      populatedBins: 0,
      supportedBins: 0,
      supportedSampleRate: 0,
      minimumBinCount: MIN_CALIBRATION_BIN_COUNT,
      topClassAccuracy: null,
      effectiveN: 0,
      topClassAccuracyInterval95: null,
      majorityClassBaseline: null,
      topClassLiftVsBaseline: null,
      status: "INSUFFICIENT",
      note: "No chronological probability labels are available for a reliability summary.",
    },
    drift: probabilityCalibrationDrift([]),
    note,
  };
}

/**
 * Build the H+1 categorical probability used by adaptive lookback validation.
 * It mirrors the production analogue posterior, including its modest uniform
 * prior. Every 
earest` endpoint is historical for the query by construction;
 * no current or future outcome is read here.
 */
type CausalCandidate = {
  d: number;
  end: number;
  /** Regime match against the query boundary, used by posterior weighting. */
  sameRegime?: boolean;
  /** Regime match against the adaptation target, used only for candidate filtering. */
  targetRegime?: boolean;
  sameSession?: boolean;
  similarity?: number;
};

/**
 * Keep chronological validation on the same posterior geometry as the
 * production analogue aggregation.  Previously walk-forward used an inverse
 * distance vote while production used squared exponential similarity plus
 * context multipliers; that made adaptive lookback selection optimise a
 * different model than the one exposed to callers.
 */
function causalCandidateWeight(candidate: CausalCandidate): number {
  const similarity = candidate.similarity ?? Math.exp(-candidate.d * 7);
  const similarityWeight = Math.max(0.05, similarity ** 2);
  const regimeWeight = candidate.sameRegime === false ? 0.65 : 1;
  const sessionWeight = candidate.sameSession === false ? 0.8 : 1;
  return similarityWeight * regimeWeight * sessionWeight;
}

function causalH1Probability(
  bars: PatternBar[],
  nearest: CausalCandidate[],
): { up: number; down: number; flat: number } {
  const counts = { UP: 1, DOWN: 1, FLAT: 1 };
  for (const hit of nearest) {
    const outcome = direction((bars[hit.end + 1].c - bars[hit.end].c) / atrAt(bars, hit.end));
    counts[outcome] += causalCandidateWeight(hit);
  }
  const total = counts.UP + counts.DOWN + counts.FLAT;
  return { up: counts.UP / total, down: counts.DOWN / total, flat: counts.FLAT / total };
}

/**
 * Apply the same overlap-aware support rule to the candidate shape used by
 * walk-forward validation.  Production session conditioning uses this rule
 * after ranking; keeping it here prevents a dense run of same-session windows
 * from being treated as independent validation evidence.
 */
export function causalCandidateEffectiveN(rows: CausalCandidate[], lookback: number, outcomeHorizon = 1): number {
  if (!rows.length) return 0;
  let totalWeight = 0;
  let squaredWeight = 0;
  for (const row of rows) {
    const weight = causalCandidateWeight(row);
    // A malformed candidate must not poison the entire support estimate.  The
    // posterior path still owns its input validation; this diagnostic simply
    // ignores non-finite/zero-mass rows and remains bounded.
    if (!Number.isFinite(weight) || weight <= 0) continue;
    totalWeight += weight;
    squaredWeight += weight * weight;
  }
  if (!(totalWeight > 0) || !(squaredWeight > 0)) return 0;
  // Use Kish effective support rather than raw weighted mass.  The latter is
  // scale-dependent (the 0.05 similarity floor can make twenty equally useful
  // distant candidates look like one sample), while Kish remains invariant to
  // that common scaling.  Chronological packing is still a hard causal upper
  // bound, so this changes support metadata/context eligibility only; outcome
  // weights and posterior probabilities are untouched.
  const kish = (totalWeight * totalWeight) / squaredWeight;
  const packed = chronologicalIndependentCount(rows.map((row) => row.end), lookback + Math.max(0, outcomeHorizon));
  return clamp(Math.min(kish, packed), 1, rows.length);
}

function topCausalDirection(probabilities: { up: number; down: number; flat: number }): OutcomeDirection {
  // Validation must use the same abstaining direction rule as production
  // forecasts.  A deterministic top-label tie would otherwise inflate
  // walk-forward hit rates by turning an unresolved posterior into UP.
  return dominantDirection(probabilities);
}

function causalContextEligible(matches: CausalCandidate[], lookback: number): CausalCandidate[] {
  const sameSession = matches.filter((match) => match.sameSession);
  const sameRegime = matches.filter((match) => match.sameRegime);
  const both = sameSession.filter((match) => match.sameRegime);
  const sessionSupported = sameSession.length >= MIN_SESSION_SAMPLES && causalCandidateEffectiveN(sameSession, lookback) >= MIN_CONTEXT_EFFECTIVE_SUPPORT;
  const regimeSupported = sameRegime.length >= MIN_REGIME_SAMPLES && causalCandidateEffectiveN(sameRegime, lookback) >= MIN_CONTEXT_EFFECTIVE_SUPPORT;
  const jointSupported = both.length >= MIN_SESSION_SAMPLES && causalCandidateEffectiveN(both, lookback) >= MIN_CONTEXT_EFFECTIVE_SUPPORT;
  if (jointSupported) return both;
  if (sessionSupported) return sameSession;
  if (regimeSupported) return sameRegime;
  return matches;
}

function probabilisticValidation(
  rows: ProbabilisticValidationRow[],
  lookback = 1,
): WalkForwardProbabilisticReport {
  if (!rows.length) return emptyProbabilisticValidation("Need more closed bars for causal probabilistic validation.");
  let brier = 0;
  let logLoss = 0;
  const bins = Array.from({ length: PROBABILITY_BIN_COUNT }, () => ({ predicted: 0, correct: 0, count: 0 }));
  const actualCounts = { UP: 0, DOWN: 0, FLAT: 0 };
  const topClassCorrectness: number[] = [];
  for (const row of rows) {
    actualCounts[row.actual]++;
    const actual = row.actual === "UP" ? [1, 0, 0] : row.actual === "DOWN" ? [0, 1, 0] : [0, 0, 1];
    const values = [row.probabilities.up, row.probabilities.down, row.probabilities.flat].map((value) => clamp(value, 0, 1));
    brier += values.reduce((sum, value, index) => sum + (value - actual[index]) ** 2, 0);
    const actualIndex = row.actual === "UP" ? 0 : row.actual === "DOWN" ? 1 : 2;
    logLoss += -Math.log(Math.max(1e-12, values[actualIndex]));
    // A compact reliability diagram uses the top-class confidence and its
    // correctness. Ties are resolved in UP/DOWN/FLAT order, deterministically.
    const top = Math.max(...values);
    const binIndex = Math.min(PROBABILITY_BIN_COUNT - 1, Math.floor(top * PROBABILITY_BIN_COUNT));
    const topIndex = values.indexOf(top);
    bins[binIndex].predicted += top;
    bins[binIndex].correct += topIndex === actualIndex ? 1 : 0;
    bins[binIndex].count++;
    topClassCorrectness.push(topIndex === actualIndex ? 1 : 0);
  }
  const calibrationBins = bins.map((bin, index) => {
    const lower = round(index / PROBABILITY_BIN_COUNT, 2);
    const upper = round((index + 1) / PROBABILITY_BIN_COUNT, 2);
    const meanPredicted = bin.count ? bin.predicted / bin.count : null;
    const observedRate = bin.count ? bin.correct / bin.count : null;
    return {
      lower,
      upper,
      count: bin.count,
      meanPredicted: meanPredicted == null ? null : round(meanPredicted, 3),
      observedRate: observedRate == null ? null : round(observedRate, 3),
      calibrationError: meanPredicted == null || observedRate == null ? null : round(Math.abs(meanPredicted - observedRate), 3),
    };
  });
  const populated = calibrationBins.filter((bin) => bin.count > 0);
  const supported = populated.filter((bin) => bin.count >= MIN_CALIBRATION_BIN_COUNT);
  const supportedSamples = supported.reduce((sum, bin) => sum + bin.count, 0);
  const supportedSampleRate = supportedSamples / rows.length;
  const expectedCalibrationError = rows.length
    ? populated.reduce((sum, bin) => sum + (bin.count / rows.length) * (bin.calibrationError ?? 0), 0)
    : null;
  const maxCalibrationError = populated.length
    ? Math.max(...populated.map((bin) => bin.calibrationError ?? 0))
    : null;
  const topClassAccuracy = rows.length
    ? populated.reduce((sum, bin) => sum + (bin.count / rows.length) * (bin.observedRate ?? 0), 0)
    : null;
  // Adjacent walk-forward queries share most of the lookback feature window.
  // Use the same serial/spacing adjustment as the hit-rate interval so the
  // reliability summary does not present a falsely narrow Wilson interval.
  const topClassEffectiveN = effectiveSampleSize(topClassCorrectness, rows.map((row) => row.queryEnd), lookback, 1);
  const majorityClassBaseline = rows.length
    ? Math.max(actualCounts.UP, actualCounts.DOWN, actualCounts.FLAT) / rows.length
    : null;
  // Keep the label conservative: sparse folds remain insufficient, and a
  // small calibration error is only descriptive evidence on the held-out
  // sample rather than a claim of live probability calibration.
  // Keep the point estimates above for inspection, but gate the categorical
  // label on bin support. A singleton confidence bin can have a perfectly
  // calibrated-looking point estimate by chance; it must not be reported as
  // calibrated until enough held-out labels cover each populated bin.
  const enoughBinSupport = rows.length >= 12
    && populated.length >= 2
    && supported.length === populated.length
    && supportedSampleRate >= MIN_CALIBRATION_SAMPLE_RATE;
  const reliabilityStatus: ProbabilityReliabilitySummary["status"] = !enoughBinSupport
    ? "INSUFFICIENT"
    : (expectedCalibrationError ?? 1) <= 0.05 ? "CALIBRATED" : "WATCH";
  return {
    horizon: 1,
    evaluated: rows.length,
    brierScore: round(brier / rows.length, 4),
    logLoss: round(logLoss / rows.length, 4),
    calibrationBins,
    reliability: {
      expectedCalibrationError: expectedCalibrationError == null ? null : round(expectedCalibrationError, 4),
      maxCalibrationError: maxCalibrationError == null ? null : round(maxCalibrationError, 4),
      populatedBins: populated.length,
      supportedBins: supported.length,
      supportedSampleRate: round(supportedSampleRate, 4),
      minimumBinCount: MIN_CALIBRATION_BIN_COUNT,
      topClassAccuracy: topClassAccuracy == null ? null : round(topClassAccuracy, 4),
      effectiveN: round(topClassEffectiveN, 3),
      topClassAccuracyInterval95: topClassAccuracy == null ? null : wilsonInterval(topClassAccuracy, topClassEffectiveN),
      majorityClassBaseline: majorityClassBaseline == null ? null : round(majorityClassBaseline, 4),
      topClassLiftVsBaseline: topClassAccuracy == null || majorityClassBaseline == null ? null : round(topClassAccuracy - majorityClassBaseline, 4),
      status: reliabilityStatus,
      note: reliabilityStatus === "INSUFFICIENT"
        ? `Need at least 12 chronological labels with at least ${MIN_CALIBRATION_BIN_COUNT} labels in each populated confidence bin and ${Math.round(MIN_CALIBRATION_SAMPLE_RATE * 100)}% coverage before classifying reliability.`
        : reliabilityStatus === "CALIBRATED"
          ? "Held-out top-class confidence is close to observed accuracy; this remains descriptive evidence, not a trading guarantee."
          : "Held-out top-class confidence differs from observed accuracy; treat probability output as exploratory until more data accumulates.",
    },
    drift: probabilityCalibrationDrift(rows, lookback),
    note: "H+1 probabilities are scored chronologically; each query fits only analogue endpoints available before its query window.",
  };
}

type WalkForwardValidationRow = { queryEnd: number; predicted: OutcomeDirection; actual: OutcomeDirection };

function meanAndStdDev(values: number[]): { mean: number; stdDev: number } {
  if (!values.length) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(Math.max(0, variance)) };
}

/**
 * Summarise chronological validation folds without changing the analogue
 * search. Every row has already been generated causally by walkForward; this
 * helper only partitions those held-out queries to expose dispersion over
 * time instead of hiding it in one aggregate hit rate.
 */
function walkForwardStability(rows: WalkForwardValidationRow[]): WalkForwardStabilityReport {
  const foldCount = 3;
  const foldRows = Array.from({ length: foldCount }, () => [] as WalkForwardValidationRow[]);
  rows.forEach((row, index) => {
    // Keep fold boundaries chronological and as even as possible.
    const fold = rows.length ? Math.min(foldCount - 1, Math.floor(index * foldCount / rows.length)) : 0;
    foldRows[fold].push(row);
  });
  const folds = foldRows.map((items, index) => {
    const evaluated = items.length;
    if (!evaluated) return { fold: index + 1, evaluated: 0, firstQueryIndex: null, lastQueryIndex: null, hitRate: null, baseline: null, lift: null };
    const hits = items.filter((row) => row.predicted === row.actual).length;
    const up = items.filter((row) => row.actual === "UP").length;
    const down = items.filter((row) => row.actual === "DOWN").length;
    const flat = evaluated - up - down;
    const baseline = Math.max(up, down, flat) / evaluated;
    const hitRate = hits / evaluated;
    return {
      fold: index + 1,
      evaluated,
      firstQueryIndex: items[0].queryEnd,
      lastQueryIndex: items[items.length - 1].queryEnd,
      hitRate: round(hitRate, 3),
      baseline: round(baseline, 3),
      lift: round(hitRate - baseline, 3),
    };
  });
  const hitRates = folds.flatMap((fold) => fold.hitRate == null ? [] : [fold.hitRate]);
  const lifts = folds.flatMap((fold) => fold.lift == null ? [] : [fold.lift]);
  const hitRateStats = meanAndStdDev(hitRates);
  const liftStats = meanAndStdDev(lifts);
  const liftRange = lifts.length ? Math.max(...lifts) - Math.min(...lifts) : null;
  const positiveLiftFolds = folds.filter((fold) => fold.lift != null && fold.lift > 0).length;
  const enoughSupport = rows.length >= 12 && folds.every((fold) => fold.evaluated >= 4);
  let label: WalkForwardStabilityReport["label"] = "INSUFFICIENT";
  if (enoughSupport) {
    // A stable signal should retain positive lift in every fold and avoid a
    // large chronological swing. Mixed means directionally useful but not
    // repeatable; unstable means the fold evidence is mostly negative.
    if (positiveLiftFolds === foldCount && (liftRange ?? 1) <= 0.1) label = "STABLE";
    else if (positiveLiftFolds >= 2) label = "MIXED";
    else label = "UNSTABLE";
  }
  return {
    folds,
    evaluated: rows.length,
    positiveLiftFolds,
    hitRateStdDev: hitRates.length ? round(hitRateStats.stdDev, 3) : null,
    liftStdDev: lifts.length ? round(liftStats.stdDev, 3) : null,
    liftRange: liftRange == null ? null : round(liftRange, 3),
    label,
    note: label === "INSUFFICIENT"
      ? "Need at least 12 chronological queries (four per fold) before classifying out-of-sample stability."
      : "Three chronological held-out folds expose whether aggregate lift persists across time; this is descriptive evidence, not a trading guarantee.",
  };
}

function walkForward(bars: PatternBar[], lookback: number, vectors: number[][], maxQueries = 80, intervalMs?: number): WalkForwardReport {
  const first = lookback + 25;
  const last = bars.length - 2;
  if (last <= first) return {
    evaluated: 0, sampleN: 0, hitRate: null, baseline: null, lift: null,
    tieAbstentions: 0,
    effectiveN: 0, hitRateInterval95: null,
    note: "Need more closed bars for a chronological validation.",
    stability: walkForwardStability([]),
    probabilistic: emptyProbabilisticValidation("Need more closed bars for causal probabilistic validation."),
  };
  // Walk-forward evaluates up to 80 chronological queries and scans the
  // entire prior tape for each one.  Session parsing is pure, so cache those
  // labels once per run instead of reparsing the same ISO timestamp millions
  // of times on multi-year tapes.  Regime labels are cached through regimeAt;
  // materializing them here also avoids repeated map lookups in the inner
  // candidate loop while preserving the exact causal boundary.
  const sessions = bars.map((bar) => patternSessionAt(bar.t));
  const regimes = bars.map((_, index) => regimeAt(bars, index).label);
  const stride = Math.max(1, Math.floor((last - first) / maxQueries));
  let evaluated = 0;
  let hits = 0;
  let up = 0;
  let down = 0;
  let tieAbstentions = 0;
  const probabilisticRows: ProbabilisticValidationRow[] = [];
  const validationRows: WalkForwardValidationRow[] = [];
  for (let queryEnd = first; queryEnd <= last; queryEnd += stride) {
    const queryStart = queryEnd - lookback + 1;
    const query = vectors[queryEnd];
    const queryRegime = regimes[queryEnd];
    const querySession = sessions[queryEnd];
    const candidates: CausalCandidate[] = [];
    // Purge the entire analogue outcome horizon from the query window. A
    // candidate's H+2/H+3 labels must not reuse bars that are already part of
    // the query feature window, otherwise the analogue outcome is correlated
    // with the very tape being scored.
    for (let end = lookback - 1; end + MAX_OUTCOME_HORIZON < queryStart; end++) {
      if (end + 1 >= bars.length) continue;
      if (!contiguousRange(bars, end - lookback + 1, end + MAX_OUTCOME_HORIZON, intervalMs)) continue;
      // Score validation candidates with the same causal regime/session
      // context used by the production analogue search.  The context is
      // computed from bars available at this historical query boundary.
      const sameRegime = regimes[end] === queryRegime;
      const sameSession = sessions[end] === querySession;
      const d = distance(query, vectors[end]) + (sameRegime ? 0 : 0.12) + (sameSession ? 0 : 0.08);
      candidates.push({ d, end, sameRegime, sameSession });
    }
    candidates.sort((a, b) => a.d - b.d);
    // Production ranks first, retains MAX_MATCHES, then applies the session
    // fallback.  Mirror that order here so calibration scores the same causal
    // posterior instead of an uncapped, session-selected tape.
    const ranked = candidates.slice(0, MAX_MATCHES);
    const nearest = causalContextEligible(ranked, lookback);
    if (!nearest.length) continue;
    // Use the same causal posterior geometry as production predictions and
    // adaptive lookback selection: squared-exponential similarity, regime and
    // session context multipliers, plus the uniform categorical prior. This
    // keeps calibration metrics aligned with the distribution callers see.
    const probabilities = causalH1Probability(bars, nearest);
    // Score the held-out categorical label from the same smoothed posterior
    // exposed above. This keeps hit-rate/stability diagnostics aligned with
    // probabilistic calibration and the production prediction, rather than
    // evaluating a separate inverse-distance vote model.
    const predicted = topCausalDirection(probabilities);
    if (predicted === "FLAT" && Math.max(probabilities.up, probabilities.down, probabilities.flat) - Math.min(...[probabilities.up, probabilities.down, probabilities.flat].sort((a, b) => b - a).slice(0, 2)) < MIN_DIRECTION_MARGIN) tieAbstentions++;
    const actual = direction((bars[queryEnd + 1].c - bars[queryEnd].c) / atrAt(bars, queryEnd));
    evaluated++;
    if (actual === "UP") up++;
    if (actual === "DOWN") down++;
    if (predicted === actual) hits++;
    probabilisticRows.push({ queryEnd, probabilities, actual });
    validationRows.push({ queryEnd, predicted, actual });
  }
  const baseline = evaluated ? Math.max(up, down, evaluated - up - down) / evaluated : null;
  const hitRate = evaluated ? hits / evaluated : null;
  const correctness = validationRows.map((row) => row.predicted === row.actual ? 1 : 0);
  const effectiveN = effectiveSampleSize(correctness, validationRows.map((row) => row.queryEnd), lookback, 1);
  return {
    // `sampleN` describes held-out query support, not the per-query analogue
    // cap. Keep it equal to the number of labels actually scored so callers
    // do not mistake a capped nearest-set size for validation sample size.
    evaluated, sampleN: evaluated, hitRate: hitRate == null ? null : round(hitRate, 3),
    tieAbstentions,
    effectiveN: round(effectiveN, 3),
    hitRateInterval95: hitRate == null ? null : wilsonInterval(hitRate, effectiveN),
    baseline: baseline == null ? null : round(baseline, 3), lift: hitRate == null || baseline == null ? null : round(hitRate - baseline, 3),
    note: "Walk-forward uses only matches available before each query, with causal regime/session context and ATR-thresholded outcome labels; it is a diagnostic, not a trading guarantee.",
    stability: walkForwardStability(validationRows),
    probabilistic: probabilisticValidation(probabilisticRows, lookback),
  };
}

/**
 * Pick the context length from a short chronological validation slice. Every
 * candidate only searches windows that ended before the validation query, so
 * adaptation cannot peek at the current bar or its future outcome.
 */
function evaluateLookback(bars: PatternBar[], lookback: number, targetRegime: MarketRegime, maxQueries = 24, intervalMs?: number): { lookback: number; hitRate: number | null; baseline: number | null; lift: number | null; evaluated: number; regimeQueries: number; sameRegimeCandidates: number; fallback: boolean } {
  if (bars.length < lookback + 30) return { lookback, hitRate: null, baseline: null, lift: null, evaluated: 0, regimeQueries: 0, sameRegimeCandidates: 0, fallback: true };
  const vectors = bars.map((_, index) => index >= lookback - 1 ? windowVector(bars, index, lookback) : []);
  const first = lookback + 12;
  const last = bars.length - 2;
  const stride = Math.max(1, Math.floor((last - first) / maxQueries));
  const allQueries: number[] = [];
  for (let queryEnd = first; queryEnd <= last; queryEnd += stride) allQueries.push(queryEnd);
  const regimeQueries = allQueries.filter((queryEnd) => regimeAt(bars, queryEnd).label === targetRegime);
  const useRegime = regimeQueries.length >= 12;
  const queries = useRegime ? regimeQueries : allQueries;
  let evaluated = 0, hits = 0, up = 0, down = 0;
  let sameRegimeCandidates = 0;
  for (const queryEnd of queries) {
    const queryStart = queryEnd - lookback + 1;
    if (!contiguousRange(bars, queryStart, queryEnd + 1, intervalMs)) continue;
    const queryRegime = regimeAt(bars, queryEnd).label;
    const querySession = patternSessionAt(bars[queryEnd].t);
    const allCandidates: CausalCandidate[] = [];
    // Use the same purged boundary as production matching so adaptive
    // lookback selection cannot benefit from overlap that live predictions
    // would later reject.
    for (let end = lookback - 1; end + MAX_OUTCOME_HORIZON < queryStart; end++) {
      if (!contiguousRange(bars, end - lookback + 1, end + MAX_OUTCOME_HORIZON, intervalMs)) continue;
      const candidateRegime = regimeAt(bars, end).label;
      const sameRegime = queryRegime === candidateRegime;
      const targetRegimeMatch = candidateRegime === targetRegime;
      const sameSession = querySession === patternSessionAt(bars[end].t);
      const d = distance(vectors[queryEnd], vectors[end]) + (sameRegime ? 0 : 0.12) + (sameSession ? 0 : 0.08);
      allCandidates.push({ d, end, sameRegime, targetRegime: targetRegimeMatch, sameSession });
    }
    const same = allCandidates.filter((candidate) => candidate.targetRegime);
    sameRegimeCandidates += same.length;
    const candidates = useRegime && same.length >= 8 ? same : allCandidates;
    candidates.sort((a, b) => a.d - b.d);
    // Adaptive tuning must score the same hierarchical context posterior as
    // production.  Ranking alone can leave a sparse current session mixed
    // with unrelated sessions, so use the same session/regime backoff after
    // the rank cap.  Every candidate is still purged before the query window
    // and the selector only inspects context available at this boundary.
    const ranked = candidates.slice(0, MAX_MATCHES);
    const nearest = causalContextEligible(ranked, lookback);
    if (!nearest.length) continue;
    // Select the same smoothed categorical posterior as production. This
    // keeps adaptive context-length tuning aligned with the live research
    // distribution and preserves deterministic UP/DOWN/FLAT tie ordering.
    const predicted = topCausalDirection(causalH1Probability(bars, nearest));
    const actual = direction((bars[queryEnd + 1].c - bars[queryEnd].c) / atrAt(bars, queryEnd));
    evaluated++;
    if (actual === "UP") up++;
    if (actual === "DOWN") down++;
    if (predicted === actual) hits++;
  }
  if (!evaluated) return { lookback, hitRate: null, baseline: null, lift: null, evaluated: 0, regimeQueries: regimeQueries.length, sameRegimeCandidates, fallback: !useRegime };
  const baseline = Math.max(up, down, evaluated - up - down) / evaluated;
  const hitRate = hits / evaluated;
  return { lookback, hitRate: round(hitRate, 3), baseline: round(baseline, 3), lift: round(hitRate - baseline, 3), evaluated, regimeQueries: regimeQueries.length, sameRegimeCandidates, fallback: !useRegime };
}

function chooseLookback(bars: PatternBar[], intervalMs?: number): { selectedLookback: number; regime: MarketRegime; fallback: boolean; candidates: ReturnType<typeof evaluateLookback>[]; reason: string } {
  // Adaptation is about the current regime; bound the tuning tape so each live
  // loop remains responsive even when a full multi-year replay is loaded.
  const sample = bars.length > 2500 ? bars.slice(-2500) : bars;
  const targetRegime = regimeAt(sample, sample.length - 1).label;
  const candidates = [3, 4, 5, 6, 7].map((lookback) => evaluateLookback(sample, lookback, targetRegime, 24, intervalMs));
  const valid = candidates.filter((item) => item.lift != null && item.evaluated >= 12);
  if (!valid.length) return { selectedLookback: DEFAULT_LOOKBACK, regime: targetRegime, fallback: true, candidates, reason: "Insufficient same-regime validation evidence; using the stable default rather than adapting on a small sample." };
  valid.sort((a, b) => (b.lift! - a.lift!) || (b.hitRate! - a.hitRate!) || (Math.abs(a.lookback - DEFAULT_LOOKBACK) - Math.abs(b.lookback - DEFAULT_LOOKBACK)));
  const fallback = valid[0].fallback;
  return { selectedLookback: valid[0].lookback, regime: targetRegime, fallback, candidates, reason: fallback ? "Regime sample was too small, so selection used the full causal validation slice." : "Selected from same-regime causal walk-forward evidence; ties prefer the shorter, stable context." };
}

function unknownH1Context(reason: string): PatternH1Context {
  return { trend: "UNKNOWN", alignment: "UNAVAILABLE", trendAtr: 0, strength: 0, weight: 0, bars: 0, asOf: null, source: "H1_CLOSED_ONLY", causal: true, reason };
}

/**
 * Read a higher-timeframe trend only after its H1 candle has closed by the
 * lower query candle's close.  This deliberately does not resample lower bars
 * into H1: the broker H1 tape remains the sole context source.
 */
function deriveH1Context(
  rawH1: PatternBar[] | undefined,
  lowerBars: PatternBar[],
  timeframe: PatternTimeframe,
  nowMs: number,
  predictionDirection?: OutcomeDirection,
): PatternH1Context {
  if (!rawH1?.length) return unknownH1Context("No H1 context tape supplied; lower-timeframe evidence remains independent.");
  if (!lowerBars.length) return unknownH1Context("No lower-timeframe query bar is available to establish an H1 as-of boundary.");
  const prepared = prepareBars(rawH1, "H1", nowMs).bars;
  const lowerCloseMs = timestampMs(lowerBars[lowerBars.length - 1].t) + TIMEFRAME_MS[timeframe];
  // A context bar whose close is after the query close is future information,
  // even if that H1 row is already present in the fetched tape.
  const usable = prepared.filter((bar) => timestampMs(bar.t) + TIMEFRAME_MS.H1 <= lowerCloseMs);
  if (usable.length < 8) return { ...unknownH1Context(`Only ${usable.length} completed H1 bars are available at the lower query close; at least 8 are required.`), bars: usable.length, asOf: usable.length ? usable[usable.length - 1].t : null };
  const last = usable.length - 1;
  const anchor = Math.max(0, last - 12);
  const trendAtr = (usable[last].c - usable[anchor].c) / Math.max(atrAt(usable, last), 1e-9);
  const trend: H1Trend = trendAtr > 0.6 ? "UP" : trendAtr < -0.6 ? "DOWN" : "FLAT";
  const strength = round(clamp(Math.abs(trendAtr) / 2, 0, 1), 3);
  const alignment: H1Alignment = predictionDirection == null || predictionDirection === "FLAT" || trend === "FLAT"
    ? "NEUTRAL"
    : predictionDirection === trend ? "ALIGNED" : "CONTRADICTED";
  // Keep this as a modest context prior. It is exposed for measurement and
  // never promotes a SHADOW_ONLY/NO_DECISION result into execution authority.
  const weight = round(trend === "FLAT" ? 0 : 0.05 + 0.2 * strength, 3);
  return {
    trend, alignment, trendAtr: round(trendAtr, 3), strength, weight,
    bars: usable.length, asOf: usable[last].t, source: "H1_CLOSED_ONLY", causal: true,
    reason: alignment === "ALIGNED" ? "Completed H1 trend agrees with the lower-timeframe H+1 direction."
      : alignment === "CONTRADICTED" ? "Completed H1 trend contradicts the lower-timeframe H+1 direction; context is descriptive only."
        : "H1 trend is neutral or the lower prediction is flat.",
  };
}

export function analyzeCandlePattern(
  rawBars: PatternBar[],
  timeframe: PatternTimeframe,
  symbol = "XAUUSD",
  options: { lookback?: number; maxMatches?: number; adaptive?: boolean; now?: string | number | Date; h1Bars?: PatternBar[] } = {},
): PatternAnalysis {
  const requestedNow = options.now instanceof Date
    ? options.now.getTime()
    : typeof options.now === "number"
      ? options.now
      : options.now == null
        ? Date.now()
        : timestampMs(String(options.now));
  const prepared = prepareBars(rawBars, timeframe, Number.isFinite(requestedNow) ? requestedNow : Date.now());
  const bars = prepared.bars;
  const dataQuality = prepared.quality;
  const intervalMs = TIMEFRAME_MS[timeframe];
  const adaptive = options.lookback == null && options.adaptive !== false && bars.length >= MIN_HISTORY ? chooseLookback(bars, intervalMs) : undefined;
  const lookback = clamp(Math.round(options.lookback ?? adaptive?.selectedLookback ?? DEFAULT_LOOKBACK), 3, 12);
  const base: PatternAnalysis = {
    ok: false, reason: undefined, symbol, timeframe, asOf: bars.length ? bars[bars.length - 1].t : null, bars: bars.length, lookback,
    current: null, matches: [], predictions: [], consensus: { direction: "FLAT", strength: 0, agreement: 0 },
    walkForward: { evaluated: 0, sampleN: 0, hitRate: null, effectiveN: 0, hitRateInterval95: null, baseline: null, lift: null, note: "", stability: walkForwardStability([]), probabilistic: emptyProbabilisticValidation("Need more closed bars for causal probabilistic validation.") }, dataQuality,
    regime: { label: "TRANSITION", trendAtr: 0, volatilityRatio: 1, matchingSamples: 0 },
    novelty: {
      score: 1, label: "UNSEEN", nearestDistance: null, nearbyCandidates: 0, nearbyRate: 0,
      nearbyIndependentCandidates: 0, nearbyIndependentRate: 0,
      decomposition: decomposeNovelty([], lookback),
    },
    analogueCoverage: undefined,
    analogueConcentration: { samples: 0, totalWeight: 0, topShare: 0, hhi: 0, effectiveN: 0, independentSamples: 0, independentRate: 0, label: "INSUFFICIENT" },
    recurrence: { signature: "", appeared: false, exactMatches: 0, rate: 0, independentMatches: 0, independentRate: 0, sameRegimeMatches: 0, sameRegimeRate: 0, sameRegimeIndependentMatches: 0, sameRegimeIndependentRate: 0, lastSeen: null, medianGapBars: null, nearMatches: 0 },
    adaptive,
    cluster: undefined,
    drift: undefined,
    currentPatterns: [],
    patternCounts: [],
    namedPatternPredictions: [],
    patternCoverage: { registrySize: NAMED_PATTERN_REGISTRY.length, observedUnique: 0, observedRate: 0, current: [] },
    patternOverlap: patternOverlap([], []),
    patternEvidence: patternEvidenceSummary([], []),
    h1Context: deriveH1Context(options.h1Bars, bars, timeframe, Number.isFinite(requestedNow) ? requestedNow : Date.now()),
    engine: { id: "candle-analogue-atlas", version: "1.10.0", causal: true, thresholdAtr: OUTCOME_THRESHOLD_ATR },
  };
  if (bars.length < Math.max(MIN_HISTORY, lookback + 8)) { base.reason = `INSUFFICIENT_HISTORY_${Math.max(MIN_HISTORY, lookback + 8)}`; return base; }
  const queryEnd = bars.length - 1;
  const queryStart = queryEnd - lookback + 1;
  const queryRegime = regimeAt(bars, queryEnd);
  const descriptors = bars.map((_, index) => descriptor(bars, index));
  const patternLists = bars.map((_, index) => namedPatternsAt(bars, index));
  const querySignature = windowSignature(descriptors, queryEnd, lookback);
  const vectors = bars.map((_, index) => index >= lookback - 1 ? windowVector(bars, index, lookback) : []);
  const queryVector = vectors[queryEnd];
  
  // A missing bar changes both the feature window and the forward-label clock.
  // Fail closed for a query window that crosses a tape discontinuity.
  if (!contiguousRange(bars, queryStart, queryEnd, intervalMs)) {
    base.reason = "NON_CONTIGUOUS_QUERY_WINDOW";
    return base;
  }
  const querySession = patternSessionAt(bars[queryEnd].t);
  const matches: PatternMatch[] = [];
  const maxMatches = clamp(Math.round(options.maxMatches ?? MAX_MATCHES), 8, 100);
  // Keep every analogue's full H+1/H+2/H+3 outcome strictly before the
  // current query window. This prevents a higher-horizon label from sharing
  // bars with the query features while preserving the closed-bar contract.
  for (let end = lookback - 1; end + MAX_OUTCOME_HORIZON < queryStart; end++) {
    if (end + Math.max(...HORIZONS) >= bars.length) continue;
    if (!contiguousRange(bars, end - lookback + 1, end + MAX_OUTCOME_HORIZON, intervalMs)) continue;
    const historicalRegime = regimeAt(bars, end);
    const sameRegime = historicalRegime.label === queryRegime.label;
    const historicalSession = patternSessionAt(bars[end].t);
    const sameSession = historicalSession === querySession;
    // Session is a context prior only. The candidate is still required to
    // end before the query window and all outcomes remain fully observed.
    const d = distance(queryVector, vectors[end]) + (sameRegime ? 0 : 0.12) + (sameSession ? 0 : 0.08);
    const similarity = Math.exp(-d * 7);
    const atr = atrAt(bars, end);
    const outcome: OutcomeDirection[] = [];
    const forwardReturnsAtr: number[] = [];
    for (const horizon of HORIZONS) {
      const ret = (bars[end + horizon].c - bars[end].c) / atr;
      forwardReturnsAtr.push(round(ret, 3));
      outcome.push(direction(ret));
    }
    const contextWeight = round((sameRegime ? 1 : 0.65) * (sameSession ? 1 : 0.8), 3);
    matches.push({ endIndex: end, time: bars[end].t, distance: round(d, 4), similarity: round(similarity, 4), contextWeight, outcome, forwardReturnsAtr, sameRegime, session: historicalSession, sameSession, patterns: patternLists[end] });
  }
  matches.sort((a, b) => a.distance - b.distance);
  const best = matches.slice(0, maxMatches);
  const eligible = contextEligible(best, lookback);
  const predictions = HORIZONS.map((horizon) => prediction(eligible.selected, horizon, lookback));
  // H+1 is mandatory for the local and cross-timeframe summaries. Keep this
  // lookup explicit so a future horizon reorder cannot change the vote.
  const first = predictions.find((prediction) => prediction.horizon === CONSENSUS_HORIZON)!;
  const directionScores = { UP: first.up, DOWN: first.down, FLAT: first.flat };
  const sorted = Object.entries(directionScores).sort((a, b) => b[1] - a[1]);
  const consensusDirection = dominantDirection(first);
  base.ok = true;
  base.current = descriptor(bars, queryEnd);
  base.currentPatterns = patternLists[queryEnd];
  base.matches = best;
  // Keep independent support visible alongside raw retention.  These counts
  // use the same endpoint purge as uncertainty diagnostics and are descriptive
  // only; they never add a vote or relax the SHADOW_ONLY gate.
  const independentSpacing = lookback + MAX_OUTCOME_HORIZON;
  const independentCandidates = independentEndpointCount(matches, independentSpacing);
  // Keep rank-aware support visible separately from full-tape support.  The
  // posterior only retains `best`, so a broad independent count can otherwise
  // imply evidence that was never available to the reported prediction.
  const independentRankedCandidates = independentEndpointCount(best, independentSpacing);
  const independentSelectedSamples = independentEndpointCount(eligible.selected, independentSpacing);
  base.analogueCoverage = {
    causalCandidates: matches.length,
    rankedCandidates: best.length,
    selectedSamples: eligible.selected.length,
    independentCandidates,
    independentRate: round(independentCandidates / Math.max(1, matches.length), 4),
    independentRankedCandidates,
    independentRankedRate: round(independentRankedCandidates / Math.max(1, best.length), 4),
    independentSelectedSamples,
    independentSelectedRate: round(independentSelectedSamples / Math.max(1, matches.length), 4),
    selectedRate: round(eligible.selected.length / Math.max(1, matches.length), 4),
    retainedRate: round(best.length / Math.max(1, matches.length), 4),
    maxMatches,
    sessionFallback: eligible.fallback,
    contextMode: eligible.mode,
  };
  // This diagnostic uses exactly the context-selected rows that feed the
  // production posterior. It remains descriptive/shadow-only and cannot
  // alter the consensus direction, strength or evidence gate.
  base.analogueConcentration = analogueConcentration(eligible.selected, lookback);
  base.predictions = predictions;
  base.h1Context = deriveH1Context(options.h1Bars, bars, timeframe, Number.isFinite(requestedNow) ? requestedNow : Date.now(), consensusDirection);
  // Calibrate the ranked tape actually exposed to callers. Using the full
  // candidate set here diluted the nearest-analogue posterior with distant
  // rows and made the session buckets disagree with the reported forecast.
  base.sessionCalibration = sessionCalibration(best, querySession, eligible.selected, eligible.fallback, eligible.sameSessionEffectiveN, eligible.sameRegimeEffectiveN, eligible.mode, lookback);
  const localMargin = Math.max(0, sorted[0][1] - sorted[1][1]);
  // A tie-abstained direction must not retain a non-zero directional
  // strength; otherwise the UI can imply conviction while reporting FLAT.
  base.consensus = { direction: consensusDirection, strength: consensusDirection === "FLAT" ? 0 : round(localMargin, 3), agreement: round(sorted[0][1], 3) };
  base.walkForward = walkForward(bars, lookback, vectors, 80, intervalMs);
  const matchingSamples = matches.filter((match) => match.sameRegime).length;
  // Calibrate the distribution actually exposed to callers. `best` contains
  // only the nearest causal endpoints, while the broader `matches` tape is
  // retained for recurrence and inventory diagnostics.
  base.regimeCalibration = regimeCalibration(best, queryRegime.label, lookback);
  const nearestDistance = best.length ? best[0].distance : null;
  base.regime = { ...queryRegime, matchingSamples };
  // A nearest analogue alone can hide fragile support: one close row and a
  // dense neighbourhood both produce the same novelty label. Count the
  // fully purged candidates inside the KNOWN band so callers can distinguish
  // an isolated match from a repeatable local neighbourhood. This diagnostic
  // never changes the posterior or consensus gate.
  const nearby = matches.filter((match) => match.distance <= 0.35);
  const nearbyCandidates = nearby.length;
  // Raw nearby rows describe analogue density, while the independent count
  // keeps overlapping windows from masquerading as repeated support.
  const nearbyIndependentCandidates = independentEndpointCount(nearby, lookback + MAX_OUTCOME_HORIZON);
  const nearbyRate = round(nearbyCandidates / Math.max(1, matches.length), 4);
  const nearbyIndependentRate = round(nearbyIndependentCandidates / Math.max(1, matches.length), 4);
  const noveltyDecomposition = decomposeNovelty(matches, lookback);
  base.novelty = {
    nearestDistance,
    score: nearestDistance == null ? 1 : round(clamp(nearestDistance / 0.7, 0, 1), 3),
    label: nearestDistance == null || nearestDistance > 0.7 ? "UNSEEN" : nearestDistance > 0.35 ? "EMERGING" : "KNOWN",
    nearbyCandidates,
    nearbyRate,
    nearbyIndependentCandidates,
    nearbyIndependentRate,
    decomposition: noveltyDecomposition,
  };
  const exact = [] as number[];
  const sameRegimeExact = [] as number[];
  const recurrenceEligibleIndices: number[] = [];
  let recurrenceEligibleEndpoints = 0;
  // Recurrence is descriptive, but it must use the same purged endpoint
  // boundary as analogue matching. Otherwise a repeated window can include
  // bars from the current query (or an outcome horizon that overlaps it),
  // inflating recurrence support with look-ahead rows.
  for (let end = lookback - 1; end + MAX_OUTCOME_HORIZON < queryStart; end++) {
    // A gap invalidates both the feature window and the forward outcome
    // clock. Count only contiguous endpoints in the denominator so a sparse
    // tape cannot dilute recurrence or imply support that was never observed.
    if (!contiguousRange(bars, end - lookback + 1, end + MAX_OUTCOME_HORIZON, intervalMs)) continue;
    recurrenceEligibleEndpoints++;
    recurrenceEligibleIndices.push(end);
    if (windowSignature(descriptors, end, lookback) === querySignature) {
      exact.push(end);
      // Regime is computed from bars ending at the historical endpoint only.
      // This keeps conditional recurrence causal while making repeated
      // geometry in a different trend/volatility state visible.
      if (regimeAt(bars, end).label === queryRegime.label) sameRegimeExact.push(end);
    }
  }
  const gaps = exact.slice(1).map((value, index) => value - exact[index]).sort((a, b) => a - b);
  // Adjacent exact windows share both their feature bars and (for the
  // recurrence record) the fully observed outcome horizon. Keep the raw
  // count visible, but expose a non-overlapping count so recurrence breadth
  // cannot be mistaken for independent historical repetitions. The spacing
  // must match the analogue/uncertainty purge above; using lookback alone
  // would allow two exact windows whose H+1..H+3 labels overlap.
  const recurrenceIndependentSpacing = lookback + MAX_OUTCOME_HORIZON;
  let independentMatches = 0;
  let lastIndependent = Number.NEGATIVE_INFINITY;
  for (const end of exact) {
    if (end - lastIndependent < recurrenceIndependentSpacing) continue;
    independentMatches++;
    lastIndependent = end;
  }
  let sameRegimeIndependentMatches = 0;
  let lastSameRegimeIndependent = Number.NEGATIVE_INFINITY;
  for (const end of sameRegimeExact) {
    if (end - lastSameRegimeIndependent < recurrenceIndependentSpacing) continue;
    sameRegimeIndependentMatches++;
    lastSameRegimeIndependent = end;
  }
  const independentOpportunities = chronologicalIndependentCount(recurrenceEligibleIndices, recurrenceIndependentSpacing);
  const calibratedIndependentRate = independentMatches / Math.max(1, independentOpportunities);
  // The arithmetic upper bound remains useful as a chronology audit marker;
  // contiguous endpoint support can only reduce it on tapes with gaps.
  const arithmeticEndpointCapacity = Math.max(0, queryStart - lookback - (MAX_OUTCOME_HORIZON - 1));
  const recurrenceEndpointUpperBound = Math.max(1, arithmeticEndpointCapacity);
  const recurrenceDenominator = Math.max(1, Math.min(recurrenceEndpointUpperBound, recurrenceEligibleEndpoints));
  // Surface the amount of historical tape that was actually usable after
  // timestamp-gap filtering.  The recurrence rate already uses contiguous
  // support, but exposing this coverage prevents a sparse tape from looking
  // equivalent to a fully observed one with the same denominator.
  const recurrenceGapExcludedEndpoints = Math.max(0, arithmeticEndpointCapacity - recurrenceEligibleEndpoints);
  const recurrenceSupportCoverage = arithmeticEndpointCapacity > 0
    ? recurrenceEligibleEndpoints / arithmeticEndpointCapacity
    : 0;
  // Recency is a descriptive calibration readout only.  Weight historical
  // recurrence opportunities by endpoint age, using a half-life tied to the
  // feature window.  The endpoint boundary is identical to analogue matching
  // above, so no current/future bars can influence this metric.
  const recurrenceHalfLifeBars = Math.max(20, lookback * 8);
  const latestEligibleEndpoint = queryStart - MAX_OUTCOME_HORIZON - 1;
  let recurrenceWeightTotal = 0;
  let recurrenceWeightExact = 0;
  let recurrenceWeightSameRegime = 0;
  const exactSet = new Set(exact);
  const sameRegimeExactSet = new Set(sameRegimeExact);
  for (let end = lookback - 1; end <= latestEligibleEndpoint; end++) {
    // Keep recency calibration on the exact same contiguous endpoint set as
    // recurrence counts. This prevents missing bars from becoming weighted
    // non-matches while preserving the no-lookahead boundary.
    if (!contiguousRange(bars, end - lookback + 1, end + MAX_OUTCOME_HORIZON, intervalMs)) continue;
    const age = Math.max(0, latestEligibleEndpoint - end);
    const weight = Math.exp(-Math.LN2 * age / recurrenceHalfLifeBars);
    recurrenceWeightTotal += weight;
    if (exactSet.has(end)) recurrenceWeightExact += weight;
    if (sameRegimeExactSet.has(end)) recurrenceWeightSameRegime += weight;
  }
  const recencyWeightedRate = recurrenceWeightTotal > 0 ? recurrenceWeightExact / recurrenceWeightTotal : 0;
  const sameRegimeRecencyWeightedRate = recurrenceWeightTotal > 0 ? recurrenceWeightSameRegime / recurrenceWeightTotal : 0;
  base.recurrence = {
    signature: querySignature,
    appeared: exact.length > 0,
    exactMatches: exact.length,
    // Keep the exact cardinality of the same purged endpoint loop used above
    // as the denominator; this excludes query-overlapping and outcome-horizon
    // rows instead of overstating recurrence support.
    rate: round(exact.length / recurrenceDenominator, 4),
    independentMatches,
    independentRate: round(independentMatches / recurrenceDenominator, 4),
    sameRegimeMatches: sameRegimeExact.length,
    sameRegimeRate: round(sameRegimeExact.length / recurrenceDenominator, 4),
    sameRegimeIndependentMatches,
    sameRegimeIndependentRate: round(sameRegimeIndependentMatches / recurrenceDenominator, 4),
    lastSeen: exact.length ? bars[exact[exact.length - 1]].t : null,
    medianGapBars: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
    nearMatches: best.length,
    recencyWeightedRate: round(recencyWeightedRate, 4),
    sameRegimeRecencyWeightedRate: round(sameRegimeRecencyWeightedRate, 4),
    recencyHalfLifeBars: recurrenceHalfLifeBars,
    eligibleEndpoints: recurrenceEligibleEndpoints,
    potentialEndpoints: arithmeticEndpointCapacity,
    gapExcludedEndpoints: recurrenceGapExcludedEndpoints,
    supportCoverage: round(recurrenceSupportCoverage, 4),
    calibration: {
      method: "WILSON_95_INDEPENDENT_ENDPOINTS",
      effectiveN: independentOpportunities,
      independentOpportunities,
      independentRate: round(calibratedIndependentRate, 4),
      interval95: wilsonInterval(calibratedIndependentRate, independentOpportunities),
    },
  };
  const patternCounts = new Map<NamedCandlePattern, number>();
  for (const match of matches) for (const pattern of match.patterns ?? []) patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
  base.patternCounts = [...patternCounts.entries()].sort((a, b) => b[1] - a[1]).map(([pattern, count]) => ({ pattern, count, rate: round(count / Math.max(1, matches.length), 4) }));
  const observedUnique = [...patternCounts.keys()].filter((pattern) => NAMED_PATTERN_REGISTRY.includes(pattern)).length;
  base.patternCoverage = {
    registrySize: NAMED_PATTERN_REGISTRY.length,
    observedUnique,
    observedRate: round(observedUnique / NAMED_PATTERN_REGISTRY.length, 4),
    // Use every causal analogue endpoint rather than the session-filtered
    // prediction subset: rarity should describe inventory support and remain
    // comparable when the session fallback changes.
    current: [...new Set(patternLists[queryEnd])].map((pattern) => {
      const sampleN = patternCounts.get(pattern) ?? 0;
      return { pattern, sampleN, rate: round(sampleN / Math.max(1, matches.length), 4), rarity: classifyPatternRarity(sampleN, matches.length) };
    }),
  };
  base.patternOverlap = patternOverlap(matches, patternLists[queryEnd]);
  // Condition the causal aggregate on each named pattern detected on the
  // current closed bar. Keep the current-pattern order stable so UI callers
  // can render the detector output without additional sorting.
  const currentNamedPatterns = [...new Set(patternLists[queryEnd])];
  base.patternEvidence = patternEvidenceSummary(eligible.selected, currentNamedPatterns, lookback);
  base.namedPatternPredictions = currentNamedPatterns.map((pattern) => {
    const patternMatches = eligible.selected.filter((match) => (match.patterns ?? []).includes(pattern));
    const patternPredictions = HORIZONS.map((horizon, index) => namedPatternPrediction(eligible.selected, horizon, pattern, predictions[index], lookback));
    const h1Support = patternPredictions[0]?.effectiveN ?? 0;
    const support: NamedPatternPrediction["support"] = patternMatches.length === 0
      ? "UNSEEN"
      : patternMatches.length < 3 || h1Support < MIN_CONTEXT_EFFECTIVE_SUPPORT
        ? "SPARSE"
        : "SUPPORTED";
    return {
      pattern,
      sampleN: patternMatches.length,
      rate: round(patternMatches.length / Math.max(1, eligible.selected.length), 4),
      support,
      predictions: patternPredictions,
    };
  });
  const currentFamily = base.current.family ?? "DOJI_BALANCE";
  const familyCounts = new Map<PatternFamily, number>();
  for (const match of matches) {
    const family = descriptors[match.endIndex].family ?? "DOJI_BALANCE";
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
  }
  const families = [...familyCounts.entries()].sort((a, b) => b[1] - a[1]).map(([family, count]) => ({ family, count, rate: round(count / Math.max(1, matches.length), 4) }));
  const familySupport = familyCounts.get(currentFamily) ?? 0;
  const sameRegimeFamilySupport = matches.filter((match) => match.sameRegime && (descriptors[match.endIndex].family ?? "DOJI_BALANCE") === currentFamily).length;
  const split = (lookback - 1) + Math.floor((queryStart - (lookback - 1)) * 0.6);
  const historicalMedianDistance = median(matches.filter((match) => match.endIndex < split).map((match) => match.distance));
  const recentMedianDistance = median(matches.filter((match) => match.endIndex >= split).map((match) => match.distance));
  const driftScore = historicalMedianDistance == null || recentMedianDistance == null
    ? 1
    : clamp((recentMedianDistance - historicalMedianDistance) / Math.max(historicalMedianDistance, 0.05), -1, 1);
  const lowSupport = familySupport < Math.max(5, Math.floor(matches.length * 0.02));
  const driftLabel: "STABLE" | "WATCH" | "BREAK" = lowSupport || driftScore >= 0.35 ? "BREAK" : driftScore >= 0.15 ? "WATCH" : "STABLE";
  base.cluster = { currentFamily, supportSamples: familySupport, supportRate: round(familySupport / Math.max(1, matches.length), 4), sameRegimeSupport: sameRegimeFamilySupport, families };
  base.drift = {
    score: round(driftScore, 3), label: driftLabel, recentMedianDistance: recentMedianDistance == null ? null : round(recentMedianDistance, 4), historicalMedianDistance: historicalMedianDistance == null ? null : round(historicalMedianDistance, 4), supportSamples: familySupport,
    note: driftLabel === "BREAK" ? "Current family has weak or widening historical support; treat the analogue distribution as exploratory." : driftLabel === "WATCH" ? "Recent analogue distances are widening; monitor the next closed-bar loop for regime drift." : "Recent analogue distances remain supported by the earlier tape.",
  };
  return base;
}

export interface MultiTimeframeAtlas {
  symbol: string;
  asOf: string | null;
  generatedAt: string;
  /** Shared H1 source summary; lower analyses carry their own as-of alignment. */
  h1Context: { trend: H1Trend; trendAtr: number; strength: number; bars: number; asOf: string | null; source: "H1_CLOSED_ONLY"; causal: true; reason: string };
  timeframes: Record<PatternTimeframe, PatternAnalysis>;
  consensus: {
    /** Horizon used by every cross-timeframe vote; currently fixed at H+1. */
    horizon: number;
    direction: OutcomeDirection;
    strength: number;
    /** Weighted distributional disagreement between contributing timeframes. */
    conflict: number;
    contributing: PatternTimeframe[];
    note: string;
    /** Per-timeframe gate outcome and weight, suitable for an explainable UI. */
    contributions: PatternContribution[];
    gate: PatternEvidenceGate;
    /** Explicit research authority boundary carried with every consensus. */
    authority?: "SHADOW_ONLY";
    decision?: "NO_DECISION";
  };
}

export interface PatternContribution {
  timeframe: PatternTimeframe;
  /** Horizon used by this contribution; consensus is explicitly H+1. */
  horizon: number;
  direction: OutcomeDirection;
  gate: PatternEvidenceGate;
  reason: string;
  weight: number;
  quality: number;
  reliability: number | null;
  freshness: PatternFreshnessStatus;
  ageMs: number | null;
  sampleN: number;
  effectiveN: number;
  uncertaintyWeight: number;
  /** Bounded posterior-sharpness multiplier; near-uniform forecasts retain half weight. */
  sharpnessWeight: number;
}

function requestedTimeMs(value: string | number | Date | undefined): number | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = timestampMs(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function evidenceQuality(a: PatternAnalysis): number {
  // Persisted snapshots are an external trust boundary.  Do not let a
  // missing/NaN count turn the quality calculation into NaN: comparisons
  // against NaN are false, which would otherwise allow a malformed
  // timeframe to pass the quality gate and produce a NaN vote weight.
  const count = (value: unknown): number | null => Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
  const bars = count(a?.bars);
  const qualityCounts = [
    count(a?.dataQuality?.gaps),
    count(a?.dataQuality?.duplicateTimestamps),
    count(a?.dataQuality?.outOfOrderBars),
    count(a?.dataQuality?.invalidTimestamps),
    count(a?.dataQuality?.invalidBars),
  ];
  // An empty tape cannot carry evidence, even if a forged snapshot supplies
  // plausible-looking prediction metadata alongside it.
  if (bars == null || bars <= 0 || qualityCounts.some((value) => value == null)) return 0;
  const denominator = Math.max(1, bars);
  const defects = qualityCounts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  // Forming rows are intentionally excluded and are therefore not a quality
  // defect once a valid closed bar remains available.
  return round(clamp(1 - defects / denominator, 0, 1), 3);
}

/**
 * Validate the serialized novelty triple as one causal support claim.  The
 * producer derives score and label from nearestDistance; accepting each field
 * independently would let a replayed snapshot pair a close distance with an
 * UNSEEN label (or an unseen distance with a KNOWN label) and bypass the
 * XAUUSD novelty abstention gate.
 */
function noveltyMetadataValid(value: unknown, coverage?: unknown): value is {
  score: number;
  label: "KNOWN" | "EMERGING" | "UNSEEN";
  nearestDistance: number | null;
  nearbyCandidates?: number;
  nearbyRate?: number;
  nearbyIndependentCandidates?: number;
  nearbyIndependentRate?: number;
} {
  if (!record(value)) return false;
  const label = value.label;
  const score = typeof value.score === "number" ? value.score : NaN;
  const nearestDistance = value.nearestDistance == null
    ? null
    : typeof value.nearestDistance === "number" ? value.nearestDistance : NaN;
  if (!(label === "KNOWN" || label === "EMERGING" || label === "UNSEEN")) return false;
  if (!finite(score) || score < 0 || score > 1) return false;
  // Optional neighbourhood metadata is accepted for legacy snapshots, but
  // when present it must remain bounded and integral. Invalid diagnostics
  // fail closed rather than being silently treated as support.
  const nearbyCandidates = value.nearbyCandidates;
  const nearbyRate = value.nearbyRate;
  const nearbyIndependentCandidates = value.nearbyIndependentCandidates;
  const nearbyIndependentRate = value.nearbyIndependentRate;
  if (nearbyCandidates !== undefined
    && (typeof nearbyCandidates !== "number" || !Number.isInteger(nearbyCandidates) || nearbyCandidates < 0)) return false;
  if (nearbyRate !== undefined
    && (typeof nearbyRate !== "number" || !finite(nearbyRate) || nearbyRate < 0 || nearbyRate > 1)) return false;
  if (nearbyIndependentCandidates !== undefined
    && (typeof nearbyIndependentCandidates !== "number" || !Number.isInteger(nearbyIndependentCandidates) || nearbyIndependentCandidates < 0)) return false;
  if (nearbyIndependentRate !== undefined
    && (typeof nearbyIndependentRate !== "number" || !finite(nearbyIndependentRate) || nearbyIndependentRate < 0 || nearbyIndependentRate > 1)) return false;
  if (nearbyIndependentCandidates !== undefined && nearbyCandidates !== undefined
    && nearbyIndependentCandidates > nearbyCandidates) return false;
  // When the producer also persisted causal analogue coverage, the two
  // neighbourhood diagnostics are one claim and must agree with that
  // denominator.  Keep the fields optional for legacy snapshots, but reject
  // a forged count/rate pair (or a count larger than the causal tape) at the
  // consensus boundary.
  if (nearbyCandidates !== undefined && nearbyRate !== undefined && record(coverage)) {
    const causalCandidates = coverage.causalCandidates;
    if (typeof causalCandidates !== "number" || !Number.isInteger(causalCandidates) || causalCandidates < 0) return false;
    if (nearbyCandidates > causalCandidates) return false;
    const expectedRate = round(nearbyCandidates / Math.max(1, causalCandidates), 4);
    if (Math.abs(nearbyRate - expectedRate) > 0.0001) return false;
  }
  if (nearbyIndependentCandidates !== undefined && nearbyIndependentRate !== undefined && record(coverage)) {
    const causalCandidates = coverage.causalCandidates;
    if (typeof causalCandidates !== "number" || !Number.isInteger(causalCandidates) || causalCandidates < 0) return false;
    if (nearbyIndependentCandidates > causalCandidates) return false;
    const expectedRate = round(nearbyIndependentCandidates / Math.max(1, causalCandidates), 4);
    if (Math.abs(nearbyIndependentRate - expectedRate) > 0.0001) return false;
  }
  // Analogue coverage is another persisted support claim. Validate the new
  // independent-density fields when present so a forged coverage record cannot
  // make a sparse tape appear broadly supported. Legacy snapshots may omit
  // these optional fields and remain readable.
  if (record(coverage)) {
    const causalCandidates = coverage.causalCandidates;
    if (typeof causalCandidates !== "number" || !Number.isInteger(causalCandidates) || causalCandidates < 0) return false;
    // The rank/selection counts are one causal chain even when the newer
    // independent-density fields are omitted by a legacy snapshot.  Validate
    // that chain unconditionally; otherwise a forged rankedCandidates value
    // could exceed the causal tape while still bypassing the rank-aware branch
    // below (which only runs when independent rank metadata is present).
    const rankedCandidates = coverage.rankedCandidates;
    const selectedSamples = coverage.selectedSamples;
    if (typeof rankedCandidates !== "number" || !Number.isInteger(rankedCandidates)
      || rankedCandidates < 0 || rankedCandidates > causalCandidates) return false;
    if (typeof selectedSamples !== "number" || !Number.isInteger(selectedSamples)
      || selectedSamples < 0 || selectedSamples > rankedCandidates) return false;
    const denominator = Math.max(1, causalCandidates);
    // The producer persists these two retention rates alongside the integer
    // ranked/selected counts. Treat each rate as part of the same causal
    // support chain: accepting a forged rate would let a replayed snapshot
    // advertise broader posterior support than the rows it actually retains.
    const retentionPair = (countKey: "rankedCandidates" | "selectedSamples", rateKey: "retainedRate" | "selectedRate") => {
      const count = coverage[countKey];
      const rate = coverage[rateKey];
      if (count === undefined && rate === undefined) return true;
      if (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > causalCandidates) return false;
      if (typeof rate !== "number" || !finite(rate) || rate < 0 || rate > 1) return false;
      return Math.abs(rate - round(count / denominator, 4)) <= 0.0001;
    };
    if (!retentionPair("rankedCandidates", "retainedRate")) return false;
    if (!retentionPair("selectedSamples", "selectedRate")) return false;
    const boundedPair = (countKey: string, rateKey: string, upper: number, denominator = causalCandidates) => {
      const count = coverage[countKey];
      const rate = coverage[rateKey];
      if (count === undefined && rate === undefined) return true;
      if (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > upper) return false;
      if (typeof rate !== "number" || !finite(rate) || rate < 0 || rate > 1) return false;
      return Math.abs(rate - round(count / Math.max(1, denominator), 4)) <= 0.0001;
    };
    if (!boundedPair("independentCandidates", "independentRate", causalCandidates)) return false;
    const hasRankedSupport = coverage.independentRankedCandidates !== undefined || coverage.independentRankedRate !== undefined;
    if (hasRankedSupport) {
      if (typeof rankedCandidates !== "number" || !Number.isInteger(rankedCandidates) || rankedCandidates < 0 || rankedCandidates > causalCandidates) return false;
      if (!boundedPair("independentRankedCandidates", "independentRankedRate", rankedCandidates, rankedCandidates)) return false;
    }
    if (!boundedPair("independentSelectedSamples", "independentSelectedRate", causalCandidates)) return false;
    const independentSelectedSamples = coverage.independentSelectedSamples;
    const independentCandidates = coverage.independentCandidates;
    const independentRankedCandidates = coverage.independentRankedCandidates;
    if (typeof independentSelectedSamples === "number" && typeof independentCandidates === "number"
      && independentSelectedSamples > independentCandidates) return false;
    // Selected samples are drawn from the context/session-filtered ranked set.
    // Keep the count chain monotonic at the persisted boundary: otherwise a
    // forged independentSelectedSamples value could exceed the rows that
    // actually feed the posterior while all full-tape/rank-capped limits pass.
    if (typeof independentSelectedSamples === "number" && independentSelectedSamples > Number(selectedSamples)) return false;
    // Selected samples are drawn from the context/session-filtered ranked set.
    // The producer's chronological endpoint packing is monotonic for subsets,
    // so selected independent support cannot exceed rank-capped support. Keep
    // this relation explicit at the persisted boundary; otherwise a forged
    // selected count could inflate uncertainty weight while all full-tape
    // limits still pass.
    if (typeof independentRankedCandidates === "number" && typeof independentCandidates === "number"
      && independentRankedCandidates > independentCandidates) return false;
    if (hasRankedSupport && typeof independentRankedCandidates === "number" && independentRankedCandidates > Number(rankedCandidates)) return false;
    if (hasRankedSupport && typeof independentSelectedSamples === "number" && typeof independentRankedCandidates === "number"
      && independentSelectedSamples > independentRankedCandidates) return false;
  }
  if (nearestDistance == null) {
    return label === "UNSEEN" && score === 1
      && (nearbyCandidates === undefined || nearbyCandidates === 0)
      && (nearbyRate === undefined || nearbyRate === 0)
      && (nearbyIndependentCandidates === undefined || nearbyIndependentCandidates === 0)
      && (nearbyIndependentRate === undefined || nearbyIndependentRate === 0);
  }
  if (!finite(nearestDistance) || nearestDistance < 0) return false;
  if (nearbyCandidates !== undefined) {
    const expectedSupport = nearestDistance <= 0.35 ? nearbyCandidates >= 1 : nearbyCandidates === 0;
    if (!expectedSupport) return false;
  }
  if (nearbyIndependentCandidates !== undefined) {
    const expectedSupport = nearestDistance <= 0.35 ? nearbyIndependentCandidates >= 1 : nearbyIndependentCandidates === 0;
    if (!expectedSupport) return false;
  }
  const expectedLabel = nearestDistance > 0.7 ? "UNSEEN" : nearestDistance > 0.35 ? "EMERGING" : "KNOWN";
  const expectedScore = round(clamp(nearestDistance / 0.7, 0, 1), 3);
  // Persisted snapshots may have been serialized at a lower precision, but
  // a materially different score/label is malformed support metadata.
  return label === expectedLabel && Math.abs(score - expectedScore) <= 0.01;
}

/**
 * Jensen-Shannon divergence for two categorical posteriors.  A top-class
 * disagreement score loses information when one timeframe is nearly uniform
 * (or when two timeframes have different confidence), while JSD compares the
 * complete UP/DOWN/FLAT distributions and remains symmetric and bounded.
 * The base-2 logarithm keeps the result in [0, 1].
 */
function posteriorConflict(
  left: Pick<HorizonPrediction, "up" | "down" | "flat">,
  right: Pick<HorizonPrediction, "up" | "down" | "flat">,
): number {
  // Keep JSD a distance between probability distributions even when a
  // persisted/rounded prediction sums to 0.999 or 1.001.  Contributions are
  // validated before this function is called, but normalizing here preserves
  // the divergence invariant at the defensive boundary as well.
  const normalize = (values: number[]) => {
    const total = values.reduce((sum, value) => sum + value, 0);
    return total > 0 && values.every((value) => Number.isFinite(value) && value >= 0)
      ? values.map((value) => value / total)
      : null;
  };
  const p = normalize([left.up, left.down, left.flat]);
  const q = normalize([right.up, right.down, right.flat]);
  if (!p || !q) return 1;
  const midpoint = p.map((value, index) => (value + q[index]) / 2);
  const kl = (values: number[]) => values.reduce((sum, value, index) => {
    const target = midpoint[index] ?? 0;
    return sum + (value > 0 && target > 0 ? value * Math.log2(value / target) : 0);
  }, 0);
  return clamp((kl(p) + kl(q)) / 2, 0, 1);
}

/**
 * Aggregate pairwise posterior divergence using the same evidence weights as
 * the consensus vote.  This treats nested timeframe forecasts as correlated
 * descriptions: disagreement reduces declared strength without inventing an
 * additional direction vote.
 */
function consensusConflict(
  contributions: PatternContribution[],
  analyses: Record<PatternTimeframe, PatternAnalysis>,
): number {
  if (contributions.length < 2) return 0;
  let weighted = 0;
  let totalWeight = 0;
  for (let left = 0; left < contributions.length; left++) {
    const first = contributions[left]!;
    const firstPrediction = analyses[first.timeframe].predictions.find((prediction) => prediction.horizon === CONSENSUS_HORIZON);
    if (!firstPrediction || !(first.weight > 0)) continue;
    for (let right = left + 1; right < contributions.length; right++) {
      const second = contributions[right]!;
      const secondPrediction = analyses[second.timeframe].predictions.find((prediction) => prediction.horizon === CONSENSUS_HORIZON);
      const pairWeight = first.weight * second.weight;
      if (!secondPrediction || !(pairWeight > 0)) continue;
      weighted += pairWeight * posteriorConflict(firstPrediction, secondPrediction);
      totalWeight += pairWeight;
    }
  }
  return round(totalWeight > 0 ? clamp(weighted / totalWeight, 0, 1) : 0, 3);
}

export function assessContribution(
  analysis: PatternAnalysis,
  timeframe: PatternTimeframe,
  referenceMs: number | null,
  maxAgeBars: number,
  maxAgeOverrideMs?: number,
  coverageBlocked = false,
): PatternContribution {
  const maxAgeMs = Number.isFinite(maxAgeOverrideMs) && maxAgeOverrideMs! > 0
    ? maxAgeOverrideMs!
    : TIMEFRAME_MS[timeframe] * Math.max(1, maxAgeBars);
  const asOf = (analysis as PatternAnalysis | undefined)?.asOf;
  const asOfMs = asOf ? timestampMs(asOf) : NaN;
  // Without an as-of clock the tape is a replay artifact. Keep the historical
  // contract usable while making the absence of a freshness clock explicit.
  const ageMs = referenceMs == null || !Number.isFinite(asOfMs)
    ? null
    : Math.max(0, referenceMs - (asOfMs + TIMEFRAME_MS[timeframe]));
  const freshness: PatternFreshness = referenceMs == null
    ? { status: "UNKNOWN", ageMs: null, maxAgeMs, referenceTime: null, reason: "No as-of clock supplied; replay freshness is unknown." }
    : !asOf || !Number.isFinite(asOfMs)
      ? { status: "STALE", ageMs: null, maxAgeMs, referenceTime: new Date(referenceMs).toISOString(), reason: "No closed-bar timestamp is available." }
      : ageMs! > maxAgeMs
        ? { status: "STALE", ageMs, maxAgeMs, referenceTime: new Date(referenceMs).toISOString(), reason: `Latest closed ${timeframe} bar is ${Math.round(ageMs! / 60000)}m old (limit ${Math.round(maxAgeMs / 60000)}m).` }
        : { status: "FRESH", ageMs, maxAgeMs, referenceTime: new Date(referenceMs).toISOString(), reason: "Latest closed bar is inside the freshness window." };
  // Persisted snapshots are an external trust boundary. Validate the
  // collection shape before touching nested fields so a truncated artifact
  // abstains cleanly instead of throwing during refresh.
  const rawPredictions: unknown = record(analysis) ? analysis.predictions : undefined;
  // Do not call `.find` on an untrusted array containing null/non-record
  // entries.  A malformed persisted snapshot must abstain cleanly rather
  // than throw during a UI refresh.
  const predictions = denseRecords(rawPredictions)
    ? rawPredictions as unknown as HorizonPrediction[]
    : [];
  const predictionsShapeValid = denseRecords(rawPredictions);
  const walkForward = (analysis as PatternAnalysis | undefined)?.walkForward;
  const rawDataQuality: unknown = record(analysis) ? analysis.dataQuality : undefined;
  const qualityKeys = ["gaps", "duplicateTimestamps", "outOfOrderBars", "invalidTimestamps", "formingBars", "invalidBars"];
  const dataQualityShapeValid = record(rawDataQuality)
    && qualityKeys.every((key) => Number.isInteger(rawDataQuality[key]) && Number(rawDataQuality[key]) >= 0);
  const snapshotShapeValid = Boolean(
    record(analysis)
    && predictionsShapeValid
    && dataQualityShapeValid
    && record((analysis as PatternAnalysis).walkForward)
    && denseRecords((analysis as PatternAnalysis).matches)
    && record((analysis as PatternAnalysis).consensus),
  );
  const quality = evidenceQuality(analysis);
  // Novelty is a causal support diagnostic: the nearest analogue distance is
  // computed only from endpoints that predate the current query window.  For
  // the shipped XAUUSD Atlas, an unseen query must abstain rather than let a
  // smooth-looking posterior masquerade as supported evidence.  Treat a
  // missing or malformed novelty record the same way at the persisted
  // snapshot boundary.  This gate is deliberately limited to XAUUSD so
  // research consumers can continue inspecting other symbols without this
  // asset-specific support policy.
  const novelty = record(analysis) ? analysis.novelty : undefined;
  const noveltyLabel = record(novelty) ? novelty.label : undefined;
  const noveltyValid = noveltyMetadataValid(novelty, record(analysis) ? analysis.analogueCoverage : undefined);
  const xauusdNoveltyBlocked = String((analysis as PatternAnalysis | undefined)?.symbol || "").toUpperCase() === "XAUUSD"
    && (!noveltyValid || noveltyLabel === "UNSEEN");
  const prediction = predictions.find((candidate) => candidate.horizon === CONSENSUS_HORIZON);
  // Persisted/hand-built snapshots can carry NaN, Infinity or fractional
  // support counts.  Treat those as absent support so malformed metadata
  // cannot bypass the minimum H+1 sample gate or leak NaN into diagnostics.
  const rawSampleN = prediction?.sampleN;
  const sampleNValid = Number.isInteger(rawSampleN) && rawSampleN! >= 0;
  const sampleN = sampleNValid ? Math.floor(rawSampleN!) : 0;
  const posteriorRawValues = prediction ? [prediction.up, prediction.down, prediction.flat] : [];
  const posteriorTotal = posteriorRawValues.reduce((sum, value) => sum + value, 0);
  // A cross-timeframe vote must never consume a malformed posterior.  In
  // particular, an overflow/NaN in an upstream feature can otherwise turn
  // the contribution weight into NaN and make the aggregate look present
  // while its direction/strength is unusable.
  const posteriorValid = Boolean(prediction)
    && posteriorRawValues.every((value) => Number.isFinite(value) && value >= 0)
    && Number.isFinite(posteriorTotal)
    && posteriorTotal > 0
    && Math.abs(posteriorTotal - 1) <= 0.01;
  // Consensus is an H+1 vote.  Keep the horizon binding explicit so a
  // persisted/legacy prediction cannot accidentally lend H+2/H+3 support to
  // the cross-timeframe gate.
  const calibratedEffectiveN = prediction?.calibration?.horizon === 1
    && Number.isFinite(prediction.calibration.effectiveN)
    && prediction.calibration.effectiveN >= 0
    ? prediction.calibration.effectiveN
    : undefined;
  const calibrationEntropy = prediction?.calibration?.entropy;
  const calibration = prediction?.calibration;
  // `overlapFactor` is optional only for legacy snapshots. When present it is
  // persisted uncertainty metadata and must remain a finite bounded support
  // fraction; otherwise a NaN/overflow value could make a malformed
  // calibration record look coherent at the consensus boundary.
  const overlapFactorValid = calibration?.overlapFactor === undefined
    || (Number.isFinite(calibration.overlapFactor)
      && calibration.overlapFactor >= 0.1
      && calibration.overlapFactor <= 1);
  const intervalValid = Boolean(calibration)
    // Confidence intervals are persisted diagnostic metadata, so validate
    // their coherence with the same posterior they describe. A forged
    // interval that is individually bounded but excludes its posterior must
    // abstain rather than advertise a precise-looking calibration record.
    && [calibration?.interval95?.up, calibration?.interval95?.down, calibration?.interval95?.flat].every((interval, index) => {
      const posterior = posteriorRawValues[index];
      return Number.isFinite(posterior)
        && Number.isFinite(interval?.lower) && Number.isFinite(interval?.upper)
        && interval!.lower >= 0 && interval!.upper <= 1 && interval!.lower <= interval!.upper
        // Serialized intervals are rounded to 3 decimals; tolerate one
        // centesimal of that rounding at the persisted boundary.
        && posterior! >= interval!.lower - 0.01 && posterior! <= interval!.upper + 0.01;
    });
  const calibrationValid = prediction?.calibration?.horizon === CONSENSUS_HORIZON
    && Number.isFinite(calibratedEffectiveN)
    && calibratedEffectiveN! >= 3
    && Number.isFinite(calibrationEntropy)
    && calibrationEntropy! >= 0
    && calibrationEntropy! <= 1
    && Number.isFinite(calibration?.reliability)
    && calibration!.reliability >= 0 && calibration!.reliability <= 1
    && overlapFactorValid
    && intervalValid;
  // Aggregate calibration includes three uniform pseudo-observations. Keep
  // those rows in interval metadata, but do not let them masquerade as
  // independent historical support when weighting a timeframe vote.
  const effectiveN = calibratedEffectiveN == null
    ? sampleN
    : Math.max(0, calibratedEffectiveN);
  const independentEffectiveN = calibratedEffectiveN == null
    ? effectiveN
    : Math.max(0, effectiveN - 3);
  const uncertaintyWeight = round(independentEffectiveN / (independentEffectiveN + 6), 4);
  // Support alone cannot distinguish a well-separated posterior from a
  // near-uniform or tied top-class posterior. Keep the entropy multiplier,
  // then apply a bounded top-vs-runner-up margin so a flat/tied forecast
  // cannot dominate a directional cross-timeframe summary.
  const posteriorValues = posteriorValid
    ? [...posteriorRawValues].sort((a, b) => b - a)
    : [0, 0, 0];
  const posteriorMargin = clamp((posteriorValues[0] - posteriorValues[1]) / 0.5, 0, 1);
  const entropySharpness = 0.5 + 0.5 * (1 - (prediction?.calibration?.entropy ?? 0));
  const safeEntropySharpness = Number.isFinite(entropySharpness) ? entropySharpness : 0.5;
  const sharpnessWeight = round(clamp(0.5 + 0.5 * (safeEntropySharpness - 0.5) * posteriorMargin, 0.5, 1), 4);
  const hitRate = walkForward?.hitRate;
  const reliability = !Number.isFinite(hitRate)
    ? null
    : clamp(hitRate as number, 0, 1);
  const reliabilityFloor = walkForward && Number.isFinite(walkForward.hitRateInterval95?.lower)
    ? clamp(walkForward.hitRateInterval95!.lower, 0, 1)
    : reliability;
  // Do not expose a directional label when the H+1 posterior itself is not
  // usable.  `dominantDirection` intentionally assumes finite probabilities;
  // feeding it NaN/Infinity can leave a malformed, BLOCKED contribution
  // looking directional in diagnostics (and makes future consumers prone to
  // accidentally treating the metadata as a vote).  A sanitized FLAT label
  // is the only safe sentinel until the posterior contract passes.
  const direction: OutcomeDirection = posteriorValid && sampleNValid && calibrationValid && prediction && !xauusdNoveltyBlocked
    ? dominantDirection(prediction)
    : "FLAT";
  let reason = "Evidence passed freshness, quality and reliability gates.";
  let gate: PatternEvidenceGate = "PASS";
  if (coverageBlocked) { gate = "BLOCKED"; reason = "Broker history coverage is incomplete; timeframe cannot contribute to consensus."; }
  else if (!snapshotShapeValid) { gate = "BLOCKED"; reason = "Persisted timeframe evidence is malformed; timeframe abstains from consensus."; }
  else if (!analysis.ok || !prediction) { gate = "BLOCKED"; reason = analysis.reason || "No verified prediction is available."; }
  else if (!sampleNValid) {
    gate = "BLOCKED";
    reason = "H+1 sample support is malformed; timeframe abstains from consensus.";
  }
  else if (!posteriorValid) {
    gate = "BLOCKED";
    reason = "H+1 posterior is malformed or does not sum to one; timeframe abstains from consensus.";
  }
  // The cross-timeframe vote is an explicit H+1 contract. A persisted or
  // hand-built prediction with a missing/mismatched calibration horizon must
  // abstain rather than silently borrowing support from H+2/H+3 metadata.
  else if (prediction.calibration?.horizon !== CONSENSUS_HORIZON) {
    gate = "BLOCKED";
    reason = `Prediction calibration horizon is ${prediction.calibration?.horizon ?? "unknown"}; consensus requires H+${CONSENSUS_HORIZON}.`;
  }
  else if (!calibrationValid) {
    gate = "BLOCKED";
    reason = "H+1 calibration support, entropy or posterior intervals are invalid; timeframe abstains from consensus.";
  }
  else if (freshness.status === "STALE") { gate = "BLOCKED"; reason = freshness.reason; }
  // A missing bucket invalidates the causal clock for the entire timeframe.
  // It is not enough to rely on the local query-window guard: a gap earlier in
  // the tape can still contaminate walk-forward support and make a seemingly
  // healthy latest window vote with a discontinuous history.  Keep the
  // analysis inspectable, but fail closed at the cross-timeframe evidence
  // boundary until the source is repaired or reloaded.
  else if (analysis.dataQuality.gaps > 0) {
    gate = "BLOCKED";
    reason = `Tape contains ${analysis.dataQuality.gaps} missing timeframe interval${analysis.dataQuality.gaps === 1 ? "" : "s"}; timeframe cannot contribute to consensus.`;
  }
  else if (analysis.dataQuality.duplicateTimestamps > 0 || analysis.dataQuality.outOfOrderBars > 0 || analysis.dataQuality.invalidTimestamps > 0 || analysis.dataQuality.invalidBars > 0) {
    gate = "BLOCKED";
    const defects = analysis.dataQuality.duplicateTimestamps + analysis.dataQuality.outOfOrderBars + analysis.dataQuality.invalidTimestamps + analysis.dataQuality.invalidBars;
    reason = `Tape contains ${defects} causal data defect${defects === 1 ? "" : "s"}; timeframe cannot contribute to consensus.`;
  }
  else if (quality < 0.8) { gate = "BLOCKED"; reason = `Tape quality is too low (${Math.round(quality * 100)}%).`; }
  else if (sampleN < 8) { gate = "BLOCKED"; reason = `Only ${sampleN} observed H+1 outcomes; at least 8 are required.`; }
  // A raw nearest-match count can still be misleading when the endpoints are
  // adjacent windows from one move.  `effectiveN` includes the three-row
  // categorical smoothing prior, so remove that prior before applying the
  // independent-support gate.  Otherwise eight highly clustered rows could
  // pass the consensus gate while contributing almost no independent evidence.
  else if (independentEffectiveN < MIN_CONTEXT_EFFECTIVE_SUPPORT) {
    gate = "BLOCKED";
    reason = `Only ${round(independentEffectiveN, 1)} independent analogue support; at least ${MIN_CONTEXT_EFFECTIVE_SUPPORT} is required.`;
  }
  // Keep the serialized calibration state explicit: drift.label === "BREAK"
  // is the fail-closed state, while optional chaining handles older snapshots.
  else if (analysis.walkForward.probabilistic?.drift && analysis.walkForward.probabilistic.drift.label === "BREAK") {
    gate = "BLOCKED";
    reason = "Chronological probability calibration drift is BREAK; timeframe abstains until closed-bar evidence stabilizes.";
  }
  else if (xauusdNoveltyBlocked) {
    gate = "BLOCKED";
    reason = noveltyValid
      ? "Current XAUUSD pattern is UNSEEN in the causal analogue tape; timeframe abstains until historical support appears."
      : "XAUUSD novelty support metadata is malformed; timeframe abstains from consensus.";
  }
  else if (reliability == null || reliability < 0.45 || !Number.isFinite(analysis.walkForward.evaluated) || analysis.walkForward.evaluated < 12) {
    gate = "BLOCKED";
    reason = reliability == null ? "Walk-forward reliability is unavailable." : `Walk-forward reliability ${Math.round(reliability * 100)}% is below the 45% gate.`;
  }
  const weight = gate === "PASS"
    ? round(Math.max(0.2, Math.min(1, analysis.matches.length / 20)) * (0.5 + 0.5 * quality) * (0.5 + 0.5 * (reliabilityFloor ?? reliability ?? 0)) * uncertaintyWeight * sharpnessWeight, 4)
    : 0;
  // `analysis` is typed as a PatternAnalysis for normal callers, but this
  // boundary also accepts replayed/persisted data at runtime. Keep malformed
  // null/primitive payloads from throwing while constructing diagnostics.
  if (record(analysis)) {
    analysis.freshness = freshness;
    analysis.evidence = { gate, reason, quality, reliability, sampleN, effectiveN: round(effectiveN, 3), uncertaintyWeight, weight };
  }
  return { timeframe, horizon: CONSENSUS_HORIZON, direction, gate, reason, weight, quality, reliability, freshness: freshness.status, ageMs, sampleN, effectiveN: round(effectiveN, 3), uncertaintyWeight, sharpnessWeight };
}

export function analyzeMultiTimeframe(
  tapes: Partial<Record<PatternTimeframe | "H1", PatternBar[]>>,
  symbol = "XAUUSD",
  options: { adaptive?: boolean; now?: string | number | Date; maxAgeBars?: number; maxAgeMs?: number; blockedTimeframes?: PatternTimeframe[] } = {},
): MultiTimeframeAtlas {
  const timeframes: PatternTimeframe[] = ["M5", "M15", "M30"];
  const analyses = Object.fromEntries(timeframes.map((tf) => [tf, analyzeCandlePattern(tapes[tf] || [], tf, symbol, { adaptive: options.adaptive !== false, now: options.now, h1Bars: tapes.H1 })])) as Record<PatternTimeframe, PatternAnalysis>;
  const h1Raw = tapes.H1 || [];
  const h1Now = requestedTimeMs(options.now) ?? Date.now();
  const h1Prepared = prepareBars(h1Raw, "H1", h1Now).bars;
  // The shared H1 summary must be available to every lower timeframe that
  // can contribute. Using the latest lower close here would let a long M30
  // tape expose H1 bars that the shorter M5 query could not have observed.
  // Individual analyses still retain their own tighter H1 boundary.
  const lowerAsOfCandidates = timeframes.map((tf) => {
    const asOf = analyses[tf].asOf;
    return asOf ? timestampMs(asOf) + TIMEFRAME_MS[tf] : Number.NEGATIVE_INFINITY;
  }).filter(Number.isFinite);
  const lowerAsOfMs = lowerAsOfCandidates.length ? Math.min(...lowerAsOfCandidates) : Number.NEGATIVE_INFINITY;
  const h1Usable = Number.isFinite(lowerAsOfMs)
    ? h1Prepared.filter((bar) => timestampMs(bar.t) + TIMEFRAME_MS.H1 <= lowerAsOfMs)
    : [];
  const h1Last = h1Usable.length - 1;
  const h1Anchor = h1Last >= 0 ? Math.max(0, h1Last - 12) : 0;
  const h1TrendAtr = h1Last >= 7 ? (h1Usable[h1Last].c - h1Usable[h1Anchor].c) / Math.max(atrAt(h1Usable, h1Last), 1e-9) : 0;
  const h1Trend: H1Trend = h1Last < 7 ? "UNKNOWN" : h1TrendAtr > 0.6 ? "UP" : h1TrendAtr < -0.6 ? "DOWN" : "FLAT";
  const h1Context = { trend: h1Trend, trendAtr: round(h1TrendAtr, 3), strength: round(clamp(Math.abs(h1TrendAtr) / 2, 0, 1), 3), bars: h1Usable.length, asOf: h1Usable.length ? h1Usable[h1Usable.length - 1].t : null, source: "H1_CLOSED_ONLY" as const, causal: true as const, reason: !h1Raw.length ? "No H1 context tape supplied." : h1Last < 7 ? "Insufficient completed H1 bars at the lower query boundary." : "H1 trend uses only bars closed by the lower query boundary." };
  const votes = { UP: 0, DOWN: 0, FLAT: 0 };
  const contributing: PatternTimeframe[] = [];
  const referenceMs = requestedTimeMs(options.now);
  const blockedTimeframes = new Set(options.blockedTimeframes || []);
  const contributions = timeframes.map((tf) => assessContribution(analyses[tf], tf, referenceMs, options.maxAgeBars ?? 3, options.maxAgeMs, blockedTimeframes.has(tf)));
  for (const contribution of contributions) {
    if (contribution.gate !== "PASS") continue;
    const p = analyses[contribution.timeframe].predictions.find((candidate) => candidate.horizon === CONSENSUS_HORIZON)!;
    // Rounded persisted posteriors may sum to 0.999 or 1.001. Normalize at
    // the vote boundary so a tolerated rounding error cannot inflate one
    // timeframe's influence relative to its peers.
    const posteriorTotal = p.up + p.down + p.flat;
    const posteriorScale = posteriorTotal > 0 && Number.isFinite(posteriorTotal) ? 1 / posteriorTotal : 0;
    votes.UP += p.up * posteriorScale * contribution.weight;
    votes.DOWN += p.down * posteriorScale * contribution.weight;
    votes.FLAT += p.flat * posteriorScale * contribution.weight;
    contributing.push(contribution.timeframe);
  }
  const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, value]) => sum + value, 0) || 1;
  const hasEvidence = contributing.length > 0;
  const rawStrength = hasEvidence ? (sorted[0][1] - sorted[1][1]) / total : 0;
  const passedContributions = contributions.filter((item) => item.gate === "PASS");
  // Compare full posterior distributions rather than only their top labels.
  // This remains zero for two equally uncertain posteriors, and approaches
  // one only when weighted timeframe forecasts are genuinely contradictory.
  const distributionConflict = hasEvidence && passedContributions.length > 1
    ? consensusConflict(passedContributions, analyses)
    : 0;
  // Keep the existing decisive-direction guard as a conservative floor. A
  // timeframe whose own posterior is near a tie should contribute less to the
  // cross-timeframe conflict score than a decisive local posterior.
  const directionalWeights = { UP: 0, DOWN: 0, FLAT: 0 };
  for (const contribution of passedContributions) {
    const agreement = analyses[contribution.timeframe].consensus.agreement;
    directionalWeights[contribution.direction] += contribution.weight * clamp(agreement, 0, 1);
  }
  const directionalTotal = Object.values(directionalWeights).reduce((sum, value) => sum + value, 0);
  const dominantDirectionalWeight = Math.max(...Object.values(directionalWeights));
  // A top-label split is only meaningful when the contributing posteriors
  // are decisive.  Without this confidence factor, three near-uniform
  // posteriors can receive different tie-broken labels and look maximally
  // conflicted even though their full distributions (and JSD above) agree.
  const meanDirectionalAgreement = passedContributions.length
    ? passedContributions.reduce((sum, contribution) => sum + contribution.weight * clamp(analyses[contribution.timeframe].consensus.agreement, 0, 1), 0)
      / Math.max(1e-9, passedContributions.reduce((sum, contribution) => sum + contribution.weight, 0))
    : 0;
  const directionalConflict = directionalTotal > 0
    ? clamp((1 - dominantDirectionalWeight / directionalTotal) * clamp(meanDirectionalAgreement, 0, 1), 0, 1)
    : 0;
  const conflict = round(Math.max(distributionConflict, directionalConflict), 3);
  // A raw vote margin can look decisive when one timeframe says UP and another
  // says DOWN with similar support.  Conflict is therefore applied to the
  // reported strength while the dominant direction remains the transparent
  // weighted vote above.
  const consensusDirection: OutcomeDirection = hasEvidence && rawStrength >= MIN_DIRECTION_MARGIN ? sorted[0][0] as OutcomeDirection : "FLAT";
  // A FLAT consensus is an abstention. Keep its strength at zero so callers
  // cannot interpret a small residual vote margin as directional conviction.
  const strength = hasEvidence && consensusDirection !== "FLAT" ? rawStrength * (1 - conflict) : 0;
  const gate: PatternEvidenceGate = hasEvidence ? "PASS" : "BLOCKED";
  const blocked = contributions.filter((item) => item.gate === "BLOCKED");
  const note = hasEvidence
    ? contributing.length === 1
      ? `Only ${contributing[0]} passed the evidence gate; consensus is a single-timeframe research summary with no order or entry decision.`
      : rawStrength < MIN_DIRECTION_MARGIN && conflict < 0.2
        ? "Timeframe posteriors are near-tied; consensus remains FLAT as a research summary with no order or entry decision."
      : conflict >= 0.2
        ? `Timeframe directions have material conflict (${Math.round(conflict * 100)}% weighted disagreement); consensus remains a research summary with no order or entry decision.`
      : "Multi-timeframe vote is a research summary; no order or entry decision is emitted."
    : blocked.length
      ? `No verified timeframe evidence passed the gate: ${blocked.map((item) => `${item.timeframe} ${item.reason}`).join("; ")}`
      : "No verified timeframe evidence is available; consensus remains FLAT.";
  return {
    symbol, asOf: (() => { const values = timeframes.map((tf) => analyses[tf].asOf).filter((value): value is string => Boolean(value)).sort(); return values.length ? values[values.length - 1] : null; })(),
    generatedAt: new Date().toISOString(), h1Context, timeframes: analyses,
    consensus: { horizon: CONSENSUS_HORIZON, direction: consensusDirection, strength: round(strength, 3), conflict, contributing, note, contributions, gate, authority: "SHADOW_ONLY", decision: "NO_DECISION" },
  };
}



















