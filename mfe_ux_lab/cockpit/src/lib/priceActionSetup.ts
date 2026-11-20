import type { PatternBreakCombiSetup } from "./patternBreakCombi.ts";
import type { PatternBreakSetup } from "./patternBreak.ts";
import type { PatternBreakPullbackSetup } from "./patternBreakPullback.ts";
import type { PullbackReversalSetup } from "./pullbackReversal.ts";
export type PriceActionSetup = PatternBreakCombiSetup | PatternBreakSetup | PatternBreakPullbackSetup | PullbackReversalSetup;

export function priceActionSetupParts(setup: PriceActionSetup) {
  if (setup.kind === "PULLBACK_REVERSAL") return [{ time: setup.originTime, tag: "A", meaning: "Dominant leg origin" }, { time: setup.peakTime, tag: "E", meaning: "Dominant directional extreme" }, ...setup.correctionTimes.map((time, i) => {
    const sequence = setup.breakSequence;
    const part = sequence.kind === "SECOND_CLOSE_BREAK" ? time === sequence.firstSignalTime ? { tag: "S1", meaning: "First reversal signal" } : time === sequence.firstBreakTime ? { tag: "C1", meaning: "First close break" } : time === sequence.counterTime ? { tag: "R", meaning: "Opposing return after first break" } : null : null;
    return { time, ...(part ?? { tag: time === setup.signalBarTime ? "S" : setup.turnTimes.includes(time) ? `B${setup.turnTimes.indexOf(time) + 1}` : `T${i + 1}`, meaning: time === setup.signalBarTime ? "Signal bar" : setup.turnTimes.includes(time) ? "Turn buildup bar" : `Correction bar ${i + 1}` }) };
  }), { time: setup.confirmationTime, tag: "C", meaning: "Close confirmation" }];
  return setup.kind === "PATTERN_BREAK_COMBI"
    ? [{ time: setup.powerbarTime, tag: "P", meaning: "Powerbar" }, ...setup.insideBarTimes.map((time, i) => ({ time, tag: `I${i + 1}`, meaning: `Inside bar ${i + 1}` })), { time: setup.confirmationTime, tag: "C", meaning: "Close confirmation" }]
    : setup.kind === "PATTERN_BREAK"
      ? [...setup.buildupTimes.map((time, i) => ({ time, tag: time === setup.signalBarTime ? "S" : `B${i + 1}`, meaning: time === setup.signalBarTime ? "Signal bar" : `Buildup bar ${i + 1}` })), { time: setup.confirmationTime, tag: "C", meaning: "Close confirmation" }]
      : [{ time: setup.originalBreakTime, tag: "X", meaning: "Original boundary break" }, ...setup.pullbackTimes.map((time, i) => ({ time, tag: time === setup.signalBarTime ? "S" : `T${i + 1}`, meaning: time === setup.signalBarTime ? "Signal bar" : `Post-break test bar ${i + 1}` })), { time: setup.confirmationTime, tag: "C", meaning: "Close confirmation" }];
}

export function priceActionSetupReferenceTime(setup: PriceActionSetup) {
  return setup.kind === "PATTERN_BREAK_COMBI" ? setup.insideBarTimes[0] : setup.kind === "PATTERN_BREAK" ? setup.buildupTimes[0] : setup.kind === "PULLBACK_REVERSAL" ? setup.turnTimes[0] : setup.originalBreakTime;
}

export function priceActionSetupDescription(setup: PriceActionSetup) {
  return setup.kind === "PATTERN_BREAK_COMBI" ? "powerbar and inside bars" : setup.kind === "PATTERN_BREAK" ? "boundary buildup and signal bar" : setup.kind === "PULLBACK_REVERSAL" ? (setup.breakSequence.kind === "SECOND_CLOSE_BREAK" ? "dominant leg, EMA25-tested first break, opposing return and second close break" : "dominant leg, proportionate correction and EMA25 turnaround") : `original break and ${setup.variant === "HANGING" ? "hanging barrier fight" : "return test"} at barrier/EMA25`;
}

export function priceActionSetupLegend(setup: PriceActionSetup) {
  return setup.kind === "PATTERN_BREAK_COMBI" ? "P = powerbar | I = inside bar | C = close confirmation." : setup.kind === "PATTERN_BREAK" ? "B = buildup bar | S = signal bar | C = close confirmation." : setup.kind === "PULLBACK_REVERSAL" ? (setup.breakSequence.kind === "SECOND_CLOSE_BREAK" ? "A = leg origin | E = extreme | S1 = first signal | C1 = first close break | R = opposing return | S = second signal | C = second close break." : "A = leg origin | E = directional extreme | T = correction | B = turn buildup | S = signal | C = close confirmation.") : "X = original break | T = post-break test | S = signal bar | C = close confirmation.";
}
