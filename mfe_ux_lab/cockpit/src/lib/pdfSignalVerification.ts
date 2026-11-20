import { ALL_PDF_SIGNAL_CONCEPT_IDS, detectAllPdfSignals, type PdfSignalDetectorInput, type PdfSignalDetectorResult } from "./pdfSignalDetector.ts";

export const PDF_SIGNAL_VERIFICATION_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;

export type PdfSignalVerificationSource = "VERIFIED_MT5_CLOSED" | "LOCAL_SNAPSHOT" | "UNAVAILABLE";

const isPdfSignalVerificationSource = (value: unknown): value is PdfSignalVerificationSource =>
  value === "VERIFIED_MT5_CLOSED" || value === "LOCAL_SNAPSHOT" || value === "UNAVAILABLE";

export type PdfSignalVerificationReceipt = {
  state: "PASS" | "WITHHELD";
  source: PdfSignalVerificationSource;
  selectedTime: string | null;
  bars: number;
  deterministicRepeat: boolean;
  futureRowInvariant: boolean;
  countsReconcile: boolean;
  conceptIdsReconcile: boolean;
  reason: string;
  authority: typeof PDF_SIGNAL_VERIFICATION_AUTHORITY;
  live_apply_allowed: false;
};

const observationIdentity = (result: PdfSignalDetectorResult) => result.observations.map((observation) => ({
  conceptId: observation.conceptId,
  state: observation.state,
  direction: observation.direction,
  i: observation.i,
  time: observation.time,
  reason: observation.reason,
  score: observation.score,
  sourceStatus: observation.sourceStatus,
  dataStatus: observation.dataStatus,
  outcomeStatus: observation.outcomeStatus,
  geometry: observation.geometry ?? null,
}));

const sameResult = (left: PdfSignalDetectorResult, right: PdfSignalDetectorResult) =>
  JSON.stringify({ state: left.state, reason: left.reason, counts: left.counts, observations: observationIdentity(left) })
  === JSON.stringify({ state: right.state, reason: right.reason, counts: right.counts, observations: observationIdentity(right) });

const countsReconcile = (result: PdfSignalDetectorResult) => {
  const counts = result.observations.reduce((out, observation) => {
    out.total++;
    if (observation.state === "DETECTED") out.detected++;
    else if (observation.state === "ABSTAIN") out.abstain++;
    else if (observation.state === "UNAVAILABLE") out.unavailable++;
    else out.withheld++;
    return out;
  }, { total: 0, detected: 0, abstain: 0, unavailable: 0, withheld: 0 });
  return JSON.stringify(counts) === JSON.stringify(result.counts);
};

const conceptIdsReconcile = (result: PdfSignalDetectorResult) => {
  const ids = result.observations.map((observation) => observation.conceptId);
  return ids.length === ALL_PDF_SIGNAL_CONCEPT_IDS.length
    && new Set(ids).size === ALL_PDF_SIGNAL_CONCEPT_IDS.length
    && ALL_PDF_SIGNAL_CONCEPT_IDS.every((conceptId) => ids.includes(conceptId));
};

/**
 * Re-run the unified PDF observation contract and append one later closed row
 * to prove that future data cannot rewrite the selected-candle receipt.
 * This is an integrity check, never an accuracy or profitability measure.
 */
export function verifyPdfSignalReceipt(
  input: PdfSignalDetectorInput,
  source: PdfSignalVerificationSource,
): PdfSignalVerificationReceipt {
  const selectedTime = typeof input?.selectedTime === "string" ? input.selectedTime : null;
  const bars = Array.isArray(input?.bars) ? input.bars : [];
  const receiptSource: PdfSignalVerificationSource = isPdfSignalVerificationSource(source) ? source : "UNAVAILABLE";
  const unavailable = (reason: string): PdfSignalVerificationReceipt => ({
    state: "WITHHELD",
    source: receiptSource,
    selectedTime,
    bars: bars.length,
    deterministicRepeat: false,
    futureRowInvariant: false,
    countsReconcile: false,
    conceptIdsReconcile: false,
    reason,
    authority: PDF_SIGNAL_VERIFICATION_AUTHORITY,
    live_apply_allowed: false,
  });
  // Keep provenance fail-closed for JavaScript callers that bypass TypeScript.
  if (!isPdfSignalVerificationSource(source)) return unavailable("UNSUPPORTED_VERIFICATION_SOURCE");
  if (source === "UNAVAILABLE" || !bars.length || !selectedTime) return unavailable("VERIFIED_CLOSED_TAPE_UNAVAILABLE");

  const baseline = detectAllPdfSignals(input);
  const repeat = detectAllPdfSignals(input);
  const deterministicRepeat = sameResult(baseline, repeat);
  const selectedInstant = Date.parse(selectedTime);
  const selectedBar = bars.find((bar) => Date.parse(bar.t) === selectedInstant);
  if (!selectedBar || !Number.isFinite(selectedInstant)) return unavailable("MISSING_SELECTED_CLOSED_CANDLE");
  const futureBar = {
    ...selectedBar,
    t: new Date(selectedInstant + 300_000).toISOString(),
    i: undefined,
  };
  const selectedIndex = bars.findIndex((bar) => Date.parse(bar.t) === selectedInstant);
  const futureBars = bars.slice();
  if (selectedIndex + 1 < futureBars.length) {
    const next = futureBars[selectedIndex + 1];
    futureBars[selectedIndex + 1] = { ...next, o: next.o + 17, h: next.h + 17, l: next.l + 17, c: next.c + 17 };
  } else {
    futureBars.push(futureBar);
  }
  const withFuture: PdfSignalDetectorInput = { ...input, bars: futureBars };
  const futureRowInvariant = sameResult(baseline, detectAllPdfSignals(withFuture));
  const reconciles = countsReconcile(baseline);
  const conceptsReconcile = conceptIdsReconcile(baseline);
  const pass = baseline.ok && deterministicRepeat && futureRowInvariant && reconciles && conceptsReconcile;
  return {
    state: pass ? "PASS" : "WITHHELD",
    source,
    selectedTime,
    bars: bars.length,
    deterministicRepeat,
    futureRowInvariant,
    countsReconcile: reconciles,
    conceptIdsReconcile: conceptsReconcile,
    reason: pass ? "DETERMINISTIC_AND_FUTURE_ROW_INVARIANT" : "VERIFICATION_CONTRACT_WITHHELD",
    authority: PDF_SIGNAL_VERIFICATION_AUTHORITY,
    live_apply_allowed: false,
  };
}
