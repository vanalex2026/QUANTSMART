import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import type { PriceActionConceptEvidence } from "../lib/priceActionDetector.ts";
import { usePatternSelectionCensus } from "../lib/usePatternSelectionCensus.ts";
import { PatternContextSelectionEvidence } from "./PatternContextSelectionEvidence.tsx";

/** Mounted only after explicit expansion, and unmounted during causal replay. */
export function PatternContextSelectionStudy({ bars, evidence, scope, selectedTime, onInspect }: {
  bars: readonly OhlcBar[];
  evidence: PriceActionConceptEvidence;
  scope: string;
  selectedTime: string;
  onInspect: (time: string) => void;
}) {
  const scan = usePatternSelectionCensus(bars, evidence, scope, true);
  return <PatternContextSelectionEvidence census={scan.result} status={scan.status} onRetry={scan.retry} onInspect={onInspect} selectedTime={selectedTime} />;
}
