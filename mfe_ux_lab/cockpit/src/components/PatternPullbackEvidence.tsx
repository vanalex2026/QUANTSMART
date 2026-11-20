import type { PullbackPressure } from "../lib/patternPullbackPressure.ts";
import { formatPriceActionSourcePages } from "../lib/priceActionSourcePages.ts";

const price = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function PatternPullbackEvidence({ pressure }: { pressure: PullbackPressure }) {
  return <section className="pattern-pullback-evidence" aria-label="Pullback strength and turn buildup" data-pullback-pressure={pressure.state}>
    <h3>Pullback strength and turn buildup</h3>
    {pressure.state === "WITHHELD" ? <p role="status">Measurement withheld: {pressure.reason.replace(/_/g, " ").toLowerCase()}.</p> : <>
      <p role="status">{pressure.correctionTimes.length} correction bar(s) after the directional extreme; {pressure.adverseBars} opposing body / {pressure.adversePowerBars} opposing powerbar(s). Terminal compact cluster: {pressure.terminalClusterTimes.length} bar(s).</p>
      <dl className="chart-pattern-inspector-prices">
        <div><dt>Return / local break leg</dt><dd>{pressure.retracementFraction == null ? "Unavailable" : `${(100 * pressure.retracementFraction).toFixed(1)}%`}</dd></div>
        <div><dt>Largest opposing body</dt><dd>{pressure.largestAdverseBodyUnits!.toFixed(2)} baseline ranges</dd></div>
        <div><dt>Longest opposing run</dt><dd>{pressure.longestAdverseRun} bar(s)</dd></div>
        <div><dt>Opposing close speed</dt><dd>{pressure.adverseCloseSpeed!.toFixed(2)} ranges / bar</dd></div>
        <div><dt>Opposing close efficiency</dt><dd>{(100 * pressure.adverseCloseEfficiency!).toFixed(1)}%</dd></div>
        <div><dt>Inside bars in final cluster</dt><dd>{pressure.terminalInsideBars}</dd></div>
        <div><dt>Body color changes in cluster</dt><dd>{pressure.terminalColorChanges}</dd></div>
      </dl>
      <p className="chart-pattern-inspector-muted">Local leg: {price(pressure.localLegOrigin!)} at {pressure.localLegStart} to {price(pressure.peakPrice!)} at {pressure.peakTime} UTC. Deepest subsequent return {price(pressure.returnExtreme!)} at {pressure.returnExtremeTime} UTC. The leg starts at the opposite extreme of the six pre-break candles; it is not the full source-chart swing.</p>
      <p className="chart-pattern-inspector-muted">Baseline {price(pressure.baseline!)} = median range of those six candles. Opposing powerbar: range at least 1.25 baseline, body at least 60%, close in the adverse outer 25%. Efficiency is adverse net close movement / total absolute close movement after the directional extreme; wicks measure return depth separately.</p>
      <p className="chart-pattern-inspector-muted">A compact cluster ends at the signal, spans at most 1.3 baseline ranges and has at least 50% adjacent range overlap. It excludes the confirmation candle. {pressure.terminalClusterTimes.length ? `Outlined: ${pressure.terminalClusterTimes[0]} to ${pressure.signalTime} UTC.` : "No compact terminal cluster was measured."}</p>
    </>}
    <p className="chart-pattern-inspector-muted">Source principle: stronger pullbacks may need more fighting before their turn. {formatPriceActionSourcePages(pressure.sourcePages)}. These local measurements describe pressure and buildup; they do not rate a setup, filter history or establish an entry.</p>
  </section>;
}
