import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import type { PatternInspectionMode, PatternInspectionView } from "./patternInspectionWindow.ts";
import { patternInspectionWindow } from "./patternInspectionWindow.ts";
import type { PriceActionSetup } from "./priceActionSetup.ts";

/**
 * A small, pure replay cursor for one selected detector occurrence.
 *
 * The cursor is deliberately separate from the chart.  It only hands the
 * inspection helper the prefix which has been revealed by the caller; bars
 * after that prefix are never available to a study.  Consequently changing a
 * future candle cannot change setup geometry or a context receipt.
 */
export type PatternCausalReplayState = "AVAILABLE" | "WITHHELD" | "UNAVAILABLE";
export type PatternCausalReplayMode = PatternInspectionMode;
type ReplayBar = OhlcBar & { closed?: boolean };

export interface PatternCausalReplayOptions {
  /** Latest candle open that the replay is allowed to reveal. */
  revealedTime?: string | null;
  mode?: PatternCausalReplayMode;
  setup?: PriceActionSetup;
  nowMs?: number;
}

export interface PatternCausalReplayBoundary {
  /** Context is measured only through the selected confirmation candle close. */
  context: { startTime: string | null; endTime: string | null };
  /** Setup evidence ends at the confirmation candle close. */
  setup: { startTime: string | null; endTime: string | null };
  /** Outcome starts after confirmation close and is withheld until revealed. */
  outcome: { startTime: string | null; endTime: string | null; horizon: number };
}

export interface PatternCausalReplay {
  version: "pattern-causal-replay/1";
  state: PatternCausalReplayState;
  reason: string;
  authority: "SHADOW_ONLY / NO_DECISION";
  live_apply_allowed: false;
  mode: PatternCausalReplayMode;
  anchorIndex: number | null;
  anchorTime: string | null;
  revealedIndex: number | null;
  revealedTime: string | null;
  fromIndex: number | null;
  toIndex: number | null;
  revealedCloseTime: string | null;
  startTime: string | null;
  endTime: string | null;
  previousTime: string | null;
  nextTime: string | null;
  rows: ReplayBar[];
  view: PatternInspectionView | null;
  boundaries: PatternCausalReplayBoundary;
  canStepBackward: boolean;
  canStepForward: boolean;
  outcomeState: PatternCausalReplayState;
  /** Outcome observations are hidden or only a prefix has been revealed. */
  futureWithheld: boolean;
}

const M5_MS = 300_000;
const OUTCOME_HORIZON = 24;

// Date.parse accepts impossible dates and timezone aliases. Replay identity is
// an exact, canonical UTC M5 identity, just like the selected-window contract.
function utcM5(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return null;
  const instant = Date.parse(value);
  const canonical = value.endsWith(".000Z") ? value : value.replace("Z", ".000Z");
  return Number.isFinite(instant) && instant % M5_MS === 0 && new Date(instant).toISOString() === canonical ? instant : null;
}

const canonical = (instant: number | null): string | null => instant == null ? null : new Date(instant).toISOString();
const seconds = (time: string): string => time.endsWith(".000Z") ? time.replace(".000Z", "Z") : time;

const emptyBoundaries = (horizon = OUTCOME_HORIZON): PatternCausalReplayBoundary => ({
  context: { startTime: null, endTime: null },
  setup: { startTime: null, endTime: null },
  outcome: { startTime: null, endTime: null, horizon },
});

function unavailable(mode: PatternCausalReplayMode, reason: string): PatternCausalReplay {
  return {
    version: "pattern-causal-replay/1", state: "UNAVAILABLE", reason,
    authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false, mode,
    anchorIndex: null, anchorTime: null, revealedIndex: null, revealedTime: null,
    fromIndex: null, toIndex: null, revealedCloseTime: null,
    startTime: null, endTime: null, previousTime: null, nextTime: null,
    rows: [], view: null,
    boundaries: emptyBoundaries(), canStepBackward: false, canStepForward: false,
    outcomeState: "UNAVAILABLE",
    futureWithheld: false,
  };
}

/**
 * Recompute one selected occurrence from a causal prefix.
 *
 * `revealedTime` defaults to the selected candle, so a caller gets a safe
 * setup cursor rather than an accidentally fully priced outcome. Context and
 * setup modes always withhold outcome fields. Outcome mode reveals a result
 * only after the first contiguous closed M5 candle following confirmation.
 */
export function patternCausalReplay(
  bars: readonly ReplayBar[],
  selectedTime: string,
  reads: string,
  allowGeometry: boolean,
  options: PatternCausalReplayOptions = {},
): PatternCausalReplay {
  const mode = options.mode ?? "setup";
  const nowMs = options.nowMs ?? Date.now();
  const selectedInstant = utcM5(selectedTime);
  if (selectedInstant == null) return unavailable(mode, "INVALID_SELECTED_UTC_M5_IDENTITY");
  if (!Array.isArray(bars) || bars.length === 0) return unavailable(mode, "EMPTY_RETAINED_TAPE");
  if (options.nowMs !== undefined && !Number.isFinite(options.nowMs)) return unavailable(mode, "INVALID_REPLAY_CLOCK");

  const selectedCanonical = canonical(selectedInstant)!;
  const selectedSeconds = seconds(selectedCanonical);
  let anchorIndex = -1;
  for (let i = 0; i < bars.length; i++) {
    // Exact aliases are sufficient for identity. Do not parse every retained
    // row merely to find an anchor; the inspection helper validates the local
    // causal evidence when it receives the bounded prefix.
    if (bars[i]?.t === selectedCanonical || bars[i]?.t === selectedSeconds) {
      if (anchorIndex >= 0) return unavailable(mode, "AMBIGUOUS_SELECTED_UTC_M5_IDENTITY");
      anchorIndex = i;
    }
  }
  if (anchorIndex < 0) return unavailable(mode, "SELECTED_CANDLE_NOT_RETAINED");
  const closedIdentity = (bar: ReplayBar | undefined): boolean => {
    const instant = utcM5(bar?.t);
    return !!bar && (bar.closed === undefined || bar.closed === true) && instant != null && instant + M5_MS <= nowMs;
  };
  const valid = (bar: ReplayBar | undefined): bar is ReplayBar => !!bar && closedIdentity(bar)
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c);
  if (!valid(bars[anchorIndex])) return unavailable(mode, "SELECTED_CANDLE_NOT_AVAILABLE_AS_CLOSED_M5");
  const requested = options.revealedTime == null ? selectedInstant : utcM5(options.revealedTime);
  if (requested == null) return unavailable(mode, "INVALID_REVEALED_UTC_M5_IDENTITY");
  if (requested < selectedInstant) return {
    ...unavailable(mode, "ANCHOR_NOT_REVEALED"), state: "WITHHELD", outcomeState: "WITHHELD", futureWithheld: true,
  };
  // The future navigation endpoint uses identities and close flags only. No
  // high/low, target touch, or outcome can shorten or extend it.
  let endIndex = anchorIndex;
  while (endIndex < Math.min(bars.length - 1, anchorIndex + OUTCOME_HORIZON)) {
    const next = bars[endIndex + 1];
    if (!closedIdentity(next) || utcM5(next.t) !== selectedInstant + (endIndex + 1 - anchorIndex) * M5_MS) break;
    endIndex++;
  }
  const revealedInstant = mode === "outcome" ? Math.min(requested, selectedInstant + OUTCOME_HORIZON * M5_MS) : selectedInstant;
  const revealedIndex = anchorIndex + (revealedInstant - selectedInstant) / M5_MS;
  if (revealedIndex > endIndex) return unavailable(mode, "REVEALED_PATH_NOT_CONTIGUOUS_CLOSED_M5");
  // Consume only prices the caller explicitly revealed.
  for (let i = anchorIndex + 1; i <= revealedIndex; i++) if (!valid(bars[i])) return unavailable(mode, "INVALID_REVEALED_OHLC");
  const evidenceFrom = Math.max(0, anchorIndex - 95);
  const prefix = bars.slice(evidenceFrom, revealedIndex + 1);
  const view0 = patternInspectionWindow(prefix, selectedTime, reads, allowGeometry, mode, options.setup, nowMs);
  if (!view0) return unavailable(mode, "SELECTED_CANDLE_NOT_AVAILABLE_AS_CLOSED_M5");

  const anchorTime = canonical(selectedInstant)!;
  const confirmationCloseInstant = selectedInstant + M5_MS;
  const contextStart = view0.room.contextStart ?? (view0.rows.length ? canonical(utcM5(view0.rows[0].t)) : anchorTime);
  const setupEnd = canonical(confirmationCloseInstant)!;
  const outcomeStart = setupEnd;
  const hasNextClosed = mode === "outcome" && revealedIndex > anchorIndex;
  // Do not expose future outcomes from setup/context cursors. At confirmation
  // close, even an INCOMPLETE barrier receipt remains withheld until one later
  // contiguous closed candle is revealed.
  const study = hasNextClosed && view0.study ? { ...view0.study, exitIndex: view0.study.exitIndex == null ? null : view0.study.exitIndex + evidenceFrom } : null;
  const technicalStudy = hasNextClosed && view0.technicalStudy ? { ...view0.technicalStudy, exitIndex: view0.technicalStudy.exitIndex == null ? null : view0.technicalStudy.exitIndex + evidenceFrom } : null;
  const fromIndex = view0.from + evidenceFrom;
  const rows = bars.slice(fromIndex, revealedIndex + 1);
  let min = Infinity, max = -Infinity;
  for (const row of rows) { min = Math.min(min, row.l); max = Math.max(max, row.h); }
  const pad = Math.max((max - min) * .12, .01);
  // The ordinary study window ends at first touch. Replay displays every
  // explicitly revealed candle, even after an earlier barrier touch.
  const view: PatternInspectionView = {
    ...view0, mode, index: anchorIndex, from: fromIndex, to: revealedIndex, rows,
    outcome: hasNextClosed ? view0.outcome : null, study, technicalStudy,
    low: Math.min(view0.low, min - pad), high: Math.max(view0.high, max + pad),
  };
  const outcomeEnd = hasNextClosed ? canonical(revealedInstant + M5_MS) : null;
  const boundaries: PatternCausalReplayBoundary = {
    context: { startTime: contextStart, endTime: setupEnd },
    setup: { startTime: rows.length ? canonical(utcM5(rows[0].t)) : anchorTime, endTime: setupEnd },
    outcome: { startTime: outcomeStart, endTime: outcomeEnd, horizon: OUTCOME_HORIZON },
  };
  const toIndex = view.to;
  const canStepBackward = mode === "outcome" && revealedIndex > anchorIndex;
  const canStepForward = mode === "outcome" && revealedIndex < endIndex;
  return {
    version: "pattern-causal-replay/1", state: "AVAILABLE", reason: "CAUSAL_CLOSED_M5_PREFIX",
    authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false, mode,
    anchorIndex, anchorTime, revealedIndex, revealedTime: canonical(revealedInstant),
    fromIndex, toIndex, rows: view.rows, view, boundaries,
    revealedCloseTime: canonical(revealedInstant + M5_MS), startTime: anchorTime,
    endTime: canonical(selectedInstant + (endIndex - anchorIndex) * M5_MS),
    previousTime: canStepBackward ? canonical(revealedInstant - M5_MS) : null,
    nextTime: canStepForward ? canonical(revealedInstant + M5_MS) : null,
    canStepBackward, canStepForward, outcomeState: hasNextClosed ? "AVAILABLE" : "WITHHELD",
    futureWithheld: !hasNextClosed || revealedIndex < endIndex,
  };
}

export const causalPatternReplay = patternCausalReplay;
export type PatternCausalReplayView = PatternCausalReplay;
