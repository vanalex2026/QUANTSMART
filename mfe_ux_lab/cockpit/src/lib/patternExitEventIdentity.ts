import { parseEconomicCalendar, type EconomicCalendar } from "./economicCalendar.ts";
import type { M5PriceBar, PriceActionDirection } from "./priceActionDetector.ts";

export const EXIT_EVENT_IDENTITY_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;
export const EXIT_EVENT_IDENTITY_VERSION = "pattern-exit-event-identity/1" as const;
const M5_MS = 300_000;
const MAX_PREFIX_BARS = 96;

export type ExitEventKind = "NEWS" | "RESISTANCE" | "REVERSAL";
export type ExitEventState = "AVAILABLE" | "UNAVAILABLE" | "WITHHELD";
export type ExitEventObservation = "NEWS_EVENT_IDENTITY" | "STRUCTURAL_LEVEL_TOUCH" | "ADVERSE_LEVEL_BREAK";

export type ExitEventIdentity = {
  version: typeof EXIT_EVENT_IDENTITY_VERSION;
  kind: ExitEventKind;
  state: ExitEventState;
  reason: string;
  occurrenceTime: string;
  direction: PriceActionDirection;
  causalPrefix: {
    state: "AVAILABLE" | "UNAVAILABLE" | "WITHHELD";
    start: string | null;
    end: string | null;
    bars: number;
    maxBars: number;
    contiguous: boolean;
    closedOnly: boolean;
    futureRows: "WITHHELD";
  };
  event: {
    state: "OBSERVED" | "UNAVAILABLE" | "WITHHELD";
    observation: ExitEventObservation | null;
    time: string | null;
    candleIndex: number | null;
    identity: string | null;
    level: number | null;
    title: string | null;
  };
  sourceStatus: "SOURCE_REVIEW_ONLY";
  dataStatus: "AVAILABLE" | "UNAVAILABLE";
  outcomeStatus: "WITHHELD";
  outcomeReason: "NO_EXIT_OUTCOME_OR_FILL_INFERENCE";
  authority: typeof EXIT_EVENT_IDENTITY_AUTHORITY;
  live_apply_allowed: false;
};

export type ExitEventInput = {
  kind: ExitEventKind;
  bars: readonly M5PriceBar[];
  occurrenceTime: string;
  direction: PriceActionDirection;
  observedThrough?: string;
  nowMs?: number;
  calendar?: EconomicCalendar | null;
  level?: number | null;
};

const validDirection = (value: unknown): value is PriceActionDirection => value === "UP" || value === "DOWN" || value === "NEUTRAL";

function instantOf(value: unknown): number | null {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value) : null;
  if (!match) return null;
  const text = value as string;
  const [, year, month, day, hour, minute, second, millis = "000", zone] = match;
  const instant = Date.parse(text);
  const offset = zone === "Z" ? 0 : (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6))) * (zone[0] === "+" ? 1 : -1);
  const expected = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number(millis)) - offset * 60_000;
  return Number.isFinite(instant) && instant === expected && instant % M5_MS === 0 ? instant : null;
}

function calendarInstantOf(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})Z$/.test(value)) return null;
  const instant = Date.parse(value as string);
  return Number.isFinite(instant) && new Date(instant).toISOString() === value ? instant : null;
}

function canonical(instant: number): string {
  return new Date(instant).toISOString();
}

function validBar(bar: M5PriceBar | undefined, nowMs: number): boolean {
  const instant = instantOf(bar?.t);
  return !!bar && instant != null && instant + M5_MS <= nowMs && bar.closed !== false
    && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
    && bar.h > bar.l && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c);
}

function base(input: ExitEventInput, state: ExitEventState, reason: string): ExitEventIdentity {
  return {
    version: EXIT_EVENT_IDENTITY_VERSION,
    kind: input.kind,
    state,
    reason,
    occurrenceTime: input.occurrenceTime,
    direction: validDirection(input.direction) ? input.direction : "NEUTRAL",
    causalPrefix: { state: "UNAVAILABLE", start: null, end: null, bars: 0, maxBars: MAX_PREFIX_BARS, contiguous: false, closedOnly: false, futureRows: "WITHHELD" },
    event: { state: "UNAVAILABLE", observation: null, time: null, candleIndex: null, identity: null, level: null, title: null },
    sourceStatus: "SOURCE_REVIEW_ONLY",
    dataStatus: "UNAVAILABLE",
    outcomeStatus: "WITHHELD",
    outcomeReason: "NO_EXIT_OUTCOME_OR_FILL_INFERENCE",
    authority: EXIT_EVENT_IDENTITY_AUTHORITY,
    live_apply_allowed: false,
  };
}

function unavailable(input: ExitEventInput, reason: string): ExitEventIdentity {
  return base(input, "UNAVAILABLE", reason);
}

/**
 * Observe one exit-event identity from an explicitly supplied closed-M5
 * prefix. The helper never creates a calendar event, fill, order, outcome or
 * rate. Rows after `observedThrough` are deliberately ignored.
 */
export function patternExitEventIdentity(input: ExitEventInput): ExitEventIdentity {
  const result = base(input, "UNAVAILABLE", "INVALID_EXIT_EVENT_INPUT");
  if (input.kind !== "NEWS" && input.kind !== "RESISTANCE" && input.kind !== "REVERSAL") return result;
  if (!validDirection(input.direction) || input.direction === "NEUTRAL") return unavailable(input, "NEUTRAL_OR_INVALID_DIRECTION");
  const nowMs = input.nowMs ?? Date.now();
  if (!Number.isFinite(nowMs) || nowMs < 0 || !Array.isArray(input.bars)) return unavailable(input, "INVALID_CAUSAL_INPUT");
  const anchorInstant = instantOf(input.occurrenceTime);
  if (anchorInstant == null) return unavailable(input, "INVALID_OCCURRENCE_IDENTITY");
  const throughInstant = input.observedThrough == null ? null : instantOf(input.observedThrough);
  if (input.observedThrough != null && throughInstant == null) return unavailable(input, "INVALID_OBSERVED_THROUGH_IDENTITY");

  let anchorIndex = -1;
  let endIndex = -1;
  for (let i = 0; i < input.bars.length; i++) {
    const instant = instantOf(input.bars[i]?.t);
    if (instant === anchorInstant) {
      if (anchorIndex >= 0) return unavailable(input, "DUPLICATE_OCCURRENCE_IDENTITY");
      anchorIndex = i;
    }
    if (throughInstant != null && instant === throughInstant) {
      if (endIndex >= 0) return unavailable(input, "DUPLICATE_OBSERVED_THROUGH_IDENTITY");
      endIndex = i;
    }
  }
  if (anchorIndex < 0) return unavailable(input, "MISSING_OCCURRENCE_CANDLE");
  if (throughInstant != null && endIndex < 0) return unavailable(input, "MISSING_OBSERVED_THROUGH_CANDLE");
  // Without an explicit observed-through identity, the occurrence candle is
  // the only revealed boundary. A later event requires a validated boundary
  // from the caller before it can become an observed identity.
  if (endIndex < 0) endIndex = anchorIndex;
  if (endIndex < anchorIndex) return unavailable(input, "OBSERVED_THROUGH_BEFORE_OCCURRENCE");
  if (endIndex - anchorIndex + 1 > MAX_PREFIX_BARS) return unavailable(input, "CAUSAL_PREFIX_TOO_LONG");
  const fromIndex = Math.max(0, endIndex - (MAX_PREFIX_BARS - 1));
  const start = input.bars[fromIndex];
  const selected = input.bars[anchorIndex];
  const prefixEnd = input.bars[endIndex];
  for (let i = fromIndex; i <= endIndex; i++) {
    const bar = input.bars[i];
    if (!validBar(bar, nowMs)) return unavailable(input, "INVALID_CAUSAL_PREFIX");
    if (i > fromIndex && instantOf(bar.t)! - instantOf(input.bars[i - 1]?.t)! !== M5_MS) return unavailable(input, "CAUSAL_PREFIX_GAP");
  }
  const prefix = { state: "AVAILABLE" as const, start: canonical(instantOf(start.t)!), end: canonical(instantOf(prefixEnd.t)!), bars: endIndex - fromIndex + 1, maxBars: MAX_PREFIX_BARS, contiguous: true, closedOnly: true, futureRows: "WITHHELD" as const };
  const readyBase = base(input, "WITHHELD", "NO_EVENT_OBSERVED_IN_REVEALED_PREFIX");
  const ready: ExitEventIdentity = { ...readyBase, causalPrefix: prefix, dataStatus: "AVAILABLE", event: { ...readyBase.event, state: "WITHHELD" } };
  const eventUnavailable = (reason: string): ExitEventIdentity => ({ ...ready, state: "UNAVAILABLE", reason, event: { ...ready.event, state: "UNAVAILABLE" }, dataStatus: "UNAVAILABLE" });

  if (input.kind === "NEWS") {
    if (!input.calendar || input.calendar.status !== "CONFIGURED" || !Array.isArray(input.calendar.events)) return eventUnavailable("VALIDATED_NEWS_CALENDAR_UNAVAILABLE");
    let calendar: EconomicCalendar;
    try {
      // Direct callers can bypass the storage parser, so validate the full
      // payload before accepting any event identity.
      calendar = parseEconomicCalendar(input.calendar);
    } catch {
      return eventUnavailable("INVALID_NEWS_CALENDAR");
    }
    const eventUpperBound = instantOf(prefixEnd.t)!;
    const event = calendar.events.find(candidate => {
      const at = calendarInstantOf(candidate.at_utc);
      return at != null && at >= anchorInstant && at <= eventUpperBound;
    });
    if (!event) return ready;
    const eventTime = new Date(calendarInstantOf(event.at_utc)!).toISOString();
    return { ...ready, state: "AVAILABLE", reason: "VALIDATED_NEWS_EVENT_IDENTITY_OBSERVED", event: { state: "OBSERVED", observation: "NEWS_EVENT_IDENTITY", time: eventTime, candleIndex: null, identity: `${eventTime}\u0000${event.title}`, level: null, title: event.title } };
  }

  if (!Number.isFinite(input.level)) return eventUnavailable(input.kind === "RESISTANCE" ? "VALIDATED_RESISTANCE_LEVEL_UNAVAILABLE" : "VALIDATED_REVERSAL_LEVEL_UNAVAILABLE");
  const level = input.level!;
  const invalidLevel = input.kind === "RESISTANCE"
    ? (input.direction === "UP" && level <= selected.c) || (input.direction === "DOWN" && level >= selected.c)
    : (input.direction === "UP" && level >= selected.c) || (input.direction === "DOWN" && level <= selected.c);
  if (invalidLevel) return eventUnavailable("LEVEL_NOT_ADVERSE_TO_SETUP_DIRECTION");
  for (let i = anchorIndex + 1; i <= endIndex; i++) {
    const bar = input.bars[i];
    const touched = input.kind === "RESISTANCE"
      ? input.direction === "UP" ? bar.h >= level : bar.l <= level
      : input.direction === "UP" ? bar.c < level : bar.c > level;
    if (!touched) continue;
    const observation: ExitEventObservation = input.kind === "RESISTANCE" ? "STRUCTURAL_LEVEL_TOUCH" : "ADVERSE_LEVEL_BREAK";
    return { ...ready, state: "AVAILABLE", reason: input.kind === "RESISTANCE" ? "VALIDATED_STRUCTURAL_LEVEL_TOUCH_OBSERVED" : "VALIDATED_ADVERSE_LEVEL_BREAK_OBSERVED", event: { state: "OBSERVED", observation, time: canonical(instantOf(bar.t)!), candleIndex: i, identity: `${canonical(instantOf(bar.t)!)}\u0000${level}`, level, title: null } };
  }
  return ready;
}

export const observePatternExitEventIdentity = patternExitEventIdentity;

export const patternNewsExitEventIdentity = (input: Omit<ExitEventInput, "kind">) => patternExitEventIdentity({ ...input, kind: "NEWS" });
export const patternResistanceExitEventIdentity = (input: Omit<ExitEventInput, "kind">) => patternExitEventIdentity({ ...input, kind: "RESISTANCE" });
export const patternReversalExitEventIdentity = (input: Omit<ExitEventInput, "kind">) => patternExitEventIdentity({ ...input, kind: "REVERSAL" });
