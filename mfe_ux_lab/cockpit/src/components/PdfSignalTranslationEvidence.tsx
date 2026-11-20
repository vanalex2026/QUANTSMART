import type { PdfTranslationState } from "../lib/pdfSignalTranslation.ts";
import { detectAllPdfSignals } from "../lib/pdfSignalDetector.ts";
import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import { useLocale } from "../lib/locale.tsx";
import { readConfiguredEconomicCalendar } from "../lib/pdfExternalInputs.ts";
import { useEffect, useMemo, useState } from "react";

const AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;
// `translatePdfSignalConcepts` remains the lower-level compatibility export;
// this surface intentionally consumes `detectAllPdfSignals` as its single
// source of descriptor state.

const label = (id: string, locale: "en" | "vi") => {
  const names: Record<string, [string, string]> = {
    signal_entry_bar: ["Signal / entry bar", decodeURIComponent("N%E1%BA%BFn%20t%C3%ADn%20hi%E1%BB%87u%20%2F%20v%C3%A0o%20l%E1%BB%87nh")],
    bracket_costs: ["Bracket and costs", decodeURIComponent("Bracket%20v%C3%A0%20chi%20ph%C3%AD")],
    news_exit: ["News exit", decodeURIComponent("Tho%C3%A1t%20tr%C6%B0%E1%BB%9Bc%20tin")],
    resistance_exit: ["Resistance and room", decodeURIComponent("Kh%C3%A1ng%20c%E1%BB%B1%20v%C3%A0%20kho%E1%BA%A3ng%20tr%E1%BB%91ng")],
    reversal_exit: ["Reversal exit", decodeURIComponent("Tho%C3%A1t%20khi%20%C4%91%E1%BA%A3o%20chi%E1%BB%81u")],
    trade_selection_failure: ["Selection failure", decodeURIComponent("Th%E1%BA%A5t%20b%E1%BA%A1i%20l%E1%BB%B1a%20ch%E1%BB%8Dn%20l%E1%BB%87nh")],
    consecutive_review: ["Consecutive review", decodeURIComponent("R%C3%A0%20so%C3%A1t%20li%C3%AAn%20ti%E1%BA%BFp")],
    position_sizing: ["Position sizing", decodeURIComponent("Qu%E1%BA%A3n%20tr%E1%BB%8B%20kh%E1%BB%91i%20l%C6%B0%E1%BB%A3ng")],
    low_volatility: ["Low volatility", decodeURIComponent("Bi%E1%BA%BFn%20%C4%91%E1%BB%99ng%20th%E1%BA%A5p")],
    obstacle_room: ["Obstacle room", decodeURIComponent("V%C3%B9ng%20c%E1%BA%A3n%20ph%C3%ADa%20tr%C6%B0%E1%BB%9Bc")],
  };
  return names[id]?.[locale === "vi" ? 1 : 0] || id;
};

const reasonLabel = (reason: string, locale: "en" | "vi") => {
  const reasons: Record<string, [string, string]> = {
    CLOSED_M5_CANDLE_GEOMETRY_ONLY: ["Closed M5 candle geometry only", decodeURIComponent("Ch%E1%BB%89%20h%C3%ACnh%20h%E1%BB%8Dc%20n%E1%BA%BFn%20M5%20%C4%91%C3%A3%20%C4%91%C3%B3ng")],
    EXECUTION_MODEL_UNAVAILABLE: ["Execution model unavailable", decodeURIComponent("Ch%C6%B0a%20c%C3%B3%20m%C3%B4%20h%C3%ACnh%20kh%E1%BB%9Bp%20l%E1%BB%87nh")],
    USER_SUPPLIED_QUOTE_PRICE_BRACKET: ["User-supplied quote-price bracket", decodeURIComponent("Khung%20gi%C3%A1%20theo%20%C4%91%C6%A1n%20v%E1%BB%8B%20gi%C3%A1%20do%20ng%C6%B0%E1%BB%9Di%20d%C3%B9ng%20cung%20c%E1%BA%A5p")],
    QUOTE_PRICE_BRACKET_ASSUMPTIONS_UNAVAILABLE: ["Quote-price bracket assumptions unavailable", decodeURIComponent("Ch%C6%B0a%20c%C3%B3%20gi%E1%BA%A3%20%C4%91%E1%BB%8Bnh%20khung%20gi%C3%A1%20theo%20%C4%91%C6%A1n%20v%E1%BB%8B%20gi%C3%A1")],
    VALIDATED_NEWS_CALENDAR_UNAVAILABLE: ["Validated news calendar unavailable", decodeURIComponent("Ch%C6%B0a%20c%C3%B3%20l%E1%BB%8Bch%20tin%20%C4%91%C3%A3%20x%C3%A1c%20minh")],
    VALIDATED_NEWS_EVENT_IDENTITY_ONLY: ["Validated news-event identity only", decodeURIComponent("Ch%E1%BB%89%20danh%20t%C3%ADnh%20s%E1%BB%B1%20ki%E1%BB%87n%20tin%20%C4%91%C3%A3%20x%C3%A1c%20minh")],
    VALIDATED_NEWS_EVENT_IDENTITY_OBSERVED: ["Validated news-event identity observed", decodeURIComponent("%C4%90%C3%A3%20quan%20s%C3%A1t%20danh%20t%C3%ADnh%20s%E1%BB%B1%20ki%E1%BB%87n%20tin%20%C4%91%C3%A3%20x%C3%A1c%20minh")],
    VALIDATED_RESISTANCE_LEVEL_UNAVAILABLE: ["Validated resistance level unavailable", decodeURIComponent("Ch%C6%B0a%20c%C3%B3%20m%E1%BB%A9c%20kh%C3%A1ng%20c%E1%BB%B1%20%C4%91%C3%A3%20x%C3%A1c%20minh")],
    VALIDATED_REVERSAL_LEVEL_UNAVAILABLE: ["Validated reversal level unavailable", decodeURIComponent("Ch%C6%B0a%20c%C3%B3%20m%E1%BB%A9c%20%C4%91%E1%BA%A3o%20chi%E1%BB%81u%20%C4%91%C3%A3%20x%C3%A1c%20minh")],
    VALIDATED_STRUCTURAL_LEVEL_TOUCH_OBSERVED: ["Validated structural-level touch observed", decodeURIComponent("%C4%90%C3%A3%20quan%20s%C3%A1t%20ch%E1%BA%A1m%20m%E1%BB%A9c%20c%E1%BA%A5u%20tr%C3%BAc%20%C4%91%C3%A3%20x%C3%A1c%20minh")],
    VALIDATED_ADVERSE_LEVEL_BREAK_OBSERVED: ["Validated adverse-level break observed", decodeURIComponent("%C4%90%C3%A3%20quan%20s%C3%A1t%20ph%C3%A1%20m%E1%BB%A9c%20b%E1%BA%A5t%20l%E1%BB%A3i%20%C4%91%C3%A3%20x%C3%A1c%20minh")],
    VALIDATED_ADVERSE_EVENT_IDENTITY_ONLY: ["Validated adverse-event identity only", decodeURIComponent("Ch%E1%BB%89%20danh%20t%C3%ADnh%20s%E1%BB%B1%20ki%E1%BB%87n%20b%E1%BA%A5t%20l%E1%BB%A3i%20%C4%91%C3%A3%20x%C3%A1c%20minh")],
    DIRECTION_OR_PRIOR_CONTEXT_REQUIRED: ["Direction or prior context is required", decodeURIComponent("C%E1%BA%A7n%20h%C6%B0%E1%BB%9Bng%20ho%E1%BA%B7c%20b%E1%BB%91i%20c%E1%BA%A3nh%20tr%C6%B0%E1%BB%9Bc%20%C4%91%C3%B3")],
    LOCAL_ADVERSE_EXTREME_REFERENCE: ["Local adverse extreme reference only", decodeURIComponent("Ch%E1%BB%89%20tham%20chi%E1%BA%BFu%20c%E1%BB%B1c%20tr%E1%BB%8B%20b%E1%BA%A5t%20l%E1%BB%A3i%20c%E1%BB%A5c%20b%E1%BB%99")],
    ADVERSE_LEVEL_OR_EXECUTION_LABEL_REQUIRED: ["Adverse level or execution label is required", decodeURIComponent("C%E1%BA%A7n%20m%E1%BB%A9c%20b%E1%BA%A5t%20l%E1%BB%A3i%20ho%E1%BA%B7c%20nh%C3%A3n%20kh%E1%BB%9Bp%20l%E1%BB%87nh")],
    CAUSAL_PRIOR_RANGE_OBSERVED: ["Causal prior range observed", decodeURIComponent("%C4%90%C3%A3%20quan%20s%C3%A1t%20bi%C3%AAn%20tr%C6%B0%E1%BB%9Bc%20theo%20nh%C3%A2n%20qu%E1%BA%A3")],
    CAUSAL_PREFIX_CONTEXT_AVAILABLE: ["Causal-prefix context available", decodeURIComponent("C%C3%B3%20b%E1%BB%91i%20c%E1%BA%A3nh%20ti%E1%BB%81n%20t%E1%BB%91%20nh%C3%A2n%20qu%E1%BA%A3")],
    DIRECTIONAL_FAILURE_LABEL_UNAVAILABLE: ["Directional failure label unavailable", decodeURIComponent("Ch%C6%B0a%20c%C3%B3%20nh%C3%A3n%20th%E1%BA%A5t%20b%E1%BA%A1i%20theo%20h%C6%B0%E1%BB%9Bng")],
    CLOSED_PREFIX_COVERAGE_ONLY: ["Closed-prefix coverage only", decodeURIComponent("Ch%E1%BB%89%20bao%20ph%E1%BB%A7%20ti%E1%BB%81n%20t%E1%BB%91%20%C4%91%C3%A3%20%C4%91%C3%B3ng")],
    CAUSAL_PREFIX_DESCRIPTORS_AVAILABLE: ["Causal-prefix descriptors available", decodeURIComponent("C%C3%B3%20m%C3%B4%20t%E1%BA%A3%20t%C3%ADnh%20nh%C3%A2n%20qu%E1%BA%A3%20c%E1%BB%A7a%20ti%E1%BB%81n%20t%E1%BB%91")],
    USER_SIZING_AND_COST_ASSUMPTIONS_REQUIRED: ["User sizing and cost assumptions are required", decodeURIComponent("C%E1%BA%A7n%20gi%E1%BA%A3%20%C4%91%E1%BB%8Bnh%20kh%E1%BB%91i%20l%C6%B0%E1%BB%A3ng%20v%C3%A0%20chi%20ph%C3%AD%20t%E1%BB%AB%20ng%C6%B0%E1%BB%9Di%20d%C3%B9ng")],
    USER_SUPPLIED_RISK_UNIT_OBSERVATION: ["User-supplied risk-unit observation", decodeURIComponent("Quan%20s%C3%A1t%20%C4%91%C6%A1n%20v%E1%BB%8B%20r%E1%BB%A7i%20ro%20do%20ng%C6%B0%E1%BB%9Di%20d%C3%B9ng%20cung%20c%E1%BA%A5p")],
    LOCAL_RECENT_RANGE_BELOW_BASELINE: ["Local recent range is below baseline", decodeURIComponent("Bi%C3%AAn%20g%E1%BA%A7n%20%C4%91%C3%A2y%20th%E1%BA%A5p%20h%C6%A1n%20m%E1%BB%A9c%20c%C6%A1%20s%E1%BB%9F")],
    LOCAL_RECENT_RANGE_NOT_BELOW_BASELINE: ["Local recent range is not below baseline", decodeURIComponent("Bi%C3%AAn%20g%E1%BA%A7n%20%C4%91%C3%A2y%20kh%C3%B4ng%20th%E1%BA%A5p%20h%C6%A1n%20m%E1%BB%A9c%20c%C6%A1%20s%E1%BB%9F")],
    NO_UNRETIRED_CONFIRMED_SWING_AHEAD_IN_LOCAL_CONTEXT: ["No unretired confirmed swing ahead in local context", decodeURIComponent("Kh%C3%B4ng%20c%C3%B3%20nh%E1%BB%8Bp%20x%C3%A1c%20nh%E1%BA%ADn%20ch%C6%B0a%20b%E1%BB%8B%20ph%C3%A1%20%E1%BB%9F%20ph%C3%ADa%20tr%C6%B0%E1%BB%9Bc%20trong%20b%E1%BB%91i%20c%E1%BA%A3nh%20c%E1%BB%A5c%20b%E1%BB%99")],
  };
  if (reasons[reason]) return reasons[reason][locale === "vi" ? 1 : 0];
  return reason.toLowerCase().replace(/_/g, " ");
};

const stateLabel = (state: PdfTranslationState, locale: "en" | "vi") => ({
  DESCRIPTIVE: locale === "vi" ? decodeURIComponent("M%C3%B4%20t%E1%BA%A3") : "Descriptive",
  UNAVAILABLE: locale === "vi" ? decodeURIComponent("Ch%C6%B0a%20c%C3%B3%20d%E1%BB%AF%20li%E1%BB%87u") : "Unavailable",
  WITHHELD: locale === "vi" ? decodeURIComponent("%C4%90ang%20gi%E1%BB%AF%20l%E1%BA%A1i") : "Withheld",
}[state]);

export function PdfSignalTranslationEvidence({ bars, selectedTime, direction, protection, enabled }: {
  bars: readonly OhlcBar[];
  selectedTime: string;
  direction: "UP" | "DOWN" | "NEUTRAL";
  protection?: number;
  enabled: boolean;
}) {
  const { locale } = useLocale();
  const [calendarRevision, setCalendarRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setCalendarRevision((value) => value + 1);
    window.addEventListener("mfe-workspace-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("mfe-workspace-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const calendar = useMemo(() => readConfiguredEconomicCalendar(), [calendarRevision]);
  const allSignals = detectAllPdfSignals({
    bars: bars.map((bar) => ({ t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, closed: (bar as OhlcBar & { closed?: boolean }).closed })),
    selectedTime,
    direction,
    protection,
    calendar,
    enabled,
  });
  // Render the same source-note descriptors that produced the unified
  // observations so state and reason cannot diverge between API and UI.
  const displayDescriptors = Object.values(allSignals.sourceNoteDescriptors);
  // Keep the aggregate state tied to the unified descriptors above. The
  // The legacy translation receipt has different per-concept reasons and must
  // not drive a stale UI state attribute.
  const sourceDescriptorState = displayDescriptors.some((descriptor) => descriptor.state === "DESCRIPTIVE")
    ? "DESCRIPTIVE"
    : displayDescriptors.some((descriptor) => descriptor.state === "UNAVAILABLE")
      ? "UNAVAILABLE"
      : "WITHHELD";
  const title = locale === "vi" ? decodeURIComponent("To%C3%A0n%20b%E1%BB%99%20t%C3%ADn%20hi%E1%BB%87u%20PDF%20tr%C3%AAn%20XAUUSD%20M5") : "All PDF signals on XAUUSD M5";
  const introId = "pdf-signal-translation-description";
  const sourceDataPrefix = locale === "vi" ? "SOURCE_REVIEW_ONLY / d\u1eef li\u1ec7u" : "SOURCE_REVIEW_ONLY / data";
  const outcomeSuffix = locale === "vi" ? " / k\u1ebft qu\u1ea3 WITHHELD" : " / outcome WITHHELD";
  return <section className="pdf-signal-translation" aria-labelledby="pdf-signal-translation-title" aria-describedby={introId} data-translation-state={sourceDescriptorState}>
    <div className="pdf-signal-translation-head"><h3 id="pdf-signal-translation-title">{title}</h3><span aria-label={`Authority ${AUTHORITY}`}>{AUTHORITY}</span></div>
    <p id={introId} className="chart-pattern-inspector-muted">{locale === "vi" ? decodeURIComponent("C%C3%A1c%20m%C3%B4%20t%E1%BA%A3%20ch%E1%BB%89%20d%C3%B9ng%20n%E1%BA%BFn%20M5%20%C4%91%C3%A3%20%C4%91%C3%B3ng%20v%C3%A0%20%C4%91%C3%A3%20bi%E1%BA%BFt.%20K%E1%BA%BFt%20qu%E1%BA%A3%2C%20l%E1%BB%87nh%2C%20kh%E1%BB%9Bp%20l%E1%BB%87nh%20v%C3%A0%20d%E1%BB%B1%20b%C3%A1o%20v%E1%BA%ABn%20%C4%91%C6%B0%E1%BB%A3c%20gi%E1%BB%AF%20l%E1%BA%A1i.") : "Descriptors use only known closed M5 candles. Outcomes, orders, fills and forecasts remain withheld."}</p>
    <div className="pdf-signal-translation-summary" role="status" aria-live="polite" data-pdf-total={allSignals.counts.total}>
      {locale === "vi"
        ? `${decodeURIComponent("%C4%90%C3%A3%20ki%E1%BB%83m%20tra")} ${allSignals.counts.total}/23 ${decodeURIComponent("t%C3%ADn%20hi%E1%BB%87u%20PDF%20tr%C3%AAn%20XAUUSD%20M5")} ${decodeURIComponent("%C2%B7%20ph%C3%A1t%20hi%E1%BB%87n")} ${allSignals.counts.detected} ${decodeURIComponent("%C2%B7%20t%E1%BA%A1m%20d%E1%BB%ABng")} ${allSignals.counts.abstain} ${decodeURIComponent("%C2%B7%20ch%C6%B0a%20%C4%91%E1%BB%A7%20d%E1%BB%AF%20li%E1%BB%87u")} ${allSignals.counts.unavailable} ${decodeURIComponent("%C2%B7%20gi%E1%BB%AF%20l%E1%BA%A1i")} ${allSignals.counts.withheld}`
        : `Checked ${allSignals.counts.total}/23 PDF signals on XAUUSD M5 ${String.fromCharCode(183)} detected ${allSignals.counts.detected} ${String.fromCharCode(183)} abstain ${allSignals.counts.abstain} ${String.fromCharCode(183)} unavailable ${allSignals.counts.unavailable} ${String.fromCharCode(183)} withheld ${allSignals.counts.withheld}`}
    </div>
    <div className="pdf-signal-translation-grid" role="list" aria-label={locale === "vi" ? decodeURIComponent("Danh%20s%C3%A1ch%20m%C3%B4%20t%E1%BA%A3%20t%C3%ADn%20hi%E1%BB%87u%20PDF") : "PDF signal descriptor list"}>
      {displayDescriptors.map((descriptor) => <article key={descriptor.conceptId} className={`pdf-signal-translation-card state-${descriptor.state.toLowerCase()}`} role="listitem">
        <strong>{label(descriptor.conceptId, locale)}</strong>
        <span>{stateLabel(descriptor.state, locale)}</span>
        <small className="pdf-signal-translation-card-status">{sourceDataPrefix} {descriptor.dataStatus}{outcomeSuffix}</small>
        <small>{reasonLabel(descriptor.reason, locale)}</small>
      </article>)}
    </div>
  </section>;
}
