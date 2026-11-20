import { getNamedCandleKnowledge, namedCandlePatternDirection } from "./namedCandleKnowledge.ts";

interface AnalogueWindowBar { h: number; l: number; c: number }

/** Resolve orientation from detected setup names, independently of outcomes. */
export function analogueSetupDirection(patterns: readonly string[] = []): "UP" | "DOWN" | "NEUTRAL" {
  if (!patterns.length || patterns.some((pattern) => !getNamedCandleKnowledge(pattern))) return "NEUTRAL";
  const directions = new Set(patterns.map(namedCandlePatternDirection));
  return directions.size === 1 ? [...directions][0] : "NEUTRAL";
}

/** The explicit endpoint keeps appended or missing outcome rows out of pricing. */
export function analogueWindowGeometry(bars: readonly AnalogueWindowBar[], endpointIndex: number, setupPatterns: readonly string[] = []) {
  const direction = analogueSetupDirection(setupPatterns);
  const endpoint = Number.isInteger(endpointIndex) && endpointIndex >= 0 ? bars[endpointIndex] : undefined;
  const entry = endpoint && Number.isFinite(endpoint.c) ? endpoint.c : null;
  const withheld = { entry, direction, localAtr: null, target: null, invalidation: null };
  if (entry == null || endpointIndex < 1) return withheld;
  const prefix = bars.slice(0, endpointIndex + 1);
  if (prefix.some((bar) => ![bar.h, bar.l, bar.c].every(Number.isFinite) || bar.h < bar.l || bar.c < bar.l || bar.c > bar.h)) return withheld;
  const localAtr = prefix.slice(1).reduce((sum, bar, index) => {
    const previous = prefix[index];
    return sum + Math.max(bar.h - bar.l, Math.abs(bar.h - previous.c), Math.abs(bar.l - previous.c));
  }, 0) / (prefix.length - 1);
  const signed = direction === "UP" ? 1 : direction === "DOWN" ? -1 : 0;
  return {
    entry,
    direction,
    localAtr,
    target: signed && localAtr > 0 ? entry + signed * 2.2 * localAtr : null,
    invalidation: signed && localAtr > 0 ? entry - signed * localAtr : null,
  };
}
