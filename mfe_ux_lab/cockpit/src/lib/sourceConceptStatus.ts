import type { KnowledgeConcept } from "./priceActionKnowledge.ts";

export const SOURCE_REVIEW_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;

export type SourceConceptReviewStatus = {
  status: "SOURCE_REVIEW_ONLY";
  dataStatus: "UNAVAILABLE";
  outcomeStatus: "WITHHELD";
  authority: typeof SOURCE_REVIEW_AUTHORITY;
  label: "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD";
};

/**
 * Describe the evidence boundary for a source note without creating a local
 * detector, market-data fixture, or outcome claim.
 */
export function getSourceConceptReviewStatus(
  implementation: KnowledgeConcept["implementation"],
): SourceConceptReviewStatus | null {
  if (implementation !== "SOURCE_NOTES") return null;
  return {
    status: "SOURCE_REVIEW_ONLY",
    dataStatus: "UNAVAILABLE",
    outcomeStatus: "WITHHELD",
    authority: SOURCE_REVIEW_AUTHORITY,
    label: "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD",
  };
}
