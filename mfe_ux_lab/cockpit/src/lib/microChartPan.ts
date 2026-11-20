/** Integer evidence bounds plus a sub-candle pixel offset for smooth panning.
 * Stored viewport/drawing identities remain integer closed-bar indices. */
export function microChartPan(view: [number, number], displacement: number, slot: number, count: number): { view: [number, number]; offset: number } {
  if (!(slot > 0) || !Number.isFinite(displacement) || count < 2) return { view, offset: 0 };
  const width = view[1] - view[0];
  const desiredStart = view[0] - displacement / slot;
  const latestStart = Math.max(0, count - 1 - width);
  // Keep a small empty rail after the newest candle, like TradingView. The
  // integer viewport remains anchored to real bars while the fractional offset
  // moves the retained tape left, so panning never creates fake candles.
  const maxOverscroll = 8;
  const boundedStart = Math.max(0, Math.min(latestStart + maxOverscroll, desiredStart));
  // Keep the evidence indices inside the retained tape. The overscroll lives
  // entirely in `offset`, which creates blank space after the newest candle.
  const start = Math.round(Math.max(0, Math.min(latestStart, boundedStart)));
  return { view: [start, start + width], offset: (start - boundedStart) * slot };
}
