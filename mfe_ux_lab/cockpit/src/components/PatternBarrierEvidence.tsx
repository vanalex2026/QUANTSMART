import { useMemo, useState } from "react";
import type { PriceActionConceptEvidence } from "../lib/priceActionDetector.ts";
import { BARRIER_HORIZON, BARRIER_OUTCOME_LABELS, measurePatternBarrierOutcomes, patternBarrierOutcome, type BarrierBar } from "../lib/patternBarrierOutcomes.ts";
import { TECHNICAL_OBSTACLE_HORIZON, TECHNICAL_OBSTACLE_OUTCOME_LABELS, TECHNICAL_SETUP_KINDS, measurePatternTechnicalObstacleOutcomes, patternTechnicalObstacleOutcome } from "../lib/patternTechnicalObstacleOutcomes.ts";
import type { PriceActionSetup } from "../lib/priceActionSetup.ts";

const number = (value: number) => value.toLocaleString();

export function PatternBarrierEvidence({ bars, evidence, selectedIndex, direction, allowGeometry, setup }: {
  bars: readonly BarrierBar[]; evidence: PriceActionConceptEvidence;
  selectedIndex: number; direction: string; allowGeometry: boolean; setup?: PriceActionSetup;
}) {
  const [open, setOpen] = useState(false);
  // Aggregate the full retained tape only after the user opens this study.
  const summary = useMemo(() => open ? measurePatternBarrierOutcomes(bars, evidence.history) : null, [open, bars, evidence.history]);
  const selected = useMemo(() => open && allowGeometry ? patternBarrierOutcome(bars, selectedIndex, direction) : null, [open, bars, selectedIndex, direction, allowGeometry]);
  const technicalHistory = useMemo(() => evidence.history.filter((row) => row.setup && (TECHNICAL_SETUP_KINDS as readonly string[]).includes(row.setup.kind)), [evidence.history]);
  const technicalSummary = useMemo(() => open ? measurePatternTechnicalObstacleOutcomes(bars, technicalHistory) : null, [open, bars, technicalHistory]);
  const selectedTechnical = useMemo(() => open && allowGeometry ? patternTechnicalObstacleOutcome(bars, selectedIndex, direction, setup) : null, [open, bars, selectedIndex, direction, setup, allowGeometry]);
  return <details className="pattern-barrier-evidence" aria-label="Modeled target and invalidation outcomes" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>Target / invalidation study</summary>
    <p className="chart-pattern-inspector-muted">Open to measure the retained closed-bar barrier study. It is descriptive and does not create an order decision.</p>
    {open && summary && technicalSummary && <>
      <p className="chart-pattern-inspector-muted">Illustrative policy: entry at setup close, target 2.2 ATR, invalidation 1 ATR; observe the next {BARRIER_HORIZON} consecutive closed M5 bars (2 hours).</p>
      <p role="status" aria-live="polite" aria-atomic="true">Selected setup: <b>{selected ? BARRIER_OUTCOME_LABELS[selected.state] : "Directional geometry withheld for this source"}</b>{selected?.resolvedAt && <> at {selected.resolvedAt} UTC</>}</p>
      <strong>{summary.targetFirstRate == null ? "Insufficient resolved paths" : `${(summary.targetFirstRate * 100).toFixed(1)}% target-first rate`}</strong>
      <p>{number(summary.counts.TARGET_FIRST)} target first / {number(summary.resolved)} paths with known first touch; {number(summary.total)} measured occurrences total.</p>
      <p>Invalidation first {number(summary.counts.INVALIDATION_FIRST)}<br />Ambiguous same candle {number(summary.counts.AMBIGUOUS)}<br />No touch in 24 bars {number(summary.counts.TIMEOUT)}<br />Incomplete {number(summary.counts.INCOMPLETE)} ? Data gap {number(summary.counts.DATA_GAP)}<br />Invalid setup/data {number(summary.counts.INVALID_SETUP + summary.counts.INVALID_DATA)} ? Neutral {number(summary.counts.NEUTRAL)}</p>
      <p>LONG: {number(summary.sides.long.target)} target / {number(summary.sides.long.invalidation)} invalidation<br />SHORT: {number(summary.sides.short.target)} target / {number(summary.sides.short.invalidation)} invalidation</p>
      <p className="chart-pattern-inspector-muted">{number(summary.excluded)} unresolved or excluded paths are outside the rate denominator. Overlapping setups are separate observations. Same-candle order is not inferred.</p>
      <p className="chart-pattern-inspector-muted">OHLC barrier touches, without spread, fees, slippage or executable fills. This illustrative policy is separate from the PDF's discretionary setups and from next-bar direction accuracy.</p>
      <section className="pattern-technical-obstacle-evidence" aria-label="Technical protection and obstacle outcomes">
        <h3>Technical protection / obstacle study</h3>
        <p className="chart-pattern-inspector-muted">Separate source-grounded context study for implemented setup families. Entry is the recorded confirmation close; the opposing level is the setup technical protection reference; the adverse level is the nearest confirmed swing zone from the causal 96-bar room prefix. This does not alter the ATR study or make a trade decision.</p>
        <p role="status" aria-live="polite" aria-atomic="true">Selected setup: <b>{selectedTechnical ? TECHNICAL_OBSTACLE_OUTCOME_LABELS[selectedTechnical.state] : "Technical levels unavailable or withheld"}</b>{selectedTechnical?.resolvedAt && <> at {selectedTechnical.resolvedAt} UTC</>}</p>
        <strong>{technicalSummary.obstacleFirstRate == null ? "Insufficient resolved technical-level paths" : `${(technicalSummary.obstacleFirstRate * 100).toFixed(1)}% obstacle-first rate`}</strong>
        <p>{technicalSummary.counts.OBSTACLE_FIRST} obstacle first / {technicalSummary.resolved} paths with known first touch; {technicalSummary.total} setup observations total.</p>
        <p>Protection first {technicalSummary.counts.PROTECTION_FIRST}<br />Ambiguous same candle {technicalSummary.counts.AMBIGUOUS}<br />No touch in {TECHNICAL_OBSTACLE_HORIZON} bars {technicalSummary.counts.TIMEOUT}<br />Incomplete {technicalSummary.counts.INCOMPLETE} ? Data gap {technicalSummary.counts.DATA_GAP}<br />Unavailable levels {technicalSummary.counts.UNAVAILABLE} ? Invalid setup/data {technicalSummary.counts.INVALID_SETUP + technicalSummary.counts.INVALID_DATA}</p>
        <p className="chart-pattern-inspector-muted">Only resolved first touches enter the rate denominator. Same-candle order is unknown; missing/forming/gapped paths and unavailable technical levels remain excluded. SHADOW_ONLY / NO_DECISION.</p>
      </section>
    </>}
  </details>;
}
