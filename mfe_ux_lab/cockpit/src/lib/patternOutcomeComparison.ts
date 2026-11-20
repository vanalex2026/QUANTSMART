import type { PatternInspectionView } from "./patternInspectionWindow.ts";
import { BARRIER_OUTCOME_LABELS, type BarrierOutcome } from "./patternBarrierOutcomes.ts";

export type PatternOutcomeComparisonState = "BOTH_AVAILABLE" | "NEXT_BAR_ONLY" | "BARRIER_ONLY" | "UNAVAILABLE" | "WITHHELD_CONTEXT";
export type PatternNextBarAgreement = "MATCH" | "OPPOSED" | "FLAT" | "NEUTRAL" | "UNAVAILABLE";

export interface PatternOutcomeComparison {
  state: PatternOutcomeComparisonState;
  nextBar: PatternInspectionView["outcome"];
  nextBarLabel: string;
  nextBarAgreement: PatternNextBarAgreement;
  nextBarAgreementLabel: string;
  barrierState: BarrierOutcome | null;
  barrierLabel: string;
  barrierResolution: "RESOLVED" | "UNRESOLVED" | "WITHHELD";
  observedBars: number | null;
  horizon: number | null;
  resolvedAt: string | null;
  explanation: string;
  authority: "SHADOW_ONLY / NO_DECISION";
}

/**
 * Present the two already-computed selected-occurrence observations side by
 * side. This helper deliberately does not scan bars or recompute a barrier:
 * `view.outcome` is the adjacent closed-bar observation and `view.study` is
 * the bounded ATR study produced by the inspection-window contract.
 */
export function patternOutcomeComparison(view: Pick<PatternInspectionView, "outcome" | "direction" | "study" | "mode">): PatternOutcomeComparison {
  if (view.mode === "context") return {
    state: "WITHHELD_CONTEXT", nextBar: null,
    nextBarLabel: "Outcome observations hidden in context mode",
    nextBarAgreement: "UNAVAILABLE", nextBarAgreementLabel: "Switch to Setup or Outcome path to inspect them",
    barrierState: null, barrierLabel: "Target / invalidation path hidden in context mode",
    barrierResolution: "WITHHELD", observedBars: null, horizon: null, resolvedAt: null,
    explanation: "Outcome observations are hidden in context mode; switch to setup or outcome path to compare them. Context mode ends at the setup close, so wider context remains causal.",
    authority: "SHADOW_ONLY / NO_DECISION",
  };
  const nextBar = view.outcome;
  const barrier = view.study;
  const hasNextBar = nextBar != null;
  const hasBarrier = barrier != null;
  const state: PatternOutcomeComparisonState = hasNextBar && hasBarrier
    ? "BOTH_AVAILABLE"
    : hasNextBar
      ? "NEXT_BAR_ONLY"
      : hasBarrier
        ? "BARRIER_ONLY"
        : "UNAVAILABLE";
  const barrierState = barrier?.state ?? null;
  const barrierLabel = barrierState ? BARRIER_OUTCOME_LABELS[barrierState] : "Target / invalidation path unavailable or withheld";
  const barrierResolution = barrierState === "TARGET_FIRST" || barrierState === "INVALIDATION_FIRST"
    ? "RESOLVED" : hasBarrier ? "UNRESOLVED" : "WITHHELD";
  const nextBarLabel = nextBar ?? "Next closed-bar direction unavailable or withheld";
  const nextBarAgreement: PatternNextBarAgreement = !hasNextBar ? "UNAVAILABLE" : view.direction === "NEUTRAL" ? "NEUTRAL"
    : nextBar === "FLAT" ? "FLAT" : nextBar === view.direction ? "MATCH" : "OPPOSED";
  const nextBarAgreementLabel = {
    MATCH: "Agrees with setup direction",
    OPPOSED: "Opposes setup direction",
    FLAT: "Unchanged close; no directional match",
    NEUTRAL: "Neutral setup; no directional hit claim",
    UNAVAILABLE: "No adjacent closed-bar observation",
  }[nextBarAgreement];
  const distinctResult = nextBarAgreement === "MATCH" && barrierState === "INVALIDATION_FIRST"
    ? "The next close agrees with the setup direction, yet invalidation was touched first."
    : nextBarAgreement === "OPPOSED" && barrierState === "TARGET_FIRST"
      ? "The next close opposes the setup direction, yet the target was touched first."
      : nextBarAgreement === "MATCH" && barrierResolution === "UNRESOLVED"
        ? "The next close agrees with the setup direction, but the target-before-invalidation result remains unresolved."
        : "The next-bar direction and target-before-invalidation result answer different questions.";
  const explanation = state === "BOTH_AVAILABLE"
    ? `${distinctResult} A matching H+1 direction does not establish a target touch, and a barrier result does not rewrite H+1.`
    : state === "NEXT_BAR_ONLY"
      ? "Only the adjacent closed-bar direction is available. A next-bar result is not a target-before-invalidation result; the local ATR path is unavailable or withheld."
      : state === "BARRIER_ONLY"
        ? "The local ATR path is available, but the adjacent closed-bar direction is unavailable or crosses a continuity boundary. The barrier result does not supply a missing H+1 observation."
        : "Neither selected-occurrence observation is available. No next-bar direction or target-before-invalidation result is inferred.";
  return {
    state,
    nextBar,
    nextBarLabel,
    nextBarAgreement,
    nextBarAgreementLabel,
    barrierState,
    barrierLabel,
    barrierResolution,
    observedBars: barrier?.observedBars ?? null,
    horizon: barrier?.horizon ?? null,
    resolvedAt: barrier?.resolvedAt ?? null,
    explanation,
    authority: "SHADOW_ONLY / NO_DECISION",
  };
}
