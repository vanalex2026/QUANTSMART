/**
 * Immutable viewport index for chart annotations.
 *
 * Source arrays are not required to be in chronological order. The index
 * sorts private references by candle index once, then restores source order
 * for every query so results match a stable `rows.filter(...)` exactly.
 */
export interface IndexedCandleRow { i: number }

export interface MicroChartIndexEntry<T> {
  readonly row: T;
  readonly sourceIndex: number;
  readonly i: number;
}

function lowerBound<T>(entries: readonly MicroChartIndexEntry<T>[], value: number): number {
  let lo = 0;
  let hi = entries.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (entries[mid].i < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound<T>(entries: readonly MicroChartIndexEntry<T>[], value: number): number {
  let lo = 0;
  let hi = entries.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (entries[mid].i <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Build once; query repeatedly as the chart's integer viewport moves. */
export function createMicroChartIndex<T extends IndexedCandleRow>(rows: readonly T[]): readonly MicroChartIndexEntry<T>[] {
  const entries: MicroChartIndexEntry<T>[] = [];
  for (let sourceIndex = 0; sourceIndex < rows.length; sourceIndex += 1) {
    const row = rows[sourceIndex];
    if (Number.isFinite(row.i)) entries.push({ row, sourceIndex, i: row.i });
  }
  entries.sort((left, right) => left.i - right.i || left.sourceIndex - right.sourceIndex);
  return entries;
}

/** Inclusive bounds; an omitted/null cursor leaves the end uncapped.
 * Query cost is O(log N + K log K), where K is the visible result count.
 */
export function queryMicroChartIndex<T>(entries: readonly MicroChartIndexEntry<T>[], start: number, end: number, cursor?: number | null): T[] {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  const cappedEnd = cursor == null ? end : Math.min(end, cursor);
  if (!Number.isFinite(cappedEnd) || cappedEnd < start || !entries.length) return [];
  const first = lowerBound(entries, start);
  const last = upperBound(entries, cappedEnd);
  if (first >= last) return [];
  // Bounds use the sorted index; source order preserves keyboard and
  // overlap semantics for duplicate candle indices.
  return entries.slice(first, last)
    .sort((left, right) => left.sourceIndex - right.sourceIndex)
    .map((entry) => entry.row);
}

