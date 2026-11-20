import type { PatternSetupMilestone, PatternSetupTimeline } from "./patternSetupTimeline.ts";

type NavigationView = {
  rows: readonly { t: string }[];
  anchor: { t: string };
  from: number;
  index: number;
};

export type PatternSetupNavigationEvent = PatternSetupMilestone & {
  /** Local row in the displayed mini chart, never a retained-tape ordinal. */
  index: number;
  absoluteIndex: number;
  /** Events on the same candle share this key, including close and origin. */
  highlightKey: string;
};
export type PatternSetupNavigationGroup = {
  key: string;
  candleTime: string;
  index: number;
  absoluteIndex: number;
  kinds: PatternSetupMilestone["kind"][];
  label: string;
};
export type PatternSetupEventNavigation = {
  state: "AVAILABLE" | "WITHHELD";
  reason: string;
  events: PatternSetupNavigationEvent[];
  groups: PatternSetupNavigationGroup[];
  authority: "SHADOW_ONLY / NO_DECISION";
};

const M5_MS = 300_000;
const kinds: readonly PatternSetupMilestone["kind"][] = ["SIGNAL", "ENTRY_BREAK", "CLOSE_CONFIRMATION", "OUTCOME_MEASUREMENT_START"];
/** Accept only the two canonical UTC/M5 spellings used by closed-bar receipts. */
function utcM5(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return null;
  const instant = Date.parse(value);
  if (!Number.isFinite(instant) || instant % M5_MS !== 0) return null;
  // Date.parse normalizes impossible dates; canonical round-trip rejects them.
  return new Date(instant).toISOString() === value.replace(/(?:\.000)?Z$/, ".000Z") ? instant : null;
}

/**
 * Map an already attested timeline onto the displayed bounded candle rows.
 * This is identity-only navigation: no OHLC, detector, outcome calculation or
 * next-candle lookup is required. A close/origin marks its source candle even
 * when its actual close instant equals a later candle's open.
 */
export function patternSetupEventNavigation(timeline: PatternSetupTimeline, view: NavigationView): PatternSetupEventNavigation {
  const withheld = (reason: string): PatternSetupEventNavigation => ({ state: "WITHHELD", reason, events: [], groups: [], authority: "SHADOW_ONLY / NO_DECISION" });
  if (timeline.state !== "AVAILABLE") return withheld(timeline.reason);
  if (timeline.version !== "pattern-setup-timeline/1" || timeline.authority !== "SHADOW_ONLY / NO_DECISION") return withheld("UNVERIFIED_SETUP_TIMELINE");
  if (!Number.isSafeInteger(view.from) || view.from < 0 || !Number.isSafeInteger(view.index) || view.index < view.from) return withheld("INVALID_VIEW_SELECTION");
  const anchor = utcM5(view.anchor?.t);
  if (anchor == null) return withheld("INVALID_VIEW_ANCHOR_IDENTITY");
  const rows = new Map<number, number>();
  let previous: number | null = null;
  for (let index = 0; index < view.rows.length; index++) {
    const instant = utcM5(view.rows[index]?.t);
    if (instant == null) return withheld("INVALID_VISIBLE_UTC_M5_IDENTITY");
    if (rows.has(instant) || (previous != null && instant <= previous)) return withheld("DUPLICATE_OR_REVERSED_VISIBLE_IDENTITY");
    rows.set(instant, index);
    previous = instant;
  }
  if (rows.get(anchor) !== view.index - view.from) return withheld("MISMATCHED_VIEW_SELECTION");
  if (!Array.isArray(timeline.milestones) || timeline.milestones.length !== kinds.length) return withheld("INCOMPLETE_SETUP_MILESTONES");
  const events: PatternSetupNavigationEvent[] = [];
  for (let i = 0; i < kinds.length; i++) {
    const milestone = timeline.milestones[i];
    if (milestone?.kind !== kinds[i] || typeof milestone.label !== "string" || typeof milestone.detail !== "string") return withheld("INVALID_SETUP_MILESTONE");
    const instant = utcM5(milestone.time), candle = utcM5(milestone.candleTime);
    if (instant == null || candle == null) return withheld("INVALID_MILESTONE_UTC_M5_IDENTITY");
    if (instant !== candle + (i < 2 ? 0 : M5_MS)) return withheld("MISMATCHED_MILESTONE_CANDLE_TIME");
    if (i >= 2 && candle !== anchor) return withheld("STALE_SETUP_TIMELINE");
    const index = rows.get(candle);
    if (index == null) return withheld("MISSING_VISIBLE_EVENT_CANDLE");
    const candleTime = new Date(candle).toISOString();
    events.push({ ...milestone, time: new Date(instant).toISOString(), candleTime, index, absoluteIndex: view.from + index, highlightKey: `setup-candle:${candleTime}` });
  }
  if (events[0].index >= events[1].index || events[1].index > events[2].index) return withheld("INVALID_MILESTONE_CHRONOLOGY");
  const groups: PatternSetupNavigationGroup[] = [];
  for (const event of events) {
    const previousGroup = groups[groups.length - 1];
    if (previousGroup?.key === event.highlightKey) {
      previousGroup.kinds.push(event.kind);
      previousGroup.label += ` / ${event.label}`;
    } else groups.push({ key: event.highlightKey, candleTime: event.candleTime, index: event.index, absoluteIndex: event.absoluteIndex, kinds: [event.kind], label: event.label });
  }
  return { state: "AVAILABLE", reason: "ATTESTED_VISIBLE_SETUP_EVENTS", events, groups, authority: "SHADOW_ONLY / NO_DECISION" };
}
