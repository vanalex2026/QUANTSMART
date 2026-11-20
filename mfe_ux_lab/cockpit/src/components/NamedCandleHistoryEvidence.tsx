import type { NamedCandleHistory } from "../lib/namedCandleHistory.ts";

/**
 * Raw-count Wilson 95% interval for the observed H+1 directional rate.
 * Occurrences may overlap, so this is descriptive uncertainty around the
 * observed rows, not an independent-event or trading-performance guarantee.
 */
export function wilson95(successes: number, observed: number): { lower: number; upper: number } | null {
  if (!Number.isFinite(successes) || !Number.isFinite(observed) || observed <= 0) return null;
  const n = Math.max(1, observed);
  const p = Math.max(0, Math.min(1, successes / n));
  const z = 1.959963984540054;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / denominator;
  return { lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
}

export function NamedCandleHistoryEvidence({ evidence }: { evidence: NamedCandleHistory }) {
  if (!evidence.ok) return <p role="status">Named-candle history unavailable: {evidence.reason}.</p>;
  const number = (value: number) => value.toLocaleString();
  const directional = evidence.direction === "UP" || evidence.direction === "DOWN";
  const wins = evidence.direction === "UP" ? evidence.counts.UP : evidence.direction === "DOWN" ? evidence.counts.DOWN : 0;
  const interval = directional ? wilson95(wins, evidence.observed) : null;
  const rate = directional && evidence.observed > 0 ? wins / evidence.observed : null;
  return <div className="named-candle-history-evidence" aria-label="Full retained named candle history">
    <strong>{number(evidence.occurrences)} matching occurrences across retained history</strong>
    <p>{number(evidence.evaluated)} valid setup endpoints / {number(evidence.totalBars)} retained M5 candles; {number(evidence.excludedSetups)} setup windows excluded for missing, invalid or forming context.</p>
    <p>Observed H+1: UP {number(evidence.counts.UP)} / FLAT {number(evidence.counts.FLAT)} / DOWN {number(evidence.counts.DOWN)}.</p>
    <p>{rate == null ? "Directional hit rate unavailable for neutral shapes or missing outcomes." : `${evidence.direction} next-bar hit rate ${(rate * 100).toFixed(1)}% over ${number(evidence.observed)} observed outcomes.`}</p>
    {interval && <p>{`Raw observed-count Wilson 95% interval: ${(interval.lower * 100).toFixed(1)}–${(interval.upper * 100).toFixed(1)}% (denominator ${number(evidence.observed)}).`}</p>}
    <p className="chart-pattern-inspector-muted">H+1 is FLAT within +/-0.12 setup ATR14. Outcome missing: tail {number(evidence.unavailable.TAIL)}, gap {number(evidence.unavailable.GAP)}, invalid {number(evidence.unavailable.INVALID)}, forming {number(evidence.unavailable.FORMING)}. These occurrences remain browsable and are excluded from the hit-rate denominator.</p>
    <p className="chart-pattern-inspector-muted">Exhaustive evaluable taxonomy matches in the retained two-year tape; no similarity filter or 60-match cap. Occurrences may overlap. The raw-count interval is not adjusted for overlap and may understate uncertainty. This is descriptive candle-shape evidence, separate from causal analogue forecasts, the PDF's setups and target-before-invalidation outcomes.</p>
  </div>;
}
