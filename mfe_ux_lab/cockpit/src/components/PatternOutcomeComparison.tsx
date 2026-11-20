import type { PatternInspectionView } from "../lib/patternInspectionWindow.ts";
import { patternOutcomeComparison } from "../lib/patternOutcomeComparison.ts";

export function PatternOutcomeComparison({ view }: { view: PatternInspectionView }) {
  const comparison = patternOutcomeComparison(view);
  return <section className="pattern-outcome-comparison" aria-label="Selected occurrence outcome comparison" data-comparison-state={comparison.state}>
    <h3>Selected occurrence: two outcome lenses</h3>
    <dl className="chart-pattern-inspector-prices">
      <div><dt>Raw H+1 direction</dt><dd data-next-bar-outcome={comparison.nextBar ?? "UNAVAILABLE"} data-next-bar-agreement={comparison.nextBarAgreement}>{comparison.nextBarLabel}<br />{comparison.nextBarAgreementLabel}</dd></div>
      <div><dt>Local ATR barrier path</dt><dd data-barrier-outcome={comparison.barrierState ?? "UNAVAILABLE"} data-barrier-resolution={comparison.barrierResolution}>{comparison.barrierLabel}{comparison.observedBars != null && comparison.horizon != null ? <><br />{comparison.observedBars}/{comparison.horizon} bars observed</> : ""}{comparison.resolvedAt ? <><br />Candle {comparison.resolvedAt} UTC</> : ""}</dd></div>
    </dl>
    <p className="chart-pattern-inspector-muted">{comparison.explanation}</p>
    <p className="chart-pattern-inspector-muted">Raw H+1 compares the adjacent closed M5 close with the setup close. Named-candle H+1 classes can use a separate ATR flat band. Same-candle double touches remain unresolved when OHLC cannot establish first-touch order.</p>
    <p className="chart-pattern-inspector-muted">The barrier lens is a local descriptive policy (2.2 ATR target / 1 ATR invalidation). It is separate from PDF source setup meaning, source execution rules, and any fill or order.</p>
    <p className="chart-pattern-inspector-muted">{comparison.authority} · live_apply_allowed=false</p>
    <p className="pattern-outcome-comparison-status" role="status" aria-live="polite" aria-atomic="true">{comparison.nextBarLabel}; {comparison.barrierLabel}.</p>
  </section>;
}
