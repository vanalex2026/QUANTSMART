import type { PatternSetupTimeline as TimelineReceipt } from "../lib/patternSetupTimeline.ts";

const price = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const labels = {
  SIGNAL: "Signal candle",
  ENTRY_BREAK: "First later OHLC break observation",
  CLOSE_CONFIRMATION: "Local model close confirmation",
  OUTCOME_MEASUREMENT_START: "Outcome measurement origin",
} as const;

/** A selected receipt's clocks, separate from execution and historical rates. */
export function PatternSetupTimeline({ timeline }: { timeline: TimelineReceipt }) {
  return <section className="pattern-setup-timeline" aria-label="Setup event timeline" data-setup-timeline-state={timeline.state}>
    <h3>Setup event timeline</h3>
    {timeline.state === "WITHHELD" ? <p role="status">Timeline withheld: {timeline.reason.replace(/_/g, " ").toLowerCase()}.</p> : <>
      <p className="chart-pattern-inspector-muted">{timeline.direction} reference {timeline.breakoutLevel == null ? "unavailable" : price(timeline.breakoutLevel)}. Candle-open identities and M5 close instants are labelled separately.</p>
      <ol>
        {timeline.milestones.map((event) => <li key={event.kind} data-setup-event={event.kind}>
          <strong>{labels[event.kind]}</strong>
          <span className="pattern-setup-timeline-time">{event.kind === "CLOSE_CONFIRMATION" || event.kind === "OUTCOME_MEASUREMENT_START" ? "M5 close instant: " : "Candle opens: "}<time dateTime={event.time}>{event.time} UTC</time></span>
          {(event.kind === "CLOSE_CONFIRMATION" || event.kind === "OUTCOME_MEASUREMENT_START") && <span className="pattern-setup-timeline-time">Confirmation candle opens: <time dateTime={event.candleTime}>{event.candleTime} UTC</time></span>}
          <span>{event.detail}</span>
        </li>)}
      </ol>
      {timeline.breakObservation === "OPEN_GAP_BEYOND_LEVEL" && <p className="chart-pattern-inspector-muted">The observed candle opened beyond the reference; OHLC does not establish a trade at that level.</p>}
      <p className="chart-pattern-inspector-muted">The first later OHLC break is an observation only. Its exact intrabar time, order path and any executable fill are unknown. ATR outcomes still start at the confirmation close; occurrence counts and rates are unchanged.</p>
    </>}
    <p className="chart-pattern-inspector-muted">PDF source context remains separate from these local OHLC model events. This timeline establishes no entry or fill. {timeline.authority} / live_apply_allowed=false.</p>
  </section>;
}
