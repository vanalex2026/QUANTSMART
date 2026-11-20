export type AnalysisWorker = Pick<Worker, "onmessage" | "onerror" | "onmessageerror" | "postMessage" | "terminate">;

/** A job owns its worker and invalidates replies already queued at cancellation. */
export function startAnalysisWorker<Request, Result>(
  request: Request, createWorker: () => AnalysisWorker,
  onResult: (result: Result) => void, onError: () => void,
): () => void {
  let active = true;
  let worker: AnalysisWorker | undefined;
  const stop = () => {
    active = false;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      worker = undefined;
    }
  };
  const fail = () => { if (active) { stop(); onError(); } };
  try {
    worker = createWorker();
    worker.onmessage = ({ data }) => {
      if (!active) return;
      if (!data || !data.result || data.error) { fail(); return; }
      stop();
      onResult(data.result);
    };
    // Browser Worker error events normally expose preventDefault(), but test
    // doubles and a few embedded runtimes can deliver a bare ErrorEvent-like
    // value. Always transition the scan out of loading even when the event
    // cannot be cancelled; otherwise a failed superseded/retried scan can
    // leave the status stuck forever.
    worker.onerror = (event) => {
      try { event?.preventDefault?.(); } finally { fail(); }
    };
    worker.onmessageerror = fail;
    worker.postMessage(request);
  } catch { fail(); }
  return stop;
}
