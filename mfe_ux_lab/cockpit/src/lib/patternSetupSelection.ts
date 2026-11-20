import type { PriceActionSetup } from "./priceActionSetup.ts";
import type { PatternMarketContext } from "./patternMarketContext.ts";

/**
 * A descriptive review lens for a detected setup.  This is deliberately kept
 * separate from the detector and from outcome studies: it can describe why a
 * setup deserves closer source review without removing it from the census or
 * granting entry authority.
 */
export type PatternSetupSelection = {
  version: "pattern-setup-selection/1";
  state: "WITHHELD" | "MEASURED";
  reason: string;
  strength: "STRONG_GEOMETRY" | "MODERATE_GEOMETRY" | "WEAK_GEOMETRY" | "UNKNOWN";
  detectorScore: number | null;
  pressureAgreement: "ALIGNED" | "OPPOSING" | "CONFLICTING_OR_UNCLEAR" | "UNAVAILABLE";
  context: "ALIGNED_WITH_SWINGS" | "OPPOSING_SWINGS" | "RANGE_EDGE_CONCERN" | "MIXED_OR_UNCLEAR" | "UNAVAILABLE";
  lens: "ALIGNED_STRONG_REVIEW" | "ALIGNED_REVIEW" | "COUNTER_DOMINANCE_REVIEW" | "RANGE_EDGE_REVIEW" | "PRESSURE_CONFLICT_REVIEW" | "MIXED_CONTEXT_REVIEW" | "UNAVAILABLE";
  authority: "SHADOW_ONLY / NO_DECISION";
};

const finiteScore = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;

/**
 * Compare a setup's bounded detector geometry with the causal wider-context
 * receipt.  Missing setup identity, unverified context, neutral direction and
 * non-finite scores all fail closed.  Thresholds are review-bucketing choices,
 * not source claims or acceptance criteria.
 */
export function patternSetupSelection(setup: PriceActionSetup | undefined, detectorScore: number | null | undefined, market: PatternMarketContext | null | undefined, enabled = true): PatternSetupSelection {
  const score = finiteScore(detectorScore);
  const base = (extra: Partial<PatternSetupSelection> = {}): PatternSetupSelection => ({
    version: "pattern-setup-selection/1",
    state: "WITHHELD",
    reason: "UNAVAILABLE_SETUP_SELECTION_CONTEXT",
    strength: "UNKNOWN",
    detectorScore: score,
    pressureAgreement: "UNAVAILABLE",
    context: "UNAVAILABLE",
    lens: "UNAVAILABLE",
    authority: "SHADOW_ONLY / NO_DECISION",
    ...extra,
  });
  if (!enabled) return base({ reason: "UNVERIFIED_CURRENT_EVIDENCE" });
  if (!setup) return base({ reason: "MISSING_SETUP_RECEIPT" });
  if (!market || market.state !== "MEASURED") return base({ reason: market?.reason || "WIDER_CONTEXT_WITHHELD" });
  if (setup.direction !== "UP" && setup.direction !== "DOWN") return base({ reason: "NEUTRAL_SETUP" });
  const instant = Date.parse(setup.confirmationTime);
  // The market receipt is an as-of snapshot. Its endpoint must identify the
  // same confirmation candle as the setup; checking only `market.time` would
  // let a stale context payload be relabelled and influence review buckets.
  const contextEnd = Date.parse(market.contextEnd ?? "");
  if (!Number.isFinite(instant) || Date.parse(market.time) !== instant || !Number.isFinite(contextEnd) || contextEnd !== instant || market.direction !== setup.direction) return base({ reason: "MISMATCHED_SETUP_CONTEXT_IDENTITY" });
  if (score == null) return base({ reason: "MISSING_DETECTOR_SCORE" });

  const sign = setup.direction === "UP" ? 1 : -1;
  const measuredPressure = market.emaSlope12Units != null && market.netCloseUnits != null && market.closeEfficiency != null && [market.emaSlope12Units, market.netCloseUnits, market.closeEfficiency].every(Number.isFinite);
  const pressureAgreement = !measuredPressure ? "UNAVAILABLE"
    : market.closeEfficiency! < .2 ? "CONFLICTING_OR_UNCLEAR"
      : sign * market.emaSlope12Units! >= .25 && sign * market.netCloseUnits! >= 1 ? "ALIGNED"
        : sign * market.emaSlope12Units! <= -.25 && sign * market.netCloseUnits! <= -1 ? "OPPOSING"
          : "CONFLICTING_OR_UNCLEAR";

  const strength = score >= 0.7 ? "STRONG_GEOMETRY" : score >= 0.45 ? "MODERATE_GEOMETRY" : "WEAK_GEOMETRY";
  const opposing = market.concerns.includes("OPPOSING_CONFIRMED_SWINGS");
  const edge = setup.direction === "UP"
    ? market.concerns.includes("UP_NEAR_REPEATED_CEILING")
    : market.concerns.includes("DOWN_NEAR_REPEATED_FLOOR");
  const aligns = setup.direction === "UP"
    ? market.swingProgression === "HIGHER_HIGHS_AND_LOWS"
    : market.swingProgression === "LOWER_HIGHS_AND_LOWS";
  const context = opposing ? "OPPOSING_SWINGS" : edge ? "RANGE_EDGE_CONCERN" : aligns ? "ALIGNED_WITH_SWINGS" : "MIXED_OR_UNCLEAR";
  const lens = opposing
    ? "COUNTER_DOMINANCE_REVIEW"
    : edge
      ? "RANGE_EDGE_REVIEW"
      : pressureAgreement === "OPPOSING"
        ? "PRESSURE_CONFLICT_REVIEW"
      : aligns && pressureAgreement === "ALIGNED" && strength === "STRONG_GEOMETRY"
        ? "ALIGNED_STRONG_REVIEW"
        : aligns
          ? "ALIGNED_REVIEW"
          : "MIXED_CONTEXT_REVIEW";
  return { ...base(), state: "MEASURED", reason: "CAUSAL_STRENGTH_AND_WIDER_CONTEXT", strength, detectorScore: score, pressureAgreement, context, lens };
}

