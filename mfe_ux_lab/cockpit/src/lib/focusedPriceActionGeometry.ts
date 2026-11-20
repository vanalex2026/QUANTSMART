export type FocusedPriceActionDirection = "UP" | "DOWN";

export interface FocusedPriceActionMarkerLike {
  i: number;
  direction?: string | null;
}

export interface FocusedPriceActionGeometryEvidence {
  focused: boolean;
  timeframe: string;
  historyState: "idle" | "loading" | "ready" | "fallback";
  freshnessOk: boolean;
}

/**
 * Resolve a current research landmark only from one unanimous latest-candle
 * direction. Focused M5 geometry additionally requires promoted, fresh MT5
 * closed-bar evidence; local fallback remains historical/descriptive only.
 */
export function resolveFocusedPriceActionDirection(
  markers: readonly FocusedPriceActionMarkerLike[],
  evidence: FocusedPriceActionGeometryEvidence,
): FocusedPriceActionDirection | undefined {
  const latestIndex = markers.reduce((latest, marker) => Math.max(latest, marker.i), -1);
  const directions = new Set(
    markers
      .filter((marker) => marker.i === latestIndex)
      .map((marker) => marker.direction)
      .filter((direction): direction is FocusedPriceActionDirection => direction === "UP" || direction === "DOWN"),
  );
  if (evidence.focused && evidence.timeframe === "M5" && (evidence.historyState !== "ready" || !evidence.freshnessOk)) return undefined;
  return directions.size === 1 ? [...directions][0] : undefined;
}
