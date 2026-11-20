import type { LowVolatilityContext } from "../lib/patternLowVolatilityContext.ts";
import { formatPriceActionSourcePages } from "../lib/priceActionSourcePages.ts";
import { getSourceConceptReviewStatus } from "../lib/sourceConceptStatus.ts";

const stateLabel: Record<LowVolatilityContext["state"], string> = {
  WITHHELD: "Activity context withheld",
  LOW_ACTIVITY_CONTEXT: "Recent local activity is below its bounded baseline",
  TYPICAL_ACTIVITY_CONTEXT: "Recent local activity is not below its bounded baseline",
};

const formatNumber = (value: number | null, digits = 2) => value == null ? "Unavailable" : value.toFixed(digits);

/**
 * Render the low-activity receipt as a review aid. The receipt remains a
 * local descriptive measurement and never changes detector or outcome scope.
 */
export function PatternLowVolatilityEvidence({ context }: { context: LowVolatilityContext }) {
  const measured = context.state !== "WITHHELD" && context.activityRatio != null;
  const reviewStatus = getSourceConceptReviewStatus("SOURCE_NOTES")!;
  return <section className="pattern-low-volatility-evidence" aria-label="Local activity context" data-low-volatility-state={context.state}>
    <h3>Local activity context</h3>
    <p role="status">{stateLabel[context.state]}{context.state === "WITHHELD" ? `: ${context.reason.replace(/_/g, " ").toLowerCase()}.` : "."}</p>
    {measured && <>
      <p>{context.bars} consecutive closed M5 bars | {context.contextStart} to {context.contextEnd} UTC.{context.truncatedByGap ? " Earlier context stops at missing or invalid data." : ""}</p>
      <dl>
        <div><dt>Baseline median range</dt><dd>{formatNumber(context.baselineRange)}</dd></div>
        <div><dt>Recent median range</dt><dd>{formatNumber(context.recentRange)}</dd></div>
        <div><dt>Recent / baseline range</dt><dd>{formatNumber(context.activityRatio! * 100, 1)}%</dd></div>
        <div><dt>Recent directional efficiency</dt><dd>{formatNumber(context.recentDirectionalEfficiency! * 100, 1)}%</dd></div>
      </dl>
    </>}
    <p className="chart-pattern-inspector-muted">This local review compares the last {context.recentBars} closed bars with a preceding {context.baselineBars}-bar median range. The {context.lowActivityThreshold.toFixed(2)} threshold and efficiency readout are study choices for XAUUSD M5. They do not classify a source setup, filter history, change targets, or authorize an entry.</p>
    <p className="chart-pattern-inspector-muted" data-low-volatility-causal-prefix="true">Causal prefix: {context.causalPrefix.mode.replace(/_/g, " ")} | {context.causalPrefix.bars} closed M5 bars ending at {context.causalPrefix.end ?? "Unavailable"} UTC | local prefix data {context.causalPrefix.localDataStatus} | future rows {context.causalPrefix.futureRows.toLowerCase()} | {context.causalPrefix.sourceStatus} / data {context.causalPrefix.dataStatus} / outcome {context.causalPrefix.outcomeStatus} | {context.causalPrefix.authority} / live_apply_allowed={String(context.causalPrefix.live_apply_allowed)}</p>
    <p className="chart-pattern-inspector-muted">Source concept status: {reviewStatus.label}. {formatPriceActionSourcePages(context.sourcePages)}. Narrative source examples provide no XAUUSD OHLC or measured win rate.</p>
    <p className="chart-pattern-inspector-muted">{reviewStatus.authority}</p>
  </section>;
}
