import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PatternInspectionView } from "../lib/patternInspectionWindow.ts";
import type { PatternSetupTimeline, PatternSetupMilestone } from "../lib/patternSetupTimeline.ts";
import { patternSetupEventNavigation } from "../lib/patternSetupEventNavigation.ts";
import { patternInspectionLevels, patternInspectionLevelRail, type PatternInspectionLevel } from "../lib/patternInspectionLevels.ts";
import { BARRIER_OUTCOME_LABELS } from "../lib/patternBarrierOutcomes.ts";
import { TECHNICAL_OBSTACLE_OUTCOME_LABELS } from "../lib/patternTechnicalObstacleOutcomes.ts";
import { priceActionSetupParts, priceActionSetupReferenceTime, priceActionSetupDescription, priceActionSetupLegend, type PriceActionSetup } from "../lib/priceActionSetup.ts";

const price = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clock = (time: string) => time.slice(11, 16);

// Equivalent supported UTC spellings and retained-array coordinates are not
// new evidence. Keep all semantic receipt fields in the selection identity.
const levelEvidenceValue = (_key: string, value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return value;
  const instant = Date.parse(value);
  return Number.isFinite(instant) && instant % 300_000 === 0
    && new Date(instant).toISOString() === value.replace(/(?:\.000)?Z$/, ".000Z") ? instant : value;
};
const levelStudyEvidence = <T extends { exitIndex?: number | null }>(receipt: T | null | undefined) => {
  if (!receipt) return receipt;
  const { exitIndex: retainedOrdinal, ...evidence } = receipt;
  return evidence;
};

/** A bounded, horizontally scrollable candle plot with a stationary price axis.
 * Outcome width grows with its observed path, keeping individual candles legible.
 */
export function PatternInspectionChart({ view, label, setup, setupTimeline }: { view: PatternInspectionView; label: string; setup?: PriceActionSetup; setupTimeline?: PatternSetupTimeline | null }) {
  const scroll = useRef<HTMLDivElement | null>(null);
  const readoutId = useId();
  const levelReadoutId = useId();
  const anchor = view.index - view.from;
  // A retained/backfilled prefix can move every local ordinal while this
  // occurrence and mode keep the same React key. Preserve candle identity.
  const [selectedTime, setSelectedTime] = useState(Date.parse(view.anchor.t));
  const [selectedEvent, setSelectedEvent] = useState<PatternSetupMilestone["kind"] | null>(null);
  const [levelSelection, setLevelSelection] = useState<{ id: PatternInspectionLevel["id"]; evidence: string } | null>(null);
  const navigation = useMemo(() => {
    if (!setup || !setupTimeline || setupTimeline.direction !== setup.direction || setupTimeline.breakoutLevel !== setup.breakoutLevel) return null;
    const mapped = patternSetupEventNavigation(setupTimeline, view);
    const signalTime = setup.kind === "PATTERN_BREAK_COMBI" ? setup.insideBarTimes[setup.insideBarTimes.length - 1] : setup.signalBarTime;
    // Match this receipt to the displayed setup as well as the view anchor.
    return mapped.state === "AVAILABLE" && Date.parse(mapped.events[0].candleTime) === Date.parse(signalTime ?? "")
      && Date.parse(setup.confirmationTime) === Date.parse(view.anchor.t) ? mapped : null;
  }, [setup, setupTimeline, view]);
  const setupEvents = navigation?.events ?? [];
  const selected = view.rows.findIndex(row => Date.parse(row.t) === selectedTime);
  const activeEvent = selected < 0 ? undefined : setupEvents.find(item => item.kind === selectedEvent && item.index === selected);
  const chartHeight = setupEvents.length ? 236 : 216;
  const eventNames = { SIGNAL: "Signal", ENTRY_BREAK: "Break observed", CLOSE_CONFIRMATION: "Confirmation close", OUTCOME_MEASUREMENT_START: "Outcome origin" };
  const eventClock = (item: typeof setupEvents[number]) => item.kind === "CLOSE_CONFIRMATION" || item.kind === "OUTCOME_MEASUREMENT_START"
    ? `Actual M5 close ${item.time} UTC; confirmation candle opens ${item.candleTime} UTC`
    : `Candle opens ${item.candleTime} UTC${item.kind === "ENTRY_BREAK" ? "; exact intrabar break time is unknown" : ""}`;
  const active = selected < 0 ? anchor : selected;
  const bar = view.rows[active];
  const width = Math.max(232, view.rows.length * 16 + 24);
  const slot = (width - 24) / view.rows.length;
  const bodyWidth = Math.min(9, slot * 0.6);
  const x = (i: number) => 12 + (i + 0.5) * slot;
  const y = (value: number) => 14 + (1 - (value - view.low) / (view.high - view.low)) * 164;
  const select = (index: number, moveScroll = false, eventKind: PatternSetupMilestone["kind"] | null = null) => {
    const bounded = Math.max(0, Math.min(view.rows.length - 1, index));
    setSelectedTime(Date.parse(view.rows[bounded].t));
    setSelectedEvent(eventKind);
    if (moveScroll && scroll.current) scroll.current.scrollLeft = Math.max(0, x(bounded) - scroll.current.clientWidth / 2);
  };
  useEffect(() => {
    if (selected < 0) {
      setSelectedTime(Date.parse(view.anchor.t));
      setSelectedEvent(null);
    }
  }, [selected, view.anchor.t]);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollLeft = Math.max(0, x(active) - 48);
  // Prefix refreshes move the same selected candle within the scrollable plot.
  }, [view.anchor.t, view.mode, view.rows[0]?.t]);
  const study = view.study;
  const technical = view.technicalStudy;
  const levels = patternInspectionLevels(view, setup);
  const levelRail = patternInspectionLevelRail(levels, view.low, view.high);
  const allowedLevels = new Set(levelRail.map(item => item.id));
  // Bind a descriptor to the occurrence and its receipts, never to a rounded
  // display price. A changed/withheld receipt cannot inherit an old highlight,
  // even during the first render before the cleanup effect runs.
  const levelEvidence = JSON.stringify([label, Date.parse(view.anchor.t), view.anchor.o, view.anchor.h, view.anchor.l, view.anchor.c, view.anchor.closed,
    view.direction, setup, view.geometry, levelStudyEvidence(study), levelStudyEvidence(technical), levels], levelEvidenceValue);
  const activeLevel = levelSelection?.evidence === levelEvidence
    ? levels.find(item => item.id === levelSelection.id && allowedLevels.has(item.id)) : undefined;
  const selectLevel = (id: PatternInspectionLevel["id"]) => setLevelSelection(activeLevel?.id === id ? null : { id, evidence: levelEvidence });
  useEffect(() => {
    if (levelSelection && !activeLevel) setLevelSelection(null);
  }, [levelSelection, levelEvidence]);
  const hasSetupLevels = allowedLevels.has("setup-break") || allowedLevels.has("setup-protection");
  const hasTechnicalLevels = allowedLevels.has("technical-protection") || allowedLevels.has("technical-obstacle");
  const event = study && study.observedBars > 0 && view.index + study.observedBars <= view.to
    ? view.index + study.observedBars - view.from : null;
  const eventColor = study?.state === "TARGET_FIRST" ? "#26a69a" : study?.state === "INVALIDATION_FIRST" ? "#ef5350" : "#d6b46b";
  const studyEnd = study ? Math.min(view.to, view.index + study.observedBars) - view.from : anchor;
  const technicalEnd = technical ? Math.min(view.to, view.index + technical.observedBars) - view.from : anchor;
  const eventLabel = view.mode === "context" ? "Outcome not shown in context mode" : study ? BARRIER_OUTCOME_LABELS[study.state] : "Directional geometry withheld";
  const description = `${label}; ${view.mode === "context" ? "wider context known at setup close" : view.mode === "outcome" ? "complete observed outcome path" : "setup context"}; ${view.anchor.t} UTC; ${view.direction}; ${view.rows.length} closed M5 candles; ${eventLabel}; ${setup && hasSetupLevels ? `${priceActionSetupDescription(setup)}, confirmation candle opens ${setup.confirmationTime} UTC; ` : ""}historical closed-bar observation and illustrative research geometry; SHADOW_ONLY / NO_DECISION; no order authority`;
  const axisWidth = levelRail.length ? 108 : 68;
  return <figure className="pattern-inspection-figure">
    {setupEvents.length > 0 && <div className="pattern-inspection-events" role="group" aria-label="Inspect setup event candles">
      {setupEvents.map(item => <button key={item.kind} type="button" data-setup-event-control={item.kind} aria-pressed={activeEvent?.kind === item.kind} aria-label={`${eventNames[item.kind]}; ${eventClock(item)}; OHLC observation, no entry or fill`} title={`${item.detail} ${eventClock(item)}`} onClick={() => select(item.index, true, item.kind)}>
        <strong>{eventNames[item.kind]}</strong><span>{item.kind === "CLOSE_CONFIRMATION" || item.kind === "OUTCOME_MEASUREMENT_START" ? `Close ${clock(item.time)}` : `Open ${clock(item.candleTime)}`} UTC</span>
      </button>)}
    </div>}
    <div className="pattern-inspection-chart-frame">
      <div ref={scroll} className="pattern-inspection-scroll" role="region" tabIndex={0} aria-label="Mini chart candle inspection; Left and Right select candles, Home and End select first and last" aria-describedby={readoutId} onKeyDown={(event) => {
        const next = event.key === "ArrowLeft" ? active - 1 : event.key === "ArrowRight" ? active + 1 : event.key === "Home" ? 0 : event.key === "End" ? view.rows.length - 1 : null;
        if (next == null) return;
        event.preventDefault(); event.stopPropagation(); select(next, true);
      }}>
        <svg className="chart-pattern-inspector-chart" width={width} height={chartHeight} style={{ width, minWidth: "100%", height: chartHeight }} viewBox={`0 0 ${width} ${chartHeight}`} role="img" aria-label={description} data-inspection-mode={view.mode} data-inspection-path-bars={view.mode === "context" ? 0 : study?.observedBars ?? 0}>
          <title>{description}</title>
          {[0, 0.5, 1].map((fraction) => { const value = view.low + fraction * (view.high - view.low); return <line key={fraction} x1="0" x2={width} y1={y(value)} y2={y(value)} stroke="#292929" />; })}
          <rect x={x(anchor) - slot / 2} y="8" width={slot} height="173" fill="rgba(255,255,255,.07)" />
          {view.pullbackPressure?.state === "MEASURED" && view.pullbackPressure.terminalClusterTimes.length > 0 && (() => {
            const cluster = view.pullbackPressure.terminalClusterTimes;
            const first = view.rows.findIndex(row => Date.parse(row.t) === Date.parse(cluster[0]));
            const last = view.rows.findIndex(row => Date.parse(row.t) === Date.parse(cluster[cluster.length - 1]));
            return first < 0 || last < first ? null : <rect data-pullback-terminal-cluster={cluster.length} x={x(first) - slot / 2} width={(last - first + 1) * slot} y="8" height="173" fill="#d6b46b" fillOpacity="0.04" stroke="#d6b46b" strokeOpacity="0.6" strokeDasharray="2 3"><title>{`Local terminal compact cluster: ${cluster.length} closed bar(s), ending at signal ${cluster[cluster.length - 1]} UTC; excludes confirmation and future outcomes; not setup qualification`}</title></rect>;
          })()}
          {view.mode === "context" && view.room.structuralLevels.map((level, i) => {
            const first = view.rows.findIndex(row => Date.parse(row.t) === Date.parse(level.pivotTimes[0]));
            return <g key={level.level} data-room-zone={i + 1}><title>{`Known swing zone ${price(level.low)}-${price(level.high)}; ${level.pivotTimes.length} pivot(s); confirmed ${level.confirmedAt} UTC; not a price forecast`}</title><rect x={x(Math.max(0, first))} y={y(level.high) - 1} width={x(anchor) - x(Math.max(0, first))} height={Math.max(2, y(level.low) - y(level.high))} fill="#d6b46b" fillOpacity="0.12" /><line x1={x(Math.max(0, first))} x2={x(anchor)} y1={y(level.level)} y2={y(level.level)} stroke="#d6b46b" strokeDasharray="5 3" /></g>;
          })}
          {view.mode === "context" && [view.marketContext.highs, view.marketContext.lows].flatMap((swings, side) => swings.map((swing, i) => {
            const index = view.rows.findIndex(row => Date.parse(row.t) === Date.parse(swing.time));
            if (index < 0) return null;
            const isHigh = side === 0;
            return <g key={`${swing.time}-${side}`} data-market-swing={isHigh ? "HIGH" : "LOW"}><circle cx={x(index)} cy={y(swing.price)} r="3" fill={isHigh ? "#d6b46b" : "#89b8da"}><title>{`${isHigh ? "Confirmed high" : "Confirmed low"} ${price(swing.price)} at ${swing.time} UTC; confirmed ${swing.confirmedAt} UTC; causal context only`}</title></circle><text x={x(index)} y={y(swing.price) + (isHigh ? -6 : 12)} textAnchor="middle" fontSize="9" fill={isHigh ? "#d6b46b" : "#89b8da"}>{isHigh ? `H${i + 1}` : `L${i + 1}`}</text></g>;
          }))}
          {view.mode === "context" && view.marketContext.repeatedRange && (() => {
            const range = view.marketContext.repeatedRange;
            const first = view.rows.findIndex(row => Date.parse(row.t) === Date.parse(range.start));
            if (first < 0) return null;
            return <g data-market-range="true"><rect x={x(first) - slot / 2} y={y(range.ceiling.high)} width={x(anchor) - x(first) + slot} height={Math.max(2, y(range.floor.low) - y(range.ceiling.high))} fill="#d6b46b" fillOpacity="0.06" stroke="#d6b46b" strokeDasharray="4 3"><title>{`Repeated range ${price(range.floor.low)}-${price(range.ceiling.high)}; ${range.floor.touches.length + range.ceiling.touches.length} confirmed touches; closes contained through ${view.anchor.t} UTC`}</title></rect><line x1={x(first)} x2={x(anchor)} y1={y(range.floor.high)} y2={y(range.floor.high)} stroke="#89b8da" strokeDasharray="2 2" /><line x1={x(first)} x2={x(anchor)} y1={y(range.ceiling.low)} y2={y(range.ceiling.low)} stroke="#d6b46b" strokeDasharray="2 2" /></g>;
          })()}
          {study && allowedLevels.has("atr-entry") && allowedLevels.has("atr-target") && allowedLevels.has("atr-invalidation") && <g data-inspection-position={view.direction}>
            <title>{`${view.direction === "UP" ? "LONG" : "SHORT"} ENTRY / TARGET / INVALIDATION; historical observed path with illustrative research geometry; SHADOW_ONLY / NO_DECISION; no order authority`}</title>
            {[{ level: study.target!, color: "#26a69a" }, { level: study.invalidation!, color: "#ef5350" }].map(({ level, color }) => <rect key={color} x={x(anchor)} y={Math.min(y(study.entry), y(level))} width={Math.max(slot / 2, x(studyEnd) - x(anchor))} height={Math.abs(y(study.entry) - y(level))} fill={color} fillOpacity="0.13" />)}
            {[{ id: "atr-entry", level: study.entry, color: "#ddd" }, { id: "atr-target", level: study.target!, color: "#26a69a" }, { id: "atr-invalidation", level: study.invalidation!, color: "#ef5350" }].map(({ id, level, color }) => <line key={id} x1={x(anchor)} x2={x(studyEnd) + slot / 2} y1={y(level)} y2={y(level)} stroke={color} strokeDasharray="4 3" data-level-line={id} data-level-selected={activeLevel?.id === id || undefined} strokeWidth={activeLevel?.id === id ? 3 : undefined} />)}
          </g>}
          {technical && hasTechnicalLevels && <g data-technical-levels={technical.setupKind || "SETUP"}>
            {allowedLevels.has("technical-protection") && <><line data-technical-protection="true" x1={x(anchor)} x2={x(technicalEnd) + slot / 2} y1={y(technical.protection!)} y2={y(technical.protection!)} stroke="#5aa6d6" strokeWidth={activeLevel?.id === "technical-protection" ? 3 : 1.5} strokeDasharray="6 2" data-level-line="technical-protection" data-level-selected={activeLevel?.id === "technical-protection" || undefined} /><title>{`Technical protection ${price(technical.protection!)}; recorded at confirmation close; causal source level; SHADOW_ONLY / NO_DECISION`}</title></>}
            {allowedLevels.has("technical-obstacle") && <><line data-technical-obstacle="true" x1={x(anchor)} x2={x(technicalEnd) + slot / 2} y1={y(technical.obstacle!)} y2={y(technical.obstacle!)} stroke="#d6b46b" strokeWidth={activeLevel?.id === "technical-obstacle" ? 3 : 1.5} strokeDasharray="6 2" data-level-line="technical-obstacle" data-level-selected={activeLevel?.id === "technical-obstacle" || undefined} /><title>{`Nearest confirmed obstacle ${price(technical.obstacle!)}; ${technical.obstacleDistance == null ? "distance unavailable" : `${price(technical.obstacleDistance)} from confirmation`}; causal 96-bar room context; SHADOW_ONLY / NO_DECISION`}</title></>}
          </g>}
          {setup && hasSetupLevels && <g data-combi-references={setup.kind === "PATTERN_BREAK_COMBI" ? "true" : undefined} data-pattern-break-references={setup.kind === "PATTERN_BREAK" ? "true" : undefined} data-pullback-references={setup.kind === "PATTERN_BREAK_PULLBACK" ? "true" : undefined}>
            {[{ id: "setup-break", level: setup.breakoutLevel, color: "#d6b46b", name: setup.kind === "PATTERN_BREAK_COMBI" ? "Inside-bar break reference" : "Signal-bar break reference" }, { id: "setup-protection", level: setup.protectionReference, color: "#89b8da", name: "Technical protection reference" }].map(reference => {
              const first = view.rows.findIndex(row => Date.parse(row.t) === Date.parse(priceActionSetupReferenceTime(setup)));
              return first < 0 || !allowedLevels.has(reference.id as "setup-break" | "setup-protection") ? null : <line key={reference.name} x1={x(first) - slot / 2} x2={x(anchor) + slot / 2} y1={y(reference.level)} y2={y(reference.level)} stroke={reference.color} strokeDasharray="2 2" data-level-line={reference.id} data-level-selected={activeLevel?.id === reference.id || undefined} strokeWidth={activeLevel?.id === reference.id ? 3 : undefined}><title>{`${reference.name}: ${price(reference.level)}; not an executable fill or ATR study level`}</title></line>;
            })}
            {setup.kind === "PATTERN_BREAK_PULLBACK" && <>
              <line x1={12} x2={x(anchor)} y1={y(setup.contextBoundary)} y2={y(setup.contextBoundary)} stroke="#aaa" strokeDasharray="5 4"><title>{`Broken pattern boundary: ${price(setup.contextBoundary)}`}</title></line>
              <circle cx={x(view.rows.findIndex(row => Date.parse(row.t) === Date.parse(setup.signalBarTime)))} cy={y(setup.emaAtSignal)} r="3" fill="#d6b46b"><title>{`Bounded EMA25 estimate at signal: ${price(setup.emaAtSignal)}; SMA25 seed, 40-bar context`}</title></circle>
            </>}
            {setup.kind === "PULLBACK_REVERSAL" && <>
              {setup.breakSequence.kind === "SECOND_CLOSE_BREAK" && (() => {
                const sequence = setup.breakSequence;
                const first = view.rows.findIndex(row => Date.parse(row.t) === Date.parse(sequence.firstSignalTime!));
                const confirmed = view.rows.findIndex(row => Date.parse(row.t) === Date.parse(sequence.firstBreakTime!));
                return first < 0 || confirmed <= first ? null : <g data-second-reversal-break="true">
                  <line x1={x(first)} x2={x(confirmed)} y1={y(sequence.firstBreakLevel!)} y2={y(sequence.firstBreakLevel!)} stroke="#89b8da" strokeDasharray="3 2"><title>{`First reversal signal edge: ${price(sequence.firstBreakLevel!)}; first close break ${sequence.firstBreakTime} UTC; local M/W sequence`}</title></line>
                </g>;
              })()}
              <circle cx={x(view.rows.findIndex(row => Date.parse(row.t) === Date.parse(setup.signalBarTime)))} cy={y(setup.emaAtSignal)} r="3" fill="#d6b46b"><title>{`Bounded EMA25 at reversal signal: ${price(setup.emaAtSignal)}; SMA25 seed, 40-bar context`}</title></circle>
              {setup.technicalTest && <line x1={x(view.rows.findIndex(row => Date.parse(row.t) === Date.parse(setup.technicalTest!.time)))} x2={x(anchor)} y1={y(setup.technicalTest.price)} y2={y(setup.technicalTest.price)} stroke="#999" strokeDasharray="5 4"><title>{`Local dominant-leg wick test: ${price(setup.technicalTest.price)}; ${setup.technicalTest.time} UTC; optional context, not source trade qualification`}</title></line>}
            </>}
          </g>}
          {event != null && <g data-inspection-event={study?.state}>
            <title>{`${eventLabel}; last observed candle ${view.rows[event].t} UTC; OHLC observation, no executable fill`}</title>
            <rect x={x(event) - slot / 2} width={slot} y="8" height="173" fill={eventColor} fillOpacity="0.05" stroke={eventColor} strokeDasharray="3 3" />
            <path d={`M ${x(event) - 4} 3 L ${x(event) + 4} 3 L ${x(event)} 8 Z`} fill={eventColor} />
          </g>}
          {technical && hasTechnicalLevels && technical.exitIndex != null && technical.exitIndex >= view.from && technical.exitIndex <= view.to && <g data-technical-event={technical.state}>
            <title>{`${TECHNICAL_OBSTACLE_OUTCOME_LABELS[technical.state]}; last observed candle ${view.rows[technical.exitIndex - view.from]?.t ?? technical.resolvedAt ?? ""} UTC; OHLC observation, no executable fill`}</title>
            <rect x={x(technical.exitIndex - view.from) - slot / 2} width={slot} y="8" height="173" fill="#5aa6d6" fillOpacity="0.04" stroke="#5aa6d6" strokeDasharray="2 3" />
          </g>}
          {view.rows.map((row, i) => { const color = row.c >= row.o ? "#26a69a" : "#ef5350"; return <g key={row.t} data-inspection-candle-time={row.t} onPointerEnter={() => select(i)} onClick={() => select(i)}>
            <title>{`${row.t} UTC; O ${price(row.o)} H ${price(row.h)} L ${price(row.l)} C ${price(row.c)}`}</title>
            <rect x={x(i) - slot / 2} y="8" width={slot} height="173" fill="transparent" />
            <line x1={x(i)} x2={x(i)} y1={y(row.h)} y2={y(row.l)} stroke={color} />
            <rect x={x(i) - bodyWidth / 2} width={bodyWidth} y={y(Math.max(row.o, row.c))} height={Math.max(1, Math.abs(y(row.o) - y(row.c)))} fill={color} />
          </g>; })}
          <line x1={x(active)} x2={x(active)} y1="8" y2="182" stroke="#ddd" strokeOpacity="0.65" strokeDasharray="2 3" pointerEvents="none" />
          <circle cx={x(active)} cy={y(bar.c)} r="2.5" fill="#eee" pointerEvents="none" />
          <text x="12" y="196" textAnchor="start" fontSize="10" fill="#aaa">{clock(view.rows[0].t)}</text>
          <text x={width - 12} y="196" textAnchor="end" fontSize="10" fill="#aaa">{clock(view.rows[view.rows.length - 1].t)}</text>
          {setup && hasSetupLevels ? <g data-reversal-structure={setup.kind === "PULLBACK_REVERSAL" ? "true" : undefined} data-combi-structure={setup.kind === "PATTERN_BREAK_COMBI" ? "true" : undefined} data-pattern-break-structure={setup.kind === "PATTERN_BREAK" ? "true" : undefined} data-pullback-structure={setup.kind === "PATTERN_BREAK_PULLBACK" ? setup.variant : undefined}>
            {priceActionSetupParts(setup).map(part => {
              const index = view.rows.findIndex(row => Date.parse(row.t) === Date.parse(part.time));
              return index < 0 ? null : <g key={part.time} data-reversal-part={setup.kind === "PULLBACK_REVERSAL" ? part.meaning : undefined} data-combi-part={setup.kind === "PATTERN_BREAK_COMBI" ? part.meaning : undefined} data-pattern-break-part={setup.kind === "PATTERN_BREAK" ? part.meaning : undefined} data-pullback-part={setup.kind === "PATTERN_BREAK_PULLBACK" ? part.meaning : undefined}><title>{`${part.meaning}: ${part.time} UTC`}</title><text x={x(index)} y="211" textAnchor="middle" fontSize="9" fill="#eee">{part.tag}</text></g>;
            })}
          </g> : <text x={x(anchor)} y="211" textAnchor="middle" fontSize="9" fill="#ddd">SETUP</text>}
          {activeEvent && <g data-setup-event-highlight={activeEvent.kind} data-setup-event-candle={activeEvent.candleTime} pointerEvents="none">
            <title>{`${eventNames[activeEvent.kind]}; ${eventClock(activeEvent)}; OHLC observation, no entry or fill`}</title>
            <rect x={x(activeEvent.index) - slot / 2 + 1} width={Math.max(1, slot - 2)} y="8" height="173" fill="none" stroke="#eee" strokeDasharray="4 3" />
            <line x1={x(activeEvent.index)} x2={x(activeEvent.index)} y1="216" y2="221" stroke="#eee" />
            <text x={Math.max(40, Math.min(width - 40, x(activeEvent.index)))} y="230" textAnchor="middle" fontSize="8" fill="#eee">{activeEvent.kind === "SIGNAL" ? "SIGNAL" : activeEvent.kind === "ENTRY_BREAK" ? "BREAK" : "CLOSE / ORIGIN"}</text>
          </g>}
        </svg>
      </div>
      <div className="pattern-inspection-axis-frame" style={{ width: axisWidth }}>
      <svg className={`pattern-inspection-price-axis${levelRail.length ? " pattern-inspection-level-rail" : ""}`} width={axisWidth} height={chartHeight} viewBox={`0 0 ${axisWidth} ${chartHeight}`} aria-hidden="true">
        {levelRail.length ? levelRail.map(item => <g key={item.id} data-inspection-level={item.id} data-level-price={item.level} data-level-price-y={item.priceY} data-level-label-y={item.labelY} data-level-outside-range={item.outsideRange || undefined} data-level-selected={activeLevel?.id === item.id || undefined}>
          <title>{`${item.shortLabel}: ${item.label} ${price(item.level)}${item.outsideRange ? "; outside plotted price range" : ""}; ${item.meaning}`}</title>
          {!item.outsideRange && <path d={`M 0 ${item.priceY} H 7 L 17 ${item.labelY} H 21`} stroke={item.color} fill="none" strokeWidth="1" />}
          <rect x="20" y={item.labelY - 7} width="86" height="14" rx="2" fill="#090909" />
          <text x="22" y={item.labelY} dominantBaseline="middle" fill={item.color} fontSize="9" fontWeight="700">{`${item.shortLabel}${item.outsideRange ? "*" : ""}`}</text>
          <text x="104" y={item.labelY} dominantBaseline="middle" textAnchor="end" fill={item.color} fontSize="10">{price(item.level)}</text>
        </g>) : [0, 0.5, 1].map((fraction) => { const value = view.low + fraction * (view.high - view.low); return <g key={fraction}><line x1="0" x2="5" y1={y(value)} y2={y(value)} stroke="#555" /><text x="9" y={y(value) + 3} fill="#aaa" fontSize="10">{price(value)}</text></g>; })}
        <text x="9" y="196" fill="#aaa" fontSize="9">UTC / M5</text>
      </svg>
      {levelRail.map(item => <button key={item.id} type="button" className="pattern-inspection-rail-control" style={{ top: item.labelY - 8 }} data-level-rail-control={item.id} aria-label={`Inspect ${item.shortLabel}: ${item.label} ${price(item.level)} (${item.category})${item.outsideRange ? "; outside plotted price range" : ""}`} aria-pressed={activeLevel?.id === item.id} aria-describedby={levelReadoutId} title={`${item.label}: ${item.meaning}`} onClick={() => selectLevel(item.id)} />)}
      </div>
    </div>
    <figcaption>
      {levelRail.length > 0 && <div className="pattern-inspection-level-key">
        <ul aria-label="Price level key">{levels.filter(item => allowedLevels.has(item.id)).map(item => <li key={item.id} data-level-key={item.id} title={item.meaning}><button type="button" data-level-control={item.id} aria-pressed={activeLevel?.id === item.id} aria-describedby={levelReadoutId} onClick={() => selectLevel(item.id)}><strong style={{ color: item.color }}>{item.shortLabel}</strong><span>{`${item.label} ${price(item.level)} (${item.category})${levelRail.find(row => row.id === item.id)?.outsideRange ? "; outside plotted price range (*)" : ""}`}</span></button></li>)}</ul>
        <p id={levelReadoutId} className="pattern-inspection-level-readout" role="status" aria-live="polite" aria-atomic="true" data-inspected-level={activeLevel?.id}>{activeLevel ? <><strong>{activeLevel.shortLabel} · {activeLevel.label} {price(activeLevel.level)} ({activeLevel.category})</strong><br />{activeLevel.meaning}{levelRail.find(item => item.id === activeLevel.id)?.outsideRange ? " Outside plotted price range; no on-plot leader." : ""}</> : "Select a price level in the key or rail to inspect its meaning."}</p>
        <p className="chart-pattern-inspector-muted">ATR: illustrative research geometry. TECHNICAL: causal protection / obstacle evidence. SETUP: signal break / protection references. Codes remain separate when prices coincide. These levels establish no executable entry or fill.</p>
      </div>}
      <p id={readoutId} className="pattern-inspection-candle-readout" role="status" aria-live="polite" aria-atomic="true" data-inspected-candle={bar.t}>{bar.t} UTC<br />O {price(bar.o)} H {price(bar.h)}<br />L {price(bar.l)} C {price(bar.c)}{activeEvent && <><br /><span data-inspected-setup-event={activeEvent.kind}>{eventNames[activeEvent.kind]}: {eventClock(activeEvent)}. OHLC observation; no entry or fill.</span></>}</p>
      <p className="chart-pattern-inspector-muted">Scroll to inspect all candles. Hover or tap a candle for OHLC; Left/Right also work when the plot is focused.</p>
      {view.mode === "context" && <p className="chart-pattern-inspector-muted">Context ends at the setup close; amber zones are confirmed historical swing levels. No candles after the setup are included. The next round landmark is listed below; it may lie outside the plotted price range.</p>}
      {view.mode === "context" && view.marketContext.state === "MEASURED" && <p className="chart-pattern-inspector-muted">H1/H2 = last confirmed highs (amber); L1/L2 = last confirmed lows (blue). Each is known only after two later closed candles. An outlined amber rectangle marks a measured repeated range when present; its floor is blue. These are local context measurements.</p>}
      {view.pullbackPressure?.state === "MEASURED" && view.pullbackPressure.terminalClusterTimes.length > 0 && <p className="chart-pattern-inspector-muted">Outlined span: {view.pullbackPressure.terminalClusterTimes.length}-bar local terminal cluster ending at the signal, before confirmation. Pressure measurements below use only the closed setup prefix.</p>}
      {setup && hasSetupLevels && <p className="chart-pattern-inspector-muted">{priceActionSetupLegend(setup)} Break reference {allowedLevels.has("setup-break") ? price(setup.breakoutLevel) : "unavailable"}; technical protection reference {allowedLevels.has("setup-protection") ? price(setup.protectionReference) : "unavailable"}. These references differ from the illustrative ATR position below.</p>}
      {technical && <p className="chart-pattern-inspector-muted">{hasTechnicalLevels ? <>Technical protection {allowedLevels.has("technical-protection") ? price(technical.protection!) : "unavailable"}; nearest confirmed obstacle {allowedLevels.has("technical-obstacle") ? price(technical.obstacle!) : "unavailable"}. Levels are causal at the confirmation close and remain descriptive evidence only ({TECHNICAL_OBSTACLE_OUTCOME_LABELS[technical.state]}).</> : `Technical levels unavailable or withheld (${TECHNICAL_OBSTACLE_OUTCOME_LABELS[technical.state]}).`}</p>}
      {view.mode === "outcome" && study && <><p className="pattern-inspection-path-status" role="status" aria-live="polite">{eventLabel}. Last observed {view.rows[view.rows.length - 1].t} UTC. Observed {study.observedBars} / {study.horizon} closed M5 bars after setup.</p><button type="button" aria-label="Inspect last observed outcome candle" onClick={() => select(view.rows.length - 1, true)}>End of path</button></>}
    </figcaption>
  </figure>;
}
