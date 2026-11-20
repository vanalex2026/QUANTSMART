import type { M5PriceActionOptions, M5PriceActionResult, M5PriceBar } from "./priceActionDetector.ts";

type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";
type JobState = { id: string; status: JobStatus; error?: string };

export interface PriceActionBackendReceipt {
  job_id: string;
  input_hash: string;
  engine_hash: string;
  source_hash?: string;
  schema: string;
  result_hash: string;
  tape_hash?: string;
  symbol: string;
  timeframe: string;
  bars: number;
  authority: "SHADOW_ONLY / NO_DECISION";
  live_apply_allowed: false;
  canonical_scope: "BROWSER_SUPPLIED_BARS_TRANSITIONAL";
  verified: true;
}

export type PriceActionBackendResult = M5PriceActionResult & {
  schema: string;
  operation: "price_action";
  result_hash: string;
  provenance: {
    tape_hash?: string;
    symbol: "XAUUSD";
    timeframe: "M5";
    bars: number;
    authority: "SHADOW_ONLY / NO_DECISION";
    live_apply_allowed: false;
    canonical_scope: "BROWSER_SUPPLIED_BARS_TRANSITIONAL";
    canonical_scope_pending: true;
  };
  researchReceipt: PriceActionBackendReceipt;
};

const abortError = () => new DOMException("Aborted", "AbortError");

async function requestJson<T>(url: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw abortError();
  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  signal?.addEventListener("abort", relayAbort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(payload.error || `HTTP_${response.status}`);
    return payload;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", relayAbort);
  }
}

const pause = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = window.setTimeout(resolve, ms);
  const abort = () => { window.clearTimeout(timer); reject(abortError()); };
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
});

function validateResult(result: Omit<PriceActionBackendResult, "researchReceipt">): void {
  if (result.schema !== "quantsmart.research.price-action/1"
    || result.operation !== "price_action"
    || !result.result_hash
    || result.provenance?.symbol !== "XAUUSD"
    || result.provenance?.timeframe !== "M5"
    || result.provenance?.authority !== "SHADOW_ONLY / NO_DECISION"
    || result.provenance?.live_apply_allowed !== false
    || result.provenance?.canonical_scope !== "BROWSER_SUPPLIED_BARS_TRANSITIONAL") {
    throw new Error("INVALID_PRICE_ACTION_RECEIPT");
  }
}

export async function runPriceActionDetectorJob(
  bars: readonly M5PriceBar[],
  options: M5PriceActionOptions,
  signal?: AbortSignal,
): Promise<PriceActionBackendResult> {
  const requestBars = bars.map(({ t, o, h, l, c, closed }) => ({ t, o, h, l, c, closed }));
  let job: JobState | null = null;
  try {
    job = await requestJson<JobState>("/api/research/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "detector",
        analysis: "price_action",
        bars: requestBars,
        options: { ...options, symbol: "XAUUSD", timeframe: "M5" },
      }),
    }, signal);
    const startedAt = Date.now();
    while (job.status === "queued" || job.status === "running") {
      if (Date.now() - startedAt > 150_000) throw new Error("RESEARCH_JOB_TIMEOUT");
      await pause(document.hidden ? 2_500 : 500, signal);
      job = await requestJson<JobState>(`/api/research/jobs/${job.id}`, { method: "GET" }, signal);
    }
    if (job.status !== "done") throw new Error(job.error || "RESEARCH_JOB_FAILED");
    const completed = await requestJson<{
      result: Omit<PriceActionBackendResult, "researchReceipt">;
      input_hash: string;
      engine_hash: string;
      provenance?: { dataHash?: string };
    }>(`/api/research/jobs/${job.id}/result`, { method: "GET" }, signal);
    validateResult(completed.result);
    return {
      ...completed.result,
      researchReceipt: {
        job_id: job.id,
        input_hash: completed.input_hash,
        engine_hash: completed.engine_hash,
        source_hash: completed.provenance?.dataHash,
        schema: completed.result.schema,
        result_hash: completed.result.result_hash,
        tape_hash: completed.result.provenance.tape_hash,
        symbol: completed.result.provenance.symbol,
        timeframe: completed.result.provenance.timeframe,
        bars: completed.result.provenance.bars,
        authority: completed.result.provenance.authority,
        live_apply_allowed: false,
        canonical_scope: completed.result.provenance.canonical_scope,
        verified: true,
      },
    };
  } catch (error) {
    if (signal?.aborted && job && (job.status === "queued" || job.status === "running")) {
      await fetch(`/api/research/jobs/${job.id}`, { method: "DELETE" }).catch(() => undefined);
    }
    throw error;
  }
}
