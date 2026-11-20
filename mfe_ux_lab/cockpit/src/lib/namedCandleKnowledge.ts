import { NAMED_CANDLE_PATTERNS, type NamedCandlePattern } from "./candlePatternAtlas.ts";

export type NamedCandleFamily = "SINGLE_CANDLE" | "TWO_CANDLE" | "THREE_CANDLE" | "MULTI_CANDLE";
export const NAMED_CANDLE_FAMILIES: readonly NamedCandleFamily[] = ["SINGLE_CANDLE", "TWO_CANDLE", "THREE_CANDLE", "MULTI_CANDLE"];

export interface NamedCandleKnowledge {
  pattern: NamedCandlePattern;
  family: NamedCandleFamily;
  structure: string;
  meaning: string;
  abstain: string;
}

/** Concise explanatory metadata for a family filter in the focused readout. */
export interface NamedCandleFamilyKnowledge {
  family: NamedCandleFamily;
  structure: string;
  meaning: string;
  abstain: string;
}

const familyKnowledge = (family: NamedCandleFamily, structure: string, meaning: string, abstain: string): NamedCandleFamilyKnowledge => ({ family, structure, meaning, abstain });

/** Family-level descriptions stay observational; they never create LONG/SHORT authority. */
export const NAMED_CANDLE_FAMILY_KNOWLEDGE: Record<NamedCandleFamily, NamedCandleFamilyKnowledge> = {
  SINGLE_CANDLE: familyKnowledge(
    "SINGLE_CANDLE",
    "One closed candle whose body and wick geometry supplies the named shape.",
    "Records an isolated pressure, rejection, balance, or compression observation in the closed-bar tape.",
    "Abstain from LONG/SHORT interpretation until follow-through, location, and surrounding context are available; no order authority.",
  ),
  TWO_CANDLE: familyKnowledge(
    "TWO_CANDLE",
    "An ordered pair of closed candles linked by body, range, containment, or gap relationships.",
    "Records a change in pressure or a short-term contraction/expansion sequence; the pair is descriptive evidence, not a forecast command.",
    "Abstain when the pair is incomplete, continuity is uncertain, or the next closed bar does not confirm the observed relationship; no order authority.",
  ),
  THREE_CANDLE: familyKnowledge(
    "THREE_CANDLE",
    "A three-candle sequence whose meaning depends on ordered bodies, gaps, and containment across the closed bars.",
    "Records a multi-step pressure, rejection, or continuation shape that needs context to distinguish transition from noise.",
    "Abstain from LONG/SHORT interpretation without complete sequence data, location, and later closed-bar follow-through; no order authority.",
  ),
  MULTI_CANDLE: familyKnowledge(
    "MULTI_CANDLE",
    "A longer ordered candle sequence with several bodies, ranges, and containment relationships.",
    "Records an extended continuation or pause structure in the historical tape; it is a descriptive family grouping only.",
    "Abstain when any sequence member, gap, or continuity check is missing, and never promote the family label to LONG/SHORT authority.",
  ),
};

export function getNamedCandleFamilyKnowledge(family?: string | null): NamedCandleFamilyKnowledge | null {
  if (!family || !(family in NAMED_CANDLE_FAMILY_KNOWLEDGE)) return null;
  return NAMED_CANDLE_FAMILY_KNOWLEDGE[family as NamedCandleFamily];
}

/** Stable setup orientation shared by visual and accessible evidence readouts. */
export function namedCandlePatternDirection(pattern: string): "UP" | "DOWN" | "NEUTRAL" {
  if (pattern.startsWith("BULLISH_") || ["HAMMER", "DRAGONFLY_DOJI", "INVERTED_HAMMER", "PIERCING_LINE", "MORNING_STAR", "THREE_WHITE_SOLDIERS", "THREE_INSIDE_UP", "THREE_OUTSIDE_UP", "TWEEZER_BOTTOM", "MATCHING_LOW"].includes(pattern)) return "UP";
  if (pattern.startsWith("BEARISH_") || ["HANGING_MAN", "SHOOTING_STAR", "GRAVESTONE_DOJI", "DARK_CLOUD_COVER", "EVENING_STAR", "THREE_BLACK_CROWS", "THREE_INSIDE_DOWN", "THREE_OUTSIDE_DOWN", "TWEEZER_TOP", "MATCHING_HIGH"].includes(pattern)) return "DOWN";
  return "NEUTRAL";
}

export interface NamedPatternDirectionalReadout {
  direction: "UP" | "DOWN" | "NEUTRAL";
  rate: number | null;
  interval95?: { lower: number; upper: number };
  reason: "OBSERVED" | "NEUTRAL_SETUP" | "NO_OBSERVED_H1";
}

/**
 * Resolve the Atlas row's orientation-aware H+1 rate without turning an
 * empirical-Bayes prior into observed pattern support.  Unseen patterns retain
 * their posterior distribution for context, but expose no directional rate.
 */
export interface NamedPatternDirectionalDistribution {
  sampleN: number;
  up: number;
  down: number;
  flat?: number;
  calibration?: { interval95: { up: { lower: number; upper: number }; down: { lower: number; upper: number } } };
}

export function namedPatternDirectionalReadout(
  pattern: string,
  prediction?: NamedPatternDirectionalDistribution | null,
): NamedPatternDirectionalReadout {
  const direction = namedCandlePatternDirection(pattern);
  if (direction === "NEUTRAL") return { direction, rate: null, reason: "NEUTRAL_SETUP" };
  if (!prediction || prediction.sampleN <= 0) return { direction, rate: null, reason: "NO_OBSERVED_H1" };
  const rate = direction === "UP" ? prediction.up : prediction.down;
  const interval95 = direction === "UP" ? prediction.calibration?.interval95.up : prediction.calibration?.interval95.down;
  return { direction, rate, interval95, reason: "OBSERVED" };
}

const directionFor = (pattern: NamedCandlePattern): "bullish" | "bearish" | "neutral" => {
  const direction = namedCandlePatternDirection(pattern);
  return direction === "UP" ? "bullish" : direction === "DOWN" ? "bearish" : "neutral";
};

export const namedCandleFamilyFor = (pattern: NamedCandlePattern): NamedCandleFamily => {
  if (["MORNING_STAR", "EVENING_STAR", "THREE_WHITE_SOLDIERS", "THREE_BLACK_CROWS", "THREE_INSIDE_UP", "THREE_INSIDE_DOWN", "THREE_OUTSIDE_UP", "THREE_OUTSIDE_DOWN", "RISING_THREE_METHODS", "FALLING_THREE_METHODS", "THREE_STARS_IN_SOUTH", "THREE_STARS_IN_NORTH", "ABANDONED_BABY_BULLISH", "ABANDONED_BABY_BEARISH", "BULLISH_STICK_SANDWICH", "BULLISH_TASUKI_GAP", "BEARISH_TASUKI_GAP"].includes(pattern)) return "THREE_CANDLE";
  if (["BULLISH_ENGULFING", "BEARISH_ENGULFING", "BULLISH_HARAMI", "BEARISH_HARAMI", "PIERCING_LINE", "DARK_CLOUD_COVER", "TWEEZER_BOTTOM", "TWEEZER_TOP", "INSIDE_BAR", "OUTSIDE_BAR", "BULLISH_KICKER", "BEARISH_KICKER", "MATCHING_LOW", "MATCHING_HIGH", "BULLISH_COUNTERATTACK", "BEARISH_COUNTERATTACK"].includes(pattern)) return "TWO_CANDLE";
  if (["BULLISH_MAT_HOLD", "BEARISH_MAT_HOLD"].includes(pattern)) return "MULTI_CANDLE";
  return "SINGLE_CANDLE";
};

const structureFor = (pattern: NamedCandlePattern): string => {
  if (pattern.includes("DOJI")) return "Open and close are near one another relative to the candle range; the wick arrangement gives the named variant its label.";
  if (pattern === "SPINNING_TOP") return "Small real body with meaningful upper and lower wicks, showing two-sided intrabar exploration.";
  if (pattern.includes("MARUBOZU")) return "Large directional body with little opposing wick, showing a strong one-sided close within the bar.";
  if (pattern.includes("BELT_HOLD")) return "A directional body opens near one end of the range and leaves limited wick on the open side.";
  if (["HAMMER", "HANGING_MAN"].includes(pattern)) return "Small body near the upper part of the range with a pronounced lower wick.";
  if (["SHOOTING_STAR", "INVERTED_HAMMER"].includes(pattern)) return "Small body near the lower part of the range with a pronounced upper wick.";
  if (pattern.includes("ENGULFING")) return "The later real body spans the prior real body with the named directional color relationship.";
  if (pattern.includes("HARAMI")) return "The later body is contained inside the prior body, creating a contraction after expansion.";
  if (pattern === "PIERCING_LINE" || pattern === "DARK_CLOUD_COVER") return "A two-candle reversal geometry where the second close crosses materially into the first candle's body.";
  if (pattern === "INSIDE_BAR") return "The later range is contained inside the prior range, marking compression rather than a completed breakout.";
  if (pattern === "OUTSIDE_BAR") return "The later range exceeds the prior range, marking expansion and unresolved follow-through.";
  if (pattern.includes("STAR") || pattern.includes("THREE_") || pattern.includes("METHODS") || pattern.includes("MAT_HOLD")) return "A multi-candle sequence whose meaning depends on the ordered bodies, gaps, and containment relationships.";
  return "A named OHLC geometry detected from closed candles using the Atlas definition; the label is descriptive, not an execution rule.";
};

const meaningFor = (pattern: NamedCandlePattern): string => {
  const direction = directionFor(pattern);
  if (direction === "neutral") return "Shows balance, compression, or two-sided rejection; direction remains unresolved until later closed-bar evidence is observed.";
  return `Records a ${direction} pressure or rejection shape in the closed-bar tape; it is a hypothesis about context, not a guaranteed continuation or reversal.`;
};

const abstainFor = (pattern: NamedCandlePattern): string => {
  if (pattern === "INSIDE_BAR" || pattern === "OUTSIDE_BAR") return "Abstain until a later closed bar establishes whether the range resolves; do not treat the pattern alone as a breakout entry.";
  if (directionFor(pattern) === "neutral") return "Abstain from LONG/SHORT interpretation without follow-through, location, and volatility context.";
  return "Abstain when the surrounding trend, session, continuity, or next-bar evidence is missing or conflicting.";
};

/** Complete, source-independent descriptive metadata for every Atlas label. */
export const NAMED_CANDLE_KNOWLEDGE = Object.fromEntries(
  NAMED_CANDLE_PATTERNS.map((pattern) => [pattern, {
    pattern,
    family: namedCandleFamilyFor(pattern),
    structure: structureFor(pattern),
    meaning: meaningFor(pattern),
    abstain: abstainFor(pattern),
  } satisfies NamedCandleKnowledge]),
) as Record<NamedCandlePattern, NamedCandleKnowledge>;

export function getNamedCandleKnowledge(pattern?: string | null): NamedCandleKnowledge | null {
  if (!pattern || !(pattern in NAMED_CANDLE_KNOWLEDGE)) return null;
  return NAMED_CANDLE_KNOWLEDGE[pattern as NamedCandlePattern];
}


