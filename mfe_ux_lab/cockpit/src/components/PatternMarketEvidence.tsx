import type { PatternMarketContext } from "../lib/patternMarketContext.ts";
import type { PatternSetupSelection } from "../lib/patternSetupSelection.ts";
import { formatPriceActionSourcePages } from "../lib/priceActionSourcePages.ts";
const price = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const progression = { HIGHER_HIGHS_AND_LOWS: "Last two confirmed highs and lows both rise", LOWER_HIGHS_AND_LOWS: "Last two confirmed highs and lows both fall", MIXED: "Confirmed high/low steps are mixed or within tolerance", INSUFFICIENT_SWINGS: "Fewer than two confirmed highs or lows" };
const concerns = { OPPOSING_CONFIRMED_SWINGS: "The setup points against the measured confirmed swing progression.", UP_NEAR_REPEATED_CEILING: "The UP setup is in the upper quarter of a repeated range, near its ceiling.", DOWN_NEAR_REPEATED_FLOOR: "The DOWN setup is in the lower quarter of a repeated range, near its floor." };
const selectionLens = {
  ALIGNED_STRONG_REVIEW: "Strong local geometry aligns with the measured swing progression.",
  ALIGNED_REVIEW: "Local geometry aligns with the measured swing progression.",
  COUNTER_DOMINANCE_REVIEW: "Local geometry points against the measured swing progression; review the wider structure first.",
  RANGE_EDGE_REVIEW: "Local geometry is near a measured repeated-range edge; continuation room is a review concern.",
  PRESSURE_CONFLICT_REVIEW: "The measured swing steps and wider close/EMA pressure conflict; review the competing structure.",
  MIXED_CONTEXT_REVIEW: "Local geometry is measured, while wider swing context is mixed or unclear.",
  UNAVAILABLE: "Strength-aware review lens is unavailable.",
} as const;
const strengthLabel = {
  STRONG_GEOMETRY: "strong",
  MODERATE_GEOMETRY: "moderate",
  WEAK_GEOMETRY: "weak",
  UNKNOWN: "unknown",
} as const;
const pressureLabel = { ALIGNED: "EMA slope and net close movement agree with the setup", OPPOSING: "EMA slope and net close movement oppose the setup", CONFLICTING_OR_UNCLEAR: "EMA slope, net movement or close efficiency do not agree clearly", UNAVAILABLE: "Wider pressure measurements unavailable" } as const;
export function PatternMarketEvidence({ context, selection, onInspectContext }: { context: PatternMarketContext; selection?: PatternSetupSelection | null; onInspectContext: () => void }) {
  const range = context.repeatedRange;
  return <section aria-label="Wider swing and range context" data-market-context-state={context.state}>
    <h3>Wider swing and range context</h3>
    <p role="status">{context.state === "WITHHELD" ? `Context withheld: ${context.reason.replace(/_/g, " ").toLowerCase()}.` : `${progression[context.swingProgression]}.`}</p>
    {context.state === "MEASURED" && <>
      {context.concerns.length > 0 ? <ul className="pattern-market-concerns">{context.concerns.map(concern => <li key={concern}>{concerns[concern]}</li>)}</ul> : <p>No local context conflict measured. This does not qualify an entry.</p>}
      {selection?.state === "MEASURED" && <div data-setup-selection={selection.lens} aria-label="Strength-aware setup review"><p>Measured {strengthLabel[selection.strength]} local geometry ({(selection.detectorScore! * 100).toFixed(1)}% bounded detector score). {selectionLens[selection.lens]} {pressureLabel[selection.pressureAgreement]}.</p><p className="chart-pattern-inspector-muted">Local review buckets: strong score at least 70%, moderate at least 45%, otherwise weak; scores describe each detector's own geometry and are not comparable probabilities. Pressure agreement requires at least 0.25 median ranges of EMA change, 1 median range of net movement, and 20% close efficiency. These choices do not measure source-prescribed dominance. This descriptive setup review does not filter history or authorize an entry; SHADOW_ONLY / NO_DECISION.</p></div>}
      {selection?.state === "WITHHELD" && selection.reason !== "MISSING_SETUP_RECEIPT" && <p className="chart-pattern-inspector-muted">Strength-aware setup selection withheld: {selection.reason.replace(/_/g, " ").toLowerCase()}.</p>}
      <p>{context.bars} consecutive closed M5 bars, {context.contextStart} to {context.contextEnd} UTC.{context.truncatedByGap ? " Earlier context stops at missing or invalid data." : ""}</p>
      {context.highStepUnits != null && <p>Confirmed high step {context.highStepUnits.toFixed(2)} / low step {context.lowStepUnits!.toFixed(2)} median ranges. H1/H2 and L1/L2 mark these swings in Context view; each requires two later closed candles.</p>}
      <p>Bounded EMA25 {price(context.ema25!)}; 12-bar change {context.emaSlope12Units!.toFixed(2)} median ranges. Net close move {context.netCloseUnits!.toFixed(2)} median ranges / close-path efficiency {(context.closeEfficiency! * 100).toFixed(1)}%.</p>
      {range ? <p>Repeated range floor {price(range.floor.low)}–{price(range.floor.high)} ({range.floor.touches.length} confirmed touches); ceiling {price(range.ceiling.low)}–{price(range.ceiling.high)} ({range.ceiling.touches.length}). Setup close at {(range.position * 100).toFixed(1)}% from floor to ceiling; width {range.widthUnits.toFixed(2)} median ranges. All intervening closes remain inside the tolerance band.</p> : <p>No qualifying repeated range in this window. Range absence is unknown, rather than evidence of a trend or a clear path.</p>}
      <button type="button" onClick={onInspectContext}>Inspect swing and range context</button>
    </>}
    <p className="chart-pattern-inspector-muted">Local measurements: up to 96 closed bars, minimum 40; five-bar swing confirmation, 0.25 median-range step/touch tolerance, repeated boundary touches at least 8 bars apart with at least four alternating floor/ceiling visits, range width at least 4 median ranges and span at least 24 bars. Upper/lower quarter concerns are study choices. EMA25 uses a local SMA25 seed; its slope and close efficiency do not classify source dominance. This context does not filter history, change ATR positions or authorize entries. Older/sloping ranges and competing chart formations remain unmeasured.</p>
    <p className="chart-pattern-inspector-muted">Source context principles: {formatPriceActionSourcePages(context.sourcePages)}. These numerical rules are local proxies.</p>
  </section>;
}
