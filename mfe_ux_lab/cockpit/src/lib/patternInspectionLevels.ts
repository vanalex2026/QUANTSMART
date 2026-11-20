import type { PatternInspectionView } from "./patternInspectionWindow.ts";
import type { PriceActionSetup } from "./priceActionSetup.ts";

export interface PatternInspectionLevel {
  id: "atr-entry" | "atr-target" | "atr-invalidation" | "technical-protection" | "technical-obstacle" | "setup-break" | "setup-protection";
  category: "ATR" | "TECHNICAL" | "SETUP";
  label: string;
  shortLabel: string;
  level: number;
  color: string;
  meaning: string;
}

export interface PatternInspectionRailLevel extends PatternInspectionLevel {
  /** Actual affine price coordinate; never displaced to make room for text. */
  priceY: number;
  /** Text coordinate only. A leader may connect this to priceY. */
  labelY: number;
  /** Defensive flag for callers supplying levels outside the plotted domain. */
  outsideRange: boolean;
}

export const PATTERN_INSPECTION_RAIL = { top: 14, bottom: 178, minimumGap: 18 } as const;

const utcM5 = (value: unknown): number | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) && instant % 300_000 === 0
    && new Date(instant).toISOString() === (value.endsWith(".000Z") ? value : value.replace("Z", ".000Z")) ? instant : null;
};

const referenceTime = (setup: PriceActionSetup) => setup.kind === "PATTERN_BREAK_COMBI" ? setup.insideBarTimes?.[0]
  : setup.kind === "PATTERN_BREAK" ? setup.buildupTimes?.[0]
    : setup.kind === "PULLBACK_REVERSAL" ? setup.turnTimes?.[0] : setup.originalBreakTime;

/** Describe existing selected receipts; this never computes a detector, level,
 * fill, outcome or count. Equal prices retain their distinct evidence roles. */
export function patternInspectionLevels(view: PatternInspectionView, setup?: PriceActionSetup): PatternInspectionLevel[] {
  const levels: PatternInspectionLevel[] = [];
  const anchorTime = utcM5(view.anchor.t);
  const anchorIndex = view.index - view.from;
  if (anchorTime == null || utcM5(view.rows[anchorIndex]?.t) !== anchorTime
    || view.rows.filter(row => utcM5(row.t) === anchorTime).length !== 1
    || (view.anchor.closed !== undefined && view.anchor.closed !== true)
    || (view.direction !== "UP" && view.direction !== "DOWN")) return levels;
  const study = view.study, geometry = view.geometry;
  // A withheld or mismatched directional receipt cannot acquire labels merely
  // because an entry close or another stale field remains finite.
  const directional = !!study && study.state !== "INVALID_SETUP" && study.state !== "NEUTRAL"
    && [geometry.entry, geometry.target, geometry.invalidation, geometry.localAtr].every(value => typeof value === "number" && Number.isFinite(value))
    && geometry.localAtr! > 0 && geometry.entry === view.anchor.c
    && study.entry === geometry.entry && study.target === geometry.target && study.invalidation === geometry.invalidation
    && (view.direction === "UP" ? geometry.target! > geometry.entry && geometry.invalidation! < geometry.entry
      : geometry.target! < geometry.entry && geometry.invalidation! > geometry.entry);
  if (!directional) return levels;
  const add = (descriptor: PatternInspectionLevel) => { if (Number.isFinite(descriptor.level)) levels.push(descriptor); };
  add({ id: "atr-entry", category: "ATR", label: `${view.direction === "UP" ? "LONG" : "SHORT"} ENTRY`, shortLabel: "AE", level: study!.entry, color: "#ddd", meaning: "Illustrative ATR study entry at the confirmation close; no executable entry or fill." });
  add({ id: "atr-target", category: "ATR", label: "TARGET", shortLabel: "AT", level: study!.target!, color: "#26a69a", meaning: "Illustrative ATR study target; a research barrier, no order or fill." });
  add({ id: "atr-invalidation", category: "ATR", label: "INVALIDATION", shortLabel: "AI", level: study!.invalidation!, color: "#ef5350", meaning: "Illustrative ATR study invalidation; a research barrier, no order or fill." });

  const sameSetup = !!setup && setup.direction === view.direction && utcM5(setup.confirmationTime) === anchorTime;
  if (!sameSetup) return levels;
  // Same confirmation time alone does not attest a refreshed setup receipt.
  // Read only its recorded signal edge; never rerun a detector here.
  const signalTime = utcM5(setup!.kind === "PATTERN_BREAK_COMBI" ? setup!.insideBarTimes?.[setup!.insideBarTimes.length - 1] : setup!.signalBarTime);
  const signals = signalTime == null ? [] : view.rows.filter(row => utcM5(row.t) === signalTime);
  const signal = signals[0];
  if (signalTime == null || signalTime >= anchorTime || signals.length !== 1
    || (signal.closed !== undefined && signal.closed !== true)
    || ![signal.o, signal.h, signal.l, signal.c].every(Number.isFinite)
    || signal.h < Math.max(signal.o, signal.c) || signal.l > Math.min(signal.o, signal.c)
    || setup!.breakoutLevel !== (view.direction === "UP" ? signal.h : signal.l)) return levels;
  const technical = view.technicalStudy;
  if (technical && technical.direction === view.direction && technical.setupKind === setup!.kind
    && Number.isFinite(setup!.protectionReference) && technical.protection === setup!.protectionReference
    && technical.authority === "SHADOW_ONLY / NO_DECISION" && technical.roomState !== "WITHHELD"
    && ["OBSTACLE_FIRST", "PROTECTION_FIRST", "AMBIGUOUS", "TIMEOUT", "INCOMPLETE", "DATA_GAP", "INVALID_DATA", "UNAVAILABLE"].includes(technical.state)) {
    add({ id: "technical-protection", category: "TECHNICAL", label: "TECHNICAL PROTECTION", shortLabel: "TP", level: technical.protection!, color: "#5aa6d6", meaning: "Causal technical-study protection recorded at confirmation close; separate from ATR invalidation, no order or fill." });
    add({ id: "technical-obstacle", category: "TECHNICAL", label: "CONFIRMED OBSTACLE", shortLabel: "TO", level: technical.obstacle!, color: "#d6b46b", meaning: "Nearest confirmed obstacle in the causal technical study; separate from the ATR target, no order or fill." });
  }
  const reference = utcM5(referenceTime(setup!));
  if (reference != null && reference < anchorTime && view.rows.filter(row => utcM5(row.t) === reference).length === 1) {
    add({ id: "setup-break", category: "SETUP", label: setup!.kind === "PATTERN_BREAK_COMBI" ? "INSIDE-BAR BREAK REFERENCE" : "SIGNAL-BAR BREAK REFERENCE", shortLabel: "SB", level: setup!.breakoutLevel, color: "#d6b46b", meaning: "Selected setup break reference; a source-structure receipt, separate from ATR entry and not an executable fill." });
    add({ id: "setup-protection", category: "SETUP", label: "SETUP PROTECTION REFERENCE", shortLabel: "SP", level: setup!.protectionReference, color: "#89b8da", meaning: "Selected setup technical protection reference; separate from ATR invalidation, no order or fill." });
  }
  return levels;
}

/** Resolve text collisions on the stationary axis without moving price
 * geometry. Stable descriptor order breaks coincident-price ties. Seven labels
 * need 108px of the available 164px, including the fully coincident case. */
export function patternInspectionLevelRail(levels: readonly PatternInspectionLevel[], low: number, high: number): PatternInspectionRailLevel[] {
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low || !Number.isFinite(high - low)) return [];
  const { top, bottom, minimumGap } = PATTERN_INSPECTION_RAIL;
  const result = levels.filter(item => Number.isFinite(item.level)).slice(0, 7).map(item => ({
    ...item, priceY: top + (1 - (item.level - low) / (high - low)) * (bottom - top), labelY: 0, outsideRange: item.level < low || item.level > high,
  })).filter(item => Number.isFinite(item.priceY));
  const ordered = result.map((item, index) => ({ item, index })).sort((a, b) => a.item.priceY - b.item.priceY || a.index - b.index);
  // First fit from the top, then repair overflow from the bottom. The fixed
  // capacity guarantees the backward pass cannot push the first label above top.
  ordered.forEach(({ item }, index) => {
    item.labelY = Math.max(top, Math.min(bottom, item.priceY), index ? ordered[index - 1].item.labelY + minimumGap : top);
  });
  for (let index = ordered.length - 1; index >= 0; index--) {
    ordered[index].item.labelY = Math.min(ordered[index].item.labelY, index === ordered.length - 1 ? bottom : ordered[index + 1].item.labelY - minimumGap);
  }
  return result;
}
