import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import { patternFailureSelectionContext } from "../lib/patternFailureSelectionContext.ts";

const price = (value: number | null) => value == null ? "Unavailable" : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Render the source-only failure-selection context without qualifying a trade. */
export function PatternFailureSelectionEvidence({ bars, occurrenceTime, direction, enabled }: {
  bars: readonly OhlcBar[];
  occurrenceTime: string;
  direction: string;
  enabled: boolean;
}) {
  const normalizedDirection = direction === "UP" || direction === "DOWN" || direction === "NEUTRAL" ? direction : "NEUTRAL";
  const receipt = patternFailureSelectionContext(bars, occurrenceTime, normalizedDirection, enabled);
  const unavailable = receipt.state !== "AVAILABLE";
  return <section className="pattern-failure-selection-evidence" aria-label="Failure-selection context receipt" data-receipt-state={receipt.state}>
    <h3>Failure-selection context receipt</h3>
    <p role="status" aria-live="polite" aria-atomic="true">{unavailable ? `Context ${receipt.state.toLowerCase()}: ${receipt.reason.replace(/_/g, " ").toLowerCase()}.` : "Causal prefix context available for descriptive review."}</p>
    {!unavailable && <>
      <p>{receipt.causalPrefix.bars} consecutive closed M5 bars | {receipt.causalPrefix.start} to {receipt.causalPrefix.end} UTC.</p>
      <p>Selected candle O {price(receipt.observations.selectedCandle.open)} | H {price(receipt.observations.selectedCandle.high)} | L {price(receipt.observations.selectedCandle.low)} | C {price(receipt.observations.selectedCandle.close)}.</p>
      <p>Prior causal range {price(receipt.observations.priorRange.low)} - {price(receipt.observations.priorRange.high)} | close inside range: {receipt.observations.closeInsidePriorRange.toLowerCase().replace(/_/g, " ")}.</p>
    </>}
    <p className="chart-pattern-inspector-muted">The PDF's selective counterbreak and failure label remain SOURCE_REVIEW_ONLY. Data {receipt.dataStatus}; outcome {receipt.outcomeStatus}. No source qualification, detector change, denominator, rate, fill, order or live apply is inferred.</p>
    <p className="chart-pattern-inspector-muted">{receipt.authority}</p>
  </section>;
}

