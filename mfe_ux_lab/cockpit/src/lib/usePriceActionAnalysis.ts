import { useEffect, useMemo, useRef, useState } from "react";
import type { M5PriceActionResult, M5PriceBar } from "./priceActionDetector.ts";
import { samePriceActionTape, startPriceActionScan } from "./priceActionScan.ts";
import { runPriceActionDetectorJob } from "./priceActionBackend.ts";

function backendUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch|NetworkError|HTTP_(404|405|502|503)/i.test(message);
}

export function usePriceActionAnalysis(bars: readonly M5PriceBar[], timeframe: string, symbol: string) {
  const previous = useRef<readonly M5PriceBar[]>([]);
  const tape = useMemo(() => {
    // Polling and a forming-candle refresh can recreate the same closed tape.
    // Reuse only after comparing all OHLC values, including archive corrections.
    if (!samePriceActionTape(previous.current, bars)) {
      previous.current = bars.map((bar, i) => ({ i, t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, closed: bar.closed }));
    }
    return previous.current;
  }, [bars]);
  const enabled = timeframe === "M5" && tape.length >= 2;
  const [attempt, setAttempt] = useState(0);
  const [scan, setScan] = useState<{
    tape: readonly M5PriceBar[]; symbol: string; attempt: number;
    result: M5PriceActionResult | null; status: "loading" | "ready" | "error";
  } | null>(null);
  useEffect(() => {
    if (!enabled) { setScan(null); return; }
    const identity = { tape, symbol, attempt };
    setScan({ ...identity, result: null, status: "loading" });
    const controller = new AbortController();
    let fallbackCleanup: (() => void) | null = null;
    const startBrowserCompatibilityScan = () => {
      return startPriceActionScan(tape, { symbol },
        () => new Worker(new URL("./priceAction.worker.ts", import.meta.url), { type: "module" }),
        (result) => setScan({ ...identity, result, status: "ready" }),
        () => setScan({ ...identity, result: null, status: "error" }),
      );
    };
    const execute = async () => {
      if (symbol !== "XAUUSD") {
        fallbackCleanup = startBrowserCompatibilityScan();
        return;
      }
      try {
        const result = await runPriceActionDetectorJob(tape, { symbol }, controller.signal);
        if (!controller.signal.aborted) setScan({ ...identity, result, status: "ready" });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (backendUnavailable(error)) {
          fallbackCleanup = startBrowserCompatibilityScan();
          return;
        }
        setScan({ ...identity, result: null, status: "error" });
      }
    };
    void execute();
    return () => {
      controller.abort();
      fallbackCleanup?.();
    };
  }, [tape, enabled, symbol, attempt]);
  // A tape/symbol change must hide old statistics during the render preceding
  // effect cleanup, as well as after a late worker reply.
  const current = enabled && scan?.tape === tape && scan.symbol === symbol && scan.attempt === attempt;
  return {
    result: current ? scan.result : null,
    status: !enabled ? "idle" : current ? scan.status : "loading",
    retry: () => setAttempt((value) => value + 1),
  };
}
