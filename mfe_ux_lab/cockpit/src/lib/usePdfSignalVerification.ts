import { useEffect, useRef, useState } from "react";
import type { PdfSignalDetectorInput } from "./pdfSignalDetector.ts";
import {
  type PdfSignalVerificationReceipt,
  type PdfSignalVerificationSource,
} from "./pdfSignalVerification.ts";

type VerificationStatus = "idle" | "loading" | "ready" | "error";

/** Run the integrity receipt away from the chart render thread. */
export function usePdfSignalVerification(
  input: PdfSignalDetectorInput | null,
  source: PdfSignalVerificationSource,
  enabled: boolean,
) {
  const [result, setResult] = useState<PdfSignalVerificationReceipt | null>(null);
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    const generationId = generation.current;
    if (!enabled || !input) {
      setResult(null);
      setStatus("idle");
      return;
    }
    setResult(null);
    setStatus("loading");
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
      if (generation.current === generationId) {
        setResult(null);
        setStatus("error");
      }
      stop();
    };
    try {
      worker = new Worker(new URL("./pdfSignalVerification.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<{
        result?: PdfSignalVerificationReceipt;
        error?: string;
      }>) => {
        if (stopped || generation.current !== generationId) return;
        if (event.data?.result) {
          setResult(event.data.result);
          setStatus("ready");
          stop();
        } else fail();
      };
      worker.onerror = fail;
      worker.onmessageerror = fail;
      worker.postMessage({ input, source });
    } catch {
      fail();
    }
    return () => {
      generation.current += 1;
      stop();
    };
  }, [input, source, enabled]);

  return { result, status };
}
