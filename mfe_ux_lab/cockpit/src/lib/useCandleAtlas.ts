import { useEffect, useMemo, useRef, useState } from "react";
import type { PatternAnalysis, PatternBar } from "./candlePatternAtlas.ts";
import type { M5PriceBar } from "./priceActionDetector.ts";
import { samePriceActionTape } from "./priceActionScan.ts";
import { startAnalysisWorker } from "./analysisWorkerTask.ts";

export function useCandleAtlas(bars: readonly M5PriceBar[], enabled: boolean, symbol: string) {
  const previous = useRef<PatternBar[]>([]);
  const tape = useMemo(() => {
    if (!samePriceActionTape(previous.current, bars)) {
      previous.current = bars.map((bar, i) => ({ i, t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, closed: bar.closed }));
    }
    return previous.current;
  }, [bars]);
  const readyToScan = enabled && tape.length >= 40;
  const [attempt, setAttempt] = useState(0);
  const [scan, setScan] = useState<{
    tape: PatternBar[]; symbol: string; attempt: number;
    result: PatternAnalysis | null; status: "loading" | "ready" | "error";
  } | null>(null);
  useEffect(() => {
    if (!readyToScan) { setScan(null); return; }
    const identity = { tape, symbol, attempt };
    setScan({ ...identity, result: null, status: "loading" });
    // Capture the query clock before dispatch, so queue time cannot change
    // forming-bar admission or freshness inside an otherwise identical job.
    return startAnalysisWorker<{ bars: PatternBar[]; symbol: string; now: number }, PatternAnalysis>(
      { bars: tape, symbol, now: Date.now() },
      () => new Worker(new URL("./candleAtlas.worker.ts", import.meta.url), { type: "module" }),
      (result) => setScan({ ...identity, result, status: "ready" }),
      () => setScan({ ...identity, result: null, status: "error" }),
    );
  }, [tape, readyToScan, symbol, attempt]);
  const current = readyToScan && scan?.tape === tape && scan.symbol === symbol && scan.attempt === attempt;
  return {
    result: current ? scan.result : null,
    status: !readyToScan ? "idle" : current ? scan.status : "loading",
    retry: () => setAttempt((value) => value + 1),
  };
}
