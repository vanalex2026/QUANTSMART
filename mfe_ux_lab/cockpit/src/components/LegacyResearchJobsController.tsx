import { useEffect } from "react";
import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import type { RealisticBacktestOptions } from "../lib/realisticSimRun.ts";
import { useResearchBacktest, type ResearchBacktest } from "../lib/researchJobs.ts";

export type LegacyResearchJobState = {
  result: ResearchBacktest | null;
  error: string | null;
  pending: boolean;
};

export type LegacyResearchJobsSnapshot = {
  primary: LegacyResearchJobState;
  compare: LegacyResearchJobState;
};

/**
 * Own the two legacy research hooks behind a lazy route boundary. The focused
 * XAUUSD M5 chart never mounts this controller, so researchJobs (and its
 * storage/backtest graph) does not enter focused startup. The controller keeps
 * hook order stable for the full diagnostic route and reports a plain snapshot
 * to its parent without rendering legacy UI.
 */
export function LegacyResearchJobsController({
  primaryBars,
  primaryCard,
  compareBars,
  compareCard,
  options,
  primaryMode,
  primaryHistorical,
  source,
  primaryStage,
  csvReference,
  compareStage,
  onState,
}: {
  primaryBars: OhlcBar[] | null | undefined;
  primaryCard: unknown;
  compareBars: OhlcBar[] | null | undefined;
  compareCard: unknown;
  options: RealisticBacktestOptions;
  primaryMode: "m1" | "design";
  primaryHistorical: boolean;
  source: "Replay" | "Live" | "CSV";
  primaryStage?: "Y10" | "M6" | "M1";
  csvReference?: { id: string; windowTf: string };
  compareStage?: "Y10" | "M6" | "M1";
  onState: (snapshot: LegacyResearchJobsSnapshot) => void;
}) {
  const primary = useResearchBacktest(primaryBars, primaryCard, options, primaryMode, primaryHistorical, source, primaryStage, csvReference, true);
  const compare = useResearchBacktest(compareBars, compareCard, options, "design", primaryHistorical, source, compareStage, undefined, true);
  useEffect(() => {
    onState({
      primary: { result: primary.result, error: primary.error, pending: primary.pending },
      compare: { result: compare.result, error: compare.error, pending: compare.pending },
    });
  }, [primary.result, primary.error, primary.pending, compare.result, compare.error, compare.pending, onState]);
  return null;
}

