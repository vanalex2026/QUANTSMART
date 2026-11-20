import { useEffect, useMemo, useRef, useState } from "react";
import type { PatternContextSelectionCensus, PatternContextSelectionBucket } from "../lib/patternContextSelectionCensus.ts";
import "./pattern-context-selection-evidence.css";

const BUCKETS: readonly PatternContextSelectionBucket[] = [
  "ALIGNED_STRONG_REVIEW", "ALIGNED_REVIEW", "COUNTER_DOMINANCE_REVIEW",
  "RANGE_EDGE_REVIEW", "PRESSURE_CONFLICT_REVIEW", "MIXED_CONTEXT_REVIEW", "UNAVAILABLE",
];
const bucketLabel: Record<PatternContextSelectionBucket, string> = {
  ALIGNED_STRONG_REVIEW: "Aligned strong review",
  ALIGNED_REVIEW: "Aligned review",
  COUNTER_DOMINANCE_REVIEW: "Counter dominance review",
  RANGE_EDGE_REVIEW: "Range edge review",
  PRESSURE_CONFLICT_REVIEW: "Pressure conflict review",
  MIXED_CONTEXT_REVIEW: "Mixed context review",
  UNAVAILABLE: "Unavailable",
};

type Row = {
  occurrenceTime: string;
  direction: "UP" | "DOWN" | "NEUTRAL";
  nextBar: "UP" | "DOWN" | "FLAT" | null;
  selection?: { lens?: PatternContextSelectionBucket; state?: string; reason?: string };
  reason?: string | null;
};
type Bucket = { occurrences: number; outcomes?: { up: number; down: number; flat: number }; wins?: number; denominator?: number; hitRate?: number | null };
type CensusView = PatternContextSelectionCensus & { unavailableOccurrences?: number };

const utcSort = (a: Row, b: Row) => {
  const aa = Date.parse(a.occurrenceTime), bb = Date.parse(b.occurrenceTime);
  return (Number.isFinite(aa) ? aa : Number.MAX_SAFE_INTEGER) - (Number.isFinite(bb) ? bb : Number.MAX_SAFE_INTEGER);
};

function alignedRate(rows: readonly Row[], bucket: Bucket): { wins: number; denominator: number; rate: number | null } {
  const fromModel = Number.isFinite(bucket.wins) && Number.isFinite(bucket.denominator);
  if (fromModel) return { wins: bucket.wins!, denominator: bucket.denominator!, rate: bucket.denominator! > 0 ? bucket.wins! / bucket.denominator! : null };
  const outcomes = bucket.outcomes ?? { up: 0, down: 0, flat: 0 };
  const denominator = outcomes.up + outcomes.down + outcomes.flat;
  const wins = rows.reduce((count, row) => count + ((row.direction === "UP" && row.nextBar === "UP") || (row.direction === "DOWN" && row.nextBar === "DOWN") ? 1 : 0), 0);
  return { wins, denominator, rate: denominator > 0 ? wins / denominator : null };
}

function statusText(status: string, census: CensusView | null): string {
  if (!census) return /error|fail/i.test(status) ? "Context selection evidence unavailable." : "Loading context selection evidence…";
  if (census.state === "WITHHELD" || /withheld|unavailable/i.test(status)) return `Context selection evidence withheld: ${census.reason.replace(/_/g, " ").toLowerCase()}.`;
  return status || "Measured context selection evidence.";
}

/** Read-only review-bucket census. It renders summaries and a bounded endpoint navigator, never markers or order controls. */
export function PatternContextSelectionEvidence({ census, status, onRetry, onInspect, selectedTime }: {
  census: PatternContextSelectionCensus | null;
  status: string;
  onRetry?: () => void;
  onInspect: (time: string) => void;
  selectedTime: string;
}) {
  const view = census as CensusView | null;
  const withheld = !view || view.state === "WITHHELD" || /error|fail|withheld|unavailable|loading|pending/i.test(status);
  const identity = withheld ? null : view.conceptId;
  const [filter, setFilter] = useState<{ identity: string | null; bucket: PatternContextSelectionBucket }>({ identity, bucket: "ALIGNED_STRONG_REVIEW" });
  useEffect(() => {
    if (filter.identity !== identity || withheld) setFilter({ identity, bucket: "ALIGNED_STRONG_REVIEW" });
  }, [identity, withheld]);
  const effectiveFilter = filter.identity === identity ? filter : { identity, bucket: "ALIGNED_STRONG_REVIEW" as PatternContextSelectionBucket };
  const bucket = effectiveFilter.bucket;
  const latest = useRef({ view, identity, bucket, selectedTime });
  latest.current = { view, identity, bucket, selectedTime };
  const rows = useMemo(() => ((view?.rows ?? []) as readonly Row[]).slice().sort(utcSort), [view?.rows]);
  const matchingRows = useMemo(() => rows.filter(row => (row.selection?.lens ?? "UNAVAILABLE") === bucket), [rows, bucket]);
  const currentIndex = matchingRows.findIndex(row => Date.parse(row.occurrenceTime) === Date.parse(selectedTime));
  const previousIndex = currentIndex >= 0 ? currentIndex - 1 : (() => { let index = -1; for (let i = 0; i < matchingRows.length; i++) if (Date.parse(matchingRows[i].occurrenceTime) < Date.parse(selectedTime)) index = i; return index; })();
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : matchingRows.findIndex(row => Date.parse(row.occurrenceTime) > Date.parse(selectedTime));
  const selectedEndpoint = currentIndex >= 0 ? matchingRows[currentIndex].occurrenceTime : selectedTime || "Unavailable";
  const bucketData = (view?.buckets?.[bucket] ?? { occurrences: 0 }) as Bucket;
  const rate = alignedRate(matchingRows, bucketData);
  const unavailable = view ? (view.unavailableOccurrences ?? Math.max(0, view.totalOccurrences - view.measuredOccurrences)) : 0;
  const reasonCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rows.filter(row => (row.selection?.lens ?? "UNAVAILABLE") === "UNAVAILABLE").forEach(row => {
      const reason = row.reason || row.selection?.reason || "UNAVAILABLE_EVIDENCE";
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    });
    return [...counts.entries()];
  }, [rows]);
  const inspectAt = (index: number) => {
    const row = matchingRows[index];
    if (row?.occurrenceTime && !withheld && latest.current.view === view && latest.current.identity === identity && latest.current.bucket === bucket && latest.current.selectedTime === selectedTime) onInspect(row.occurrenceTime);
  };
  const statusMessage = statusText(status, view);

  return <section className="pattern-context-selection-evidence" aria-label="Context selection evidence">
    <header className="pattern-context-selection-header">
      <h3>Context selection evidence</h3>
      <span className="pattern-context-selection-authority">SHADOW_ONLY / NO_DECISION</span>
    </header>
    <p className="pattern-context-selection-status" role={withheld ? "alert" : "status"} aria-live="polite" aria-atomic="true">{statusMessage}</p>
    {(!view || /error|fail/i.test(status)) && onRetry && <button type="button" onClick={onRetry}>Retry context evidence</button>}
    {view && !withheld && <>
      <p className="pattern-context-selection-reconciliation">Total {view.totalOccurrences.toLocaleString()} · measured {view.measuredOccurrences.toLocaleString()} · unavailable {unavailable.toLocaleString()} · {view.totalOccurrences === view.measuredOccurrences + unavailable ? "reconciled" : "reconciliation pending"}</p>
      {reasonCounts.length > 0 && <div className="pattern-context-selection-unavailable" role="group" aria-label="Unavailable evidence reasons"><strong>Unavailable reasons</strong>{reasonCounts.map(([reason, count]) => <span key={reason}>{reason.replace(/_/g, " ")} · {count.toLocaleString()}</span>)}</div>}
      <label className="pattern-context-selection-filter">Review bucket<select value={bucket} onChange={event => { if (latest.current.identity === identity) setFilter({ identity, bucket: event.target.value as PatternContextSelectionBucket }); }}>{BUCKETS.map(value => <option key={value} value={value}>{bucketLabel[value]}</option>)}</select></label>
      <div className="pattern-context-selection-buckets" role="list" aria-label="Review bucket summaries">{BUCKETS.map(value => {
        const data = (view.buckets?.[value] ?? { occurrences: 0 }) as Bucket;
        const bucketRows = rows.filter(row => (row.selection?.lens ?? "UNAVAILABLE") === value);
        const result = alignedRate(bucketRows, data);
        return <div role="listitem" key={value} className="pattern-context-selection-bucket"><strong>{bucketLabel[value]}</strong><span>{(data.occurrences ?? bucketRows.length).toLocaleString()} occurrences</span><span>Observed H+1 aligned-direction rate: {result.rate == null ? "Unavailable" : `${(result.rate * 100).toFixed(1)}% (${result.wins}/${result.denominator})`}</span></div>;
      })}</div>
      <div className="pattern-context-selection-navigation" role="group" aria-label="Matching occurrence navigation">
        <button type="button" onClick={() => inspectAt(0)} disabled={matchingRows.length === 0}>Earliest</button>
        <button type="button" onClick={() => inspectAt(previousIndex)} disabled={previousIndex < 0}>Previous</button>
        <span role="status" aria-live="polite" aria-atomic="true">{currentIndex >= 0 ? `${currentIndex + 1} of ${matchingRows.length}` : `No match of ${matchingRows.length}`} · endpoint {selectedEndpoint} · {matchingRows.length.toLocaleString()} matching</span>
        <button type="button" onClick={() => inspectAt(nextIndex)} disabled={nextIndex < 0 || nextIndex >= matchingRows.length}>Next</button>
        <button type="button" onClick={() => inspectAt(matchingRows.length - 1)} disabled={matchingRows.length === 0}>Latest</button>
      </div>
      <p className="pattern-context-selection-copy">Rates are descriptive observations of existing closed M5 rows. FLAT outcomes remain in each denominator; this is not a win rate, probability, fill model or source qualification.</p>
      <p className="pattern-context-selection-copy">Local review thresholds: strong detector geometry at least 70%, moderate at least 45%, otherwise weak. Pressure agreement uses at least 0.25 median ranges of EMA change, 1 median range of net movement and 20% close efficiency. These local choices do not establish source dominance or qualify entries.</p>
      <p className="pattern-context-selection-copy">Historical review only: SHADOW_ONLY / NO_DECISION / live_apply_allowed=false. This local census is not source evidence and does not establish a source execution rule, fill, order, or live apply. No live apply or order authority.</p>
    </>}
    {withheld && <p className="pattern-context-selection-copy">Historical evidence withheld. This local census is not source evidence and does not establish a source execution rule, fill, order, or live apply. SHADOW_ONLY / NO_DECISION / live_apply_allowed=false. No live apply or order authority.</p>}
  </section>;
}

export { BUCKETS as PATTERN_CONTEXT_SELECTION_BUCKETS };



