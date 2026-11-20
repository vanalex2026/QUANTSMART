import type { PatternRoomContext } from "../lib/patternRoomContext.ts";
import { formatPriceActionSourcePages } from "../lib/priceActionSourcePages.ts";

const price = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const distance = (value: number, units: number | null) => `${price(value)} quote units${units == null ? "" : ` / ${units.toFixed(2)} technical-risk units`}`;
export function PatternRoomEvidence({ room, onInspectContext }: { room: PatternRoomContext; onInspectContext: () => void }) {
  const nearest = room.structuralLevels[0];
  return <section className="pattern-room-evidence" aria-label="Room ahead at setup close" data-room-state={room.state}>
    <h3>Room ahead at setup close</h3>
    <p role="status">{room.state === "WITHHELD" ? `Context withheld: ${room.reason.replace(/_/g, " ").toLowerCase()}.` : !nearest ? "No confirmed swing zone ahead in this local window. This does not establish a clear path." : `Nearest ${room.direction === "UP" ? "resistance" : "support"} zone ${price(nearest.low)}${nearest.high !== nearest.low ? `-${price(nearest.high)}` : ""}; ${distance(nearest.distance, nearest.technicalRiskUnits)} ahead.`}</p>
    {room.state !== "WITHHELD" && <>
      <p>{room.bars} consecutive closed M5 bars | {room.contextStart} to {room.contextEnd} UTC.{room.truncatedByGap ? " Earlier context stops at missing or invalid data." : ""}</p>
      {room.technicalRisk != null ? <p>Technical protection {price(room.protectionReference!)} | confirmation close {price(room.entry!)} | one technical-risk unit = {price(room.technicalRisk)}. This is separate from the ATR study risk.</p> : <p>Technical risk ratio unavailable: this observation has no valid source-structure protection reference.</p>}
      {nearest && <p>{nearest.pivotTimes.length} confirmed swing point(s), known by {nearest.confirmedAt} UTC. {room.state === "WITHIN_ONE_TECHNICAL_RISK" ? "The nearest measured zone lies within one technical-risk unit." : "Distance alone does not qualify the setup."}</p>}
      {room.roundNumber && <p>Next 50-unit round landmark {price(room.roundNumber.level)} | {distance(room.roundNumber.distance, room.roundNumber.technicalRiskUnits)} ahead. A round landmark is not a confirmed barrier.</p>}
      <button type="button" onClick={onInspectContext}>Inspect wider context</button>
    </>}
    <p className="chart-pattern-inspector-muted">Local geometry: up to 96 closed bars, two candles on each side confirm a swing; zones cluster within 0.25 median range and retire after a decisive close through their far edge. Sloping levels, older context, wider dominance, news and liquidity are not assessed. This readout does not filter pattern history, change target/stop levels or establish an entry.</p>
    <p className="chart-pattern-inspector-muted" data-room-causal-prefix="true">Causal prefix: {room.causalPrefix.mode.replace(/_/g, " ")} | {room.causalPrefix.bars} closed M5 bars ending at {room.causalPrefix.end ?? "Unavailable"} UTC | local prefix data {room.causalPrefix.localDataStatus} | future rows {room.causalPrefix.futureRows.toLowerCase()} | {room.causalPrefix.sourceStatus} / data {room.causalPrefix.dataStatus} / outcome {room.causalPrefix.outcomeStatus} | {room.causalPrefix.authority} / live_apply_allowed={String(room.causalPrefix.live_apply_allowed)}</p>
    <p className="chart-pattern-inspector-muted">Source context principle: {formatPriceActionSourcePages(room.sourcePages)}. Numerical rules and 50-unit XAUUSD landmarks are local research choices.</p>
  </section>;
}
