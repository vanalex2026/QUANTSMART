import type { M5PriceBar, PriceActionDirection } from "./priceActionDetector.ts";

export const FAILURE_SELECTION_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;

export type FailureSelectionEvidenceState = "AVAILABLE" | "UNAVAILABLE" | "WITHHELD";

export type PatternFailureSelectionContext = {
  version: "pattern-failure-selection-context/1";
  conceptId: "trade_selection_failure";
  sourceLens: "trade_for_failure_selection";
  state: FailureSelectionEvidenceState;
  reason: string;
  occurrenceTime: string;
  direction: PriceActionDirection;
  causalPrefix: {
    state: "AVAILABLE" | "UNAVAILABLE";
    start: string | null;
    end: string | null;
    bars: number;
    maxBars: 96;
    contiguous: boolean;
    closedOnly: boolean;
  };
  observations: {
    selectedCandle: {
      state: FailureSelectionEvidenceState;
      open: number | null;
      high: number | null;
      low: number | null;
      close: number | null;
    };
    priorRange: {
      state: FailureSelectionEvidenceState;
      low: number | null;
      high: number | null;
      bars: number;
    };
    closeInsidePriorRange: "OBSERVED" | "NOT_OBSERVED" | "UNAVAILABLE";
  };
  sourceStatus: "SOURCE_REVIEW_ONLY";
  dataStatus: "AVAILABLE" | "UNAVAILABLE";
  outcomeStatus: "WITHHELD";
  outcomeReason: "SOURCE_OUTCOME_NOT_LABELLED";
  authority: typeof FAILURE_SELECTION_AUTHORITY;
  live_apply_allowed: false;
};

const M5_MS = 300_000;
const MAX_PREFIX_BARS = 96;
const validDirection = (value: unknown): value is PriceActionDirection => value === "UP" || value === "DOWN" || value === "NEUTRAL";
const instantOf = (value: unknown): number | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) && instant % M5_MS === 0 ? instant : null;
};
const validBar = (bar: M5PriceBar | undefined, nowMs: number): boolean => {
  const instant = instantOf(bar?.t);
  return !!bar && instant != null && instant + M5_MS <= nowMs && bar.closed !== false
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l;
};

const base = (occurrenceTime: string, direction: PriceActionDirection, reason: string, state: FailureSelectionEvidenceState): PatternFailureSelectionContext => ({
  version: "pattern-failure-selection-context/1",
  conceptId: "trade_selection_failure",
  sourceLens: "trade_for_failure_selection",
  state,
  reason,
  occurrenceTime,
  direction,
  causalPrefix: { state: "UNAVAILABLE", start: null, end: null, bars: 0, maxBars: MAX_PREFIX_BARS, contiguous: false, closedOnly: false },
  observations: {
    selectedCandle: { state: "UNAVAILABLE", open: null, high: null, low: null, close: null },
    priorRange: { state: "UNAVAILABLE", low: null, high: null, bars: 0 },
    closeInsidePriorRange: "UNAVAILABLE",
  },
  sourceStatus: "SOURCE_REVIEW_ONLY",
  dataStatus: state === "AVAILABLE" ? "AVAILABLE" : "UNAVAILABLE",
  outcomeStatus: "WITHHELD",
  outcomeReason: "SOURCE_OUTCOME_NOT_LABELLED",
  authority: FAILURE_SELECTION_AUTHORITY,
  live_apply_allowed: false,
});

/**
 * Build a descriptive failure-selection receipt from the selected candle and
 * its preceding closed M5 bars. No post-occurrence row is read, and the
 * source's discretionary counterbreak label remains withheld.
 */
export function patternFailureSelectionContext(
  bars: readonly M5PriceBar[],
  occurrenceTime: string,
  direction: PriceActionDirection,
  enabled = true,
  nowMs = Date.now(),
): PatternFailureSelectionContext {
  const unavailable = (reason: string, state: FailureSelectionEvidenceState = "UNAVAILABLE") => base(occurrenceTime, validDirection(direction) ? direction : "NEUTRAL", reason, state);
  if (!enabled) return unavailable("UNVERIFIED_CURRENT_EVIDENCE", "WITHHELD");
  const selectedInstant = instantOf(occurrenceTime);
  if (selectedInstant == null) return unavailable("INVALID_OCCURRENCE_IDENTITY");
  if (!Array.isArray(bars) || !Number.isFinite(nowMs) || nowMs < 0) return unavailable("INVALID_CAUSAL_INPUT");
  // Locate the selected identity first, then validate only rows at or before
  // it. Future rows are outside this receipt's causal evidence boundary.
  let selectedIndex = -1;
  for (let i = 0; i < bars.length; i++) {
    if (instantOf(bars[i]?.t) === selectedInstant) {
      if (selectedIndex >= 0) return unavailable("DUPLICATE_OCCURRENCE_IDENTITY");
      selectedIndex = i;
    }
  }
  if (selectedIndex < 0) return unavailable("MISSING_OCCURRENCE_CANDLE");
  const from = Math.max(0, selectedIndex - (MAX_PREFIX_BARS - 1));
  let previous = -Infinity;
  for (let i = from; i <= selectedIndex; i++) {
    const instant = instantOf(bars[i]?.t);
    if (instant == null || instant <= previous || !validBar(bars[i], nowMs)) return unavailable("INVALID_CAUSAL_TAPE");
    previous = instant;
  }
  const prefix = bars.slice(from, selectedIndex + 1);
  for (let i = 1; i < prefix.length; i++) {
    const prior = instantOf(prefix[i - 1]?.t), next = instantOf(prefix[i]?.t);
    if (prior == null || next == null || next - prior !== M5_MS) return unavailable("CAUSAL_PREFIX_GAP");
  }
  const selected = bars[selectedIndex];
  const result = base(occurrenceTime, direction, "CAUSAL_PREFIX_CONTEXT_AVAILABLE", "AVAILABLE");
  const canonicalStart = new Date(instantOf(prefix[0].t)!).toISOString();
  const canonicalEnd = new Date(instantOf(selected.t)!).toISOString();
  result.causalPrefix = { state: "AVAILABLE", start: canonicalStart, end: canonicalEnd, bars: prefix.length, maxBars: MAX_PREFIX_BARS, contiguous: true, closedOnly: true };
  result.observations.selectedCandle = { state: "AVAILABLE", open: selected.o, high: selected.h, low: selected.l, close: selected.c };
  const priorBars = prefix.slice(0, -1);
  if (priorBars.length < 2) {
    result.reason = "CAUSAL_PREFIX_TOO_SHORT_FOR_PRIOR_RANGE";
    result.observations.closeInsidePriorRange = "UNAVAILABLE";
    return result;
  }
  const low = Math.min(...priorBars.map(bar => bar.l)), high = Math.max(...priorBars.map(bar => bar.h));
  result.observations.priorRange = { state: "AVAILABLE", low, high, bars: priorBars.length };
  result.observations.closeInsidePriorRange = selected.c > low && selected.c < high ? "OBSERVED" : "NOT_OBSERVED";
  return result;
}
