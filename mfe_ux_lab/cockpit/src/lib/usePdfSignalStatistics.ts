import { useEffect, useRef, useState } from "react";
import type { M5PriceBar } from "./priceActionDetector.ts";
import type { PdfSignalStatisticsProgress, PdfSignalStatisticsResult } from "./pdfSignalStatistics.ts";

export function usePdfSignalStatistics(bars: readonly M5PriceBar[], enabled: boolean) {
  const [result, setResult] = useState<PdfSignalStatisticsResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadingElapsedMs, setLoadingElapsedMs] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState<PdfSignalStatisticsProgress | null>(null);
  const loadingStartedAt = useRef<number | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    const generationId = generation.current;
    if (!enabled || bars.length < 2) { setResult(null); setStatus("idle"); loadingStartedAt.current = null; setLoadingElapsedMs(0); setLoadingProgress(null); return; }
    setResult(null);
    setStatus("loading");
    loadingStartedAt.current = Date.now();
    setLoadingElapsedMs(0);
    setLoadingProgress({ processedRows: 0, totalRows: Math.max(0, bars.length - 9), evaluatedRows: 0, skippedRows: 0 });
    let worker: Worker | null = null;
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      const active = worker;
      worker = null;
      if (!active) return;
      active.onmessage = null;
      active.onerror = null;
      active.onmessageerror = null;
      active.terminate();
    };
    const fail = () => {
      if (stopped) return;
      if (generation.current === generationId) { setResult(null); setStatus("error"); loadingStartedAt.current = null; setLoadingElapsedMs(0); setLoadingProgress(null); }
      stop();
    };
    try {
      worker = new Worker(new URL("./pdfSignalStatistics.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<{ result?: PdfSignalStatisticsResult; error?: string; progress?: PdfSignalStatisticsProgress }>) => {
        if (stopped || generation.current !== generationId) return;
        if (event.data?.progress) { setLoadingProgress(event.data.progress); return; }
        if (event.data?.result) { setResult(event.data.result); setStatus("ready"); loadingStartedAt.current = null; setLoadingElapsedMs(0); setLoadingProgress(null); stop(); }
        else fail();
      };
      worker.onerror = fail;
      worker.onmessageerror = fail;
      worker.postMessage({ bars: bars.map((bar) => ({ t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, closed: bar.closed })), nowMs: Date.now() });
    } catch {
      fail();
    }
    return () => { generation.current++; stop(); loadingStartedAt.current = null; setLoadingProgress(null); };
  // The wall clock refreshes the focused surface every 30 seconds, but it
  // does not change a retained closed-bar tape. Restarting this full census
  // on every clock tick can cancel a worker before it finishes. A new tape
  // identity still reruns the census and captures the latest closure time.
  }, [bars, enabled]);
  useEffect(() => {
    if (status !== "loading") return;
    const update = () => setLoadingElapsedMs(Math.max(0, Date.now() - (loadingStartedAt.current ?? Date.now())));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [status]);
  return { result, status, loadingElapsedMs, loadingProgress };
}
