/** Leave enough room for a visible candle body and a gap at the default zoom. */
export function defaultVisibleCandles(plotWidth: number): number {
  return Math.max(24, Math.min(180, Math.floor((Number.isFinite(plotWidth) ? Math.max(0, plotWidth) : 0) / 7)));
}

/** Date/time labels are 11 monospace characters; reserve 80px including a gap.
 * Omit edge ticks whose centered labels would extend outside the plot. */
export function timeAxisTicks(start: number, end: number, slot: number, plotWidth: number): number[] {
  if (![start, end, slot, plotWidth].every(Number.isFinite) || slot <= 0 || plotWidth < 80) return [];
  const ticks: number[] = [];
  const step = Math.max(1, Math.ceil(80 / slot));
  // Align labels to the retained tape's absolute candle indices. Re-basing
  // the first label to every viewport start makes the whole time axis jump by
  // one cadence when a drag crosses an integer candle boundary, even though
  // candle pixels themselves are moving continuously. A stable origin keeps
  // the same tick attached to the same candle while it slides through view.
  const firstVisible = start + Math.max(0, Math.ceil(36 / slot - 0.5));
  const first = Math.ceil(firstVisible / step) * step;
  for (let i = first; i <= end && (i - start + 0.5) * slot <= plotWidth - 36; i += step) ticks.push(i);
  return ticks;
}
