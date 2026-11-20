import type { PdfSignalDetectorResult, PdfSignalObservation } from "../lib/pdfSignalDetector.ts";
import { getPriceActionKnowledge } from "../lib/priceActionKnowledgeLookup.ts";
import type { PdfSignalVerificationReceipt } from "../lib/pdfSignalVerification.ts";

type Locale = "en" | "vi";

const VI_NAMES: Record<string, string> = {
  double_pressure: "\u00c1p l\u1ef1c k\u00e9p",
  dominant_pressure: "\u00c1p l\u1ef1c chi ph\u1ed1i",
  support_resistance: "H\u1ed7 tr\u1ee3 v\u00e0 kh\u00e1ng c\u1ef1",
  buildup: "T\u00edch l\u0169y tr\u01b0\u1edbc ph\u00e1 v\u1ee1",
  false_break: "Ph\u00e1 v\u1ee1 gi\u1ea3",
  tease_break: "Ph\u00e1 v\u1ee1 th\u0103m d\u00f2",
  false_high_low: "\u0110\u1ec9nh / \u0111\u00e1y gi\u1ea3",
  pullback_reversal: "\u0110\u1ea3o chi\u1ec1u sau h\u1ed3i gi\u00e1",
  ceiling_test: "Ki\u1ec3m tra tr\u1ea7n / nam ch\u00e2m",
  round_number: "Hi\u1ec7u \u1ee9ng s\u1ed1 tr\u00f2n",
  signal_entry_bar: "N\u1ebfn t\u00edn hi\u1ec7u / v\u00e0o l\u1ec7nh",
  pattern_break_combi: "T\u1ed4 h\u1ee3p ph\u00e1 m\u1eabu",
  bracket_costs: "Bracket v\u00e0 chi ph\u00ed",
  news_exit: "Tho\u00e1t tr\u01b0\u1edbc tin",
  resistance_exit: "Kh\u00e1ng c\u1ef1 v\u00e0 kho\u1ea3ng tr\u1ed1ng",
  reversal_exit: "Tho\u00e1t khi \u0111\u1ea3o chi\u1ec1u",
  trade_selection_failure: "Th\u1ea5t b\u1ea1i l\u1ef1a ch\u1ecdn l\u1ec7nh",
  consecutive_review: "R\u00e0 so\u00e1t li\u00ean ti\u1ebfp",
  position_sizing: "Qu\u1ea3n tr\u1ecb kh\u1ed1i l\u01b0\u1ee3ng",
  low_volatility: "Bi\u1ebfn \u0111\u1ed9ng th\u1ea5p",
  pattern_break: "Ph\u00e1 m\u1eabu",
  pattern_break_pullback: "Ph\u00e1 m\u1eabu h\u1ed3i gi\u00e1",
  obstacle_room: "V\u00f9ng c\u1ea3n ph\u00eda tr\u01b0\u1edbc",
};

const STATE_LABELS: Record<string, [string, string]> = {
  DETECTED: ["Detected", "\u0110\u00e3 nh\u1eadn di\u1ec7n"],
  ABSTAIN: ["Abstain", "T\u1ea1m d\u1eebng"],
  UNAVAILABLE: ["Unavailable", "Ch\u01b0a \u0111\u1ee7 d\u1eef li\u1ec7u"],
  WITHHELD: ["Withheld", "\u0110ang gi\u1eef l\u1ea1i"],
};

const stateLabel = (state: PdfSignalObservation["state"], locale: Locale) => STATE_LABELS[state][locale === "vi" ? 1 : 0];

const REASON_LABELS: Record<string, [string, string]> = {
  PDF_CONCEPTS_EVALUATED_ON_CLOSED_XAUUSD_M5: ["PDF concepts evaluated on closed XAUUSD M5 bars", "\u0043\u00e1c kh\u00e1i ni\u1ec7m PDF \u0111\u01b0\u1ee3c \u0111\u00e1nh gi\u00e1 tr\u00ean n\u1ebfn XAUUSD M5 \u0111\u00e3 \u0111\u00f3ng"],
  INVALID_XAUUSD_SYMBOL: ["Input symbol is not XAUUSD", "\u004d\u00e3 t\u00e0i s\u1ea3n \u0111\u1ea7u v\u00e0o kh\u00f4ng ph\u1ea3i XAUUSD"],
  INVALID_XAUUSD_TIMEFRAME: ["Input timeframe is not M5", "\u004b\u0068ung th\u1eddi gian \u0111\u1ea7u v\u00e0o kh\u00f4ng ph\u1ea3i M5"],
  INVALID_CAUSAL_INPUT: ["Invalid causal input", "D\u1eef li\u1ec7u nh\u00e2n qu\u1ea3 kh\u00f4ng h\u1ee3p l\u1ec7"],
  UNVERIFIED_CURRENT_EVIDENCE: ["Current evidence is unverified", "B\u1eb1ng ch\u1ee9ng hi\u1ec7n t\u1ea1i ch\u01b0a \u0111\u01b0\u1ee3c x\u00e1c minh"],
  DUPLICATE_CAUSAL_IDENTITY: ["Duplicate causal identity", "Tr\u00f9ng danh t\u00ednh nh\u00e2n qu\u1ea3"],
  DUPLICATE_SELECTED_IDENTITY: ["Duplicate selected candle identity", "Tr\u00f9ng danh t\u00ednh n\u1ebfn \u0111\u01b0\u1ee3c ch\u1ecdn"],
  DUPLICATE_OBSERVED_THROUGH_IDENTITY: ["Duplicate observed-through identity", "Tr\u00f9ng danh t\u00ednh m\u1ed1c quan s\u00e1t"],
  DUPLICATE_OCCURRENCE_IDENTITY: ["Duplicate occurrence identity", "Tr\u00f9ng danh t\u00ednh l\u1ea7n xu\u1ea5t hi\u1ec7n"],
  MISSING_SELECTED_CANDLE: ["Selected candle is missing", "Thi\u1ebfu n\u1ebfn \u0111\u01b0\u1ee3c ch\u1ecdn"],
  MISSING_OBSERVED_THROUGH_CANDLE: ["Observed-through candle is missing", "Thi\u1ebfu n\u1ebfn t\u1ea1i m\u1ed1c quan s\u00e1t"],
  MISSING_OCCURRENCE_CANDLE: ["Occurrence candle is missing", "Thi\u1ebfu n\u1ebfn c\u1ee7a l\u1ea7n xu\u1ea5t hi\u1ec7n"],
  MISSING_OR_INVALID_SELECTED_CANDLE: ["Selected candle is missing or invalid", "N\u1ebfn \u0111\u01b0\u1ee3c ch\u1ecdn thi\u1ebfu ho\u1eb7c kh\u00f4ng h\u1ee3p l\u1ec7"],
  MISSING_OR_INVALID_SETUP_CANDLE: ["Setup candle is missing or invalid", "N\u1ebfn thi\u1ebft l\u1eadp thi\u1ebfu ho\u1eb7c kh\u00f4ng h\u1ee3p l\u1ec7"],
  INVALID_CAUSAL_PREFIX: ["Invalid causal prefix", "Ti\u1ec1n t\u1ed1 nh\u00e2n qu\u1ea3 kh\u00f4ng h\u1ee3p l\u1ec7"],
  INVALID_CAUSAL_TAPE: ["Invalid causal tape", "B\u0103ng d\u1eef li\u1ec7u nh\u00e2n qu\u1ea3 kh\u00f4ng h\u1ee3p l\u1ec7"],
  INVALID_OR_FORMING_BAR_INPUT: ["Input contains an invalid or forming bar", "D\u1eef li\u1ec7u c\u00f3 n\u1ebfn kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c \u0111ang h\u00ecnh th\u00e0nh"],
  INVALID_EXIT_EVENT_INPUT: ["Invalid exit-event input", "D\u1eef li\u1ec7u s\u1ef1 ki\u1ec7n tho\u00e1t kh\u00f4ng h\u1ee3p l\u1ec7"],
  INVALID_OCCURRENCE_IDENTITY: ["Invalid occurrence identity", "Danh t\u00ednh l\u1ea7n xu\u1ea5t hi\u1ec7n kh\u00f4ng h\u1ee3p l\u1ec7"],
  INVALID_OBSERVED_THROUGH_IDENTITY: ["Invalid observed-through identity", "Danh t\u00ednh m\u1ed1c quan s\u00e1t kh\u00f4ng h\u1ee3p l\u1ec7"],
  OBSERVED_THROUGH_BEFORE_OCCURRENCE: ["Observed-through is before the occurrence", "M\u1ed1c quan s\u00e1t n\u1eb1m tr\u01b0\u1edbc l\u1ea7n xu\u1ea5t hi\u1ec7n"],
  CAUSAL_PREFIX_TOO_LONG: ["Causal prefix is too long", "Ti\u1ec1n t\u1ed1 nh\u00e2n qu\u1ea3 qu\u00e1 d\u00e0i"],
  CAUSAL_PREFIX_GAP: ["Causal prefix contains a gap", "Ti\u1ec1n t\u1ed1 nh\u00e2n qu\u1ea3 c\u00f3 kho\u1ea3ng tr\u1ed1ng"],
  NON_CONTIGUOUS_M5_TAPE: ["M5 tape is non-contiguous", "B\u0103ng M5 kh\u00f4ng li\u00ean t\u1ee5c"],
  NONCONTIGUOUS_CLOSED_CONTEXT: ["Closed context is non-contiguous", "B\u1ed1i c\u1ea3nh n\u1ebfn \u0111\u00f3ng kh\u00f4ng li\u00ean t\u1ee5c"],
  INSUFFICIENT_M5_CONTEXT: ["Insufficient closed M5 context", "Thi\u1ebfu b\u1ed1i c\u1ea3nh M5 \u0111\u00e3 \u0111\u00f3ng"],
  INSUFFICIENT_CLOSED_CONTEXT: ["Insufficient closed context", "Thi\u1ebfu b\u1ed1i c\u1ea3nh n\u1ebfn \u0111\u00e3 \u0111\u00f3ng"],
  CAUSAL_PREFIX_TOO_SHORT_FOR_PRIOR_RANGE: ["Causal prefix is too short for the prior range", "Ti\u1ec1n t\u1ed1 nh\u00e2n qu\u1ea3 qu\u00e1 ng\u1eafn cho bi\u00ean tr\u01b0\u1edbc"],
  NEUTRAL_OR_INVALID_DIRECTION: ["Direction is neutral or invalid", "H\u01b0\u1edbng trung t\u00ednh ho\u1eb7c kh\u00f4ng h\u1ee3p l\u1ec7"],
  NEUTRAL_SETUP: ["Setup has no direction", "Thi\u1ebft l\u1eadp kh\u00f4ng c\u00f3 h\u01b0\u1edbng"],
  DIRECTIONAL_CONTEXT_REQUIRED: ["Directional context is required", "C\u1ea7n b\u1ed1i c\u1ea3nh theo h\u01b0\u1edbng"],
  CLOSED_M5_CANDLE_GEOMETRY_ONLY: ["Closed M5 candle geometry only", "Ch\u1ec9 h\u00ecnh h\u1ecdc n\u1ebfn M5 \u0111\u00e3 \u0111\u00f3ng"],
  CLOSED_OHLC_RANGE_RISK_UNIT_PROXY: ["Closed OHLC range risk-unit proxy", "\u0110\u1ea1i di\u1ec7n \u0111\u01a1n v\u1ecb r\u1ee7i ro theo bi\u00ean OHLC \u0111\u00e3 \u0111\u00f3ng"],
  EXECUTION_MODEL_UNAVAILABLE: ["Execution model unavailable", "Ch\u01b0a c\u00f3 m\u00f4 h\u00ecnh kh\u1edbp l\u1ec7nh"],
  USER_SUPPLIED_QUOTE_PRICE_BRACKET: ["User-supplied quote-price bracket", "Khung gi\u00e1 theo \u0111\u01a1n v\u1ecb gi\u00e1 do ng\u01b0\u1eddi d\u00f9ng cung c\u1ea5p"],
  QUOTE_PRICE_BRACKET_ASSUMPTIONS_UNAVAILABLE: ["Quote-price bracket assumptions unavailable", "Ch\u01b0a c\u00f3 gi\u1ea3 \u0111\u1ecbnh khung gi\u00e1 theo \u0111\u01a1n v\u1ecb gi\u00e1"],
  VALIDATED_NEWS_CALENDAR_UNAVAILABLE: ["Validated news calendar unavailable", "Ch\u01b0a c\u00f3 l\u1ecbch tin \u0111\u00e3 x\u00e1c minh"],
  VALIDATED_NEWS_EVENT_IDENTITY_ONLY: ["Validated news-event identity only", "Ch\u1ec9 danh t\u00ednh s\u1ef1 ki\u1ec7n tin \u0111\u00e3 x\u00e1c minh"],
  VALIDATED_NEWS_EVENT_IDENTITY_OBSERVED: ["Validated news-event identity observed", "\u0110\u00e3 quan s\u00e1t danh t\u00ednh s\u1ef1 ki\u1ec7n tin \u0111\u00e3 x\u00e1c minh"],
  VALIDATED_RESISTANCE_LEVEL_UNAVAILABLE: ["Validated resistance level unavailable", "Ch\u01b0a c\u00f3 m\u1ee9c kh\u00e1ng c\u1ef1 \u0111\u00e3 x\u00e1c minh"],
  VALIDATED_REVERSAL_LEVEL_UNAVAILABLE: ["Validated reversal level unavailable", "Ch\u01b0a c\u00f3 m\u1ee9c \u0111\u1ea3o chi\u1ec1u \u0111\u00e3 x\u00e1c minh"],
  VALIDATED_STRUCTURAL_LEVEL_TOUCH_OBSERVED: ["Validated structural-level touch observed", "\u0110\u00e3 quan s\u00e1t ch\u1ea1m m\u1ee9c c\u1ea5u tr\u00fac \u0111\u00e3 x\u00e1c minh"],
  VALIDATED_ADVERSE_LEVEL_BREAK_OBSERVED: ["Validated adverse-level break observed", "\u0110\u00e3 quan s\u00e1t ph\u00e1 m\u1ee9c b\u1ea5t l\u1ee3i \u0111\u00e3 x\u00e1c minh"],
  VALIDATED_ADVERSE_EVENT_IDENTITY_ONLY: ["Validated adverse-event identity only", "Ch\u1ec9 danh t\u00ednh s\u1ef1 ki\u1ec7n b\u1ea5t l\u1ee3i \u0111\u00e3 x\u00e1c minh"],
  DIRECTION_OR_PRIOR_CONTEXT_REQUIRED: ["Direction or prior context is required", "C\u1ea7n h\u01b0\u1edbng ho\u1eb7c b\u1ed1i c\u1ea3nh tr\u01b0\u1edbc \u0111\u00f3"],
  LOCAL_ADVERSE_EXTREME_REFERENCE: ["Local adverse extreme reference only", "Ch\u1ec9 tham chi\u1ebfu c\u1ef1c tr\u1ecb b\u1ea5t l\u1ee3i c\u1ee5c b\u1ed9"],
  ADVERSE_LEVEL_OR_EXECUTION_LABEL_REQUIRED: ["Adverse level or execution label is required", "C\u1ea7n m\u1ee9c b\u1ea5t l\u1ee3i ho\u1eb7c nh\u00e3n kh\u1edbp l\u1ec7nh"],
  DIRECTIONAL_FAILURE_LABEL_UNAVAILABLE: ["Directional failure label unavailable", "Ch\u01b0a c\u00f3 nh\u00e3n th\u1ea5t b\u1ea1i theo h\u01b0\u1edbng"],
  CAUSAL_PRIOR_RANGE_OBSERVED: ["Causal prior range observed", "\u0110\u00e3 quan s\u00e1t bi\u00ean tr\u01b0\u1edbc theo nh\u00e2n qu\u1ea3"],
  USER_SIZING_AND_COST_ASSUMPTIONS_REQUIRED: ["User sizing and cost assumptions are required", "C\u1ea7n gi\u1ea3 \u0111\u1ecbnh kh\u1ed1i l\u01b0\u1ee3ng v\u00e0 chi ph\u00ed t\u1eeb ng\u01b0\u1eddi d\u00f9ng"],
  USER_SUPPLIED_RISK_UNIT_OBSERVATION: ["User-supplied risk-unit observation", "Quan s\u00e1t \u0111\u01a1n v\u1ecb r\u1ee7i ro do ng\u01b0\u1eddi d\u00f9ng cung c\u1ea5p"],
  CLOSED_PREFIX_COVERAGE_ONLY: ["Closed-prefix coverage only", "Ch\u1ec9 bao ph\u1ee7 ti\u1ec1n t\u1ed1 \u0111\u00e3 \u0111\u00f3ng"],
  SOURCE_OUTCOME_NOT_LABELLED: ["Source outcome is not labelled", "K\u1ebft qu\u1ea3 t\u1eeb ngu\u1ed3n ch\u01b0a c\u00f3 nh\u00e3n"],
  CAUSAL_PREFIX_DESCRIPTORS_AVAILABLE: ["Causal-prefix descriptors available", "C\u00f3 m\u00f4 t\u1ea3 t\u00ednh nh\u00e2n qu\u1ea3 c\u1ee7a ti\u1ec1n t\u1ed1"],
  CAUSAL_PREFIX_CONTEXT_AVAILABLE: ["Causal-prefix context available", "C\u00f3 b\u1ed1i c\u1ea3nh ti\u1ec1n t\u1ed1 nh\u00e2n qu\u1ea3"],
  LOCAL_RECENT_RANGE_BELOW_BASELINE: ["Local recent range is below baseline", "Bi\u00ean g\u1ea7n \u0111\u00e2y th\u1ea5p h\u01a1n m\u1ee9c c\u01a1 s\u1edf"],
  LOCAL_RECENT_RANGE_NOT_BELOW_BASELINE: ["Local recent range is not below baseline", "Bi\u00ean g\u1ea7n \u0111\u00e2y kh\u00f4ng th\u1ea5p h\u01a1n m\u1ee9c c\u01a1 s\u1edf"],
  LOW_ACTIVITY_CONTEXT: ["Low-activity context", "B\u1ed1i c\u1ea3nh ho\u1ea1t \u0111\u1ed9ng th\u1ea5p"],
  TYPICAL_ACTIVITY_CONTEXT: ["Typical-activity context", "B\u1ed1i c\u1ea3nh ho\u1ea1t \u0111\u1ed9ng th\u00f4ng th\u01b0\u1eddng"],
  UNMEASURABLE_RANGE_BASELINE: ["Range baseline is not measurable", "Kh\u00f4ng th\u1ec3 \u0111o m\u1ee9c c\u01a1 s\u1edf c\u1ee7a bi\u00ean"],
  NO_EVENT_OBSERVED_IN_REVEALED_PREFIX: ["No event observed in the revealed prefix", "Kh\u00f4ng quan s\u00e1t th\u1ea5y s\u1ef1 ki\u1ec7n trong ti\u1ec1n t\u1ed1 \u0111\u00e3 m\u1edf"],
  NO_EXIT_OUTCOME_OR_FILL_INFERENCE: ["No exit outcome or fill inference", "Kh\u00f4ng suy ra k\u1ebft qu\u1ea3 tho\u00e1t hay kh\u1edbp l\u1ec7nh"],
  NO_CONCEPT_MATCH: ["No concept match", "Kh\u00f4ng kh\u1edbp kh\u00e1i ni\u1ec7m"],
  NO_BOUNDARY_FIGHT: ["No boundary fight", "Kh\u00f4ng c\u00f3 gi\u1eb1ng co t\u1ea1i bi\u00ean"],
  RANGE_NOT_COMPACT: ["Range is not compact", "Bi\u00ean kh\u00f4ng thu g\u1ecdn"],
  COMPACT_ALTERNATING_BOUNDARY_FIGHT: ["Compact alternating boundary fight", "Gi\u1eb1ng co bi\u00ean thu g\u1ecdn lu\u00e2n phi\u00ean"],
  AMBIGUOUS_TWO_SIDED_BOUNDARY_SWEEP: ["Two-sided boundary sweep is ambiguous", "Qu\u00e9t hai ph\u00eda bi\u00ean kh\u00f4ng r\u00f5 r\u00e0ng"],
  NO_UNDONE_BOUNDARY_BREAK: ["No undone boundary break", "Kh\u00f4ng c\u00f3 ph\u00e1 bi\u00ean b\u1ecb h\u1ee7y"],
  BREAK_RETURNED_INSIDE_PRIOR_RANGE: ["Break returned inside the prior range", "Ph\u00e1 v\u1ee1 quay l\u1ea1i trong bi\u00ean tr\u01b0\u1edbc"],
  NO_REPEATED_LEVEL_ROLE_TEST: ["No repeated level-role test", "Kh\u00f4ng c\u00f3 ki\u1ec3m tra vai tr\u00f2 m\u1ee9c l\u1eb7p l\u1ea1i"],
  COUNTER_SWING_NOT_RESOLVED: ["Counter-swing is unresolved", "Nh\u1ecbp ng\u01b0\u1ee3c chi\u1ec1u ch\u01b0a \u0111\u01b0\u1ee3c gi\u1ea3i quy\u1ebft"],
  NO_DOMINANT_SWING_STRUCTURE: ["No dominant swing structure", "Kh\u00f4ng c\u00f3 c\u1ea5u tr\u00fac nh\u1ecbp chi ph\u1ed1i"],
  FAILED_BREAK_LACKS_OPPOSITE_CONFIRMATION: ["Failed break lacks opposite confirmation", "Ph\u00e1 v\u1ee1 th\u1ea5t b\u1ea1i thi\u1ebfu x\u00e1c nh\u1eadn ng\u01b0\u1ee3c chi\u1ec1u"],
  NO_FAILED_NEIGHBOR_BREAK: ["No failed neighboring break", "Kh\u00f4ng c\u00f3 ph\u00e1 v\u1ee1 l\u00e2n c\u1eadn th\u1ea5t b\u1ea1i"],
  OPPOSITE_BREAK_AFTER_FAILED_NEIGHBOR: ["Opposite break after failed neighbor", "Ph\u00e1 v\u1ee1 ng\u01b0\u1ee3c chi\u1ec1u sau l\u1ea7n l\u00e2n c\u1eadn th\u1ea5t b\u1ea1i"],
  BREAK_LACKS_FOLLOW_THROUGH: ["Break lacks follow-through", "Ph\u00e1 v\u1ee1 thi\u1ebfu ti\u1ebfp di\u1ec5n"],
  NO_PREPARED_BOUNDARY_BREAK: ["No prepared boundary break", "Kh\u00f4ng c\u00f3 ph\u00e1 bi\u00ean \u0111\u01b0\u1ee3c chu\u1ea9n b\u1ecb"],
  BREAK_AND_FOLLOW_THROUGH: ["Break and follow-through", "Ph\u00e1 v\u1ee1 v\u00e0 ti\u1ebfp di\u1ec5n"],
  PREMATURE_BREAK_RETEST_WITHOUT_SECOND_BREAK: ["Premature break retest without a second break", "Ki\u1ec3m tra l\u1ea1i ph\u00e1 v\u1ee1 s\u1edbm nh\u01b0ng ch\u01b0a c\u00f3 ph\u00e1 l\u1ea7n hai"],
  NO_PREMATURE_BREAK: ["No premature break", "Kh\u00f4ng c\u00f3 ph\u00e1 v\u1ee1 s\u1edbm"],
  INTERNAL_CEILING_TEST: ["Internal ceiling test", "Ki\u1ec3m tra tr\u1ea7n n\u1ed9i b\u1ed9"],
  INTERNAL_FLOOR_TEST: ["Internal floor test", "Ki\u1ec3m tra s\u00e0n n\u1ed9i b\u1ed9"],
  NO_INTERNAL_LEVEL_TEST: ["No internal level test", "Kh\u00f4ng c\u00f3 ki\u1ec3m tra m\u1ee9c n\u1ed9i b\u1ed9"],
  PRICE_AWAY_FROM_ROUND_NUMBER: ["Price is away from the round number", "Gi\u00e1 n\u1eb1m xa s\u1ed1 tr\u00f2n"],
  PULLBACK_REQUIRES_CONSECUTIVE_CLOSED_M5_BARS: ["Pullback requires consecutive closed M5 bars", "H\u1ed3i gi\u00e1 c\u1ea7n c\u00e1c n\u1ebfn M5 \u0111\u00f3ng li\u00ean ti\u1ebfp"],
  REVERSAL_REQUIRES_CONSECUTIVE_CLOSED_M5_BARS: ["Reversal requires consecutive closed M5 bars", "\u0110\u1ea3o chi\u1ec1u c\u1ea7n c\u00e1c n\u1ebfn M5 \u0111\u00f3ng li\u00ean ti\u1ebfp"],
  PULLBACK_SIGNAL_BREAK_NOT_CLOSE_CONFIRMED: ["Pullback break is not close-confirmed", "Ph\u00e1 v\u1ee1 h\u1ed3i gi\u00e1 ch\u01b0a \u0111\u01b0\u1ee3c x\u00e1c nh\u1eadn b\u1eb1ng gi\u00e1 \u0111\u00f3ng c\u1eeda"],
  REVERSAL_SIGNAL_BREAK_NOT_CLOSE_CONFIRMED: ["Reversal break is not close-confirmed", "Ph\u00e1 v\u1ee1 \u0111\u1ea3o chi\u1ec1u ch\u01b0a \u0111\u01b0\u1ee3c x\u00e1c nh\u1eadn b\u1eb1ng gi\u00e1 \u0111\u00f3ng c\u1eeda"],
  NO_PRIOR_PATTERN_BOUNDARY_BREAK: ["No prior pattern boundary break", "Kh\u00f4ng c\u00f3 ph\u00e1 bi\u00ean m\u00f4 h\u00ecnh tr\u01b0\u1edbc \u0111\u00f3"],
  NO_PREPARED_POST_BREAK_PULLBACK_VARIANT: ["No prepared post-break pullback variant", "Kh\u00f4ng c\u00f3 bi\u1ebfn th\u1ec3 h\u1ed3i gi\u00e1 sau ph\u00e1 v\u1ee1 \u0111\u01b0\u1ee3c chu\u1ea9n b\u1ecb"],
  PULLBACK_SIGNAL_HAS_NOT_TESTED_EMA25_AREA: ["Pullback signal has not tested the EMA25 area", "T\u00edn hi\u1ec7u h\u1ed3i gi\u00e1 ch\u01b0a ki\u1ec3m tra v\u00f9ng EMA25"],
  INSUFFICIENT_PULLBACK_EMA_CONTEXT: ["Insufficient pullback EMA context", "Thi\u1ebfu b\u1ed1i c\u1ea3nh EMA c\u1ee7a h\u1ed3i gi\u00e1"],
  INSUFFICIENT_REVERSAL_EMA_CONTEXT: ["Insufficient reversal EMA context", "Thi\u1ebfu b\u1ed1i c\u1ea3nh EMA c\u1ee7a \u0111\u1ea3o chi\u1ec1u"],
  AMBIGUOUS_PULLBACK_CONFIRMATION_BAR: ["Pullback confirmation bar is ambiguous", "N\u1ebfn x\u00e1c nh\u1eadn h\u1ed3i gi\u00e1 kh\u00f4ng r\u00f5 r\u00e0ng"],
  AMBIGUOUS_REVERSAL_CONFIRMATION_BAR: ["Reversal confirmation bar is ambiguous", "N\u1ebfn x\u00e1c nh\u1eadn \u0111\u1ea3o chi\u1ec1u kh\u00f4ng r\u00f5 r\u00e0ng"],
};

const reasonLabel = (reason: string, locale: Locale) => {
  const labels = REASON_LABELS[reason];
  if (labels) return labels[locale === "vi" ? 1 : 0];
  const dynamic = [
    [/^(SUPPORT|RESISTANCE)_ROLE_TEST_(\d+)_TOUCHES$/, (match: RegExpMatchArray) => locale === "vi"
      ? `${match[1] === "SUPPORT" ? "Ki\u1ec3m tra vai tr\u00f2 h\u1ed7 tr\u1ee3" : "Ki\u1ec3m tra vai tr\u00f2 kh\u00e1ng c\u1ef1"} \u00b7 ${match[2]} l\u1ea7n ch\u1ea1m`
      : `${match[1] === "SUPPORT" ? "Support" : "Resistance"} role test \u00b7 ${match[2]} touches`],
    [/^(UP|DOWN)_SWING_STRUCTURE_(\d+)_STEPS$/, (match: RegExpMatchArray) => locale === "vi"
      ? `C\u1ea5u tr\u00fac nh\u1ecbp ${match[1] === "UP" ? "t\u0103ng" : "gi\u1ea3m"} \u00b7 ${match[2]} b\u01b0\u1edbc`
      : `${match[1] === "UP" ? "Up" : "Down"} swing structure \u00b7 ${match[2]} steps`],
    [/^(UP|DOWN)_(BREAK_AND_FOLLOW_THROUGH|TEASE_RETEST_SECOND_BREAK|OPPOSITE_BREAK_AFTER_FAILED_NEIGHBOR)$/, (match: RegExpMatchArray) => locale === "vi"
      ? `${match[1] === "UP" ? "Ph\u00e1 v\u1ee1 t\u0103ng" : "Ph\u00e1 v\u1ee1 gi\u1ea3m"} \u00b7 ${match[2].toLowerCase().replace(/_/g, " ")}`
      : `${match[1] === "UP" ? "Up" : "Down"} ${match[2].toLowerCase().replace(/_/g, " ")}`],
  ] as const;
  for (const [pattern, format] of dynamic) {
    const match = reason.match(pattern);
    if (match) return format(match);
  }
  const localizedReasons: Record<string, string> = {
    NO_DIRECTIONAL_POWERBAR: "Kh\u00f4ng c\u00f3 n\u1ebfn l\u1ef1c theo h\u01b0\u1edbng",
    NO_ALIGNED_PATTERN_PRESSURE: "Kh\u00f4ng c\u00f3 \u00e1p l\u1ef1c m\u00f4 h\u00ecnh \u0111\u1ed3ng h\u01b0\u1edbng",
    NO_UNRETIRED_CONFIRMED_SWING_AHEAD_IN_LOCAL_CONTEXT: "Kh\u00f4ng c\u00f3 nh\u1ecbp x\u00e1c nh\u1eadn ch\u01b0a b\u1ecb ph\u00e1 \u1edf ph\u00eda tr\u01b0\u1edbc trong b\u1ed1i c\u1ea3nh c\u1ee5c b\u1ed9",
    NO_DIRECTIONAL_END_INSIDE_BAR_TENSION: "Kh\u00f4ng c\u00f3 \u00e1p l\u1ef1c h\u01b0\u1edbng trong v\u00f9ng n\u1ebfn n\u1eb1m b\u00ean trong",
    NO_COMPACT_ALTERNATING_BOUNDARY_BUILDUP: "Kh\u00f4ng c\u00f3 t\u00edch l\u0169y lu\u00e2n phi\u00ean g\u1ecdn t\u1ea1i bi\u00ean",
    NO_TURNAROUND_SIGNAL_AT_BROKEN_BARRIER: "Kh\u00f4ng c\u00f3 t\u00edn hi\u1ec7u \u0111\u1ea3o chi\u1ec1u t\u1ea1i bi\u00ean \u0111\u00e3 ph\u00e1",
  };
  if (locale === "vi" && localizedReasons[reason]) return localizedReasons[reason];
  const readable = reason.toLowerCase().replace(/_/g, " ");
  return locale === "vi" ? `Chi ti\u1ebft quan s\u00e1t: ${readable}` : readable;
};

const conceptName = (conceptId: string, locale: Locale) => {
  if (locale === "vi" && VI_NAMES[conceptId]) return VI_NAMES[conceptId];
  return getPriceActionKnowledge(conceptId)?.name || conceptId;
};

const reasonText = (observation: PdfSignalObservation, locale: Locale) => {
  const reason = reasonLabel(observation.reason, locale);
  return locale === "vi" ? `L\u00fd do quan s\u00e1t: ${reason} \u00b7 ${stateLabel(observation.state, locale)}` : reason;
};

export function PdfSignalCoverageShelf({
  result,
  verification,
  locale,
  onSelect,
}: {
  result: PdfSignalDetectorResult | null;
  verification?: PdfSignalVerificationReceipt | null;
  locale: Locale;
  onSelect?: (conceptId: string) => void;
}) {
  if (!result) return null;
  const summary = locale === "vi"
    ? `\u0110\u00e3 ki\u1ec3m tra ${result.counts.total}/23 t\u00edn hi\u1ec7u PDF \u00b7 nh\u1eadn di\u1ec7n ${result.counts.detected} \u00b7 t\u1ea1m d\u1eebng ${result.counts.abstain} \u00b7 thi\u1ebfu d\u1eef li\u1ec7u ${result.counts.unavailable} \u00b7 gi\u1eef l\u1ea1i ${result.counts.withheld}`
    : `Checked ${result.counts.total}/23 PDF signals \u00b7 detected ${result.counts.detected} \u00b7 abstain ${result.counts.abstain} \u00b7 unavailable ${result.counts.unavailable} \u00b7 withheld ${result.counts.withheld}`;
  const title = locale === "vi" ? "Ph\u1ee7 \u0111\u1ee7 t\u00edn hi\u1ec7u PDF \u00b7 XAUUSD M5" : "PDF signal coverage \u00b7 XAUUSD M5";
  const note = locale === "vi"
    ? "C\u00e1c \u00f4 d\u01b0\u1edbi \u0111\u00e2y l\u00e0 quan s\u00e1t n\u1ebfn \u0111\u00f3ng theo nh\u00e2n qu\u1ea3. Kh\u00f4ng \u00f4 n\u00e0o l\u00e0 l\u1ec7nh, kh\u1edbp l\u1ec7nh hay d\u1ef1 b\u00e1o."
    : "These are causal closed-bar observations. No tile is an order, fill or forecast.";
  const verificationLabel = verification
    ? locale === "vi"
      ? `Ki\u1ec3m ch\u1ee9ng h\u1ee3p \u0111\u1ed3ng: ${verification.state} \u00b7 l\u1eb7p x\u00e1c \u0111\u1ecbnh ${verification.deterministicRepeat ? "\u0111\u1ea1t" : "gi\u1eef l\u1ea1i"} \u00b7 kh\u00f4ng \u0111\u1ed5i khi th\u00eam n\u1ebfn t\u01b0\u01a1ng lai ${verification.futureRowInvariant ? "\u0111\u1ea1t" : "gi\u1eef l\u1ea1i"} \u00b7 ngu\u1ed3n ${verification.source}`
      : `Contract verification: ${verification.state} \u00b7 deterministic repeat ${verification.deterministicRepeat ? "PASS" : "WITHHELD"} \u00b7 future-row invariant ${verification.futureRowInvariant ? "PASS" : "WITHHELD"} \u00b7 source ${verification.source}`
    : null;
  const resultReason = reasonLabel(result.reason, locale);
  return <section className="m5-pdf-coverage-shelf" data-pdf-coverage="23" aria-labelledby="m5-pdf-coverage-title">
    <div className="m5-pdf-coverage-head">
      <div>
        <h2 id="m5-pdf-coverage-title">{title}</h2>
        <p>{summary}</p>
      </div>
      <span>SHADOW_ONLY {String.fromCharCode(183)} NO_DECISION</span>
    </div>
    <p className="m5-pdf-coverage-note">{note}</p>
    {verificationLabel && <small className="m5-pdf-coverage-verification" role="status" aria-live="polite" aria-atomic="true">{verificationLabel}</small>}
    <div className="m5-pdf-coverage-grid" role="group" aria-label={locale === "vi" ? "Tr\u1ea1ng th\u00e1i 23 t\u00edn hi\u1ec7u PDF" : "Status of all 23 PDF signals"}>
      {result.observations.map((observation) => {
        const localizedState = stateLabel(observation.state, locale);
        const content = <><strong>{conceptName(observation.conceptId, locale)}</strong><span className={`m5-pdf-coverage-state state-${observation.state.toLowerCase()}`}>{localizedState}</span><small>{reasonText(observation, locale)}</small></>;
        const inspectionReason = reasonText(observation, locale);
        return onSelect
          ? <button type="button" key={observation.conceptId} className="m5-pdf-coverage-tile" onClick={() => onSelect(observation.conceptId)} aria-label={`${conceptName(observation.conceptId, locale)}; ${localizedState}; ${inspectionReason}`} data-pdf-concept={observation.conceptId} data-pdf-state={observation.state}>{content}</button>
          : <div key={observation.conceptId} className="m5-pdf-coverage-tile" aria-label={`${conceptName(observation.conceptId, locale)}; ${localizedState}; ${inspectionReason}`} data-pdf-concept={observation.conceptId} data-pdf-state={observation.state}>{content}</div>;
      })}
    </div>
    <small className="m5-pdf-coverage-authority">{resultReason} {"\u00b7"} {result.authority}</small>
  </section>;
}
